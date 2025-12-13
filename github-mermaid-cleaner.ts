/**
 * GitHub Mermaid Diagram Cleaner
 * Removes the zoom/pan control panels from Mermaid diagrams on GitHub
 */

(function() {
  console.log('[GitHub Mermaid Cleaner] Script loaded');

  // Function to inject styles
  function hideMermaidControls(): void {
    let styleEl = document.getElementById('github-mermaid-cleaner-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'github-mermaid-cleaner-styles';
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      /* Hide only the pan controls (up/down/left/right) from Mermaid diagrams */
      .mermaid-viewer-control-panel button.up,
      .mermaid-viewer-control-panel button.down,
      .mermaid-viewer-control-panel button.left,
      .mermaid-viewer-control-panel button.right {
        display: none !important;
      }
      
      /* Keep the zoom and reset controls visible but hide the pan controls */
      /* This removes the annoying directional controls in the bottom right */
    `;
  }

  // Apply the styles immediately
  hideMermaidControls();

  // Re-apply styles when navigating between pages (GitHub is a SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Small delay to ensure new content is loaded
      setTimeout(hideMermaidControls, 100);
    }
  }).observe(document, { subtree: true, childList: true });

  console.log('[GitHub Mermaid Cleaner] Mermaid diagram controls hidden');
})();
