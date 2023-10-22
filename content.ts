import * as swimlanesio from './extensions/swimlanes-io';

chrome.runtime.onMessage.addListener(swimlanesio.runtimeOnMessageListener);
