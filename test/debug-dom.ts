#!/usr/bin/env npx ts-node --project tsconfig.test.json
/**
 * Debug script to inspect GitHub's DOM structure
 */

import { chromium } from 'playwright';
import path from 'path';

const TEST_URL = 'https://github.com/dandavison/test/issues/7';

async function debugDom() {
  const extensionPath = path.join(__dirname, '..', 'dist');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });

  const page = await context.newPage();
  await page.goto(TEST_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Inspect the DOM structure
  const domInfo = await page.evaluate(() => {
    const markdownBodies = document.querySelectorAll('.markdown-body');
    const results: any[] = [];

    markdownBodies.forEach((mb, i) => {
      const headings = mb.querySelectorAll('h1, h2, h3, h4, h5, h6');
      results.push({
        index: i,
        className: mb.className,
        parentClassName: mb.parentElement?.className || 'no-parent',
        parentTagName: mb.parentElement?.tagName || 'no-parent',
        grandparentClassName: mb.parentElement?.parentElement?.className || 'no-grandparent',
        headingCount: headings.length,
        firstHeadingText: headings[0]?.textContent?.slice(0, 30) || 'none',
        hasNestedMarkdownBody: mb.querySelector('.markdown-body') !== null,
        offsetHeight: (mb as HTMLElement).offsetHeight,
      });
    });

    return results;
  });

  console.log('\n📊 DOM Structure Analysis:\n');
  domInfo.forEach(info => {
    console.log(`--- .markdown-body #${info.index} ---`);
    console.log(`  className: ${info.className}`);
    console.log(`  parent: ${info.parentTagName}.${info.parentClassName?.slice(0, 60)}`);
    console.log(`  grandparent class: ${info.grandparentClassName?.slice(0, 60)}`);
    console.log(`  headings: ${info.headingCount}`);
    console.log(`  first heading: "${info.firstHeadingText}"`);
    console.log(`  nested .markdown-body: ${info.hasNestedMarkdownBody}`);
    console.log(`  height: ${info.offsetHeight}px`);
    console.log('');
  });

  // Now click fold button and check what happens
  const foldButton = await page.$('#github-comment-fold-toggle');
  if (foldButton) {
    await foldButton.click();
    await page.waitForTimeout(500);

    console.log('📊 After clicking FOLD button:\n');
    const afterFold = await page.evaluate(() => {
      const mb = document.querySelector('.markdown-body');
      return {
        className: mb?.className,
        hasClass: document.body.classList.contains('github-comments-folded'),
        height: (mb as HTMLElement)?.offsetHeight,
        computedMaxHeight: mb ? getComputedStyle(mb).maxHeight : 'none',
      };
    });
    console.log(`  body has fold class: ${afterFold.hasClass}`);
    console.log(`  .markdown-body className: ${afterFold.className}`);
    console.log(`  height: ${afterFold.height}px`);
    console.log(`  computed max-height: ${afterFold.computedMaxHeight}`);

    // Now click a heading
    const heading = await page.$('.markdown-body h1');
    if (heading) {
      await heading.click();
      await page.waitForTimeout(500);

      console.log('\n📊 After clicking HEADING:\n');
      const afterClick = await page.evaluate(() => {
        const mb = document.querySelector('.markdown-body');
        return {
          className: mb?.className,
          hasExpandedClass: mb?.classList.contains('comment-expanded'),
          height: (mb as HTMLElement)?.offsetHeight,
          computedMaxHeight: mb ? getComputedStyle(mb).maxHeight : 'none',
        };
      });
      console.log(`  .markdown-body className: ${afterClick.className}`);
      console.log(`  has comment-expanded: ${afterClick.hasExpandedClass}`);
      console.log(`  height: ${afterClick.height}px`);
      console.log(`  computed max-height: ${afterClick.computedMaxHeight}`);
    }
  }

  console.log('\n🔍 Browser staying open for inspection...');
  await page.waitForTimeout(30000);
  await context.close();
}

debugDom().catch(console.error);

