chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'initializeUI') {
    addControls();
  }
});

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
}

function switchToVSCodeLinks() {
  // Select all <a> elements in the .diagram element
  const links = document.querySelectorAll('.diagram a');

  links.forEach((link) => {
    const href = link.getAttribute('href');
    const regex =
      /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.*)#L(\d+)/;
    const match = href?.match(regex);
    if (match) {
      const [, user, repo, commit, path, line] = match;
      const newUrl = `vscode-insiders://file/Users/dan/src/${user}/${repo}/${path}:${line}`;
      link.setAttribute('href', newUrl);
    }
  });
}

function switchToGitHubLinks() {
  console.log('switchToGitHubLinks');
}
