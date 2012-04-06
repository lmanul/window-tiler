
// Let's pollute the global namespace with these two functions so that we can
// keep a normal object-oriented paradigm the rest of the time.

function toArray(obj) {
  return Array.prototype.slice.call(obj);
}

/** Bind in its simplest form. */
function bind(fn, scope) {
  return function () {
      return fn.apply(scope, toArray(arguments));
  };
}

/**
 * Creates a new window tiler.
 * @constructor
 */
WindowTiler = function() {};

/**
 * Array of all the windows for this instance of Chrome.
 * @type {Array.<chrome.window.Window>}
 */
WindowTiler.prototype.allWindows;


/**
 * Starts the whole process of tiling windows.
 * @param {chrome.windows.Tab} tab The tab from which the action was triggered.
 */
WindowTiler.prototype.start = function(tab) {
  chrome.windows.getAll({"populate" : true},
      bind(this.onReceivedWindowsData, this));
};


/**
 * Utility function to compare 2-dimensionnal areas.
 * @param {Object} a The first area.
 * @param {Object} b The first area.
 */
WindowTiler.prototype.compareAreas = function(a, b) {
  if (a.width != b.width) {
    return a.width - b.width;
  }
  if (a.height != b.height) {
    return a.height - b.height;
  }
  if (a.left != b.left) {
    return a.left - b.left;
  }
  if (a.top != b.top) {
    return a.top - b.top;
  }
  return 0;
};


/**
 * Callback for when we received data about the currently open windows.
 * @param {Array.<chrome.windows.Window>} windows The array of open windows.
 */
WindowTiler.prototype.onReceivedWindowsData = function(windows) {
  this.allWindows = this.getNonMinimizedWindows(windows);
  this.tileWindows(this.allWindows);
};


/**
 * Callback for when we're finished resizing a window.
 * @param {chrome.windows.Window} myWindow The window that has just finished
 * resizing.
 */
WindowTiler.prototype.finished = function(myWindow) {
  // Do nothing for now.
};


WindowTiler.prototype.getNonMinimizedWindows = function(windowsParam) {
  var nonMinimizedWindows = [];
  for (var i = 0; i < windowsParam.length; i++) {
    if (windowsParam[i].state != 'minimized') {
      nonMinimizedWindows.push(windowsParam[i]);
    }
  }
  return nonMinimizedWindows;
};

/**
 * Utility function to resize a window with the given window ID with the given
 * dimensions, and call the given callback function.
 * @param {number} windowId The ID of the window to resize.
 * @param {number} left The left coordinate to use for the new geometry.
 * @param {number} top The top position to use for the new geometry.
 * @param {number} width The width to use for the new geometry.
 * @param {number} height The height to use for the new geometry.
 * @param {Function} callback The callback function to call once the window is
 *     resized.
 */
WindowTiler.prototype.repositionAndResizeWindow = function(windowId, left, top,
    width, height, callback) {
  chrome.windows.update(windowId, {
    'left': left,
    'top': top,
    'width': width,
    'height': height,
    'state': 'normal'
  }, callback);
};


/**
 * Adds a tile (which contains information about one of the tiles on the screen)
 * into the current context (array of computed tiles).
 * @param {number} left The left position to use for the added tile.
 * @param {number} top The top position to use for the added tile.
 * @param {number} width The width to use for the added tile.
 * @param {number} height The height to use for the added tile.
 * @param {Array.<Object>} tileContext The context to which to add the new tile.
 */
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


/**
 * Computes the relevant tiles and pushes them into the given tile context, for
 * a zone on the screen defined by the arguments, and for the given number of
 * windows to tile.
 * @param {Array.<Object>} tileContext The tile context to which to add computed
 *     tiles.
 * @param {number} numWindows The number of windows left to tile.
 * @param {number} zoneX The X coordinate of the zone remaining to tile.
 * @param {number} zoneY The Y coordinate of the zone remaining to tile.
 * @param {number} zoneWidth The width of the zone remaining to tile.
 * @param {number} zoneHeight The height of the zone remaining to tile.
 */
WindowTiler.prototype.computeTiles = function(tileContext, numWindows, zoneX,
    zoneY, zoneWidth, zoneHeight) {
  if (window.console) {
    window.console.log('Computing tiles: ' + zoneX + ', ' + zoneY + ', ' +
        zoneWidth + ', ' + zoneHeight + ' for ' + numWindows + ' windows');
  }

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
    var halfWidth = Math.floor(zoneWidth / 2);
    tileContext = this.computeTiles(tileContext, halfNumWindows,
        zoneX, zoneY,
        halfWidth, zoneHeight);
    tileContext = this.computeTiles(tileContext,
        numWindows - halfNumWindows,
        zoneX + halfWidth + 1, zoneY,
        zoneWidth - halfWidth, zoneHeight);
  } else {
    var halfHeight = Math.floor(zoneHeight / 2);
    tileContext = this.computeTiles(tileContext, halfNumWindows,
        zoneX, zoneY,
        zoneWidth, halfHeight);
    tileContext = this.computeTiles(tileContext,
        numWindows - halfNumWindows,
        zoneX, zoneY + halfHeight + 1,
        zoneWidth, zoneHeight - halfHeight);
  }
  return tileContext;
};


/**
 * Tiles the windows given in an array as an argument over the available area
 * on the screen.
 * @param {chrome.windows.Window} windows The array of windows to tile.
 */
WindowTiler.prototype.tileWindows = function(windowsParam) {
  var tileContext = [];
  var nonMinimizedWindows = this.getNonMinimizedWindows(windowsParam);
  // TODO: screen.avail* properties do not work well on Linux/GNOME.
  tileContext = this.computeTiles(tileContext, nonMinimizedWindows.length,
      screen.availLeft, screen.availTop, screen.availWidth, screen.availHeight);
  for (var i = 0, tile; i < tileContext.length; i++) {
    tile = tileContext[i];
    this.repositionAndResizeWindow(nonMinimizedWindows[i].id, tile.left,
        tile.top, tile.width, tile.height, bind(this.finished, this));
  }
}

