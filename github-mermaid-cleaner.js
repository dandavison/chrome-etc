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
      
      /* This removes all controls: pan (arrows), zoom (in/out), and reset/sync buttons */
      /* The upper-right controls (arrows to expand, copy button) remain visible */
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