#!/usr/bin/env npx ts-node --project tsconfig.test.json
/**
 * Test: the issue title is shown in the left margin, below GitHub's sticky issue
 * header, whenever the real title is scrolled out of view. While the reader
 * scrolls through a comment, the comment's leading H1 is shown below it in a
 * smaller font and different color, without covering the comment.
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
  const commentBox = await comment.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left };
  });
  const scrollAndReadMargin = async (scrollY: number) => {
    await page.evaluate(y => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(500);
    return page.evaluate(marginTexts, GITHUB_STICKY_HEADER_HEIGHT);
  };

  const atTop = await scrollAndReadMargin(0);
  const betweenComments = await scrollAndReadMargin(commentBox.bottom - GITHUB_STICKY_HEADER_HEIGHT + 10);
  const midComment = await scrollAndReadMargin(commentBox.top + 200);
  const columnTag = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('h1')?.tagName ?? null,
    { x: commentBox.left + 10, y: GITHUB_STICKY_HEADER_HEIGHT + 20 });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'sticky-comment-heading.png') });
  await browser.close();

  const texts = (m: MarginText[]) => m.map(t => t.text);
  const [title, heading] = midComment;
  const failures = [
    texts(atTop).includes(ISSUE_TITLE) && `title shown in margin while real title in view: ${JSON.stringify(atTop)}`,
    JSON.stringify(texts(betweenComments)) !== JSON.stringify([ISSUE_TITLE]) && `between comments, expected title only: ${JSON.stringify(betweenComments)}`,
    JSON.stringify(texts(midComment)) !== JSON.stringify([ISSUE_TITLE, HEADING]) && `mid-comment, expected title then heading: ${JSON.stringify(midComment)}`,
    !(title?.fontSize >= 1.5 * heading?.fontSize) && `title font must be at least 1.5x heading font: ${JSON.stringify(midComment)}`,
    title?.color === heading?.color && `title and heading must differ in color: ${JSON.stringify(midComment)}`,
    columnTag !== null && 'an H1 covers the comment',
  ].filter(Boolean);
  if (failures.length) {
    failures.forEach(f => console.error(`FAIL: ${f}`));
    process.exit(1);
  }
  console.log('PASS: margin shows title when real title is out of view, and title above smaller comment heading mid-comment');
}

type MarginText = { text: string; fontSize: number; color: string };

// Distinct texts found scanning down the left margin from below the sticky header
function marginTexts(headerHeight: number): MarginText[] {
  const found: MarginText[] = [];
  for (let y = headerHeight; y < headerHeight + 300; y += 4) {
    const el = document.elementFromPoint(20, y);
    const text = el?.textContent?.trim().slice(0, 80);
    if (el && text && el.childElementCount === 0 && found.at(-1)?.text !== text) {
      found.push({ text, fontSize: parseFloat(getComputedStyle(el).fontSize), color: getComputedStyle(el).color });
    }
  }
  return found;
}

run().catch(e => { console.error(e); process.exit(1); });
