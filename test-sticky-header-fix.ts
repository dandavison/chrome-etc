import { chromium, expect } from '@playwright/test';
import * as path from 'path';

async function testStickyHeaderHiding() {
  const extensionPath = path.resolve(__dirname);

  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ],
    viewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  console.log('📍 Navigating to GitHub issue...');
  await page.goto('https://github.com/microsoft/vscode/issues/206517');
  await page.waitForTimeout(2000);

  console.log('📜 Scrolling down to trigger sticky header...');
  // Scroll down enough to make the sticky header appear
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1000);

  // Check if sticky header is visible before enabling full-width
  console.log('\n🔍 Checking sticky header BEFORE full-width mode...');
  const stickyHeaderBeforeSelectors = [
    '#issue-viewer-sticky-header',
    '.HeaderMetadata-module__stickyContainer--JBJvS',
    '[class*="HeaderMetadata-module__stickyContainer"]',
    '[class*="stickyContainer"]'
  ];

  let stickyVisibleBefore = false;
  for (const selector of stickyHeaderBeforeSelectors) {
    const element = await page.$(selector);
    if (element) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        console.log(`  ✓ Found visible sticky header: ${selector}`);
        stickyVisibleBefore = true;

        // Get its properties
        const props = await element.evaluate(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return {
            position: style.position,
            display: style.display,
            visibility: style.visibility,
            top: rect.top,
            height: rect.height
          };
        });
        console.log(`    Properties:`, props);
      }
    }
  }

  if (!stickyVisibleBefore) {
    console.log('  ⚠️ No sticky header visible (may need more scroll or different page)');
  }

  console.log('\n🔧 Enabling full-width mode...');
  await page.keyboard.press('Meta+Shift+W');
  await page.waitForTimeout(1000);

  // Verify the toggle button shows active state
  const toggleButton = await page.$('#github-fullwidth-toggle');
  expect(toggleButton).toBeTruthy();
  const buttonColor = await toggleButton?.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );
  console.log(`  Toggle button color: ${buttonColor}`);
  expect(buttonColor).toContain('46, 164, 79'); // Green color RGB values

  console.log('\n🔍 Checking sticky header AFTER full-width mode...');
  let anyStickyVisible = false;
  for (const selector of stickyHeaderBeforeSelectors) {
    const element = await page.$(selector);
    if (element) {
      const isVisible = await element.isVisible();
      const display = await element.evaluate(el => window.getComputedStyle(el).display);

      if (isVisible || display !== 'none') {
        console.log(`  ❌ FAIL: Sticky header still visible: ${selector}`);
        console.log(`     Display: ${display}, Visible: ${isVisible}`);
        anyStickyVisible = true;
      } else {
        console.log(`  ✅ Hidden: ${selector}`);
      }
    }
  }

  // Also check by evaluating all sticky elements
  const stickyElementsCheck = await page.evaluate(() => {
    const results: any[] = [];
    const selectors = [
      '#issue-viewer-sticky-header',
      '.HeaderMetadata-module__stickyContainer--JBJvS',
      '[class*="stickyContainer"]',
      '[class*="stickyHeader"]'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (style.display !== 'none' && rect.height > 0) {
          results.push({
            selector,
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            display: style.display,
            visibility: style.visibility,
            position: style.position,
            height: rect.height
          });
        }
      });
    });

    return results;
  });

  if (stickyElementsCheck.length > 0) {
    console.log('\n  ⚠️ Found potentially visible sticky elements:');
    stickyElementsCheck.forEach(el => {
      console.log(`    - ${el.selector}: ${el.display}, height: ${el.height}px`);
    });
  }

  console.log('\n📸 Taking screenshot for visual verification...');
  await page.screenshot({
    path: 'test-sticky-header-fullwidth.png',
    fullPage: false
  });

  // Final assertion
  console.log('\n📊 Test Results:');
  if (!anyStickyVisible && stickyElementsCheck.length === 0) {
    console.log('✅ SUCCESS: Sticky header is properly hidden in full-width mode!');
  } else {
    console.log('❌ FAILURE: Sticky header is still visible in full-width mode.');
    console.log('   This may require additional CSS selectors.');
  }

  // Test scrolling further
  console.log('\n📜 Testing with more scrolling...');
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(500);

  const afterMoreScroll = await page.evaluate(() => {
    const sticky = document.querySelector('#issue-viewer-sticky-header');
    if (!sticky) return null;
    const style = window.getComputedStyle(sticky);
    return {
      display: style.display,
      visibility: style.visibility
    };
  });

  console.log('  Sticky header after more scroll:', afterMoreScroll || 'Not found');

  await browser.close();
  console.log('\n✨ Test complete! Check test-sticky-header-fullwidth.png');
}

testStickyHeaderHiding().catch(console.error);
