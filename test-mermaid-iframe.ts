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
    const upperRightButtons = document.querySelectorAll(
      'button[aria-label*="expand"], button[aria-label*="copy"], .render-viewer-actions button'
    );
    return {
      styleInjected: !!styleEl,
      iframePresent: !!iframe,
      iframeSrc: iframe ? (iframe as HTMLIFrameElement).src : null,
      upperRightButtonCount: upperRightButtons.length,
      upperRightButtonsHidden: Array.from(upperRightButtons).map(btn => {
        const style = window.getComputedStyle(btn);
        return {
          ariaLabel: btn.getAttribute('aria-label'),
          hidden: style.display === 'none'
        };
      })
    };
  });

  console.log('Main page:');
  console.log(`  ✓ Style element injected: ${mainPageCheck.styleInjected}`);
  console.log(`  ✓ Mermaid iframe present: ${mainPageCheck.iframePresent}`);
  if (mainPageCheck.iframeSrc) {
    console.log(`  ✓ Iframe source: ${mainPageCheck.iframeSrc.substring(0, 80)}...`);
  }

  console.log(`\n  Upper-right controls: ${mainPageCheck.upperRightButtonCount} found`);
  if (mainPageCheck.upperRightButtonsHidden.length > 0) {
    mainPageCheck.upperRightButtonsHidden.forEach((btn: any) => {
      console.log(`    - ${btn.ariaLabel}: ${btn.hidden ? '✓ Hidden' : '✗ Visible'}`);
    });
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
      const allButtons = controlPanel ? controlPanel.querySelectorAll('button') : [];

      const results: any = {
        styleInjected: !!styleEl,
        controlPanelPresent: !!controlPanel,
        controlPanelHidden: false,
        totalButtonsInPanel: allButtons.length,
        buttonDetails: []
      };

      // Check if entire control panel is hidden
      if (controlPanel) {
        const style = window.getComputedStyle(controlPanel);
        results.controlPanelHidden = style.display === 'none';
        results.controlPanelDisplay = style.display;

        // Get details of all buttons (even if panel is hidden)
        allButtons.forEach(btn => {
          results.buttonDetails.push({
            ariaLabel: btn.getAttribute('aria-label'),
            className: btn.className
          });
        });
      }

      return results;
    });

    console.log('Iframe content:');
    console.log(`  Style injected: ${iframeCheck.styleInjected ? '✓' : '✗'}`);
    console.log(`  Control panel found: ${iframeCheck.controlPanelPresent ? '✓' : '✗'}`);
    console.log(`  Control panel hidden: ${iframeCheck.controlPanelHidden ? '✓' : '✗'} (display: ${iframeCheck.controlPanelDisplay || 'N/A'})`);
    console.log(`  Total buttons in panel: ${iframeCheck.totalButtonsInPanel}`);

    if (iframeCheck.buttonDetails.length > 0) {
      console.log('\n  Buttons in control panel (all hidden):');
      iframeCheck.buttonDetails.forEach((btn: any, i: number) => {
        console.log(`    ${i + 1}. ${btn.ariaLabel || btn.className}`);
      });
    }

    // Success check
    if (iframeCheck.styleInjected && iframeCheck.controlPanelHidden) {
      console.log('\n✅ SUCCESS: Entire control panel is hidden!');
    } else if (!iframeCheck.controlPanelHidden) {
      console.log('\n⚠️  WARNING: Control panel is still visible');
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
