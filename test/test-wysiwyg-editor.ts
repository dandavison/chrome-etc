#!/usr/bin/env npx ts-node --project tsconfig.test.json
/**
 * Test for the WYSIWYG comment editor.
 *
 * Editing a real comment requires a logged-in GitHub session, so this serves a fixture page with a
 * markdown textarea at a github.com URL (the content scripts match on URL). The fixture does not
 * reproduce GitHub's React editor, so this does not show that GitHub picks up the synced value.
 *
 * Exits non-zero on any failed assertion. Screenshots are saved to test/screenshots/.
 */

import { chromium, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const FIXTURE_URL = 'https://github.com/dandavison/test/issues/999999';
const FIXTURE_HTML = `<!doctype html><html><body>
  <div><textarea aria-label="Markdown value" rows="12" cols="80"></textarea></div>
  <pre id="input-event-value"></pre>
  <script>
    document.querySelector('textarea').addEventListener('input', (e) => {
      document.getElementById('input-event-value').textContent = e.target.value;
    });
  </script>
</body></html>`;

const MARKDOWN = [
  '# Title',
  '',
  'Some **bold** and _it_ and `code` snake_case.',
  'line two',
  '',
  '- a',
  '- b',
  '  - nested',
  '',
  '1. one',
  '2. two',
  '',
  '- [ ] todo',
  '- [x] done',
  '',
  '```python',
  'x = 1',
  '```',
  '',
  '| a | b |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '~~gone~~ [link](https://x.com)',
  '',
  'end',
].join('\n');

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) {
    failures++;
    if (detail) console.log(detail);
  }
}

function diff(expected: string, actual: string): string {
  return `--- expected ---\n${expected}\n--- actual ---\n${actual}`;
}

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`) });
}

async function openFixture(page: Page, markdown: string): Promise<void> {
  await page.goto(FIXTURE_URL);
  await page.fill('textarea', markdown);
  await page.waitForSelector('.gh-wysiwyg-toggle', { timeout: 5000 });
}

async function run(): Promise<void> {
  const extensionPath = path.join(__dirname, '..', 'dist');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    viewport: { width: 1000, height: 900 },
  });
  await context.route(FIXTURE_URL, (route) => route.fulfill({ contentType: 'text/html', body: FIXTURE_HTML }));
  const page = await context.newPage();

  try {
    await openFixture(page, MARKDOWN);
    await screenshot(page, 'wysiwyg-01-markdown');

    await page.click('.gh-wysiwyg-toggle');
    await page.waitForSelector('.gh-wysiwyg-editor');
    await screenshot(page, 'wysiwyg-02-rich');
    check('textarea is hidden in rich view', !(await page.isVisible('textarea')));
    check('toggle button reads "Markdown" in rich view', (await page.textContent('.gh-wysiwyg-toggle')) === 'Markdown');
    check('heading is rendered', (await page.textContent('.gh-wysiwyg-editor h1')) === 'Title');
    check('table is rendered', (await page.$('.gh-wysiwyg-editor table')) !== null);
    check('opening rich view does not change markdown', (await page.inputValue('textarea')) === MARKDOWN);

    await page.keyboard.type(' more');
    const expected = MARKDOWN + ' more';
    const actual = await page.inputValue('textarea');
    check('typing round-trips markdown', actual === expected, diff(expected, actual));
    check('textarea input event carries synced value', (await page.textContent('#input-event-value')) === actual);

    // Simulates GitHub clearing the textarea after submitting, from the page's own world.
    await page.evaluate(() => { document.querySelector('textarea')!.value = '*changed*'; });
    await page.waitForFunction(() => document.querySelector('.gh-wysiwyg-editor em')?.textContent === 'changed', null, { timeout: 2000 })
      .then(() => check('external textarea change re-renders rich view', true))
      .catch(() => check('external textarea change re-renders rich view', false));

    await page.focus('.gh-wysiwyg-editor');
    await page.keyboard.press('Meta+Shift+E');
    check('shortcut returns to markdown', await page.isVisible('textarea') && (await page.$('.gh-wysiwyg-editor')) === null);
    check('toggle button reads "Rich" in markdown view', (await page.textContent('.gh-wysiwyg-toggle')) === 'Rich');

    await page.keyboard.press('Meta+Shift+E');
    check('shortcut in textarea opens rich view', (await page.$('.gh-wysiwyg-editor')) !== null);

    await openFixture(page, '<img src="x" onerror="window.__xss = 1"> [a](javascript:alert(1))');
    await page.click('.gh-wysiwyg-toggle');
    await page.waitForSelector('.gh-wysiwyg-editor');
    const html = await page.innerHTML('.gh-wysiwyg-editor');
    check('event handler attributes are stripped', !html.includes('onerror'), html);
    check('javascript: URLs are stripped', !html.includes('javascript:'), html);
  } catch (error) {
    failures++;
    console.error('❌ Exception:', error);
    await screenshot(page, 'wysiwyg-ERROR');
  }

  await context.close();
  if (failures > 0) {
    console.log(`\n${failures} check(s) failed`);
    process.exit(1);
  }
}

run();
