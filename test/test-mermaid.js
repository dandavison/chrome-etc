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
async function testMermaidControlsProperly() {
    console.log('🧪 Testing Mermaid Controls with Proper Verification\n');
    // STEP 1: First, test WITHOUT the extension to establish baseline
    console.log('=== PHASE 1: BASELINE TEST (No Extension) ===');
    const browserWithoutExt = await test_1.chromium.launch({
        headless: false,
        args: ['--no-sandbox']
    });
    const pageWithoutExt = await browserWithoutExt.newPage();
    await pageWithoutExt.setViewportSize({ width: 1400, height: 900 });
    console.log('📍 Loading page WITHOUT extension...');
    await pageWithoutExt.goto('https://github.com/dandavison/test/issues/6');
    await pageWithoutExt.waitForTimeout(4000);
    // Verify controls ARE visible without extension
    const baselineState = await pageWithoutExt.evaluate(() => {
        const results = {
            mainPage: {
                overlayControls: [],
                visibleCount: 0
            },
            iframe: null
        };
        // Check main page controls
        const mermaidSection = document.querySelector('section[data-type="mermaid"], .js-render-needs-enrichment');
        if (mermaidSection) {
            const buttons = mermaidSection.querySelectorAll('button');
            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                results.mainPage.overlayControls.push({
                    ariaLabel: btn.getAttribute('aria-label') || 'unknown',
                    visible: isVisible
                });
                if (isVisible)
                    results.mainPage.visibleCount++;
            });
            const copyButtons = mermaidSection.querySelectorAll('clipboard-copy');
            copyButtons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                results.mainPage.overlayControls.push({
                    ariaLabel: btn.getAttribute('aria-label') || 'clipboard-copy',
                    visible: isVisible
                });
                if (isVisible)
                    results.mainPage.visibleCount++;
            });
        }
        // Check if iframe exists
        const iframe = document.querySelector('iframe.render-viewer');
        if (iframe) {
            results.iframe = {
                present: true,
                src: iframe.src
            };
        }
        return results;
    });
    console.log('\n📊 BASELINE Results (without extension):');
    console.log(`  Main page controls found: ${baselineState.mainPage.overlayControls.length}`);
    console.log(`  Visible controls: ${baselineState.mainPage.visibleCount}`);
    if (baselineState.mainPage.overlayControls.length > 0) {
        console.log('  Control visibility:');
        baselineState.mainPage.overlayControls.forEach((ctrl) => {
            console.log(`    - ${ctrl.ariaLabel}: ${ctrl.visible ? '✓ VISIBLE' : '✗ Hidden'}`);
        });
    }
    // Check iframe controls
    if (baselineState.iframe?.src) {
        const iframePageWithoutExt = await browserWithoutExt.newPage();
        await iframePageWithoutExt.goto(baselineState.iframe.src);
        await iframePageWithoutExt.waitForTimeout(3000);
        const iframeBaseline = await iframePageWithoutExt.evaluate(() => {
            const panel = document.querySelector('.mermaid-viewer-control-panel');
            const buttons = document.querySelectorAll('button');
            let visibleButtons = 0;
            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    visibleButtons++;
                }
            });
            return {
                panelExists: !!panel,
                panelVisible: panel ? window.getComputedStyle(panel).display !== 'none' : false,
                buttonCount: buttons.length,
                visibleButtons: visibleButtons
            };
        });
        console.log('\n  Iframe baseline:');
        console.log(`    Control panel exists: ${iframeBaseline.panelExists}`);
        console.log(`    Control panel visible: ${iframeBaseline.panelVisible}`);
        console.log(`    Total buttons: ${iframeBaseline.buttonCount}`);
        console.log(`    Visible buttons: ${iframeBaseline.visibleButtons}`);
        await iframePageWithoutExt.close();
    }
    // Take baseline screenshot
    await pageWithoutExt.screenshot({ path: 'baseline-with-controls.png' });
    console.log('\n📸 Baseline screenshot saved (with controls visible)');
    await pageWithoutExt.close();
    await browserWithoutExt.close();
    // STEP 2: Now test WITH the extension
    console.log('\n\n=== PHASE 2: TEST WITH EXTENSION ===');
    const extensionPath = path.resolve(__dirname);
    const browserWithExt = await test_1.chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox'
        ],
        viewport: { width: 1400, height: 900 }
    });
    const pageWithExt = await browserWithExt.newPage();
    console.log('📍 Loading page WITH extension...');
    await pageWithExt.goto('https://github.com/dandavison/test/issues/6');
    await pageWithExt.waitForTimeout(4000);
    // Check the same controls with extension
    const withExtensionState = await pageWithExt.evaluate(() => {
        const results = {
            styleInjected: !!document.getElementById('github-mermaid-cleaner-styles'),
            mainPage: {
                overlayControls: [],
                hiddenCount: 0
            }
        };
        // Check main page controls again
        const mermaidSection = document.querySelector('section[data-type="mermaid"], .js-render-needs-enrichment');
        if (mermaidSection) {
            const buttons = mermaidSection.querySelectorAll('button');
            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                const isHidden = style.display === 'none' || style.visibility === 'hidden';
                results.mainPage.overlayControls.push({
                    ariaLabel: btn.getAttribute('aria-label') || 'unknown',
                    hidden: isHidden
                });
                if (isHidden)
                    results.mainPage.hiddenCount++;
            });
            const copyButtons = mermaidSection.querySelectorAll('clipboard-copy');
            copyButtons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                const isHidden = style.display === 'none' || style.visibility === 'hidden';
                results.mainPage.overlayControls.push({
                    ariaLabel: btn.getAttribute('aria-label') || 'clipboard-copy',
                    hidden: isHidden
                });
                if (isHidden)
                    results.mainPage.hiddenCount++;
            });
        }
        return results;
    });
    console.log('\n📊 WITH EXTENSION Results:');
    console.log(`  Style injected: ${withExtensionState.styleInjected ? '✓' : '✗'}`);
    console.log(`  Main page controls found: ${withExtensionState.mainPage.overlayControls.length}`);
    console.log(`  Hidden controls: ${withExtensionState.mainPage.hiddenCount}`);
    if (withExtensionState.mainPage.overlayControls.length > 0) {
        console.log('  Control visibility:');
        withExtensionState.mainPage.overlayControls.forEach((ctrl) => {
            console.log(`    - ${ctrl.ariaLabel}: ${ctrl.hidden ? '✓ HIDDEN' : '✗ Still visible'}`);
        });
    }
    // Check iframe with extension
    if (baselineState.iframe?.src) {
        const iframePageWithExt = await browserWithExt.newPage();
        await iframePageWithExt.goto(baselineState.iframe.src);
        await iframePageWithExt.waitForTimeout(3000);
        const iframeWithExt = await iframePageWithExt.evaluate(() => {
            const styleInjected = !!document.getElementById('github-mermaid-cleaner-styles');
            const panel = document.querySelector('.mermaid-viewer-control-panel');
            const buttons = document.querySelectorAll('button');
            let hiddenButtons = 0;
            buttons.forEach(btn => {
                const style = window.getComputedStyle(btn);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    hiddenButtons++;
                }
            });
            return {
                styleInjected: styleInjected,
                panelHidden: panel ? window.getComputedStyle(panel).display === 'none' : false,
                buttonCount: buttons.length,
                hiddenButtons: hiddenButtons
            };
        });
        console.log('\n  Iframe with extension:');
        console.log(`    Style injected: ${iframeWithExt.styleInjected ? '✓' : '✗'}`);
        console.log(`    Control panel hidden: ${iframeWithExt.panelHidden ? '✓' : '✗'}`);
        console.log(`    Hidden buttons: ${iframeWithExt.hiddenButtons}/${iframeWithExt.buttonCount}`);
        await iframePageWithExt.close();
    }
    // Take screenshot with extension
    await pageWithExt.screenshot({ path: 'with-extension-controls-hidden.png' });
    console.log('\n📸 With-extension screenshot saved (controls should be hidden)');
    // STEP 3: VERIFICATION
    console.log('\n\n=== PHASE 3: VERIFICATION ===');
    const baselineVisible = baselineState.mainPage.visibleCount;
    const withExtHidden = withExtensionState.mainPage.hiddenCount;
    const totalControls = baselineState.mainPage.overlayControls.length;
    console.log('\n🔍 Comparison:');
    console.log(`  Controls visible WITHOUT extension: ${baselineVisible}/${totalControls}`);
    console.log(`  Controls hidden WITH extension: ${withExtHidden}/${totalControls}`);
    if (baselineVisible > 0 && withExtHidden === totalControls) {
        console.log('\n✅ TEST PASSED: Extension successfully hides controls that were initially visible');
    }
    else if (baselineVisible === 0) {
        console.log('\n⚠️  WARNING: No controls were visible in baseline. Cannot verify hiding functionality.');
        console.log('  This might mean:');
        console.log('  - The page structure changed');
        console.log('  - The selectors are wrong');
        console.log('  - The diagram type doesn\'t have controls');
    }
    else if (withExtHidden < totalControls) {
        console.log('\n❌ TEST FAILED: Some controls are still visible with extension');
    }
    await pageWithExt.close();
    await browserWithExt.close();
    console.log('\n✅ Test complete!');
}
testMermaidControlsProperly().catch(console.error);
//# sourceMappingURL=test-mermaid.js.map