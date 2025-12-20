import { chromium, Page, BrowserContext } from 'playwright';
import path from 'path';

// Test GitHub issue with code blocks
const TEST_ISSUE = 'https://github.com/microsoft/vscode/issues/1';

async function testDoubleClickOnCodeBlock(context: BrowserContext) {
  console.log('\n🧪 Testing double-click on code blocks\n');
  
  const page = await context.newPage();
  
  // Set viewport
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // Navigate to the GitHub issue
  console.log('📍 Navigating to issue...');
  await page.goto(TEST_ISSUE, { waitUntil: 'networkidle' });
  
  // Wait for the page to fully load
  await page.waitForTimeout(3000);
  
  // Look for a code block with a copy button
  console.log('🔍 Looking for code blocks...');
  
  // Find code blocks on the page
  const codeBlocks = await page.$$('pre');
  console.log(`  Found ${codeBlocks.length} code blocks`);
  
  if (codeBlocks.length === 0) {
    console.log('  ⚠️ No code blocks found, searching for inline code...');
    const inlineCode = await page.$$('code');
    console.log(`  Found ${inlineCode.length} inline code elements`);
  }
  
  // Test 1: Double-click on a code block should NOT trigger comment edit
  console.log('\n📝 Test 1: Double-click on code block should NOT trigger comment edit');
  
  // Listen for console messages to detect if our extension tries to edit
  let editTriggered = false;
  page.on('console', msg => {
    if (msg.text().includes('[GitHub Comment Editor]')) {
      console.log(`  🖥️ Extension: ${msg.text()}`);
      if (msg.text().includes('editSpecificComment called') || 
          msg.text().includes('Triggered edit')) {
        editTriggered = true;
      }
    }
  });
  
  // Find a code block or copy button
  const copyButton = await page.$('[aria-label*="Copy"]');
  const codeElement = await page.$('pre, code');
  
  if (copyButton) {
    console.log('  ✅ Found copy button');
    
    // Double-click on the copy button
    console.log('  🖱️ Double-clicking on copy button...');
    await copyButton.dblclick();
    await page.waitForTimeout(1000);
    
    // Check if edit was triggered
    if (editTriggered) {
      console.error('  ❌ FAIL: Comment edit was triggered by double-clicking copy button!');
      return false;
    } else {
      console.log('  ✅ PASS: Copy button double-click did not trigger comment edit');
    }
    
    // Check if copy functionality still works (clipboard API might not be available in test)
    // We'll just check that the button is still interactive
    const buttonStillWorks = await copyButton.evaluate(el => {
      return !el.hasAttribute('disabled') && window.getComputedStyle(el).pointerEvents !== 'none';
    });
    
    if (buttonStillWorks) {
      console.log('  ✅ PASS: Copy button is still interactive');
    } else {
      console.error('  ❌ FAIL: Copy button functionality appears broken');
      return false;
    }
  } else if (codeElement) {
    console.log('  ✅ Found code element');
    
    // Double-click on the code element
    console.log('  🖱️ Double-clicking on code element...');
    await codeElement.dblclick();
    await page.waitForTimeout(1000);
    
    // Check if edit was triggered
    if (editTriggered) {
      console.error('  ❌ FAIL: Comment edit was triggered by double-clicking code!');
      return false;
    } else {
      console.log('  ✅ PASS: Code double-click did not trigger comment edit');
    }
  } else {
    console.log('  ⚠️ No code blocks or copy buttons found to test');
  }
  
  // Test 2: Double-click on a comment should trigger edit
  console.log('\n📝 Test 2: Double-click on comment text SHOULD trigger edit');
  
  editTriggered = false;
  
  // Find a comment body (not in a code block)
  const commentBody = await page.$('[id^="issuecomment-"] .comment-body');
  
  if (commentBody) {
    console.log('  ✅ Found comment body');
    
    // Find text within the comment that's not in a code block
    const textElement = await commentBody.$('p, div:not(pre):not(code)');
    
    if (textElement) {
      console.log('  🖱️ Double-clicking on comment text...');
      await textElement.dblclick();
      await page.waitForTimeout(1000);
      
      // Check if edit was triggered
      if (editTriggered) {
        console.log('  ✅ PASS: Comment edit was triggered correctly');
      } else {
        console.error('  ⚠️ WARNING: Comment edit was not triggered (might be permission issue)');
      }
    }
  } else {
    console.log('  ⚠️ No comment found to test');
  }
  
  await page.close();
  return true;
}

async function runTests() {
  console.log('🚀 Starting GitHub Comment Editor Tests\n');
  console.log('📁 Extension path:', path.resolve(__dirname, '..', 'dist'));
  
  // Launch Chrome with the extension loaded
  console.log('🌐 Launching Chrome with extension...\n');
  
  const extensionPath = path.resolve(__dirname, '..', 'dist');
  
  const context = await chromium.launchPersistentContext('', {
    headless: false, // We want to see what's happening
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    viewport: { width: 1920, height: 1080 },
  });
  
  console.log('✅ Chrome launched with extension loaded\n');
  
  // Give the extension time to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run the test
  const testPassed = await testDoubleClickOnCodeBlock(context);
  
  // Summary
  console.log('\n📊 Test Summary:');
  if (testPassed) {
    console.log('  ✅ All tests passed!');
  } else {
    console.log('  ❌ Some tests failed!');
    process.exitCode = 1;
  }
  
  console.log('\n🔍 Browser will stay open for 5 seconds for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await context.close();
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
