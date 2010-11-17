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

function pushTileIntoTileContext(window, left, top, width, height,
    tileContext) {
  tileContext.push({
    id: window.id,
    left: left,
    top: top,
    width: width,
    height: height
  });
  return tileContext;
}

function computeTiles(tileContext, windows, zoneX, zoneY, zoneWidth,
    zoneHeight) {
  if (!windows.length) {
    return tileContext;
  }
  
  if (zoneX > zoneY) {
  }
  var myWindow = windows.pop();
  pushTileIntoTileContext(myWindow, 0, 0, 600, 600, tileContext);
  return computeTiles(tileContext, windows, zoneX, zoneY,
      zoneWidth, zoneHeight);
}

function tileWindows(windows) {
  var tileContext = [];
  tileContext = computeTiles(tileContext, windows, 0, 0,
      screen.width, screen.height);
  for (var i = 0, tile; i < tileContext.length; i++) {
    tile = tileContext[i];
    repositionAndResizeWindow(tile.id, tile.left, tile.top,
        tile.width, tile.height, finished);
  }
}

// Set up a click handler so that we can tile all the windows.
chrome.browserAction.onClicked.addListener(start);
