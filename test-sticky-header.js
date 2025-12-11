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
async function investigateStickyHeader() {
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
    console.log('Navigating to GitHub issue...');
    await page.goto('https://github.com/microsoft/vscode/issues/206517');
    await page.waitForTimeout(2000);
    console.log('\n=== BEFORE SCROLLING ===');
    // Check for any potential sticky elements before scrolling
    const potentialStickyBefore = await page.evaluate(() => {
        const elements = [];
        // Look for elements with sticky positioning
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'sticky' || style.position === 'fixed') {
                const rect = el.getBoundingClientRect();
                if (rect.height > 0 && rect.height < 200) { // Reasonable header size
                    elements.push({
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        position: style.position,
                        top: style.top,
                        zIndex: style.zIndex,
                        display: style.display,
                        visibility: style.visibility,
                        height: rect.height,
                        innerHTML: el.innerHTML.substring(0, 100),
                        selector: el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
                    });
                }
            }
        });
        return elements;
    });
    console.log('Potential sticky elements before scroll:', potentialStickyBefore.length);
    potentialStickyBefore.forEach(el => {
        console.log(`  - ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').join('.') : ''}`);
        console.log(`    Position: ${el.position}, Top: ${el.top}, Z-Index: ${el.zIndex}`);
    });
    console.log('\n=== SCROLLING DOWN ===');
    // Scroll down to trigger sticky header
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    // Now check what changed
    console.log('\n=== AFTER SCROLLING ===');
    const stickyHeaderInfo = await page.evaluate(() => {
        const results = {
            stickyElements: [],
            visibilityChanges: [],
            newElements: []
        };
        // Look for sticky/fixed elements that are visible
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if ((style.position === 'sticky' || style.position === 'fixed') &&
                rect.top >= -10 && rect.top <= 100 &&
                rect.height > 0 && rect.height < 200 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden') {
                // Get all attributes
                const attributes = {};
                Array.from(el.attributes).forEach(attr => {
                    attributes[attr.name] = attr.value;
                });
                results.stickyElements.push({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    attributes: attributes,
                    position: style.position,
                    top: style.top,
                    zIndex: style.zIndex,
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity,
                    height: rect.height,
                    rectTop: rect.top,
                    textContent: el.textContent?.substring(0, 100),
                    parentClassName: el.parentElement?.className,
                    parentId: el.parentElement?.id,
                    // Generate multiple possible selectors
                    selectors: [
                        el.id ? `#${el.id}` : null,
                        el.className ? `.${el.className.split(' ').join('.')}` : null,
                        attributes['data-testid'] ? `[data-testid="${attributes['data-testid']}"]` : null,
                        attributes['data-target'] ? `[data-target="${attributes['data-target']}"]` : null,
                        `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}`
                    ].filter(Boolean)
                });
            }
        });
        // Also check for the header specifically
        const issueHeader = document.querySelector('[data-testid="issue-header"]');
        if (issueHeader) {
            const style = window.getComputedStyle(issueHeader);
            const rect = issueHeader.getBoundingClientRect();
            results.issueHeaderInfo = {
                present: true,
                display: style.display,
                position: style.position,
                visibility: style.visibility,
                top: rect.top,
                height: rect.height
            };
        }
        return results;
    });
    console.log('\nSticky elements found:', stickyHeaderInfo.stickyElements.length);
    stickyHeaderInfo.stickyElements.forEach((el) => {
        console.log(`\n  Element: ${el.tagName}`);
        console.log(`  - ID: ${el.id || 'none'}`);
        console.log(`  - Classes: ${el.className || 'none'}`);
        console.log(`  - Position: ${el.position}, Top: ${el.top}, Z-Index: ${el.zIndex}`);
        console.log(`  - Display: ${el.display}, Visibility: ${el.visibility}, Opacity: ${el.opacity}`);
        console.log(`  - Height: ${el.height}px, Top: ${el.rectTop}px`);
        console.log(`  - Text: ${el.textContent?.replace(/\s+/g, ' ')}`);
        console.log(`  - Parent: ${el.parentClassName || el.parentId || 'unknown'}`);
        console.log(`  - Suggested selectors:`);
        el.selectors.forEach((sel) => console.log(`    • ${sel}`));
    });
    if (stickyHeaderInfo.issueHeaderInfo) {
        console.log('\nIssue header info:', stickyHeaderInfo.issueHeaderInfo);
    }
    // Toggle full-width mode to see what it affects
    console.log('\n=== TOGGLING FULL-WIDTH MODE ===');
    await page.keyboard.press('Meta+Shift+W');
    await page.waitForTimeout(1000);
    // Check what's still visible
    const afterToggle = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if ((style.position === 'sticky' || style.position === 'fixed') &&
                rect.top >= -10 && rect.top <= 100 &&
                rect.height > 0 && rect.height < 200 &&
                style.display !== 'none') {
                results.push({
                    tagName: el.tagName,
                    className: el.className,
                    display: style.display,
                    visibility: style.visibility,
                    stillVisible: rect.height > 0 && style.visibility !== 'hidden'
                });
            }
        });
        return results;
    });
    console.log('\nAfter toggling full-width:');
    afterToggle.forEach((el) => {
        if (el.stillVisible) {
            console.log(`  ❌ Still visible: ${el.tagName}.${el.className}`);
        }
        else {
            console.log(`  ✅ Hidden: ${el.tagName}.${el.className}`);
        }
    });
    // Save the analysis
    const analysis = {
        timestamp: new Date().toISOString(),
        beforeScroll: potentialStickyBefore,
        afterScroll: stickyHeaderInfo,
        afterToggle: afterToggle
    };
    fs.writeFileSync('sticky-header-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n💾 Analysis saved to sticky-header-analysis.json');
    console.log('\nPress Ctrl+C to exit...');
    // Keep browser open for manual inspection
    await new Promise(() => { });
}
investigateStickyHeader().catch(console.error);
//# sourceMappingURL=test-sticky-header.js.map