import WindowTilerUtils from "./util.js";

// Let's pollute the global namespace with these two functions so that we can
// keep a normal object-oriented paradigm the rest of the time.

function toArray(obj) {
  return Array.prototype.slice.call(obj);
}

class WindowTiler {
  constructor() {
    /**
     * Array of all the screens for this instance of Chrome.
     * @type {Array.<Object>}
     */
    this.screens = [];

    /**
     * Array of windows that currently need repositioning.
     * @type {Array.<Object>}
     */
    this.windowsToReposition = [];

    /**
     * Array of windows that currently need verifying.
     * @type {Array.<Object>}
     */
    this.windowsToVerify = [];
  }

  /**
   * Starts the whole process of tiling windows.
   * @param {chrome.windows.Tab} tab The tab from which the action was triggered.
   */
  start = async (tab) => {
    const screens = await chrome.system.display.getInfo();
    this.onReceivedDisplayData(screens);
  };

  onReceivedDisplayData = async (screens) => {
    this.screens = screens;
    const windowsInfo = await chrome.windows.getAll({ populate: false });
    this.onReceivedWindowsData(windowsInfo);
  };

  findWindowsOnThisScreen = (theWindows, theScreen, allScreens) => {
    const windowsOnSelectedScreen = [];

    for (var eachWindow, i = 0; (eachWindow = theWindows[i]); i++) {
      let maxOverlap = 0;
      let screenWithMaxOverlap;
      for (let eachScreen of allScreens) {
        let overlap = WindowTilerUtils.rectangleOverlap(
          eachWindow.top,
          eachWindow.left,
          eachWindow.width,
          eachWindow.height,
          eachScreen.bounds.top,
          eachScreen.bounds.left,
          eachScreen.bounds.width,
          eachScreen.bounds.height
        );
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
  onReceivedWindowsData = (windowsParam) => {
    const filters = [];
    filters.push(this.windowIsNonMinimized);
    const filteredWindows = this.filterWindows(windowsParam, filters);

    var mainScreen;
    for (var i = 0, eachScreen; (eachScreen = this.screens[i]); i++) {
      if (eachScreen.isPrimary) {
        mainScreen = eachScreen;
        break;
      }
    }

    if (!mainScreen) {
      alert("I cannot find the main screen! I'm going to stop here, sorry.");
      return;
    }

    for (var i = 0, eachScreen; (eachScreen = this.screens[i]); i++) {
      const windowsForThisScreen = this.findWindowsOnThisScreen(
        filteredWindows,
        eachScreen,
        this.screens
      );

      this.tileWindows(windowsForThisScreen, eachScreen);
    }
  };

  /**
   * Callback for when we're finished resizing a window.
   * @param {chrome.windows.Window} myWindow The window that has just finished
   * resizing.
   */
  finished = (myWindow) => {
    // Do nothing for now.
  };

  windowIsNonMinimized = (theWindow) => {
    return theWindow.state != "minimized";
  };

  filterWindows = (windowsParam, filters) => {
    const filtered = [];
    for (var i = 0; i < windowsParam.length; i++) {
      let shouldAdd = true;
      for (let j = 0; j < filters.length; j++) {
        shouldAdd &= filters[j](windowsParam[i]);
      }
      if (shouldAdd) {
        filtered.push(windowsParam[i]);
      }
    }
    return filtered;
  };

  processAllWindowRepositioningRequests = () => {
    if (this.windowsToReposition.length == 0) {
      // this.verifyAllPositions();
      this.finished();
      return;
    }
    const tile = this.windowsToReposition.shift();
    this.windowsToVerify.push(tile);
    this.repositionAndResizeWindow(
      tile,
      this.processAllWindowRepositioningRequests.bind(this)
    );
  };

  /**
   * Utility function to resize a window with the given window ID with the given
   * dimensions, and call the given callback function.
   * @param {Object} tile An object containing all the necessary information to
   *     process the request.
   * @param {Function} callback The callback function to call once the window is
   *     resized.
   */
  repositionAndResizeWindow = (tile, callback) => {
    console.log(
      "Repositioning window " +
        tile.windowId +
        " to " +
        tile.width +
        "x" +
        tile.height +
        " + (" +
        tile.left +
        ", " +
        tile.top +
        ")"
    );
    chrome.windows.update(
      tile.windowId,
      {
        left: tile.left,
        top: tile.top,
        width: tile.width,
        height: tile.height,
        state: "normal",
      },
      callback
    );
  };

  verifyAllPositions = () => {
    var allMatch = true;
    for (let toVerify of this.windowsToVerify) {
      this.verifynewWindowPosition(toVerify);
    }
  };

  verifynewWindowPosition = (tile, callback) => {
    chrome.windows.get(tile.windowId, undefined, function (theWindow) {
      const comparison = WindowTilerUtils.compareAreas(tile, theWindow);
      if (comparison == 0) {
        console.log("Equal:", tile, " and ", theWindow);
      } else {
        console.log("NOT Equal:", tile, " and ", theWindow);
      }
      if (callback) {
        callback();
      }
    });
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
  pushTileIntoTileContext = (left, top, width, height, tileContext) => {
    tileContext.push({
      left: left,
      top: top,
      width: width,
      height: height,
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
  computeTiles = (
    tileContext,
    numWindows,
    zoneX,
    zoneY,
    zoneWidth,
    zoneHeight
  ) => {
    console.log(
      "Computing tiles: " +
        zoneX +
        ", " +
        zoneY +
        ", " +
        zoneWidth +
        ", " +
        zoneHeight +
        " for " +
        numWindows +
        " windows"
    );

    if (!numWindows) {
      return tileContext;
    }

    // Base case: only one window remains, we occupy the whole remaining space.
    if (numWindows == 1) {
      this.pushTileIntoTileContext(
        zoneX,
        zoneY,
        zoneWidth,
        zoneHeight,
        tileContext
      );
      return tileContext;
    }

    var halfNumWindows = Math.floor(numWindows / 2);
    if (zoneWidth > zoneHeight) {
      var halfWidth = Math.floor(zoneWidth / 2);
      tileContext = this.computeTiles(
        tileContext,
        halfNumWindows,
        zoneX,
        zoneY,
        halfWidth,
        zoneHeight
      );
      tileContext = this.computeTiles(
        tileContext,
        numWindows - halfNumWindows,
        zoneX + halfWidth + 1,
        zoneY,
        zoneWidth - halfWidth,
        zoneHeight
      );
    } else {
      var halfHeight = Math.floor(zoneHeight / 2);
      tileContext = this.computeTiles(
        tileContext,
        halfNumWindows,
        zoneX,
        zoneY,
        zoneWidth,
        halfHeight
      );
      tileContext = this.computeTiles(
        tileContext,
        numWindows - halfNumWindows,
        zoneX,
        zoneY + halfHeight + 1,
        zoneWidth,
        zoneHeight - halfHeight
      );
    }
    return tileContext;
  };

  /**
   * Tiles the windows given in an array as an argument over the available area
   * on the screen.
   */
  tileWindows = (theWindows, theScreen) => {
    let tileContext = [];
    console.log("Tiling " + theWindows.length + " windows on screen ");
    console.log(theScreen);
    // TODO: screen.avail* properties do not work well on Linux/GNOME.
    tileContext = this.computeTiles(
      tileContext,
      theWindows.length,
      theScreen.workArea.left,
      theScreen.workArea.top,
      theScreen.workArea.width,
      theScreen.workArea.height
    );
    for (var i = 0, tile; i < tileContext.length; i++) {
      var tileContextWithWindowId = tileContext[i];
      tileContextWithWindowId.windowId = theWindows[i].id;
      this.windowsToReposition.push(tileContextWithWindowId);
    }
    this.processAllWindowRepositioningRequests();
  };
}

export default WindowTiler;
