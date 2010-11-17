var targetWindow = null;
var tabCount = 0;

function start(tab) {
  chrome.windows.getCurrent(getWindows);
}

function finished(myWindow) {
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

function repositionAndResizeWindow(windowId, left, top, width, height, callback) {
  chrome.windows.update(windowId, {
    'left': left,
    'top': top,
    'width': width,
    'height': height
  }, callback);
}

function computeTiles(tileContext, windows, zoneX, zoneY, zoneWidth,
    zoneHeight) {
  if (!windows.length) {
    return tileContext;
  }
  var myWindow = windows.pop();
  tileContext.push({
    id: myWindow.id,
    left: 0,
    top: 0,
    width: 600,
    height: 600
  });
  return computeTiles(tileContext, windows, zoneX, zoneY,
      zoneWidth, zoneHeight);
}

function tileWindows(windows) {
  var tileContext = [];
  tileContext = computeTiles(tileContext, windows, 0, 0,
      screen.width, screen.height);
  for (var i = 0, tile; i < tileContext.length; i++) {
    tile = tileContext[i];
    window.console.log(tile);
    window.console.log(tile.id);
    repositionAndResizeWindow(tile.id, tile.left, tile.top,
        tile.width, tile.height, finished);
  }
}

// Set up a click handler so that we can tile all the windows.
chrome.browserAction.onClicked.addListener(start);
