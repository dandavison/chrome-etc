"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path = __importStar(require("path"));
async function testMermaidWithIframe() {
    const extensionPath = path.resolve(__dirname);
    const browser = await test_1.chromium.launchPersistentContext('', {
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
            iframeSrc: iframe ? iframe.src : null
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
            const allButtons = controlPanel ? controlPanel.querySelectorAll('button') : [];
            const results = {
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
            iframeCheck.buttonDetails.forEach((btn, i) => {
                console.log(`    ${i + 1}. ${btn.ariaLabel || btn.className}`);
            });
        }
        // Success check
        if (iframeCheck.styleInjected && iframeCheck.controlPanelHidden) {
            console.log('\n✅ SUCCESS: Entire control panel is hidden!');
        }
        else if (!iframeCheck.controlPanelHidden) {
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
//# sourceMappingURL=test-mermaid-iframe.js.map