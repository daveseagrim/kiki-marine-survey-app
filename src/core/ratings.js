// ============================================================================
// core/ratings.js — Pure functions for rating labels and priorities
// ============================================================================
// This module is loaded both by the main app (via <script> tag in index.html)
// and by the Node.js test runner (via require). Do not add any DOM or
// IndexedDB access here — these functions must work in either environment.
// ============================================================================

const RATING_COLORS = {
  'A - Critical': '#dc2626',
  'B - Needs Attention': '#d97706',
  'C - Serviceable': '#16a34a',
  'Safety Equipment': '#2563eb',
  'Powered up only': '#6b7280',
  'Not applicable': '#6b7280',
  'Not tested/not verified': '#6b7280'
};

const RATING_SHORT_LABELS = {
  'A - Critical': 'A',
  'B - Needs Attention': 'B',
  'C - Serviceable': 'C',
  'Powered up only': 'PO',
  'Not tested/not verified': 'Not Tested',
  'Not applicable': 'NA'
};

// Priority for sorting findings by severity (higher = more severe)
const RATING_PRIORITY = {
  'A - Critical': 3,
  'B - Needs Attention': 2,
  'Not tested/not verified': 1,
  'C - Serviceable': 0,
  'Powered up only': 0,
  'Not applicable': 0
};

/**
 * Returns the short display label for a rating.
 * Full internal keys stay unchanged; only the visible text is shortened.
 *
 * @param {string} rating - Full rating like "A - Critical"
 * @returns {string} - Short label like "A"
 */
function getRatingShortLabel(rating) {
  return RATING_SHORT_LABELS[rating] || rating;
}

/**
 * Returns the colour hex code for a rating, with a neutral grey fallback.
 *
 * @param {string} rating - Full rating string
 * @returns {string} - Colour hex like "#dc2626"
 */
function getRatingColor(rating) {
  return RATING_COLORS[rating] || '#6b7280';
}

/**
 * Returns the severity priority — used for sorting findings by importance.
 * A (3) sorts before B (2) sorts before Not Tested (1) sorts before C (0).
 *
 * @param {string} rating - Full rating string
 * @returns {number} - 0 through 3
 */
function getRatingPriority(rating) {
  return RATING_PRIORITY[rating] ?? 0;
}

/**
 * Returns the single-letter rating code (e.g. "A", "B", "C", "N").
 * Useful for grouping findings in reports.
 *
 * @param {string} rating - Full rating string
 * @returns {string} - Single letter or empty string
 */
function getRatingBaseCode(rating) {
  if (!rating) return '';
  if (rating.startsWith('Not tested')) return 'N';
  return rating.charAt(0);
}

// Export for both browser (window) and Node.js (module.exports)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RATING_COLORS,
    RATING_SHORT_LABELS,
    RATING_PRIORITY,
    getRatingShortLabel,
    getRatingColor,
    getRatingPriority,
    getRatingBaseCode
  };
} else if (typeof window !== 'undefined') {
  // Browser: attach to window so app.js can use them
  window.RATING_COLORS = RATING_COLORS;
  window.RATING_SHORT_LABELS = RATING_SHORT_LABELS;
  window.getRatingShortLabel = getRatingShortLabel;
  window.getRatingColor = getRatingColor;
  window.getRatingPriority = getRatingPriority;
  window.getRatingBaseCode = getRatingBaseCode;
}
