"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Test configuration
const GITHUB_ISSUES = [
    'https://github.com/microsoft/vscode/issues/1',
    'https://github.com/facebook/react/issues/7',
    'https://github.com/golang/go/issues/71' // Go issue with long discussion
];
const SCREENSHOTS_DIR = path_1.default.join(__dirname, 'test-screenshots');
async function ensureScreenshotsDir() {
    if (!fs_1.default.existsSync(SCREENSHOTS_DIR)) {
        fs_1.default.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
}
async function takeScreenshot(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const filepath = path_1.default.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({
        path: filepath,
        fullPage: false, // Just the viewport to see the layout clearly
    });
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
}
async function testFullWidthToggle(context, issueUrl, issueId) {
    console.log(`\n🧪 Testing issue: ${issueUrl}`);
    const page = await context.newPage();
    // Set a reasonable viewport size
    await page.setViewportSize({ width: 1920, height: 1080 });
    // Navigate to the GitHub issue
    console.log('  📍 Navigating to issue...');
    await page.goto(issueUrl, { waitUntil: 'networkidle' });
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    // Take a "before" screenshot
    console.log('  📸 Taking "before" screenshot...');
    await takeScreenshot(page, `${issueId}-before`);
    // Check if our toggle button exists
    const toggleButton = await page.$('#github-fullwidth-toggle');
    if (!toggleButton) {
        console.error('  ❌ Toggle button not found! Extension may not be loaded properly.');
        await page.close();
        return;
    }
    console.log('  ✅ Toggle button found');
    // Log the current state
    const beforeWidth = await page.evaluate(() => {
        const mainContent = document.querySelector('.BorderGrid-cell:not([width="296"])');
        return mainContent ? mainContent.offsetWidth : 0;
    });
    console.log(`  📏 Main content width before: ${beforeWidth}px`);
    // Click the toggle button to enable full-width mode
    console.log('  🖱️ Clicking toggle button...');
    await toggleButton.click();
    // Wait for the CSS changes to apply
    await page.waitForTimeout(1000);
    // Take an "after" screenshot
    console.log('  📸 Taking "after" screenshot...');
    await takeScreenshot(page, `${issueId}-after-fullwidth`);
    // Measure the content width after
    const afterWidth = await page.evaluate(() => {
        const mainContent = document.querySelector('.BorderGrid-cell:not([width="296"])');
        return mainContent ? mainContent.offsetWidth : 0;
    });
    console.log(`  📏 Main content width after: ${afterWidth}px`);
    // Check if the sidebar is hidden
    const sidebarHidden = await page.evaluate(() => {
        const sidebar = document.querySelector('.BorderGrid-cell[width="296"]');
        if (!sidebar)
            return true; // No sidebar found
        const style = window.getComputedStyle(sidebar);
        return style.display === 'none' || style.visibility === 'hidden';
    });
    console.log(`  🎯 Sidebar hidden: ${sidebarHidden ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  📊 Width increased: ${afterWidth > beforeWidth ? 'YES ✅' : 'NO ❌'} (${afterWidth - beforeWidth}px)`);
    // Toggle back off
    console.log('  🖱️ Toggling back to normal...');
    await toggleButton.click();
    await page.waitForTimeout(1000);
    // Take a final screenshot
    await takeScreenshot(page, `${issueId}-after-toggle-off`);
    // Get console logs from the page
    page.on('console', msg => {
        if (msg.text().includes('[GitHub Full Width]')) {
            console.log(`  🖥️ Console: ${msg.text()}`);
        }
    });
    await page.close();
}
async function runTests() {
    console.log('🚀 Starting Chrome Extension Tests\n');
    console.log('📁 Extension path:', __dirname);
    await ensureScreenshotsDir();
    // Launch Chrome with the extension loaded
    console.log('🌐 Launching Chrome with extension...\n');
    const context = await playwright_1.chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${__dirname}`,
            `--load-extension=${__dirname}`,
            '--no-sandbox',
        ],
        viewport: { width: 1920, height: 1080 },
    });
    console.log('✅ Chrome launched with extension loaded\n');
    // Give the extension time to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Test each GitHub issue
    for (let i = 0; i < GITHUB_ISSUES.length; i++) {
        const issueUrl = GITHUB_ISSUES[i];
        const issueId = `issue-${i + 1}`;
        try {
            await testFullWidthToggle(context, issueUrl, issueId);
        }
        catch (error) {
            console.error(`  ❌ Error testing ${issueUrl}:`, error);
        }
    }
    console.log('\n📊 Test Summary:');
    console.log(`  - Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`  - Total issues tested: ${GITHUB_ISSUES.length}`);
    console.log('\n✅ Tests completed! Check the screenshots to verify the extension behavior.\n');
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await context.close();
}
// Run the tests
runTests().catch(console.error);
//# sourceMappingURL=test-fullwidth.js.map