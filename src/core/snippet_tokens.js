// ============================================================================
// core/snippet_tokens.js — Expand hasRudder/count tokens in snippet text and
// checklist-item labels.
// ============================================================================
// Why this exists (B-07): hull-and-rudder snippets need to omit all mention
// of rudder(s) on vessels that don't have one (outdrive, IPS). Rather than
// maintaining two parallel copies of each snippet, we annotate the text with
// tokens and expand them based on the survey's rudder state.
//
// Supported tokens (all case-sensitive, all inside curly braces):
//
//   {if-rudder:CONTENT}
//     CONTENT is included only when hasRudder is true. Dropped entirely
//     (including any surrounding whitespace on either side collapsed to
//     a single space) when hasRudder is false.
//     Example:
//       "The hull{if-rudder: and {count:rudder|rudders}} was percussion tested."
//       hasRudder=true,  rudderCount=2 → "The hull and rudders was percussion tested."
//       hasRudder=false              → "The hull was percussion tested."
//
//   {count:singular|plural}
//     Picks singular when rudderCount === 1, plural when >= 2.
//     Only makes sense inside an {if-rudder:...} block (otherwise it
//     emits the singular form by default).
//
//   {if-no-rudder:CONTENT}
//     Inverse — included only when hasRudder is false.
//
// Nested tokens are supported (one level). Whitespace cleanup runs after
// all replacements to collapse double spaces and strip space before
// punctuation.
// ============================================================================

(function () {
  'use strict';

  /**
   * Expand all tokens in text. Returns the cleaned output string.
   *
   * @param {string} text - Input text that may contain tokens.
   * @param {Object} ctx - { hasRudder, rudderCount } — render context.
   *                       rudderCount defaults to 1 if hasRudder is true.
   * @returns {string}
   */
  function expandTokens(text, ctx) {
    if (!text || typeof text !== 'string') return text || '';
    ctx = ctx || {};
    const hasRudder = !!ctx.hasRudder;
    const rudderCount = (typeof ctx.rudderCount === 'number' && ctx.rudderCount > 0)
      ? ctx.rudderCount
      : (hasRudder ? 1 : 0);

    let out = text;

    // Expand {count:singular|plural} first (innermost). May appear outside
    // {if-rudder:...} — treat as rudder count regardless.
    out = out.replace(/\{count:([^|}]*)\|([^}]*)\}/g, function (_m, singular, plural) {
      return rudderCount >= 2 ? plural : singular;
    });

    // Expand {if-rudder:...} and {if-no-rudder:...}
    // Match content without nested braces — simple but sufficient for our uses.
    out = out.replace(/\{if-rudder:([^{}]*)\}/g, function (_m, content) {
      return hasRudder ? content : '';
    });
    out = out.replace(/\{if-no-rudder:([^{}]*)\}/g, function (_m, content) {
      return hasRudder ? '' : content;
    });

    // Whitespace cleanup — collapse multiple spaces, remove space before
    // punctuation, trim ends.
    out = out.replace(/\s+([,.;:!?])/g, '$1');  // space before punctuation
    out = out.replace(/\(\s+/g, '(');             // space after open paren
    out = out.replace(/\s+\)/g, ')');             // space before close paren
    out = out.replace(/\s{2,}/g, ' ').trim();

    return out;
  }

  /**
   * Convenience: returns the render context for a survey.
   * @param {Object} survey - the survey object
   * @returns {{hasRudder: boolean, rudderCount: number}}
   */
  function contextFromSurvey(survey) {
    if (!survey) return { hasRudder: false, rudderCount: 0 };
    const hasRudder = survey.hasRudder !== false; // default true
    const driveCount = survey.driveLineCount || 1;
    const rudderCount = hasRudder ? driveCount : 0;
    return { hasRudder, rudderCount };
  }

  /**
   * Transform a checklist item label for display based on rudder context.
   * Targets the legacy "and rudder(s) (if applicable)" pattern that appears
   * in items like "Hull and rudder(s) (if applicable) impact and resonance
   * testing". Returns a cleaned-up version appropriate for the current survey.
   *
   * Internal keys (survey.items[label]) continue to use the raw label — this
   * function is for DISPLAY only (UI labels, report section headings, etc.).
   *
   * @param {string} label - The raw item label from the survey template
   * @param {Object} ctx - { hasRudder, rudderCount }
   * @returns {string}
   */
  function transformLabelForDisplay(label, ctx) {
    if (!label || typeof label !== 'string') return label || '';
    ctx = ctx || {};
    const hasRudder = !!ctx.hasRudder;
    const rudderCount = typeof ctx.rudderCount === 'number' ? ctx.rudderCount : (hasRudder ? 1 : 0);

    // Pattern: " and rudder(s) (if applicable)" with any casing on "and"
    const pattern = /\s+and\s+rudder\(s\)\s+\(if applicable\)\s+/i;
    if (!pattern.test(label)) return label;

    if (!hasRudder) {
      // Drop the rudder clause entirely; keep single space.
      return label.replace(pattern, ' ').replace(/\s{2,}/g, ' ').trim();
    }
    const word = rudderCount >= 2 ? 'rudders' : 'rudder';
    return label.replace(pattern, ` and ${word} `).replace(/\s{2,}/g, ' ').trim();
  }

  const API = { expandTokens, contextFromSurvey, transformLabelForDisplay };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiSnippetTokens = API;
    // Also expose individual functions for easier use in app.js
    window.expandSnippetTokens = expandTokens;
    window.transformLabelForDisplay = transformLabelForDisplay;
  }
})();
