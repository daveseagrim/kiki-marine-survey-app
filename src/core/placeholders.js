// ============================================================================
// core/placeholders.js — Detect and count [BRACKETED] placeholders in text
// ============================================================================
// Wrapped in an IIFE to prevent name collisions with app.js.
// Public API exposed on window.KikiPlaceholders (browser) or module.exports.
// ============================================================================

(function () {
  'use strict';

  const PLACEHOLDER_PATTERN = /\[[A-Z][A-Z\/\s'"\d&,.\-]*\]/g;

  function findPlaceholders(text) {
    if (!text || typeof text !== 'string') return [];
    return text.match(PLACEHOLDER_PATTERN) || [];
  }

  function countPlaceholders(text) {
    return findPlaceholders(text).length;
  }

  function hasPlaceholders(text) {
    return countPlaceholders(text) > 0;
  }

  function highlightPlaceholdersHtml(escapedHtml) {
    if (!escapedHtml) return '';
    const htmlPattern = /\[([A-Z][A-Z\/\s'"\d&amp;,.\-]*)\]/g;
    return escapedHtml.replace(
      htmlPattern,
      '<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;font-weight:600;">[$1]</span>'
    );
  }

  const API = {
    PLACEHOLDER_PATTERN,
    findPlaceholders,
    countPlaceholders,
    hasPlaceholders,
    highlightPlaceholdersHtml
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiPlaceholders = API;
  }
})();
