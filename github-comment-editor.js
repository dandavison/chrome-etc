"use strict";
// GitHub Comment Editor Content Script
// Allows Shift+Enter to edit the "current" comment on GitHub issues/PR pages
(function () {
    console.log('[GitHub Comment Editor] Script loaded, checking URL...');
    console.log('[GitHub Comment Editor] Current URL:', window.location.href);
    // Only run on GitHub issue/PR pages
    if (!isGitHubIssuePage()) {
        console.log('[GitHub Comment Editor] Not a GitHub issue/PR page, exiting');
        return;
    }
    console.log('[GitHub Comment Editor] GitHub issue/PR page detected, setting up listener');
    // Listen for Shift+Enter keypress
    document.addEventListener('keydown', handleKeyPress, true); // Use capture phase
    // Also log all key events for debugging
    document.addEventListener('keydown', (event) => {
        console.log('[GitHub Comment Editor] Key pressed:', {
            key: event.key,
            code: event.code,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            target: event.target
        });
    }, true);
    function isGitHubIssuePage() {
        const url = window.location.href;
        const isIssuePage = /github\.com\/[^\/]+\/[^\/]+\/(issues|pull)\/\d+/.test(url);
        console.log('[GitHub Comment Editor] URL match result:', isIssuePage);
        return isIssuePage;
    }
    function handleKeyPress(event) {
        console.log('[GitHub Comment Editor] handleKeyPress called with:', {
            key: event.key,
            shiftKey: event.shiftKey,
            isEnter: event.key === 'Enter'
        });
        // Check for Shift+Enter combination
        if (event.shiftKey && event.key === 'Enter') {
            console.log('[GitHub Comment Editor] Shift+Enter detected!');
            // Don't trigger if user is already typing in an input/textarea
            const activeElement = document.activeElement;
            console.log('[GitHub Comment Editor] Active element:', activeElement?.tagName, activeElement);
            if (activeElement && (activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.getAttribute('contenteditable') === 'true')) {
                console.log('[GitHub Comment Editor] User is typing in an input field, not triggering');
                return;
            }
            console.log('[GitHub Comment Editor] Preventing default and triggering edit');
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();
            // Find and edit the current comment
            editCurrentComment();
        }
    }
    function editCurrentComment() {
        console.log('[GitHub Comment Editor] editCurrentComment called');
        // Get all timeline items (comments and the issue/PR description)
        const allTimelineItems = document.querySelectorAll('.timeline-comment');
        console.log('[GitHub Comment Editor] Found timeline items:', allTimelineItems.length);
        if (allTimelineItems.length === 0) {
            console.log('[GitHub Comment Editor] No comments found on this page');
            // Try alternative selectors
            const alternatives = {
                '.js-comment-container': document.querySelectorAll('.js-comment-container'),
                '.comment': document.querySelectorAll('.comment'),
                '.timeline-comment-wrapper': document.querySelectorAll('.timeline-comment-wrapper'),
                '[role="article"]': document.querySelectorAll('[role="article"]')
            };
            console.log('[GitHub Comment Editor] Alternative selectors found:', alternatives);
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
            console.log('[GitHub Comment Editor] Selected last comment as target');
        }
        else {
            // Only the issue/PR description exists
            targetComment = allTimelineItems[0];
            console.log('[GitHub Comment Editor] Selected issue/PR description as target');
        }
        console.log('[GitHub Comment Editor] Target comment element:', targetComment);
        // Find the edit button in the target comment
        const editButton = findEditButton(targetComment);
        if (editButton) {
            // Click the edit button
            editButton.click();
            console.log('[GitHub Comment Editor] Triggered edit for current comment');
        }
        else {
            console.log('[GitHub Comment Editor] Could not find edit button for current comment');
            console.log('[GitHub Comment Editor] Target comment HTML:', targetComment.innerHTML.substring(0, 500));
        }
    }
    function findEditButton(commentElement) {
        console.log('[GitHub Comment Editor] Looking for edit button...');
        // First, try to find the kebab menu button (three dots)
        const selectors = [
            'button[aria-label*="Show options"]',
            'details.js-comment-header-actions-menu summary',
            'summary[aria-label*="Show options"]',
            '.octicon-kebab-horizontal'
        ];
        let kebabButton = null;
        for (const selector of selectors) {
            const found = selector === '.octicon-kebab-horizontal'
                ? commentElement.querySelector(selector)?.closest('summary')
                : commentElement.querySelector(selector);
            console.log(`[GitHub Comment Editor] Selector "${selector}" found:`, !!found);
            if (found) {
                kebabButton = found;
                break;
            }
        }
        if (kebabButton) {
            console.log('[GitHub Comment Editor] Kebab button found, clicking it');
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
            const kebabButtonElement = kebabButton;
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
                        kebabButtonElement.click();
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