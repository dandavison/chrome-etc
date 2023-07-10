chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'addLinksMenu') {
    addLinksMenu();
  }
});

function addLinksMenu() {
  // Creating a new dropdown menu
  const newDropdown = document.createElement('div');
  newDropdown.className = 'dropdown links clearfix';

  // Creating the button that triggers the dropdown
  const dropdownButton = document.createElement('button');
  dropdownButton.id = 'links-dropdown';
  dropdownButton.className = 'button';
  dropdownButton.textContent = 'Links';

  // Adding a span element for the caret
  const caret = document.createElement('span');
  caret.className = 'caret';
  dropdownButton.appendChild(caret);

  // Creating the dropdown menu
  const dropdownMenu = document.createElement('ul');
  dropdownMenu.className = 'dropdown-menu dropdown-menu-right';

  // Creating the list items for the two links
  const githubItem = document.createElement('li');
  const vscodeItem = document.createElement('li');

  // Creating the links themselves
  const githubLink = document.createElement('a');
  githubLink.textContent = 'GitHub';
  githubItem.appendChild(githubLink);

  const vscodeLink = document.createElement('a');
  vscodeLink.textContent = 'VSCode';
  vscodeItem.appendChild(vscodeLink);

  // Adding the links to the dropdown menu
  dropdownMenu.appendChild(githubItem);
  dropdownMenu.appendChild(vscodeItem);

  // Adding the button and dropdown menu to the new dropdown div
  newDropdown.appendChild(dropdownButton);
  newDropdown.appendChild(dropdownMenu);

  // Adding the new dropdown menu to the DOM, after the toggle-mode div
  const toggleModeDiv = document.querySelector('.toggle-mode');
  toggleModeDiv?.parentNode?.insertBefore(
    newDropdown,
    toggleModeDiv.nextSibling
  );
}
