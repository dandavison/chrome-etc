import { chromium, Page, BrowserContext } from 'playwright';
import path from 'path';

// Test configuration - use real GitHub issues
const GITHUB_ISSUES = [
  'https://github.com/microsoft/vscode/issues/1',
  'https://github.com/facebook/react/issues/7',
];

async function testCommentFold(context: BrowserContext, issueUrl: string, issueId: string): Promise<boolean> {
  console.log(`\n🧪 Testing comment fold on: ${issueUrl}`);

  const page = await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate to the GitHub issue
  console.log('  📍 Navigating to issue...');
  await page.goto(issueUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  let success = true;

  // Test 1: Toggle button should exist
  console.log('  🔍 Test 1: Checking for fold toggle button...');
  const toggleButton = await page.$('#github-comment-fold-toggle');
  if (!toggleButton) {
    console.error('  ❌ Test 1 FAILED: Fold toggle button not found!');
    await page.close();
    return false;
  }
  console.log('  ✅ Test 1 PASSED: Toggle button exists');

  // Find markdown-body elements and measure their heights before folding
  console.log('  🔍 Test 2: Measuring comment heights before fold...');
  const heightsBefore = await page.evaluate(() => {
    const elements = document.querySelectorAll('.markdown-body');
    return Array.from(elements).map(el => ({
      height: (el as HTMLElement).offsetHeight,
      className: el.className,
      parentClass: el.parentElement?.className || 'no-parent'
    }));
  });

  console.log(`  📏 Found ${heightsBefore.length} markdown-body elements`);
  if (heightsBefore.length === 0) {
    console.error('  ❌ Test 2 FAILED: No markdown-body elements found!');
    await page.close();
    return false;
  }

  // Log what we found
  heightsBefore.slice(0, 3).forEach((h, i) => {
    console.log(`     Element ${i}: height=${h.height}px, parent=${h.parentClass.slice(0, 50)}`);
  });

  // Click the toggle button to enable fold mode
  console.log('  🖱️ Clicking fold toggle button...');
  await toggleButton.click();
  await page.waitForTimeout(500);

  // Test 3: Check if fold class was added to body
  console.log('  🔍 Test 3: Checking if fold class was applied...');
  const hasFoldClass = await page.evaluate(() => {
    return document.body.classList.contains('github-comments-folded');
  });

  if (!hasFoldClass) {
    console.error('  ❌ Test 3 FAILED: Body does not have github-comments-folded class!');
    success = false;
  } else {
    console.log('  ✅ Test 3 PASSED: Fold class applied to body');
  }

  // Test 4: Check if fold styles element exists
  console.log('  🔍 Test 4: Checking if fold styles were injected...');
  const hasStyles = await page.evaluate(() => {
    return document.getElementById('github-comment-fold-styles') !== null;
  });

  if (!hasStyles) {
    console.error('  ❌ Test 4 FAILED: Fold styles element not found!');
    success = false;
  } else {
    console.log('  ✅ Test 4 PASSED: Fold styles injected');
  }

  // Test 5: Measure heights AFTER folding - at least some should be smaller
  console.log('  🔍 Test 5: Measuring comment heights after fold...');
  const heightsAfter = await page.evaluate(() => {
    const elements = document.querySelectorAll('.markdown-body');
    return Array.from(elements).map(el => {
      const computed = window.getComputedStyle(el);
      return {
        height: (el as HTMLElement).offsetHeight,
        maxHeight: computed.maxHeight,
        overflow: computed.overflow
      };
    });
  });

  // Check if any elements got smaller
  let anySmaller = false;
  let anyHasMaxHeight = false;
  for (let i = 0; i < Math.min(heightsBefore.length, heightsAfter.length); i++) {
    if (heightsAfter[i].height < heightsBefore[i].height) {
      anySmaller = true;
    }
    if (heightsAfter[i].maxHeight !== 'none') {
      anyHasMaxHeight = true;
    }
  }

  heightsAfter.slice(0, 3).forEach((h, i) => {
    const before = heightsBefore[i]?.height || 0;
    const diff = before - h.height;
    console.log(`     Element ${i}: height=${h.height}px (was ${before}px, diff=${diff}), maxHeight=${h.maxHeight}`);
  });

  if (!anySmaller && !anyHasMaxHeight) {
    console.error('  ❌ Test 5 FAILED: No elements were visually collapsed!');
    console.error('     CSS selectors may not be matching GitHub\'s actual DOM structure');
    success = false;
  } else if (anySmaller) {
    console.log('  ✅ Test 5 PASSED: Elements were collapsed (heights reduced)');
  } else {
    console.log('  ⚠️  Test 5 PARTIAL: max-height applied but heights unchanged (elements may already be small)');
  }

  // Test 6: Per-comment unfold - clicking heading should unfold only that comment
  console.log('  🔍 Test 6: Testing per-comment unfold...');

  // First, make sure we're in folded state
  await toggleButton.click();
  await page.waitForTimeout(500);

  // Find a heading in a markdown-body that has content (height > threshold when unfolded)
  const headingInfo = await page.evaluate(() => {
    const markdownBodies = document.querySelectorAll('.markdown-body');
    for (let i = 0; i < markdownBodies.length; i++) {
      const mb = markdownBodies[i];
      const heading = mb.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        return {
          index: i,
          hasHeading: true,
          headingText: heading.textContent?.slice(0, 30) || ''
        };
      }
    }
    return { index: -1, hasHeading: false, headingText: '' };
  });

  if (!headingInfo.hasHeading) {
    console.log('  ⚠️  Test 6 SKIPPED: No headings found in comments');
  } else {
    console.log(`     Found heading "${headingInfo.headingText}..." in comment ${headingInfo.index}`);

    // Get heights of all comments before clicking heading
    const heightsBeforeClick = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.markdown-body')).map(el => (el as HTMLElement).offsetHeight);
    });

    // Click on the heading
    const heading = await page.$('.markdown-body h1, .markdown-body h2, .markdown-body h3');
    if (heading) {
      await heading.click();
      await page.waitForTimeout(500);

      // Get heights after clicking
      const heightsAfterClick = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.markdown-body')).map(el => (el as HTMLElement).offsetHeight);
      });

      // Check: the clicked comment should be expanded, others should stay folded
      const clickedExpanded = heightsAfterClick[headingInfo.index] > heightsBeforeClick[headingInfo.index];

      // Check if OTHER comments stayed folded (at least one other should not have changed)
      let othersStayedFolded = false;
      for (let i = 0; i < Math.min(heightsBeforeClick.length, heightsAfterClick.length); i++) {
        if (i !== headingInfo.index && heightsAfterClick[i] === heightsBeforeClick[i]) {
          othersStayedFolded = true;
          break;
        }
      }

      console.log(`     Clicked comment height: ${heightsBeforeClick[headingInfo.index]}px → ${heightsAfterClick[headingInfo.index]}px`);

      if (clickedExpanded && othersStayedFolded) {
        console.log('  ✅ Test 6 PASSED: Only clicked comment expanded');
      } else if (!clickedExpanded) {
        console.error('  ❌ Test 6 FAILED: Clicked comment did not expand');
        success = false;
      } else if (!othersStayedFolded) {
        console.error('  ❌ Test 6 FAILED: Other comments also expanded (should only expand clicked one)');
        success = false;
      }
    }
  }

  // Test 7: Toggle back off
  console.log('  🖱️ Toggling fold off...');
  await toggleButton.click();
  await page.waitForTimeout(500);

  const foldClassRemoved = await page.evaluate(() => {
    return !document.body.classList.contains('github-comments-folded');
  });

  if (!foldClassRemoved) {
    console.error('  ❌ Test 7 FAILED: Fold class not removed after toggle off');
    success = false;
  } else {
    console.log('  ✅ Test 7 PASSED: Fold class removed after toggle');
  }

  await page.close();
  return success;
}

async function runTests() {
  console.log('🚀 Starting Comment Fold Integration Tests\n');

  const extensionPath = path.join(__dirname, '..', 'dist');
  console.log('📁 Extension path:', extensionPath);

  // Launch Chrome with the extension loaded
  console.log('🌐 Launching Chrome with extension...\n');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    viewport: { width: 1920, height: 1080 },
  });

  console.log('✅ Chrome launched with extension loaded\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < GITHUB_ISSUES.length; i++) {
    const issueUrl = GITHUB_ISSUES[i];
    const issueId = `issue-${i + 1}`;

    try {
      const success = await testCommentFold(context, issueUrl, issueId);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ Error testing ${issueUrl}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Test Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total: ${GITHUB_ISSUES.length}`);

  if (failed > 0) {
    console.error('\n❌ Some tests FAILED!');
  } else {
    console.log('\n✅ All tests PASSED!');
  }

  // Keep browser open briefly for inspection
  console.log('\n🔍 Browser will stay open for 5 seconds for inspection...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  await context.close();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);


