"use strict";
/**
 * GitHub Mermaid Diagram Cleaner
 * Removes the zoom/pan control panels from Mermaid diagrams on GitHub
 */
(function () {
    console.log('[GitHub Mermaid Cleaner] Script loaded on', window.location.hostname);
    // Function to inject styles
    function hideMermaidControls() {
        let styleEl = document.getElementById('github-mermaid-cleaner-styles');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'github-mermaid-cleaner-styles';
            document.head.appendChild(styleEl);
        }
        // Different CSS based on context
        if (window.location.hostname === 'viewscreen.githubusercontent.com') {
            // Inside the iframe - hide bottom-right controls
            styleEl.innerHTML = `
        /* Hide the entire control panel in the bottom-right of Mermaid diagrams */
        .mermaid-viewer-control-panel {
          display: none !important;
        }

        /* Hide all buttons in the iframe */
        button {
          display: none !important;
        }
      `;
        }
        else {
            // On main GitHub page - hide overlay controls
            styleEl.innerHTML = `
        /* Hide the overlay expand/fullscreen buttons on Mermaid containers */
        .js-render-needs-enrichment button[aria-label*="fullscreen" i],
        .render-needs-enrichment button[aria-label*="fullscreen" i],
        section[data-type="mermaid"] button {
          display: none !important;
        }

        /* Hide the copy button */
        clipboard-copy[aria-label*="Copy" i] {
          display: none !important;
        }

        /* Hide any button that's a sibling of the iframe */
        iframe.render-viewer ~ button,
        iframe.render-viewer ~ * button {
          display: none !important;
        }

        /* Hide buttons inside the render container */
        .render-container button,
        .js-render-target button {
          display: none !important;
        }

        /* Hide the entire button group that appears over mermaid */
        .position-absolute:has(button[aria-label*="fullscreen" i]) {
          display: none !important;
        }
      `;
        }
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