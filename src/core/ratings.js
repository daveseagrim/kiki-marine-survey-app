// ============================================================================
// core/ratings.js — Pure functions for rating labels and priorities
// ============================================================================
// Loaded both by the main app (via <script> tag) and by Node.js tests.
// Wrapped in an IIFE so top-level const/function declarations do NOT collide
// with identical names in app.js. Public API is exposed on window (browser)
// or module.exports (Node).
// ============================================================================

(function () {
  'use strict';

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

  const RATING_PRIORITY = {
    'A - Critical': 3,
    'B - Needs Attention': 2,
    'Not tested/not verified': 1,
    'C - Serviceable': 0,
    'Powered up only': 0,
    'Not applicable': 0
  };

  function getRatingShortLabel(rating) {
    return RATING_SHORT_LABELS[rating] || rating;
  }

  function getRatingColor(rating) {
    return RATING_COLORS[rating] || '#6b7280';
  }

  function getRatingPriority(rating) {
    const v = RATING_PRIORITY[rating];
    return v === undefined ? 0 : v;
  }

  function getRatingBaseCode(rating) {
    if (!rating) return '';
    if (rating.startsWith('Not tested')) return 'N';
    return rating.charAt(0);
  }

  const API = {
    RATING_COLORS,
    RATING_SHORT_LABELS,
    RATING_PRIORITY,
    getRatingShortLabel,
    getRatingColor,
    getRatingPriority,
    getRatingBaseCode
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    // Expose under a namespace so app.js can opt into the new API gradually.
    // Do NOT overwrite app.js's existing top-level const declarations.
    window.KikiRatings = API;
  }
})();
