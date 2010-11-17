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

function repositionAndResizeWindow(window, left, top, width, height, callback) {
  chrome.windows.update(window.id, {
    'left': left,
    'top': top,
    'width': width,
    'height': height
  }, callback);
}

function tileWindows(windows) {
  var numWindows = windows.length;
  var myWindow = windows.pop();
  window.console.log(windows);
  for (var i = 0, myWindow; i < windows.length; i++) {
    myWindow = windows[i];
    repositionAndResizeWindow(
        windows[i],
        0, 0,
        500, 500,
        finished);
   }
}

// Set up a click handler so that we can tile all the windows.
chrome.browserAction.onClicked.addListener(start);
