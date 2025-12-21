chrome.webNavigation.onCompleted.addListener(function (details) {
  if (
    details.url.startsWith('http://wormhole:7117/') ||
    details.url.startsWith('https://temporaltechnologies.slack.com/') ||
    details.url.startsWith('https://temporalio.slack.com/')
  ) {
    chrome.tabs.remove(details.tabId);
  }
});
