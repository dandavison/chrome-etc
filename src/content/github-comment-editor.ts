// GitHub Comment Editor Content Script
// Features:
// - Shift+Cmd+P: Edit last edited comment (or last comment if none edited yet)
// - Double-click: Edit specific comment where you clicked
// Maintains state of last edited comment for quick re-editing

const DEBUG_EDITOR = false;
function logEditor(...args: unknown[]) { if (DEBUG_EDITOR) console.log(...args); }

(async function() {
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || {};
  if (settings['github-comment-editor'] === false) {
    logEditor('[GitHub Comment Editor] Disabled in settings');
    return;
  }

  logEditor('[GitHub Comment Editor] Script loaded, checking URL...');
  logEditor('[GitHub Comment Editor] Current URL:', window.location.href);

  // State: Track the last edited comment
  let lastEditedComment: Element | null = null;

  // Only run on GitHub issue/PR pages
  if (!isGitHubIssuePage()) {
    logEditor('[GitHub Comment Editor] Not a GitHub issue/PR page, exiting');
    return;
  }

  logEditor('[GitHub Comment Editor] GitHub issue/PR page detected, setting up listener');

  // Wait for the page to fully load comments (GitHub uses React and loads comments dynamically)
  setupWhenReady();

  function setupWhenReady() {
    // Check if comments have loaded yet
    const checkForComments = () => {
      // GitHub loads comments dynamically, look for them with various selectors
      const hasComments =
        document.querySelector('[id^="issuecomment-"]') ||
        document.querySelector('[class*="IssueBodyViewer"]') ||
        document.querySelector('[data-testid="issue-viewer-container"]');

      logEditor('[GitHub Comment Editor] Checking for comments...', !!hasComments);

      if (hasComments) {
        logEditor('[GitHub Comment Editor] Comments detected, setting up event listeners');
        setupEventListeners();
      } else {
        // Keep checking until comments appear
        setTimeout(checkForComments, 500);
      }
    };

    checkForComments();
  }

  function setupEventListeners() {
    // Listen for keyboard shortcut (Shift+Cmd+P)
    document.addEventListener('keydown', handleKeyPress, true); // Use capture phase

    // Also log all key events for debugging
    document.addEventListener('keydown', (event) => {
      logEditor('[GitHub Comment Editor] Key pressed:', {
        key: event.key,
        code: event.code,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        target: event.target
      });
    }, true);

    logEditor('[GitHub Comment Editor] Event listeners attached (Shift+Cmd+P)');
  }

  function isGitHubIssuePage(): boolean {
    const url = window.location.href;
    const isIssuePage = /github\.com\/[^\/]+\/[^\/]+\/(issues|pull)\/\d+/.test(url);
    logEditor('[GitHub Comment Editor] URL match result:', isIssuePage);
    return isIssuePage;
  }

  function handleKeyPress(event: KeyboardEvent): void {
    logEditor('[GitHub Comment Editor] handleKeyPress called with:', {
      key: event.key,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      keyCombo: `${event.shiftKey ? 'Shift+' : ''}${event.metaKey ? 'Cmd+' : ''}${event.key}`
    });

    // Check for Shift+Cmd+P combination (toggle edit/preview)
    if (event.shiftKey && event.metaKey && event.key.toLowerCase() === 'p') {
      logEditor('[GitHub Comment Editor] Shift+Cmd+P detected!');

      // Don't trigger if user is already typing in an input/textarea
      const activeElement = document.activeElement;
      logEditor('[GitHub Comment Editor] Active element:', activeElement?.tagName, activeElement);

      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        logEditor('[GitHub Comment Editor] User is typing in an input field, not triggering');
        return;
      }

      logEditor('[GitHub Comment Editor] Preventing default and triggering edit');

      // Prevent default behavior
      event.preventDefault();
      event.stopPropagation();

      // If we have a last edited comment, use that; otherwise use current comment
      if (lastEditedComment && document.contains(lastEditedComment)) {
        logEditor('[GitHub Comment Editor] Re-editing last edited comment');
        editSpecificComment(lastEditedComment);
      } else {
        if (lastEditedComment && !document.contains(lastEditedComment)) {
          logEditor('[GitHub Comment Editor] Last edited comment no longer exists in DOM');
          lastEditedComment = null;
        } else {
          logEditor('[GitHub Comment Editor] No last edited comment, using current comment');
        }
        editCurrentComment();
      }
    }
  }

  function editCurrentComment(): void {
    logEditor('[GitHub Comment Editor] editCurrentComment called');

    // GitHub dynamically loads comments. Look for various containers
    // 1. First try to find issue comments (user comments)
    const issueComments = Array.from(document.querySelectorAll('[id^="issuecomment-"]'));
    logEditor('[GitHub Comment Editor] Found issue comments:', issueComments.length);

    // 2. Find the issue/PR description (the main body)
    const issueBody = document.querySelector('[data-testid="issue-viewer-container"]') ||
                     document.querySelector('[class*="IssueBodyViewer"]') ||
                     document.querySelector('[class*="IssueViewer"]');

    logEditor('[GitHub Comment Editor] Found issue body:', !!issueBody);

    // 3. Combine all comment-like elements
    let allComments: Element[] = [];

    // Add issue body as first "comment" if it exists and has an edit button
    if (issueBody) {
      const hasEditButton = issueBody.querySelector('.octicon-kebab-horizontal') ||
                          issueBody.querySelector('[aria-label*="options" i]');
      if (hasEditButton) {
        allComments.push(issueBody);
        logEditor('[GitHub Comment Editor] Added issue body to comments list');
      }
    }

    // Add all issue comments
    allComments = allComments.concat(issueComments);

    logEditor('[GitHub Comment Editor] Total comments (including issue body):', allComments.length);

    if (allComments.length === 0) {
      logEditor('[GitHub Comment Editor] No editable comments found');

      // Log what we can see on the page for debugging
      logEditor('[GitHub Comment Editor] Kebab buttons on page:',
                  document.querySelectorAll('.octicon-kebab-horizontal').length);
      logEditor('[GitHub Comment Editor] Elements with data-testid:',
                  document.querySelectorAll('[data-testid]').length);
      return;
    }

    // Determine the "current" comment
    // Strategy: Last comment if there are multiple, otherwise the issue description (first item)
    let targetComment: Element;

    if (allComments.length > 1) {
      // Get the last comment (most recent)
      targetComment = allComments[allComments.length - 1];
      logEditor('[GitHub Comment Editor] Selected last comment as target');
    } else {
      // Only the issue/PR description exists
      targetComment = allComments[0];
      logEditor('[GitHub Comment Editor] Selected issue/PR description as target');
    }

    logEditor('[GitHub Comment Editor] Target comment element:', targetComment);
    logEditor('[GitHub Comment Editor] Target comment ID:', targetComment.id || 'no-id');

    // Find the edit button in the target comment
    const editButton = findEditButton(targetComment);

    if (editButton) {
      // Click the edit button
      (editButton as HTMLElement).click();
      logEditor('[GitHub Comment Editor] Triggered edit for current comment');

      // Save this as the last edited comment
      lastEditedComment = targetComment;
      const identifier = targetComment.id ||
                        targetComment.getAttribute('data-testid') ||
                        'issue-body';
      logEditor('[GitHub Comment Editor] Saved as last edited comment:', identifier);
    } else {
      logEditor('[GitHub Comment Editor] Could not find edit button for current comment');

      // Try to find any kebab button in the target for debugging
      const anyKebab = targetComment.querySelector('.octicon-kebab-horizontal');
      logEditor('[GitHub Comment Editor] Any kebab in target:', !!anyKebab);

      if (anyKebab) {
        const parentButton = anyKebab.closest('button');
        logEditor('[GitHub Comment Editor] Kebab parent button:', parentButton?.outerHTML.substring(0, 200));
      }
    }
  }

  function editSpecificComment(commentElement: Element): void {
    const identifier = commentElement.id ||
                      commentElement.getAttribute('data-testid') ||
                      'issue-body';
    logEditor('[GitHub Comment Editor] editSpecificComment called for:', identifier);

    // Find and click the edit button for this specific comment
    const editButton = findEditButton(commentElement);

    if (editButton) {
      // Click the edit button
      (editButton as HTMLElement).click();
      logEditor('[GitHub Comment Editor] Triggered edit for specific comment');

      // Save this as the last edited comment
      lastEditedComment = commentElement;
      logEditor('[GitHub Comment Editor] Saved as last edited comment:', identifier);
    } else {
      logEditor('[GitHub Comment Editor] Could not find edit button for this comment');
    }
  }

  function findEditButton(commentElement: Element): Element | null {
    logEditor('[GitHub Comment Editor] Looking for edit button...');

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

      logEditor(`[GitHub Comment Editor] Selector "${selector}" found:`, !!found);
      if (found) {
        kebabButton = found;
        logEditor('[GitHub Comment Editor] Using selector:', selector);
        break;
      }
    }

    if (kebabButton) {
      logEditor('[GitHub Comment Editor] Kebab button found, clicking it');
      // Click the kebab menu to open it
      (kebabButton as HTMLElement).click();

      // Use MutationObserver to wait for the menu to appear
      let menuFound = false;
      const observer = new MutationObserver((mutations, obs) => {
        // Only try to find the edit button once
        if (!menuFound) {
          const editMenuItem = findEditMenuItem();

          if (editMenuItem) {
            menuFound = true;
            obs.disconnect();
            // Small delay to ensure menu is fully rendered
            setTimeout(() => {
              (editMenuItem as HTMLElement).click();
              logEditor('[GitHub Comment Editor] Clicked Edit menu item');
            }, 10);
          }
        }
      });

      // Start observing for menu appearance
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Set a timeout to stop observing if menu doesn't appear or edit not found
      const kebabButtonElement = kebabButton as HTMLElement;
      setTimeout(() => {
        observer.disconnect();

        if (!menuFound) {
          // Try one more time directly
          const editMenuItem = findEditMenuItem();
          if (editMenuItem) {
            (editMenuItem as HTMLElement).click();
            logEditor('[GitHub Comment Editor] Clicked Edit menu item (from timeout)');
          } else {
            // If we can't find the edit button, try to close the menu
            const openDetails = document.querySelector('details[open].js-comment-header-actions-menu');
            if (openDetails) {
              (openDetails as HTMLDetailsElement).open = false;
            } else {
              // Try clicking the kebab button again to close it
              kebabButtonElement.click();
            }
            logEditor('[GitHub Comment Editor] Edit option not found in menu');
          }
        }
      }, 300);

      return kebabButton; // Return something truthy to indicate we handled it
    }

    // Fallback: try to find a direct edit button (some older GitHub UI versions)
    const directEditButton = commentElement.querySelector('button.js-comment-edit-button') ||
                           commentElement.querySelector('button[aria-label*="Edit comment"]');

    return directEditButton;
  }

  function findEditMenuItem(): Element | null {
    logEditor('[GitHub Comment Editor] Looking for edit menu item...');

    // Find Edit specifically in ActionList items (GitHub's menu component)
    const editInMenu = Array.from(
      document.querySelectorAll('.prc-ActionList-ItemLabel-TmBhn, [class*="ActionList-ItemLabel"]')
    ).find(el => el.textContent?.trim() === 'Edit');

    if (editInMenu) {
      logEditor('[GitHub Comment Editor] Found Edit in menu:', editInMenu);

      // Click the parent link/button/menuitem
      // GitHub uses <li role="menuitem"> as the clickable element
      const clickable = editInMenu.closest('a, button, [role="menuitem"]');
      logEditor('[GitHub Comment Editor] Clickable element:', clickable);

      if (clickable) {
        return clickable;
      }
    }

    // Fallback: broader search if the class names change
    const allMenuItems = document.querySelectorAll('[role="menuitem"], li[role="menuitem"], a[role="menuitem"], button[role="menuitem"]');
    logEditor(`[GitHub Comment Editor] Fallback search: checking ${allMenuItems.length} menu items`);

    for (const item of Array.from(allMenuItems)) {
      const text = item.textContent?.trim();
      // Only look for exact "Edit" text, not buttons like "Edit issue title"
      if (text === 'Edit' || text === 'Edit comment') {
        logEditor('[GitHub Comment Editor] Found Edit in fallback search:', item);
        return item;
      }
    }

    logEditor('[GitHub Comment Editor] Edit option not found in menu');
    return null;
  }

  logEditor('[GitHub Comment Editor] Initialized on GitHub issue/PR page');
})();
