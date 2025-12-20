/**
 * Unit test for the comment-fold script
 * Tests that comments can be folded (collapsed) and unfolded (expanded)
 */

import { JSDOM } from 'jsdom';

// Create a mock DOM with GitHub-style comment structure
function createMockDOM() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head></head>
    <body>
      <!-- GitHub issue page structure -->
      <div class="repository-content">
        <!-- Issue body / first comment -->
        <div class="timeline-comment" data-testid="issue-body">
          <div class="comment-body markdown-body">
            <p>This is the first line of the issue body.</p>
            <p>This is the second line with more details.</p>
            <p>This is the third line with even more content.</p>
            <p>This is the fourth line that should be hidden when folded.</p>
            <p>This is the fifth line that should also be hidden.</p>
            <p>This is the sixth line - lots of content here.</p>
          </div>
        </div>

        <!-- Comment 1 -->
        <div class="timeline-comment" data-testid="comment-1">
          <div class="comment-body markdown-body">
            <p>First line of comment 1.</p>
            <p>Second line of comment 1.</p>
            <p>Third line of comment 1.</p>
            <p>Fourth line of comment 1 - hidden when folded.</p>
            <p>Fifth line of comment 1 - also hidden.</p>
          </div>
        </div>

        <!-- Comment 2 -->
        <div class="timeline-comment" data-testid="comment-2">
          <div class="comment-body markdown-body">
            <p>Short comment.</p>
          </div>
        </div>

        <!-- Comment 3 with code block -->
        <div class="timeline-comment" data-testid="comment-3">
          <div class="comment-body markdown-body">
            <p>This comment has a code block:</p>
            <pre><code>function example() {
  return 42;
}</code></pre>
            <p>And some more text after the code.</p>
            <p>More lines here...</p>
            <p>Even more lines...</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `, { runScripts: 'dangerously' });

  return dom;
}

// Simulates what the fold feature should do
interface FoldResult {
  toggleButtonExists: boolean;
  isFolded: boolean;
  foldStylesApplied: boolean;
  commentsHaveMaxHeight: boolean;
}

// Check if fold functionality exists and works
function checkFoldFunctionality(document: Document, window: any): FoldResult {
  // Check if toggle button exists
  const toggleButton = document.getElementById('github-comment-fold-toggle');
  const toggleButtonExists = toggleButton !== null;

  // Check if fold styles are applied
  const foldStyles = document.getElementById('github-comment-fold-styles');
  const foldStylesApplied = foldStyles !== null;

  // Check if comments have max-height restriction when folded
  const isFolded = document.body.classList.contains('github-comments-folded');
  
  // Check if markdown-body elements would be restricted
  let commentsHaveMaxHeight = false;
  if (foldStylesApplied && isFolded) {
    const commentBodies = document.querySelectorAll('.comment-body.markdown-body');
    // In real implementation, we'd check computed styles
    // For now, we check if the class is applied
    commentsHaveMaxHeight = commentBodies.length > 0;
  }

  return {
    toggleButtonExists,
    isFolded,
    foldStylesApplied,
    commentsHaveMaxHeight
  };
}

// Simulate clicking the fold toggle
function simulateFoldToggle(document: Document): void {
  const toggleButton = document.getElementById('github-comment-fold-toggle');
  if (toggleButton) {
    toggleButton.click();
  }
}

// Run tests
function runTests() {
  console.log('🧪 Running Comment Fold Unit Tests\n');

  const dom = createMockDOM();
  const document = dom.window.document;
  const window = dom.window;

  let passed = 0;
  let failed = 0;

  // Test 1: Toggle button should exist
  {
    console.log('Test 1: Toggle button should exist');
    const result = checkFoldFunctionality(document, window);
    
    if (result.toggleButtonExists) {
      console.log('✅ Test 1 PASSED: Toggle button exists');
      passed++;
    } else {
      console.error('❌ Test 1 FAILED: Toggle button does not exist');
      failed++;
    }
  }

  // Test 2: Initially, comments should NOT be folded
  {
    console.log('Test 2: Comments should not be folded initially');
    const result = checkFoldFunctionality(document, window);
    
    if (!result.isFolded) {
      console.log('✅ Test 2 PASSED: Comments are not folded initially');
      passed++;
    } else {
      console.error('❌ Test 2 FAILED: Comments are unexpectedly folded');
      failed++;
    }
  }

  // Test 3: After toggle, comments SHOULD be folded
  {
    console.log('Test 3: After toggle, comments should be folded');
    simulateFoldToggle(document);
    const result = checkFoldFunctionality(document, window);
    
    if (result.isFolded && result.foldStylesApplied) {
      console.log('✅ Test 3 PASSED: Comments are folded after toggle');
      passed++;
    } else {
      console.error('❌ Test 3 FAILED: Comments are not folded after toggle');
      console.error(`   isFolded: ${result.isFolded}, foldStylesApplied: ${result.foldStylesApplied}`);
      failed++;
    }
  }

  // Test 4: After second toggle, comments should be UNfolded
  {
    console.log('Test 4: After second toggle, comments should be unfolded');
    simulateFoldToggle(document);
    const result = checkFoldFunctionality(document, window);
    
    if (!result.isFolded) {
      console.log('✅ Test 4 PASSED: Comments are unfolded after second toggle');
      passed++;
    } else {
      console.error('❌ Test 4 FAILED: Comments are still folded after second toggle');
      failed++;
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total: ${passed + failed}`);

  if (failed > 0) {
    console.error('\n❌ Tests FAILED! The comment fold feature is not implemented.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests PASSED!');
  }
}

// Run the tests
runTests();

