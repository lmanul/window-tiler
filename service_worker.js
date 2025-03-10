import WindowTiler from './windowtiler.js';

const windowTiler = new WindowTiler();

// Set up a click handler so that we can tile all the windows.
chrome.action.onClicked.addListener(windowTiler.start.bind(windowTiler));
// chrome.action.onClicked.addListener(windowTiler.start.bind(windowTiler));
