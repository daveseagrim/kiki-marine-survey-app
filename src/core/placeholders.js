// ============================================================================
// core/placeholders.js — Detect and count [BRACKETED] placeholders in text
// ============================================================================
// Placeholders are the all-caps bracketed tokens left in auto-generated text
// for Dave to fill in manually (e.g. "[COLOUR]", "[PORT/STARBOARD]",
// "[NUMBER]"). This module is the single source of truth for what counts as
// a placeholder — used by the description textarea counter, the report
// highlighting, and the Check function.
// ============================================================================

// Matches [WORD], [WORD/WORD], [X'X"], [NUMBER &, etc]. Deliberately
// restrictive: only ALL-CAPS first char, so we don't catch normal brackets
// like "[quoted speaker]" in a survey note.
const PLACEHOLDER_PATTERN = /\[[A-Z][A-Z\/\s'"\d&,.\-]*\]/g;

/**
 * Returns an array of every placeholder found in the text.
 *
 * @param {string} text - Any string (can be null/undefined)
 * @returns {string[]} - Array of matches, e.g. ["[COLOUR]", "[NUMBER]"]
 */
function findPlaceholders(text) {
  if (!text || typeof text !== 'string') return [];
  return text.match(PLACEHOLDER_PATTERN) || [];
}

/**
 * Returns the count of placeholders in the text.
 *
 * @param {string} text - Any string
 * @returns {number}
 */
function countPlaceholders(text) {
  return findPlaceholders(text).length;
}

/**
 * Returns true if the text contains any placeholders.
 *
 * @param {string} text - Any string
 * @returns {boolean}
 */
function hasPlaceholders(text) {
  return countPlaceholders(text) > 0;
}

/**
 * Wraps every placeholder in yellow-highlight HTML for report rendering.
 * Assumes the input has already been HTML-escaped (so `&amp;` etc. are
 * in the text, not raw ampersands).
 *
 * @param {string} escapedHtml - HTML-escaped text
 * @returns {string} - HTML with <span> tags around each placeholder
 */
function highlightPlaceholdersHtml(escapedHtml) {
  if (!escapedHtml) return '';
  // Pattern needs to match &amp; since ampersands are escaped in input
  const htmlPattern = /\[([A-Z][A-Z\/\s'"\d&amp;,.\-]*)\]/g;
  return escapedHtml.replace(
    htmlPattern,
    '<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;font-weight:600;">[$1]</span>'
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PLACEHOLDER_PATTERN,
    findPlaceholders,
    countPlaceholders,
    hasPlaceholders,
    highlightPlaceholdersHtml
  };
} else if (typeof window !== 'undefined') {
  window.findPlaceholders = findPlaceholders;
  window.countPlaceholders = countPlaceholders;
  window.hasPlaceholders = hasPlaceholders;
  window.highlightPlaceholdersHtml = highlightPlaceholdersHtml;
}
