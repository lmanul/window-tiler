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



