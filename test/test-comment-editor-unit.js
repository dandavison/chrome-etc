"use strict";
/**
 * Unit test for the comment editor double-click handler
 * Tests that it doesn't interfere with code block copy buttons
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Simulate the core logic of the handleDoubleClick function
function shouldHandleDoubleClick(target) {
    // Don't interfere with code blocks or copy buttons
    // Check if the click is on or within a code block or copy button
    const isCodeBlock = target.closest('pre') ||
        target.closest('.highlight') ||
        target.closest('[class*="copy"]') ||
        target.closest('button[aria-label*="Copy"]') ||
        target.tagName === 'CODE';
    if (isCodeBlock) {
        return false; // Should NOT handle (let default behavior work)
    }
    // Check if we're in a comment or issue body
    let current = target;
    let depth = 0;
    while (current && depth < 20) {
        const dataTestId = current.getAttribute('data-testid');
        // Check if this element is a comment
        if (current.id && current.id.startsWith('issuecomment-')) {
            return true; // Should handle
        }
        // Check if this element is a comment using data-testid
        if (dataTestId && (dataTestId.startsWith('comment-viewer-outer-box-') ||
            dataTestId.startsWith('timeline-row-border-'))) {
            return true; // Should handle
        }
        // Check for issue viewer container
        if (dataTestId === 'issue-viewer-container' ||
            current.className?.includes('IssueBodyViewer')) {
            return true; // Should handle
        }
        current = current.parentElement;
        depth++;
    }
    return false; // Not in a comment or issue body
}
// Test cases
function runTests() {
    console.log('🧪 Running Comment Editor Unit Tests\n');
    let passed = 0;
    let failed = 0;
    // Test 1: Double-click on <pre> tag should NOT be handled
    {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = 'console.log("test");';
        pre.appendChild(code);
        const result = shouldHandleDoubleClick(code);
        if (!result) {
            console.log('✅ Test 1 PASSED: Double-click on <pre>/<code> is not handled');
            passed++;
        }
        else {
            console.error('❌ Test 1 FAILED: Double-click on <pre>/<code> was handled (should not be)');
            failed++;
        }
    }
    // Test 2: Double-click on element with "copy" class should NOT be handled
    {
        const button = document.createElement('button');
        button.className = 'copy-button';
        const result = shouldHandleDoubleClick(button);
        if (!result) {
            console.log('✅ Test 2 PASSED: Double-click on copy button is not handled');
            passed++;
        }
        else {
            console.error('❌ Test 2 FAILED: Double-click on copy button was handled (should not be)');
            failed++;
        }
    }
    // Test 3: Double-click on button with aria-label="Copy" should NOT be handled
    {
        const button = document.createElement('button');
        button.setAttribute('aria-label', 'Copy code');
        const result = shouldHandleDoubleClick(button);
        if (!result) {
            console.log('✅ Test 3 PASSED: Double-click on Copy button (aria-label) is not handled');
            passed++;
        }
        else {
            console.error('❌ Test 3 FAILED: Double-click on Copy button was handled (should not be)');
            failed++;
        }
    }
    // Test 4: Double-click on inline <code> tag should NOT be handled
    {
        const code = document.createElement('code');
        code.textContent = 'inline code';
        const result = shouldHandleDoubleClick(code);
        if (!result) {
            console.log('✅ Test 4 PASSED: Double-click on inline <code> is not handled');
            passed++;
        }
        else {
            console.error('❌ Test 4 FAILED: Double-click on inline <code> was handled (should not be)');
            failed++;
        }
    }
    // Test 5: Double-click on element with class "highlight" should NOT be handled
    {
        const div = document.createElement('div');
        div.className = 'highlight highlight-javascript';
        const result = shouldHandleDoubleClick(div);
        if (!result) {
            console.log('✅ Test 5 PASSED: Double-click on .highlight element is not handled');
            passed++;
        }
        else {
            console.error('❌ Test 5 FAILED: Double-click on .highlight element was handled (should not be)');
            failed++;
        }
    }
    // Test 6: Double-click on comment should BE handled
    {
        const comment = document.createElement('div');
        comment.id = 'issuecomment-123456';
        const text = document.createElement('p');
        text.textContent = 'This is a comment';
        comment.appendChild(text);
        const result = shouldHandleDoubleClick(text);
        if (result) {
            console.log('✅ Test 6 PASSED: Double-click on comment text IS handled');
            passed++;
        }
        else {
            console.error('❌ Test 6 FAILED: Double-click on comment text was not handled (should be)');
            failed++;
        }
    }
    // Test 7: Double-click on issue body should BE handled
    {
        const issueBody = document.createElement('div');
        issueBody.setAttribute('data-testid', 'issue-viewer-container');
        const text = document.createElement('p');
        text.textContent = 'Issue description';
        issueBody.appendChild(text);
        const result = shouldHandleDoubleClick(text);
        if (result) {
            console.log('✅ Test 7 PASSED: Double-click on issue body IS handled');
            passed++;
        }
        else {
            console.error('❌ Test 7 FAILED: Double-click on issue body was not handled (should be)');
            failed++;
        }
    }
    // Test 8: Double-click on code WITHIN a comment should NOT be handled
    {
        const comment = document.createElement('div');
        comment.id = 'issuecomment-789';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = 'code in comment';
        pre.appendChild(code);
        comment.appendChild(pre);
        const result = shouldHandleDoubleClick(code);
        if (!result) {
            console.log('✅ Test 8 PASSED: Double-click on code block within comment is not handled');
            passed++;
        }
        else {
            console.error('❌ Test 8 FAILED: Double-click on code within comment was handled (should not be)');
            failed++;
        }
    }
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📈 Total: ${passed + failed}`);
    if (failed > 0) {
        console.error('\n❌ Tests FAILED!');
        process.exit(1);
    }
    else {
        console.log('\n✅ All tests PASSED!');
    }
}
// Run tests in a simulated DOM environment
const jsdom_1 = require("jsdom");
const dom = new jsdom_1.JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
runTests();
//# sourceMappingURL=test-comment-editor-unit.js.map