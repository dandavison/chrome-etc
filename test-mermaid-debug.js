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
const fs = __importStar(require("fs"));
async function debugMermaidDom() {
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
    // Wait for page to fully load
    await page.waitForTimeout(5000);
    console.log('\n📊 Analyzing DOM structure...\n');
    // Deep DOM inspection
    const domAnalysis = await page.evaluate(() => {
        const results = {
            iframes: [],
            shadowRoots: [],
            mermaidElements: [],
            buttons: [],
            controlPanels: [],
            allElementsWithMermaid: []
        };
        // Check for iframes
        const iframes = document.querySelectorAll('iframe');
        results.iframeCount = iframes.length;
        iframes.forEach((iframe, i) => {
            results.iframes.push({
                src: iframe.src,
                id: iframe.id,
                className: iframe.className,
                width: iframe.width,
                height: iframe.height
            });
            // Try to access iframe content
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    const mermaidInIframe = iframeDoc.querySelectorAll('[class*="mermaid"]');
                    const buttonsInIframe = iframeDoc.querySelectorAll('button');
                    results.iframes[i].containsMermaid = mermaidInIframe.length > 0;
                    results.iframes[i].buttonCount = buttonsInIframe.length;
                }
            }
            catch (e) {
                results.iframes[i].crossOrigin = true;
            }
        });
        // Check all elements for shadow roots
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.shadowRoot) {
                results.shadowRoots.push({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id
                });
                // Check inside shadow root
                const shadowButtons = el.shadowRoot.querySelectorAll('button');
                const shadowMermaid = el.shadowRoot.querySelectorAll('[class*="mermaid"]');
                if (shadowButtons.length > 0 || shadowMermaid.length > 0) {
                    results.shadowRoots[results.shadowRoots.length - 1].buttons = shadowButtons.length;
                    results.shadowRoots[results.shadowRoots.length - 1].mermaid = shadowMermaid.length;
                }
            }
        });
        // Find any element with "mermaid" in class or attributes
        allElements.forEach(el => {
            const className = el.className?.toString() || '';
            const hasM = className.toLowerCase().includes('mermaid');
            const attrs = Array.from(el.attributes || []);
            const hasMermaidAttr = attrs.some(attr => attr.value.toLowerCase().includes('mermaid') ||
                attr.name.toLowerCase().includes('mermaid'));
            if (hasM || hasMermaidAttr) {
                results.allElementsWithMermaid.push({
                    tagName: el.tagName,
                    className: className.substring(0, 100),
                    id: el.id,
                    attributes: attrs.map(a => `${a.name}="${a.value.substring(0, 50)}"`).slice(0, 5)
                });
            }
        });
        // Find all buttons on the page
        const buttons = document.querySelectorAll('button');
        results.totalButtons = buttons.length;
        buttons.forEach(btn => {
            const ariaLabel = btn.getAttribute('aria-label');
            if (ariaLabel && (ariaLabel.includes('Zoom') ||
                ariaLabel.includes('Pan') ||
                ariaLabel.includes('Reset'))) {
                results.buttons.push({
                    ariaLabel: ariaLabel,
                    className: btn.className,
                    parentClass: btn.parentElement?.className,
                    visible: window.getComputedStyle(btn).display !== 'none'
                });
            }
        });
        // Look for control panels
        const controlPanelSelectors = [
            '.mermaid-viewer-control-panel',
            '[class*="control"]',
            '[class*="panel"]',
            '[class*="viewer"]'
        ];
        controlPanelSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach(el => {
                    const className = el.className?.toString() || '';
                    if (className.includes('mermaid') || className.includes('control') || className.includes('viewer')) {
                        const buttonCount = el.querySelectorAll('button').length;
                        if (buttonCount > 0) {
                            results.controlPanels.push({
                                selector: selector,
                                className: className.substring(0, 100),
                                buttonCount: buttonCount,
                                buttons: Array.from(el.querySelectorAll('button')).map(b => b.getAttribute('aria-label'))
                            });
                        }
                    }
                });
            }
        });
        return results;
    });
    console.log('🔍 DOM Analysis Results:');
    console.log('------------------------');
    console.log(`Iframes found: ${domAnalysis.iframeCount}`);
    if (domAnalysis.iframes.length > 0) {
        console.log('Iframe details:', JSON.stringify(domAnalysis.iframes, null, 2));
    }
    console.log(`\nShadow roots found: ${domAnalysis.shadowRoots.length}`);
    if (domAnalysis.shadowRoots.length > 0) {
        console.log('Shadow root details:', JSON.stringify(domAnalysis.shadowRoots, null, 2));
    }
    console.log(`\nElements with "mermaid": ${domAnalysis.allElementsWithMermaid.length}`);
    if (domAnalysis.allElementsWithMermaid.length > 0) {
        console.log('Mermaid elements:', JSON.stringify(domAnalysis.allElementsWithMermaid, null, 2));
    }
    console.log(`\nTotal buttons on page: ${domAnalysis.totalButtons}`);
    console.log(`Control-related buttons: ${domAnalysis.buttons.length}`);
    if (domAnalysis.buttons.length > 0) {
        console.log('Button details:', JSON.stringify(domAnalysis.buttons, null, 2));
    }
    console.log(`\nControl panels found: ${domAnalysis.controlPanels.length}`);
    if (domAnalysis.controlPanels.length > 0) {
        console.log('Control panel details:', JSON.stringify(domAnalysis.controlPanels, null, 2));
    }
    // Save detailed analysis
    fs.writeFileSync('mermaid-dom-analysis.json', JSON.stringify(domAnalysis, null, 2));
    console.log('\n💾 Detailed analysis saved to mermaid-dom-analysis.json');
    // Take screenshot
    await page.screenshot({
        path: 'mermaid-debug.png',
        fullPage: false
    });
    console.log('📸 Screenshot saved to mermaid-debug.png');
    // Close browser after a short delay
    console.log('\n✅ Analysis complete. Closing browser in 2 seconds...');
    await page.waitForTimeout(2000);
    await browser.close();
}
debugMermaidDom().catch(console.error);
//# sourceMappingURL=test-mermaid-debug.js.map