#!/usr/bin/env npx ts-node --project tsconfig.test.json
/**
 * Test: while the reader scrolls through a comment, the issue title and the
 * comment's leading H1 (in the H1's font) are shown in the left margin below
 * GitHub's sticky issue header, without covering the comment.
 *
 * Chrome 153 ignores --load-extension, so the built content script is injected
 * directly with a chrome.storage stub.
 *
 * Output: test/screenshots/sticky-comment-heading.png
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const TEST_URL = 'https://github.com/dandavison/test/issues/7';
const SCRIPT = path.join(__dirname, '..', 'dist', 'content', 'github-sticky-comment-heading.js');
const ISSUE_TITLE = 'Test Issue for Chrome Extension';
const HEADING = 'Cancellation Types';
const GITHUB_STICKY_HEADER_HEIGHT = 56;

async function run(): Promise<void> {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 600 }, bypassCSP: true });
  await page.addInitScript(() => {
    (window as any).chrome = { storage: { sync: { get: async () => ({}) } } };
  });
  await page.goto(TEST_URL, { timeout: 60000 });
  await page.waitForSelector(`.markdown-body h1:text-is("${HEADING}")`);
  await page.addScriptTag({ content: fs.readFileSync(SCRIPT, 'utf8') });
  await page.waitForTimeout(500);

  const comment = page.locator('.markdown-body', { has: page.locator(`h1:text-is("${HEADING}")`) }).last();
  const commentTop = await comment.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate(y => window.scrollTo(0, y), commentTop + 200);
  await page.waitForTimeout(500);

  const result = await comment.evaluate((el, { y, heading }) => {
    const columnLeft = el.getBoundingClientRect().left;
    const textAt = (py: number) => document.elementFromPoint(20, py)?.textContent?.trim().slice(0, 80) ?? null;
    let headingY = y + 20;
    while (headingY < y + 300 && textAt(headingY) !== heading) headingY += 4;
    const inColumn = document.elementFromPoint(columnLeft + 10, y + 20);
    const font = (e: Element | null) => e && getComputedStyle(e).font;
    return {
      marginTopText: textAt(y + 20),
      marginHeadingText: textAt(headingY),
      columnTag: inColumn?.closest('h1')?.tagName ?? null,
      fontMatches: font(document.elementFromPoint(20, headingY)) === font(el.querySelector('h1')),
    };
  }, { y: GITHUB_STICKY_HEADER_HEIGHT, heading: HEADING });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'sticky-comment-heading.png') });
  await browser.close();

  const ok = result.marginTopText === ISSUE_TITLE && result.marginHeadingText === HEADING
    && result.columnTag === null && result.fontMatches;
  if (!ok) {
    console.error(`FAIL: expected "${ISSUE_TITLE}" above "${HEADING}" (in the H1's font) in the left margin, and no H1 over the comment; found ${JSON.stringify(result)}`);
    process.exit(1);
  }
  console.log(`PASS: "${ISSUE_TITLE}" above "${HEADING}" (in the H1's font) in the left margin while scrolled mid-comment`);
}

run().catch(e => { console.error(e); process.exit(1); });
