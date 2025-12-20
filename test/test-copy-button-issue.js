"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const path_1 = __importDefault(require("path"));
async function checkCopyButtonsOnIssue70() {
    console.log('🔍 Checking for copy buttons on issue #70\n');
    const extensionPath = path_1.default.resolve(__dirname, '..', 'dist');
    // Launch Chrome with the extension loaded
    console.log('🌐 Launching Chrome with extension...');
    console.log('📁 Extension path:', extensionPath);
    const context = await playwright_1.chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
        ],
        viewport: { width: 1920, height: 1080 },
    });
    console.log('✅ Chrome launched with extension loaded\n');
    const page = await context.newPage();
    // Navigate to the issue
    const issueUrl = 'https://github.com/dandavison/log/issues/70';
    console.log(`📍 Navigating to: ${issueUrl}`);
    await page.goto(issueUrl, { waitUntil: 'networkidle' });
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(3000);
    console.log('🔎 Checking for code blocks and copy buttons...\n');
    // Check for code blocks
    const codeBlocks = await page.$$('pre');
    console.log(`📦 Found ${codeBlocks.length} code blocks`);
    // Check for copy buttons (GitHub uses clipboard-copy elements)
    const copyButtons = await page.$$('clipboard-copy');
    console.log(`📋 Found ${copyButtons.length} copy buttons`);
    // Check if copy buttons are visible
    let visibleCopyButtons = 0;
    let hiddenCopyButtons = 0;
    for (let i = 0; i < copyButtons.length; i++) {
        const isVisible = await copyButtons[i].isVisible();
        if (isVisible) {
            visibleCopyButtons++;
        }
        else {
            hiddenCopyButtons++;
        }
    }
    console.log(`\n📊 Copy button visibility:`);
    console.log(`  ✅ Visible: ${visibleCopyButtons}`);
    console.log(`  ❌ Hidden: ${hiddenCopyButtons}`);
    // Get more details about the copy buttons
    if (copyButtons.length > 0) {
        console.log('\n🔍 Checking copy button details:');
        for (let i = 0; i < Math.min(3, copyButtons.length); i++) {
            const button = copyButtons[i];
            const ariaLabel = await button.getAttribute('aria-label');
            const isVisible = await button.isVisible();
            const computedStyle = await button.evaluate(el => {
                const style = window.getComputedStyle(el);
                return {
                    display: style.display,
                    visibility: style.visibility,
                    opacity: style.opacity
                };
            });
            console.log(`  Button ${i + 1}:`);
            console.log(`    - aria-label: "${ariaLabel}"`);
            console.log(`    - visible: ${isVisible}`);
            console.log(`    - computed style: display=${computedStyle.display}, visibility=${computedStyle.visibility}, opacity=${computedStyle.opacity}`);
        }
    }
    // Check what CSS is being applied
    console.log('\n🎨 Checking applied CSS:');
    const appliedStyles = await page.evaluate(() => {
        const styleEl = document.getElementById('github-mermaid-cleaner-styles');
        if (styleEl) {
            return {
                found: true,
                content: styleEl.innerHTML.substring(0, 500) + '...'
            };
        }
        return { found: false, content: null };
    });
    if (appliedStyles.found) {
        console.log('  Mermaid cleaner styles ARE injected:');
        console.log('  ' + appliedStyles.content?.split('\n').slice(0, 10).join('\n  '));
    }
    else {
        console.log('  ❌ Mermaid cleaner styles NOT found');
    }
    // Check for mermaid diagrams on the page
    const mermaidSections = await page.$$('section[data-type="mermaid"]');
    console.log(`\n🎭 Found ${mermaidSections.length} Mermaid diagram sections`);
    // Summary
    console.log('\n' + '='.repeat(60));
    if (copyButtons.length === 0) {
        console.log('❌ ISSUE CONFIRMED: No copy buttons found at all!');
    }
    else if (hiddenCopyButtons > 0 && mermaidSections.length === 0) {
        console.log('❌ ISSUE CONFIRMED: Copy buttons are hidden but there are no Mermaid diagrams!');
        console.log('   The CSS is hiding ALL copy buttons, not just Mermaid ones.');
    }
    else if (visibleCopyButtons === copyButtons.length) {
        console.log('✅ Copy buttons are visible and working');
    }
    else {
        console.log('⚠️  Mixed state: Some copy buttons visible, some hidden');
    }
    console.log('='.repeat(60));
    console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    await context.close();
}
// Run the check
checkCopyButtonsOnIssue70().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-copy-button-issue.js.map