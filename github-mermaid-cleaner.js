"use strict";
/**
 * GitHub Mermaid Diagram Cleaner
 * Removes the zoom/pan control panels from Mermaid diagrams on GitHub
 */
(function () {
    console.log('[GitHub Mermaid Cleaner] Script loaded');
    // Function to inject styles
    function hideMermaidControls() {
        let styleEl = document.getElementById('github-mermaid-cleaner-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'github-mermaid-cleaner-styles';
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
      /* Hide the entire control panel in the bottom-right of Mermaid diagrams */
      .mermaid-viewer-control-panel {
        display: none !important;
      }
      
      /* Hide the upper-right controls (expand arrows, copy button) on Mermaid containers */
      .js-render-needs-enrichment .position-absolute button,
      .render-container button[aria-label*="expand"],
      .render-container button[aria-label*="copy"],
      .render-container .BtnGroup,
      .js-render-enrichment-buttons,
      button[aria-label="Enter fullscreen"],
      button[aria-label="Exit fullscreen"],
      button[aria-label="Copy mermaid code"],
      .render-viewer-actions,
      .render-needs-enrichment button {
        display: none !important;
      }
      
      /* This removes ALL controls from Mermaid diagrams for a clean viewing experience */
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
//# sourceMappingURL=github-mermaid-cleaner.js.map