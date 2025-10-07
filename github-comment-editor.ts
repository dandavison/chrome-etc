// GitHub Comment Editor Content Script
// Allows Shift+Enter to edit the "current" comment on GitHub issues/PR pages

(function() {
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

  function isGitHubIssuePage(): boolean {
    const url = window.location.href;
    const isIssuePage = /github\.com\/[^\/]+\/[^\/]+\/(issues|pull)\/\d+/.test(url);
    console.log('[GitHub Comment Editor] URL match result:', isIssuePage);
    return isIssuePage;
  }

  function handleKeyPress(event: KeyboardEvent): void {
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
      
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
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

  function editCurrentComment(): void {
    console.log('[GitHub Comment Editor] editCurrentComment called');
    
    // Get all timeline items (comments and the issue/PR description)
    // GitHub has changed their HTML structure, now using .comment instead of .timeline-comment
    let allTimelineItems = document.querySelectorAll('.timeline-comment');
    console.log('[GitHub Comment Editor] Found .timeline-comment items:', allTimelineItems.length);
    
    // If old selector doesn't work, try the new one
    if (allTimelineItems.length === 0) {
      allTimelineItems = document.querySelectorAll('.comment');
      console.log('[GitHub Comment Editor] Found .comment items:', allTimelineItems.length);
      
      if (allTimelineItems.length === 0) {
        console.log('[GitHub Comment Editor] No comments found on this page');
        return;
      }
    }

    // Filter to only get actual comment containers (not code comments or other .comment elements)
    // Look for comments that have edit buttons/menus
    const actualComments = Array.from(allTimelineItems).filter(el => {
      // Check if this looks like an actual comment by looking for action buttons
      return el.querySelector('button[aria-label*="options" i]') || 
             el.querySelector('.octicon-kebab-horizontal') ||
             el.querySelector('button.btn-octicon') ||
             el.querySelector('[role="button"]');
    });
    
    console.log('[GitHub Comment Editor] Filtered to actual comments:', actualComments.length);
    
    if (actualComments.length === 0) {
      console.log('[GitHub Comment Editor] No editable comments found');
      return;
    }
    
    // Determine the "current" comment
    // Strategy: Last comment if there are multiple, otherwise the issue description (first item)
    let targetComment: Element;
    
    // Check if there's more than one comment
    if (actualComments.length > 1) {
      // Get the last actual comment (not the issue description)
      // The first comment is usually the issue/PR description
      targetComment = actualComments[actualComments.length - 1];
      console.log('[GitHub Comment Editor] Selected last comment as target');
    } else {
      // Only the issue/PR description exists
      targetComment = actualComments[0];
      console.log('[GitHub Comment Editor] Selected issue/PR description as target');
    }

    console.log('[GitHub Comment Editor] Target comment element:', targetComment);

    // Find the edit button in the target comment
    const editButton = findEditButton(targetComment);
    
    if (editButton) {
      // Click the edit button
      (editButton as HTMLElement).click();
      console.log('[GitHub Comment Editor] Triggered edit for current comment');
    } else {
      console.log('[GitHub Comment Editor] Could not find edit button for current comment');
      console.log('[GitHub Comment Editor] Target comment HTML:', targetComment.innerHTML.substring(0, 500));
    }
  }

  function findEditButton(commentElement: Element): Element | null {
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
    
    let kebabButton: Element | null = null;
    for (const selector of selectors) {
      let found: Element | null | undefined;
      
      if (selector === '.octicon-kebab-horizontal') {
        // For the kebab icon, find its parent button/summary
        const icon = commentElement.querySelector(selector);
        found = icon?.closest('button') || icon?.closest('summary');
      } else {
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
      (kebabButton as HTMLElement).click();

      // Use MutationObserver to wait for the menu to appear
      const observer = new MutationObserver((mutations, obs) => {
        // Find the edit button in the dropdown menu
        const editMenuItem = findEditMenuItem();

        if (editMenuItem) {
          obs.disconnect();
          (editMenuItem as HTMLElement).click();
        }
      });

      // Start observing for menu appearance
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Set a timeout to stop observing and close menu if edit button not found
      const kebabButtonElement = kebabButton as HTMLElement;
      setTimeout(() => {
        observer.disconnect();
        const editMenuItem = findEditMenuItem();
        
        if (!editMenuItem) {
          // If we can't find the edit button, try to close the menu
          const openDetails = document.querySelector('details[open].js-comment-header-actions-menu');
          if (openDetails) {
            (openDetails as HTMLDetailsElement).open = false;
          } else {
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

  function findEditMenuItem(): Element | null {
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
