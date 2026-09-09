// GitHub D2 Diagrams
// Replaces d2 code blocks with SVG from the local d2-serve render service,
// keeping the source one click away.

const DEBUG_D2 = false;
function logD2(...args: unknown[]) { if (DEBUG_D2) console.log(...args); }

const D2_MARKER = 'data-d2-processed';

const D2_CODE_ICON = '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.75.75 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.75.75 0 0 1 .734.215Zm-6.56 0a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.75.75 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"/></svg>';

const D2_DIAGRAM_ICON = '<svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h3.5C6.216 0 7 .784 7 1.75v3.5A1.75 1.75 0 0 1 5.25 7H4v4a1 1 0 0 0 1 1h4v-1.25C9 9.784 9.784 9 10.75 9h3.5c.966 0 1.75.784 1.75 1.75v3.5A1.75 1.75 0 0 1 14.25 16h-3.5A1.75 1.75 0 0 1 9 14.25v-.75H5A2.5 2.5 0 0 1 2.5 11V7h-.75A1.75 1.75 0 0 1 0 5.25Zm1.75-.25a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Zm9 9a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Z"/></svg>';

const D2_STYLES = `
.ghd2-wrapper { position: relative; margin-bottom: 16px; }
.ghd2-diagram { overflow-x: auto; }
.ghd2-diagram > svg { max-width: 100%; height: auto; }
.ghd2-toggle {
  position: absolute; top: 4px; right: 4px; opacity: 0; transition: opacity 0.1s;
  display: inline-flex; align-items: center; padding: 4px 6px; cursor: pointer;
  background: var(--bgColor-muted, #f6f8fa);
  border: 1px solid var(--borderColor-default, #d1d9e0);
  border-radius: 6px;
  color: var(--fgColor-muted, #656d76);
}
.ghd2-wrapper:hover .ghd2-toggle, .ghd2-toggle:focus { opacity: 1; }
.ghd2-error {
  margin-top: 4px; white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px;
  color: var(--fgColor-danger, #d1242f);
}
`;

(async function() {
  const result = await chrome.storage.sync.get('settings');
  const settings = result.settings || {};
  if (settings['github-d2'] === false) return;

  injectStyles();
  renderAll();

  // Comment bodies arrive lazily and GitHub is a SPA.
  new MutationObserver(() => renderAll()).observe(document.body, { childList: true, subtree: true });

  function injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = D2_STYLES;
    document.head.appendChild(style);
  }

  function renderAll(): void {
    document.querySelectorAll<HTMLElement>('div.highlight-source-d2').forEach(block => render(block));
  }

  async function render(block: HTMLElement): Promise<void> {
    if (block.hasAttribute(D2_MARKER)) return;
    block.setAttribute(D2_MARKER, '');

    const source = block.querySelector('pre')?.textContent;
    if (!source) return;

    const response: D2RenderResponse = await chrome.runtime.sendMessage({ type: 'd2-render', source });

    if ('unavailable' in response) {
      logD2('[D2] render service unavailable:', response.unavailable);
      return;
    }
    if ('compileError' in response) {
      logD2('[D2] compile failed:', response.compileError);
      block.after(errorNote(response.compileError));
      return;
    }
    showDiagram(block, response.svg);
  }

  function showDiagram(block: HTMLElement, svg: string): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'ghd2-wrapper';

    const diagram = document.createElement('div');
    diagram.className = 'ghd2-diagram';
    diagram.innerHTML = svg;

    block.replaceWith(wrapper);
    block.style.display = 'none';
    wrapper.append(diagram, block, toggleButton(diagram, block));
  }

  function toggleButton(diagram: HTMLElement, block: HTMLElement): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'ghd2-toggle';
    button.type = 'button';
    describe(button, true);

    button.addEventListener('click', () => {
      const showingDiagram = block.style.display === 'none';
      diagram.style.display = showingDiagram ? 'none' : '';
      block.style.display = showingDiagram ? '' : 'none';
      describe(button, !showingDiagram);
    });
    return button;
  }

  function describe(button: HTMLButtonElement, showingDiagram: boolean): void {
    button.innerHTML = showingDiagram ? D2_CODE_ICON : D2_DIAGRAM_ICON;
    button.title = showingDiagram ? 'Show d2 source' : 'Show diagram';
  }

  function errorNote(message: string): HTMLElement {
    const note = document.createElement('div');
    note.className = 'ghd2-error';
    note.textContent = `d2: ${message.trim()}`;
    return note;
  }
})();
