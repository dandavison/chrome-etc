// GitHub Sticky Comment Heading
// While scrolling through a comment, shows the issue title and the comment's leading H1
// in the left margin

(async function() {
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || {};
  if (settings['github-sticky-comment-heading'] === false) {
    return;
  }

  const MARGIN_GAP = 12;
  // Below this width (e.g. in github-fullwidth mode) the label is not shown.
  const MIN_LABEL_WIDTH = 80;

  if (!/github\.com\/[^\/]+\/[^\/]+\/(issues|pull|discussions)/.test(window.location.href)) {
    return;
  }

  const label = document.createElement('div');
  label.id = 'github-sticky-comment-heading';
  label.style.cssText = `
    position: fixed;
    left: ${MARGIN_GAP}px;
    z-index: 10;
    color: var(--fgColor-default, var(--color-fg-default));
    overflow-wrap: break-word;
  `;
  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    line-height: 1.5;
    margin-bottom: 4px;
    color: var(--fgColor-muted, var(--color-fg-muted));
  `;
  const heading = document.createElement('div');
  label.append(title, heading);
  document.body.appendChild(label);

  let scheduled = false;
  const scheduleUpdate = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; update(); });
    }
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  update();

  function update(): void {
    const top = stickyHeaderBottom();
    const h1 = headingOfCommentAt(top);
    const width = h1 ? h1.parentElement!.getBoundingClientRect().left - 2 * MARGIN_GAP : 0;
    label.hidden = !h1 || width < MIN_LABEL_WIDTH;
    if (h1 && !label.hidden) {
      title.textContent = document.querySelector('[data-testid="issue-title"]')?.textContent ?? '';
      heading.textContent = h1.textContent;
      heading.style.font = getComputedStyle(h1).font;
      label.style.top = `${top + MARGIN_GAP}px`;
      label.style.width = `${width}px`;
    }
  }

  // The leading H1 of the comment spanning viewport line y, if that H1 is scrolled above y
  function headingOfCommentAt(y: number): HTMLElement | undefined {
    return Array.from(document.querySelectorAll<HTMLElement>('.markdown-body > h1:first-child')).find(h => {
      const comment = h.parentElement!.getBoundingClientRect();
      return h.getBoundingClientRect().bottom < y && comment.bottom > y;
    });
  }

  // GitHub's issue title bar becomes sticky once scrolled past the title
  function stickyHeaderBottom(): number {
    const header = document.querySelector('[class*="HeaderMetadata-module__stickyContainer"]');
    return Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
  }
})();
