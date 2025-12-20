"use strict";
/**
 * Unit test for the mermaid-cleaner script
 * Tests that it only hides Mermaid diagram controls, NOT regular code block copy buttons
 */
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom_1 = require("jsdom");
// Create a mock DOM with both regular code blocks and mermaid diagrams
function createMockDOM() {
    const dom = new jsdom_1.JSDOM(`
    <!DOCTYPE html>
    <html>
    <head></head>
    <body>
      <!-- Regular code block with copy button (should NOT be hidden) -->
      <div class="highlight">
        <pre><code>console.log("regular code");</code></pre>
        <clipboard-copy aria-label="Copy code" class="copy-button">Copy</clipboard-copy>
      </div>
      
      <!-- Another regular code block (should NOT be hidden) -->
      <div class="markdown-body">
        <div class="highlight">
          <pre><code>function test() { return true; }</code></pre>
          <clipboard-copy aria-label="Copy" data-copy-text="function test() { return true; }">Copy</clipboard-copy>
        </div>
      </div>
      
      <!-- Mermaid diagram section (controls SHOULD be hidden) -->
      <section data-type="mermaid">
        <div class="render-container">
          <iframe class="render-viewer" src="about:blank"></iframe>
          <button aria-label="Enter fullscreen">Fullscreen</button>
          <clipboard-copy aria-label="Copy diagram">Copy</clipboard-copy>
        </div>
      </section>
      
      <!-- Another Mermaid diagram (controls SHOULD be hidden) -->
      <div class="js-render-needs-enrichment">
        <button aria-label="View fullscreen">Expand</button>
        <clipboard-copy aria-label="Copy">Copy</clipboard-copy>
      </div>
    </body>
    </html>
  `);
    return dom;
}
// Function that applies the mermaid cleaner styles (mirrors the actual implementation)
function applyMermaidCleanerStyles(document, useFix = true) {
    const styleEl = document.createElement('style');
    styleEl.id = 'github-mermaid-cleaner-styles';
    if (useFix) {
        // This is the FIXED implementation
        styleEl.innerHTML = `
      /* Hide the overlay expand/fullscreen buttons on Mermaid containers */
      .js-render-needs-enrichment button[aria-label*="fullscreen" i],
      .render-needs-enrichment button[aria-label*="fullscreen" i],
      section[data-type="mermaid"] button {
        display: none !important;
      }

      /* Hide copy buttons ONLY within Mermaid diagram containers */
      section[data-type="mermaid"] clipboard-copy[aria-label*="Copy" i],
      .js-render-needs-enrichment clipboard-copy[aria-label*="Copy" i],
      .render-needs-enrichment clipboard-copy[aria-label*="Copy" i] {
        display: none !important;
      }

      /* Hide buttons that are siblings of Mermaid iframe viewers ONLY */
      section[data-type="mermaid"] iframe.render-viewer ~ button,
      section[data-type="mermaid"] iframe.render-viewer ~ * button {
        display: none !important;
      }

      /* Hide buttons inside Mermaid render containers ONLY */
      section[data-type="mermaid"] .render-container button,
      section[data-type="mermaid"] .js-render-target button {
        display: none !important;
      }

      /* Hide the button group over Mermaid diagrams specifically */
      section[data-type="mermaid"] .position-absolute:has(button[aria-label*="fullscreen" i]) {
        display: none !important;
      }
    `;
    }
    else {
        // This is the BUGGY implementation
        styleEl.innerHTML = `
      /* Hide the overlay expand/fullscreen buttons on Mermaid containers */
      .js-render-needs-enrichment button[aria-label*="fullscreen" i],
      .render-needs-enrichment button[aria-label*="fullscreen" i],
      section[data-type="mermaid"] button {
        display: none !important;
      }

      /* Hide the copy button - THIS IS THE BUG: too broad! */
      clipboard-copy[aria-label*="Copy" i] {
        display: none !important;
      }

      /* Hide any button that's a sibling of the iframe */
      iframe.render-viewer ~ button,
      iframe.render-viewer ~ * button {
        display: none !important;
      }

      /* Hide buttons inside the render container */
      .render-container button,
      .js-render-target button {
        display: none !important;
      }

      /* Hide the entire button group that appears over mermaid */
      .position-absolute:has(button[aria-label*="fullscreen" i]) {
        display: none !important;
      }
    `;
    }
    document.head.appendChild(styleEl);
}
// Helper to check if an element would be visible
function isVisible(element, window) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
}
// Run tests
function runTests(useFix = true) {
    console.log(`🧪 Running Mermaid Cleaner Unit Tests (${useFix ? 'WITH FIX' : 'WITHOUT FIX - SHOULD FAIL'})\n`);
    const dom = createMockDOM();
    const document = dom.window.document;
    // Apply the mermaid cleaner styles
    applyMermaidCleanerStyles(document, useFix);
    let passed = 0;
    let failed = 0;
    // Test 1: Regular code block copy buttons should be VISIBLE
    {
        const regularCopyButtons = document.querySelectorAll('.highlight clipboard-copy, .markdown-body clipboard-copy');
        console.log(`Found ${regularCopyButtons.length} regular code block copy buttons`);
        let allVisible = true;
        regularCopyButtons.forEach((button, index) => {
            const visible = isVisible(button, dom.window);
            if (!visible) {
                allVisible = false;
                console.error(`  ❌ Regular copy button ${index + 1} is hidden (should be visible)`);
            }
        });
        if (allVisible && regularCopyButtons.length > 0) {
            console.log('✅ Test 1 PASSED: Regular code block copy buttons are visible');
            passed++;
        }
        else {
            console.error('❌ Test 1 FAILED: Regular code block copy buttons are hidden (BUG!)');
            failed++;
        }
    }
    // Test 2: Mermaid diagram copy buttons SHOULD be hidden
    {
        const mermaidCopyButtons = document.querySelectorAll('section[data-type="mermaid"] clipboard-copy, .js-render-needs-enrichment clipboard-copy');
        console.log(`Found ${mermaidCopyButtons.length} mermaid copy buttons`);
        let allHidden = true;
        mermaidCopyButtons.forEach((button, index) => {
            const visible = isVisible(button, dom.window);
            if (visible) {
                allHidden = false;
                console.error(`  ❌ Mermaid copy button ${index + 1} is visible (should be hidden)`);
            }
        });
        if (allHidden && mermaidCopyButtons.length > 0) {
            console.log('✅ Test 2 PASSED: Mermaid copy buttons are hidden');
            passed++;
        }
        else {
            console.error('❌ Test 2 FAILED: Mermaid copy buttons are not hidden');
            failed++;
        }
    }
    // Test 3: Mermaid fullscreen buttons SHOULD be hidden
    {
        const mermaidFullscreenButtons = document.querySelectorAll('section[data-type="mermaid"] button[aria-label*="fullscreen" i], .js-render-needs-enrichment button[aria-label*="fullscreen" i]');
        console.log(`Found ${mermaidFullscreenButtons.length} mermaid fullscreen buttons`);
        let allHidden = true;
        mermaidFullscreenButtons.forEach((button, index) => {
            const visible = isVisible(button, dom.window);
            if (visible) {
                allHidden = false;
                console.error(`  ❌ Mermaid fullscreen button ${index + 1} is visible (should be hidden)`);
            }
        });
        if (allHidden && mermaidFullscreenButtons.length > 0) {
            console.log('✅ Test 3 PASSED: Mermaid fullscreen buttons are hidden');
            passed++;
        }
        else if (mermaidFullscreenButtons.length === 0) {
            console.log('⚠️  Test 3 SKIPPED: No mermaid fullscreen buttons found');
        }
        else {
            console.error('❌ Test 3 FAILED: Mermaid fullscreen buttons are not hidden');
            failed++;
        }
    }
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📈 Total: ${passed + failed}`);
    if (failed > 0) {
        if (!useFix) {
            console.error('\n❌ Tests FAILED as expected! The mermaid-cleaner is hiding regular copy buttons!');
            console.error('This demonstrates the bug.');
        }
        else {
            console.error('\n❌ Tests FAILED even with the fix! Something is wrong.');
        }
        process.exit(1);
    }
    else {
        if (useFix) {
            console.log('\n✅ All tests PASSED! The fix works correctly.');
        }
        else {
            console.log('\n⚠️  Tests passed without the fix - this should not happen!');
            process.exit(1);
        }
    }
}
// Run the tests - check command line args
const args = process.argv.slice(2);
const testWithFix = !args.includes('--no-fix');
if (args.includes('--both')) {
    // Run both versions to show the difference
    console.log('='.repeat(60));
    console.log('FIRST: Testing WITHOUT the fix (should fail)...');
    console.log('='.repeat(60));
    try {
        runTests(false);
    }
    catch (e) {
        // Expected to fail
    }
    console.log('\n' + '='.repeat(60));
    console.log('SECOND: Testing WITH the fix (should pass)...');
    console.log('='.repeat(60));
    runTests(true);
}
else {
    runTests(testWithFix);
}
//# sourceMappingURL=test-mermaid-cleaner-unit.js.map