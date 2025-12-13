"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const SCREENSHOTS_DIR = path_1.default.join(__dirname, 'width-modes-screenshots');
async function ensureScreenshotsDir() {
    if (!fs_1.default.existsSync(SCREENSHOTS_DIR)) {
        fs_1.default.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
}
async function testWidthModes() {
    console.log('🎨 Testing Width Modes\n');
    await ensureScreenshotsDir();
    const context = await playwright_1.chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${__dirname}`,
            `--load-extension=${__dirname}`,
            '--no-sandbox',
        ],
        viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();
    // Use the same GitHub issue
    const testUrl = 'https://github.com/dandavison/delta/issues/71';
    console.log('📍 Navigating to:', testUrl);
    await page.goto(testUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const toggleButton = page.locator('#github-fullwidth-toggle');
    await toggleButton.waitFor({ state: 'visible', timeout: 5000 });
    // Screenshot 1: Normal Mode (default)
    console.log('\n📸 Capturing Normal Mode...');
    await page.screenshot({
        path: path_1.default.join(SCREENSHOTS_DIR, '1-normal-mode.png'),
        fullPage: false
    });
    // Click to Wide Mode
    console.log('🖱️ Switching to Wide Mode...');
    await toggleButton.click();
    await page.waitForTimeout(2000);
    // Screenshot 2: Wide Mode
    console.log('📸 Capturing Wide Mode...');
    await page.screenshot({
        path: path_1.default.join(SCREENSHOTS_DIR, '2-wide-mode.png'),
        fullPage: false
    });
    // Measure content width in Wide mode
    const wideWidth = await page.evaluate(() => {
        const content = document.querySelector('.js-discussion') ||
            document.querySelector('[class*="contentArea"]');
        return content ? content.offsetWidth : 0;
    });
    console.log(`   Width: ${wideWidth}px`);
    // Click to Ultra-Wide Mode
    console.log('\n🖱️ Switching to Ultra-Wide Mode...');
    await toggleButton.click();
    await page.waitForTimeout(2000);
    // Screenshot 3: Ultra-Wide Mode
    console.log('📸 Capturing Ultra-Wide Mode...');
    await page.screenshot({
        path: path_1.default.join(SCREENSHOTS_DIR, '3-ultra-wide-mode.png'),
        fullPage: false
    });
    // Measure content width in Ultra-Wide mode
    const ultraWidth = await page.evaluate(() => {
        const content = document.querySelector('.js-discussion') ||
            document.querySelector('[class*="contentArea"]');
        return content ? content.offsetWidth : 0;
    });
    console.log(`   Width: ${ultraWidth}px`);
    // Click back to Normal Mode
    console.log('\n🖱️ Switching back to Normal Mode...');
    await toggleButton.click();
    await page.waitForTimeout(2000);
    // Screenshot 4: Back to Normal
    console.log('📸 Capturing Normal Mode (restored)...');
    await page.screenshot({
        path: path_1.default.join(SCREENSHOTS_DIR, '4-normal-restored.png'),
        fullPage: false
    });
    console.log('\n✅ Width mode testing complete!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\nModes tested:');
    console.log('  1️⃣ Normal Mode - Default GitHub layout');
    console.log('  2️⃣ Wide Mode - Right sidebar hidden');
    console.log('  3️⃣ Ultra-Wide Mode - All sidebars hidden, maximum width');
    await page.waitForTimeout(3000); // Keep open for observation
    await context.close();
}
testWidthModes().catch(console.error);
//# sourceMappingURL=test-width-modes.js.map