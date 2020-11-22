var windowTiler = new WindowTiler();

// Ideally, I am looking for a "new window" event, but a "tab" creation and removal events will work
chrome.tabs.onCreated.addListener(windowTiler.start.bind(windowTiler));
chrome.tabs.onDetached.addListener(windowTiler.start.bind(windowTiler));
chrome.tabs.onRemoved.addListener(windowTiler.start.bind(windowTiler));
