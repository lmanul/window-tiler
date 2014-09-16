WindowTilerUtils = function() {};

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


WindowTilerUtils.rectangleOverlap = function(topA, leftA, widthA, heightA,
    topB, leftB, widthB, heightB) {
  var xOverlap = Math.max(
    Math.min(leftA + widthA, leftB + widthB) - Math.max(leftA, leftB), 0);
  var yOverlap = Math.max(
    Math.min(topA + heightA, topB + heightB) - Math.max(topA, topB), 0);
  return xOverlap * yOverlap;
};

