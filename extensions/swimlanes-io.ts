export function runtimeOnMessageListener(request) {
  if (request.command === 'swimlanesInitializeUI') {
    addControls();
  }
}

export function tabsOnUpdatedListener(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
    chrome.tabs.sendMessage(tabId, { command: 'initializeUI' });
  }
}

function addControls() {
  const buttonHtml = `
        <div class="clearfix">
          <button id="convert">Convert to VSCode links</button>
        </div>`;

  const diagramEl = document.querySelector('.diagram');
  const menubarEl = document.querySelector('.clearfix');

  for (const targetEl of [diagramEl, menubarEl]) {
    if (targetEl) {
      targetEl.innerHTML = buttonHtml + targetEl.innerHTML;

      const convertButton = document.getElementById('convert');

      convertButton?.addEventListener('click', () => {
        switchToVSCodeLinks();
      });
    }
  }

  // Set up a mutation observer
  const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        switchToVSCodeLinks();
        break; // No need to iterate further
      }
    }
  });

  // Start observing the diagram div for child node and attribute changes
  if (diagramEl) {
    observer.observe(diagramEl, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
}

const REPO_PATHS = new Map([
  [
    'sdk-core',
    '/Users/dan/src/temporalio/sdk-python/temporalio/bridge/sdk-core',
  ],
]);

function switchToVSCodeLinks() {
  console.log('switchToVSCodeLinks');
  // Select all <a> elements in the .diagram element
  const links = document.querySelectorAll('.diagram a');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    const regex =
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)#L(\d+)/;
    const match = href?.match(regex);
    if (match) {
      const [, user, repo, commit, path, line] = match;
      const repoPath = REPO_PATHS.get(repo) || `/Users/dan/src/${user}/${repo}`;
      const newUrl = `vscode-insiders://file${repoPath}/${path}:${line}`;
      link.setAttribute('href', newUrl);
    }
  });
}

function switchToGitHubLinks() {
  console.log('switchToGitHubLinks');
}
