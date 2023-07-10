chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: 'GitHub',
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
    chrome.tabs.sendMessage(tabId, { command: 'addLinksMenu' });
  }
});

chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  // We retrieve the action badge to check if the extension is 'ON' or 'OFF'
  const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
  // Next state will always be the opposite
  const nextState = prevState === 'GitHub' ? 'VSCode' : 'GitHub';
  console.log(nextState);

  // Set the action badge to the next state
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });
  console.log(nextState);
  if (nextState === 'VSCode') {
    console.log(`Switching to VSCode`);
  } else if (nextState === 'GitHub') {
    console.log(`Switching back to GitHub`);
  }
});
