import Rect from './rect.js';
import WindowTilerUtils from "./util.js";

class WindowTiler {
  constructor() {
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
    const windowsInfo = await chrome.windows.getAll({ populate: false });
    this.onReceivedWindowsData(windowsInfo, screens);
  };

  findWindowsOnThisScreen = (theWindows, theScreen, allScreens) => {
    const windowsOnSelectedScreen = [];

    for (var eachWindow, i = 0; (eachWindow = theWindows[i]); i++) {
      let maxOverlap = 0;
      let screenWithMaxOverlap;
      for (let eachScreen of allScreens) {
        let overlap = WindowTilerUtils.rectangleOverlap(
          new Rect(eachWindow.top, eachWindow.left, eachWindow.width, eachWindow.height),
          new Rect(eachScreen.bounds.top, eachScreen.bounds.left, eachScreen.bounds.width, eachScreen.bounds.height)
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
  onReceivedWindowsData = (windowsParam, screens) => {
    const filters = [];
    filters.push(this.windowIsNonMinimized);
    const filteredWindows = this.filterWindows(windowsParam, filters);

    var mainScreen;
    for (var i = 0, eachScreen; (eachScreen = screens[i]); i++) {
      if (eachScreen.isPrimary) {
        mainScreen = eachScreen;
        break;
      }
    }

    if (!mainScreen) {
      alert("I cannot find the main screen! I'm going to stop here, sorry.");
      return;
    }

    for (var i = 0, eachScreen; (eachScreen = screens[i]); i++) {
      const windowsForThisScreen = this.findWindowsOnThisScreen(
        filteredWindows,
        eachScreen,
        screens
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

  processAllWindowRepositioningRequests = async (windowsToReposition) => {
    if (windowsToReposition.length == 0) {
      await this.verifyAllPositions();
      this.finished();
      return;
    }
    while (windowsToReposition.length > 0) {
      const tile = windowsToReposition.shift();
      this.windowsToVerify.push(tile);
      await this.repositionAndResizeWindow(tile);
    }
  };

  /**
   * Utility function to resize a window with the given window ID with the given
   * dimensions, and call the given callback function.
   * @param {Object} tile An object containing all the necessary information to
   *     process the request.
   */
  repositionAndResizeWindow = async (tile) => {
    console.log(
      `Repositioning window ${tile.windowId} `,
      `to ${tile.width}x${tile.height} (${tile.x}, ${tile.y})`
    );
    await chrome.windows.update(tile.windowId, {
      left: tile.x,
      top: tile.y,
      width: tile.width,
      height: tile.height,
      state: "normal",
    });
  };

  verifyAllPositions = async () => {
    var allMatch = true;
    for (let toVerify of this.windowsToVerify) {
      await this.verifyNewWindowPosition(toVerify);
    }
  };

  verifyNewWindowPosition = async (tile) => {
    const theWindow = await chrome.windows.get(tile.windowId);
    const comparison = WindowTilerUtils.compareAreas(tile, theWindow);
    if (comparison == 0) {
      console.log("Equal:", tile, " and ", theWindow);
    } else {
      console.log("NOT Equal:", tile, " and ", theWindow);
    }
  };

  /**
   * Computes the relevant tiles and pushes them into the given tile context, for
   * a zone on the screen defined by the arguments, and for the given number of
   * windows to tile.
   * @param {Array.<Object>} tileContext The tile context to which to add computed
   *     tiles.
   * @param {number} numWindows The number of windows left to tile.
   * @param {Rect} zoneRect The rectangle of the zone remaining to tile.
   */
  computeTiles = (tileContext, numWindows, zoneRect) => {
    console.log(`Computing tiles: ${zoneRect.toString()} for ${numWindows} windows`);

    if (!numWindows) {
      return tileContext;
    }

    // Base case: only one window remains, we occupy the whole remaining space.
    if (numWindows == 1) {
      tileContext.push(zoneRect)
      return tileContext;
    }

    const halfNumWindows = Math.floor(numWindows / 2);
    if (zoneRect.width > zoneRect.height) {
      const halfWidth = Math.floor(zoneRect.width / 2);
      tileContext = this.computeTiles(
        tileContext,
        halfNumWindows,
        new Rect(zoneRect.x, zoneRect.y, halfWidth, zoneRect.height)
      );
      tileContext = this.computeTiles(
        tileContext,
        numWindows - halfNumWindows,
        new Rect(zoneRect.x + halfWidth + 1, zoneRect.y, zoneRect.width - halfWidth, zoneRect.height)
      );
    } else {
      const halfHeight = Math.floor(zoneRect.height / 2);
      tileContext = this.computeTiles(
        tileContext,
        halfNumWindows,
        new Rect(zoneRect.x, zoneRect.y, zoneRect.width, halfHeight)
      );
      tileContext = this.computeTiles(
        tileContext,
        numWindows - halfNumWindows,
        new Rect(zoneRect.x, zoneRect.y + halfHeight + 1, zoneRect.width, zoneRect.height - halfHeight)
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
    const windowsToReposition = [];
    if (theWindows.length === 0) {
      console.log('No windows on screen', theScreen);
      return;
    }
    console.log('Tiling ' + theWindows.length + ' windows on screen', theScreen);
    // TODO: screen.avail* properties do not work well on Linux/GNOME.
    tileContext = this.computeTiles(
      tileContext,
      theWindows.length,
      new Rect(theScreen.workArea.left, theScreen.workArea.top, theScreen.workArea.width, theScreen.workArea.height)
    );
    for (let i = 0; i < tileContext.length; i++) {
      const tileContextWithWindowId = tileContext[i];
      tileContextWithWindowId.windowId = theWindows[i].id;
      windowsToReposition.push(tileContextWithWindowId);
    }
    this.processAllWindowRepositioningRequests(windowsToReposition);
  };
}

export default WindowTiler;
