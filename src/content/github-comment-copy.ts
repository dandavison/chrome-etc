// GitHub Comment Copy
// Adds a "Copy markdown" button to each issue/PR comment header.
// Fetches raw markdown from the GitHub REST API.

const DEBUG_COPY = false;
function logCopy(...args: unknown[]) { if (DEBUG_COPY) console.log(...args); }

const COPY_SVG = '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>';

const CHECK_SVG = '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';

const MARKER = 'data-copy-md-injected';

(async function() {
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || {};
  if (settings['github-comment-copy'] === false) return;

  if (!isGitHubIssuePage()) return;
  logCopy('[Comment Copy] Initializing');

  injectButtons();

  // Re-inject on dynamic navigation / lazy-loaded comments
  const observer = new MutationObserver(() => injectButtons());
  observer.observe(document.body, { childList: true, subtree: true });

  function isGitHubIssuePage(): boolean {
    return /github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+/.test(window.location.href);
  }

  function parseUrl(): { owner: string; repo: string; number: string } | null {
    const m = window.location.pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
    return m ? { owner: m[1], repo: m[2], number: m[4] } : null;
  }

  function commentIdFromElement(el: Element): string | null {
    if (el.id?.startsWith('issuecomment-')) {
      return el.id.replace('issuecomment-', '');
    }
    for (const attr of ['data-testid']) {
      const v = el.getAttribute(attr);
      if (v?.startsWith('comment-viewer-outer-box-')) return v.split('-').pop()!;
      if (v?.startsWith('timeline-row-border-')) return v.split('-').pop()!;
    }
    return null;
  }

  function isIssueBody(el: Element): boolean {
    const t = el.getAttribute('data-testid');
    return t === 'issue-viewer-container' || el.className?.includes?.('IssueBodyViewer') || false;
  }

  // ---- API ----

  async function fetchMarkdown(el: Element): Promise<string | null> {
    const info = parseUrl();
    if (!info) return null;

    const commentId = commentIdFromElement(el);
    if (commentId) {
      return apiFetch(`https://api.github.com/repos/${info.owner}/${info.repo}/issues/comments/${commentId}`);
    }
    if (isIssueBody(el)) {
      return apiFetch(`https://api.github.com/repos/${info.owner}/${info.repo}/issues/${info.number}`);
    }
    return null;
  }

  async function apiFetch(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });
      if (!res.ok) {
        logCopy('[Comment Copy] API error', res.status);
        return null;
      }
      const data = await res.json();
      return data.body ?? null;
    } catch (e) {
      logCopy('[Comment Copy] Fetch failed', e);
      return null;
    }
  }

  // ---- Button injection ----

  function injectButtons(): void {
    // Issue comments
    document.querySelectorAll('[id^="issuecomment-"]').forEach(el => maybeInjectButton(el));
    // New-style comments
    document.querySelectorAll('[data-testid^="comment-viewer-outer-box-"], [data-testid^="timeline-row-border-"]').forEach(el => maybeInjectButton(el));
    // Issue body
    const body = document.querySelector('[data-testid="issue-viewer-container"]');
    if (body) maybeInjectButton(body);
  }

  function maybeInjectButton(container: Element): void {
    if (container.getAttribute(MARKER)) return;

    const kebab = findKebab(container);
    if (!kebab) return;

    const parent = kebab.parentElement;
    if (!parent) return;

    container.setAttribute(MARKER, '1');

    const btn = document.createElement('button');
    btn.className = 'btn-octicon';
    btn.title = 'Copy markdown';
    btn.type = 'button';
    btn.innerHTML = COPY_SVG;
    btn.style.cssText = 'color: var(--fgColor-muted, #656d76); cursor: pointer; background: none; border: none; padding: 4px; display: inline-flex; align-items: center;';

    btn.addEventListener('mouseenter', () => { btn.style.color = 'var(--fgColor-default, #1f2328)'; });
    btn.addEventListener('mouseleave', () => { btn.style.color = 'var(--fgColor-muted, #656d76)'; });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const md = await fetchMarkdown(container);
      if (md) {
        await navigator.clipboard.writeText(md);
        btn.innerHTML = CHECK_SVG;
        btn.style.color = 'var(--fgColor-success, #1a7f37)';
        setTimeout(() => {
          btn.innerHTML = COPY_SVG;
          btn.style.color = 'var(--fgColor-muted, #656d76)';
        }, 1500);
      }
    });

    parent.insertBefore(btn, kebab);
  }

  function findKebab(container: Element): Element | null {
    const selectors = [
      'button[aria-label*="Show options"]',
      'button[aria-label="More options"]',
      '.octicon-kebab-horizontal',
    ];
    for (const sel of selectors) {
      const el = container.querySelector(sel);
      if (el) {
        return sel === '.octicon-kebab-horizontal' ? (el.closest('button') || el) : el;
      }
    }
    return null;
  }
})();
