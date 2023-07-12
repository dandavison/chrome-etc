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

  for (const targetDiv of [
    document.querySelector('.diagram'),
    document.querySelector('.clearfix'),
  ]) {
    if (targetDiv) {
      targetDiv.innerHTML = buttonHtml + targetDiv.innerHTML;

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
      const newUrl = `vscode-insiders://file/tmp/${user}/${repo}/${path}:${line}`;
      link.setAttribute('href', newUrl);
    }
  });
}

function switchToGitHubLinks() {
  console.log('switchToGitHubLinks');
}
