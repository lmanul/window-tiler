var windowTiler = new WindowTiler();

// Ideally, I am looking for a "new window" event, but a "new tab" event will work
chrome.tabs.onCreated.addListener(windowTiler.start.bind(windowTiler));

