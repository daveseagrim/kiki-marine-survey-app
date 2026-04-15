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
    // v2187: drive count (outdrives, shafts, saildrives, IPS pods). Always
    // reflects how many propulsion units the vessel has, regardless of
    // whether it has rudders.
    const driveCount = (typeof ctx.driveCount === 'number' && ctx.driveCount > 0)
      ? ctx.driveCount
      : 1;

    let out = text;

    // Expand {count:singular|plural} first (innermost). Tied to rudder count.
    out = out.replace(/\{count:([^|}]*)\|([^}]*)\}/g, function (_m, singular, plural) {
      return rudderCount >= 2 ? plural : singular;
    });
    // v2187: {drives:singular|plural} picks based on driveCount — used for
    // outdrive / shaft / saildrive / IPS pluralization in report prose.
    out = out.replace(/\{drives:([^|}]*)\|([^}]*)\}/g, function (_m, singular, plural) {
      return driveCount >= 2 ? plural : singular;
    });

    // Expand {if-rudder:...} and {if-no-rudder:...}
    // Match content without nested braces — simple but sufficient for our uses.
    out = out.replace(/\{if-rudder:([^{}]*)\}/g, function (_m, content) {
      return hasRudder ? content : '';
    });
    out = out.replace(/\{if-no-rudder:([^{}]*)\}/g, function (_m, content) {
      return hasRudder ? '' : content;
    });

    // v2165: Scrub UNTOKENIZED rudder mentions when hasRudder is false.
    // The text library has 37+ snippets that mention rudders without being
    // wrapped in {if-rudder:...} (legacy content from before the token
    // system). On outdrive / IPS / saildrive vessels we strip them at
    // expand-time so the surveyor never sees rudder verbiage in their notes
    // or report. This is conservative: it only fires when ctx.hasRudder is
    // explicitly false (sail and shaft-drive power boats are unaffected).
    if (ctx.hasRudder === false) {
      out = scrubNakedRudderRefs(out);
    }

    // Whitespace cleanup — collapse multiple spaces, remove space before
    // punctuation, trim ends.
    out = out.replace(/\s+([,.;:!?])/g, '$1');  // space before punctuation
    out = out.replace(/\(\s+/g, '(');             // space after open paren
    out = out.replace(/\s+\)/g, ')');             // space before close paren
    out = out.replace(/\s{2,}/g, ' ').trim();

    return out;
  }

  /**
   * Strip naked rudder references from prose for no-rudder vessels.
   * Conservative pattern set:
   *   1. Drop any sentence whose subject is rudder ("The rudder was…",
   *      "Rudder(s) condition…", "Rudders showed…").
   *   2. Strip inline "and rudder(s)" / "and the rudder" / "and rudders".
   *   3. Strip leading "rudder(s) and " before another noun.
   *   4. Drop dangling {specify:rudder|rudders} tokens (these become empty
   *      in the chip-strip builder for no-rudder vessels anyway).
   *
   * Leaves verb agreement alone — "the hull and rudder were inspected"
   * becomes "the hull were inspected" which is awkward but readable, and
   * fixing English subject/verb agreement programmatically is fragile.
   * Surveyor can hand-edit if needed.
   */
  function scrubNakedRudderRefs(text) {
    if (!text) return text;
    let t = text;

    // 1. Sentence-level: drop any sentence whose subject IS rudder.
    //    Detection covers naked "Rudder(s)" / "The rudder" forms AND
    //    sentences that start with the {specify:rudder|rudders} token,
    //    because those are also rudder-subject sentences.
    //    Split on sentence terminators while keeping them attached.
    const RUDDER_SUBJECT = /^\s*(?:The\s+|These\s+|That\s+|Both\s+)?(?:\{specify:rudders?(?:\(\s*s\s*\))?\|rudders?(?:\(\s*s\s*\))?\}|[Rr]udders?(?:\(s\))?\b)/;
    const SENT_RE = /([^.!?]+[.!?]+)(\s*)/g;
    const kept = [];
    let m, lastIdx = 0;
    let sawAnySentence = false;
    while ((m = SENT_RE.exec(t)) !== null) {
      sawAnySentence = true;
      const sentence = m[1];
      const trail = m[2] || '';
      if (!RUDDER_SUBJECT.test(sentence)) kept.push(sentence + trail);
      lastIdx = m.index + m[0].length;
    }
    if (sawAnySentence) {
      // Replace t with the kept sentences + any trailing fragment.
      // If everything was dropped, t legitimately becomes empty.
      t = kept.join('') + t.slice(lastIdx);
    }

    // 2. Drop any leftover {specify:rudder|rudders} tokens (e.g. mid-sentence)
    t = t.replace(/\{specify:rudders?(?:\(\s*s\s*\))?\|rudders?(?:\(\s*s\s*\))?\}/gi, '');

    // 3. Special-case verb-agreement fix BEFORE the generic strip:
    //    "the hull and rudder(s) were/are" → "the hull was/is"
    //    so we don't end up with "The hull were percussion tested."
    t = t.replace(/\b(the\s+)?hull\s+and\s+rudders?(?:\(s\))?\s+(were|are)\b/gi, function (_m, the, verb) {
      const tense = verb.toLowerCase() === 'were' ? 'was' : 'is';
      return `${the || ''}hull ${tense}`;
    });

    // 4. Inline: strip "and rudder(s)" / "and the rudder" / "and rudders"
    //    (covers "hull and rudder was tested" → "hull was tested" too)
    t = t.replace(/\s+and\s+(?:the\s+)?rudders?(?:\(s\))?\b/gi, '');

    // 5. Strip leading "rudder(s) and " before another noun
    t = t.replace(/\b(?:the\s+)?rudders?(?:\(s\))?\s+and\s+/gi, '');

    return t;
  }

  /**
   * Convenience: returns the render context for a survey.
   * @param {Object} survey - the survey object
   * @returns {{hasRudder: boolean, rudderCount: number}}
   */
  function contextFromSurvey(survey) {
    if (!survey) return { hasRudder: false, rudderCount: 0 };
    // v2166: derive hasRudder from driveType when the explicit hasRudder
    // field hasn't been saved. SafetyCulture imports and older surveys
    // never saved hasRudder; relying on `!== false` defaulted them to
    // hasRudder=true even on outdrive/IPS, which leaked rudder text into
    // the cards. Now: outdrive/IPS/saildrive always means no rudder
    // regardless of the saved field. Shaft drive defaults to having a
    // rudder. Sailboats always have a rudder.
    const noRudderDrives = new Set(['outdrive', 'ips', 'saildrive']);
    const drive = (survey.driveType || '').toLowerCase();
    let hasRudder;
    if (typeof survey.hasRudder === 'boolean') {
      hasRudder = survey.hasRudder; // explicit setting wins
    } else if (drive && noRudderDrives.has(drive)) {
      hasRudder = false;
    } else {
      hasRudder = true; // sailboat / shaft / unknown → assume rudder
    }
    const driveCount = survey.driveLineCount || 1;
    const rudderCount = hasRudder ? driveCount : 0;
    return { hasRudder, rudderCount, driveCount };
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

    // v2165: "Hydraulic steering (... rudder post and stuffing box ...)"
    // For no-rudder vessels (outdrive / IPS) the parenthetical mentions
    // components that don't exist. Truncate to just "Hydraulic steering"
    // — outdrive hydraulic steering exists (cylinder pushes the drive),
    // but it has no rudder post / tiller arm.
    if (!hasRudder && /^Hydraulic steering\s*\(/.test(label) && /rudder/i.test(label)) {
      return 'Hydraulic steering';
    }

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
