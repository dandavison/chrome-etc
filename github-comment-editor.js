"use strict";
// GitHub Comment Editor Content Script
// Allows Shift+Cmd+P to edit the "current" comment on GitHub issues/PR pages
// Also supports double-click to edit any specific comment
// Escape key cancels editing
(function () {
    console.log('[GitHub Comment Editor] Script loaded, checking URL...');
    console.log('[GitHub Comment Editor] Current URL:', window.location.href);
    // Only run on GitHub issue/PR pages
    if (!isGitHubIssuePage()) {
        console.log('[GitHub Comment Editor] Not a GitHub issue/PR page, exiting');
        return;
    }
    console.log('[GitHub Comment Editor] GitHub issue/PR page detected, setting up listener');
    // Wait for the page to fully load comments (GitHub uses React and loads comments dynamically)
    setupWhenReady();
    function setupWhenReady() {
        // Check if comments have loaded yet
        const checkForComments = () => {
            // GitHub loads comments dynamically, look for them with various selectors
            const hasComments = document.querySelector('[id^="issuecomment-"]') ||
                document.querySelector('[class*="IssueBodyViewer"]') ||
                document.querySelector('[data-testid="issue-viewer-container"]');
            console.log('[GitHub Comment Editor] Checking for comments...', !!hasComments);
            if (hasComments) {
                console.log('[GitHub Comment Editor] Comments detected, setting up event listeners');
                setupEventListeners();
            }
            else {
                // Keep checking until comments appear
                setTimeout(checkForComments, 500);
            }
        };
        checkForComments();
    }
    function setupEventListeners() {
        // Listen for keyboard shortcuts (Shift+Cmd+P and Escape)
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
        // Listen for double-click to edit specific comment
        document.addEventListener('dblclick', handleDoubleClick, true);
        console.log('[GitHub Comment Editor] Event listeners attached (Shift+Cmd+P, Escape, and double-click)');
    }
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
            metaKey: event.metaKey,
            keyCombo: `${event.shiftKey ? 'Shift+' : ''}${event.metaKey ? 'Cmd+' : ''}${event.key}`
        });
        // Check for Shift+Cmd+P combination (toggle edit/preview)
        if (event.shiftKey && event.metaKey && event.key.toLowerCase() === 'p') {
            console.log('[GitHub Comment Editor] Shift+Cmd+P detected!');
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
        // Check for Escape key to cancel editing
        if (event.key === 'Escape') {
            console.log('[GitHub Comment Editor] Escape key detected');
            // Look for a visible Cancel button in any comment edit form
            const cancelButtons = document.querySelectorAll('button[type="button"]');
            for (const button of Array.from(cancelButtons)) {
                const text = button.textContent?.trim().toLowerCase();
                if (text === 'cancel' && button.offsetParent !== null) {
                    console.log('[GitHub Comment Editor] Found and clicking Cancel button');
                    button.click();
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                }
            }
        }
    }
    function handleDoubleClick(event) {
        console.log('[GitHub Comment Editor] Double-click detected on:', event.target);
        // Find the parent comment container from where the user double-clicked
        const target = event.target;
        // First check if we're in an issue comment (not the issue description)
        let commentContainer = target.closest('[id^="issuecomment-"]');
        // If not in a comment, check if we're in the issue body
        if (!commentContainer) {
            // Check if we're in the issue description area
            const issueBody = target.closest('[data-testid="issue-viewer-container"]');
            if (issueBody) {
                // Make sure we're actually in the issue body text, not in a comment
                const parentComment = target.closest('[id^="issuecomment-"]');
                if (!parentComment) {
                    commentContainer = issueBody;
                }
            }
        }
        if (!commentContainer) {
            console.log('[GitHub Comment Editor] Double-click was not inside a comment or issue body');
            return;
        }
        console.log('[GitHub Comment Editor] Double-click inside:', commentContainer.id || 'issue-body');
        console.log('[GitHub Comment Editor] Container element:', commentContainer);
        // Don't trigger if user is double-clicking in an already editable field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.getAttribute('contenteditable') === 'true')) {
            console.log('[GitHub Comment Editor] User is in an input field, not triggering');
            return;
        }
        // Prevent text selection from the double-click
        event.preventDefault();
        event.stopPropagation();
        // Clear any text selection that may have occurred
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
        }
        // Edit this specific comment
        editSpecificComment(commentContainer);
    }
    function editCurrentComment() {
        console.log('[GitHub Comment Editor] editCurrentComment called');
        // GitHub dynamically loads comments. Look for various containers
        // 1. First try to find issue comments (user comments)
        const issueComments = Array.from(document.querySelectorAll('[id^="issuecomment-"]'));
        console.log('[GitHub Comment Editor] Found issue comments:', issueComments.length);
        // 2. Find the issue/PR description (the main body)
        const issueBody = document.querySelector('[data-testid="issue-viewer-container"]') ||
            document.querySelector('[class*="IssueBodyViewer"]') ||
            document.querySelector('[class*="IssueViewer"]');
        console.log('[GitHub Comment Editor] Found issue body:', !!issueBody);
        // 3. Combine all comment-like elements
        let allComments = [];
        // Add issue body as first "comment" if it exists and has an edit button
        if (issueBody) {
            const hasEditButton = issueBody.querySelector('.octicon-kebab-horizontal') ||
                issueBody.querySelector('[aria-label*="options" i]');
            if (hasEditButton) {
                allComments.push(issueBody);
                console.log('[GitHub Comment Editor] Added issue body to comments list');
            }
        }
        // Add all issue comments
        allComments = allComments.concat(issueComments);
        console.log('[GitHub Comment Editor] Total comments (including issue body):', allComments.length);
        if (allComments.length === 0) {
            console.log('[GitHub Comment Editor] No editable comments found');
            // Log what we can see on the page for debugging
            console.log('[GitHub Comment Editor] Kebab buttons on page:', document.querySelectorAll('.octicon-kebab-horizontal').length);
            console.log('[GitHub Comment Editor] Elements with data-testid:', document.querySelectorAll('[data-testid]').length);
            return;
        }
        // Determine the "current" comment
        // Strategy: Last comment if there are multiple, otherwise the issue description (first item)
        let targetComment;
        if (allComments.length > 1) {
            // Get the last comment (most recent)
            targetComment = allComments[allComments.length - 1];
            console.log('[GitHub Comment Editor] Selected last comment as target');
        }
        else {
            // Only the issue/PR description exists
            targetComment = allComments[0];
            console.log('[GitHub Comment Editor] Selected issue/PR description as target');
        }
        console.log('[GitHub Comment Editor] Target comment element:', targetComment);
        console.log('[GitHub Comment Editor] Target comment ID:', targetComment.id || 'no-id');
        // Find the edit button in the target comment
        const editButton = findEditButton(targetComment);
        if (editButton) {
            // Click the edit button
            editButton.click();
            console.log('[GitHub Comment Editor] Triggered edit for current comment');
        }
        else {
            console.log('[GitHub Comment Editor] Could not find edit button for current comment');
            // Try to find any kebab button in the target for debugging
            const anyKebab = targetComment.querySelector('.octicon-kebab-horizontal');
            console.log('[GitHub Comment Editor] Any kebab in target:', !!anyKebab);
            if (anyKebab) {
                const parentButton = anyKebab.closest('button');
                console.log('[GitHub Comment Editor] Kebab parent button:', parentButton?.outerHTML.substring(0, 200));
            }
        }
    }
    function editSpecificComment(commentElement) {
        console.log('[GitHub Comment Editor] editSpecificComment called for:', commentElement.id || 'issue-body');
        // Find and click the edit button for this specific comment
        const editButton = findEditButton(commentElement);
        if (editButton) {
            // Click the edit button
            editButton.click();
            console.log('[GitHub Comment Editor] Triggered edit for specific comment');
        }
        else {
            console.log('[GitHub Comment Editor] Could not find edit button for this comment');
        }
    }
    function findEditButton(commentElement) {
        console.log('[GitHub Comment Editor] Looking for edit button...');
        // First, try to find the kebab menu button (three dots)
        const selectors = [
            'button[aria-label*="Show options"]',
            'button[aria-label="Show options"]',
            'button[aria-label="More options"]',
            'details.js-comment-header-actions-menu summary',
            'summary[aria-label*="Show options"]',
            '.octicon-kebab-horizontal',
            '.octicon-kebab-horizontal',
            // New GitHub selectors
            'button.timeline-comment-action',
            'button.btn-octicon',
            '[aria-label*="options" i]',
            '[aria-label*="menu" i]'
        ];
        let kebabButton = null;
        for (const selector of selectors) {
            let found;
            if (selector === '.octicon-kebab-horizontal') {
                // For the kebab icon, find its parent button/summary
                const icon = commentElement.querySelector(selector);
                found = icon?.closest('button') || icon?.closest('summary');
            }
            else {
                found = commentElement.querySelector(selector);
            }
            console.log(`[GitHub Comment Editor] Selector "${selector}" found:`, !!found);
            if (found) {
                kebabButton = found;
                console.log('[GitHub Comment Editor] Using selector:', selector);
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
        console.log('[GitHub Comment Editor] Looking for edit menu item...');
        // Find Edit specifically in ActionList items (GitHub's menu component)
        const editInMenu = Array.from(document.querySelectorAll('.prc-ActionList-ItemLabel-TmBhn, [class*="ActionList-ItemLabel"]')).find(el => el.textContent?.trim() === 'Edit');
        if (editInMenu) {
            console.log('[GitHub Comment Editor] Found Edit in menu:', editInMenu);
            // Click the parent link/button/menuitem
            // GitHub uses <li role="menuitem"> as the clickable element
            const clickable = editInMenu.closest('a, button, [role="menuitem"]');
            console.log('[GitHub Comment Editor] Clickable element:', clickable);
            if (clickable) {
                return clickable;
            }
        }
        // Fallback: broader search if the class names change
        const allMenuItems = document.querySelectorAll('[role="menuitem"], li[role="menuitem"], a[role="menuitem"], button[role="menuitem"]');
        console.log(`[GitHub Comment Editor] Fallback search: checking ${allMenuItems.length} menu items`);
        for (const item of Array.from(allMenuItems)) {
            const text = item.textContent?.trim();
            // Only look for exact "Edit" text, not buttons like "Edit issue title"
            if (text === 'Edit' || text === 'Edit comment') {
                console.log('[GitHub Comment Editor] Found Edit in fallback search:', item);
                return item;
            }
        }
        console.log('[GitHub Comment Editor] Edit option not found in menu');
        return null;
    }
    console.log('[GitHub Comment Editor] Initialized on GitHub issue/PR page');
})();
//# sourceMappingURL=github-comment-editor.js.map