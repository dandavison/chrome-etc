import { chromium } from 'playwright';
import path from 'path';

async function quickCheck() {
  const extensionPath = path.resolve(__dirname, '..', 'dist');

  console.log('🌐 Loading extension from:', extensionPath);

  const context = await chromium.launchPersistentContext('', {
    headless: false, // Show browser to see what's happening
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    timeout: 15000,
  });

  const page = await context.newPage();
  console.log('📍 Navigating to issue #70...');
  await page.goto('https://github.com/dandavison/log/issues/70', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  console.log('⏳ Waiting for content to load...');
  await page.waitForTimeout(5000);

  // Check page content
  const pageInfo = await page.evaluate(() => {
    return {
      codeBlocks: document.querySelectorAll('pre').length,
      copyButtons: document.querySelectorAll('clipboard-copy').length,
      codeElements: document.querySelectorAll('code').length,
      issueBody: !!document.querySelector('.js-comment-body'),
      hasContent: document.body.textContent?.includes('ListActivityExecutions') || false
    };
  });

  // Quick check
  const copyButtons = await page.$$eval('clipboard-copy', elements => elements.length);
  const visibleCopyButtons = await page.$$eval('clipboard-copy', elements =>
    elements.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).length
  );

  // Check what CSS is applied
  const cssRule = await page.evaluate(() => {
    const styleEl = document.getElementById('github-mermaid-cleaner-styles');
    if (styleEl && styleEl.textContent) {
      const match = styleEl.textContent.match(/clipboard-copy[^}]+}/);
      return match ? match[0] : 'not found';
    }
    return 'no styles';
  });

  console.log('📄 Page info:', pageInfo);

  console.log(`📋 Copy buttons: ${copyButtons} total, ${visibleCopyButtons} visible`);
  console.log(`🎨 CSS rule: ${cssRule}`);

  if (copyButtons === 0 && pageInfo.codeBlocks === 0) {
    console.log('⚠️ Page may not have loaded properly - no code blocks found');
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'test/issue70-screenshot.png' });
  } else if (copyButtons === 0) {
    console.log('❌ No copy buttons found!');
  } else if (visibleCopyButtons === 0) {
    console.log('❌ Copy buttons exist but are all hidden!');
  } else if (visibleCopyButtons === copyButtons) {
    console.log('✅ All copy buttons are visible!');
  } else {
    console.log(`⚠️ ${copyButtons - visibleCopyButtons} of ${copyButtons} buttons are hidden`);
  }

  console.log('\n🔍 Browser will stay open for 5 seconds...');
  await page.waitForTimeout(5000);

  await context.close();
}

quickCheck().catch(console.error);
