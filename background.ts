chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && /^http/.test(tab.url)) {
    chrome.tabs.sendMessage(tabId, { command: 'initializeUI' });
  }
});

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (details.url.startsWith('http://wormhole') || details.url.startsWith('https://temporaltechnologies.slack.com/')) {
    chrome.tabs.remove(details.tabId);
  }
});
