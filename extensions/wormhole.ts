export function navigationOnCompletedListener(details) {
  if (details.url.startsWith('http://wormhole/')) {
    chrome.tabs.remove(details.tabId);
  }
}
