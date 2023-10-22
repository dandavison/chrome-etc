import * as swimlanesio from './extensions/swimlanes-io';
import * as wormhole from './extensions/wormhole';

chrome.tabs.onUpdated.addListener(swimlanesio.tabsOnUpdatedListener);

chrome.webNavigation.onCompleted.addListener(
  wormhole.navigationOnCompletedListener
);
