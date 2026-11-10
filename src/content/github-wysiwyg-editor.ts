// GitHub WYSIWYG Markdown Editor
// Cmd/Ctrl+Shift+E in a comment box (or the "Rich" button at its top right) replaces GitHub's
// markdown textarea with an editable rendered view. Edits are converted back to markdown and
// written into the hidden textarea, so GitHub's own submit, preview and draft handling still work.
//
// Rendering uses marked and conversion back uses turndown, both loaded as globals from
// dist/vendor by the manifest. This is a lossy round trip:
// - Any edit re-serializes the whole comment, so markdown style is normalized (e.g. `*` bullets
//   become `-`, setext headings become ATX, `  \n` hard breaks become `\n`). Toggling without
//   editing leaves the markdown untouched.
// - Raw HTML other than the elements in KEPT_HTML_ELEMENTS is reduced to its text.
// - Text is not markdown-escaped, so typing `**x**` in the rich view produces bold, and a
//   source `\*` escape is lost once the comment is edited.
// - The rendered view is GitHub-flavored markdown as marked understands it; GitHub-specific
//   rendering (mentions, issue links, emoji shortcodes, mermaid/d2 diagrams) is shown as plain
//   text or code.

declare const marked: typeof import('marked');
declare const TurndownService: typeof import('turndown');
declare const turndownPluginGfm: { gfm: import('turndown').Plugin };

const DEBUG_WYSIWYG = false;
function logWysiwyg(...args: unknown[]) {
  if (DEBUG_WYSIWYG) console.log('[GitHub WYSIWYG]', ...args);
}

(async function () {
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || {};
  if (settings['github-wysiwyg-editor'] === false) {
    logWysiwyg('Disabled in settings');
    return;
  }

  const MARKDOWN_TEXTAREA_SELECTOR = [
    'textarea[aria-label="Markdown value"]',
    'textarea.js-comment-field',
    'textarea[name="comment[body]"]',
    'textarea[name="issue[body]"]',
    'textarea[name="pull_request[body]"]',
  ].join(', ');
  const KEPT_HTML_ELEMENTS = ['details', 'summary', 'kbd', 'sub', 'sup'] as const;
  const DROPPED_HTML_ELEMENTS = 'script, style, iframe, object, embed, link, meta, form';

  interface RichEditor {
    textarea: HTMLTextAreaElement;
    div: HTMLDivElement;
    // The textarea value as of the last render or sync; a different value means something
    // other than the rich view (GitHub clearing it after submit, its toolbar) changed it.
    lastSynced: string;
  }

  const editors = new Map<HTMLTextAreaElement, RichEditor>();
  const turndown = createTurndown();

  addStyles();
  reconcile();
  new MutationObserver(scheduleReconcile).observe(document.body, { childList: true, subtree: true });
  // Textarea value changes are not DOM mutations.
  setInterval(reconcile, 500);
  document.addEventListener('keydown', handleGlobalKeydown, true);

  function createTurndown(): import('turndown') {
    const service = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '_',
      strongDelimiter: '**',
      // marked renders single newlines as <br> (breaks: true); turn them back into single newlines.
      br: '',
    });
    service.use(turndownPluginGfm.gfm);
    service.keep([...KEPT_HTML_ELEMENTS]);
    service.escape = (text: string) => text;
    // turndown's default list items use `-   item`.
    service.addRule('listItem', {
      filter: 'li',
      replacement(content, node, options) {
        const parent = node.parentNode as HTMLElement;
        let prefix = `${options.bulletListMarker} `;
        if (parent.nodeName === 'OL') {
          const start = parent.getAttribute('start');
          const index = Array.prototype.indexOf.call(parent.children, node);
          prefix = `${start ? Number(start) + index : index + 1}. `;
        }
        const isParagraph = /\n$/.test(content);
        content = content.replace(/^\n+/, '').replace(/\n+$/, '') + (isParagraph ? '\n' : '');
        content = content.replace(/\n/gm, '\n' + ' '.repeat(prefix.length));
        return prefix + content + (node.nextSibling ? '\n' : '');
      },
    });
    // The gfm plugin appends a space after the checkbox, doubling the one marked leaves before the text.
    service.addRule('taskListItems', {
      filter: (node) => node.nodeName === 'INPUT' && (node as HTMLInputElement).type === 'checkbox' && node.parentNode?.nodeName === 'LI',
      replacement: (_content, node) => ((node as HTMLInputElement).checked ? '[x]' : '[ ]'),
    });
    // The gfm plugin emits single-tilde strikethrough.
    service.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content) => `~~${content}~~`,
    });
    return service;
  }

  function markdownToFragment(markdown: string): DocumentFragment {
    const html = marked.parse(markdown, { gfm: true, breaks: true, async: false }) as string;
    // DOMParser documents are inert, so nothing runs while we sanitize.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.body.querySelectorAll(DROPPED_HTML_ELEMENTS).forEach((el) => el.remove());
    doc.body.querySelectorAll('*').forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        const isHandler = attr.name.toLowerCase().startsWith('on');
        const isScriptUrl = /^\s*javascript:/i.test(attr.value);
        if (isHandler || isScriptUrl) el.removeAttribute(attr.name);
      }
    });
    // marked renders task list checkboxes disabled; they are left that way.
    const fragment = document.createDocumentFragment();
    for (const node of Array.from(doc.body.childNodes)) fragment.appendChild(document.importNode(node, true));
    return fragment;
  }

  function divToMarkdown(div: HTMLDivElement): string {
    return turndown.turndown(div);
  }

  let reconcileScheduled = false;
  function scheduleReconcile(): void {
    if (reconcileScheduled) return;
    reconcileScheduled = true;
    requestAnimationFrame(() => {
      reconcileScheduled = false;
      reconcile();
    });
  }

  function reconcile(): void {
    for (const textarea of Array.from(document.querySelectorAll<HTMLTextAreaElement>(MARKDOWN_TEXTAREA_SELECTOR))) {
      ensureToggleButton(textarea);
    }
    for (const editor of Array.from(editors.values())) {
      if (!editor.textarea.isConnected) {
        logWysiwyg('Textarea removed; removing rich view');
        editor.div.remove();
        editors.delete(editor.textarea);
      } else if (editor.textarea.value !== editor.lastSynced) {
        logWysiwyg('Textarea changed externally; re-rendering');
        renderInto(editor);
      }
    }
  }

  function ensureToggleButton(textarea: HTMLTextAreaElement): void {
    if (textarea.dataset.wysiwygButton) return;
    const parent = textarea.parentElement;
    if (!parent) return;
    textarea.dataset.wysiwygButton = 'true';
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gh-wysiwyg-toggle';
    button.textContent = 'Rich';
    button.title = 'Toggle rich text editing (Cmd/Ctrl+Shift+E)';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle(textarea);
    });
    textarea.insertAdjacentElement('afterend', button);
  }

  function toggleButtonFor(textarea: HTMLTextAreaElement): HTMLButtonElement | null {
    let el = textarea.nextElementSibling;
    while (el && !el.classList.contains('gh-wysiwyg-toggle')) el = el.nextElementSibling;
    return el as HTMLButtonElement | null;
  }

  function toggle(textarea: HTMLTextAreaElement): void {
    if (editors.has(textarea)) {
      closeRich(textarea);
    } else {
      openRich(textarea);
    }
  }

  function openRich(textarea: HTMLTextAreaElement): void {
    const div = document.createElement('div');
    div.className = 'markdown-body gh-wysiwyg-editor';
    div.contentEditable = 'true';
    div.style.minHeight = `${Math.max(textarea.offsetHeight, 100)}px`;
    const editor: RichEditor = { textarea, div, lastSynced: textarea.value };
    renderInto(editor);

    div.addEventListener('input', () => syncToTextarea(editor));
    div.addEventListener('keydown', (event) => handleEditorKeydown(event, editor));

    textarea.style.display = 'none';
    textarea.insertAdjacentElement('afterend', div);
    editors.set(textarea, editor);
    const button = toggleButtonFor(textarea);
    if (button) button.textContent = 'Markdown';

    document.execCommand('defaultParagraphSeparator', false, 'p');
    div.focus();
    placeCaretAtEnd(div);
    logWysiwyg('Opened rich view');
  }

  function closeRich(textarea: HTMLTextAreaElement): void {
    const editor = editors.get(textarea);
    if (!editor) return;
    editor.div.remove();
    editors.delete(textarea);
    textarea.style.display = '';
    const button = toggleButtonFor(textarea);
    if (button) button.textContent = 'Rich';
    textarea.focus();
    logWysiwyg('Closed rich view');
  }

  function renderInto(editor: RichEditor): void {
    editor.div.replaceChildren(markdownToFragment(editor.textarea.value));
    editor.lastSynced = editor.textarea.value;
  }

  function syncToTextarea(editor: RichEditor): void {
    const markdown = divToMarkdown(editor.div);
    editor.lastSynced = markdown;
    // Content scripts run in an isolated world, so React's value tracker on the textarea does not
    // see this assignment; it compares against the new value on the input event and fires onChange.
    editor.textarea.value = markdown;
    editor.textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function isToggleShortcut(event: KeyboardEvent): boolean {
    const isModKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;
    return isModKey && event.shiftKey && event.key.toLowerCase() === 'e';
  }

  function handleGlobalKeydown(event: KeyboardEvent): void {
    if (!isToggleShortcut(event)) return;
    const active = document.activeElement;
    let textarea: HTMLTextAreaElement | null = null;
    if (active instanceof HTMLTextAreaElement && active.matches(MARKDOWN_TEXTAREA_SELECTOR)) {
      textarea = active;
    } else if (active instanceof HTMLElement && active.classList.contains('gh-wysiwyg-editor')) {
      textarea = Array.from(editors.values()).find((e) => e.div === active)?.textarea ?? null;
    }
    if (!textarea) return;
    event.preventDefault();
    event.stopPropagation();
    toggle(textarea);
  }

  function handleEditorKeydown(event: KeyboardEvent, editor: RichEditor): void {
    const isModKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;
    if (isModKey && event.key === 'Enter') {
      // GitHub submits on Cmd/Ctrl+Enter in the textarea; forward the keystroke there.
      event.preventDefault();
      syncToTextarea(editor);
      editor.textarea.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        bubbles: true,
        cancelable: true,
      }));
    } else if (isModKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const url = prompt('Link URL');
      if (url) document.execCommand('createLink', false, url);
    } else if (isModKey && !event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      wrapSelectionInCode();
    }
  }

  function wrapSelectionInCode(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const text = selection.toString();
    document.execCommand('insertHTML', false, `<code>${escapeHtml(text)}</code>`);
  }

  function escapeHtml(text: string): string {
    const span = document.createElement('span');
    span.textContent = text;
    return span.innerHTML;
  }

  function placeCaretAtEnd(el: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function addStyles(): void {
    const style = document.createElement('style');
    style.id = 'gh-wysiwyg-styles';
    style.textContent = `
      .gh-wysiwyg-toggle {
        position: absolute;
        top: 4px;
        right: 4px;
        z-index: 1;
        padding: 0 6px;
        font-size: 11px;
        line-height: 18px;
        border: 1px solid var(--borderColor-default, #d0d7de);
        border-radius: 4px;
        background: var(--bgColor-muted, #f6f8fa);
        color: var(--fgColor-muted, #59636e);
        cursor: pointer;
        opacity: 0.7;
      }
      .gh-wysiwyg-toggle:hover { opacity: 1; }
      .gh-wysiwyg-editor {
        padding: 8px 12px;
        outline: none;
        overflow-wrap: anywhere;
        background: transparent;
        cursor: text;
      }
    `;
    document.head.appendChild(style);
  }
})();
