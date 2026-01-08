# Screenshot-Based Testing

This extension uses **visual regression testing** because browser extension UI cannot be reliably verified with DOM assertions alone.

## Quick Start

```bash
# Run visual test and capture screenshots
npm run test:visual

# Screenshots are saved to test/screenshots/
```

## How It Works

1. Playwright launches Chrome with the extension loaded
2. Navigates to a test GitHub issue
3. Captures screenshots at key states
4. **You (human or AI) verify the screenshots**

## Test Issue

Public test issue: https://github.com/dandavison/test/issues/7

## Verifying Screenshots

After running `npm run test:visual`, check these files:

| File | Expected Content |
|------|------------------|
| `01-initial-unfolded.png` | Full comment content visible |
| `02-all-folded.png` | Concertina view - only headings visible |
| `03-one-comment-expanded.png` | First comment expanded, others still folded |
| `04-all-unfolded-again.png` | All content visible again |

### For AI Agents

To verify, read each screenshot file and confirm:
- `02-all-folded.png`: Should show ~4 headings stacked vertically with no body text
- `03-one-comment-expanded.png`: First heading should be blue, with full content below it

## Adding New Visual Tests

See `test/test-comment-fold-visual.ts` as a template. Key pattern:

```typescript
await page.goto(URL);
await takeScreenshot(page, 'state-name');
await page.click('#button');
await takeScreenshot(page, 'after-click');
```

