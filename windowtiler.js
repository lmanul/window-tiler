var targetWindow = null;
var tabCount = 0;

function start(tab) {
  chrome.windows.getCurrent(getWindows);
}

function finished(myWindow) {
  window.console.log('Finished resizing window ' + myWindow.id);
}

function getWindows(win) {
  targetWindow = win;
  chrome.tabs.getAllInWindow(targetWindow.id, getTabs);
}

function getTabs(tabs) {
  tabCount = tabs.length;
  // We require all the tab information to be populated.
  chrome.windows.getAll({"populate" : true}, tileWindows);
}

function tileWindows(windows) {
  var numWindows = windows.length;
  var myWindow = windows.pop();
  window.console.log(windows);
  for (var i = 0, myWindow; i < windows.length; i++) {
    myWindow = windows[i];
    chrome.windows.update(myWindow.id, {
      'width': screen.width / 4,
      'height': screen.width / 4},
      finished);
  }
}

// Set up a click handler so that we can tile all the windows.
chrome.browserAction.onClicked.addListener(start);
