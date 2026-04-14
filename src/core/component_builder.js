// ============================================================================
// core/component_builder.js — Pure composition logic for the component builder
// ============================================================================
// Takes a builder schema and a selections object; returns the composed
// finding text plus the worst rating across selected options.
//
// Schema shape (matches COMPONENT_BUILDERS in app.js):
//   {
//     intro: '' | 'leading sentence',
//     components: [
//       {
//         key: 'areas',
//         multiSelect: true | false,
//         join: 'list' | undefined,          // for multiSelect: how to join
//         prefix: '' | 'Prefix text ',       // for multiSelect + join=list
//         suffix: '' | '.',
//         filterByRating: true | false,      // pure logic just iterates; UI filters
//         options: [
//           { label, rating: 'A'|'B'|'C'|'Not tested'|null,
//             fragment: 'Sentence or noun-phrase.',
//             alwaysInclude: true|false,     // include even if rating === null
//             quantityPrompt, locationOptions, locationMultiSelect, ... }
//         ]
//       }
//     ]
//   }
//
// Selections shape:
//   {
//     <componentKey>: '<optionIndex>' | ['<idx>', '<idx>', ...],
//     <componentKey>_qty: '2',
//     <componentKey>_location: 'port side',
//     _customNotes: 'free text'
//   }
// ============================================================================

(function () {
  'use strict';

  const RATING_PRIORITY = { 'A': 3, 'B': 2, 'NT': 1, 'Not tested': 1, 'C': 0 };
  const RATING_PRIORITY_REVERSE = {
    3: 'A - Critical',
    2: 'B - Needs Attention',
    1: 'Not tested/not verified',
    0: 'C - Serviceable'
  };

  // Join a list of noun-phrase fragments as "A, B, and C"
  function joinAsList(parts) {
    if (!parts || parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + ' and ' + parts[1];
    return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  }

  // Dedupe "Per ABYC X-Y, ..." clauses across joined fragments — keep only
  // the first mention. Matches the same behaviour as the existing inline
  // code in app.js.
  function dedupeAbycClauses(fragments) {
    const mentioned = new Set();
    return fragments.map(frag =>
      (frag || '').replace(/Per (ABYC [A-Z]+-\d+),\s*[^.]+\./g, (match, stdCode) => {
        if (mentioned.has(stdCode)) return '';
        mentioned.add(stdCode);
        return match;
      }).replace(/\s{2,}/g, ' ').trim()
    ).filter(f => f.length > 0);
  }

  // Per-option location text (for multi-select options) is stored at
  //   selections[comp.key + '_locText'] = { '0': 'port side', '3': 'transom' }
  // where the keys are option-index strings matching the ticked checkboxes.
  function fragmentForOption(comp, option, selections, optionIdx) {
    if (!option) return '';
    if (option.rating === null && !option.alwaysInclude) return '';
    let fragment = option.fragment || '';
    if (!fragment) return '';
    if (fragment.includes('{qty}')) {
      const qty = selections[comp.key + '_qty'] || '?';
      fragment = fragment.replace('{qty}', qty);
    }
    // Per-option location text (new in v2156)
    let perOptionLoc = '';
    if (comp.multiSelect && optionIdx !== undefined && selections[comp.key + '_locText']) {
      perOptionLoc = (selections[comp.key + '_locText'][String(optionIdx)] || '').trim();
    }
    if (fragment.includes('{location}')) {
      // Prefer the per-option location; fall back to the legacy
      // component-level location if one isn't provided.
      const loc = perOptionLoc || selections[comp.key + '_location'] || '[LOCATION]';
      fragment = fragment.replace('{location}', loc);
    } else if (perOptionLoc) {
      // Fragment doesn't use {location} but the surveyor specified one —
      // append it as a trailing parenthetical so nothing is lost.
      fragment = fragment.replace(/\.\s*$/, '') + ' (' + perOptionLoc + ').';
    }
    return fragment;
  }

  /**
   * Compose finding text + worst rating from a builder schema and selections.
   *
   * @param {Object} builder - schema (see top of file)
   * @param {Object} selections - current selections (see top of file)
   * @returns {{text: string, rating: string}}
   *          text: composed finding string, with ABYC citations deduped.
   *          rating: full label like "A - Critical" / "C - Serviceable".
   *                  Empty string if no selections contributed a rating.
   */
  function composeFindings(builder, selections) {
    if (!builder || !builder.components) return { text: '', rating: '' };
    selections = selections || {};

    const fragments = [builder.intro || ''];
    let worstRating = 0;
    let anyRating = false;

    for (const comp of builder.components) {
      const sel = selections[comp.key];
      if (sel === undefined || sel === null || sel === '') continue;

      if (comp.multiSelect) {
        const indices = Array.isArray(sel) ? sel : [];
        if (indices.length === 0) continue;
        const pieces = [];
        for (const idxStr of indices) {
          const option = comp.options[parseInt(idxStr, 10)];
          if (!option) continue;
          const frag = fragmentForOption(comp, option, selections, idxStr);
          if (frag) pieces.push(frag);
          if (option.rating && option.rating !== null) {
            anyRating = true;
            const letter = String(option.rating).startsWith('Not') ? 'NT' : String(option.rating).charAt(0);
            const val = RATING_PRIORITY[letter] !== undefined ? RATING_PRIORITY[letter] : (RATING_PRIORITY[option.rating] || 0);
            if (val > worstRating) worstRating = val;
          }
        }
        if (pieces.length === 0) continue;
        let compOutput;
        if (comp.join === 'list') {
          compOutput = joinAsList(pieces);
          if (comp.prefix) compOutput = comp.prefix + compOutput;
          if (comp.suffix) compOutput = compOutput + comp.suffix;
        } else {
          compOutput = pieces.join(' ');
        }
        fragments.push(compOutput);
        continue;
      }

      // Single-select (original path)
      const option = comp.options[parseInt(sel, 10)];
      if (!option) continue;
      if (option.rating === null && !option.alwaysInclude) continue;
      const fragment = fragmentForOption(comp, option, selections);
      if (!fragment) continue;
      fragments.push(fragment);
      if (option.rating && option.rating !== null) {
        anyRating = true;
        const letter = String(option.rating).startsWith('Not') ? 'NT' : String(option.rating).charAt(0);
        const val = RATING_PRIORITY[letter] !== undefined ? RATING_PRIORITY[letter] : 0;
        if (val > worstRating) worstRating = val;
      }
    }

    const deduped = dedupeAbycClauses(fragments);
    const ratingLabel = anyRating ? (RATING_PRIORITY_REVERSE[worstRating] || '') : '';

    return {
      text: deduped.join(' ').trim(),
      rating: ratingLabel
    };
  }

  const API = { composeFindings, joinAsList, RATING_PRIORITY, RATING_PRIORITY_REVERSE };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiComponentBuilder = API;
  }
})();
