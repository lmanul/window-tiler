
// Let's pollute the global namespace with these two functions so that we can
// keep a normal object-oriented paradigm the rest of the time.

function toArray(obj) {
    return Array.prototype.slice.call(obj);
}

// Bind in its simplest form.
function bind(fn, scope) {
  return function () {
      return fn.apply(scope, toArray(arguments));
  };
}

WindowTiler = function() {};

WindowTiler.prototype.allWindows = null;

WindowTiler.prototype.start = function(tab) {
  chrome.windows.getAll({"populate" : true},
      bind(this.onReceivedWindowsData, this));
};

WindowTiler.prototype.onReceivedWindowsData = function(windows) {
  this.allWindows = windows;
  this.tileWindows(this.allWindows);
};

WindowTiler.prototype.finished = function(myWindow) {
  // Do nothing for now.
};

WindowTiler.prototype.repositionAndResizeWindow = function(windowId, left, top,
    width, height, callback) {
  chrome.windows.update(windowId, {
    'left': left,
    'top': top,
    'width': width,
    'height': height
  }, callback);
};

WindowTiler.prototype.pushTileIntoTileContext = function(left, top, width,
    height, tileContext) {
  tileContext.push({
    left: left,
    top: top,
    width: width,
    height: height
  });
  return tileContext;
};

WindowTiler.prototype.computeTiles = function(tileContext, numWindows, zoneX,
    zoneY, zoneWidth, zoneHeight) {
  window.console.log('Computing tiles: ' + zoneX + ', ' + zoneY + ', ' +
      zoneWidth + ', ' + zoneHeight + ' for ' + numWindows + ' windows');

  if (!numWindows) {
    return tileContext;
  }

  // Base case: only one window remains, we occupy the whole remaining space.
  if (numWindows == 1) {
    this.pushTileIntoTileContext(zoneX, zoneY, zoneWidth, zoneHeight,
        tileContext);
    return tileContext;
  }

  var halfNumWindows = Math.floor(numWindows / 2);
  if (zoneWidth > zoneHeight) {
    var halfWidth = zoneWidth / 2;
    tileContext = this.computeTiles(tileContext, halfNumWindows,
        zoneX, zoneY,
        halfWidth, zoneHeight);
    tileContext = this.computeTiles(tileContext,
        numWindows - halfNumWindows,
        zoneX + halfWidth, zoneY,
        zoneWidth - halfWidth, zoneHeight);
  } else {
    var halfHeight = zoneHeight / 2;
    tileContext = this.computeTiles(tileContext, halfNumWindows,
        zoneX, zoneY,
        zoneWidth, halfHeight);
    tileContext = this.computeTiles(tileContext,
        numWindows - halfNumWindows,
        zoneX, zoneY + halfHeight,
        zoneWidth, zoneHeight - halfHeight);
  }
  return tileContext;
};

WindowTiler.prototype.tileWindows = function(windows) {
  var tileContext = [];
  tileContext = this.computeTiles(tileContext, windows.length, 0, 0,
      screen.width, screen.height);
  for (var i = 0, tile; i < tileContext.length; i++) {
    tile = tileContext[i];
    this.repositionAndResizeWindow(windows[i].id, tile.left, tile.top,
        tile.width, tile.height, bind(this.finished, this));
  }
}

