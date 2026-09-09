#!/usr/bin/env npx ts-node --project tsconfig.test.json
/**
 * Visual test for GitHub d2 diagram rendering.
 *
 * Serves a fixture at a github.com URL so the content script matches, using
 * GitHub's real CSP, and checks that d2 blocks become SVG, that a broken
 * diagram reports its error, that non-d2 blocks are untouched, and that the
 * source toggle works.
 *
 * Run with: npx ts-node --project tsconfig.test.json test/test-d2-visual.ts
 */

import { chromium, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const SERVICE = path.join(__dirname, '..', 'src', 'd2', 'd2-serve');
const PORT = 7119;
const FIXTURE_URL = 'https://github.com/dandavison/test/issues/1';

const GITHUB_CSP = [
  "default-src 'none'",
  'script-src github.githubassets.com',
  "style-src 'unsafe-inline' github.githubassets.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' api.github.com",
].join('; ');

// Captured from GitHub's own markdown renderer (gh api /markdown) so the DOM is faithful.
const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>d2 fixture</title></head>
<body><div class="markdown-body">
<h2>Shard routing</h2>
<div class="highlight highlight-source-d2"><pre class="notranslate"><span class="pl-ent">client </span>-&gt; <span class="pl-ent">frontend</span>: <span class="pl-s">gRPC</span>
<span class="pl-ent">frontend </span>-&gt; <span class="pl-ent">history</span>: <span class="pl-s">route by shard</span>
<span class="pl-ent">history </span>-&gt; <span class="pl-ent">persistence</span>: <span class="pl-s">commit</span></pre></div>
<p>Plain block, must be left alone:</p>
<div class="highlight highlight-source-go"><pre class="notranslate"><span class="pl-k">func</span> <span class="pl-s1">main</span>() {}</pre></div>
<p>Broken diagram:</p>
<div class="highlight highlight-source-d2"><pre class="notranslate"><span class="pl-ent">x </span>-&gt; : {</pre></div>
</div></body></html>`;

const failures: string[] = [];

function check(ok: boolean, description: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${description}`);
  if (!ok) failures.push(description);
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const up = await new Promise<boolean>(resolve => {
      const socket = net.connect(port, '127.0.0.1');
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
    });
    if (up) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`d2 render service never listened on port ${port}`);
}

async function capture(page: Page, name: string): Promise<void> {
  const body = await page.$('.markdown-body');
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await (body ?? page).screenshot({ path: filepath });
  console.log(`captured ${filepath}`);
}

async function run(): Promise<void> {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // Detached so teardown can take out the whole group: killing the uv wrapper
  // alone would leave its python child running and holding stdio open.
  const service = spawn(SERVICE, { stdio: 'ignore', detached: true });
  service.on('error', e => {
    console.error(`could not start ${SERVICE}: ${e.message}`);
    process.exit(1);
  });

  try {
    await waitForPort(PORT, 15000);
    await checkFixture();
  } finally {
    if (service.pid && service.exitCode === null) process.kill(-service.pid, 'SIGTERM');
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s):\n${failures.map(f => `  - ${f}`).join('\n')}`);
    process.exit(1);
  }
  console.log('\nAll checks passed. Verify the screenshots in test/screenshots/ look right.');
}

async function checkFixture(): Promise<void> {
  const extensionPath = path.join(__dirname, '..', 'dist');
  const context = await chromium.launchPersistentContext('', {
    channel: 'chrome',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    viewport: { width: 1400, height: 900 },
  });

  try {
    await new Promise(r => setTimeout(r, 2000));
    const page = await context.newPage();
    await page.route(FIXTURE_URL, route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        headers: { 'content-security-policy': GITHUB_CSP },
        body: FIXTURE_HTML,
      })
    );

    await page.goto(FIXTURE_URL);
    await page.waitForSelector('.ghd2-diagram svg', { timeout: 20000 });

    check(await page.locator('.ghd2-diagram svg[data-d2-version]').count() === 1,
      'valid d2 block renders one d2-produced SVG');
    check(await page.locator('.ghd2-diagram svg').first().isVisible(),
      'rendered diagram is visible');
    check(await page.locator('.highlight-source-d2').first().isHidden(),
      'source of the rendered block is hidden');
    check(await page.locator('.ghd2-error').count() === 1,
      'broken d2 block reports a compile error');
    check((await page.locator('.ghd2-error').textContent())?.includes('d2') ?? false,
      'compile error mentions d2');
    check(await page.locator('.highlight-source-go').isVisible(),
      'non-d2 code block is left alone');
    await capture(page, 'd2-01-diagram');

    await page.locator('.ghd2-toggle').first().click();
    await page.waitForTimeout(300);
    check(await page.locator('.highlight-source-d2').first().isVisible(),
      'toggle reveals the d2 source');
    check(await page.locator('.ghd2-diagram').first().isHidden(),
      'toggle hides the diagram');
    await capture(page, 'd2-02-source');

    await page.locator('.ghd2-toggle').first().click();
    await page.waitForTimeout(300);
    check(await page.locator('.ghd2-diagram svg').first().isVisible(),
      'toggling back restores the diagram');
    await capture(page, 'd2-03-diagram-again');
  } finally {
    await context.close();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
