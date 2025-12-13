import { chromium, expect } from '@playwright/test';
import * as path from 'path';

async function testMermaidWithIframe() {
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

  console.log('🌐 Navigating to GitHub issue with Mermaid diagram...');
  await page.goto('https://github.com/dandavison/test/issues/6');

  // Wait for page to load
  await page.waitForTimeout(3000);

  console.log('\n📊 Verifying extension injection...');

  // Check that our style element was injected in the main page
  const mainPageCheck = await page.evaluate(() => {
    const styleEl = document.getElementById('github-mermaid-cleaner-styles');
    const iframe = document.querySelector('iframe.render-viewer');
    return {
      styleInjected: !!styleEl,
      iframePresent: !!iframe,
      iframeSrc: iframe ? (iframe as HTMLIFrameElement).src : null
    };
  });

  console.log('Main page:');
  console.log(`  ✓ Style element injected: ${mainPageCheck.styleInjected}`);
  console.log(`  ✓ Mermaid iframe present: ${mainPageCheck.iframePresent}`);
  if (mainPageCheck.iframeSrc) {
    console.log(`  ✓ Iframe source: ${mainPageCheck.iframeSrc.substring(0, 80)}...`);
  }

  // Now we need to navigate directly to the iframe URL to test if our styles work there
  if (mainPageCheck.iframeSrc) {
    console.log('\n🔍 Testing iframe content directly...');

    // Open the iframe URL in a new page
    const iframePage = await browser.newPage();
    await iframePage.goto(mainPageCheck.iframeSrc);
    await iframePage.waitForTimeout(3000);

    // Check if our styles are injected in the iframe
    const iframeCheck = await iframePage.evaluate(() => {
      const styleEl = document.getElementById('github-mermaid-cleaner-styles');
      const controlPanel = document.querySelector('.mermaid-viewer-control-panel');
      const panButtons = document.querySelectorAll('.mermaid-viewer-control-panel button.up, .mermaid-viewer-control-panel button.down, .mermaid-viewer-control-panel button.left, .mermaid-viewer-control-panel button.right');
      const zoomButtons = document.querySelectorAll('.mermaid-viewer-control-panel button.zoom-in, .mermaid-viewer-control-panel button.zoom-out, .mermaid-viewer-control-panel button.reset');

      const results: any = {
        styleInjected: !!styleEl,
        controlPanelPresent: !!controlPanel,
        panButtonCount: panButtons.length,
        zoomButtonCount: zoomButtons.length,
        panButtonsHidden: [],
        zoomButtonsVisible: []
      };

      // Check visibility of pan buttons
      panButtons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        results.panButtonsHidden.push({
          class: btn.className,
          display: style.display,
          hidden: style.display === 'none'
        });
      });

      // Check visibility of zoom buttons
      zoomButtons.forEach(btn => {
        const style = window.getComputedStyle(btn);
        results.zoomButtonsVisible.push({
          class: btn.className,
          display: style.display,
          visible: style.display !== 'none'
        });
      });

      return results;
    });

    console.log('Iframe content:');
    console.log(`  Style injected: ${iframeCheck.styleInjected ? '✓' : '✗'}`);
    console.log(`  Control panel found: ${iframeCheck.controlPanelPresent ? '✓' : '✗'}`);
    console.log(`  Pan buttons found: ${iframeCheck.panButtonCount}`);
    console.log(`  Zoom buttons found: ${iframeCheck.zoomButtonCount}`);

    if (iframeCheck.panButtonsHidden.length > 0) {
      console.log('\n  Pan button visibility:');
      iframeCheck.panButtonsHidden.forEach((btn: any, i: number) => {
        console.log(`    Button ${i + 1}: ${btn.hidden ? '✓ Hidden' : '✗ Visible'} (${btn.display})`);
      });
    }

    if (iframeCheck.zoomButtonsVisible.length > 0) {
      console.log('\n  Zoom button visibility:');
      iframeCheck.zoomButtonsVisible.forEach((btn: any, i: number) => {
        console.log(`    Button ${i + 1}: ${btn.visible ? '✓ Visible' : '✗ Hidden'} (${btn.display})`);
      });
    }

    // Take screenshot of the iframe page
    await iframePage.screenshot({
      path: 'mermaid-iframe-test.png',
      fullPage: false
    });
    console.log('\n📸 Iframe screenshot saved to mermaid-iframe-test.png');

    await iframePage.close();
  }

  // Take screenshot of the main page
  await page.screenshot({
    path: 'mermaid-main-page-test.png',
    fullPage: false
  });
  console.log('📸 Main page screenshot saved to mermaid-main-page-test.png');

  await browser.close();

  console.log('\n✅ Test complete!');
  if (!mainPageCheck.styleInjected) {
    console.error('⚠️  Warning: Styles were not injected properly');
    process.exit(1);
  }
}

testMermaidWithIframe().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
