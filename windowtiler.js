
// Let's pollute the global namespace with these two functions so that we can
// keep a normal object-oriented paradigm the rest of the time.

function toArray(obj) {
  return Array.prototype.slice.call(obj);
}


/**
 * Creates a new window tiler.
 * @constructor
 */
WindowTiler = function() {};


/**
 * Array of all the screens for this instance of Chrome.
 * @type {Array.<Object>}
 */
WindowTiler.prototype.screens;


/**
 * Starts the whole process of tiling windows.
 * @param {chrome.windows.Tab} tab The tab from which the action was triggered.
 */
WindowTiler.prototype.start = function(tab) {
  chrome.system.display.getInfo(this.onReceivedDisplayData.bind(this));
};


WindowTiler.prototype.onReceivedDisplayData = function(screens) {
  this.screens = screens;
  for (var i = 0, scr = null; scr = this.screens[i]; i++) {
    window.console.log(scr);
  }
  chrome.windows.getAll({"populate" : false},
      this.onReceivedWindowsData.bind(this));
};


WindowTiler.prototype.windowIsWithinScreen = function(theWindow) {
  // Even though a window's top left corner can be outside the screen, we're
  // going to use that as a proxy. It doesn't matter if the window's bottom
  // right corner extends outside the screen.
  return theWindow.left >= screen.availLeft &&
      theWindow.left <= screen.availLeft + screen.width &&
      theWindow.top >= screen.availTop &&
      theWindow.top <= screen.availTop + screen.height;
};


WindowTiler.prototype.findWindowsOnThisScreen = function(theWindows,
    theScreen, allScreens) {
  var windowsOnSelectedScreen = [];

  for (var eachWindow, i = 0; eachWindow = theWindows[i]; i++) {
    var maxOverlap = 0;
    var screenWithMaxOverlap;
    for (var eachScreen, j = 0; eachScreen = allScreens[j]; i++) {
      var overlap = WindowTilerUtils.rectangleOverlap(
          eachWindow.top, eachWindow.left, eachWindow.width, theWindow.height,
          eachScreen.top, eachScreen.left, eachScreen.width, eachScreen.height);
      if (overlap >= maxOverlap) {
         maxOverlap = overlap;
         screenWithMaxOverlap = eachScreen;
      }
    }
    if (screenWithMaxOverlap == theScreen) {
      windowsOnSelectedScreen.push(eachWindow);
    }
  }
  return windowsOnSelectedScreen;
};


/**
 * Callback for when we received data about the currently open windows.
 * @param {Array.<chrome.windows.Window>} windows The array of open windows.
 */
WindowTiler.prototype.onReceivedWindowsData = function(windowsParam) {
  var filters = [];
  filters.push(this.windowIsNonMinimized);
  filters.push(this.windowIsWithinScreen);
  var windowsThatAreNotWithinScreen = [];
  for (var i = 0; i < windowsParam.length; i++) {
    if (!this.windowIsWithinScreen(windowsParam[i])) {
      windowsThatAreNotWithinScreen.push(windowsParam[i]);
    }
  }
  if (windowsThatAreNotWithinScreen.length > 0) {
    alert(windowsThatAreNotWithinScreen.length + ' windows are outside of ' +
        'your main screen, and the information currently provided by Chrome ' +
        'does not allow this extension to handle multiple monitors. ' +
        'I will only tile windows that are on your main screen. Sorry about ' +
        'that!');
  }
  var filteredWindows = this.filterWindows(windowsParam, filters);

  var mainScreen;
  for (var i = 0, screen; screen = this.screens[i]; i++) {
    if (screen.isPrimary) {
      mainScreen = screen;
      break;
    }
  }

  if (!mainScreen) {
    alert('I cannot find the main screen! I\'m going to stop here, sorry.');
    return;
  }

  this.tileWindows(filteredWindows, mainScreen);
  // Somehow, doing the tiling only once doesn't always work. Let's do it
  // again after a short period.
  window.setTimeout(this.tileWindows.bind(this, filteredWindows, mainScreen),
      300);
};


/**
 * Callback for when we're finished resizing a window.
 * @param {chrome.windows.Window} myWindow The window that has just finished
 * resizing.
 */
WindowTiler.prototype.finished = function(myWindow) {
  // Do nothing for now.
};


WindowTiler.prototype.windowIsNonMinimized = function(theWindow) {
  return theWindow.state != 'minimized';
};


WindowTiler.prototype.filterWindows = function(windowsParam, filters) {
  var filtered = [];
  for (var i = 0; i < windowsParam.length; i++) {
    var shouldAdd = true;
    for (var j = 0; j < filters.length; j++) {
      shouldAdd &= filters[j](windowsParam[i]);
    }
    if (shouldAdd) {
      filtered.push(windowsParam[i]);
    }
  }
  return filtered;
}


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
  window.console.log('Repositioning window ' + windowId + ' to ' +
      width + 'x' + height + ' + (' + left + ', ' + top + ')') ;
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
 */
WindowTiler.prototype.tileWindows = function(filteredWindows, screen) {
  var tileContext = [];
  window.console.log('Tiling windows on screen ');
  window.console.log(screen);
  // TODO: screen.avail* properties do not work well on Linux/GNOME.
  tileContext = this.computeTiles(tileContext, filteredWindows.length,
      screen.bounds.left, screen.bounds.top,
      screen.bounds.width, screen.bounds.height);
  for (var i = 0, tile; i < tileContext.length; i++) {
    tile = tileContext[i];
    this.repositionAndResizeWindow(filteredWindows[i].id, tile.left,
        tile.top, tile.width, tile.height, (this.finished.bind(this)));
  }
}
