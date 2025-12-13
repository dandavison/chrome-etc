"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const OUTPUT_DIR = path_1.default.join(__dirname, 'dom-analysis');
async function ensureOutputDir() {
    if (!fs_1.default.existsSync(OUTPUT_DIR)) {
        fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
}
async function analyzeDOMStructure() {
    console.log('🔍 DOM Structure Analysis for GitHub Issues\n');
    await ensureOutputDir();
    // Launch Chrome with the extension
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
    // Navigate to a GitHub issue
    console.log('📍 Navigating to GitHub issue...');
    await page.goto('https://github.com/dandavison/delta/issues/71', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    // Analyze the DOM structure
    console.log('\n🔬 Analyzing DOM structure...\n');
    const domAnalysis = await page.evaluate(() => {
        const result = {
            sidebar: {},
            mainContent: {},
            containers: {}
        };
        // Find potential sidebar elements
        const sidebarCandidates = [
            document.querySelector('[aria-label*="Sidebar"]'),
            document.querySelector('[aria-label*="sidebar"]'),
            document.querySelector('.Layout-sidebar'),
            document.querySelector('[data-testid*="sidebar"]'),
            document.querySelector('aside'),
            // Look for elements containing assignees, labels, etc
            Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Assignees') &&
                el.textContent?.includes('Labels') &&
                el.textContent?.includes('Projects'))
        ];
        // Find the actual sidebar element
        let actualSidebar = null;
        for (const candidate of sidebarCandidates) {
            if (candidate && candidate.textContent?.includes('Assignees')) {
                actualSidebar = candidate;
                break;
            }
        }
        if (actualSidebar) {
            // Get detailed info about the sidebar
            result.sidebar = {
                found: true,
                tagName: actualSidebar.tagName,
                className: actualSidebar.className,
                id: actualSidebar.id,
                attributes: Array.from(actualSidebar.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                })),
                parentClassName: actualSidebar.parentElement?.className,
                parentTagName: actualSidebar.parentElement?.tagName,
                grandparentClassName: actualSidebar.parentElement?.parentElement?.className,
                width: actualSidebar.offsetWidth,
                computedStyle: {
                    display: window.getComputedStyle(actualSidebar).display,
                    width: window.getComputedStyle(actualSidebar).width
                }
            };
            // Find the best selector for this element
            const possibleSelectors = [];
            if (actualSidebar.id) {
                possibleSelectors.push(`#${actualSidebar.id}`);
            }
            if (actualSidebar.className) {
                possibleSelectors.push(`.${actualSidebar.className.split(' ')[0]}`);
            }
            for (let i = 0; i < actualSidebar.attributes.length; i++) {
                const attr = actualSidebar.attributes[i];
                if (attr.name !== 'class' && attr.name !== 'id') {
                    possibleSelectors.push(`[${attr.name}="${attr.value}"]`);
                }
            }
            result.sidebar.selectors = possibleSelectors;
        }
        else {
            result.sidebar = { found: false, message: 'Could not find sidebar element' };
        }
        // Find the main content area
        const mainContentCandidates = [
            document.querySelector('.repository-content'),
            document.querySelector('[role="main"]'),
            document.querySelector('main'),
            document.querySelector('.Layout-main'),
            // Look for the discussion/timeline container
            document.querySelector('.js-discussion'),
            document.querySelector('.timeline-comment'),
            actualSidebar?.parentElement?.querySelector(':not(aside)')
        ];
        let actualMainContent = null;
        for (const candidate of mainContentCandidates) {
            if (candidate && !candidate.textContent?.includes('Assignees')) {
                actualMainContent = candidate;
                break;
            }
        }
        if (actualMainContent) {
            result.mainContent = {
                found: true,
                tagName: actualMainContent.tagName,
                className: actualMainContent.className,
                id: actualMainContent.id,
                width: actualMainContent.offsetWidth,
                computedStyle: {
                    maxWidth: window.getComputedStyle(actualMainContent).maxWidth,
                    width: window.getComputedStyle(actualMainContent).width
                }
            };
        }
        // Find parent containers that might need adjustment
        if (actualSidebar && actualMainContent) {
            // Find common parent
            let commonParent = actualSidebar.parentElement;
            while (commonParent && !commonParent.contains(actualMainContent)) {
                commonParent = commonParent.parentElement;
            }
            if (commonParent) {
                result.containers.common = {
                    tagName: commonParent.tagName,
                    className: commonParent.className,
                    id: commonParent.id,
                    computedStyle: {
                        display: window.getComputedStyle(commonParent).display,
                        gridTemplateColumns: window.getComputedStyle(commonParent).gridTemplateColumns,
                        flexDirection: window.getComputedStyle(commonParent).flexDirection
                    }
                };
            }
        }
        // Check for BorderGrid structure
        const borderGridCells = document.querySelectorAll('.BorderGrid-cell');
        if (borderGridCells.length > 0) {
            result.borderGrid = {
                found: true,
                cellCount: borderGridCells.length,
                cells: Array.from(borderGridCells).map((cell, index) => ({
                    index,
                    className: cell.className,
                    width: cell.getAttribute('width'),
                    offsetWidth: cell.offsetWidth,
                    containsSidebar: cell.textContent?.includes('Assignees') || false,
                    attributes: Array.from(cell.attributes).map(attr => ({
                        name: attr.name,
                        value: attr.value.substring(0, 100) // Truncate long values
                    }))
                }))
            };
        }
        return result;
    });
    // Save the analysis to a file
    const analysisFile = path_1.default.join(OUTPUT_DIR, 'dom-analysis.json');
    fs_1.default.writeFileSync(analysisFile, JSON.stringify(domAnalysis, null, 2));
    console.log('📝 DOM analysis saved to:', analysisFile);
    // Print summary
    console.log('\n📊 Analysis Summary:\n');
    console.log('Sidebar:', domAnalysis.sidebar.found ? '✅ Found' : '❌ Not found');
    if (domAnalysis.sidebar.found) {
        console.log('  - Tag:', domAnalysis.sidebar.tagName);
        console.log('  - Class:', domAnalysis.sidebar.className);
        console.log('  - Width:', domAnalysis.sidebar.width + 'px');
        console.log('  - Possible selectors:', domAnalysis.sidebar.selectors?.join(', '));
    }
    console.log('\nMain Content:', domAnalysis.mainContent.found ? '✅ Found' : '❌ Not found');
    if (domAnalysis.mainContent.found) {
        console.log('  - Tag:', domAnalysis.mainContent.tagName);
        console.log('  - Class:', domAnalysis.mainContent.className);
        console.log('  - Width:', domAnalysis.mainContent.width + 'px');
    }
    if (domAnalysis.borderGrid) {
        console.log('\nBorderGrid Structure: ✅ Found');
        console.log('  - Cell count:', domAnalysis.borderGrid.cellCount);
        domAnalysis.borderGrid.cells.forEach((cell) => {
            console.log(`  - Cell ${cell.index}: width="${cell.width}", offsetWidth=${cell.offsetWidth}px, sidebar=${cell.containsSidebar}`);
        });
    }
    // Now test toggling with console output
    console.log('\n🧪 Testing toggle functionality...\n');
    // Enable console message capture
    page.on('console', msg => {
        if (msg.text().includes('[GitHub Full Width]')) {
            console.log('Console:', msg.text());
        }
    });
    // Click the toggle button
    const toggleButton = await page.$('#github-fullwidth-toggle');
    if (toggleButton) {
        console.log('🖱️ Clicking toggle button...');
        await toggleButton.click();
        await page.waitForTimeout(1000);
        // Check what changed
        const afterToggle = await page.evaluate(() => {
            const sidebar = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Assignees') &&
                el.textContent?.includes('Labels'));
            return {
                sidebarVisible: sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false,
                sidebarWidth: sidebar ? sidebar.offsetWidth : 0
            };
        });
        console.log('\nAfter toggle:');
        console.log('  - Sidebar visible:', afterToggle.sidebarVisible ? 'YES ❌' : 'NO ✅');
        console.log('  - Sidebar width:', afterToggle.sidebarWidth + 'px');
    }
    else {
        console.log('❌ Toggle button not found!');
    }
    console.log('\n✅ Analysis complete! Check dom-analysis/dom-analysis.json for details.');
    await page.waitForTimeout(5000); // Keep open for inspection
    await context.close();
}
analyzeDOMStructure().catch(console.error);
//# sourceMappingURL=test-dom-inspector.js.map