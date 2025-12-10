import { chromium, Page, BrowserContext } from 'playwright';
import { expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const GITHUB_ISSUES = [
  'https://github.com/microsoft/vscode/issues/1',
  'https://github.com/facebook/react/issues/7',
  'https://github.com/golang/go/issues/71'
];

interface TestResult {
  url: string;
  passed: boolean;
  sidebarHiddenCorrectly: boolean;
  contentExpandedCorrectly: boolean;
  toggleButtonWorking: boolean;
  details: {
    sidebarInitiallyVisible: boolean;
    sidebarHiddenAfterToggle: boolean;
    sidebarRestoredAfterToggle: boolean;
    contentWidthBefore: number;
    contentWidthAfter: number;
    contentWidthRestored: number;
    widthIncreasePercentage: number;
  };
  errors: string[];
}

async function runExtensionTests(): Promise<TestResult[]> {
  console.log('🚀 Starting Automated Extension Tests with Assertions\n');

  const results: TestResult[] = [];

  // Launch Chrome with the extension
  const context = await chromium.launchPersistentContext('', {
    headless: false, // Set to true for CI/CD
    args: [
      `--disable-extensions-except=${__dirname}`,
      `--load-extension=${__dirname}`,
      '--no-sandbox',
    ],
    viewport: { width: 1920, height: 1080 },
  });

  console.log('✅ Chrome launched with extension loaded\n');

  for (const issueUrl of GITHUB_ISSUES) {
    const result = await testIssue(context, issueUrl);
    results.push(result);

    // Print immediate feedback
    console.log(`\n${result.passed ? '✅' : '❌'} ${issueUrl}`);
    if (!result.passed) {
      result.errors.forEach(err => console.log(`   ⚠️ ${err}`));
    }
  }

  await context.close();

  // Generate test report
  generateTestReport(results);

  return results;
}

async function testIssue(context: BrowserContext, url: string): Promise<TestResult> {
  const result: TestResult = {
    url,
    passed: false,
    sidebarHiddenCorrectly: false,
    contentExpandedCorrectly: false,
    toggleButtonWorking: false,
    details: {
      sidebarInitiallyVisible: false,
      sidebarHiddenAfterToggle: false,
      sidebarRestoredAfterToggle: false,
      contentWidthBefore: 0,
      contentWidthAfter: 0,
      contentWidthRestored: 0,
      widthIncreasePercentage: 0
    },
    errors: []
  };

  const page = await context.newPage();

  try {
    // Navigate to the issue
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Allow extension to initialize

    // ASSERTION 1: Toggle button should exist
    const toggleButton = page.locator('#github-fullwidth-toggle');
    await expect(toggleButton).toBeVisible({ timeout: 5000 });
    result.toggleButtonWorking = true;

    // ASSERTION 2: Find the sidebar using multiple possible selectors
    const sidebarSelectors = [
      '[data-testid="sticky-sidebar"]',
      '.IssueViewer-module__metadataSidebar--QdJ2b',
      '[class*="metadataSidebar"]',
      '.Layout-sidebar',
      '.BorderGrid-cell[width="296"]'
    ];

    let sidebar = null;
    for (const selector of sidebarSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        sidebar = element;
        break;
      }
    }

    if (!sidebar) {
      result.errors.push('Could not find sidebar element');
      return result;
    }

    // ASSERTION 3: Sidebar should initially be visible
    await expect(sidebar).toBeVisible();
    result.details.sidebarInitiallyVisible = true;

    // ASSERTION 4: Find main content area
    const contentSelectors = [
      '.IssueViewer-module__contentArea--IpMnd',
      '[class*="contentArea"]',
      '.repository-content',
      '.js-discussion',
      '.BorderGrid-cell:not([width="296"])'
    ];

    let mainContent = null;
    for (const selector of contentSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        mainContent = element;
        break;
      }
    }

    if (!mainContent) {
      result.errors.push('Could not find main content element');
      return result;
    }

    // Measure initial width
    result.details.contentWidthBefore = await mainContent.evaluate(el => el.getBoundingClientRect().width);

    // ASSERTION 5: Click toggle button
    await toggleButton.click();
    await page.waitForTimeout(1500); // Wait for CSS transitions

    // ASSERTION 6: Sidebar should be hidden after toggle
    await expect(sidebar).toBeHidden({ timeout: 3000 });
    result.details.sidebarHiddenAfterToggle = true;
    result.sidebarHiddenCorrectly = true;

    // ASSERTION 7: Content should have expanded
    result.details.contentWidthAfter = await mainContent.evaluate(el => el.getBoundingClientRect().width);
    const widthIncrease = result.details.contentWidthAfter - result.details.contentWidthBefore;
    result.details.widthIncreasePercentage = (widthIncrease / result.details.contentWidthBefore) * 100;

    if (widthIncrease > 200) { // Should increase by at least 200px (sidebar width is ~296px)
      result.contentExpandedCorrectly = true;
    } else {
      result.errors.push(`Content width only increased by ${widthIncrease}px (expected > 200px)`);
    }

    // ASSERTION 8: Toggle back and verify restoration
    await toggleButton.click();
    await page.waitForTimeout(1500);

    await expect(sidebar).toBeVisible({ timeout: 3000 });
    result.details.sidebarRestoredAfterToggle = true;

    result.details.contentWidthRestored = await mainContent.evaluate(el => el.getBoundingClientRect().width);

    // Check if width was properly restored (within 10px tolerance)
    if (Math.abs(result.details.contentWidthRestored - result.details.contentWidthBefore) > 10) {
      result.errors.push('Content width not properly restored after toggling off');
    }

    // Overall pass/fail
    result.passed = result.sidebarHiddenCorrectly &&
                   result.contentExpandedCorrectly &&
                   result.toggleButtonWorking &&
                   result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Test failed with error: ${error}`);
  } finally {
    await page.close();
  }

  return result;
}

function generateTestReport(results: TestResult[]) {
  const reportPath = path.join(__dirname, 'test-report.json');
  const markdownPath = path.join(__dirname, 'test-report.md');

  // Save JSON report
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // Generate markdown report
  let markdown = '# GitHub Full-Width Extension Test Report\n\n';
  markdown += `**Date:** ${new Date().toISOString()}\n\n`;
  markdown += `**Total Tests:** ${results.length}\n`;
  markdown += `**Passed:** ${results.filter(r => r.passed).length}\n`;
  markdown += `**Failed:** ${results.filter(r => !r.passed).length}\n\n`;

  markdown += '## Test Results\n\n';

  for (const result of results) {
    markdown += `### ${result.passed ? '✅' : '❌'} ${result.url}\n\n`;
    markdown += `- **Toggle Button:** ${result.toggleButtonWorking ? '✅' : '❌'}\n`;
    markdown += `- **Sidebar Hidden:** ${result.sidebarHiddenCorrectly ? '✅' : '❌'}\n`;
    markdown += `- **Content Expanded:** ${result.contentExpandedCorrectly ? '✅' : '❌'}\n`;
    markdown += `- **Width Increase:** ${result.details.widthIncreasePercentage.toFixed(1)}%\n`;
    markdown += `  - Before: ${result.details.contentWidthBefore}px\n`;
    markdown += `  - After: ${result.details.contentWidthAfter}px\n`;

    if (result.errors.length > 0) {
      markdown += '\n**Errors:**\n';
      result.errors.forEach(err => markdown += `- ${err}\n`);
    }
    markdown += '\n';
  }

  fs.writeFileSync(markdownPath, markdown);

  console.log(`\n📊 Test reports saved:`);
  console.log(`   - JSON: ${reportPath}`);
  console.log(`   - Markdown: ${markdownPath}\n`);
}

// Run the tests
runExtensionTests()
  .then(results => {
    const passed = results.every(r => r.passed);
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
