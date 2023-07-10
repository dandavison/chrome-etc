chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'addLinksMenu') {
    addLinksMenu();
  }
});

function addLinksMenu() {
  const targetDiv = document.querySelector('.clearfix');

  const radioHtml = `
      <div class="clearfix">
        <label>Links:</label>
        <input type="radio" id="github" name="link" value="github" checked>
        <label for="github">GitHub</label>
        <input type="radio" id="vscode" name="link" value="vscode">
        <label for="vscode">VSCode</label>
      </div>`;

  if (targetDiv) {
    targetDiv.innerHTML = targetDiv.innerHTML + radioHtml;
  }
}
