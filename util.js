const WindowTilerUtils = function() {};

/**
 * Utility function to compare 2-dimensionnal areas.
 * @param {Object} a The first area.
 * @param {Object} b The first area.
 */
WindowTilerUtils.compareAreas = function(a, b) {
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


WindowTilerUtils.rectangleOverlap = function(rectA, rectB) {
  var xOverlap = Math.max(
    Math.min(rectA.x + rectA.width, rectB.x + rectB.width) - Math.max(rectA.x, rectB.x), 0);
  var yOverlap = Math.max(
    Math.min(rectA.y + rectA.height, rectB.y + rectB.height) - Math.max(rectA.y, rectB.y), 0);
  return xOverlap * yOverlap;
};

export default WindowTilerUtils;