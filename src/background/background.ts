// Not in the DOM lib, and pulling in the WebWorker lib would clash with it.
declare function importScripts(...urls: string[]): void;

// MV3 allows one service worker, so per-feature background code is imported here.
importScripts('/d2/background.js');

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (
    details.url.startsWith('https://temporaltechnologies.slack.com/') ||
    details.url.startsWith('https://temporalio.slack.com/')
  ) {
    chrome.tabs.remove(details.tabId);
  }
});
