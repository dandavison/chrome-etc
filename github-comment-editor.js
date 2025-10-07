"use strict";
// GitHub Comment Editor Content Script
// Allows Shift+Enter to edit the "current" comment on GitHub issues/PR pages
(function () {
    // Only run on GitHub issue/PR pages
    if (!isGitHubIssuePage()) {
        return;
    }
    // Listen for Shift+Enter keypress
    document.addEventListener('keydown', handleKeyPress);
    function isGitHubIssuePage() {
        const url = window.location.href;
        return /github\.com\/[^\/]+\/[^\/]+\/(issues|pull)\/\d+/.test(url);
    }
    function handleKeyPress(event) {
        // Check for Shift+Enter combination
        if (event.shiftKey && event.key === 'Enter') {
            // Don't trigger if user is already typing in an input/textarea
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.getAttribute('contenteditable') === 'true')) {
                return;
            }
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            // Find and edit the current comment
            editCurrentComment();
        }
    }
    function editCurrentComment() {
        // Get all timeline items (comments and the issue/PR description)
        const allTimelineItems = document.querySelectorAll('.timeline-comment');
        if (allTimelineItems.length === 0) {
            console.log('[GitHub Comment Editor] No comments found on this page');
            return;
        }
        // Determine the "current" comment
        // Strategy: Last comment if there are multiple, otherwise the issue description (first item)
        let targetComment;
        // Check if there's more than one timeline item
        if (allTimelineItems.length > 1) {
            // Get the last actual comment (not the issue description)
            // The first timeline-comment is usually the issue/PR description
            targetComment = allTimelineItems[allTimelineItems.length - 1];
        }
        else {
            // Only the issue/PR description exists
            targetComment = allTimelineItems[0];
        }
        // Find the edit button in the target comment
        const editButton = findEditButton(targetComment);
        if (editButton) {
            // Click the edit button
            editButton.click();
            console.log('[GitHub Comment Editor] Triggered edit for current comment');
        }
        else {
            console.log('[GitHub Comment Editor] Could not find edit button for current comment');
        }
    }
    function findEditButton(commentElement) {
        // First, try to find the kebab menu button (three dots)
        const kebabButton = commentElement.querySelector('button[aria-label*="Show options"]') ||
            commentElement.querySelector('details.js-comment-header-actions-menu summary') ||
            commentElement.querySelector('summary[aria-label*="Show options"]') ||
            commentElement.querySelector('.octicon-kebab-horizontal')?.closest('summary');
        if (kebabButton) {
            // Click the kebab menu to open it
            kebabButton.click();
            // Use MutationObserver to wait for the menu to appear
            const observer = new MutationObserver((mutations, obs) => {
                // Find the edit button in the dropdown menu
                const editMenuItem = findEditMenuItem();
                if (editMenuItem) {
                    obs.disconnect();
                    editMenuItem.click();
                }
            });
            // Start observing for menu appearance
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            // Set a timeout to stop observing and close menu if edit button not found
            setTimeout(() => {
                observer.disconnect();
                const editMenuItem = findEditMenuItem();
                if (!editMenuItem) {
                    // If we can't find the edit button, try to close the menu
                    const openDetails = document.querySelector('details[open].js-comment-header-actions-menu');
                    if (openDetails) {
                        openDetails.open = false;
                    }
                    else {
                        // Try clicking the kebab button again to close it
                        kebabButton.click();
                    }
                    console.log('[GitHub Comment Editor] Edit option not found in menu');
                }
            }, 500);
            return kebabButton; // Return something truthy to indicate we handled it
        }
        // Fallback: try to find a direct edit button (some older GitHub UI versions)
        const directEditButton = commentElement.querySelector('button.js-comment-edit-button') ||
            commentElement.querySelector('button[aria-label*="Edit comment"]');
        return directEditButton;
    }
    function findEditMenuItem() {
        // Look for edit button with various selectors
        return document.querySelector('button[role="menuitem"][data-hotkey="e"]') ||
            document.querySelector('button[role="menuitem"][aria-label*="Edit"]') ||
            document.querySelector('.js-comment-edit-button[role="menuitem"]') ||
            Array.from(document.querySelectorAll('button[role="menuitem"]'))
                .find(el => {
                const text = el.textContent?.trim().toLowerCase();
                return text === 'edit' || text === 'edit comment';
            }) ||
            null;
    }
    console.log('[GitHub Comment Editor] Initialized on GitHub issue/PR page');
})();
//# sourceMappingURL=github-comment-editor.js.map