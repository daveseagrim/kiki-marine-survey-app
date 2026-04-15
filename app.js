/**
 * Kiki Marine Survey App - Complete Implementation
 * All data persisted to IndexedDB
 * Service worker for offline support
 * Photo storage and annotation capabilities
 */

const APP_VERSION = 'v2222';

// Global error handlers — catch crashes on iOS and show a message instead of silently dying
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message);
  try { showToast('Error: ' + (e.message || 'Unknown error').substring(0, 100)); } catch(_) {}
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  try { showToast('Error: ' + String(e.reason).substring(0, 100)); } catch(_) {}
});
let db = null;
let textLibrary = null;
// Spell-check dictionary — lazy-loaded from dictionary.json on first use.
// ~128k English words + marine/Canadian supplement. Loaded once, cached by
// the service worker for offline field use.
let SPELL_DICT = null;
let SPELL_DICT_LOADING = false;
function loadSpellDict() {
  if (SPELL_DICT || SPELL_DICT_LOADING) return;
  SPELL_DICT_LOADING = true;
  fetch('dictionary.json')
    .then(r => r.json())
    .then(arr => {
      SPELL_DICT = new Set(arr);
      // v2176: supplement the base dictionary with marine-surveyor vocabulary
      // that general English dictionaries often miss. These are real words
      // that were being flagged as typos in inspection notes.
      const MARINE_EXTRAS = [
        'recoat', 'recoated', 'recoating', 'recoats',
        'anti-fouling', 'antifouling', 'antifouled',
        'gelcoat', 'gelcoats', 'gelcoated',
        'fibreglass', 'fibreglasses',
        'delamination', 'delaminated', 'delaminating',
        'osmotic', 'osmosis',
        'blistering', 'blister', 'blisters', 'blistered',
        'fairing', 'faired', 'fairs',
        'stanchion', 'stanchions',
        'pulpit', 'pulpits',
        'pushpit', 'pushpits',
        'saildrive', 'saildrives', 'outdrive', 'outdrives',
        'sterndrive', 'sterndrives',
        'cutlass', 'cutlasses',
        'seacock', 'seacocks',
        'skeg', 'skegs',
        'transom', 'transoms',
        'chainplate', 'chainplates',
        'coachroof', 'coachroofs',
        'chartplotter', 'chartplotters',
        'autohelm', 'autopilot', 'autopilots',
        'binnacle', 'binnacles',
        'bimini', 'biminis',
        'pontoon', 'pontoons',
        'coaming', 'coamings',
        'bulkhead', 'bulkheads',
        'bowsprit', 'bowsprits',
        'cleat', 'cleats',
        'windlass', 'windlasses',
        'genoa', 'genoas',
        'spinnaker', 'spinnakers',
        'halyard', 'halyards',
        'traveller', 'travellers',
        'lazarette', 'lazarettes',
        'knot', 'knots',
        'kts',
        'abyc', 'solas', 'nmma', 'tp1332',
        'sams',
        'heeled', 'heeling',
        'tacking', 'tack',
        'relaunch', 'relaunched', 'relaunching', 'relaunches',
        'touched-up', 'touched',
      ];
      MARINE_EXTRAS.forEach(w => SPELL_DICT.add(w.toLowerCase()));
      SPELL_DICT_LOADING = false;
      // Re-run tone check on any currently-open sheet textarea so the new
      // dictionary catches words already typed.
      try {
        document.querySelectorAll('textarea[id^="sheet-text-"]').forEach(ta => {
          if (window._mainSheetToneCheck) window._mainSheetToneCheck(ta);
        });
        document.querySelectorAll('[data-snippet-builder-strip]').forEach(strip => {
          if (typeof updateToneWarning === 'function') updateToneWarning(strip);
        });
      } catch (e) { /* no-op */ }
    })
    .catch(err => {
      console.warn('Spell dictionary failed to load:', err);
      SPELL_DICT_LOADING = false;
    });
}
let surveyTemplate = null;
let insuranceSurveyTemplate = null;
let boatSpecsDB = null;
let boatValuesDB = null;
let engineDb = null;
let outdriveDb = null;
let winchDb = null;
let currentSurveyId = null;
let currentView = 'surveys';

// Persist view state to sessionStorage so reload returns to the same screen
function persistViewState() {
  try {
    sessionStorage.setItem('_currentView', currentView);
    if (currentSurveyId) sessionStorage.setItem('_currentSurveyId', currentSurveyId);
    else sessionStorage.removeItem('_currentSurveyId');
  } catch(e) {}
}

// Force update — check for new SW, activate it, let controllerchange reload.
// Single tap, no double-reload needed.
async function forceAppUpdate() {
  try {
    showToast('Checking for updates…');

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();            // fetch sw.js from server
        if (reg.waiting) {
          // New version already downloaded — activate it now
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // controllerchange listener will reload the page
          return;
        }
        if (reg.installing) {
          // Update is downloading — wait for it to finish
          showToast('Downloading update…');
          reg.installing.addEventListener('statechange', function handler() {
            if (reg.installing && reg.installing.state === 'installed') {
              reg.installing.removeEventListener('statechange', handler);
              reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
          return;
        }
      }
    }

    // Fallback: no SW or nothing new — clear caches and hard reload
    if ('caches' in window) {
      const names = await caches.keys();
      for (const n of names) await caches.delete(n);
    }
    showToast('Reloading…');
    persistViewState();
    await new Promise(r => setTimeout(r, 300));
    window.location.replace(
      window.location.origin + window.location.pathname + '?_cb=' + Date.now()
    );
  } catch (err) {
    console.error('Force update error:', err);
    persistViewState();
    window.location.replace(
      window.location.origin + window.location.pathname + '?_cb=' + Date.now()
    );
  }
}

// ── Photo compression for reports ──────────────────────────────────────
// Resizes a dataUrl image to fit within maxDim (default 1200px) and
// re-encodes as JPEG at the given quality. This dramatically reduces
// memory when embedding photos in report HTML (iPhone photos can be
// 5-8 MB each as base64; after compression they're ~100-300 KB).
function compressPhotoForReport(dataUrl, maxDim = 1200, quality = 0.7) {
  return new Promise((resolve) => {
    // If it's not a valid data URL, return as-is
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      // Only resize if larger than maxDim
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round(h * maxDim / w);
          w = maxDim;
        } else {
          w = Math.round(w * maxDim / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original on error
    img.src = dataUrl;
  });
}

// Camera active flag — persisted to sessionStorage so it survives
// iOS Chrome tab suspension when the camera app is open.
function setCameraActive(val) {
  window._cameraActive = val;
  if (val) {
    try {
      sessionStorage.setItem('_cameraActive', '1');
      if (currentSurveyId) {
        sessionStorage.setItem('_cameraSurveyId', currentSurveyId);
      }
    } catch (e) { /* sessionStorage may not be available in some contexts */ }
  } else {
    try {
      sessionStorage.removeItem('_cameraActive');
    } catch (e) {}
  }
}

// Capitalize each word in a string (for name fields)
function capitalizeWords(str) {
  if (!str) return str;
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Extract short location name (marina/yard + city) from full address
function shortLocation(fullLocation) {
  if (!fullLocation) return '';
  // Split by commas
  const parts = fullLocation.split(',').map(p => p.trim());
  if (parts.length <= 2) return fullLocation;

  // Look for marina/yacht club/yard/harbour keywords in first parts
  const venueKeywords = /marina|yacht|club|harbour|harbor|boat|yard|wharf|dock|pier|bay|port|landing|shipyard/i;
  let venue = '';
  let city = '';

  for (let i = 0; i < parts.length; i++) {
    if (!venue && venueKeywords.test(parts[i])) {
      venue = parts[i];
    }
    // City is typically the 2nd or 3rd part (after venue/street)
    if (!city && i > 0 && i < parts.length - 1 && !/^\d/.test(parts[i]) && !parts[i].match(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i) && parts[i].length > 2) {
      // Skip postal codes and province abbreviations
      if (!parts[i].match(/^(ON|BC|AB|SK|MB|QC|NB|NS|PE|NL|NT|NU|YT|Canada)$/i)) {
        city = parts[i];
      }
    }
  }

  if (venue && city && venue !== city) return `${venue}, ${city}`;
  if (venue) return venue;
  // No venue found — use street address + city
  if (parts.length >= 2) {
    const street = parts[0];
    // Find the city (skip postal codes, provinces, country)
    for (let i = 1; i < parts.length; i++) {
      if (!parts[i].match(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i) && !parts[i].match(/^(ON|BC|AB|SK|MB|QC|NB|NS|PE|NL|NT|NU|YT|Canada)$/i) && parts[i].length > 2) {
        return `${street}, ${parts[i]}`;
      }
    }
    return `${street}, ${parts[1]}`;
  }
  return fullLocation;
}

// Color mapping for ratings
const RATING_COLORS = {
  'A - Critical': '#dc2626',
  'B - Needs Attention': '#d97706',
  'C - Serviceable': '#16a34a',
  'Safety Equipment': '#2563eb',
  'Powered up only': '#6b7280',
  'Not applicable': '#6b7280',
  'Not tested/not verified': '#6b7280'
};

// Short display labels for rating buttons (keeps full internal key unchanged)
const RATING_SHORT_LABELS = {
  'A - Critical': 'A',
  'B - Needs Attention': 'B',
  'C - Serviceable': 'C',
  'Powered up only': 'PO',
  'Not tested/not verified': 'Not Tested',
  'Not applicable': 'NA'
};

function getRatingShortLabel(rating) {
  return RATING_SHORT_LABELS[rating] || rating;
}

// Transform a raw checklist-item label into its display form for the current
// survey — applies rudder-gating so "Hull and rudder(s) (if applicable) X"
// becomes "Hull X" on no-rudder vessels, "Hull and rudder X" on single-rudder,
// and "Hull and rudders X" on twin-rudder. Internal keys (survey.items map)
// continue to use the raw label — this is for DISPLAY only.
// The survey arg is optional; defaults to the window-cached current survey.
function displayItemLabel(rawLabel, survey) {
  if (!rawLabel) return '';
  const s = survey || window._currentSurveyCache || null;
  if (!s || typeof window.transformLabelForDisplay !== 'function') return rawLabel;
  const ctx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
    ? window.KikiSnippetTokens.contextFromSurvey(s)
    : { hasRudder: s.hasRudder !== false, rudderCount: s.driveLineCount || 1 };
  return window.transformLabelForDisplay(rawLabel, ctx);
}

// Standards by category — covers all 24 inspection categories
// Matching uses longest-key-wins partial matching (see getStandardsForCategory)
const STANDARDS_BY_CATEGORY = {
  'Vessel documentation': [
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'TP1332 - Construction Standards for Small Vessels',
    'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
    'Transport Canada Marine Safety TP 2072'
  ],
  'Hull exterior': [
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'ABYC H-22 - DC Electric Bilge Pumps',
    'ABYC TH-27 - Seacocks/Through-Hull Fittings',
    'ABYC P-1 - Installation of Exhaust Systems',
    'ABYC P-4 - Inboard Engines',
    'ABYC E-2 - Cathodic Protection',
    'ABYC E-13 - Cathodic Protection'
  ],
  'Spars and rigging': [
    'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
    'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
    'ABYC TE-4 - Lightning Protection',
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)'
  ],
  'Deck and coachroof': [
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'ABYC TE-4 - Lightning Protection',
    'ABYC TH-27 - Seacocks/Through-Hull Fittings',
    'ABYC A-16 - Electrical Navigation Lights'
  ],
  'Aft deck': [
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'ABYC A-31 - Cockpit Design',
    'ABYC TH-27 - Seacocks/Through-Hull Fittings'
  ],
  'Outboard': [
    'ABYC P-6 - Outboard Engines',
    'ABYC H-24 - Gasoline Fuel Systems',
    'ABYC H-25 - Portable Fuel Systems',
    'ABYC H-2 - Ventilation of Boats Using Gasoline',
    'ABYC H-41 - Vapor Detection Systems',
    'TP1332 - Construction Standards for Small Vessels',
    'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)'
  ],
  'Cockpit gauges': [
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'ABYC A-16 - Electrical Navigation Lights',
    'ABYC E-13 - Cathodic Protection',
    'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'TP1332 - Construction Standards for Small Vessels'
  ],
  'Cockpit': [
    'ABYC A-31 - Cockpit Design',
    'ABYC H-41 - Vapor Detection Systems',
    'ABYC TH-27 - Seacocks/Through-Hull Fittings',
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)'
  ],
  'Flybridge gauges': [
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'ABYC A-16 - Electrical Navigation Lights',
    'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'TP1332 - Construction Standards for Small Vessels'
  ],
  'Flybridge': [
    'ABYC A-31 - Cockpit Design',
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'ABYC TH-27 - Seacocks/Through-Hull Fittings',
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)'
  ],
  'Pilot house gauges': [
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'ABYC A-16 - Electrical Navigation Lights',
    'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'TP1332 - Construction Standards for Small Vessels'
  ],
  'Pilot house': [
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'ABYC A-31 - Cockpit Design',
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)'
  ],
  'Cabin': [
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'ABYC H-27 - Potable Water Systems',
    'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems',
    'ABYC A-22 - Marine Compressed Natural Gas (CNG) Systems',
    'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft'
  ],
  'Head': [
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'ABYC H-27 - Potable Water Systems',
    'ABYC TH-27 - Seacocks/Through-Hull Fittings',
    'Vessel Pollution and Dangerous Chemicals Regulations (SOR/2012-69)'
  ],
  'Fuel': [
    'ABYC H-24 - Gasoline Fuel Systems',
    'ABYC H-33 - Diesel Fuel Systems',
    'ABYC H-27 - Potable Water Systems',
    'ABYC H-41 - Vapor Detection Systems',
    'ABYC H-2 - Ventilation of Boats Using Gasoline',
    'ABYC H-32 - Ventilation of Boats Using Diesel Fuel',
    'TP1332 - Construction Standards for Small Vessels',
    'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Vessel Pollution and Dangerous Chemicals Regulations (SOR/2012-69)'
  ],
  'Engine': [
    'ABYC P-1 - Installation of Exhaust Systems',
    'ABYC P-4 - Inboard Engines',
    'ABYC H-24 - Gasoline Fuel Systems',
    'ABYC H-33 - Diesel Fuel Systems',
    'ABYC H-2 - Ventilation of Boats Using Gasoline',
    'ABYC H-32 - Ventilation of Boats Using Diesel Fuel',
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'TP1332 - Construction Standards for Small Vessels',
    'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)'
  ],
  'Steering': [
    'ABYC P-11 - Steering Systems',
    'ABYC P-14 - Marine Steering Controls',
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)'
  ],
  'Electrical': [
    'ABYC E-11 - AC and DC Electrical Systems on Boats',
    'ABYC E-13 - Cathodic Protection',
    'ABYC A-28 - Galvanic Isolators',
    'ABYC E-2 - Cathodic Protection',
    'ABYC TE-4 - Lightning Protection',
    'ABYC H-22 - DC Electric Bilge Pumps',
    'TP1332 - Construction Standards for Small Vessels',
    'CSA C22.1 - Canadian Electrical Code, Part I',
    'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)'
  ],
  'Safety': [
    'TP1332 - Construction Standards for Small Vessels',
    'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'ABYC A-16 - Electrical Navigation Lights',
    'ABYC TE-4 - Lightning Protection',
    'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft',
    'Transport Canada Marine Safety TP 2072',
    'Collision Regulations (COR/SOR/83-252)'
  ],
  'Sails': [
    'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
    'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
    'TP1332 - Construction Standards for Small Vessels',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)'
  ],
  'On board equipment': [
    'TP1332 - Construction Standards for Small Vessels',
    'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
    'Canada Shipping Act, 2001 (S.C. 2001, c. 26)',
    'Small Vessel Regulations (SOR/2010-91)',
    'Transport Canada Marine Safety TP 2072',
    'Collision Regulations (COR/SOR/83-252)'
  ]
};

// ── Component Builder Definitions ─────────────────────────────────────────────
// For multi-component items, defines sub-parts and their condition options.
// Each option has: label (shown in dropdown), rating (C/B/A), and fragment (sentence piece).
// The builder assembles fragments into a coherent finding and picks the worst rating.
const COMPONENT_BUILDERS = {};  // v2190: all builders retired — every item uses the chip picker


// Rating priority for component builder: worst rating wins
const RATING_PRIORITY = { 'A': 3, 'B': 2, 'NT': 1, 'C': 0 };
const RATING_PRIORITY_REVERSE = { 3: 'A - Critical', 2: 'B - Needs Attention', 1: 'Not tested/not verified', 0: 'C - Serviceable' };

// Build finding text from component builder selections.
// Delegates to the pure composition function in src/core/component_builder.js
// so logic is testable and single-sourced. The pure module handles:
//   - single-select and multi-select components
//   - join=list with prefix/suffix
//   - {qty}, {location}, and per-option {_locText} substitution
//   - alwaysInclude options
//   - ABYC citation dedup
//   - rating propagation
// If the pure module didn't load for any reason (shouldn't happen in
// production), a minimal inline fallback returns an empty composition.
function buildComponentFindings(builderKey, selections) {
  const builder = COMPONENT_BUILDERS[builderKey];
  if (!builder) return { text: '', rating: '' };
  if (typeof window !== 'undefined' && window.KikiComponentBuilder && window.KikiComponentBuilder.composeFindings) {
    return window.KikiComponentBuilder.composeFindings(builder, selections);
  }
  return { text: '', rating: '' };
}

// Render the component builder HTML for the bottom sheet
function renderComponentBuilder(builderKey, itemLabel, savedSelections, categoryName, itemRating) {
  const builder = COMPONENT_BUILDERS[builderKey];
  if (!builder) return '';

  const safeLabel = itemLabel.replace(/'/g, "\\'");
  const selections = savedSelections || {};
  // For findings-style components that filter by rating, the current rating
  // letter (A/B/C/N for Not-Tested) determines which options are visible.
  // Options with no `rating` field, with `rating === null`, or with
  // `alwaysInclude: true` always render. Options whose rating differs from
  // the current item rating are hidden.
  const baseRatingLetter = itemRating ? (itemRating.startsWith('Not') ? 'N' : itemRating.charAt(0)) : '';

  let html = `
    <div id="component-builder-panel" style="border-bottom:2px solid #006699;margin-bottom:8px;">
      <div style="padding:8px 20px;background:#f0f7ff;border-bottom:1px solid #d1d5db;">
        <div style="font-size:13px;font-weight:700;color:#006699;">🔧 ${builder.title}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">Select the condition of each sub-component. The finding text and rating will be generated automatically.</div>
      </div>
  `;

  for (const comp of builder.components) {
    const selVal = selections[comp.key] !== undefined ? selections[comp.key] : '';
    html += `
      <div style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">
        <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">${comp.name}${comp.multiSelect ? ' <span style="font-weight:400;color:#6b7280;">(tick any that apply)</span>' : ''}</label>
    `;
    if (comp.multiSelect) {
      // Render checkbox group. Saved state: selections[comp.key] is an array
      // of option-index strings. Per-option location text lives at
      // selections[comp.key + '_locText'] = { [idx]: text }.
      const selectedIndices = Array.isArray(selVal) ? selVal.map(String) : [];
      const locTextMap = selections[comp.key + '_locText'] || {};
      // Location inputs are shown only for options that either have a
      // {location} placeholder in their fragment OR are meant to allow a
      // freeform location (comp.allowLocationPerOption).
      const offerLoc = (opt) => comp.allowLocationPerOption ||
        (opt && opt.fragment && opt.fragment.includes('{location}'));
      html += `<div id="cb-${comp.key}_group" style="display:flex;flex-direction:column;gap:4px;">`;
      let renderedCount = 0;
      comp.options.forEach((opt, idx) => {
        // Rating filter: if comp.filterByRating is true and the item has a
        // rating set, only show options matching that rating. Options with
        // alwaysInclude render regardless.
        if (comp.filterByRating && baseRatingLetter && !opt.alwaysInclude) {
          const optLetter = opt.rating ? (String(opt.rating).startsWith('Not') ? 'N' : String(opt.rating).charAt(0)) : '';
          if (optLetter && optLetter !== baseRatingLetter) return;
        }
        const isChecked = selectedIndices.includes(String(idx));
        const ratingTag = opt.rating
          ? `<span style="font-size:10px;background:#e5e7eb;color:#374151;padding:1px 5px;border-radius:3px;margin-left:6px;">${opt.rating}</span>`
          : '';
        const showLocInput = offerLoc(opt);
        const locVal = (locTextMap[String(idx)] || '').replace(/"/g, '&quot;');
        html += `
          <label style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;background:${isChecked ? '#dbeafe' : '#f9fafb'};border:1px solid ${isChecked ? '#93c5fd' : '#e5e7eb'};border-radius:6px;cursor:pointer;">
            <input type="checkbox" class="cb-multi-${comp.key}" value="${idx}" ${isChecked ? 'checked' : ''}
                   onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')"
                   style="width:16px;height:16px;margin-top:1px;accent-color:#006699;flex-shrink:0;">
            <span style="font-size:13px;line-height:1.35;flex:1;">${opt.label}${ratingTag}</span>
          </label>
        `;
        if (showLocInput && isChecked) {
          html += `
            <div style="padding:2px 8px 6px 32px;">
              <input type="text" class="cb-multi-loc-${comp.key}" data-optidx="${idx}" value="${locVal}"
                     placeholder="Where? (e.g. forward starboard stanchion)"
                     oninput="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')"
                     style="width:100%;padding:6px 8px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;background:#fffdf7;">
            </div>
          `;
        }
        renderedCount++;
      });
      if (renderedCount === 0 && comp.filterByRating && baseRatingLetter) {
        html += `<div style="font-size:11px;color:#6b7280;font-style:italic;padding:8px;">No ${baseRatingLetter}-rated options for this component yet.</div>`;
      }
      html += `</div>`;
    } else {
      html += `
        <select id="cb-${comp.key}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:white;"
                onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')">
          <option value="">— Select —</option>
      `;
      comp.options.forEach((opt, idx) => {
        html += `<option value="${idx}" ${selVal === String(idx) ? 'selected' : ''}>${opt.label}</option>`;
      });
      html += `</select>`;
    }

    // Add quantity input if this component has it
    if (comp.quantityPrompt) {
      const qtyVal = selections[comp.key + '_qty'] || '';
      html += `
        <div style="margin-top:4px;display:flex;gap:8px;align-items:center;">
          <label style="font-size:11px;color:#6b7280;white-space:nowrap;">${comp.quantityPrompt}</label>
          <select id="cb-${comp.key}_qty" style="padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:white;"
                  onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')">
            <option value="1" ${qtyVal === '1' || qtyVal === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${qtyVal === '2' || qtyVal === 2 ? 'selected' : ''}>2</option>
          </select>
        </div>
      `;
    }

    // Add location selector if this component has it
    if (comp.locationOptions) {
      const locVal = selections[comp.key + '_location'] || '';
      if (comp.locationMultiSelect) {
        // Multi-select checkboxes — stored as comma-separated string
        const selectedLocs = locVal ? locVal.split(', ') : [];
        html += `
          <div style="margin-top:4px;">
            <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px;">${comp.locationPrompt || 'Location(s)'}</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;" id="cb-${comp.key}_location_group">
        `;
        comp.locationOptions.forEach(loc => {
          const isChecked = selectedLocs.includes(loc);
          html += `
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;padding:4px 8px;background:${isChecked ? '#dbeafe' : '#f3f4f6'};border:1px solid ${isChecked ? '#93c5fd' : '#d1d5db'};border-radius:6px;cursor:pointer;">
                <input type="checkbox" class="cb-loc-${comp.key}" value="${loc}" ${isChecked ? 'checked' : ''}
                       onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')"
                       style="width:14px;height:14px;accent-color:#006699;">
                ${loc}
              </label>
          `;
        });
        html += `</div></div>`;
      } else {
        // Single-select dropdown
        html += `
          <div style="margin-top:4px;display:flex;gap:8px;align-items:center;">
            <label style="font-size:11px;color:#6b7280;white-space:nowrap;">${comp.locationPrompt || 'Location'}</label>
            <select id="cb-${comp.key}_location" style="flex:1;padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')">
              <option value="">Select...</option>
        `;
        comp.locationOptions.forEach(loc => {
          html += `<option value="${loc}" ${locVal === loc ? 'selected' : ''}>${loc}</option>`;
        });
        html += `</select></div>`;
      }
    }

    html += `</div>`;
  }

  // Additional notes — surveyor can add their own observations
  const customNotes = selections._customNotes || '';
  html += `
      <div style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">
        <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Additional Notes (appended to generated text)</label>
        <textarea id="cb-customNotes" placeholder="Add your own observations here..."
                  style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;min-height:50px;resize:vertical;font-family:inherit;"
                  onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')">${customNotes}</textarea>
      </div>
  `;

  const safeCat = (categoryName || '').replace(/'/g, "\\'");
  html += `
      <div style="padding:10px 20px;">
        <button onclick="applyComponentBuilder('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}', '${safeCat}')"
                style="width:100%;padding:10px;background:#006699;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
          Generate Finding Text
        </button>
      </div>
    </div>
  `;

  return html;
}

// Handle dropdown change in component builder — update preview
function onComponentBuilderChange(itemLabel, builderKey) {
  const builder = COMPONENT_BUILDERS[builderKey];
  if (!builder) return;

  // Collect current selections from the DOM
  const selections = {};
  for (const comp of builder.components) {
    if (comp.multiSelect) {
      // Multi-select: collect all checked checkbox values into an array
      const checked = document.querySelectorAll(`.cb-multi-${comp.key}:checked`);
      selections[comp.key] = Array.from(checked).map(cb => cb.value);
      // Also collect per-option location text (v2156).
      const locInputs = document.querySelectorAll(`.cb-multi-loc-${comp.key}`);
      if (locInputs.length) {
        const locMap = {};
        locInputs.forEach(el => {
          const idx = el.getAttribute('data-optidx');
          const val = (el.value || '').trim();
          if (idx && val) locMap[idx] = val;
        });
        if (Object.keys(locMap).length) selections[comp.key + '_locText'] = locMap;
      }
    } else {
      const el = document.getElementById(`cb-${comp.key}`);
      if (el) selections[comp.key] = el.value;
    }
    // Also collect qty and location if they exist
    const qtyEl = document.getElementById(`cb-${comp.key}_qty`);
    if (qtyEl) selections[comp.key + '_qty'] = qtyEl.value;
    // Location: multi-select checkboxes or single-select dropdown
    if (comp.locationMultiSelect) {
      const checked = document.querySelectorAll(`.cb-loc-${comp.key}:checked`);
      const locs = Array.from(checked).map(cb => cb.value);
      selections[comp.key + '_location'] = locs.length > 0 ? locs.join(', ') : '';
    } else {
      const locEl = document.getElementById(`cb-${comp.key}_location`);
      if (locEl) selections[comp.key + '_location'] = locEl.value;
    }
  }

  // Collect custom notes for live preview
  const customNotesEl = document.getElementById('cb-customNotes');
  const customNotes = customNotesEl ? customNotesEl.value.trim() : '';

  // Build the preview text
  const result = buildComponentFindings(builderKey, selections);

  // Update the textarea with the generated text (live preview)
  const sanitizedLabel = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const textarea = document.getElementById(`sheet-text-${sanitizedLabel}`);
  if (textarea && result.text) {
    textarea.value = result.text + (customNotes ? ' ' + customNotes : '');
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}

// Apply the component builder: generate text, set rating, and save
function applyComponentBuilder(itemLabel, builderKey, categoryName) {
  const builder = COMPONENT_BUILDERS[builderKey];
  if (!builder) return;

  // Collect selections — mirrors onComponentBuilderChange so Apply/preview agree.
  const selections = {};
  for (const comp of builder.components) {
    if (comp.multiSelect) {
      const checked = document.querySelectorAll(`.cb-multi-${comp.key}:checked`);
      selections[comp.key] = Array.from(checked).map(cb => cb.value);
      // Per-option location text (v2156)
      const locInputs = document.querySelectorAll(`.cb-multi-loc-${comp.key}`);
      if (locInputs.length) {
        const locMap = {};
        locInputs.forEach(el => {
          const idx = el.getAttribute('data-optidx');
          const val = (el.value || '').trim();
          if (idx && val) locMap[idx] = val;
        });
        if (Object.keys(locMap).length) selections[comp.key + '_locText'] = locMap;
      }
    } else {
      const el = document.getElementById(`cb-${comp.key}`);
      if (el) selections[comp.key] = el.value;
    }
    const qtyEl = document.getElementById(`cb-${comp.key}_qty`);
    if (qtyEl) selections[comp.key + '_qty'] = qtyEl.value;
    // Location: multi-select checkboxes or single-select dropdown (legacy component-level location)
    if (comp.locationMultiSelect) {
      const checked = document.querySelectorAll(`.cb-loc-${comp.key}:checked`);
      const locs = Array.from(checked).map(cb => cb.value);
      selections[comp.key + '_location'] = locs.length > 0 ? locs.join(', ') : '';
    } else {
      const locEl = document.getElementById(`cb-${comp.key}_location`);
      if (locEl) selections[comp.key + '_location'] = locEl.value;
    }
  }

  // Collect custom notes
  const customNotesEl = document.getElementById('cb-customNotes');
  if (customNotesEl) selections._customNotes = customNotesEl.value.trim();

  const result = buildComponentFindings(builderKey, selections);
  if (!result.text || result.text === builder.intro) {
    showToast('Please select at least one component condition');
    return;
  }

  // Append custom notes if any
  let finalText = result.text;
  if (selections._customNotes) {
    finalText += ' ' + selections._customNotes;
  }

  // Set the textarea text
  const sanitizedLabel = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const textarea = document.getElementById(`sheet-text-${sanitizedLabel}`);
  if (textarea) {
    textarea.value = finalText;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // Save the component builder selections and generated text to the survey
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].text = finalText;
    survey.items[itemLabel].componentSelections = selections;

    // Update rating if the builder determined one
    if (result.rating) {
      survey.items[itemLabel].rating = result.rating;
    }

    // Auto-check ABYC/TC standards mentioned in the generated text
    if (finalText && categoryName) {
      const availableStandards = getStandardsForCategory(categoryName, result.rating || 'B');
      if (availableStandards.length > 0) {
        const matched = availableStandards.filter(std => {
          // Extract the standard code (e.g., "ABYC E-2", "ABYC P-6", "TP1332")
          const codeMatch = std.match(/^(ABYC\s+\S+|TP\d+|TC\s+TP\s*\d+)/i);
          if (codeMatch) {
            // Normalise to handle "ABYC E-2" matching "ABYC E-2" in text
            return finalText.includes(codeMatch[1]);
          }
          return false;
        });
        if (matched.length > 0) {
          if (!survey.items[itemLabel].standards) survey.items[itemLabel].standards = [];
          matched.forEach(std => {
            if (!survey.items[itemLabel].standards.includes(std)) {
              survey.items[itemLabel].standards.push(std);
            }
          });
        }
      }
    }

    saveSurvey(survey).then(() => {
      showToast(`Finding generated — Rating: ${result.rating}`);
      // Close the sheet and refresh the item in place
      const overlay = document.getElementById('bottomSheetOverlay');
      if (overlay) overlay.remove();
      updateCompactItem(survey, itemLabel, categoryName || '');
    });
  });
}

// Category to text library sheet mapping
const SHEET_MAPPING = {
  'Hull exterior , keel and propulsion': 'Hull',
  'Hull exterior, keel and propulsion': 'Hull',
  'Spars and rigging': 'Spars and rigging',
  'Deck and coachroof/pilot house': 'Deck',
  'Aft deck': 'Aft Deck',
  'Outboard engine': 'Outboard',
  'Cockpit': 'Cockpit',
  'Cockpit gauges, instrumentation and entertainment': 'Gauges and Instrumentation',
  'Gauges, instrumentation and entertainment': 'Gauges and Instrumentation',
  'Flybridge': 'Flybridge',
  'Flybridge gauges and instrumentation': 'Flybridge gauges and instrument',
  'Cabin and conveniences': 'Cabin and conveniences',
  'Head(s)': 'Head',
  'Fuel, water and waste': 'Fuel & Tanks',
  'Engine(s) and drive(s)': 'Engine & Powertrain',
  'Steering and trim mechanics': 'Steering & Hydraulics',
  'Steering and hydraulics': 'Steering & Hydraulics',
  'Electrical': 'Electrical',
  'Electrical, other items': 'Electrical',
  'Safety': 'Safety & Nav Equipment',
  'Pilot house': 'Cockpit',
  'Pilot house gauges and instrumentation': 'Gauges and Instrumentation',
  'Sails': 'Spars and rigging',
  'On board equipment': 'Safety & Nav Equipment',
  'Vessel documentation and regulatory compliance': 'Hull'
};

// Maps template item labels to their exact text library section names
// Only includes entries where the names differ
const ITEM_SNIPPET_MAP = {
  'Anti-vibration mounts': 'Anti-vibration mounts',
  'Arch - cockpit (interior condition)': 'Arch',
  'Arch - external condition and equipment': 'Arch – external condition and equipment',
  'Bilge, stringers and ribs (those accessible from cabin)': 'Bilge, stringers and ribs – accessible from cabin',
  'Boom, gooseneck, boomvang, outhaul, cunningham and reefing lines': 'Boom, gooseneck, boomvang, outhaul, and reefing lines',
  'Bowsprit, deck and coachroof/pilot house conductivity testing': 'Deck and coachroof/pilothouse conductivity testing',
  'Bowsprit, deck and coachroof/pilot house impact and resonance testing': 'Deck and coachroof/pilot percussion testing',
  'Chainplates (exterior) pins and bolts': 'Chainplates (exterior)pins and bolts',
  'Cockpit lockers': 'Cockpit lockers and lazarettes',
  'Cockpit lockers/lazarettes': 'Cockpit lockers and lazarettes',
  'Cockpit sink and drain': 'Sink, faucets and drain',
  'Cockpit sink, faucets and drain': 'Sink, faucets and drain',
  'Deck and coachroof/pilot house conductivity testing': 'Deck and coachroof/pilothouse conductivity testing',
  'Deck and coachroof/pilot house impact and resonance testing': 'Deck and coachroof/pilot percussion testing',
  'Deck hatch(es), windows and portholes (exterior observations)': 'Deck hatches, windows, and portholes – exterior observations',
  'Deck hatches, windows and portholes (interior observations)': 'Deck hatches, windows and portholes – interior observations',
  'Drive coupling(s), interior propeller shaft(s), stuffing box(es)/packing gland(s)/dripless seal(s), interior stern tube(s)': 'Drive coupling(s), interior propeller shaft(s), stuffing box(es) or dripless seal(s), interior stern tube(s)',
  'Electrical - other features': 'Electrical – other features',
  'Emergency tiller and connection': 'Emergency tiller',
  'Engine controls (throttle, gearshift, etc.)': 'Engine gearshift and throttle',
  'Engine gauges (tachometer, speedometer, fuel, temperature, etc.)': 'Engine gauges',
  'Engine start/stop': 'Engine start and stop',
  'Engine, general condition/impression': 'Engine condition',
  'Fire extinguisher(s)': 'Fire extinguisher',
  'Flood lights/deck lights': 'Flood lights and deck lights',
  'Flybridge Engine gauges (tachometer, speedometer, fuel, temperature, etc.)': 'Engine gauges',
  'Flybridge Engine gearshift and throttle': 'Engine gearshift and throttle',
  'Flybridge Engine start/stop': 'Engine start and stop',
  'Flybridge conductivity testing': 'Flybridge conductivity testing',
  'Flybridge drain(s)': 'Flybridge drains',
  'Flybridge floor, seats and coaming (spider cracks, etc.)': 'Flybridge, floor, seats and coaming (spider cracks, etc.)',
  'Flybridge lighting': 'Flybridge lighting',
  'Flybridge percussion testing': 'Flybridge percussion testing',
  'Flybridge table': 'Flybridge table',
  'Flybridge lockers and lazarettes': 'Flybridge lockers and lazarettes',
  'Fresh water pump': 'Freshwater pump',
  'Fresh water tank(s) and plumbing': 'Freshwater tank and plumbing',
  'Gearbox general condition/impressions': 'Gearbox general condition and impressions',
  'Hull-deck joint (exterior)': 'Hull–deck joint (exterior)',
  'Hull(s) condition (below the waterline)': 'Hull(s) condition (below the waterline)',
  'Hull condition (below the waterline)': 'Hull(s) condition (below the waterline)',
  'Evident damage or repairs to hull and rudder below the waterline': 'Hull(s) condition (below the waterline)',
  'Evident damage or repairs to hull and rudder(s) (if applicable) below the waterline': 'Hull(s) condition (below the waterline)',
  'Hydraulic steering (hoses, fittings, steering cylinder, tiller arm / tiller bolt or tie-bar, rudder post and stuffing box, etc.)': 'Hydraulic steering (hoses, fittings, steering cylinder, tiller arm or tie bar, rudder post and stuffing box, etc.)',
  'Hull exterior above the waterline': 'Hull exterior above the waterline',
  'Hull and rudder(s) (if applicable) percussion testing': 'Hull and rudder(s) impact and resonance testing',
  'Rudder(s) condition': 'Rudder(s) condition',
  'Rudder condition': 'Rudder(s) condition',
  'Propeller(s)': 'Propeller(s)',
  'Propeller': 'Propeller(s)',
  'Hull and rudder(s) (if applicable) impact and resonance testing': 'Hull and rudder(s) impact and resonance testing',
  'Hull and rudder(s) (if applicable) conductivity testing': 'Hull and rudder(s) conductivity testing',
  'Hydraulic steering': 'Hydraulic steering (hoses, fittings, steering cylinder, tiller arm or tie bar, rudder post and stuffing box, etc.)',
  'LPG cut-off solenoid valve switch': 'LPG cut off solenoid valve switch',
  'Life ring/heaving line': 'Life ring or heaving line',
  'Lifelines/safety rail': 'Lifelines and safety rail',
  'Lifejackets/PFDs': 'Lifejackets and PFDs',
  'MFD/Chartplotter': 'MFD or Chartplotter',
  'Main sheet and traveller': 'Main sheet',
  'Manifold(s) and riser(s)': 'Manifolds and risers',
  'Outboard anode(s)': 'Outboard anodes',
  'Outboard general condition/impression': 'Outboard general condition and impression',
  'Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows': 'Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows',
  'Pilot house Engine controls (throttle, gearshift, etc.)': 'Engine gearshift and throttle',
  'Pilot house Engine gauges (tachometer, speedometer, fuel, temperature, etc.)': 'Engine gauges',
  'Pilot house Engine start/stop': 'Engine start and stop',
  'Propane valve, regulator, gauge, storage compartment and vent.': 'Propane valve, regulator, gauge, storage compartment and vent',
  'Sail drive(s) - (external), corrosion, propeller(s), anode(s)': 'Sail drive(s) (external), corrosion, propeller(s), anode(s)',
  'Signs of water ingress?': 'Signs of water ingress',
  'Swim platform and ladder - condition and conductivity readings': 'Swim platform and ladder',
  'Swim platform and ladder - condition and moisture readings': 'Swim platform and ladder',
  'Steering wheel, steering': 'Steering wheel and steering',
  'Flybridge steering wheel, steering': 'Flybridge steering wheel, steering',
  'Cabin windows and hatches (interior observations)': 'Deck hatches, windows and portholes – interior observations',
  'Cabin sole': 'Floor and carpet',
  'Berths and upholstery': 'Upholstery',
  'Interior lighting': 'Cabin lights',
  'Refrigerator/freezer': 'Refrigerator / icebox',
  'Sink, faucet and drain (galley)': 'Galley faucet, sink and drain',
  'Shower, sump and drain': 'Head, shower, drain, sump and pump',
  'Horn/sound signal': 'Horn or sound signalling device',
  'Horn/sound signal (powered)': 'Horn or sound signalling device',
  'Spotlight/searchlight': 'Search light',
  'Entertainment/stereo': 'Stereo and speakers',
  'Windshield wipers': 'Wiper blade operation',
  'Trim tab controls': 'Trim tabs',
  'VHF radio and antenna': 'VHF',
  'Wind instruments (direction, speed, etc.)': 'Wind instruments',
  'Windshield, pilot house windows, frames and seals': 'Windshield, pilothouse windows, frames, and studs',
  'Bow thruster controls': 'Bow thruster',
  'Flybridge Safety rails': 'Safety rails',
  'Flybridge Bimini/dodger/hardtop': 'Bimini, dodger and canvas enclosure',
  'Flybridge Sink, faucet and drain': 'Sink, faucets and drain',
  'Flybridge Stereo and speakers': 'Stereo and speakers',
  'Deck and coachroof/pilot house condition (spider cracks, etc.)': 'Deck and coachroof/pilothouse condition',
  'Cockpit, floor, seats and coaming (spider cracks, etc.)': 'Cockpit, floor, seats and coaming',
  'Battery(ies), house': 'House battery(ies)',
  'Battery(ies), starter': 'Starter battery(ies)',
  'Toerail/gunwale': 'Toerail and gunwale',
  'Fuel and water fill ports, and waste deck pump-out port': 'Fuel and water fill ports and waste deck pump-out port',
  'Aft deck condition': 'Aft deck condition (spider cracks, etc.)',
  'Condition (spider cracks, etc.)': 'Aft deck condition (spider cracks, etc.)',
  'Conductivity testing': 'Aft deck conductivity testing',
  'Percussion testing': 'Aft deck impact and resonance testing',
  'Mechanical steering': 'Mechanical steering (quadrant, linkages, cables, bearings, post, etc.)',
  'Trim tab mechanism (interior)': 'Trim tab hydraulic pump and system',
  // ── Insurance template mappings ──────────────────────────────────────
  'Aft deck - other features': 'Aft deck condition (spider cracks, etc.)',
  'Anchor windlass control': 'Anchor windlass controls',
  'Bilge, stringers, ribs and bulkheads (those accessible from engine bay': 'Bilge, stringers and ribs – accessible from engine bay',
  'Cabin and conveniences - other features': 'Cabin lining and ceiling',
  'Cockpit - other features': 'Cockpit, floor, seats and coaming',
  'Cockpit - other gauges and instrumentation': 'Engine gauges',
  'Cockpit percussion testing': 'Cockpit impact and resonance testing',
  'Condition': 'Aft deck condition (spider cracks, etc.)',
  'Deck and coachroof/pilot house - other features': 'Deck and coachroof/pilothouse condition',
  'Deck and coachroof/pilot house condition': 'Deck and coachroof/pilothouse condition',
  'Deck and coachroof/pilot percussion testing': 'Deck and coachroof/pilot percussion testing',
  'Electrical, other, additional features': 'Electrical – other features',
  'Engines and drives - other features': 'Oil level and condition',
  'Flybridge - other gauges and instrumentation': 'Engine gauges',
  'Flybridge Anchor windlass control': 'Anchor windlass controls',
  'Flybridge Autopilot': 'Autopilot',
  'Flybridge Blower': 'Blower',
  'Flybridge Bow thruster/stern thruster controls': 'Bow thruster',
  'Flybridge Depth sounder': 'Depth sounder',
  'Flybridge Flood lights/deck lights': 'Flood lights and deck lights',
  'Flybridge Log': 'Log',
  'Flybridge MFD/Chartplotter': 'MFD or Chartplotter',
  'Flybridge Magnetic compass': 'Magnetic compass',
  'Flybridge Outdrive tilt': 'Outdrive tilt',
  'Flybridge Radar': 'Radar',
  'Flybridge Searchlight': 'Search light',
  'Flybridge Trim tabs': 'Trim tabs',
  'Flybridge VHF radio and antenna': 'VHF',
  'Flybridge Wind instruments (direction, speed, etc.)': 'Wind instruments',
  'Flybridge floor, seats and coaming': 'Flybridge, floor, seats and coaming (spider cracks, etc.)',
  'Fuel, water and waste - other features': 'Fuel tank(s)',
  'Generator air filter': 'Generator',
  'Generator anti-siphon': 'Generator',
  'Generator battery': 'Generator',
  'Generator exhaust': 'Generator',
  'Generator hoses': 'Generator',
  'Generator oil level and condition': 'Generator',
  'Generator operation': 'Generator',
  'Generator valve and sea strainer': 'Generator valve and sea strainer',
  'Hull exterior and propulsion - other': 'Hull exterior above the waterline',
  'Hydraulic steering (hoses, fittings, steering cylinder, tiller arm / tiller bolt or tie-bar, rudder post and stuffing box, etc.)': 'Hydraulic steering (hoses, fittings, steering cylinder, tiller arm or tie bar, rudder post and stuffing box, etc.)',
  'Lighting': 'Flood lights and deck lights',
  'Outboard engine - other features': 'Outboard general condition and impression',
  'Pilot house - other features': 'Cockpit, floor, seats and coaming',
  'Pilot house - other gauges and instrumentation': 'Engine gauges',
  'Pilot house Anchor windlass control': 'Anchor windlass controls',
  'Pilot house Autopilot': 'Autopilot',
  'Pilot house Blower': 'Blower',
  'Pilot house Bow thruster/stern thruster controls': 'Bow thruster',
  'Pilot house Depth sounder': 'Depth sounder',
  'Pilot house Flood lights/deck lights': 'Flood lights and deck lights',
  'Pilot house Lighting': 'Flood lights and deck lights',
  'Pilot house Log': 'Log',
  'Pilot house MFD/Chartplotter': 'MFD or Chartplotter',
  'Pilot house Magnetic compass': 'Magnetic compass',
  'Pilot house Outdrive tilt': 'Outdrive tilt',
  'Pilot house Radar': 'Radar',
  'Pilot house Searchlight': 'Search light',
  'Pilot house Trim tab controls': 'Trim tab controls',
  'Pilot house VHF radio and antenna': 'VHF',
  'Pilot house Windshield wiper(s) operation': 'Wiper blade operation',
  'Pilot house steering wheel': 'Steering wheel and steering',
  'Pilot house, floor and seat(s)': 'Cockpit, floor, seats and coaming',
  'Sail drive oil': 'Gearbox oil',
  'Solar panels controller': 'Generator',
  'Solar panels wiring': 'Bundling support and wiring',
  'Spars and rigging - other': 'Spars and rigging photos',
  'Steering and trim mechanics - other features': 'Mechanical steering (quadrant, linkages, cables, bearings, post, etc.)',
  'Wind generator manufacturer and model #': 'Generator',
  'Windshield wiper(s) operation': 'Wiper blade operation'
};

// Init IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KikiSurveyDB', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('surveys')) {
        db.createObjectStore('surveys', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('surveyId', 'surveyId', { unique: false });
      }
    };
  });
}

// Fetch data files
async function fetchDataFiles() {
  try {
    const [templateRes, insuranceTemplateRes, libraryRes, specsRes, valuesRes, engineRes, outdriveRes] = await Promise.all([
      fetch('survey_template.json?v=' + APP_VERSION),
      fetch('insurance_survey_template.json?v=' + APP_VERSION),
      fetch('text_library.json?v=' + APP_VERSION),
      fetch('boat_specs_db.json'),
      fetch('boat_values_db.json'),
      fetch('engine_db.json'),
      fetch('outdrive_db.json')
    ]);

    // Parse each template individually so one bad file cannot prevent others from loading
    try { surveyTemplate = await templateRes.json(); } catch (e) { console.error('Failed to parse survey_template.json:', e); }
    try { insuranceSurveyTemplate = await insuranceTemplateRes.json(); } catch (e) { console.error('Failed to parse insurance_survey_template.json:', e); }
    try { textLibrary = await libraryRes.json(); } catch (e) { console.error('Failed to parse text_library.json:', e); }
    try { boatSpecsDB = await specsRes.json(); } catch (e) { console.error('Failed to parse boat_specs_db.json:', e); }
    try { boatValuesDB = await valuesRes.json(); } catch (e) { console.error('Failed to parse boat_values_db.json:', e); }
    try { engineDb = await engineRes.json(); } catch (e) { console.error('Failed to parse engine_db.json:', e); }
    try { outdriveDb = await outdriveRes.json(); } catch (e) { console.error('Failed to parse outdrive_db.json:', e); }

    // Winch DB is optional — fetch separately so a missing file cannot break the app
    try {
      const winchRes = await fetch('winch_db.json');
      if (winchRes.ok) winchDb = await winchRes.json();
    } catch (winchErr) {
      console.warn('winch_db.json not available:', winchErr);
    }
  } catch (e) {
    console.error('Error fetching data files:', e);
  }
}

// Returns the correct survey template based on survey type
function getTemplateForSurvey(survey) {
  if (survey && survey.surveyType === 'Insurance survey' && insuranceSurveyTemplate) {
    return insuranceSurveyTemplate;
  }
  return surveyTemplate || [];
}

// Database operations
async function saveSurvey(survey) {
  // Guard: can't put a survey without an id (keyPath='id'). This silently
  // no-ops during the New Survey screen before the survey has been saved,
  // rather than throwing DataError: Provided data is inadequate.
  if (!survey || survey.id === undefined || survey.id === null || survey.id === '') {
    return null;
  }

  // ── Auto-regenerate the Overall Description of Vessel ─────────────────
  // Keep the description in sync whenever any field that feeds it is saved
  // from anywhere in the survey (header specs, engines, mast stepping,
  // electronics ratings, TC TP 511 safety, etc.). Preconditions:
  //   - descriptionAutoGenerated is truthy (or no description yet), AND
  //   - the surveyor isn't actively editing the description textarea
  //     (activeElement check + sticky window flag set on input).
  // Edits via markDescriptionManuallyEdited() flip descriptionAutoGenerated
  // off, so manual text is never clobbered. An explicit Regenerate click
  // clears the sticky flag and resumes auto-updates.
  try {
    const ta = typeof document !== 'undefined' ? document.getElementById('vesselDescription') : null;
    const focused = ta && typeof document !== 'undefined' && document.activeElement === ta;
    const editingThisSurvey = typeof window !== 'undefined' && window._descUserEditing === survey.id;
    const currentDesc = survey.vesselDescription || '';
    const isAutoMode = !!survey.descriptionAutoGenerated || !currentDesc.trim();
    if (!focused && !editingThisSurvey && isAutoMode && typeof buildDescriptionFromSurvey === 'function') {
      const fresh = buildDescriptionFromSurvey(survey);
      if (fresh && fresh !== currentDesc) {
        survey.vesselDescription = fresh;
        survey.descriptionAutoGenerated = true;
        // Reflect the update in the live textarea if it's on screen
        // (and not focused, since we just checked).
        if (ta) {
          ta.value = fresh;
          ta.style.height = 'auto';
          ta.style.height = ta.scrollHeight + 'px';
          if (typeof updatePlaceholderCount === 'function') updatePlaceholderCount(fresh);
        }
      }
    }
  } catch (e) {
    // Never block a save on a regen failure
    if (typeof console !== 'undefined') console.warn('auto-regen vessel description failed', e);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys'], 'readwrite');
    const store = tx.objectStore('surveys');
    const request = store.put(survey);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Mark that there are unsaved changes for backup reminder
      window._hasUnsavedBackup = true;
      resolve(survey.id);
    };
  });
}

// Warn before leaving if there are unsaved backup changes
window.addEventListener('beforeunload', (e) => {
  if (window._hasUnsavedBackup && currentSurveyId) {
    e.preventDefault();
    e.returnValue = 'You have survey data that has not been backed up. Use the Backup button before leaving.';
  }
});

// ── Item label migration map ────────────────────────────────────────────
// When template labels change (e.g., items get split or renamed), old
// survey data is stored under the old key.  This map moves data forward
// so the surveyor doesn't have to re-enter anything.
// Format: { 'old label': 'new label' }  — or  { 'old label': ['new1', 'new2'] } for splits.
const ITEM_LABEL_MIGRATIONS = {
  'Hull and rudder(s)/drive(s) condition (below the waterline)': 'Hull(s) condition (below the waterline)',
  'Evident damage or repairs to hull and rudder below the waterline': 'Hull(s) condition (below the waterline)',
  'Hull and rudder(s) (if applicable) percussion testing': 'Hull and rudder(s) (if applicable) impact and resonance testing',
  'Hull and rudder(s) (if applicable) moisture testing': 'Hull and rudder(s) (if applicable) conductivity testing',
  'Swim platform and ladder - condition and moisture readings': 'Swim platform and ladder - condition and conductivity readings',
  'IPS pod drive(s)': 'IPS pod drive(s)',
  'Battery ventillation': 'Battery ventilation',
  'Lighting': 'Lighting (cabin)',
};

// Migrate old item labels to current template labels.
// Runs once per survey open; sets a version flag so it doesn't re-run.
// One-time text patches for blank rated items (v2114 patch)
const BLANK_ITEM_TEXT_PATCHES = {
  'Cooling water intake seacock(s) and strainer(s)': 'The cooling water intake seacock operated freely and the raw water strainer was clean and in serviceable condition. The strainer basket was intact and the housing showed no signs of cracking or leaking.',
  'Deck hatch(es), windows and portholes (exterior observations)': 'All deck hatches, windows, and portholes were visually inspected from the exterior. The frames were securely fastened and the seals appeared serviceable with no significant deterioration. Some crazing was noted on the acrylic, typical of a vessel of this age.',
  'Drive coupling(s), interior propeller shaft(s), stuffing box(es)/packing gland(s)/dripless seal(s), interior stern tube(s)': 'The drive coupling was securely attached and showed no signs of excessive wear or misalignment. The interior propeller shaft appeared straight and was free of significant corrosion. The packing gland appeared serviceable. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.',
};

function migrateSurveyLabels(survey) {
  if (!survey || !survey.items) return false;
  const currentVersion = 2114;
  if (survey._labelVersion >= currentVersion) return false;

  let changed = false;
  for (const [oldLabel, newLabel] of Object.entries(ITEM_LABEL_MIGRATIONS)) {
    if (survey.items[oldLabel] && !survey.items[newLabel]) {
      survey.items[newLabel] = survey.items[oldLabel];
      delete survey.items[oldLabel];
      changed = true;
      console.log(`Migrated item: "${oldLabel}" → "${newLabel}"`);
    }
  }

  // Fill in blank text for rated items that have approved default observations
  for (const [label, defaultText] of Object.entries(BLANK_ITEM_TEXT_PATCHES)) {
    const item = survey.items[label];
    if (item && item.rating && item.rating.trim() && (!item.text || !item.text.trim())) {
      item.text = defaultText;
      changed = true;
      console.log(`Patched blank text for: "${label}"`);
    }
  }

  // Lighting (cabin): if migrated from old "Lighting" and has no rating, set C
  const cabinLight = survey.items['Lighting (cabin)'];
  if (cabinLight && (!cabinLight.rating || !cabinLight.rating.trim())) {
    cabinLight.rating = 'C - Serviceable';
    cabinLight.text = cabinLight.text || 'All cabin lighting powered up and functioned as expected.';
    changed = true;
    console.log('Patched Lighting (cabin) rating and text');
  }

  survey._labelVersion = currentVersion;
  return changed;
}

async function getSurvey(id) {
  // Guard: store.get(undefined|null) throws DataError in Safari. Return null
  // so the 40+ call sites can safely do `const s = await getSurvey(id); if (!s) return;`
  if (id === undefined || id === null || id === '') {
    return null;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['surveys'], 'readonly');
      const store = tx.objectStore('surveys');
      const request = store.get(id);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result || null);
    } catch (e) {
      console.warn('getSurvey failed for id:', id, e);
      resolve(null);
    }
  });
}

async function getAllSurveys() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys'], 'readonly');
    const store = tx.objectStore('surveys');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const surveys = request.result.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      resolve(surveys);
    };
  });
}

async function deleteSurvey(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys', 'photos'], 'readwrite');
    const surveysStore = tx.objectStore('surveys');
    const photosStore = tx.objectStore('photos');

    surveysStore.delete(id);

    // Delete all photos for this survey
    const photoIndex = photosStore.index('surveyId');
    const range = IDBKeyRange.only(id);
    photoIndex.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        photosStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });
}

// ─── Idle-triggered backup system ──────────────────────────────────────────
// Photos are saved to IndexedDB instantly. Uploads only happen when the user
// pauses activity for 5 seconds, taps Backup, or comes back online.
// This means zero network activity while you're snapping photos or typing.
let _photosSinceLastBackup = 0;
let _backupStats = { firebase: 0, session: 0, queued: 0 };
let _pendingBackupIds = [];   // Photo IDs waiting to be uploaded
let _backupRunning = false;   // True while the upload loop is active
let _idleTimer = null;        // Timer that triggers backup after 5s of inactivity
let _lastActivityTime = 0;    // Timestamp of last user activity (photo/rating/typing)

// Call this whenever the user does something (photo capture, rating, typing, etc.)
function _resetIdleTimer() {
  _lastActivityTime = Date.now();
  // Cancel any pending backup start
  if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
  // Hide the "backing up" banner if user resumes activity — uploads pause naturally
  // because _backupRunning checks idle state

  // Set a new 5-second idle timer
  if (_pendingBackupIds.length > 0) {
    _idleTimer = setTimeout(() => {
      _showBackupNowBanner();
      _processBackupQueue();
    }, 5000);
  }
}

async function savePhoto(photo) {
  if (typeof SaveStatus !== 'undefined') SaveStatus.markSaving();
  const id = await new Promise((resolve, reject) => {
    const tx = db.transaction(['photos'], 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.put(photo);
    request.onerror = () => { if (typeof SaveStatus !== 'undefined') SaveStatus.markError(request.error && request.error.message); reject(request.error); };
    request.onsuccess = () => resolve(photo.id);
  });
  if (typeof SaveStatus !== 'undefined') {
    SaveStatus.markSaved();
    // Recount photos for the current survey so the pill shows the new total
    if (typeof currentSurveyId !== 'undefined' && currentSurveyId) {
      refreshSavePillPhotoCount(currentSurveyId);
    }
  }

  // Only queue backup for new photos (not bulk recovery imports)
  if (photo.dataUrl && photo.itemLabel && photo.itemLabel !== 'Recovered') {
    _backupStats.session++;

    // Add to pending queue — NO network activity now
    if (!_pendingBackupIds.includes(photo.id)) {
      _pendingBackupIds.push(photo.id);
      _backupStats.queued = _pendingBackupIds.length;
    }

    // Reset the idle timer — backup starts after 5s of no activity
    _resetIdleTimer();
    _updateBackupStatusUI();

    // Track for Drive backup
    _photosSinceLastBackup++;
  }

  return id;
}

// Show a subtle "Backing up..." banner when idle backup starts
function _showBackupNowBanner() {
  const count = _pendingBackupIds.length;
  if (count === 0) return;

  let banner = document.getElementById('backup-progress-bar');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'backup-progress-bar';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;transition:opacity 0.3s;';
    document.body.appendChild(banner);
  }
  banner.style.opacity = '1';
  banner.innerHTML = `
    <div style="background:#006699;color:white;padding:10px 16px 6px;font-size:13px;font-weight:600;text-align:center;">
      ☁️ Backing up ${count} photo${count > 1 ? 's' : ''}...
    </div>
    <div style="height:4px;background:#004466;">
      <div id="backup-fill-bar" style="height:100%;width:0%;background:#00ccff;transition:width 0.3s ease;"></div>
    </div>`;
}

// Update the banner during upload progress
function _updateBackupBanner(uploaded, total) {
  const banner = document.getElementById('backup-progress-bar');
  if (!banner) return;
  const pct = Math.round((uploaded / total) * 100);
  const textEl = banner.querySelector('div');
  if (textEl) textEl.innerHTML = `☁️ Backing up... ${uploaded} of ${total} (${pct}%)`;
  const fill = document.getElementById('backup-fill-bar');
  if (fill) fill.style.width = pct + '%';
}

// Hide the banner when done
function _hideBackupBanner(message) {
  const banner = document.getElementById('backup-progress-bar');
  if (!banner) return;
  const isSuccess = message && (message.includes('✓') || message.includes('All'));
  const isPause = message && message.includes('⏸');
  const bg = isSuccess ? '#16a34a' : isPause ? '#d97706' : '#dc2626';
  banner.innerHTML = `
    <div style="background:${bg};color:white;padding:10px 16px;font-size:13px;font-weight:600;text-align:center;">
      ${message || '✓ Backup complete'}
    </div>`;
  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 300);
  }, isSuccess ? 2500 : 3500);
}

// Process the pending backup queue — uploads one at a time during idle
async function _processBackupQueue() {
  if (_backupRunning || _pendingBackupIds.length === 0) return;

  const firebaseOk = typeof FirebaseSync !== 'undefined' && FirebaseSync.isEnabled();
  const driveOk = typeof DriveBackup !== 'undefined' && DriveBackup.isSignedIn && DriveBackup.isSignedIn();

  if (!firebaseOk && !driveOk) {
    _showBackupWarning('No cloud backup connected', 'Connect Firebase or Google Drive');
    return;
  }

  _backupRunning = true;
  const totalToProcess = _pendingBackupIds.length;
  let uploaded = 0;
  let failed = 0;

  while (_pendingBackupIds.length > 0) {
    // Check if user has resumed activity — pause uploads
    if (Date.now() - _lastActivityTime < 3000) {
      // User is active — stop uploading, restart idle timer
      _backupRunning = false;
      _resetIdleTimer();
      _hideBackupBanner(`⏸ Paused — ${uploaded} backed up, ${_pendingBackupIds.length} remaining`);
      return;
    }

    const photoId = _pendingBackupIds[0];

    try {
      // Load ONE photo from IndexedDB
      let photo = await getPhotoById(photoId);
      if (photo && photo.dataUrl) {
        // Upload to Firebase
        if (firebaseOk) {
          await FirebaseSync.pushPhoto(photo);
          _backupStats.firebase++;
        }
        // Upload to Google Drive too (if signed in)
        if (driveOk) {
          try { await DriveBackup.backupOnePhoto(photo); } catch (e) {
            console.warn(`[Backup] Drive failed for ${photoId}:`, e.message);
          }
        }
      }
      photo = null; // Release memory
      _pendingBackupIds.shift(); // Remove from queue on success
      uploaded++;
      _backupStats.queued = _pendingBackupIds.length;
      _updateBackupBanner(uploaded, totalToProcess);
      _updateBackupStatusUI();
    } catch (err) {
      console.warn(`[Backup] Failed for ${photoId}:`, err.message);
      failed++;
      // Move to end of queue for retry
      _pendingBackupIds.shift();
      _pendingBackupIds.push(photoId);
      // If everything is failing, stop trying
      if (failed >= 3) {
        _backupRunning = false;
        _hideBackupBanner(`⚠️ Upload issues — ${uploaded} done, ${_pendingBackupIds.length} will retry`);
        _showBackupWarning('Backup', `${failed} uploads failed — will retry when idle`);
        // Retry in 30 seconds
        setTimeout(() => { if (_pendingBackupIds.length > 0) _processBackupQueue(); }, 30000);
        return;
      }
    }

    // 500ms pause between uploads to let browser reclaim memory
    await new Promise(r => setTimeout(r, 500));
  }

  _backupRunning = false;
  const destinations = [firebaseOk ? 'Firebase' : null, driveOk ? 'Drive' : null].filter(Boolean).join(' + ');
  _hideBackupBanner(`✓ ${uploaded} photos backed up to ${destinations}`);
  _updateBackupStatusUI();
}

// Listen for connectivity changes — auto-retry when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Backup] Back online — will process queue after idle');
    setTimeout(() => {
      if (_pendingBackupIds.length > 0) {
        _showBackupNowBanner();
        _processBackupQueue();
      }
    }, 3000);
  });
}

// Also hook into user activity events to reset the idle timer
if (typeof document !== 'undefined') {
  ['touchstart', 'mousedown', 'keydown', 'scroll'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (_pendingBackupIds.length > 0) _resetIdleTimer();
    }, { passive: true });
  });
}

// Sync ALL existing photos to Firebase (for photos that were never backed up)
// MEMORY-SAFE: only loads one photo at a time to avoid Aw Snap crashes
async function syncAllPhotosToFirebase() {
  if (typeof FirebaseSync === 'undefined' || !FirebaseSync.isEnabled()) {
    showAlert('Firebase is not connected. Open the app and ensure the sync dot is green.');
    return;
  }

  const surveys = await getAllSurveys();

  // Step 1: Collect all photo IDs (keys only — no image data in memory)
  const allPhotoIds = [];
  for (const survey of surveys) {
    const ids = await new Promise((resolve) => {
      const tx = db.transaction(['photos'], 'readonly');
      const index = tx.objectStore('photos').index('surveyId');
      const keys = [];
      index.openKeyCursor(IDBKeyRange.only(survey.id)).onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { keys.push(cursor.primaryKey); cursor.continue(); }
        else resolve(keys);
      };
    });
    for (const id of ids) allPhotoIds.push({ id, surveyId: survey.id });
  }

  if (allPhotoIds.length === 0) { showToast('No photos to sync'); return; }

  // Step 2: Check which photos already exist in Firebase — only need to upload the rest
  const existingInFirebase = new Set();
  for (const survey of surveys) {
    try {
      const snap = await window.fsDb.collection('photos')
        .where('surveyId', '==', survey.id)
        .get();
      snap.docs.forEach(doc => existingInFirebase.add(doc.id));
    } catch (e) { /* continue */ }
  }

  // Build the list of photos that actually need uploading
  const needsUpload = allPhotoIds.filter(e => !existingInFirebase.has(e.id));
  const totalToUpload = needsUpload.length;
  const alreadySynced = allPhotoIds.length - totalToUpload;

  if (totalToUpload === 0) {
    showToast(`All ${alreadySynced} photos already in Firebase ✓`);
    return;
  }

  // Show progress bar
  let banner = document.getElementById('backup-progress-bar');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'backup-progress-bar';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;transition:opacity 0.3s;';
    document.body.appendChild(banner);
  }
  banner.style.opacity = '1';

  function _updateSyncBar(done, total) {
    const remaining = total - done;
    const pct = Math.round((done / total) * 100);
    banner.innerHTML = `
      <div style="background:#006699;color:white;padding:10px 16px 6px;font-size:13px;font-weight:600;text-align:center;">
        ☁️ Uploading photo ${done} of ${total} — ${remaining} to go
      </div>
      <div style="height:4px;background:#004466;">
        <div style="height:100%;width:${pct}%;background:#00ccff;transition:width 0.3s ease;"></div>
      </div>`;
  }

  _updateSyncBar(0, totalToUpload);

  // Step 3: Upload ONE photo at a time with aggressive memory management
  // We inline the upload logic instead of calling pushPhoto() so we can
  // null out references between steps and give the GC time to reclaim memory.
  let uploaded = 0;
  let failed = 0;
  let lastSurveyId = null;

  for (let i = 0; i < needsUpload.length; i++) {
    const entry = needsUpload[i];

    try {
      // Load ONE photo from IndexedDB — get only the dataUrl and metadata we need
      let photo = await getPhotoById(entry.id);
      if (photo && photo.dataUrl) {
        // Step A: Convert base64 dataUrl → blob (binary, smaller in memory)
        let blob = await (await fetch(photo.dataUrl)).blob();

        // Step B: Upload blob to Firebase Storage
        const storageRef = `photos/${photo.surveyId}/${photo.id}`;
        await window.fsStorage.ref(storageRef).put(blob);

        // Step C: Save metadata (no dataUrl) to Firestore
        const meta = {};
        for (const key of Object.keys(photo)) {
          if (key !== 'dataUrl') meta[key] = photo[key];
        }
        meta.storageRef = storageRef;
        await window.fsDb.collection('photos').doc(photo.id).set(meta);

        // Step D: Aggressively release memory
        blob = null;
        photo = null;
        uploaded++;
      } else {
        photo = null;
      }
    } catch (err) {
      failed++;
      console.warn(`[Sync] Failed: ${entry.id}`, err.message);
    }

    _updateSyncBar(i + 1, totalToUpload);

    // 500ms pause after EVERY photo to let Chrome's GC reclaim memory
    await new Promise(r => setTimeout(r, 500));

    // Push survey data once per survey (when we move to the next one)
    if (entry.surveyId !== lastSurveyId) {
      if (lastSurveyId) {
        const prevSurvey = surveys.find(s => s.id === lastSurveyId);
        if (prevSurvey) { try { await FirebaseSync.pushSurvey(prevSurvey); } catch(e) {} }
      }
      lastSurveyId = entry.surveyId;
    }
  }

  // Push the final survey
  if (lastSurveyId) {
    const lastSurvey = surveys.find(s => s.id === lastSurveyId);
    if (lastSurvey) { try { await FirebaseSync.pushSurvey(lastSurvey); } catch(e) {} }
  }

  // Show completion
  const bg = failed > 0 ? '#d97706' : '#16a34a';
  const msg = failed > 0
    ? `✓ Done — ${uploaded} uploaded, ${failed} failed`
    : `✓ All ${uploaded} photos uploaded to Firebase`;
  banner.innerHTML = `<div style="background:${bg};color:white;padding:10px 16px;font-size:13px;font-weight:600;text-align:center;">${msg}</div>`;
  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => { if (banner.parentElement) banner.remove(); }, 300);
  }, 4000);
}

// Pull missing photos from Firebase to this device
// Fetch a URL and return a Blob using XMLHttpRequest. Used as a fallback
// path when fetch() throws "Load failed" on iOS Safari PWA — XHR has
// historically succeeded in the same context fetch fails. B-03 fix.
function _xhrGetBlob(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.timeout = timeoutMs || 30000;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error('XHR HTTP ' + xhr.status));
      }
    };
    xhr.onerror = () => reject(new Error('XHR network error'));
    xhr.ontimeout = () => reject(new Error('XHR timeout after ' + xhr.timeout + 'ms'));
    xhr.onabort = () => reject(new Error('XHR aborted'));
    try { xhr.send(); } catch (e) { reject(new Error('XHR send failed: ' + e.message)); }
  });
}

// Try the Firebase SDK's native getBlob method if available (compat SDK v10+).
// This uses Firebase's internal transport which may bypass iOS PWA
// cross-origin restrictions that block raw fetch/XHR. Returns Blob on
// success, throws on failure.
async function _firebaseSdkGetBlob(storageRef) {
  if (!window.fsStorage) throw new Error('fsStorage not initialized');
  const ref = window.fsStorage.ref(storageRef);
  if (typeof ref.getBlob === 'function') {
    return await ref.getBlob();
  }
  // Some compat versions expose getBytes() which returns ArrayBuffer
  if (typeof ref.getBytes === 'function') {
    const bytes = await ref.getBytes();
    return new Blob([bytes]);
  }
  throw new Error('getBlob/getBytes not available on this SDK version');
}

// Read an error response body for richer diagnostics — strips to a bounded
// string so error messages don't balloon.
async function _readErrorBody(response) {
  try {
    const txt = await response.text();
    if (!txt) return '';
    return txt.substring(0, 140);
  } catch (_) {
    return '';
  }
}

// Download a single photo with staged error reporting and multiple fallbacks.
// Transport order (B-03 v2160):
//   1. Firebase SDK getBlob()   — uses SDK's internal transport, most likely
//                                 to work in iOS PWA WKWebView context.
//   2. fetch(signedUrl)         — page-context fetch; historically fails on
//                                 iOS PWA with "Load failed".
//   3. XMLHttpRequest           — different transport; sometimes succeeds.
//
// Errors tagged with .stage = 'url' | 'sdk' | 'fetch' | 'xhr' | 'blob-read'.
async function _downloadOneFirebasePhoto(meta) {
  const attempts = 2;
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    let url = null;
    let blob = null;

    // Stage 0 — try Firebase SDK native getBlob first
    try {
      blob = await _firebaseSdkGetBlob(meta.storageRef);
    } catch (sdkErr) {
      // Not available or failed — fall through to URL + fetch path.
      lastErr = sdkErr;
      lastErr.stage = 'sdk';
    }

    if (blob) {
      // Got blob from SDK; skip to stage 3 (read as dataURL)
    } else {
      // Stage 1 — get the signed download URL from Firebase SDK
      try {
        const ref = window.fsStorage.ref(meta.storageRef);
        url = await ref.getDownloadURL();
      } catch (err) {
        err.stage = 'url';
        lastErr = err;
        if (i < attempts - 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      }

      // Stage 2 — download bytes via fetch, fall back to XHR.
      // v2161: pass explicit fetch options — strips default cookies /
      // credentials / cache that iOS WKWebView standalone (PWA) mode may
      // reject cross-origin. mode:cors + credentials:omit is the minimal
      // request iOS should honor.
      try {
        try {
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'follow'
          });
          if (!response.ok) {
            const bodySnippet = await _readErrorBody(response);
            throw new Error('HTTP ' + response.status + (bodySnippet ? ': ' + bodySnippet : ''));
          }
          blob = await response.blob();
        } catch (fetchErr) {
          try {
            blob = await _xhrGetBlob(url, 30000);
          } catch (xhrErr) {
            const combined = new Error('fetch: ' + (fetchErr.name || 'err') + ' "' + (fetchErr.message || '') + '" · xhr: ' + xhrErr.message);
            combined.stage = 'xhr';
            throw combined;
          }
        }
      } catch (err) {
        if (!err.stage) err.stage = 'fetch';
        lastErr = err;
        if (i < attempts - 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      }
    }

    // Stage 3 — read blob as a base64 data URL for IndexedDB storage
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });
      blob = null; // release before returning
      return dataUrl;
    } catch (err) {
      err.stage = 'blob-read';
      lastErr = err;
      if (i < attempts - 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
      break;
    }
  }
  throw lastErr || new Error('Download failed');
}

async function pullPhotosFromFirebase() {
  if (typeof FirebaseSync === 'undefined' || !FirebaseSync.isEnabled()) {
    showAlert('Firebase is not connected. Ensure the sync dot is green, then try again.');
    return;
  }

  // Remove the banner nag — the dialog is taking over as the source of truth
  const warn = document.getElementById('photo-integrity-warn');
  if (warn) warn.remove();

  // Show persistent progress dialog (same one used by backup)
  BackupProgress.show();
  const titleEl = document.getElementById('bpTitle');
  if (titleEl) titleEl.textContent = '☁️ Downloading from Firebase';
  BackupProgress.update({ surveyLabel: 'Scanning for photos…', stepLabel: 'Checking Firebase catalogue', percent: 0 });

  const surveys = await getAllSurveys();

  // Build full list of photos-to-download first, so we have a real denominator
  const toDownload = [];  // { meta, vesselName }
  let alreadyHad = 0;
  let catalogueErrors = 0;

  for (const survey of surveys) {
    if (BackupProgress.isCancelled()) break;
    try {
      const snap = await window.fsDb.collection('photos')
        .where('surveyId', '==', survey.id)
        .get();
      for (const doc of snap.docs) {
        const meta = doc.data();
        const local = await getPhotoById(meta.id);
        if (local && local.dataUrl) { alreadyHad++; continue; }
        if (meta.storageRef) toDownload.push({ meta, vesselName: survey.vesselName || 'Unnamed' });
      }
    } catch (err) {
      console.warn(`[Pull] Error pulling catalogue for ${survey.vesselName}:`, err);
      catalogueErrors++;
      BackupProgress.update({ detail: `⚠ Catalogue error for ${survey.vesselName}: ${err.message || err}` });
    }
  }

  if (toDownload.length === 0) {
    BackupProgress.finish({
      title: alreadyHad > 0 ? '✓ Already up to date' : 'Nothing to download',
      subtitle: alreadyHad > 0
        ? `All ${alreadyHad} photos already on this device.`
        : 'No photos found in Firebase. Sync from the device that has them first.',
      success: true
    });
    return;
  }

  const total = toDownload.length;
  BackupProgress.update({
    surveyLabel: `Downloading ${total} photos`,
    stepLabel: `0 of ${total} downloaded · ${alreadyHad} already here`,
    percent: 0
  });

  // Download ONE at a time with memory release between each
  let downloaded = 0;
  const failedPhotos = [];  // { label, vesselName, reason }

  for (const item of toDownload) {
    if (BackupProgress.isCancelled()) break;

    const photoLabel = item.meta.label || item.meta.id;
    BackupProgress.update({
      stepLabel: `${downloaded + 1} of ${total}: ${photoLabel.substring(0, 50)}`,
      percent: Math.round((downloaded / total) * 100)
    });

    try {
      let dataUrl = await _downloadOneFirebasePhoto(item.meta);
      let photo = { ...item.meta, dataUrl };
      dataUrl = null;

      await new Promise((resolve, reject) => {
        const tx = db.transaction(['photos'], 'readwrite');
        const store = tx.objectStore('photos');
        store.put(photo);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      photo = null; // release the whole photo record incl base64

      downloaded++;
      BackupProgress.update({
        detail: `✓ ${item.vesselName} — ${photoLabel}`,
        percent: Math.round((downloaded / total) * 100)
      });

      // Give iOS Safari a moment to reclaim memory between photos. Without
      // this pause, downloading 500+ photos tends to crash the tab.
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`[Pull] Failed photo ${item.meta.id}:`, err);
      const stageTag = err.stage ? `[${err.stage}] ` : '';
      const reason = stageTag + (err.message || String(err));
      failedPhotos.push({ label: photoLabel, vesselName: item.vesselName, reason });
      BackupProgress.update({ detail: `✗ ${item.vesselName} — ${photoLabel}: ${reason}` });
    }
  }

  const cancelled = BackupProgress.isCancelled();
  const remaining = total - downloaded - failedPhotos.length;

  // Build final summary
  let title, subtitle, success;
  if (cancelled) {
    title = '⚠ Download cancelled';
    subtitle = `Downloaded ${downloaded} of ${total} photos · ${remaining} still in Firebase · ${alreadyHad} already here`;
    success = false;
  } else if (failedPhotos.length === 0) {
    title = '✓ Download complete';
    subtitle = `Downloaded ${downloaded} photos · ${alreadyHad} already here`;
    success = true;
  } else if (downloaded > 0) {
    title = '⚠ Download finished with errors';
    subtitle = `Downloaded ${downloaded} · Failed ${failedPhotos.length} · ${alreadyHad} already here. Tap Download again to retry the failed ones.`;
    success = false;
  } else {
    title = '✗ Download failed';
    subtitle = `All ${failedPhotos.length} downloads failed. Check your internet connection and try again.`;
    success = false;
  }

  BackupProgress.finish({ title, subtitle, success });

  // Log failed photos grouped by vessel so Dave can see patterns
  if (failedPhotos.length > 0) {
    const byVessel = {};
    failedPhotos.forEach(f => {
      if (!byVessel[f.vesselName]) byVessel[f.vesselName] = [];
      byVessel[f.vesselName].push(f);
    });
    console.group('[Pull] Failed photos by vessel');
    for (const [vessel, fails] of Object.entries(byVessel)) {
      console.log(`  ${vessel}: ${fails.length} failed`);
      fails.slice(0, 5).forEach(f => console.log(`    - ${f.label}: ${f.reason}`));
    }
    console.groupEnd();
  }

  window._photoWarnDismissed = true;
  if (downloaded > 0) renderHome();
}

// ============================================================================
// SaveStatus — persistent visible save indicator
// ============================================================================
// Shows in the top-right corner of every page. Reports:
//   - Photo count in IndexedDB for the current survey
//   - Time since last data save ("Saved 5s ago")
//   - State (green = saved, amber = saving, red = error)
//
// Hooked into savePhoto, saveSurvey, and autoSaveItemText so it updates
// whenever ANYTHING is persisted to IndexedDB. Updates the "X seconds ago"
// label every 2 seconds via setInterval.
//
// Tap reveals a detail panel with sync status (Firebase / Drive).
// ============================================================================
const SaveStatus = (() => {
  let _lastSaveAt = 0;
  let _state = 'idle';   // idle | saving | saved | error
  let _photoCount = 0;
  let _refreshTimer = null;
  let _pill = null;

  function show() {
    if (_pill && document.body.contains(_pill)) return;
    _pill = document.createElement('button');
    _pill.id = 'saveStatusPill';
    _pill.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top, 0px));right:8px;z-index:1500;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:14px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.96);color:#0f172a;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.12);cursor:pointer;font-family:inherit;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);';
    _pill.innerHTML = '<span id="saveDot" style="width:8px;height:8px;border-radius:50%;background:#9ca3af;display:inline-block;"></span><span id="saveText">Idle</span>';
    _pill.title = 'Save status — tap for sync details';
    _pill.onclick = _showDetailPanel;
    document.body.appendChild(_pill);
    if (!_refreshTimer) {
      _refreshTimer = setInterval(_refresh, 2000);
    }
    _refresh();
  }

  function hide() {
    if (_pill) { _pill.remove(); _pill = null; }
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
  }

  function setPhotoCount(n) {
    _photoCount = n;
    _refresh();
  }

  function markSaving() {
    _state = 'saving';
    _refresh();
  }

  function markSaved() {
    _state = 'saved';
    _lastSaveAt = Date.now();
    _refresh();
  }

  function markError(msg) {
    _state = 'error';
    _refresh();
    if (_pill) _pill.title = 'Save error — ' + (msg || 'unknown') + '. Tap for details.';
  }

  function _refresh() {
    if (!_pill) return;
    const dot = document.getElementById('saveDot');
    const text = document.getElementById('saveText');
    if (!dot || !text) return;

    let dotColor, label;
    if (_state === 'saving') {
      dotColor = '#f59e0b';
      label = 'Saving…';
    } else if (_state === 'error') {
      dotColor = '#dc2626';
      label = 'Save error';
    } else if (_state === 'saved' || _state === 'idle') {
      dotColor = '#16a34a';
      const photos = _photoCount > 0 ? `· ${_photoCount} 📷` : '';
      if (_lastSaveAt === 0) {
        label = `✓ Saved ${photos}`;
      } else {
        const secs = Math.floor((Date.now() - _lastSaveAt) / 1000);
        let when;
        if (secs < 5) when = 'just now';
        else if (secs < 60) when = `${secs}s ago`;
        else if (secs < 3600) when = `${Math.floor(secs / 60)}m ago`;
        else when = `${Math.floor(secs / 3600)}h ago`;
        label = `✓ Saved ${when} ${photos}`.trim();
      }
    }
    dot.style.background = dotColor;
    text.textContent = label;
  }

  function _showDetailPanel() {
    const existing = document.getElementById('saveStatusDetail');
    if (existing) { existing.remove(); return; }

    const firebaseOk = typeof FirebaseSync !== 'undefined' && FirebaseSync.isEnabled();
    const driveOk = typeof DriveBackup !== 'undefined' && DriveBackup.isSignedIn && DriveBackup.isSignedIn();
    const session = (window._backupStats && window._backupStats.session) || 0;
    const fbBacked = (window._backupStats && window._backupStats.firebase) || 0;
    const queued = (window._backupStats && window._backupStats.queued) || 0;

    const overlay = document.createElement('div');
    overlay.id = 'saveStatusDetail';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:flex-start;justify-content:flex-end;padding:60px 8px 0 8px;';
    overlay.innerHTML = `
      <div style="background:white;border-radius:12px;width:100%;max-width:340px;padding:14px 16px;box-shadow:0 8px 24px rgba(0,0,0,0.2);" onclick="event.stopPropagation();">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <strong style="font-size:14px;color:#0f172a;">Save status</strong>
          <button id="ssClose" style="background:none;border:none;font-size:20px;color:#64748b;cursor:pointer;line-height:1;">×</button>
        </div>
        <div style="font-size:13px;line-height:1.7;color:#374151;">
          <div><strong>Local (this device):</strong></div>
          <div style="padding-left:10px;">📷 ${_photoCount} photos in IndexedDB</div>
          <div style="padding-left:10px;">💾 Last data save: ${_lastSaveAt ? new Date(_lastSaveAt).toLocaleTimeString() : 'no saves yet this session'}</div>
          <div style="margin-top:8px;"><strong>Cloud (Firebase):</strong></div>
          <div style="padding-left:10px;">${firebaseOk ? `✓ Connected · ${fbBacked}/${session} this session backed up` : '○ Not connected'}</div>
          ${queued > 0 ? `<div style="padding-left:10px;color:#d97706;">⏳ ${queued} photos queued for upload</div>` : ''}
          <div style="margin-top:8px;"><strong>Cloud (Google Drive):</strong></div>
          <div style="padding-left:10px;">${driveOk ? '✓ Signed in · use 💾 Backup to push' : '○ Not signed in'}</div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;">
          Local saves happen instantly to IndexedDB on this device. Cloud
          backups happen automatically (Firebase) when you pause for 5+ seconds,
          or on demand (Drive backup button).
        </div>
      </div>
    `;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
    const closeBtn = document.getElementById('ssClose');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();
  }

  return { show, hide, markSaving, markSaved, markError, setPhotoCount };
})();

// Wrapper to count photos in IndexedDB for a survey and update the pill
async function refreshSavePillPhotoCount(surveyId) {
  if (!surveyId || typeof db === 'undefined' || !db) return;
  try {
    const count = await new Promise((resolve, reject) => {
      const tx = db.transaction(['photos'], 'readonly');
      const index = tx.objectStore('photos').index('surveyId');
      const req = index.count(IDBKeyRange.only(surveyId));
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
    SaveStatus.setPhotoCount(count);
  } catch (e) { /* swallow — non-essential */ }
}

// Update the backup status badge in the bottom bar
function _updateBackupStatusUI() {
  const badge = document.getElementById('backupStatusBadge');
  if (!badge) return;

  const firebaseOk = typeof FirebaseSync !== 'undefined' && FirebaseSync.isEnabled();
  const driveOk = typeof DriveBackup !== 'undefined' && DriveBackup.isSignedIn && DriveBackup.isSignedIn();
  const total = _backupStats.session;
  const backed = _backupStats.firebase;
  const failed = _backupStats.firebaseFail;

  const queued = _backupStats.queued || 0;

  if (total === 0 && queued === 0) {
    badge.style.display = 'none';
    return;
  }

  badge.style.display = 'inline-flex';

  // Colour: green if all backed up, yellow if some queued, red if none backed up
  if (queued === 0 && backed >= total && firebaseOk) {
    badge.style.background = '#16a34a';
    badge.textContent = `☁️ ${backed}/${total}`;
    badge.title = `All ${total} photos backed up to Firebase${driveOk ? ' + Drive' : ''}`;
  } else if (queued > 0) {
    badge.style.background = '#d97706';
    badge.textContent = `⏳ ${queued} queued`;
    badge.title = `${queued} photos waiting to upload — will sync when online`;
  } else if (backed > 0) {
    badge.style.background = '#d97706';
    badge.textContent = `☁️ ${backed}/${total}`;
    badge.title = `${backed} of ${total} backed up`;
  } else {
    badge.style.background = '#dc2626';
    badge.textContent = `🚨 0/${total}`;
    badge.title = 'No photos backed up! Connect Firebase or Drive.';
  }
}

// Show a visible warning when Firebase backup fails — NOT just a console message
function _showBackupWarning(service, photoLabel) {
  const existing = document.getElementById('backup-warning-bar');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.id = 'backup-warning-bar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:white;padding:10px 16px;font-size:13px;font-weight:600;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
  bar.innerHTML = `⚠️ ${service} backup failed for "${photoLabel}" — photos may not be backed up. Check your connection.
    <button onclick="this.parentElement.remove()" style="margin-left:12px;background:white;color:#dc2626;border:none;border-radius:4px;padding:4px 10px;font-weight:700;cursor:pointer;">Dismiss</button>`;
  document.body.appendChild(bar);

  // Auto-dismiss after 10 seconds
  setTimeout(() => { if (bar.parentElement) bar.remove(); }, 10000);
}

async function getPhotoById(photoId) {
  return new Promise((resolve) => {
    const tx = db.transaction(['photos'], 'readonly');
    const store = tx.objectStore('photos');
    const request = store.get(photoId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function deletePhoto(photoId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['photos'], 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.delete(photoId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ─── Export / Import Surveys ────────────────────────────────────────────────

async function exportSurvey(surveyId) {
  try {
    const survey = await getSurvey(surveyId);
    if (!survey) { showAlert('Survey not found'); return; }

    // Gather all photos for this survey — try index first, then fallback to
    // fetching each photo ID individually (handles corrupted/missing indexes on iOS)
    let photos = await new Promise((resolve) => {
      try {
        const tx = db.transaction(['photos'], 'readonly');
        const store = tx.objectStore('photos');
        const index = store.index('surveyId');
        const range = IDBKeyRange.only(surveyId);
        const results = [];
        index.openCursor(range).onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        index.openCursor(range).onerror = () => resolve([]);
      } catch (e) {
        console.warn('Photo index query failed, will use fallback:', e);
        resolve([]);
      }
    });

    // Fallback: if the index returned nothing, collect all photo IDs referenced
    // in the survey items and fetch each one directly by primary key
    if (photos.length === 0) {
      const photoIds = new Set();
      if (survey.items) {
        for (const item of Object.values(survey.items)) {
          if (item.photos) item.photos.forEach(pid => photoIds.add(pid));
        }
      }
      if (survey.safetyEquipment) {
        for (const eq of survey.safetyEquipment) {
          if (eq.photos) eq.photos.forEach(pid => photoIds.add(pid));
        }
      }
      if (survey.hinPhoto) photoIds.add(survey.hinPhoto);
      if (survey.compliancePhoto) photoIds.add(survey.compliancePhoto);
      if (survey.coverPhoto) photoIds.add(survey.coverPhoto);
      if (survey.tcLicencePhoto) photoIds.add(survey.tcLicencePhoto);

      if (photoIds.size > 0) {
        console.log(`[Export] Index returned 0 photos, fetching ${photoIds.size} by ID…`);
        const fetched = [];
        for (const pid of photoIds) {
          const photo = await getPhotoById(pid);
          if (photo) fetched.push(photo);
        }
        photos = fetched;
        console.log(`[Export] Fetched ${photos.length} of ${photoIds.size} photos by ID`);
      }
    }

    // Build JSON as Blob chunks to avoid "Invalid string length" on iOS Safari.
    // Large base64 photos cause JSON.stringify() to exceed the JS string size limit,
    // so we stringify each photo individually and assemble via Blob (no single huge string).
    const blobParts = [];
    const header = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      survey: survey
    };
    // Write everything except photos, then manually append the photos array
    const headerJson = JSON.stringify(header);
    // Remove trailing } and add ,"photos":[ to start the array
    blobParts.push(headerJson.slice(0, -1) + ',"photos":[');

    for (let i = 0; i < photos.length; i++) {
      if (i > 0) blobParts.push(',');
      blobParts.push(JSON.stringify(photos[i]));
    }
    blobParts.push(']}');

    const blob = new Blob(blobParts, { type: 'application/json' });

    const vesselName = (survey.vesselName || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${vesselName}_${dateStr}.json`;

    // Use Web Share API on iOS/mobile (a.click() download doesn't work in Safari PWA)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Survey: ${survey.vesselName}`,
            files: [file]
          });
          showToast(`Shared: ${filename} (${photos.length} photos)`);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return; // User cancelled
          // Fall through to download approach
        }
      }
    }

    // Fallback: standard download link (works on desktop Chrome)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported: ${filename} (${photos.length} photos)`);
  } catch (err) {
    console.error('Export error:', err);
    showAlert('Export failed: ' + err.message);
  }
}

// Export ALL surveys (one at a time) with photos included
async function exportAllSurveys() {
  try {
    const surveys = await getAllSurveys();
    if (surveys.length === 0) {
      showAlert('No surveys to export.');
      return;
    }

    // Show progress overlay
    const overlay = document.createElement('div');
    overlay.id = 'exportAllOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-family:system-ui;';
    overlay.innerHTML = `
      <div style="background:#1e293b;border-radius:16px;padding:32px;max-width:90%;width:400px;text-align:center;">
        <h2 style="margin:0 0 8px;">📦 Exporting Surveys</h2>
        <p style="color:#94a3b8;margin:0 0 20px;font-size:14px;">Each survey will open the Share sheet so you can save it. Photos are included.</p>
        <div id="exportAllProgress" style="font-size:18px;font-weight:700;margin-bottom:16px;">0 / ${surveys.length}</div>
        <div id="exportAllCurrent" style="font-size:14px;color:#60a5fa;margin-bottom:20px;min-height:20px;"></div>
        <div style="background:#334155;border-radius:8px;height:8px;overflow:hidden;margin-bottom:20px;">
          <div id="exportAllBar" style="height:100%;background:#3b82f6;width:0%;transition:width 0.3s;"></div>
        </div>
        <button id="exportAllCancel" onclick="document.getElementById('exportAllOverlay')?.remove(); window._exportAllCancelled=true;" style="background:#dc2626;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;">Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);
    window._exportAllCancelled = false;

    let exported = 0;
    let failed = 0;
    const failedNames = [];

    for (let i = 0; i < surveys.length; i++) {
      if (window._exportAllCancelled) break;
      const survey = surveys[i];
      const name = survey.vesselName || 'Survey ' + (i + 1);

      // Update progress UI
      const progressEl = document.getElementById('exportAllProgress');
      const currentEl = document.getElementById('exportAllCurrent');
      const barEl = document.getElementById('exportAllBar');
      if (progressEl) progressEl.textContent = `${i} / ${surveys.length}`;
      if (currentEl) currentEl.textContent = `Exporting: ${name}...`;
      if (barEl) barEl.style.width = `${((i) / surveys.length) * 100}%`;

      try {
        // Gather photos for this survey
        const photos = await new Promise((resolve) => {
          const tx = db.transaction(['photos'], 'readonly');
          const store = tx.objectStore('photos');
          const index = store.index('surveyId');
          const range = IDBKeyRange.only(survey.id);
          const results = [];
          index.openCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
        });

        // Build JSON as Blob chunks (avoids "Invalid string length" on iOS)
        const blobParts = [];
        const header = {
          version: 1,
          exportedAt: new Date().toISOString(),
          appVersion: APP_VERSION,
          survey: survey
        };
        const headerJson = JSON.stringify(header);
        blobParts.push(headerJson.slice(0, -1) + ',"photos":[');
        for (let p = 0; p < photos.length; p++) {
          if (p > 0) blobParts.push(',');
          blobParts.push(JSON.stringify(photos[p]));
        }
        blobParts.push(']}');
        const blob = new Blob(blobParts, { type: 'application/json' });

        const vesselName = (survey.vesselName || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `${vesselName}_${dateStr}.json`;

        // Use Web Share API on iOS/mobile
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], filename, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Survey: ${name}`,
              files: [file]
            });
            exported++;
            continue;
          }
        }

        // Fallback: auto-download (desktop Chrome)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        exported++;

        // Small delay between downloads to avoid browser throttling
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        if (err.name === 'AbortError') {
          // User cancelled share sheet — skip this one, keep going
          continue;
        }
        console.error(`Export failed for ${name}:`, err);
        failed++;
        failedNames.push(name);
      }
    }

    // Final progress update
    const progressEl = document.getElementById('exportAllProgress');
    const barEl = document.getElementById('exportAllBar');
    if (progressEl) progressEl.textContent = `${exported} / ${surveys.length}`;
    if (barEl) barEl.style.width = '100%';

    // Remove overlay
    document.getElementById('exportAllOverlay')?.remove();

    // Summary
    if (window._exportAllCancelled) {
      showToast(`Export cancelled. ${exported} of ${surveys.length} surveys saved.`);
    } else if (failed > 0) {
      showAlert(`Exported ${exported} surveys. ${failed} failed: ${failedNames.join(', ')}`);
    } else {
      showToast(`All ${exported} surveys exported with photos! ✓`);
    }
  } catch (err) {
    document.getElementById('exportAllOverlay')?.remove();
    console.error('Export all error:', err);
    showAlert('Export all failed: ' + err.message);
  }
}

async function importSurvey() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.kikisurvey,.json,application/json,*/*';

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.survey || !data.version) {
        await showAlert('This file does not appear to be a valid Kiki Marine survey export.');
        return;
      }

      const survey = data.survey;
      const photos = data.photos || [];

      // Check if survey already exists
      const existing = await getSurvey(survey.id);
      if (existing) {
        const replace = await showConfirm(
          `A survey for "${existing.vesselName || 'Unnamed'}" already exists on this device. Replace it with the imported version?`,
          'Replace', 'Cancel'
        );
        if (!replace) return;
        // Delete existing photos first
        await deleteSurvey(survey.id);
      }

      // Save the survey
      await saveSurvey(survey);

      // Save all photos
      for (const photo of photos) {
        await savePhoto(photo);
      }

      showToast(`Imported: ${survey.vesselName || 'Survey'} (${photos.length} photo${photos.length !== 1 ? 's' : ''})`);
      renderHome();
    } catch (err) {
      console.error('Import error:', err);
      showAlert('Import failed: ' + err.message);
    }
  };

  input.click();
}

function showToast(message) {
  const existing = document.getElementById('toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-msg';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#006699;color:white;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── Backup Reminder Banner ─────────────────────────────────────────────────
let _lastBackupReminder = 0;
function showBackupReminder() {
  // Only show once per hour
  const now = Date.now();
  if (now - _lastBackupReminder < 3600000) return;
  if (document.getElementById('backup-reminder')) return;
  _lastBackupReminder = now;

  const banner = document.createElement('div');
  banner.id = 'backup-reminder';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fef3c7;border-bottom:2px solid #f59e0b;padding:12px 16px;z-index:9998;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#92400e;';
  banner.innerHTML = `
    <span>⚠️ <strong>${_photosSinceLastBackup} photos</strong> taken since last backup. Export now to stay safe.</span>
    <span style="display:flex;gap:8px;">
      <button onclick="if(currentSurveyId){exportSurvey(currentSurveyId);_photosSinceLastBackup=0;document.getElementById('backup-reminder').remove();}" style="padding:6px 14px;background:#f59e0b;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Export Now</button>
      <button onclick="document.getElementById('backup-reminder').remove();" style="padding:6px 10px;background:transparent;border:1px solid #f59e0b;border-radius:6px;font-size:12px;cursor:pointer;color:#92400e;">Dismiss</button>
    </span>`;
  document.body.appendChild(banner);
}

// ─── Photo Integrity Validation (runs on startup) ───────────────────────────
async function validatePhotoIntegrity() {
  try {
    const surveys = await getAllSurveys();
    const warnings = [];

    for (const survey of surveys) {
      const items = survey.items || {};
      let referenced = 0;
      let missing = 0;

      for (const item of Object.values(items)) {
        if (item.photos) {
          for (const pid of item.photos) {
            referenced++;
            const photo = await getPhotoById(pid);
            if (!photo || !photo.dataUrl) missing++;
          }
        }
      }

      if (missing > 0) {
        warnings.push({ name: survey.vesselName || 'Unnamed', id: survey.id, referenced, missing });
      }
    }

    if (warnings.length > 0) {
      console.warn('[Photo Integrity] Missing photos detected:', warnings);
      // Check if user dismissed this warning already this session
      if (window._photoWarnDismissed) return;
      // Show warning on home screen
      setTimeout(() => {
        const homeEl = document.getElementById('homeContent') || document.body;
        const existing = document.getElementById('photo-integrity-warn');
        if (existing) existing.remove();

        const warn = document.createElement('div');
        warn.id = 'photo-integrity-warn';
        warn.style.cssText = 'margin:12px 16px;padding:14px 16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;font-size:13px;color:#92400e;position:relative;';
        const totalMissing = warnings.reduce((s, w) => s + w.missing, 0);
        let html = '<button onclick="document.getElementById(\'photo-integrity-warn\').remove();window._photoWarnDismissed=true;" style="position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;color:#92400e;cursor:pointer;padding:0;line-height:1;">✕</button>';
        html += `<strong>📷 ${totalMissing} photos on another device</strong><br>`;
        html += '<span style="font-size:12px;color:#78716c;">These photos exist in Firebase but haven\'t been downloaded to this device yet.</span><br>';
        for (const w of warnings) {
          html += `<br>• <strong>${w.name}</strong>: ${w.missing} of ${w.referenced}`;
        }
        html += `<br><br><button onclick="pullPhotosFromFirebase()" style="padding:8px 16px;background:#f59e0b;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">☁️ Download from Firebase</button>`;
        html += ` <button onclick="document.getElementById('photo-integrity-warn').remove();window._photoWarnDismissed=true;" style="padding:8px 16px;background:transparent;border:1px solid #fcd34d;border-radius:6px;font-size:13px;cursor:pointer;color:#92400e;">Dismiss</button>`;
        warn.innerHTML = html;
        homeEl.insertBefore(warn, homeEl.firstChild);
      }, 500);
    } else {
      console.log('[Photo Integrity] All photos accounted for ✓');
    }
  } catch (err) {
    console.warn('[Photo Integrity] Validation failed:', err);
  }
}

// Custom modal to replace native alert() — avoids iOS "Suppress dialogs" option
function showAlert(message) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('customModalOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'customModalOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:white;border-radius:14px;padding:20px 24px;max-width:320px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.3);text-align:center;">
        <p style="font-size:15px;color:#333;margin:0 0 18px 0;line-height:1.4;">${message}</p>
        <button onclick="document.getElementById('customModalOverlay').remove();window._modalResolve&&window._modalResolve(true);"
                style="width:100%;padding:12px;background:#006699;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">OK</button>
      </div>`;
    window._modalResolve = resolve;
    document.body.appendChild(overlay);
  });
}

// Custom modal to replace native confirm() — avoids iOS "Suppress dialogs" option
function showConfirm(message, confirmLabel, cancelLabel) {
  return new Promise((resolve) => {
    let overlay = document.getElementById('customModalOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'customModalOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:white;border-radius:14px;padding:20px 24px;max-width:320px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.3);text-align:center;">
        <p style="font-size:15px;color:#333;margin:0 0 18px 0;line-height:1.4;">${message}</p>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('customModalOverlay').remove();window._modalResolve&&window._modalResolve(false);"
                  style="flex:1;padding:12px;background:#e5e7eb;color:#374151;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">${cancelLabel || 'Cancel'}</button>
          <button onclick="document.getElementById('customModalOverlay').remove();window._modalResolve&&window._modalResolve(true);"
                  style="flex:1;padding:12px;background:#dc2626;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">${confirmLabel || 'OK'}</button>
        </div>
      </div>`;
    window._modalResolve = resolve;
    document.body.appendChild(overlay);
  });
}

// ── Bottom Sheet: Rating Selection ──────────────────────────────────────────
function showRatingSheet(itemLabel, categoryName, options) {
  // Close any existing sheet
  const existing = document.getElementById('bottomSheetOverlay');
  if (existing) existing.remove();

  getSurvey(currentSurveyId).then(survey => {
    const itemData = survey.items[itemLabel] || { rating: '', text: '', standards: [], photos: [] };
    const currentRating = itemData.rating || '';
    const safeLabel = itemLabel.replace(/'/g, "\\'");
    const safeCat = categoryName.replace(/'/g, "\\'");

    let optionsHtml = '';
    options.forEach(option => {
      const color = RATING_COLORS[option] || '#6b7280';
      const isSelected = currentRating === option;
      optionsHtml += `
        <div class="sheet-rating-option" onclick="selectRatingFromSheet('${safeLabel}', '${safeCat}', '${option}')">
          <div class="radio-circle ${isSelected ? 'selected' : ''}"></div>
          <div class="rating-dot" style="background:${color};"></div>
          <span><strong>${getRatingShortLabel(option)}</strong>${option !== getRatingShortLabel(option) ? ` — ${option.replace(/^[ABC] - /, '')}` : ''}</span>
        </div>
      `;
    });

    // Add "Clear rating" option if currently rated
    if (currentRating) {
      optionsHtml += `
        <div class="sheet-rating-option" onclick="selectRatingFromSheet('${safeLabel}', '${safeCat}', '')">
          <div class="radio-circle"></div>
          <div class="rating-dot" style="background:#e5e7eb;border:1px solid #d1d5db;"></div>
          <span style="color:#9ca3af;">Clear rating</span>
        </div>
      `;
    }

    const overlay = document.createElement('div');
    overlay.id = 'bottomSheetOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.innerHTML = `
      <div class="bottom-sheet" onclick="event.stopPropagation();">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-title">${itemLabel}</div>
        ${optionsHtml}
      </div>
    `;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  });
}

// Select rating from bottom sheet, then close it
function selectRatingFromSheet(itemLabel, categoryName, rating) {
  const overlay = document.getElementById('bottomSheetOverlay');
  if (overlay) overlay.remove();

  if (rating === '') {
    // Clear rating — same as deselecting
    getSurvey(currentSurveyId).then(survey => {
      if (survey.items[itemLabel]) {
        survey.items[itemLabel].rating = '';
        survey.items[itemLabel].text = '';
        survey.items[itemLabel].standards = [];
        survey.items[itemLabel].variantText = '';
      }
      saveSurvey(survey).then(() => {
        updateCompactItem(survey, itemLabel, categoryName);
        updateCategoryHeader(survey, categoryName);
      });
    });
  } else {
    selectRating(itemLabel, categoryName, rating);
  }
}

// ── Bottom Sheet: Notes / Snippets / Standards ──────────────────────────────
function showNotesSheet(itemLabel, categoryName) {
  const existing = document.getElementById('bottomSheetOverlay');
  if (existing) existing.remove();

  getSurvey(currentSurveyId).then(survey => {
    const itemData = survey.items[itemLabel] || { rating: '', text: '', standards: [], photos: [] };
    const safeLabel = itemLabel.replace(/'/g, "\\'");
    const safeCat = categoryName.replace(/'/g, "\\'");
    const sanitizedLabel = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
    // B-07 bug fix (v2158): saved text from earlier runs may contain raw
    // {if-rudder:...} tokens that were never expanded. Clean them up on
    // display so the textarea never shows raw braces to the surveyor.
    // v2178: apply writing fixups on load so the surveyor immediately sees
    // corrected text (programme→program, present→past tense for known
    // snippet phrases). Persists on next Save Notes via applyWritingFixups
    // in saveNotesFromSheet.
    let initialTextareaText = (typeof applyWritingFixups === 'function')
      ? applyWritingFixups(itemData.text || '')
      : (itemData.text || '');
    if (initialTextareaText && typeof window.expandSnippetTokens === 'function') {
      const ctx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
        ? window.KikiSnippetTokens.contextFromSurvey(survey)
        : { hasRudder: survey.hasRudder !== false, rudderCount: survey.driveLineCount || 1 };
      initialTextareaText = window.expandSnippetTokens(initialTextareaText, ctx);
    }

    let snippetsHtml = '';
    // Cache variants on window so the click handler attached after mount can
    // read them by index without needing to round-trip text through HTML
    // attributes. This avoids all the escaping pitfalls of inline onclick.
    // v2193: "Other" catch-all items get rating + free notes only, no chip
    // picker. These are meant for miscellaneous observations the structured
    // picker can't anticipate. Detection: label ends with "- other",
    // "other features", or "other gauges" (case-insensitive).
    const isOtherItem = /(^|\s)-\s*other(\s+(features|gauges|additional)\b)?$|other\s+features$|other\s+gauges\s+and\s+instrumentation$|other,\s+additional\s+features$/i.test(itemLabel || '');

    let sheetVariants = [];
    if (itemData.rating && !isOtherItem) {
      const baseRating = itemData.rating.charAt(0);
      // v2216: pass full rating so findTextVariants can distinguish
      // "Not applicable" from "Not tested/not verified" (both start with 'N')
      sheetVariants = findTextVariants(categoryName, itemLabel, itemData.rating, survey);
      // v2180/v2182: synthesize chips for "Not applicable" / "Not tested"
      // ratings. The library has no entries for these, but the surveyor still
      // needs a sentence saying the item wasn't fitted / wasn't tested.
      // v2182 adds proper grammar — detects plural vs singular vs uncountable
      // nouns from the label, chooses correct verb (was/were), article (a/an/
      // none), and strips "(s)" tokens for display. "Hull anodes was" becomes
      // "Hull anodes were".
      if (sheetVariants.length === 0 && /^Not\b/i.test(itemData.rating)) {
        const displayLabel = (typeof displayItemLabel === 'function')
          ? displayItemLabel(itemLabel, survey)
          : itemLabel;
        // If the label has "(s)" (e.g. "Fuel tank(s)"), convert to plural
        // form ("Fuel tanks") for N/A sentence rendering. Strip any trailing
        // period so we don't end up with doubled "..".
        const hasTokenPlural = /\(s\)/.test(displayLabel);
        let cleaned = displayLabel
          .replace(/\(s\)/g, 's')           // Fuel tank(s) → Fuel tanks
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\.+$/, '');              // drop trailing periods
        const cleanLower = cleaned.toLowerCase();
        const capFirst = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        // Plural detection:
        //   1. original had "(s)" → plural-capable
        //   2. ends in plural-sounding "s" (not "ss"/"us"/"is"/"as"/"os"/
        //      "lass"/"ness"/"ous")
        //   3. contains a known plural noun
        const pluralNouns = /\b(anodes|stanchions|lifelines|rudders|propellers|shafts|bolts|chainplates|rails|drains|pulleys|belts|hoses|strands|nuts|brackets|connectors|terminals|cables|wires|handles|plugs|seals|switches|controls|batteries|lights|sails|spars|tanks|gauges|instruments|wipers|fixtures|hatches|windows|portholes|mounts|actuators)\b/i;
        const endsInPlural = /s$/i.test(cleanLower) && !/(ss|us|is|as|os|lass|ness|ous|sis)$/i.test(cleanLower);
        const isPlural = hasTokenPlural || pluralNouns.test(cleanLower) || endsInPlural;
        // Uncountable abstract nouns
        const isUncountable = /\b(lighting|plumbing|heating|steering|cooling|charging|wiring|insulation|ventilation|instrumentation|equipment|fouling|trim)\b/i.test(cleanLower);
        // Leading article for "equipped with ..." construction
        const article = /^[aeiou]/i.test(cleanLower) ? 'an' : 'a';

        const synth = [];
        const isNotApplicable = /^Not applicable/i.test(itemData.rating);
        const isNotTested = /^Not tested|not verified/i.test(itemData.rating);

        if (isNotApplicable) {
          // Single canonical phrasing per user preference (v2183):
          //   "No [item] were fitted on this vessel."  (plural)
          //   "No [item] was fitted on this vessel."   (singular/uncountable)
          const verb = isPlural ? 'were' : 'was';
          synth.push({ rating: 'N/A', phase: 'observed', severity: 1,
            text: `No ${cleanLower} ${verb} fitted on this vessel.` });
        } else if (isNotTested) {
          const verbWas = isPlural ? 'were' : 'was';
          const theOrEmpty = isUncountable ? '' : 'The ';
          if (isPlural) {
            synth.push({ rating: 'NT', phase: 'observed', severity: 1,
              text: `The ${cleanLower} were not tested at the time of survey.` });
            synth.push({ rating: 'NT', phase: 'observed', severity: 1,
              text: `Operation of the ${cleanLower} was not verified at the time of survey.` });
            synth.push({ rating: 'NT', phase: 'action', severity: 2,
              text: `Recommend testing the ${cleanLower} under operational conditions.` });
          } else {
            synth.push({ rating: 'NT', phase: 'observed', severity: 1,
              text: `${theOrEmpty}${cleanLower} ${verbWas} not tested at the time of survey.` });
            synth.push({ rating: 'NT', phase: 'observed', severity: 1,
              text: `Operation of ${isUncountable ? '' : 'the '}${cleanLower} was not verified at the time of survey.` });
            synth.push({ rating: 'NT', phase: 'action', severity: 2,
              text: `Recommend testing ${isUncountable ? '' : 'the '}${cleanLower} under operational conditions.` });
          }
        }
        if (synth.length) sheetVariants = synth;
      }
      if (sheetVariants.length > 0) {
        // v2169: expand rudder-gating tokens on a CLONE of each variant
        // BEFORE computing diff highlights. Without this pre-pass, raw
        // `{if-rudder:...}` / `{count:...}` tokens leak into the card
        // preview on no-rudder vessels because the diff-highlighter
        // operates on `v.text` directly. The original `variant.text` is
        // preserved on the real objects for insertion-time expansion.
        const _expandCtx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
          ? window.KikiSnippetTokens.contextFromSurvey(survey)
          : { hasRudder: survey && survey.hasRudder !== false, rudderCount: (survey && survey.driveLineCount) || 1 };
        const sheetVariantsForDisplay = (typeof window.expandSnippetTokens === 'function')
          ? sheetVariants.map(v => Object.assign({}, v, { text: window.expandSnippetTokens(v.text, _expandCtx) }))
          : sheetVariants;
        // v2170: dedupe variants that collapse to identical prose after
        // token expansion. On outdrive / no-rudder vessels a pair of
        // library entries like "C - one rudder" and "C - two rudders"
        // produce the same cleaned text — show just one card, relabel
        // the badge to the base rating letter so it's not misleading.
        const _seenTexts = new Map();
        const _keepIndices = [];
        sheetVariantsForDisplay.forEach((v, i) => {
          const key = (v.text || '').trim();
          if (!_seenTexts.has(key)) {
            _seenTexts.set(key, i);
            _keepIndices.push(i);
          }
        });
        if (_keepIndices.length < sheetVariants.length) {
          sheetVariants = _keepIndices.map(i => sheetVariants[i]);
          const dedupedDisplay = _keepIndices.map(i => {
            const v = sheetVariantsForDisplay[i];
            // Collapse the rating badge to the base letter when the variant
            // label mentions rudder (meaningless on no-rudder vessels).
            if (v.rating && /rudder/i.test(v.rating)) {
              return Object.assign({}, v, { rating: baseRating });
            }
            return v;
          });
          sheetVariantsForDisplay.length = 0;
          dedupedDisplay.forEach(v => sheetVariantsForDisplay.push(v));
        }
        // Pre-compute diff-highlighted display texts for bottom sheet (from
        // the expanded, deduped text so the highlighter operates on clean prose).
        const highlightedTexts = highlightSnippetDiffs(sheetVariantsForDisplay);

        // v2171/v2172/v2173: Sentence-level picker. Break each variant
        // into sentences, dedupe across all variants, render each as a
        // checkbox grouped by phase. The SAMS observation pattern is:
        //   1. What was observed
        //   2. What it means for this vessel
        //   3. What should be done about it
        // Library entries can set `phase: "observed" | "means" | "action"`
        // to classify. Entries without a phase fall into an "observed"
        // bucket by default (heuristic: sentences starting with
        // "Monitor", "Recheck", "Recommend" → action; containing
        // "indicates"/"suggests" → means).
        // v2174/v2176: decompose `{any:...}` AND `{specify:...}` tokens
        // into individual chip-worthy sentences. For `{specify:...}` the
        // surrounding prose (e.g. "The hull was ") is grafted onto each
        // option so each chip reads as a complete sentence.
        //   "The hull was {specify:good|fair|poor}. The paint was fine."
        // →  "The hull was good."
        //    "The hull was fair."
        //    "The hull was poor."
        //    "The paint was fine."
        const _expandAnyOptionsToSentences = (text) => {
          if (!text) return [];
          const out = [];
          // First, for each sentence in the text, detect if it contains a
          // {specify:...} token. If so, graft the surrounding context onto
          // each option. {any:...} is handled separately by pipe-splitting.
          const sentenceChunks = (text || '').split(/(?<=[.!?])\s+/);
          sentenceChunks.forEach(chunk => {
            const trimmed = chunk.trim();
            if (!trimmed) return;

            // Handle {specify:...} by substituting each option back into
            // the sentence, producing one chip per option.
            const specifyMatch = /\{specify:([^{}]*)\}/.exec(trimmed);
            if (specifyMatch) {
              const opts = specifyMatch[1].split('|').map(s => s.replace(/\^[^|]*$/, '').trim()).filter(Boolean);
              opts.forEach(opt => {
                const sentence = trimmed.slice(0, specifyMatch.index) + opt + trimmed.slice(specifyMatch.index + specifyMatch[0].length);
                out.push(sentence.trim());
              });
              return;
            }

            // Handle {any:...} by extracting each option as its own chip.
            const anyMatch = /\{any:([^{}]*)\}/.exec(trimmed);
            if (anyMatch) {
              const before = trimmed.slice(0, anyMatch.index).trim();
              if (before) out.push(before);
              const opts = anyMatch[1].split('|').map(s => s.replace(/\^[^|]*$/, '').trim()).filter(Boolean);
              opts.forEach(o => {
                const sent = /[.!?]$/.test(o) ? o : o + '.';
                out.push(sent);
              });
              const after = trimmed.slice(anyMatch.index + anyMatch[0].length).trim();
              if (after) out.push(after);
              return;
            }

            out.push(trimmed);
          });
          return out;
        };
        const _splitSentences = (s) => {
          // First expand any {any:...} options, then split remaining
          // prose on sentence terminators.
          const chunks = _expandAnyOptionsToSentences(s || '');
          const sentences = [];
          chunks.forEach(chunk => {
            chunk.split(/(?<=[.!?])\s+/).forEach(sent => {
              const trimmed = sent.trim();
              if (trimmed) sentences.push(trimmed);
            });
          });
          return sentences;
        };
        const _classifyPhase = (sent) => {
          if (/^(Monitor|Recheck|Recommend|Haul|Investigate|Professional|Immediate|Schedule)\b/i.test(sent)) return 'action';
          if (/\b(indicates|suggests|consistent|considered|abnormal|warrants|evidences|implies)\b/i.test(sent)) return 'means';
          return 'observed';
        };
        // v2175: rough severity heuristic for non-curated chips so
        // less-severe findings sort to the top within each phase.
        // Lower number = less severe. 1-2 = mild, 3 = default, 4-5 = severe.
        const _estimateSeverity = (sent) => {
          const s = sent.toLowerCase();
          // Severe language
          if (/\b(severe|critical|immediate|significant|structural|compromise|delamination|catastrophic|unsafe|replace immediately|condemn)\b/.test(s)) return 5;
          if (/\b(exposed|gouging|fairing compound|epoxy barrier|rebuild|haul|major)\b/.test(s)) return 4;
          // Moderate
          if (/\b(blistering|cracking|sanded to (the )?(barrier coat|gelcoat)|moisture|elevated)\b/.test(s)) return 3;
          // Light
          if (/\b(worn thin|cosmetic|scrape|ding|scoring|lightly sand|touched up|routine)\b/.test(s)) return 2;
          // No-concerns / baseline
          if (/\b(serviceable|no (?:action|concerns|softness|visible)|consistent with proper condition|within (?:normal|the normal) range|no elevated|no signs)\b/.test(s)) return 1;
          return 3;
        };
        const _pickerSentences = [];      // { text, phase, severity }
        const _pickerSeen = new Map();    // normKey -> index
        sheetVariantsForDisplay.forEach(v => {
          const vPhase = v.phase;
          const vSeverity = typeof v.severity === 'number' ? v.severity : null;
          _splitSentences(v.text).forEach(sent => {
            const normKey = sent.replace(/\s+/g, ' ').toLowerCase();
            if (!_pickerSeen.has(normKey)) {
              _pickerSeen.set(normKey, _pickerSentences.length);
              _pickerSentences.push({
                text: sent,
                phase: vPhase || _classifyPhase(sent),
                severity: vSeverity != null ? vSeverity : _estimateSeverity(sent),
              });
            }
          });
        });
        // v2178: dropped the `always` concept per user preference. Sort:
        //   1. Phase order (observed → means → action)
        //   2. Severity ASCENDING (less severe first, more severe last)
        //   3. Original insertion order to break ties
        const _phaseRank = { observed: 0, means: 1, action: 2 };
        _pickerSentences.forEach((p, i) => { p._origIdx = i; });
        _pickerSentences.sort((a, b) => {
          const pr = (_phaseRank[a.phase] || 0) - (_phaseRank[b.phase] || 0);
          if (pr) return pr;
          const sr = (a.severity || 3) - (b.severity || 3);
          if (sr) return sr;
          return a._origIdx - b._origIdx;
        });
        window._sentencePicker = window._sentencePicker || {};
        window._sentencePicker[sanitizedLabel] = _pickerSentences;

        let sentencePickerHtml = '';
        if (_pickerSentences.length >= 1) {
          const PHASE_LABELS = {
            observed: 'What was observed',
            means: 'What it means for this vessel',
            action: 'What should be done',
          };
          const _ratingBadge = itemData.rating
            ? `<span style="display:inline-block;background:${RATING_COLORS[itemData.rating] || '#6b7280'};color:#fff;font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px;margin-right:8px;">${itemData.rating.charAt(0)}</span>`
            : '';
          sentencePickerHtml = `
            <div class="sheet-section-title" style="padding-top:8px;">
              ${_ratingBadge}Build observation
              <span style="color:#9ca3af;font-weight:400;font-size:11px;margin-left:6px;">tick sentences to compose</span>
            </div>
            <div id="sheet-sentence-picker" style="padding:0;">
          `;
          let lastPhase = null;
          _pickerSentences.forEach((sObj, idx) => {
            const phase = sObj.phase || 'observed';
            if (phase !== lastPhase) {
              sentencePickerHtml += `
                <div style="background:#f3f4f6;color:#374151;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:6px 20px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
                  ${PHASE_LABELS[phase] || phase}
                </div>
              `;
              lastPhase = phase;
            }
            const s = sObj.text;
            // v2184: inline input placeholders:
            //   [insert reading range]  → two number inputs (low–high)
            //   [insert count]          → one small number input
            //   [insert location(s)]    → text input sized for a phrase
            //   [insert location]       → text input
            //   [insert area(s)]        → text input (for damage descriptions)
            let rendered = escSnippet(s).replace(/\[insert reading range\]/gi,
              `<span class="kk-range-slot" style="display:inline-flex;align-items:center;gap:3px;background:#fef9c3;padding:1px 4px;border-radius:4px;">` +
                `<input type="number" class="kk-range-low" placeholder="low" min="0" max="999" title="low reading (0–999 scale)" ` +
                  `oninput="_kkRebuildFromSentencePicker('${sanitizedLabel}')" ` +
                  `onclick="event.preventDefault();event.stopPropagation();" ` +
                  `style="width:56px;padding:2px 4px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">` +
                `<span style="color:#6b7280;font-size:11px;">to</span>` +
                `<input type="number" class="kk-range-high" placeholder="high" min="0" max="999" title="high reading (0–999 scale)" ` +
                  `oninput="_kkRebuildFromSentencePicker('${sanitizedLabel}')" ` +
                  `onclick="event.preventDefault();event.stopPropagation();" ` +
                  `style="width:56px;padding:2px 4px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">` +
              `</span>`)
            .replace(/\[insert count\]/gi,
              `<input type="number" class="kk-count-input" placeholder="#" min="0" max="99" ` +
                `oninput="_kkRebuildFromSentencePicker('${sanitizedLabel}')" ` +
                `onclick="event.preventDefault();event.stopPropagation();" ` +
                `style="width:48px;padding:2px 4px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">`)
            .replace(/\[insert (location\(s\)|locations|location)\]/gi,
              `<input type="text" class="kk-location-input" placeholder="location…" ` +
                `oninput="_kkRebuildFromSentencePicker('${sanitizedLabel}')" ` +
                `onclick="event.preventDefault();event.stopPropagation();" ` +
                `style="width:180px;padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">`)
            .replace(/\[describe area\(s\)\]/gi,
              `<input type="text" class="kk-area-input" placeholder="area(s)…" ` +
                `oninput="_kkRebuildFromSentencePicker('${sanitizedLabel}')" ` +
                `onclick="event.preventDefault();event.stopPropagation();" ` +
                `style="width:180px;padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">`)
            // v2187: [side] placeholder for twin-drive port/starboard/both
            // selection. Renders as a compact select. Only rendered when the
            // survey has >1 drive lines; otherwise the placeholder is dropped
            // (single-drive surveys don't need a side qualifier).
            .replace(/\[side\]/gi, (() => {
              const dc = (survey && survey.driveLineCount) || 1;
              if (dc < 2) return '';
              return `<select class="kk-side-input" ` +
                `onchange="_kkRebuildFromSentencePicker('${sanitizedLabel}')" ` +
                `onclick="event.stopPropagation();" ` +
                `style="padding:2px 4px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">` +
                  `<option value="">— side —</option>` +
                  `<option value="port">port</option>` +
                  `<option value="starboard">starboard</option>` +
                  `<option value="both">both</option>` +
                `</select>`;
            })());
            sentencePickerHtml += `
              <label style="display:flex;gap:10px;padding:10px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:13px;line-height:1.45;">
                <input type="checkbox" class="kk-sentence-chip" data-picker-key="${sanitizedLabel}" data-sentence-idx="${idx}"
                  onchange="_kkRebuildFromSentencePicker('${sanitizedLabel}')"
                  style="margin-top:3px;flex-shrink:0;">
                <span>${rendered}</span>
              </label>
            `;
          });
          sentencePickerHtml += `</div>`;
        }

        // Keyed cache lookup — escape the key for use in inline onclick
        const cacheKey = itemLabel.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        // Collapse the card list when notes already exist for the item.
        // Rationale: once a template is in use, the green-highlighted card
        // just duplicates what's in the textarea + chip strip. The surveyor
        // only needs the cards when first choosing a template. We expose
        // a "Change template ▸" disclosure so they can still switch.
        // Don't collapse if text is trivial (e.g. "none", "n/a", "-") — these are
        // placeholders, not real template content, so the surveyor still needs snippets
        const trimmed = (itemData.text || '').trim().toLowerCase();
        const isTrivialText = ['', 'none', 'n/a', 'na', '-', '--', 'tbd'].includes(trimmed);
        const hasExistingText = !!(itemData.text && itemData.text.trim()) && !isTrivialText;
        const startCollapsed = hasExistingText;
        const toggleLabel = sheetVariants.length === 1
          ? 'Change template'
          : `Change template — ${sheetVariants.length} options`;
        // v2171: if the sentence picker exists, default the full-template
        // card list to COLLAPSED. Surveyor uses picker by default; cards
        // are a disclosure for full-paragraph templates.
        const cardsStartCollapsed = startCollapsed || _pickerSentences.length >= 2;
        const headerText = cardsStartCollapsed
          ? `<span style="color:#6b7280;font-weight:500;">${_pickerSentences.length >= 2 ? 'Full paragraph templates' : toggleLabel}</span> <span id="sheet-snippet-caret" style="color:#9ca3af;">▸</span>`
          : `Quick Insert (${sheetVariants.length} snippet${sheetVariants.length === 1 ? '' : 's'}) <span id="sheet-snippet-caret" style="color:#9ca3af;">▾</span>`;
        snippetsHtml = sentencePickerHtml + `
          <div class="sheet-section-title" id="sheet-snippets-header"
               style="cursor:pointer;user-select:none;"
               onclick="(function(){var l=document.getElementById('sheet-snippets-list');var c=document.getElementById('sheet-snippet-caret');if(!l||!c)return;var open=l.style.display!=='none';l.style.display=open?'none':'block';c.textContent=open?'▸':'▾';})()">
            ${headerText}
          </div>
          <div id="sheet-snippets-list" style="display:${cardsStartCollapsed ? 'none' : 'block'};">
        `;
        sheetVariants.forEach((variant, idx) => {
          // v2170: if the rating label mentions rudder and this vessel has
          // no rudder, collapse the badge to the base letter so it doesn't
          // read "C - one rudder" on an outdrive.
          let ratingBadge = variant.rating || baseRating;
          if (_expandCtx && _expandCtx.hasRudder === false && /rudder/i.test(ratingBadge)) {
            ratingBadge = baseRating;
          }
          // B-07 bug fix (v2158): expand rudder-gating tokens ({if-rudder:},
          // {if-no-rudder:}, {count:rudder|rudders}) BEFORE displaying or
          // comparing card text so raw tokens never leak into the card UI
          // and isActive comparison works against the clean text.
          let variantTextForDisplay = variant.text;
          if (typeof window.expandSnippetTokens === 'function' && survey) {
            const ctx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
              ? window.KikiSnippetTokens.contextFromSurvey(survey)
              : { hasRudder: survey.hasRudder !== false, rudderCount: survey.driveLineCount || 1 };
            variantTextForDisplay = window.expandSnippetTokens(variant.text, ctx);
          }
          const isActive = itemData.text === variantTextForDisplay || itemData.text === variant.text;
          // If the variant still uses other token syntax after rudder expansion,
          // render a clean preview instead of showing raw {count:...}/{any:...}.
          const hasTokens = /\{(count:|specify:|any:|standards\?)/.test(variantTextForDisplay);
          const displayText = hasTokens
            ? escSnippet(renderSnippetPreview(variantTextForDisplay))
            : (highlightedTexts[idx] || escSnippet(variantTextForDisplay));
          snippetsHtml += `
            <button type="button" class="snippet-card-sheet" data-variant-idx="${idx}" style="display:block;width:100%;text-align:left;appearance:none;-webkit-appearance:none;border:none;border-bottom:1px solid #f0f0f0;padding:10px 20px;background:${isActive ? '#d1fae5' : 'white'};${isActive ? 'border-left:4px solid #16a34a;' : ''}cursor:pointer;font:inherit;color:inherit;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none;">
                <span style="font-size:13px;color:#333;line-height:1.5;">${displayText}</span>
                <span style="flex-shrink:0;font-size:10px;background:#e5e7eb;color:#374151;padding:2px 6px;border-radius:4px;">${ratingBadge}</span>
              </div>
            </button>
          `;
        });
        snippetsHtml += `</div>`;
      }
    }
    // Stash variants + category on a module global keyed by item label.
    // The global tap handler (window._sheetCardTap) reads this.
    window._sheetVariantCache = window._sheetVariantCache || {};
    window._sheetVariantCache[itemLabel] = { categoryName: categoryName, variants: sheetVariants };

    // Standards section — collapsed by default. The snippet builder's
    // citation-auto-check already picks the correct standards from the
    // inserted text, so the surveyor normally doesn't need to see or
    // touch these checkboxes. We show a tiny summary line of currently-
    // selected standards instead, and tucking the full checkbox list
    // behind a "manage" disclosure for the rare manual-override case.
    let standardsHtml = '';
    if (itemData.rating && (itemData.rating.startsWith('A') || itemData.rating.startsWith('B'))) {
      const standards = getStandardsForCategory(categoryName, itemData.rating);
      if (standards.length > 0) {
        const selected = (itemData.standards || []).filter(s => standards.includes(s));
        const summaryText = selected.length > 0
          ? selected.join(', ')
          : 'None auto-selected yet — insert a snippet to populate.';
        let checkboxesHtml = '';
        standards.forEach(standard => {
          const isChecked = itemData.standards && itemData.standards.includes(standard);
          checkboxesHtml += `
            <label style="display:flex;align-items:center;gap:10px;padding:8px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer;">
              <input type="checkbox" value="${standard}" ${isChecked ? 'checked' : ''}
                     onchange="updateStandards('${safeLabel}', this)"
                     style="width:18px;height:18px;accent-color:#006699;" />
              <span style="font-size:13px;">${standard}</span>
            </label>
          `;
        });
        standardsHtml = `
          <details style="margin:6px 20px 10px 20px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
            <summary style="padding:8px 12px;font-size:12px;color:#6b7280;cursor:pointer;list-style:none;">
              <strong style="color:#006699;">Auto-selected standards:</strong> ${escapeHtml(summaryText)} <span style="color:#9ca3af;">· tap to manage</span>
            </summary>
            <div style="border-top:1px solid #e5e7eb;">${checkboxesHtml}</div>
          </details>
        `;
      }
    }

    // Mast options for Main mast item in bottom sheet
    let mastOptionsHtml = '';
    if (itemLabel === 'Main mast') {
      const mastStepping = itemData.mastStepping || '';
      const mastTrackType = itemData.mastTrackType || '';
      mastOptionsHtml = `
        <div style="padding:4px 20px 8px 20px;display:flex;gap:10px;">
          <div style="flex:1;">
            <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Mast Stepping</label>
            <select id="sheet-mastStepping" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="saveMastOption('${safeLabel}', 'mastStepping', this.value)">
              <option value="">Select...</option>
              <option value="Deck-stepped" ${mastStepping === 'Deck-stepped' ? 'selected' : ''}>Deck-stepped</option>
              <option value="Keel-stepped" ${mastStepping === 'Keel-stepped' ? 'selected' : ''}>Keel-stepped</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Sail Track Type</label>
            <select id="sheet-mastTrackType" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="saveMastOption('${safeLabel}', 'mastTrackType', this.value)">
              <option value="">Select...</option>
              <option value="In-mast roller furling" ${mastTrackType === 'In-mast roller furling' ? 'selected' : ''}>In-mast roller furling</option>
              <option value="External track" ${mastTrackType === 'External track' ? 'selected' : ''}>External track</option>
              <option value="Internal track" ${mastTrackType === 'Internal track' ? 'selected' : ''}>Internal track</option>
            </select>
          </div>
        </div>
      `;
    }

    // Outdrive options for outdrive items in bottom sheet
    let outdriveOptionsHtml = '';
    if (itemLabel.startsWith('Outdrive') && outdriveDb) {
      const odMake = itemData.outdriveMake || '';
      const odModel = itemData.outdriveModel || '';
      let sheetMakeOpts = '<option value="">Select manufacturer...</option>';
      [...outdriveDb.outdrives].sort((a, b) => a.make.localeCompare(b.make)).forEach(od => {
        sheetMakeOpts += `<option value="${od.make}" ${odMake === od.make ? 'selected' : ''}>${od.make}</option>`;
      });
      sheetMakeOpts += '<option value="__other__">— Other (type manually) —</option>';
      let sheetModelOpts = '<option value="">Select model...</option>';
      if (odMake) {
        const maker = outdriveDb.outdrives.find(od => od.make === odMake);
        if (maker) {
          maker.models.forEach(m => {
            sheetModelOpts += `<option value="${m.model}" ${odModel === m.model ? 'selected' : ''}>${m.model} — ${m.description}</option>`;
          });
          sheetModelOpts += '<option value="__other__">— Other (type manually) —</option>';
        }
      }
      outdriveOptionsHtml = `
        <div style="padding:4px 20px 8px 20px;">
          <div style="margin-bottom:8px;">
            <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Outdrive Manufacturer</label>
            <select id="sheet-outdriveMake" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="onSheetOutdriveMakeChange('${safeLabel}')">
              ${sheetMakeOpts}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Outdrive Model</label>
            <select id="sheet-outdriveModel" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="saveOutdriveOption('${safeLabel}', 'outdriveModel', this.value)">
              ${sheetModelOpts}
            </select>
          </div>
        </div>
      `;
    }

    // Winch options for winch items in bottom sheet
    let winchOptionsHtml = '';
    if (itemLabel.toLowerCase().includes('winch') && winchDb) {
      const wMake = itemData.winchMake || '';
      const wModel = itemData.winchModel || '';
      const isElectric = itemData.winchElectric || false;
      let sheetWMakeOpts = '<option value="">Select manufacturer...</option>';
      [...winchDb.winches].sort((a, b) => a.make.localeCompare(b.make)).forEach(w => {
        sheetWMakeOpts += `<option value="${w.make}" ${wMake === w.make ? 'selected' : ''}>${w.make}</option>`;
      });
      sheetWMakeOpts += '<option value="__other__">— Other (type manually) —</option>';
      let sheetWModelOpts = '<option value="">Select model...</option>';
      if (wMake) {
        const maker = winchDb.winches.find(w => w.make === wMake);
        if (maker) {
          maker.models.forEach(m => {
            sheetWModelOpts += `<option value="${m.model}" ${wModel === m.model ? 'selected' : ''}>${m.model} — ${m.description}</option>`;
          });
          sheetWModelOpts += '<option value="__other__">— Other (type manually) —</option>';
        }
      }
      winchOptionsHtml = `
        <div style="padding:4px 20px 8px 20px;">
          <div style="margin-bottom:8px;">
            <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Winch Manufacturer</label>
            <select id="sheet-winchMake" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="onSheetWinchMakeChange('${safeLabel}')">
              ${sheetWMakeOpts}
            </select>
          </div>
          <div style="margin-bottom:8px;">
            <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:4px;">Winch Model</label>
            <select id="sheet-winchModel" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"
                    onchange="saveWinchOption('${safeLabel}', 'winchModel', this.value)">
              ${sheetWModelOpts}
            </select>
          </div>
          <div>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="sheet-winchElectric" ${isElectric ? 'checked' : ''}
                     onchange="saveWinchOption('${safeLabel}', 'winchElectric', this.checked)"
                     style="width:16px;height:16px;">
              Electric winch
            </label>
          </div>
        </div>
      `;
    }

    // Component builder — check if this item has a builder definition
    let componentBuilderHtml = '';
    // Strip expansion prefixes (drive-line or hull) for builder lookup
    let builderLookupLabel = itemLabel;
    const hullPrefixMatch = itemLabel.match(/^(?:Port hull|Starboard hull|Centre hull)\s*—\s*/);
    const driveLinePrefixMatch = itemLabel.match(/^(?:Port|Starboard|#\d+)\s*—\s*/);
    if (hullPrefixMatch) {
      builderLookupLabel = itemLabel.substring(hullPrefixMatch[0].length);
    } else if (driveLinePrefixMatch) {
      builderLookupLabel = itemLabel.substring(driveLinePrefixMatch[0].length);
    }
    // Exact match first
    let builderKey = COMPONENT_BUILDERS[builderLookupLabel] ? builderLookupLabel : null;
    if (!builderKey) {
      // Normalized match — strip "(s)", punctuation, and collapse whitespace so
      // "Outdrive - (external), corrosion, anodes, propeller, boots and bellows"
      // matches "Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows"
      const normalize = s => s.toLowerCase().replace(/\(s\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      const itemNorm = normalize(builderLookupLabel);
      builderKey = Object.keys(COMPONENT_BUILDERS).find(k => normalize(k) === itemNorm);
    }
    if (!builderKey) {
      // Fallback: prefix-based match (first 12 chars)
      const normalize2 = s => s.toLowerCase().replace(/\(s\)/g, '').trim();
      const itemLower = normalize2(builderLookupLabel);
      builderKey = Object.keys(COMPONENT_BUILDERS).find(k => {
        const kLower = normalize2(k);
        return itemLower.startsWith(kLower.substring(0, Math.min(kLower.length, 12))) ||
               kLower.startsWith(itemLower.substring(0, Math.min(itemLower.length, 12)));
      });
    }
    if (builderKey) {
      // v2190: suppress the component builder when the rating is
      // "Not applicable" / "Not tested" — the chip picker's synthesized
      // N/A or NT chips are the right UX. Builder would show
      // sub-component dropdowns that make no sense for a missing item.
      const isNotRating = /^Not\b/i.test(itemData.rating || '');
      if (!isNotRating) {
        const savedSelections = itemData.componentSelections || {};
        componentBuilderHtml = renderComponentBuilder(builderKey, itemLabel, savedSelections, categoryName, itemData.rating);
        // When a builder is present, hide the quick-insert snippets — the builder replaces them
        snippetsHtml = '';
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'bottomSheetOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.setAttribute('data-item-label', itemLabel);
    // Push a dedicated history entry for the notes sheet. Back / swipe-back
    // consumes this entry (caught by the popstate overlay-guard above) and
    // closes just the sheet — without the entry, the inspection state would
    // be popped and the surveyor dumped to the home screen.
    try { history.pushState({ view: 'notes-sheet', surveyId: currentSurveyId, itemLabel: itemLabel }, ''); } catch (_) {}
    overlay.innerHTML = `
      <div class="bottom-sheet" onclick="event.stopPropagation();">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-title">${itemData.rating ? `<span style="display:inline-block;background:${RATING_COLORS[itemData.rating] || '#6b7280'};color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:6px;margin-right:8px;vertical-align:middle;">${itemData.rating.charAt(0)}</span>` : ''}${displayItemLabel(itemLabel, survey)} — Notes <span style="font-size:10px;color:#9ca3af;font-weight:400;">${APP_VERSION}</span></div>
        ${mastOptionsHtml}
        ${outdriveOptionsHtml}
        ${winchOptionsHtml}
        ${componentBuilderHtml}
        <div style="padding:12px 20px;">
          <textarea id="sheet-text-${sanitizedLabel}" placeholder="Add inspection notes..." style="min-height:80px;width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;font-size:15px;resize:vertical;overflow:hidden;" spellcheck="true" autocorrect="on" autocapitalize="sentences" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';window._mainSheetToneCheck && window._mainSheetToneCheck(this);window._clearSheetCardHighlight && window._clearSheetCardHighlight(this);">${initialTextareaText}</textarea>
          <div id="sheet-text-${sanitizedLabel}-tone" data-main-tone-warning="1" style="display:none;margin-top:6px;padding:8px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;color:#92400e;line-height:1.4;"></div>
          <div id="sheet-text-${sanitizedLabel}-chipstrip" style="display:none;flex-wrap:wrap;gap:6px;margin-top:6px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;"></div>
        </div>
        ${snippetsHtml}
        ${standardsHtml}
        <div class="sheet-btn-row">
          <button onclick="closeNotesSheet('${safeLabel}');" style="background:#e5e7eb;color:#374151;">Cancel</button>
          <button onclick="saveNotesFromSheet('${safeLabel}', '${safeCat}', '${sanitizedLabel}');" style="background:#006699;color:white;">Save Notes</button>
        </div>
      </div>
    `;
    // Capture-phase delegated click handler. Catches taps anywhere inside
    // a snippet card and dispatches to the tap handler — avoids all iOS
    // quirks around inline onclick delivery on non-button elements.
    overlay.addEventListener('click', (ev) => {
      const btn = ev.target.closest && ev.target.closest('.snippet-card-sheet');
      if (btn) {
        const idx = parseInt(btn.dataset.variantIdx, 10);
        if (!isNaN(idx)) {
          window._sheetCardTap(itemLabel, idx, btn);
          return;
        }
      }
      // Only close on direct overlay taps (dark-area outside the sheet)
      if (ev.target !== overlay) return;
      saveNotesFromSheet(itemLabel, categoryName, sanitizedLabel);
    }, true);
    document.body.appendChild(overlay);

    // Attach click handlers to snippet cards — done via JS rather than inline
    // onclick to avoid HTML attribute-escaping issues with quoted text in the
    // variant placeholders JSON.

    // Auto-expand textarea to fit existing content (no scrolling needed)
    const ta = document.getElementById(`sheet-text-${sanitizedLabel}`);
    // B-07 belt-and-suspenders (v2159): if any raw {if-rudder:...} /
    // {if-no-rudder:...} tokens slipped through the initialTextareaText
    // expansion (e.g. stale SW-cached code), clean them up NOW from the
    // DOM value. Also re-saves the cleaned text so the token never
    // re-appears on subsequent opens.
    if (ta && ta.value && /\{if-(?:rudder|no-rudder):/.test(ta.value) &&
        typeof window.expandSnippetTokens === 'function') {
      const ctx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
        ? window.KikiSnippetTokens.contextFromSurvey(survey)
        : { hasRudder: survey.hasRudder !== false, rudderCount: survey.driveLineCount || 1 };
      const cleaned = window.expandSnippetTokens(ta.value, ctx);
      if (cleaned !== ta.value) {
        ta.value = cleaned;
        // Persist the cleaned version so this item's saved state matches.
        if (survey.items[itemLabel]) {
          survey.items[itemLabel].text = cleaned;
          saveSurvey(survey);
        }
      }
    }
    if (ta && ta.value) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
    // Seed tone-warning banner so pre-existing flagged text lights up
    // immediately when the sheet opens — not only on next keystroke.
    if (ta && window._mainSheetToneCheck) {
      window._mainSheetToneCheck(ta);
    }
    // If textarea already has a template+placeholders from a prior session,
    // render the inline builder immediately
    if (ta && ta.dataset && ta.dataset.snippetTemplate) {
      refreshChipStrip(ta);
    }
  });
}

// Global tap handler for bottom-sheet snippet cards. Called from the
// v2171/v2172: rebuild the notes textarea from the checked sentence chips.
// Each chip references sentences[] in window._sentencePicker keyed by
// the sanitized item label. Join checked sentences in their original
// order with a single space. Disabled+checked chips (the `always`
// boilerplate) are always included. [insert reading range] placeholders
// are replaced with the number pair typed into the chip's inline inputs.
window._kkRebuildFromSentencePicker = function(sanitizedLabel) {
  const ta = document.getElementById(`sheet-text-${sanitizedLabel}`);
  const entries = (window._sentencePicker && window._sentencePicker[sanitizedLabel]) || [];
  if (!ta) return;
  const picker = document.getElementById('sheet-sentence-picker');
  if (!picker) return;
  const parts = [];
  picker.querySelectorAll('label').forEach(lbl => {
    const chip = lbl.querySelector('.kk-sentence-chip');
    if (!chip || !chip.checked) return;
    const idx = parseInt(chip.getAttribute('data-sentence-idx'), 10);
    const entry = !isNaN(idx) ? entries[idx] : null;
    if (!entry) return;
    let text = entry.text || '';
    // Interpolate values from inline inputs for this chip.
    const low = (lbl.querySelector('.kk-range-low') || {}).value || '';
    const high = (lbl.querySelector('.kk-range-high') || {}).value || '';
    if (/\[insert reading range\]/i.test(text)) {
      let replacement = '[low to high]';
      if (low && high) replacement = `${low} to ${high}`;
      else if (low) replacement = `${low}`;
      else if (high) replacement = `${high}`;
      text = text.replace(/\[insert reading range\]/gi, replacement);
    }
    const count = (lbl.querySelector('.kk-count-input') || {}).value || '';
    if (/\[insert count\]/i.test(text)) {
      text = text.replace(/\[insert count\]/gi, count || '[insert count]');
    }
    const loc = (lbl.querySelector('.kk-location-input') || {}).value || '';
    if (/\[insert (?:location\(s\)|locations|location)\]/i.test(text)) {
      text = text.replace(/\[insert (?:location\(s\)|locations|location)\]/gi,
        loc || '[insert location]');
    }
    const area = (lbl.querySelector('.kk-area-input') || {}).value || '';
    if (/\[describe area\(s\)\]/i.test(text)) {
      text = text.replace(/\[describe area\(s\)\]/gi,
        area || '[describe area(s)]');
    }
    // [side] → port / starboard / both
    const side = (lbl.querySelector('.kk-side-input') || {}).value || '';
    if (/\[side\]/i.test(text)) {
      if (side === 'both') {
        // "The [side] anodes" / "the [side] lower seals" → "Both anodes" /
        // "both lower seals" (strip preceding article).
        text = text.replace(/\bThe\s+\[side\]\s*/g, 'Both ');
        text = text.replace(/\bthe\s+\[side\]\s*/g, 'both ');
        // Any remaining bare [side] (e.g. "on [side] sides") → "both"
        text = text.replace(/\[side\]\s*/gi, 'both ');
      } else if (side) {
        text = text.replace(/\[side\]\s*/gi, `${side} `);
      }
      // else leave placeholder visible so surveyor sees unfilled field
      // Clean up doubled spaces from the optional space
      text = text.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1');
    }
    parts.push(text);
  });
  ta.value = parts.join(' ');
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
  try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
};

// overlay's delegated click listener. Reads variants from the cache
// stashed by showNotesSheet and dispatches to insertSnippetFromSheet.
window._sheetCardTap = function(itemLabel, idx, cardEl) {
  const entry = (window._sheetVariantCache && window._sheetVariantCache[itemLabel]) || null;
  if (!entry) return;
  const variants = entry.variants || [];
  const categoryName = entry.categoryName || '';
  const variant = variants[idx];
  if (!variant) return;
  const placeholdersJson = variant.placeholders ? JSON.stringify(variant.placeholders) : '';
  insertSnippetFromSheet(itemLabel, categoryName, variant.text, cardEl, placeholdersJson);
};

// Insert snippet from notes sheet into the textarea within the sheet
function insertSnippetFromSheet(itemLabel, categoryName, text, cardEl, placeholdersJson) {
  const sanitizedLabel = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const textarea = document.getElementById(`sheet-text-${sanitizedLabel}`);
  if (textarea) {
    // Determine the DEFAULT subject count. Per-drive-line expansions
    // (Port —, Starboard —, #N —) are about ONE component so default to
    // singular; otherwise use the survey's driveLineCount. The count is NOT
    // pre-resolved — it's stored as a default and the builder renders a
    // Subject toggle the surveyor can flip at any time.
    // {count:sg|pl} tokens are resolved from the survey's driveLineCount
    // here, at insertion. The subject count (how many propellers/shafts the
    // vessel has) is fixed earlier in the survey — it is NOT user-editable
    // from the snippet builder. Per-drive-line expanded items (Port —,
    // Starboard —, #N —) always force singular because each expanded item
    // is about ONE component.
    const survey = window._currentSurveyCache || null;
    // Match drive-line prefixes (Port —, Starboard —) but NOT hull prefixes (Port hull —)
    const sideMatch = itemLabel.match(/^(Port|Starboard|#\d+)\s*—\s*/) && !itemLabel.match(/^(?:Port|Starboard|Centre) hull\s*—/);
    const driveMatch = sideMatch ? itemLabel.match(/^(Port|Starboard|#\d+)\s*—\s*/) : null;
    const isPerDriveLine = !!driveMatch;
    const sideWord = driveMatch ? driveMatch[1] : '';
    const dlc = isPerDriveLine
      ? 1
      : ((survey && survey.driveLineCount) ? parseInt(survey.driveLineCount, 10) || 1 : 1);
    let resolved = resolveCountTokens(text, dlc);
    // Expand rudder-gating tokens ({if-rudder:...}, {if-no-rudder:...})
    // so hull-and-rudder snippets drop the rudder clause on no-rudder
    // vessels (B-07).
    if (typeof window.expandSnippetTokens === 'function' && survey) {
      const ctx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
        ? window.KikiSnippetTokens.contextFromSurvey(survey)
        : { hasRudder: survey.hasRudder !== false, rudderCount: survey.driveLineCount || 1 };
      resolved = window.expandSnippetTokens(resolved, ctx);
    }
    // For per-drive-line expanded items, inject the side qualifier into
    // the first instance of the subject noun so the sentence reads
    // "The port propeller..." instead of "The propeller...".
    if (sideWord) {
      resolved = applySidePrefix(resolved, sideWord);
    }
    // v2162: APPEND behavior — tapping multiple snippet cards composes a
    // multi-sentence observation. Dave's deadline workflow: pick 2-3 cards
    // per item to build richer prose for lawyer review. Empty textarea →
    // insert normally. Non-empty → append with space separator.
    const existing = (textarea.value || '').trim();
    textarea.value = existing ? (existing + ' ' + resolved) : resolved;
    // Reset collected citations (new snippet starts fresh only on first tap)
    if (!existing) setCollectedCitations(textarea, []);
    // Stash placeholders + template of the LAST-tapped snippet (chip-strip
    // builder edits the most recent one).
    textarea.dataset.snippetPlaceholders = placeholdersJson || '';
    textarea.dataset.snippetTemplate = resolved;
    delete textarea.dataset.snippetCount;
    // Auto-expand to fit
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    // Render the inline builder form (which will resolve count based on default)
    refreshChipStrip(textarea);
  }

  // Highlight the selected card
  if (cardEl) {
    // Clear previous highlights in same panel
    const parent = cardEl.parentElement;
    if (parent) {
      parent.querySelectorAll('.snippet-card-sheet').forEach(c => {
        c.style.background = '';
        c.style.borderLeft = '';
      });
    }
    cardEl.style.background = '#d1fae5';
    cardEl.style.borderLeft = '4px solid #16a34a';
  }
  // Auto-collapse the Quick Insert list now that a template has been chosen —
  // the chip strip + textarea are the surveyor's tools from here on, the
  // full paragraph card is just visual noise.
  const _list = document.getElementById('sheet-snippets-list');
  const _caret = document.getElementById('sheet-snippet-caret');
  const _header = document.getElementById('sheet-snippets-header');
  if (_list) _list.style.display = 'none';
  if (_caret) _caret.textContent = '▸';
  if (_header) {
    // Swap the header label to "Change template …" to match the collapsed
    // state the sheet uses on re-open.
    const variants = (window._sheetVariantCache && window._sheetVariantCache[itemLabel] && window._sheetVariantCache[itemLabel].variants) || [];
    const toggleLabel = variants.length === 1
      ? 'Change template'
      : `Change template — ${variants.length} options`;
    _header.innerHTML = `<span style="color:#6b7280;font-weight:500;">${toggleLabel}</span> <span id="sheet-snippet-caret" style="color:#9ca3af;">▸</span>`;
  }
}

// Close the notes bottom sheet and return the surveyor to the specific
// checklist row they were editing — not the top of the inspection view.
// iOS occasionally loses the scroll position of the underlying page while
// the sheet is overlaid, so we scroll the compact-item-wrapper back into
// view explicitly. Used by both Cancel and Save Notes.
function closeNotesSheet(itemLabel) {
  const overlay = document.getElementById('bottomSheetOverlay');
  if (!overlay) return;
  // Route close through history.back() so the popstate overlay-guard is the
  // single source of truth for dismissal. This guarantees the surveyor lands
  // back on the inspection view (not home) no matter what triggered the close
  // — Cancel tap, Save Notes, background tap, or iOS swipe-back.
  const state = history.state;
  if (state && state.view === 'notes-sheet') {
    try { history.back(); return; } catch (_) {}
  }
  // Fallback: no pushed state (shouldn't normally happen) — remove manually
  // and restore scroll position.
  overlay.remove();
  setTimeout(() => {
    if (!itemLabel) return;
    const row = document.querySelector(
      `.compact-item-wrapper[data-item-label="${String(itemLabel).replace(/"/g, '\\"')}"]`
    );
    if (row && typeof row.scrollIntoView === 'function') {
      try {
        row.scrollIntoView({ block: 'center', behavior: 'auto' });
      } catch (e) {
        row.scrollIntoView();
      }
    }
  }, 0);
}
window.closeNotesSheet = closeNotesSheet;

// Save notes from the notes sheet and close
// v2178: on-save text fixups so already-saved observations get cleaned
// up next time the surveyor saves them. Keeps the whole-file migration
// non-destructive — the surveyor has to open and re-save the item.
function applyWritingFixups(text, survey) {
  if (!text) return text;
  let t = text;
  // programme → program (user preference; overrides Canadian-English rule)
  t = t.replace(/\bprogramme\b/g, 'program');
  t = t.replace(/\bProgramme\b/g, 'Program');
  // v2195: vintage → age (user preference, survey-wide)
  t = t.replace(/\bvintage\b/g, 'age');
  t = t.replace(/\bVintage\b/g, 'Age');
  // v2190: strip trial-run references unless the survey header explicitly
  // confirms a limited trial run occurred. Heuristic removals:
  //   "... during the limited trial run."  → drop the "during …" clause
  //   "... under load during the limited trial run."  → "... under load."
  //   Whole sentence "It should be tested under load during the limited
  //   trial run." → drop the sentence (nothing to recommend otherwise).
  // Surveyor can hand-add trial-run text if a trial was done but header
  // setting hasn't been saved yet.
  const seaTrial = survey && String(survey.seaTrial || '').toLowerCase();
  if (seaTrial !== 'yes') {
    // Drop whole sentences that are entirely about trial-run testing
    t = t.replace(/[^.!?]*\bduring (?:the )?(?:limited )?trial run[^.!?]*[.!?]\s*/gi, '');
    // In-sentence cleanups for cases the regex above didn't catch
    t = t.replace(/\s+during (?:the )?(?:limited )?trial run/gi, '');
    t = t.replace(/\s+on (?:the )?(?:limited )?trial run/gi, '');
    // Collapse any doubled spaces left behind
    t = t.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
  }
  // Present-tense → past-tense phrases from the curated library rewrite.
  // These ONLY match literal sentence fragments used in snippets, so they
  // don't false-match free-typed prose.
  const rewrites = [
    ['The hull is suitable for continued use', 'The hull was suitable for continued use'],
    ['The damage is cosmetic and not structurally concerning', 'The damage was cosmetic and not structurally concerning'],
    ['The findings are localized and limited in extent', 'The findings were localized and limited in extent'],
    ['These findings are consistent with typical wear', 'These findings were consistent with typical wear'],
    ['These readings are not considered abnormal', 'These readings were not considered abnormal'],
    ['The readings fall within the normal range', 'The readings fell within the normal range'],
    ['These readings warrant monitoring', 'These readings warranted monitoring'],
    ['These findings suggest early-stage moisture absorption', 'These findings suggested early-stage moisture absorption'],
    ['This indicates severe and widespread elevated conductivity', 'This indicated severe and widespread elevated conductivity'],
    ['The extent of the readings is consistent with structural compromise', 'The extent of the readings was consistent with structural compromise'],
    ['These findings are consistent with significant moisture ingress', 'These findings were consistent with significant moisture ingress'],
    ['The cosmetic wear does not impact structural integrity', 'The cosmetic wear did not impact structural integrity'],
    ['The coating system is providing effective protection', 'The coating system was providing effective protection'],
    ['The findings are consistent with normal seasonal wear', 'The findings were consistent with normal seasonal wear'],
    ['The hull is at risk of osmotic damage', 'The hull was at risk of osmotic damage'],
  ];
  rewrites.forEach(([from, to]) => { t = t.split(from).join(to); });
  return t;
}

function saveNotesFromSheet(itemLabel, categoryName, sanitizedLabel) {
  const textarea = document.getElementById(`sheet-text-${sanitizedLabel}`);
  if (!textarea) return;
  // Expand any {standards?...} block with collected citations before saving
  const finalized = (typeof finalizeSnippetText === 'function') ? finalizeSnippetText(textarea) : textarea.value;
  const newText = applyWritingFixups(finalized.trim());

  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].text = newText;
    saveSurvey(survey).then(() => {
      updateCompactItem(survey, itemLabel, categoryName);
      // Dismiss overlay AFTER the compact item is re-rendered so scroll
      // position can find the row that was just updated.
      closeNotesSheet(itemLabel);
    });
  });
}

// ── Bottom Sheet: Media / Photos ────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────
// Photo import — three paths that share one processing helper:
//   1. Camera (openBatchCamera) — existing live-capture flow
//   2. Photo library picker (pickPhotoLibraryForItem) — images from Photos
//   3. File picker (pickFilesForItem) — images from Files / iCloud Drive
//   Plus drag-and-drop onto .compact-item-wrapper (setupChecklistDragDrop)
// All non-camera paths funnel through attachPhotosToItem() so a future
// change to the save pipeline only needs to happen once.
// ───────────────────────────────────────────────────────────────────────────
// Load heic2any (~300 KB) on demand the first time a HEIC file shows up.
// iPhone and Mac Photos default to HEIC and Chrome can't decode it in <img>.
// Cached result is re-used across imports.
let _heic2anyPromise = null;
function loadHeic2any() {
  if (window.heic2any) return Promise.resolve(window.heic2any);
  if (_heic2anyPromise) return _heic2anyPromise;
  _heic2anyPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
    s.async = true;
    s.onload = () => resolve(window.heic2any);
    s.onerror = () => { _heic2anyPromise = null; reject(new Error('heic2any failed to load')); };
    document.head.appendChild(s);
  });
  return _heic2anyPromise;
}

function isHeicFile(file) {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/heic' || t === 'image/heif' || t === 'image/heic-sequence' || t === 'image/heif-sequence') return true;
  const n = (file.name || '').toLowerCase();
  return /\.(heic|heif)$/.test(n);
}

// Convert a HEIC File/Blob to a JPEG dataUrl. Returns null on failure.
async function heicToJpegDataUrl(file) {
  try {
    const heic2any = await loadHeic2any();
    const jpegBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const blob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('heicToJpegDataUrl failed:', err);
    return null;
  }
}

async function attachPhotosToItem(itemLabel, fileList) {
  // Accept anything with image/* mime OR a .heic/.heif filename (some browsers
  // report empty mime for HEIC dragged in from Finder).
  const files = Array.from(fileList || []).filter(f => {
    if (!f) return false;
    if (f.type && f.type.startsWith('image/')) return true;
    return /\.(heic|heif)$/i.test(f.name || '');
  });
  if (files.length === 0) {
    showToast('No image files selected');
    return 0;
  }

  const heicCount = files.filter(isHeicFile).length;
  if (heicCount > 0) {
    showToast(`Converting ${heicCount} HEIC photo${heicCount === 1 ? '' : 's'}…`);
  } else if (files.length > 1) {
    showToast(`Saving ${files.length} photos…`);
  }

  let saved = 0;
  let heicFailed = 0;
  for (const file of files) {
    await new Promise(async (resolve) => {
      try {
        let dataUrl = null;
        if (isHeicFile(file)) {
          dataUrl = await heicToJpegDataUrl(file);
          if (!dataUrl) { heicFailed++; resolve(); return; }
        } else {
          dataUrl = await new Promise((res) => {
            const reader = new FileReader();
            reader.onload = (ev) => res(ev.target.result);
            reader.onerror = () => res(null);
            reader.readAsDataURL(file);
          });
          if (!dataUrl) { resolve(); return; }
        }

        const stamped = (typeof addDateStampToPhoto === 'function')
          ? await addDateStampToPhoto(dataUrl)
          : dataUrl;

        // Final guard: never save a non-renderable format to IndexedDB.
        // addDateStampToPhoto returns the ORIGINAL dataUrl if the canvas
        // path fails, so we might still have HEIC here. Reject it explicitly.
        if (!/^data:image\/(jpeg|jpg|png|webp|gif)[;,]/i.test(stamped)) {
          console.error('attachPhotosToItem: refusing to save non-renderable format', stamped.substring(0, 40));
          heicFailed++;
          resolve();
          return;
        }

        const photoId = `${currentSurveyId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const photo = {
          id: photoId,
          surveyId: currentSurveyId,
          itemLabel: itemLabel,
          dataUrl: stamped,
          annotated: false,
          createdAt: new Date().toISOString()
        };
        await savePhoto(photo);
        const survey = await getSurvey(currentSurveyId);
        if (!survey.items[itemLabel]) {
          survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
        }
        if (!Array.isArray(survey.items[itemLabel].photos)) {
          survey.items[itemLabel].photos = [];
        }
        survey.items[itemLabel].photos.push(photoId);
        await saveSurvey(survey);
        saved++;
      } catch (err) {
        console.error('attachPhotosToItem error:', err);
      }
      resolve();
    });
  }

  // Refresh the compact card so the photo count / thumbnails update.
  // v2196: also refresh the area-photo grid if this label has one,
  // so imports into cockpit/deck/etc. photo sections show immediately.
  try {
    const survey = await getSurvey(currentSurveyId);
    updateCompactItem(survey, itemLabel, '');
    if (typeof refreshAreaPhotoGrid === 'function') {
      const sanitized = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
      if (document.getElementById(`area-photo-wrap-${sanitized}`)) {
        refreshAreaPhotoGrid(survey, itemLabel);
      }
    }
  } catch (_) {}

  if (heicFailed > 0 && saved === 0) {
    showToast(`Could not convert ${heicFailed} HEIC photo${heicFailed === 1 ? '' : 's'} — check network and retry`);
  } else if (heicFailed > 0) {
    showToast(`Attached ${saved} photo${saved === 1 ? '' : 's'} • ${heicFailed} HEIC failed`);
  } else {
    showToast(`Attached ${saved} photo${saved === 1 ? '' : 's'}`);
  }
  return saved;
}

// Single "Import photos" picker — covers Photo Library AND Files app.
// accept=image/* without capture on iOS opens the library/files chooser.
// Multi-file select is enabled so Dave can pick a batch at once.
function importPhotosForItem(itemLabel) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = () => attachPhotosToItem(itemLabel, input.files);
  if (typeof setCameraActive === 'function') setCameraActive(true);
  input.click();
}

// Sortable thumbnails in the media sheet — reorder photos within an item
// by dragging one thumbnail onto another. Reorder persists in IndexedDB.
function setupPhotoSortable(gridEl, itemLabel) {
  if (!gridEl) return;
  let dragIdx = -1;
  gridEl.querySelectorAll('[data-photo-idx]').forEach(thumb => {
    thumb.setAttribute('draggable', 'true');
    thumb.addEventListener('dragstart', (e) => {
      dragIdx = parseInt(thumb.getAttribute('data-photo-idx'), 10);
      thumb.style.opacity = '0.5';
      try { e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
    });
    thumb.addEventListener('dragend', () => { thumb.style.opacity = ''; });
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
      thumb.style.outline = '2px solid #006699';
    });
    thumb.addEventListener('dragleave', () => { thumb.style.outline = ''; });
    thumb.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      thumb.style.outline = '';
      const dropIdx = parseInt(thumb.getAttribute('data-photo-idx'), 10);
      if (dragIdx < 0 || dragIdx === dropIdx) return;
      const survey = await getSurvey(currentSurveyId);
      const arr = (survey.items[itemLabel] && survey.items[itemLabel].photos) || [];
      if (dragIdx >= arr.length || dropIdx >= arr.length) return;
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(dropIdx, 0, moved);
      survey.items[itemLabel].photos = arr;
      await saveSurvey(survey);
      // Re-render the media sheet to reflect new order
      const existingSheet = document.getElementById('bottomSheetOverlay');
      if (existingSheet) existingSheet.remove();
      showMediaSheet(itemLabel, (existingSheet && existingSheet.dataset && existingSheet.dataset.categoryName) || '');
    });
  });
}

// Attach drag-drop handlers to the inspection app. Uses event delegation
// so items added after render (hull expansion, drive-line expansion) work
// without re-wiring.
function setupChecklistDragDrop() {
  const app = document.getElementById('app');
  if (!app || app.dataset.dragDropWired === 'true') return;
  app.dataset.dragDropWired = 'true';

  let lastTarget = null;

  app.addEventListener('dragover', (e) => {
    const wrapper = e.target && e.target.closest ? e.target.closest('.compact-item-wrapper') : null;
    if (!wrapper) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    if (lastTarget !== wrapper) {
      if (lastTarget) lastTarget.classList.remove('drag-target');
      wrapper.classList.add('drag-target');
      lastTarget = wrapper;
    }
  });

  app.addEventListener('dragleave', (e) => {
    const wrapper = e.target && e.target.closest ? e.target.closest('.compact-item-wrapper') : null;
    if (!wrapper) return;
    if (!e.relatedTarget || !wrapper.contains(e.relatedTarget)) {
      wrapper.classList.remove('drag-target');
      if (lastTarget === wrapper) lastTarget = null;
    }
  });

  app.addEventListener('drop', async (e) => {
    const wrapper = e.target && e.target.closest ? e.target.closest('.compact-item-wrapper') : null;
    if (!wrapper) return;
    e.preventDefault();
    wrapper.classList.remove('drag-target');
    lastTarget = null;
    const itemLabel = wrapper.getAttribute('data-item-label');
    if (!itemLabel) return;
    const files = (e.dataTransfer && e.dataTransfer.files) || [];
    if (files.length === 0) return;
    await attachPhotosToItem(itemLabel, files);
  });

  // Prevent the browser from navigating when a file is dropped outside any
  // valid target (e.g. dragged over a survey but released between cards).
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!e.target || !e.target.closest || !e.target.closest('.compact-item-wrapper')) {
      e.preventDefault();
    }
  });
}

function showMediaSheet(itemLabel, categoryName) {
  const existing = document.getElementById('bottomSheetOverlay');
  if (existing) existing.remove();

  getSurvey(currentSurveyId).then(survey => {
    const itemData = survey.items[itemLabel] || { rating: '', text: '', standards: [], photos: [] };
    const safeLabel = itemLabel.replace(/'/g, "\\'");
    const safeCat = categoryName.replace(/'/g, "\\'");
    const photoCount = (itemData.photos || []).length;

    let photosHtml = '';
    if (itemData.photos && itemData.photos.length > 0) {
      photosHtml = '<div id="sheet-photo-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 20px;">';
      (itemData.photos || []).forEach((photoId, idx) => {
        photosHtml += `
          <img id="sheet-thumb-${photoId}" src="" data-photo-idx="${idx}"
               title="Drag to reorder \u2022 Tap to edit"
               style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;"
               onclick="showPhotoActionOverlay('${photoId}', '${safeLabel}', '${safeCat}')" />
        `;
      });
      photosHtml += '</div>';
      if (itemData.photos.length > 1) {
        photosHtml += '<div style="font-size:11px;color:#9ca3af;padding:0 20px 8px 20px;text-align:center;">Drag a photo onto another to reorder \u2022 Tap a photo to edit</div>';
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'bottomSheetOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.dataset.categoryName = categoryName || '';
    overlay.innerHTML = `
      <div class="bottom-sheet" onclick="event.stopPropagation();">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-title">${itemLabel} \u2014 Photos (${photoCount})</div>
        ${photosHtml}
        <div style="padding:12px 20px;display:flex;flex-direction:column;gap:10px;">
          <button type="button"
                  onclick="document.getElementById('bottomSheetOverlay').remove(); openBatchCamera('${safeLabel}');"
                  style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#006699;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;">
            \ud83d\udcf7 Take photos
          </button>
          <button type="button"
                  onclick="document.getElementById('bottomSheetOverlay').remove(); importPhotosForItem('${safeLabel}');"
                  style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:white;color:#006699;border:2px solid #006699;border-radius:10px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;">
            \ud83d\uddbc\ufe0f Import photos from library / files
          </button>
          <div style="font-size:11px;color:#9ca3af;text-align:center;margin-top:-2px;">Both buttons support selecting multiple photos at once. On desktop, you can also drag photo files directly onto this item's card.</div>
        </div>
        <div class="sheet-btn-row">
          <button onclick="document.getElementById('bottomSheetOverlay').remove();" style="background:#006699;color:white;">Done</button>
        </div>
      </div>
    `;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);

    // Load existing photo thumbnails
    if (itemData.photos && itemData.photos.length > 0) {
      itemData.photos.forEach(photoId => {
        getPhotoById(photoId).then(photo => {
          if (photo) {
            const img = document.getElementById(`sheet-thumb-${photoId}`);
            if (img) img.src = photo.dataUrl;
          }
        });
      });
      // Wire drag-to-reorder on the thumbnail grid (v2162)
      const grid = document.getElementById('sheet-photo-grid');
      if (grid) setupPhotoSortable(grid, itemLabel);
    }
  });
}

// Full-screen photo view with Edit / Move / Delete / Close actions + prev/next navigation.
// Opens when the user taps a thumbnail in the media sheet grid. Replaces the
// old inline red × and Move ↗ buttons with a clean lightbox-style overlay.
async function showPhotoActionOverlay(photoId, itemLabel, categoryName) {
  const photo = await getPhotoById(photoId);
  if (!photo) return;

  // Get all photos for this item so we can add prev/next navigation
  const survey = await getSurvey(currentSurveyId);
  const itemData = survey && survey.items ? survey.items[itemLabel] : null;
  const allPhotoIds = (itemData && itemData.photos) ? itemData.photos : [photoId];
  let currentIdx = allPhotoIds.indexOf(photoId);
  if (currentIdx < 0) currentIdx = 0;
  const totalPhotos = allPhotoIds.length;

  const overlay = document.createElement('div');
  overlay.id = 'photoActionOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;padding-top:calc(14px + env(safe-area-inset-top));">
      <div id="pao-counter" style="color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;">${totalPhotos > 1 ? `${currentIdx + 1} of ${totalPhotos}` : ''}</div>
      <button id="pao-close" aria-label="Close"
              style="background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:8px;width:44px;height:44px;font-size:22px;font-weight:700;cursor:pointer;">✕</button>
    </div>
    <div style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;padding:0 4px;overflow:hidden;position:relative;">
      ${totalPhotos > 1 ? `<button id="pao-prev" aria-label="Previous photo"
              style="position:absolute;left:4px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:22px;font-weight:700;cursor:pointer;z-index:2;backdrop-filter:blur(4px);${currentIdx === 0 ? 'opacity:0.3;pointer-events:none;' : ''}">‹</button>` : ''}
      <img id="pao-img" src="" style="max-width:calc(100% - ${totalPhotos > 1 ? '80px' : '0px'});max-height:100%;object-fit:contain;border-radius:8px;transition:opacity 0.2s;">
      ${totalPhotos > 1 ? `<button id="pao-next" aria-label="Next photo"
              style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:22px;font-weight:700;cursor:pointer;z-index:2;backdrop-filter:blur(4px);${currentIdx >= totalPhotos - 1 ? 'opacity:0.3;pointer-events:none;' : ''}">›</button>` : ''}
    </div>
    <div style="flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:16px 18px;padding-bottom:calc(16px + env(safe-area-inset-bottom));">
      <button id="pao-edit"
              style="background:#006699;color:#fff;border:none;border-radius:10px;padding:14px 0;font-size:15px;font-weight:700;cursor:pointer;min-height:52px;">✏️ Edit</button>
      <button id="pao-move"
              style="background:#0369a1;color:#fff;border:none;border-radius:10px;padding:14px 0;font-size:15px;font-weight:700;cursor:pointer;min-height:52px;">↗ Move</button>
      <button id="pao-delete"
              style="background:#64748b;color:#fff;border:none;border-radius:10px;padding:14px 0;font-size:15px;font-weight:700;cursor:pointer;min-height:52px;">🗑 Delete</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('pao-img').src = photo.dataUrl;

  // Navigation state
  let _paoCurrentIdx = currentIdx;
  let _paoCurrentPhotoId = photoId;

  // Navigate to a photo by index
  async function _paoGoTo(idx) {
    if (idx < 0 || idx >= totalPhotos) return;
    _paoCurrentIdx = idx;
    _paoCurrentPhotoId = allPhotoIds[idx];
    const p = await getPhotoById(_paoCurrentPhotoId);
    const img = document.getElementById('pao-img');
    if (img && p) {
      img.style.opacity = '0.3';
      setTimeout(() => { img.src = p.dataUrl; img.style.opacity = '1'; }, 100);
    }
    // Update counter
    const counter = document.getElementById('pao-counter');
    if (counter) counter.textContent = `${idx + 1} of ${totalPhotos}`;
    // Update arrow states
    const prev = document.getElementById('pao-prev');
    const next = document.getElementById('pao-next');
    if (prev) { prev.style.opacity = idx === 0 ? '0.3' : '1'; prev.style.pointerEvents = idx === 0 ? 'none' : 'auto'; }
    if (next) { next.style.opacity = idx >= totalPhotos - 1 ? '0.3' : '1'; next.style.pointerEvents = idx >= totalPhotos - 1 ? 'none' : 'auto'; }
  }

  // Wire up prev/next buttons
  const prevBtn = document.getElementById('pao-prev');
  const nextBtn = document.getElementById('pao-next');
  if (prevBtn) prevBtn.onclick = () => _paoGoTo(_paoCurrentIdx - 1);
  if (nextBtn) nextBtn.onclick = () => _paoGoTo(_paoCurrentIdx + 1);

  // Swipe support for mobile
  let _paoTouchStartX = 0;
  const imgArea = document.getElementById('pao-img');
  if (imgArea && totalPhotos > 1) {
    imgArea.parentElement.addEventListener('touchstart', (e) => { _paoTouchStartX = e.touches[0].clientX; }, { passive: true });
    imgArea.parentElement.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - _paoTouchStartX;
      if (Math.abs(dx) > 60) { // minimum swipe distance
        if (dx < 0) _paoGoTo(_paoCurrentIdx + 1); // swipe left = next
        else _paoGoTo(_paoCurrentIdx - 1); // swipe right = prev
      }
    }, { passive: true });
  }

  const close = () => {
    const el = document.getElementById('photoActionOverlay');
    if (el) el.remove();
  };

  document.getElementById('pao-close').onclick = close;
  document.getElementById('pao-edit').onclick = () => {
    const pid = _paoCurrentPhotoId;
    close();
    editSavedPhoto(pid, itemLabel);
  };
  document.getElementById('pao-move').onclick = () => {
    const pid = _paoCurrentPhotoId;
    close();
    movePhotoFromSheet(pid, itemLabel, categoryName);
  };
  document.getElementById('pao-delete').onclick = async () => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    const pid = _paoCurrentPhotoId;
    close();
    await deletePhotoFromSheet(pid, itemLabel, categoryName);
  };
}
window.showPhotoActionOverlay = showPhotoActionOverlay;

// Capture photo from media sheet, then refresh the sheet
async function capturePhotoFromSheet(itemLabel, categoryName, event) {
  await capturePhoto(itemLabel, event);
  // Refresh the media sheet after capture completes to show new photos
  showMediaSheet(itemLabel, categoryName);
}

// Delete photo from media sheet and refresh
function deletePhotoFromSheet(photoId, itemLabel, categoryName) {
  deletePhotoAndRefresh(photoId, itemLabel);
  // Refresh media sheet
  setTimeout(() => {
    showMediaSheet(itemLabel, categoryName);
  }, 300);
}

// Move photo from one checklist item to another — shows a searchable picker
function movePhotoFromSheet(photoId, sourceItemLabel, sourceCategoryName) {
  // Build a list of all checklist items grouped by category
  getSurvey(currentSurveyId).then(survey => {
    const template = surveyTemplate || [];
    const allItems = [];
    const groups = []; // preserve template order
    template.forEach(cat => {
      if (!cat.items) return;
      const group = { category: cat.category, items: [] };
      cat.items.forEach(item => {
        const label = typeof item === 'string' ? item : item.label;
        if (label === sourceItemLabel) return; // skip current item
        allItems.push({ label: label, category: cat.category });
        group.items.push(label);
      });
      if (group.items.length) groups.push(group);
    });
    // Also include any items already in the survey that might not be in the template
    const otherGroup = { category: '(Other)', items: [] };
    for (const label in survey.items) {
      if (label === sourceItemLabel) continue;
      if (!allItems.find(i => i.label === label)) {
        allItems.push({ label: label, category: '(Other)' });
        otherGroup.items.push(label);
      }
    }
    if (otherGroup.items.length) groups.push(otherGroup);

    // Sort all items alphabetically (flat list, no category grouping)
    allItems.sort((a, b) => a.label.localeCompare(b.label));

    showMovePhotoPicker(photoId, sourceItemLabel, sourceCategoryName, allItems, groups, survey);
  });
}

function showMovePhotoPicker(photoId, sourceItemLabel, sourceCategoryName, allItems, groups, survey) {
  // Remove existing picker if any
  const existing = document.getElementById('movePhotoPickerOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'movePhotoPickerOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:10002;display:flex;align-items:flex-end;justify-content:center;';

  // Escape HTML for option text
  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // Flat alphabetical list (allItems already sorted)
  let optionsHtml = '';
  allItems.forEach((item, idx) => {
    optionsHtml += `<option value="${idx}">${esc(item.label)}</option>`;
  });

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px 16px 0 0;width:100%;max-width:560px;display:flex;flex-direction:column;box-shadow:0 -6px 24px rgba(0,0,0,0.25);padding-bottom:calc(16px + env(safe-area-inset-bottom));" onclick="event.stopPropagation();">
      <div style="padding:18px 20px 8px;font-weight:700;font-size:17px;color:#006699;">Move photo to…</div>
      <div style="padding:4px 20px 8px;font-size:12px;color:#6b7280;">From: ${esc(sourceItemLabel)}</div>
      <div style="padding:8px 20px 4px;">
        <select id="movePhotoSelect" size="1" style="width:100%;padding:14px 12px;border:2px solid #006699;border-radius:10px;font-size:16px;font-weight:600;color:#006699;background:white;box-sizing:border-box;-webkit-appearance:menulist;appearance:menulist;">
          <option value="" disabled selected>— Choose destination —</option>
          ${optionsHtml}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 20px 6px;">
        <button onclick="document.getElementById('movePhotoPickerOverlay').remove();" style="background:#64748b;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Cancel</button>
        <button id="movePhotoApply" style="background:#006699;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Move</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);

  // Store allItems globally so executeMovePhoto can access it
  window._movePhotoItems = allItems;

  const sel = document.getElementById('movePhotoSelect');
  const apply = document.getElementById('movePhotoApply');
  apply.addEventListener('click', () => {
    const idx = parseInt(sel.value, 10);
    if (Number.isNaN(idx)) {
      showToast('Pick a destination first');
      return;
    }
    executeMovePhoto(photoId, sourceItemLabel, sourceCategoryName, idx);
  });
}

async function executeMovePhoto(photoId, sourceItemLabel, sourceCategoryName, targetIdx) {
  const target = window._movePhotoItems[targetIdx];
  if (!target) return;

  const survey = await getSurvey(currentSurveyId);

  // Remove photo from source item
  if (survey.items[sourceItemLabel] && survey.items[sourceItemLabel].photos) {
    survey.items[sourceItemLabel].photos = survey.items[sourceItemLabel].photos.filter(id => id !== photoId);
  }

  // Add photo to target item
  if (!survey.items[target.label]) {
    survey.items[target.label] = { rating: '', text: '', standards: [], photos: [] };
  }
  if (!survey.items[target.label].photos) {
    survey.items[target.label].photos = [];
  }
  survey.items[target.label].photos.push(photoId);

  // Update the photo record's itemLabel in IndexedDB
  const photo = await getPhotoById(photoId);
  if (photo) {
    photo.itemLabel = target.label;
    await savePhoto(photo);
  }

  await saveSurvey(survey);

  // Clean up picker
  const picker = document.getElementById('movePhotoPickerOverlay');
  if (picker) picker.remove();

  // Refresh both items in the inspection view
  updateItemInPlace(survey, sourceItemLabel);
  updateItemInPlace(survey, target.label);

  showToast(`Photo moved to ${target.label}`);

  // If the source was an area photo section (not a media sheet), do NOT re-open a media sheet.
  // Otherwise, refresh the media sheet so the user sees one fewer photo.
  if (window._moveSourceIsAreaPhoto) {
    window._moveSourceIsAreaPhoto = false;
  } else {
    showMediaSheet(sourceItemLabel, sourceCategoryName);
  }
}

// ── Update a single compact item's DOM without full re-render ───────────────
function updateCompactItem(survey, itemLabel, categoryName) {
  const itemDiv = document.querySelector(`.compact-item-wrapper[data-item-label="${itemLabel.replace(/"/g, '\\"')}"]`);
  if (!itemDiv) return;

  const itemData = survey.items[itemLabel] || { rating: '', text: '', standards: [], photos: [] };
  const options = getItemOptionsFromTemplate(survey, itemLabel);
  itemDiv.innerHTML = buildCompactItemHTML(itemLabel, categoryName, itemData, options);

  // Load photo thumbnails for inline display
  if (itemData.photos && itemData.photos.length > 0) {
    itemData.photos.forEach(photoId => {
      getPhotoById(photoId).then(photo => {
        if (photo) {
          const img = document.getElementById(`thumb-${photoId}`);
          if (img) img.src = photo.dataUrl;
        }
      });
    });
  }
}

// Find applicable standards for a category/rating
// Uses longest-key-wins: more specific keys take precedence over shorter keys
// e.g. "Pilot house gauges" beats "Pilot house" for "Pilot house gauges and instrumentation"
function getStandardsForCategory(categoryName, rating) {
  const ratingLetter = rating.charAt(0);
  if (ratingLetter !== 'A' && ratingLetter !== 'B') return [];

  const catLower = categoryName.toLowerCase();
  let bestMatch = null;
  let bestMatchLength = 0;

  for (const [key, standards] of Object.entries(STANDARDS_BY_CATEGORY)) {
    const keyLower = key.toLowerCase();
    if (catLower.includes(keyLower) && keyLower.length > bestMatchLength) {
      bestMatch = standards;
      bestMatchLength = keyLower.length;
    }
  }

  return bestMatch || [];
}

// Item-level standard mapping — returns the single most relevant standard for a finding
// If no specific match, returns null (no standard auto-applied)
const ITEM_STANDARD_MAP = {
  // Hull exterior, keel and propulsion
  'Hull and rudder': 'TP1332 - Construction Standards for Small Vessels',
  'Primer, barrier coat': 'TP1332 - Construction Standards for Small Vessels',
  'Keel and keel joint': 'TP1332 - Construction Standards for Small Vessels',
  'Hull anodes': 'ABYC E-2 - Cathodic Protection',
  'Propeller/drive anode': 'ABYC E-2 - Cathodic Protection',
  'Cutlass bearing': 'ABYC P-4 - Inboard Engines',
  'Propeller': 'ABYC P-4 - Inboard Engines',
  'Outdrive': 'ABYC P-4 - Inboard Engines',
  'Sail drive': 'ABYC P-4 - Inboard Engines',
  'Bow thruster': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Stern thruster': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Through-hull': 'ABYC TH-27 - Seacocks/Through-Hull Fittings',
  'Exhaust discharge': 'ABYC P-1 - Installation of Exhaust Systems',
  'Underwater lighting': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Swim platform': 'ABYC E-2 - Cathodic Protection',
  'Transom': 'TP1332 - Construction Standards for Small Vessels',
  'Hull-deck joint': 'TP1332 - Construction Standards for Small Vessels',
  'Stern tube': 'ABYC P-4 - Inboard Engines',
  'Propeller shaft': 'ABYC P-4 - Inboard Engines',
  'Trim tab': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Rub rail': 'TP1332 - Construction Standards for Small Vessels',

  // Spars and rigging
  'Forestay': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Shrouds': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Chainplate': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Main mast': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Mast partner': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Spreader': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Backstay': 'ABYC S-9 - Standing Rigging (Vessels 30 ft or More)',
  'Boom': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Halyard': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Jib/genoa furler': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Main sheet': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Spinnaker': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Winch': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Deckline organizer': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',
  'Jib/genoa track': 'ABYC S-10 - Running Rigging (Vessels 30 ft or More)',

  // Deck
  'Bowsprit': 'TP1332 - Construction Standards for Small Vessels',
  'Deck and coachroof': 'TP1332 - Construction Standards for Small Vessels',
  'Pulpit': 'TP1332 - Construction Standards for Small Vessels',
  'anchor': 'TP1332 - Construction Standards for Small Vessels',
  'Windlass': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Stanchion': 'TP1332 - Construction Standards for Small Vessels',
  'Lifeline': 'TP1332 - Construction Standards for Small Vessels',
  'Shore water': 'ABYC H-27 - Potable Water Systems',
  'Mooring cleat': 'TP1332 - Construction Standards for Small Vessels',
  'Deck hatch': 'TP1332 - Construction Standards for Small Vessels',
  'Windshield': 'TP1332 - Construction Standards for Small Vessels',

  // Outboard
  'Outboard': 'ABYC P-6 - Outboard Engines',

  // Cockpit
  'Cockpit drain': 'ABYC A-31 - Cockpit Design',
  'Steering wheel': 'ABYC P-11 - Steering Systems',
  'Steering': 'ABYC P-11 - Steering Systems',
  'Tiller': 'ABYC P-11 - Steering Systems',
  'Emergency tiller': 'ABYC P-11 - Steering Systems',
  'Propane': 'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems',
  'Davit': 'TP1332 - Construction Standards for Small Vessels',

  // Gauges and instrumentation
  'Engine start': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Engine gauge': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Engine control': 'ABYC P-4 - Inboard Engines',
  'Autopilot': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'MFD': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Chartplotter': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Depth sounder': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'VHF': 'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
  'Radar': 'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
  'AIS': 'TP14693 - Navigation Safety Regulations (SOR/2005-134)',
  'Horn': 'Small Vessel Regulations (SOR/2010-91)',
  'Spotlight': 'ABYC A-16 - Electrical Navigation Lights',
  'Windshield wiper': 'ABYC E-11 - AC and DC Electrical Systems on Boats',

  // Cabin
  'Cabin sole': 'TP1332 - Construction Standards for Small Vessels',
  'Interior lighting': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Stove': 'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems',
  'Oven': 'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems',
  'Refrigerator': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Sink': 'ABYC H-27 - Potable Water Systems',
  'Bilge': 'ABYC H-22 - DC Electric Bilge Pumps',
  'Keel bolt': 'TP1332 - Construction Standards for Small Vessels',

  // Head
  'Head': 'ABYC TH-27 - Seacocks/Through-Hull Fittings',
  'Toilet': 'ABYC TH-27 - Seacocks/Through-Hull Fittings',
  'Shower': 'ABYC H-27 - Potable Water Systems',

  // Fuel, water and waste
  'Fuel tank': 'ABYC H-33 - Diesel Fuel Systems',
  'Hot water tank': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Black water': 'Vessel Pollution and Dangerous Chemicals Regulations (SOR/2012-69)',
  'Fresh water': 'ABYC H-27 - Potable Water Systems',

  // Engine
  'Engine': 'ABYC P-4 - Inboard Engines',
  'Cooling water intake': 'ABYC TH-27 - Seacocks/Through-Hull Fittings',
  'Exhaust condition': 'ABYC P-1 - Installation of Exhaust Systems',
  'Oil level': 'ABYC P-4 - Inboard Engines',
  'Coolant': 'ABYC P-4 - Inboard Engines',
  'Belt': 'ABYC P-4 - Inboard Engines',
  'Anti-vibration': 'ABYC P-4 - Inboard Engines',
  'Hose': 'ABYC P-4 - Inboard Engines',
  'Gearbox': 'ABYC P-4 - Inboard Engines',
  'Drive coupling': 'ABYC P-4 - Inboard Engines',
  'Stuffing box': 'ABYC P-4 - Inboard Engines',
  'Packing gland': 'ABYC P-4 - Inboard Engines',
  'Dripless seal': 'ABYC P-4 - Inboard Engines',

  // Steering and trim
  'Mechanical steering': 'ABYC P-11 - Steering Systems',
  'Hydraulic steering': 'ABYC P-11 - Steering Systems',

  // Electrical — all items map to E-11
  'Shore power cable': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Shore power receptacle': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Battery charger': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Battery selector': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Battery ventilation': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Battery': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Distribution panel': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Reverse polarity': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Voltmeter': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Ammeter': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Bundling support': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Wiring': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Protected positive': 'ABYC E-11 - AC and DC Electrical Systems on Boats',
  'Bus bar': 'ABYC E-11 - AC and DC Electrical Systems on Boats',

  // Safety
  'Navigation light': 'ABYC A-16 - Electrical Navigation Lights',
  'Lifejacket': 'Small Vessel Regulations (SOR/2010-91)',
  'PFD': 'Small Vessel Regulations (SOR/2010-91)',
  'Life ring': 'Small Vessel Regulations (SOR/2010-91)',
  'Bilge pump': 'ABYC H-22 - DC Electric Bilge Pumps',
  'Flare': 'Small Vessel Regulations (SOR/2010-91)',
  'Fire extinguisher': 'NFPA 302 - Fire Protection Standard for Pleasure and Commercial Motor Craft',
  'Carbon monoxide': 'ABYC A-24 - Carbon Monoxide Detection Systems',
  'Propane gas detector': 'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems',
  'LPG': 'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems',
  'Solenoid': 'ABYC A-1 - Marine Liquefied Petroleum Gas (LPG) Systems'
};

// Find the single most relevant standard for an item based on its label
// Uses longest-keyword-wins matching against ITEM_STANDARD_MAP
function getStandardForItem(itemLabel, categoryName) {
  const labelLower = itemLabel.toLowerCase();
  let bestMatch = null;
  let bestMatchLength = 0;

  for (const [keyword, standard] of Object.entries(ITEM_STANDARD_MAP)) {
    const keyLower = keyword.toLowerCase();
    if (labelLower.includes(keyLower) && keyLower.length > bestMatchLength) {
      bestMatch = standard;
      bestMatchLength = keyLower.length;
    }
  }

  return bestMatch;
}

// ── Transport Canada TP 511E Safety Equipment Requirements ───────────────
// Source: TP 511E Safe Boating Guide (2019) — pages 16–19
// Reference: https://tc.canada.ca/sites/default/files/2024-03/tp_511e.pdf
// Small Vessel Regulations (SOR/2010-91)
const TC_SAFETY_EQUIPMENT = {
  brackets: [
    { id: 'under6', label: 'Not over 6 m (19\'8")', maxM: 6 },
    { id: '6to9',   label: 'Over 6 m, not over 9 m (19\'8"–29\'6")', maxM: 9 },
    { id: '9to12',  label: 'Over 9 m, not over 12 m (29\'6"–39\'4")', maxM: 12 },
    { id: '12to24', label: 'Over 12 m, not over 24 m (39\'4"–78\'9")', maxM: 24 },
    { id: 'over24', label: 'Over 24 m (78\'9")', maxM: Infinity }
  ],
  items: [
    // ══════════════════════════════════════════════════════════════════════
    // PERSONAL LIFESAVING APPLIANCES  (TP 511E pp. 16–18)
    // ══════════════════════════════════════════════════════════════════════
    { category: 'Personal Lifesaving Appliances',
      name: 'Approved PFD or lifejacket for each person on board',
      applies: { under6: '1 per person', '6to9': '1 per person', '9to12': '1 per person', '12to24': '1 per person', over24: '1 per person' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Reboarding device (Note 1: only required if freeboard > 0.5 m)',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Buoyant heaving line — min. 15 m (49\'3")',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Lifebuoy attached to buoyant line — min. 15 m (49\'3")',
      applies: { '9to12': '1', '12to24': '1' },
      types: ['power', 'sail'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Lifebuoy with self-igniting light attached to buoyant line — min. 15 m (49\'3")',
      applies: { '12to24': '1' },
      types: ['power', 'sail'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Buoyant heaving line — min. 30 m (98\'5")',
      applies: { over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Two (2) SOLAS lifebuoys — one with 30 m buoyant line, one with self-igniting light',
      applies: { over24: '2' },
      types: ['power', 'sail'] },
    { category: 'Personal Lifesaving Appliances',
      name: 'Lifting harness with appropriate rigging',
      applies: { over24: '1' },
      types: ['power', 'sail'] },

    // ══════════════════════════════════════════════════════════════════════
    // VISUAL SIGNALS / DISTRESS EQUIPMENT  (TP 511E pp. 16–18, Note 2)
    // ══════════════════════════════════════════════════════════════════════
    { category: 'Visual Signals',
      name: 'Watertight flashlight OR 3 flares (Type A, B, C, or D — only 1 may be Type D)',
      applies: { under6: '1' },
      types: ['power', 'sail'] },
    { category: 'Visual Signals',
      name: 'Watertight flashlight',
      applies: { '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Visual Signals',
      name: 'Six (6) flares — Type A, B, C, or D; only 2 may be Type D (Note 2)',
      applies: { '6to9': '6 total' },
      types: ['power', 'sail'] },
    { category: 'Visual Signals',
      name: 'Twelve (12) flares — Type A, B, C, or D; only 6 may be Type D (Note 2)',
      applies: { '9to12': '12 total', '12to24': '12 total', over24: '12 total' },
      types: ['power', 'sail'] },

    // ══════════════════════════════════════════════════════════════════════
    // VESSEL SAFETY EQUIPMENT  (TP 511E pp. 16–18, Note 3)
    // ══════════════════════════════════════════════════════════════════════
    { category: 'Vessel Safety Equipment',
      name: 'Manual propelling device OR anchor with min. 15 m (49\'3") of cable, rope, or chain',
      applies: { under6: '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Manual propelling device',
      applies: { '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Anchor with min. 15 m (49\'3") of cable, rope, or chain',
      applies: { '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Anchor with min. 30 m (98\'5") of cable, rope, or chain',
      applies: { '9to12': '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Anchor with min. 50 m (164\'1") of cable, rope, or chain',
      applies: { '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Bailer or manual bilge pump (Note 3)',
      applies: { under6: '1', '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Manual bilge pump OR bilge-pumping arrangements (Note 3)',
      applies: { '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    // Human-powered specific
    { category: 'Vessel Safety Equipment',
      name: 'Manual propelling device OR anchor with min. 15 m of cable, rope, or chain',
      applies: { under6: '1' },
      types: ['human-powered'] },
    { category: 'Vessel Safety Equipment',
      name: 'Bailer or manual water pump (Note 3)',
      applies: { under6: '1' },
      types: ['human-powered'] },

    // ══════════════════════════════════════════════════════════════════════
    // NAVIGATION EQUIPMENT  (TP 511E pp. 16–18, Notes 4–6)
    // ══════════════════════════════════════════════════════════════════════
    { category: 'Navigation Equipment',
      name: 'Sound-signalling device or appliance',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Navigation Equipment',
      name: 'Sound-signalling appliance — power-driven, audible for 0.5 nm (two required over 24 m)',
      applies: { over24: '2' },
      types: ['power', 'sail'] },
    { category: 'Navigation Equipment',
      name: 'Navigation lights per Collision Regulations (Note 4)',
      applies: { under6: 'If operating at night or restricted visibility', '6to9': '1 set', '9to12': '1 set', '12to24': '1 set', over24: '1 set' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Navigation Equipment',
      name: 'Magnetic compass (Note 5: not required if boat ≤ 8 m and within sight of nav marks)',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Navigation Equipment',
      name: 'Radar reflector (Note 6: if under 20 m and built of non-metallic materials)',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail', 'human-powered'] },

    // ══════════════════════════════════════════════════════════════════════
    // FIRE FIGHTING EQUIPMENT  (TP 511E pp. 17–18)
    // ══════════════════════════════════════════════════════════════════════
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 5BC (if equipped with inboard engine, fixed fuel tank, or fuel-burning appliance)',
      applies: { under6: '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 5BC (if equipped with a motor)',
      applies: { '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 5BC (if equipped with fuel-burning cooking, heating, or refrigerating appliance)',
      applies: { '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 10BC (if equipped with a motor)',
      applies: { '9to12': '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 10BC (if equipped with fuel-burning cooking, heating, or refrigerating appliance)',
      applies: { '9to12': '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 10BC at each access to fuel-burning cooking/heating/refrigerating space, entrance to accommodation, and entrance to machinery space',
      applies: { '12to24': '1 per location', over24: '1 per location' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Axe',
      applies: { '12to24': '1', over24: '2' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire buckets — 10 L each',
      applies: { '12to24': '2', over24: '4' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Power-driven fire pump located outside machinery space, with fire hose and nozzle',
      applies: { over24: '1' },
      types: ['power', 'sail'] }
  ]
};

// Parse LOA string to get length in metres
function parseLOAtoMetres(loaStr) {
  if (!loaStr) return 0;
  const s = loaStr.toLowerCase().replace(/,/g, '');
  // Check for metres first
  const mMatch = s.match(/([\d.]+)\s*(m|metres?|meters?)/);
  if (mMatch) return parseFloat(mMatch[1]);
  // Check for feet
  const ftMatch = s.match(/([\d.]+)\s*(ft|feet|foot|')/);
  if (ftMatch) return parseFloat(ftMatch[1]) * 0.3048;
  // Bare number — assume feet (common in N. America)
  const numMatch = s.match(/([\d.]+)/);
  if (numMatch) return parseFloat(numMatch[1]) * 0.3048;
  return 0;
}

// Determine which bracket a vessel falls into
function getLengthBracket(loaStr) {
  const metres = parseLOAtoMetres(loaStr);
  for (const b of TC_SAFETY_EQUIPMENT.brackets) {
    if (metres <= b.maxM) return b.id;
  }
  return 'over24';
}

// Infer hull type from boat style string
function inferHullType(boatStyle) {
  if (!boatStyle) return '';
  const s = boatStyle.toLowerCase();
  if (s.includes('catamaran')) return 'Catamaran';
  if (s.includes('trimaran')) return 'Trimaran';
  if (s.includes('trawler')) return 'Semi-displacement';
  if (s.includes('express') || s.includes('sport')) return 'Planing';
  if (s.includes('fishing')) return 'V-bottom';
  if (s.includes('flybridge')) return 'Semi-displacement';
  if (s.includes('cuddy')) return 'V-bottom';
  if (s.includes('cabin cruiser')) return 'Semi-displacement';
  if (s.includes('sloop') || s.includes('cutter') || s.includes('ketch')) return 'Round bottom';
  if (s.includes('pontoon')) return 'Pontoon';
  if (s.includes('flat')) return 'Flat bottom';
  return '';
}

// Derive hull count from boat style / hull type (1=mono, 2=cat, 3=tri)
function inferHullCount(survey) {
  if (survey.hullCount) return parseInt(survey.hullCount, 10) || 1;
  const s = ((survey.boatStyle || '') + ' ' + (survey.hullType || '')).toLowerCase();
  if (s.includes('trimaran')) return 3;
  if (s.includes('catamaran') || s.includes('pontoon')) return 2;
  return 1;
}

// Get vessel type from boatStyle string
function getVesselType(boatStyle) {
  if (!boatStyle) return 'power';
  const s = boatStyle.toLowerCase();
  if (s.includes('sail') || s.includes('sloop') || s.includes('ketch') || s.includes('yawl') || s.includes('cutter') || s.includes('schooner') || s.includes('catamaran') || s.includes('trimaran')) return 'sail';
  if (s.includes('canoe') || s.includes('kayak') || s.includes('rowboat') || s.includes('paddle') || s.includes('human')) return 'human-powered';
  return 'power';
}

// Generate safety equipment checklist for a given vessel
function generateSafetyChecklist(survey) {
  const bracket = getLengthBracket(survey.loa);
  const vesselType = survey.vesselType || getVesselType(survey.boatStyle);
  const checklist = [];

  TC_SAFETY_EQUIPMENT.items.forEach(item => {
    if (!item.applies[bracket]) return;
    if (!item.types.includes(vesselType)) return;
    checklist.push({
      category: item.category,
      name: item.name,
      requirement: item.applies[bracket],
      checked: false,
      notes: ''
    });
  });

  return { bracket, vesselType, checklist };
}

// Normalize text for fuzzy matching
function normalizeForMatch(text) {
  return text.toLowerCase()
    .replace(/\(.*?\)/g, '')           // Remove parenthesized text like "(if applicable)"
    .replace(/[\/\\,\-–]/g, ' ')       // Replace punctuation with spaces
    .replace(/\b(and|the|of|or|in|at|to|for|a|an|is|are|was|were)\b/g, '') // Remove common words
    .replace(/\s+/g, ' ')             // Collapse spaces
    .trim();
}

// Get significant words from text
function getSignificantWords(text) {
  return normalizeForMatch(text).split(' ').filter(w => w.length > 2);
}

// Calculate word overlap score between two strings
function matchScore(text1, text2) {
  const words1 = getSignificantWords(text1);
  const words2 = getSignificantWords(text2);
  if (words1.length === 0 || words2.length === 0) return 0;

  const overlap = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2))).length;
  return overlap / Math.min(words1.length, words2.length);
}

// ─── Snippet Diff Highlighting ──────────────────────────────────────────────
// Compare an array of snippet texts and return HTML versions where the
// differing portions are wrapped in <strong> tags. This makes it easy
// to choose between similar snippets in the field.

function highlightSnippetDiffs(variants) {
  if (!variants || variants.length < 2) {
    return variants.map(v => escSnippet(v.text));
  }

  const wordArrays = variants.map(v => v.text.split(/\s+/).filter(w => w.length > 0));
  const highlightedTexts = variants.map(v => escSnippet(v.text));

  // For each snippet, find the most similar peer (longest LCS)
  // and bold only the words that differ from that peer.
  // Only highlight if similarity >= 50% (otherwise snippets are too different).
  wordArrays.forEach((words, i) => {
    let bestLcs = [];
    wordArrays.forEach((otherWords, j) => {
      if (i === j) return;
      // Only compare snippets with the same rating
      if ((variants[i].rating || '') !== (variants[j].rating || '')) return;
      const lcs = lcsWords(words, otherWords);
      if (lcs.length > bestLcs.length) bestLcs = lcs;
    });

    const similarity = bestLcs.length / Math.max(words.length, 1);
    if (similarity >= 0.5 && bestLcs.length > 0) {
      highlightedTexts[i] = markDiffWords(words, bestLcs);
    }
  });

  return highlightedTexts;
}

// Longest common subsequence of two word arrays
function lcsWords(a, b) {
  const m = a.length, n = b.length;
  // For very long texts, limit to avoid performance issues
  if (m > 200 || n > 200) return [];

  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i-1].toLowerCase() === b[j-1].toLowerCase()) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  // Backtrack to find the actual subsequence
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i-1].toLowerCase() === b[j-1].toLowerCase()) {
      result.unshift(a[i-1].toLowerCase());
      i--; j--;
    } else if (dp[i-1][j] > dp[i][j-1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

// Mark words that are NOT in the common subsequence with <strong> tags
function markDiffWords(words, commonSeq) {
  const result = [];
  let csIdx = 0;
  let inBold = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isCommon = csIdx < commonSeq.length &&
                     word.toLowerCase() === commonSeq[csIdx].toLowerCase();

    if (isCommon) {
      if (inBold) { result.push('</strong>'); inBold = false; }
      result.push(escSnippet(word));
      csIdx++;
    } else {
      if (!inBold) { result.push('<strong>'); inBold = true; }
      result.push(escSnippet(word));
    }
  }
  if (inBold) result.push('</strong>');
  return result.join(' ').replace(/ <\/strong>/g, '</strong> ').replace(/<strong> /g, ' <strong>');
}

function escSnippet(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Find text variants from library
// v2214: optional `survey` param enables chip-level vesselType filtering.
// v2216: `surveyRating` is now the FULL rating string ("Not applicable",
// "Not tested/not verified", "A - Critical", etc.) rather than a single
// char, so N-prefixed ratings can be distinguished ("Not applicable"
// must not pick up "Not tested" chips and vice versa). Callers that still
// pass a 1-char value continue to work via first-char fallback.
// Chips tagged with `vesselType: 'sail'` or `'power'` are dropped when the
// survey's vesselType doesn't match. Chips without vesselType always show.
function findTextVariants(categoryName, itemLabel, surveyRating, survey) {
  if (!textLibrary) return [];

  const sheetName = SHEET_MAPPING[categoryName] || categoryName;
  const sheet = textLibrary[sheetName];

  if (!sheet) return [];

  // Build a rating matcher that distinguishes N-prefixed ratings.
  const _fullRating = String(surveyRating || '');
  const _ratingLower = _fullRating.toLowerCase();
  const _firstChar = _fullRating.charAt(0).toUpperCase();
  const isRatingMatch = (entryRating) => {
    const er = (entryRating || '').toString();
    if (!er) return false;
    if (_ratingLower.startsWith('not applicable') || _ratingLower === 'n/a') {
      return /^(n\/a|not applicable)\b/i.test(er);
    }
    if (_ratingLower.startsWith('not tested') || _ratingLower.startsWith('not verified') || _ratingLower === 'nt') {
      return /^(not tested|not verified|nt)\b/i.test(er);
    }
    // A / B / C / Powered up / other — fall back to first-char match.
    return er.charAt(0).toUpperCase() === _firstChar;
  };

  // Strip expansion prefixes for matching expanded items back to base snippets
  // Head: "Head 2 — Toilet" → "Head, Toilet"
  // Drive line: "Port — Propeller" → "Propeller(s)"
  // Hull: "Port hull — Hull condition (below the waterline)" → "Hull(s) condition (below the waterline)"
  let resolvedLabel = itemLabel
    .replace(/^Head \d+ — /, 'Head, ')
    .replace(/^(?:Port hull|Starboard hull|Centre hull)\s*—\s*/, match => {
      // Restore "(s)" so it matches the text_library section name
      return '';
    })
    .replace(/^(?:Port|Starboard|#\d+)\s*—\s*/, '');
  // Restore "(s)" for hull items that had it stripped during expansion
  if (/^Hull condition/.test(resolvedLabel)) {
    resolvedLabel = resolvedLabel.replace(/^Hull /, 'Hull(s) ');
  }

  // Use explicit mapping if available, otherwise keep the resolved label
  const hadExplicitMap = !!ITEM_SNIPPET_MAP[resolvedLabel];
  resolvedLabel = ITEM_SNIPPET_MAP[resolvedLabel] || resolvedLabel;

  const matchLabel = resolvedLabel.toLowerCase();

  // 1. Exact section name match (case-insensitive)
  let matches = sheet.filter(entry => {
    if (!entry.section || !entry.rating) return false;
    if (!isRatingMatch(entry.rating)) return false;
    return entry.section.toLowerCase() === matchLabel;
  });

  // If we had an explicit ITEM_SNIPPET_MAP entry, the section name is known —
  // don't fall through to fuzzy matching which pulls in wrong sections.
  // (If no entries found, it means that rating level needs entries added.)
  if (hadExplicitMap) return matches;

  // 2. If no exact match, try contains match — only where the FULL search label
  // appears inside the section name (not the reverse, which is too loose)
  if (matches.length === 0) {
    matches = sheet.filter(entry => {
      if (!entry.section || !entry.rating) return false;
      const section = entry.section.toLowerCase();
      if (!isRatingMatch(entry.rating)) return false;
      return section.includes(matchLabel);
    });
    // If multiple sections matched, prefer the one closest in length to the search label
    if (matches.length > 1) {
      const sections = [...new Set(matches.map(m => m.section))];
      if (sections.length > 1) {
        let bestSection = sections[0];
        let bestDiff = Math.abs(sections[0].length - resolvedLabel.length);
        for (const s of sections) {
          const diff = Math.abs(s.length - resolvedLabel.length);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestSection = s;
          }
        }
        matches = matches.filter(m => m.section === bestSection);
      }
    }
  }

  // 3. If still no match, try fuzzy word overlap — pick only the BEST matching
  // section to avoid pulling in loosely related sections
  if (matches.length === 0) {
    let bestScore = 0;
    let bestSection = null;
    const seen = new Set();
    for (const entry of sheet) {
      if (!entry.section || !entry.rating || seen.has(entry.section)) continue;
      seen.add(entry.section);
      const score = matchScore(entry.section, matchLabel);
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestSection = entry.section;
      }
    }
    if (bestSection) {
      matches = sheet.filter(entry => {
        if (!entry.section || !entry.rating) return false;
        return isRatingMatch(entry.rating) && entry.section === bestSection;
      });
    }
  }

  // v2214: vessel-type chip filtering. Chips tagged with `vesselType: 'sail'`
  // or `'power'` are dropped when the survey's vesselType doesn't match.
  // Chips without vesselType always show (default behavior).
  if (survey && survey.vesselType) {
    const vt = survey.vesselType.toLowerCase();
    matches = matches.filter(entry => {
      if (!entry.vesselType) return true;
      return entry.vesselType.toLowerCase() === vt;
    });
  }

  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════
// SNIPPET TOKEN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// Token syntax supported in text_library.json entries:
//
//   {count:singular|plural}
//     Auto-resolves from survey.driveLineCount. 1 -> left side, 2+ -> right.
//     Never requires a tap.
//
//   {specify:opt1|opt2|opt3}
//     Single-select inline list. Chip in strip; tap -> popover radio list
//     + Custom field. One option lands in the text.
//
//   {any:opt1|opt2^ABYC P-1.5|opt3^TC TP-1332(2)}
//     Multi-select inline list with optional ^CITATION tags per option.
//     Tap -> popover checkboxes + Custom field. Rendered with shared-tail
//     collapse and Oxford comma joining.
//
//   {name}
//     Named placeholder. Entry JSON must include:
//       "placeholders": { "name": ["a", "b", "c"] }           // single
//       "placeholders": { "name": { "multi": true,
//                                   "options": ["a","b"] } }  // multi
//
//   {standards? prose that references STANDARDS.}
//     Conditional block. Only renders if 1+ citations were collected from
//     {any:...} selections. STANDARDS inside gets replaced with the Oxford-
//     joined, deduplicated citation list. If no citations were collected,
//     the entire block (including its leading space) is stripped.
// ═══════════════════════════════════════════════════════════════════════════

// Oxford-comma join: [] -> "", [a] -> "a", [a,b] -> "a and b",
// [a,b,c] -> "a, b, and c".
function oxfordJoin(items) {
  const arr = items.filter(x => x != null && x !== '');
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + ' and ' + arr[1];
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

// Shared-tail collapse for {any:...} selections.
// Walks selections in order. Consecutive items that share >=1 trailing word
// are grouped; within a group the heads are Oxford-joined and the shared
// tail is appended once. Groups are then Oxford-joined at the top level.
//
//   ["chipped blades","bent blades"]
//     -> "chipped and bent blades"
//   ["chipped blades","bent blades","missing blades"]
//     -> "chipped, bent, and missing blades"
//   ["chipped blades","bent blades","surface corrosion"]
//     -> "chipped and bent blades and surface corrosion"
//   ["cracked hull plate","delaminated hull plate"]
//     -> "cracked and delaminated hull plate"
function collapseSharedTail(selections) {
  if (!selections || selections.length === 0) return '';
  if (selections.length === 1) return selections[0];

  // Find longest shared word-suffix between two phrases (as array of words).
  const sharedSuffix = (a, b) => {
    const aw = a.split(/\s+/);
    const bw = b.split(/\s+/);
    let i = 0;
    while (i < aw.length && i < bw.length &&
           aw[aw.length - 1 - i].toLowerCase() === bw[bw.length - 1 - i].toLowerCase()) {
      i++;
    }
    if (i === 0) return [];
    return aw.slice(aw.length - i);
  };

  // Group consecutive selections that share at least one trailing word.
  const groups = [];
  let current = [selections[0]];
  for (let i = 1; i < selections.length; i++) {
    const tail = sharedSuffix(current[current.length - 1], selections[i]);
    if (tail.length > 0) {
      current.push(selections[i]);
    } else {
      groups.push(current);
      current = [selections[i]];
    }
  }
  groups.push(current);

  // Render each group: find the shared tail across ALL members, strip it
  // from each to get heads, Oxford-join heads, append tail.
  const rendered = groups.map(group => {
    if (group.length === 1) return group[0];
    // Shared tail across the whole group = shortest pairwise tail
    let tail = group[0].split(/\s+/);
    for (let j = 1; j < group.length; j++) {
      const pair = sharedSuffix(group[j - 1], group[j]);
      if (pair.length < tail.length) tail = pair;
    }
    const tailStr = tail.join(' ');
    const heads = group.map(phrase => {
      const words = phrase.split(/\s+/);
      return words.slice(0, words.length - tail.length).join(' ');
    });
    return oxfordJoin(heads) + ' ' + tailStr;
  });

  return oxfordJoin(rendered);
}

// Parse a snippet text into a list of tokens. Returns:
//   { segments: [ {type:'text', value:'...'} | {type:'token', kind, ...}, ... ],
//     hasUnresolved: bool }
// Token kinds: 'count', 'specify', 'any', 'named', 'standards'
function parseSnippetTokens(text) {
  if (!text) return { segments: [], raw: '' };
  const segments = [];
  const re = /\{(count:|specify:|any:|standards\?)?([^{}]*)\}/g;
  let lastIndex = 0;
  let match;
  let tokenIdx = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    const prefix = match[1] || '';
    const body = match[2] || '';
    const id = 'tok' + (tokenIdx++);
    if (prefix === 'count:') {
      const parts = body.split('|');
      segments.push({ type: 'token', kind: 'count', id, singular: parts[0] || '', plural: parts[1] || parts[0] || '' });
    } else if (prefix === 'specify:') {
      segments.push({ type: 'token', kind: 'specify', id, options: body.split('|').map(s => s.trim()).filter(Boolean) });
    } else if (prefix === 'any:') {
      const opts = body.split('|').map(s => s.trim()).filter(Boolean).map(o => {
        const parts = o.split('^').map(s => s.trim());
        return { label: parts[0], citations: parts.slice(1).filter(Boolean) };
      });
      segments.push({ type: 'token', kind: 'any', id, options: opts });
    } else if (prefix === 'standards?') {
      segments.push({ type: 'token', kind: 'standards', id, body });
    } else {
      // Unprefixed = named placeholder, e.g. {propType}
      segments.push({ type: 'token', kind: 'named', id, name: body.trim() });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.substring(lastIndex) });
  }
  return { segments, raw: text };
}

// Resolve count tokens immediately using the current survey's driveLineCount.
// Returns the text with count tokens replaced; other tokens left intact.
function resolveCountTokens(text, driveLineCount) {
  const n = parseInt(driveLineCount, 10) || 1;
  return text.replace(/\{count:([^{}|]*)\|([^{}]*)\}/g, (_, sg, pl) => {
    return n <= 1 ? sg : pl;
  });
}

// Inject a side qualifier ("port" / "starboard" / "#1") before the first
// subject noun in a resolved snippet. Used for per-drive-line expanded
// items (Port —, Starboard —, #N —) so sentences read "The port propeller…"
// instead of "The propeller…".
function applySidePrefix(text, sideWord) {
  if (!text || !sideWord) return text;
  const side = /^#/.test(sideWord) ? sideWord : sideWord.toLowerCase();
  // Order matters: match multi-word nouns before single-word ones.
  const nouns = [
    'sail drive', 'stern tube', 'stuffing box', 'dripless seal',
    'cutless bearing', 'shaft seal', 'shaft log',
    'propeller', 'shaft', 'rudder', 'outdrive', 'engine', 'drive'
  ];
  for (const noun of nouns) {
    const pattern = noun.replace(/\s+/g, '\\s+');
    const re = new RegExp('\\b(' + pattern + 's?)\\b', 'i');
    if (re.test(text)) {
      return text.replace(re, side + ' $1');
    }
  }
  return text;
}

// Build a short, self-describing chip label from an option list.
// Shows first 1–2 options + "…" if more, prefixed with + for multi-select.
function buildChipLabel(opts, isMulti) {
  if (!opts || opts.length === 0) return isMulti ? '+ Choose' : 'Choose';
  const first = (opts[0] || '').toString();
  const trunc = (s, n) => (s.length > n ? s.substring(0, n - 1) + '…' : s);
  if (opts.length === 1) return (isMulti ? '+ ' : '') + trunc(first, 24);
  if (opts.length === 2) {
    return (isMulti ? '+ ' : '') + trunc(first, 14) + ' / ' + trunc(opts[1], 14);
  }
  return (isMulti ? '+ ' : '') + trunc(first, 14) + ' / ' + trunc(opts[1], 12) + ' / …';
}

// Scan resolved text (after count resolution) for remaining unresolved tokens.
// Returns array of token descriptors in occurrence order:
//   { kind, id (literal token string), label, options?, name? }
function scanUnresolvedTokens(text, entryPlaceholders) {
  const tokens = [];
  if (!text) return tokens;
  const re = /\{(specify:|any:|standards\?)?([^{}]*)\}/g;
  let match;
  const seen = new Set();
  while ((match = re.exec(text)) !== null) {
    const full = match[0];
    if (seen.has(full)) continue;
    seen.add(full);
    const prefix = match[1] || '';
    const body = match[2] || '';
    if (prefix === 'specify:') {
      const opts = body.split('|').map(s => s.trim()).filter(Boolean);
      tokens.push({
        kind: 'specify',
        literal: full,
        label: buildChipLabel(opts, false),
        options: opts
      });
    } else if (prefix === 'any:') {
      const opts = body.split('|').map(s => s.trim()).filter(Boolean).map(o => {
        const parts = o.split('^').map(s => s.trim());
        const rawLabel = parts[0];
        const citations = parts.slice(1).filter(Boolean);
        // Support "word(s)" suffix syntax: toggleable singular/plural.
        // Default display uses the plural form. Builder UI shows a 1/many
        // segmented control so the surveyor can switch per-option.
        const m = rawLabel.match(/^(.*?)\(s\)(.*)$/);
        if (m) {
          const head = m[1];
          const tail = m[2] || '';
          const singular = (head + tail).replace(/\s+/g, ' ').trim();
          const plural = (head + 's' + tail).replace(/\s+/g, ' ').trim();
          return { label: plural, singular, plural, citations, countable: true };
        }
        return { label: rawLabel, citations };
      });
      // Look up the matching placeholder config by the literal body key so
      // the author can force single-select on inline {any:...} tokens via
      // { "multi": false }. Inline any: defaults to multi-select.
      let anyMulti = true;
      if (entryPlaceholders) {
        const key = 'any:' + body;
        const cfg = entryPlaceholders[key];
        if (cfg && typeof cfg === 'object' && cfg.multi === false) {
          anyMulti = false;
        }
      }
      tokens.push({
        kind: anyMulti ? 'any' : 'any-single',
        literal: full,
        label: buildChipLabel(opts.map(o => o.label), anyMulti),
        options: opts
      });
    } else if (prefix === 'standards?') {
      // Conditional block — not user-fillable; handled at render time.
      // Skip from strip.
      continue;
    } else {
      // Named placeholder
      const name = body.trim();
      if (!name) continue;
      // Count tokens are handled separately by the Subject toggle at the top
      // of the strip — not as per-token rows.
      if (/^count:/.test(name)) continue;
      const cfg = entryPlaceholders ? entryPlaceholders[name] : null;
      let options = [];
      let multi = false;
      if (Array.isArray(cfg)) {
        options = cfg.slice();
      } else if (cfg && typeof cfg === 'object') {
        options = (cfg.options || []).slice();
        multi = !!cfg.multi;
      }
      tokens.push({
        kind: multi ? 'any-named' : 'specify-named',
        literal: full,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        name,
        options: multi ? options.map(o => ({ label: o, citations: [] })) : options
      });
    }
  }
  return tokens;
}

// Render the standards conditional block in a text. Given the collected
// citations (array of unique strings), replace every {standards?...STANDARDS...}
// block with either the filled body (STANDARDS -> oxfordJoin(citations)) or
// remove the block entirely (including one leading space) when no citations.
function renderStandardsBlock(text, citations) {
  const uniq = [];
  const seen = new Set();
  for (const c of (citations || [])) {
    const k = c.trim();
    if (k && !seen.has(k)) { seen.add(k); uniq.push(k); }
  }
  return text.replace(/\s?\{standards\?([^{}]*)\}/g, (_, body) => {
    if (uniq.length === 0) return '';
    const filled = body.replace(/STANDARDS/g, oxfordJoin(uniq));
    // Preserve the single leading space that may have preceded the block
    return ' ' + filled.replace(/^\s+/, '');
  });
}

// Register collected citations on the item's data so renderStandardsBlock
// can pick them up at save time. Stored on the textarea dataset.
function getCollectedCitations(textarea) {
  if (!textarea) return [];
  try {
    return JSON.parse(textarea.dataset.citations || '[]');
  } catch (e) { return []; }
}
function setCollectedCitations(textarea, list) {
  if (!textarea) return;
  textarea.dataset.citations = JSON.stringify(list || []);
}

// Render a human-readable preview of a token-based snippet for display in
// snippet cards. Tokens are replaced with compact bracketed placeholders:
//   {count:sg|pl}              -> "sg"  (show singular form as preview)
//   {specify:a|b|c}            -> "[a/b/c]" (truncated if long)
//   {any:a|b|c^CITE|d}         -> "[a/b/…]"
//   {name}                     -> "[name]"
//   {standards?...STANDARDS...} -> removed (only shown once standards picked)
function renderSnippetPreview(text) {
  if (!text) return '';
  // 1. Drop conditional standards block entirely (with leading space)
  let out = text.replace(/\s?\{standards\?[^{}]*\}/g, '');
  // 2. count -> singular form (cleaner than "propeller|propellers")
  out = out.replace(/\{count:([^{}|]*)\|[^{}]*\}/g, '$1');
  // 3. specify/any inline lists -> compact bracketed hint. Strip citations
  //    AND the (s) suffix markers so the preview reads naturally.
  out = out.replace(/\{(specify|any):([^{}]*)\}/g, (_, kind, body) => {
    const opts = body.split('|')
      .map(s => s.replace(/\^[^|]*$/, '').trim())
      .map(s => s.replace(/\(s\)/g, 's'))
      .filter(Boolean);
    if (opts.length === 0) return '[…]';
    if (opts.length === 1) return '[' + opts[0] + ']';
    if (opts.length === 2) return '[' + opts[0] + ' / ' + opts[1] + ']';
    return '[' + opts[0] + ' / ' + opts[1] + ' / …]';
  });
  // 4. Named tokens
  out = out.replace(/\{([a-zA-Z0-9_ -]+)\}/g, '[$1]');
  return out;
}

window._snippetTokens = {
  parse: parseSnippetTokens,
  resolveCount: resolveCountTokens,
  scanUnresolved: scanUnresolvedTokens,
  collapseSharedTail,
  oxfordJoin,
  renderStandardsBlock,
  renderPreview: renderSnippetPreview
};

// ═══════════════════════════════════════════════════════════════════════════
// CHIP STRIP UI — renders below a notes textarea, one chip per unresolved
// token. Tapping a chip opens a popover with options + Custom field.
// ═══════════════════════════════════════════════════════════════════════════

// Render an inline "snippet builder" form directly below the textarea.
// Each {any:...} token becomes a heading + checkbox rows; each {specify:...}
// becomes a heading + radio rows. A custom text input sits below each list.
// When the user changes any input, the textarea updates live from the stored
// template — so the surveyor always sees the real sentence being built.
//
// The container element for the form is the existing `-chipstrip` div.
// (Name kept for backwards compatibility with the textarea wrappers.)
function refreshChipStrip(textarea) {
  if (!textarea) return;
  const stripId = textarea.id + '-chipstrip';
  const strip = document.getElementById(stripId);
  if (!strip) return;

  let entryPlaceholders = null;
  try { entryPlaceholders = JSON.parse(textarea.dataset.snippetPlaceholders || 'null'); }
  catch (e) { entryPlaceholders = null; }

  // The TEMPLATE is the raw text containing tokens. We store it on the
  // container so that re-renders from user interactions always start from
  // the original tokens (not the partially-filled textarea value).
  const template = textarea.dataset.snippetTemplate || '';
  const tokens = scanUnresolvedTokens(template, entryPlaceholders);

  if (!template || tokens.length === 0) {
    strip.style.display = 'none';
    strip.innerHTML = '';
    strip._tokens = null;
    return;
  }

  strip.style.display = 'block';
  // Drop the old orange chip look; use a cleaner panel with section rows.
  strip.style.background = '#f9fafb';
  strip.style.border = '1px solid #e5e7eb';
  strip.style.borderRadius = '10px';
  strip.style.padding = '10px 12px';

  let html = '<div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Build the sentence</div>';

  tokens.forEach((tok, ti) => {
    const isMulti = (tok.kind === 'any' || tok.kind === 'any-named');
    // Derive a title for the section. For now use a generic label + hint.
    const sectionTitle = isMulti ? 'Select all that apply' : 'Choose one';
    html += `<div style="margin-top:${ti === 0 ? '0' : '12px'};padding-top:${ti === 0 ? '0' : '10px'};${ti === 0 ? '' : 'border-top:1px dashed #e5e7eb;'}">`;
    html += `<div style="font-size:11px;font-weight:700;color:#006699;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">${sectionTitle}</div>`;

    tok.options.forEach((opt, oi) => {
      const isObj = (typeof opt === 'object');
      const countable = !!(isObj && opt.countable);
      // Label text: show the plural form by default (the text will be
      // re-rendered in the textarea with the chosen number word anyway).
      const rawLabel = isObj ? (opt.plural || opt.label || '') : opt;
      const cites = (isObj && opt.citations && opt.citations.length)
        ? ` <span style="color:#6b7280;font-size:11px;">(${escapeHtml(opt.citations.join(', '))})</span>`
        : '';
      // Per-option count badge (1-4 cycling). Only shown for countable
      // options — tapping cycles the count for THAT defect only.
      const countBadge = countable ? `
        <button type="button" class="opt-count-badge"
                data-opt-token="${ti}" data-opt-opt="${oi}" data-opt-count="1"
                style="flex-shrink:0;margin-left:auto;border:1px solid #006699;background:#006699;color:white;border-radius:6px;min-width:40px;min-height:32px;padding:4px 10px;font-size:14px;font-weight:700;cursor:pointer;line-height:1;">1</button>
      ` : '';
      html += `
        <label style="display:flex;align-items:center;gap:10px;padding:7px 2px;cursor:pointer;min-height:40px;">
          <input type="${isMulti ? 'checkbox' : 'radio'}" name="snbld-${textarea.id}-${ti}"
                 data-token-idx="${ti}" data-opt-idx="${oi}"
                 style="width:20px;height:20px;accent-color:#006699;flex-shrink:0;" />
          <span style="font-size:14px;color:#1f2937;line-height:1.4;flex:1;">${escapeHtml(rawLabel)}${cites}</span>
          ${countBadge}
        </label>
      `;
    });

    html += `
      <input type="text" data-custom-idx="${ti}" placeholder="Add another item${isMulti ? ' (comma-separated, no punctuation)' : ''}"
             spellcheck="true" autocorrect="on" autocapitalize="none"
             style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;" />
      <div data-tone-warning-for="${ti}" style="display:none;margin-top:6px;padding:7px 10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;color:#92400e;line-height:1.4;"></div>
    `;
    html += '</div>';
  });

  // Free-form "Additional observations" field. This is separate from the
  // per-token custom inputs — its content is appended as its OWN sentence
  // at the end of the resolved template (before the {standards?} block),
  // so the surveyor can type any clause-level text and the grammar of the
  // main template stays intact.
  html += `
    <div style="margin-top:14px;padding-top:10px;border-top:1px dashed #e5e7eb;">
      <div style="font-size:11px;font-weight:700;color:#006699;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Additional observations (optional)</div>
      <textarea data-freeform-notes="1" rows="2"
                placeholder="Type any extra details in your own words — appended as a separate sentence."
                spellcheck="true" autocorrect="on" autocapitalize="sentences"
                style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
      <div data-tone-warning-freeform="1" style="display:none;margin-top:6px;padding:7px 10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;color:#92400e;line-height:1.4;"></div>
      <div style="margin-top:6px;font-size:11px;color:#6b7280;font-style:italic;">Keep notes focused on this specific item only. Observations about other components belong in their own checklist items.</div>
    </div>
  `;

  strip.innerHTML = html;
  strip._tokens = tokens;
  strip._template = template;
  strip._textarea = textarea;

  // Live update on any change or typed input in the custom field
  const inputs = strip.querySelectorAll('input');
  inputs.forEach(inp => {
    inp.addEventListener('change', () => applyBuilderState(strip));
    if (inp.type === 'text') {
      inp.addEventListener('input', () => {
        // If the user types in a single-select section's custom field,
        // deselect any radio in that same token so the custom text becomes
        // the active selection. This prevents the custom text from being
        // silently overridden by a pre-existing radio pick.
        const ti = inp.dataset.customIdx;
        if (ti != null && inp.value.trim()) {
          const tok = tokens[parseInt(ti, 10)];
          if (tok && tok.kind === 'any-single') {
            strip.querySelectorAll(`input[type="radio"][data-token-idx="${ti}"]`)
              .forEach(r => { r.checked = false; });
          }
        }
        applyBuilderState(strip);
      });
    }
  });
  // Radio click handler: allow deselecting by re-clicking an already-checked
  // radio, AND clear the matching custom input when a radio is picked so the
  // custom text doesn't linger as dead state.
  strip.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('mousedown', (ev) => {
      radio.dataset.wasChecked = radio.checked ? '1' : '0';
    });
    radio.addEventListener('touchstart', (ev) => {
      radio.dataset.wasChecked = radio.checked ? '1' : '0';
    }, { passive: true });
    radio.addEventListener('click', (ev) => {
      if (radio.dataset.wasChecked === '1') {
        // Re-click on an already-checked radio → deselect.
        radio.checked = false;
        radio.dataset.wasChecked = '0';
        applyBuilderState(strip);
      } else {
        // Fresh pick → clear the sibling custom input so user's typed
        // text isn't silently shadowed by a radio choice.
        const ti = radio.dataset.tokenIdx;
        const customInp = strip.querySelector(`input[data-custom-idx="${ti}"]`);
        if (customInp) customInp.value = '';
        radio.dataset.wasChecked = '1';
      }
    });
  });
  // Free-form notes textarea — live update too.
  const freeformEl = strip.querySelector('textarea[data-freeform-notes]');
  if (freeformEl) {
    freeformEl.addEventListener('input', () => applyBuilderState(strip));
  }

  // Per-option count badge — cycles 1 → 2 → 3 → 4 → 1 for each countable
  // defect independently. Tapping also auto-checks the parent option so
  // the user can just tap the badge to both select and set the count.
  strip.querySelectorAll('.opt-count-badge').forEach(badge => {
    badge.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      let n = parseInt(badge.dataset.optCount || '1', 10);
      if (isNaN(n) || n < 1) n = 1;
      n = (n >= 4) ? 1 : (n + 1);
      badge.dataset.optCount = String(n);
      badge.textContent = String(n);
      // Auto-check the parent option — tapping the count badge implies the
      // defect is present.
      const ti = badge.dataset.optToken;
      const oi = badge.dataset.optOpt;
      const optInput = strip.querySelector(`input[data-token-idx="${ti}"][data-opt-idx="${oi}"]`);
      if (optInput && !optInput.checked) optInput.checked = true;
      applyBuilderState(strip);
    });
  });

  // Initial render: apply current state so count tokens get resolved from
  // the default and the textarea shows clean text (not raw {count:...}).
  applyBuilderState(strip);
}

// Downcase the first letter of a phrase that will be spliced into the
// middle of a sentence — unless the word is a proper noun (starts with
// capital followed by lowercase AND appears in the proper-noun allow-list)
// or an acronym (all uppercase, length >= 2). This cleans up iOS sentence-
// case auto-cap artifacts like "... including two chipped blades and A
// worn collar" → "... and a worn collar".
const PROPER_NOUN_WHITELIST = new Set([
  'yanmar','beneteau','volvo','penta','mercruiser','mercury','evinrude',
  'johnson','suzuki','kubota','westerbeke','perkins','cummins','caterpillar',
  'deutz','hunter','catalina','jeanneau','bavaria','hanse','hallberg','rassy',
  'amel','lagoon','oceanis','bruce','danforth','rocna','manson','lofrans',
  'lewmar','harken','ronstan','spinlock','schaefer','garhauer','furuno',
  'raymarine','garmin','simrad','lowrance','navionics','vesper','icom',
  'airmar','honda','tohatsu','nissan','quicksilver','sikaflex','interlux',
  'pettit','awlgrip','epifanes','cetol','racor','abyc','nfpa','tc','uscg',
  'canada','canadian','iso','ce','sams','nmea'
]);
function lowercaseMidSentence(phrase) {
  const s = String(phrase || '');
  if (!s) return s;
  // Extract the first "word" (letters only, up to the first non-letter).
  const m = s.match(/^([A-Za-z]+)(.*)$/);
  if (!m) return s;
  const firstWord = m[1];
  const rest = m[2];
  // Acronym: all uppercase, length >= 2 → leave as-is.
  if (firstWord.length >= 2 && firstWord === firstWord.toUpperCase()) return s;
  // Whitelisted proper noun → leave as-is (preserve original casing).
  if (PROPER_NOUN_WHITELIST.has(firstWord.toLowerCase())) return s;
  // Otherwise downcase the first letter only.
  return firstWord.charAt(0).toLowerCase() + firstWord.slice(1) + rest;
}

// Walk through a sentence and downcase any word that is capitalized mid-
// sentence (i.e. not the very first word and not immediately following
// terminal punctuation). Preserves acronyms (ALL-CAPS, length >= 2) and
// whitelisted proper nouns. Fixes iOS auto-cap artifacts like
// "And that is That." → "And that is that." and
// "the port propeller had Damage." → "the port propeller had damage."
function cleanMidSentenceCaps(text) {
  const s = String(text || '');
  if (!s) return s;
  // Flag whether we are currently at the "start of a sentence" position.
  // Starts true so the first word is allowed to be capitalized.
  let atSentenceStart = true;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    // Word run
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < s.length && /[A-Za-z']/.test(s[j])) j++;
      const word = s.slice(i, j);
      // Only consider downcasing if the first char is uppercase and word
      // contains at least one lowercase letter (i.e. Titlecase — not an
      // ALL-CAPS acronym).
      const isTitle = /^[A-Z][a-z]/.test(word);
      if (isTitle && !atSentenceStart && !PROPER_NOUN_WHITELIST.has(word.toLowerCase())) {
        out += word.charAt(0).toLowerCase() + word.slice(1);
      } else {
        out += word;
      }
      atSentenceStart = false;
      i = j;
      continue;
    }
    // Terminal punctuation resets sentence-start flag.
    if (ch === '.' || ch === '!' || ch === '?') {
      out += ch;
      atSentenceStart = true;
      i++;
      continue;
    }
    // Whitespace and other punctuation: keep the current state.
    out += ch;
    i++;
  }
  return out;
}

// Prepend "a " or "an " to a noun phrase, choosing the article based on the
// first sounded letter. Handles a few common irregulars (honest, hour) and
// avoids double-prefixing if the label already starts with "a " or "an ".
function withArticle(label) {
  const s = String(label || '').trim();
  if (!s) return s;
  if (/^(a|an)\s/i.test(s)) return s;
  // Silent-h irregulars where "an" is correct despite consonant spelling.
  if (/^(honest|honou?r|hour|heir)\b/i.test(s)) return 'an ' + s;
  // "Universal/European" style words that sound like "you-" take "a".
  if (/^(uni|use|usu|euro|ewe|one|once|uk\b)/i.test(s)) return 'a ' + s;
  const first = s.charAt(0).toLowerCase();
  return ('aeiou'.indexOf(first) >= 0 ? 'an ' : 'a ') + s;
}

// Format a countable defect option with a per-option count.
//   count = 1 -> "a chipped blade" (singular + article)
//   count = 2 -> "two chipped blades"
//   count = 3 -> "three chipped blades"
//   count = 4 -> "four chipped blades"
// Falls back gracefully if only the plural form is authored.
function formatCountedOption(opt, count) {
  const n = Math.min(Math.max(parseInt(count, 10) || 1, 1), 4);
  if (n === 1) {
    return withArticle(opt.singular || opt.label || opt.plural || '');
  }
  const word = ['', 'one', 'two', 'three', 'four'][n];
  const plural = opt.plural || opt.label || opt.singular || '';
  return word + ' ' + plural;
}

// Informal/unprofessional words and phrases that should not appear in a
// SAMS marine survey report. Each entry maps a case-insensitive pattern to
// a short suggestion. Keep this list conservative — the warning is advisory
// only, never blocks the user. Surveyors write their own conclusions; we
// just flag obvious slang and hyperbole.
const TONE_FLAGS = [
  { pat: /\bcrazy\b/i, hint: '"crazy" is informal — try "severe", "extensive", or "extreme".' },
  { pat: /\bnuts\b/i, hint: '"nuts" is informal — try "extreme" or "excessive".' },
  { pat: /\binsane(?:ly)?\b/i, hint: '"insane" is informal — try "extreme" or "severe".' },
  { pat: /\bunbelievabl(?:e|y)\b/i, hint: '"unbelievable" is informal — try "substantial", "severe", or "remarkable".' },
  { pat: /\bincredibl(?:e|y)\b/i, hint: '"incredible" is informal — try "significant" or "notable".' },
  { pat: /\bstupid(?:ly|ity)?\b/i, hint: '"stupid/stupidly" is informal — try "poorly" or "significantly".' },
  { pat: /\bdumb\b/i, hint: '"dumb" is informal — try "unwise" or "inadequate".' },
  { pat: /\b(?:pretty|super|really|way)\s+bad\b/i, hint: 'Informal intensifier — try "severely damaged" or "in poor condition".' },
  { pat: /\bway\s+(?:not|too)\b/i, hint: '"way not / way too" is informal — try "not at all" or "excessively".' },
  { pat: /\bnot\s+good\b/i, hint: '"not good" is informal — try "substandard", "unserviceable", or "poor".' },
  { pat: /\bnot\s+great\b/i, hint: '"not great" is informal — try "marginal" or "substandard".' },
  { pat: /\bdriver\s+error\b/i, hint: '"driver error" is informal — try "operator error" or "grounding contact".' },
  { pat: /\bawful(?:ly)?\b/i, hint: '"awful" is informal — try "unserviceable" or "severe".' },
  { pat: /\bterribl(?:e|y)\b/i, hint: '"terrible" is informal — try "severely deteriorated" or "unserviceable".' },
  { pat: /\btotally\b/i, hint: '"totally" is informal — try "entirely" or "completely".' },
  { pat: /\bridiculous(?:ly)?\b/i, hint: 'Informal — try "excessive" or "unreasonable".' },
  { pat: /\bgonna\b/i, hint: '"gonna" is informal — use "will" or "is going to".' },
  { pat: /\bwanna\b/i, hint: '"wanna" is informal — use "want to".' },
  { pat: /\bkinda\b|\bsorta\b/i, hint: 'Informal hedge — use "somewhat" or remove.' },
  { pat: /\bhuge\b/i, hint: '"huge" is informal — use "significant", "extensive", or a measurement.' },
  { pat: /\btons?\s+of\b/i, hint: '"tons of" is informal — use "numerous" or "extensive".' },
  { pat: /\ba\s+lot\s+of\b/i, hint: '"a lot of" is informal — use "numerous" or "extensive".' },
  { pat: /\bmessed\s+up\b/i, hint: 'Informal — use "damaged" or "compromised".' },
  { pat: /\bshoddy\b/i, hint: 'Informal — use "substandard" or "poorly executed".' },
  { pat: /\bjunk\b/i, hint: '"junk" is informal — use "unserviceable".' },
  { pat: /\bcrap(?:py)?\b/i, hint: 'Informal — use "substandard" or "poor quality".' },
  { pat: /\bsketchy\b/i, hint: '"sketchy" is informal — use "questionable" or "unreliable".' },
  { pat: /\bbeat[- ]up\b/i, hint: '"beat-up" is informal — use "worn" or "deteriorated".' },
  { pat: /\btrashed\b/i, hint: '"trashed" is informal — use "unserviceable" or "extensively damaged".' }
];

// Curated misspellings list. Native browser spellcheck underlines typos
// but doesn't let us read them programmatically — so we maintain an
// explicit map of words the surveyor is likely to fat-finger on mobile.
// Grow this list over time as new typos come up in real use.
// Format: [/\bpattern\b/i, 'correct word']
const SPELLING_FIXES = [
  [/\bdanage\b/i, 'damage'],
  [/\bdanaged\b/i, 'damaged'],
  [/\bdamge\b/i, 'damage'],
  [/\bdamged\b/i, 'damaged'],
  [/\bcraking\b/i, 'cracking'],
  [/\bcraked\b/i, 'cracked'],
  [/\bcrack\s+ing\b/i, 'cracking'],
  [/\bcroding\b/i, 'corroding'],
  [/\bcorosion\b/i, 'corrosion'],
  [/\bcorroded\b/i, 'corroded'],
  [/\bcorrrosion\b/i, 'corrosion'],
  [/\bcorosive\b/i, 'corrosive'],
  [/\bfibreglas\b/i, 'fibreglass'],
  [/\bfiberglass\b/i, 'fibreglass (Canadian spelling)'],
  [/\bfiber\b/i, 'fibre (Canadian spelling)'],
  [/\bcolor\b/i, 'colour (Canadian spelling)'],
  [/\bcenter\b/i, 'centre (Canadian spelling)'],
  [/\borganize\b/i, 'organise (Canadian spelling)'],
  [/\binspecton\b/i, 'inspection'],
  [/\binspctor\b/i, 'inspector'],
  [/\bsurvery\b/i, 'survey'],
  [/\bsurveor\b/i, 'surveyor'],
  [/\bsurvayor\b/i, 'surveyor'],
  [/\bvesel\b/i, 'vessel'],
  [/\bvessle\b/i, 'vessel'],
  [/\bproppeller\b/i, 'propeller'],
  [/\bproppellor\b/i, 'propeller'],
  [/\bpropellor\b/i, 'propeller'],
  [/\brudde\b/i, 'rudder'],
  [/\brudder\s+s\b/i, 'rudders'],
  [/\bshft\b/i, 'shaft'],
  [/\bbering\b/i, 'bearing'],
  [/\bberaing\b/i, 'bearing'],
  [/\bcutlass\b/i, 'cutless (cutless bearing)'],
  [/\bstuffing\s+boox\b/i, 'stuffing box'],
  [/\bstufing\b/i, 'stuffing'],
  [/\bengne\b/i, 'engine'],
  [/\bengien\b/i, 'engine'],
  [/\btranny\b/i, 'transmission'],
  [/\btrasnsmission\b/i, 'transmission'],
  [/\balternater\b/i, 'alternator'],
  [/\balternater\b/i, 'alternator'],
  [/\bbatery\b/i, 'battery'],
  [/\bbatteries\b/i, 'batteries'],
  [/\bimpellor\b/i, 'impeller'],
  [/\bimpeler\b/i, 'impeller'],
  [/\bthru\s+hull\b/i, 'through-hull'],
  [/\bthruhull\b/i, 'through-hull'],
  [/\bthrough\s+hull\b/i, 'through-hull (hyphenated)'],
  [/\bseacock\s+s\b/i, 'seacocks'],
  [/\bsecock\b/i, 'seacock'],
  [/\bgasline\b/i, 'gasoline'],
  [/\bdeisel\b/i, 'diesel'],
  [/\bdisel\b/i, 'diesel'],
  [/\bgalvinized\b/i, 'galvanised'],
  [/\bgalvanized\b/i, 'galvanised (Canadian spelling)'],
  [/\banodized\b/i, 'anodised (Canadian spelling)'],
  [/\bwaterline\b/i, 'waterline'],
  [/\bwater\s+line\b/i, 'waterline (one word)'],
  [/\bhul\b/i, 'hull'],
  [/\bkel\b/i, 'keel'],
  [/\bdek\b/i, 'deck'],
  [/\bcabn\b/i, 'cabin'],
  [/\bcocpit\b/i, 'cockpit'],
  [/\bbildge\b/i, 'bilge'],
  [/\bblige\b/i, 'bilge'],
  [/\bteh\b/i, 'the'],
  [/\band\/or\s+or\b/i, 'and/or'],
  [/\bequipement\b/i, 'equipment'],
  [/\bequiptment\b/i, 'equipment'],
  [/\bservicable\b/i, 'serviceable'],
  [/\bseviceable\b/i, 'serviceable'],
  [/\bseverly\b/i, 'severely'],
  [/\bsevere\s+ly\b/i, 'severely'],
  [/\bcompletly\b/i, 'completely'],
  [/\bimmediatly\b/i, 'immediately'],
  [/\bseperate\b/i, 'separate'],
  [/\bseperated\b/i, 'separated'],
  [/\boccured\b/i, 'occurred'],
  [/\brecomend\b/i, 'recommend'],
  [/\brecomended\b/i, 'recommended'],
  [/\brecomendation\b/i, 'recommendation'],
  [/\bmantainance\b/i, 'maintenance'],
  [/\bmaintainance\b/i, 'maintenance'],
  [/\bmaintnance\b/i, 'maintenance']
];

// Scan text for spelling issues. Uses the full hunspell-expanded English
// dictionary (SPELL_DICT, ~128k words + marine supplement). Returns a list
// of unknown words as hints in the form '"word" — unknown'.
//
// Tokenization rules:
// - Split on whitespace and punctuation
// - Skip pure numbers and alphanumeric mixes (hull IDs, part numbers)
// - Skip ALL-CAPS tokens of length >= 2 (acronyms: ABYC, TC, HIN, USCG…)
// - Strip trailing possessive 's / s'
// - Lowercase the word and check against SPELL_DICT
// - If the dictionary hasn't loaded yet, fall back to the curated
//   SPELLING_FIXES list so we still catch the obvious typos.
function collectSpellingHits(text) {
  const combined = (text || '').trim();
  if (!combined) return [];
  const hits = [];
  const seen = new Set();
  // Fallback path when the dictionary hasn't finished loading.
  if (!SPELL_DICT) {
    for (const [pat, fix] of SPELLING_FIXES) {
      const m = combined.match(pat);
      if (m && !seen.has(m[0].toLowerCase())) {
        seen.add(m[0].toLowerCase());
        hits.push('"' + m[0] + '" → "' + fix + '"');
        if (hits.length >= 4) break;
      }
    }
    return hits;
  }
  // Real dictionary path: tokenize and lookup every word.
  // Keep hyphenated compounds as separate halves ("through-hull" → "through", "hull").
  const tokens = combined.split(/[\s,.;:!?"'()[\]{}—–\-/\\<>]+/);
  for (const raw of tokens) {
    if (!raw) continue;
    // Skip numbers, alphanumerics, unit suffixes (20v, 12vdc, 1/4")
    if (/\d/.test(raw)) continue;
    // Skip all-caps acronyms (length >= 2, all uppercase letters)
    if (raw.length >= 2 && raw === raw.toUpperCase() && /^[A-Z]+$/.test(raw)) continue;
    // Strip leading/trailing non-letters and trailing possessive "'s"
    let word = raw.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
    word = word.replace(/'s$/i, '');
    if (!word || word.length < 2) continue;
    // Skip single-letter words (a, I) and items that became empty after strip
    const lower = word.toLowerCase();
    if (seen.has(lower)) continue;
    if (SPELL_DICT.has(lower)) continue;
    // Check the raw form too, in case of mixed-case proper nouns we accept
    // as-is (very rare since dict is all lowercase, but future-proof).
    seen.add(lower);
    // Try common stem reductions before flagging — catches over-aggressive
    // false positives on inflections the affix expander may have missed.
    const stems = [
      lower.replace(/ing$/, ''),
      lower.replace(/ing$/, 'e'),
      lower.replace(/ed$/, ''),
      lower.replace(/ed$/, 'e'),
      lower.replace(/s$/, ''),
      lower.replace(/es$/, ''),
      lower.replace(/ies$/, 'y'),
      lower.replace(/ly$/, ''),
      lower.replace(/er$/, ''),
      lower.replace(/er$/, 'e'),
      lower.replace(/est$/, ''),
      lower.replace(/est$/, 'e')
    ];
    let recognised = false;
    for (const s of stems) {
      if (s && s !== lower && SPELL_DICT.has(s)) { recognised = true; break; }
    }
    if (recognised) continue;
    hits.push('"' + word + '" — unknown word');
    if (hits.length >= 4) break;
  }
  return hits;
}

// Scan a single piece of text against TONE_FLAGS and return up to 3 hints.
// Also merges in spelling suggestions so one banner covers both concerns.
function collectToneHits(text) {
  const combined = (text || '').trim();
  if (!combined) return [];
  const hits = [];
  const seen = new Set();
  for (const rule of TONE_FLAGS) {
    if (rule.pat.test(combined) && !seen.has(rule.hint)) {
      seen.add(rule.hint);
      hits.push(rule.hint);
      if (hits.length >= 3) break;
    }
  }
  // Append spelling hints with a distinct prefix so they render alongside
  // tone suggestions in the same banner.
  const spellHits = collectSpellingHits(text);
  spellHits.forEach(h => {
    const tagged = 'Possible typo: ' + h;
    if (!seen.has(tagged)) {
      seen.add(tagged);
      hits.push(tagged);
    }
  });
  return hits;
}

// Global tone-check for the main sheet textarea (any item, builder or not).
// Wired via the textarea's inline oninput handler.
window._mainSheetToneCheck = function(textarea) {
  if (!textarea) return;
  const banner = textarea.parentElement && textarea.parentElement.querySelector('[data-main-tone-warning]');
  if (!banner) return;
  try {
    renderToneBanner(banner, collectToneHits(textarea.value));
  } catch (e) { /* no-op — banner just stays hidden */ }
};

// Clear the green highlight on any previously-tapped Quick Insert card
// as soon as the user edits the textarea manually. Keeps the card list
// from looking "locked" after one tap.
window._clearSheetCardHighlight = function(textarea) {
  if (!textarea) return;
  const overlay = document.getElementById('bottomSheetOverlay');
  if (!overlay) return;
  overlay.querySelectorAll('.snippet-card-sheet').forEach(c => {
    c.style.background = '';
    c.style.borderLeft = '';
  });
};

// Populate or hide a single tone-warning banner element based on hits.
function renderToneBanner(banner, hits) {
  if (!banner) return;
  if (!hits || hits.length === 0) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }
  banner.style.display = 'block';
  banner.innerHTML = '<strong>Suggestions:</strong><br>' +
    hits.map(h => '• ' + escapeHtml(h)).join('<br>');
}

// Scan each custom input and the freeform notes textarea separately, and
// populate the tone-warning banner that sits immediately below THAT input.
// This way the surveyor sees the hint next to the text that triggered it,
// not at the bottom of the strip.
function updateToneWarning(strip) {
  if (!strip) return;
  // Per-token custom input banners
  strip.querySelectorAll('input[data-custom-idx]').forEach(inp => {
    const ti = inp.dataset.customIdx;
    const banner = strip.querySelector(`[data-tone-warning-for="${ti}"]`);
    renderToneBanner(banner, collectToneHits(inp.value));
  });
  // Freeform notes banner
  const freeformEl = strip.querySelector('textarea[data-freeform-notes]');
  const freeformBanner = strip.querySelector('[data-tone-warning-freeform]');
  if (freeformEl && freeformBanner) {
    renderToneBanner(freeformBanner, collectToneHits(freeformEl.value));
  }
}

// Recompute the textarea text from the stored template + current form state.
function applyBuilderState(strip) {
  if (!strip || !strip._template || !strip._textarea) return;
  const tokens = strip._tokens || [];
  const textarea = strip._textarea;
  // The template already has {count:...} tokens resolved at insertion time
  // using the survey's driveLineCount — no further subject resolution here.
  let text = strip._template;
  const citations = [];

  tokens.forEach((tok, ti) => {
    const isMulti = (tok.kind === 'any' || tok.kind === 'any-named');
    const inputs = strip.querySelectorAll(`input[data-token-idx="${ti}"]`);
    const selectedLabels = [];
    let anyCountable = false;
    inputs.forEach(inp => {
      if (inp.checked) {
        const oi = parseInt(inp.dataset.optIdx, 10);
        const opt = tok.options[oi];
        if (typeof opt === 'string') {
          selectedLabels.push(opt);
        } else {
          // For countable (s)-marked options, read the per-option count
          // badge and format the label as "a chipped blade" / "two bent
          // blades" / "three cracked blades" / "four missing blades".
          let chosenLabel = opt.label;
          if (opt.countable) {
            anyCountable = true;
            const badge = strip.querySelector(`.opt-count-badge[data-opt-token="${ti}"][data-opt-opt="${oi}"]`);
            const n = badge ? parseInt(badge.dataset.optCount || '1', 10) : 1;
            chosenLabel = formatCountedOption(opt, n);
          }
          selectedLabels.push(chosenLabel);
          (opt.citations || []).forEach(c => citations.push(c));
        }
      }
    });
    const customInput = strip.querySelector(`input[data-custom-idx="${ti}"]`);
    const customRaw = customInput ? (customInput.value || '').trim() : '';
    if (customRaw) {
      customRaw.split(/\s*,\s*/).filter(Boolean).forEach(l => {
        // Custom text is always spliced mid-sentence. Run the full mid-
        // sentence cleaner so EVERY capitalized word (not just the first)
        // gets downcased — iOS sentence-case often leaks in after any
        // space, producing artefacts like "damage And more damage".
        // Acronyms and whitelisted proper nouns are preserved.
        selectedLabels.push(cleanMidSentenceCaps(l));
      });
    }

    if (selectedLabels.length > 0) {
      const replacement = isMulti
        ? (anyCountable ? oxfordJoin(selectedLabels) : collapseSharedTail(selectedLabels))
        : selectedLabels[0];
      text = text.split(tok.literal).join(replacement);
    }
    // Unfilled token: leave the literal in place so the user can see what's
    // still missing; it will be blanked by finalizeSnippetText on save.
  });

  // Inject free-form "Additional observations" as a standalone sentence
  // between the main body and the {standards?} block (or at the end if no
  // standards block is present). This keeps the main template's grammar
  // intact regardless of what the surveyor types.
  const freeform = (strip.querySelector('textarea[data-freeform-notes]')?.value || '').trim();
  if (freeform) {
    let sentence = freeform;
    // Ensure final sentence ends with terminal punctuation.
    if (!/[.!?]$/.test(sentence)) sentence += '.';
    // Capitalize first letter for a clean sentence break.
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    // Strip iOS mid-sentence auto-capitalization artifacts (e.g. "...is
    // That." → "...is that.") while preserving acronyms and proper nouns.
    sentence = cleanMidSentenceCaps(sentence);
    const stdIdx = text.indexOf('{standards?');
    if (stdIdx >= 0) {
      // Insert before the standards token (with a leading space).
      const before = text.slice(0, stdIdx).replace(/\s*$/, '');
      const after = text.slice(stdIdx);
      text = before + ' ' + sentence + ' ' + after;
    } else {
      text = text.replace(/\s*$/, '') + ' ' + sentence;
    }
    // Collapse any accidental double spaces
    text = text.replace(/ {2,}/g, ' ');
  }

  // Persist citations
  const uniq = [];
  citations.forEach(c => { if (!uniq.includes(c)) uniq.push(c); });
  setCollectedCitations(textarea, uniq);
  // Resolve the {standards?...STANDARDS...} block LIVE so the surveyor sees
  // the violation sentence immediately as they tick defects (previously it
  // only appeared after Save via finalizeSnippetText).
  text = renderStandardsBlock(text, uniq);

  textarea.value = text;
  // Auto-expand the textarea to fit
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  // Auto-check matching Applicable Standards checkboxes in the active sheet.
  // Only adds checks — never removes — so manually-checked items are preserved.
  syncStandardsFromCitations(uniq);

  // Surface a gentle tone/professionalism warning under the builder strip
  // if the freeform notes or custom fields contain informal language.
  updateToneWarning(strip);
}

// Given the list of accumulated citations (e.g. ["ABYC P-4", "TP1332"]),
// check any matching checkbox in the open bottom-sheet's Applicable Standards
// list so the surveyor sees the automatic link between defect and standard.
//
// Matching strategy (in order):
//   1. Strict prefix/substring match on normalized strings
//   2. Code-head match: compare the first "ABYC X-N" / "TPNNNN" style code
//      on both sides
// This handles cases where the checkbox value is "ABYC P-4 - Inboard Engines"
// and the citation is just "ABYC P-4".
function syncStandardsFromCitations(citations) {
  if (!citations || citations.length === 0) return;
  const overlay = document.getElementById('bottomSheetOverlay');
  if (!overlay) return;
  const cbs = overlay.querySelectorAll('input[type="checkbox"]');
  const norm = s => (s || '').toLowerCase()
    .replace(/[\u2012-\u2015\u2212]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Extract the leading code identifier from a normalized standard string.
  // Examples:
  //   "abyc p-4 - inboard engines" -> "abyc p-4"
  //   "tp1332 - construction standards ..." -> "tp1332"
  //   "nfpa 302 - fire protection" -> "nfpa 302"
  //   "canada shipping act, 2001 ..." -> "canada shipping act"
  const codeHead = s => {
    const m = s.match(/^([a-z]+)\s*([a-z]?-?\d+(?:-\d+)?)/);
    if (m) return (m[1] + ' ' + m[2]).trim();
    // Generic fallback: take up to the first " - " or ","
    const cut = s.split(/\s[-–—]\s|,/)[0];
    return cut.trim();
  };

  citations.forEach(cit => {
    const target = norm(cit);
    if (!target) return;
    const targetCode = codeHead(target);
    let matched = false;
    cbs.forEach(cb => {
      const onch = cb.getAttribute('onchange') || '';
      if (!onch.includes('updateStandards')) return;
      const val = norm(cb.value);
      const valCode = codeHead(val);
      const hit = val.startsWith(target)
        || val.includes(target)
        || (targetCode && valCode === targetCode)
        || (targetCode && val.startsWith(targetCode));
      if (hit) {
        matched = true;
        if (!cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    // Last-resort: check the label span text next to each checkbox
    if (!matched) {
      overlay.querySelectorAll('label').forEach(lbl => {
        const span = lbl.querySelector('span');
        if (!span) return;
        const txt = norm(span.textContent || '');
        if (!txt) return;
        const txtCode = codeHead(txt);
        if (txt.startsWith(target) || (targetCode && txtCode === targetCode)) {
          const cb = lbl.querySelector('input[type="checkbox"]');
          const onch = cb ? (cb.getAttribute('onchange') || '') : '';
          if (cb && onch.includes('updateStandards') && !cb.checked) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    }
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Open the popover for a single token. Multi-select tokens ('any', 'any-named')
// render checkboxes; single-select ('specify', 'specify-named') render radios.
// Both have a Custom text input.
function openChipPopover(textarea, tok, anchorEl) {
  // Remove any existing popover
  const existing = document.getElementById('chipPopoverOverlay');
  if (existing) existing.remove();

  const isMulti = (tok.kind === 'any' || tok.kind === 'any-named');
  const overlay = document.createElement('div');
  overlay.id = 'chipPopoverOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:100001;display:flex;align-items:flex-end;justify-content:center;padding:0;';

  // Build option rows
  let rowsHtml = '';
  tok.options.forEach((opt, i) => {
    const label = (typeof opt === 'string') ? opt : (opt.label || '');
    const cites = (typeof opt === 'object' && opt.citations && opt.citations.length)
      ? ` <span style="color:#6b7280;font-size:11px;">(${escapeHtml(opt.citations.join(', '))})</span>` : '';
    rowsHtml += `
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;min-height:48px;">
        <input type="${isMulti ? 'checkbox' : 'radio'}" name="chip-opt" value="${i}"
               style="width:20px;height:20px;accent-color:#006699;flex-shrink:0;" />
        <span style="font-size:15px;color:#1f2937;line-height:1.4;">${escapeHtml(label)}${cites}</span>
      </label>
    `;
  });

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px 16px 0 0;width:100%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 -6px 24px rgba(0,0,0,0.25);padding-bottom:calc(16px + env(safe-area-inset-bottom));" onclick="event.stopPropagation();">
      <div style="padding:18px 20px 6px;font-weight:700;font-size:17px;color:#006699;">${escapeHtml(tok.label)}</div>
      <div style="padding:2px 20px 10px;font-size:12px;color:#6b7280;">${isMulti ? 'Select all that apply' : 'Choose one'}</div>
      <div style="overflow-y:auto;flex:1 1 auto;">
        ${rowsHtml}
        <div style="padding:14px 16px;border-top:1px solid #e5e7eb;background:#fafafa;">
          <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Custom (optional)</label>
          <input id="chipCustomInput" type="text" placeholder="Type a custom value${isMulti ? ' (one at a time)' : ''}…"
                 style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;" />
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 20px 6px;">
        <button type="button" id="chipCancel"
          style="background:#64748b;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Cancel</button>
        <button type="button" id="chipApply"
          style="background:#006699;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Apply</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);

  document.getElementById('chipCancel').addEventListener('click', () => overlay.remove());
  document.getElementById('chipApply').addEventListener('click', () => {
    const inputs = overlay.querySelectorAll('input[name="chip-opt"]');
    const selectedIdx = [];
    inputs.forEach(inp => { if (inp.checked) selectedIdx.push(parseInt(inp.value, 10)); });
    const customRaw = (document.getElementById('chipCustomInput').value || '').trim();

    // Build selected label list + citations list
    const selectedLabels = [];
    const citations = [];
    selectedIdx.forEach(i => {
      const opt = tok.options[i];
      if (typeof opt === 'string') {
        selectedLabels.push(opt);
      } else {
        selectedLabels.push(opt.label);
        (opt.citations || []).forEach(c => citations.push(c));
      }
    });
    if (customRaw) {
      // Custom values are treated as plain labels with no citations
      customRaw.split(/\s*,\s*/).filter(Boolean).forEach(lbl => selectedLabels.push(lbl));
    }

    if (selectedLabels.length === 0) {
      showToast('Pick at least one option or type a custom value');
      return;
    }

    // Build the replacement text
    let replacement;
    if (tok.kind === 'any' || tok.kind === 'any-named') {
      replacement = collapseSharedTail(selectedLabels);
    } else {
      replacement = selectedLabels[0]; // single-select
    }

    // String-replace the literal token in the textarea
    const before = textarea.value;
    const after = before.split(tok.literal).join(replacement);
    textarea.value = after;

    // Merge + persist citations on the textarea
    const existingCites = getCollectedCitations(textarea);
    const merged = existingCites.slice();
    citations.forEach(c => { if (!merged.includes(c)) merged.push(c); });
    setCollectedCitations(textarea, merged);

    overlay.remove();
    refreshChipStrip(textarea);
  });
}

// Finalize: expand {standards?...} block using collected citations, strip
// any still-unresolved {any:...}/{specify:...}/{name} tokens, and return the
// text that should be saved to the survey item.
function finalizeSnippetText(textarea) {
  if (!textarea) return '';
  const cites = getCollectedCitations(textarea);
  let text = renderStandardsBlock(textarea.value, cites);
  // Blank out any leftover unresolved tokens (the user left them empty).
  // We replace them with "[…]" so the saved output is still readable and the
  // gap is obvious in the report.
  text = text.replace(/\{(specify:|any:)[^{}]*\}/g, '[…]');
  text = text.replace(/\{[a-zA-Z0-9_ -]+\}/g, '[…]');
  // Clean up double spaces introduced by stripped tokens
  text = text.replace(/ {2,}/g, ' ').replace(/ \./g, '.').replace(/ ,/g, ',');
  return text;
}

window._chipStrip = {
  refresh: refreshChipStrip,
  finalize: finalizeSnippetText
};

// Create new survey
function createNewSurvey(formData) {
  const survey = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    vesselName: formData.vesselName,
    yearMakeModel: formData.yearMakeModel,
    clientName: formData.clientName,
    surveyDate: formData.surveyDate,
    location: formData.location,
    locationLat: formData.locationLat || null,
    locationLon: formData.locationLon || null,
    surveyType: formData.surveyType,

    // Specs section
    vesselType: formData.vesselType || 'power',
    boatStyle: formData.boatStyle,
    hullType: formData.hullType,
    loa: formData.loa,
    lwl: formData.lwl,
    beam: formData.beam,
    displacement: formData.displacement,
    ballast: formData.ballast,
    maxDraft: formData.maxDraft,
    totalSailArea: formData.totalSailArea,
    construction: formData.construction,
    keelType: formData.keelType,
    numberCabins: formData.numberCabins,
    electricalSystem: formData.electricalSystem,
    changesToPlan: formData.changesToPlan,

    // Survey specs section
    personsInAttendance: formData.personsInAttendance,
    independentSurveys: formData.independentSurveys,
    reportDate: formData.reportDate,
    weather: formData.weather,
    onLandOrWater: formData.onLandOrWater,
    seaTrial: formData.seaTrial,
    powerAtTime: formData.powerAtTime,
    waterAtTime: formData.waterAtTime,
    storageDetails: formData.storageDetails,

    // Engine/Transmission
    engineMake: formData.engineMake,
    engineModel: formData.engineModel,
    engineSerial: formData.engineSerial,
    engineHours: formData.engineHours,
    engineHP: formData.engineHP,
    fuelType: formData.fuelType,
    transmissionMakeModel: formData.transmissionMakeModel,
    transmissionSerial: formData.transmissionSerial,

    // Bilge pumps
    bilgePumps: formData.bilgePumps || [],

    // Comparables
    comparables: formData.comparables || [],

    // Vessel description
    vesselDescription: formData.vesselDescription,

    // Vessel documentation
    tcLicenseType: formData.tcLicenseType,
    tcLicense: formData.tcLicense,
    tcLicenseExpiry: formData.tcLicenseExpiry,
    hinNumber: formData.hinNumber,
    taxStatus: formData.taxStatus,
    compliancePlate: formData.compliancePlate,

    // Valuation section
    valuationLow: formData.valuationLow,
    valuationHigh: formData.valuationHigh,
    valuationCurrency: formData.valuationCurrency || 'USD',
    exchangeRate: formData.exchangeRate || 1.35,
    valuationSources: formData.valuationSources || [],
    valuationSource: formData.valuationSource, // backward compat
    valuationRationale: formData.valuationRationale,
    replacementCost: formData.replacementCost,
    overallCondition: formData.overallCondition,

    // Safety equipment checklist (auto-generated from TP 511)
    safetyEquipment: [],

    // Instruments & Electronics inventory (photo-based with AI identification)
    instrumentsElectronics: [],

    // Inspection items - will be populated as user rates items
    items: {},

    // Status tracking
    completedCount: 0,
    totalRatedItems: 0
  };

  return survey;
}

// Calculate completion percentage (excludes fully-excluded categories from the count)
function getCompletionPercentage(survey) {
  if (!survey) return 0;

  // If totalRatedItems was already calculated (from inspection view), use it
  let total = survey.totalRatedItems;

  // Otherwise, calculate from the template on the fly
  if (!total) {
    const template = getTemplateForSurvey(survey);
    if (!template || template.length === 0) return 0;

    const isPowerboat = (survey.vesselType || '').toLowerCase() === 'power';
    const sailOnlyCategories = ['Spars and rigging', 'Sails'];
    let count = 0;

    template.forEach(section => {
      if (section.name === 'Kiki Marine Survey' && section.categories) {
        section.categories.forEach(category => {
          if (isPowerboat && sailOnlyCategories.includes(category.name)) return;
          if (category.items) {
            count += category.items.filter(item => item.type === 'list').length;
          }
        });
      }
    });

    total = count || 1; // avoid divide by zero
  }

  // Count items that are rated OR excluded
  const completedOrExcluded = Object.values(survey.items || {})
    .filter(item => (item.rating && item.rating !== '') || item.excluded).length;
  return Math.min(100, Math.round((completedOrExcluded / total) * 100));
}

// UI Rendering Functions
// Emergency data recovery — attempts to read all surveys from IndexedDB and export as JSON
async function emergencyRecovery() {
  const statusEl = document.getElementById('recovery-status');
  if (statusEl) statusEl.innerHTML = '<p style="color:#0369a1;">Attempting to read IndexedDB...</p>';

  try {
    const result = await new Promise((resolve, reject) => {
      const request = indexedDB.open('KikiSurveyDB');
      request.onerror = () => reject(new Error('Cannot open database: ' + (request.error || 'unknown error')));
      request.onsuccess = () => {
        const recoveryDb = request.result;
        const storeNames = Array.from(recoveryDb.objectStoreNames);

        if (!storeNames.includes('surveys')) {
          recoveryDb.close();
          resolve({ found: false, reason: 'No surveys store found. Store names: ' + storeNames.join(', ') });
          return;
        }

        const tx = recoveryDb.transaction(['surveys'], 'readonly');
        const store = tx.objectStore('surveys');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const surveys = getAll.result;
          recoveryDb.close();
          resolve({ found: surveys.length > 0, surveys: surveys, count: surveys.length });
        };
        getAll.onerror = () => {
          recoveryDb.close();
          reject(new Error('Failed to read surveys: ' + getAll.error));
        };
      };
    });

    if (result.found) {
      // Success — export as downloadable JSON
      const json = JSON.stringify(result.surveys, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      if (statusEl) statusEl.innerHTML = `
        <p style="color:#16a34a;font-weight:bold;">Found ${result.count} survey(s)!</p>
        <a href="${url}" download="kiki_survey_recovery_${Date.now()}.json"
           style="display:inline-block;margin:8px 0;padding:12px 24px;background:#16a34a;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">
           Download Survey Data (JSON)
        </a>
        <p style="font-size:12px;color:#666;">Save this file, then use Import Survey to reload it.</p>
        <div style="margin-top:12px;max-height:200px;overflow:auto;background:#f1f5f9;padding:8px;border-radius:4px;font-size:11px;text-align:left;">
          <pre style="white-space:pre-wrap;word-break:break-all;">${json.substring(0, 2000)}${json.length > 2000 ? '\n... (truncated for display)' : ''}</pre>
        </div>
      `;
    } else {
      if (statusEl) statusEl.innerHTML = `<p style="color:#dc2626;">No survey data found in database. ${result.reason || ''}</p>`;
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<p style="color:#dc2626;">Recovery error: ${e.message}</p>
      <p style="font-size:12px;color:#666;">The database backing store may be corrupted at the browser level.</p>`;
  }
}

function renderHome() {
  currentView = 'surveys'; persistViewState();
  history.replaceState({ view: 'surveys' }, '');
  // Remove inspection bottom bar (Backup / Check Survey / Preview Report)
  const bottomBar = document.getElementById('inspectionBottomBar');
  if (bottomBar) bottomBar.remove();
  // Hide the save status pill on the home page (it's per-survey)
  if (typeof SaveStatus !== 'undefined') SaveStatus.hide();
  // Hide the floating collapse button (only relevant on inspection view)
  updateCollapseButton(false);
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      <div style="display:flex; align-items:flex-end; gap:12px;">
        <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
             alt="Kiki Marine" style="height:40px; width:auto;"
             onerror="this.style.display='none'">
        <div style="display:flex;align-items:center;gap:8px;padding-bottom:2px;">
          <span style="color:#3399cc;font-size:13px;">Marine Vessel Surveys — ${APP_VERSION}</span>
        </div>
      </div>
      <div id="syncStatusIndicator" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;cursor:help;" title="Sync status"></div>
    </div>
    <div class="content" id="surveys-content">
      <div style="text-align: center; padding: 20px;">
        <p>Loading surveys...</p>
      </div>
    </div>
  `;

  // Load surveys asynchronously
  getAllSurveys().then(surveys => {
    const content = document.getElementById('surveys-content');

    // Import, Export, and Drive Backup buttons at top — branded pill style
    const pillBase = 'flex:1;border:none;border-radius:14px;padding:8px 4px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;text-align:center;';
    const driveBtn = DriveBackup.isSignedIn()
      ? `<button style="${pillBase}background:#3399cc;color:white;" onclick="DriveBackup.backupAll()">☁️ Backup to Drive</button>`
      : `<button style="${pillBase}background:rgba(0,102,153,0.08);color:#006699;border:1px solid #3399cc;" onclick="(async()=>{try{await DriveBackup.signIn();showToast('Signed in to Google Drive ✓');renderHome();}catch(e){if(e.code!=='auth/popup-closed-by-user')showAlert('Sign-in failed: '+e.message);}})()">☁️ Google Drive</button>`;
    const firebaseSyncBtn = (typeof FirebaseSync !== 'undefined' && FirebaseSync.isEnabled())
      ? `<button style="${pillBase}background:#f59e0b;color:white;" onclick="syncAllPhotosToFirebase()">🔥 Sync All to Firebase</button>`
      : '';
    const importBtn = `<div style="display:flex;gap:6px;margin-bottom:12px;padding:0 4px;align-items:center;">
        ${driveBtn}
        ${firebaseSyncBtn}
        <div style="position:relative;flex:0 0 auto;">
          <button style="border:none;border-radius:14px;padding:8px 12px;font-size:14px;font-weight:700;cursor:pointer;background:#f1f5f9;color:#64748b;" onclick="event.stopPropagation();const m=document.getElementById('homeOverflowMenu');if(m)m.style.display=m.style.display==='none'?'flex':'none';">⋯</button>
          <div id="homeOverflowMenu" style="display:none;position:absolute;top:100%;right:0;margin-top:6px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.18);padding:6px;flex-direction:column;gap:4px;min-width:170px;z-index:200;">
            <button onclick="document.getElementById('homeOverflowMenu').style.display='none';exportAllSurveys()" style="border:none;background:none;padding:10px 14px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:8px;color:#006699;">📦 Export All Surveys</button>
            <button onclick="document.getElementById('homeOverflowMenu').style.display='none';importSurvey()" style="border:none;background:none;padding:10px 14px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:8px;color:#006699;">📥 Import Survey</button>
            <button onclick="document.getElementById('homeOverflowMenu').style.display='none';forceAppUpdate()" style="border:none;background:none;padding:10px 14px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:8px;color:#64748b;">↻ Force Update</button>
          </div>
        </div>
      </div>`;

    if (surveys.length === 0) {
      content.innerHTML = `
        ${importBtn}
        <div class="empty-state">
          <div class="empty-icon">⛵</div>
          <h2>No Surveys Yet</h2>
          <p>Create your first survey or import one from another device</p>
          <div style="margin-top:20px;padding:16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;">
            <p style="font-size:14px;font-weight:600;color:#92400e;margin-bottom:8px;">Missing a survey?</p>
            <button onclick="emergencyRecovery()" style="padding:10px 20px;background:#dc2626;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;">
              Attempt Data Recovery
            </button>
            <div id="recovery-status" style="margin-top:12px;"></div>
          </div>
        </div>
      `;
    } else {
      const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthsFull = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      // Group surveys by date, oldest first
      const sorted = [...surveys].sort((a, b) => {
        const da = a.surveyDate || new Date(a.createdAt).toISOString().split('T')[0];
        const db = b.surveyDate || new Date(b.createdAt).toISOString().split('T')[0];
        return da.localeCompare(db);
      });

      const groups = {};
      sorted.forEach(survey => {
        const rawDate = survey.surveyDate || new Date(survey.createdAt).toISOString().split('T')[0];
        const parts = rawDate ? rawDate.split('-') : [];
        const groupKey = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : 'Unknown';
        const groupLabel = parts.length >= 2 ? `${monthsFull[parseInt(parts[1], 10) - 1]} ${parts[0]}` : 'Other';
        if (!groups[groupKey]) groups[groupKey] = { label: groupLabel, surveys: [] };
        groups[groupKey].surveys.push({ survey, rawDate, parts });
      });

      let html = importBtn + '<div style="margin-bottom:120px;">';

      for (const groupKey of Object.keys(groups).sort().reverse()) {
        const group = groups[groupKey];
        html += `
          <div style="margin-bottom:4px;">
            <div style="padding:8px 4px 4px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">
              ${esc(group.label)} <span style="font-weight:400;color:#cbd5e1;">(${group.surveys.length})</span>
            </div>
            <div style="background:white;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
        `;

        group.surveys.forEach(({ survey, parts }, idx) => {
          const completion = getCompletionPercentage(survey);
          const dayNum = parts.length >= 3 ? parseInt(parts[2], 10) : '';
          const monthShort = parts.length >= 2 ? months[parseInt(parts[1], 10) - 1] : '';

          const typeShort = survey.surveyType === 'Insurance survey' ? 'INS'
            : survey.surveyType === 'Pre-purchase survey' ? 'P-P'
            : survey.surveyType === 'Appraisal' ? 'APR' : '';
          const typeBadgeBg = survey.surveyType === 'Insurance survey' ? '#f59e0b'
            : survey.surveyType === 'Pre-purchase survey' ? '#006699'
            : survey.surveyType === 'Appraisal' ? '#7c3aed' : '#94a3b8';

          const vesselName = survey.vesselName ? esc(survey.vesselName) : 'Unnamed';
          const clientName = survey.clientName ? esc(survey.clientName) : '';
          const location = survey.location ? esc(shortLocation(survey.location)) : '';
          const ymm = survey.yearMakeModel ? esc(survey.yearMakeModel) : '';

          const progressColour = completion === 100 ? '#16a34a' : completion >= 50 ? '#006699' : '#94a3b8';
          const rowId = `sr-${survey.id}`;
          const separator = idx > 0 ? 'border-top:1px solid #f1f5f9;' : '';

          html += `
            <div style="${separator}">
              <div style="display:flex;align-items:center;gap:0;cursor:pointer;padding:10px 8px;user-select:none;-webkit-tap-highlight-color:transparent;"
                   onclick="openSurvey('${survey.id}')">
                <!-- Date column -->
                <div style="flex:0 0 42px;text-align:center;">
                  <div style="font-size:18px;font-weight:700;color:#1e293b;line-height:1.1;">${dayNum}</div>
                  <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">${monthShort}</div>
                </div>
                <!-- Type badge -->
                <div style="flex:0 0 36px;text-align:center;">
                  ${typeShort ? `<span style="display:inline-block;background:${typeBadgeBg};color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;letter-spacing:0.3px;">${typeShort}</span>` : ''}
                </div>
                <!-- Main info -->
                <div style="flex:1;min-width:0;padding:0 6px;">
                  <div style="font-size:14px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${vesselName}</div>
                  <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${[clientName, ymm, location].filter(Boolean).join(' · ')}</div>
                </div>
                <!-- Progress ring + chevron -->
                <div style="flex:0 0 auto;display:flex;align-items:center;gap:4px;">
                  <div style="position:relative;width:28px;height:28px;">
                    <svg width="28" height="28" viewBox="0 0 28 28">
                      <circle cx="14" cy="14" r="11" fill="none" stroke="#e2e8f0" stroke-width="3"/>
                      <circle cx="14" cy="14" r="11" fill="none" stroke="${progressColour}" stroke-width="3"
                              stroke-dasharray="${(completion / 100) * 69.1} 69.1"
                              stroke-linecap="round" transform="rotate(-90 14 14)"/>
                    </svg>
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:${progressColour};">${completion}</div>
                  </div>
                </div>
                <!-- Expand arrow (left side) -->
                <span id="${rowId}-chev" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:24px;color:#94a3b8;flex-shrink:0;order:-1;"
                      onclick="event.stopPropagation();toggleSurveyRow('${survey.id}')">▸</span>
              </div>
              <!-- Expandable actions panel -->
              <div id="${rowId}" style="display:none;padding:0 10px 10px 52px;">
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button onclick="event.stopPropagation();(async()=>{currentSurveyId='${survey.id}';checkSurvey();})()" style="flex:1;min-width:70px;padding:8px 10px;font-size:12px;font-weight:600;background:#ffcc00;color:#006699;border:none;border-radius:14px;cursor:pointer;">✅ Check</button>
                  <button onclick="event.stopPropagation();(async()=>{const s=await getSurvey('${survey.id}');if(s)generateReport(s);})()" style="flex:1;min-width:70px;padding:8px 10px;font-size:12px;font-weight:600;background:#006699;color:white;border:none;border-radius:14px;cursor:pointer;">📄 Report</button>
                  <button onclick="event.stopPropagation();exportSurvey('${survey.id}')" style="flex:1;min-width:70px;padding:8px 10px;font-size:12px;font-weight:600;background:#f1f5f9;color:#334155;border:none;border-radius:14px;cursor:pointer;">📤 Export</button>
                  <button onclick="event.stopPropagation();deleteSurveyConfirm('${survey.id}')" style="flex:1;min-width:70px;padding:8px 10px;font-size:12px;font-weight:600;background:#fef2f2;color:#dc2626;border:none;border-radius:14px;cursor:pointer;">🗑 Delete</button>
                </div>
              </div>
            </div>
          `;
        });

        html += '</div></div>';
      }
      html += '</div>';
      content.innerHTML = html;
    }

    // Add floating action button for new survey (remove any existing fab/bar first)
    const existingFab = document.querySelector('.fab');
    if (existingFab) existingFab.remove();
    const bottomBarEl = document.getElementById('inspectionBottomBar');
    if (bottomBarEl) bottomBarEl.remove();
    const reportBtnEl = document.getElementById('reportBtn');
    if (reportBtnEl) reportBtnEl.remove();

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#006699" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    fab.onclick = () => renderNewSurveyForm();
    document.body.appendChild(fab);
  });
}

// ─── Fetch USD/CAD exchange rate from API ─────────────────────────────────
function fetchExchangeRate() {
  const exchangeRateField = document.getElementById('exchangeRate');
  if (!exchangeRateField) return;

  try {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data.rates && data.rates.CAD) {
          const rate = data.rates.CAD.toFixed(2);
          exchangeRateField.value = rate;
        }
      })
      .catch(err => {
        // Silently fail if offline or API unavailable — keep default
      });
  } catch (e) {
    // Network error or offline
  }
}

function renderNewSurveyForm() {
  currentView = 'new-survey'; persistViewState();
  history.pushState({ view: 'new-survey' }, '');
  const existingFab = document.querySelector('.fab');
  if (existingFab) existingFab.remove();
  const bottomBarEl2 = document.getElementById('inspectionBottomBar');
  if (bottomBarEl2) bottomBarEl2.remove();
  const reportBtnEl = document.getElementById('reportBtn');
  if (reportBtnEl) reportBtnEl.remove();
  // Hide the floating collapse button (only relevant on inspection view)
  updateCollapseButton(false);

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="confirmAbandonNewSurvey()">←</button>
      <div class="header-title" style="flex:1;">New Survey</div>
      <div id="syncStatusIndicator" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;cursor:help;" title="Sync status"></div>
    </div>
    <div class="content">
      <h2 class="form-heading">Vessel Information</h2>

      <div class="form-group">
        <label class="form-label">Vessel Name *</label>
        <input type="text" id="vesselName" class="capitalize-input" placeholder="e.g., Sea Dream II" autocapitalize="words" onblur="this.value=capitalizeWords(this.value)">
      </div>

      <div class="form-group">
        <label class="form-label">Year / Make / Model *</label>
        <input type="text" id="yearMakeModel" class="capitalize-input" placeholder="e.g., 2015 Beneteau Oceanis 46"
               onblur="checkSpecsOnBlur()" oninput="_specsAppliedForInput='';checkSpecsDebounced()" autocapitalize="words">
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Tip: Enter year, make and model — specs may auto-fill from built-in database</div>
      </div>

      <div style="margin: 0 0 16px;">
        <button class="btn-secondary" style="width: 100%; font-size: 14px;" onclick="lookupSpecs()">
          🔍 Auto-Fill Specs
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Client Name</label>
        <input type="text" id="clientName" class="capitalize-input" placeholder="Client name" autocapitalize="words" onblur="this.value=capitalizeWords(this.value)">
      </div>

      <div class="form-group">
        <label class="form-label">Survey Date</label>
        <input type="date" id="surveyDate" value="${new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-group" style="position:relative;">
        <label class="form-label">Location</label>
        <input type="text" id="location" placeholder="Start typing an address or marina name..."
               oninput="searchLocation(this.value)" autocomplete="off" autocapitalize="words">
        <div id="locationDropdown" style="display:none;position:absolute;left:0;right:0;background:white;border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;max-height:200px;overflow-y:auto;z-index:100;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
        <div id="mapPreview"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Survey Type</label>
        <select id="surveyType">
          <option value="">Select survey type</option>
          <option value="Pre-purchase survey">Pre-purchase survey</option>
          <option value="Insurance survey">Insurance survey</option>
          <option value="Appraisal">Appraisal / Condition and valuation</option>
        </select>
      </div>

      <h2 class="form-heading">Specifications</h2>

      <div class="form-group">
        <label class="form-label">Vessel Type (for TC safety equipment requirements)</label>
        <select id="vesselType" onchange="updateBoatStyleOptions()">
          <option value="">Select</option>
          <option value="power">Power-driven</option>
          <option value="sail">Sailing vessel</option>
          <option value="human-powered">Human-powered (canoe, kayak, rowboat)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Boat Style / Rig Type</label>
        <div id="boatStyleContainer" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:8px;padding:8px 0;">
          <div style="color:#9ca3af;font-size:13px;grid-column:1/-1;">Select vessel type first</div>
        </div>
        <input type="hidden" id="boatStyle" value="">
      </div>

      <div class="form-group">
        <label class="form-label">LOA (Length Overall)</label>
        <input type="text" id="loa" placeholder="e.g., 46 feet">
      </div>

      <div class="form-group">
        <label class="form-label">LWL (Length at Waterline)</label>
        <input type="text" id="lwl" placeholder="">
      </div>

      <div class="form-group">
        <label class="form-label">Beam</label>
        <input type="text" id="beam" placeholder="e.g., 15 feet">
      </div>

      <div class="form-group">
        <label class="form-label">Displacement</label>
        <input type="text" id="displacement" placeholder="">
      </div>

      <div class="form-group sail-only-field">
        <label class="form-label">Ballast</label>
        <input type="text" id="ballast" placeholder="">
      </div>

      <div class="form-group">
        <label class="form-label">Max Draft</label>
        <input type="text" id="maxDraft" placeholder="">
      </div>

      <div class="form-group sail-only-field">
        <label class="form-label">Total Sail Area</label>
        <input type="text" id="totalSailArea" placeholder="">
      </div>

      <div class="form-group">
        <label class="form-label">Hull Type</label>
        <select id="hullType">
          <option value="">Select hull type</option>
          <option value="Catamaran">Catamaran</option>
          <option value="Chined">Chined</option>
          <option value="Displacement">Displacement</option>
          <option value="Double ended">Double ended</option>
          <option value="Flat bottom">Flat bottom</option>
          <option value="Multi-chined">Multi-chined</option>
          <option value="Planing">Planing</option>
          <option value="Pontoon">Pontoon</option>
          <option value="Round bottom">Round bottom</option>
          <option value="Scow">Scow</option>
          <option value="Semi-displacement">Semi-displacement</option>
          <option value="Trimaran">Trimaran</option>
          <option value="V-bottom">V-bottom</option>
        </select>
      </div>

      <div class="form-group sail-only-field">
        <label class="form-label">Keel Type</label>
        <select id="keelType">
          <option value="">Select keel type</option>
          <option value="Bulb">Bulb</option>
          <option value="Cutaway forefoot">Cutaway forefoot</option>
          <option value="Fin">Fin</option>
          <option value="Fin with bulb">Fin with bulb</option>
          <option value="Full, encapsulated">Full, encapsulated</option>
          <option value="Full, bolted">Full, bolted</option>
          <option value="Wing">Wing</option>
          <option value="Shoal">Shoal</option>
          <option value="Swing">Swing</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Construction</label>
        <input type="text" id="construction" placeholder="e.g., Fibreglass">
      </div>

      <div class="form-group">
        <label class="form-label">Number of Cabins</label>
        <select id="numberCabins">
          <option value="">Select</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7+">7+</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Electrical System</label>
        <select id="electricalSystem">
          <option value="">Select</option>
          <option value="12V DC only">12V DC only</option>
          <option value="12V DC / 120V AC (30 amp shore power)">12V DC / 120V AC (30 amp shore power)</option>
          <option value="12V DC / 120V AC (50 amp shore power)">12V DC / 120V AC (50 amp shore power)</option>
          <option value="12V DC / 120V AC / 240V AC (50 amp shore power)">12V DC / 120V AC / 240V AC (50 amp shore power)</option>
          <option value="24V DC / 120V AC (30 amp shore power)">24V DC / 120V AC (30 amp shore power)</option>
          <option value="24V DC / 120V AC (50 amp shore power)">24V DC / 120V AC (50 amp shore power)</option>
          <option value="24V DC / 120V AC / 240V AC (50 amp shore power)">24V DC / 120V AC / 240V AC (50 amp shore power)</option>
          <option value="12V DC / 120V AC with inverter">12V DC / 120V AC with inverter</option>
          <option value="12V DC / 120V AC with inverter/charger">12V DC / 120V AC with inverter/charger</option>
          <option value="12V DC / generator only">12V DC / generator only</option>
          <option value="24V DC / generator only">24V DC / generator only</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Changes to Original Plan</label>
        <textarea id="changesToPlan" placeholder="Any modifications or changes" autocapitalize="sentences"></textarea>
      </div>

      <h3 style="margin-top:16px;color:#006699;">Engine & Transmission</h3>

      <!-- Engine 1 -->
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:10px;background:#f8fafc;">
        <div id="engine1Label" style="font-weight:700;font-size:13px;color:#006699;margin-bottom:8px;">Engine</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Make</label>
            <select id="engineMake" onchange="onEngineMakeChange()">
              <option value="">Select make</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Model</label>
            <select id="engineModel" onchange="onEngineModelChange()">
              <option value="">Select make first</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Serial No.</label>
            <input type="text" id="engineSerial" placeholder="">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Hours</label>
            <input type="text" id="engineHours" placeholder="">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;margin-top:2px;cursor:pointer;">
              <input type="checkbox" id="engineHoursNA" onchange="if(this.checked){document.getElementById('engineHours').value='Hours not available';document.getElementById('engineHours').disabled=true;}else{document.getElementById('engineHours').value='';document.getElementById('engineHours').disabled=false;}"> Hours not available
            </label>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">HP / kW Rating</label>
            <input type="text" id="engineHP" placeholder="e.g., 54HP / 39.7kW">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Fuel Type</label>
            <select id="fuelType">
              <option value="">Select</option>
              <option value="Diesel">Diesel</option>
              <option value="Gasoline">Gasoline</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Engine Photo</label>
            <div data-photo-field="enginePhoto">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Engine
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('enginePhoto', 'Engine', event)" />
              </label>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Data Plate Photo</label>
            <div data-photo-field="enginePlatePhoto">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Data Plate
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('enginePlatePhoto', 'Data Plate', event)" />
              </label>
            </div>
          </div>
        </div>
        <div style="font-weight:700;font-size:13px;color:#006699;margin:12px 0 8px;">Transmission 1</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Transmission Make</label>
            <select id="transmissionMake" onchange="onTransmissionMakeChange()">
              <option value="">Select make</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Transmission Model</label>
            <select id="transmissionModel" onchange="onTransmissionModelChange()">
              <option value="">Select make first</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Transmission Serial No.</label>
            <input type="text" id="transmissionSerial" placeholder="">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Transmission Photo</label>
            <div data-photo-field="transmissionPhoto">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Transmission
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('transmissionPhoto', 'Transmission', event)" />
              </label>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Serial Plate Photo</label>
            <div data-photo-field="transmissionPlatePhoto">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Serial Plate
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('transmissionPlatePhoto', 'Serial Plate', event)" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Engine 2 (hidden by default) -->
      <div id="engine2Section" style="display:none;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:10px;background:#f8fafc;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:700;font-size:13px;color:#006699;">Engine 2 (Starboard)</div>
          <button class="btn-secondary" style="font-size:11px;padding:2px 8px;color:#dc2626;" onclick="removeEngine2()">Remove</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Make</label>
            <select id="engine2Make" onchange="onEngine2MakeChange()">
              <option value="">Select make</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Model</label>
            <select id="engine2Model" onchange="onEngine2ModelChange()">
              <option value="">Select make first</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Serial No.</label>
            <input type="text" id="engine2Serial" placeholder="">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Engine Hours</label>
            <input type="text" id="engine2Hours" placeholder="">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;margin-top:2px;cursor:pointer;">
              <input type="checkbox" id="engine2HoursNA" onchange="if(this.checked){document.getElementById('engine2Hours').value='Hours not available';document.getElementById('engine2Hours').disabled=true;}else{document.getElementById('engine2Hours').value='';document.getElementById('engine2Hours').disabled=false;}"> Hours not available
            </label>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">HP / kW Rating</label>
            <input type="text" id="engine2HP" placeholder="e.g., 54HP / 39.7kW">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Fuel Type</label>
            <select id="fuelType2">
              <option value="">Select</option>
              <option value="Diesel">Diesel</option>
              <option value="Gasoline">Gasoline</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Engine Photo</label>
            <div data-photo-field="engine2Photo">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Engine 2
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('engine2Photo', 'Engine 2', event)" />
              </label>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Data Plate Photo</label>
            <div data-photo-field="engine2PlatePhoto">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Data Plate 2
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('engine2PlatePhoto', 'Data Plate 2', event)" />
              </label>
            </div>
          </div>
        </div>
        <div style="font-weight:700;font-size:13px;color:#006699;margin:12px 0 8px;">Transmission 2</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Transmission Make</label>
            <select id="transmission2Make" onchange="onTransmission2MakeChange()">
              <option value="">Select make</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Transmission Model</label>
            <select id="transmission2Model" onchange="onTransmission2ModelChange()">
              <option value="">Select make first</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">Transmission Serial No.</label>
            <input type="text" id="transmission2Serial" placeholder="">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Transmission Photo</label>
            <div data-photo-field="transmission2Photo">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Transmission 2
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('transmission2Photo', 'Transmission 2', event)" />
              </label>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" style="font-size:11px;">Serial Plate Photo</label>
            <div data-photo-field="transmission2PlatePhoto">
              <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:5px 8px;">
                📷 Serial Plate 2
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('transmission2PlatePhoto', 'Serial Plate 2', event)" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <button id="addEngine2Btn" class="btn-secondary" style="font-size:12px;padding:8px 14px;margin-bottom:12px;" onclick="showEngine2()">+ Add Second Engine</button>

      <h2 class="form-heading">Survey Conditions</h2>

      <div class="form-group">
        <label class="form-label">Persons in Attendance</label>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#f9fafb;margin-bottom:8px;">
          <div id="attendeesList" style="margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;background:#dcfce7;border:1px solid #86efac;border-radius:6px;padding:8px 10px;margin-bottom:6px;">
              <span style="font-size:13px;"><strong>Dave Seagrim</strong> (SAMS Surveyor Associate)</span>
              <span style="font-size:12px;color:#6b7280;">Primary</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="addAttendeeField()">+ Add Person</button>
          </div>
        </div>
        <input type="hidden" id="personsInAttendance" value="Dave Seagrim (SAMS Surveyor Associate)">
      </div>

      <div class="form-group">
        <label class="form-label">Independent Surveys</label>
        <textarea id="independentSurveys" rows="2" placeholder="e.g. Engine survey by Joe Smith, Marine Diesel Ltd., 2026-03-15 — or leave as the default statement if none." autocapitalize="sentences"></textarea>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">SAMS requires a statement of any independent surveys (engine, electrical, ultrasonic gauging, etc.) conducted alongside this inspection. If none, the default "No independent surveys…" statement is used.</div>
      </div>

      <div class="form-group">
        <label class="form-label">Report Completion Date</label>
        <input type="date" id="reportDate">
      </div>

      <div class="form-group">
        <label class="form-label">Weather</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" id="weather" placeholder="e.g., Clear, 15 knots" style="flex:1;">
          <button class="btn-secondary" style="white-space:nowrap;font-size:13px;padding:8px 12px;" onclick="refetchWeather()">🌤️ Fetch</button>
        </div>
        <div id="weatherStatus" style="font-size:12px;color:#6b7280;margin-top:4px;"></div>
      </div>

      <div class="form-group">
        <label class="form-label">On Land or In Water</label>
        <select id="onLandOrWater">
          <option value="">Select</option>
          <option value="Vessel was in water at the dock">Vessel was in water at the dock</option>
          <option value="Vessel was in the travel lift slings for the inspection">Vessel was in the travel lift slings for the inspection</option>
          <option value="Vessel was laid up for winter storage on a cradle">Vessel was laid up for winter storage on a cradle</option>
          <option value="Vessel was laid up for winter storage on blocks">Vessel was laid up for winter storage on blocks</option>
          <option value="Vessel was on the cradle on shore, winterized">Vessel was on the cradle on shore, winterized</option>
          <option value="Vessel was on the hard, in a cradle, not winterized">Vessel was on the hard, in a cradle, not winterized</option>
          <option value="Vessel was on blocks, winterized">Vessel was on blocks, winterized</option>
          <option value="Vessel was on a trailer">Vessel was on a trailer</option>
          <option value="Vessel was on a trailer, winterized">Vessel was on a trailer, winterized</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Storage / Observation Details</label>
        <textarea id="storageDetails" rows="2" placeholder="e.g., Mast unstepped and stored on rack. Vessel winterized with antifreeze in all systems. Steel cradle, 6-pad." autocapitalize="sentences"></textarea>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Describe cradle type, winterization status, mast status (stepped/unstepped), and any relevant storage conditions.</div>
      </div>

      <div class="form-group">
        <label class="form-label">Limited Trial Run</label>
        <select id="seaTrial">
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Power at Time of Survey</label>
        <select id="powerAtTime">
          <option value="">Select</option>
          <option value="AC power was available via shore power connection">AC</option>
          <option value="DC power was available from the vessel's batteries">DC</option>
          <option value="AC power via shore power connection and DC power from the vessel's batteries were both available">AC/DC</option>
          <option value="No power was available at the time of survey">No power available</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Water at Time of Survey</label>
        <select id="waterAtTime">
          <option value="">Select</option>
          <option value="No water either in tanks or direct hookup">No water either in tanks or direct hookup</option>
          <option value="Water was in the freshwater tanks">Water was in the freshwater tanks</option>
          <option value="Water supplied from a direct shore hookup">Water supplied from a direct shore hookup</option>
        </select>
      </div>

      <h2 class="form-heading">Vessel Description</h2>

      <div class="form-group">
        <label class="form-label">Overall Description of Vessel</label>
        <button class="btn-secondary" style="margin-bottom:8px;font-size:13px;" onclick="generateVesselDescription()">✨ Auto-Generate Description</button>
        <textarea id="vesselDescription" rows="8" placeholder="Describe the vessel: hull type/material, rig, keel, propulsion, layout, cabins, history (e.g., freshwater only), any known damage or repairs..." autocapitalize="sentences" oninput="markDescriptionManuallyEdited()"></textarea>
        <div id="placeholderCount" style="font-size:12px;color:#d97706;margin-top:4px;display:none;"></div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Auto-fills from form data when you save. Edit manually to override — placeholders in [BRACKETS] show what still needs attention.</div>
      </div>

      <h2 class="form-heading">Vessel Documentation</h2>

      <div class="form-group">
        <label class="form-label">Cover Photo of Vessel</label>
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">This photo will appear as the hero image on the report cover page. Take a clear, well-lit photo of the vessel.</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div data-photo-field="coverPhoto">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:6px 12px;">
              📷 Take Cover Photo
              <input type="file" accept="image/*" capture="environment" style="display:none;"
                     onchange="captureDocPhoto('coverPhoto', 'Cover Photo', event)" />
            </label>
          </div>
          <span id="coverPhotoStatus" style="font-size:12px;color:#6b7280;"></span>
        </div>
      </div>

      <h3 style="margin-top:16px;color:#006699;">Vessel Overview Photos (Four Corners)</h3>
      <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">SAMS requires four overview photos showing the vessel from each corner. These appear at the end of the report.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="form-label" style="font-size:12px;">Port Bow</label>
          <div data-photo-field="fourCornerPortBow">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
              📷 Capture
              <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerPortBow', 'Port Bow', event)" />
            </label>
          </div>
        </div>
        <div>
          <label class="form-label" style="font-size:12px;">Starboard Bow</label>
          <div data-photo-field="fourCornerStbdBow">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
              📷 Capture
              <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerStbdBow', 'Starboard Bow', event)" />
            </label>
          </div>
        </div>
        <div>
          <label class="form-label" style="font-size:12px;">Port Stern</label>
          <div data-photo-field="fourCornerPortStern">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
              📷 Capture
              <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerPortStern', 'Port Stern', event)" />
            </label>
          </div>
        </div>
        <div>
          <label class="form-label" style="font-size:12px;">Starboard Stern</label>
          <div data-photo-field="fourCornerStbdStern">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
              📷 Capture
              <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerStbdStern', 'Starboard Stern', event)" />
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Transport Canada Licence Type</label>
        <select id="tcLicenseType">
          <option value="">Select</option>
          <option value="Pleasure Craft Licence (PCL)">Pleasure Craft Licence (PCL)</option>
          <option value="Small Vessel Register (SVR)">Small Vessel Register (SVR)</option>
          <option value="Large Vessel Register (LVR)">Large Vessel Register (LVR)</option>
          <option value="Not licenced / Not registered">Not licenced / Not registered</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Licence / Registration Number</label>
        <input type="text" id="tcLicense" placeholder="e.g., 12A34567">
      </div>

      <div class="form-group">
        <label class="form-label">Licence Expiry Date</label>
        <input type="date" id="tcLicenseExpiry">
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Expiry date on the licence or registration. SAMS requires this be noted (2.4 in the rubric). Leave blank if no expiry or not applicable.</div>
      </div>

      <div class="form-group" style="margin-top:-4px;">
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <div data-photo-field="licencePhoto">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:6px 10px;">
              📷 Licence on Hull
              <input type="file" accept="image/*" capture="environment" style="display:none;"
                     onchange="captureDocPhoto('licencePhoto', 'Licence on Hull', event)" />
            </label>
          </div>
          <div data-photo-field="tcPaperLicencePhoto">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:6px 10px;">
              📷 TC Paper Licence
              <input type="file" accept="image/*" capture="environment" style="display:none;"
                     onchange="captureDocPhoto('tcPaperLicencePhoto', 'TC Paper Licence', event)" />
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Hull Identification Number (HIN)</label>
        <input type="text" id="hinNumber" placeholder="">
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
          <div data-photo-field="hinPhoto">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:6px 12px;">
              📷 HIN
              <input type="file" accept="image/*" capture="environment" style="display:none;"
                     onchange="captureDocPhoto('hinPhoto', 'HIN', event)" />
            </label>
          </div>
          <span id="hinPhotoStatus" style="font-size:12px;color:#6b7280;"></span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tax Status (Duties and Taxes Paid)</label>
        <input type="text" id="taxStatus" placeholder="Yes/No">
      </div>

      <div class="form-group">
        <label class="form-label">NMMA/CE/TC Compliance Plate</label>
        <input type="text" id="compliancePlate" placeholder="Details or photo">
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
          <div data-photo-field="compliancePhoto">
            <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:6px 12px;">
              📷 Compliance Plate
              <input type="file" accept="image/*" capture="environment" style="display:none;"
                     onchange="captureDocPhoto('compliancePhoto', 'Compliance Plate', event)" />
            </label>
          </div>
          <span id="compliancePhotoStatus" style="font-size:12px;color:#6b7280;"></span>
        </div>
      </div>

      <h2 class="form-heading" data-section="valuation">Valuation</h2>

      <div style="display: flex; gap: 8px; margin: 0 0 16px;">
        <button class="btn-primary" style="flex: 1; font-size: 14px;" onclick="suggestValuation()">
          📊 Auto-Suggest Value (BUC / Yachtworld)
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Fair Market Value - Low (USD)</label>
        <input type="text" id="valuationLow" placeholder="e.g., 150000" inputmode="numeric" pattern="[0-9]*">
      </div>

      <div class="form-group">
        <label class="form-label">Fair Market Value - High (USD)</label>
        <input type="text" id="valuationHigh" placeholder="e.g., 175000" inputmode="numeric" pattern="[0-9]*">
      </div>

      <div class="form-group">
        <label class="form-label">USD/CAD Exchange Rate</label>
        <input type="text" id="exchangeRate" placeholder="1.35" value="1.35">
      </div>

      <div class="form-group">
        <label class="form-label">Valuation Sources Consulted</label>
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">SAMS requires multiple independent sources. Check all that apply.</div>
        <div id="valuationSources" style="display:flex;flex-direction:column;gap:6px;">
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="BUC Value Guide" onchange="updateValuationRationale()"> BUC Value Guide (book value)
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="NADA Marine Guide" onchange="updateValuationRationale()"> NADA Marine Guide
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="YachtWorld listings" onchange="updateValuationRationale()"> YachtWorld (current listings)
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="Soldboats.com sales" onchange="updateValuationRationale()"> Soldboats.com (closed sales)
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="Boats.com / BoatTrader" onchange="updateValuationRationale()"> Boats.com / BoatTrader
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="Broker consultation" onchange="updateValuationRationale()"> Broker consultation
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
            <input type="checkbox" class="val-source" value="Surveyor's professional experience" onchange="updateValuationRationale()"> Surveyor's professional experience
          </label>
        </div>
      </div>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 16px;">
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window.open('https://www.yachtworld.com/boats-for-sale/?keyword='+encodeURIComponent(document.getElementById('yearMakeModel')?.value||''),'_blank')">🔍 Search YachtWorld</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window.open('https://www.soldboats.com/cgi-bin/soldboats/search.cgi?searchStr='+encodeURIComponent(document.getElementById('yearMakeModel')?.value||''),'_blank')">🔍 Search Soldboats</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window.open('https://www.boats.com/search/?q='+encodeURIComponent(document.getElementById('yearMakeModel')?.value||''),'_blank')">🔍 Search Boats.com</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;" onclick="window.open('https://www.bucvalu.com','_blank')">📖 BUCValu</button>
      </div>

      <div class="form-group">
        <label class="form-label">Valuation Rationale</label>
        <textarea id="valuationRationale" rows="5" placeholder="Will auto-generate from sources checked above — or type your own..." autocapitalize="sentences"></textarea>
        <button class="btn-secondary" style="font-size:12px;margin-top:4px;padding:4px 10px;" onclick="regenerateValuationRationale()">🔄 Regenerate from sources</button>
      </div>

      <div class="form-group">
        <label class="form-label">Estimated Replacement Cost (USD)</label>
        <input type="text" id="replacementCost" placeholder="e.g., 350000">
      </div>

      <div class="form-group">
        <label class="form-label">Overall Vessel Condition Rating (BUC Grading)</label>
        <select id="overallCondition">
          <option value="">Select condition</option>
          <option value="Excellent (Bristol)">Excellent (Bristol) — Mint or Bristol fashion, loaded with extras</option>
          <option value="Above Average">Above Average — Above average care, extra electrical and electronic gear</option>
          <option value="Average">Average — Ready for sale, no additional work, normally equipped</option>
          <option value="Fair">Fair — Requires usual maintenance to prepare for sale</option>
          <option value="Poor">Poor — Substantial yard work required, devoid of extras</option>
          <option value="Restorable">Restorable — Enough hull and engine to restore to usable condition</option>
        </select>
      </div>

      <h3 style="margin-top:16px;color:#006699;">Comparable Vessels</h3>
      <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Add comparable sales from BUCValu, Soldboats.com, YachtWorld, and current listings to support your valuation.</div>
      <div id="comparablesEntries"></div>
      <button class="btn-secondary" style="font-size:12px;padding:6px 12px;margin-top:8px;" onclick="addComparableEntry()">+ Add Comparable</button>

      <div class="form-actions">
        <button class="btn-secondary" onclick="confirmAbandonNewSurvey()">Cancel</button>
        <button class="btn-primary" onclick="startNewSurvey()">Start Survey</button>
      </div>
    </div>
  `;

  // Refresh sync status dot for this view
  if (typeof FirebaseSync !== 'undefined') FirebaseSync.refreshUI();

  // Auto-populate exchange rate
  fetchExchangeRate();

  // Populate engine and transmission dropdowns
  populateEngineMakes();
}

// ─── Engine & Transmission Dropdown Population ──────────────────────────────

function populateEngineMakes() {
  if (!engineDb) return;

  const engineSelect = document.getElementById('engineMake');
  if (engineSelect) {
    // Keep the first "Select make" option, add "Other" at end
    engineSelect.innerHTML = '<option value="">Select make</option>';
    [...engineDb.engines].sort((a, b) => a.make.localeCompare(b.make)).forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.make;
      opt.textContent = e.make;
      engineSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = '— Other (type manually) —';
    engineSelect.appendChild(otherOpt);
  }

  const transSelect = document.getElementById('transmissionMake');
  if (transSelect) {
    transSelect.innerHTML = '<option value="">Select make</option>';
    [...engineDb.transmissions].sort((a, b) => a.make.localeCompare(b.make)).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.make;
      opt.textContent = t.make;
      transSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = '— Other (type manually) —';
    transSelect.appendChild(otherOpt);
  }
}

function onEngineMakeChange() {
  if (!engineDb) return;
  const select = document.getElementById('engineMake');
  const makeVal = select.value;

  // "Other" — swap select for a text input
  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'engineMake';
    input.placeholder = 'Type engine make...';
    input.style.cssText = select.style.cssText;
    select.replaceWith(input);
    input.focus();
    // Also switch model to text input
    const modelSelect = document.getElementById('engineModel');
    if (modelSelect) {
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'engineModel';
      modelInput.placeholder = 'Type engine model...';
      modelSelect.replaceWith(modelInput);
    }
    return;
  }

  // Populate engine model dropdown
  const modelSelect = document.getElementById('engineModel');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model</option>';

  const maker = engineDb.engines.find(e => e.make.toLowerCase() === makeVal.toLowerCase());
  if (maker) {
    [...maker.models].sort((a, b) => a.model.localeCompare(b.model)).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.model;
      opt.textContent = m.hp ? `${m.model} (${m.hp} HP)` : m.model;
      modelSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = '— Other (type manually) —';
    modelSelect.appendChild(otherOpt);
  }
  // Clear dependent fields
  document.getElementById('engineHP').value = '';
  document.getElementById('fuelType').value = '';

  // Sync to Engine 2 if visible and empty
  syncEngine1ToEngine2();
}

function onEngineModelChange() {
  if (!engineDb) return;
  const makeEl = document.getElementById('engineMake');
  const modelSelect = document.getElementById('engineModel');
  if (!makeEl || !modelSelect) return;
  const makeVal = makeEl.value;
  const modelVal = modelSelect.value;

  // "Other" — swap to text input
  if (modelVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'engineModel';
    input.placeholder = 'Type engine model...';
    modelSelect.replaceWith(input);
    input.focus();
    return;
  }

  const maker = engineDb.engines.find(e => e.make.toLowerCase() === makeVal.toLowerCase());
  if (maker) {
    const model = maker.models.find(m => m.model.toLowerCase() === modelVal.toLowerCase());
    if (model) {
      const hpField = document.getElementById('engineHP');
      const fuelField = document.getElementById('fuelType');
      if (hpField) hpField.value = model.hp + 'HP / ' + model.kw + 'kW';
      if (fuelField) fuelField.value = model.fuel;
    }
  }

  // Sync to Engine 2 if visible and empty
  syncEngine1ToEngine2();
}

// When Engine 1 make/model changes, sync to Engine 2 if it's visible
// and its fields are still empty (user hasn't manually set them).
function syncEngine1ToEngine2() {
  const e2Section = document.getElementById('engine2Section');
  if (!e2Section || e2Section.style.display === 'none') return;

  const e1Make = document.getElementById('engineMake');
  const e1Model = document.getElementById('engineModel');
  const e2Make = document.getElementById('engine2Make');
  const e2Model = document.getElementById('engine2Model');
  if (!e1Make || !e2Make) return;

  // Only sync if Engine 2 make is empty or is a select with no value chosen
  const e2MakeEmpty = !e2Make.value || e2Make.value === '';
  if (!e2MakeEmpty) return;

  if (e1Make.value && e2Make.tagName === 'SELECT') {
    e2Make.value = e1Make.value;
    onEngine2MakeChange();
    // Set model after models dropdown populates
    setTimeout(() => {
      if (e1Model && e1Model.value && e2Model && e2Model.tagName === 'SELECT') {
        e2Model.value = e1Model.value;
        onEngine2ModelChange();
      }
      // Copy HP and fuel
      const hp1 = document.getElementById('engineHP');
      const hp2 = document.getElementById('engine2HP');
      if (hp1 && hp2 && hp1.value && !hp2.value) hp2.value = hp1.value;
      const fuel1 = document.getElementById('fuelType');
      const fuel2 = document.getElementById('fuelType2');
      if (fuel1 && fuel2 && fuel1.value) fuel2.value = fuel1.value;
    }, 50);
  }
}

function onTransmissionMakeChange() {
  if (!engineDb) return;
  const select = document.getElementById('transmissionMake');
  if (!select) return;
  const makeVal = select.value;

  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'transmissionMake';
    input.placeholder = 'Type transmission make...';
    select.replaceWith(input);
    input.focus();
    const modelSelect = document.getElementById('transmissionModel');
    if (modelSelect) {
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'transmissionModel';
      modelInput.placeholder = 'Type transmission model...';
      modelSelect.replaceWith(modelInput);
    }
    return;
  }

  const modelSelect = document.getElementById('transmissionModel');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model</option>';

  const maker = engineDb.transmissions.find(t => t.make.toLowerCase() === makeVal.toLowerCase());
  if (maker) {
    [...maker.models].sort((a, b) => a.model.localeCompare(b.model)).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.model;
      opt.textContent = m.hp ? `${m.model} (${m.hp} HP)` : m.model;
      modelSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = '— Other (type manually) —';
    modelSelect.appendChild(otherOpt);
  }
}

function onTransmissionModelChange() {
  if (!engineDb) return;
  const modelSelect = document.getElementById('transmissionModel');
  if (!modelSelect) return;
  const modelVal = modelSelect.value;

  if (modelVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'transmissionModel';
    input.placeholder = 'Type transmission model...';
    modelSelect.replaceWith(input);
    input.focus();
  }
}

// ─── Engine 2 (Dual Engine) ────────────────────────────────────────────────

function showEngine2() {
  const section = document.getElementById('engine2Section');
  const btn = document.getElementById('addEngine2Btn');
  if (section) section.style.display = 'block';
  if (btn) btn.style.display = 'none';
  // Update Engine 1 label to show position when twin engines
  const e1Label = document.getElementById('engine1Label');
  if (e1Label) e1Label.textContent = 'Engine 1 (Port)';
  populateEngine2Makes();

  // Auto-populate Engine 2 with Engine 1's make/model (same powerplant, different serial/hours)
  const e1Make = document.getElementById('engineMake');
  const e1Model = document.getElementById('engineModel');
  if (e1Make && e1Make.value) {
    const e2Make = document.getElementById('engine2Make');
    if (e2Make && e2Make.tagName === 'SELECT') {
      e2Make.value = e1Make.value;
      onEngine2MakeChange();
      // After models populate, set the same model
      setTimeout(() => {
        if (e1Model && e1Model.value) {
          const e2Model = document.getElementById('engine2Model');
          if (e2Model && e2Model.tagName === 'SELECT') {
            e2Model.value = e1Model.value;
            onEngine2ModelChange();
          }
        }
        // Copy HP and fuel type too
        const hp1 = document.getElementById('engineHP');
        const hp2 = document.getElementById('engine2HP');
        if (hp1 && hp2 && hp1.value && !hp2.value) hp2.value = hp1.value;
        const fuel1 = document.getElementById('fuelType');
        const fuel2 = document.getElementById('fuelType2');
        if (fuel1 && fuel2 && fuel1.value) fuel2.value = fuel1.value;
      }, 50);
    }
  }
}

function removeEngine2() {
  const section = document.getElementById('engine2Section');
  const btn = document.getElementById('addEngine2Btn');
  if (section) section.style.display = 'none';
  if (btn) btn.style.display = '';
  // Revert Engine 1 label back to generic when single engine
  const e1Label = document.getElementById('engine1Label');
  if (e1Label) e1Label.textContent = 'Engine';
  // Clear Engine 2 fields
  ['engine2Make', 'engine2Model', 'engine2Serial', 'engine2Hours', 'engine2HP', 'fuelType2',
   'transmission2Make', 'transmission2Model', 'transmission2Serial'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function populateEngine2Makes() {
  if (!engineDb) return;
  const engineSelect = document.getElementById('engine2Make');
  if (engineSelect) {
    engineSelect.innerHTML = '<option value="">Select make</option>';
    [...engineDb.engines].sort((a, b) => a.make.localeCompare(b.make)).forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.make;
      opt.textContent = e.make;
      engineSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = '— Other (type manually) —';
    engineSelect.appendChild(otherOpt);
  }
  const transSelect = document.getElementById('transmission2Make');
  if (transSelect) {
    transSelect.innerHTML = '<option value="">Select make</option>';
    [...engineDb.transmissions].sort((a, b) => a.make.localeCompare(b.make)).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.make;
      opt.textContent = t.make;
      transSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = '— Other (type manually) —';
    transSelect.appendChild(otherOpt);
  }
}

function onEngine2MakeChange() {
  if (!engineDb) return;
  const select = document.getElementById('engine2Make');
  const makeVal = select.value;
  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text'; input.id = 'engine2Make'; input.placeholder = 'Type engine make...';
    select.replaceWith(input); input.focus();
    const modelSelect = document.getElementById('engine2Model');
    if (modelSelect) {
      const mi = document.createElement('input');
      mi.type = 'text'; mi.id = 'engine2Model'; mi.placeholder = 'Type engine model...';
      modelSelect.replaceWith(mi);
    }
    return;
  }
  const modelSelect = document.getElementById('engine2Model');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model</option>';
  const maker = engineDb.engines.find(e => e.make.toLowerCase() === makeVal.toLowerCase());
  if (maker) {
    [...maker.models].sort((a, b) => a.model.localeCompare(b.model)).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.model; opt.textContent = m.model;
      modelSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__'; otherOpt.textContent = '— Other (type manually) —';
    modelSelect.appendChild(otherOpt);
  }
  document.getElementById('engine2HP').value = '';
  document.getElementById('fuelType2').value = '';
}

function onEngine2ModelChange() {
  if (!engineDb) return;
  const makeEl = document.getElementById('engine2Make');
  const modelSelect = document.getElementById('engine2Model');
  if (!makeEl || !modelSelect) return;
  if (modelSelect.value === '__other__') {
    const input = document.createElement('input');
    input.type = 'text'; input.id = 'engine2Model'; input.placeholder = 'Type engine model...';
    modelSelect.replaceWith(input); input.focus();
    return;
  }
  const maker = engineDb.engines.find(e => e.make.toLowerCase() === makeEl.value.toLowerCase());
  if (maker) {
    const model = maker.models.find(m => m.model.toLowerCase() === modelSelect.value.toLowerCase());
    if (model) {
      const hpField = document.getElementById('engine2HP');
      const fuelField = document.getElementById('fuelType2');
      if (hpField) hpField.value = model.hp + 'HP / ' + model.kw + 'kW';
      if (fuelField) fuelField.value = model.fuel;
    }
  }
}

function onTransmission2MakeChange() {
  if (!engineDb) return;
  const select = document.getElementById('transmission2Make');
  if (!select) return;
  if (select.value === '__other__') {
    const input = document.createElement('input');
    input.type = 'text'; input.id = 'transmission2Make'; input.placeholder = 'Type transmission make...';
    select.replaceWith(input); input.focus();
    const modelSelect = document.getElementById('transmission2Model');
    if (modelSelect) {
      const mi = document.createElement('input');
      mi.type = 'text'; mi.id = 'transmission2Model'; mi.placeholder = 'Type transmission model...';
      modelSelect.replaceWith(mi);
    }
    return;
  }
  const modelSelect = document.getElementById('transmission2Model');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model</option>';
  const maker = engineDb.transmissions.find(t => t.make.toLowerCase() === select.value.toLowerCase());
  if (maker) {
    [...maker.models].sort((a, b) => a.model.localeCompare(b.model)).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.model; opt.textContent = m.model;
      modelSelect.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__'; otherOpt.textContent = '— Other (type manually) —';
    modelSelect.appendChild(otherOpt);
  }
}

function onTransmission2ModelChange() {
  if (!engineDb) return;
  const modelSelect = document.getElementById('transmission2Model');
  if (!modelSelect) return;
  if (modelSelect.value === '__other__') {
    const input = document.createElement('input');
    input.type = 'text'; input.id = 'transmission2Model'; input.placeholder = 'Type transmission model...';
    modelSelect.replaceWith(input); input.focus();
  }
}

// ─── Edit Existing Survey Details ──────────────────────────────────────────

function editSurveyDetails(surveyId) {
  getSurvey(surveyId || currentSurveyId).then(survey => {
    if (!survey) return;

    // Render the same form as renderNewSurveyForm but in edit mode
    currentSurveyId = survey.id;

    // Show the persistent save status pill while editing intro fields
    if (typeof SaveStatus !== 'undefined') {
      SaveStatus.show();
      if (survey.id) refreshSavePillPhotoCount(survey.id);
    }

    const existingFab = document.querySelector('.fab');
    if (existingFab) existingFab.remove();
    const bottomBarEl3 = document.getElementById('inspectionBottomBar');
    if (bottomBarEl3) bottomBarEl3.remove();
    const reportBtnEl = document.getElementById('reportBtn');
    if (reportBtnEl) reportBtnEl.remove();

    // Re-use the new survey form but swap header and buttons
    renderNewSurveyForm();

    // Set currentView AFTER renderNewSurveyForm (which sets it to 'new-survey')
    currentView = 'edit-survey'; persistViewState();
    history.pushState({ view: 'edit-survey', surveyId: survey.id }, '');

    // Change header
    const header = document.querySelector('.header');
    if (header) {
      header.innerHTML = `
        <button class="header-back" onclick="returnToInspection('${survey.id}')">←</button>
        <div style="flex:1;min-width:0;">
          <div class="header-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(survey.vesselName || 'Survey').replace(/</g, '&lt;')}</div>
          <div class="header-subtitle">Edit Vessel Information — ${APP_VERSION}</div>
        </div>
        <div id="syncStatusIndicator" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;cursor:help;" title="Sync status"></div>
      `;
    }

    // Refresh sync status dot for this view
    if (typeof FirebaseSync !== 'undefined') FirebaseSync.refreshUI();

    // Change form action buttons
    const formActions = document.querySelector('.form-actions');
    if (formActions) {
      formActions.innerHTML = `
        <button class="btn-primary" onclick="saveSurveyDetails('${survey.id}')">← Back to Inspection</button>
      `;
    }

    // Pre-populate all fields with existing survey data
    setTimeout(() => {
      const fields = {
        vesselName: survey.vesselName,
        yearMakeModel: survey.yearMakeModel,
        clientName: survey.clientName,
        surveyDate: survey.surveyDate,
        location: survey.location,
        surveyType: survey.surveyType,
        vesselType: survey.vesselType,
        boatStyle: survey.boatStyle,
        hullType: survey.hullType,
        loa: survey.loa,
        lwl: survey.lwl,
        beam: survey.beam,
        displacement: survey.displacement,
        ballast: survey.ballast,
        maxDraft: survey.maxDraft,
        totalSailArea: survey.totalSailArea,
        construction: survey.construction,
        keelType: survey.keelType,
        numberCabins: survey.numberCabins,
        electricalSystem: survey.electricalSystem,
        changesToPlan: survey.changesToPlan,
        personsInAttendance: survey.personsInAttendance,
        independentSurveys: survey.independentSurveys,
        reportDate: survey.reportDate,
        weather: survey.weather,
        onLandOrWater: survey.onLandOrWater,
        seaTrial: survey.seaTrial,
        powerAtTime: survey.powerAtTime,
        waterAtTime: survey.waterAtTime,
        storageDetails: survey.storageDetails,
        engineMake: survey.engineMake,
        engineModel: survey.engineModel,
        engineSerial: survey.engineSerial,
        engineHours: survey.engineHours,
        engineHP: survey.engineHP,
        fuelType: survey.fuelType,
        transmissionMake: survey.transmissionMake,
        transmissionModel: survey.transmissionModel,
        transmissionSerial: survey.transmissionSerial,
        engine2Make: survey.engine2Make,
        engine2Model: survey.engine2Model,
        engine2Serial: survey.engine2Serial,
        engine2Hours: survey.engine2Hours,
        engine2HP: survey.engine2HP,
        fuelType2: survey.fuelType2,
        transmission2Make: survey.transmission2Make,
        transmission2Model: survey.transmission2Model,
        transmission2Serial: survey.transmission2Serial,
        vesselDescription: survey.vesselDescription,
        hinNumber: survey.hinNumber,
        tcLicenseType: survey.tcLicenseType,
        tcLicense: survey.tcLicense,
        tcLicenseExpiry: survey.tcLicenseExpiry,
        taxStatus: survey.taxStatus,
        compliancePlate: survey.compliancePlate,
        valuationLow: survey.valuationLow,
        valuationHigh: survey.valuationHigh,
        exchangeRate: survey.exchangeRate,
        valuationRationale: survey.valuationRationale,
        replacementCost: survey.replacementCost,
        overallCondition: survey.overallCondition
      };

      for (const [id, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null && value !== '') {
          const el = document.getElementById(id);
          if (el) el.value = value;
        }
      }

      // Trigger boat style options update after setting vessel type
      if (survey.vesselType) {
        updateBoatStyleOptions();
        // Re-select the boat style after options are rendered
        if (survey.boatStyle) {
          const boatStyleInput = document.getElementById('boatStyle');
          if (boatStyleInput) boatStyleInput.value = survey.boatStyle;
          updateBoatStyleOptions();
        }
      }

      // Trigger cascading engine/transmission dropdowns
      // Setting .value programmatically doesn't fire onchange, so we call manually
      if (survey.engineMake) {
        onEngineMakeChange();  // Populates model dropdown from make
        // Re-set model after options are populated
        if (survey.engineModel) {
          const modelEl = document.getElementById('engineModel');
          if (modelEl) modelEl.value = survey.engineModel;
        }
      }
      if (survey.transmissionMake) {
        onTransmissionMakeChange();  // Populates transmission model dropdown
        if (survey.transmissionModel) {
          const tModelEl = document.getElementById('transmissionModel');
          if (tModelEl) tModelEl.value = survey.transmissionModel;
        }
      }

      // Show Engine 2 section if survey has twin engine data
      if (survey.engine2Make) {
        showEngine2();
        // Re-set Engine 2 fields after showEngine2 (which may auto-populate from Engine 1)
        setTimeout(() => {
          const e2Fields = {
            engine2Make: survey.engine2Make, engine2Model: survey.engine2Model,
            engine2Serial: survey.engine2Serial, engine2Hours: survey.engine2Hours,
            engine2HP: survey.engine2HP, fuelType2: survey.fuelType2,
            transmission2Make: survey.transmission2Make, transmission2Model: survey.transmission2Model,
            transmission2Serial: survey.transmission2Serial
          };
          for (const [id, val] of Object.entries(e2Fields)) {
            if (val) { const el = document.getElementById(id); if (el) el.value = val; }
          }
          // Trigger cascading dropdowns for Engine 2
          if (survey.engine2Make && typeof onEngine2MakeChange === 'function') {
            onEngine2MakeChange();
            if (survey.engine2Model) {
              const m2 = document.getElementById('engine2Model');
              if (m2) m2.value = survey.engine2Model;
            }
          }
          if (survey.transmission2Make && typeof onTransmission2MakeChange === 'function') {
            onTransmission2MakeChange();
            if (survey.transmission2Model) {
              const t2 = document.getElementById('transmission2Model');
              if (t2) t2.value = survey.transmission2Model;
            }
          }
        }, 100);
      }

      // Store location coordinates
      if (survey.locationLat) window._surveyLat = survey.locationLat;
      if (survey.locationLon) window._surveyLon = survey.locationLon;

      // Load valuation source checkboxes
      if (survey.valuationSources && survey.valuationSources.length > 0) {
        document.querySelectorAll('.val-source').forEach(cb => {
          cb.checked = survey.valuationSources.includes(cb.value);
        });
      }

      // Load doc photo previews
      const docPhotoFields = ['hinPhoto', 'compliancePhoto', 'licencePhoto', 'tcPaperLicencePhoto',
        'coverPhoto', 'fourCornerPortBow', 'fourCornerStbdBow', 'fourCornerPortStern', 'fourCornerStbdStern',
        'enginePhoto', 'enginePlatePhoto', 'engine2Photo', 'engine2PlatePhoto',
        'transmissionPhoto', 'transmissionPlatePhoto', 'transmission2Photo', 'transmission2PlatePhoto'];
      docPhotoFields.forEach(fieldKey => loadDocPhotoPreview(fieldKey));

      // Populate comparables
      if (survey.comparables && survey.comparables.length > 0) {
        survey.comparables.forEach(comp => {
          addComparableEntry();
          const allEntries = document.querySelectorAll('#comparablesEntries > div');
          if (allEntries.length > 0) {
            const entry = allEntries[allEntries.length - 1];
            if (entry.querySelector('.compSource')) entry.querySelector('.compSource').value = comp.source || '';
            if (entry.querySelector('.compVessel')) entry.querySelector('.compVessel').value = comp.vessel || '';
            if (entry.querySelector('.compPrice')) entry.querySelector('.compPrice').value = comp.price || '';
            if (entry.querySelector('.compLocation')) entry.querySelector('.compLocation').value = comp.location || '';
            if (entry.querySelector('.compDate')) entry.querySelector('.compDate').value = comp.date || '';
            if (entry.querySelector('.compWater')) entry.querySelector('.compWater').value = comp.water || '';
            if (entry.querySelector('.compNotes')) entry.querySelector('.compNotes').value = comp.notes || '';
          }
        });
      }
      // Auto-save: debounced save on every field change
      let _editAutoSaveTimer = null;
      const _editAutoSave = () => {
        clearTimeout(_editAutoSaveTimer);
        if (typeof SaveStatus !== 'undefined') SaveStatus.markSaving();
        _editAutoSaveTimer = setTimeout(() => {
          saveEditFormSilently().then(() => {
            if (typeof SaveStatus !== 'undefined') SaveStatus.markSaved();
            // Subtle indicator — no toast, just a quick flash on the header subtitle
            const sub = document.querySelector('.header-subtitle');
            if (sub) {
              const orig = sub.textContent;
              sub.textContent = 'Saved ✓';
              setTimeout(() => { sub.textContent = orig; }, 800);
            }
          }).catch(err => {
            if (typeof SaveStatus !== 'undefined') SaveStatus.markError(err && err.message);
          });
        }, 1500);
      };
      // Attach to all inputs, selects, and textareas in the form
      const formEl = document.getElementById('app');
      if (formEl) {
        formEl.addEventListener('input', _editAutoSave);
        formEl.addEventListener('change', _editAutoSave);
      }

      // Show placeholder count if description exists
      const descEl = document.getElementById('vesselDescription');
      if (descEl && descEl.value) updatePlaceholderCount(descEl.value);

    }, 100);

    // Add bottom action bar to Edit Intro page (same buttons as inspection)
    const existingBar2 = document.getElementById('inspectionBottomBar');
    if (existingBar2) existingBar2.remove();
    const editBar = document.createElement('div');
    editBar.id = 'inspectionBottomBar';
    editBar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 -2px 10px rgba(0,0,0,0.1);z-index:100;';

    const ps = 'border:none;border-radius:22px;padding:8px 12px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;';

    // 📝 Desc button — regenerate and update textarea in-place (no page re-render)
    const descBtn2 = document.createElement('button');
    descBtn2.style.cssText = ps + 'background:#ffcc00;color:#006699;font-weight:700;';
    descBtn2.innerHTML = '📝 Desc';
    descBtn2.onclick = async () => {
      await saveEditFormSilently();
      await regenerateDescriptionFromInspection();
      // Update the textarea in-place instead of re-rendering
      const updated = await getSurvey(survey.id);
      const descEl = document.getElementById('vesselDescription');
      if (updated && descEl) descEl.value = updated.vesselDescription || '';
    };
    editBar.appendChild(descBtn2);

    // 💾 Backup button
    const backupBtn2 = document.createElement('button');
    backupBtn2.style.cssText = ps + 'background:#3399cc;color:white;';
    backupBtn2.innerHTML = '💾 Backup';
    backupBtn2.onclick = async () => {
      await saveEditFormSilently();
      document.getElementById('inspectionBottomBar')?.remove();
      renderInspection(await getSurvey(survey.id));
      setTimeout(() => document.getElementById('backupBtn')?.click(), 200);
    };
    editBar.appendChild(backupBtn2);

    // ✅ Check button
    const checkBtn2 = document.createElement('button');
    checkBtn2.style.cssText = ps + 'background:#ffcc00;color:#006699;font-weight:700;';
    checkBtn2.innerHTML = '✅ Check';
    checkBtn2.onclick = async () => {
      await saveEditFormSilently();
      checkSurvey();
    };
    editBar.appendChild(checkBtn2);

    // 📄 Report button
    const reportBtn2 = document.createElement('button');
    reportBtn2.style.cssText = ps + 'background:#006699;color:white;';
    reportBtn2.innerHTML = '📄 Report';
    reportBtn2.onclick = async () => {
      await saveEditFormSilently();
      const s = await getSurvey(survey.id);
      if (s) generateReport(s);
    };
    editBar.appendChild(reportBtn2);

    document.body.appendChild(editBar);
  });
}

function saveSurveyDetails(surveyId) {
  getSurvey(surveyId).then(survey => {
    if (!survey) return;

    // Collect all form field values (same as startNewSurvey)
    const updates = {
      vesselName: document.getElementById('vesselName')?.value || survey.vesselName,
      yearMakeModel: document.getElementById('yearMakeModel')?.value || survey.yearMakeModel,
      clientName: document.getElementById('clientName')?.value || '',
      surveyDate: document.getElementById('surveyDate')?.value || '',
      location: document.getElementById('location')?.value || '',
      locationLat: window._surveyLat || survey.locationLat,
      locationLon: window._surveyLon || survey.locationLon,
      surveyType: document.getElementById('surveyType')?.value || '',
      vesselType: document.getElementById('vesselType')?.value || 'power',
      boatStyle: document.getElementById('boatStyle')?.value || '',
      hullType: document.getElementById('hullType')?.value || '',
      loa: document.getElementById('loa')?.value || '',
      lwl: document.getElementById('lwl')?.value || '',
      beam: document.getElementById('beam')?.value || '',
      displacement: document.getElementById('displacement')?.value || '',
      ballast: document.getElementById('ballast')?.value || '',
      maxDraft: document.getElementById('maxDraft')?.value || '',
      totalSailArea: document.getElementById('totalSailArea')?.value || '',
      construction: document.getElementById('construction')?.value || '',
      keelType: document.getElementById('keelType')?.value || '',
      numberCabins: document.getElementById('numberCabins')?.value || '',
      electricalSystem: document.getElementById('electricalSystem')?.value || '',
      changesToPlan: document.getElementById('changesToPlan')?.value || '',
      personsInAttendance: document.getElementById('personsInAttendance')?.value || '',
      independentSurveys: document.getElementById('independentSurveys')?.value || '',
      reportDate: document.getElementById('reportDate')?.value || '',
      weather: document.getElementById('weather')?.value || '',
      onLandOrWater: document.getElementById('onLandOrWater')?.value || '',
      seaTrial: document.getElementById('seaTrial')?.value || '',
      powerAtTime: document.getElementById('powerAtTime')?.value || '',
      waterAtTime: document.getElementById('waterAtTime')?.value || '',
      storageDetails: document.getElementById('storageDetails')?.value || '',
      engineMake: document.getElementById('engineMake')?.value || '',
      engineModel: document.getElementById('engineModel')?.value || '',
      engineSerial: document.getElementById('engineSerial')?.value || '',
      engineHours: document.getElementById('engineHours')?.value || '',
      engineHP: document.getElementById('engineHP')?.value || '',
      fuelType: document.getElementById('fuelType')?.value || '',
      transmissionMake: document.getElementById('transmissionMake')?.value || '',
      transmissionModel: document.getElementById('transmissionModel')?.value || '',
      transmissionMakeModel: (document.getElementById('transmissionMake')?.value || '') + (document.getElementById('transmissionModel')?.value ? ' ' + document.getElementById('transmissionModel')?.value : ''),
      transmissionSerial: document.getElementById('transmissionSerial')?.value || '',
      engine2Make: document.getElementById('engine2Make')?.value || '',
      engine2Model: document.getElementById('engine2Model')?.value || '',
      engine2Serial: document.getElementById('engine2Serial')?.value || '',
      engine2Hours: document.getElementById('engine2Hours')?.value || '',
      engine2HP: document.getElementById('engine2HP')?.value || '',
      fuelType2: document.getElementById('fuelType2')?.value || '',
      transmission2Make: document.getElementById('transmission2Make')?.value || '',
      transmission2Model: document.getElementById('transmission2Model')?.value || '',
      transmission2MakeModel: (document.getElementById('transmission2Make')?.value || '') + (document.getElementById('transmission2Model')?.value ? ' ' + document.getElementById('transmission2Model')?.value : ''),
      transmission2Serial: document.getElementById('transmission2Serial')?.value || '',
      vesselDescription: document.getElementById('vesselDescription')?.value || '',
      hinNumber: document.getElementById('hinNumber')?.value || '',
      tcLicenseType: document.getElementById('tcLicenseType')?.value || '',
      tcLicense: document.getElementById('tcLicense')?.value || '',
      tcLicenseExpiry: document.getElementById('tcLicenseExpiry')?.value || '',
      taxStatus: document.getElementById('taxStatus')?.value || '',
      compliancePlate: document.getElementById('compliancePlate')?.value || '',
      valuationLow: document.getElementById('valuationLow')?.value || '',
      valuationHigh: document.getElementById('valuationHigh')?.value || '',
      exchangeRate: parseFloat(document.getElementById('exchangeRate')?.value) || 1.35,
      valuationSources: Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value),
      valuationSource: Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value).join(', '),
      valuationRationale: document.getElementById('valuationRationale')?.value || '',
      replacementCost: document.getElementById('replacementCost')?.value || '',
      overallCondition: document.getElementById('overallCondition')?.value || '',
      comparables: collectComparables()
    };

    // Merge updates into existing survey (preserving items, photos, etc.)
    Object.assign(survey, updates);

    // Clean up incompatible drive settings when vessel type changes from intro.
    // B-09 (v2162): auto-derive hasRudder from vesselType + driveType.
    //   Sailboats: always hasRudder=true.
    //   Power shaft-drive: hasRudder=true.
    //   Power outdrive / IPS / saildrive: hasRudder=false (drive itself
    //     steers; no separate rudder). Makes the v2153 token system
    //     automatically strip rudder mentions from snippets + labels.
    if (survey.vesselType === 'sail') {
      survey.driveLineCount = 1;
      survey.hasRudder = true;
      if (survey.driveType === 'outdrive' || survey.driveType === 'ips') survey.driveType = '';
    } else if (survey.vesselType === 'power') {
      if (survey.driveType === 'saildrive') survey.driveType = '';
      const noRudderDrives = ['outdrive', 'ips', 'saildrive'];
      if (survey.driveType && noRudderDrives.includes(survey.driveType)) {
        survey.hasRudder = false;
      } else if (survey.driveType === 'shaft') {
        survey.hasRudder = true;
      }
      // If driveType is blank, leave hasRudder as-is (don't override explicit setting)
    }

    // Auto-generate vessel description if empty or previously auto-generated
    if (!survey.vesselDescription || !survey.vesselDescription.trim() || survey.descriptionAutoGenerated) {
      survey.vesselDescription = buildDescriptionFromSurvey(survey);
      survey.descriptionAutoGenerated = true;
    }

    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

// Save edit form fields to DB without navigating — returns a promise
async function saveEditFormSilently() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;

  // Collect form field values (mirrors saveSurveyDetails)
  const fields = [
    'vesselName','yearMakeModel','clientName','surveyDate','location','surveyType',
    'vesselType','boatStyle','hullType','loa','lwl','beam','displacement','ballast',
    'maxDraft','totalSailArea','construction','keelType','numberCabins','electricalSystem',
    'changesToPlan','personsInAttendance','independentSurveys','reportDate','weather','onLandOrWater','seaTrial',
    'powerAtTime','waterAtTime','storageDetails','engineMake','engineModel','engineSerial',
    'engineHours','engineHP','fuelType','transmissionMake','transmissionModel','transmissionSerial',
    'engine2Make','engine2Model','engine2Serial','engine2Hours','engine2HP','fuelType2',
    'transmission2Make','transmission2Model','transmission2Serial',
    'vesselDescription','hinNumber','tcLicenseType','tcLicense','tcLicenseExpiry','taxStatus','compliancePlate',
    'valuationLow','valuationHigh','valuationRationale','replacementCost','overallCondition'
  ];
  for (const f of fields) {
    const el = document.getElementById(f);
    if (el) survey[f] = el.value;
  }
  // Special fields
  survey.locationLat = window._surveyLat || survey.locationLat;
  survey.locationLon = window._surveyLon || survey.locationLon;
  survey.exchangeRate = parseFloat(document.getElementById('exchangeRate')?.value) || survey.exchangeRate || 1.35;
  const srcEls = document.querySelectorAll('.val-source:checked');
  if (srcEls.length > 0) {
    survey.valuationSources = Array.from(srcEls).map(cb => cb.value);
    survey.valuationSource = survey.valuationSources.join(', ');
  }
  try { survey.comparables = collectComparables(); } catch(e) {}

  await saveSurvey(survey);
}

function returnToInspection(surveyId) {
  // Remove floating Back button if present
  document.getElementById('csBackToCheckBtn')?.remove();

  // If in edit view, save silently first then navigate
  if (currentView === 'edit-survey' || currentView === 'new-survey') {
    saveEditFormSilently().then(() => {
      getSurvey(surveyId).then(survey => {
        if (survey) renderInspection(survey);
        else renderHome();
      });
    });
  } else {
    getSurvey(surveyId).then(survey => {
      if (survey) renderInspection(survey);
      else renderHome();
    });
  }
}

// ─── Location Search & Map ─────────────────────────────────────────────────

let _locationSearchTimeout = null;

function searchLocation(query) {
  clearTimeout(_locationSearchTimeout);
  const dropdown = document.getElementById('locationDropdown');

  if (query.length < 3) {
    if (dropdown) dropdown.style.display = 'none';
    return;
  }

  _locationSearchTimeout = setTimeout(async () => {
    try {
      // Bias results toward Canada
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=ca,us`,
        { headers: { 'Accept': 'application/json' } }
      );
      const results = await res.json();
      showLocationDropdown(results);
    } catch (e) {
      console.error('Location search error:', e);
    }
  }, 600);
}

function showLocationDropdown(results) {
  const dropdown = document.getElementById('locationDropdown');
  if (!dropdown) return;

  if (results.length === 0) {
    dropdown.style.display = 'block';
    dropdown.innerHTML = '<div style="padding:10px;color:#6b7280;font-size:13px;">No results found</div>';
    return;
  }

  dropdown.style.display = 'block';
  dropdown.innerHTML = '';

  results.forEach(r => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:10px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;font-size:13px;';
    div.textContent = r.display_name;
    div.onmouseenter = () => div.style.background = '#eff6ff';
    div.onmouseleave = () => div.style.background = 'white';
    div.onclick = () => selectLocation(r.display_name, parseFloat(r.lat), parseFloat(r.lon));
    dropdown.appendChild(div);
  });
}

function selectLocation(displayName, lat, lon) {
  document.getElementById('location').value = displayName;
  document.getElementById('locationDropdown').style.display = 'none';

  // Store for later use when saving the survey
  window._surveyLat = lat;
  window._surveyLon = lon;

  showMapPreview(lat, lon);
  fetchWeatherForLocation(lat, lon);
}

// ─── Manual weather refetch ─────────────────────────────────────────
function refetchWeather() {
  const status = document.getElementById('weatherStatus');

  // If we already have lat/lon from location selection, use those
  if (window._surveyLat && window._surveyLon) {
    if (status) status.textContent = 'Fetching weather for selected location…';
    fetchWeatherForLocation(window._surveyLat, window._surveyLon).then(() => {
      if (status) status.textContent = '';
    });
    return;
  }

  // Otherwise, try GPS geolocation
  if ('geolocation' in navigator) {
    if (status) status.textContent = 'Getting your GPS location…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window._surveyLat = pos.coords.latitude;
        window._surveyLon = pos.coords.longitude;
        if (status) status.textContent = 'Fetching weather…';
        fetchWeatherForLocation(pos.coords.latitude, pos.coords.longitude).then(() => {
          if (status) status.textContent = '';
        });
      },
      (err) => {
        if (status) status.textContent = 'GPS unavailable — enter a location first, then try again.';
        console.warn('Geolocation error:', err);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  } else {
    if (status) status.textContent = 'Enter a location first, then tap Fetch.';
  }
}

// ─── Environment Canada Weather ─────────────────────────────────────
async function fetchWeatherForLocation(lat, lon) {
  const weatherInput = document.getElementById('weather');
  if (!weatherInput) return;

  weatherInput.value = 'Fetching weather…';

  try {
    // Try Environment Canada OGC API (citypageweather-realtime)
    const bbox = `${(lon - 0.5).toFixed(4)},${(lat - 0.5).toFixed(4)},${(lon + 0.5).toFixed(4)},${(lat + 0.5).toFixed(4)}`;
    const ecUrl = `https://api.weather.gc.ca/collections/citypageweather-realtime/items?f=json&lang=en&bbox=${bbox}&limit=5`;

    const ecRes = await fetch(ecUrl, { headers: { 'Accept': 'application/json' } });
    if (ecRes.ok) {
      const ecData = await ecRes.json();
      const weatherStr = parseECWeather(ecData);
      if (weatherStr) {
        weatherInput.value = weatherStr;
        return;
      }
    }
  } catch (e) {
    console.warn('Environment Canada API unavailable, trying fallback:', e);
  }

  try {
    // Fallback: Open-Meteo (free, no key, CORS-friendly)
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kn&timezone=auto`;
    const omRes = await fetch(omUrl);
    if (omRes.ok) {
      const omData = await omRes.json();
      const c = omData.current;
      const desc = weatherCodeToText(c.weather_code);
      const windDir = degreesToCardinal(c.wind_direction_10m);
      weatherInput.value = `${desc}, ${c.temperature_2m}°C, Wind ${windDir} ${Math.round(c.wind_speed_10m)} kn, Humidity ${c.relative_humidity_2m}%`;
      return;
    }
  } catch (e) {
    console.warn('Open-Meteo fallback also failed:', e);
  }

  weatherInput.value = '';
  weatherInput.placeholder = 'Could not fetch weather — enter manually';
}

function parseECWeather(data) {
  if (!data || !data.features || data.features.length === 0) return null;

  // Find the nearest station with current conditions
  for (const feature of data.features) {
    const p = feature.properties;
    if (!p) continue;

    // EC citypageweather has fields like: current_temp, current_conditions, wind_speed, wind_dir, humidity
    const parts = [];
    if (p.current_conditions || p.condition) parts.push(p.current_conditions || p.condition);
    if (p.current_temp != null || p.temp != null) parts.push(`${p.current_temp ?? p.temp}°C`);
    if (p.wind_speed != null) {
      const dir = p.wind_dir || p.wind_direction || '';
      parts.push(`Wind ${dir} ${p.wind_speed} km/h`);
    }
    if (p.humidity != null || p.relative_humidity != null) {
      parts.push(`Humidity ${p.humidity ?? p.relative_humidity}%`);
    }
    if (p.station_name || p.name) parts.push(`(Stn: ${p.station_name || p.name})`);

    if (parts.length >= 2) return parts.join(', ');
  }
  return null;
}

function weatherCodeToText(code) {
  const codes = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
    61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains', 80: 'Light showers', 81: 'Moderate showers', 82: 'Heavy showers',
    85: 'Light snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail'
  };
  return codes[code] || 'Unknown conditions';
}

function degreesToCardinal(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function showMapPreview(lat, lon) {
  const preview = document.getElementById('mapPreview');
  if (!preview) return;

  // Calculate a bounding box around the point (~500m each direction)
  const offset = 0.005;
  const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;

  preview.innerHTML = `
    <div style="margin-top:8px;border-radius:8px;overflow:hidden;border:1px solid #ddd;">
      <iframe width="100%" height="200" frameborder="0" scrolling="no"
              src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}"
              style="border-radius:8px;display:block;"></iframe>
      <div style="font-size:11px;color:#6b7280;padding:4px 8px;background:#f9fafb;">
        ${lat.toFixed(5)}, ${lon.toFixed(5)} — Map data © OpenStreetMap contributors
      </div>
    </div>
  `;
}

// Generate a static map URL for reports (sized for Google Docs — ~480x280)
function getStaticMapUrl(lat, lon) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=14&size=480x280&maptype=mapnik&markers=${lat},${lon},red-pushpin`;
}

// ─── Boat Lookup Helpers ───────────────────────────────────────────────────

// Parse "2015 Beneteau Oceanis 45" → { year: 2015, make: "Beneteau", model: "Oceanis 45" }
function parseYearMakeModel(input) {
  const parts = input.trim().split(/\s+/);
  let year = null, makeIdx = 0;
  if (/^\d{4}$/.test(parts[0])) {
    year = parseInt(parts[0]);
    makeIdx = 1;
  }
  const make = parts[makeIdx] || '';
  const model = parts.slice(makeIdx + 1).join(' ');
  return { year, make, model };
}

// Find boats in the specs database using order-agnostic fuzzy matching
// Returns array of {boat, score} sorted by score descending
function findBoatSpecsAll(input) {
  if (!boatSpecsDB || !boatSpecsDB.boats) return [];

  // Strip year, normalise input into words
  const stripped = input.trim().replace(/^\d{4}\s*/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  // Merge single-letter suffixes onto preceding word: "34 c" → "34c"
  const rawWords = stripped.split(/\s+/).filter(Boolean);
  const searchWords = [];
  for (let i = 0; i < rawWords.length; i++) {
    if (rawWords[i].length === 1 && searchWords.length > 0) {
      searchWords[searchWords.length - 1] += rawWords[i];
    } else if (rawWords[i].length > 0) {
      searchWords.push(rawWords[i]);
    }
  }
  if (searchWords.length === 0) return [];

  // Also extract year for year-range filtering
  const yearMatch = input.trim().match(/^\d{4}/);
  const inputYear = yearMatch ? parseInt(yearMatch[0]) : null;

  const results = [];

  for (const boat of boatSpecsDB.boats) {
    // Build all candidate strings: "make model" + aliases
    const candidates = [
      `${boat.make} ${boat.model}`.toLowerCase().replace(/[^a-z0-9\s]/g, ''),
      ...(boat.aliases || []).map(a => a.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
    ];

    let bestScore = 0;
    for (const cand of candidates) {
      const candWords = cand.split(/\s+/).filter(w => w.length > 1);

      // Score: how many search words match a candidate word (order-agnostic)
      // Numbers must match exactly to avoid "38" matching "380"
      // Text words use substring matching + typo tolerance (edit distance ≤ 2)
      const isNumeric = (w) => /^\d+$/.test(w);
      const editDist = (a, b) => {
        if (Math.abs(a.length - b.length) > 2) return 3; // quick reject
        const m = a.length, n = b.length;
        const dp = Array.from({length: m + 1}, (_, i) => {
          const row = new Array(n + 1);
          row[0] = i;
          return row;
        });
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++)
          for (let j = 1; j <= n; j++)
            dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0));
        return dp[m][n];
      };
      const wordsMatch = (a, b) => {
        if (a === b) return true;
        if (isNumeric(a) && isNumeric(b)) {
          return a === b;  // Both pure numbers: exact match only (avoid "38" matching "380")
        }
        // Allow numeric prefix matching: "34" matches "34c", "34C" etc.
        if (isNumeric(a) && b.startsWith(a) && b.length <= a.length + 2) return true;
        if (isNumeric(b) && a.startsWith(b) && a.length <= b.length + 2) return true;
        // Exact substring match
        if (a.includes(b) || b.includes(a)) return true;
        // Typo tolerance: allow edit distance ≤ 2 for words of 4+ chars
        if (a.length >= 4 && b.length >= 4 && editDist(a, b) <= 2) return true;
        return false;
      };
      let matchedSearch = 0;
      let matchedCand = 0;
      for (const sw of searchWords) {
        if (candWords.some(cw => wordsMatch(sw, cw))) matchedSearch++;
      }
      for (const cw of candWords) {
        if (searchWords.some(sw => wordsMatch(sw, cw))) matchedCand++;
      }
      // Combined score: average of how much of the search matched AND how much of the candidate matched
      const score = (matchedSearch / searchWords.length + matchedCand / candWords.length) / 2;
      if (score > bestScore) bestScore = score;
    }

    // Bonus if year falls within production range
    if (inputYear && boat.yearStart && boat.yearEnd) {
      if (inputYear >= boat.yearStart && inputYear <= boat.yearEnd) bestScore += 0.1;
    }

    if (bestScore >= 0.4) {
      results.push({ boat, score: bestScore });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// Backward-compatible single-match wrapper
function findBoatSpecs(input) {
  const results = findBoatSpecsAll(input);
  return results.length > 0 ? results[0].boat : null;
}

// Find value range in the values database (order-agnostic matching)
function findBoatValues(input) {
  if (!boatValuesDB || !boatValuesDB.values) return null;
  const stripped = input.trim().replace(/^\d{4}\s*/, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const searchWords = stripped.split(/\s+/).filter(w => w.length > 1);
  if (searchWords.length === 0) return null;

  let bestEntry = null;
  let bestScore = 0;

  for (const entry of boatValuesDB.values) {
    const candidate = `${entry.make} ${entry.model}`.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const candWords = candidate.split(/\s+/).filter(w => w.length > 1);

    let matchedSearch = 0;
    let matchedCand = 0;
    for (const sw of searchWords) {
      if (candWords.some(cw => cw.includes(sw) || sw.includes(cw))) matchedSearch++;
    }
    for (const cw of candWords) {
      if (searchWords.some(sw => sw.includes(cw) || cw.includes(sw))) matchedCand++;
    }
    const score = (matchedSearch / searchWords.length + matchedCand / candWords.length) / 2;

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  if (bestScore < 0.4 || !bestEntry) return null;

  // Find the matching year range
  const { year: inputYear } = parseYearMakeModel(input);
  if (!inputYear || !bestEntry.yearRanges) return { entry: bestEntry, range: bestEntry.yearRanges[0] };

  const range = bestEntry.yearRanges.find(r => inputYear >= r.from && inputYear <= r.to)
    || bestEntry.yearRanges[bestEntry.yearRanges.length - 1];

  return { entry: bestEntry, range };
}

// Apply found specs to the form fields
function applyBoatSpecs(specs) {
  // Update the Year/Make/Model field with the correct name
  const ymmField = document.getElementById('yearMakeModel');
  if (ymmField && specs.make && specs.model) {
    const yearMatch = ymmField.value.trim().match(/\b((?:19|20)\d{2})\b/);
    const year = yearMatch ? yearMatch[1] + ' ' : '';
    ymmField.value = year + specs.make + ' ' + specs.model;
  }

  // Clear all spec fields first so old values don't persist when switching boats
  const allFields = ['loa', 'lwl', 'beam', 'displacement', 'ballast', 'maxDraft', 'totalSailArea', 'construction'];
  for (const id of allFields) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  }
  // Remove any existing draft variant note
  const existingVariantNote = document.getElementById('draftVariantNote');
  if (existingVariantNote) existingVariantNote.remove();

  const fields = {
    loa: specs.loa, lwl: specs.lwl, beam: specs.beam,
    displacement: specs.displacement, ballast: specs.ballast,
    maxDraft: specs.maxDraft, totalSailArea: specs.totalSailArea,
    construction: specs.construction
  };
  for (const [id, val] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }
  // Reset and set dropdowns
  const hullEl = document.getElementById('hullType');
  if (hullEl) {
    hullEl.value = '';
    if (specs.hullType) {
      const opt = Array.from(hullEl.options).find(o => o.value === specs.hullType);
      if (opt) hullEl.value = specs.hullType;
    }
  }
  const keelEl = document.getElementById('keelType');
  if (keelEl) {
    keelEl.value = '';
    if (specs.keelType) {
      const opt = Array.from(keelEl.options).find(o => o.value === specs.keelType);
      if (opt) keelEl.value = specs.keelType;
    }
  }

  // Auto-set vessel type from specs database type field
  if (specs.type) {
    const vesselTypeEl = document.getElementById('vesselType');
    if (vesselTypeEl) {
      const typeMap = { 'sailboat': 'sail', 'powerboat': 'power', 'sail': 'sail', 'power': 'power', 'human-powered': 'human-powered' };
      const mappedType = typeMap[specs.type.toLowerCase()] || null;
      if (mappedType) {
        vesselTypeEl.value = mappedType;
        updateBoatStyleOptions();
      }
    }
  }

  // Show draft variant note if the boat has multiple keel/draft options
  if (specs.draftVariants && specs.draftVariants.length > 1) {
    const draftEl = document.getElementById('maxDraft');
    if (draftEl) {
      // Remove any existing variant note
      const existingNote = document.getElementById('draftVariantNote');
      if (existingNote) existingNote.remove();

      const note = document.createElement('div');
      note.id = 'draftVariantNote';
      note.style.cssText = 'margin-top:6px;padding:8px 12px;background:#fff3cd;border:1px solid #ffc107;border-radius:6px;font-size:13px;';
      let optionsHtml = '<strong>⚠️ Multiple keel options available:</strong><br>';
      specs.draftVariants.forEach((v, i) => {
        optionsHtml += `<label style="display:block;margin:4px 0;cursor:pointer;">
          <input type="radio" name="draftVariant" value="${v.draft}" data-keel="${v.keel}" ${i === 0 ? 'checked' : ''}
            onchange="document.getElementById('maxDraft').value=this.value; if(document.getElementById('keelType')){const opts=document.getElementById('keelType').options; for(let o of opts){if(o.value.toLowerCase().includes(this.dataset.keel.split(' ')[0].toLowerCase())){document.getElementById('keelType').value=o.value;break;}}}"
          > ${v.keel} — Draft: ${v.draft}
        </label>`;
      });
      note.innerHTML = optionsHtml;
      draftEl.parentNode.appendChild(note);
    }
  }

  // Auto-fill engine if specs database includes engine info
  if (specs.engine) {
    const parts = specs.engine.split(' ');
    const eMake = parts[0]; // e.g. "Yanmar"
    const eModel = parts.slice(1).join(' '); // e.g. "4JH3-TE"
    const engineMakeEl = document.getElementById('engineMake');
    if (engineMakeEl) {
      // Try dropdown first
      const makeOpt = Array.from(engineMakeEl.options || []).find(o => o.value.toLowerCase() === eMake.toLowerCase());
      if (makeOpt) {
        engineMakeEl.value = makeOpt.value;
        // Trigger the make change to populate model dropdown
        if (typeof onEngineMakeChange === 'function') onEngineMakeChange();
        // Wait a tick for model dropdown to populate, then set model
        setTimeout(() => {
          const engineModelEl = document.getElementById('engineModel');
          if (engineModelEl) {
            const modelOpt = Array.from(engineModelEl.options || []).find(o => o.value === eModel);
            if (modelOpt) engineModelEl.value = eModel;
            else if (typeof onEngineModelChange === 'function') {
              // Model not in dropdown — might need free-text input
              engineModelEl.value = eModel;
            }
            if (typeof onEngineModelChange === 'function') onEngineModelChange();
          }
        }, 100);
      }
    }
  }

  // Hide the banner
  const banner = document.getElementById('specsBanner');
  if (banner) banner.remove();

  // Auto-save: programmatic .value changes don't fire input/change events,
  // so the debounced auto-save never triggers. Force a save now.
  if (typeof saveEditFormSilently === 'function') {
    saveEditFormSilently().then(() => {
      const sub = document.querySelector('.header-subtitle');
      if (sub) { const orig = sub.textContent; sub.textContent = 'Specs saved ✓'; setTimeout(() => { sub.textContent = orig; }, 800); }
    });
  }
}

// Check for specs on model field blur and show banner if found
// Store the last matched specs globally so we don't need to embed JSON in HTML attributes
let _pendingSpecs = null;
// Track when specs have been applied so we don't re-show the banner
let _specsAppliedForInput = '';

// Debounced version — updates the picker as you type (500ms delay)
let _specsDebounceTimer = null;
function checkSpecsDebounced() {
  clearTimeout(_specsDebounceTimer);
  _specsDebounceTimer = setTimeout(() => checkSpecsOnBlur(), 500);
}

function checkSpecsOnBlur() {
  const input = document.getElementById('yearMakeModel')?.value || '';
  if (!input || input.length < 5) return;

  // Don't re-show banner if specs were already applied for this input
  if (_specsAppliedForInput && input.toLowerCase().includes(_specsAppliedForInput.toLowerCase())) return;

  const existingBanner = document.getElementById('specsBanner');
  if (existingBanner) existingBanner.remove();

  const results = findBoatSpecsAll(input);
  if (results.length === 0) return;

  // Take top matches (up to 20 for manufacturer-wide searches)
  const topResults = results.slice(0, 20);
  const best = topResults[0];

  // Store best match globally for the auto-fill button
  _pendingSpecs = best.boat;

  // Immediately set vessel type from the best match
  if (best.boat.type) {
    const vesselTypeEl = document.getElementById('vesselType');
    if (vesselTypeEl) {
      const typeMap = { 'sailboat': 'sail', 'powerboat': 'power', 'sail': 'sail', 'power': 'power', 'human-powered': 'human-powered' };
      const mappedType = typeMap[best.boat.type.toLowerCase()] || null;
      if (mappedType) vesselTypeEl.value = mappedType;
    }
  }

  const banner = document.createElement('div');
  banner.id = 'specsBanner';
  banner.style.cssText = 'background:#d1fae5;border:1px solid #6ee7b7;border-radius:8px;padding:12px 16px;margin:8px 0 16px;';

  if (topResults.length === 1 || (best.score - (topResults[1]?.score || 0)) > 0.25) {
    // Single clear match — auto-apply immediately and show confirmation
    const label = `${best.boat.make} ${best.boat.model}${best.boat.yearStart ? ' (' + best.boat.yearStart + (best.boat.yearEnd ? '–' + best.boat.yearEnd : '+') + ')' : ''}`;
    applyBoatSpecs(best.boat);
    _specsAppliedForInput = best.boat.make + ' ' + best.boat.model;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="color:#065f46;font-size:14px;flex:1;">✅ Specs applied: <strong>${label}</strong></span>
        <button class="btn-secondary" style="padding:6px 12px;font-size:12px;"
                onclick="document.getElementById('specsBanner').remove()">OK</button>
      </div>
    `;
    // Auto-dismiss the confirmation after 4 seconds
    setTimeout(() => { const b = document.getElementById('specsBanner'); if (b) b.remove(); }, 4000);
  } else {
    // Multiple close matches — let user pick
    const scrollStyle = topResults.length > 6 ? 'max-height:280px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-right:4px;' : '';
    let optionsHtml = '<div style="color:#065f46;font-size:14px;margin-bottom:8px;"><strong>Multiple matches — tap to apply:</strong></div>';
    optionsHtml += `<div style="${scrollStyle}">`;
    topResults.forEach((r, i) => {
      const b = r.boat;
      const label = `${b.make} ${b.model}${b.yearStart ? ' (' + b.yearStart + (b.yearEnd ? '–' + b.yearEnd : '+') + ')' : ''}`;
      const safeId = b.id.replace(/'/g, "\\'");
      optionsHtml += `
        <button onclick="applySpecsById('${safeId}')"
                style="display:block;width:100%;text-align:left;background:${i === 0 ? '#ecfdf5' : 'white'};border:1px solid #d1d5db;border-radius:6px;padding:10px 12px;margin:4px 0;cursor:pointer;font-size:13px;">
          <strong>${label}</strong>
          <span style="color:#6b7280;margin-left:8px;">${b.loa || ''} LOA${b.beam ? ' · ' + b.beam + ' beam' : ''}</span>
        </button>`;
    });
    optionsHtml += '</div>';
    optionsHtml += `<button class="btn-secondary" style="padding:6px 12px;font-size:12px;margin-top:6px;"
            onclick="document.getElementById('specsBanner').remove()">Dismiss</button>`;
    banner.innerHTML = optionsHtml;
  }

  const field = document.getElementById('yearMakeModel');
  if (field) field.closest('.form-group').insertAdjacentElement('afterend', banner);
}

// Apply specs from a multi-match selection by boat ID
function applySpecsById(id) {
  const boat = boatSpecsDB.boats.find(x => x.id === id);
  if (boat) {
    _pendingSpecs = boat;
    applyBoatSpecs(boat);
    _specsAppliedForInput = boat.make + ' ' + boat.model;
    // Replace the picker with a green confirmation
    const banner = document.getElementById('specsBanner');
    if (banner) {
      const label = `${boat.make} ${boat.model}${boat.yearStart ? ' (' + boat.yearStart + (boat.yearEnd ? '–' + boat.yearEnd : '+') + ')' : ''}`;
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="color:#065f46;font-size:14px;flex:1;">✅ Specs applied: <strong>${label}</strong></span>
          <button class="btn-secondary" style="padding:6px 12px;font-size:12px;"
                  onclick="document.getElementById('specsBanner').remove()">OK</button>
        </div>`;
      setTimeout(() => { const b = document.getElementById('specsBanner'); if (b) b.remove(); }, 4000);
    }
    showToast('Specs applied: ' + boat.make + ' ' + boat.model);
  }
}

function applyPendingSpecs() {
  if (_pendingSpecs) {
    applyBoatSpecs(_pendingSpecs);
    _specsAppliedForInput = (_pendingSpecs.make || '') + ' ' + (_pendingSpecs.model || '');
  }
}

// Show auto-suggested valuation card
function suggestValuation() {
  const input = document.getElementById('yearMakeModel')?.value || '';
  if (!input) { showAlert('Enter Year/Make/Model first'); return; }

  const result = findBoatValues(input);

  const existingCard = document.getElementById('valuationSuggestionCard');
  if (existingCard) existingCard.remove();

  const card = document.createElement('div');
  card.id = 'valuationSuggestionCard';
  card.style.cssText = 'background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin:8px 0 16px;';

  if (!result) {
    const { make, model } = parseYearMakeModel(input);
    const query = encodeURIComponent(input);
    card.innerHTML = `
      <p style="color:#1e40af;font-weight:bold;margin:0 0 8px;">No built-in value data found for this model</p>
      <p style="color:#006699;font-size:13px;margin:0 0 12px;">Check live sources for current market pricing:</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-secondary" style="font-size:13px;"
                onclick="window.open('https://www.yachtworld.com/boats-for-sale/?keyword=${encodeURIComponent(input)}','_blank')">
          🌐 Yachtworld Listings
        </button>
        <button class="btn-secondary" style="font-size:13px;"
                onclick="window.open('https://www.bucvalu.com','_blank')">
          📖 BUCValu Book
        </button>
        <button class="btn-secondary" style="font-size:13px;"
                onclick="document.getElementById('valuationSuggestionCard').remove()">
          Dismiss
        </button>
      </div>
    `;
  } else {
    const { entry, range } = result;
    const lowFmt = '$' + range.lowUSD.toLocaleString();
    const highFmt = '$' + range.highUSD.toLocaleString();
    const usdcad = parseFloat(document.getElementById('exchangeRate')?.value || 1.38);
    const lowCAD = '$' + Math.round(range.lowUSD * usdcad).toLocaleString();
    const highCAD = '$' + Math.round(range.highUSD * usdcad).toLocaleString();
    const yearRange = range.from === range.to ? range.from : `${range.from}–${range.to}`;

    const escInput = input.replace(/'/g, "\\'");
    card.innerHTML = `
      <p style="color:#1e40af;font-weight:bold;margin:0 0 8px;">📊 Market Value Data — ${entry.make} ${entry.model} (${yearRange})</p>

      <div style="background:white;border:1px solid #dbeafe;border-radius:6px;padding:10px 12px;margin-bottom:10px;">
        <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Source: BUC Value Guide (built-in database)</p>
        <p style="color:#006699;font-size:20px;font-weight:bold;margin:0;">${lowFmt} – ${highFmt} USD</p>
        <p style="color:#374151;font-size:13px;margin:4px 0 0;">${lowCAD} – ${highCAD} CAD @ ${usdcad.toFixed(2)}</p>
      </div>

      <p style="color:#374151;font-size:12px;margin:0 0 4px;line-height:1.5;">
        <em>BUC guide values reflect average condition. Adjust for actual condition, equipment, upgrades, and location. SAMS requires corroboration from additional sources.</em>
      </p>
      <p style="color:#006699;font-size:13px;margin:0 0 10px;">${entry.rationale}</p>

      <p style="color:#1e40af;font-weight:600;font-size:13px;margin:0 0 6px;">Search additional sources to corroborate:</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;"
                onclick="window.open('https://www.yachtworld.com/boats-for-sale/?keyword=${encodeURIComponent(input)}','_blank')">
          🌐 YachtWorld
        </button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;"
                onclick="window.open('https://www.soldboats.com/cgi-bin/soldboats/search.cgi?searchStr=${encodeURIComponent(input)}','_blank')">
          🔍 Soldboats
        </button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;"
                onclick="window.open('https://www.boats.com/search/?q=${encodeURIComponent(input)}','_blank')">
          🚤 Boats.com
        </button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 10px;"
                onclick="window.open('https://www.bucvalu.com','_blank')">
          📖 BUCValu (live)
        </button>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-primary" style="font-size:13px;"
                onclick="applyValuationSuggestion(${range.lowUSD},${range.highUSD},'${entry.make} ${entry.model}')">
          ✓ Apply BUC Range
        </button>
        <button class="btn-secondary" style="font-size:13px;"
                onclick="document.getElementById('valuationSuggestionCard').remove()">
          Dismiss
        </button>
      </div>
    `;
  }

  // Insert before the valuation low field
  const valuationHeading = document.querySelector('.form-heading[data-section="valuation"]');
  if (valuationHeading) {
    valuationHeading.insertAdjacentElement('afterend', card);
  } else {
    const lowField = document.getElementById('valuationLow');
    if (lowField) lowField.closest('.form-group').insertAdjacentElement('beforebegin', card);
  }
  // Scroll the card into view so the user can see it
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Update boat style dropdown options based on vessel type
function updateBoatStyleOptions() {
  const vesselType = document.getElementById('vesselType')?.value || '';
  const container = document.getElementById('boatStyleContainer');
  const boatStyleInput = document.getElementById('boatStyle');
  if (!container || !boatStyleInput) return;

  // Show/hide sail-only fields (ballast, total sail area)
  document.querySelectorAll('.sail-only-field').forEach(el => {
    el.style.display = (vesselType === 'sail' || vesselType === '') ? '' : 'none';
  });

  const sailOptions = ['Sloop', 'Cutter', 'Ketch', 'Yawl', 'Schooner', 'Catamaran', 'Trimaran', 'Cat-rigged', 'Motorsailer'];
  const powerOptions = ['Motor Yacht', 'Trawler', 'Express Cruiser', 'Sportfisherman', 'Centre Console', 'Cuddy Cabin', 'Bowrider', 'Pontoon', 'Cabin Cruiser', 'Lobster Boat', 'Tug', 'Workboat'];
  const humanOptions = ['Canoe', 'Kayak', 'Rowboat', 'Dinghy', 'Paddleboard'];

  let options = [];
  if (vesselType === 'sail') options = sailOptions;
  else if (vesselType === 'power') options = powerOptions;
  else if (vesselType === 'human-powered') options = humanOptions;

  if (options.length === 0) {
    container.innerHTML = '<div style="color:#9ca3af;font-size:13px;grid-column:1/-1;">Select vessel type first</div>';
    boatStyleInput.value = '';
    return;
  }

  // Auto-select a default boat style if none is currently chosen
  // (or if the current choice doesn't match the vessel type options)
  let currentValue = boatStyleInput.value;
  if (!currentValue || !options.includes(currentValue)) {
    // Default: first option in the list for each vessel type
    currentValue = options[0];
    boatStyleInput.value = currentValue;
  }

  const buttonsHtml = options.map(o => `
    <button type="button" onclick="selectBoatStyle('${o}')" style="padding:8px 10px;border:2px solid ${currentValue === o ? '#3b82f6' : '#e5e7eb'};background:${currentValue === o ? '#dbeafe' : '#ffffff'};color:${currentValue === o ? '#1e40af' : '#374151'};border-radius:6px;font-size:12px;font-weight:${currentValue === o ? '600' : '400'};cursor:pointer;transition:all 0.2s;">${o}</button>
  `).join('');

  container.innerHTML = buttonsHtml;
}

function selectBoatStyle(value) {
  const boatStyleInput = document.getElementById('boatStyle');
  if (boatStyleInput) boatStyleInput.value = value;
  updateBoatStyleOptions(); // Refresh to show highlight
}

// Look up engine type (Inboard/Outboard/Sterndrive) from engine_db for a given make and model
function lookupEngineType(makeName, modelName) {
  if (!engineDb || !makeName || !modelName) return '';
  const maker = engineDb.engines.find(e => e.make.toLowerCase() === makeName.toLowerCase());
  if (!maker) return '';
  const mdl = maker.models.find(m => m.model.toLowerCase() === modelName.toLowerCase());
  return mdl ? (mdl.engineType || '') : '';
}

// Generate a vessel description template from filled-in form fields
async function generateVesselDescription() {
  const ymm = document.getElementById('yearMakeModel')?.value || '';
  const { year, make, model } = parseYearMakeModel(ymm);
  const vesselType = document.getElementById('vesselType')?.value || '';
  const boatStyle = document.getElementById('boatStyle')?.value || '';
  const hullType = document.getElementById('hullType')?.value || '';
  const construction = document.getElementById('construction')?.value || '';
  const loa = document.getElementById('loa')?.value || '';
  const beam = document.getElementById('beam')?.value || '';
  const draft = document.getElementById('maxDraft')?.value || '';
  const displacement = document.getElementById('displacement')?.value || '';
  const keelType = document.getElementById('keelType')?.value || '';
  const sailArea = document.getElementById('totalSailArea')?.value || '';
  const cabins = document.getElementById('numberCabins')?.value || '';
  const electrical = document.getElementById('electricalSystem')?.value || '';

  const vesselName = document.getElementById('vesselName')?.value || '[VESSEL NAME]';

  // Build the vessel type phrase
  const yearStr = year || '[YEAR]';
  const makeStr = make || '[MAKE]';
  const modelStr = model || '[MODEL]';
  const typeStr = boatStyle || (vesselType === 'sail' ? 'sailing vessel' : vesselType === 'power' ? 'power vessel' : '[VESSEL TYPE]');

  // Gather engine and transmission data from form
  const engineMake = document.getElementById('engineMake')?.value || '';
  const engineModel = document.getElementById('engineModel')?.value || '';
  const engineHP = document.getElementById('engineHP')?.value || '';
  const fuelType = document.getElementById('fuelType')?.value || '';
  const transmissionMake = document.getElementById('transmissionMake')?.value || '';
  const transmissionModel = document.getElementById('transmissionModel')?.value || '';

  // Look up engine type from database
  const engineTypeFromDb = lookupEngineType(engineMake, engineModel);
  const engineTypeStr = engineTypeFromDb ? engineTypeFromDb.toLowerCase() : '';

  // Determine rig description for sailboats
  let rigDesc = '';
  if (vesselType === 'sail') {
    const rigType = boatStyle ? boatStyle.toLowerCase() : '[SLOOP/CUTTER/KETCH]';
    // Pull mast stepping and track type from saved survey data
    const survey = await getSurvey(currentSurveyId);
    const mastData = survey?.items?.['Main mast'] || {};
    const steppingStr = mastData.mastStepping ? mastData.mastStepping.toLowerCase() : '[deck-stepped/keel-stepped]';
    const trackStr = mastData.mastTrackType ? ` with ${mastData.mastTrackType.toLowerCase()}` : '';
    rigDesc = ` She is ${rigType}-rigged with a ${steppingStr} [aluminium/carbon fibre] mast${trackStr}.`;
    if (sailArea) rigDesc += ` Total sail area is ${sailArea}.`;
  }

  // Build engine description using actual data where available
  const engMakeModel = (engineMake && engineModel) ? `${engineMake} ${engineModel}` :
                       engineMake ? `${engineMake} [MODEL]` : '[MAKE/MODEL]';
  const engFuel = fuelType || '[DIESEL/GASOLINE]';
  const engHPStr = engineHP ? `${engineHP} horsepower` : '[XX] horsepower';
  const transMakeModel = (transmissionMake && transmissionModel) ? `${transmissionMake} ${transmissionModel}` :
                         transmissionMake ? `${transmissionMake} [MODEL]` : '[MAKE/MODEL]';

  // Check for Engine 2
  const eng2Section = document.getElementById('engine2Section');
  const hasEngine2 = eng2Section && eng2Section.style.display !== 'none';
  const eng2Make = document.getElementById('engine2Make')?.value || '';
  const eng2Model = document.getElementById('engine2Model')?.value || '';
  const eng2HP = document.getElementById('engine2HP')?.value || '';
  const eng2Fuel = document.getElementById('fuelType2')?.value || '';

  let engineDesc = '';
  if (vesselType === 'human') {
    engineDesc = `This is a human-powered vessel with no auxiliary engine.`;
  } else if (vesselType === 'sail') {
    const engType = engineTypeStr || '[inboard/outboard]';
    const driveType = engineTypeStr === 'inboard' ? '[shaft drive/saildrive]' : '[SHAFT DRIVE/SAILDRIVE]';
    engineDesc = `Auxiliary power is provided by a ${engMakeModel} ${engFuel} ${engType} engine rated at ${engHPStr}, coupled to a ${transMakeModel} transmission, driving a [FIXED/FOLDING/FEATHERING] [2/3]-blade propeller through a ${driveType}.`;
  } else if (hasEngine2) {
    const engType = engineTypeStr || '[inboard/outboard/sterndrive]';
    const eng2MakeModel = (eng2Make && eng2Model) ? `${eng2Make} ${eng2Model}` :
                          eng2Make ? `${eng2Make} [MODEL]` : engMakeModel;
    const eng2HPStr = eng2HP ? `${eng2HP} horsepower` : engHPStr;
    const eng2FuelStr = eng2Fuel || engFuel;
    engineDesc = `Power is provided by twin ${engMakeModel} ${engFuel} ${engType} engines rated at ${engHPStr} each, coupled to ${transMakeModel} transmissions, driving [FIXED/FOLDING] [3/4]-blade propellers through [SHAFT DRIVE(S)/STERNDRIVE(S)].`;
  } else {
    const engType = engineTypeStr || '[inboard/outboard/sterndrive]';
    engineDesc = `Power is provided by a ${engMakeModel} ${engFuel} ${engType} engine rated at ${engHPStr}, coupled to a ${transMakeModel} transmission, driving a [FIXED/FOLDING] [3/4]-blade propeller through a [SHAFT DRIVE/STERNDRIVE].`;
  }

  // Pull survey data for propellers, shafts, electronics, and safety
  const survey = vesselType === 'sail' ? (await getSurvey(currentSurveyId)) : (await getSurvey(currentSurveyId));
  const driveLineCount = survey?.driveLineCount || 1;
  const hasRudder = survey?.hasRudder !== false;

  // Build propeller/shaft description from survey items
  let propDesc = '';
  if (survey?.items) {
    const propellerItems = Object.keys(survey.items).filter(k => k.toLowerCase().includes('propeller') && survey.items[k].text);
    const shaftItems = Object.keys(survey.items).filter(k => (k.toLowerCase().includes('shaft') || k.toLowerCase().includes('stern tube')) && survey.items[k].text);
    const cutlassItems = Object.keys(survey.items).filter(k => k.toLowerCase().includes('cutlass') && survey.items[k].text);
    if (propellerItems.length > 0 || shaftItems.length > 0) {
      propDesc = '\n\n';
      if (shaftItems.length > 0) propDesc += shaftItems.map(k => survey.items[k].text).join(' ') + ' ';
      if (cutlassItems.length > 0) propDesc += cutlassItems.map(k => survey.items[k].text).join(' ') + ' ';
      if (propellerItems.length > 0) propDesc += propellerItems.map(k => survey.items[k].text).join(' ');
    }
  }

  // Build electronics description from survey items
  let electronicsDesc = '';
  if (survey?.items) {
    const electronicItems = ['VHF radio', 'GPS/chartplotter', 'Depth sounder/fish finder', 'Radar', 'Autopilot', 'AIS transponder/receiver'];
    const foundElectronics = [];
    for (const eLabel of electronicItems) {
      const match = Object.keys(survey.items).find(k => k.toLowerCase().includes(eLabel.toLowerCase().split('/')[0]));
      if (match && survey.items[match].rating && survey.items[match].rating.startsWith('C')) {
        foundElectronics.push(eLabel.split('/')[0]);
      }
    }
    if (foundElectronics.length > 0) {
      electronicsDesc = `Navigation and communication equipment includes ${foundElectronics.join(', ')}.`;
    }
  }

  // Build safety equipment summary from TC TP 511 checklist
  let safetyDesc = '';
  if (survey?.safetyEquipment && survey.safetyEquipment.length > 0) {
    const onBoard = survey.safetyEquipment.filter(e => e.checked).length;
    const missing = survey.safetyEquipment.length - onBoard;
    safetyDesc = `Safety equipment per Transport Canada TP 511: ${onBoard} of ${survey.safetyEquipment.length} required items verified on board.`;
    if (missing > 0) {
      const missingNames = survey.safetyEquipment.filter(e => !e.checked).map(e => e.name).slice(0, 5);
      safetyDesc += ` Missing: ${missingNames.join(', ')}${missing > 5 ? ` and ${missing - 5} more` : ''}.`;
    }
  }

  const constructionStr = construction || '[FIBREGLASS/WOOD/ALUMINUM/STEEL]';
  const hullTypeStr = hullType || '[DISPLACEMENT/SEMI-DISPLACEMENT/PLANING]';
  const keelStr = vesselType === 'sail'
    ? (keelType ? `, equipped with a ${keelType.toLowerCase()} keel` : ' with a [FIN/FULL/SHOAL/WING] keel')
    : '';
  const draftStr = draft ? ` with a maximum draft of ${draft}` : (vesselType === 'sail' ? ' with a maximum draft of [X\'X"]' : '');

  let desc = `"${vesselName}" is a ${yearStr} ${makeStr} ${modelStr}, a ${constructionStr} ${hullTypeStr} ${typeStr}. `;
  desc += `She has an overall length of ${loa || '[XX\'XX"]'}, a beam of ${beam || '[XX\'XX"]'}${keelStr}${draftStr}`;
  if (displacement) desc += `, and a displacement of ${displacement}`;
  desc += `.`;
  desc += rigDesc;
  desc += `\n\n`;
  desc += engineDesc;
  desc += propDesc;
  desc += `\n\n`;
  desc += `The hull is [COLOUR] with a [COLOUR] boot stripe. The deck is [COLOUR] with [NON-SKID MOULDED/TEAK OVERLAY] surfaces. `;
  const cabinStr = cabins || '[NUMBER]';
  desc += `The vessel features ${cabinStr} cabin(s) with [NUMBER] berth(s), [NUMBER] head(s) with [MANUAL/ELECTRIC] marine toilet(s), and a [V-BERTH/AFT CABIN/SALON] layout. `;
  desc += `The galley is [PORT/STARBOARD/AFT] and includes a [PROPANE/ELECTRIC/ALCOHOL] stove with [OVEN], a [12V/120V] refrigerator, and a [SINGLE/DOUBLE] stainless steel sink.`;
  desc += `\n\n`;
  if (electrical) {
    desc += `The electrical system is ${electrical}. `;
  } else {
    desc += `The electrical system is [12V DC / 120V AC] with [XX] amp shore power service. `;
  }
  desc += electronicsDesc || `Navigation and communication equipment includes [GPS/CHARTPLOTTER], [VHF RADIO], [DEPTH SOUNDER], [RADAR], and [AUTOPILOT]. `;
  desc += '\n\n';
  desc += safetyDesc || `Safety equipment includes [NUMBER] fire extinguisher(s), [NUMBER] PFD(s), flares, and a throwable flotation device.`;
  desc += `\n\n`;
  desc += `The vessel is in [GOOD/FAIR/POOR] overall cosmetic condition and appears to have been [WELL/REASONABLY/POORLY] maintained. [ANY NOTABLE MODIFICATIONS, DAMAGE HISTORY, OR OBSERVATIONS].`;

  const textarea = document.getElementById('vesselDescription');
  if (textarea) {
    if (textarea.value.trim()) {
      const yes = await showConfirm('This will replace the current description. Continue?', 'Replace', 'Cancel');
      if (!yes) return;
    }
    textarea.value = desc;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    updatePlaceholderCount(desc);
    // Mark as auto-generated so future saves keep it updated.
    // Also clear the sticky user-editing flag — the surveyor has explicitly
    // asked us to take over again, so resume auto-updates on subsequent saves.
    if (currentSurveyId) {
      if (window._descUserEditing === currentSurveyId) window._descUserEditing = null;
      getSurvey(currentSurveyId).then(s => {
        if (s) { s.descriptionAutoGenerated = true; saveSurvey(s); }
      });
    }
  }
}

// Regenerate vessel description from inspection view (reads from saved survey, not form)
async function regenerateDescriptionFromInspection() {
  if (!currentSurveyId) return;
  const survey = await getSurvey(currentSurveyId);
  if (!survey) { showToast('Survey not found'); return; }

  const ymm = survey.yearMakeModel || '';
  const { year, make, model } = parseYearMakeModel(ymm);
  const vesselType = survey.vesselType || '';
  const boatStyle = survey.boatStyle || '';
  const hullType = survey.hullType || '';
  const construction = survey.construction || '';
  const loa = survey.loa || '';
  const beam = survey.beam || '';
  const draft = survey.maxDraft || '';
  const displacement = survey.displacement || '';
  const keelType = survey.keelType || '';
  const sailArea = survey.totalSailArea || '';
  const cabins = survey.numberCabins || '';
  const electrical = survey.electricalSystem || '';
  const vesselName = survey.vesselName || '[VESSEL NAME]';

  const yearStr = year || '[YEAR]';
  const makeStr = make || '[MAKE]';
  const modelStr = model || '[MODEL]';
  const typeStr = boatStyle || (vesselType === 'sail' ? 'sailing vessel' : vesselType === 'power' ? 'power vessel' : '[VESSEL TYPE]');

  const engineMake = survey.engineMake || '';
  const engineModel = survey.engineModel || '';
  const engineHP = survey.engineHP || '';
  const fuelType = survey.fuelType || '';
  const transmissionMake = survey.transmissionMake || '';
  const transmissionModel = survey.transmissionModel || '';
  const engineTypeFromDb = lookupEngineType(engineMake, engineModel);
  const engineTypeStr = engineTypeFromDb ? engineTypeFromDb.toLowerCase() : '';

  let rigDesc = '';
  if (vesselType === 'sail') {
    const rigType = boatStyle ? boatStyle.toLowerCase() : '[SLOOP/CUTTER/KETCH]';
    const mastData = survey.items?.['Main mast'] || {};
    const steppingStr = mastData.mastStepping ? mastData.mastStepping.toLowerCase() : '[deck-stepped/keel-stepped]';
    const trackStr = mastData.mastTrackType ? ` with ${mastData.mastTrackType.toLowerCase()}` : '';
    rigDesc = ` She is ${rigType}-rigged with a ${steppingStr} [aluminium/carbon fibre] mast${trackStr}.`;
    if (sailArea) rigDesc += ` Total sail area is ${sailArea}.`;
  }

  const engMakeModel = (engineMake && engineModel) ? `${engineMake} ${engineModel}` :
                       engineMake ? `${engineMake} [MODEL]` : '[MAKE/MODEL]';
  const engFuel = fuelType || '[DIESEL/GASOLINE]';
  const engHPStr = engineHP ? `${engineHP} horsepower` : '[XX] horsepower';
  const transMakeModel = (transmissionMake && transmissionModel) ? `${transmissionMake} ${transmissionModel}` :
                         transmissionMake ? `${transmissionMake} [MODEL]` : '[MAKE/MODEL]';

  const hasEngine2 = !!survey.engine2Make;
  const eng2Make = survey.engine2Make || '';
  const eng2Model = survey.engine2Model || '';
  const eng2HP = survey.engine2HP || '';

  let engineDesc = '';
  if (vesselType === 'human') {
    engineDesc = `This is a human-powered vessel with no auxiliary engine.`;
  } else if (vesselType === 'sail') {
    const engType = engineTypeStr || '[inboard/outboard]';
    const driveType = engineTypeStr === 'inboard' ? '[shaft drive/saildrive]' : '[SHAFT DRIVE/SAILDRIVE]';
    engineDesc = `Auxiliary power is provided by a ${engMakeModel} ${engFuel} ${engType} engine rated at ${engHPStr}, coupled to a ${transMakeModel} transmission, driving a [FIXED/FOLDING/FEATHERING] [2/3]-blade propeller through a ${driveType}.`;
  } else if (hasEngine2) {
    const engType = engineTypeStr || '[inboard/outboard/sterndrive]';
    engineDesc = `Power is provided by twin ${engMakeModel} ${engFuel} ${engType} engines rated at ${engHPStr} each, coupled to ${transMakeModel} transmissions, driving [FIXED/FOLDING] [3/4]-blade propellers through [SHAFT DRIVE(S)/STERNDRIVE(S)].`;
  } else {
    const engType = engineTypeStr || '[inboard/outboard/sterndrive]';
    engineDesc = `Power is provided by a ${engMakeModel} ${engFuel} ${engType} engine rated at ${engHPStr}, coupled to a ${transMakeModel} transmission, driving a [FIXED/FOLDING] [3/4]-blade propeller through a [SHAFT DRIVE/STERNDRIVE].`;
  }

  // Pull propeller/shaft data from survey items
  let propDesc = '';
  if (survey.items) {
    const propellerItems = Object.keys(survey.items).filter(k => k.toLowerCase().includes('propeller') && survey.items[k].text);
    const shaftItems = Object.keys(survey.items).filter(k => (k.toLowerCase().includes('shaft') || k.toLowerCase().includes('stern tube')) && survey.items[k].text);
    const cutlassItems = Object.keys(survey.items).filter(k => k.toLowerCase().includes('cutlass') && survey.items[k].text);
    if (propellerItems.length > 0 || shaftItems.length > 0) {
      propDesc = '\n\n';
      if (shaftItems.length > 0) propDesc += shaftItems.map(k => survey.items[k].text).join(' ') + ' ';
      if (cutlassItems.length > 0) propDesc += cutlassItems.map(k => survey.items[k].text).join(' ') + ' ';
      if (propellerItems.length > 0) propDesc += propellerItems.map(k => survey.items[k].text).join(' ');
    }
  }

  // Electronics from survey items
  let electronicsDesc = '';
  if (survey.items) {
    const electronicItems = ['VHF radio', 'GPS/chartplotter', 'Depth sounder/fish finder', 'Radar', 'Autopilot', 'AIS transponder/receiver'];
    const foundElectronics = [];
    for (const eLabel of electronicItems) {
      const match = Object.keys(survey.items).find(k => k.toLowerCase().includes(eLabel.toLowerCase().split('/')[0]));
      if (match && survey.items[match].rating && survey.items[match].rating.startsWith('C')) {
        foundElectronics.push(eLabel.split('/')[0]);
      }
    }
    if (foundElectronics.length > 0) {
      electronicsDesc = `Navigation and communication equipment includes ${foundElectronics.join(', ')}.`;
    }
  }

  // Safety equipment from TC TP 511
  let safetyDesc = '';
  if (survey.safetyEquipment && survey.safetyEquipment.length > 0) {
    const onBoard = survey.safetyEquipment.filter(e => e.checked).length;
    const missing = survey.safetyEquipment.length - onBoard;
    safetyDesc = `Safety equipment per Transport Canada TP 511: ${onBoard} of ${survey.safetyEquipment.length} required items verified on board.`;
    if (missing > 0) {
      const missingNames = survey.safetyEquipment.filter(e => !e.checked).map(e => e.name).slice(0, 5);
      safetyDesc += ` Missing: ${missingNames.join(', ')}${missing > 5 ? ` and ${missing - 5} more` : ''}.`;
    }
  }

  const constructionStr = construction || '[FIBREGLASS/WOOD/ALUMINUM/STEEL]';
  const hullTypeStr = hullType || '[DISPLACEMENT/SEMI-DISPLACEMENT/PLANING]';
  const keelStr = vesselType === 'sail'
    ? (keelType ? `, equipped with a ${keelType.toLowerCase()} keel` : ' with a [FIN/FULL/SHOAL/WING] keel')
    : '';
  const draftStr = draft ? ` with a maximum draft of ${draft}` : (vesselType === 'sail' ? ' with a maximum draft of [X\'X"]' : '');

  let desc = `"${vesselName}" is a ${yearStr} ${makeStr} ${modelStr}, a ${constructionStr} ${hullTypeStr} ${typeStr}. `;
  desc += `She has an overall length of ${loa || '[XX\'XX"]'}, a beam of ${beam || '[XX\'XX"]'}${keelStr}${draftStr}`;
  if (displacement) desc += `, and a displacement of ${displacement}`;
  desc += `.`;
  desc += rigDesc;
  desc += `\n\n`;
  desc += engineDesc;
  desc += propDesc;
  desc += `\n\n`;
  desc += `The hull is [COLOUR] with a [COLOUR] boot stripe. The deck is [COLOUR] with [NON-SKID MOULDED/TEAK OVERLAY] surfaces. `;
  const cabinStr = cabins || '[NUMBER]';
  desc += `The vessel features ${cabinStr} cabin(s) with [NUMBER] berth(s), [NUMBER] head(s) with [MANUAL/ELECTRIC] marine toilet(s), and a [V-BERTH/AFT CABIN/SALON] layout. `;
  desc += `The galley is [PORT/STARBOARD/AFT] and includes a [PROPANE/ELECTRIC/ALCOHOL] stove with [OVEN], a [12V/120V] refrigerator, and a [SINGLE/DOUBLE] stainless steel sink.`;
  desc += `\n\n`;
  if (electrical) {
    desc += `The electrical system is ${electrical}. `;
  } else {
    desc += `The electrical system is [12V DC / 120V AC] with [XX] amp shore power service. `;
  }
  desc += electronicsDesc || `Navigation and communication equipment includes [GPS/CHARTPLOTTER], [VHF RADIO], [DEPTH SOUNDER], [RADAR], and [AUTOPILOT]. `;
  desc += '\n\n';
  desc += safetyDesc || `Safety equipment includes [NUMBER] fire extinguisher(s), [NUMBER] PFD(s), flares, and a throwable flotation device.`;
  desc += `\n\n`;
  desc += `The vessel is in [GOOD/FAIR/POOR] overall cosmetic condition and appears to have been [WELL/REASONABLY/POORLY] maintained. [ANY NOTABLE MODIFICATIONS, DAMAGE HISTORY, OR OBSERVATIONS].`;

  // Confirm before overwriting
  if (survey.vesselDescription && survey.vesselDescription.trim()) {
    const yes = await showConfirm('This will regenerate the vessel description using current survey data. The existing description will be replaced. Continue?', 'Regenerate', 'Cancel');
    if (!yes) return;
  }

  survey.vesselDescription = desc;
  survey.descriptionAutoGenerated = true;
  // Explicit Regenerate click — resume auto-updates on subsequent saves
  if (window._descUserEditing === survey.id) window._descUserEditing = null;
  await saveSurvey(survey);
  showToast('Description regenerated with latest survey data');
  updatePlaceholderCount(desc);
}

// Pure function: build vessel description from a survey object (no DOM access)
function buildDescriptionFromSurvey(survey) {
  const ymm = survey.yearMakeModel || '';
  const { year, make, model } = parseYearMakeModel(ymm);
  const vesselType = survey.vesselType || '';
  const boatStyle = survey.boatStyle || '';
  const hullType = survey.hullType || '';
  const construction = survey.construction || '';
  const loa = survey.loa || '';
  const beam = survey.beam || '';
  const draft = survey.maxDraft || '';
  const displacement = survey.displacement || '';
  const keelType = survey.keelType || '';
  const sailArea = survey.totalSailArea || '';
  const cabins = survey.numberCabins || '';
  const electrical = survey.electricalSystem || '';
  const vesselName = survey.vesselName || '[VESSEL NAME]';

  const yearStr = year || '[YEAR]';
  const makeStr = make || '[MAKE]';
  const modelStr = model || '[MODEL]';
  const typeStr = boatStyle || (vesselType === 'sail' ? 'sailing vessel' : vesselType === 'power' ? 'power vessel' : '[VESSEL TYPE]');

  const engineMake = survey.engineMake || '';
  const engineModel = survey.engineModel || '';
  const engineHP = survey.engineHP || '';
  const fuelType = survey.fuelType || '';
  const transmissionMake = survey.transmissionMake || '';
  const transmissionModel = survey.transmissionModel || '';
  const engineTypeFromDb = lookupEngineType(engineMake, engineModel);
  const engineTypeStr = engineTypeFromDb ? engineTypeFromDb.toLowerCase() : '';

  let rigDesc = '';
  if (vesselType === 'sail') {
    const rigType = boatStyle ? boatStyle.toLowerCase() : '[SLOOP/CUTTER/KETCH]';
    const mastData = survey.items?.['Main mast'] || {};
    const steppingStr = mastData.mastStepping ? mastData.mastStepping.toLowerCase() : '[deck-stepped/keel-stepped]';
    const trackStr = mastData.mastTrackType ? ` with ${mastData.mastTrackType.toLowerCase()}` : '';
    rigDesc = ` She is ${rigType}-rigged with a ${steppingStr} [aluminium/carbon fibre] mast${trackStr}.`;
    if (sailArea) rigDesc += ` Total sail area is ${sailArea}.`;
  }

  const engMakeModel = (engineMake && engineModel) ? `${engineMake} ${engineModel}` :
                       engineMake ? `${engineMake} [MODEL]` : '[MAKE/MODEL]';
  const engFuel = fuelType || '[DIESEL/GASOLINE]';
  const engHPStr = engineHP ? `${engineHP} horsepower` : '[XX] horsepower';
  const transMakeModel = (transmissionMake && transmissionModel) ? `${transmissionMake} ${transmissionModel}` :
                         transmissionMake ? `${transmissionMake} [MODEL]` : '[MAKE/MODEL]';

  const hasEngine2 = !!survey.engine2Make;

  let engineDesc = '';
  if (vesselType === 'human') {
    engineDesc = `This is a human-powered vessel with no auxiliary engine.`;
  } else if (vesselType === 'sail') {
    const engType = engineTypeStr || '[inboard/outboard]';
    const driveType = engineTypeStr === 'inboard' ? '[shaft drive/saildrive]' : '[SHAFT DRIVE/SAILDRIVE]';
    engineDesc = `Auxiliary power is provided by a ${engMakeModel} ${engFuel} ${engType} engine rated at ${engHPStr}, coupled to a ${transMakeModel} transmission, driving a [FIXED/FOLDING/FEATHERING] [2/3]-blade propeller through a ${driveType}.`;
  } else if (hasEngine2) {
    const engType = engineTypeStr || '[inboard/outboard/sterndrive]';
    engineDesc = `Power is provided by twin ${engMakeModel} ${engFuel} ${engType} engines rated at ${engHPStr} each, coupled to ${transMakeModel} transmissions, driving [FIXED/FOLDING] [3/4]-blade propellers through [SHAFT DRIVE(S)/STERNDRIVE(S)].`;
  } else {
    const engType = engineTypeStr || '[inboard/outboard/sterndrive]';
    engineDesc = `Power is provided by a ${engMakeModel} ${engFuel} ${engType} engine rated at ${engHPStr}, coupled to a ${transMakeModel} transmission, driving a [FIXED/FOLDING] [3/4]-blade propeller through a [SHAFT DRIVE/STERNDRIVE].`;
  }

  // Propeller/shaft data from survey items
  let propDesc = '';
  if (survey.items) {
    const propellerItems = Object.keys(survey.items).filter(k => k.toLowerCase().includes('propeller') && survey.items[k].text);
    const shaftItems = Object.keys(survey.items).filter(k => (k.toLowerCase().includes('shaft') || k.toLowerCase().includes('stern tube')) && survey.items[k].text);
    const cutlassItems = Object.keys(survey.items).filter(k => k.toLowerCase().includes('cutlass') && survey.items[k].text);
    if (propellerItems.length > 0 || shaftItems.length > 0) {
      propDesc = '\n\n';
      if (shaftItems.length > 0) propDesc += shaftItems.map(k => survey.items[k].text).join(' ') + ' ';
      if (cutlassItems.length > 0) propDesc += cutlassItems.map(k => survey.items[k].text).join(' ') + ' ';
      if (propellerItems.length > 0) propDesc += propellerItems.map(k => survey.items[k].text).join(' ');
    }
  }

  // Electronics from survey items
  let electronicsDesc = '';
  if (survey.items) {
    const electronicItems = ['VHF radio', 'GPS/chartplotter', 'Depth sounder/fish finder', 'Radar', 'Autopilot', 'AIS transponder/receiver'];
    const foundElectronics = [];
    for (const eLabel of electronicItems) {
      const match = Object.keys(survey.items).find(k => k.toLowerCase().includes(eLabel.toLowerCase().split('/')[0]));
      if (match && survey.items[match].rating && survey.items[match].rating.startsWith('C')) {
        foundElectronics.push(eLabel.split('/')[0]);
      }
    }
    if (foundElectronics.length > 0) {
      electronicsDesc = `Navigation and communication equipment includes ${foundElectronics.join(', ')}.`;
    }
  }

  // Safety equipment from TC TP 511
  let safetyDesc = '';
  if (survey.safetyEquipment && survey.safetyEquipment.length > 0) {
    const onBoard = survey.safetyEquipment.filter(e => e.checked).length;
    const missing = survey.safetyEquipment.length - onBoard;
    safetyDesc = `Safety equipment per Transport Canada TP 511: ${onBoard} of ${survey.safetyEquipment.length} required items verified on board.`;
    if (missing > 0) {
      const missingNames = survey.safetyEquipment.filter(e => !e.checked).map(e => e.name).slice(0, 5);
      safetyDesc += ` Missing: ${missingNames.join(', ')}${missing > 5 ? ` and ${missing - 5} more` : ''}.`;
    }
  }

  const constructionStr = construction || '[FIBREGLASS/WOOD/ALUMINUM/STEEL]';
  const hullTypeStr = hullType || '[DISPLACEMENT/SEMI-DISPLACEMENT/PLANING]';
  const keelStr = vesselType === 'sail'
    ? (keelType ? `, equipped with a ${keelType.toLowerCase()} keel` : ' with a [FIN/FULL/SHOAL/WING] keel')
    : '';
  const draftStr = draft ? ` with a maximum draft of ${draft}` : (vesselType === 'sail' ? ' with a maximum draft of [X\'X"]' : '');

  let desc = `"${vesselName}" is a ${yearStr} ${makeStr} ${modelStr}, a ${constructionStr} ${hullTypeStr} ${typeStr}. `;
  desc += `She has an overall length of ${loa || '[XX\'XX"]'}, a beam of ${beam || '[XX\'XX"]'}${keelStr}${draftStr}`;
  if (displacement) desc += `, and a displacement of ${displacement}`;
  desc += `.`;
  desc += rigDesc;
  desc += `\n\n`;
  desc += engineDesc;
  desc += propDesc;
  desc += `\n\n`;
  desc += `The hull is [COLOUR] with a [COLOUR] boot stripe. The deck is [COLOUR] with [NON-SKID MOULDED/TEAK OVERLAY] surfaces. `;
  const cabinStr = cabins || '[NUMBER]';
  desc += `The vessel features ${cabinStr} cabin(s) with [NUMBER] berth(s), [NUMBER] head(s) with [MANUAL/ELECTRIC] marine toilet(s), and a [V-BERTH/AFT CABIN/SALON] layout. `;
  desc += `The galley is [PORT/STARBOARD/AFT] and includes a [PROPANE/ELECTRIC/ALCOHOL] stove with [OVEN], a [12V/120V] refrigerator, and a [SINGLE/DOUBLE] stainless steel sink.`;
  desc += `\n\n`;
  if (electrical) {
    desc += `The electrical system is ${electrical}. `;
  } else {
    desc += `The electrical system is [12V DC / 120V AC] with [XX] amp shore power service. `;
  }
  desc += electronicsDesc || `Navigation and communication equipment includes [GPS/CHARTPLOTTER], [VHF RADIO], [DEPTH SOUNDER], [RADAR], and [AUTOPILOT]. `;
  desc += '\n\n';
  desc += safetyDesc || `Safety equipment includes [NUMBER] fire extinguisher(s), [NUMBER] PFD(s), flares, and a throwable flotation device.`;
  desc += `\n\n`;
  desc += `The vessel is in [GOOD/FAIR/POOR] overall cosmetic condition and appears to have been [WELL/REASONABLY/POORLY] maintained. [ANY NOTABLE MODIFICATIONS, DAMAGE HISTORY, OR OBSERVATIONS].`;

  return desc;
}

// Mark description as manually edited (disables auto-regeneration on save).
// Sets a synchronous window flag so saveSurvey knows immediately not to
// clobber in-progress edits — even before the debounced DB write lands.
// The flag is sticky (stays set until an explicit Regenerate) so auto-
// regeneration doesn't resume the instant the user looks away.
let _descEditTimer = null;
function markDescriptionManuallyEdited() {
  // Update placeholder count immediately (visual only)
  const textarea = document.getElementById('vesselDescription');
  if (textarea) updatePlaceholderCount(textarea.value);
  // Synchronous signal — blocks auto-regen in saveSurvey right away
  if (currentSurveyId) window._descUserEditing = currentSurveyId;
  // Debounce the persistent DB write so rapid typing doesn't hammer IndexedDB
  clearTimeout(_descEditTimer);
  _descEditTimer = setTimeout(() => {
    if (!currentSurveyId) return;
    getSurvey(currentSurveyId).then(survey => {
      if (survey && survey.descriptionAutoGenerated) {
        survey.descriptionAutoGenerated = false;
        saveSurvey(survey);
      }
    });
  }, 2000);
}

// Show count of remaining [PLACEHOLDER] items in the description
function updatePlaceholderCount(text) {
  const countEl = document.getElementById('placeholderCount');
  if (!countEl) return;
  const placeholders = (text || '').match(/\[[A-Z][A-Z/\s'"\d&,.-]*\]/g) || [];
  if (placeholders.length > 0) {
    countEl.style.display = 'block';
    countEl.innerHTML = `⚠️ ${placeholders.length} placeholder${placeholders.length > 1 ? 's' : ''} still need attention (shown in [BRACKETS])`;
  } else {
    countEl.style.display = 'none';
  }
}

// Apply the suggested valuation to the form fields
function applyValuationSuggestion(low, high, modelName) {
  const lowEl = document.getElementById('valuationLow');
  const highEl = document.getElementById('valuationHigh');
  const rationaleEl = document.getElementById('valuationRationale');

  if (lowEl) lowEl.value = low;
  if (highEl) highEl.value = high;

  // Auto-check BUC Value Guide source
  const bucCheckbox = document.querySelector('.val-source[value="BUC Value Guide"]');
  if (bucCheckbox) bucCheckbox.checked = true;

  // Generate rationale
  updateValuationRationale();

  document.getElementById('valuationSuggestionCard')?.remove();
}

// Called by the Regenerate button — always overwrites the rationale
function regenerateValuationRationale() {
  const rationaleEl = document.getElementById('valuationRationale');
  if (!rationaleEl) { showAlert('Rationale field not found'); return; }

  const checkedSources = Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value);
  if (checkedSources.length === 0) {
    showAlert('Please check at least one valuation source above first.');
    return;
  }

  const vessel = document.getElementById('yearMakeModel')?.value || 'the subject vessel';
  const comparables = (typeof collectComparables === 'function') ? collectComparables() : [];
  const compCount = comparables.filter(c => c.vessel).length;

  let rationale = `The Fair Market Value of the ${vessel} has been determined through consultation of the following independent sources: ${checkedSources.join(', ')}.`;
  if (compCount > 0) {
    rationale += ` A total of ${compCount} comparable vessel${compCount !== 1 ? 's were' : ' was'} reviewed to corroborate the valuation range.`;
  }
  rationale += ' The value range reflects the vessel in its current surveyed condition, taking into account age, equipment, maintenance history, and current market conditions. Values may vary based on geographic location, season, and individual negotiation.';

  rationaleEl.value = rationale;
  rationaleEl.dataset.autoGenerated = 'true';
  showToast('Valuation rationale updated');
}

// Called when a checkbox changes — only auto-fills if the field is empty or was auto-generated
function updateValuationRationale() {
  const rationaleEl = document.getElementById('valuationRationale');
  if (!rationaleEl) return;
  // Don't overwrite text the surveyor typed manually
  if (rationaleEl.value && rationaleEl.dataset.autoGenerated !== 'true') return;
  regenerateValuationRationale();
}

function lookupSpecs() {
  const input = document.getElementById('yearMakeModel')?.value || '';
  if (!input) { showAlert('Enter Year/Make/Model first'); return; }

  // Try built-in database first
  const specs = findBoatSpecs(input);
  if (specs) {
    checkSpecsOnBlur();
    return;
  }

  // Fall back to online sources
  const { make } = parseYearMakeModel(input);
  const query = encodeURIComponent(input);
  window.open(`https://sailboatdata.com/sailboat?name=${encodeURIComponent(make)}`, '_blank');
  window.open(`https://www.powerboat-specs.com/search?q=${query}`, '_blank');
}

function lookupComparables() {
  suggestValuation();
}

async function confirmAbandonNewSurvey() {
  // Check if user has entered any data in the new survey form
  const fields = ['vesselName', 'yearMakeModel', 'clientName', 'location',
    'engineMake', 'engineSerial', 'engineHours', 'transmissionSerial',
    'hinNumber', 'tcLicense', 'vesselDescription'];
  const hasData = fields.some(id => {
    const el = document.getElementById(id);
    return el && el.value && el.value.trim() !== '' && el.value !== 'Select' && el.value !== 'Select make';
  });
  // Also check if they added extra attendees
  const attendeesList = document.getElementById('attendeesList');
  const hasExtraAttendees = attendeesList && attendeesList.querySelectorAll('[data-attendee-extra]').length > 0;
  if (hasData || hasExtraAttendees) {
    const yes = await showConfirm('You have unsaved survey data. Discard and return to home?', 'Discard', 'Cancel');
    if (!yes) return;
  }
  renderHome();
}

// ─── Persons in Attendance Management ──────────────────────────────────────

function addAttendeeField() {
  const list = document.getElementById('attendeesList');
  if (!list) return;

  const idx = list.querySelectorAll('[data-attendee-extra]').length;
  const div = document.createElement('div');
  div.setAttribute('data-attendee-extra', idx);
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'attendee-name-input';
  input.placeholder = 'e.g., John Smith (broker)';
  input.style.cssText = 'flex:1;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;';
  input.setAttribute('data-attendee-index', idx);
  input.autocapitalize = 'words';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-secondary';
  removeBtn.textContent = '✕';
  removeBtn.style.cssText = 'width:28px;height:28px;padding:0;font-size:14px;';
  removeBtn.onclick = (e) => {
    e.preventDefault();
    div.remove();
    updateAttendeesList();
  };

  div.appendChild(input);
  div.appendChild(removeBtn);
  list.appendChild(div);
  input.focus();
  input.addEventListener('change', updateAttendeesList);
  input.addEventListener('input', updateAttendeesList);
}

function updateAttendeesList() {
  const list = document.getElementById('attendeesList');
  const field = document.getElementById('personsInAttendance');
  if (!list || !field) return;

  const attendees = ['Dave Seagrim (SAMS Surveyor Associate)'];
  const extras = list.querySelectorAll('[data-attendee-extra] input');
  extras.forEach(input => {
    const val = input.value.trim();
    if (val) attendees.push(val);
  });

  field.value = attendees.join(', ');
}

function startNewSurvey() {
  const formData = {
    vesselName: document.getElementById('vesselName')?.value || '',
    yearMakeModel: document.getElementById('yearMakeModel')?.value || '',
    clientName: document.getElementById('clientName')?.value || '',
    surveyDate: document.getElementById('surveyDate')?.value || '',
    location: document.getElementById('location')?.value || '',
    locationLat: window._surveyLat || null,
    locationLon: window._surveyLon || null,
    surveyType: document.getElementById('surveyType')?.value || '',

    vesselType: document.getElementById('vesselType')?.value || 'power',
    boatStyle: document.getElementById('boatStyle')?.value || '',
    hullType: document.getElementById('hullType')?.value || '',
    loa: document.getElementById('loa')?.value || '',
    lwl: document.getElementById('lwl')?.value || '',
    beam: document.getElementById('beam')?.value || '',
    displacement: document.getElementById('displacement')?.value || '',
    ballast: document.getElementById('ballast')?.value || '',
    maxDraft: document.getElementById('maxDraft')?.value || '',
    totalSailArea: document.getElementById('totalSailArea')?.value || '',
    construction: document.getElementById('construction')?.value || '',
    keelType: document.getElementById('keelType')?.value || '',
    numberCabins: document.getElementById('numberCabins')?.value || '',
    electricalSystem: document.getElementById('electricalSystem')?.value || '',
    changesToPlan: document.getElementById('changesToPlan')?.value || '',

    personsInAttendance: document.getElementById('personsInAttendance')?.value || '',
    reportDate: document.getElementById('reportDate')?.value || '',
    weather: document.getElementById('weather')?.value || '',
    onLandOrWater: document.getElementById('onLandOrWater')?.value || '',
    seaTrial: document.getElementById('seaTrial')?.value || '',
    powerAtTime: document.getElementById('powerAtTime')?.value || '',
    waterAtTime: document.getElementById('waterAtTime')?.value || '',
    storageDetails: document.getElementById('storageDetails')?.value || '',

    engineMake: document.getElementById('engineMake')?.value || '',
    engineModel: document.getElementById('engineModel')?.value || '',
    engineSerial: document.getElementById('engineSerial')?.value || '',
    engineHours: document.getElementById('engineHours')?.value || '',
    engineHP: document.getElementById('engineHP')?.value || '',
    fuelType: document.getElementById('fuelType')?.value || '',
    transmissionMake: document.getElementById('transmissionMake')?.value || '',
    transmissionModel: document.getElementById('transmissionModel')?.value || '',
    transmissionMakeModel: (document.getElementById('transmissionMake')?.value || '') + (document.getElementById('transmissionModel')?.value ? ' ' + document.getElementById('transmissionModel')?.value : ''),
    transmissionSerial: document.getElementById('transmissionSerial')?.value || '',

    // Engine 2 (dual engine)
    engine2Make: document.getElementById('engine2Make')?.value || '',
    engine2Model: document.getElementById('engine2Model')?.value || '',
    engine2Serial: document.getElementById('engine2Serial')?.value || '',
    engine2Hours: document.getElementById('engine2Hours')?.value || '',
    engine2HP: document.getElementById('engine2HP')?.value || '',
    fuelType2: document.getElementById('fuelType2')?.value || '',
    transmission2Make: document.getElementById('transmission2Make')?.value || '',
    transmission2Model: document.getElementById('transmission2Model')?.value || '',
    transmission2MakeModel: (document.getElementById('transmission2Make')?.value || '') + (document.getElementById('transmission2Model')?.value ? ' ' + document.getElementById('transmission2Model')?.value : ''),
    transmission2Serial: document.getElementById('transmission2Serial')?.value || '',

    bilgePumps: collectBilgePumps(),
    comparables: collectComparables(),

    vesselDescription: document.getElementById('vesselDescription')?.value || '',

    tcLicenseType: document.getElementById('tcLicenseType')?.value || '',
    tcLicense: document.getElementById('tcLicense')?.value || '',
    tcLicenseExpiry: document.getElementById('tcLicenseExpiry')?.value || '',
    hinNumber: document.getElementById('hinNumber')?.value || '',
    taxStatus: document.getElementById('taxStatus')?.value || '',
    compliancePlate: document.getElementById('compliancePlate')?.value || '',

    valuationLow: document.getElementById('valuationLow')?.value || '',
    valuationHigh: document.getElementById('valuationHigh')?.value || '',
    exchangeRate: parseFloat(document.getElementById('exchangeRate')?.value) || 1.35,
    valuationSources: Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value),
    valuationSource: Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value).join(', '),
    valuationRationale: document.getElementById('valuationRationale')?.value || '',
    replacementCost: document.getElementById('replacementCost')?.value || '',
    overallCondition: document.getElementById('overallCondition')?.value || ''
  };

  const survey = createNewSurvey(formData);
  saveSurvey(survey).then(async (id) => {
    currentSurveyId = id;

    // Transfer any doc photos captured on the new survey form
    if (window._pendingDocPhotos) {
      for (const [fieldKey, photoData] of Object.entries(window._pendingDocPhotos)) {
        const photoId = `${id}_doc_${fieldKey}_${Date.now()}`;
        const photo = {
          id: photoId,
          surveyId: id,
          itemLabel: photoData.label,
          dataUrl: photoData.dataUrl,
          annotated: false,
          isDocPhoto: true,
          docField: fieldKey,
          createdAt: new Date().toISOString()
        };
        await savePhoto(photo);
        survey[fieldKey] = photoId;
      }
      await saveSurvey(survey);
      window._pendingDocPhotos = null;
    }

    renderInspection(survey);
  });
}

// ─── Rating tooltip guidance ──────────────────────────────────────────────
function getRatingTooltip(rating) {
  const tips = {
    'A - Critical': 'Safety hazard or code violation — must be corrected before vessel is next underway',
    'B - Needs Attention': 'Needs repair soon — not immediately dangerous but should be scheduled',
    'C - Serviceable': 'Functional and in acceptable condition — no action required',
    'Not tested/not verified': 'Could not be tested or inspected due to conditions',
    'Not applicable': 'Item does not apply to this vessel',
    'Powered up only': 'Powered up and appears operational — not tested under load',
    'Safety Equipment': 'Safety equipment item per TC TP 511'
  };
  return tips[rating] || '';
}

// ─── Bilge pump entries ──────────────────────────────────────────────────
function addBilgePumpEntry() {
  const container = document.getElementById('bilgePumpEntries');
  if (!container) return;
  const idx = container.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:8px;background:#fafafa;';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <strong style="font-size:12px;">Bilge Pump ${idx + 1}</strong>
      <button class="btn-secondary" style="font-size:11px;padding:2px 8px;color:#dc2626;" onclick="this.parentElement.parentElement.remove()">Remove</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <input type="text" class="bilgePumpLocation" placeholder="Location (e.g., main bilge, engine room)" style="font-size:12px;padding:6px;">
      <input type="text" class="bilgePumpType" placeholder="Type (manual/electric)" style="font-size:12px;padding:6px;">
      <input type="text" class="bilgePumpMakeModel" placeholder="Make/Model" style="font-size:12px;padding:6px;">
      <input type="text" class="bilgePumpCapacity" placeholder="Capacity (GPH)" style="font-size:12px;padding:6px;">
      <input type="text" class="bilgePumpFloatSwitch" placeholder="Float switch (yes/no/type)" style="font-size:12px;padding:6px;">
      <input type="text" class="bilgePumpTested" placeholder="Tested? (yes/no/result)" style="font-size:12px;padding:6px;">
    </div>
    <input type="text" class="bilgePumpDischarge" placeholder="Discharge route and hose condition" style="font-size:12px;padding:6px;width:100%;margin-top:6px;box-sizing:border-box;">
  `;
  container.appendChild(div);
}

// ─── Comparable vessel entries ──────────────────────────────────────────
function addComparableEntry() {
  const container = document.getElementById('comparablesEntries');
  if (!container) return;
  const idx = container.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:8px;background:#fafafa;';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <strong style="font-size:12px;">Comparable ${idx + 1}</strong>
      <button class="btn-secondary" style="font-size:11px;padding:2px 8px;color:#dc2626;" onclick="this.parentElement.parentElement.remove()">Remove</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <select class="compSource" style="font-size:12px;padding:6px;">
        <option value="">Source</option>
        <option value="BUCValu">BUCValu</option>
        <option value="Soldboats.com">Soldboats.com</option>
        <option value="YachtWorld">YachtWorld</option>
        <option value="Boat Trader">Boat Trader</option>
        <option value="Other">Other</option>
      </select>
      <input type="text" class="compVessel" placeholder="Year/Make/Model" style="font-size:12px;padding:6px;">
      <input type="text" class="compPrice" placeholder="Asking or sold price (USD)" style="font-size:12px;padding:6px;">
      <input type="text" class="compLocation" placeholder="Location" style="font-size:12px;padding:6px;">
      <input type="text" class="compDate" placeholder="Sale/listing date" style="font-size:12px;padding:6px;">
      <select class="compWater" style="font-size:12px;padding:6px;">
        <option value="">Water type</option>
        <option value="Fresh water">Fresh water</option>
        <option value="Salt water">Salt water</option>
        <option value="Brackish">Brackish</option>
        <option value="Unknown">Unknown</option>
      </select>
    </div>
    <input type="text" class="compNotes" placeholder="Notes (condition, hours, differences)" style="font-size:12px;padding:6px;width:100%;margin-top:6px;box-sizing:border-box;">
  `;
  container.appendChild(div);
}

// Collect bilge pump data from form
function collectBilgePumps() {
  const entries = document.querySelectorAll('#bilgePumpEntries > div');
  const pumps = [];
  entries.forEach(entry => {
    pumps.push({
      location: entry.querySelector('.bilgePumpLocation')?.value || '',
      type: entry.querySelector('.bilgePumpType')?.value || '',
      makeModel: entry.querySelector('.bilgePumpMakeModel')?.value || '',
      capacity: entry.querySelector('.bilgePumpCapacity')?.value || '',
      floatSwitch: entry.querySelector('.bilgePumpFloatSwitch')?.value || '',
      tested: entry.querySelector('.bilgePumpTested')?.value || '',
      discharge: entry.querySelector('.bilgePumpDischarge')?.value || ''
    });
  });
  return pumps;
}

// Collect comparable vessels data from form
function collectComparables() {
  const entries = document.querySelectorAll('#comparablesEntries > div');
  const comps = [];
  entries.forEach(entry => {
    comps.push({
      source: entry.querySelector('.compSource')?.value || '',
      vessel: entry.querySelector('.compVessel')?.value || '',
      price: entry.querySelector('.compPrice')?.value || '',
      location: entry.querySelector('.compLocation')?.value || '',
      date: entry.querySelector('.compDate')?.value || '',
      water: entry.querySelector('.compWater')?.value || '',
      notes: entry.querySelector('.compNotes')?.value || ''
    });
  });
  return comps;
}

function renderInspection(survey) {
  // v2166: populate the global survey cache so displayItemLabel() — which
  // only takes a label — can find the current survey context for the
  // rudder transforms. Without this, every card renders with the raw
  // template label (rudder text appears even on outdrive boats).
  if (survey && typeof window !== 'undefined') {
    window._currentSurveyCache = survey;
  }

  // Remove any existing fab/bottom bar from home or other views
  const existingFab = document.querySelector('.fab');
  if (existingFab) existingFab.remove();
  const existingBottomBar = document.getElementById('inspectionBottomBar');
  if (existingBottomBar) existingBottomBar.remove();

  // Show the persistent save status pill (top-right). Initialize the photo
  // count for this survey so it shows immediately.
  if (typeof SaveStatus !== 'undefined') {
    SaveStatus.show();
    if (survey && survey.id) refreshSavePillPhotoCount(survey.id);
  }

  // Migrate old item labels to current template (runs once per survey)
  if (migrateSurveyLabels(survey)) {
    saveSurvey(survey);
  }

  // Retroactive engine sync — populate intro from body if body has data and intro is empty
  if (_retroSyncEngineFromBody(survey)) {
    saveSurvey(survey);
    showToast('Engine info synced to intro');
  }

  const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

  currentView = 'inspection';
  currentSurveyId = survey.id;
  persistViewState();
  history.pushState({ view: 'inspection', surveyId: survey.id }, '');

  const app = document.getElementById('app');

  const surveyTypeBanner = survey.surveyType
    ? `<div style="background:${survey.surveyType === 'Insurance survey' ? '#ffcc00' : '#006699'};color:${survey.surveyType === 'Insurance survey' ? '#006699' : '#fff'};text-align:center;font-size:12px;font-weight:700;padding:4px 0;letter-spacing:0.5px;">${esc(survey.surveyType).toUpperCase()}</div>`
    : '';

  app.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="backToHome()">←</button>
      <div style="flex:1;min-width:0;">
        <div class="header-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#006699;">${esc(survey.vesselName)}</div>
        <div class="header-subtitle" style="color:#3399cc;">${APP_VERSION}</div>
      </div>
      <div id="syncStatusIndicator" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;cursor:help;" title="Sync status"></div>
    </div>
    ${surveyTypeBanner}
    <div class="content" id="inspection-content">
      <div style="text-align: center; padding: 20px;">Loading inspection items...</div>
    </div>
  `;

  // Refresh sync status dot for this view
  if (typeof FirebaseSync !== 'undefined') FirebaseSync.refreshUI();

  // Count and identify rated items
  const activeTemplate = getTemplateForSurvey(survey);
  let totalRatedItems = 0;
  const ratedItemsByCategory = {};

  // Determine vessel type for filtering
  const sailOnlyCategories = ['Spars and rigging', 'Sails'];
  const isPowerboat = (survey.vesselType || '').toLowerCase() === 'power';
  const isSailboat = (survey.vesselType || '').toLowerCase() === 'sail';

  // Drive type filtering — hide items that don't apply to the selected drive configuration
  const driveType = survey.driveType || '';
  const SHAFT_ONLY_LABELS = [
    'Cutlass bearing(s)', 'Propeller shaft(s)', 'Propeller(s)',
    'Propeller/drive anode(s)', 'Stern tube(s) (external)', 'Skeg(s)'
  ];
  const OUTDRIVE_ONLY_LABELS = [
    'Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows'
  ];
  const SAILDRIVE_ONLY_LABELS = [
    'Sail drive(s) - (external), corrosion, propeller(s), anode(s)'
  ];
  const IPS_ONLY_LABELS = [
    'IPS pod drive(s)'
  ];

  // v2180: keel items (external ballast keel, keel bolts) don't exist on
  // power boats — hide them for any power survey.
  const SAIL_ONLY_ITEM_LABELS = [
    'Keel and keel joint',
    'Keel bolts',
  ];

  // Check if conditional items should be shown
  function shouldShowItem(item) {
    if (isPowerboat && item.sailOnly) return false;
    if (isSailboat && item.powerOnly) return false;
    if (isPowerboat && item.rudderItem) {
      // v2210: derive hasRudder from driveType when explicit field is absent
      // (existing surveys have no hasRudder). Outdrive/saildrive/IPS → no rudder;
      // shaft drive → has rudder. Explicit survey.hasRudder (boolean) still wins.
      const _hasRudder = (typeof survey.hasRudder === 'boolean')
        ? survey.hasRudder
        : !['outdrive','saildrive','ips'].includes((survey.driveType||'').toLowerCase());
      if (!_hasRudder) return false;
    }
    if (isPowerboat && SAIL_ONLY_ITEM_LABELS.includes(item.label)) return false;
    // Drive type filtering
    if (driveType) {
      if (driveType === 'outdrive') {
        if (SAILDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (IPS_ONLY_LABELS.includes(item.label)) return false;
        if (SHAFT_ONLY_LABELS.includes(item.label)) return false;
      } else if (driveType === 'saildrive') {
        if (OUTDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (IPS_ONLY_LABELS.includes(item.label)) return false;
        if (SHAFT_ONLY_LABELS.includes(item.label)) return false;
      } else if (driveType === 'shaft') {
        if (OUTDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (SAILDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (IPS_ONLY_LABELS.includes(item.label)) return false;
      } else if (driveType === 'ips') {
        if (OUTDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (SAILDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (SHAFT_ONLY_LABELS.includes(item.label)) return false;
      }
    }
    if (item.conditional) {
      const thrusterRating = survey.items['Bow thruster']?.rating;
      const sternThrusterRating = survey.items['Stern thruster']?.rating;
      const propaneRating = survey.items['Propane valve, regulator, gauge, storage compartment and vent']?.rating;
      if (item.conditional === 'bowThruster' && (!thrusterRating || thrusterRating === 'Not applicable')) return false;
      if (item.conditional === 'sternThruster' && (!sternThrusterRating || sternThrusterRating === 'Not applicable')) return false;
      if (item.conditional === 'propane' && (!propaneRating || propaneRating === 'Not applicable')) return false;
    }
    return true;
  }

  // Track media items per category for area photos
  const mediaItemsByCategory = {};

  activeTemplate.forEach(section => {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      section.categories.forEach(category => {
        // Skip sail-specific categories for powerboats
        if (isPowerboat && sailOnlyCategories.includes(category.name)) return;

        if (category.items) {
          const ratedItems = category.items.filter(item => item.type === 'list' && shouldShowItem(item));
          const mediaItems = category.items.filter(item => item.type === 'media' && shouldShowItem(item));
          if (ratedItems.length > 0 || mediaItems.length > 0) {
            ratedItemsByCategory[category.name] = ratedItems;
            mediaItemsByCategory[category.name] = mediaItems;
            totalRatedItems += ratedItems.length;
          }
        }
      });
    }
  });

  // ── Multiply Head(s) items by head count ──────────────────────────────
  const headCount = survey.headCount || 1;
  if (ratedItemsByCategory['Head(s)'] && headCount > 1) {
    const baseHeadItems = ratedItemsByCategory['Head(s)'];
    const baseMediaItems = mediaItemsByCategory['Head(s)'] || [];
    const expandedItems = [];
    const expandedMedia = [];
    for (let h = 1; h <= headCount; h++) {
      baseMediaItems.forEach(mi => {
        expandedMedia.push({ ...mi, label: `Head ${h} — photos` });
      });
      baseHeadItems.forEach(item => {
        // Strip leading "Head, " from label for cleaner naming
        const shortLabel = item.label.replace(/^Head,\s*/, '');
        expandedItems.push({ ...item, label: `Head ${h} — ${shortLabel}` });
      });
    }
    ratedItemsByCategory['Head(s)'] = expandedItems;
    mediaItemsByCategory['Head(s)'] = expandedMedia;
    // Recalculate total
    totalRatedItems = totalRatedItems - baseHeadItems.length + expandedItems.length;
  }

  // ── Singularise drive line item labels when there is only 1 drive line ──
  const driveLineCount = survey.driveLineCount || 1;
  if (driveLineCount === 1) {
    for (const [catName, items] of Object.entries(ratedItemsByCategory)) {
      ratedItemsByCategory[catName] = items.map(item => {
        if (item.driveLineItem) {
          return { ...item, label: item.label.replace(/\(s\)/g, '') };
        }
        return item;
      });
    }
  }

  // ── Multiply drive line items by drive line count ─────────────────────
  if (driveLineCount > 1) {
    // Labels: "Port" / "Starboard" for 2, numbered for 3+
    const driveLabels = driveLineCount === 2
      ? ['Port', 'Starboard']
      : Array.from({ length: driveLineCount }, (_, i) => `#${i + 1}`);

    for (const [catName, items] of Object.entries(ratedItemsByCategory)) {
      const dlItems = items.filter(i => i.driveLineItem);
      if (dlItems.length === 0) continue;
      const expanded = [];
      items.forEach(item => {
        if (!item.driveLineItem) {
          expanded.push(item);
        } else {
          // Strip "(s)" and trailing plurals for cleaner labels
          const baseLabel = item.label.replace(/\(s\)/g, '');
          for (let t = 0; t < driveLineCount; t++) {
            expanded.push({ ...item, label: `${driveLabels[t]} — ${baseLabel.trim()}` });
          }
        }
      });
      totalRatedItems = totalRatedItems - dlItems.length + (dlItems.length * driveLineCount);
      ratedItemsByCategory[catName] = expanded;
    }
  }

  // ── Expand hull items by hull count (catamaran / trimaran) ──────────
  const hullCount = inferHullCount(survey);
  if (hullCount === 1) {
    // Singularise hull item labels: "Hull(s) condition" → "Hull condition"
    for (const [catName, items] of Object.entries(ratedItemsByCategory)) {
      ratedItemsByCategory[catName] = items.map(item => {
        if (item.hullItem) return { ...item, label: item.label.replace(/\(s\)/g, '') };
        return item;
      });
    }
  }
  if (hullCount > 1) {
    const hullLabels = hullCount === 2
      ? ['Port hull', 'Starboard hull']
      : ['Port hull', 'Centre hull', 'Starboard hull'];

    for (const [catName, items] of Object.entries(ratedItemsByCategory)) {
      const hItems = items.filter(i => i.hullItem);
      if (hItems.length === 0) continue;
      const expanded = [];
      items.forEach(item => {
        if (!item.hullItem) {
          expanded.push(item);
        } else {
          const baseLabel = item.label.replace(/\(s\)/g, '').replace(/^Hull\s+/, 'Hull ');
          for (let h = 0; h < hullCount; h++) {
            expanded.push({ ...item, label: `${hullLabels[h]} — ${baseLabel.trim()}` });
          }
        }
      });
      totalRatedItems = totalRatedItems - hItems.length + (hItems.length * hullCount);
      ratedItemsByCategory[catName] = expanded;
    }
  }

  survey.totalRatedItems = totalRatedItems;

  // Render categories
  const content = document.getElementById('inspection-content');
  let html = `<div style="margin-bottom: 140px;">`;

  // Vessel type toggle — always shown so the surveyor can switch at any time
  const currentVesselType = survey.vesselType || '';
  html += `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:8px 12px;">
      <span style="font-size:13px;font-weight:600;color:#475569;">⛵ Vessel Type:</span>
      <div style="display:flex;gap:6px;">
        <button onclick="setVesselTypeFromInspection('sail')"
                style="padding:7px 18px;font-size:13px;font-weight:600;border:none;border-radius:20px;cursor:pointer;
                       transition:background 0.15s,color 0.15s;
                       background:${currentVesselType === 'sail' ? '#006699' : '#e2e8f0'};
                       color:${currentVesselType === 'sail' ? 'white' : '#475569'};">
          Sail
        </button>
        <button onclick="setVesselTypeFromInspection('power')"
                style="padding:7px 18px;font-size:13px;font-weight:600;border:none;border-radius:20px;cursor:pointer;
                       transition:background 0.15s,color 0.15s;
                       background:${currentVesselType === 'power' ? '#006699' : '#e2e8f0'};
                       color:${currentVesselType === 'power' ? 'white' : '#475569'};">
          Power
        </button>
      </div>
      ${!currentVesselType ? '<span style="font-size:12px;color:#dc2626;font-weight:600;">← Please select</span>' : ''}
    </div>
  `;

  Object.entries(ratedItemsByCategory).forEach(([categoryName, items]) => {
    const categoryCompletionCount = items.filter(item =>
      survey.items[item.label]?.rating || survey.items[item.label]?.excluded
    ).length;
    const categoryCompletion = Math.round((categoryCompletionCount / items.length) * 100);
    const flaggedItems = items.filter(item => survey.items[item.label]?.flagged);
    const flaggedCount = flaggedItems.length;
    const excludedCount = items.filter(item => survey.items[item.label]?.excluded).length;
    const allExcluded = excludedCount === items.length;
    const isComplete = categoryCompletion === 100;
    const dotColor = allExcluded ? '#9ca3af' : (isComplete ? '#16a34a' : '#dc2626');
    const incompleteDot = `<span class="completion-dot" style="display:inline-block;width:10px;height:10px;background:${dotColor};border-radius:50%;margin-right:6px;flex-shrink:0;"></span>`;
    const progressColor = allExcluded ? '#9ca3af' : (isComplete ? '#16a34a' : '#dc2626');
    const remaining = items.length - categoryCompletionCount;
    const progressText = allExcluded ? 'Skipped' : (isComplete ? 'Done' : `${remaining} left`);

    // Build subtitle badges (flagged info shown in yellow summary bar below header)
    let badges = '';
    if (excludedCount > 0 && !allExcluded) {
      badges += `<span style="color:#6b7280;font-size:11px;background:#f3f4f6;padding:1px 6px;border-radius:4px;margin-left:4px;">${excludedCount} skipped</span>`;
    }

    // Progress text: when items remain, render as a tappable button that
    // expands an inline list of remaining (unrated, non-skipped) items with
    // tap-to-jump links. When the category is Done or fully Skipped, render
    // a plain span. stopPropagation prevents the accordion from toggling.
    const progressHtml = (allExcluded || isComplete)
      ? `<span class="category-progress" style="color:${progressColor};font-weight:700;">${progressText}</span>`
      : `<button type="button" class="category-progress remaining-btn" onclick="event.stopPropagation(); toggleRemainingList(this);" title="Show items left to rate" style="color:${progressColor};font-weight:700;background:transparent;border:none;cursor:pointer;padding:0;margin-left:12px;font:inherit;font-size:12px;text-decoration:underline dotted;">${progressText} ▾</button>`;

    html += `
      <div class="category-accordion" data-category-name="${categoryName.replace(/"/g, '&quot;')}">
        <button class="accordion-header" onclick="toggleAccordion(this)">
          <span class="accordion-chevron" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:22px;color:#64748b;flex-shrink:0;margin-left:-12px;transition:transform 0.2s;">▾</span>
          ${incompleteDot}
          <span class="category-title">${categoryName}${badges}</span>
          ${progressHtml}
        </button>
        ${flaggedCount > 0 ? `<div class="flagged-summary" style="padding:4px 12px 6px 28px;font-size:12px;color:#92400e;background:#fffbeb;border-bottom:1px solid #fcd34d;">🚩 ${flaggedCount} flagged: ${flaggedItems.map(i => i.label).join(', ')}</div>` : ''}
        <div class="accordion-content" style="display: none;">
          <div style="display:flex;gap:8px;margin-bottom:12px;padding:8px;background:#f9fafb;border-radius:8px;">
            <button class="btn-secondary" style="font-size:12px;padding:6px 12px;${allExcluded ? 'background:#fee2e2;border-color:#fca5a5;' : ''}"
                    onclick="toggleCategoryExclude('${categoryName.replace(/'/g, "\\'")}', ${!allExcluded})">
              ${allExcluded ? '✅ Include All' : '⊘ Skip Entire Category'}
            </button>
          </div>
    `;

    // Head count selector for Head(s) category
    if (categoryName === 'Head(s)') {
      html += `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
          <span style="font-size:14px;font-weight:600;color:#006699;">Number of heads:</span>
          <select id="headCountSelect" onchange="updateHeadCount(parseInt(this.value))"
                  style="padding:8px 12px;border:1px solid #93c5fd;border-radius:6px;font-size:15px;font-weight:600;background:white;color:#006699;min-width:60px;">
            ${[1,2,3,4].map(n => `<option value="${n}" ${headCount === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // Hull count selector — for catamarans and trimarans
    if (categoryName === 'Hull exterior, keel and propulsion') {
      html += `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
          <span style="font-size:13px;font-weight:600;color:#006699;">🚢 Number of hulls:</span>
          <select id="hullCountSelect" onchange="updateHullCount(parseInt(this.value))"
                  style="padding:8px 10px;border:1px solid #93c5fd;border-radius:6px;font-size:14px;font-weight:600;background:white;color:#006699;min-width:50px;">
            <option value="1" ${hullCount === 1 ? 'selected' : ''}>1 (monohull)</option>
            <option value="2" ${hullCount === 2 ? 'selected' : ''}>2 (catamaran)</option>
            <option value="3" ${hullCount === 3 ? 'selected' : ''}>3 (trimaran)</option>
          </select>
        </div>
      `;
    }

    // Drive configuration panel for hull category
    if (categoryName === 'Hull exterior, keel and propulsion') {
      const currentDriveType = survey.driveType || '';
      const hasRudder = survey.hasRudder !== false; // default true
      // Sailboats: saildrive or shaft only, always 1 drive line, always has rudder
      // Powerboats: outdrive or shaft, 1-3 drive lines, rudder depends on drive type
      const driveTypeOptions = isSailboat
        ? `<option value="">— Select —</option>
           <option value="saildrive" ${currentDriveType === 'saildrive' ? 'selected' : ''}>Saildrive</option>
           <option value="shaft" ${currentDriveType === 'shaft' ? 'selected' : ''}>Prop shaft</option>`
        : `<option value="">— Select —</option>
           <option value="outdrive" ${currentDriveType === 'outdrive' ? 'selected' : ''}>Outdrive (sterndrive)</option>
           <option value="ips" ${currentDriveType === 'ips' ? 'selected' : ''}>IPS pod drive</option>
           <option value="shaft" ${currentDriveType === 'shaft' ? 'selected' : ''}>Prop shaft</option>`;

      html += `
        <div style="margin-bottom:12px;padding:12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;">
          <div style="font-size:13px;font-weight:700;color:#006699;margin-bottom:8px;">⚙️ Drive Configuration</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:600;color:#374151;">Drive type:</span>
              <select id="driveTypeSelect" onchange="updateDriveType(this.value)"
                      style="padding:8px 10px;border:1px solid #93c5fd;border-radius:6px;font-size:14px;font-weight:600;background:white;color:#006699;">
                ${driveTypeOptions}
              </select>
            </div>
      `;

      // Drive line count — only for powerboats (sailboats always 1)
      if (!isSailboat) {
        html += `
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:600;color:#374151;">Drive lines:</span>
              <select id="driveLineCountSelect" onchange="updateDriveLineCount(parseInt(this.value))"
                      style="padding:8px 10px;border:1px solid #93c5fd;border-radius:6px;font-size:14px;font-weight:600;background:white;color:#006699;min-width:50px;">
                ${[1,2,3].map(n => `<option value="${n}" ${driveLineCount === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </div>
        `;
      }

      html += `
          </div>
      `;

      // Rudder toggle — only for shaft-driven powerboats (outdrives and IPS steer themselves)
      if (isPowerboat && currentDriveType === 'shaft') {
        html += `
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;">
              <input type="checkbox" id="hasRudderToggle" ${hasRudder ? 'checked' : ''} onchange="toggleHasRudder(this.checked)"
                     style="width:18px;height:18px;accent-color:#006699;">
              Vessel has a rudder
            </label>
            <span style="font-size:11px;color:#6b7280;">${hasRudder ? '(rudder items shown)' : '(rudder items hidden)'}</span>
          </div>
        `;
      }

      html += `
        </div>
      `;
    }

    // Render area photos at top of category (inline file input for reliable iOS behaviour)
    // v2219: area photos are now skippable per section. Skipped media items
    // render as a collapsed row with an Unskip button; the photos remain in
    // IndexedDB so unskipping restores them.
    const catMediaItems = mediaItemsByCategory[categoryName] || [];
    catMediaItems.forEach(mediaItem => {
      const mediaData = survey.items[mediaItem.label] || { photos: [] };
      const photos = mediaData.photos || [];
      const isMediaExcluded = !!mediaData.excluded;
      const safeLabel = mediaItem.label.replace(/'/g, "\\'");
      const safeCat = categoryName.replace(/'/g, "\\'");
      const sanitized = mediaItem.label.replace(/[^a-zA-Z0-9]/g, '_');
      if (isMediaExcluded) {
        html += `
          <div id="area-photo-wrap-${sanitized}" style="margin-bottom:16px;padding:12px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;opacity:0.75;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div style="font-weight:600;font-size:14px;color:#6b7280;">⊘ ${mediaItem.label} — skipped${photos.length > 0 ? ` (${photos.length} photo${photos.length === 1 ? '' : 's'} retained)` : ''}</div>
              <button onclick="toggleExclude('${safeLabel}')" style="background:white;color:#006699;border:1px solid #006699;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;">Unskip</button>
            </div>
          </div>
        `;
      } else {
        html += `
          <div id="area-photo-wrap-${sanitized}" style="margin-bottom:16px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="font-weight:600;font-size:14px;color:#0369a1;">📷 ${mediaItem.label}</div>
              <button onclick="toggleExclude('${safeLabel}')" style="background:transparent;color:#6b7280;border:1px solid #d1d5db;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;" title="Skip this photo section">⊘ Skip</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
              ${photos.map(pid => `
                <div style="position:relative;width:84px;">
                  <img id="thumb-${pid}" src="" style="width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="editSavedPhoto('${pid}', '${safeLabel}')">
                  <button onclick="event.stopPropagation();deleteAreaPhoto('${pid}', '${safeLabel}')" aria-label="Delete photo" style="position:absolute;top:-8px;right:-8px;background:#dc2626;color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;font-size:16px;font-weight:700;cursor:pointer;line-height:26px;text-align:center;padding:0;box-shadow:0 1px 3px rgba(0,0,0,0.3);">×</button>
                  <button onclick="event.stopPropagation();moveAreaPhoto('${pid}', '${safeLabel}', '${safeCat}')" style="display:block;width:100%;margin-top:4px;background:#006699;color:white;border:none;border-radius:6px;padding:6px 0;font-size:12px;font-weight:700;cursor:pointer;">Move ↗</button>
                </div>
              `).join('')}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <button type="button"
                onclick="openBatchCamera('${safeLabel}', { isArea: true, categoryName: '${safeCat}' })"
                style="background:#006699;color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;min-height:44px;box-sizing:border-box;">
                📷 ${photos.length > 0 ? `Take More (${photos.length})` : 'Take Photos'}
              </button>
              <button type="button"
                onclick="importPhotosForItem('${safeLabel}')"
                style="background:white;color:#006699;border:2px solid #006699;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;min-height:44px;box-sizing:border-box;">
                🖼️ Import photos from library / files
              </button>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:6px;">Both buttons support selecting multiple photos at once. On desktop, you can also drag photo files onto any item card.</div>
          </div>
        `;
      }
    });

    items.forEach(item => {
      const itemData = survey.items[item.label] || { rating: '', text: '', standards: [], photos: [] };
      html += `<div class="compact-item-wrapper" data-item-label="${item.label.replace(/"/g, '&quot;')}">`;
      html += buildCompactItemHTML(item.label, categoryName, itemData, item.options);
      html += `</div>`;
    });

    html += `
        </div>
      </div>
    `;
  });

  // Valuation & Comparables removed from inspection screen — lives on the
  // survey detail / edit page only (first section).

  // ── Safety Equipment Section (TC TP 511) — always last ─────────────────
  // Auto-generate checklist if not already stored
  if (!survey.safetyEquipment || survey.safetyEquipment.length === 0) {
    const result = generateSafetyChecklist(survey);
    survey.safetyEquipment = result.checklist;
    survey.safetyBracket = result.bracket;
    survey.safetyVesselType = result.vesselType;
    saveSurvey(survey);
  }

  const bracketObj = TC_SAFETY_EQUIPMENT.brackets.find(b => b.id === (survey.safetyBracket || getLengthBracket(survey.loa)));
  const bracketLabel = bracketObj ? bracketObj.label : 'Unknown';
  const typeLabel = (survey.safetyVesselType || survey.vesselType || 'power').replace('-', ' ');
  const safetyChecked = survey.safetyEquipment.filter(e => e.checked).length;
  const safetyTotal = survey.safetyEquipment.length;
  const safetyPct = safetyTotal > 0 ? Math.round((safetyChecked / safetyTotal) * 100) : 0;

  html += `
    <div class="category-accordion">
      <button class="accordion-header" onclick="toggleAccordion(this)" style="background: #2563eb; color: white;">
        <span class="accordion-chevron" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:22px;color:rgba(255,255,255,0.8);flex-shrink:0;margin-left:-12px;transition:transform 0.2s;">▾</span>
        <span class="category-title">🛡️ Safety Equipment (TC TP 511)</span>
        <span class="category-progress">${safetyPct}% (${safetyChecked}/${safetyTotal})</span>
      </button>
      <div class="accordion-content" style="display: none;">
        <div style="padding: 10px 0; font-size: 13px; color: #555; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;">
          <strong>Vessel class:</strong> ${typeLabel} — <strong>Length bracket:</strong> ${bracketLabel}<br/>
          <em>Per Transport Canada TP 511E Safe Boating Guide & Small Vessel Regulations (SOR/2010-91)</em>
          <br/><button class="btn-secondary" style="margin-top:8px;font-size:12px;padding:4px 12px;"
                  onclick="regenerateSafetyChecklist()">🔄 Regenerate Checklist</button>
        </div>
  `;

  let lastCategory = '';
  survey.safetyEquipment.forEach((eq, idx) => {
    if (eq.category !== lastCategory) {
      lastCategory = eq.category;
      html += `<div style="font-weight:bold;margin-top:14px;margin-bottom:6px;color:#006699;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px;">${eq.category}</div>`;
    }
    const checkedAttr = eq.checked ? 'checked' : '';
    const safetyPhotoCount = (eq.photos && eq.photos.length) || 0;
    const isCustom = eq.custom ? true : false;
    html += `
      <div class="rated-item" style="border-left: 4px solid ${eq.checked ? '#16a34a' : '#2563eb'}; padding: 8px 10px; margin-bottom: 8px;">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
          <input type="checkbox" ${checkedAttr}
                 onchange="toggleSafetyItem(${idx}, this.checked)"
                 style="margin-top:3px;width:18px;height:18px;accent-color:#2563eb;" />
          <div style="flex:1;">
            <strong>${eq.name}</strong>
            ${isCustom ? '<span style="display:inline-block;background:#f59e0b;color:white;font-size:10px;padding:1px 6px;border-radius:3px;margin-left:6px;">Custom</span>' : `<span style="display:inline-block;background:#2563eb;color:white;font-size:10px;padding:1px 6px;border-radius:3px;margin-left:6px;">Req: ${eq.requirement}</span>`}
            ${eq.checked ? '<span style="color:#16a34a;font-weight:bold;margin-left:6px;">✓ On board</span>' : '<span style="color:#dc2626;font-size:11px;margin-left:6px;">Not verified</span>'}
          </div>
          ${isCustom ? `<button onclick="event.preventDefault();removeCustomSafetyItem(${idx})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:16px;padding:0 4px;" title="Remove">✕</button>` : ''}
        </label>
        <div style="margin-top:4px;margin-left:28px;display:flex;gap:8px;align-items:center;">
          <input type="text" placeholder="Notes (condition, expiry date, location...)"
                 value="${(eq.notes || '').replace(/"/g, '&quot;')}"
                 onchange="updateSafetyNote(${idx}, this.value)"
                 style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;" />
          <button onclick="captureSafetyPhoto(${idx})" style="background:#2563eb;color:white;border:none;border-radius:4px;padding:4px 8px;font-size:11px;white-space:nowrap;cursor:pointer;">
            📷${safetyPhotoCount > 0 ? ` ${safetyPhotoCount}` : ''}
          </button>
        </div>
        <div id="safety-thumbs-${idx}" style="margin-top:4px;margin-left:28px;display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
    `;
  });

  // Build list of already-added custom item names for disabling in the dropdown
  const addedCustomNames = survey.safetyEquipment.filter(e => e.custom).map(e => e.name);

  html += `
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">
          <div style="font-weight:600;font-size:13px;color:#006699;margin-bottom:6px;">Add Additional Safety Equipment</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Select items found on board that are not in the standard TC TP 511 list.</div>
          <div id="customSafetyOptions" style="display:flex;flex-direction:column;gap:6px;">
            ${ADDITIONAL_SAFETY_ITEMS.map(item => {
              const alreadyAdded = addedCustomNames.includes(item);
              return `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${alreadyAdded ? '#f0fdf4' : '#f9fafb'};border:1px solid ${alreadyAdded ? '#bbf7d0' : '#e5e7eb'};border-radius:6px;cursor:pointer;font-size:13px;">
                <input type="checkbox" value="${item}" ${alreadyAdded ? 'checked disabled' : ''} onchange="toggleAdditionalSafetyItem(this)" style="width:18px;height:18px;accent-color:#2563eb;" />
                ${item}${alreadyAdded ? ' <span style="color:#16a34a;font-size:11px;margin-left:auto;">✓ Added</span>' : ''}
              </label>`;
            }).join('')}
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
              <input type="text" id="customSafetyOther" placeholder="Other — type item name..."
                     style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" />
              <button class="btn-primary" style="font-size:12px;padding:6px 14px;white-space:nowrap;" onclick="addCustomSafetyItem()">+ Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Instruments & Electronics Section ─────────────────────────────────
  if (!survey.instrumentsElectronics) survey.instrumentsElectronics = [];
  const ieItems = survey.instrumentsElectronics;
  const ieTotal = ieItems.length;
  const ieRated = ieItems.filter(e => e.working !== null && e.working !== undefined).length;
  const iePct = ieTotal > 0 ? Math.round((ieRated / ieTotal) * 100) : 0;

  html += `
    <div class="category-accordion">
      <button class="accordion-header" onclick="toggleAccordion(this)" style="background: #7c3aed; color: white;">
        <span class="accordion-chevron" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:22px;color:rgba(255,255,255,0.8);flex-shrink:0;margin-left:-12px;transition:transform 0.2s;">▾</span>
        <span class="category-title">📡 Instruments &amp; Electronics</span>
        <span class="category-progress">${ieTotal > 0 ? `${iePct}% (${ieRated}/${ieTotal})` : 'No items'}</span>
      </button>
      <div class="accordion-content" style="display: none;">
        <div style="padding: 10px 0; font-size: 13px; color: #555; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;">
          <em>Photograph each instrument or electronic device. Mark whether it is operational, then optionally use AI to identify make, model and year.</em>
          ${!localStorage.getItem('geminiApiKey') ? `<br/><button onclick="updateGeminiApiKey()" style="margin-top:6px;background:none;border:1px solid #7c3aed;color:#7c3aed;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;">⚙️ Set Gemini API Key</button>` : ''}
        </div>
  `;

  ieItems.forEach((item, idx) => {
    const statusColor = item.working === true ? '#16a34a' : item.working === false ? '#dc2626' : '#9ca3af';
    const statusLabel = item.working === true ? '✓ Working' : item.working === false ? '✗ Not working' : '— Not tested';
    const photoCount = (item.photos && item.photos.length) || 0;
    const hasAI = item.make || item.model || item.year;
    html += `
      <div class="rated-item" style="border-left: 4px solid ${statusColor}; padding: 10px; margin-bottom: 10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <strong style="font-size:14px;">${item.name || 'Unidentified device'}</strong>
            ${hasAI ? `<div style="font-size:12px;color:#555;margin-top:2px;">${[item.make, item.model, item.year].filter(Boolean).join(' — ')}</div>` : ''}
            ${item.aiDetails ? `<div style="font-size:11px;color:#7c3aed;margin-top:2px;">${item.aiDetails}</div>` : ''}
          </div>
          <button onclick="removeInstrument(${idx})" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:18px;padding:0 4px;" title="Remove">✕</button>
        </div>

        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
          <select onchange="updateInstrumentWorking(${idx}, this.value)" style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;background:white;">
            <option value="" ${item.working === null || item.working === undefined ? 'selected' : ''}>Not tested</option>
            <option value="true" ${item.working === true ? 'selected' : ''}>✓ Working</option>
            <option value="false" ${item.working === false ? 'selected' : ''}>✗ Not working</option>
          </select>
          <button onclick="captureInstrumentPhoto(${idx})" style="background:#7c3aed;color:white;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;">
            📷${photoCount > 0 ? ` ${photoCount}` : ' Add photo'}
          </button>
          <button onclick="identifyInstrument(${idx})" style="background:#f59e0b;color:white;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;" title="Use AI to identify this device">
            🤖 Identify
          </button>
        </div>

        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <input type="text" placeholder="Name" value="${(item.name || '').replace(/"/g, '&quot;')}"
                 onchange="updateInstrumentField(${idx}, 'name', this.value)"
                 style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;" />
          <input type="text" placeholder="Make" value="${(item.make || '').replace(/"/g, '&quot;')}"
                 onchange="updateInstrumentField(${idx}, 'make', this.value)"
                 style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;" />
          <input type="text" placeholder="Model" value="${(item.model || '').replace(/"/g, '&quot;')}"
                 onchange="updateInstrumentField(${idx}, 'model', this.value)"
                 style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;" />
          <input type="text" placeholder="Year" value="${(item.year || '').replace(/"/g, '&quot;')}"
                 onchange="updateInstrumentField(${idx}, 'year', this.value)"
                 style="padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;" />
        </div>

        <input type="text" placeholder="Notes (location, serial number, condition...)"
               value="${(item.notes || '').replace(/"/g, '&quot;')}"
               onchange="updateInstrumentField(${idx}, 'notes', this.value)"
               style="margin-top:6px;width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;box-sizing:border-box;" />

        <div id="instrument-thumbs-${idx}" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;"></div>
      </div>
    `;
  });

  html += `
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
          <button onclick="rapidCaptureInstruments()" class="btn-primary" style="padding:12px;font-size:15px;background:#7c3aed;border-radius:8px;">
            📷 Rapid Capture — keep snapping until done
          </button>
          ${ieItems.filter(e => e.photos && e.photos.length > 0 && !e.aiIdentified).length > 0 ? `<button onclick="identifyAllInstruments()" style="padding:10px;font-size:14px;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer;width:100%;">
            🤖 Identify All Unidentified (${ieItems.filter(e => e.photos && e.photos.length > 0 && !e.aiIdentified).length})
          </button>` : ''}
          <div style="display:flex;gap:8px;">
            <button onclick="addInstrumentByPhoto()" class="btn-secondary" style="flex:1;padding:10px;font-size:13px;">
              📷 Add Single
            </button>
            <button onclick="addInstrumentManual()" class="btn-secondary" style="flex:1;padding:10px;font-size:13px;">
              ✏️ Add Manually
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  html += `</div>`;
  content.innerHTML = html;

  // Load and display photos
  loadAndDisplayPhotos(survey);
  loadAllSafetyThumbnails();
  loadAllInstrumentThumbnails();

  // Repopulate comparable entries if they exist
  try {
    if (survey.comparables && survey.comparables.length > 0) {
      survey.comparables.forEach(comp => {
        addComparableEntry();
        const allEntries = document.querySelectorAll('#comparablesEntries > div');
        if (allEntries.length > 0) {
          const entry = allEntries[allEntries.length - 1];
          const sourceSelect = entry.querySelector('.compSource');
          if (sourceSelect) sourceSelect.value = comp.source || '';
          if (entry.querySelector('.compVessel')) entry.querySelector('.compVessel').value = comp.vessel || '';
          if (entry.querySelector('.compPrice')) entry.querySelector('.compPrice').value = comp.price || '';
          if (entry.querySelector('.compLocation')) entry.querySelector('.compLocation').value = comp.location || '';
          if (entry.querySelector('.compDate')) entry.querySelector('.compDate').value = comp.date || '';
          const waterSelect = entry.querySelector('.compWater');
          if (waterSelect) waterSelect.value = comp.water || '';
          if (entry.querySelector('.compNotes')) entry.querySelector('.compNotes').value = comp.notes || '';
        }
      });
    }
  } catch (e) { console.error('Error repopulating comparables:', e); }

  // Auto-fill single variants
  try {
    document.querySelectorAll('[data-auto-fill-item]').forEach(el => {
      const itemLabel = el.getAttribute('data-auto-fill-item');
      const variantText = el.getAttribute('data-variant-text');
      const textareaId = `text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const textarea = document.getElementById(textareaId);
      if (textarea && !textarea.value) {
        textarea.value = variantText;
      }
    });
  } catch (e) { console.error('Error auto-filling variants:', e); }

  // Add floating report preview button (ensured at end of render)
  ensureReportButton();
  // Fallback: if button didn't appear (e.g. timing issue), retry after DOM settles
  setTimeout(() => ensureReportButton(), 500);

  // Restore the previously open accordion so the user doesn't lose their place
  restoreAccordionState();
}

function ensureReportButton() {
  let btn = document.getElementById('reportBtn');
  if (btn) return; // already exists
  // Remove old fab if present
  const fab = document.querySelector('.fab');
  if (fab) fab.remove();

  // Bottom action bar container — two rows on mobile, single row on wide screens
  const bottomBar = document.createElement('div');
  bottomBar.id = 'inspectionBottomBar';
  bottomBar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:8px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 -2px 10px rgba(0,0,0,0.1);z-index:100;';
  document.body.appendChild(bottomBar);

  const pillStyle = 'border:none;border-radius:14px;padding:8px 12px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;';

  // Check button — pre-flight survey validation
  const checkBtn = document.createElement('button');
  checkBtn.style.cssText = pillStyle + 'background:#ffcc00;color:#006699;font-weight:700;';
  checkBtn.innerHTML = '✅ Check';
  checkBtn.title = 'Pre-flight check — find missing fields, empty ratings, and issues before generating report';
  checkBtn.onclick = () => checkSurvey();
  bottomBar.appendChild(checkBtn);

  // Edit Intro button
  const introBtn = document.createElement('button');
  introBtn.style.cssText = pillStyle + 'background:#006699;color:white;';
  introBtn.innerHTML = '✏️ Intro';
  introBtn.onclick = () => editSurveyDetails(currentSurveyId);
  bottomBar.appendChild(introBtn);

  // Backup status badge — shows live backup count
  const backupBadge = document.createElement('span');
  backupBadge.id = 'backupStatusBadge';
  backupBadge.style.cssText = 'display:none;align-items:center;gap:3px;padding:6px 10px;border-radius:20px;font-size:11px;font-weight:700;color:white;background:#16a34a;white-space:nowrap;cursor:help;';
  backupBadge.title = 'Backup status';
  bottomBar.appendChild(backupBadge);

  // Backup button
  const backupBtn = document.createElement('button');
  backupBtn.id = 'backupBtn';
  backupBtn.style.cssText = pillStyle + 'background:#3399cc;color:white;box-shadow:0 2px 8px rgba(51,153,204,0.3);';
  backupBtn.innerHTML = '💾 Backup';
  backupBtn.onclick = async () => {
    // Suppress popstate during backup (share sheet can trigger it on iOS)
    window._backupActive = true;
    // Try Google Drive backup first, then Firebase sync, then file export
    if (DriveBackup.isSignedIn()) {
      backupBtn.innerHTML = '💾 Uploading…';
      backupBtn.disabled = true;
      BackupProgress.show();
      try {
        const result = await DriveBackup.backupSurvey(
          currentSurveyId,
          (update) => BackupProgress.update(update),
          () => BackupProgress.isCancelled()
        );
        window._hasUnsavedBackup = false;
        BackupProgress.finish({
          title: '✓ Backup complete',
          subtitle: (result.skipped || 0) > 0
            ? `${result.vesselName} · ${result.uploaded} new + ${result.skipped} already on Drive = ${result.totalPhotos} total`
            : `${result.vesselName} · ${result.uploaded} of ${result.totalPhotos} photos uploaded`,
          success: true
        });
      } catch (err) {
        console.error('Drive backup error:', err);
        if (err.driveApiDisabled) {
          BackupProgress.hide();
          showDriveApiDisabledDialog(err.activationUrl, 0, 1);
        } else if (err.cancelled) {
          BackupProgress.finish({ title: '⚠ Backup cancelled', subtitle: '', success: false });
        } else {
          BackupProgress.finish({
            title: '⚠ Backup failed',
            subtitle: err.message || String(err),
            success: false
          });
        }
      } finally {
        backupBtn.innerHTML = '💾 Backup';
        backupBtn.disabled = false;
        window._backupActive = false;
      }
    } else if (window.fsDb && FirebaseSync.isEnabled()) {
      // Firebase real-time sync — just push survey + photos through the sync module
      backupBtn.innerHTML = '💾 Saving…';
      backupBtn.disabled = true;
      try {
        const survey = await getSurvey(currentSurveyId);
        if (!survey) { showToast('Survey not found'); return; }
        await FirebaseSync.pushSurvey(survey);

        // Also push all photos through FirebaseSync
        const photos = await new Promise((resolve) => {
          const tx = db.transaction(['photos'], 'readonly');
          const store = tx.objectStore('photos');
          const index = store.index('surveyId');
          const range = IDBKeyRange.only(currentSurveyId);
          const results = [];
          index.openCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) { results.push(cursor.value); cursor.continue(); }
            else resolve(results);
          };
        });
        for (const photo of photos) {
          await FirebaseSync.pushPhoto(photo);
        }

        window._hasUnsavedBackup = false;
        showToast(`Backed up: ${survey.vesselName || 'survey'}`);
      } catch (err) {
        console.error('Firebase backup error:', err);
        showToast('Backup failed — ' + err.message);
      } finally {
        backupBtn.innerHTML = '💾 Backup';
        backupBtn.disabled = false;
        window._backupActive = false;
      }
    } else {
      // Fallback: file export (share sheet / download)
      try {
        await exportSurvey(currentSurveyId);
        window._hasUnsavedBackup = false;
      } finally {
        window._backupActive = false;
      }
    }
  };
  bottomBar.appendChild(backupBtn);

  // ⋯ More overflow menu (Recover Photos, Force Update)
  const moreWrap = document.createElement('div');
  moreWrap.style.cssText = 'position:relative;';
  const moreBtn = document.createElement('button');
  moreBtn.style.cssText = pillStyle + 'background:#f1f5f9;color:#64748b;font-size:16px;padding:8px 10px;';
  moreBtn.innerHTML = '⋯';
  moreBtn.title = 'More actions';
  moreBtn.onclick = (e) => {
    e.stopPropagation();
    const menu = document.getElementById('inspOverflowMenu');
    if (menu) { menu.style.display = menu.style.display === 'none' ? 'flex' : 'none'; }
  };
  moreWrap.appendChild(moreBtn);

  const overflowMenu = document.createElement('div');
  overflowMenu.id = 'inspOverflowMenu';
  overflowMenu.style.cssText = 'display:none;position:absolute;bottom:100%;right:0;margin-bottom:8px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.18);padding:6px;flex-direction:column;gap:4px;min-width:180px;z-index:200;';

  // Recover Photos option
  const recoverOpt = document.createElement('button');
  recoverOpt.id = 'recoverPhotosBtn';
  recoverOpt.style.cssText = 'border:none;background:none;padding:10px 14px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:8px;color:#dc2626;';
  recoverOpt.innerHTML = '🔄 Recover Photos';
  recoverOpt.onclick = async () => {
    overflowMenu.style.display = 'none';
    if (!window.fsDb || !FirebaseSync.isEnabled()) {
      showAlert('Firebase sync is not active. Cannot recover photos.');
      return;
    }
    const survey = await getSurvey(currentSurveyId);
    if (!survey) { showAlert('Survey not found'); return; }

    recoverOpt.innerHTML = '🔄 Checking…';
    recoverOpt.disabled = true;
    try {
      const snap = await window.fsDb.collection('photos')
        .where('surveyId', '==', survey.id)
        .get();
      const total = snap.docs.length;
      if (total === 0) {
        showAlert('No photos found in Firebase for this survey.');
        return;
      }
      const doRecover = await new Promise(resolve => {
        showAlert(`Found ${total} photos in Firebase for ${survey.vesselName}. Download them all now?`,
          'Download', () => resolve(true), 'Cancel', () => resolve(false));
      });
      if (!doRecover) return;

      // Filter out photos we already have locally
      const toDownload = [];
      let alreadyHad = 0;
      for (const doc of snap.docs) {
        const meta = doc.data();
        const local = await getPhotoById(meta.id);
        if (local && local.dataUrl) { alreadyHad++; continue; }
        if (meta.storageRef) toDownload.push(meta);
      }

      if (toDownload.length === 0) {
        showAlert(`All ${alreadyHad} photos are already on this device.`);
        return;
      }

      // Use the progress dialog for live feedback
      BackupProgress.show();
      const titleEl = document.getElementById('bpTitle');
      if (titleEl) titleEl.textContent = '🔄 Recovering photos';
      BackupProgress.update({
        surveyLabel: `${survey.vesselName} — ${toDownload.length} photos`,
        stepLabel: `0 of ${toDownload.length} downloaded`,
        percent: 0
      });

      let downloaded = 0;
      const failedLabels = [];

      for (const meta of toDownload) {
        if (BackupProgress.isCancelled()) break;
        const photoLabel = meta.label || meta.id;
        BackupProgress.update({
          stepLabel: `${downloaded + 1} of ${toDownload.length}: ${photoLabel.substring(0, 50)}`,
          percent: Math.round((downloaded / toDownload.length) * 100)
        });
        try {
          let dataUrl = await _downloadOneFirebasePhoto(meta);
          let photo = { ...meta, dataUrl };
          dataUrl = null;
          await new Promise((resolve, reject) => {
            const tx = db.transaction(['photos'], 'readwrite');
            tx.objectStore('photos').put(photo);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          photo = null;
          downloaded++;
          BackupProgress.update({
            detail: `✓ ${photoLabel}`,
            percent: Math.round((downloaded / toDownload.length) * 100)
          });
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          const stageTag = err.stage ? `[${err.stage}] ` : '';
          failedLabels.push(photoLabel);
          BackupProgress.update({ detail: `✗ ${photoLabel}: ${stageTag}${err.message || err}` });
        }
      }

      const cancelled = BackupProgress.isCancelled();
      if (cancelled) {
        BackupProgress.finish({
          title: '⚠ Recovery cancelled',
          subtitle: `Downloaded ${downloaded} of ${toDownload.length}. ${alreadyHad} already here.`,
          success: false
        });
      } else if (failedLabels.length === 0) {
        BackupProgress.finish({
          title: '✓ Recovery complete',
          subtitle: `Downloaded ${downloaded} photos · ${alreadyHad} already here`,
          success: true
        });
      } else {
        BackupProgress.finish({
          title: '⚠ Recovery finished with errors',
          subtitle: `Downloaded ${downloaded} · Failed ${failedLabels.length} · ${alreadyHad} already here. Tap Recover again to retry.`,
          success: false
        });
      }

      if (currentSurveyId && downloaded > 0) {
        const s = await getSurvey(currentSurveyId);
        if (s) showInspection(s);
      }
    } catch (err) {
      console.error('Photo recovery error:', err);
      BackupProgress.hide();
      showAlert('Recovery failed: ' + err.message);
    } finally {
      recoverOpt.innerHTML = '🔄 Recover Photos';
      recoverOpt.disabled = false;
    }
  };
  overflowMenu.appendChild(recoverOpt);

  // Force Update option
  const updateOpt = document.createElement('button');
  updateOpt.style.cssText = 'border:none;background:none;padding:10px 14px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border-radius:8px;color:#006699;';
  updateOpt.innerHTML = '↻ Force Update';
  updateOpt.onclick = () => { overflowMenu.style.display = 'none'; forceAppUpdate(); };
  overflowMenu.appendChild(updateOpt);

  moreWrap.appendChild(overflowMenu);
  bottomBar.appendChild(moreWrap);

  // Close overflow when tapping elsewhere
  document.addEventListener('click', () => {
    const menu = document.getElementById('inspOverflowMenu');
    if (menu) menu.style.display = 'none';
  }, { once: false, passive: true });

  // Preview Report button
  btn = document.createElement('button');
  btn.id = 'reportBtn';
  btn.style.cssText = pillStyle + 'background:#006699;color:white;box-shadow:0 2px 8px rgba(0,102,153,0.3);';
  btn.innerHTML = '📄 Report';
  btn.onclick = () => generateReport();
  bottomBar.appendChild(btn);
}

// ─── Engine Data Migration ────────────────────────────────────────────────
// Migrates engine info from the insurance template's "Engine(s) and drive(s)"
// checklist items into the header fields used by report generation.
// Preserves all original checklist item data (photos, ratings, text).
async function migrateEngineData() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) { showAlert('No survey loaded.'); return; }

  const items = survey.items || {};
  const migrated = [];

  // Engine manufacturer, model, serial → engineMake, engineModel, engineSerial
  const mfgKey = 'Engine(s) manufacturer, model # and serial number (if available)';
  const mfgData = items[mfgKey];
  if (mfgData && mfgData.text && mfgData.text.trim()) {
    const raw = mfgData.text.trim();
    // Try to parse "Make Model, Serial: XXX" or just store as engineMake
    // Common patterns: "Yanmar 4JH4E, Serial: E12345" or "Yanmar 4JH4E"
    const serialMatch = raw.match(/[,;]?\s*(?:serial(?:\s*(?:#|number|no\.?)?)?[:=\s]+)(.+)/i);
    if (serialMatch) {
      const beforeSerial = raw.substring(0, raw.indexOf(serialMatch[0])).trim();
      if (!survey.engineSerial) { survey.engineSerial = serialMatch[1].trim(); migrated.push('Engine serial'); }
      // Split remaining into make and model (first word = make, rest = model)
      const parts = beforeSerial.split(/\s+/);
      if (parts.length >= 2) {
        if (!survey.engineMake) { survey.engineMake = parts[0]; migrated.push('Engine make'); }
        if (!survey.engineModel) { survey.engineModel = parts.slice(1).join(' '); migrated.push('Engine model'); }
      } else if (parts.length === 1) {
        if (!survey.engineMake) { survey.engineMake = parts[0]; migrated.push('Engine make'); }
      }
    } else {
      // No serial found — try make/model split
      const parts = raw.split(/\s+/);
      if (parts.length >= 2) {
        if (!survey.engineMake) { survey.engineMake = parts[0]; migrated.push('Engine make'); }
        if (!survey.engineModel) { survey.engineModel = parts.slice(1).join(' '); migrated.push('Engine model'); }
      } else {
        if (!survey.engineMake) { survey.engineMake = raw; migrated.push('Engine make'); }
      }
    }
  }

  // Hours → engineHours
  const hoursData = items['Hours'];
  if (hoursData && hoursData.text && hoursData.text.trim()) {
    if (!survey.engineHours) { survey.engineHours = hoursData.text.trim(); migrated.push('Engine hours'); }
  }

  // Horsepower → engineHP
  const hpData = items['Horsepower'];
  if (hpData && hpData.text && hpData.text.trim()) {
    if (!survey.engineHP) { survey.engineHP = hpData.text.trim(); migrated.push('Engine HP'); }
  }

  // Fuel type → fuelType
  const fuelData = items['Fuel type'];
  if (fuelData && fuelData.text && fuelData.text.trim()) {
    if (!survey.fuelType) { survey.fuelType = fuelData.text.trim(); migrated.push('Fuel type'); }
  }

  // Engine name plate photos → enginePlatePhoto (first photo)
  const plateData = items['Engine name plate(s)'];
  if (plateData && plateData.photos && plateData.photos.length > 0) {
    if (!survey.enginePlatePhoto) { survey.enginePlatePhoto = plateData.photos[0]; migrated.push('Engine plate photo'); }
  }

  // Engine photos → enginePhoto (first photo from "Engine(s) and drive(s) photos")
  const enginePhotosData = items['Engine(s) and drive(s) photos'];
  if (enginePhotosData && enginePhotosData.photos && enginePhotosData.photos.length > 0) {
    if (!survey.enginePhoto) { survey.enginePhoto = enginePhotosData.photos[0]; migrated.push('Engine photo'); }
  }

  if (migrated.length === 0) {
    showAlert('No new engine data to migrate. Fields already populated or no engine data found in checklist items.');
    return;
  }

  await saveSurvey(survey);
  showAlert(`Migrated ${migrated.length} engine fields:\n\n${migrated.join('\n')}\n\nOriginal checklist items preserved. Review the header fields to verify.`);

  // Re-render to show updated fields
  renderInspection(survey);
}

// ─── Check Survey — Quality Audit ─────────────────────────────────────────
async function checkSurvey() {
  // If we're in the Edit Intro view, save form to DB first, then switch to inspection
  if (currentView === 'edit-survey' || currentView === 'new-survey') {
    await saveEditFormSilently();
    const s = await getSurvey(currentSurveyId);
    if (s) renderInspection(s);
    await new Promise(r => setTimeout(r, 100));
    document.getElementById('csBackToCheckBtn')?.remove();
  }

  const survey = await getSurvey(currentSurveyId);
  if (!survey) { showAlert('No survey loaded.'); return; }

  const issues = [];   // { severity, category, message, itemLabel?, navId? }

  // Helper: add issue — navId is optional DOM element ID for non-checklist items
  const add = (severity, category, message, itemLabel, navId) => {
    issues.push({ severity, category, message, itemLabel: itemLabel || null, navId: navId || null });
  };

  // ── 1. HEADER FIELDS ────────────────────────────────────────────────────
  const requiredHeader = [
    ['vesselName',        'Vessel name'],
    ['yearMakeModel',     'Year / Make / Model'],
    ['clientName',        'Client name'],
    ['surveyDate',        'Survey date'],
    ['location',          'Survey location'],
    ['surveyType',        'Survey type'],
    ['vesselType',        'Vessel type'],
    ['hinNumber',         'HIN (Hull Identification Number)'],
    ['reportDate',        'Report date'],
    ['onLandOrWater',     'On land or in water'],
    ['powerAtTime',       'Power at time of survey'],
    ['personsInAttendance', 'Persons in attendance'],
    ['construction',      'Construction material'],
    ['electricalSystem',  'Electrical system'],
  ];
  const importantHeader = [
    ['loa',               'LOA (length overall)'],
    ['beam',              'Beam'],
    ['maxDraft',          'Maximum draft'],
    ['displacement',      'Displacement'],
    ['weather',           'Weather at time of survey'],
    ['seaTrial',          'Limited trial run (yes/no)'],
    ['numberCabins',      'Number of cabins'],
    ['boatStyle',         'Boat style'],
  ];

  for (const [field, label] of requiredHeader) {
    if (!survey[field] || survey[field].trim() === '' || survey[field] === 'Select') {
      add('critical', 'Header Fields', `Missing: ${label}`, null, field);
    }
  }
  for (const [field, label] of importantHeader) {
    if (!survey[field] || survey[field].trim() === '') {
      add('warning', 'Header Fields', `Missing: ${label}`, null, field);
    }
  }

  // ── 2. ENGINE & TRANSMISSION ────────────────────────────────────────────
  let hasEngineMigrationData = false;
  if (survey.vesselType !== 'human-powered') {
    const engineFields = [
      ['engineMake',    'Engine make'],
      ['engineModel',   'Engine model'],
      ['engineSerial',  'Engine serial number'],
      ['engineHours',   'Engine hours'],
      ['engineHP',      'Engine horsepower'],
      ['fuelType',      'Fuel type'],
    ];
    let missingEngineCount = 0;
    for (const [field, label] of engineFields) {
      if (!survey[field] || survey[field].trim() === '') {
        add('critical', 'Engine & Transmission', `Missing: ${label}`, null, field);
        missingEngineCount++;
      }
    }
    const transFields = [
      ['transmissionMake',   'Transmission make'],
      ['transmissionModel',  'Transmission model'],
      ['transmissionSerial', 'Transmission serial number'],
    ];
    for (const [field, label] of transFields) {
      if (!survey[field] || survey[field].trim() === '') {
        add('warning', 'Engine & Transmission', `Missing: ${label}`, null, field);
      }
    }
    // Check if engine data exists in checklist items that could be migrated
    if (missingEngineCount > 0) {
      const si = survey.items || {};
      const hasMfg = si['Engine(s) manufacturer, model # and serial number (if available)']?.text?.trim();
      const hasHrs = si['Hours']?.text?.trim();
      const hasHP = si['Horsepower']?.text?.trim();
      const hasFuel = si['Fuel type']?.text?.trim();
      if (hasMfg || hasHrs || hasHP || hasFuel) {
        hasEngineMigrationData = true;
      }
    }
  }

  // ── 3. DOCUMENTATION PHOTOS ─────────────────────────────────────────────
  if (!survey.hinPhoto) add('critical', 'Documentation Photos', 'Missing: HIN plate photo', null, 'hinPhotoStatus');
  if (!survey.compliancePhoto) add('warning', 'Documentation Photos', 'Missing: Compliance plate photo', null, 'compliancePhotoStatus');
  if (!survey.coverPhoto) add('warning', 'Documentation Photos', 'Missing: Cover photo', null, 'coverPhotoStatus');
  if (!survey.licencePhoto) add('info', 'Documentation Photos', 'Missing: TC licence photo', null, 'tcLicense');

  // Four-corner photos
  const cornerFields = ['fourCornerPortBow','fourCornerStbdBow','fourCornerPortStern','fourCornerStbdStern'];
  const cornerNames  = ['Port bow','Starboard bow','Port stern','Starboard stern'];
  cornerFields.forEach((f, i) => {
    if (!survey[f]) add('warning', 'Documentation Photos', `Missing four-corner photo: ${cornerNames[i]}`, null, f);
  });

  // Engine / transmission photos
  const enginePhotoFields = [
    ['enginePhoto',         'Engine photo'],
    ['enginePlatePhoto',    'Engine plate photo'],
    ['transmissionPhoto',   'Transmission photo'],
    ['transmissionPlatePhoto','Transmission plate photo'],
  ];
  if (survey.vesselType !== 'human-powered') {
    for (const [field, label] of enginePhotoFields) {
      if (!survey[field]) add('warning', 'Documentation Photos', `Missing: ${label}`, null, field);
    }
  }

  // ── 3b. PHOTO ORIENTATION CHECK ──────────────────────────────────────────
  // Collect all photo IDs, load each, and check dimensions.
  // Portrait-oriented photos (height > width × 1.3) are flagged since most
  // boat survey photos should be landscape.
  const allPhotoRefs = [];
  // Documentation photos
  const docPhotoKeys = ['hinPhoto','compliancePhoto','coverPhoto','licencePhoto','tcPaperLicencePhoto',
    'fourCornerPortBow','fourCornerStbdBow','fourCornerPortStern','fourCornerStbdStern',
    'enginePhoto','enginePlatePhoto','transmissionPhoto','transmissionPlatePhoto'];
  const docPhotoLabels = {
    hinPhoto: 'HIN plate', compliancePhoto: 'Compliance plate', coverPhoto: 'Cover photo',
    licencePhoto: 'TC licence', tcPaperLicencePhoto: 'TC paper licence',
    fourCornerPortBow: 'Port bow', fourCornerStbdBow: 'Starboard bow',
    fourCornerPortStern: 'Port stern', fourCornerStbdStern: 'Starboard stern',
    enginePhoto: 'Engine', enginePlatePhoto: 'Engine plate',
    transmissionPhoto: 'Transmission', transmissionPlatePhoto: 'Transmission plate',
  };
  for (const key of docPhotoKeys) {
    if (survey[key]) allPhotoRefs.push({ id: survey[key], label: docPhotoLabels[key] || key, isDoc: true, navId: key });
  }
  // Checklist item photos
  for (const [label, data] of Object.entries(survey.items || {})) {
    if (data.photos && data.photos.length > 0) {
      data.photos.forEach(pid => allPhotoRefs.push({ id: pid, label: label, isDoc: false }));
    }
  }

  // ── 4. CHECKLIST COMPLETION ─────────────────────────────────────────────
  const activeTemplate = getTemplateForSurvey(survey);
  const sailOnlyCategories = ['Spars and rigging', 'Sails'];
  const isPowerboat = (survey.vesselType || '').toLowerCase() === 'power';
  const driveType = survey.driveType || '';

  // Same filtering logic as renderInspection
  const SHAFT_ONLY = ['Cutlass bearing(s)','Propeller shaft(s)','Propeller(s)','Propeller/drive anode(s)','Stern tube(s) (external)','Skeg(s)'];
  const OUTDRIVE_ONLY = ['Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows'];
  const SAILDRIVE_ONLY = ['Sail drive(s) - (external), corrosion, propeller(s), anode(s)'];
  const IPS_ONLY = ['IPS pod drive(s)'];

  function itemApplies(item) {
    if (isPowerboat && item.sailOnly) return false;
    if ((survey.vesselType || '').toLowerCase() === 'sail' && item.powerOnly) return false;
    if (isPowerboat && item.rudderItem) {
      // v2210: derive hasRudder from driveType when explicit field is absent
      // (existing surveys have no hasRudder). Outdrive/saildrive/IPS → no rudder;
      // shaft drive → has rudder. Explicit survey.hasRudder (boolean) still wins.
      const _hasRudder = (typeof survey.hasRudder === 'boolean')
        ? survey.hasRudder
        : !['outdrive','saildrive','ips'].includes((survey.driveType||'').toLowerCase());
      if (!_hasRudder) return false;
    }
    if (isPowerboat && ['Keel and keel joint', 'Keel bolts'].includes(item.label)) return false;
    if (driveType) {
      if (driveType === 'outdrive' && (SAILDRIVE_ONLY.includes(item.label) || IPS_ONLY.includes(item.label) || SHAFT_ONLY.includes(item.label))) return false;
      if (driveType === 'saildrive' && (OUTDRIVE_ONLY.includes(item.label) || IPS_ONLY.includes(item.label) || SHAFT_ONLY.includes(item.label))) return false;
      if (driveType === 'shaft' && (OUTDRIVE_ONLY.includes(item.label) || SAILDRIVE_ONLY.includes(item.label) || IPS_ONLY.includes(item.label))) return false;
      if (driveType === 'ips' && (OUTDRIVE_ONLY.includes(item.label) || SAILDRIVE_ONLY.includes(item.label) || SHAFT_ONLY.includes(item.label))) return false;
    }
    if (item.conditional) {
      const thruster = survey.items['Bow thruster']?.rating;
      const sternThr = survey.items['Stern thruster']?.rating;
      const propane = survey.items['Propane valve, regulator, gauge, storage compartment and vent']?.rating;
      if (item.conditional === 'bowThruster' && (!thruster || thruster === 'Not applicable')) return false;
      if (item.conditional === 'sternThruster' && (!sternThr || sternThr === 'Not applicable')) return false;
      if (item.conditional === 'propane' && (!propane || propane === 'Not applicable')) return false;
    }
    return true;
  }

  // Build full list of applicable rated items (including head/hull/drive expansion)
  const allRatedItems = [];  // { label, categoryName }
  activeTemplate.forEach(section => {
    if (section.name !== 'Kiki Marine Survey' || !section.categories) return;
    section.categories.forEach(category => {
      if (isPowerboat && sailOnlyCategories.includes(category.name)) return;
      if (!category.items) return;
      const rated = category.items.filter(item => item.type === 'list' && itemApplies(item));
      rated.forEach(item => {
        allRatedItems.push({ label: item.label, categoryName: category.name, hullItem: item.hullItem, driveLineItem: item.driveLineItem });
      });
    });
  });

  // Expand heads, hulls, drive lines (mirror renderInspection logic)
  const expandedItems = [];
  const headCount = survey.headCount || 1;
  const hullCount = typeof inferHullCount === 'function' ? inferHullCount(survey) : 1;
  const driveLineCount = survey.driveLineCount || 1;

  allRatedItems.forEach(item => {
    // Head expansion
    if (item.categoryName === 'Head(s)' && headCount > 1) {
      const shortLabel = item.label.replace(/^Head,\s*/, '');
      for (let h = 1; h <= headCount; h++) {
        expandedItems.push({ label: `Head ${h} — ${shortLabel}`, categoryName: item.categoryName });
      }
      return;
    }
    // Hull expansion
    if (item.hullItem && hullCount > 1) {
      const hullLabels = hullCount === 2
        ? ['Port hull', 'Starboard hull']
        : ['Port hull', 'Centre hull', 'Starboard hull'];
      const singularLabel = item.label.replace(/\(s\)/g, '');
      hullLabels.forEach(prefix => {
        expandedItems.push({ label: `${prefix} — ${singularLabel}`, categoryName: item.categoryName });
      });
      return;
    }
    // Drive line expansion
    if (item.driveLineItem && driveLineCount > 1) {
      const driveLabels = driveLineCount === 2
        ? ['Port', 'Starboard']
        : Array.from({ length: driveLineCount }, (_, i) => `#${i + 1}`);
      driveLabels.forEach(prefix => {
        expandedItems.push({ label: `${prefix} — ${item.label}`, categoryName: item.categoryName });
      });
      return;
    }
    // Singularise hull items for single hull
    if (item.hullItem && hullCount === 1) {
      expandedItems.push({ label: item.label.replace(/\(s\)/g, ''), categoryName: item.categoryName });
      return;
    }
    expandedItems.push(item);
  });

  // Check each expanded item
  let unratedCount = 0;
  let missingTextAB = 0;

  // Group skipped items by category so we can summarize them together
  const skippedByCategory = {};  // { categoryName: [itemLabel, ...] }
  const totalByCategory = {};     // { categoryName: totalItemCount }
  expandedItems.forEach(item => {
    totalByCategory[item.categoryName] = (totalByCategory[item.categoryName] || 0) + 1;
  });

  expandedItems.forEach(item => {
    const data = survey.items[item.label];

    // Excluded (skipped) items — collect for category-level summary below
    if (data && data.excluded) {
      if (!skippedByCategory[item.categoryName]) skippedByCategory[item.categoryName] = [];
      skippedByCategory[item.categoryName].push(item.label);
      return;
    }

    // Not rated at all
    if (!data || !data.rating || data.rating === '') {
      unratedCount++;
      if (unratedCount <= 20) {  // Cap individual listings
        add('warning', 'Checklist Completion', `Unrated: ${item.label}`, item.label);
      }
      return;
    }

    const baseRating = data.rating.charAt(0);

    // A or B rating without explanatory text
    if ((baseRating === 'A' || baseRating === 'B') && (!data.text || data.text.trim() === '')) {
      missingTextAB++;
      add('critical', 'Missing Notes', `${data.rating} rated but no notes: ${item.label}`, item.label);
    }

    // Check for unreplaced [describe area(s)] placeholder
    if (data.text && data.text.includes('[describe area(s)]')) {
      add('critical', 'Unreplaced Placeholders', `Contains [describe area(s)]: ${item.label}`, item.label);
    }

    // Check for other common placeholder patterns
    if (data.text) {
      const placeholderPatterns = [
        /\{specify:[^}]*\}/,
        /\{any:[^}]*\}/,
        /\[describe[^\]]*\]/i,
        /\[specify[^\]]*\]/i,
        /\[insert[^\]]*\]/i,
      ];
      for (const pat of placeholderPatterns) {
        if (pat.test(data.text)) {
          add('warning', 'Unreplaced Placeholders', `Contains unfilled placeholder in: ${item.label}`, item.label);
          break;
        }
      }
    }

    // B-rated items should ideally have a recommendation
    if (baseRating === 'B' && data.text && !(/recommend|should|advise|suggest|replace|repair|service|address|correct|attention/i.test(data.text))) {
      add('info', 'Thoroughness', `B-rated but no clear recommendation: ${item.label}`, item.label);
    }

    // A-rated (safety) items should reference a standard
    if (baseRating === 'A' && (!data.standards || data.standards.length === 0)) {
      add('info', 'Thoroughness', `Safety item without a standard reference: ${item.label}`, item.label);
    }
  });

  // Summary for large unrated counts
  if (unratedCount > 20) {
    add('warning', 'Checklist Completion', `...and ${unratedCount - 20} more unrated items (${unratedCount} total)`, null);
  }

  // Summarize skipped items: if an entire category is skipped, report it once;
  // otherwise list the individual skipped items. Skipped sections are treated
  // as dealt-with (info-level acknowledgement, not warnings).
  for (const [catName, skippedLabels] of Object.entries(skippedByCategory)) {
    const total = totalByCategory[catName] || skippedLabels.length;
    if (skippedLabels.length === total && total > 1) {
      // Whole category skipped — one acknowledgement
      add('info', 'Skipped Sections', `Entire "${catName}" section skipped (${total} items) — excluded from report`, null);
    } else if (skippedLabels.length > 3) {
      // Many individual items in this category — summarize
      add('info', 'Skipped Items', `${skippedLabels.length} items skipped in "${catName}": ${skippedLabels.slice(0, 3).join(', ')} (+${skippedLabels.length - 3} more)`, null);
    } else {
      // A few — list them
      skippedLabels.forEach(lbl => add('info', 'Skipped Items', `Skipped: ${lbl}`, lbl));
    }
  }

  // ── 5. VALUATION ────────────────────────────────────────────────────────
  if (!survey.valuationLow && !survey.valuationHigh) {
    add('critical', 'Valuation', 'Missing: Fair market value (low and high)', null, 'valuationLow');
  } else {
    if (!survey.valuationLow) add('warning', 'Valuation', 'Missing: Low value estimate', null, 'valuationLow');
    if (!survey.valuationHigh) add('warning', 'Valuation', 'Missing: High value estimate', null, 'valuationHigh');
  }
  if (!survey.overallCondition) add('critical', 'Valuation', 'Missing: Overall condition rating (BUC grade)', null, 'overallCondition');
  if (!survey.valuationRationale && !survey.valuationSource) {
    add('warning', 'Valuation', 'Missing: Valuation rationale or source', null, 'valuationRationale');
  }
  if ((!survey.comparables || survey.comparables.length === 0) || survey.comparables.every(c => !c.vessel)) {
    add('warning', 'Valuation', 'No comparable vessels entered', null, 'valuationLow');
  }
  if (!survey.replacementCost) add('info', 'Valuation', 'Missing: Replacement cost estimate', null, 'replacementCost');

  // SAMS 4.3 — valuation must cite at least 2 independent sources. The MY Bad
  // review: "Statement of method used for valuation, however, only used BUC.
  // Not sufficient to provide a reasonable valuation."
  const sources = Array.isArray(survey.valuationSources)
    ? survey.valuationSources.filter(s => s && s.trim())
    : [];
  if (sources.length === 1) {
    add('warning', 'Valuation', `Only one valuation source cited (${sources[0]}). SAMS expects at least two \u2014 add comparable sold vessels, replacement-cost analysis, or another guide.`, null, 'valuationLow');
  } else if (sources.length === 0 && (survey.valuationLow || survey.valuationHigh)) {
    add('warning', 'Valuation', 'Valuation entered but no source checked. SAMS requires at least two sources (e.g. BUC + comparables + replacement cost).', null, 'valuationLow');
  }

  // ── 6. SAFETY EQUIPMENT ─────────────────────────────────────────────────
  if (!survey.safetyEquipment || survey.safetyEquipment.length === 0) {
    add('critical', 'Safety Equipment', 'TC TP 511 safety equipment checklist not configured', null);
  } else {
    const checked = survey.safetyEquipment.filter(e => e.checked).length;
    const total = survey.safetyEquipment.length;
    if (checked === 0) {
      add('critical', 'Safety Equipment', `No safety equipment verified (0 of ${total})`, null);
    } else if (checked < total) {
      const missing = survey.safetyEquipment.filter(e => !e.checked).map(e => e.name);
      add('warning', 'Safety Equipment', `${checked} of ${total} verified. Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+${missing.length - 3} more)` : ''}`, null);
    }
  }

  // ── 7. INSTRUMENTS & ELECTRONICS ────────────────────────────────────────
  if (!survey.instrumentsElectronics || survey.instrumentsElectronics.length === 0) {
    add('warning', 'Instruments & Electronics', 'No instruments or electronics listed', null);
  }

  // ── 8. VESSEL DESCRIPTION ───────────────────────────────────────────────
  if (!survey.vesselDescription || survey.vesselDescription.trim().length < 20) {
    add('warning', 'Vessel Description', 'Vessel description is missing or too short', null, 'vesselDescription');
  }

  // ── 9. TC LICENCE ───────────────────────────────────────────────────────
  if (!survey.tcLicense) add('info', 'Documentation', 'Missing: TC licence / registration number', null, 'tcLicense');
  if (!survey.tcLicenseType) add('info', 'Documentation', 'Missing: TC licence type', null, 'tcLicenseType');

  // ── 10. GRAMMAR / SPELLING SPOT-CHECKS ──────────────────────────────────
  // Check freeform text in items for common issues
  const textIssues = [];
  for (const [label, data] of Object.entries(survey.items || {})) {
    if (!data || !data.text || data.text.trim() === '') continue;
    const t = data.text;

    // Double spaces
    if (/  +/.test(t)) textIssues.push({ label, issue: 'Double spaces' });

    // Missing period at end of sentence (if text is >20 chars and doesn't end with punctuation)
    if (t.length > 20 && !/[.!?:;]$/.test(t.trim())) textIssues.push({ label, issue: 'Does not end with punctuation' });

    // American spelling (common catches)
    const americanisms = [
      [/\bfiberglass\b/i, 'fiberglass → fibreglass'],
      [/\bcolor\b/i, 'color → colour'],
      [/\bcenter\b/i, 'center → centre'],
      [/\banalyze\b/i, 'analyze → analyse'],
      [/\bgalvanize\b/i, 'galvanize → galvanise'],
      [/\bmold\b/i, 'mold → mould'],
      [/\bgray\b/i, 'gray → grey'],
      [/\blicense\b/i, 'license → licence (noun)'],
    ];
    for (const [pat, fix] of americanisms) {
      if (pat.test(t)) textIssues.push({ label, issue: `Canadian spelling: ${fix}` });
    }

    // Sentence starting with lowercase after period
    if (/\.\s+[a-z]/.test(t)) textIssues.push({ label, issue: 'Sentence starts with lowercase' });
  }

  textIssues.forEach(ti => {
    add('info', 'Grammar & Spelling', `${ti.issue}: ${ti.label}`, ti.label);
  });

  // ── BUILD RESULTS UI — Severity-ordered with checkboxes & inline content ──

  // Severity config
  const sevOrder = { critical: 0, warning: 1, info: 2, proofread: 3 };
  const sevIcon = { critical: '🔴', warning: '🟡', info: '🔵', proofread: '📖' };
  const sevBg = { critical: '#fef2f2', warning: '#fffbeb', info: '#eff6ff', proofread: '#f8fafc' };
  const sevBorder = { critical: '#fca5a5', warning: '#fcd34d', info: '#93c5fd', proofread: '#e2e8f0' };
  const sevLabel = { critical: 'Critical', warning: 'Warning', info: 'Info', proofread: 'Proofread' };
  const ratingColors = { A: '#dc2626', B: '#d97706', C: '#16a34a', N: '#6b7280', S: '#dc2626' };

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const skippedCount = issues.filter(i => i.category === 'Skipped Items' || i.category === 'Skipped Sections').length;
  const infoCount = issues.filter(i => i.severity === 'info').length - skippedCount;

  // Score calculation
  const totalChecks = expandedItems.filter(i => { const d = survey.items[i.label]; return !d?.excluded; }).length;
  const ratedCount = expandedItems.filter(i => { const d = survey.items[i.label]; return d && !d.excluded && d.rating; }).length;
  const completionPct = totalChecks > 0 ? Math.round((ratedCount / totalChecks) * 100) : 0;

  // Overall readiness
  let readiness, readinessBg;
  if (criticalCount === 0 && warningCount <= 3) {
    readiness = 'Ready for Report'; readinessBg = '#16a34a';
  } else if (criticalCount <= 3) {
    readiness = 'Nearly Ready'; readinessBg = '#d97706';
  } else {
    readiness = 'Needs Work'; readinessBg = '#dc2626';
  }

  // ── Build proofread items (rated items without issues) ──────────────
  const proofreadItems = [];
  expandedItems.forEach(item => {
    const data = survey.items[item.label];
    if (!data || data.excluded || !data.rating) return;
    const hasIssue = issues.some(i => i.itemLabel === item.label);
    if (!hasIssue) {
      proofreadItems.push({
        severity: 'proofread',
        category: item.categoryName,
        message: item.label,
        itemLabel: item.label,
        rating: data.rating,
        text: (data.text || '').trim(),
        photoCount: (data.photos || []).length,
        standards: data.standards || [],
      });
    }
  });

  // ── Merge all items into a single flat list sorted by severity ──────
  // Add inline data to issues that reference checklist items
  const allCheckItems = issues.map(issue => {
    const out = { ...issue };
    if (issue.itemLabel) {
      const data = survey.items[issue.itemLabel];
      if (data) {
        out.rating = data.rating || '';
        out.text = (data.text || '').trim();
        out.photoCount = (data.photos || []).length;
        out.standards = data.standards || [];
      }
    }
    return out;
  }).concat(proofreadItems);

  // Assign survey-order index BEFORE sorting — issues follow survey structure
  // (header → engine → photos → checklist in template order → valuation → safety → grammar)
  // and proofread items follow template order. This IS the natural survey order.
  allCheckItems.forEach((item, idx) => { item._surveyOrder = idx; });

  // Build a message→surveyOrder lookup so resolved items can be sorted in survey order
  const surveyOrderByMessage = {};
  allCheckItems.forEach(item => {
    if (!surveyOrderByMessage.hasOwnProperty(item.message)) {
      surveyOrderByMessage[item.message] = item._surveyOrder;
    }
  });

  // Sort: severity order, then alphabetically within each severity
  allCheckItems.sort((a, b) => {
    const sa = sevOrder[a.severity] ?? 9;
    const sb = sevOrder[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    return (a.message || '').localeCompare(b.message || '');
  });

  // ── Load/initialize reviewed-checkbox state from sessionStorage ─────
  const checkStateKey = `checkSurvey_reviewed_${currentSurveyId}`;
  let reviewedState = {};
  try { reviewedState = JSON.parse(sessionStorage.getItem(checkStateKey) || '{}'); } catch(e) {}

  // ── Load resolved and force-OK state ───────────────────────────────
  const resolvedKey = `checkSurvey_resolved_${currentSurveyId}`;
  const forceKey = `checkSurvey_forceOK_${currentSurveyId}`;
  const prevIssuesKey = `checkSurvey_prevIssues_${currentSurveyId}`;
  let resolvedState = {};
  let forceOKState = {};
  try { resolvedState = JSON.parse(sessionStorage.getItem(resolvedKey) || '{}'); } catch(e) {}
  try { forceOKState = JSON.parse(sessionStorage.getItem(forceKey) || '{}'); } catch(e) {}

  // ── Auto-detect newly resolved items ──────────────────────────────
  // Compare current issues against the previous run's issues.
  // Any issue that was present last time but is NOT in the current audit = fixed!
  let prevIssueMessages = [];
  try { prevIssueMessages = JSON.parse(sessionStorage.getItem(prevIssuesKey) || '[]'); } catch(e) {}

  const currentIssueMessages = new Set(issues.map(i => i.message));
  let resolvedChanged = false;
  const newlyAutoResolved = [];
  for (const prevMsg of prevIssueMessages) {
    // If it was an issue before but isn't now, and isn't already tracked, mark as resolved
    if (!currentIssueMessages.has(prevMsg) && !resolvedState[prevMsg] && !forceOKState[prevMsg]) {
      resolvedState[prevMsg] = { fixedAt: Date.now(), auto: true, _surveyOrder: surveyOrderByMessage[prevMsg] ?? 9999 };
      resolvedChanged = true;
      newlyAutoResolved.push(prevMsg);
    }
  }
  if (resolvedChanged) {
    sessionStorage.setItem(resolvedKey, JSON.stringify(resolvedState));
  }

  // Save current issues for next comparison
  sessionStorage.setItem(prevIssuesKey, JSON.stringify([...currentIssueMessages]));

  // ── Build the resolved items list for display ─────────────────────
  // Resolved items: entries in resolvedState or forceOKState that are NOT
  // in the current issues (because they've been fixed)
  const resolvedItems = [];
  for (const [msg, data] of Object.entries(resolvedState)) {
    if (!currentIssueMessages.has(msg)) {
      resolvedItems.push({
        severity: 'resolved',
        message: msg,
        _resolvedBy: 'fixed',
        itemLabel: data.itemLabel || null,
        _surveyOrder: data._surveyOrder ?? surveyOrderByMessage[msg] ?? 9999,
      });
    }
  }
  for (const [msg, data] of Object.entries(forceOKState)) {
    const resolveLabel = data.skipped ? 'skipped' : 'force';
    if (currentIssueMessages.has(msg)) {
      // Force-OK'd/skipped but issue still exists in audit — show in resolved anyway
      resolvedItems.push({
        severity: 'resolved',
        message: msg,
        _resolvedBy: resolveLabel,
        itemLabel: data.itemLabel || null,
        _surveyOrder: data._surveyOrder ?? surveyOrderByMessage[msg] ?? 9999,
      });
    } else if (!resolvedState[msg]) {
      // Force-OK'd/skipped and issue is gone
      resolvedItems.push({
        severity: 'resolved',
        message: msg,
        _resolvedBy: resolveLabel,
        itemLabel: data.itemLabel || null,
        _surveyOrder: data._surveyOrder ?? surveyOrderByMessage[msg] ?? 9999,
      });
    }
  }

  // ── Assign stable IDs to each item for checkbox tracking ───────────
  allCheckItems.forEach((item, idx) => {
    item._checkId = `chk_${idx}_${(item.itemLabel || item.message || '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}`;
  });

  // ── Filter out force-OK'd items from active list ──────────────────
  const activeItems = [];
  allCheckItems.forEach(item => {
    if (forceOKState[item.message]) return; // force-OK'd, already in resolvedItems
    activeItems.push(item);
  });

  // ── Group active items by severity for section headers ─────────────
  // Items that are reviewed (checked off) move to the Resolved section
  // Skipped items get their own collapsible section
  const sections = [];
  const skippedItems = [];
  let currentSev = null;
  activeItems.forEach(item => {
    // Skip reviewed items — they'll appear in the Resolved section
    if (reviewedState[item._checkId]) return;
    // Separate skipped items into their own section
    if (item.category === 'Skipped Items' || item.category === 'Skipped Sections') { skippedItems.push(item); return; }
    if (item.severity !== currentSev) {
      currentSev = item.severity;
      sections.push({ severity: currentSev, items: [] });
    }
    sections[sections.length - 1].items.push(item);
  });

  // Add reviewed (checked-off) items to resolvedItems so they appear in the Resolved section
  activeItems.forEach(item => {
    if (reviewedState[item._checkId]) {
      const resolveLabel = item.severity === 'proofread' ? 'proofread' : 'reviewed';
      resolvedItems.push({
        severity: 'resolved',
        message: item.message,
        itemLabel: item.itemLabel || null,
        _resolvedBy: resolveLabel,
        _surveyOrder: item._surveyOrder ?? surveyOrderByMessage[item.message] ?? 9999,
        rating: item.rating || '',
      });
    }
  });

  // Sort resolved items in survey order (the order they appear in the actual survey)
  resolvedItems.sort((a, b) => (a._surveyOrder ?? 9999) - (b._surveyOrder ?? 9999));

  // ── Build HTML ─────────────────────────────────────────────────────
  let html = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="display:inline-block;background:${readinessBg};color:white;padding:8px 20px;border-radius:20px;font-weight:700;font-size:16px;margin-bottom:8px;">${readiness}</div>
      <div style="font-size:13px;color:#64748b;">
        ${completionPct}% rated (${ratedCount}/${totalChecks}) &nbsp;|&nbsp;
        ${sevIcon.critical} ${criticalCount} &nbsp; ${sevIcon.warning} ${warningCount} &nbsp; ${sevIcon.info} ${infoCount} &nbsp; ${sevIcon.proofread} ${proofreadItems.length}
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
        📷 ${allPhotoRefs.length} photos &nbsp;|&nbsp; ✅ ${resolvedItems.length} resolved${skippedItems.length > 0 ? ` &nbsp;|&nbsp; ⊘ ${skippedItems.length} skipped` : ''}
      </div>
    </div>
  `;

  // ── "Just resolved" floating notification ───────────────────────────
  // Collects newly resolved items to show as a floating toast after overlay renders.
  // Must be floating (not inline) because scroll restoration puts the user mid-list.
  const justResolved = window._csJustResolved || null;
  const allNewlyResolved = [...newlyAutoResolved];
  if (justResolved && !allNewlyResolved.includes(justResolved)) {
    allNewlyResolved.unshift(justResolved);
  }
  window._csJustResolved = null; // clear flag

  // If animating a just-fixed item, suppress the toast and pull it from resolvedItems
  // so it's shown as a green "Fixed!" card first, then moves to Resolved after 2s
  const animateResolve = window._csAnimateResolve || null;
  window._csAnimateResolve = null;
  if (animateResolve) {
    // Suppress toast — it'll show after the animation re-render
    for (let i = allNewlyResolved.length - 1; i >= 0; i--) {
      if (allNewlyResolved[i] === animateResolve.message || allNewlyResolved[i] === animateResolve.itemLabel) {
        allNewlyResolved.splice(i, 1);
      }
    }
    // Remove from resolvedItems — will be shown as a transitioning card instead
    for (let i = resolvedItems.length - 1; i >= 0; i--) {
      if (resolvedItems[i].message === animateResolve.message) {
        resolvedItems.splice(i, 1);
        break;
      }
    }
  }

  if (allCheckItems.length === 0) {
    html += '<div style="text-align:center;padding:20px;color:#16a34a;font-weight:600;">All checks passed! Survey looks complete.</div>';
  }

  // Engine migration banner
  if (hasEngineMigrationData) {
    html += `
      <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:10px;padding:12px;margin-bottom:16px;text-align:center;">
        <div style="font-size:13px;color:#1e40af;margin-bottom:8px;">Engine data found in checklist items but missing from header fields.</div>
        <button onclick="migrateEngineData().then(()=>{document.getElementById('checkSurveyOverlay')?.remove(); checkSurvey();})"
                style="background:#3b82f6;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">
          ⚙️ Migrate Engine Data to Header
        </button>
      </div>`;
  }

  // ── "Just Fixed" transitioning card (before it moves to Resolved) ───
  // Shows the fixed item highlighted green so the user can see which item was addressed
  if (animateResolve) {
    const escMsg = (animateResolve.message || '').replace(/"/g, '&quot;');
    const escLabel = (animateResolve.itemLabel || animateResolve.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html += `
      <div id="cs-transitioning-item" data-cs-msg="${escMsg}" style="margin-bottom:12px;transition:opacity 0.6s ease,transform 0.6s ease;">
        <div style="background:#dcfce7;border:2px solid #16a34a;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;flex-shrink:0;">✅</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:#15803d;font-size:14px;">Fixed!</div>
            <div style="font-size:12px;color:#166534;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escLabel}</div>
          </div>
          <div style="font-size:11px;color:#16a34a;font-weight:600;white-space:nowrap;">→ Moving to Resolved</div>
        </div>
      </div>`;
  }

  // Store item data in global arrays so Go buttons can reference by index
  // (avoids special-character issues in onclick HTML attributes)
  window._csItemLabels = allCheckItems.map(it => it.itemLabel || null);
  window._csItemNavIds = allCheckItems.map(it => it.navId || null);
  window._csCheckIds = allCheckItems.map(it => it._checkId);

  let globalIdx = 0;
  let sectionIdx = 0;
  sections.forEach(section => {
    const sev = section.severity;
    const secId = `cs-section-${sectionIdx++}`;

    html += `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:2px solid ${sevBorder[sev]};margin-bottom:8px;cursor:pointer;user-select:none;"
             onclick="(function(){var l=document.getElementById('${secId}');var c=document.getElementById('${secId}-caret');if(!l||!c)return;var open=l.style.display!=='none';l.style.display=open?'none':'block';c.textContent=open?'▸':'▾';})()">
          <span id="${secId}-caret" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:22px;color:#64748b;flex-shrink:0;margin-left:-8px;">▾</span>
          <div style="font-weight:700;font-size:15px;color:#1e293b;display:flex;align-items:center;gap:6px;flex:1;">
            ${sevIcon[sev]} ${sevLabel[sev]} <span style="font-weight:400;color:#94a3b8;font-size:12px;">(${section.items.length})</span>
          </div>
          <span style="font-size:11px;color:#94a3b8;flex-shrink:0;">☑ to resolve</span>
        </div>
        <div id="${secId}">
    `;

    section.items.forEach(item => {
      const idx = allCheckItems.indexOf(item);
      const isReviewed = !!reviewedState[item._checkId];
      const ratingChar = item.rating ? item.rating.charAt(0) : '';
      const rColor = ratingColors[ratingChar] || '#6b7280';
      const hasTappableItem = !!(item.itemLabel || item.navId);
      const hasContent = !!(item.text || item.rating);

      // Rating badge
      const ratingBadge = ratingChar
        ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;color:white;background:${rColor};padding:2px 6px;border-radius:4px;">${ratingChar}</span>`
        : '';

      // Inline content (expandable)
      let inlineContent = '';
      if (hasContent) {
        const textPreview = item.text || '<em style="color:#9ca3af;">no notes</em>';
        const photoInfo = item.photoCount ? `<span style="color:#3b82f6;">📷 ${item.photoCount}</span>` : '';
        const stdInfo = (item.standards && item.standards.length > 0) ? `<span style="color:#8b5cf6;">📋 ${item.standards.join(', ')}</span>` : '';
        inlineContent = `
          <div id="content_${item._checkId}" style="display:none;margin:6px 0 4px 28px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;line-height:1.5;color:#475569;">
            <div>${textPreview}</div>
            ${(photoInfo || stdInfo) ? `<div style="margin-top:4px;display:flex;gap:10px;font-size:11px;">${photoInfo}${stdInfo}</div>` : ''}
          </div>`;
      }

      // Escape item label for display (prevent XSS from item labels with < or >)
      const displayLabel = (item.severity !== 'proofread' ? item.message : item.itemLabel || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const csPhotoBadge = item.photoCount ? `<span style="display:inline-flex;align-items:center;background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;vertical-align:middle;">📷${item.photoCount}</span>` : '';

      // The row — data-cs-msg used for scroll restoration after Go→Fix→Back
      const escapedMsg = (item.message || '').replace(/"/g, '&quot;');
      html += `
        <div id="row_${item._checkId}" data-cs-msg="${escapedMsg}" style="margin-bottom:4px;${isReviewed ? 'opacity:0.5;' : ''}">
          <div style="background:${sevBg[item.severity]};border:1px solid ${sevBorder[item.severity]};border-radius:8px;padding:8px 10px;display:flex;align-items:flex-start;gap:8px;">
            <input type="checkbox" ${isReviewed ? 'checked' : ''} onchange="window._csToggleReviewed('${item._checkId}', this.checked)"
                   style="flex-shrink:0;margin-top:2px;width:18px;height:18px;accent-color:#006699;cursor:pointer;" />
            ${ratingBadge}
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:#1e293b;line-height:1.4;display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                ${displayLabel}
                ${csPhotoBadge}
                ${hasContent ? `<span onclick="window._csToggleContent('${item._checkId}');event.stopPropagation();" style="cursor:pointer;font-size:11px;color:#64748b;background:#e2e8f0;padding:1px 6px;border-radius:4px;user-select:none;" id="expand_${item._checkId}">▸ details</span>` : ''}
                <span onclick="window._csSkipItem('${item._checkId}');event.stopPropagation();" style="cursor:pointer;font-size:10px;color:#64748b;background:#e2e8f0;padding:1px 6px;border-radius:4px;user-select:none;">skip</span>
              </div>
              ${item.severity === 'proofread' && item.text ? `<div style="font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${(item.text.length > 70 ? item.text.substring(0, 70) + '…' : item.text).replace(/</g, '&lt;')}</div>` : ''}
            </div>
            ${hasTappableItem ? `<button onclick="window._csGoToItem(${idx});event.stopPropagation();" style="flex-shrink:0;background:#006699;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap;">Go ➜</button>` : ''}
          </div>
          ${inlineContent}
        </div>`;
    });

    html += '</div></div>';
  });

  // ── SKIPPED section (collapsible, like Resolved) ────────────────────────
  if (skippedItems.length > 0) {
    html += `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:2px solid #cbd5e1;margin-bottom:8px;cursor:pointer;user-select:none;"
             onclick="(function(){var l=document.getElementById('cs-skipped-list');var c=document.getElementById('cs-skipped-caret');if(!l||!c)return;var open=l.style.display!=='none';l.style.display=open?'none':'block';c.textContent=open?'▸':'▾';})()">
          <span id="cs-skipped-caret" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:22px;color:#64748b;flex-shrink:0;margin-left:-8px;">▸</span>
          <div style="font-weight:700;font-size:15px;color:#64748b;display:flex;align-items:center;gap:6px;flex:1;">
            ⊘ Skipped <span style="font-weight:400;color:#94a3b8;font-size:12px;">(${skippedItems.length})</span>
          </div>
        </div>
        <div id="cs-skipped-list" style="display:none;">
    `;
    skippedItems.forEach(item => {
      const idx = allCheckItems.indexOf(item);
      const hasTappableItem = !!(item.itemLabel || item.navId);
      const displayText = (item.itemLabel || item.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += `
        <div style="margin-bottom:3px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" ${reviewedState[item._checkId] ? 'checked' : ''} onchange="window._csToggleReviewed('${item._checkId}', this.checked)"
                   style="flex-shrink:0;width:16px;height:16px;accent-color:#006699;cursor:pointer;" />
            <div style="flex:1;min-width:0;font-size:12px;color:#64748b;">${displayText}</div>
            ${hasTappableItem ? `<button onclick="window._csGoToItem(${idx});event.stopPropagation();" style="flex-shrink:0;background:#94a3b8;color:white;border:none;border-radius:6px;padding:3px 7px;font-size:10px;cursor:pointer;">Go ➜</button>` : ''}
          </div>
        </div>`;
    });
    html += '</div></div>';
  }

  // ── RESOLVED section ─────────────────────────────────────────────────────
  // Includes: auto-resolved (fixed), force-OK'd, reviewed (checked off), and proofread items
  // Sorted in survey order so items appear in the same sequence as the actual survey
  if (resolvedItems.length > 0) {
    html += `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;padding:8px 0;border-bottom:2px solid #86efac;margin-bottom:8px;cursor:pointer;user-select:none;"
             onclick="(function(){var l=document.getElementById('cs-ok-list');var c=document.getElementById('cs-ok-caret');if(!l||!c)return;var open=l.style.display!=='none';l.style.display=open?'none':'block';c.textContent=open?'▸':'▾';})()">
          <span id="cs-ok-caret" style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;font-size:22px;color:#16a34a;flex-shrink:0;margin-left:-8px;">▸</span>
          <div style="font-weight:700;font-size:15px;color:#16a34a;display:flex;align-items:center;gap:6px;flex:1;">
            ✅ Resolved <span style="font-weight:400;color:#86efac;font-size:12px;">(${resolvedItems.length})</span>
          </div>
        </div>
        <div id="cs-ok-list" style="display:none;">
    `;
    resolvedItems.forEach(item => {
      const ratingChar = item.rating ? String(item.rating).charAt(0) : '';
      const rColor = ratingColors[ratingChar] || '#6b7280';
      const ratingBadge = ratingChar
        ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;color:white;background:${rColor};padding:2px 6px;border-radius:4px;">${ratingChar}</span>`
        : '';
      const resolveTag = item._resolvedBy === 'skipped' ? '⊘ Skipped'
        : item._resolvedBy === 'force' ? '🔓 Force OK'
        : item._resolvedBy === 'proofread' ? '📖 Proofread'
        : item._resolvedBy === 'reviewed' ? '☑ Reviewed'
        : '✅ Fixed';
      const displayText = (item.message || item.itemLabel || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += `
        <div style="margin-bottom:3px;opacity:0.7;">
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:8px;">
            ${ratingBadge}
            <div style="flex:1;min-width:0;font-size:12px;color:#166534;">${displayText}</div>
            <span style="flex-shrink:0;font-size:10px;color:#16a34a;background:#dcfce7;padding:2px 6px;border-radius:4px;">${resolveTag}</span>
          </div>
        </div>`;
    });
    html += '</div></div>';
  }

  // ── DISPLAY FULL-SCREEN OVERLAY ─────────────────────────────────────────
  const existing = document.getElementById('checkSurveyOverlay');
  if (existing) existing.remove();

  // Remove any lingering back button
  const existingBack = document.getElementById('csBackToCheckBtn');
  if (existingBack) existingBack.remove();

  const overlay = document.createElement('div');
  overlay.id = 'checkSurveyOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="flex-shrink:0;background:#006699;color:white;padding:12px 16px calc(12px + env(safe-area-inset-top, 0px)) 16px;display:flex;align-items:center;justify-content:space-between;">
      <h2 style="margin:0;font-size:17px;font-weight:700;">✔ Survey Quality Check</h2>
      <button onclick="document.getElementById('checkSurveyOverlay')?.remove();" style="background:rgba(255,255,255,0.15);color:white;border:none;border-radius:8px;padding:6px 14px;font-size:14px;cursor:pointer;">✕ Close</button>
    </div>
    <div id="csScrollContainer" style="flex:1;overflow-y:auto;padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px;">
      ${html}
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Show floating "Moved to Resolved" notification ──────────────────
  // This floats at the top of the scroll area so it's visible regardless of scroll position
  if (allNewlyResolved.length > 0) {
    const itemList = allNewlyResolved.map(m => {
      const short = m.length > 50 ? m.substring(0, 50) + '…' : m;
      return short.replace(/</g, '&lt;');
    }).join(', ');
    const toast = document.createElement('div');
    toast.id = 'cs-resolved-toast';
    toast.style.cssText = 'position:sticky;top:0;left:0;right:0;background:#166534;color:white;border-radius:10px;padding:10px 14px;z-index:10;box-shadow:0 4px 16px rgba(0,0,0,0.25);display:flex;align-items:center;gap:10px;margin-bottom:10px;animation:csFadeDown 0.35s ease;';
    toast.innerHTML = `
      <span style="font-size:20px;flex-shrink:0;">✅</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13px;">Moved to Resolved</div>
        <div style="font-size:11px;opacity:0.85;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${itemList}</div>
      </div>
      <button onclick="this.parentElement.remove();" style="background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;flex-shrink:0;">✕</button>
    `;
    const scrollContainer = document.getElementById('csScrollContainer');
    if (scrollContainer) {
      scrollContainer.style.position = 'relative';
      scrollContainer.insertBefore(toast, scrollContainer.firstChild);
    }
    // Auto-dismiss after 8 seconds (long enough to read)
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.transition = 'opacity 0.8s, transform 0.8s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 800);
      }
    }, 8000);
    // Add the animation keyframes
    if (!document.getElementById('cs-toast-style')) {
      const style = document.createElement('style');
      style.id = 'cs-toast-style';
      style.textContent = '@keyframes csFadeDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }';
      document.head.appendChild(style);
    }
  }

  // ── Wire up interactive handlers ────────────────────────────────────
  // Toggle reviewed checkbox
  window._csToggleReviewed = function(checkId, checked) {
    reviewedState[checkId] = checked;
    sessionStorage.setItem(checkStateKey, JSON.stringify(reviewedState));
    if (checked) {
      // Item moves to Resolved — show a brief "moving to resolved" flash, then re-render
      const row = document.getElementById('row_' + checkId);
      let nextMsg = null;
      if (row) {
        // Find the next row for scroll target
        let sibling = row.nextElementSibling;
        while (sibling && !sibling.getAttribute('data-cs-msg')) sibling = sibling.nextElementSibling;
        if (sibling) nextMsg = sibling.getAttribute('data-cs-msg');
        // Flash green with "→ Resolved" label so user sees what's happening
        row.style.transition = 'background 0.3s, border-color 0.3s';
        row.style.background = '#dcfce7';
        row.style.borderRadius = '8px';
        const inner = row.querySelector('div');
        if (inner) {
          inner.style.transition = 'background 0.3s, border-color 0.3s';
          inner.style.background = '#dcfce7';
          inner.style.borderColor = '#16a34a';
        }
        // Add a brief "→ Resolved" indicator
        const tag = document.createElement('div');
        tag.style.cssText = 'text-align:center;font-size:12px;font-weight:700;color:#16a34a;padding:4px 0;';
        tag.textContent = '→ Moving to Resolved';
        row.appendChild(tag);
        // Then fade out
        setTimeout(() => {
          row.style.transition = 'opacity 0.5s, transform 0.5s';
          row.style.opacity = '0';
          row.style.transform = 'translateX(30px)';
        }, 600);
      }
      if (nextMsg) window._csScrollTargetMsg = nextMsg;
      // Set the resolved item name for the sticky toast
      // Find the item's display message from its data-cs-msg attribute
      const itemMsg = row ? row.getAttribute('data-cs-msg') : null;
      if (itemMsg) window._csJustResolved = itemMsg;
      setTimeout(async () => {
        document.getElementById('checkSurveyOverlay')?.remove();
        await checkSurvey();
      }, 1200);
    } else {
      // Unchecked — item returns from Resolved to active list, re-render
      const scrollEl = document.getElementById('csScrollContainer');
      const scrollPos = scrollEl ? scrollEl.scrollTop : 0;
      setTimeout(async () => {
        document.getElementById('checkSurveyOverlay')?.remove();
        await checkSurvey();
        const newScroll = document.getElementById('csScrollContainer');
        if (newScroll) newScroll.scrollTop = scrollPos;
      }, 50);
    }
  };

  // Skip item — adds to forceOKState with "skipped" flag, same animation as checkbox
  window._csSkipItem = function(checkId) {
    // Find the matching item from allCheckItems
    const item = allCheckItems.find(it => it._checkId === checkId);
    if (!item) return;

    // Confirmation dialog
    const shortMsg = (item.message || '').length > 60 ? item.message.substring(0, 60) + '…' : item.message;
    if (!confirm(`Skip this item?\n\n"${shortMsg}"\n\nIt will be moved to Resolved as skipped.`)) return;

    // Add to forceOKState
    forceOKState[item.message] = {
      forcedAt: Date.now(),
      itemLabel: item.itemLabel || null,
      reason: 'Skipped by surveyor',
      _surveyOrder: item._surveyOrder ?? 9999,
      skipped: true,
    };
    sessionStorage.setItem(forceKey, JSON.stringify(forceOKState));

    // Animate the row (same green flash + fade as checkbox)
    const row = document.getElementById('row_' + checkId);
    let nextMsg = null;
    if (row) {
      let sibling = row.nextElementSibling;
      while (sibling && !sibling.getAttribute('data-cs-msg')) sibling = sibling.nextElementSibling;
      if (sibling) nextMsg = sibling.getAttribute('data-cs-msg');

      row.style.transition = 'background 0.3s, border-color 0.3s';
      row.style.background = '#dcfce7';
      row.style.borderRadius = '8px';
      const inner = row.querySelector('div');
      if (inner) {
        inner.style.transition = 'background 0.3s, border-color 0.3s';
        inner.style.background = '#dcfce7';
        inner.style.borderColor = '#16a34a';
      }
      const tag = document.createElement('div');
      tag.style.cssText = 'text-align:center;font-size:12px;font-weight:700;color:#16a34a;padding:4px 0;';
      tag.textContent = '→ Skipping — Moving to Resolved';
      row.appendChild(tag);
      setTimeout(() => {
        row.style.transition = 'opacity 0.5s, transform 0.5s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(30px)';
      }, 600);
    }
    if (nextMsg) window._csScrollTargetMsg = nextMsg;
    const itemMsg = row ? row.getAttribute('data-cs-msg') : null;
    if (itemMsg) window._csJustResolved = itemMsg;
    setTimeout(async () => {
      document.getElementById('checkSurveyOverlay')?.remove();
      await checkSurvey();
    }, 1200);
  };

  // Toggle inline content expand/collapse
  window._csToggleContent = function(checkId) {
    const content = document.getElementById('content_' + checkId);
    const btn = document.getElementById('expand_' + checkId);
    if (!content) return;
    const isOpen = content.style.display !== 'none';
    content.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.textContent = isOpen ? '▸ details' : '▾ details';
  };

  // Store all check items so we can evaluate on return
  window._csAllCheckItems = allCheckItems;

  // Smart scroll restoration: scroll to the next item in the list after a resolved one.
  // Uses offsetTop calculation because scrollIntoView doesn't work reliably
  // inside a position:fixed overlay's overflow:auto container.
  window._csRestoreScroll = function(fallbackPixelPos) {
    const container = document.getElementById('csScrollContainer');
    if (!container) return;
    const targetMsg = window._csScrollTargetMsg;
    window._csScrollTargetMsg = null;
    if (targetMsg) {
      // Find the row by data-cs-msg attribute — try exact match first
      let targetRow = null;
      const allRows = container.querySelectorAll('[data-cs-msg]');
      for (const row of allRows) {
        if (row.getAttribute('data-cs-msg') === targetMsg) { targetRow = row; break; }
      }
      if (targetRow) {
        // Calculate offset relative to the scroll container
        const containerRect = container.getBoundingClientRect();
        const rowRect = targetRow.getBoundingClientRect();
        const offsetInContainer = rowRect.top - containerRect.top + container.scrollTop;
        // Centre the item in the visible area
        const centred = offsetInContainer - (container.clientHeight / 2) + (rowRect.height / 2);
        container.scrollTop = Math.max(0, centred);
        // Brief highlight so user sees where they are
        targetRow.style.transition = 'box-shadow 0.3s';
        targetRow.style.boxShadow = '0 0 0 3px #3b82f6';
        setTimeout(() => { targetRow.style.boxShadow = ''; }, 2500);
        return;
      }
    }
    // Fallback: try the next item's message (if current item was resolved and no longer visible)
    const nextMsg = window._csNextScrollMsg;
    window._csNextScrollMsg = null;
    if (nextMsg) {
      const allRows = container.querySelectorAll('[data-cs-msg]');
      for (const row of allRows) {
        if (row.getAttribute('data-cs-msg') === nextMsg) {
          const containerRect = container.getBoundingClientRect();
          const rowRect = row.getBoundingClientRect();
          const offsetInContainer = rowRect.top - containerRect.top + container.scrollTop;
          const centred = offsetInContainer - (container.clientHeight / 2) + (rowRect.height / 2);
          container.scrollTop = Math.max(0, centred);
          row.style.transition = 'box-shadow 0.3s';
          row.style.boxShadow = '0 0 0 3px #3b82f6';
          setTimeout(() => { row.style.boxShadow = ''; }, 2500);
          return;
        }
      }
    }
    // Last resort: pixel position
    if (fallbackPixelPos > 0) container.scrollTop = fallbackPixelPos;
  };

  // Auto-restore scroll if returning from a Go→Fix flow (whether via Back button or
  // via the floating Check Survey button). If _csScrollTargetMsg is set, restore now.
  if (window._csScrollTargetMsg) {
    setTimeout(() => { if (window._csRestoreScroll) window._csRestoreScroll(0); }, 120);
  }

  // If showing a "Just Fixed" transitioning card, animate it away after 2s
  // then re-render with the item properly in Resolved + sticky toast
  if (animateResolve) {
    setTimeout(() => {
      const transItem = document.getElementById('cs-transitioning-item');
      if (transItem) {
        transItem.style.opacity = '0';
        transItem.style.transform = 'translateX(30px)';
      }
      // After the fade-out animation, re-render with toast and scroll to next item
      setTimeout(async () => {
        window._csJustResolved = animateResolve.itemLabel || animateResolve.message;
        window._csScrollTargetMsg = window._csNextScrollMsg || null;
        window._csNextScrollMsg = null;
        document.getElementById('checkSurveyOverlay')?.remove();
        await checkSurvey();
      }, 700);
    }, 2000);
  }

  // Navigate to item by index — uses global _csItemLabels array
  window._csGoToItem = function(idx) {
    const itemLabel = window._csItemLabels[idx];
    const navId = window._csItemNavIds[idx];
    const checkId = window._csCheckIds[idx];
    if (!itemLabel && !navId) return;

    // Store the issue we're working on so we can evaluate when returning
    const workingItem = allCheckItems[idx];
    window._csWorkingOn = {
      idx: idx,
      itemLabel: itemLabel,
      navId: navId,
      checkId: checkId,
      severity: workingItem ? workingItem.severity : null,
      category: workingItem ? workingItem.category : null,
      message: workingItem ? workingItem.message : null,
      _surveyOrder: workingItem ? workingItem._surveyOrder : 9999,
    };

    // Remember scroll position AND the next item's message for smart scroll restoration
    const scrollEl = document.getElementById('csScrollContainer');
    const scrollPos = scrollEl ? scrollEl.scrollTop : 0;
    // Scroll to the CURRENT item first (so the user sees it highlighted as "Fixed!")
    // then after the animation, scroll to the NEXT item
    window._csScrollTargetMsg = workingItem ? workingItem.message : null;
    window._csNextScrollMsg = null;
    const sortedActive = allCheckItems.filter(it => !forceOKState[it.message] && !reviewedState[it._checkId]);
    const myIdx = sortedActive.findIndex(it => it === workingItem);
    if (myIdx >= 0 && myIdx + 1 < sortedActive.length) {
      window._csNextScrollMsg = sortedActive[myIdx + 1].message;
    } else if (myIdx >= 0 && myIdx - 1 >= 0) {
      window._csNextScrollMsg = sortedActive[myIdx - 1].message;
    }

    // Helper: create and append the floating Back button
    function _csShowBackButton() {
      let backBtn = document.getElementById('csBackToCheckBtn');
      if (backBtn) backBtn.remove();
      backBtn = document.createElement('button');
      backBtn.id = 'csBackToCheckBtn';
      backBtn.textContent = '← Back to Check Survey';
      backBtn.style.cssText = 'position:fixed;top:calc(12px + env(safe-area-inset-top, 0px));left:50%;transform:translateX(-50%);background:#006699;color:white;border:none;border-radius:20px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;z-index:200;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
      backBtn.onclick = async function() {
        backBtn.remove();
        await _csEvaluateAndReturn(scrollPos);
      };
      document.body.appendChild(backBtn);
    }

    // Helper: safely remove the overlay (with a brief delay to prevent iOS ghost-clicks)
    function _csRemoveOverlay() {
      const ov = document.getElementById('checkSurveyOverlay');
      if (ov) {
        ov.style.pointerEvents = 'none';
        ov.style.opacity = '0';
        ov.style.transition = 'opacity 0.15s';
        setTimeout(() => ov.remove(), 200);
      }
    }

    // Determine navigation strategy
    if (itemLabel) {
      // Checklist item — lives in the inspection view (already visible underneath)
      _csRemoveOverlay();
      _csShowBackButton();
      setTimeout(() => {
        let el = null;
        // 1. Try compact-item-wrapper (regular checklist items)
        const allWrappers = document.querySelectorAll('.compact-item-wrapper');
        for (const w of allWrappers) {
          if (w.getAttribute('data-item-label') === itemLabel) { el = w; break; }
        }
        // 2. Try rated-item elements
        if (!el) {
          const ratedItems = document.querySelectorAll('.rated-item');
          for (const w of ratedItems) {
            if (w.getAttribute('data-item-label') === itemLabel) { el = w; break; }
          }
        }
        // 3. Try area photo sections (media items like "Cabin and conveniences photos")
        if (!el) {
          const sanitized = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
          el = document.getElementById('area-photo-wrap-' + sanitized);
        }
        if (el) {
          _csExpandAccordionAndScroll(el);
        }
      }, 250);
    } else if (navId) {
      // Header/engine/valuation/photo field — lives in the Edit Intro view
      // KEEP the overlay visible while editSurveyDetails loads (prevents iOS ghost-clicks
      // on the inspection view's back button during the async transition)
      editSurveyDetails(currentSurveyId);

      // Watch the DOM for the target element to appear
      // Try: getElementById first, then data-photo-field attribute, then data-section attribute
      const observer = new MutationObserver((mutations, obs) => {
        let el = document.getElementById(navId);
        if (!el) el = document.querySelector(`[data-photo-field="${navId}"]`);
        if (!el) el = document.querySelector(`[data-section="${navId}"]`);
        if (el) {
          obs.disconnect();
          // NOW remove the overlay — the edit form is ready underneath
          _csRemoveOverlay();
          // Add Back button now that the edit view has rendered
          _csShowBackButton();

          // Expand any collapsed parent section
          const section = el.closest('[style*="display: none"], [style*="display:none"]');
          if (section) section.style.display = 'block';

          // Small delay for layout, then scroll and highlight
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const highlightEl = el.closest('.form-group') || el.closest('div') || el;
            highlightEl.style.transition = 'background 0.3s, box-shadow 0.3s';
            highlightEl.style.background = '#fef3c7';
            highlightEl.style.boxShadow = '0 0 0 3px #f59e0b';
            setTimeout(() => { highlightEl.style.background = ''; highlightEl.style.boxShadow = ''; }, 4000);
            if (['INPUT','SELECT','TEXTAREA'].includes(el.tagName)) el.focus();
          }, 150);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Safety: if element never appears after 5s, disconnect and remove overlay
      setTimeout(() => {
        observer.disconnect();
        _csRemoveOverlay();
        if (!document.getElementById('csBackToCheckBtn')) {
          _csShowBackButton();
        }
      }, 5000);
    }
  };
}

// ─── Helper: expand accordion and scroll to element ──────────────────────
function _csExpandAccordionAndScroll(el) {
  const accordion = el.closest('.category-accordion');
  if (accordion) {
    const content = accordion.querySelector('.accordion-content');
    if (content && content.style.display === 'none') {
      document.querySelectorAll('.accordion-content').forEach(ac => {
        if (ac !== content && ac.style.display !== 'none') {
          ac.style.display = 'none';
          const hdr = ac.parentElement.querySelector('.accordion-header');
          const chev = hdr?.querySelector('.accordion-chevron');
          if (chev) chev.textContent = '▸';
        }
      });
      content.style.display = 'block';
      const header = accordion.querySelector('.accordion-header');
      const chevron = header?.querySelector('.accordion-chevron');
      if (chevron) chevron.textContent = '▾';
      const titleSpan = header?.querySelector('.category-title');
      if (titleSpan && typeof _openAccordionCategory !== 'undefined') {
        _openAccordionCategory = titleSpan.textContent.replace(/^[^\w]*/, '').trim();
      }
      if (typeof updateCollapseButton === 'function') updateCollapseButton(true);
    }
  }
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'background 0.3s, box-shadow 0.3s';
    el.style.background = '#fef3c7';
    el.style.boxShadow = '0 0 0 3px #f59e0b';
    setTimeout(() => { el.style.background = ''; el.style.boxShadow = ''; }, 3000);
  }, 50);
}

// ─── "Items left" inline popover ─────────────────────────────────────────
// Tapping the "N left" progress text in a category header toggles an
// inline list of the items that are still unrated (and not skipped) for
// that category. Each label is a tappable link that expands the accordion
// and scrolls to the item with the same highlight animation used by the
// Check function, so the surveyor can fill it out.
async function toggleRemainingList(btn) {
  try {
    const accordion = btn.closest('.category-accordion');
    if (!accordion) return;

    // Toggle: if popover already open, close it
    const existing = accordion.querySelector('.remaining-list-popover');
    if (existing) {
      const trigger = accordion.querySelector('.remaining-btn');
      if (trigger) trigger.innerHTML = trigger.innerHTML.replace(/▴/, '▾');
      existing.remove();
      return;
    }

    // Close any other open popovers first (one-at-a-time UX)
    document.querySelectorAll('.remaining-list-popover').forEach(p => p.remove());
    document.querySelectorAll('.remaining-btn').forEach(b => {
      b.innerHTML = b.innerHTML.replace(/▴/, '▾');
    });

    // Collect unrated (and non-skipped) items from the accordion's wrappers
    const survey = await getSurvey(currentSurveyId);
    if (!survey || !survey.items) return;
    const wrappers = accordion.querySelectorAll('.compact-item-wrapper');
    const remainingLabels = [];
    wrappers.forEach(w => {
      const lbl = w.getAttribute('data-item-label');
      if (!lbl) return;
      const data = survey.items[lbl];
      const isRated = !!(data && data.rating);
      const isExcluded = !!(data && data.excluded);
      if (!isRated && !isExcluded) {
        remainingLabels.push(lbl);
      }
    });
    if (remainingLabels.length === 0) return;

    // Build the popover
    const popover = document.createElement('div');
    popover.className = 'remaining-list-popover';
    popover.style.cssText = 'padding:8px 14px 10px 28px;background:#fef9f9;border-top:1px solid #fecaca;border-bottom:1px solid #fecaca;font-size:13px;';
    const linksHtml = remainingLabels.map(lbl => {
      const safe = String(lbl).replace(/"/g, '&quot;');
      const display = String(lbl).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<a href="#" role="button"
                 onclick="event.preventDefault(); event.stopPropagation(); jumpToChecklistItem(this.getAttribute('data-item-label')); return false;"
                 data-item-label="${safe}"
                 style="display:block;color:#006699;text-decoration:underline;padding:6px 0;min-height:32px;line-height:20px;">• ${display}</a>`;
    }).join('');
    popover.innerHTML = `
      <div style="color:#991b1b;font-weight:600;margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">
        Items left — tap to fill out
      </div>
      <div>${linksHtml}</div>
    `;
    // Flip caret on the trigger
    btn.innerHTML = btn.innerHTML.replace(/▾/, '▴');

    // Insert just after the accordion header so it stays visible even
    // when the accordion content is collapsed.
    const header = accordion.querySelector('.accordion-header');
    if (header) {
      header.insertAdjacentElement('afterend', popover);
    }
  } catch (err) {
    console.error('toggleRemainingList failed', err);
  }
}

function jumpToChecklistItem(itemLabel) {
  if (!itemLabel) return;
  // Close any open popover first
  document.querySelectorAll('.remaining-list-popover').forEach(p => p.remove());
  document.querySelectorAll('.remaining-btn').forEach(b => {
    b.innerHTML = b.innerHTML.replace(/▴/, '▾');
  });
  // Locate the target wrapper
  let el = null;
  const wrappers = document.querySelectorAll('.compact-item-wrapper');
  for (const w of wrappers) {
    if (w.getAttribute('data-item-label') === itemLabel) { el = w; break; }
  }
  if (!el) {
    // Fallback: try rated-item (safety equipment etc.)
    const rated = document.querySelectorAll('.rated-item');
    for (const w of rated) {
      if (w.getAttribute('data-item-label') === itemLabel) { el = w; break; }
    }
  }
  if (el) _csExpandAccordionAndScroll(el);
}

// ─── Evaluate fix and return to Check Survey ──────────────────────────────
async function _csEvaluateAndReturn(scrollPos) {
  const working = window._csWorkingOn;

  // If we navigated to the Edit Intro view, save form to DB and return to inspection
  if (currentView === 'edit-survey' || currentView === 'new-survey') {
    await saveEditFormSilently();
    const survey = await getSurvey(currentSurveyId);
    if (survey) renderInspection(survey);
    await new Promise(r => setTimeout(r, 100));
  }

  if (!working || (!working.itemLabel && !working.navId)) {
    // No specific issue tracked — just reopen Check Survey
    await checkSurvey();
    setTimeout(() => { if (window._csRestoreScroll) window._csRestoreScroll(scrollPos); }, 80);
    return;
  }

  // Re-read the survey to get current state
  const survey = await getSurvey(currentSurveyId);
  if (!survey) { await checkSurvey(); return; }

  const data = survey.items ? survey.items[working.itemLabel] : null;
  const result = _csCheckSingleIssue(working, data, survey);

  if (result.fixed) {
    // Mark as resolved in sessionStorage
    const resolvedKey = `checkSurvey_resolved_${currentSurveyId}`;
    let resolved = {};
    try { resolved = JSON.parse(sessionStorage.getItem(resolvedKey) || '{}'); } catch(e) {}
    resolved[working.message] = { fixedAt: Date.now(), itemLabel: working.itemLabel, _surveyOrder: working._surveyOrder ?? 9999 };
    sessionStorage.setItem(resolvedKey, JSON.stringify(resolved));

    // Set animation flag — checkSurvey will show a green "Fixed!" card on the item
    // before moving it to the Resolved section
    window._csAnimateResolve = {
      message: working.message,
      itemLabel: working.itemLabel || working.message,
    };
    // Scroll target is the fixed item itself (already stored by _csGoToItem)
    if (!window._csScrollTargetMsg) window._csScrollTargetMsg = working.message;
    window._csWorkingOn = null;

    // Reopen Check Survey — the animation flag shows "Fixed!" card first
    await checkSurvey();
    setTimeout(() => { if (window._csRestoreScroll) window._csRestoreScroll(scrollPos); }, 120);
  } else {
    // Show evaluation modal with reason + options
    _csShowEvalModal(working, result.reason, scrollPos);
  }
}

// ─── Check whether a single issue is resolved ────────────────────────────
function _csCheckSingleIssue(issue, data, survey) {
  const cat = issue.category;
  const msg = issue.message || '';

  // Checklist Completion — item was unrated
  if (cat === 'Checklist Completion' || msg.startsWith('Unrated:')) {
    if (data && data.rating && data.rating !== '') return { fixed: true };
    return { fixed: false, reason: 'No rating selected yet. Tap a rating (A/B/C/NT/NA) to resolve.' };
  }

  // Missing Notes — A or B rated without text
  if (cat === 'Missing Notes') {
    if (data && data.text && data.text.trim() !== '') return { fixed: true };
    return { fixed: false, reason: 'Item is rated but still has no notes. Tap "Add note" and enter inspection findings.' };
  }

  // Unreplaced Placeholders
  if (cat === 'Unreplaced Placeholders') {
    if (!data || !data.text) return { fixed: true };
    const patterns = [/\[describe[^\]]*\]/i, /\[specify[^\]]*\]/i, /\[insert[^\]]*\]/i, /\{specify:[^}]*\}/, /\{any:[^}]*\}/];
    for (const p of patterns) {
      const m = data.text.match(p);
      if (m) return { fixed: false, reason: `Text still contains placeholder: "${m[0]}". Replace it with actual details.` };
    }
    return { fixed: true };
  }

  // Thoroughness — B-rated no recommendation
  if (cat === 'Thoroughness' && msg.includes('no clear recommendation')) {
    if (data && data.text && /recommend|should|advise|suggest|replace|repair|service|address|correct|attention/i.test(data.text))
      return { fixed: true };
    return { fixed: false, reason: 'B-rated item still lacks a recommendation. Add words like "recommend", "should", "replace", or "repair" to the notes.' };
  }

  // Thoroughness — Safety item without standard
  if (cat === 'Thoroughness' && msg.includes('without a standard')) {
    if (data && data.standards && data.standards.length > 0) return { fixed: true };
    return { fixed: false, reason: 'Safety item still has no standard reference. Check an ABYC or TC standard checkbox.' };
  }

  // Skipped Items / Skipped Sections — these are acknowledgements only, always considered "handled"
  if (cat === 'Skipped Items' || cat === 'Skipped Sections') {
    return { fixed: true };
  }

  // Grammar & Spelling
  if (cat === 'Grammar & Spelling') {
    if (!data || !data.text) return { fixed: true };
    const t = data.text;
    if (msg.includes('Double spaces') && !/  +/.test(t)) return { fixed: true };
    if (msg.includes('punctuation') && /[.!?:;]$/.test(t.trim())) return { fixed: true };
    if (msg.includes('Canadian spelling')) {
      const americanisms = [
        [/\bfiberglass\b/i, 'fiberglass'], [/\bcolor\b/i, 'color'], [/\bcenter\b/i, 'center'],
        [/\banalyze\b/i, 'analyze'], [/\bgalvanize\b/i, 'galvanize'], [/\bmold\b/i, 'mold'],
        [/\bgray\b/i, 'gray'], [/\blicense\b/i, 'license'],
      ];
      const offender = americanisms.find(([pat]) => pat.test(t));
      if (!offender) return { fixed: true };
      return { fixed: false, reason: `Text still contains "${offender[1]}". Use Canadian spelling.` };
    }
    if (msg.includes('lowercase') && !/\.\s+[a-z]/.test(t)) return { fixed: true };
    return { fixed: false, reason: 'Grammar/spelling issue may still be present. Review the text.' };
  }

  // Proofread — always "fixed" once reviewed (it's just a review prompt)
  if (issue.severity === 'proofread') {
    return { fixed: true };
  }

  // Header field issues (engineMake, etc.) — check survey-level fields by navId
  if (cat === 'Header Fields' || cat === 'Engine & Transmission' || cat === 'Valuation' || cat === 'Documentation') {
    const navId = issue.navId;
    if (navId && survey[navId] && String(survey[navId]).trim() !== '' && survey[navId] !== 'Select') {
      return { fixed: true };
    }
    // Also check directly by navId as a survey field name
    if (navId && survey[navId] && String(survey[navId]).trim() !== '' && survey[navId] !== 'Select') {
      return { fixed: true };
    }
    return { fixed: false, reason: msg + '. Fill in this field, or Force OK if not applicable.' };
  }

  // Documentation Photos
  if (cat === 'Documentation Photos') {
    const photoFieldMap = { hinPhotoStatus: 'hinPhoto', compliancePhotoStatus: 'compliancePhoto', coverPhotoStatus: 'coverPhoto', tcLicense: 'licencePhoto' };
    const navId = issue.navId;
    if (navId && photoFieldMap[navId]) {
      if (survey[photoFieldMap[navId]]) return { fixed: true };
      return { fixed: false, reason: 'Photo not yet captured. Tap the camera button to add it.' };
    }
    return { fixed: false, reason: msg };
  }

  // Default — can't determine; let user decide
  return { fixed: false, reason: msg };
}

// ─── Show evaluation result modal ─────────────────────────────────────────
function _csShowEvalModal(working, reason, scrollPos) {
  // Remove any existing modal
  document.getElementById('csEvalModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'csEvalModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div onclick="event.stopPropagation();" style="background:white;border-radius:16px;max-width:400px;width:100%;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,0.3);">
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:40px;margin-bottom:8px;">⚠️</div>
        <h3 style="margin:0 0 4px;font-size:17px;color:#1e293b;">Not yet resolved</h3>
        <div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:8px;">${(working.itemLabel || '').replace(/</g, '&lt;')}</div>
      </div>
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:12px;margin-bottom:20px;font-size:13px;color:#991b1b;line-height:1.5;">
        ${reason.replace(/</g, '&lt;')}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button id="csEvalGoBack" style="width:100%;padding:12px;background:#006699;color:white;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">
          ← Go back and fix
        </button>
        <button id="csEvalForceOK" style="width:100%;padding:12px;background:white;color:#64748b;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;">
          ✓ Force OK — mark as acceptable
        </button>
        <button id="csEvalCancel" style="width:100%;padding:10px;background:none;color:#94a3b8;border:none;font-size:13px;cursor:pointer;">
          Return to Check Survey without resolving
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Go back to the item
  document.getElementById('csEvalGoBack').onclick = function() {
    modal.remove();
    // Re-navigate to the same item
    window._csGoToItem(working.idx);
  };

  // Force OK
  document.getElementById('csEvalForceOK').onclick = async function() {
    modal.remove();
    const forceKey = `checkSurvey_forceOK_${currentSurveyId}`;
    let forceOK = {};
    try { forceOK = JSON.parse(sessionStorage.getItem(forceKey) || '{}'); } catch(e) {}
    forceOK[working.message] = { forcedAt: Date.now(), itemLabel: working.itemLabel, reason: reason, _surveyOrder: working._surveyOrder ?? 9999 };
    sessionStorage.setItem(forceKey, JSON.stringify(forceOK));
    showToast('✓ Marked as OK: ' + (working.itemLabel || working.message));
    window._csJustResolved = working.itemLabel || working.message;
    window._csWorkingOn = null;
    await checkSurvey();
    setTimeout(() => { if (window._csRestoreScroll) window._csRestoreScroll(scrollPos); }, 80);
  };

  // Just return to Check Survey
  document.getElementById('csEvalCancel').onclick = async function() {
    modal.remove();
    window._csWorkingOn = null;
    await checkSurvey();
    setTimeout(() => { if (window._csRestoreScroll) window._csRestoreScroll(scrollPos); }, 80);
  };

  // Close on backdrop tap
  modal.onclick = function() {
    // Don't auto-close — user must pick an option
  };
}

// Save comparables from the inspection view
function saveComparablesFromInspection() {
  getSurvey(currentSurveyId).then(survey => {
    survey.comparables = collectComparables();
    // Also save valuation fields if they exist in the inspection view
    const lowEl = document.getElementById('inspValLow');
    const highEl = document.getElementById('inspValHigh');
    const condEl = document.getElementById('inspCondition');
    if (lowEl) survey.valuationLow = lowEl.value;
    if (highEl) survey.valuationHigh = highEl.value;
    if (condEl) survey.overallCondition = condEl.value;
    saveSurvey(survey).then(() => {
      showToast('Valuation & comparables saved');
    });
  });
}

// Save valuation fields from inspection view
async function saveValuationFromInspection() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  const lowEl = document.getElementById('inspValLow');
  const highEl = document.getElementById('inspValHigh');
  const condEl = document.getElementById('inspCondition');
  if (lowEl) survey.valuationLow = lowEl.value;
  if (highEl) survey.valuationHigh = highEl.value;
  if (condEl) survey.overallCondition = condEl.value;
  await saveSurvey(survey);
  showToast('Valuation saved');
}

// Safety equipment interaction functions
async function toggleSafetyItem(idx, checked) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.safetyEquipment[idx]) return;
  survey.safetyEquipment[idx].checked = checked;
  await saveSurvey(survey);
  // Remember scroll position and which accordion was open
  const scrollY = window.scrollY;
  _openAccordionCategory = '🛡️ Safety Equipment (TC TP 511)';
  renderInspection(survey);
  // Restore scroll position after re-render
  requestAnimationFrame(() => { window.scrollTo(0, scrollY); });
}

async function updateSafetyNote(idx, note) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.safetyEquipment[idx]) return;
  survey.safetyEquipment[idx].notes = note;
  await saveSurvey(survey);
}

// Predefined additional safety items not in TC TP 511 standard list
const ADDITIONAL_SAFETY_ITEMS = [
  'EPIRB (Emergency Position Indicating Radio Beacon)',
  'Life raft',
  'Axe / hatchet',
  'Radar reflector',
  'First aid kit',
  'Dye markers',
  'Sea anchor / drogue',
  'Jacklines and tethers',
  'Man overboard module (MOM)',
  'AIS transponder',
  'Immersion suit(s)',
  'Smoke signals'
];

// Toggle a predefined additional safety item via checkbox
async function toggleAdditionalSafetyItem(checkbox) {
  const name = checkbox.value;
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  if (checkbox.checked) {
    // Add item
    survey.safetyEquipment.push({
      name: name,
      category: 'Additional Equipment',
      requirement: 'N/A',
      checked: false,
      notes: '',
      photos: [],
      custom: true
    });
    await saveSurvey(survey);
    renderInspection(survey);
    showToast('Added: ' + name);
  } else {
    // Remove item
    const idx = survey.safetyEquipment.findIndex(e => e.custom && e.name === name);
    if (idx >= 0) {
      survey.safetyEquipment.splice(idx, 1);
      await saveSurvey(survey);
      renderInspection(survey);
      showToast('Removed: ' + name);
    }
  }
}

// Add a custom typed safety equipment item (the "Other" field)
async function addCustomSafetyItem() {
  const nameInput = document.getElementById('customSafetyOther');
  if (!nameInput || !nameInput.value.trim()) return;
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  survey.safetyEquipment.push({
    name: nameInput.value.trim(),
    category: 'Additional Equipment',
    requirement: 'N/A',
    checked: false,
    notes: '',
    photos: [],
    custom: true
  });
  await saveSurvey(survey);
  renderInspection(survey);
  showToast('Added: ' + nameInput.value.trim());
}

// Remove a custom safety equipment item
async function removeCustomSafetyItem(idx) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.safetyEquipment[idx]) return;
  const name = survey.safetyEquipment[idx].name;
  survey.safetyEquipment.splice(idx, 1);
  await saveSurvey(survey);
  renderInspection(survey);
  showToast('Removed: ' + name);
}

// Capture photo for a safety equipment item
async function captureSafetyPhoto(idx) {
  if (window._safetyPhotoBusy) return;
  window._safetyPhotoBusy = true;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;  // allow multiple selection from camera roll
  // No capture attribute — allows camera roll, files, or camera
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) { window._safetyPhotoBusy = false; return; }

    showToast(`Saving ${files.length} photo${files.length > 1 ? 's' : ''}...`);

    const survey = await getSurvey(currentSurveyId);
    if (!survey || !survey.safetyEquipment[idx]) { window._safetyPhotoBusy = false; return; }

    if (!survey.safetyEquipment[idx].photos) {
      survey.safetyEquipment[idx].photos = [];
    }

    // Process ALL selected files sequentially
    let saved = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (re) => resolve(re.target.result);
          reader.onerror = () => reject(new Error('Read failed'));
          reader.readAsDataURL(file);
        });
        const stampedDataUrl = await addDateStampToPhoto(dataUrl, 2048);
        const photoId = `safety_${currentSurveyId}_${idx}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
        const photo = {
          id: photoId,
          surveyId: currentSurveyId,
          itemLabel: `safety_eq_${idx}`,
          dataUrl: stampedDataUrl,
          annotated: false,
          createdAt: new Date().toISOString()
        };
        await savePhoto(photo);
        survey.safetyEquipment[idx].photos.push(photoId);
        saved++;
      } catch (err) {
        console.error('Safety photo save failed', err);
      }
    }
    await saveSurvey(survey);
    showToast(`${saved} photo${saved !== 1 ? 's' : ''} saved`);
    loadSafetyThumbnails(idx, survey.safetyEquipment[idx].photos);
    window._safetyPhotoBusy = false;
  };
  setCameraActive(true);
  input.click();
  // Release lock if user cancels the camera
  setTimeout(() => { window._safetyPhotoBusy = false; }, 60000);
}

// Load thumbnails for a safety equipment item — with view/delete buttons
async function loadSafetyThumbnails(idx, photoIds) {
  const container = document.getElementById(`safety-thumbs-${idx}`);
  if (!container || !photoIds || photoIds.length === 0) {
    if (container) container.innerHTML = '';
    return;
  }
  let thumbsHtml = '';
  for (const pid of photoIds) {
    const photo = await getPhotoById(pid);
    if (photo) {
      thumbsHtml += `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;margin-right:8px;margin-bottom:6px;">
        <img src="${photo.dataUrl}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:2px solid #2563eb;cursor:pointer;" onclick="viewSafetyPhoto('${pid}')" />
        <button onclick="deleteSafetyPhoto(${idx}, '${pid}')" style="background:#dc2626;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;font-weight:500;">Delete</button>
      </div>`;
    }
  }
  container.innerHTML = thumbsHtml;
}

// View a safety photo full-screen
function viewSafetyPhoto(photoId) {
  getPhotoById(photoId).then(photo => {
    if (!photo) return;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<img src="${photo.dataUrl}" style="max-width:95%;max-height:90%;object-fit:contain;border-radius:8px;" />
      <button style="position:absolute;top:20px;right:20px;background:white;border:none;border-radius:50%;width:36px;height:36px;font-size:20px;cursor:pointer;font-weight:bold;">✕</button>`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
  });
}

// Delete a single safety equipment photo
async function deleteSafetyPhoto(idx, photoId) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.safetyEquipment[idx]) return;
  // Remove from photos array
  survey.safetyEquipment[idx].photos = (survey.safetyEquipment[idx].photos || []).filter(p => p !== photoId);
  await saveSurvey(survey);
  // Delete photo from IndexedDB
  try { await deletePhoto(photoId); } catch(e) { /* ignore */ }
  // Refresh thumbnails
  loadSafetyThumbnails(idx, survey.safetyEquipment[idx].photos);
  showToast('Photo deleted');
}

// Load all safety thumbnails after rendering
async function loadAllSafetyThumbnails() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.safetyEquipment) return;
  survey.safetyEquipment.forEach((eq, idx) => {
    if (eq.photos && eq.photos.length > 0) {
      loadSafetyThumbnails(idx, eq.photos);
    }
  });
}

// ── Instruments & Electronics Functions ─────────────────────────────────

// Rapid capture — camera keeps reopening until user cancels
function rapidCaptureInstruments() {
  let count = 0;

  function takeNext() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) {
        // User cancelled — done
        if (count > 0) {
          showToast(`${count} instrument${count > 1 ? 's' : ''} captured — review below`);
          const survey = await getSurvey(currentSurveyId);
          if (survey) renderInspection(survey);
        }
        return;
      }

      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (re) => {
        const stampedDataUrl = await addDateStampToPhoto(re.target.result, 2048);
        const survey = await getSurvey(currentSurveyId);
        if (!survey) return;
        if (!survey.instrumentsElectronics) survey.instrumentsElectronics = [];

        const idx = survey.instrumentsElectronics.length;
        const photoId = `instrument_${currentSurveyId}_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const photo = {
          id: photoId,
          surveyId: currentSurveyId,
          itemLabel: `instrument_${idx}`,
          dataUrl: stampedDataUrl,
          annotated: false,
          createdAt: new Date().toISOString()
        };
        await savePhoto(photo);

        survey.instrumentsElectronics.push({
          name: '',
          make: '',
          model: '',
          year: '',
          working: null,
          notes: '',
          photos: [photoId],
          aiIdentified: false,
          aiDetails: ''
        });
        await saveSurvey(survey);
        count++;
        showToast(`Photo ${count} saved — take next or cancel to finish`);

        // Immediately reopen camera for next shot
        setTimeout(() => takeNext(), 300);
      };
      reader.readAsDataURL(file);
    };
    setCameraActive(true);
    input.click();
  }

  showToast('Rapid capture: take photos, cancel when done');
  takeNext();
}

// Add instrument by taking a photo first
async function addInstrumentByPhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;  // allow multiple selection from camera roll — creates one instrument per photo
  // No capture attribute — allows camera roll, files, or camera
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    showToast('Saving photo...');

    const survey = await getSurvey(currentSurveyId);
    if (!survey) return;
    if (!survey.instrumentsElectronics) survey.instrumentsElectronics = [];

    for (const file of files) {
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (re) => {
          const stampedDataUrl = await addDateStampToPhoto(re.target.result, 2048);
          const idx = survey.instrumentsElectronics.length;
          const photoId = `instrument_${currentSurveyId}_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const photo = {
            id: photoId,
            surveyId: currentSurveyId,
            itemLabel: `instrument_${idx}`,
            dataUrl: stampedDataUrl,
            annotated: false,
            createdAt: new Date().toISOString()
          };
          await savePhoto(photo);

          survey.instrumentsElectronics.push({
            name: '',
            make: '',
            model: '',
            year: '',
            working: null,
            notes: '',
            photos: [photoId],
            aiIdentified: false,
            aiDetails: ''
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    await saveSurvey(survey);
    showToast('Instrument added — tap Identify to auto-fill details');
    renderInspection(survey);
  };
  setCameraActive(true);
  input.click();
}

// Add instrument manually (no photo)
async function addInstrumentManual() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  if (!survey.instrumentsElectronics) survey.instrumentsElectronics = [];
  survey.instrumentsElectronics.push({
    name: '',
    make: '',
    model: '',
    year: '',
    working: null,
    notes: '',
    photos: [],
    aiIdentified: false,
    aiDetails: ''
  });
  await saveSurvey(survey);
  renderInspection(survey);
  showToast('Enter instrument details manually');
}

// Remove an instrument
async function removeInstrument(idx) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics || !survey.instrumentsElectronics[idx]) return;
  const name = survey.instrumentsElectronics[idx].name || 'Unidentified device';
  // Delete associated photos
  const photos = survey.instrumentsElectronics[idx].photos || [];
  for (const pid of photos) {
    try { await deletePhoto(pid); } catch(e) {}
  }
  survey.instrumentsElectronics.splice(idx, 1);
  await saveSurvey(survey);
  renderInspection(survey);
  showToast('Removed: ' + name);
}

// Update working status
async function updateInstrumentWorking(idx, value) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics || !survey.instrumentsElectronics[idx]) return;
  if (value === 'true') survey.instrumentsElectronics[idx].working = true;
  else if (value === 'false') survey.instrumentsElectronics[idx].working = false;
  else survey.instrumentsElectronics[idx].working = null;
  await saveSurvey(survey);
  // Update border colour inline without full re-render
  renderInspection(survey);
}

// Update a text field on an instrument
async function updateInstrumentField(idx, field, value) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics || !survey.instrumentsElectronics[idx]) return;
  survey.instrumentsElectronics[idx][field] = value;
  await saveSurvey(survey);
}

// Capture additional photo(s) for an existing instrument
async function captureInstrumentPhoto(idx) {
  if (window._instrPhotoBusy) return;
  window._instrPhotoBusy = true;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;  // allow multiple selection from camera roll
  // No capture attribute — allows camera roll, files, or camera
  input.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) { window._instrPhotoBusy = false; return; }

    showToast(`Saving ${files.length} photo${files.length > 1 ? 's' : ''}...`);
    const survey = await getSurvey(currentSurveyId);
    if (!survey || !survey.instrumentsElectronics || !survey.instrumentsElectronics[idx]) { window._instrPhotoBusy = false; return; }

    if (!survey.instrumentsElectronics[idx].photos) {
      survey.instrumentsElectronics[idx].photos = [];
    }

    // Process ALL selected files sequentially
    let saved = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (re) => resolve(re.target.result);
          reader.onerror = () => reject(new Error('Read failed'));
          reader.readAsDataURL(file);
        });
        const stampedDataUrl = await addDateStampToPhoto(dataUrl, 2048);
        const photoId = `instrument_${currentSurveyId}_${idx}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
        const photo = {
          id: photoId,
          surveyId: currentSurveyId,
          itemLabel: `instrument_${idx}`,
          dataUrl: stampedDataUrl,
          annotated: false,
          createdAt: new Date().toISOString()
        };
        await savePhoto(photo);
        survey.instrumentsElectronics[idx].photos.push(photoId);
        saved++;
      } catch (err) {
        console.error('Instrument photo save failed', err);
      }
    }
    await saveSurvey(survey);
    showToast(`${saved} photo${saved !== 1 ? 's' : ''} saved`);
    loadInstrumentThumbnails(idx, survey.instrumentsElectronics[idx].photos);
    window._instrPhotoBusy = false;
  };
  setCameraActive(true);
  input.click();
  setTimeout(() => { window._instrPhotoBusy = false; }, 60000);
}

// AI identification using Google Gemini API
async function identifyInstrument(idx) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics || !survey.instrumentsElectronics[idx]) {
    console.error('Survey or instrument not found at index', idx);
    showToast('Instrument not found');
    return;
  }

  const item = survey.instrumentsElectronics[idx];
  if (!item.photos || item.photos.length === 0) {
    showToast('Take a photo first, then tap Identify');
    return;
  }

  // Get API key from localStorage
  let apiKey = localStorage.getItem('geminiApiKey');
  if (!apiKey) {
    const key = prompt('AI identification requires a free Google Gemini API key.\n\nGet one at aistudio.google.com, then paste it here:');
    if (key && key.trim()) {
      localStorage.setItem('geminiApiKey', key.trim());
      showToast('API key saved — identifying...');
      return identifyInstrument(idx);
    }
    showToast('No API key entered — fill in details manually');
    return;
  }

  // Get the first photo's data URL and resize for API
  const photo = await getPhotoById(item.photos[0]);
  if (!photo || !photo.dataUrl) {
    console.error('Could not load photo', item.photos[0]);
    showToast('Could not load photo');
    return;
  }

  showToast('Identifying instrument...');
  const debugKey = apiKey.substring(0, 8) + '...';

  try {
    // Resize image to max 1024px to keep API request small
    const resizedDataUrl = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1024;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (canvasErr) {
          reject(new Error('Canvas resize failed: ' + canvasErr.message));
        }
      };
      img.onerror = () => reject(new Error('Could not load image for resizing'));
      img.src = photo.dataUrl;
    });

    // Extract base64 data from data URL
    const base64Match = resizedDataUrl.match(/^data:image\/(.*?);base64,(.*)$/);
    if (!base64Match) throw new Error('Regex failed on resized image. Starts with: ' + resizedDataUrl.substring(0, 40));
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];
    const payloadSizeKB = Math.round(base64Data.length / 1024);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `You are a marine surveyor's assistant. Identify this marine instrument or electronic device from the photo.

Return ONLY valid JSON with these fields (use empty string if unknown):
{
  "name": "Common name of the device (e.g., Chart Plotter, VHF Radio, Depth Sounder)",
  "make": "Manufacturer (e.g., Garmin, Raymarine, Furuno, Simrad)",
  "model": "Model name/number",
  "year": "Approximate year or year range of manufacture",
  "details": "Brief useful info: key features, screen size, frequency, power output, or any visible serial/part numbers"
}

If you cannot identify the device, still provide your best guess for the name field. Do not include any text outside the JSON object.`
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500
      }
    };

    console.log(`Calling Gemini API — key ${debugKey}, ${mimeType}, ${payloadSizeKB}KB base64 (original ${Math.round(photo.dataUrl.length/1024)}KB)`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API ${response.status}: ${errText.substring(0, 500)}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.error('API returned OK but no text', result);
      showToast('Identification failed — try again');
      return;
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];
    jsonStr = jsonStr.trim();

    const identified = JSON.parse(jsonStr);

    // Update the instrument with AI results
    const freshSurvey = await getSurvey(currentSurveyId);
    if (freshSurvey && freshSurvey.instrumentsElectronics && freshSurvey.instrumentsElectronics[idx]) {
      if (identified.name) freshSurvey.instrumentsElectronics[idx].name = identified.name;
      if (identified.make) freshSurvey.instrumentsElectronics[idx].make = identified.make;
      if (identified.model) freshSurvey.instrumentsElectronics[idx].model = identified.model;
      if (identified.year) freshSurvey.instrumentsElectronics[idx].year = identified.year;
      if (identified.details) freshSurvey.instrumentsElectronics[idx].aiDetails = identified.details;
      freshSurvey.instrumentsElectronics[idx].aiIdentified = true;
      await saveSurvey(freshSurvey);
      renderInspection(freshSurvey);
      showToast(`Identified: ${identified.name || 'Unknown device'}`);
    }

  } catch (err) {
    console.error('AI identification error:', err);
    showToast('Identification failed: ' + (err.message || 'unknown').substring(0, 80));

    if (err.message.includes('API 401') || err.message.includes('API 403')) {
      localStorage.removeItem('geminiApiKey');
      showToast('Invalid API key removed — tap Identify to enter a new one');
    }
  }
}

// Update Gemini API key (called from settings or prompt)
// Identify all unidentified instruments sequentially
async function identifyAllInstruments() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics) return;

  const unidentified = [];
  survey.instrumentsElectronics.forEach((item, idx) => {
    if (item.photos && item.photos.length > 0 && !item.aiIdentified) {
      unidentified.push(idx);
    }
  });

  if (unidentified.length === 0) {
    showToast('All instruments already identified');
    return;
  }

  showToast(`Identifying ${unidentified.length} instrument${unidentified.length > 1 ? 's' : ''}...`);

  let successCount = 0;
  for (let i = 0; i < unidentified.length; i++) {
    showToast(`Identifying ${i + 1} of ${unidentified.length}...`);
    try {
      await identifyInstrument(unidentified[i]);
      successCount++;
    } catch (e) {
      console.error(`Failed to identify instrument ${unidentified[i]}:`, e);
    }
    // Small delay between API calls to avoid rate limiting
    if (i < unidentified.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  showToast(`Identified ${successCount} of ${unidentified.length} instruments`);
}

// Update Gemini API key (called from settings or prompt)
function updateGeminiApiKey() {
  const current = localStorage.getItem('geminiApiKey');
  const key = prompt('Enter your Gemini API key:', current || '');
  if (key !== null) {
    if (key.trim()) {
      localStorage.setItem('geminiApiKey', key.trim());
      showToast('Gemini API key saved');
    } else {
      localStorage.removeItem('geminiApiKey');
      showToast('Gemini API key removed');
    }
  }
}

// Load thumbnails for an instrument item — with view/delete buttons
async function loadInstrumentThumbnails(idx, photoIds) {
  const container = document.getElementById(`instrument-thumbs-${idx}`);
  if (!container || !photoIds || photoIds.length === 0) {
    if (container) container.innerHTML = '';
    return;
  }
  let thumbsHtml = '';
  for (let i = 0; i < photoIds.length; i++) {
    const pid = photoIds[i];
    const photo = await getPhotoById(pid);
    if (photo) {
      thumbsHtml += `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;margin-right:8px;margin-bottom:6px;">
        <img src="${photo.dataUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:2px solid #7c3aed;cursor:pointer;" onclick="viewInstrumentPhoto('${pid}')" />
        <button onclick="deleteInstrumentPhoto(${idx}, '${pid}')" style="background:#dc2626;color:white;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;font-weight:500;">Delete</button>
      </div>`;
    }
  }
  container.innerHTML = thumbsHtml;
}

// View an instrument photo full-screen
async function viewInstrumentPhoto(photoId) {
  const photo = await getPhotoById(photoId);
  if (!photo) return;
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `<img src="${photo.dataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;" />`;
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

// Delete a single photo from an instrument entry
async function deleteInstrumentPhoto(idx, photoId) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics || !survey.instrumentsElectronics[idx]) return;
  const item = survey.instrumentsElectronics[idx];
  const photoIdx = item.photos.indexOf(photoId);
  if (photoIdx >= 0) {
    item.photos.splice(photoIdx, 1);
    try { await deletePhoto(photoId); } catch(e) {}
    await saveSurvey(survey);
    loadInstrumentThumbnails(idx, item.photos);
    showToast('Photo deleted');
  }
}

// Load all instrument thumbnails after rendering
async function loadAllInstrumentThumbnails() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey.instrumentsElectronics) return;
  survey.instrumentsElectronics.forEach((item, idx) => {
    if (item.photos && item.photos.length > 0) {
      loadInstrumentThumbnails(idx, item.photos);
    }
  });
}

async function regenerateSafetyChecklist() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  const result = generateSafetyChecklist(survey);
  // Preserve checked state for matching items
  const previousMap = {};
  if (survey.safetyEquipment) {
    survey.safetyEquipment.forEach(eq => {
      previousMap[eq.name] = { checked: eq.checked, notes: eq.notes, photos: eq.photos || [] };
    });
  }
  result.checklist.forEach(eq => {
    if (previousMap[eq.name]) {
      eq.checked = previousMap[eq.name].checked;
      eq.notes = previousMap[eq.name].notes;
      eq.photos = previousMap[eq.name].photos;
    }
  });
  survey.safetyEquipment = result.checklist;
  survey.safetyBracket = result.bracket;
  survey.safetyVesselType = result.vesselType;
  await saveSurvey(survey);
  renderInspection(survey);
}

async function loadAndDisplayPhotos(survey) {
  if (!survey.items) return;

  for (const [itemLabel, itemData] of Object.entries(survey.items)) {
    if (itemData.photos && itemData.photos.length > 0) {
      for (const photoId of itemData.photos) {
        const photo = await getPhotoById(photoId);
        if (photo) {
          const img = document.getElementById(`thumb-${photoId}`);
          if (img) img.src = photo.dataUrl;
        }
      }
    }
  }
}

// Save a copy of the photo to the device (camera roll on iOS, downloads on desktop)
// This ensures photos survive a browser data clear
function savePhotoToDevice(dataUrl, label) {
  try {
    // Convert data URL to blob
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });

    // Build a descriptive filename: KikiMarine_HullExterior_2026-04-07_143022.jpg
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const safeLabel = (label || 'photo').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const filename = `KikiMarine_${safeLabel}_${dateStr}_${timeStr}.${ext}`;

    // Create download link — on iOS this triggers "Save to Photos" in share sheet
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error('savePhotoToDevice error:', err);
  }
}

/**
 * Force the browser to recalculate viewport dimensions.
 * Fixes Android Chrome issue where returning from the camera app in landscape
 * leaves the PWA stuck at landscape dimensions. Works by briefly tweaking the
 * viewport meta tag and forcing a reflow.
 */
/**
 * Force the browser to reset viewport zoom/scale after returning from
 * the camera app. On Android Chrome, taking a landscape photo can leave
 * the PWA viewport zoomed in or stuck at wrong dimensions.
 *
 * Uses multiple recovery strategies in sequence for reliability.
 */
function forceViewportRecalc() {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;

  // Strategy 1: Reset scroll position
  window.scrollTo(0, 0);

  // Strategy 2: Force html/body to full height (iOS PWA fix)
  // iOS standalone mode can get stuck at a reduced innerHeight after camera
  const html = document.documentElement;
  const body = document.body;
  html.style.height = '100%';
  body.style.height = '100%';
  body.style.minHeight = '100vh';
  body.style.minHeight = '-webkit-fill-available';

  // Strategy 3: Use visualViewport API to detect and fix zoom
  if (window.visualViewport && window.visualViewport.scale > 1.01) {
    viewport.content = 'width=device-width, initial-scale=0.99, maximum-scale=0.99, user-scalable=no, viewport-fit=cover';
    setTimeout(() => {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      window.scrollTo(0, 0);
    }, 50);
    return;
  }

  // Strategy 4: Cycle the viewport meta tag to force iOS to recalculate
  viewport.content = 'width=device-width, initial-scale=0.99, maximum-scale=0.99, user-scalable=no, viewport-fit=cover';

  requestAnimationFrame(() => {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    window.scrollTo(0, 0);

    // Strategy 5: Force a layout recalculation on the app container
    setTimeout(() => {
      if (window.visualViewport && window.visualViewport.scale > 1.01) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      }
      window.scrollTo(0, 0);
      const app = document.getElementById('app');
      if (app) {
        app.style.display = 'none';
        void app.offsetHeight;
        app.style.display = '';
      }

      // Strategy 6: iOS PWA nuclear option — temporarily change body overflow
      // to force a full re-layout of the viewport
      body.style.overflow = 'hidden';
      void body.offsetHeight;
      setTimeout(() => {
        body.style.overflow = '';
        window.scrollTo(0, 0);
      }, 50);
    }, 300);
  });
}

async function capturePhoto(itemLabel, event) {
  // If called without event (e.g., from area photo button), trigger a file input
  if (!event || !event.target || !event.target.files) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // No capture attribute — allows camera roll, files, or camera
    input.multiple = true;
    input.onchange = (e) => capturePhoto(itemLabel, e);
    // Mark camera active — persisted to sessionStorage so it survives
    // iOS tab suspension/reload
    setCameraActive(true);
    input.click();
    return;
  }

  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // Show a brief "Saving X photos..." toast
  if (files.length > 1) showToast(`Saving ${files.length} photos...`);

  // Process all selected photos — save directly with date stamp, no preview modal
  for (const file of files) {
    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const stampedDataUrl = await addDateStampToPhoto(e.target.result);
        const photoId = `${currentSurveyId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const photo = {
          id: photoId,
          surveyId: currentSurveyId,
          itemLabel: itemLabel,
          dataUrl: stampedDataUrl,
          annotated: false,
          createdAt: new Date().toISOString()
        };

        await savePhoto(photo);

        // Update survey
        const survey = await getSurvey(currentSurveyId);
        if (!survey.items[itemLabel]) {
          survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
        }
        if (!survey.items[itemLabel].photos) {
          survey.items[itemLabel].photos = [];
        }
        survey.items[itemLabel].photos.push(photoId);
        await saveSurvey(survey);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  event.target.value = '';

  // Force viewport recalculation after returning from camera (Android Chrome
  // can get stuck at landscape dimensions after taking a landscape photo)
  forceViewportRecalc();

  // Refresh the item to show all new thumbnails
  const survey = await getSurvey(currentSurveyId);
  // Auto-sync engine/gearbox photos to intro header fields
  _syncEnginePhotosFromBody(survey);
  await saveSurvey(survey);
  updateItemInPlace(survey, itemLabel);
  showToast(`${files.length} photo${files.length > 1 ? 's' : ''} saved`);
}

// ── Area Photo Functions (media items at top of each category) ──────────

/**
 * Handle file selection from the inline <input type="file"> in area photo sections.
 * Called by onchange on the persistent file input — no dynamic input creation needed.
 */
async function handleAreaPhotoCapture(mediaLabel, inputEl) {
  const files = Array.from(inputEl.files);
  if (files.length === 0) return;

  if (files.length > 1) showToast(`Saving ${files.length} photos...`);

  for (const file of files) {
    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const stampedDataUrl = await addDateStampToPhoto(e.target.result);
        const photoId = `${currentSurveyId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const photo = {
          id: photoId,
          surveyId: currentSurveyId,
          itemLabel: mediaLabel,
          dataUrl: stampedDataUrl,
          annotated: false,
          createdAt: new Date().toISOString()
        };

        await savePhoto(photo);

        const survey = await getSurvey(currentSurveyId);
        if (!survey.items[mediaLabel]) {
          survey.items[mediaLabel] = { rating: '', text: '', standards: [], photos: [] };
        }
        if (!survey.items[mediaLabel].photos) {
          survey.items[mediaLabel].photos = [];
        }
        survey.items[mediaLabel].photos.push(photoId);
        await saveSurvey(survey);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  // Reset so the same file(s) can be re-selected
  inputEl.value = '';

  forceViewportRecalc();

  // Refresh the area photo grid in place
  const survey = await getSurvey(currentSurveyId);
  // Auto-sync engine/gearbox photos to intro header fields
  _syncEnginePhotosFromBody(survey);
  await saveSurvey(survey);
  refreshAreaPhotoGrid(survey, mediaLabel);
  showToast(`${files.length} photo${files.length > 1 ? 's' : ''} saved`);
}

/**
 * Delete a photo from an area photo section and refresh the grid in place.
 */
async function deleteAreaPhoto(photoId, mediaLabel) {
  await deletePhoto(photoId);
  const survey = await getSurvey(currentSurveyId);
  if (survey.items[mediaLabel] && survey.items[mediaLabel].photos) {
    survey.items[mediaLabel].photos = survey.items[mediaLabel].photos.filter(id => id !== photoId);
  }
  // Re-sync engine/gearbox photos (clears intro ref if body photos are now empty,
  // or updates to the new first photo if one was deleted from the middle)
  _syncEnginePhotosFromBody(survey);
  await saveSurvey(survey);
  refreshAreaPhotoGrid(survey, mediaLabel);
  showToast('Photo deleted');
}

/**
 * Re-render the area photo grid + button for a specific media item.
 * Finds the container by its wrapper ID and rebuilds thumbnails + file input.
 */
function refreshAreaPhotoGrid(survey, mediaLabel) {
  const sanitized = mediaLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const wrapper = document.getElementById(`area-photo-wrap-${sanitized}`);
  if (!wrapper) return;

  const mediaData = survey.items[mediaLabel] || { photos: [] };
  const photos = mediaData.photos || [];
  const isMediaExcluded = !!mediaData.excluded;
  const safeLabel = mediaLabel.replace(/'/g, "\\'");
  // Look up the category name from the wrapper's enclosing accordion
  const accordion = wrapper.closest('.category-accordion');
  const catName = accordion ? (accordion.dataset.categoryName || '') : '';
  const safeCat = catName.replace(/'/g, "\\'");

  // v2219: respect excluded state on media items
  if (isMediaExcluded) {
    wrapper.style.cssText = 'margin-bottom:16px;padding:12px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;opacity:0.75;';
    wrapper.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="font-weight:600;font-size:14px;color:#6b7280;">⊘ ${mediaLabel} — skipped${photos.length > 0 ? ` (${photos.length} photo${photos.length === 1 ? '' : 's'} retained)` : ''}</div>
        <button onclick="toggleExclude('${safeLabel}')" style="background:white;color:#006699;border:1px solid #006699;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer;">Unskip</button>
      </div>
    `;
    return;
  }

  // Not excluded — reset styling and render the full UI
  wrapper.style.cssText = 'margin-bottom:16px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;';
  wrapper.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
      <div style="font-weight:600;font-size:14px;color:#0369a1;">📷 ${mediaLabel}</div>
      <button onclick="toggleExclude('${safeLabel}')" style="background:transparent;color:#6b7280;border:1px solid #d1d5db;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;" title="Skip this photo section">⊘ Skip</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
      ${photos.map(pid => `
        <div style="position:relative;width:84px;">
          <img id="thumb-${pid}" src="" style="width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="editSavedPhoto('${pid}', '${safeLabel}')">
          <button onclick="event.stopPropagation();deleteAreaPhoto('${pid}', '${safeLabel}')" aria-label="Delete photo" style="position:absolute;top:-8px;right:-8px;background:#dc2626;color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;font-size:16px;font-weight:700;cursor:pointer;line-height:26px;text-align:center;padding:0;box-shadow:0 1px 3px rgba(0,0,0,0.3);">×</button>
          <button onclick="event.stopPropagation();moveAreaPhoto('${pid}', '${safeLabel}', '${safeCat}')" style="display:block;width:100%;margin-top:4px;background:#006699;color:white;border:none;border-radius:6px;padding:6px 0;font-size:12px;font-weight:700;cursor:pointer;">Move ↗</button>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button type="button"
        onclick="openBatchCamera('${safeLabel}', { isArea: true, categoryName: '${safeCat}' })"
        style="background:#006699;color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;min-height:44px;box-sizing:border-box;">
        📷 ${photos.length > 0 ? `Take More (${photos.length})` : 'Take Photos'}
      </button>
      <button type="button"
        onclick="importPhotosForItem('${safeLabel}')"
        style="background:white;color:#006699;border:2px solid #006699;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;min-height:44px;box-sizing:border-box;">
        🖼️ Import photos from library / files
      </button>
    </div>
    <div style="font-size:11px;color:#6b7280;margin-top:6px;">Both buttons support selecting multiple photos at once. On desktop, you can also drag photo files onto any item card.</div>
  `;

  // Load thumbnails from IndexedDB
  photos.forEach(photoId => {
    getPhotoById(photoId).then(photo => {
      if (photo) {
        const img = document.getElementById(`thumb-${photoId}`);
        if (img) img.src = photo.dataUrl;
      }
    });
  });
}

/**
 * Move a photo from an area photo section to another item.
 * Reuses the existing move picker, but flags the source so we don't reopen a media sheet.
 */
function moveAreaPhoto(photoId, sourceMediaLabel, sourceCategoryName) {
  window._moveSourceIsAreaPhoto = true;
  movePhotoFromSheet(photoId, sourceMediaLabel, sourceCategoryName);
}

// Open edit modal for an already-saved photo (tap thumbnail to edit)
async function editSavedPhoto(photoId, itemLabel) {
  const photo = await getPhotoById(photoId);
  if (!photo) return;

  // Close any open bottom sheet first so it doesn't interfere with the preview modal
  const bottomSheet = document.getElementById('bottomSheetOverlay');
  if (bottomSheet) bottomSheet.remove();

  const fieldKey = `_edit_${photoId}`;
  window._editingPhotoId = photoId;
  window._editingItemLabel = itemLabel;
  showPhotoPreviewModal(fieldKey, itemLabel, photo.dataUrl, 'image/jpeg');

  // Override confirm button to update existing photo instead of creating new
  setTimeout(() => {
    const confirmBtn = document.querySelector('#photoPreviewModal .btn-primary');
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const data = window._pendingPhotoData;
        if (!data) return;
        closePhotoPreviewModal();

        const finalDataUrl = await bakePhotoEdits(data.stampedDataUrl, data.brightness || 100, data.contrast || 100, data.rotation || 0);

        // Update existing photo
        photo.dataUrl = finalDataUrl;
        photo.editedAt = new Date().toISOString();
        await savePhoto(photo);

        // Refresh item
        const survey = await getSurvey(currentSurveyId);
        updateItemInPlace(survey, itemLabel);
        showToast('Photo updated');
        window._pendingPhotoData = null;
      };
    }
  }, 100);
}

// Capture a documentation photo (HIN plate, compliance plate, etc.)
async function addDateStampToPhoto(dataUrl, maxResolution) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width, h = img.height;
        // Cap resolution to save memory. 2048 px on the long edge is ample
        // for report print at 200 dpi (prints ~10" wide) while keeping the
        // in-memory canvas and resulting base64 ~45% smaller than 3072 px.
        const maxDim = maxResolution || 2048;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Add date stamp in bottom-right corner
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        const fontSize = Math.max(20, Math.round(canvas.width / 40));
        const padding = 12;

        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        // Background rect for date
        const textMetrics = ctx.measureText(dateStr);
        const rectWidth = textMetrics.width + padding * 2;
        const rectHeight = fontSize + padding;
        ctx.fillRect(
          canvas.width - rectWidth,
          canvas.height - rectHeight,
          rectWidth,
          rectHeight
        );

        // White text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dateStr, canvas.width - padding, canvas.height - padding);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (canvasErr) {
        console.error('addDateStampToPhoto canvas error:', canvasErr);
        resolve(dataUrl); // Return original if stamp fails
      }
    };
    img.onerror = () => {
      console.error('addDateStampToPhoto: image failed to load');
      resolve(dataUrl); // Return original if load fails
    };
    img.src = dataUrl;
  });
}

async function captureDocPhoto(fieldKey, label, event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    // Add date stamp to the photo
    const stampedDataUrl = await addDateStampToPhoto(e.target.result);

    // Show preview modal
    showPhotoPreviewModal(fieldKey, label, stampedDataUrl, file.type);
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

function showPhotoPreviewModal(fieldKey, label, stampedDataUrl, fileType) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('photoPreviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'photoPreviewModal';
    modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:white;border-radius:12px;max-width:95vw;width:100%;margin:10px auto;padding:14px;display:flex;flex-direction:column;align-items:center;">
      <div style="font-weight:600;margin-bottom:8px;color:#006699;font-size:14px;">Photo Preview — ${label}</div>
      <div style="position:relative;width:100%;text-align:center;margin-bottom:8px;">
        <img id="previewImage" src="${stampedDataUrl}" style="max-width:100%;max-height:45vh;border-radius:8px;border:1px solid #ccc;">
      </div>

      <div style="width:100%;padding:0 4px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:12px;color:#555;width:70px;flex-shrink:0;">Brightness</span>
          <input type="range" id="photoBrightness" min="50" max="200" value="100" style="flex:1;height:28px;"
                 oninput="applyPhotoFilters()">
          <span id="brightnessVal" style="font-size:11px;color:#888;width:35px;text-align:right;">100%</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:12px;color:#555;width:70px;flex-shrink:0;">Contrast</span>
          <input type="range" id="photoContrast" min="50" max="200" value="100" style="flex:1;height:28px;"
                 oninput="applyPhotoFilters()">
          <span id="contrastVal" style="font-size:11px;color:#888;width:35px;text-align:right;">100%</span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;">
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="resetPhotoFilters()">Reset</button>
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="rotatePreviewPhoto()">↻ Rotate</button>
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;" onclick="startPhotoCrop()">✂ Crop</button>
          <button class="btn-secondary" style="font-size:11px;padding:4px 10px;background:#fef3c7;border-color:#f59e0b;" onclick="startAnnotation()">✏️ Annotate</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;width:100%;justify-content:center;">
        <button class="btn-secondary" style="padding:10px 20px;font-size:14px;flex:1;" onclick="closePhotoPreviewModal()">❌ Retake</button>
        <button class="btn-primary" style="padding:10px 20px;font-size:14px;flex:1;" onclick="confirmPhotoPreview('${fieldKey}', '${label}')">✓ Confirm</button>
      </div>
    </div>
  `;

  // Store data for confirm action
  window._pendingPhotoData = {
    fieldKey: fieldKey,
    label: label,
    stampedDataUrl: stampedDataUrl,
    originalDataUrl: stampedDataUrl,
    fileType: fileType,
    brightness: 100,
    contrast: 100,
    rotation: 0
  };

  modal.style.display = 'block';
}

// Apply brightness/contrast filters to preview image
function applyPhotoFilters() {
  const brightness = document.getElementById('photoBrightness')?.value || 100;
  const contrast = document.getElementById('photoContrast')?.value || 100;
  const img = document.getElementById('previewImage');
  if (img) {
    img.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  }
  const bVal = document.getElementById('brightnessVal');
  if (bVal) bVal.textContent = brightness + '%';
  const cVal = document.getElementById('contrastVal');
  if (cVal) cVal.textContent = contrast + '%';

  if (window._pendingPhotoData) {
    window._pendingPhotoData.brightness = parseInt(brightness);
    window._pendingPhotoData.contrast = parseInt(contrast);
  }
}

// Reset filters to default
function resetPhotoFilters() {
  const bSlider = document.getElementById('photoBrightness');
  const cSlider = document.getElementById('photoContrast');
  if (bSlider) bSlider.value = 100;
  if (cSlider) cSlider.value = 100;
  applyPhotoFilters();
}

// Rotate the photo 90 degrees clockwise
function rotatePreviewPhoto() {
  if (!window._pendingPhotoData) return;
  window._pendingPhotoData.rotation = (window._pendingPhotoData.rotation + 90) % 360;
  const img = document.getElementById('previewImage');
  if (img) {
    img.style.transform = `rotate(${window._pendingPhotoData.rotation}deg)`;
    // Scale down if rotated sideways so it still fits
    if (window._pendingPhotoData.rotation % 180 !== 0) {
      img.style.maxHeight = '35vh';
    } else {
      img.style.maxHeight = '45vh';
    }
  }
}

// Start crop mode — draw a selection rectangle on the photo
function startPhotoCrop() {
  const img = document.getElementById('previewImage');
  if (!img) return;

  // Use a full-screen overlay so crop controls are easy to use on mobile
  const overlay = document.createElement('div');
  overlay.id = 'cropOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10001;display:flex;flex-direction:column;align-items:center;justify-content:center;';

  // Create an image element for cropping that fills available space
  overlay.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center;width:100%;position:relative;overflow:hidden;" id="cropImageContainer">
      <img id="cropSourceImage" src="${window._pendingPhotoData.originalDataUrl}" style="max-width:95%;max-height:70vh;display:block;">
    </div>
    <div id="cropBox" style="position:absolute;border:3px solid #3b82f6;background:rgba(59,130,246,0.15);box-sizing:border-box;touch-action:none;z-index:10002;">
      <div style="position:absolute;top:-8px;left:-8px;width:16px;height:16px;background:#3b82f6;border-radius:50%;"></div>
      <div style="position:absolute;top:-8px;right:-8px;width:16px;height:16px;background:#3b82f6;border-radius:50%;"></div>
      <div style="position:absolute;bottom:-8px;left:-8px;width:16px;height:16px;background:#3b82f6;border-radius:50%;"></div>
      <div style="position:absolute;bottom:-8px;right:-8px;width:16px;height:16px;background:#3b82f6;border-radius:50%;"></div>
    </div>
    <div style="display:flex;gap:12px;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom, 0px));z-index:10002;">
      <button class="btn-secondary" style="padding:12px 24px;font-size:15px;background:white;" onclick="cancelCrop()">Cancel</button>
      <button class="btn-primary" style="padding:12px 24px;font-size:15px;" onclick="applyCrop()">Apply Crop</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Position crop box over the image after it renders
  setTimeout(() => {
    const cropImg = document.getElementById('cropSourceImage');
    const cropBox = document.getElementById('cropBox');
    if (cropImg && cropBox) {
      const imgRect = cropImg.getBoundingClientRect();
      cropBox.style.left = (imgRect.left + imgRect.width * 0.1) + 'px';
      cropBox.style.top = (imgRect.top + imgRect.height * 0.1) + 'px';
      cropBox.style.width = (imgRect.width * 0.8) + 'px';
      cropBox.style.height = (imgRect.height * 0.8) + 'px';
    }
  }, 50);

  // Make crop box draggable via touch/mouse (set up after DOM renders)
  setTimeout(() => {
    const cb = document.getElementById('cropBox');
    if (!cb) return;
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    function onStart(e) {
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      isDragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      const rect = cb.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
    }
    function onMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      cb.style.left = (startLeft + dx) + 'px';
      cb.style.top = (startTop + dy) + 'px';
    }
    function onEnd() { isDragging = false; }

    cb.addEventListener('touchstart', onStart, { passive: false });
    cb.addEventListener('touchmove', onMove, { passive: false });
    cb.addEventListener('touchend', onEnd);
    cb.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
  }, 100);
}

function cancelCrop() {
  const overlay = document.getElementById('cropOverlay');
  if (overlay) overlay.remove();
}

function applyCrop() {
  const overlay = document.getElementById('cropOverlay');
  const cropBox = document.getElementById('cropBox');
  const cropImg = document.getElementById('cropSourceImage');
  if (!overlay || !cropBox || !cropImg || !window._pendingPhotoData) {
    cancelCrop();
    return;
  }

  // Calculate crop ratios relative to the displayed crop source image
  const imgRect = cropImg.getBoundingClientRect();
  const boxRect = cropBox.getBoundingClientRect();
  const cropLeft = Math.max(0, (boxRect.left - imgRect.left) / imgRect.width);
  const cropTop = Math.max(0, (boxRect.top - imgRect.top) / imgRect.height);
  const cropW = Math.min(1 - cropLeft, boxRect.width / imgRect.width);
  const cropH = Math.min(1 - cropTop, boxRect.height / imgRect.height);

  // Apply crop to the original image
  const srcImg = new Image();
  srcImg.onload = () => {
    const sx = Math.round(cropLeft * srcImg.width);
    const sy = Math.round(cropTop * srcImg.height);
    const sw = Math.round(cropW * srcImg.width);
    const sh = Math.round(cropH * srcImg.height);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(srcImg, sx, sy, sw, sh, 0, 0, sw, sh);

    // Re-apply date stamp to cropped image
    const fontSize = Math.max(20, Math.round(canvas.width / 40));
    const padding = 12;
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const textMetrics = ctx.measureText(dateStr);
    const rectWidth = textMetrics.width + padding * 2;
    const rectHeight = fontSize + padding;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(canvas.width - rectWidth, canvas.height - rectHeight, rectWidth, rectHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dateStr, canvas.width - padding, canvas.height - padding);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    window._pendingPhotoData.stampedDataUrl = croppedDataUrl;
    window._pendingPhotoData.originalDataUrl = croppedDataUrl;

    // Update preview
    img.src = croppedDataUrl;
    img.style.transform = '';
    window._pendingPhotoData.rotation = 0;

    cancelCrop();
  };
  srcImg.src = window._pendingPhotoData.originalDataUrl;
}

function closePhotoPreviewModal() {
  const modal = document.getElementById('photoPreviewModal');
  if (modal) modal.style.display = 'none';
  window._pendingPhotoData = null;
}

// ── Photo Annotation ────────────────────────────────────────────────────────
// Full-screen annotation mode with circle, arrow, and text tools
function startAnnotation() {
  if (!window._pendingPhotoData) return;

  // Close any existing overlay
  const existing = document.getElementById('annotationOverlay');
  if (existing) existing.remove();

  window._annotationState = {
    tool: 'circle',       // 'circle', 'arrow', 'text'
    colour: '#dc2626',    // red
    lineWidth: 3,
    drawings: [],         // stored draw operations for undo
    isDrawing: false,
    startX: 0, startY: 0
  };

  const overlay = document.createElement('div');
  overlay.id = 'annotationOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:10001;display:flex;flex-direction:column;';

  overlay.innerHTML = `
    <div id="annoToolbar" style="display:flex;gap:6px;padding:10px 12px;background:#1e293b;align-items:center;flex-wrap:wrap;">
      <button id="annoToolCircle" onclick="setAnnotationTool('circle')" style="padding:6px 12px;border-radius:6px;border:2px solid #3b82f6;background:#006699;color:white;font-size:13px;font-weight:600;cursor:pointer;">⭕ Circle</button>
      <button id="annoToolArrow" onclick="setAnnotationTool('arrow')" style="padding:6px 12px;border-radius:6px;border:2px solid transparent;background:#374151;color:white;font-size:13px;font-weight:600;cursor:pointer;">➜ Arrow</button>
      <button id="annoToolText" onclick="setAnnotationTool('text')" style="padding:6px 12px;border-radius:6px;border:2px solid transparent;background:#374151;color:white;font-size:13px;font-weight:600;cursor:pointer;">Aa Text</button>
      <div style="flex:1;"></div>
      <button onclick="undoAnnotation()" style="padding:6px 12px;border-radius:6px;border:none;background:#6b7280;color:white;font-size:13px;font-weight:600;cursor:pointer;">↩ Undo</button>
    </div>
    <div id="annoColourBar" style="display:flex;gap:8px;padding:6px 12px;background:#0f172a;align-items:center;">
      <span style="color:#9ca3af;font-size:11px;">Colour:</span>
      <button onclick="setAnnotationColour('#dc2626')" style="width:28px;height:28px;border-radius:50%;background:#dc2626;border:3px solid white;cursor:pointer;" id="annoColour_dc2626"></button>
      <button onclick="setAnnotationColour('#f59e0b')" style="width:28px;height:28px;border-radius:50%;background:#f59e0b;border:3px solid transparent;cursor:pointer;" id="annoColour_f59e0b"></button>
      <button onclick="setAnnotationColour('#3b82f6')" style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid transparent;cursor:pointer;" id="annoColour_3b82f6"></button>
      <button onclick="setAnnotationColour('#ffffff')" style="width:28px;height:28px;border-radius:50%;background:#ffffff;border:3px solid transparent;cursor:pointer;" id="annoColour_ffffff"></button>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;" id="annoContainer">
      <canvas id="annoCanvas" style="touch-action:none;cursor:crosshair;"></canvas>
    </div>
    <div style="display:flex;gap:12px;padding:12px 16px;padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px));background:#1e293b;">
      <button onclick="cancelAnnotation()" style="flex:1;padding:12px;border-radius:8px;border:none;background:#6b7280;color:white;font-size:15px;font-weight:600;cursor:pointer;">Cancel</button>
      <button onclick="applyAnnotation()" style="flex:1;padding:12px;border-radius:8px;border:none;background:#16a34a;color:white;font-size:15px;font-weight:600;cursor:pointer;">✓ Done</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Load image onto canvas
  const img = new Image();
  img.onload = () => {
    const canvas = document.getElementById('annoCanvas');
    const container = document.getElementById('annoContainer');
    if (!canvas || !container) return;

    // Fit image to container
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / img.width, ch / img.height, 1);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    window._annotationState.img = img;
    window._annotationState.scale = scale;
    window._annotationState.canvasW = canvas.width;
    window._annotationState.canvasH = canvas.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Set up touch/mouse handlers
    setupAnnotationHandlers(canvas);
  };
  img.src = window._pendingPhotoData.stampedDataUrl;
}

function setAnnotationTool(tool) {
  window._annotationState.tool = tool;
  ['circle', 'arrow', 'text'].forEach(t => {
    const btn = document.getElementById('annoTool' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) {
      btn.style.borderColor = (t === tool) ? '#3b82f6' : 'transparent';
      btn.style.background = (t === tool) ? '#006699' : '#374151';
    }
  });
}

function setAnnotationColour(colour) {
  window._annotationState.colour = colour;
  document.querySelectorAll('[id^="annoColour_"]').forEach(btn => {
    const c = btn.id.replace('annoColour_', '');
    btn.style.borderColor = ('#' + c === colour) ? 'white' : 'transparent';
  });
}

function setupAnnotationHandlers(canvas) {
  const state = window._annotationState;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function onStart(e) {
    e.preventDefault();
    const pos = getPos(e);
    state.isDrawing = true;
    state.startX = pos.x;
    state.startY = pos.y;

    if (state.tool === 'text') {
      state.isDrawing = false;
      promptAnnotationText(pos.x, pos.y);
    }
  }

  function onMove(e) {
    if (!state.isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    // Redraw canvas with all existing drawings + preview of current
    redrawAnnotationCanvas(canvas);
    drawAnnotationPreview(canvas, state.startX, state.startY, pos.x, pos.y);
  }

  function onEnd(e) {
    if (!state.isDrawing) return;
    state.isDrawing = false;
    const pos = e.changedTouches ? { x: e.changedTouches[0].clientX - canvas.getBoundingClientRect().left, y: e.changedTouches[0].clientY - canvas.getBoundingClientRect().top } : getPos(e);

    // Only add if there's meaningful movement
    const dx = pos.x - state.startX;
    const dy = pos.y - state.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    state.drawings.push({
      tool: state.tool,
      colour: state.colour,
      lineWidth: state.lineWidth,
      x1: state.startX, y1: state.startY,
      x2: pos.x, y2: pos.y
    });
    redrawAnnotationCanvas(canvas);
  }

  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd);
  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
}

function promptAnnotationText(x, y) {
  const state = window._annotationState;
  // Custom inline text input instead of native prompt()
  let inputDiv = document.getElementById('annoTextInput');
  if (inputDiv) inputDiv.remove();

  inputDiv = document.createElement('div');
  inputDiv.id = 'annoTextInput';
  inputDiv.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1e293b;padding:12px 16px;padding-bottom:calc(12px + env(safe-area-inset-bottom, 0px));z-index:10003;display:flex;gap:8px;align-items:center;';
  inputDiv.innerHTML = `
    <input type="text" id="annoTextValue" placeholder="Enter text..." autofocus
           style="flex:1;padding:10px 12px;border:1px solid #3b82f6;border-radius:8px;font-size:15px;background:white;color:#333;" />
    <button onclick="confirmAnnotationText(${x}, ${y})" style="padding:10px 16px;border:none;border-radius:8px;background:#16a34a;color:white;font-size:14px;font-weight:600;cursor:pointer;">Add</button>
    <button onclick="document.getElementById('annoTextInput').remove();" style="padding:10px 12px;border:none;border-radius:8px;background:#6b7280;color:white;font-size:14px;cursor:pointer;">✕</button>
  `;
  document.body.appendChild(inputDiv);
  setTimeout(() => document.getElementById('annoTextValue')?.focus(), 100);
}

function confirmAnnotationText(x, y) {
  const input = document.getElementById('annoTextValue');
  const text = input?.value?.trim();
  const inputDiv = document.getElementById('annoTextInput');
  if (inputDiv) inputDiv.remove();
  if (!text) return;

  const state = window._annotationState;
  state.drawings.push({
    tool: 'text',
    colour: state.colour,
    x1: x, y1: y,
    text: text
  });
  const canvas = document.getElementById('annoCanvas');
  if (canvas) redrawAnnotationCanvas(canvas);
}

function redrawAnnotationCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const state = window._annotationState;
  // Redraw base image
  ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
  // Redraw all committed annotations
  state.drawings.forEach(d => drawAnnotation(ctx, d));
}

function drawAnnotationPreview(canvas, x1, y1, x2, y2) {
  const ctx = canvas.getContext('2d');
  const state = window._annotationState;
  drawAnnotation(ctx, {
    tool: state.tool, colour: state.colour, lineWidth: state.lineWidth,
    x1, y1, x2, y2
  });
}

function drawAnnotation(ctx, d) {
  ctx.strokeStyle = d.colour;
  ctx.fillStyle = d.colour;
  ctx.lineWidth = d.lineWidth || 3;

  if (d.tool === 'circle') {
    const cx = (d.x1 + d.x2) / 2;
    const cy = (d.y1 + d.y2) / 2;
    const rx = Math.abs(d.x2 - d.x1) / 2;
    const ry = Math.abs(d.y2 - d.y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (d.tool === 'arrow') {
    const headLen = 14;
    const angle = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
    // Line
    ctx.beginPath();
    ctx.moveTo(d.x1, d.y1);
    ctx.lineTo(d.x2, d.y2);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(d.x2, d.y2);
    ctx.lineTo(d.x2 - headLen * Math.cos(angle - Math.PI / 6), d.y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(d.x2 - headLen * Math.cos(angle + Math.PI / 6), d.y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  } else if (d.tool === 'text') {
    const fontSize = Math.max(16, Math.round(ctx.canvas.width / 25));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Background
    const metrics = ctx.measureText(d.text);
    const pad = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(d.x1 - pad, d.y1 - pad, metrics.width + pad * 2, fontSize + pad * 2);
    // Text
    ctx.fillStyle = d.colour;
    ctx.fillText(d.text, d.x1, d.y1);
  }
}

function undoAnnotation() {
  const state = window._annotationState;
  if (state.drawings.length === 0) return;
  state.drawings.pop();
  const canvas = document.getElementById('annoCanvas');
  if (canvas) redrawAnnotationCanvas(canvas);
}

function cancelAnnotation() {
  const overlay = document.getElementById('annotationOverlay');
  if (overlay) overlay.remove();
  window._annotationState = null;
}

function applyAnnotation() {
  const state = window._annotationState;
  if (!state || !window._pendingPhotoData) {
    cancelAnnotation();
    return;
  }

  // Bake annotations onto the original-resolution image
  const srcImg = new Image();
  srcImg.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = srcImg.width;
    canvas.height = srcImg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(srcImg, 0, 0);

    // Scale factor from annotation canvas to original image
    const scaleX = srcImg.width / state.canvasW;
    const scaleY = srcImg.height / state.canvasH;

    // Draw each annotation at full resolution
    state.drawings.forEach(d => {
      drawAnnotation(ctx, {
        ...d,
        x1: d.x1 * scaleX, y1: d.y1 * scaleY,
        x2: (d.x2 || 0) * scaleX, y2: (d.y2 || 0) * scaleY,
        lineWidth: (d.lineWidth || 3) * Math.max(scaleX, scaleY)
      });
    });

    const annotatedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    window._pendingPhotoData.stampedDataUrl = annotatedDataUrl;
    window._pendingPhotoData.originalDataUrl = annotatedDataUrl;

    // Update the preview image
    const previewImg = document.getElementById('previewImage');
    if (previewImg) previewImg.src = annotatedDataUrl;

    cancelAnnotation();
  };
  srcImg.src = window._pendingPhotoData.stampedDataUrl;
}

// Bake brightness, contrast, and rotation edits into the image data
async function bakePhotoEdits(dataUrl, brightness, contrast, rotation) {
  // Skip processing if no edits were made
  if (brightness === 100 && contrast === 100 && (rotation === 0 || rotation === undefined)) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Handle rotation
      const rad = (rotation || 0) * Math.PI / 180;
      const isRotatedSideways = (rotation === 90 || rotation === 270);
      canvas.width = isRotatedSideways ? img.height : img.width;
      canvas.height = isRotatedSideways ? img.width : img.height;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Apply brightness and contrast via pixel manipulation
      if (brightness !== 100 || contrast !== 100) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const b = brightness / 100;
        const c = (contrast / 100 - 1) * 255;
        const factor = (259 * (c + 255)) / (255 * (259 - c));

        for (let i = 0; i < pixels.length; i += 4) {
          // Apply brightness then contrast
          pixels[i] = Math.max(0, Math.min(255, factor * (pixels[i] * b - 128) + 128));
          pixels[i + 1] = Math.max(0, Math.min(255, factor * (pixels[i + 1] * b - 128) + 128));
          pixels[i + 2] = Math.max(0, Math.min(255, factor * (pixels[i + 2] * b - 128) + 128));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = dataUrl;
  });
}

async function confirmPhotoPreview(fieldKey, label) {
  const data = window._pendingPhotoData;
  if (!data) return;

  closePhotoPreviewModal();

  // Bake brightness, contrast, and rotation into the final image
  const finalDataUrl = await bakePhotoEdits(data.stampedDataUrl, data.brightness || 100, data.contrast || 100, data.rotation || 0);
  data.stampedDataUrl = finalDataUrl;

  // Check if this is a checklist item photo (vs a doc photo like HIN plate)
  if (fieldKey.startsWith('_checklist_')) {
    const itemLabel = fieldKey.replace('_checklist_', '');
    const photoId = `${currentSurveyId}_${Date.now()}`;
    const photo = {
      id: photoId,
      surveyId: currentSurveyId,
      itemLabel: itemLabel,
      dataUrl: data.stampedDataUrl,
      annotated: false,
      createdAt: new Date().toISOString()
    };

    await savePhoto(photo);

    // Update survey
    const survey = await getSurvey(currentSurveyId);
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    if (!survey.items[itemLabel].photos) {
      survey.items[itemLabel].photos = [];
    }
    survey.items[itemLabel].photos.push(photoId);
    await saveSurvey(survey);

    // Update just this item in place (no full re-render)
    updateItemInPlace(survey, itemLabel);
    window._pendingPhotoData = null;
    return;
  }

  // Doc photo flow (HIN plate, compliance plate, etc.)
  if (currentSurveyId) {
    // Survey exists — save photo to IndexedDB and link to survey
    const photoId = `${currentSurveyId}_doc_${fieldKey}_${Date.now()}`;
    const photo = {
      id: photoId,
      surveyId: currentSurveyId,
      itemLabel: label,
      dataUrl: data.stampedDataUrl,
      annotated: false,
      isDocPhoto: true,
      docField: fieldKey,
      createdAt: new Date().toISOString()
    };

    await savePhoto(photo);

    // Store the photo ID on the survey object
    const survey = await getSurvey(currentSurveyId);
    if (survey) {
      if (MULTI_DOC_PHOTO_FIELDS.has(fieldKey)) {
        // Multi-photo field — append to array
        if (!Array.isArray(survey[fieldKey])) {
          // Migrate old single value to array
          survey[fieldKey] = survey[fieldKey] ? [survey[fieldKey]] : [];
        }
        survey[fieldKey].push(photoId);
      } else {
        // Single-photo field — replace (delete old)
        if (survey[fieldKey]) {
          try { await deletePhoto(survey[fieldKey]); } catch(e) {}
        }
        survey[fieldKey] = photoId;
      }
      await saveSurvey(survey);
    }
  } else {
    // New survey form — survey doesn't exist yet.
    // Store photo data temporarily; it will be saved when survey is created.
    if (!window._pendingDocPhotos) window._pendingDocPhotos = {};
    window._pendingDocPhotos[fieldKey] = {
      label: label,
      dataUrl: data.stampedDataUrl,
      fileType: data.fileType
    };
  }

  // Update UI with stamped preview (works regardless of survey state)
  updateDocPhotoPreview(fieldKey, data.stampedDataUrl);
  window._pendingPhotoData = null;
}

// Remove a documentation photo and restore camera button
async function removeDocPhoto(fieldKey) {
  const survey = await getSurvey(currentSurveyId);
  if (MULTI_DOC_PHOTO_FIELDS.has(fieldKey)) {
    // Multi-photo: delete all photos in array
    let ids = survey[fieldKey];
    if (!Array.isArray(ids)) ids = ids ? [ids] : [];
    for (const id of ids) {
      try { await deletePhoto(id); } catch(e) {}
    }
    survey[fieldKey] = [];
    await saveSurvey(survey);
    await loadMultiDocPhotoPreview(fieldKey);
    return;
  }
  if (survey[fieldKey]) {
    try { await deletePhoto(survey[fieldKey]); } catch(e) {}
    delete survey[fieldKey];
    await saveSurvey(survey);
  }
  // Restore the camera button in the wrapper
  const label = PHOTO_FIELD_LABELS[fieldKey] || fieldKey;
  const wrapper = document.querySelector(`[data-photo-field="${fieldKey}"]`);
  if (wrapper) {
    wrapper.innerHTML = getDocPhotoButtonHTML(fieldKey, label);
  }
  const preview = document.getElementById(fieldKey + 'Preview');
  if (preview) preview.innerHTML = '';
  const status = document.getElementById(fieldKey + 'Status');
  if (status) {
    status.textContent = '';
    status.style.color = '';
  }
}

// Update the preview thumbnail for a documentation photo — replaces camera button inline
function updateDocPhotoPreview(fieldKey, dataUrl) {
  if (MULTI_DOC_PHOTO_FIELDS.has(fieldKey)) {
    // Multi-photo: reload the full gallery from survey data
    loadMultiDocPhotoPreview(fieldKey);
    return;
  }
  const photoHtml = `
    <div style="position:relative;display:inline-block;">
      <img src="${dataUrl}" style="max-width:200px;max-height:150px;border:2px solid #16a34a;border-radius:6px;cursor:pointer;"
           onclick="viewDocPhotoFull('${fieldKey}')" />
      <div style="text-align:center;font-size:10px;color:#16a34a;font-weight:600;margin-top:2px;">✓ Captured</div>
      <div style="display:flex;gap:4px;justify-content:center;margin-top:4px;">
        <button class="btn-secondary" style="font-size:11px;padding:3px 8px;" onclick="retakeDocPhoto('${fieldKey}')">↻ Retake</button>
        <button class="btn-secondary" style="font-size:11px;padding:3px 8px;color:#dc2626;border-color:#fca5a5;" onclick="deleteDocPhoto('${fieldKey}')">✕ Delete</button>
      </div>
    </div>`;
  // Find the wrapper container for this photo field
  const wrapper = document.querySelector(`[data-photo-field="${fieldKey}"]`);
  if (wrapper) {
    wrapper.innerHTML = photoHtml;
  } else {
    const preview = document.getElementById(fieldKey + 'Preview');
    if (preview) preview.innerHTML = photoHtml;
  }
  const status = document.getElementById(fieldKey + 'Status');
  if (status) {
    status.textContent = '✓ Photo captured';
    status.style.color = '#16a34a';
  }
}

// View a doc photo full-screen
function viewDocPhotoFull(fieldKey) {
  getSurvey(currentSurveyId).then(async survey => {
    if (!survey[fieldKey]) return;
    const photo = await getPhotoById(survey[fieldKey]);
    if (!photo || !photo.dataUrl) return;
    let modal = document.getElementById('photoPreviewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'photoPreviewModal';
      modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;padding:20px;box-sizing:border-box;overflow-y:auto;';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="background:white;border-radius:12px;max-width:90vw;max-height:90vh;margin:20px auto;padding:16px;display:flex;flex-direction:column;align-items:center;">
        <img src="${photo.dataUrl}" style="max-width:100%;max-height:70vh;border-radius:8px;margin-bottom:16px;">
        <button class="btn-secondary" style="padding:8px 16px;" onclick="document.getElementById('photoPreviewModal').style.display='none'">Close</button>
      </div>`;
    modal.style.display = 'block';
  });
}

// Retake a doc photo — restore the camera button and trigger capture
function retakeDocPhoto(fieldKey) {
  // Look up the label from the PHOTO_FIELD_LABELS map
  const label = PHOTO_FIELD_LABELS[fieldKey] || fieldKey;
  const wrapper = document.querySelector(`[data-photo-field="${fieldKey}"]`);
  if (wrapper) {
    wrapper.innerHTML = getDocPhotoButtonHTML(fieldKey, label);
    // Auto-trigger the file input
    const fileInput = wrapper.querySelector('input[type="file"]');
    if (fileInput) fileInput.click();
  }
}

// Delete a doc photo entirely — removes from IndexedDB and restores camera button
function deleteDocPhoto(fieldKey) {
  getSurvey(currentSurveyId).then(async survey => {
    if (!survey) return;
    // Delete the photo from the photos store
    if (survey[fieldKey]) {
      try { await deletePhoto(survey[fieldKey]); } catch (e) {}
      survey[fieldKey] = null;
      await saveSurvey(survey);
    }
    // Restore the camera button (without auto-triggering capture)
    const label = PHOTO_FIELD_LABELS[fieldKey] || fieldKey;
    const wrapper = document.querySelector(`[data-photo-field="${fieldKey}"]`);
    if (wrapper) {
      wrapper.innerHTML = getDocPhotoButtonHTML(fieldKey, label);
    }
    showToast('Photo deleted');
  });
}

// Fields that support multiple photos (engine/transmission)
const MULTI_DOC_PHOTO_FIELDS = new Set([
  'enginePhoto', 'enginePlatePhoto', 'engine2Photo', 'engine2PlatePhoto',
  'transmissionPhoto', 'transmissionPlatePhoto', 'transmission2Photo', 'transmission2PlatePhoto'
]);

// Map of fieldKey → display label for all doc photo fields
const PHOTO_FIELD_LABELS = {
  'enginePhoto': 'Engine',
  'enginePlatePhoto': 'Data Plate',
  'engine2Photo': 'Engine 2',
  'engine2PlatePhoto': 'Data Plate 2',
  'transmissionPhoto': 'Transmission',
  'transmissionPlatePhoto': 'Serial Plate',
  'transmission2Photo': 'Transmission 2',
  'transmission2PlatePhoto': 'Serial Plate 2',
  'coverPhoto': 'Cover Photo',
  'fourCornerPortBow': 'Port Bow',
  'fourCornerStbdBow': 'Starboard Bow',
  'fourCornerPortStern': 'Port Stern',
  'fourCornerStbdStern': 'Starboard Stern',
  'hinPhoto': 'HIN',
  'compliancePhoto': 'Compliance Plate',
  'licencePhoto': 'Licence on Hull',
  'tcPaperLicencePhoto': 'TC Paper Licence'
};

// Generate the camera button HTML for a doc photo field
function getDocPhotoButtonHTML(fieldKey, label) {
  const displayLabel = label || PHOTO_FIELD_LABELS[fieldKey] || fieldKey;
  return `<label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:6px 10px;">
    📷 ${displayLabel}
    <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('${fieldKey}', '${displayLabel}', event)" />
  </label>`;
}

// Load documentation photo previews when navigating to the form
async function loadDocPhotoPreview(fieldKey) {
  if (!currentSurveyId) return;
  const survey = await getSurvey(currentSurveyId);
  if (!survey || !survey[fieldKey]) return;

  if (MULTI_DOC_PHOTO_FIELDS.has(fieldKey)) {
    await loadMultiDocPhotoPreview(fieldKey);
  } else {
    const photo = await getPhotoById(survey[fieldKey]);
    if (photo && photo.dataUrl) {
      updateDocPhotoPreview(fieldKey, photo.dataUrl);
    }
  }
}

// Load and render a multi-photo gallery for engine/transmission fields
async function loadMultiDocPhotoPreview(fieldKey) {
  if (!currentSurveyId) return;
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;

  // Normalise: old single value → array
  let ids = survey[fieldKey];
  if (!ids) ids = [];
  if (!Array.isArray(ids)) ids = [ids];

  const label = PHOTO_FIELD_LABELS[fieldKey] || fieldKey;
  let galleryHtml = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;">';

  for (let i = 0; i < ids.length; i++) {
    const photo = await getPhotoById(ids[i]);
    if (!photo || !photo.dataUrl) continue;
    galleryHtml += `
      <div style="position:relative;display:inline-block;text-align:center;">
        <img src="${photo.dataUrl}" style="max-width:120px;max-height:90px;border:2px solid #16a34a;border-radius:6px;cursor:pointer;"
             onclick="viewMultiDocPhotoFull('${fieldKey}', ${i})" />
        <div style="display:flex;gap:3px;justify-content:center;margin-top:3px;">
          <button class="btn-secondary" style="font-size:10px;padding:2px 6px;color:#dc2626;border-color:#fca5a5;" onclick="deleteMultiDocPhoto('${fieldKey}', ${i})">✕</button>
        </div>
      </div>`;
  }

  // Always show an add-more button
  galleryHtml += `
    <div style="display:inline-block;text-align:center;">
      <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;padding:8px 12px;min-height:60px;">
        📷 Add
        <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('${fieldKey}', '${label}', event)" />
      </label>
    </div>`;

  galleryHtml += '</div>';
  if (ids.length > 0) {
    galleryHtml += `<div style="font-size:10px;color:#16a34a;font-weight:600;margin-top:2px;">✓ ${ids.length} photo${ids.length > 1 ? 's' : ''}</div>`;
  }

  const wrapper = document.querySelector(`[data-photo-field="${fieldKey}"]`);
  if (wrapper) wrapper.innerHTML = galleryHtml;
}

// View a full-size multi-doc photo
function viewMultiDocPhotoFull(fieldKey, index) {
  getSurvey(currentSurveyId).then(async survey => {
    let ids = survey[fieldKey];
    if (!Array.isArray(ids)) ids = [ids];
    const photo = await getPhotoById(ids[index]);
    if (photo && photo.dataUrl) {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
      modal.onclick = () => modal.remove();
      modal.innerHTML = `<img src="${photo.dataUrl}" style="max-width:95vw;max-height:90vh;border-radius:8px;" />`;
      document.body.appendChild(modal);
    }
  });
}

// Delete one photo from a multi-doc photo array
async function deleteMultiDocPhoto(fieldKey, index) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  let ids = survey[fieldKey];
  if (!Array.isArray(ids)) ids = ids ? [ids] : [];
  if (index < 0 || index >= ids.length) return;
  const photoId = ids[index];
  try { await deletePhoto(photoId); } catch(e) {}
  ids.splice(index, 1);
  survey[fieldKey] = ids;
  await saveSurvey(survey);
  await loadMultiDocPhotoPreview(fieldKey);
  showToast('Photo deleted');
}

// Build compact card HTML for a single item (SafetyCulture-style)
function buildCompactItemHTML(itemLabel, categoryName, itemData, options) {
  const safeLabel = itemLabel.replace(/'/g, "\\'");
  const safeCat = categoryName.replace(/'/g, "\\'");
  const isExcluded = itemData.excluded;
  const isFlagged = itemData.flagged;
  const ratingColor = RATING_COLORS[itemData.rating] || '#6b7280';
  const hasNotes = !!(itemData.text && itemData.text.trim());
  const photoCount = (itemData.photos || []).length;
  const optionsAttr = options.map(o => o.replace(/"/g, '&quot;')).join('|||');

  // v2189: show the FULL note on the survey page (no 80-char truncation).
  // Surveyor requested to read completed notes in full from the card view.
  // HTML-escape to prevent content from breaking the card markup.
  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const notePreview = hasNotes ? escapeHtml(itemData.text.trim()) : '';

  // Compact card row: label + photo count badge + rating badge
  const photoBadge = photoCount > 0 ? `<span style="display:inline-flex;align-items:center;gap:2px;background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap;vertical-align:middle;margin-left:4px;">📷${photoCount}</span>` : '';
  let html = `
    <div class="compact-item ${isExcluded ? 'excluded' : ''} ${isFlagged ? 'flagged' : ''}">
      <div class="compact-item-label ${isExcluded ? 'struck' : ''}">
        ${isFlagged ? '🚩 ' : ''}${isExcluded ? '⊘ ' : ''}${displayItemLabel(itemLabel)}${photoBadge}
      </div>
      <button class="compact-rating-badge ${itemData.rating ? '' : 'unrated'}"
              style="${itemData.rating ? `background:${ratingColor};` : ''}"
              data-options="${optionsAttr}"
              onclick="showRatingSheet('${safeLabel}', '${safeCat}', this.getAttribute('data-options').split('|||'))">
        ${itemData.rating ? getRatingShortLabel(itemData.rating) : 'Rate'}
      </button>
    </div>
  `;

  // Full note under the rating (v2189: no truncation, preserves paragraph
  // breaks via pre-wrap whitespace so long observations are readable).
  if (notePreview) {
    html += `
      <div style="padding:0 12px 4px 12px;cursor:pointer;" onclick="showNotesSheet('${safeLabel}', '${safeCat}')">
        <div style="font-size:13px;color:#374151;line-height:1.4;background:#f9fafb;padding:8px 12px;border-radius:6px;border-left:3px solid ${ratingColor};white-space:pre-wrap;">${notePreview}</div>
      </div>
    `;
  }

  // Standards tags (show selected ABYC/TC standards persistently) — only for A and B ratings
  if (itemData.standards && itemData.standards.length > 0 && itemData.rating && (itemData.rating.startsWith('A') || itemData.rating.startsWith('B'))) {
    html += `<div style="padding:0 12px 4px 12px;display:flex;flex-wrap:wrap;gap:4px;">`;
    itemData.standards.forEach(std => {
      html += `<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;border:1px solid #fcd34d;white-space:nowrap;">⚠️ ${std}</span>`;
    });
    html += `</div>`;
  }

  // Photo thumbnails row
  if (photoCount > 0) {
    html += `<div class="compact-photo-thumbs" style="display:flex;gap:4px;padding:2px 12px 4px 12px;flex-wrap:wrap;">`;
    itemData.photos.forEach(pid => {
      html += `<img id="thumb-${pid}" src="" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #ddd;cursor:pointer;" onclick="showMediaSheet('${safeLabel}', '${safeCat}')" />`;
    });
    html += `</div>`;
  }

  // Action row — icons only (no text labels), larger touch targets
  html += `
    <div class="compact-action-row">
      <button class="compact-action-btn ${hasNotes ? 'has-content' : ''}" onclick="showNotesSheet('${safeLabel}', '${safeCat}')"
              title="${hasNotes ? 'Edit notes' : 'Add note'}">
        📝${hasNotes ? ' ✓' : ''}
      </button>
      <button class="compact-action-btn ${photoCount > 0 ? 'has-content' : ''}" onclick="showMediaSheet('${safeLabel}', '${safeCat}')"
              title="${photoCount > 0 ? photoCount + ' photos' : 'Add photos'}">
        📷${photoCount > 0 ? ` ${photoCount}` : ''}
      </button>
      <button class="compact-action-btn ${isFlagged ? 'has-content' : ''}" onclick="toggleFlag('${safeLabel}')"
              title="Flag for follow-up">
        ${isFlagged ? '🚩' : '🏳️'}
      </button>
      <button class="compact-action-btn ${isExcluded ? 'has-content' : ''}" onclick="toggleExclude('${safeLabel}')"
              title="Exclude from report">
        ${isExcluded ? '⊘ ✓' : '⊘'}
      </button>
    </div>
  `;

  return html;
}

// Build the inner HTML for a single rated item (used by selectRating for targeted DOM updates)
// v2214: optional `survey` param threaded through to findTextVariants for vesselType chip filtering.
function buildSingleItemInnerHTML(itemLabel, categoryName, itemData, options, survey) {
  const safeLabel = itemLabel.replace(/'/g, "\\'");
  const safeCat = categoryName.replace(/'/g, "\\'");
  const isExcluded = itemData.excluded;
  const isFlagged = itemData.flagged;

  let html = `
    <div class="item-name" style="${isExcluded ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${isFlagged ? '🚩 ' : ''}${isExcluded ? '⊘ ' : ''}${displayItemLabel(itemLabel)}</div>
    <div class="rating-options">
  `;

  // Rating buttons
  options.forEach(option => {
    const isActive = itemData.rating === option;
    const color = RATING_COLORS[option] || '#006699';
    html += `
      <button class="rating-btn ${isActive ? 'active' : ''}"
              style="${isActive ? `background-color: ${color}; border-color: ${color};` : ''}"
              title="${getRatingTooltip(option)}"
              onclick="selectRating('${safeLabel}', '${safeCat}', '${option}')">
        ${getRatingShortLabel(option)}
      </button>
    `;
  });

  html += `</div>`;

  // Mast options selector (for Main mast item)
  if (itemLabel === 'Main mast') {
    const mastStepping = itemData.mastStepping || '';
    const mastTrackType = itemData.mastTrackType || '';
    html += `
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Mast Stepping</label>
        <select id="mastStepping-select" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;"
                onchange="saveMastOption('${safeLabel}', 'mastStepping', this.value)">
          <option value="">Select mast stepping...</option>
          <option value="Deck-stepped" ${mastStepping === 'Deck-stepped' ? 'selected' : ''}>Deck-stepped</option>
          <option value="Keel-stepped" ${mastStepping === 'Keel-stepped' ? 'selected' : ''}>Keel-stepped</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Sail Track Type</label>
        <select id="mastTrackType-select" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;"
                onchange="saveMastOption('${safeLabel}', 'mastTrackType', this.value)">
          <option value="">Select sail track type...</option>
          <option value="In-mast roller furling" ${mastTrackType === 'In-mast roller furling' ? 'selected' : ''}>In-mast roller furling</option>
          <option value="External track" ${mastTrackType === 'External track' ? 'selected' : ''}>External track</option>
          <option value="Internal track" ${mastTrackType === 'Internal track' ? 'selected' : ''}>Internal track</option>
        </select>
      </div>
    `;
  }

  // Outdrive manufacturer/model selector (for outdrive items — powerOnly)
  if (itemLabel.startsWith('Outdrive') && outdriveDb) {
    const odMake = itemData.outdriveMake || '';
    const odModel = itemData.outdriveModel || '';
    // Build make options
    let makeOpts = '<option value="">Select manufacturer...</option>';
    [...outdriveDb.outdrives].sort((a, b) => a.make.localeCompare(b.make)).forEach(od => {
      makeOpts += `<option value="${od.make}" ${odMake === od.make ? 'selected' : ''}>${od.make}</option>`;
    });
    makeOpts += '<option value="__other__">— Other (type manually) —</option>';
    // Build model options for selected make
    let modelOpts = '<option value="">Select model...</option>';
    if (odMake) {
      const maker = outdriveDb.outdrives.find(od => od.make === odMake);
      if (maker) {
        maker.models.forEach(m => {
          modelOpts += `<option value="${m.model}" ${odModel === m.model ? 'selected' : ''}>${m.model} — ${m.description}</option>`;
        });
        modelOpts += '<option value="__other__">— Other (type manually) —</option>';
      }
    }
    html += `
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Outdrive Manufacturer</label>
        <select id="outdriveMake-select" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;"
                onchange="onOutdriveMakeChange('${safeLabel}', '${safeCat}')">
          ${makeOpts}
        </select>
      </div>
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Outdrive Model</label>
        <select id="outdriveModel-select" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;"
                onchange="onOutdriveModelChange('${safeLabel}')">
          ${modelOpts}
        </select>
      </div>
    `;
  }

  // Winch manufacturer/model selector (for winch items — sailOnly)
  if (itemLabel.toLowerCase().includes('winch') && winchDb) {
    const wMake = itemData.winchMake || '';
    const wModel = itemData.winchModel || '';
    const isElectric = itemData.winchElectric || false;
    let wMakeOpts = '<option value="">Select manufacturer...</option>';
    [...winchDb.winches].sort((a, b) => a.make.localeCompare(b.make)).forEach(w => {
      wMakeOpts += `<option value="${w.make}" ${wMake === w.make ? 'selected' : ''}>${w.make}</option>`;
    });
    wMakeOpts += '<option value="__other__">— Other (type manually) —</option>';
    let wModelOpts = '<option value="">Select model...</option>';
    if (wMake) {
      const maker = winchDb.winches.find(w => w.make === wMake);
      if (maker) {
        maker.models.forEach(m => {
          wModelOpts += `<option value="${m.model}" ${wModel === m.model ? 'selected' : ''}>${m.model} — ${m.description}</option>`;
        });
        wModelOpts += '<option value="__other__">— Other (type manually) —</option>';
      }
    }
    html += `
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Winch Manufacturer</label>
        <select id="winchMake-select" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;"
                onchange="onWinchMakeChange('${safeLabel}', '${safeCat}')">
          ${wMakeOpts}
        </select>
      </div>
      <div class="form-group" style="margin-top:8px;">
        <label class="form-label">Winch Model</label>
        <select id="winchModel-select" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;"
                onchange="onWinchModelChange('${safeLabel}')">
          ${wModelOpts}
        </select>
      </div>
      <div class="form-group" style="margin-top:8px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
          <input type="checkbox" id="winchElectric-check" ${isElectric ? 'checked' : ''}
                 onchange="saveWinchOption('${safeLabel}', 'winchElectric', this.checked)"
                 style="width:18px;height:18px;">
          Electric winch
        </label>
      </div>
    `;
  }

  // Text snippet cards (tap to insert)
  if (itemData.rating && ['A - Critical', 'B - Needs Attention', 'C - Serviceable', 'Powered up only', 'Not tested / not verified', 'Not applicable'].includes(itemData.rating)) {
    const baseRating = itemData.rating.charAt(0);
    // v2216: pass full rating so findTextVariants can distinguish
    // "Not applicable" from "Not tested/not verified" (both start with 'N')
    const variants = findTextVariants(categoryName, itemLabel, itemData.rating, survey);

    if (variants.length > 0) {
      // Pre-compute diff-highlighted display texts
      const highlightedTexts = highlightSnippetDiffs(variants);

      html += `
        <div class="form-group">
          <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
            <span>📋 Quick Insert (${variants.length} snippet${variants.length > 1 ? 's' : ''})</span>
            <button class="btn-secondary" style="font-size:11px;padding:2px 8px;" onclick="toggleSnippets('${safeLabel}')">Show/Hide</button>
          </label>
          <div id="snippets-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}" style="display:none;max-height:300px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
      `;
      variants.forEach((variant, idx) => {
        // Escape for onclick="..." — single-quote escape for JS, &quot; for HTML
        const escapedText = variant.text
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/\n/g, '\\n')
          .replace(/"/g, '&quot;');
        const placeholdersJson = variant.placeholders
          ? JSON.stringify(variant.placeholders)
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '&quot;')
          : '';
        const ratingBadge = variant.rating || baseRating;
        const isActive = itemData.text === variant.text;
        // If the variant uses token syntax, render a clean preview instead
        // of showing raw {count:...}/{any:...} braces in the card.
        const hasTokens = /\{(count:|specify:|any:|standards\?)/.test(variant.text);
        const displayText = hasTokens
          ? escSnippet(renderSnippetPreview(variant.text))
          : (highlightedTexts[idx] || escSnippet(variant.text));
        html += `
            <div class="snippet-card" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;cursor:pointer;${isActive ? 'background:#d1fae5;border-left:4px solid #16a34a;' : ''}"
                 onclick="insertSnippet('${safeLabel}', '${safeCat}', '${escapedText}', this, '${placeholdersJson}')">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                <span style="font-size:12px;color:#333;line-height:1.5;">${displayText}</span>
                <span style="flex-shrink:0;font-size:10px;background:#e5e7eb;color:#374151;padding:2px 6px;border-radius:4px;white-space:nowrap;">${ratingBadge}</span>
              </div>
            </div>
        `;
      });
      html += `
          </div>
        </div>
      `;
    }
  }

  // Text field
  html += `
    <div class="form-group">
      <label class="form-label">Notes / Description</label>
      <textarea id="text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}" placeholder="Add inspection notes..." style="min-height: 80px;" autocapitalize="sentences" onblur="autoSaveItemText('${safeLabel}', '${safeCat}')" oninput="checkFirstPerson(this)">${itemData.text || ''}</textarea>
      <div id="text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}-fp-warn" style="display:none;padding:6px 10px;margin-top:4px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;color:#92400e;">⚠️ First-person language detected — the report will auto-convert to third person (e.g. "I was" → "the surveyor was").</div>
      <div id="text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}-chipstrip" style="display:none;flex-wrap:wrap;gap:6px;margin-top:6px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;"></div>
    </div>
  `;

  // Standards (for A and B ratings)
  if (itemData.rating && (itemData.rating.startsWith('A') || itemData.rating.startsWith('B'))) {
    const standards = getStandardsForCategory(categoryName, itemData.rating);
    if (standards.length > 0) {
      html += `
        <div class="form-group">
          <label class="form-label">Applicable Standards</label>
          <div style="display: grid; gap: 8px;">
      `;
      standards.forEach(standard => {
        const isChecked = itemData.standards && itemData.standards.includes(standard);
        html += `
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" value="${standard}"
                   ${isChecked ? 'checked' : ''}
                   onchange="updateStandards('${safeLabel}', this)" />
            <span>${standard}</span>
          </label>
        `;
      });
      html += `
          </div>
        </div>
      `;
    }
  }

  // Photos section
  html += `
    <div class="form-group">
      <label class="form-label">Photos</label>
      <div class="photo-grid" id="photos-${itemLabel.replace(/'/g, '')}">
  `;

  if (itemData.photos && itemData.photos.length > 0) {
    itemData.photos.forEach(photoId => {
      html += `
        <div class="photo-item" style="position: relative;">
          <img src="" id="thumb-${photoId}" class="photo-thumbnail"
               onclick="editSavedPhoto('${photoId}', '${safeLabel}')" />
          <button style="position: absolute; top: -8px; right: -8px; width: 28px; height: 28px;
                       border-radius: 50%; background: #dc2626; color: white; border: none;
                       font-weight: bold; cursor: pointer;"
                  onclick="deletePhotoAndRefresh('${photoId}')">×</button>
        </div>
      `;
    });
  }

  html += `
      </div>
      <button type="button" class="btn-photo-upload"
              onclick="openBatchCamera('${safeLabel}')"
              style="cursor:pointer;">
        📷 Capture Photos
      </button>
    </div>
  `;

  // Flag and exclude buttons (no save button — auto-saves on blur)
  html += `
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn-secondary" style="flex:1;font-size:13px;padding:8px 12px;${isExcluded ? 'background:#fee2e2;border-color:#fca5a5;' : ''}"
              onclick="toggleExclude('${safeLabel}')"
              title="Exclude from report"
      >${isExcluded ? '⊘ Excluded' : '⊘ Skip'}</button>
      <button class="btn-secondary" style="flex:1;font-size:13px;padding:8px 12px;${isFlagged ? 'background:#fef3c7;border-color:#f59e0b;' : ''}"
              onclick="toggleFlag('${safeLabel}')"
              title="Flag for follow-up"
      >${isFlagged ? '🚩 Flagged' : '🏳️ Flag'}</button>
    </div>
  `;

  return html;
}

// Get the rating options for an item from the survey template
function getItemOptionsFromTemplate(survey, itemLabel) {
  const activeTemplate = getTemplateForSurvey(survey);
  for (const section of activeTemplate) {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      for (const category of section.categories) {
        if (category.items) {
          for (const item of category.items) {
            if (item.label === itemLabel && item.type === 'list') {
              return item.options;
            }
          }
        }
      }
    }
  }
  return ['A - Critical', 'B - Needs Attention', 'C - Serviceable', 'Powered up only', 'Not tested/not verified', 'Not applicable'];
}

// Update the category header's completion percentage without full re-render
function updateCategoryHeader(survey, categoryName) {
  const accordion = document.querySelector(`.category-accordion[data-category-name="${categoryName.replace(/"/g, '\\"')}"]`);
  if (!accordion) return;

  const header = accordion.querySelector('.accordion-header');
  if (!header) return;

  // Get category items from template (with sail-only and conditional filtering)
  const activeTemplate = getTemplateForSurvey(survey);
  const sailOnlyCategories = ['Spars and rigging', 'Sails'];
  const isPowerboat = (survey.vesselType || '').toLowerCase() === 'power';
  const isSailboat = (survey.vesselType || '').toLowerCase() === 'sail';
  let categoryItems = [];

  // Drive type filtering arrays
  const driveType = survey.driveType || '';
  const SHAFT_ONLY_LABELS = [
    'Cutlass bearing(s)', 'Propeller shaft(s)', 'Propeller(s)',
    'Propeller/drive anode(s)', 'Stern tube(s) (external)', 'Skeg(s)'
  ];
  const OUTDRIVE_ONLY_LABELS = [
    'Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows'
  ];
  const SAILDRIVE_ONLY_LABELS = [
    'Sail drive(s) - (external), corrosion, propeller(s), anode(s)'
  ];
  const IPS_ONLY_LABELS = [
    'IPS pod drive(s)'
  ];

  function shouldShowHeaderItem(item) {
    if (isPowerboat && item.sailOnly) return false;
    if (isSailboat && item.powerOnly) return false;
    if (isPowerboat && item.rudderItem) {
      // v2210: derive hasRudder from driveType when explicit field is absent
      // (existing surveys have no hasRudder). Outdrive/saildrive/IPS → no rudder;
      // shaft drive → has rudder. Explicit survey.hasRudder (boolean) still wins.
      const _hasRudder = (typeof survey.hasRudder === 'boolean')
        ? survey.hasRudder
        : !['outdrive','saildrive','ips'].includes((survey.driveType||'').toLowerCase());
      if (!_hasRudder) return false;
    }
    if (isPowerboat && ['Keel and keel joint', 'Keel bolts'].includes(item.label)) return false;
    // Drive type filtering
    if (driveType) {
      if (driveType === 'outdrive') {
        if (SAILDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (SHAFT_ONLY_LABELS.includes(item.label)) return false;
      } else if (driveType === 'saildrive') {
        if (OUTDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (SHAFT_ONLY_LABELS.includes(item.label)) return false;
      } else if (driveType === 'shaft') {
        if (OUTDRIVE_ONLY_LABELS.includes(item.label)) return false;
        if (SAILDRIVE_ONLY_LABELS.includes(item.label)) return false;
      }
    }
    if (item.conditional) {
      const thrusterRating = survey.items['Bow thruster']?.rating;
      const sternThrusterRating = survey.items['Stern thruster']?.rating;
      const propaneRating = survey.items['Propane valve, regulator, gauge, storage compartment and vent']?.rating;
      if (item.conditional === 'bowThruster' && (!thrusterRating || thrusterRating === 'Not applicable')) return false;
      if (item.conditional === 'sternThruster' && (!sternThrusterRating || sternThrusterRating === 'Not applicable')) return false;
      if (item.conditional === 'propane' && (!propaneRating || propaneRating === 'Not applicable')) return false;
    }
    return true;
  }

  for (const section of activeTemplate) {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      for (const category of section.categories) {
        if (category.name === categoryName) {
          if (isPowerboat && sailOnlyCategories.includes(category.name)) return;
          categoryItems = category.items ? category.items.filter(i => i.type === 'list' && shouldShowHeaderItem(i)) : [];
          break;
        }
      }
    }
  }

  if (categoryItems.length === 0) return;

  // Expand / singularise drive line items for header progress tracking
  const headerDriveLineCount = survey.driveLineCount || 1;
  if (headerDriveLineCount === 1) {
    categoryItems = categoryItems.map(item => {
      if (item.driveLineItem) return { ...item, label: item.label.replace(/\(s\)/g, '') };
      return item;
    });
  } else {
    const dlLabels = headerDriveLineCount === 2
      ? ['Port', 'Starboard']
      : Array.from({ length: headerDriveLineCount }, (_, i) => `#${i + 1}`);
    const expanded = [];
    categoryItems.forEach(item => {
      if (!item.driveLineItem) { expanded.push(item); }
      else {
        const base = item.label.replace(/\(s\)/g, '');
        for (let t = 0; t < headerDriveLineCount; t++) {
          expanded.push({ ...item, label: `${dlLabels[t]} — ${base.trim()}` });
        }
      }
    });
    categoryItems = expanded;
  }

  // Expand / singularise hull items for header progress tracking
  const headerHullCount = inferHullCount(survey);
  if (headerHullCount === 1) {
    categoryItems = categoryItems.map(item => {
      if (item.hullItem) return { ...item, label: item.label.replace(/\(s\)/g, '') };
      return item;
    });
  } else {
    const hullLabels = headerHullCount === 2
      ? ['Port hull', 'Starboard hull']
      : ['Port hull', 'Centre hull', 'Starboard hull'];
    const expanded = [];
    categoryItems.forEach(item => {
      if (!item.hullItem) { expanded.push(item); }
      else {
        const base = item.label.replace(/\(s\)/g, '').replace(/^Hull\s+/, 'Hull ');
        for (let h = 0; h < headerHullCount; h++) {
          expanded.push({ ...item, label: `${hullLabels[h]} — ${base.trim()}` });
        }
      }
    });
    categoryItems = expanded;
  }

  const completionCount = categoryItems.filter(item =>
    survey.items[item.label]?.rating || survey.items[item.label]?.excluded
  ).length;
  const excludedCount = categoryItems.filter(item => survey.items[item.label]?.excluded).length;
  const allExcluded = excludedCount === categoryItems.length && categoryItems.length > 0;
  const completionPct = Math.round((completionCount / categoryItems.length) * 100);
  const isComplete = completionPct === 100;
  const progressColor = allExcluded ? '#9ca3af' : (isComplete ? '#16a34a' : '#dc2626');

  // Update the completion dot
  const dot = header.querySelector('.completion-dot');
  if (dot && dot.style) {
    dot.style.background = isComplete ? '#16a34a' : '#dc2626';
  }

  // Update the progress text. When items remain, we want a clickable
  // button that opens the "items left" list. When Done or fully Skipped,
  // a plain span is enough. Because we swap element types, replace
  // outerHTML rather than just setting textContent.
  const remaining = categoryItems.length - completionCount;
  const progressText = allExcluded ? 'Skipped' : (isComplete ? 'Done' : `${remaining} left`);
  const progressHtml = (allExcluded || isComplete)
    ? `<span class="category-progress" style="color:${progressColor};font-weight:700;">${progressText}</span>`
    : `<button type="button" class="category-progress remaining-btn" onclick="event.stopPropagation(); toggleRemainingList(this);" title="Show items left to rate" style="color:${progressColor};font-weight:700;background:transparent;border:none;cursor:pointer;padding:0;margin-left:12px;font:inherit;font-size:12px;text-decoration:underline dotted;">${progressText} ▾</button>`;
  const progressEl = header.querySelector('.category-progress');
  if (progressEl) {
    progressEl.outerHTML = progressHtml;
  }

  // Update flagged/excluded badges in title
  const flaggedItems = categoryItems.filter(item => survey.items[item.label]?.flagged);
  const flaggedCount = flaggedItems.length;
  // Build subtitle badges (flagged info shown in yellow summary bar below header)
  let badges = '';
  if (excludedCount > 0 && !allExcluded) {
    badges += `<span style="color:#6b7280;font-size:11px;background:#f3f4f6;padding:1px 6px;border-radius:4px;margin-left:4px;">${excludedCount} skipped</span>`;
  }
  const titleEl = header.querySelector('.category-title');
  if (titleEl) {
    titleEl.innerHTML = `${categoryName}${badges}`;
  }
  // Clear any open popover since item counts may have changed
  const stalePopover = accordion.querySelector('.remaining-list-popover');
  if (stalePopover) stalePopover.remove();

  // Update flagged summary below header
  let summaryEl = accordion.querySelector('.flagged-summary');
  if (flaggedCount > 0) {
    const summaryHtml = `🚩 ${flaggedCount} flagged: ${flaggedItems.map(i => i.label).join(', ')}`;
    if (summaryEl) {
      summaryEl.innerHTML = summaryHtml;
    } else {
      summaryEl = document.createElement('div');
      summaryEl.className = 'flagged-summary';
      summaryEl.style.cssText = 'padding:4px 12px 6px 28px;font-size:12px;color:#92400e;background:#fffbeb;border-bottom:1px solid #fcd34d;';
      summaryEl.innerHTML = summaryHtml;
      header.insertAdjacentElement('afterend', summaryEl);
    }
  } else if (summaryEl) {
    summaryEl.remove();
  }
}

function selectRating(itemLabel, categoryName, rating) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }

    // Deselect: if tapping the same rating, clear it
    if (survey.items[itemLabel].rating === rating) {
      survey.items[itemLabel].rating = '';
      survey.items[itemLabel].text = '';
      survey.items[itemLabel].standards = [];
      survey.items[itemLabel].variantText = '';
    } else {
      const oldText = survey.items[itemLabel].text || '';
      const oldVariant = survey.items[itemLabel].variantText || '';
      survey.items[itemLabel].rating = rating;
      // Only clear text if it was auto-inserted from a snippet (matches variantText).
      // If the user has manually edited the notes, preserve them.
      if (oldText === oldVariant || oldText === '') {
        survey.items[itemLabel].text = '';
        survey.items[itemLabel].variantText = '';
      }
      // Auto-apply the single most relevant standard for A and B ratings only
      if (rating.startsWith('A') || rating.startsWith('B')) {
        const itemStandard = getStandardForItem(itemLabel, categoryName);
        survey.items[itemLabel].standards = itemStandard ? [itemStandard] : [];
      } else {
        survey.items[itemLabel].standards = [];
      }
    }

    if (typeof SaveStatus !== 'undefined') SaveStatus.markSaving();
    saveSurvey(survey).then(() => {
      if (typeof SaveStatus !== 'undefined') SaveStatus.markSaved();
      // Try compact card update first (new layout)
      const compactDiv = document.querySelector(`.compact-item-wrapper[data-item-label="${itemLabel.replace(/"/g, '\\"')}"]`);
      if (compactDiv) {
        const options = getItemOptionsFromTemplate(survey, itemLabel);
        const itemData = survey.items[itemLabel];
        compactDiv.innerHTML = buildCompactItemHTML(itemLabel, categoryName, itemData, options);
        // Load photo thumbnails for inline display
        if (itemData.photos && itemData.photos.length > 0) {
          itemData.photos.forEach(photoId => {
            getPhotoById(photoId).then(photo => {
              if (photo) {
                const img = document.getElementById(`thumb-${photoId}`);
                if (img) img.src = photo.dataUrl;
              }
            });
          });
        }
        updateCategoryHeader(survey, categoryName);
        return;
      }

      // Fallback: old rated-item layout
      const itemDiv = document.querySelector(`.rated-item[data-item-label="${itemLabel.replace(/"/g, '\\"')}"]`);
      if (!itemDiv) {
        renderInspection(survey);
        return;
      }

      const options = getItemOptionsFromTemplate(survey, itemLabel);
      const itemData = survey.items[itemLabel];

      const isExcluded = itemData.excluded;
      itemDiv.style.cssText = isExcluded ? 'opacity:0.5;border-left:4px solid #d1d5db;' : itemData.flagged ? 'border-left:4px solid #f59e0b;' : '';
      itemDiv.innerHTML = buildSingleItemInnerHTML(itemLabel, categoryName, itemData, options, survey);

      if (itemData.photos && itemData.photos.length > 0) {
        itemData.photos.forEach(photoId => {
          getPhotoById(photoId).then(photo => {
            if (photo) {
              const img = document.getElementById(`thumb-${photoId}`);
              if (img) img.src = photo.dataUrl;
            }
          });
        });
      }

      updateCategoryHeader(survey, categoryName);
    });
  });
}

function selectTextVariant(itemLabel, categoryName, variantText) {
  getSurvey(currentSurveyId).then(survey => {
    if (survey.items[itemLabel]) {
      survey.items[itemLabel].text = variantText;
      survey.items[itemLabel].variantText = variantText;
      saveSurvey(survey);
    }
  });
}

// Toggle snippet panel visibility
function toggleSnippets(itemLabel) {
  const safeId = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const panel = document.getElementById('snippets-' + safeId);
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

// Insert a snippet into the textarea and save
function insertSnippet(itemLabel, categoryName, text, cardEl, placeholdersJson) {
  const safeId = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const textarea = document.getElementById('text-' + safeId);

  // Resolve count tokens. Per-drive-line items (Port —, Starboard —, #N —)
  // force singular because each expanded item is about ONE component.
  getSurvey(currentSurveyId).then(survey => {
    const sideMatch = itemLabel.match(/^(Port|Starboard|#\d+)\s*—\s*/);
    const isPerDriveLine = !!sideMatch;
    const sideWord = sideMatch ? sideMatch[1] : '';
    const dlc = isPerDriveLine
      ? 1
      : ((survey && survey.driveLineCount) ? parseInt(survey.driveLineCount, 10) || 1 : 1);
    let resolved = resolveCountTokens(text, dlc);
    // Expand rudder-gating tokens (B-07)
    if (typeof window.expandSnippetTokens === 'function' && survey) {
      const ctx = (window.KikiSnippetTokens && window.KikiSnippetTokens.contextFromSurvey)
        ? window.KikiSnippetTokens.contextFromSurvey(survey)
        : { hasRudder: survey.hasRudder !== false, rudderCount: survey.driveLineCount || 1 };
      resolved = window.expandSnippetTokens(resolved, ctx);
    }
    if (sideWord) {
      resolved = applySidePrefix(resolved, sideWord);
    }

    if (textarea) {
      textarea.value = resolved;
      textarea.dataset.snippetPlaceholders = placeholdersJson || '';
      textarea.dataset.snippetTemplate = resolved;
      delete textarea.dataset.snippetCount;
      setCollectedCitations(textarea, []);
      // Auto-resize
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      refreshChipStrip(textarea);
    }

    // Highlight the selected card
    if (cardEl) {
      const panel = cardEl.parentElement;
      if (panel) {
        panel.querySelectorAll('.snippet-card').forEach(c => {
          c.style.background = '';
          c.style.borderLeft = '';
        });
      }
      cardEl.style.background = '#d1fae5';
      cardEl.style.borderLeft = '4px solid #16a34a';
    }

    // Save the live textarea value (with unresolved tokens still in it if
    // any remain); finalization happens on the saveItem blur path.
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].text = textarea ? textarea.value : resolved;
    survey.items[itemLabel].variantText = text;
    saveSurvey(survey);
  });
}

// Toggle flag for follow-up on an item
function toggleFlag(itemLabel) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].flagged = !survey.items[itemLabel].flagged;
    saveSurvey(survey).then(() => {
      updateItemInPlace(survey, itemLabel);
    });
  });
}

// Toggle exclude from report on a single item
async function toggleExclude(itemLabel) {
  const survey = await getSurvey(currentSurveyId);
  if (!survey.items[itemLabel]) {
    survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
  }
  const item = survey.items[itemLabel];
  const willSkip = !item.excluded;
  // v2195: if the surveyor is about to skip an item that has saved notes,
  // confirm — and clear the notes on confirmation. Prevents accidental
  // skip-with-stale-text. Unskipping is always safe and doesn't prompt.
  if (willSkip && item.text && item.text.trim()) {
    const confirmed = await showConfirm(
      `This item has saved notes. Skipping will mark it excluded from the report and clear the text. Continue?`,
      'Skip and clear', 'Cancel'
    );
    if (!confirmed) return;
    item.text = '';
  }
  item.excluded = willSkip;
  await saveSurvey(survey);
  updateItemInPlace(survey, itemLabel);
}

// Update a single item in place without re-rendering the entire page
function updateItemInPlace(survey, itemLabel) {
  // Try compact card first
  const compactDiv = document.querySelector(`.compact-item-wrapper[data-item-label="${itemLabel.replace(/"/g, '\\"')}"]`);
  if (compactDiv) {
    const accordion = compactDiv.closest('.category-accordion');
    const categoryName = accordion ? accordion.dataset.categoryName : '';
    const options = getItemOptionsFromTemplate(survey, itemLabel);
    const itemData = survey.items[itemLabel] || { rating: '', text: '', standards: [], photos: [] };
    compactDiv.innerHTML = buildCompactItemHTML(itemLabel, categoryName, itemData, options);
    // Load photo thumbnails
    if (itemData.photos && itemData.photos.length > 0) {
      itemData.photos.forEach(photoId => {
        getPhotoById(photoId).then(photo => {
          if (photo) {
            const img = document.getElementById(`thumb-${photoId}`);
            if (img) img.src = photo.dataUrl;
          }
        });
      });
    }
    if (categoryName) updateCategoryHeader(survey, categoryName);
    return;
  }

  // Try area photo (media item) update — delegate to refreshAreaPhotoGrid
  const sanitizedLabel = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const areaWrap = document.getElementById(`area-photo-wrap-${sanitizedLabel}`);
  if (areaWrap) {
    refreshAreaPhotoGrid(survey, itemLabel);
    return;
  }

  // Fallback: old rated-item layout
  const itemDiv = document.querySelector(`.rated-item[data-item-label="${itemLabel.replace(/"/g, '\\"')}"]`);
  if (!itemDiv) {
    renderInspection(survey);
    return;
  }

  const accordion = itemDiv.closest('.category-accordion');
  const categoryName = accordion ? accordion.dataset.categoryName : '';

  const options = getItemOptionsFromTemplate(survey, itemLabel);
  const itemData = survey.items[itemLabel] || { rating: '', text: '', standards: [], photos: [] };

  const isExcluded = itemData.excluded;
  itemDiv.style.cssText = isExcluded ? 'opacity:0.5;border-left:4px solid #d1d5db;' : itemData.flagged ? 'border-left:4px solid #f59e0b;' : '';
  itemDiv.innerHTML = buildSingleItemInnerHTML(itemLabel, categoryName, itemData, options, survey);

  if (itemData.photos && itemData.photos.length > 0) {
    itemData.photos.forEach(photoId => {
      getPhotoById(photoId).then(photo => {
        if (photo) {
          const img = document.getElementById(`thumb-${photoId}`);
          if (img) img.src = photo.dataUrl;
        }
      });
    });
  }

  if (categoryName) updateCategoryHeader(survey, categoryName);
}

// Toggle exclude for all items in a category
// Update the number of heads and re-render inspection
function updateHeadCount(count) {
  getSurvey(currentSurveyId).then(survey => {
    survey.headCount = count;
    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

function updateHullCount(count) {
  getSurvey(currentSurveyId).then(survey => {
    survey.hullCount = count;
    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

function setVesselTypeFromInspection(vesselType) {
  getSurvey(currentSurveyId).then(survey => {
    const previousType = survey.vesselType;
    survey.vesselType = vesselType;

    // Auto-configure drive settings based on vessel type
    if (vesselType === 'sail') {
      // Sailboats: always 1 drive line, always has rudder
      survey.driveLineCount = 1;
      survey.hasRudder = true;
      // Clear power-only drive types if switching to sail
      if (survey.driveType === 'outdrive' || survey.driveType === 'ips') {
        survey.driveType = '';
      }
    } else if (vesselType === 'power') {
      // Clear saildrive drive type if switching from sail
      if (survey.driveType === 'saildrive') {
        survey.driveType = '';
      }
    }

    saveSurvey(survey).then(() => {
      renderInspection(survey);
      showToast(`Vessel type set to ${vesselType === 'sail' ? 'Sailing vessel' : 'Power-driven'}`);
    });
  });
}

function updateDriveLineCount(count) {
  getSurvey(currentSurveyId).then(survey => {
    survey.driveLineCount = count;
    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

function updateDriveType(driveType) {
  getSurvey(currentSurveyId).then(survey => {
    survey.driveType = driveType;
    const isSailboat = (survey.vesselType || '').toLowerCase() === 'sail';
    // Auto-configure based on drive type selection
    if (isSailboat) {
      // Sailboats: always 1 drive line, always has rudder
      survey.driveLineCount = 1;
      survey.hasRudder = true;
    } else {
      // Powerboats: auto-set rudder based on drive type (B-09).
      // Outdrive / IPS / saildrive all steer via the drive unit, no rudder.
      // Shaft drive is the only power configuration with a separate rudder.
      if (driveType === 'outdrive' || driveType === 'ips' || driveType === 'saildrive') {
        survey.hasRudder = false;
      } else if (driveType === 'shaft') {
        survey.hasRudder = true;
      }
    }
    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

function toggleHasRudder(hasRudder) {
  getSurvey(currentSurveyId).then(survey => {
    survey.hasRudder = hasRudder;
    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

async function toggleCategoryExclude(categoryName, exclude) {
  // Confirm before skipping an entire category (easy to tap by accident)
  if (exclude) {
    const yes = await showConfirm(`Skip entire "${categoryName}" category?\n\nAll items will be excluded from the report.`, 'Skip Category', 'Cancel');
    if (!yes) return;
  }
  getSurvey(currentSurveyId).then(survey => {
    // Find the category items from the active template
    const activeTemplate = getTemplateForSurvey(survey);

    // Auto-skip associated gauges categories when skipping Pilot house or Flybridge
    const linkedCategories = {
      'Pilot house': ['Pilot house gauges and instrumentation'],
      'Flybridge': ['Flybridge gauges and instrumentation'],
    };
    const categoriesToSkip = [categoryName, ...(linkedCategories[categoryName] || [])];

    let itemLabels = [];
    activeTemplate.forEach(section => {
      if (section.categories) {
        section.categories.forEach(cat => {
          if (categoriesToSkip.includes(cat.name) && cat.items) {
            // v2219: include both rated items and media (area-photo) items
            // so skipping a category covers everything in it.
            itemLabels.push(...cat.items.filter(i => i.type === 'list' || i.type === 'media').map(i => i.label));
          }
        });
      }
    });
    itemLabels.forEach(label => {
      if (!survey.items[label]) {
        survey.items[label] = { rating: '', text: '', standards: [], photos: [] };
      }
      survey.items[label].excluded = exclude;
    });

    // When skipping, collapse the accordion so it folds up
    if (exclude) {
      _openAccordionCategory = null;
    }

    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

function updateStandards(itemLabel, checkbox) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }

    const standards = Array.from(checkbox.parentElement.parentElement.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    survey.items[itemLabel].standards = standards;
    saveSurvey(survey);
  });
}

function saveItemData(itemLabel, categoryName) {
  autoSaveItemText(itemLabel, categoryName);
}

// Retroactive engine sync — runs once when a survey is opened for inspection.
// If body checklist items have engine/gearbox data but the intro header fields are empty,
// copies the body data into the intro so both places are populated.
function _retroSyncEngineFromBody(survey) {
  let changed = false;
  const items = survey.items || {};

  // Helper: sync a text field from body to intro if body has data and intro is empty/missing
  const syncText = (itemLabel, surveyField) => {
    const item = items[itemLabel];
    if (item && item.text && item.text.trim() && !survey[surveyField]) {
      survey[surveyField] = item.text.trim();
      return true;
    }
    return false;
  };

  // Helper: sync first photo from body item to intro field
  const syncPhoto = (itemLabel, surveyField) => {
    const item = items[itemLabel];
    if (item && item.photos && item.photos.length > 0 && !survey[surveyField]) {
      survey[surveyField] = item.photos[0];
      return true;
    }
    return false;
  };

  // Sync engine hours
  if (syncText('Engine hours', 'engineHours')) changed = true;

  // Sync engine make/model/serial (uses parser)
  const emItem = items['Engine(s) manufacturer, model # and serial number (if available)'];
  if (emItem && emItem.text && emItem.text.trim() && !survey.engineMake && !survey.engineModel) {
    _parseAndSyncMakeModelSerial(survey, emItem.text.trim(), 'engine');
    changed = true;
  }

  // Sync gearbox/transmission make/model/serial (uses parser)
  const gmItem = items['Gearbox manufacturer, model # and serial # (if available)'];
  if (gmItem && gmItem.text && gmItem.text.trim() && !survey.transmissionMake && !survey.transmissionModel) {
    _parseAndSyncMakeModelSerial(survey, gmItem.text.trim(), 'transmission');
    changed = true;
  }

  // Sync fuel type
  if (syncText('Fuel type', 'fuelType')) changed = true;

  // Sync photos — engine, engine nameplate, gearbox/transmission
  if (syncPhoto('Engine(s) and drive(s) photos', 'enginePhoto')) changed = true;
  if (syncPhoto('Engine name plate(s)', 'enginePlatePhoto')) changed = true;
  if (syncPhoto('Gearbox nameplate(s)', 'transmissionPlatePhoto')) changed = true;
  if (syncPhoto('Transmission nameplate(s)', 'transmissionPlatePhoto')) changed = true;
  // Gearbox general condition photos → transmissionPhoto (main gearbox photo)
  if (syncPhoto('Gearbox general condition/impressions', 'transmissionPhoto')) changed = true;
  if (syncPhoto('Gearbox oil', 'transmissionPhoto')) changed = true;

  return changed;
}

// Auto-save item text on blur — no alert, just a subtle toast
// Auto-sync engine/gearbox data from checklist body items into survey header fields.
// Called on every item text save — only acts on engine/gearbox-related items.
function _syncEngineFieldsFromBody(survey, itemLabel, text) {
  if (!text || !text.trim()) return;
  const raw = text.trim();

  // Engine hours
  if (itemLabel === 'Engine hours') {
    survey.engineHours = raw;
    return;
  }

  // Engine manufacturer, model, serial
  if (itemLabel === 'Engine(s) manufacturer, model # and serial number (if available)') {
    _parseAndSyncMakeModelSerial(survey, raw, 'engine');
    return;
  }

  // Gearbox/transmission manufacturer, model, serial
  if (itemLabel === 'Gearbox manufacturer, model # and serial # (if available)') {
    _parseAndSyncMakeModelSerial(survey, raw, 'transmission');
    return;
  }
}

// Parse "Make Model, Serial: XXX" and sync to survey header fields
function _parseAndSyncMakeModelSerial(survey, raw, prefix) {
  const makeKey = prefix + 'Make';
  const modelKey = prefix + 'Model';
  const serialKey = prefix + 'Serial';

  const serialMatch = raw.match(/[,;]?\s*(?:serial(?:\s*(?:#|number|no\.?)?)?[:=\s]+)(.+)/i);
  if (serialMatch) {
    const beforeSerial = raw.substring(0, raw.indexOf(serialMatch[0])).trim();
    survey[serialKey] = serialMatch[1].trim();
    const parts = beforeSerial.split(/\s+/);
    if (parts.length >= 2) {
      survey[makeKey] = parts[0];
      survey[modelKey] = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      survey[makeKey] = parts[0];
    }
  } else {
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      survey[makeKey] = parts[0];
      survey[modelKey] = parts.slice(1).join(' ');
    } else {
      survey[makeKey] = raw;
    }
  }
}

// Auto-sync engine/gearbox PHOTOS from checklist body media items to intro header fields.
// Called after area photos are captured, deleted, or after regular item photos are saved.
// Always updates the intro to match the body — if body has no photos, clears the intro.
function _syncEnginePhotosFromBody(survey) {
  const _firstPhoto = (label) => {
    const item = survey.items[label];
    return (item && item.photos && item.photos.length > 0) ? item.photos[0] : null;
  };

  // Engine photos → enginePhoto (first photo from body, or null)
  const ep = _firstPhoto('Engine(s) and drive(s) photos');
  if (ep !== null) survey.enginePhoto = ep;
  else if (survey.items['Engine(s) and drive(s) photos']) survey.enginePhoto = null;

  // Engine nameplate photos → enginePlatePhoto
  const enp = _firstPhoto('Engine name plate(s)');
  if (enp !== null) survey.enginePlatePhoto = enp;
  else if (survey.items['Engine name plate(s)']) survey.enginePlatePhoto = null;

  // Gearbox/transmission nameplate photos → transmissionPlatePhoto
  const gp = _firstPhoto('Gearbox nameplate(s)');
  if (gp !== null) survey.transmissionPlatePhoto = gp;
  else if (survey.items['Gearbox nameplate(s)']) survey.transmissionPlatePhoto = null;

  // Gearbox general condition photos → transmissionPhoto
  const gc = _firstPhoto('Gearbox general condition/impressions');
  if (gc !== null) survey.transmissionPhoto = gc;
  else if (survey.items['Gearbox general condition/impressions']) survey.transmissionPhoto = null;
}

// Live first-person detection warning on item textareas
const _fpPattern = /\b(I was|I am|I have|I had|I could|I did|I found|I noted|I observed|I recommend|I inspected|I tested|I measured|I checked|my inspection|my opinion|my assessment|my findings|my experience|as I)\b/i;
function checkFirstPerson(textarea) {
  const warnId = textarea.id + '-fp-warn';
  const warn = document.getElementById(warnId);
  if (!warn) return;
  warn.style.display = _fpPattern.test(textarea.value) ? 'block' : 'none';
}

function autoSaveItemText(itemLabel, categoryName) {
  getSurvey(currentSurveyId).then(survey => {
    const textareaId = `text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const textArea = document.getElementById(textareaId);
    // Expand any {standards?...} block with collected citations before saving
    const text = textArea
      ? ((typeof finalizeSnippetText === 'function') ? finalizeSnippetText(textArea) : textArea.value)
      : '';

    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }

    // Only save if text actually changed
    if (survey.items[itemLabel].text === text) return;

    survey.items[itemLabel].text = text;

    // Auto-sync engine checklist data → intro header fields
    _syncEngineFieldsFromBody(survey, itemLabel, text);

    if (typeof SaveStatus !== 'undefined') SaveStatus.markSaving();
    saveSurvey(survey).then(() => {
      if (typeof SaveStatus !== 'undefined') SaveStatus.markSaved();
      showToast('Saved');
    }).catch(err => {
      if (typeof SaveStatus !== 'undefined') SaveStatus.markError(err && err.message);
    });
  });
}

// ─── Outdrive Make/Model Cascading Dropdowns ─────────────────────────────

function onOutdriveMakeChange(itemLabel, categoryName) {
  const select = document.getElementById('outdriveMake-select');
  const makeVal = select.value;

  // "Other" — swap to text input
  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'outdriveMake-select';
    input.placeholder = 'Type outdrive manufacturer...';
    input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
    input.onblur = function() { saveOutdriveOption(itemLabel, 'outdriveMake', this.value); };
    select.replaceWith(input);
    input.focus();
    // Also swap model to text input
    const modelSelect = document.getElementById('outdriveModel-select');
    if (modelSelect) {
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'outdriveModel-select';
      modelInput.placeholder = 'Type outdrive model...';
      modelInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
      modelInput.onblur = function() { saveOutdriveOption(itemLabel, 'outdriveModel', this.value); };
      modelSelect.replaceWith(modelInput);
    }
    return;
  }

  // Save the make
  saveOutdriveOption(itemLabel, 'outdriveMake', makeVal);

  // Populate model dropdown
  const modelSelect = document.getElementById('outdriveModel-select');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model...</option>';

  if (outdriveDb && makeVal) {
    const maker = outdriveDb.outdrives.find(od => od.make === makeVal);
    if (maker) {
      maker.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.model;
        opt.textContent = `${m.model} — ${m.description}`;
        modelSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option');
      otherOpt.value = '__other__';
      otherOpt.textContent = '— Other (type manually) —';
      modelSelect.appendChild(otherOpt);
    }
  }
  // Clear model when make changes
  saveOutdriveOption(itemLabel, 'outdriveModel', '');
}

function onOutdriveModelChange(itemLabel) {
  const modelSelect = document.getElementById('outdriveModel-select');
  const modelVal = modelSelect.value;

  // "Other" — swap to text input
  if (modelVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'outdriveModel-select';
    input.placeholder = 'Type outdrive model...';
    input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
    input.onblur = function() { saveOutdriveOption(itemLabel, 'outdriveModel', this.value); };
    modelSelect.replaceWith(input);
    input.focus();
    return;
  }

  saveOutdriveOption(itemLabel, 'outdriveModel', modelVal);
}

function onSheetOutdriveMakeChange(itemLabel) {
  const select = document.getElementById('sheet-outdriveMake');
  const makeVal = select.value;

  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'sheet-outdriveMake';
    input.placeholder = 'Type manufacturer...';
    input.style.cssText = 'width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
    input.onblur = function() { saveOutdriveOption(itemLabel, 'outdriveMake', this.value); };
    select.replaceWith(input);
    input.focus();
    const modelSelect = document.getElementById('sheet-outdriveModel');
    if (modelSelect) {
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'sheet-outdriveModel';
      modelInput.placeholder = 'Type model...';
      modelInput.style.cssText = 'width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
      modelInput.onblur = function() { saveOutdriveOption(itemLabel, 'outdriveModel', this.value); };
      modelSelect.replaceWith(modelInput);
    }
    return;
  }

  saveOutdriveOption(itemLabel, 'outdriveMake', makeVal);

  const modelSelect = document.getElementById('sheet-outdriveModel');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model...</option>';

  if (outdriveDb && makeVal) {
    const maker = outdriveDb.outdrives.find(od => od.make === makeVal);
    if (maker) {
      maker.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.model;
        opt.textContent = `${m.model} — ${m.description}`;
        modelSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option');
      otherOpt.value = '__other__';
      otherOpt.textContent = '— Other (type manually) —';
      modelSelect.appendChild(otherOpt);
    }
  }
  saveOutdriveOption(itemLabel, 'outdriveModel', '');
}

function saveOutdriveOption(itemLabel, field, value) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel][field] = value;
    saveSurvey(survey).then(() => {
      showToast('Saved');
    });
  });
}

// ─── Winch Make/Model Cascading Dropdowns ─────────────────────────────

function onWinchMakeChange(itemLabel, categoryName) {
  const select = document.getElementById('winchMake-select');
  const makeVal = select.value;

  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'winchMake-select';
    input.placeholder = 'Type winch manufacturer...';
    input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
    input.onblur = function() { saveWinchOption(itemLabel, 'winchMake', this.value); };
    select.replaceWith(input);
    input.focus();
    const modelSelect = document.getElementById('winchModel-select');
    if (modelSelect) {
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'winchModel-select';
      modelInput.placeholder = 'Type winch model...';
      modelInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
      modelInput.onblur = function() { saveWinchOption(itemLabel, 'winchModel', this.value); };
      modelSelect.replaceWith(modelInput);
    }
    return;
  }

  saveWinchOption(itemLabel, 'winchMake', makeVal);

  const modelSelect = document.getElementById('winchModel-select');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model...</option>';

  if (winchDb && makeVal) {
    const maker = winchDb.winches.find(w => w.make === makeVal);
    if (maker) {
      maker.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.model;
        opt.textContent = `${m.model} — ${m.description}`;
        modelSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option');
      otherOpt.value = '__other__';
      otherOpt.textContent = '— Other (type manually) —';
      modelSelect.appendChild(otherOpt);
    }
  }
  saveWinchOption(itemLabel, 'winchModel', '');
}

function onWinchModelChange(itemLabel) {
  const modelSelect = document.getElementById('winchModel-select');
  const modelVal = modelSelect.value;

  if (modelVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'winchModel-select';
    input.placeholder = 'Type winch model...';
    input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;';
    input.onblur = function() { saveWinchOption(itemLabel, 'winchModel', this.value); };
    modelSelect.replaceWith(input);
    input.focus();
    return;
  }

  saveWinchOption(itemLabel, 'winchModel', modelVal);
}

function onSheetWinchMakeChange(itemLabel) {
  const select = document.getElementById('sheet-winchMake');
  const makeVal = select.value;

  if (makeVal === '__other__') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'sheet-winchMake';
    input.placeholder = 'Type manufacturer...';
    input.style.cssText = 'width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
    input.onblur = function() { saveWinchOption(itemLabel, 'winchMake', this.value); };
    select.replaceWith(input);
    input.focus();
    const modelSelect = document.getElementById('sheet-winchModel');
    if (modelSelect) {
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.id = 'sheet-winchModel';
      modelInput.placeholder = 'Type model...';
      modelInput.style.cssText = 'width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;';
      modelInput.onblur = function() { saveWinchOption(itemLabel, 'winchModel', this.value); };
      modelSelect.replaceWith(modelInput);
    }
    return;
  }

  saveWinchOption(itemLabel, 'winchMake', makeVal);

  const modelSelect = document.getElementById('sheet-winchModel');
  if (!modelSelect || modelSelect.tagName !== 'SELECT') return;
  modelSelect.innerHTML = '<option value="">Select model...</option>';

  if (winchDb && makeVal) {
    const maker = winchDb.winches.find(w => w.make === makeVal);
    if (maker) {
      maker.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.model;
        opt.textContent = `${m.model} — ${m.description}`;
        modelSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option');
      otherOpt.value = '__other__';
      otherOpt.textContent = '— Other (type manually) —';
      modelSelect.appendChild(otherOpt);
    }
  }
  saveWinchOption(itemLabel, 'winchModel', '');
}

function saveWinchOption(itemLabel, field, value) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel][field] = value;
    saveSurvey(survey).then(() => {
      showToast('Saved');
    });
  });
}

// Save mast option (stepping or track type)
function saveMastOption(itemLabel, field, value) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel][field] = value;
    saveSurvey(survey).then(() => {
      showToast('Saved');
    });
  });
}

// Subtle toast notification (replaces alert)
function showToast(message) {
  let toast = document.getElementById('auto-save-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'auto-save-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:white;padding:8px 20px;border-radius:20px;font-size:13px;z-index:9999;transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 1500);
}

// Track which accordion is open so we can restore it after re-renders
let _openAccordionCategory = null;

function toggleAccordion(button) {
  // Find accordion-content (may not be nextElementSibling if flagged-summary div is in between)
  const content = button.parentElement.querySelector('.accordion-content');
  if (!content) return;
  const isOpen = content.style.display !== 'none';

  // Close all other open accordions first
  document.querySelectorAll('.accordion-content').forEach(el => {
    if (el !== content && el.style.display !== 'none') {
      el.style.display = 'none';
      const otherHeader = el.parentElement.querySelector('.accordion-header');
      const otherChevron = otherHeader?.querySelector('.accordion-chevron');
      if (otherChevron) otherChevron.textContent = '▸';
    }
  });

  // Toggle the clicked one
  content.style.display = isOpen ? 'none' : 'block';
  const chevron = button.querySelector('.accordion-chevron');
  if (chevron) chevron.textContent = isOpen ? '▸' : '▾';

  // Store which category is open (read from the title span)
  const titleSpan = button.querySelector('.category-title');
  _openAccordionCategory = isOpen ? null : (titleSpan ? titleSpan.textContent.replace(/^[^\w]*/, '').trim() : null);

  // Show/hide the floating collapse button
  updateCollapseButton(!isOpen);

  // Scroll the opened category to the top of the screen
  if (!isOpen) {
    button.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Floating "Collapse" button — always visible when a section is expanded
function updateCollapseButton(show) {
  let btn = document.getElementById('floatingCollapseBtn');
  if (show) {
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'floatingCollapseBtn';
      btn.style.cssText = 'position:fixed;bottom:130px;right:16px;z-index:9998;background:#006699;color:white;border:none;border-radius:14px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;gap:6px;';
      btn.innerHTML = '▲ Collapse';
      btn.title = 'Collapse current section';
      btn.onclick = collapseCurrentSection;
      document.body.appendChild(btn);
    }
    btn.style.display = 'flex';
  } else if (btn) {
    btn.style.display = 'none';
  }
}

function collapseCurrentSection() {
  const openContent = document.querySelector('.accordion-content[style*="display: block"], .accordion-content[style*="display:block"]');
  if (openContent) {
    const header = openContent.parentElement.querySelector('.accordion-header');
    if (header) {
      // Scroll the header into the centre of the viewport FIRST,
      // then collapse. This way the long content below the header
      // disappears and the header stays roughly centred — rather than
      // collapsing first and ending up at the bottom of a short page.
      header.scrollIntoView({ behavior: 'auto', block: 'center' });
      // Small delay so the browser finishes the scroll before the reflow
      setTimeout(() => toggleAccordion(header), 60);
    }
  }
}

// Restore the previously open accordion after a re-render
function restoreAccordionState() {
  if (!_openAccordionCategory) return;
  const headers = document.querySelectorAll('.accordion-header');
  for (const header of headers) {
    const titleSpan = header.querySelector('.category-title');
    if (titleSpan) {
      const title = titleSpan.textContent.replace(/^[^\w]*/, '').trim();
      if (title === _openAccordionCategory) {
        const content = header.nextElementSibling;
        if (content) {
          content.style.display = 'block';
          const chevron = header.querySelector('.accordion-chevron');
          if (chevron) chevron.textContent = '▾';
          updateCollapseButton(true);
          // Scroll back to it
          setTimeout(() => header.scrollIntoView({ behavior: 'auto', block: 'start' }), 50);
        }
        break;
      }
    }
  }
}

function viewPhotoAnnotation(photoId) {
  getPhotoById(photoId).then(photo => {
    if (!photo) return;

    const app = document.getElementById('app');
    app.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: black;
                  display: flex; flex-direction: column; z-index: 1001;">
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto;">
          <canvas id="annotationCanvas" style="max-width: 100%; max-height: 100%;"></canvas>
        </div>
        <div style="background: #333; color: white; padding: 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button id="circleBtn" class="btn-secondary" style="background: #dc2626; color: white; min-width: 80px;">● Circle</button>
          <button id="arrowBtn" class="btn-secondary" style="background: #dc2626; color: white; min-width: 80px;">→ Arrow</button>
          <button id="textBtn" class="btn-secondary" style="background: #000; color: white; min-width: 80px;">T Text</button>
          <button id="undoBtn" class="btn-secondary" style="background: #666; min-width: 80px;">Undo</button>
          <button id="doneBtn" class="btn-primary" style="background: #16a34a; min-width: 80px;">Done</button>
        </div>
      </div>
    `;

    const canvas = document.getElementById('annotationCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let mode = null;
      let isDrawing = false;
      let annotations = [];

      const drawAnnotations = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        annotations.forEach(ann => {
          if (ann.type === 'circle') {
            const radius = ann.radius || Math.max(40, Math.round(canvas.width / 20));
            ctx.beginPath();
            ctx.arc(ann.x, ann.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = Math.max(3, Math.round(canvas.width / 400));
            ctx.stroke();
          } else if (ann.type === 'arrow') {
            drawArrow(ann.x1, ann.y1, ann.x2, ann.y2);
          } else if (ann.type === 'text') {
            const fontSize = Math.max(24, Math.round(canvas.width / 40));
            ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
            // Draw background pill for readability
            const metrics = ctx.measureText(ann.text);
            const pad = 6;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect(ann.x - pad, ann.y - fontSize - pad, metrics.width + pad * 2, fontSize + pad * 2, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(ann.text, ann.x, ann.y);
          }
        });
      };

      const drawArrow = (fromx, fromy, tox, toy) => {
        const headlen = Math.max(15, Math.round(canvas.width / 60));
        const angle = Math.atan2(toy - fromy, tox - fromx);

        ctx.strokeStyle = '#dc2626';
        ctx.fillStyle = '#dc2626';
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 400));
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      };

      const toolBtns = ['circleBtn', 'arrowBtn', 'textBtn'];
      const setActiveBtn = (activeId) => {
        toolBtns.forEach(id => {
          const b = document.getElementById(id);
          b.style.outline = id === activeId ? '3px solid #fff' : 'none';
          b.style.outlineOffset = '2px';
        });
      };
      document.getElementById('circleBtn').onclick = () => { mode = 'circle'; setActiveBtn('circleBtn'); };
      document.getElementById('arrowBtn').onclick = () => { mode = 'arrow'; setActiveBtn('arrowBtn'); };
      document.getElementById('textBtn').onclick = () => { mode = 'text'; setActiveBtn('textBtn'); };
      document.getElementById('undoBtn').onclick = () => {
        annotations.pop();
        drawAnnotations();
      };
      document.getElementById('doneBtn').onclick = () => {
        // Save annotated photo
        const annotatedDataUrl = canvas.toDataURL();
        photo.dataUrl = annotatedDataUrl;
        photo.annotated = true;
        savePhoto(photo).then(() => {
          getSurvey(currentSurveyId).then(s => renderInspection(s));
        });
      };

      // ── Mouse events (desktop) ──
      canvas.addEventListener('mousedown', (e) => {
        if (!mode) return;
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (mode === 'circle') {
          annotations.push({ type: 'circle', x, y });
          drawAnnotations();
        } else if (mode === 'arrow') {
          annotations.push({ type: 'arrow', x1: x, y1: y, x2: x, y2: y });
        } else if (mode === 'text') {
          const text = prompt('Enter annotation text:');
          if (text) {
            annotations.push({ type: 'text', x, y, text });
            drawAnnotations();
          }
        }
      });

      canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing || mode !== 'arrow') return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const lastAnn = annotations[annotations.length - 1];
        if (lastAnn && lastAnn.type === 'arrow') {
          lastAnn.x2 = x;
          lastAnn.y2 = y;
          drawAnnotations();
        }
      });

      canvas.addEventListener('mouseup', () => {
        isDrawing = false;
      });

      canvas.addEventListener('touchstart', (e) => {
        if (!mode) return;
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);

        if (mode === 'circle') {
          annotations.push({ type: 'circle', x, y });
          drawAnnotations();
        } else if (mode === 'arrow') {
          annotations.push({ type: 'arrow', x1: x, y1: y, x2: x, y2: y });
        } else if (mode === 'text') {
          const text = prompt('Enter text:');
          if (text) {
            annotations.push({ type: 'text', x, y, text });
            drawAnnotations();
          }
        }
      });

      canvas.addEventListener('touchmove', (e) => {
        if (!isDrawing || mode !== 'arrow') return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);

        const lastAnn = annotations[annotations.length - 1];
        if (lastAnn && lastAnn.type === 'arrow') {
          lastAnn.x2 = x;
          lastAnn.y2 = y;
          drawAnnotations();
        }
      });

      canvas.addEventListener('touchend', () => {
        isDrawing = false;
      });
    };

    img.src = photo.dataUrl;
  });
}

function deletePhotoAndRefresh(photoId) {
  deletePhoto(photoId).then(() => {
    getSurvey(currentSurveyId).then(survey => {
      let affectedItemLabel = null;
      for (const itemLabel in survey.items) {
        if (survey.items[itemLabel].photos) {
          const before = survey.items[itemLabel].photos.length;
          survey.items[itemLabel].photos = survey.items[itemLabel].photos.filter(id => id !== photoId);
          if (survey.items[itemLabel].photos.length < before) {
            affectedItemLabel = itemLabel;
          }
        }
      }
      // Re-sync engine/gearbox photos after deletion
      _syncEnginePhotosFromBody(survey);
      saveSurvey(survey).then(() => {
        if (affectedItemLabel) {
          updateItemInPlace(survey, affectedItemLabel);
        } else {
          renderInspection(survey);
        }
      });
    });
  });
}

function openSurvey(surveyId) {
  getSurvey(surveyId).then(survey => {
    // Auto-correct vessel type from specs database if it was saved incorrectly
    if (survey.yearMakeModel && boatSpecsDB && boatSpecsDB.boats) {
      const specs = findBoatSpecs(survey.yearMakeModel);
      if (specs && specs.type) {
        const typeMap = { 'sailboat': 'sail', 'powerboat': 'power', 'sail': 'sail', 'power': 'power', 'human-powered': 'human-powered' };
        const correctType = typeMap[specs.type.toLowerCase()] || null;
        if (correctType && survey.vesselType !== correctType) {
          survey.vesselType = correctType;
          saveSurvey(survey);
        }
      }
    }
    renderInspection(survey);
  });
}

function toggleSurveyRow(surveyId) {
  const panel = document.getElementById(`sr-${surveyId}`);
  const chev = document.getElementById(`sr-${surveyId}-chev`);
  if (!panel) return;
  const open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (chev) chev.textContent = open ? '▸' : '▾';
}

function toggleSurveyMenu(btn, surveyId) {
  // Close any other open menus
  document.querySelectorAll('.survey-action-menu').forEach(m => m.remove());

  const wrapper = btn.parentElement;
  const existing = wrapper.querySelector('.survey-action-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.className = 'survey-action-menu';
  menu.style.cssText = 'position:absolute;bottom:100%;left:0;right:0;background:white;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);overflow:hidden;z-index:100;margin-bottom:4px;';

  menu.innerHTML = `
    <button onclick="event.stopPropagation(); duplicateSurvey('${surveyId}'); this.closest('.survey-action-menu').remove();"
            style="width:100%;padding:10px 14px;border:none;background:white;text-align:left;font-size:14px;cursor:pointer;border-bottom:1px solid #e5e7eb;">
      📋 Duplicate
    </button>
    <button onclick="event.stopPropagation(); this.closest('.survey-action-menu').remove(); deleteSurveyConfirm('${surveyId}');"
            style="width:100%;padding:10px 14px;border:none;background:white;text-align:left;font-size:14px;cursor:pointer;color:#dc2626;">
      🗑 Delete
    </button>
  `;
  wrapper.appendChild(menu);

  // Close menu when tapping anywhere else
  const closeHandler = (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.remove();
      document.removeEventListener('click', closeHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler, true), 10);
}

async function duplicateSurvey(surveyId) {
  const survey = await getSurvey(surveyId);
  if (!survey) return;
  const clone = JSON.parse(JSON.stringify(survey));
  clone.id = Date.now();
  clone.vesselName = (clone.vesselName || 'Survey') + ' (copy)';
  clone.createdAt = new Date().toISOString();
  await saveSurvey(clone);
  showToast('Survey duplicated');
  renderHome();
}

// Lightweight progress estimate used by the delete guard (and later by the
// Review Survey analyzer). Counts filled header fields + checklist items
// that have either a rating or typed notes. Returns an integer 0-100.
// Intentionally simple — we just need to distinguish "blank test survey"
// from "real in-progress survey".
function estimateSurveyProgress(survey) {
  if (!survey) return 0;
  let points = 0;
  let total = 0;
  // Header fields worth tracking
  const headerFields = [
    'vesselName', 'yearMakeModel', 'hinNumber', 'vesselType',
    'surveyDate', 'location', 'purposeOfSurvey', 'clientName',
    'onLandOrInWater', 'powerAtSurvey'
  ];
  headerFields.forEach(k => {
    total += 1;
    const v = survey[k];
    if (v != null && String(v).trim() !== '' && String(v).toLowerCase() !== 'select') {
      points += 1;
    }
  });
  // HIN / compliance plate photos
  total += 2;
  if (survey.hinPhoto) points += 1;
  if (survey.compliancePhoto) points += 1;
  // Checklist items: an item counts as "touched" if it has a rating OR
  // any typed text OR a photo attached.
  if (survey.items && typeof survey.items === 'object') {
    const itemKeys = Object.keys(survey.items);
    // Use a fixed denominator so an empty survey scores near 0 regardless
    // of template size — pick 50 as a reasonable "enough items to be real"
    // baseline. Surveys with more touched items saturate but that's fine.
    total += 50;
    let touched = 0;
    itemKeys.forEach(k => {
      const it = survey.items[k] || {};
      const hasRating = it.rating && String(it.rating).trim() !== '';
      const hasText = it.text && String(it.text).trim() !== '';
      const hasPhoto = Array.isArray(it.photos) && it.photos.length > 0;
      if (hasRating || hasText || hasPhoto) touched += 1;
    });
    points += Math.min(touched, 50);
  }
  if (total === 0) return 0;
  return Math.round((points / total) * 100);
}

async function deleteSurveyConfirm(surveyId) {
  // First confirmation — the standard one.
  const yes = await showConfirm('Delete this survey? This cannot be undone.', 'Delete', 'Cancel');
  if (!yes) return;
  // Second confirmation if the survey looks like real in-progress work
  // (>5% complete). Guards against accidentally nuking a field survey
  // when the user meant to delete a blank test record.
  try {
    const survey = await getSurvey(surveyId);
    const pct = estimateSurveyProgress(survey);
    if (pct > 5) {
      const vesselName = (survey && survey.vesselName) ? survey.vesselName : 'this survey';
      const confirmMsg = `"${vesselName}" is ${pct}% complete — this does not look like a test record. Are you absolutely sure you want to delete it? This cannot be undone.`;
      const reallyYes = await showConfirm(confirmMsg, 'Yes, delete it', 'Cancel');
      if (!reallyYes) return;
    }
  } catch (e) {
    // If the progress check errors out, fall through to the delete —
    // we've already had one confirmation.
  }
  await deleteSurvey(surveyId);
  renderHome();
}

// Save all unsaved inspection data (text areas, bilge pumps, comparables, safety items)
async function saveAllInspectionData() {
  if (!currentSurveyId) return false;
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return false;

  let changed = false;

  // Save all item text areas that have content
  document.querySelectorAll('textarea[id^="text-"]').forEach(textarea => {
    const safeId = textarea.id.replace('text-', '');
    // Find the matching item label by checking all items
    for (const [label, data] of Object.entries(survey.items || {})) {
      if (label.replace(/[^a-zA-Z0-9]/g, '_') === safeId) {
        if (data.text !== textarea.value) {
          data.text = textarea.value;
          changed = true;
        }
        break;
      }
    }
  });

  // Save bilge pumps
  const bilgePumps = collectBilgePumps();
  if (bilgePumps.length > 0 || (survey.bilgePumps && survey.bilgePumps.length > 0)) {
    survey.bilgePumps = bilgePumps;
    changed = true;
  }

  // Save comparables
  const comparables = collectComparables();
  if (comparables.length > 0 || (survey.comparables && survey.comparables.length > 0)) {
    survey.comparables = comparables;
    changed = true;
  }

  if (changed) {
    await saveSurvey(survey);
  }
  return changed;
}

async function backToHome() {
  updateCollapseButton(false);
  await saveAllInspectionData();

  // Remove bottom action bar when leaving inspection
  const bottomBar = document.getElementById('inspectionBottomBar');
  if (bottomBar) bottomBar.remove();
  const reportBtn = document.getElementById('reportBtn');
  if (reportBtn) reportBtn.remove();
  const backupBtn = document.getElementById('backupBtn');
  if (backupBtn) backupBtn.remove();
  window._hasUnsavedBackup = false;
  renderHome();
}

// Report generation
async function generateReport() {
  try {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;

  // Migrate old item labels before generating report
  if (migrateSurveyLabels(survey)) await saveSurvey(survey);

  const activeTemplate = getTemplateForSurvey(survey);
  const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Remove consecutive duplicate sentences from item text (e.g. disclaimer pasted twice)
  const dedup = (s) => {
    if (!s) return s;
    const sentences = s.match(/[^.!?]+[.!?]+/g);
    if (!sentences) return s;
    const unique = [sentences[0]];
    for (let i = 1; i < sentences.length; i++) {
      if (sentences[i].trim() !== sentences[i - 1].trim()) unique.push(sentences[i]);
    }
    return unique.join('').trim();
  };
  // Replace first-person pronouns with professional third-person phrasing
  const depersonalise = (s) => {
    if (!s) return s;
    return s
      .replace(/\bAs I was leaving\b/gi, 'At the time of departure')
      .replace(/\bas I was\b/gi, 'as the surveyor was')
      .replace(/\bAs I\b/gi, 'As the surveyor')
      .replace(/\bI was\b/gi, 'the surveyor was')
      .replace(/\bI am\b/gi, 'the surveyor is')
      .replace(/\bI have\b/gi, 'the surveyor has')
      .replace(/\bI had\b/gi, 'the surveyor had')
      .replace(/\bI could\b/gi, 'the surveyor could')
      .replace(/\bI did\b/gi, 'the surveyor did')
      .replace(/\bI found\b/gi, 'the surveyor found')
      .replace(/\bI noted\b/gi, 'the surveyor noted')
      .replace(/\bI observed\b/gi, 'the surveyor observed')
      .replace(/\bI recommend\b/gi, 'the surveyor recommends')
      .replace(/\bI inspected\b/gi, 'the surveyor inspected')
      .replace(/\bI tested\b/gi, 'the surveyor tested')
      .replace(/\bI measured\b/gi, 'the surveyor measured')
      .replace(/\bI checked\b/gi, 'the surveyor checked')
      .replace(/\bmy inspection\b/gi, 'the inspection')
      .replace(/\bmy opinion\b/gi, 'the surveyor\'s opinion')
      .replace(/\bmy assessment\b/gi, 'the surveyor\'s assessment')
      .replace(/\bmy findings\b/gi, 'the surveyor\'s findings')
      .replace(/\bmy experience\b/gi, 'the surveyor\'s experience');
  };
  const reportDate = survey.reportDate || new Date().toISOString().split('T')[0];

  // ── Fetch documentation photos (HIN plate, compliance plate, licence) ──
  // All photos are compressed for the report to prevent Chrome "Aw Snap" crashes
  async function loadAndCompress(photoId) {
    if (!photoId) return '';
    const p = await getPhotoById(photoId);
    if (p && p.dataUrl) return compressPhotoForReport(p.dataUrl);
    return '';
  }
  let hinPhotoDataUrl = await loadAndCompress(survey.hinPhoto);
  let compliancePhotoDataUrl = await loadAndCompress(survey.compliancePhoto);
  let licencePhotoDataUrl = await loadAndCompress(survey.licencePhoto);
  let tcPaperLicencePhotoDataUrl = await loadAndCompress(survey.tcPaperLicencePhoto);
  let coverPhotoDataUrl = await loadAndCompress(survey.coverPhoto);

  // Helper to load all photos from a multi-doc field (array or single ID)
  async function loadDocPhotos(fieldValue) {
    if (!fieldValue) return [];
    const ids = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    const urls = [];
    for (const id of ids) {
      const compressed = await loadAndCompress(id);
      if (compressed) urls.push(compressed);
    }
    return urls;
  }

  const enginePhotos = await loadDocPhotos(survey.enginePhoto);
  const enginePlatePhotos = await loadDocPhotos(survey.enginePlatePhoto);
  const transmissionPhotos = await loadDocPhotos(survey.transmissionPhoto);
  const transmissionPlatePhotos = await loadDocPhotos(survey.transmissionPlatePhoto);
  const engine2Photos = await loadDocPhotos(survey.engine2Photo);
  const engine2PlatePhotos = await loadDocPhotos(survey.engine2PlatePhoto);
  const transmission2Photos = await loadDocPhotos(survey.transmission2Photo);
  const transmission2PlatePhotos = await loadDocPhotos(survey.transmission2PlatePhoto);

  // Backward compat: single dataUrl variables for report template
  const enginePhotoDataUrl = enginePhotos[0] || '';
  const enginePlatePhotoDataUrl = enginePlatePhotos[0] || '';
  const transmissionPhotoDataUrl = transmissionPhotos[0] || '';
  const transmissionPlatePhotoDataUrl = transmissionPlatePhotos[0] || '';
  const engine2PhotoDataUrl = engine2Photos[0] || '';
  const engine2PlatePhotoDataUrl = engine2PlatePhotos[0] || '';
  const transmission2PhotoDataUrl = transmission2Photos[0] || '';
  const transmission2PlatePhotoDataUrl = transmission2PlatePhotos[0] || '';

  // ── Pre-fetch all per-item photos (compressed for report) ────────────
  const itemPhotoCache = {};
  async function cachePhoto(photoId) {
    if (!photoId || itemPhotoCache[photoId]) return;
    const p = await getPhotoById(photoId);
    if (p && p.dataUrl) {
      itemPhotoCache[photoId] = await compressPhotoForReport(p.dataUrl);
    }
  }
  for (const itemLabel of Object.keys(survey.items || {})) {
    const itemData = survey.items[itemLabel];
    if (itemData.photos && itemData.photos.length > 0) {
      for (const photoId of itemData.photos) {
        await cachePhoto(photoId);
      }
    }
  }

  // Also pre-load safety equipment photos
  if (survey.safetyEquipment) {
    for (const eq of survey.safetyEquipment) {
      if (eq.photos && eq.photos.length > 0) {
        for (const photoId of eq.photos) {
          await cachePhoto(photoId);
        }
      }
    }
  }

  // Also pre-load instruments & electronics photos
  if (survey.instrumentsElectronics) {
    for (const item of survey.instrumentsElectronics) {
      if (item.photos && item.photos.length > 0) {
        for (const photoId of item.photos) {
          await cachePhoto(photoId);
        }
      }
    }
  }

  // ── Report expansion helper ───────────────────────────────────────────
  // Expand drive-line and hull items so the report picks up data saved
  // under expanded labels like "Port — Propeller" or "Port hull — Hull condition".
  const reportDriveLineCount = survey.driveLineCount || 1;
  const reportHullCount = inferHullCount(survey);
  function expandReportItems(items) {
    let result = items;
    // Drive line expansion / singularisation
    if (reportDriveLineCount === 1) {
      result = result.map(item => item.driveLineItem ? { ...item, label: item.label.replace(/\(s\)/g, '') } : item);
    } else {
      const dlLabels = reportDriveLineCount === 2
        ? ['Port', 'Starboard']
        : Array.from({ length: reportDriveLineCount }, (_, i) => `#${i + 1}`);
      const expanded = [];
      result.forEach(item => {
        if (!item.driveLineItem) { expanded.push(item); }
        else {
          const base = item.label.replace(/\(s\)/g, '');
          for (let t = 0; t < reportDriveLineCount; t++) {
            expanded.push({ ...item, label: `${dlLabels[t]} — ${base.trim()}` });
          }
        }
      });
      result = expanded;
    }
    // Hull expansion / singularisation
    if (reportHullCount === 1) {
      result = result.map(item => item.hullItem ? { ...item, label: item.label.replace(/\(s\)/g, '') } : item);
    } else {
      const hullLabels = reportHullCount === 2
        ? ['Port hull', 'Starboard hull']
        : ['Port hull', 'Centre hull', 'Starboard hull'];
      const expanded = [];
      result.forEach(item => {
        if (!item.hullItem) { expanded.push(item); }
        else {
          const base = item.label.replace(/\(s\)/g, '').replace(/^Hull\s+/, 'Hull ');
          for (let h = 0; h < reportHullCount; h++) {
            expanded.push({ ...item, label: `${hullLabels[h]} — ${base.trim()}` });
          }
        }
      });
      result = expanded;
    }
    return result;
  }

  // ── Pass 1: collect all findings ──────────────────────────────────────
  let findingCount = { A: 0, B: 0, C: 0, NT: 0 };
  let findings = { A: [], B: [], C: [], NT: [] };

  activeTemplate.forEach(section => {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      section.categories.forEach(category => {
        if (!category.items || category.name === 'Survey Specifications' || category.name === 'Vessel Specifications') return;
        expandReportItems(category.items.filter(i => i.type === 'list')).forEach(item => {
          const d = survey.items[item.label];
          if (!d || !d.rating || d.excluded) return;
          const r = d.rating;
          let bucket = null;
          if (r.startsWith('A')) { findingCount.A++; bucket = 'A'; }
          else if (r.startsWith('B')) { findingCount.B++; bucket = 'B'; }
          else if (r.startsWith('C')) { findingCount.C++; bucket = 'C'; }
          else if (r.startsWith('Not tested')) { findingCount.NT++; bucket = 'NT'; }
          if (bucket) {
            const code = bucket === 'NT' ? `NT-${findingCount.NT}` : `${bucket}-${findingCount[bucket]}`;
            findings[bucket].push({ label: item.label, ...d, code, category: category.name });
          }
        });
      });
    }
  });

  // Build finding code lookup map (used by both summary table and body)
  const findingCodeMap = {};
  [...findings.A, ...findings.B, ...findings.C, ...findings.NT].forEach(f => {
    findingCodeMap[f.label] = f.code;
  });

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kiki Marine — ${esc(survey.vesselName || 'Vessel')} — ${esc(shortLocation(survey.location) || 'Survey')}</title>
  <style>
    @page {
      size: letter;
      margin: 25mm 15mm 25mm 15mm;
      @top-center {
        content: "Report of Condition & Value Marine Survey";
        font-size: 8pt;
        color: #666;
        font-family: Arial, Helvetica, sans-serif;
      }
      @bottom-left {
        content: "${esc(survey.vesselName || 'Vessel Survey')}";
        font-size: 8pt;
        color: #666;
        font-family: Arial, Helvetica, sans-serif;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #666;
        font-family: Arial, Helvetica, sans-serif;
      }
    }
    @page :first {
      @top-center { content: none; }
      @bottom-left { content: none; }
      @bottom-right { content: none; }
    }
    @media print {
      .page-break { page-break-after: always; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #exportToolbar { display: none !important; }
    }
    body { font-family: Arial, Helvetica, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; font-size: 11pt; }
    h1 { text-align: center; padding-bottom: 10px; margin-bottom: 6px; }
    h2 { background: #006699; color: white; padding: 8px 12px; margin-top: 24px; font-size: 13pt; }
    h3 { color: #006699; margin-top: 18px; font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td, th { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10pt; }
    th { background: #f0f0f0; }
    .rating-a { color: #dc2626; font-weight: bold; }
    .rating-b { color: #d97706; font-weight: bold; }
    .rating-c { color: #16a34a; font-weight: bold; }
    .rating-nt { color: #6b7280; font-weight: bold; }
    .rating-safety { color: #2563eb; font-weight: bold; }
    .item { margin: 6px 0; padding: 4px 0 4px 10px; border-left: 3px solid #006699; }
    .standards { font-size: 9pt; color: #666; margin-top: 2px; }
    .item p { margin: 2px 0; }
    .footer { margin-top: 40px; padding: 20px; border-top: 2px solid #006699; }
    .header-bar { border-bottom: 1px solid #999; font-size: 9pt; color: #666; padding-bottom: 4px; margin-bottom: 16px; }
    .scope-text { font-size: 10pt; line-height: 1.5; }
    .bold-disclaimer { font-weight: bold; margin: 16px 0; padding: 10px; border: 1px solid #999; background: #f9f9f9; font-size: 10pt; }
    .finding-section { margin-top: 8px; }
    .finding-section h3 { background: none; }
    ul.def-list { list-style: none; padding-left: 0; }
    ul.def-list li { margin-bottom: 10px; padding-left: 20px; }
    .buc-grades { margin: 12px 0; }
    .buc-grades p { margin: 4px 0 4px 20px; font-size: 10pt; }
    .checklist-table { font-size: 9pt; }
    .checklist-table th { background: #006699; color: white; padding: 5px 6px; font-size: 8.5pt; text-align: left; }
    .checklist-table td { padding: 4px 6px; vertical-align: top; font-size: 9pt; }
    .checklist-table tr:nth-child(even) { background: #f8f9fa; }
    .checklist-table .rating-pill { display: inline-block; padding: 1px 7px; border-radius: 3px; color: white; font-weight: bold; font-size: 8pt; white-space: nowrap; }
    .checklist-table .violation-yes { color: #dc2626; font-weight: bold; }
    .checklist-table .violation-no { color: #16a34a; }
    .checklist-table .text-snippet { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  </style>
</head>
<body>

  <!-- Export toolbar (hidden when printing) -->
  <div id="exportToolbar" style="position:sticky;top:0;z-index:999;background:#006699;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:3px solid #f0c040;margin:-20px -20px 16px -20px;padding:12px 24px;">
    <span style="color:white;font-size:11pt;font-weight:bold;">Kiki Marine — Survey Report</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="window.close(); if(!window.closed) history.back();" style="background:#4ade80;color:#006699;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">← Back to Inspection</button>
      <button onclick="window.print()" style="background:#fff;color:#006699;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">🖨️ Print / PDF</button>
      <button onclick="exportToWord()" style="background:#f0c040;color:#006699;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">📥 Download as Word</button>
      <button onclick="toggleProseMode()" id="proseModeBtn" style="background:#e5e7eb;color:#333;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">📝 Prose Mode</button>
    </div>
  </div>

  <!-- ═══ COVER PAGE ═══ -->
  <div style="text-align:center; padding-top: 20px;">
    <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
         alt="Kiki Marine Logo" style="max-width: 300px; width: 80%; height: auto;"
         onerror="this.style.display='none'">
    <h1 style="font-size: 15pt; border: none; margin-top: 16px; margin-bottom: 8px;">${survey.surveyType === 'Insurance survey' ? 'Insurance Marine Survey' : 'Report of Condition &amp; Value Marine Survey'}</h1>
    <p style="font-size: 11pt; color: #333; letter-spacing: 0.5px;">Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor</p>
  </div>

  ${coverPhotoDataUrl ? `
  <div style="text-align:center; margin: 24px auto; max-width: 700px;">
    <img src="${coverPhotoDataUrl}" alt="Vessel Photo"
         style="width:100%; max-height:400px; object-fit:cover; border:2px solid #006699; border-radius:4px;" />
  </div>` : ''}

  <table style="margin-top: 20px; border: 2px solid #006699;">
    <tr><td style="width:40%; background:#e8edf2;"><strong>Vessel</strong></td><td>"${esc(survey.vesselName)}" — ${esc(survey.yearMakeModel)}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>HIN</strong></td><td>${esc(survey.hinNumber) || 'N/A'}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Survey Conducted For</strong></td><td>${esc(survey.clientName) || 'N/A'}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Date of Inspection</strong></td><td>${survey.surveyDate || 'N/A'}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Date of Report</strong></td><td>${reportDate}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Surveyor</strong></td><td>Dave Seagrim, SAMS SA, ABYC Master Advisor</td></tr>
  </table>

  <div style="text-align:center; margin-top: 24px; display:flex; align-items:center; justify-content:center; gap:14px;">
    <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
         alt="Kiki Marine" style="height:28px; width:auto;"
         onerror="this.style.display='none'">
    <span style="font-size:13pt; color:#555; white-space:nowrap;">(647) 289-7876 &bull; dave@kikimarine.ca &bull; kikimarine.ca</span>
  </div>

  <!-- ═══ PURPOSE AND SCOPE ═══ -->
  <h2>PURPOSE AND SCOPE</h2>
  <div class="scope-text">
    <p>This surveyor attended aboard the vessel to determine its physical condition and market value. Using visual, non-destructive methods in accessible areas, the hull, deck, rigging, mechanical and electrical systems, and safety equipment were evaluated in accordance with ABYC standards and applicable Transport Canada regulations. Internal inspection of engines, transmissions, drives, generators, and stability analysis were beyond the scope of this survey. Electrical and electronic equipment was powered up and tested for basic functionality where possible. Concealed wiring was not inspected — engagement of an ABYC-certified marine electrical engineer is recommended for a detailed assessment. Vessel tankage was visually inspected; filling and pressure testing are advised for a complete evaluation. No fixed partitions, panels, furniture, electronics, or stored gear were removed, and locked or inaccessible spaces were not surveyed. This report reflects the surveyor's unbiased opinion as of the inspection date and is not an inventory, warranty, or guarantee. It is intended solely for the client and any associated lenders or underwriters and is not assignable.</p>

    <div class="bold-disclaimer">It should be noted that although the vessel's structure and components were evaluated against ABYC and Transport Canada standards, many boats were built before these codes were established or enforced and therefore may not be subject to them. Furthermore, when a boat or its components predate current standards, those standards may only become applicable if the boat or its systems are modified. It is not within the scope of this surveyor's responsibilities to determine the relevance or enforceability of these standards.</div>
  </div>

  <!-- ═══ METHODOLOGY AND LIMITATIONS ═══ -->
  <h2>METHODOLOGY AND LIMITATIONS</h2>
  <div class="scope-text">
    <h3>General Methodology</h3>
    <ul>
      <li><strong>Visual Inspection:</strong> Only accessible structures and systems were examined; no core samples or invasive tests were performed.</li>
      <li><strong>Obstructions:</strong> Coating buildup, corrosion, marine growth, gear, or dirt may have hidden defects (e.g., thick antifouling paint can obscure bottom damage).</li>
    </ul>
    <h3>Specific Limitations</h3>
    <ul>
      <li><strong>Electrical/Electronic Systems:</strong> Powered where possible; detailed wiring analysis requires a marine electrician or ABYC-certified electrical engineer.</li>
      <li><strong>Mechanical/Structural:</strong> Engines, transmissions, drives, and generators were not run or opened; inspection by a manufacturer's certified technician is advised.</li>
      <li><strong>Tankage:</strong> Visually inspected empty tanks; filling and pressure testing recommended.</li>
      <li><strong>Water Leaks:</strong> Visual inspection was done for that instance in time; cleaned evidence of past leaks may be hidden.</li>
      <li><strong>General:</strong> No removal of fixed partitions, panels, furniture, or stored gear; locked or inaccessible areas not surveyed.</li>
    </ul>

    <h3>Conductivity Testing</h3>
    <p>A conductivity meter measured conductivity in the hull and deck. Readings are relative indicators only and may be influenced by material or surface conditions. High readings are not a certainty of underlying issues; therefore, careful interpretation and further investigation are recommended.</p>

    <h3>Disclaimers and Legal Considerations</h3>
    <p>This report reflects the surveyor's professional opinion on visible and accessible conditions only. It is not an inventory, warranty, or guarantee, and does not include naval architectural or stability analysis. Dimensions and weights are from published sources; no independent measurements were taken. Compliance with all standards, codes, and regulations is not guaranteed. Non-destructive test results are subjective indicators. This report supersedes all prior statements and is for the exclusive use of the client and associated lenders/underwriters. It is not assignable. The surveyor holds no financial interest in the vessel. By accepting this report, the client acknowledges its limitations and the potential need for further invasive inspection.</p>
  </div>

  <!-- ═══ CONDUCT OF SURVEY ═══ -->
  <h2>CONDUCT OF SURVEY</h2>
  <div class="scope-text">
    <p>The mandatory standards promulgated under the <em>Canada Shipping Act, 2001</em> and Transport Canada regulations (including TP 1332 — Construction Standards for Small Vessels), and the voluntary standards and recommended practices developed by the American Boat and Yacht Council (ABYC) and the National Fire Protection Association (NFPA 302) have been used as guidelines in the conduct of this report.</p>
    <p>Testing the vessel in the water under load, if performed, shall be referred to with the term "Limited Trial Run". This term has no bearing on the wind or weather conditions, or body of water upon which the vessel was tested and provides no guarantee of how the vessel will perform under different conditions, upon different waterways and in different weather conditions.</p>
  </div>

  <!-- ═══ DEFINITIONS OF TERMS ═══ -->
  <h2>DEFINITIONS OF TERMS</h2>
  <div class="scope-text">
    <table style="font-size:10pt;">
      <tr><td style="width:30%;vertical-align:top;"><strong>ABYC</strong></td><td>American Boat and Yacht Council — develops voluntary safety standards for the design, construction, maintenance, and repair of recreational boats.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Bonding System</strong></td><td>A system of electrically connecting metallic non-current-carrying parts of a vessel to reduce corrosion and minimize the risk of electric shock.</td></tr>
      <tr><td style="vertical-align:top;"><strong>BUC</strong></td><td>BUC International Corp. — publisher of the BUC Used Boat Price Guide, an industry-accepted reference for marine vessel valuation.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Canada Shipping Act, 2001</strong></td><td>The primary federal legislation governing safety in Canadian marine transportation, including construction and equipment requirements for small vessels.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Conductivity Meter</strong></td><td>A non-destructive testing instrument that measures the electrical conductivity of hull and deck laminates to detect elevated conductivity levels. Readings are relative indicators only.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Fair Market Value (FMV)</strong></td><td>The most probable price a vessel should bring in a competitive and open market under all conditions requisite to a fair sale, with buyer and seller each acting prudently and knowledgeably.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Estimated Replacement Cost</strong></td><td>The estimated cost to replace the surveyed vessel with one of like kind and quality at current market prices, excluding applicable taxes.</td></tr>
      <tr><td style="vertical-align:top;"><strong>HIN</strong></td><td>Hull Identification Number — a unique serial number assigned to a vessel by the manufacturer, required by Transport Canada and the USCG for identification and registration.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Limited Trial Run</strong></td><td>A brief operational test of the vessel conducted under controlled conditions. This term does not imply a comprehensive sea trial and results are limited by prevailing conditions.</td></tr>
      <tr><td style="vertical-align:top;"><strong>NFPA 302</strong></td><td>National Fire Protection Association Standard 302 — Fire Protection Standard for Pleasure and Commercial Motor Craft.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Percussion Testing</strong></td><td>A non-destructive technique using a sounding hammer or similar instrument to tap the hull and deck surfaces, identifying delamination, voids, or water-saturated areas by changes in tone.</td></tr>
      <tr><td style="vertical-align:top;"><strong>TC TP 511</strong></td><td>Transport Canada publication TP 511E — Safe Boating Guide, outlining mandatory safety equipment requirements for pleasure craft in Canadian waters.</td></tr>
      <tr><td style="vertical-align:top;"><strong>TC TP 1332</strong></td><td>Transport Canada publication TP 1332E — Construction Standards for Small Vessels, establishing mandatory construction and performance standards.</td></tr>
      <tr><td style="vertical-align:top;"><strong>Through-Hull Fitting</strong></td><td>Any device that penetrates the hull below the waterline to allow water intake or discharge. Typically fitted with a seacock or valve for shutoff capability.</td></tr>
      <tr><td style="vertical-align:top;"><strong>USCG 33 CFR 183</strong></td><td>United States Coast Guard regulations under Title 33, Code of Federal Regulations, Part 183 — Boats and Associated Equipment, applicable to vessels manufactured for the North American market.</td></tr>
    </table>
  </div>

  <!-- ═══ USE OF RATINGS ═══ -->
  <h2>USE OF "A", "B", "C", "NOT TESTED" AND "SAFETY EQUIPMENT" RATINGS</h2>
  <div class="scope-text">
    <ul class="def-list">
      <li><span style="background:#dc2626;color:white;padding:2px 8px;font-weight:bold;">A — Critical</span><br/>
        <em>Definition:</em> Direct safety, environmental risk, or ABYC/Transport Canada code violation.<br/>
        <em>Action:</em> Immediate correction required.</li>
      <li><span style="background:#d97706;color:white;padding:2px 8px;font-weight:bold;">B — Needs Attention (Moderate)</span><br/>
        <em>Definition:</em> Moderate deficiencies; not immediately hazardous but should be addressed.<br/>
        <em>Action:</em> Schedule repairs.</li>
      <li><span style="background:#16a34a;color:white;padding:2px 8px;font-weight:bold;">C — Serviceable</span><br/>
        <em>Definition:</em> Currently meets all applicable safety and performance standards.<br/>
        <em>Action:</em> No corrective work required.</li>
      <li><span style="background:#6b7280;color:white;padding:2px 8px;font-weight:bold;">Not tested / not verified</span><br/>
        <em>Definition:</em> A comprehensive inspection was attempted, but was not possible due to constraints imposed upon the surveyor (e.g., no power available, inability to remove panels, requirements not to conduct destructive tests, or limitations on the inspection time).</li>
      <li><span style="background:#2563eb;color:white;padding:2px 8px;font-weight:bold;">Safety Equipment (TC TP 511)</span><br/>
        <em>Definition:</em> Required safety equipment per Transport Canada TP 511E Safe Boating Guide and Small Vessel Regulations (SOR/2010-91), verified as present on board.<br/>
        <em>Action:</em> Missing items must be acquired before the vessel is next underway.</li>
    </ul>
  </div>

  <!-- ═══ NOTES REGARDING REPORT FORMAT ═══ -->
  <h2>NOTES REGARDING REPORT FORMAT</h2>
  <div class="scope-text">
    <p>This report is presented in the following order:</p>
    <ol>
      <li><strong>General Vessel Information &amp; Specifications</strong></li>
      <li><strong>Vessel Description</strong> — A narrative description of the vessel.</li>
      <li><strong>Survey Checklist Summary</strong> — An at-a-glance table of all inspected items showing rating, violation status, finding code, and applicable standards.</li>
      <li><strong>Safety Equipment — TC TP 511</strong> — Required safety equipment per Transport Canada regulations, with on-board verification status.</li>
      <li><strong>Detailed Survey Findings</strong> — The full, itemised survey observations by category.</li>
      <li><strong>Findings &amp; Recommendations</strong> — All items rated "A" (Critical), "B" (Needs Attention), "C" (Serviceable), and "Not tested/not verified" are compiled here for quick reference.</li>
      <li><strong>Summary of Vessel Condition</strong> — Overall condition rating using the BUC Marine Grading System.</li>
      <li><strong>Statement of Valuation</strong> — Fair Market Value and Estimated Replacement Cost.</li>
      <li><strong>Surveyor's Certificate</strong></li>
    </ol>
  </div>

  <!-- ═══ TABLE OF CONTENTS ═══ -->
  <h2>TABLE OF CONTENTS</h2>
  <div class="scope-text" style="columns:2;column-gap:30px;">
    <ol style="font-size:10pt;line-height:2.0;padding-left:20px;">
      <li>Purpose and Scope of Survey</li>
      <li>Methodology and Limitations</li>
      <li>Conduct of Survey</li>
      <li>Definitions of Terms</li>
      <li>Use of Ratings</li>
      <li>Notes Regarding Report Format</li>
      <li>General Vessel Information</li>
      <li>Vessel Specifications</li>
      <li>Survey Conditions</li>
      <li>Vessel Documentation Data</li>
      <li>Vessel Description</li>
      <li>Survey Checklist Summary</li>
      <li>Safety Equipment — TC TP 511</li>
      <li>Detailed Survey Findings</li>
      <li>Findings &amp; Recommendations</li>
      <li>Summary of Vessel Condition</li>
      <li>Statement of Valuation</li>
      <li>Valuation Worksheet</li>
      <li>Surveyor's Certificate</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- ═══ GENERAL VESSEL INFORMATION ═══ -->
  <h2>GENERAL VESSEL INFORMATION</h2>
  <table>
    <tr><td style="width:40%;"><strong>Type of Survey Requested</strong></td><td>${esc(survey.surveyType) || 'N/A'}</td></tr>
    <tr><td><strong>Date of Survey Inspection</strong></td><td>${survey.surveyDate || 'N/A'}</td></tr>
    <tr><td><strong>Date of Report</strong></td><td>${reportDate}</td></tr>
    <tr><td><strong>Vessel Name</strong></td><td>${esc(survey.vesselName) || 'N/A'}</td></tr>
    <tr><td><strong>Year/Make/Model</strong></td><td>${esc(survey.yearMakeModel) || 'N/A'}</td></tr>
    <tr><td><strong>HIN (Hull Identification Number)</strong></td><td>${esc(survey.hinNumber) || 'N/A'}${hinPhotoDataUrl ? '<br><img src="' + hinPhotoDataUrl + '" alt="HIN Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
    ${(survey.tcLicense || survey.tcLicenseType) ? `<tr><td><strong>TC Licence Type and Number</strong></td><td>${survey.tcLicenseType ? esc(survey.tcLicenseType) + ' — ' : ''}${esc(survey.tcLicense) || 'N/A'}${survey.tcLicenseExpiry ? ' (expires ' + esc(survey.tcLicenseExpiry) + ')' : ''}</td></tr>` : ''}
    <tr><td><strong>NMMA/CE/TC Compliance Plate</strong></td><td>${esc(survey.compliancePlate) || 'N/A'}${compliancePhotoDataUrl ? '<br><img src="' + compliancePhotoDataUrl + '" alt="Compliance Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
    <tr><td><strong>Vessel Material</strong></td><td>${esc(survey.construction) || 'N/A'}</td></tr>
    <tr><td><strong>LOA (Length Overall)</strong></td><td>${esc(survey.loa) || 'N/A'}</td></tr>
    <tr><td><strong>LWL (Length at Waterline)</strong></td><td>${esc(survey.lwl) || 'N/A'}</td></tr>
    <tr><td><strong>Beam</strong></td><td>${esc(survey.beam) || 'N/A'}</td></tr>
    <tr><td><strong>Displacement</strong></td><td>${esc(survey.displacement) || 'N/A'}</td></tr>
    <tr><td><strong>Draft</strong></td><td>${esc(survey.maxDraft) || 'N/A'}</td></tr>
    <tr><td><strong>Location of Survey Inspection</strong></td><td>${esc(survey.location) || 'N/A'}</td></tr>
    <tr><td><strong>Client / Purchaser</strong></td><td>${esc(survey.clientName) || 'N/A'}</td></tr>
    <tr><td><strong>Persons in Attendance</strong></td><td>${esc(survey.personsInAttendance) || 'N/A'}</td></tr>
    <tr><td><strong>Independent Surveys</strong></td><td>${esc(survey.independentSurveys) || 'No independent surveys (engine, electrical, ultrasonic gauging, etc.) were conducted in conjunction with this inspection.'}</td></tr>
    <tr><td><strong>Weather Conditions</strong></td><td>${esc(survey.weather) || 'N/A'}</td></tr>
    <tr><td><strong>Surveyor</strong></td><td>Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor</td></tr>
  </table>

${survey.locationLat && survey.locationLon ? `
  <div style="margin: 10px 0;">
    <img src="https://staticmap.openstreetmap.de/staticmap.php?center=${survey.locationLat},${survey.locationLon}&zoom=13&size=480x280&markers=${survey.locationLat},${survey.locationLon},red-pushpin" alt="Survey Location Map" style="border: 1px solid #ddd; border-radius: 4px;" />
  </div>
` : ''}

  <!-- ═══ RATING & VALUATION (early summary) ═══ -->
  <div style="border:2px solid #006699;padding:12px 16px;margin:16px 0;background:#f8f9fb;">
    <h3 style="margin:0 0 8px 0;color:#006699;border-bottom:1px solid #006699;padding-bottom:4px;font-size:12pt;">RATING &amp; VALUATION</h3>
    <table style="border:none;margin:0;">
      <tr><td style="width:45%;border:none;padding:3px 8px;"><strong>Vessel Overall Rating:</strong></td><td style="border:none;padding:3px 8px;font-weight:bold;font-size:11pt;">${esc(survey.overallCondition) || 'Not yet assessed'}</td></tr>
      <tr><td style="border:none;padding:3px 8px;"><strong>Estimated Market Value:</strong></td><td style="border:none;padding:3px 8px;font-weight:bold;">$${parseInt(survey.valuationLow || 0).toLocaleString()} – $${parseInt(survey.valuationHigh || 0).toLocaleString()} USD${survey.exchangeRate ? ` / $${Math.round(parseInt(survey.valuationLow || 0) * survey.exchangeRate).toLocaleString()} – $${Math.round(parseInt(survey.valuationHigh || 0) * survey.exchangeRate).toLocaleString()} CAD` : ''} – tax not included</td></tr>
      ${survey.replacementCost ? `<tr><td style="border:none;padding:3px 8px;"><strong>Estimated Replacement Cost:</strong></td><td style="border:none;padding:3px 8px;font-weight:bold;">$${parseInt(survey.replacementCost).toLocaleString()} USD – tax not included</td></tr>` : ''}
    </table>
  </div>

  <!-- ═══ VESSEL SPECIFICATIONS ═══ -->`;
  const isSail = (survey.vesselType || '').toLowerCase() === 'sail';
  html += `
  <h2>VESSEL SPECIFICATIONS</h2>
  <table>
    <tr><td style="width:40%;"><strong>Boat Style</strong></td><td>${esc(survey.boatStyle) || 'N/A'}</td></tr>
    <tr><td><strong>Construction</strong></td><td>${esc(survey.construction) || 'N/A'}</td></tr>
    <tr><td><strong>Hull Type</strong></td><td>${esc(survey.hullType) || 'N/A'}</td></tr>
    ${isSail ? `<tr><td><strong>Keel Type</strong></td><td>${esc(survey.keelType) || 'N/A'}</td></tr>` : ''}
    <tr><td><strong>LOA</strong></td><td>${esc(survey.loa) || 'N/A'}</td></tr>
    <tr><td><strong>LWL</strong></td><td>${esc(survey.lwl) || 'N/A'}</td></tr>
    <tr><td><strong>Beam</strong></td><td>${esc(survey.beam) || 'N/A'}</td></tr>
    <tr><td><strong>Displacement</strong></td><td>${esc(survey.displacement) || 'N/A'}</td></tr>
    ${isSail ? `<tr><td><strong>Ballast</strong></td><td>${esc(survey.ballast) || 'N/A'}</td></tr>` : ''}
    ${isSail ? `<tr><td><strong>Max Draft</strong></td><td>${esc(survey.maxDraft) || 'N/A'}</td></tr>` : ''}
    ${isSail ? `<tr><td><strong>Total Sail Area</strong></td><td>${esc(survey.totalSailArea) || 'N/A'}</td></tr>` : ''}
    <tr><td><strong>Number of Cabins</strong></td><td>${esc(survey.numberCabins) || 'N/A'}</td></tr>
    <tr><td><strong>Electrical System</strong></td><td>${esc(survey.electricalSystem) || 'N/A'}</td></tr>
    <tr><td><strong>Changes to Original Plan</strong></td><td>${esc(survey.changesToPlan) || 'None noted'}</td></tr>
    ${survey.engineMake ? `<tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">${survey.engine2Make ? 'Engine 1 (Port)' : 'Engine'}</td></tr>` : ''}
    ${survey.engineMake ? `<tr><td><strong>Make / Model</strong></td><td>${esc(survey.engineMake)} ${esc(survey.engineModel || '')}</td></tr>` : ''}
    ${survey.engineSerial ? `<tr><td><strong>Serial No.</strong></td><td>${esc(survey.engineSerial)}</td></tr>` : ''}
    ${survey.engineHP ? `<tr><td><strong>Power Rating</strong></td><td>${esc(survey.engineHP)}</td></tr>` : ''}
    ${survey.engineHours ? `<tr><td><strong>Engine Hours</strong></td><td>${esc(survey.engineHours)}</td></tr>` : ''}
    ${survey.fuelType ? `<tr><td><strong>Fuel Type</strong></td><td>${esc(survey.fuelType)}</td></tr>` : ''}
    ${enginePhotos.length || enginePlatePhotos.length ? `<tr><td><strong>Photos</strong></td><td style="display:flex;gap:12px;flex-wrap:wrap;">${enginePhotos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Engine' + (enginePhotos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Engine" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}${enginePlatePhotos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Data Plate' + (enginePlatePhotos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Data Plate" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}</td></tr>` : ''}
    ${survey.engine2Make ? `<tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">Engine 2 (Starboard)</td></tr>` : ''}
    ${survey.engine2Make ? `<tr><td><strong>Make / Model</strong></td><td>${esc(survey.engine2Make)} ${esc(survey.engine2Model || '')}</td></tr>` : ''}
    ${survey.engine2Serial ? `<tr><td><strong>Serial No.</strong></td><td>${esc(survey.engine2Serial)}</td></tr>` : ''}
    ${survey.engine2HP ? `<tr><td><strong>Power Rating</strong></td><td>${esc(survey.engine2HP)}</td></tr>` : ''}
    ${survey.engine2Hours ? `<tr><td><strong>Engine Hours</strong></td><td>${esc(survey.engine2Hours)}</td></tr>` : ''}
    ${survey.fuelType2 ? `<tr><td><strong>Fuel Type</strong></td><td>${esc(survey.fuelType2)}</td></tr>` : ''}
    ${engine2Photos.length || engine2PlatePhotos.length ? `<tr><td><strong>Photos</strong></td><td style="display:flex;gap:12px;flex-wrap:wrap;">${engine2Photos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Engine' + (engine2Photos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Engine 2" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}${engine2PlatePhotos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Data Plate' + (engine2PlatePhotos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Data Plate" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}</td></tr>` : ''}
    ${survey.transmissionMakeModel ? `<tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">${survey.transmission2MakeModel ? 'Transmission 1 (Port)' : 'Transmission'}</td></tr>` : ''}
    ${survey.transmissionMakeModel ? `<tr><td><strong>Make / Model</strong></td><td>${esc(survey.transmissionMakeModel)}</td></tr>` : ''}
    ${survey.transmissionSerial ? `<tr><td><strong>Serial No.</strong></td><td>${esc(survey.transmissionSerial)}</td></tr>` : ''}
    ${transmissionPhotos.length || transmissionPlatePhotos.length ? `<tr><td><strong>Photos</strong></td><td style="display:flex;gap:12px;flex-wrap:wrap;">${transmissionPhotos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Transmission' + (transmissionPhotos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Transmission" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}${transmissionPlatePhotos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Serial Plate' + (transmissionPlatePhotos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Serial Plate" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}</td></tr>` : ''}
    ${survey.transmission2MakeModel ? `<tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">Transmission 2 (Starboard)</td></tr>` : ''}
    ${survey.transmission2MakeModel ? `<tr><td><strong>Make / Model</strong></td><td>${esc(survey.transmission2MakeModel)}</td></tr>` : ''}
    ${survey.transmission2Serial ? `<tr><td><strong>Serial No.</strong></td><td>${esc(survey.transmission2Serial)}</td></tr>` : ''}
    ${transmission2Photos.length || transmission2PlatePhotos.length ? `<tr><td><strong>Photos</strong></td><td style="display:flex;gap:12px;flex-wrap:wrap;">${transmission2Photos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Transmission' + (transmission2Photos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Transmission 2" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}${transmission2PlatePhotos.map((u, i) => '<div><div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Serial Plate' + (transmission2PlatePhotos.length > 1 ? ' ' + (i+1) : '') + '</div><img src="' + u + '" alt="Serial Plate" style="max-width:350px;max-height:280px;border:1px solid #ccc;border-radius:4px;" /></div>').join('')}</td></tr>` : ''}
  </table>

  <!-- ═══ SURVEY CONDITIONS ═══ -->
  <h2>SURVEY CONDITIONS</h2>
  <table>
    <tr><td style="width:40%;"><strong>Weather</strong></td><td>${esc(survey.weather) || 'N/A'}</td></tr>
    <tr><td><strong>On Land or In Water</strong></td><td>${esc(survey.onLandOrWater) || 'N/A'}</td></tr>
    ${survey.storageDetails ? `<tr><td><strong>Storage / Observation Details</strong></td><td>${esc(survey.storageDetails)}</td></tr>` : ''}
    <tr><td><strong>Limited Trial Run</strong></td><td>${esc(survey.seaTrial) || 'N/A'}</td></tr>
    <tr><td><strong>Power at Time of Survey</strong></td><td>${esc(survey.powerAtTime) || 'N/A'}</td></tr>
    <tr><td><strong>Water at Time of Survey</strong></td><td>${esc(survey.waterAtTime) || 'N/A'}</td></tr>
  </table>

  <!-- ═══ VESSEL DOCUMENTATION ═══ -->
  <h2>VESSEL DOCUMENTATION DATA</h2>
  <table>
    <tr><td style="width:40%;"><strong>HIN (Hull Identification Number)</strong></td><td>${esc(survey.hinNumber) || 'N/A'}${hinPhotoDataUrl ? '<br><img src="' + hinPhotoDataUrl + '" alt="HIN Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
    ${(survey.tcLicense || survey.tcLicenseType || licencePhotoDataUrl || tcPaperLicencePhotoDataUrl) ? `<tr><td><strong>TC Licence Type and Number</strong></td><td>${survey.tcLicenseType ? esc(survey.tcLicenseType) + ' — ' : ''}${esc(survey.tcLicense) || 'N/A'}${survey.tcLicenseExpiry ? ' (expires ' + esc(survey.tcLicenseExpiry) + ')' : ''}${licencePhotoDataUrl ? '<br><em style="font-size:10px;color:#6b7280;">Licence number on hull:</em><br><img src="' + licencePhotoDataUrl + '" alt="Licence Number on Hull" style="max-width:500px;max-height:350px;margin-top:4px;border:1px solid #ccc;border-radius:4px;" />' : ''}${tcPaperLicencePhotoDataUrl ? '<br><em style="font-size:10px;color:#6b7280;">Transport Canada paper licence:</em><br><img src="' + tcPaperLicencePhotoDataUrl + '" alt="TC Paper Licence" style="max-width:500px;max-height:350px;margin-top:4px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>` : ''}
    <tr><td><strong>Tax Status (Duties Paid)</strong></td><td>${esc(survey.taxStatus) || 'N/A'}</td></tr>
    <tr><td><strong>NMMA/CE/TC Compliance Plate</strong></td><td>${esc(survey.compliancePlate) || 'N/A'}${compliancePhotoDataUrl ? '<br><img src="' + compliancePhotoDataUrl + '" alt="Compliance Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
  </table>

${survey.vesselDescription ? `
  <!-- ═══ VESSEL DESCRIPTION ═══ -->
  <h2>VESSEL DESCRIPTION</h2>
  <div class="scope-text">
    <p>${esc(survey.vesselDescription).replace(/\[([A-Z][A-Z\/\s'"\d&amp;,.\-]*)\]/g, '<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;font-weight:600;">[$1]</span>')}</p>
  </div>
` : ''}

  <!-- ═══ SURVEY CHECKLIST SUMMARY ═══ -->
  <h2>SURVEY CHECKLIST SUMMARY</h2>
  <p style="font-size:9pt;color:#666;margin-bottom:8px;">The following table provides an at-a-glance overview of every inspected item, its rating, whether it constitutes a violation, and applicable standards. Detailed observations follow in the body of the report.</p>
  <table class="checklist-table">
    <thead>
      <tr>
        <th style="width:4%;">#</th>
        <th style="width:20%;">Item</th>
        <th style="width:24%;">Selected Text</th>
        <th style="width:12%;">Rating</th>
        <th style="width:8%;">Violation</th>
        <th style="width:6%;">Finding</th>
        <th style="width:26%;">Applicable Standard(s)</th>
      </tr>
    </thead>
    <tbody>
`;

  let tableRow = 0;
  activeTemplate.forEach(section => {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      section.categories.forEach(category => {
        if (!category.items || category.name === 'Survey Specifications' || category.name === 'Vessel Specifications') return;
        const ratedItems = category.items.filter(i => i.type === 'list');
        // Only include items with ratings in the checklist summary
        const answeredItems = ratedItems.filter(i => survey.items[i.label]?.rating && !survey.items[i.label]?.excluded);
        if (answeredItems.length === 0) return;

        // Category header row
        html += `<tr><td colspan="7" style="background:#e8edf2;font-weight:bold;padding:5px 8px;font-size:9pt;border-top:2px solid #006699;">${esc(category.name)}</td></tr>`;

        answeredItems.forEach(item => {
          tableRow++;
          const d = survey.items[item.label];
          const rating = d.rating;
          const code = findingCodeMap[item.label] || '';
          const isViolation = rating.startsWith('A') || rating.startsWith('B');
          const ratingColor = rating.startsWith('A') ? '#dc2626' : rating.startsWith('B') ? '#d97706' : rating.startsWith('C') ? '#16a34a' : '#6b7280';
          const ratingShort = rating.startsWith('A') ? 'A' : rating.startsWith('B') ? 'B' : rating.startsWith('C') ? 'C' : 'NT';
          const textSnippet = d.text ? (d.text.length > 80 ? d.text.substring(0, 77) + '...' : d.text) : '—';
          const stdText = isViolation && d.standards && d.standards.length > 0 ? d.standards.join('; ') : '—';

          html += `<tr>
            <td style="text-align:center;">${tableRow}</td>
            <td>${esc(displayItemLabel(item.label, survey))}</td>
            <td class="text-snippet" title="${esc(d.text || '')}">${esc(textSnippet)}</td>
            <td><span class="rating-pill" style="background:${ratingColor};">${ratingShort} — ${rating.startsWith('Not') ? 'Not Tested' : rating.split(' - ')[1] || rating}</span></td>
            <td style="text-align:center;" class="${isViolation ? 'violation-yes' : 'violation-no'}">${isViolation ? 'YES' : 'No'}</td>
            <td style="text-align:center;font-weight:bold;color:${ratingColor};">${code}</td>
            <td style="font-size:8pt;">${esc(stdText)}</td>
          </tr>`;
        });
      });
    }
  });

  html += `</tbody></table>

  <div style="margin-top:10px; font-size:9pt; color:#555;">
    <strong>Summary:</strong>
    <span style="color:#dc2626;">&#9632;</span> A — Critical: ${findings.A.length} &nbsp;
    <span style="color:#d97706;">&#9632;</span> B — Needs Attention: ${findings.B.length} &nbsp;
    <span style="color:#16a34a;">&#9632;</span> C — Serviceable: ${findings.C.length} &nbsp;
    <span style="color:#6b7280;">&#9632;</span> Not Tested: ${findings.NT.length} &nbsp;
    | &nbsp; <strong>Total items inspected: ${tableRow}</strong>
  </div>

  <div class="page-break"></div>

`;

  // ── SAFETY EQUIPMENT (TC TP 511) ──────────────────────────────────
  if (survey.safetyEquipment && survey.safetyEquipment.length > 0) {
    const safeBracket = TC_SAFETY_EQUIPMENT.brackets.find(b => b.id === (survey.safetyBracket || getLengthBracket(survey.loa)));
    const safeTypeLabel = (survey.safetyVesselType || survey.vesselType || 'power').replace('-', ' ');
    const onBoard = survey.safetyEquipment.filter(e => e.checked).length;
    const missing = survey.safetyEquipment.length - onBoard;

    html += `
  <h2 style="background:#2563eb;">SAFETY EQUIPMENT — TRANSPORT CANADA TP 511</h2>
  <p style="font-size:10pt;color:#555;">Vessel class: <strong>${safeTypeLabel}</strong> — Length bracket: <strong>${safeBracket ? safeBracket.label : 'N/A'}</strong><br/>
  Per Transport Canada TP 511E Safe Boating Guide &amp; Small Vessel Regulations (SOR/2010-91).</p>
  <table class="checklist-table">
    <thead>
      <tr>
        <th style="width:5%;background:#2563eb;">#</th>
        <th style="width:30%;background:#2563eb;">Required Equipment</th>
        <th style="width:10%;background:#2563eb;">Requirement</th>
        <th style="width:12%;background:#2563eb;">On Board?</th>
        <th style="width:18%;background:#2563eb;">Category</th>
        <th style="width:25%;background:#2563eb;">Notes / Condition</th>
      </tr>
    </thead>
    <tbody>
    `;

    survey.safetyEquipment.forEach((eq, idx) => {
      const statusColor = eq.checked ? '#16a34a' : '#dc2626';
      const statusText = eq.checked ? '✓ Yes' : '✗ MISSING';
      let safetyPhotoRow = '';
      if (eq.photos && eq.photos.length > 0) {
        let photoImgs = '';
        for (const pid of eq.photos) {
          if (itemPhotoCache[pid]) {
            photoImgs += `<img src="${itemPhotoCache[pid]}" style="width:240px;height:180px;object-fit:cover;border-radius:4px;margin:3px;border:1px solid #ccc;" />`;
          }
        }
        if (photoImgs) {
          safetyPhotoRow = `<tr><td colspan="6" style="padding:4px 8px;">${photoImgs}</td></tr>`;
        }
      }
      html += `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${esc(eq.name)}</td>
        <td style="text-align:center;">${esc(eq.requirement)}</td>
        <td style="text-align:center;font-weight:bold;color:${statusColor};">${statusText}</td>
        <td style="font-size:9pt;">${esc(eq.category)}</td>
        <td style="font-size:9pt;">${esc(eq.notes || '—')}</td>
      </tr>${safetyPhotoRow}`;
    });

    html += `</tbody></table>
    <div style="margin-top:8px;font-size:10pt;">
      <span style="color:#16a34a;">&#9632;</span> On board: <strong>${onBoard}</strong> &nbsp;
      <span style="color:#dc2626;">&#9632;</span> Missing/not verified: <strong>${missing}</strong> &nbsp;
      | &nbsp; Total required items: <strong>${survey.safetyEquipment.length}</strong>
    </div>
    ${missing > 0 ? '<p style="color:#dc2626;font-weight:bold;font-size:10pt;margin-top:8px;">⚠ Vessel does not carry all required safety equipment per Transport Canada regulations.</p>' : '<p style="color:#16a34a;font-weight:bold;font-size:10pt;margin-top:8px;">✓ Vessel carries all required safety equipment per Transport Canada regulations.</p>'}
    <div class="page-break"></div>
    `;
  }

  // ── INSTRUMENTS & ELECTRONICS INVENTORY ────────────────────────────
  if (survey.instrumentsElectronics && survey.instrumentsElectronics.length > 0) {
    const ieWorking = survey.instrumentsElectronics.filter(e => e.working === true).length;
    const ieNotWorking = survey.instrumentsElectronics.filter(e => e.working === false).length;
    const ieNotTested = survey.instrumentsElectronics.filter(e => e.working === null || e.working === undefined).length;

    html += `
  <h2 style="background:#7c3aed;">INSTRUMENTS &amp; ELECTRONICS INVENTORY</h2>
  <table class="checklist-table">
    <thead>
      <tr>
        <th style="width:5%;background:#7c3aed;">#</th>
        <th style="width:20%;background:#7c3aed;">Instrument / Device</th>
        <th style="width:15%;background:#7c3aed;">Make</th>
        <th style="width:15%;background:#7c3aed;">Model</th>
        <th style="width:8%;background:#7c3aed;">Year</th>
        <th style="width:12%;background:#7c3aed;">Status</th>
        <th style="width:25%;background:#7c3aed;">Notes</th>
      </tr>
    </thead>
    <tbody>
    `;

    survey.instrumentsElectronics.forEach((item, idx) => {
      const statusColor = item.working === true ? '#16a34a' : item.working === false ? '#dc2626' : '#6b7280';
      const statusText = item.working === true ? '✓ Working' : item.working === false ? '✗ Not working' : '— Not tested';

      let iePhotoRow = '';
      if (item.photos && item.photos.length > 0) {
        let photoImgs = '';
        for (const pid of item.photos) {
          if (itemPhotoCache[pid]) {
            photoImgs += `<img src="${itemPhotoCache[pid]}" style="width:240px;height:180px;object-fit:cover;border-radius:4px;margin:3px;border:1px solid #ccc;" />`;
          }
        }
        if (photoImgs) {
          iePhotoRow = `<tr><td colspan="7" style="padding:4px 8px;">${photoImgs}</td></tr>`;
        }
      }

      html += `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${esc(item.name || 'Unidentified')}</strong>${item.aiDetails ? `<br/><span style="font-size:8pt;color:#555;">${esc(item.aiDetails)}</span>` : ''}</td>
        <td>${esc(item.make || '—')}</td>
        <td>${esc(item.model || '—')}</td>
        <td style="text-align:center;">${esc(item.year || '—')}</td>
        <td style="text-align:center;font-weight:bold;color:${statusColor};">${statusText}</td>
        <td style="font-size:9pt;">${esc(item.notes || '—')}</td>
      </tr>${iePhotoRow}`;
    });

    html += `</tbody></table>
    <div style="margin-top:8px;font-size:10pt;">
      <span style="color:#16a34a;">&#9632;</span> Working: <strong>${ieWorking}</strong> &nbsp;
      <span style="color:#dc2626;">&#9632;</span> Not working: <strong>${ieNotWorking}</strong> &nbsp;
      <span style="color:#6b7280;">&#9632;</span> Not tested: <strong>${ieNotTested}</strong> &nbsp;
      | &nbsp; Total instruments: <strong>${survey.instrumentsElectronics.length}</strong>
    </div>
    ${ieNotWorking > 0 ? `<p style="color:#dc2626;font-weight:bold;font-size:10pt;margin-top:8px;">⚠ ${ieNotWorking} instrument${ieNotWorking > 1 ? 's' : ''} found to be non-operational.</p>` : ''}
    <div class="page-break"></div>
    `;
  }

  // ── DETAILED SURVEY FINDINGS (body sections) ──────────────────────
  html += `<h2 style="background:#006699;font-size:14pt;">DETAILED SURVEY FINDINGS</h2>`;

  // Bilge pump detail table (if data exists)
  if (survey.bilgePumps && survey.bilgePumps.length > 0) {
    html += `<h3>Bilge Pump Detail</h3>`;
    html += `<table><thead><tr><th>Location</th><th>Type</th><th>Make/Model</th><th>Capacity</th><th>Float Switch</th><th>Tested</th><th>Discharge</th></tr></thead><tbody>`;
    survey.bilgePumps.forEach(bp => {
      html += `<tr><td>${esc(bp.location)}</td><td>${esc(bp.type)}</td><td>${esc(bp.makeModel)}</td><td>${esc(bp.capacity)}</td><td>${esc(bp.floatSwitch)}</td><td>${esc(bp.tested)}</td><td>${esc(bp.discharge)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  activeTemplate.forEach(section => {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      section.categories.forEach(category => {
        if (!category.items || category.name === 'Survey Specifications' || category.name === 'Vessel Specifications') return;

        const ratedItems = expandReportItems(category.items.filter(item => item.type === 'list'));
        // Include items that have: a rating OR text/notes OR photos (and are not excluded)
        const completedItems = ratedItems.filter(item => {
          const itemData = survey.items[item.label];
          if (!itemData || itemData.excluded) return false;
          const hasRating = itemData.rating && itemData.rating.trim();
          const hasText = itemData.text && itemData.text.trim();
          const hasPhotos = itemData.photos && itemData.photos.length > 0;
          return hasRating || hasText || hasPhotos;
        });
        if (completedItems.length === 0) return;

        html += `<h2>${esc(category.name)}</h2>`;

        completedItems.forEach(item => {
          const itemData = survey.items[item.label];
          const ratingLabel = itemData.rating || '';
          const ratingClass = ratingLabel.startsWith('A') ? 'rating-a' : ratingLabel.startsWith('B') ? 'rating-b' : ratingLabel.startsWith('C') ? 'rating-c' : 'rating-nt';
          const code = findingCodeMap[item.label];
          const codeTag = code ? ` <strong style="color:${RATING_COLORS[ratingLabel] || '#006699'};">(Finding ${code})</strong>` : '';

          // Build inline photos for the body — large, captioned, like Norm Behring's style
          let itemPhotosHtml = '';
          if (itemData.photos && itemData.photos.length > 0) {
            const imgs = itemData.photos
              .filter(pid => itemPhotoCache[pid])
              .map(pid => `<div style="display:inline-block;margin:6px 8px 6px 0;vertical-align:top;">
                <img src="${itemPhotoCache[pid]}" alt="${esc(item.label)}" style="max-width:800px;max-height:600px;width:auto;height:auto;border:1px solid #ccc;border-radius:4px;" />
                <div style="font-size:9pt;color:#666;margin-top:3px;font-style:italic;">${esc(item.label)}</div>
              </div>`)
              .join('');
            if (imgs) {
              itemPhotosHtml = `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${imgs}</div>`;
            }
          }

          // Outdrive info for report
          let outdriveInfoHtml = '';
          if (item.label.startsWith('Outdrive') && (itemData.outdriveMake || itemData.outdriveModel)) {
            const parts = [];
            if (itemData.outdriveMake) parts.push(itemData.outdriveMake);
            if (itemData.outdriveModel) parts.push(itemData.outdriveModel);
            outdriveInfoHtml = `<p><em>Outdrive: ${esc(parts.join(' — '))}</em></p>`;
          }

          // Winch info for report
          let winchInfoHtml = '';
          if (item.label.toLowerCase().includes('winch') && (itemData.winchMake || itemData.winchModel)) {
            const parts = [];
            if (itemData.winchMake) parts.push(itemData.winchMake);
            if (itemData.winchModel) parts.push(itemData.winchModel);
            if (itemData.winchElectric) parts.push('Electric');
            winchInfoHtml = `<p><em>Winch: ${esc(parts.join(' — '))}</em></p>`;
          }

          // Mast options info for Main mast item
          let mastOptionsHtml = '';
          if (item.label === 'Main mast') {
            const parts = [];
            if (itemData.mastStepping) parts.push(itemData.mastStepping);
            if (itemData.mastTrackType) parts.push(itemData.mastTrackType);
            if (parts.length > 0) {
              mastOptionsHtml = `<p><em>Mast type: ${esc(parts.join(', '))}</em></p>`;
            }
          }

          html += `
  <div class="item" style="border-left-color: ${RATING_COLORS[ratingLabel] || '#006699'};">
    <p><strong>${esc(displayItemLabel(item.label, survey))}</strong>${ratingLabel ? ` — <span class="${ratingClass}">${ratingLabel}</span>${codeTag}` : ''}</p>
    ${outdriveInfoHtml}
    ${winchInfoHtml}
    ${mastOptionsHtml}
    ${itemData.text ? `<p>${esc(depersonalise(dedup(itemData.text)))}</p>` : ''}
    ${(ratingLabel.startsWith('A') || ratingLabel.startsWith('B')) && itemData.standards && itemData.standards.length > 0 ? `<p class="standards"><strong>Applicable Standards:</strong> ${itemData.standards.join(', ')}</p>` : ''}
    ${itemPhotosHtml}
  </div>`;
        });
      });
    }
  });

  // ── FINDINGS & RECOMMENDATIONS ────────────────────────────────────
  html += `<div class="page-break"></div>`;
  html += `<h2 style="background: #dc2626; font-size: 14pt;">FINDINGS &amp; RECOMMENDATIONS</h2>`;

  html += `<div class="scope-text">
    <p>The Findings &amp; Recommendations section is only one section of this Survey Report. If received on its own, this section should not be mistaken as this vessel's full Survey Report. PLEASE BE ADVISED THAT SOME DEFICIENCIES, OBSERVATIONS AND SUGGESTIONS MAY ALSO BE CONTAINED IN THE BODY OF THE REPORT.</p>
    <p>Deficiencies noted under <strong>"A — FIRST PRIORITY/SAFETY FINDINGS"</strong> should be addressed before the vessel is next underway. These findings could represent an endangerment to personnel and/or the vessel's safe operating condition.</p>
    <p>Deficiencies noted under <strong>"B — SECONDARY PRIORITY/FINDINGS NEEDING TIMELY ATTENTION"</strong> should be corrected in the near future so as to maintain and adhere to certain codes, regulations, standards or recommended practices.</p>
    <p>Deficiencies noted under <strong>"C — SURVEYOR'S GENERAL FINDINGS, NOTES AND OBSERVATIONS"</strong> are lower priority or cosmetic findings, which should be addressed in keeping with good marine maintenance practices.</p>
    <p><em>When performing repairs, diagnosing, adjustments, and/or replacements of any component; always follow proper marine mechanical and/or electrical repair and safety practices. Consult and/or hire a certified marine technician, if required.</em></p>
  </div>`;

  // Helper to build finding photo HTML — larger for F&R section
  function findingPhotos(f) {
    if (!f.photos || f.photos.length === 0) return '';
    const imgs = f.photos
      .filter(pid => itemPhotoCache[pid])
      .map(pid => `<div style="display:inline-block;margin:4px 6px 4px 0;vertical-align:top;">
        <img src="${itemPhotoCache[pid]}" alt="${esc(f.label)}" style="max-width:760px;max-height:570px;width:auto;height:auto;border:1px solid #ccc;border-radius:4px;" />
        <div style="font-size:9pt;color:#666;margin-top:2px;font-style:italic;">${esc(f.label)}</div>
      </div>`)
      .join('');
    return imgs ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:8px;">${imgs}</div>` : '';
  }

  // Helper: build a specific recommendation line citing the item's standards
  function buildRecommendation(f, severity) {
    const stdCite = (severity === 'A' || severity === 'B') && f.standards && f.standards.length ? ` (${f.standards.join('; ')})` : '';
    if (severity === 'A') {
      return `<p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Recommendation:</strong> Immediate correction required before the vessel is next underway${stdCite}. This finding represents a direct safety risk or code violation.</em></p>`;
    } else if (severity === 'B') {
      return `<p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Recommendation:</strong> Schedule repairs in the near future to maintain compliance with applicable codes, regulations, standards, or recommended practices${stdCite}.</em></p>`;
    } else {
      return `<p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Recommendation:</strong> Address in keeping with good marine maintenance practices.</em></p>`;
    }
  }

  // Helper to render a single finding entry
  function renderFinding(f, color, severity) {
    return `<div class="finding-section" style="margin-bottom:10px;padding-left:8px;border-left:3px solid ${color};">
      <strong style="color:${color};">Finding ${f.code}</strong> — ${esc(displayItemLabel(f.label, survey))}
      ${f.text ? `<p style="margin:3px 0;">${esc(depersonalise(dedup(f.text)))}</p>` : ''}
      ${findingPhotos(f)}
      ${buildRecommendation(f, severity)}
    </div>`;
  }

  // Type A findings
  html += `<h3 style="color:#dc2626;">Findings &amp; Recommendations (Type A — Critical / Safety)</h3>`;
  if (findings.A.length === 0) {
    html += `<p>No Type A findings.</p>`;
  } else {
    findings.A.forEach(f => { html += renderFinding(f, '#dc2626', 'A'); });
  }

  // Type B findings
  html += `<h3 style="color:#d97706;">Findings &amp; Recommendations (Type B — Needs Attention)</h3>`;
  if (findings.B.length === 0) {
    html += `<p>No Type B findings.</p>`;
  } else {
    findings.B.forEach(f => { html += renderFinding(f, '#d97706', 'B'); });
  }

  // Type C findings
  html += `<h3 style="color:#16a34a;">Findings &amp; Recommendations (Type C — Serviceable / General Notes)</h3>`;
  if (findings.C.length === 0) {
    html += `<p>No Type C findings.</p>`;
  } else {
    findings.C.forEach(f => { html += renderFinding(f, '#16a34a', 'C'); });
  }

  // Not tested items
  if (findings.NT.length > 0) {
    html += `<h3 style="color:#6b7280;">Not Tested / Not Verified</h3>`;
    findings.NT.forEach(f => {
      html += `<div class="finding-section" style="margin-bottom:10px;padding-left:8px;border-left:3px solid #6b7280;">
        <strong style="color:#6b7280;">Finding ${f.code}</strong> — ${esc(f.label)}
        ${f.text ? `<p style="margin:3px 0;">${esc(depersonalise(dedup(f.text)))}</p>` : ''}
        ${findingPhotos(f)}
        <p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Note:</strong> A comprehensive inspection was attempted but was not possible due to constraints imposed upon the surveyor. Further inspection is recommended when conditions permit.</em></p>
      </div>`;
    });
  }

  // ── SUMMARY OF VESSEL CONDITION ───────────────────────────────────
  html += `<div class="page-break"></div>`;
  html += `
  <h2>SUMMARY OF VESSEL CONDITION</h2>
  <div class="scope-text">
    <p>It is the Surveyor's experience that develops an opinion of the OVERALL VESSEL RATING OF CONDITION after the Survey has been completed and the findings have been organised in a logical manner.</p>
    <p>The grading of condition developed by BUC RESEARCH and accepted in the marine industry for a vessel at the time of Survey determines the adjustment to the range of base values in the BUC USED BOAT PRICE GUIDE for a similar vessel sold within a given time period, as a consideration to determine the Market Value.</p>

    <p><strong>The following is the accepted Marine Grading System of Condition:</strong></p>
    <div class="buc-grades">
      <p><strong>"EXCELLENT (BRISTOL) CONDITION"</strong> — A vessel that is maintained in mint or Bristol fashion (usually better than factory new, loaded with extras, a rarity).</p>
      <p><strong>"ABOVE AVERAGE CONDITION"</strong> — Has had above average care and is equipped with extra electrical and electronic gear.</p>
      <p><strong>"AVERAGE CONDITION"</strong> — Ready for sale requiring no additional work and normally equipped for her size.</p>
      <p><strong>"FAIR CONDITION"</strong> — Requires usual maintenance to prepare for sale.</p>
      <p><strong>"POOR CONDITION"</strong> — Substantial yard work required and devoid of extras.</p>
      <p><strong>"RESTORABLE CONDITION"</strong> — Enough of the hull and engine exists to restore the boat to usable condition.</p>
    </div>

    <p>As a result of the Survey, as shown in the REPORT OF MARINE SURVEY &amp; FINDINGS AND RECOMMENDATIONS sections of this report and by virtue of my experience, my opinion is:</p>
    <p style="font-size:14pt;font-weight:bold;text-align:center;padding:12px;border:2px solid #006699;">Overall Vessel Rating is: "${esc(survey.overallCondition) || 'Not yet assessed'}"</p>
  </div>
  `;

  // ── STATEMENT OF VALUATION ────────────────────────────────────────
  html += `
  <h2>STATEMENT OF VALUATION</h2>
  <div class="scope-text">
    <p>The "FAIR MARKET VALUE" is the most probable price in terms of money which a vessel should bring in a competitive and open market under all conditions requisite to a fair sale, the buyer and seller each acting prudently, knowledgeably and assuming the price is not affected by undue stimulus. Implicit in this definition is the consummation of a sale as of a specified date and the passing of title from seller to buyer under conditions whereby:</p>
    <ul>
      <li>Buyer and seller are typically motivated.</li>
      <li>Both parties are well informed or well advised, and each acts in what they consider their own best interest.</li>
      <li>A reasonable time is allowed for exposure in the open market.</li>
      <li>Payment is made in terms of cash in U.S. dollars or in terms of financial arrangements comparable thereto.</li>
      <li>The price represents a normal consideration for the vessel sold, unaffected by special or creative financing or sales concessions granted by anyone associated with the sale.</li>
    </ul>
  </div>
  <table>
    <tr><td style="width:40%;"><strong>Valuation Sources</strong></td><td>${survey.valuationSources && survey.valuationSources.length > 0 ? survey.valuationSources.map(s => esc(s)).join('<br>') : esc(survey.valuationSource) || 'N/A'}</td></tr>
    <tr><td><strong>Fair Market Value (USD)</strong></td><td><strong>$${parseInt(survey.valuationLow || 0).toLocaleString()} – $${parseInt(survey.valuationHigh || 0).toLocaleString()} USD</strong></td></tr>
`;

  if (survey.exchangeRate) {
    const lowCAD = parseInt(survey.valuationLow || 0) * survey.exchangeRate;
    const highCAD = parseInt(survey.valuationHigh || 0) * survey.exchangeRate;
    html += `<tr><td><strong>Fair Market Value (CAD)</strong></td><td><strong>$${Math.round(lowCAD).toLocaleString()} – $${Math.round(highCAD).toLocaleString()} CAD</strong> (@ ${parseFloat(survey.exchangeRate).toFixed(2)})</td></tr>`;
  }

  if (survey.replacementCost) {
    html += `<tr><td><strong>Estimated Replacement Cost (USD)</strong></td><td><strong>$${parseInt(survey.replacementCost).toLocaleString()} USD</strong> — tax not included</td></tr>`;
  }

  html += `</table>

  <p><strong>Appraisal Methodology:</strong></p>
  <p class="scope-text">${esc(survey.valuationRationale) || 'The following method of valuation was used to obtain the Fair Market Value: similarly equipped, same or similar model vessels as shown as sold on soldboats.com, buc.com, and listings on yachtworld.com (and/or other websites) in the last two years were identified, adjusted for model year, condition, equipment, and date of sale, and averaged together. The vessel\'s overall condition rating using the BUC Marine Grading System has been factored into the final valuation range.'}</p>

  <p class="scope-text"><strong>Summary:</strong> In accordance with the request for a Marine Survey of the "${esc(survey.vesselName)}", for the purpose of evaluating its present condition and estimating its Fair Market Value and Replacement Cost, I herewith submit my conclusion based on the preceding report. The subject vessel was personally inspected by the undersigned on <strong>${survey.surveyDate || 'N/A'}</strong>. Subject to correction of deficiencies listed in sections A and B, the vessel is considered to be reasonably suitable for its intended use. Other deficiencies listed should be attended to in keeping with good maintenance practices or as upgrades.</p>
  `;

  // ── VALUATION WORKSHEET ────────────────────────────────────────────
  html += `<div class="page-break"></div>`;
  html += `
  <h2>VALUATION WORKSHEET</h2>
  <div class="scope-text">
    <p>The following data sources and comparables were used in determining the Fair Market Value and Estimated Replacement Cost of the subject vessel.</p>
  </div>
  <table>
    <tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">Subject Vessel</td></tr>
    <tr><td style="width:40%;"><strong>Vessel</strong></td><td>${esc(survey.yearMakeModel) || 'N/A'}</td></tr>
    <tr><td><strong>Vessel Name</strong></td><td>${esc(survey.vesselName) || 'N/A'}</td></tr>
    <tr><td><strong>HIN</strong></td><td>${esc(survey.hinNumber) || 'N/A'}</td></tr>
    <tr><td><strong>Overall Condition Rating</strong></td><td>${esc(survey.overallCondition) || 'Not yet assessed'}</td></tr>
    <tr><td><strong>Date of Survey</strong></td><td>${survey.surveyDate || 'N/A'}</td></tr>
  </table>

  <table style="margin-top:12px;">
    <tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">Valuation Sources Consulted</td></tr>
    <tr><td style="width:40%;"><strong>Sources</strong></td><td>${survey.valuationSources && survey.valuationSources.length > 0 ? survey.valuationSources.map(s => '• ' + esc(s)).join('<br>') : esc(survey.valuationSource) || 'N/A'}</td></tr>
    <tr><td><strong>BUC Value Range (USD)</strong></td><td>$${parseInt(survey.valuationLow || 0).toLocaleString()} – $${parseInt(survey.valuationHigh || 0).toLocaleString()}</td></tr>
    ${survey.exchangeRate ? `<tr><td><strong>Exchange Rate (USD→CAD)</strong></td><td>${parseFloat(survey.exchangeRate).toFixed(4)}</td></tr>` : ''}
    ${survey.replacementCost ? `<tr><td><strong>Estimated Replacement Cost (USD)</strong></td><td>$${parseInt(survey.replacementCost).toLocaleString()}</td></tr>` : ''}
  </table>

  <table style="margin-top:12px;">
    <tr><td colspan="6" style="background:#e8edf2;font-weight:bold;">Comparable Vessels / Market Research</td></tr>
    <tr>
      <th>Source</th>
      <th>Vessel</th>
      <th>Price (USD)</th>
      <th>Location</th>
      <th>Date</th>
      <th>Notes</th>
    </tr>
    ${(survey.comparables && survey.comparables.length > 0) ? survey.comparables.map(c => `
    <tr>
      <td>${esc(c.source)}</td>
      <td>${esc(c.vessel)}</td>
      <td>${esc(c.price)}</td>
      <td>${esc(c.location || '')}</td>
      <td>${esc(c.date || '')}</td>
      <td>${esc(c.notes)}${c.water ? ' (' + esc(c.water) + ')' : ''}</td>
    </tr>`).join('') : `
    <tr><td colspan="6" style="text-align:center;color:#666;font-style:italic;">No comparables recorded. Check BUCValu, soldboats.com, and yachtworld.com for comparable sales and current listings.</td></tr>`}
  </table>

  <div class="scope-text" style="margin-top:12px;">
    <p><strong>Appraisal Methodology:</strong> ${esc(survey.valuationRationale) || 'The following method of valuation was used to obtain the Fair Market Value: similarly equipped, same or similar model vessels as shown as sold on soldboats.com, buc.com, and listings on yachtworld.com (and/or other websites) in the last two years were identified, adjusted for model year, condition, equipment, and date of sale, and averaged together. The vessel\'s overall condition rating using the BUC Marine Grading System has been factored into the final valuation range.'}</p>
    <p><strong>Condition Adjustment:</strong> The vessel's overall condition rating of "${esc(survey.overallCondition) || 'Not yet assessed'}" has been factored into the final valuation range using the BUC Marine Grading System.</p>
  </div>
  `;

  // ── SURVEYOR'S CERTIFICATE ────────────────────────────────────────
  html += `
  <div class="footer">
    <h2>SURVEYOR'S CERTIFICATE</h2>
    <div class="scope-text">
      <p>I certify that, to the best of my knowledge and belief:</p>
      <p>The statements of fact contained in this report are true and correct.</p>
      <p>The reported analyses, opinions and conclusions are limited only by the reported assumptions and limiting conditions, and are my personal, unbiased professional analyses, opinions, and conclusions.</p>
      <p>I have no present or prospective interest in the vessel that is the subject of this report and I have no personal interest or bias with respect to the parties involved.</p>
      <p>My compensation is not contingent upon the reporting of a predetermined value or direction in value that favours the cause of the client, the amount of the value estimate, the attainment of a stipulated result or the occurrence of a subsequent event.</p>
      <p>I have made a personal inspection of the vessel that is the subject of this report.</p>
      <p>This report is submitted without prejudice and for the benefit of all concerned parties.</p>
    </div>
    <br/>
    <div style="display:flex; align-items:center; gap:20px;">
      <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
           alt="Kiki Marine Logo" style="max-width:200px; height:auto;"
           onerror="this.style.display='none'">
      <div>
        <p style="margin:0;"><strong>Dave Seagrim</strong>, SAMS Surveyor Associate, ABYC Master Advisor<br/>
        Kiki Marine<br/>
        647-289-7876 — dave@kikimarine.ca<br/>
        <strong>Date:</strong> ${reportDate}</p>
      </div>
    </div>
  </div>
  `;

  // ── FOUR CORNERS VESSEL PHOTOS ──────────────────────────────────────
  let fourCornerPhotos = {};
  const cornerKeys = ['fourCornerPortBow', 'fourCornerStbdBow', 'fourCornerPortStern', 'fourCornerStbdStern'];
  const cornerLabels = {'fourCornerPortBow': 'Port Bow', 'fourCornerStbdBow': 'Starboard Bow', 'fourCornerPortStern': 'Port Stern', 'fourCornerStbdStern': 'Starboard Stern'};
  for (const key of cornerKeys) {
    if (survey[key]) {
      fourCornerPhotos[key] = await loadAndCompress(survey[key]);
    }
  }

  if (Object.keys(fourCornerPhotos).length > 0) {
    html += `<div class="page-break"></div>`;
    html += `<h2>VESSEL OVERVIEW PHOTOGRAPHS</h2>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">`;
    for (const key of cornerKeys) {
      if (fourCornerPhotos[key]) {
        html += `<div style="text-align:center;">
          <img src="${fourCornerPhotos[key]}" alt="${cornerLabels[key]}" style="max-width:100%;max-height:350px;border:1px solid #ccc;border-radius:4px;" />
          <p style="font-size:10pt;color:#555;margin-top:4px;font-style:italic;">${cornerLabels[key]}</p>
        </div>`;
      }
    }
    html += `</div>`;
  }

  html += `<script>
async function exportToWord() {
  var btn = document.querySelector('#exportToolbar button:last-child');
  var origText = btn.textContent;
  btn.textContent = '⏳ Preparing...';
  btn.disabled = true;

  try {
    // Convert logo to base64 for embedding in Word
    var logoBase64 = '';
    try {
      var logoImg = document.querySelector('img[alt="Kiki Marine Logo"]');
      if (logoImg && logoImg.naturalWidth > 0) {
        var canvas = document.createElement('canvas');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(logoImg, 0, 0);
        logoBase64 = canvas.toDataURL('image/png');
      }
    } catch(e) { /* cross-origin, skip embedding */ }

    // Clone the body content, excluding the toolbar
    var clone = document.body.cloneNode(true);
    var toolbar = clone.querySelector('#exportToolbar');
    if (toolbar) toolbar.remove();

    // If we got the logo as base64, replace the external URLs in the clone
    if (logoBase64) {
      var imgs = clone.querySelectorAll('img[alt*="Kiki Marine"]');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].src = logoBase64;
        imgs[i].removeAttribute('onerror');
      }
    }

    var bodyHtml = clone.innerHTML;

    // Get styles
    var styles = document.querySelector('style').outerHTML;

    // Word-compatible HTML with MSO headers
    var wordDoc =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
      'xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<!--[if gte mso 9]><xml><w:WordDocument>' +
      '<w:View>Print</w:View>' +
      '<w:Zoom>100</w:Zoom>' +
      '<w:DoNotOptimizeForBrowser/>' +
      '</w:WordDocument></xml><![endif]-->' +
      '<style>' +
      '  @page { size: 8.5in 11in; margin: 0.75in 0.6in 1in 0.6in; }' +
      '  @page Section1 { mso-page-orientation: portrait; mso-header-margin: .5in; mso-footer-margin: .5in; }' +
      '  div.Section1 { page: Section1; }' +
      '  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #333; line-height: 1.6; }' +
      '  table { border-collapse: collapse; width: 100%; }' +
      '  td, th { border: 1px solid #ddd; padding: 6px 8px; font-size: 10pt; }' +
      '  th { background: #f0f0f0; }' +
      '  h1 { text-align: center; border-bottom: 3px solid #006699; padding-bottom: 10px; margin-bottom: 6px; }' +
      '  h2 { background: #006699; color: white; padding: 8px 12px; margin-top: 24px; font-size: 13pt; }' +
      '  h3 { color: #006699; margin-top: 18px; font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; }' +
      '  .page-break { page-break-after: always; }' +
      '  .rating-a { color: #dc2626; font-weight: bold; }' +
      '  .rating-b { color: #d97706; font-weight: bold; }' +
      '  .rating-c { color: #16a34a; font-weight: bold; }' +
      '  .rating-nt { color: #6b7280; font-weight: bold; }' +
      '  .rating-safety { color: #2563eb; font-weight: bold; }' +
      '  .item { margin: 12px 0; padding: 8px 10px; border-left: 4px solid #006699; }' +
      '  .footer { margin-top: 40px; padding: 20px; border-top: 2px solid #006699; }' +
      '  .checklist-table th { background: #006699; color: white; padding: 5px 6px; font-size: 8.5pt; }' +
      '  .checklist-table td { padding: 4px 6px; font-size: 9pt; }' +
      '  .checklist-table .rating-pill { display: inline-block; padding: 1px 7px; border-radius: 3px; color: white; font-weight: bold; font-size: 8pt; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="Section1">' +
      bodyHtml +
      '</div>' +
      '</body></html>';

    // Create downloadable blob
    var blob = new Blob(['\\ufeff' + wordDoc], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var titleParts = document.title.split('—').map(function(p) { return p.trim(); });
    var vesselName = titleParts[1] || 'Vessel';
    var locationName = titleParts[2] || '';
    var dateStr = new Date().toISOString().split('T')[0];
    var nameParts = ['Kiki_Marine_Survey', vesselName.replace(/[^a-zA-Z0-9]/g, '_')];
    if (locationName && locationName !== 'Survey') nameParts.push(locationName.replace(/[^a-zA-Z0-9]/g, '_'));
    nameParts.push(dateStr);
    a.href = url;
    a.download = nameParts.join('_') + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    showAlert('Export failed: ' + e.message);
  }

  btn.textContent = origText;
  btn.disabled = false;
}

function toggleProseMode() {
  const items = document.querySelectorAll('.item');
  const btn = document.getElementById('proseModeBtn');
  const isCurrentlyProse = btn.textContent.includes('Table');

  if (isCurrentlyProse) {
    // Switch back to table mode
    items.forEach(item => {
      item.style.borderLeft = '';
      item.style.padding = '';
      item.style.margin = '';
    });
    document.querySelectorAll('.checklist-table').forEach(t => t.style.display = '');
    btn.textContent = '📝 Prose Mode';
    btn.style.background = '#e5e7eb';
  } else {
    // Switch to prose mode - hide the big checklist table, keep findings visible
    const summaryTables = document.querySelectorAll('.checklist-table');
    summaryTables.forEach(t => {
      // Only hide the main checklist summary, not safety equipment
      if (!t.closest('h2')?.textContent?.includes('SAFETY')) {
        t.style.display = 'none';
      }
    });
    // Compact the detailed findings
    items.forEach(item => {
      item.style.borderLeft = '3px solid #006699';
      item.style.padding = '4px 8px';
      item.style.margin = '6px 0';
    });
    btn.textContent = '📊 Table Mode';
    btn.style.background = '#d1fae5';
  }
}
</script>
</body>
</html>
  `;

  // Render report
  if (!html || html.length < 100) {
    console.error('Report HTML is empty or too short:', html?.length);
    alert('Report generation failed — no content was produced.');
    return;
  }

  // Detect PWA standalone mode (iOS adds to home screen) — window.open
  // navigates the current page in standalone, so always use in-page rendering
  const isStandalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    renderReportInPage(html);
  } else {
    const reportWindow = window.open('', '_blank');
    if (reportWindow && reportWindow.document) {
      try {
        reportWindow.document.write(html);
        reportWindow.document.close();
      } catch (e) {
        console.error('Report write error:', e);
        reportWindow.close();
        renderReportInPage(html);
      }
    } else {
      renderReportInPage(html);
    }
  }
  } catch (err) {
    console.error('generateReport error:', err);
    alert('Report generation failed: ' + err.message);
  }
}

function renderReportInPage(html) {
  const previousView = currentView;
  currentView = 'report'; persistViewState();
  history.pushState({ view: 'report' }, '');

  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:100;background:#006699;padding:12px 16px;display:flex;align-items:center;gap:12px;">
      <button onclick="history.back()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;">←</button>
      <span style="color:white;font-weight:600;">Survey Report</span>
      <button onclick="window.print()" style="margin-left:auto;background:#16a34a;color:white;border:none;padding:8px 16px;border-radius:6px;font-size:14px;cursor:pointer;">🖨️ Print/PDF</button>
    </div>
    <div style="margin-top:56px;">
      <iframe id="reportFrame" style="width:100%;border:none;min-height:100vh;" sandbox="allow-same-origin allow-scripts"></iframe>
    </div>
  `;

  const iframe = document.getElementById('reportFrame');
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Auto-resize iframe to content
  iframe.onload = () => {
    try {
      iframe.style.height = iframeDoc.body.scrollHeight + 'px';
    } catch(e) {}
  };
  setTimeout(() => {
    try {
      iframe.style.height = iframeDoc.body.scrollHeight + 'px';
    } catch(e) {}
  }, 500);
}

// Service Worker registration — updateViaCache:'none' ensures the browser
// always fetches sw.js from the network, so version bumps take effect on
// the very next navigation instead of waiting for the HTTP cache to expire.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(reg => {
      // Check for updates every 60 seconds while the app is open
      setInterval(() => { reg.update().catch(() => {}); }, 60000);
      // If a new worker installed while we were loading, activate it now
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready — show a toast so Dave knows
            showToast('New version available — tap ↻ Update');
          }
        });
      });
    })
    .catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });

  // When the new SW takes over, reload the page automatically
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    persistViewState();
    window.location.reload();
  });
}

// Init app
async function initApp() {
  try {
    // Suppress iOS autofill bar (keys, credit card, location, checkmark)
    // by setting autocomplete="off" on all inputs as they're created
    const disableAutofill = (el) => {
      // Don't suppress autocomplete on inputs linked to a datalist — they need it for suggestions
      if (el.getAttribute('list')) return;
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
    };
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') disableAutofill(node);
          if (node.querySelectorAll) {
            node.querySelectorAll('input, textarea').forEach(disableAutofill);
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    // Browser back button / swipe-back handling
    let _handlingPopstate = false;
    window.addEventListener('popstate', (e) => {
      if (_handlingPopstate) return;
      // If a bottom-sheet overlay is open, back/swipe-back should ONLY close
      // the sheet — never navigate away from the inspection view. This also
      // absorbs any spurious popstate iOS fires while a sheet is active
      // (keyboard dismiss, swipe-back gesture, etc.) so the surveyor never
      // gets kicked to the home screen mid-edit.
      const _openSheet = document.getElementById('bottomSheetOverlay');
      if (_openSheet) {
        _openSheet.remove();
        // Re-push an inspection state so forward history stays sane
        if (currentView === 'inspection' && currentSurveyId) {
          history.pushState({ view: 'inspection', surveyId: currentSurveyId }, '');
        }
        // Scroll the previously-edited row back into view
        const lbl = _openSheet.getAttribute('data-item-label');
        if (lbl) {
          setTimeout(() => {
            const row = document.querySelector(
              `.compact-item-wrapper[data-item-label="${String(lbl).replace(/"/g, '\\"')}"]`
            );
            if (row && typeof row.scrollIntoView === 'function') {
              try { row.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) { row.scrollIntoView(); }
            }
          }, 0);
        }
        return;
      }
      // If camera is active, iOS may fire a spurious popstate on return.
      // Suppress it and re-push the current state so the user stays put.
      if (window._cameraActive || window._backupActive) {
        const curState = { view: currentView };
        if (currentSurveyId) curState.surveyId = currentSurveyId;
        history.pushState(curState, '');
        return;
      }
      _handlingPopstate = true;

      const state = e.state;
      const targetView = state ? state.view : 'surveys';

      if (currentView === 'edit-survey') {
        if (currentSurveyId) {
          returnToInspection(currentSurveyId);
        } else {
          renderHome();
        }
      } else if (currentView === 'inspection') {
        // Save data silently and go home (no confirm on back — data is auto-saved)
        saveAllInspectionData().then(() => {
          const bottomBar = document.getElementById('inspectionBottomBar');
          if (bottomBar) bottomBar.remove();
          const reportBtn = document.getElementById('reportBtn');
          if (reportBtn) reportBtn.remove();
          const backupBtn = document.getElementById('backupBtn');
          if (backupBtn) backupBtn.remove();
          renderHome();
        });
      } else if (currentView === 'new-survey') {
        showConfirm('Discard this new survey and go back?', 'Discard', 'Cancel').then(yes => {
          if (yes) {
            renderHome();
          } else {
            // User chose to stay — re-push the state so back works again
            history.pushState({ view: 'new-survey' }, '');
          }
        });
      } else if (currentView === 'report') {
        // Back from report preview goes to inspection
        if (currentSurveyId) {
          returnToInspection(currentSurveyId);
        } else {
          renderHome();
        }
      }
      // If already on home, let normal back behaviour happen

      setTimeout(() => { _handlingPopstate = false; }, 300);
    });

    // Set initial history state
    history.replaceState({ view: 'surveys' }, '');

    // === Camera return / viewport fix ===
    // On iOS Chrome, opening the camera can suspend or discard the PWA tab.
    // When the user returns, we must:
    //   (a) not navigate away from the inspection (guard popstate)
    //   (b) recalculate the viewport (Android landscape bug)
    //   (c) recover the inspection view if the page was fully reloaded
    //
    // We persist the camera flag to sessionStorage so it survives tab
    // suspension/restore cycles.
    window._cameraActive = sessionStorage.getItem('_cameraActive') === '1';

    // setCameraActive is defined at module scope (see below initApp)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && window._cameraActive) {
        setCameraActive(false);
        // Run recalc at multiple intervals — iOS PWA can be very slow
        // to restore the correct viewport after camera return
        forceViewportRecalc();
        setTimeout(forceViewportRecalc, 100);
        setTimeout(forceViewportRecalc, 300);
        setTimeout(forceViewportRecalc, 600);
        setTimeout(forceViewportRecalc, 1200);
        setTimeout(forceViewportRecalc, 2500);
      }
    });

    // pageshow fires when the page is restored from BFCache (iOS Safari/Chrome).
    // event.persisted === true means the page was restored, not freshly loaded.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && window._cameraActive) {
        setCameraActive(false);
        forceViewportRecalc();
        setTimeout(forceViewportRecalc, 300);
        setTimeout(forceViewportRecalc, 800);
      }
    });

    // Also listen for resize events after camera — another signal the
    // viewport has changed
    let _resizeAfterCamera = false;
    window.addEventListener('resize', () => {
      if (window._cameraActive || _resizeAfterCamera) {
        _resizeAfterCamera = true;
        setTimeout(() => {
          forceViewportRecalc();
          _resizeAfterCamera = false;
        }, 150);
      }
    });

    // Mark camera as active whenever a file input with capture is clicked
    document.addEventListener('click', (e) => {
      const input = e.target.closest('input[type="file"]');
      if (input && (input.capture || input.accept === 'image/*')) {
        setCameraActive(true);
      }
    }, true);

    // Monitor visualViewport for unexpected zoom — reset immediately.
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (window.visualViewport.scale > 1.05) {
          forceViewportRecalc();
        }
      });
    }

    // === Camera recovery on full page reload ===
    // If iOS discarded the tab entirely and the page reloads, check if
    // we were mid-camera and restore the inspection view automatically.
    const cameraSurveyId = sessionStorage.getItem('_cameraSurveyId');
    if (cameraSurveyId && sessionStorage.getItem('_cameraActive') === '1') {
      sessionStorage.removeItem('_cameraActive');
      sessionStorage.removeItem('_cameraSurveyId');
      // Defer until after initDB/fetchDataFiles so data is ready
      window._cameraRecoverySurveyId = cameraSurveyId;
    }

    await initDB();
    await fetchDataFiles();
    // Kick off dictionary load in the background — no await, so startup
    // isn't blocked by the 1.5MB file. Spell-check warnings will begin
    // firing as soon as it finishes loading.
    loadSpellDict();

    // If recovering from camera-induced page reload, go straight back
    // to the inspection instead of showing the home screen
    if (window._cameraRecoverySurveyId) {
      const recoverId = window._cameraRecoverySurveyId;
      delete window._cameraRecoverySurveyId;
      try {
        const survey = await getSurvey(recoverId);
        if (survey) {
          showToast('Restored inspection after camera');
          renderInspection(survey);
          return;
        }
      } catch (recoverErr) {
        console.warn('Camera recovery failed, showing home:', recoverErr);
      }
    }

    // One-time migration: add mechanic disclaimer to engine-related survey text
    try {
      const migrationKey = 'migration_mechanic_disclaimer_v1';
      if (!localStorage.getItem(migrationKey)) {
        const allSurveys = await getAllSurveys();
        const textReplacements = [
          // Anti-vibration mounts
          { old: 'The anti-vibration mounts showed very little corrosion or cracking and appeared serviceable. However, inspection by a qualified marine mechanic is still advisable.', new: 'The anti-vibration mounts showed very little corrosion or cracking and appeared serviceable. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'According to the owner, the anti-vibration mounts had been changed recently. They showed virtually no corrosion or cracking and appeared serviceable.', new: 'According to the owner, the anti-vibration mounts had been changed recently. They showed virtually no corrosion or cracking and appeared serviceable. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'The anti-vibration mounts especially the [insert location] mount appeared cracked and worn. Inspection and repair or replacement by a licensed mechanic is recommended.', new: 'The anti-vibration mounts especially the [insert location] mount appeared cracked and worn. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, inspection and repair or replacement by a licensed marine mechanic is recommended.' },
          { old: 'The engine anti-vibration mounts were degraded, cracked, or missing. Replacement is required to restore proper engine isolation and prevent structural vibration.', new: 'The engine anti-vibration mounts were degraded, cracked, or missing. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, inspection and replacement by a licensed marine mechanic is required.' },
          // Belts and pulleys
          { old: 'The alternator belt was worn with cracking and should be replaced.', new: 'The alternator belt was worn with cracking and should be replaced. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, inspection and replacement by a licensed marine mechanic is recommended.' },
          { old: 'The alternator belt was not adequately tensioned and should be adjusted by a qualified marine mechanic.', new: 'The alternator belt was not adequately tensioned. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, adjustment and confirmation by a licensed marine mechanic is recommended.' },
          { old: 'The belts were free of fraying and cracking and appeared to be at approximately the correct tension.', new: 'The belts were free of fraying and cracking and appeared to be at approximately the correct tension. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'The belt was free of fraying and cracking and appeared to be at approximately the correct tension.', new: 'The belt was free of fraying and cracking and appeared to be at approximately the correct tension. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'The engine belts were cracked, frayed, or missing, or the pulleys were damaged. Immediate replacement is required to restore engine auxiliary power and cooling.', new: 'The engine belts were cracked, frayed, or missing, or the pulleys were damaged. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, immediate inspection and replacement by a licensed marine mechanic is required.' },
          // Exhaust condition
          { old: 'The exhaust was in serviceable condition and conformed to SAE J2006. Two hose clamps were used at all connections.', new: 'The exhaust was in serviceable condition and conformed to SAE J2006. Two hose clamps were used at all connections. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'Despite expected rust at the mixing elbow, the exhaust appeared serviceable. The exhaust hose conformed to SAE J2006, and two hose clamps were used at all connections.', new: 'Despite expected rust at the mixing elbow, the exhaust appeared serviceable. The exhaust hose conformed to SAE J2006, and two hose clamps were used at all connections. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'Despite expected rust at the mixing elbow, the exhaust appeared serviceable. However, because the exhaust pipe was insulated, it could not be confirmed whether the hose was double-clamped or conformed to SAE J2006.', new: 'Despite expected rust at the mixing elbow, the exhaust appeared serviceable. However, because the exhaust pipe was insulated, it could not be confirmed whether the hose was double-clamped or conformed to SAE J2006. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, full inspection by a licensed marine mechanic is recommended.' },
          { old: 'The exhaust system was functional but showed signs of corrosion or minor leaking at connection points. Service and tightening are recommended to restore optimal performance.', new: 'The exhaust system was functional but showed signs of corrosion or minor leaking at connection points. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, service and confirmation by a licensed marine mechanic is recommended.' },
          // Manifolds and risers
          { old: 'The manifolds and risers appeared serviceable with very little rust at the joints and no signs of corrosion tracking down from the joints.', new: 'The manifolds and risers appeared serviceable with very little rust at the joints and no signs of corrosion tracking down from the joints. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'The manifolds and risers appeared serviceable. Indications of water leakage were present at the joint between the [side] riser and manifold suggesting corrosion or a failed seal. Service by a qualified marine mechanic is recommended.', new: 'The manifolds and risers appeared serviceable. Indications of water leakage were present at the joint between the [side] riser and manifold suggesting corrosion or a failed seal. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, service and confirmation by a licensed marine mechanic is recommended.' },
          // Hoses
          { old: 'All hoses appeared pliable, well-secured and without cracking.', new: 'All hoses appeared pliable, well-secured and without cracking. As this is a visual observation only and does not constitute a mechanical assessment, confirmation of serviceability by a licensed marine mechanic is recommended.' },
          { old: 'Some engine hoses were older and may require replacement. Inspection and replacement as needed by a qualified mechanic is recommended.', new: 'Some engine hoses were older and may require replacement. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, inspection and replacement as needed by a licensed marine mechanic is recommended.' },
          { old: 'Hoses are cracked, split, or severely deteriorated. Replacement is critical to prevent fluid leakage.', new: 'Hoses are cracked, split, or severely deteriorated. As the surveyor\'s observations are visual only and do not constitute a mechanical assessment, immediate inspection and replacement by a licensed marine mechanic is required.' },
        ];
        let migrated = 0;
        for (const survey of allSurveys) {
          if (!survey.items) continue;
          let changed = false;
          for (const key of Object.keys(survey.items)) {
            const item = survey.items[key];
            if (!item.text) continue;
            for (const r of textReplacements) {
              if (item.text.includes(r.old)) {
                item.text = item.text.replace(r.old, r.new);
                changed = true;
              }
            }
          }
          if (changed) {
            await saveSurvey(survey);
            migrated++;
          }
        }
        localStorage.setItem(migrationKey, Date.now().toString());
        if (migrated > 0) console.log(`Migrated mechanic disclaimer text in ${migrated} survey(s)`);
      }
    } catch (migErr) {
      console.warn('Migration (mechanic disclaimer) failed:', migErr);
    }

    // One-time migration: convert single engine/transmission photo IDs to arrays
    try {
      const migKeyPhotos = 'migration_multi_engine_photos_v1';
      if (!localStorage.getItem(migKeyPhotos)) {
        const allSurveys = await getAllSurveys();
        const photoFields = ['enginePhoto', 'enginePlatePhoto', 'engine2Photo', 'engine2PlatePhoto',
          'transmissionPhoto', 'transmissionPlatePhoto', 'transmission2Photo', 'transmission2PlatePhoto'];
        let migrated = 0;
        for (const survey of allSurveys) {
          let changed = false;
          for (const field of photoFields) {
            if (survey[field] && !Array.isArray(survey[field])) {
              survey[field] = [survey[field]];
              changed = true;
            }
          }
          if (changed) {
            await saveSurvey(survey);
            migrated++;
          }
        }
        localStorage.setItem(migKeyPhotos, Date.now().toString());
        if (migrated > 0) console.log(`Migrated engine photos to arrays in ${migrated} survey(s)`);
      }
    } catch (migErr) {
      console.warn('Migration (multi engine photos) failed:', migErr);
    }

    // Restore previous view if page was reloaded (not camera recovery — that's handled above)
    const savedView = sessionStorage.getItem('_currentView');
    const savedSurveyId = sessionStorage.getItem('_currentSurveyId');
    let restored = false;

    if (savedView && savedView !== 'surveys' && savedSurveyId) {
      try {
        const survey = await getSurvey(savedSurveyId);
        if (survey) {
          if (savedView === 'inspection') {
            renderInspection(survey);
            restored = true;
          } else if (savedView === 'edit-survey') {
            editSurvey(savedSurveyId);
            restored = true;
          }
          // For 'new-survey' or 'report', fall through to home
        }
      } catch (restoreErr) {
        console.warn('View restore failed, showing home:', restoreErr);
      }
    }

    if (!restored) {
      renderHome();
    }

    // Initialize Firebase real-time sync (non-blocking)
    try { FirebaseSync.init(); } catch (syncErr) { console.warn('Sync init error:', syncErr); }

    // Run photo integrity check in background (non-blocking)
    validatePhotoIntegrity().catch(err => console.warn('Photo integrity check failed:', err));

    // Check backup readiness after a short delay (let Firebase init settle)
    setTimeout(() => {
      const firebaseOk = typeof FirebaseSync !== 'undefined' && FirebaseSync.isEnabled();
      const driveOk = typeof DriveBackup !== 'undefined' && DriveBackup.isSignedIn && DriveBackup.isSignedIn();
      if (!firebaseOk && !driveOk) {
        _showBackupWarning('No cloud backup connected', 'Sign in to Firebase or Google Drive to protect your photos');
      } else if (!firebaseOk) {
        console.warn('[Backup] Firebase not connected — Drive only');
      } else if (!driveOk) {
        console.warn('[Backup] Google Drive not connected — Firebase only');
      } else {
        console.log('[Backup] Both Firebase and Google Drive connected ✓');
      }
    }, 3000);
  } catch (e) {
    console.error('Init error:', e);
    document.getElementById('app').innerHTML = `<div style="padding: 20px; color: red;">Error initializing app: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE REAL-TIME SYNC MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE DRIVE BACKUP MODULE
// Uses Firebase Auth Google Sign-In with Drive scope to upload survey data
// and photos directly to the surveyor's Google Drive.
// ═══════════════════════════════════════════════════════════════════════════════

// Persistent backup progress dialog — sticks on screen through the whole
// upload so Dave can actually see what's happening. Replaces transient toasts.
const BackupProgress = (() => {
  let _overlay = null;
  let _cancelled = false;
  let _startTime = 0;

  function isCancelled() { return _cancelled; }

  function show() {
    _cancelled = false;
    _startTime = Date.now();
    const existing = document.getElementById('backupProgressOverlay');
    if (existing) existing.remove();

    _overlay = document.createElement('div');
    _overlay.id = 'backupProgressOverlay';
    _overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10002;display:flex;align-items:center;justify-content:center;padding:20px;';
    _overlay.innerHTML = `
      <div style="background:white;border-radius:14px;max-width:460px;width:100%;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <span style="font-size:24px;">☁️</span>
          <h2 id="bpTitle" style="margin:0;font-size:18px;color:#006699;">Backing up to Google Drive</h2>
        </div>
        <div id="bpSurveyLabel" style="font-size:14px;font-weight:600;color:#374151;margin-bottom:6px;">Preparing…</div>
        <div id="bpStepLabel" style="font-size:12px;color:#6b7280;margin-bottom:12px;">—</div>
        <div style="background:#e5e7eb;border-radius:10px;height:14px;overflow:hidden;margin-bottom:6px;">
          <div id="bpBar" style="background:linear-gradient(90deg,#3399cc,#006699);height:100%;width:0%;transition:width 0.3s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:14px;">
          <span id="bpPercent">0%</span>
          <span id="bpElapsed">0s elapsed</span>
        </div>
        <div id="bpDetails" style="font-size:11px;color:#94a3b8;margin-bottom:14px;max-height:60px;overflow:auto;font-family:monospace;"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button id="bpCancelBtn" style="padding:8px 14px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(_overlay);
    document.getElementById('bpCancelBtn').onclick = () => {
      _cancelled = true;
      const btn = document.getElementById('bpCancelBtn');
      if (btn) { btn.textContent = 'Cancelling…'; btn.disabled = true; }
    };

    // Update elapsed timer
    _overlay._timer = setInterval(() => {
      const el = document.getElementById('bpElapsed');
      if (el) {
        const s = Math.floor((Date.now() - _startTime) / 1000);
        el.textContent = s < 60 ? `${s}s elapsed` : `${Math.floor(s / 60)}m ${s % 60}s elapsed`;
      }
    }, 1000);
  }

  function update({ surveyLabel, stepLabel, percent, detail }) {
    if (!_overlay) return;
    if (surveyLabel !== undefined) {
      const el = document.getElementById('bpSurveyLabel');
      if (el) el.textContent = surveyLabel;
    }
    if (stepLabel !== undefined) {
      const el = document.getElementById('bpStepLabel');
      if (el) el.textContent = stepLabel;
    }
    if (typeof percent === 'number') {
      const bar = document.getElementById('bpBar');
      const pct = document.getElementById('bpPercent');
      const clamped = Math.max(0, Math.min(100, percent));
      if (bar) bar.style.width = `${clamped}%`;
      if (pct) pct.textContent = `${Math.round(clamped)}%`;
    }
    if (detail) {
      const det = document.getElementById('bpDetails');
      if (det) {
        const line = document.createElement('div');
        line.textContent = detail;
        det.appendChild(line);
        det.scrollTop = det.scrollHeight;
      }
    }
  }

  function finish({ title, subtitle, success }) {
    if (!_overlay) return;
    const titleEl = document.getElementById('bpTitle');
    const surveyEl = document.getElementById('bpSurveyLabel');
    const stepEl = document.getElementById('bpStepLabel');
    const cancelBtn = document.getElementById('bpCancelBtn');
    const bar = document.getElementById('bpBar');
    if (titleEl) {
      titleEl.textContent = title || (success ? '✓ Backup complete' : '⚠ Backup finished with errors');
      titleEl.style.color = success ? '#16a34a' : '#dc2626';
    }
    if (surveyEl) surveyEl.textContent = subtitle || '';
    if (stepEl) stepEl.textContent = '';
    if (bar && success) { bar.style.width = '100%'; bar.style.background = '#16a34a'; }
    if (cancelBtn) {
      cancelBtn.textContent = 'Close';
      cancelBtn.style.background = '#f1f5f9';
      cancelBtn.style.color = '#334155';
      cancelBtn.style.borderColor = '#e5e7eb';
      cancelBtn.disabled = false;
      cancelBtn.onclick = () => hide();
    }
  }

  function hide() {
    if (_overlay) {
      if (_overlay._timer) clearInterval(_overlay._timer);
      _overlay.remove();
      _overlay = null;
    }
    _cancelled = false;
  }

  return { show, update, finish, hide, isCancelled };
})();

// Friendly dialog when the Google Drive API hasn't been enabled on the
// Firebase/GCP project. Replaces the scary raw 403 JSON with a direct
// link and a one-tap copy so Dave can fix it from his phone if needed.
function showDriveApiDisabledDialog(activationUrl, done, total) {
  // Remove any existing dialog
  const existing = document.getElementById('driveApiDisabledDialog');
  if (existing) existing.remove();

  const url = activationUrl || 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
  const status = (done > 0 && total > 1)
    ? `Backed up ${done} of ${total} surveys before the error — nothing after that uploaded.`
    : 'Nothing was uploaded to Drive.';

  const overlay = document.createElement('div');
  overlay.id = 'driveApiDisabledDialog';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:14px;max-width:460px;width:100%;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);max-height:90vh;overflow:auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:28px;">⚙️</span>
        <h2 style="margin:0;font-size:18px;color:#dc2626;">Drive API not enabled</h2>
      </div>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#374151;">
        ${status} Your Google Cloud project needs the Drive API switched on — this is a <strong>one-time setup</strong>, not a repeat login.
      </p>
      <ol style="margin:0 0 14px;padding-left:20px;font-size:13px;line-height:1.6;color:#374151;">
        <li>Tap the blue link below and sign in with <strong>daveseagrim@gmail.com</strong></li>
        <li>Tap the blue <strong>Enable</strong> button on that page</li>
        <li>Wait 2–3 minutes for Google to propagate the change</li>
        <li>Come back and tap Backup again — the same sign-in still works</li>
      </ol>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;margin-bottom:14px;">
        <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:4px;">ENABLE URL</div>
        <a href="${url}" target="_blank" rel="noopener"
           style="color:#006699;font-size:12px;word-break:break-all;text-decoration:underline;">${url}</a>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="driveApiOpenBtn" style="flex:1;min-width:140px;padding:10px;background:#006699;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
          🔗 Open Enable Page
        </button>
        <button id="driveApiCopyBtn" style="flex:1;min-width:120px;padding:10px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
          📋 Copy Link
        </button>
        <button id="driveApiCloseBtn" style="padding:10px 16px;background:none;color:#6b7280;border:1px solid #e5e7eb;border-radius:8px;font-weight:600;cursor:pointer;">
          Close
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('driveApiOpenBtn').onclick = () => {
    window.open(url, '_blank', 'noopener');
  };
  document.getElementById('driveApiCopyBtn').onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch (e) {
      showToast('Could not copy — long-press the link to copy manually');
    }
  };
  document.getElementById('driveApiCloseBtn').onclick = () => overlay.remove();
}

const DriveBackup = (() => {
  let _accessToken = null;
  let _backupFolderId = null;  // "Kiki Marine Survey Backups" folder on Drive
  const FOLDER_NAME = 'Kiki Marine Survey Backups';
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

  function isSignedIn() {
    return !!_accessToken;
  }

  // Sign in with Google via Firebase Auth, requesting Drive file scope
  async function signIn() {
    if (!firebase || !firebase.auth) {
      throw new Error('Firebase Auth not loaded');
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    // Set custom parameter to skip account chooser if already signed in
    provider.setCustomParameters({ prompt: 'consent', login_hint: 'daveseagrim@gmail.com' });
    const result = await firebase.auth().signInWithPopup(provider);
    _accessToken = result.credential.accessToken;
    window._driveTokenTime = Date.now();
    console.log('[Drive] Signed in, token obtained');
    return _accessToken;
  }

  // Refresh token if expired (tokens last ~1 hour)
  async function ensureToken() {
    if (_accessToken && (Date.now() - (window._driveTokenTime || 0)) < 3300000) {
      return _accessToken; // Still valid
    }
    console.log('[Drive] Token expired or missing, refreshing...');
    // Use signInWithPopup with login_hint to auto-select account
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.setCustomParameters({ prompt: 'none', login_hint: 'daveseagrim@gmail.com' });
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      _accessToken = result.credential.accessToken;
      window._driveTokenTime = Date.now();
      console.log('[Drive] Token refreshed');
    } catch (e) {
      console.warn('[Drive] Silent refresh failed, trying full sign-in:', e.message);
      // Fall back to full sign-in
      await signIn();
    }
    return _accessToken;
  }

  // Find or create the root backup folder on Drive
  async function getOrCreateBackupFolder() {
    if (_backupFolderId) return _backupFolderId;
    const token = await ensureToken();

    // Search for existing folder
    const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      _backupFolderId = searchData.files[0].id;
      return _backupFolderId;
    }

    // Create the folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    });
    const createData = await createRes.json();
    _backupFolderId = createData.id;
    return _backupFolderId;
  }

  // Find or create a subfolder for a specific vessel inside the backup folder
  async function getOrCreateVesselFolder(vesselName) {
    const token = await ensureToken();
    const parentId = await getOrCreateBackupFolder();
    const safeName = (vesselName || 'Unnamed').trim();

    const q = encodeURIComponent(`name='${safeName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: safeName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
    });
    const createData = await createRes.json();
    return createData.id;
  }

  // List all filenames already present in a Drive folder, as a Set.
  // Paginates through results in case the folder has >1000 files.
  // Used by backupSurvey to skip photos already uploaded (B-01 resume).
  async function listExistingFilenamesInFolder(folderId) {
    const token = await ensureToken();
    const names = new Set();
    let pageToken = null;
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(name)&pageSize=1000${pageParam}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 403 && /SERVICE_DISABLED|accessNotConfigured|has not been used in project/i.test(errText)) {
          const projectMatch = errText.match(/project[s]?[\/\s=]+(\d+)/);
          const projectId = projectMatch ? projectMatch[1] : '';
          const err = new Error('DRIVE_API_DISABLED');
          err.driveApiDisabled = true;
          err.activationUrl = projectId
            ? `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`
            : 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
          throw err;
        }
        throw new Error(`Drive list failed (${res.status}): ${errText}`);
      }
      const data = await res.json();
      if (data.files) data.files.forEach(f => names.add(f.name));
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return names;
  }

  // Upload a file to Drive using multipart upload
  async function uploadFile(folderId, fileName, mimeType, content) {
    const token = await ensureToken();
    const metadata = { name: fileName, parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', content instanceof Blob ? content : new Blob([content], { type: mimeType }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    if (!res.ok) {
      const errText = await res.text();
      // Detect the "Drive API not enabled" error and throw a friendlier message
      if (res.status === 403 && /SERVICE_DISABLED|accessNotConfigured|has not been used in project/i.test(errText)) {
        const projectMatch = errText.match(/project[s]?[\/\s=]+(\d+)/);
        const projectId = projectMatch ? projectMatch[1] : '';
        const err = new Error('DRIVE_API_DISABLED');
        err.driveApiDisabled = true;
        err.projectId = projectId;
        err.activationUrl = projectId
          ? `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`
          : 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview';
        throw err;
      }
      throw new Error(`Drive upload failed (${res.status}): ${errText}`);
    }
    return await res.json();
  }

  // Convert a base64 data URL to a Blob
  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const raw = atob(parts[1]);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // Main backup function — uploads survey data + photos to Drive
  // MEMORY-SAFE: loads one photo at a time via ID list
  // onProgress: optional ({ surveyLabel, stepLabel, percent, detail }) callback
  // checkCancelled: optional () => boolean to abort mid-upload
  async function backupSurvey(surveyId, onProgress, checkCancelled) {
    const survey = await getSurvey(surveyId);
    if (!survey) throw new Error('Survey not found');

    const vesselName = survey.vesselName || 'Unnamed';
    const report = (update) => { if (typeof onProgress === 'function') onProgress(update); };

    report({ surveyLabel: vesselName, stepLabel: 'Preparing vessel folder…', percent: 0 });
    const folderId = await getOrCreateVesselFolder(vesselName);

    // B-01: scan Drive folder to see which photos are already uploaded
    report({ stepLabel: 'Checking Drive for existing photos…', percent: 1 });
    let existingFilenames = new Set();
    try {
      existingFilenames = await listExistingFilenamesInFolder(folderId);
    } catch (listErr) {
      // If the list fails (e.g. Drive API disabled), propagate — this is the
      // same call type as upload, so failure here means upload will also fail.
      throw listErr;
    }

    // 1. Upload survey data (without photo blobs) as JSON — always uploaded
    // fresh because it may have changed since the last backup. Filename
    // includes the date so same-day re-runs overwrite, different days create
    // a new snapshot.
    report({ stepLabel: 'Uploading survey data…', percent: 2 });
    const surveyClone = JSON.parse(JSON.stringify(survey));
    if (surveyClone.items) {
      for (const key of Object.keys(surveyClone.items)) {
        const item = surveyClone.items[key];
        if (item && item.photos) {
          item.photos = item.photos.map(p => typeof p === 'string' && p.startsWith('data:') ? '(photo-in-drive)' : p);
        }
      }
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const surveyJsonName = `${vesselName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${dateStr}.json`;
    const surveyJson = JSON.stringify(surveyClone, null, 2);
    if (!existingFilenames.has(surveyJsonName)) {
      await uploadFile(folderId, surveyJsonName, 'application/json', surveyJson);
      report({ detail: `✓ ${surveyJsonName}` });
    } else {
      report({ detail: `⏭ ${surveyJsonName} (already on Drive today)` });
    }

    // 2. Collect photo IDs only (no image data in memory)
    const photoIds = await new Promise((resolve) => {
      const tx = db.transaction(['photos'], 'readonly');
      const index = tx.objectStore('photos').index('surveyId');
      const keys = [];
      index.openKeyCursor(IDBKeyRange.only(surveyId)).onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { keys.push(cursor.primaryKey); cursor.continue(); }
        else resolve(keys);
      };
    });

    const totalPhotos = photoIds.length;
    if (totalPhotos === 0) {
      report({ stepLabel: 'No photos to upload', percent: 100 });
      return { vesselName, uploaded: 0, skipped: 0, totalPhotos: 0 };
    }

    // 3. Upload ONE photo at a time, SKIPPING any that are already on Drive
    //    (B-01 resume fix). KikiDriveBackup.photoFilename is the shared
    //    deterministic filename generator used for comparison.
    const photoFilename = (window.KikiDriveBackup && window.KikiDriveBackup.photoFilename) || null;
    let uploaded = 0;
    let skipped = 0;
    let processed = 0;

    for (const pid of photoIds) {
      if (typeof checkCancelled === 'function' && checkCancelled()) {
        const err = new Error('Backup cancelled by user');
        err.cancelled = true;
        throw err;
      }
      processed++;

      let photo = await getPhotoById(pid);
      if (!photo || !photo.dataUrl) { photo = null; continue; }

      // Compute filename and check if already on Drive
      const ext = photo.dataUrl.startsWith('data:image/png') ? '.png' : '.jpg';
      // Prefer the pure helper (covered by tests) but fall back to inline
      // logic if the module didn't load for any reason.
      const photoName = photoFilename
        ? photoFilename(photo, processed - 1)
        : (photo.label || photo.id || `photo_${uploaded}`).replace(/[^a-zA-Z0-9_-]/g, '_') + ext;

      if (existingFilenames.has(photoName)) {
        skipped++;
        photo = null;
        report({
          stepLabel: `Skipping ${processed} of ${totalPhotos} (already on Drive)…`,
          detail: `⏭ ${photoName}`,
          percent: Math.round((processed / totalPhotos) * 100)
        });
        continue;
      }

      // Upload the new photo
      let photoBlob = dataUrlToBlob(photo.dataUrl);
      const mimeType = photoBlob.type;
      const sizeKb = Math.round(photoBlob.size / 1024);

      // Release the base64 string before uploading
      photo = null;

      report({
        stepLabel: `Uploading photo ${processed} of ${totalPhotos} (${sizeKb} KB)…`,
        percent: Math.round(((processed - 0.5) / totalPhotos) * 100)
      });

      await uploadFile(folderId, photoName, mimeType, photoBlob);
      photoBlob = null;
      uploaded++;

      report({
        detail: `✓ ${photoName}`,
        percent: Math.round((processed / totalPhotos) * 100)
      });

      // 500ms pause to let browser reclaim memory
      await new Promise(r => setTimeout(r, 500));
    }

    const summary = skipped > 0
      ? `Uploaded ${uploaded} · Skipped ${skipped} (already on Drive) · Total ${totalPhotos}`
      : `Uploaded ${uploaded} of ${totalPhotos} photos`;
    report({ stepLabel: summary, percent: 100 });
    return { vesselName, uploaded, skipped, totalPhotos };
  }

  // Upload a single photo to the correct vessel folder on Drive
  async function backupOnePhoto(photo) {
    if (!_accessToken || !photo || !photo.dataUrl) return;
    try {
      const survey = await getSurvey(photo.surveyId);
      const vesselName = (survey && survey.vesselName) || 'Unnamed';
      const folderId = await getOrCreateVesselFolder(vesselName);

      const photoBlob = dataUrlToBlob(photo.dataUrl);
      const ext = photo.dataUrl.startsWith('data:image/png') ? '.png' : '.jpg';
      const photoName = (photo.label || photo.id || 'photo').replace(/[^a-zA-Z0-9_-]/g, '_') + ext;
      await uploadFile(folderId, photoName, photoBlob.type, photoBlob);
    } catch (err) {
      console.warn('[Drive] Single photo backup failed:', err.message);
    }
  }

  // Backup ALL surveys — memory-safe, one survey at a time
  async function backupAll() {
    const surveys = await getAllSurveys();
    if (surveys.length === 0) { showToast('No surveys to back up'); return; }

    BackupProgress.show();

    let done = 0;
    let failed = 0;
    let lastError = '';
    let apiDisabledErr = null;
    let totalPhotosUploaded = 0;
    let cancelled = false;

    for (let i = 0; i < surveys.length; i++) {
      if (BackupProgress.isCancelled()) { cancelled = true; break; }
      const survey = surveys[i];
      const prefix = `Survey ${i + 1} of ${surveys.length}: ${survey.vesselName || 'Unnamed'}`;

      try {
        const result = await backupSurvey(
          survey.id,
          (update) => {
            // Prepend the overall position and scale per-survey percent into the
            // overall percent across the whole batch.
            const overallUpdate = { ...update };
            if (typeof update.percent === 'number') {
              overallUpdate.percent = ((i + update.percent / 100) / surveys.length) * 100;
            }
            if (update.surveyLabel !== undefined) {
              overallUpdate.surveyLabel = `${prefix}`;
            }
            BackupProgress.update(overallUpdate);
          },
          () => BackupProgress.isCancelled()
        );
        done++;
        totalPhotosUploaded += (result && result.uploaded) || 0;
        const skipStr = (result.skipped || 0) > 0 ? ` (${result.skipped} already on Drive)` : '';
        BackupProgress.update({ detail: `✓ ${survey.vesselName}: ${result.uploaded}/${result.totalPhotos} photos${skipStr}` });
      } catch (err) {
        console.error(`Drive backup failed for ${survey.vesselName}:`, err);
        if (err.cancelled) { cancelled = true; break; }
        if (err.driveApiDisabled) {
          apiDisabledErr = err;
          failed++;
          break;
        }
        BackupProgress.update({ detail: `✗ ${survey.vesselName}: ${err.message || err}` });
        lastError = err.message || String(err);
        failed++;
      }
    }

    if (apiDisabledErr) {
      BackupProgress.hide();
      showDriveApiDisabledDialog(apiDisabledErr.activationUrl, done, surveys.length);
    } else if (cancelled) {
      BackupProgress.finish({
        title: '⚠ Backup cancelled',
        subtitle: `${done} of ${surveys.length} surveys completed before cancel`,
        success: false
      });
    } else if (failed > 0) {
      BackupProgress.finish({
        title: '⚠ Backup finished with errors',
        subtitle: `${done} surveys uploaded, ${failed} failed. Last error: ${lastError}`,
        success: false
      });
    } else {
      BackupProgress.finish({
        title: '✓ Backup complete',
        subtitle: `All ${done} surveys backed up · ${totalPhotosUploaded} photos uploaded`,
        success: true
      });
    }
  }

  return { isSignedIn, signIn, backupSurvey, backupOnePhoto, backupAll, ensureToken };
})();

const FirebaseSync = (() => {
  let _syncEnabled = false;
  let _unsubscribeSurveys = null;
  let _suppressLocalWrite = false;  // Prevent echo loops
  let _lastLocalPushTime = {};      // Track when we last pushed each survey to avoid echo
  let _syncStatus = 'disconnected'; // disconnected | syncing | synced | error
  let _lastSyncTime = null;

  // ── Status UI ──────────────────────────────────────────────────────
  function updateSyncStatusUI(status, detail) {
    _syncStatus = status;
    _lastSyncTime = detail || null;
    const el = document.getElementById('syncStatusIndicator');
    if (!el) return;
    const colours = { disconnected: '#6b7280', syncing: '#d97706', synced: '#16a34a', error: '#dc2626' };
    const labels = { disconnected: 'Offline', syncing: 'Syncing…', synced: 'Synced', error: 'Sync error' };
    el.style.background = colours[status] || '#6b7280';
    el.title = (labels[status] || status) + (detail ? ' — ' + detail : '');
  }

  // ── Survey Sync (Firestore) ────────────────────────────────────────

  // Upload a single survey to Firestore (without photos — photos go to Storage)
  async function pushSurvey(survey) {
    if (!_syncEnabled || !window.fsDb) return;
    try {
      // Clone and strip photo dataUrls from the survey object (too large for Firestore 1MB limit)
      const doc = JSON.parse(JSON.stringify(survey));
      doc.lastModified = new Date().toISOString();
      // Remove any inline base64 that might have leaked into survey data
      delete doc._rev;
      await window.fsDb.collection('surveys').doc(survey.id).set(doc);
      _lastLocalPushTime[survey.id] = Date.now();
      updateSyncStatusUI('synced', new Date().toLocaleTimeString());
      _lastSyncTime = Date.now();
    } catch (err) {
      console.error('Firebase pushSurvey error:', err);
      updateSyncStatusUI('error', err.message);
    }
  }

  // Delete a survey from Firestore
  async function removeSurvey(surveyId) {
    if (!_syncEnabled || !window.fsDb) return;
    try {
      await window.fsDb.collection('surveys').doc(surveyId).delete();
      // Also delete all photos for this survey from Storage
      await removeAllPhotosForSurvey(surveyId);
    } catch (err) {
      console.error('Firebase removeSurvey error:', err);
    }
  }

  // Listen for real-time changes from other devices
  function startListening() {
    if (!window.fsDb) return;
    _unsubscribeSurveys = window.fsDb.collection('surveys').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (_suppressLocalWrite) return;  // Ignore our own writes

        const remoteSurvey = change.doc.data();
        remoteSurvey.id = change.doc.id;

        // Skip echo from our own recent push (within 5 seconds)
        const lastPush = _lastLocalPushTime[remoteSurvey.id] || 0;
        if (Date.now() - lastPush < 5000) return;

        if (change.type === 'added' || change.type === 'modified') {
          // Check if remote is newer than local
          const localSurvey = await getSurvey(remoteSurvey.id);
          const remoteTime = new Date(remoteSurvey.lastModified || remoteSurvey.createdAt || 0).getTime();
          const localTime = localSurvey
            ? new Date(localSurvey.lastModified || localSurvey.createdAt || 0).getTime()
            : 0;

          if (!localSurvey || remoteTime > localTime) {
            // v2167: regression guard. The remote-newer test relies on
            // lastModified being current. If a local edit (or a manual
            // IndexedDB migration) didn't bump that field, a stale cloud
            // copy can overwrite richer local data. Before replacing,
            // count the data on both sides — if local has substantially
            // MORE saved content, refuse the overwrite and instead push
            // local up so cloud catches up.
            if (localSurvey) {
              const lScore = _scoreSurveyContent(localSurvey);
              const rScore = _scoreSurveyContent(remoteSurvey);
              const localRicher =
                lScore.textChars > rScore.textChars * 1.2 + 50 ||
                lScore.photoCount > rScore.photoCount ||
                lScore.ratedItems > rScore.ratedItems;
              if (localRicher) {
                console.warn(
                  `[Sync] REFUSED overwrite of "${localSurvey.vesselName || localSurvey.id}" — ` +
                  `local is richer (text=${lScore.textChars}ch vs ${rScore.textChars}ch, ` +
                  `photos=${lScore.photoCount} vs ${rScore.photoCount}, ` +
                  `rated=${lScore.ratedItems} vs ${rScore.ratedItems}). ` +
                  `Pushing local to cloud instead.`
                );
                // Push local up to fix the cloud copy. saveSurvey will bump
                // lastModified and trigger pushSurvey via the wrapper.
                await saveSurvey(localSurvey);
                return;
              }
            }

            // Remote is newer AND not a regression — save locally
            // (skip re-syncing to Firebase)
            _suppressLocalWrite = true;
            await saveSurvey(remoteSurvey);
            _suppressLocalWrite = false;
            console.log(`[Sync] Updated local survey: ${remoteSurvey.vesselName || remoteSurvey.id}`);

            // Pull any photos from Storage for this survey
            await pullPhotosForSurvey(remoteSurvey);

            // Refresh UI if we're on the home page or viewing this survey
            if (!currentSurveyId) {
              renderHome();
            } else if (currentSurveyId === remoteSurvey.id) {
              // Show a subtle toast rather than disrupting the current view
              showToast('Survey updated from another device', 2000);
            }
          }
        } else if (change.type === 'removed') {
          const localSurvey = await getSurvey(remoteSurvey.id);
          if (localSurvey) {
            _suppressLocalWrite = true;
            await deleteSurvey(remoteSurvey.id);
            _suppressLocalWrite = false;
            console.log(`[Sync] Deleted local survey: ${remoteSurvey.id}`);
            if (!currentSurveyId) renderHome();
          }
        }
      });
      updateSyncStatusUI('synced', new Date().toLocaleTimeString());
    }, err => {
      console.error('Firestore listener error:', err);
      updateSyncStatusUI('error', err.message);
    });
  }

  // v2167: helper for the regression guard above. Counts content density
  // so we can detect when a remote pull would silently shrink local data.
  function _scoreSurveyContent(survey) {
    let textChars = 0, photoCount = 0, ratedItems = 0;
    if (!survey || !survey.items) return { textChars, photoCount, ratedItems };
    for (const k of Object.keys(survey.items)) {
      const it = survey.items[k] || {};
      if (it.text && typeof it.text === 'string') textChars += it.text.length;
      if (Array.isArray(it.photos)) photoCount += it.photos.length;
      if (it.rating && String(it.rating).trim()) ratedItems += 1;
    }
    return { textChars, photoCount, ratedItems };
  }

  // ── Photo Sync (Firebase Storage) ──────────────────────────────────

  // Upload a photo to Firebase Storage
  async function pushPhoto(photo) {
    if (!_syncEnabled || !window.fsStorage || !photo.dataUrl) return;
    try {
      const ref = window.fsStorage.ref(`photos/${photo.surveyId}/${photo.id}`);
      // Upload the base64 data URL as a blob
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      await ref.put(blob);

      // Store metadata (minus the dataUrl) in Firestore for photo discovery
      const meta = { ...photo };
      delete meta.dataUrl;
      meta.storageRef = `photos/${photo.surveyId}/${photo.id}`;
      await window.fsDb.collection('photos').doc(photo.id).set(meta);
    } catch (err) {
      console.error('Firebase pushPhoto error:', err);
    }
  }

  // Pull all photos for a survey from Firebase Storage into IndexedDB
  async function pullPhotosForSurvey(survey) {
    if (!_syncEnabled || !window.fsDb || !window.fsStorage) return;
    try {
      // Get photo metadata from Firestore
      const snap = await window.fsDb.collection('photos')
        .where('surveyId', '==', survey.id)
        .get();
      for (const doc of snap.docs) {
        const meta = doc.data();
        // Check if we already have this photo locally
        const local = await getPhotoById(meta.id);
        if (local && local.dataUrl) continue;  // Already have it

        // Download from Storage
        if (meta.storageRef) {
          try {
            const ref = window.fsStorage.ref(meta.storageRef);
            const url = await ref.getDownloadURL();
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl = await blobToDataUrl(blob);
            const photo = { ...meta, dataUrl };
            await savePhoto(photo);
            console.log(`[Sync] Downloaded photo: ${meta.id}`);
          } catch (dlErr) {
            console.warn(`[Sync] Could not download photo ${meta.id}:`, dlErr);
          }
        }
      }
    } catch (err) {
      console.error('Firebase pullPhotos error:', err);
    }
  }

  // Remove all photos for a survey from Firebase Storage
  async function removeAllPhotosForSurvey(surveyId) {
    if (!window.fsDb || !window.fsStorage) return;
    try {
      const snap = await window.fsDb.collection('photos')
        .where('surveyId', '==', surveyId)
        .get();
      for (const doc of snap.docs) {
        const meta = doc.data();
        if (meta.storageRef) {
          try { await window.fsStorage.ref(meta.storageRef).delete(); } catch (e) { /* may not exist */ }
        }
        await doc.ref.delete();
      }
    } catch (err) {
      console.error('Firebase removeAllPhotos error:', err);
    }
  }

  // Remove a single photo from Firebase Storage
  async function removePhoto(photoId, surveyId) {
    if (!_syncEnabled || !window.fsDb || !window.fsStorage) return;
    try {
      const ref = window.fsStorage.ref(`photos/${surveyId}/${photoId}`);
      try { await ref.delete(); } catch (e) { /* may not exist */ }
      await window.fsDb.collection('photos').doc(photoId).delete();
    } catch (err) {
      console.error('Firebase removePhoto error:', err);
    }
  }

  // Helper: convert Blob to data URL
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ── Initial Sync (push all local surveys to Firebase on first connect) ─
  async function initialSync() {
    if (!_syncEnabled || !window.fsDb) return;
    updateSyncStatusUI('syncing', 'Initial sync…');
    try {
      const localSurveys = await getAllSurveys();
      const remoteSnap = await window.fsDb.collection('surveys').get();
      const remoteSurveyMap = {};
      remoteSnap.docs.forEach(doc => { remoteSurveyMap[doc.id] = doc.data(); });

      // Push local surveys that are newer or missing from remote
      for (const local of localSurveys) {
        const remote = remoteSurveyMap[local.id];
        const localTime = new Date(local.lastModified || local.createdAt || 0).getTime();
        const remoteTime = remote ? new Date(remote.lastModified || remote.createdAt || 0).getTime() : 0;

        if (!remote || localTime > remoteTime) {
          await pushSurvey(local);
          // Push all photos for this survey
          await pushAllPhotosForSurvey(local);
          console.log(`[Sync] Pushed survey to cloud: ${local.vesselName || local.id}`);
        } else if (remoteTime > localTime) {
          // Remote is newer — pull it
          _suppressLocalWrite = true;
          remote.id = local.id;
          await saveSurvey(remote);
          _suppressLocalWrite = false;
          await pullPhotosForSurvey(remote);
          console.log(`[Sync] Pulled survey from cloud: ${remote.vesselName || remote.id}`);
        }
        delete remoteSurveyMap[local.id];
      }

      // Pull any remote surveys that don't exist locally
      for (const [id, remote] of Object.entries(remoteSurveyMap)) {
        remote.id = id;
        _suppressLocalWrite = true;
        await saveSurvey(remote);
        _suppressLocalWrite = false;
        await pullPhotosForSurvey(remote);
        console.log(`[Sync] Pulled new survey from cloud: ${remote.vesselName || id}`);
      }

      updateSyncStatusUI('synced', 'Initial sync complete');
      renderHome();  // Refresh to show any new surveys
    } catch (err) {
      console.error('Initial sync error:', err);
      updateSyncStatusUI('error', err.message);
    }
  }

  // Push all photos for a given survey to Firebase Storage
  async function pushAllPhotosForSurvey(survey) {
    if (!window.fsStorage) return;
    // Collect all photo IDs from the survey
    const photoIds = new Set();
    // Doc photos
    ['hinPhoto', 'compliancePhoto', 'licencePhoto', 'tcPaperLicencePhoto', 'coverPhoto',
     'enginePhoto', 'enginePlatePhoto', 'transmissionPhoto', 'transmissionPlatePhoto',
     'engine2Photo', 'engine2PlatePhoto', 'transmission2Photo', 'transmission2PlatePhoto',
     'fourCornerPortBow', 'fourCornerStbdBow', 'fourCornerPortStern', 'fourCornerStbdStern'
    ].forEach(key => {
      if (!survey[key]) return;
      if (Array.isArray(survey[key])) {
        survey[key].forEach(id => photoIds.add(id));
      } else {
        photoIds.add(survey[key]);
      }
    });
    // Item photos
    if (survey.items) {
      Object.values(survey.items).forEach(item => {
        if (item.photos) item.photos.forEach(pid => photoIds.add(pid));
      });
    }
    // Safety equipment photos
    if (survey.safetyEquipment) {
      survey.safetyEquipment.forEach(eq => {
        if (eq.photos) eq.photos.forEach(pid => photoIds.add(pid));
      });
    }
    // Instruments & electronics photos
    if (survey.instrumentsElectronics) {
      survey.instrumentsElectronics.forEach(ie => {
        if (ie.photos) ie.photos.forEach(pid => photoIds.add(pid));
      });
    }

    for (const pid of photoIds) {
      const photo = await getPhotoById(pid);
      if (photo && photo.dataUrl) {
        await pushPhoto(photo);
      }
    }
  }

  // ── Public API ─────────────────────────────────────────────────────
  function init() {
    if (!window.fsDb) {
      console.warn('[Sync] Firebase not available — sync disabled');
      return;
    }
    _syncEnabled = true;
    updateSyncStatusUI('syncing', 'Connecting…');
    startListening();
    initialSync();
    console.log('[Sync] Firebase real-time sync enabled');
  }

  // Re-apply current sync status to a freshly rendered DOM element
  function refreshUI() {
    updateSyncStatusUI(_syncStatus, _lastSyncTime);
  }

  function isEnabled() { return _syncEnabled; }

  function isSuppressed() { return _suppressLocalWrite; }

  return {
    init,
    isEnabled,
    isSuppressed,
    pushSurvey,
    removeSurvey,
    pushPhoto,
    removePhoto,
    pullPhotosForSurvey,
    updateSyncStatusUI,
    refreshUI
  };
})();


// ── Hook saveSurvey to also push to Firebase ─────────────────────────────────
const _originalSaveSurvey = saveSurvey;
saveSurvey = async function(survey) {
  // Add lastModified timestamp for sync conflict resolution
  if (!FirebaseSync.isSuppressed()) {
    survey.lastModified = new Date().toISOString();
  }
  const result = await _originalSaveSurvey(survey);
  // Push to Firebase (non-blocking)
  if (FirebaseSync.isEnabled() && !FirebaseSync.isSuppressed()) {
    FirebaseSync.pushSurvey(survey).catch(err => console.error('[Sync] Push failed:', err));
  }
  return result;
};

// ── Hook savePhoto to also push to Firebase Storage ──────────────────────────
const _originalSavePhoto = savePhoto;
savePhoto = async function(photo) {
  const result = await _originalSavePhoto(photo);
  if (FirebaseSync.isEnabled() && !FirebaseSync.isSuppressed()) {
    FirebaseSync.pushPhoto(photo).catch(err => console.error('[Sync] Photo push failed:', err));
  }
  return result;
};

// ── Hook deletePhoto to also remove from Firebase ────────────────────────────
const _originalDeletePhoto = deletePhoto;
deletePhoto = async function(photoId) {
  // Get the photo first to know its surveyId
  const photo = await getPhotoById(photoId);
  const result = await _originalDeletePhoto(photoId);
  if (FirebaseSync.isEnabled() && photo) {
    FirebaseSync.removePhoto(photoId, photo.surveyId).catch(err => console.error('[Sync] Photo delete failed:', err));
  }
  return result;
};

// ── Hook deleteSurvey to also remove from Firebase ───────────────────────────
const _originalDeleteSurvey = deleteSurvey;
deleteSurvey = async function(id) {
  const result = await _originalDeleteSurvey(id);
  if (FirebaseSync.isEnabled() && !FirebaseSync.isSuppressed()) {
    FirebaseSync.removeSurvey(id).catch(err => console.error('[Sync] Survey delete failed:', err));
  }
  return result;
};


// ─────────────────────────────────────────────────────────────────────────────
// Batch Camera (SafetyCulture-style click-click-click capture)
// ─────────────────────────────────────────────────────────────────────────────
// Usage: openBatchCamera(itemLabel, { isArea: false, categoryName: '' })
//
// Flow:
//  1. Opens full-screen overlay with live <video> stream via getUserMedia
//  2. Each shutter tap grabs a frame to a canvas → JPEG dataUrl → staging array
//     (no IndexedDB writes yet)
//  3. Thumbnail strip at bottom shows all staged shots. Tap a thumb to open
//     the full-res editor (reuses showPhotoPreviewModal + bakePhotoEdits)
//  4. "Done" button commits the whole staging array via addDateStampToPhoto
//     + savePhoto in a single pass, then refreshes the item in place
//  5. "X" button discards everything after confirmation
//
// Fallback: if getUserMedia is unavailable or blocked (not HTTPS, no permission),
// the old capturePhoto() multi-file input flow is triggered instead so nothing
// breaks.

window._batchCam = {
  stream: null,
  staged: [],          // [{ id, dataUrl, width, height }]
  itemLabel: '',
  isArea: false,
  categoryName: '',
  editingIndex: -1
};

async function openBatchCamera(itemLabel, opts) {
  opts = opts || {};
  const bc = window._batchCam;
  bc.staged = [];
  bc.itemLabel = itemLabel;
  bc.isArea = !!opts.isArea;
  bc.categoryName = opts.categoryName || '';
  bc.editingIndex = -1;

  // Feature-detect
  const canUseCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!canUseCamera) {
    showToast('Live camera unavailable — using file picker');
    return _batchCameraFallback(itemLabel, opts);
  }

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'batchCamOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(0,0,0,0.55);color:#fff;padding-top:calc(14px + env(safe-area-inset-top));">
      <button id="batchCamClose" style="background:none;border:none;color:#fff;font-size:28px;font-weight:700;cursor:pointer;padding:4px 10px;min-height:44px;">✕</button>
      <div id="batchCamTitle" style="font-size:15px;font-weight:600;text-align:center;flex:1;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${(itemLabel || '').replace(/</g,'&lt;')}</div>
      <div style="width:44px;"></div>
    </div>
    <div style="flex:1 1 auto;position:relative;background:#000;overflow:hidden;">
      <video id="batchCamVideo" playsinline autoplay muted style="width:100%;height:100%;object-fit:cover;background:#000;"></video>
      <div id="batchCamCount" style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.65);color:#fff;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600;">0 photos</div>
    </div>
    <div id="batchCamStrip" style="flex:0 0 auto;background:#111;padding:10px 12px;display:flex;gap:8px;overflow-x:auto;min-height:76px;align-items:center;"></div>
    <div style="flex:0 0 auto;background:#000;display:flex;align-items:center;justify-content:center;gap:40px;padding:20px 0;padding-bottom:calc(20px + env(safe-area-inset-bottom));">
      <button id="batchCamShutter" aria-label="Take photo" style="width:88px;height:88px;border-radius:50%;background:#006699;border:5px solid #f5b942;box-shadow:0 4px 12px rgba(0,0,0,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:38px;padding:0;line-height:1;">📷</button>
      <button id="batchCamDone" aria-label="Done" style="width:88px;height:88px;border-radius:50%;background:#f5b942;color:#006699;border:5px solid #006699;box-shadow:0 4px 12px rgba(0,0,0,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;padding:0;line-height:1;letter-spacing:0.5px;">DONE</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = document.getElementById('batchCamVideo');
  const shutter = document.getElementById('batchCamShutter');
  const closeBtn = document.getElementById('batchCamClose');
  const doneBtn = document.getElementById('batchCamDone');

  shutter.addEventListener('click', snapStagedPhoto);
  closeBtn.addEventListener('click', discardStagedPhotos);
  doneBtn.addEventListener('click', commitStagedPhotos);

  // Start camera
  try {
    setCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    bc.stream = stream;
    video.srcObject = stream;
    await video.play().catch(() => {});
  } catch (err) {
    console.error('getUserMedia failed:', err);
    closeBatchCameraOverlay();
    showToast('Camera blocked — using file picker');
    return _batchCameraFallback(itemLabel, opts);
  }
}

function _batchCameraFallback(itemLabel, opts) {
  // Fall back to existing multi-file picker flow
  if (opts.isArea) {
    // Build a hidden input and hand off to handleAreaPhotoCapture.
    // v2198: set `capture="environment"` so mobile browsers open the
    // rear camera directly instead of a file picker. Users who want to
    // import from library should use the separate "Import photos" button.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.multiple = true;
    input.onchange = () => handleAreaPhotoCapture(itemLabel, input);
    setCameraActive(true);
    input.click();
  } else {
    capturePhoto(itemLabel);
  }
}

function snapStagedPhoto() {
  const bc = window._batchCam;
  const video = document.getElementById('batchCamVideo');
  if (!video || !video.videoWidth) return;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Keep staged copies at native-ish quality — final cap happens on commit.
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  const id = 'staged_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  bc.staged.push({ id, dataUrl, width: canvas.width, height: canvas.height });

  // Haptic-ish visual feedback: flash the shutter
  const sh = document.getElementById('batchCamShutter');
  if (sh) {
    sh.style.background = '#ef4444';
    setTimeout(() => { sh.style.background = '#fff'; }, 110);
  }
  refreshBatchCamStrip();
}

function refreshBatchCamStrip() {
  const bc = window._batchCam;
  const strip = document.getElementById('batchCamStrip');
  const count = document.getElementById('batchCamCount');
  if (!strip || !count) return;

  count.textContent = bc.staged.length + ' photo' + (bc.staged.length === 1 ? '' : 's');

  if (bc.staged.length === 0) {
    strip.innerHTML = '<div style="color:#666;font-size:13px;padding:0 8px;">Tap the shutter to capture photos</div>';
    return;
  }

  strip.innerHTML = bc.staged.map((p, i) => `
    <div style="position:relative;flex:0 0 auto;">
      <img src="${p.dataUrl}" onclick="editStagedPhoto(${i})"
           style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:2px solid #333;cursor:pointer;">
      <button onclick="event.stopPropagation();removeStagedPhoto(${i})"
              aria-label="Remove"
              style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:#dc2626;color:#fff;border:2px solid #111;font-size:12px;font-weight:700;cursor:pointer;padding:0;line-height:18px;">×</button>
    </div>
  `).join('');
  // Scroll strip to show the latest
  strip.scrollLeft = strip.scrollWidth;
}

function removeStagedPhoto(index) {
  const bc = window._batchCam;
  if (index < 0 || index >= bc.staged.length) return;
  bc.staged.splice(index, 1);
  refreshBatchCamStrip();
}

function editStagedPhoto(index) {
  const bc = window._batchCam;
  if (index < 0 || index >= bc.staged.length) return;
  bc.editingIndex = index;
  const staged = bc.staged[index];

  // Reuse the existing preview/edit modal. Use a sentinel fieldKey so the
  // default confirm handler's "save to survey" path never runs — we intercept
  // the confirm button after the modal renders and write back to the staged
  // array instead.
  const fieldKey = '_batchstaged_' + staged.id;
  showPhotoPreviewModal(fieldKey, bc.itemLabel, staged.dataUrl, 'image/jpeg');

  setTimeout(() => {
    const modal = document.getElementById('photoPreviewModal');
    if (!modal) return;
    const confirmBtn = modal.querySelector('.btn-primary');
    if (!confirmBtn) return;
    confirmBtn.textContent = 'Apply';
    confirmBtn.onclick = async () => {
      const data = window._pendingPhotoData;
      if (!data) { closePhotoPreviewModal(); return; }
      const finalDataUrl = await bakePhotoEdits(
        data.stampedDataUrl,
        data.brightness || 100,
        data.contrast || 100,
        data.rotation || 0
      );
      const bc2 = window._batchCam;
      if (bc2.editingIndex >= 0 && bc2.editingIndex < bc2.staged.length) {
        bc2.staged[bc2.editingIndex].dataUrl = finalDataUrl;
      }
      bc2.editingIndex = -1;
      window._pendingPhotoData = null;
      closePhotoPreviewModal();
      refreshBatchCamStrip();
    };
  }, 80);
}

async function commitStagedPhotos() {
  const bc = window._batchCam;
  if (bc.staged.length === 0) {
    closeBatchCameraOverlay();
    return;
  }

  const n = bc.staged.length;
  showToast('Saving ' + n + ' photo' + (n === 1 ? '' : 's') + '...');

  // Disable buttons while committing
  const doneBtn = document.getElementById('batchCamDone');
  const shutter = document.getElementById('batchCamShutter');
  if (doneBtn) { doneBtn.disabled = true; doneBtn.style.opacity = '0.6'; }
  if (shutter) { shutter.disabled = true; shutter.style.opacity = '0.5'; }

  const survey = await getSurvey(currentSurveyId);
  if (!survey) {
    closeBatchCameraOverlay();
    return;
  }
  if (!survey.items[bc.itemLabel]) {
    survey.items[bc.itemLabel] = { rating: '', text: '', standards: [], photos: [] };
  }
  if (!Array.isArray(survey.items[bc.itemLabel].photos)) {
    survey.items[bc.itemLabel].photos = [];
  }

  // Snapshot the staged list before we start awaiting, then clear it so any
  // late shutter taps during the commit don't sneak in.
  const toCommit = bc.staged.slice();
  bc.staged = [];

  for (let i = 0; i < toCommit.length; i++) {
    try {
      const stamped = await addDateStampToPhoto(toCommit[i].dataUrl, 2048);
      const photoId = currentSurveyId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const photo = {
        id: photoId,
        surveyId: currentSurveyId,
        itemLabel: bc.itemLabel,
        dataUrl: stamped,
        annotated: false,
        createdAt: new Date().toISOString()
      };
      await savePhoto(photo);
      survey.items[bc.itemLabel].photos.push(photoId);
    } catch (err) {
      console.error('Failed to commit staged photo', i, err);
    }
  }

  await saveSurvey(survey);

  closeBatchCameraOverlay();

  // Refresh whichever UI this came from
  if (bc.isArea) {
    refreshAreaPhotoGrid(survey, bc.itemLabel);
  } else {
    updateItemInPlace(survey, bc.itemLabel);
  }
  forceViewportRecalc();
  showToast(n + ' photo' + (n === 1 ? '' : 's') + ' saved');
}

function discardStagedPhotos() {
  const bc = window._batchCam;
  if (bc.staged.length > 0) {
    const msg = 'Discard ' + bc.staged.length + ' photo' + (bc.staged.length === 1 ? '' : 's') + '?';
    if (!confirm(msg)) return;
  }
  bc.staged = [];
  closeBatchCameraOverlay();
}

function closeBatchCameraOverlay() {
  const bc = window._batchCam;
  try {
    if (bc.stream) {
      bc.stream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
    }
  } catch(e){}
  bc.stream = null;
  const overlay = document.getElementById('batchCamOverlay');
  if (overlay) overlay.remove();
  setCameraActive(false);
}

// Expose for inline onclick handlers
window.openBatchCamera = openBatchCamera;
window.snapStagedPhoto = snapStagedPhoto;
window.editStagedPhoto = editStagedPhoto;
window.removeStagedPhoto = removeStagedPhoto;
window.commitStagedPhotos = commitStagedPhotos;
window.discardStagedPhotos = discardStagedPhotos;


// Start app when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
