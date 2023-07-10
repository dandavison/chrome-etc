chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
    chrome.tabs.sendMessage(tabId, { command: 'initializeUI' });
  }
});
