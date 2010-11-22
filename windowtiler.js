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

function pushTileIntoTileContext(left, top, width, height,
    tileContext) {
  tileContext.push({
    left: left,
    top: top,
    width: width,
    height: height
  });
  return tileContext;
}

function computeTiles(tileContext, numWindows, zoneX, zoneY, zoneWidth,
    zoneHeight) {
  window.console.log('Computing tiles: ' + zoneX + ', ' + zoneY + ', ' +
      zoneWidth + ', ' + zoneHeight + ' for ' + numWindows + ' windows');

  if (!numWindows) {
    return tileContext;
  }

  // Base case: only one window remains, we occupy the whole remaining space.
  if (numWindows == 1) {
    pushTileIntoTileContext(zoneX, zoneY, zoneWidth, zoneHeight, tileContext);
    return tileContext;
  }

  var halfNumWindows = Math.floor(numWindows / 2);
  if (zoneWidth > zoneHeight) {
    var halfWidth = zoneWidth / 2;
    tileContext = computeTiles(tileContext, halfNumWindows,
        zoneX, zoneY,
        halfWidth, zoneHeight);
    tileContext = computeTiles(tileContext, numWindows - halfNumWindows,
        zoneX + halfWidth, zoneY,
        zoneWidth - halfWidth, zoneHeight);
  } else {
    var halfHeight = zoneHeight / 2;
    tileContext = computeTiles(tileContext, halfNumWindows,
        zoneX, zoneY,
        zoneWidth, halfHeight);
    tileContext = computeTiles(tileContext, numWindows - halfNumWindows,
        zoneX, zoneY + halfHeight,
        zoneWidth, zoneHeight - halfHeight);
  }
  return tileContext;
}

function tileWindows(windows) {
  var tileContext = [];
  tileContext = computeTiles(tileContext, windows.length, 0, 0,
      screen.width, screen.height);
  for (var i = 0, tile; i < tileContext.length; i++) {
    tile = tileContext[i];
    repositionAndResizeWindow(windows[i].id, tile.left, tile.top,
        tile.width, tile.height, finished);
  }
}

