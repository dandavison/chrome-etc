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
      
      /* Hide fullscreen/expand controls */
      button[aria-label*="fullscreen" i],
      button[aria-label*="expand" i],
      button[title*="fullscreen" i],
      button[title*="expand" i],
      .fullscreen-button,
      .expand-button {
        display: none !important;
      }
      
      /* Hide copy controls */
      button[aria-label*="copy" i],
      button[title*="copy" i],
      .copy-button,
      clipboard-copy {
        display: none !important;
      }
      
      /* Hide any floating button groups on diagrams */
      .btn-group,
      .BtnGroup,
      .button-group {
        display: none !important;
      }
      
      /* For viewscreen.githubusercontent.com context - hide all buttons */
      ${window.location.hostname === 'viewscreen.githubusercontent.com' ? `
        button {
          display: none !important;
        }
      ` : ''}
      
      /* For GitHub main page - hide render viewer action buttons */
      .render-viewer-actions,
      .js-render-enrichment-buttons,
      .render-needs-enrichment .position-absolute button {
        display: none !important;
      }
      
      /* This removes ALL control overlays from Mermaid diagrams */
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