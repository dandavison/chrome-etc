#!/usr/bin/env npx ts-node --project tsconfig.test.json
/**
 * Visual test for comment fold feature
 *
 * Captures screenshots at key states for AI visual verification.
 * Run with: npx ts-node --project tsconfig.test.json test/test-comment-fold-visual.ts
 *
 * Output: Screenshots in test/screenshots/ that can be shown to an AI for verification
 */

import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const TEST_URL = 'https://github.com/dandavison/test/issues/7'; // Public test issue with headings

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page: Page, name: string): Promise<string> {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`📸 Captured: ${filepath}`);
  return filepath;
}

async function runVisualTest() {
  console.log('🧪 Visual Test: Comment Fold Feature\n');

  await ensureDir(SCREENSHOTS_DIR);

  const extensionPath = path.join(__dirname, '..', 'dist');
  console.log('📁 Extension path:', extensionPath);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    viewport: { width: 1400, height: 900 },
  });

  console.log('🌐 Chrome launched with extension\n');
  await new Promise(r => setTimeout(r, 2000));

  const page = await context.newPage();

  try {
    // Navigate to a GitHub issue with headings
    console.log('📍 Navigating to GitHub issue...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Screenshot 1: Initial state (unfolded)
    console.log('\n--- State 1: Initial (unfolded) ---');
    await captureScreenshot(page, '01-initial-unfolded');

    // Find and click the fold toggle button
    const foldButton = await page.$('#github-comment-fold-toggle');
    if (!foldButton) {
      console.error('❌ Fold toggle button not found!');
      await captureScreenshot(page, 'ERROR-no-fold-button');
      return;
    }

    // Screenshot 2: After clicking fold button (all folded)
    console.log('\n--- State 2: Click fold button (all folded) ---');
    await foldButton.click();
    await page.waitForTimeout(500);
    await captureScreenshot(page, '02-all-folded');

    // Find a heading in a comment and click it
    console.log('\n--- State 3: Click a heading to expand one comment ---');
    const heading = await page.$('.markdown-body h1, .markdown-body h2, .markdown-body h3');
    if (heading) {
      await heading.click();
      await page.waitForTimeout(500);
      await captureScreenshot(page, '03-one-comment-expanded');

      // Log what we did
      const headingText = await heading.textContent();
      console.log(`   Clicked heading: "${headingText?.slice(0, 50)}..."`);
    } else {
      console.log('   ⚠️ No heading found to click');
      await captureScreenshot(page, '03-no-heading-found');
    }

    // Screenshot 4: Click fold button again (all unfolded)
    console.log('\n--- State 4: Click fold button again (all unfolded) ---');
    await foldButton.click();
    await page.waitForTimeout(500);
    await captureScreenshot(page, '04-all-unfolded-again');

    console.log('\n✅ Visual test complete!');
    console.log(`\n📂 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\nTo verify, show these screenshots to an AI and ask:');
    console.log('  1. Does 01-initial-unfolded show full comment content?');
    console.log('  2. Does 02-all-folded show collapsed comments (just headings)?');
    console.log('  3. Does 03-one-comment-expanded show ONE comment expanded, others folded?');
    console.log('  4. Does 04-all-unfolded-again show all comments fully expanded?');

  } catch (error) {
    console.error('❌ Error during test:', error);
    await captureScreenshot(page, 'ERROR-exception');
  }

  // Keep browser open briefly for manual inspection
  console.log('\n🔍 Browser staying open for 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));

  await context.close();
}

runVisualTest().catch(console.error);

