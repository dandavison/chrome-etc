// GitHub Full Width Mode
// Removes sidebars on GitHub issue/PR pages for full-width markdown viewing
// Toggle with Cmd+Shift+W (Mac) or Ctrl+Shift+W (Windows/Linux)

(function() {
  console.log('[GitHub Full Width] Script initializing...');

  // State to track whether full width mode is enabled
  let isFullWidth = localStorage.getItem('github-fullwidth-enabled') === 'true';
  let observer: MutationObserver | null = null;

  // Only run on GitHub issue/PR pages
  if (!isGitHubIssuePage()) {
    console.log('[GitHub Full Width] Not a GitHub issue/PR page, exiting');
    return;
  }

  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('[GitHub Full Width] Initializing...');

    // Apply saved state on page load
    if (isFullWidth) {
      setTimeout(() => applyFullWidth(), 1000); // Wait for page to fully render
    }

    // Listen for keyboard shortcut (Cmd/Ctrl+Shift+W)
    document.addEventListener('keydown', handleKeyPress, true);

    // Add a floating toggle button for easy access
    addToggleButton();

    // Watch for dynamic content changes
    setupMutationObserver();
  }

  function isGitHubIssuePage(): boolean {
    const url = window.location.href;
    return /github\.com\/[^\/]+\/[^\/]+\/(issues|pull|discussions)/.test(url);
  }

  function handleKeyPress(event: KeyboardEvent): void {
    // Check for Cmd/Ctrl+Shift+W combination
    const isModKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;

    if (isModKey && event.shiftKey && event.key.toLowerCase() === 'w') {
      event.preventDefault();
      event.stopPropagation();
      toggleFullWidth();
    }
  }

  function toggleFullWidth(): void {
    isFullWidth = !isFullWidth;
    localStorage.setItem('github-fullwidth-enabled', String(isFullWidth));

    if (isFullWidth) {
      applyFullWidth();
    } else {
      removeFullWidth();
    }

    updateToggleButton();
    console.log(`[GitHub Full Width] Mode ${isFullWidth ? 'enabled' : 'disabled'}`);
  }

  function applyFullWidth(): void {
    console.log('[GitHub Full Width] Applying full width styles...');

    // Create or update style element
    let styleEl = document.getElementById('github-fullwidth-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'github-fullwidth-styles';
      document.head.appendChild(styleEl);
    }

    // CSS based on actual DOM analysis
    styleEl.innerHTML = `
      /* Hide the sidebar using data-testid */
      [data-testid="sticky-sidebar"] {
        display: none !important;
        visibility: hidden !important;
      }

      /* Hide the metadata sidebar container */
      .IssueViewer-module__metadataSidebar--QdJ2b,
      div[class*="metadataSidebar"] {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
      }

      /* Hide the metadata pane */
      .IssueViewer-module__issueViewerMetadataPane--i01ta,
      div[class*="issueViewerMetadataPane"] {
        display: none !important;
      }

      /* Expand the main content area */
      .IssueViewer-module__contentAndSidebarWrapper--KA1nM,
      div[class*="contentAndSidebarWrapper"] {
        grid-template-columns: 1fr !important;
        max-width: 100% !important;
      }

      /* Expand the content area */
      .IssueViewer-module__contentArea--IpMnd,
      div[class*="contentArea"] {
        max-width: 100% !important;
        width: 100% !important;
      }

      /* Expand main containers */
      .IssueViewer-module__mainContainer--PhquW,
      div[class*="mainContainer"] {
        max-width: 100% !important;
        width: 100% !important;
      }

      /* Expand the issue body */
      .IssueBodyViewer-module__IssueBody--Zg6Wy,
      div[class*="IssueBody"] {
        max-width: 100% !important;
      }

      /* Ensure markdown body expands */
      .markdown-body {
        max-width: 100% !important;
      }

      /* Expand containers */
      .container-xl,
      .container-lg,
      .container {
        max-width: calc(100vw - 32px) !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      /* Expand timeline items */
      .timeline-comment-wrapper,
      .timeline-comment,
      .TimelineItem {
        max-width: 100% !important;
      }

      /* Hide the old-style Layout sidebar if present */
      .Layout-sidebar {
        display: none !important;
      }

      /* Ensure the discussion content takes full width */
      .js-discussion,
      .discussion-timeline {
        max-width: 100% !important;
        width: 100% !important;
      }

      /* Hide BorderGrid sidebar cells */
      .BorderGrid-cell[width="296"] {
        display: none !important;
      }

      /* Expand BorderGrid main cells */
      .BorderGrid-row > .BorderGrid-cell:first-child:not([width="296"]) {
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Visual indicator */
      body::before {
        content: "Full Width Mode Active (Cmd/Ctrl+Shift+W to toggle)";
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(13, 17, 23, 0.95);
        color: #58a6ff;
        padding: 6px 16px;
        font-size: 12px;
        font-weight: 500;
        border-radius: 0 0 8px 8px;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        animation: fadeInOut 3s ease-in-out;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      }
    `;

    // Log what we found
    const sidebar = document.querySelector('[data-testid="sticky-sidebar"]');
    const metadataSidebar = document.querySelector('[class*="metadataSidebar"]');
    console.log('[GitHub Full Width] Sidebar found:', !!sidebar);
    console.log('[GitHub Full Width] Metadata sidebar found:', !!metadataSidebar);
  }

  function removeFullWidth(): void {
    console.log('[GitHub Full Width] Removing full width styles...');
    const styleEl = document.getElementById('github-fullwidth-styles');
    if (styleEl) {
      styleEl.remove();
    }
  }

  function setupMutationObserver(): void {
    // Watch for dynamic content changes
    observer = new MutationObserver((mutations) => {
      if (isFullWidth) {
        // Check if sidebar was re-added
        const sidebar = document.querySelector('[data-testid="sticky-sidebar"]');
        if (sidebar) {
          const style = window.getComputedStyle(sidebar);
          if (style.display !== 'none') {
            console.log('[GitHub Full Width] Sidebar re-appeared, reapplying styles...');
            applyFullWidth();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function addToggleButton(): void {
    // Check if button already exists
    if (document.getElementById('github-fullwidth-toggle')) {
      return;
    }

    // Create a floating button for easy toggling
    const button = document.createElement('button');
    button.id = 'github-fullwidth-toggle';
    button.innerHTML = isFullWidth ? '⟵⟶' : '⟶⟵';
    button.title = 'Toggle Full Width Mode (Cmd/Ctrl+Shift+W)';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${isFullWidth ? '#238636' : '#0969da'};
      color: white;
      border: none;
      cursor: pointer;
      z-index: 99999;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
      font-weight: bold;
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFullWidth();
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 3px 12px rgba(0, 0, 0, 0.3)';
    });

    document.body.appendChild(button);
    console.log('[GitHub Full Width] Toggle button added');
  }

  function updateToggleButton(): void {
    const button = document.getElementById('github-fullwidth-toggle');
    if (button) {
      button.innerHTML = isFullWidth ? '⟵⟶' : '⟶⟵';
      button.style.background = isFullWidth ? '#238636' : '#0969da';
    }
  }

  console.log('[GitHub Full Width] Script loaded - Press Cmd/Ctrl+Shift+W to toggle');
})();