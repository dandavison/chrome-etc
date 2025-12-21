chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && /^http/.test(tab.url)) {
    // Send message but ignore errors if no listener exists
    chrome.tabs.sendMessage(tabId, { command: 'initializeUI' }).catch(() => {
      // Content script not listening - that's fine
    });
  }
});

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (
    details.url.startsWith('http://wormhole:7117/') ||
    details.url.startsWith('https://temporaltechnologies.slack.com/') ||
    details.url.startsWith('https://temporalio.slack.com/')
  ) {
    chrome.tabs.remove(details.tabId);
  }
});
