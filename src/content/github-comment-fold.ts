// GitHub Comment Fold Mode
// Collapses comments to show only the first few lines
// Toggle with Cmd+Shift+F (Mac) or Ctrl+Shift+F (Windows/Linux)

(function() {
  console.log('[GitHub Comment Fold] Script initializing...');

  // State to track whether fold mode is enabled
  let isFolded = localStorage.getItem('github-comment-fold-enabled') === 'true';

  // Configuration
  const FOLD_MAX_HEIGHT = '2.8em'; // Show full heading without clipping
  const FOLD_BUTTON_BOTTOM_OFFSET = 72; // Position above the fullwidth button

  // Only run on GitHub issue/PR pages
  if (!isGitHubIssuePage()) {
    console.log('[GitHub Comment Fold] Not a GitHub issue/PR page, exiting');
    return;
  }

  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[GitHub Comment Fold] Initializing...');

    // Apply saved state on page load
    if (isFolded) {
      setTimeout(() => applyFold(), 1000); // Wait for page to fully render
    }

    // Listen for keyboard shortcut (Cmd/Ctrl+Shift+F)
    document.addEventListener('keydown', handleKeyPress, true);

    // Add a floating toggle button
    addToggleButton();
  }

  function isGitHubIssuePage(): boolean {
    const url = window.location.href;
    return /github\.com\/[^\/]+\/[^\/]+\/(issues|pull|discussions)/.test(url);
  }

  function handleKeyPress(event: KeyboardEvent): void {
    // Check for Cmd/Ctrl+Shift+F combination
    const isModKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;

    if (isModKey && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      event.stopPropagation();
      toggleFold();
    }
  }

  function toggleFold(): void {
    isFolded = !isFolded;
    localStorage.setItem('github-comment-fold-enabled', String(isFolded));

    if (isFolded) {
      applyFold();
    } else {
      removeFold();
    }

    updateToggleButton();
    console.log(`[GitHub Comment Fold] Mode ${isFolded ? 'enabled' : 'disabled'}`);
  }

  function applyFold(): void {
    console.log('[GitHub Comment Fold] Applying fold styles...');

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
      /* Collapse ALL markdown-body elements (comment content) to show only first line */
      body.github-comments-folded .markdown-body {
        max-height: ${FOLD_MAX_HEIGHT} !important;
        overflow: hidden !important;
        position: relative !important;
      }

      /* Add a subtle gradient fade effect at the bottom */
      body.github-comments-folded .markdown-body::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0.8em;
        background: linear-gradient(transparent, var(--bgColor-default, var(--color-canvas-default, #ffffff)));
        pointer-events: none;
      }

      /* GitHub's dark theme support */
      [data-color-mode="dark"] body.github-comments-folded .markdown-body::after,
      html[data-color-mode="dark"] body.github-comments-folded .markdown-body::after {
        background: linear-gradient(transparent, var(--bgColor-default, var(--color-canvas-default, #0d1117)));
      }
    `;

    console.log('[GitHub Comment Fold] Fold styles applied');
  }

  function removeFold(): void {
    console.log('[GitHub Comment Fold] Removing fold styles...');

    // Remove class from body
    document.body.classList.remove('github-comments-folded');

    const styleEl = document.getElementById('github-comment-fold-styles');
    if (styleEl) {
      styleEl.remove();
    }
  }

  function addToggleButton(): void {
    // Check if button already exists
    if (document.getElementById('github-comment-fold-toggle')) {
      return;
    }

    // Create a floating button for easy toggling (positioned above fullwidth button)
    const button = document.createElement('button');
    button.id = 'github-comment-fold-toggle';
    // Use same arrows as fullwidth but rotated 90°
    button.innerHTML = `<span style="display:inline-block;transform:rotate(90deg)">${isFolded ? '⟶⟵' : '⟵⟶'}</span>`;
    button.title = 'Toggle Comment Fold Mode (Cmd/Ctrl+Shift+F)';
    button.style.cssText = `
      position: fixed;
      bottom: ${FOLD_BUTTON_BOTTOM_OFFSET}px;
      right: 20px;
      background: none;
      color: #6e7681;
      border: none;
      cursor: pointer;
      z-index: 99999;
      font-size: 24px;
      padding: 8px;
      transition: color 0.2s ease;
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFold();
    });

    button.addEventListener('mouseenter', () => {
      button.style.color = '#0969da';
    });

    button.addEventListener('mouseleave', () => {
      button.style.color = '#6e7681';
    });

    document.body.appendChild(button);
    console.log('[GitHub Comment Fold] Toggle button added');
  }

  function updateToggleButton(): void {
    const button = document.getElementById('github-comment-fold-toggle');
    if (button) {
      // Arrows show what click will do: folded→expand outward, unfolded→contract inward
      button.innerHTML = `<span style="display:inline-block;transform:rotate(90deg)">${isFolded ? '⟶⟵' : '⟵⟶'}</span>`;
    }
  }

  console.log('[GitHub Comment Fold] Script loaded - Press Cmd/Ctrl+Shift+F to toggle');
})();

