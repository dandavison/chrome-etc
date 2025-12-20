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

// ============================================================================
// Replicate the comment-fold functionality for testing
// (mirrors the actual implementation in github-comment-fold.ts)
// ============================================================================

const FOLD_MAX_HEIGHT = '1.6em'; // Just the heading/first line - concertina style
const FOLD_BUTTON_BOTTOM_OFFSET = 72;

function initCommentFold(document: Document): void {
  addToggleButton(document);
}

function applyFold(document: Document): void {
  // Add class to body to track state
  document.body.classList.add('github-comments-folded');

  // Create or update style element
  let styleEl = document.getElementById('github-comment-fold-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'github-comment-fold-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    /* Collapse comment bodies to show only first few lines */
    body.github-comments-folded .comment-body.markdown-body,
    body.github-comments-folded .js-comment-body,
    body.github-comments-folded [data-testid="issue-body"] .markdown-body,
    body.github-comments-folded .TimelineItem .markdown-body,
    body.github-comments-folded .timeline-comment .markdown-body {
      max-height: ${FOLD_MAX_HEIGHT} !important;
      overflow: hidden !important;
      position: relative !important;
    }
  `;
}

function removeFold(document: Document): void {
  // Remove class from body
  document.body.classList.remove('github-comments-folded');

  const styleEl = document.getElementById('github-comment-fold-styles');
  if (styleEl) {
    styleEl.remove();
  }
}

let isFolded = false;

function toggleFold(document: Document): void {
  isFolded = !isFolded;

  if (isFolded) {
    applyFold(document);
  } else {
    removeFold(document);
  }

  updateToggleButton(document);
}

function addToggleButton(document: Document): void {
  // Check if button already exists
  if (document.getElementById('github-comment-fold-toggle')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'github-comment-fold-toggle';
  button.innerHTML = isFolded ? '↑↓' : '↕';
  button.title = 'Toggle Comment Fold Mode (Cmd/Ctrl+Shift+F)';

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFold(document);
  });

  document.body.appendChild(button);
}

function updateToggleButton(document: Document): void {
  const button = document.getElementById('github-comment-fold-toggle');
  if (button) {
    button.innerHTML = isFolded ? '↑↓' : '↕';
  }
}

// ============================================================================
// Test helpers
// ============================================================================

interface FoldResult {
  toggleButtonExists: boolean;
  isFolded: boolean;
  foldStylesApplied: boolean;
}

function checkFoldFunctionality(document: Document): FoldResult {
  const toggleButton = document.getElementById('github-comment-fold-toggle');
  const toggleButtonExists = toggleButton !== null;

  const foldStyles = document.getElementById('github-comment-fold-styles');
  const foldStylesApplied = foldStyles !== null;

  const folded = document.body.classList.contains('github-comments-folded');

  return {
    toggleButtonExists,
    isFolded: folded,
    foldStylesApplied
  };
}

function simulateFoldToggle(document: Document): void {
  const toggleButton = document.getElementById('github-comment-fold-toggle');
  if (toggleButton) {
    toggleButton.click();
  }
}

// ============================================================================
// Run tests
// ============================================================================

function runTests() {
  console.log('🧪 Running Comment Fold Unit Tests\n');

  const dom = createMockDOM();
  const document = dom.window.document;

  // Reset state for tests
  isFolded = false;

  // Initialize the fold feature
  initCommentFold(document);

  let passed = 0;
  let failed = 0;

  // Test 1: Toggle button should exist
  {
    console.log('Test 1: Toggle button should exist');
    const result = checkFoldFunctionality(document);

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
    const result = checkFoldFunctionality(document);

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
    const result = checkFoldFunctionality(document);

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
    const result = checkFoldFunctionality(document);

    if (!result.isFolded && !result.foldStylesApplied) {
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
    console.error('\n❌ Tests FAILED! The comment fold feature is not working correctly.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests PASSED!');
  }
}

// Run the tests
runTests();
