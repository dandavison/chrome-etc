# Chrome Extension - dan-chrome-etc

A Chrome extension that enhances the GitHub experience with full-width markdown rendering and cleaner Mermaid diagrams.

## Features

- **Full-width GitHub Issues**: Toggle to hide sidebars and expand markdown content to full width
- **Mermaid Diagram Cleaner**: Automatically hides control buttons on Mermaid diagrams
- **GitHub Comment Editor**: Enhanced comment editing experience

## Project Structure

```
chrome-etc/
├── src/                      # TypeScript source files
│   ├── background/          # Background service worker
│   └── content/             # Content scripts
├── dist/                    # Compiled JavaScript (gitignored)
├── test/                    # Test files
├── public/                  # Static assets
│   └── manifest.json        # Extension manifest
└── package.json             # Node dependencies and scripts
```

## Development

### Prerequisites

- Node.js and npm
- TypeScript

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch for changes during development
npm run watch
```

### Building

```bash
# Clean and build
npm run build

# Create extension.zip for distribution
npm run package
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:fullwidth
npm run test:mermaid
```

## Installation

### Development Mode

1. Build the extension:
   ```bash
   npm run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the `dist` directory

### Production

Run `npm run package` to create an `extension.zip` file ready for submission to the Chrome Web Store.

## Usage

### Full-width Toggle

- **Keyboard shortcut**: `Cmd+Shift+W` (Mac) or `Ctrl+Shift+W` (Windows/Linux)
- **Manual**: Click the toggle button that appears in the top-right corner of GitHub issue/PR pages

This will:
- Hide the right sidebar (labels, assignees, etc.)
- Hide the left navigation panel
- Expand the markdown content to use the full browser width
- Hide the sticky header that appears when scrolling

### Mermaid Diagram Controls

Controls on Mermaid diagrams are automatically hidden on all GitHub pages. This includes:
- Bottom-right pan/zoom controls
- Upper-right fullscreen/copy buttons

## File Descriptions

### Source Files (`src/`)

- **`background/background.ts`**: Background service worker for the extension
- **`content/github-fullwidth.ts`**: Implements the full-width toggle functionality
- **`content/github-mermaid-cleaner.ts`**: Hides Mermaid diagram controls
- **`content/github-comment-editor.ts`**: Enhances the GitHub comment editor

### Test Files (`test/`)

- **`test-fullwidth.ts`**: Tests the full-width toggle functionality
- **`test-mermaid.ts`**: Tests Mermaid control hiding

## License

Private repository - All rights reserved
