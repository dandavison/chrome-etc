# Screenshot-Based Testing

This extension uses **visual regression testing** because browser extension UI cannot be reliably verified with DOM assertions alone.

## Why Screenshots?

DOM-based tests (measuring heights, checking classes) can pass while the feature is visually broken. Screenshots capture what the user actually sees.

## Running Tests

```bash
npm test                 # Run all visual tests
npm run test:visual      # Same thing
```

Screenshots are saved to `test/screenshots/`.

## Verifying Tests

After running tests:
1. Read each screenshot file in `test/screenshots/`
2. Verify the UI looks correct for each state
3. If something looks wrong, the feature is broken

## Test Resources

- **Public test repo**: https://github.com/dandavison/test
- **Test issue**: https://github.com/dandavison/test/issues/7 (has headings, comments, code blocks)

## Writing New Visual Tests

Use Playwright to launch Chrome with the extension, navigate to pages, interact, and capture screenshots.

```typescript
import { chromium } from 'playwright';
import path from 'path';

const extensionPath = path.join(__dirname, '..', 'dist');

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

const page = await context.newPage();
await page.goto('https://github.com/dandavison/test/issues/7');
await page.screenshot({ path: 'test/screenshots/state-1.png' });

// Interact with extension UI
await page.click('#my-button');
await page.screenshot({ path: 'test/screenshots/state-2.png' });

await context.close();
```

## For AI Agents

To test a feature:
1. Run `npm test`
2. Read each PNG file in `test/screenshots/`
3. Describe what you see and whether it matches expected behavior
4. If broken, fix the code and re-run
