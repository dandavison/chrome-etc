chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'initializeUI') {
    addControls();
  }
});

function addControls() {
  const targetDiv = document.querySelector('.diagram');

  const radioHtml = `
      <div class="clearfix">
        <label>Links:</label>
        <input type="radio" id="github" name="link" value="github" checked>
        <label for="github">GitHub</label>
        <input type="radio" id="vscode" name="link" value="vscode">
        <label for="vscode">VSCode</label>
      </div>`;

  if (targetDiv) {
    targetDiv.innerHTML = radioHtml + targetDiv.innerHTML;

    const githubRadio = document.getElementById('github');
    const vscodeRadio = document.getElementById('vscode');

    githubRadio?.addEventListener('change', (e) => {
      if (e.target?.checked) {
        switchToGitHubLinks();
      }
    });

    vscodeRadio?.addEventListener('change', (e) => {
      if (e.target?.checked) {
        switchToVSCodeLinks();
      }
    });
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
      const newUrl = `vscode-insiders://file/tmp/${user}/${repo}/${path}:${line}`;
      link.setAttribute('href', newUrl);
    }
  });
}

function switchToGitHubLinks() {
  console.log('switchToGitHubLinks');
}
