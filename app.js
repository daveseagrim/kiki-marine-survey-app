/**
 * Kiki Marine Survey App - Complete Implementation
 * All data persisted to IndexedDB
 * Service worker for offline support
 * Photo storage and annotation capabilities
 */

const APP_VERSION = 'v2021';

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

// Force update — unregister service worker, clear caches, reload.
// Works from inside the PWA's own WebKit container on iOS.
async function forceAppUpdate() {
  try {
    showToast('Updating app…');
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
    // Reload with cache bypass
    window.location.reload(true);
  } catch (err) {
    console.error('Force update error:', err);
    window.location.reload(true);
  }
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
const COMPONENT_BUILDERS = {
  'Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows': {
    title: 'Outdrive Condition Builder',
    intro: 'The outdrive unit was visually inspected.',
    components: [
      {
        name: 'Housing',
        key: 'housing',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'No damage or corrosion', rating: 'C', fragment: 'The drive housing was free of impact damage and corrosion.' },
          { label: 'Minor surface corrosion', rating: 'C', fragment: 'The drive housing showed minor surface corrosion consistent with normal use.' },
          { label: 'Moderate corrosion', rating: 'B', fragment: 'The drive housing showed moderate corrosion that should be addressed.' },
          { label: 'Impact damage', rating: 'B', fragment: 'The drive housing showed impact damage that should be assessed and repaired.' },
          { label: 'Severe corrosion or damage', rating: 'A', fragment: 'The drive housing exhibited severe corrosion or impact damage requiring immediate attention.' }
        ]
      },
      {
        name: 'Bellows',
        key: 'bellows',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Pliable, no cracking', rating: 'C', fragment: 'The bellows were pliable with no cracking or deterioration.' },
          { label: 'Beginning to harden', rating: 'B', fragment: 'The bellows were beginning to harden and should be replaced at the next service. Bellows failure is a common cause of sinking in sterndrive vessels.' },
          { label: 'Cracked or deteriorated', rating: 'A', fragment: 'The bellows were cracked or deteriorated. Per ABYC P-6 and ABYC H-27, drive bellows must be watertight as they are below the waterline when the drive is lowered. Cracked bellows are a sinking hazard and must be replaced before the vessel is launched.' }
        ]
      },
      {
        name: 'Anode — drive housing',
        key: 'anodeDriveHousing',
        quantityPrompt: 'How many?',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Not present on this vessel', rating: null, fragment: '' },
          { label: 'New or recently replaced', rating: 'C', fragment: 'The drive housing anode appeared new or recently replaced.' },
          { label: 'Adequate (>50% remaining)', rating: 'C', fragment: 'The drive housing anode had adequate material remaining.' },
          { label: 'Depleted (<50% remaining)', rating: 'B', fragment: 'The drive housing anode was more than 50% depleted. Per ABYC E-2, sacrificial anodes should be replaced when approximately 50% consumed.' },
          { label: 'Severely depleted or missing', rating: 'A', fragment: 'The drive housing anode was severely depleted or missing. Per ABYC E-2, a new anode must be installed before the vessel is placed in the water.' }
        ]
      },
      {
        name: 'Anode — cavitation plate',
        key: 'anodeCavitationPlate',
        quantityPrompt: 'How many?',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Not present on this vessel', rating: null, fragment: '' },
          { label: 'New or recently replaced', rating: 'C', fragment: 'The cavitation plate anode appeared new or recently replaced.' },
          { label: 'Adequate (>50% remaining)', rating: 'C', fragment: 'The cavitation plate anode had adequate material remaining.' },
          { label: 'Depleted (<50% remaining)', rating: 'B', fragment: 'The cavitation plate anode was more than 50% depleted. Per ABYC E-2, sacrificial anodes should be replaced when approximately 50% consumed.' },
          { label: 'Severely depleted or missing', rating: 'A', fragment: 'The cavitation plate anode was severely depleted or missing. Per ABYC E-2, a new anode must be installed before the vessel is placed in the water.' }
        ]
      },
      {
        name: 'Anode — trim tab',
        key: 'anodeTrimTab',
        quantityPrompt: 'How many?',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Not present on this vessel', rating: null, fragment: '' },
          { label: 'New or recently replaced', rating: 'C', fragment: 'The trim tab anode appeared new or recently replaced.' },
          { label: 'Adequate (>50% remaining)', rating: 'C', fragment: 'The trim tab anode had adequate material remaining.' },
          { label: 'Depleted (<50% remaining)', rating: 'B', fragment: 'The trim tab anode was more than 50% depleted. Per ABYC E-2, sacrificial anodes should be replaced when approximately 50% consumed.' },
          { label: 'Severely depleted or missing', rating: 'A', fragment: 'The trim tab anode was severely depleted or missing. Per ABYC E-2, a new anode must be installed before the vessel is placed in the water.' }
        ]
      },
      {
        name: 'Propeller',
        key: 'propeller',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good condition, secure', rating: 'C', fragment: 'The propeller was in good condition and secure on the shaft.' },
          { label: 'Minor surface corrosion', rating: 'C', fragment: 'The propeller showed minor surface corrosion consistent with normal use — not a concern at the current level.' },
          { label: 'Minor blade damage or erosion', rating: 'B', fragment: 'The propeller showed minor blade damage or edge erosion. It should be removed and reconditioned by a propeller shop.' },
          { label: 'Significant damage', rating: 'A', fragment: 'The propeller exhibited significant blade damage. A damaged propeller will cause severe vibration that can damage the shaft, bearings, and transmission. It must be reconditioned or replaced.' }
        ]
      },
      {
        name: 'Paint',
        key: 'paint',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Intact', rating: 'C', fragment: 'The paint on the drive housing was intact.' },
          { label: 'Peeling or deteriorated', rating: 'B', fragment: 'The paint on the drive housing was peeling or deteriorated and should be stripped and repainted to prevent corrosion.' },
          { label: 'Bare metal exposed', rating: 'B', fragment: 'The paint on the drive housing had failed with bare metal exposed, accelerating corrosion. The drive should be stripped and repainted.' }
        ]
      },
      {
        name: 'Oil Seals',
        key: 'oilSeals',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'No leaks', rating: 'C', fragment: 'No oil leaks were observed.' },
          { label: 'Minor weep', rating: 'B', fragment: 'A minor oil weep was visible at the lower seal. The seals should be inspected and serviced.' },
          { label: 'Active leak', rating: 'A', fragment: 'Oil was actively leaking from the lower unit. The seals must be replaced before the vessel is operated.' }
        ]
      },
      {
        name: 'Tilt / Trim',
        key: 'tiltTrim',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Smooth operation', rating: 'C', fragment: 'The drive tilted and trimmed smoothly.' },
          { label: 'Stiff or slow', rating: 'B', fragment: 'The tilt/trim operation was stiff or slow and should be serviced.' },
          { label: 'Inoperable', rating: 'A', fragment: 'The tilt/trim system was inoperable. The hydraulic system must be inspected and repaired.' }
        ]
      },
      {
        name: 'Gimbal Bearing',
        key: 'gimbalBearing',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'No issues', rating: 'C', fragment: '' },
          { label: 'Stiff or noisy', rating: 'B', fragment: 'The gimbal bearing was stiff or noisy and should be inspected and greased or replaced.' },
          { label: 'Frozen or seized', rating: 'A', fragment: 'The gimbal bearing was frozen. A seized gimbal bearing must be replaced before the vessel is operated.' }
        ]
      }
    ]
  },
  'Primer, barrier coat, anti-fouling': {
    title: 'Anti-fouling Condition Builder',
    intro: 'The bottom paint system was inspected.',
    components: [
      {
        name: 'Anti-fouling Coverage',
        key: 'coverage',
        options: [
          { label: 'Recently applied, good condition', rating: 'C', fragment: 'The anti-fouling coat appeared recently applied and was in good condition with consistent coverage.' },
          { label: 'Adequate, normal wear', rating: 'C', fragment: 'The anti-fouling paint was present and provided adequate coverage, showing normal wear consistent with use.' },
          { label: 'Significant wear, thinning', rating: 'B', fragment: 'The anti-fouling paint showed significant wear and thinning in several areas.' },
          { label: 'Excessive coats, chipping/flaking', rating: 'B', fragment: 'The hull had excessive coats of anti-fouling paint that were chipping and flaking. The hull should be sanded until all loose and failing anti-fouling is removed.' },
          { label: 'Failed — bare gelcoat exposed', rating: 'A', fragment: 'The anti-fouling system had failed extensively with large areas of bare gelcoat exposed and no protective coating remaining.' }
        ]
      },
      {
        name: 'Barrier Coat',
        key: 'barrierCoat',
        options: [
          { label: 'Intact', rating: 'C', fragment: 'The barrier coat was intact where visible.' },
          { label: 'Exposed in places', rating: 'B', fragment: 'The epoxy barrier coat was exposed in several areas where the anti-fouling had separated. The barrier coat should be inspected and repaired as necessary before fresh anti-fouling is applied.' },
          { label: 'Crazing, chalking, or peeling', rating: 'B', fragment: 'The barrier coat showed crazing, chalking, or peeling. It should be stripped, the gelcoat inspected, and a new barrier coat system applied before bottom painting.' },
          { label: 'Failed or missing', rating: 'A', fragment: 'The barrier coat had failed or was missing in large areas. The hull must be stripped, dried, inspected for osmotic damage, and a proper epoxy barrier coat applied before launching.' }
        ]
      },
      {
        name: 'Rudder Anti-fouling',
        key: 'rudderAF',
        options: [
          { label: 'Same condition as hull', rating: 'C', fragment: '' },
          { label: 'Chipping, needs sanding', rating: 'B', fragment: 'The rudder anti-fouling was also chipping and should be sanded and repainted in the same manner as the hull.' },
          { label: 'Barrier coat exposed on rudder', rating: 'B', fragment: 'The rudder barrier coat was exposed in places. The rudder should be sanded, the barrier coat repaired, and fresh anti-fouling applied.' },
          { label: 'Not applicable', rating: 'C', fragment: '' }
        ]
      }
    ]
  },
  'Sail drive(s) - (external), corrosion, propeller(s), anode(s)': {
    title: 'Sail Drive Condition Builder',
    intro: 'The sail drive unit was visually inspected.',
    components: [
      {
        name: 'Housing',
        key: 'housing',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Intact, no damage', rating: 'C', fragment: 'The housing was intact with no cracking, corrosion, or impact damage.' },
          { label: 'Minor surface corrosion', rating: 'B', fragment: 'The housing showed minor surface corrosion that should be monitored.' },
          { label: 'Significant corrosion or cracking', rating: 'A', fragment: 'The housing exhibited significant corrosion or cracking.' }
        ]
      },
      {
        name: 'Paint',
        key: 'paint',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Intact', rating: 'C', fragment: 'The paint on the drive housing was intact with no peeling or deterioration.' },
          { label: 'Peeling or deteriorated', rating: 'B', fragment: 'The paint on the drive housing was peeling or deteriorated and should be stripped and repainted.' }
        ]
      },
      {
        name: 'Hull Seal',
        key: 'hullSeal',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Secure, no leakage', rating: 'C', fragment: 'The seal at the hull penetration was secure with no leakage.' },
          { label: 'Minor weeping', rating: 'B', fragment: 'Minor weeping was observed at the hull seal. The seal should be monitored. Sail drive seals typically require replacement every 5–7 years per manufacturer guidelines.' },
          { label: 'Leaking or failed', rating: 'A', fragment: 'The hull seal was leaking or had failed. A sail drive hull penetration that leaks is a direct flooding hazard. The drive must be removed and the seal replaced before the vessel is launched.' }
        ]
      },
      {
        name: 'Anode',
        key: 'anode',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'New or recently replaced', rating: 'C', fragment: 'The drive anode appeared new or recently replaced.' },
          { label: 'Adequate (>50% remaining)', rating: 'C', fragment: 'The drive anode had adequate material remaining.' },
          { label: 'Depleted (<50% remaining)', rating: 'B', fragment: 'The drive anode was more than 50% depleted. Per ABYC E-2, sacrificial anodes should be replaced when approximately 50% consumed.' },
          { label: 'Missing', rating: 'A', fragment: 'The drive anode was missing. Per ABYC E-2, sacrificial anodes must be maintained.' }
        ]
      },
      {
        name: 'Propeller',
        key: 'propeller',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good condition, secure', rating: 'C', fragment: 'The propeller was secure and in good condition.' },
          { label: 'Minor corrosion', rating: 'C', fragment: 'The propeller showed minor surface corrosion consistent with normal use.' },
          { label: 'Blade damage', rating: 'B', fragment: 'The propeller showed blade damage and should be reconditioned.' },
          { label: 'Significant damage', rating: 'A', fragment: 'The propeller exhibited significant damage and must be reconditioned or replaced.' }
        ]
      }
    ]
  },
  'Bow thruster': {
    title: 'Bow Thruster Condition Builder',
    intro: 'The bow thruster was inspected.',
    components: [
      {
        name: 'Operation',
        key: 'operation',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Tested — smooth, both directions', rating: 'C', fragment: 'The unit operated smoothly in both port and starboard directions with adequate thrust.' },
          { label: 'Tested — reduced thrust or noisy', rating: 'B', fragment: 'The unit operated but with reduced thrust or was noisy during operation. It should be serviced and tested under load during the limited trial run.' },
          { label: 'On land — motor runs both directions', rating: 'NT', fragment: 'The motor was powered up and operated in both directions. As the vessel was on land, thrust output could not be verified. The thruster should be tested under load during the limited trial run.' },
          { label: 'Did not operate', rating: 'A', fragment: 'The unit did not operate. Depending on the vessel\'s docking requirements, a non-functional bow thruster may constitute a safety concern in confined marina situations. The unit must be repaired or replaced.' },
          { label: 'Not tested', rating: 'NT', fragment: 'The bow thruster was not tested as the controls were not accessible or the unit was winterized. It should be tested under load during the limited trial run.' }
        ]
      },
      {
        name: 'Tunnel & Propeller',
        key: 'tunnel',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Clean, undamaged', rating: 'C', fragment: 'The thruster tunnel was clean and the propeller was intact with no damage.' },
          { label: 'Fouling or corrosion', rating: 'B', fragment: 'The thruster tunnel showed fouling or corrosion at the opening that should be cleaned.' },
          { label: 'Cracked tunnel or seized prop', rating: 'A', fragment: 'The thruster tunnel was cracked or the propeller was seized. The unit must be repaired.' }
        ]
      },
      {
        name: 'Anode',
        key: 'anode',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Serviceable', rating: 'C', fragment: 'The anode was in serviceable condition.' },
          { label: 'Depleted', rating: 'B', fragment: 'The thruster anode was depleted and should be replaced.' },
          { label: 'Missing', rating: 'A', fragment: 'The thruster anode was missing. A new anode must be installed.' }
        ]
      },
      {
        name: 'Gear Oil',
        key: 'gearOil',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'OK or N/A', rating: 'C', fragment: '' },
          { label: 'Discoloured — needs changing', rating: 'B', fragment: 'The gear oil appeared discoloured and should be changed.' }
        ]
      }
    ]
  },
  'Stern thruster': {
    title: 'Stern Thruster Condition Builder',
    intro: 'The stern thruster was inspected.',
    components: [
      {
        name: 'Operation',
        key: 'operation',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Tested — smooth, both directions', rating: 'C', fragment: 'The unit operated smoothly in both port and starboard directions.' },
          { label: 'Tested — reduced thrust or noisy', rating: 'B', fragment: 'The unit operated but with reduced thrust or was noisy. It should be serviced.' },
          { label: 'On land — motor runs both directions', rating: 'NT', fragment: 'The motor was powered up and operated in both directions. As the vessel was on land, thrust output could not be verified. The thruster should be tested under load during the limited trial run.' },
          { label: 'Did not operate', rating: 'A', fragment: 'The unit did not operate and must be repaired or replaced.' },
          { label: 'Not tested', rating: 'NT', fragment: 'The stern thruster was not tested. It should be tested under load during the limited trial run.' }
        ]
      },
      {
        name: 'Tunnel & Propeller',
        key: 'tunnel',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good condition', rating: 'C', fragment: 'The tunnel and propeller were in good condition.' },
          { label: 'Fouling or corrosion', rating: 'B', fragment: 'The tunnel showed fouling or corrosion that should be cleaned.' },
          { label: 'Cracked or seized', rating: 'A', fragment: 'The tunnel was cracked or the propeller was seized. Repairs are required.' }
        ]
      },
      {
        name: 'Anode',
        key: 'anode',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Serviceable', rating: 'C', fragment: 'The anode was serviceable.' },
          { label: 'Depleted', rating: 'B', fragment: 'The anode was depleted and should be replaced.' },
          { label: 'Missing', rating: 'A', fragment: 'The anode was missing and must be replaced.' }
        ]
      }
    ]
  },
  'IPS pod drive(s)': {
    title: 'IPS Pod Drive Condition Builder',
    intro: 'The IPS pod drive unit was visually inspected.',
    components: [
      {
        name: 'Pod Housing / Leg',
        key: 'housing',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'No damage or corrosion', rating: 'C', fragment: 'The pod housing was free of impact damage and corrosion.' },
          { label: 'Minor surface corrosion', rating: 'C', fragment: 'The pod housing showed minor surface corrosion consistent with normal use.' },
          { label: 'Moderate corrosion', rating: 'B', fragment: 'The pod housing showed moderate corrosion that should be addressed at the next service.' },
          { label: 'Impact damage', rating: 'B', fragment: 'The pod housing showed impact damage that should be assessed and repaired by an authorised Volvo Penta dealer.' },
          { label: 'Severe corrosion or damage', rating: 'A', fragment: 'The pod housing exhibited severe corrosion or impact damage requiring immediate attention from an authorised dealer.' }
        ]
      },
      {
        name: 'Propellers (counter-rotating pair)',
        key: 'propellers',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good condition, secure', rating: 'C', fragment: 'The counter-rotating propellers were in good condition and secure.' },
          { label: 'Minor edge erosion', rating: 'B', fragment: 'The propellers showed minor edge erosion. They should be removed and reconditioned by a propeller shop.' },
          { label: 'Significant damage', rating: 'A', fragment: 'The propellers exhibited significant blade damage. Damaged propellers will cause vibration that can damage the drive and transmission. They must be reconditioned or replaced.' }
        ]
      },
      {
        name: 'Anode — pod housing',
        key: 'anodePodHousing',
        quantityPrompt: 'How many?',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Not present on this vessel', rating: null, fragment: '' },
          { label: 'New or recently replaced', rating: 'C', fragment: 'The pod housing anode appeared new or recently replaced.' },
          { label: 'Adequate (>50% remaining)', rating: 'C', fragment: 'The pod housing anode had adequate material remaining.' },
          { label: 'Depleted (<50% remaining)', rating: 'B', fragment: 'The pod housing anode was more than 50% depleted. Per ABYC E-2, sacrificial anodes should be replaced when approximately 50% consumed.' },
          { label: 'Severely depleted or missing', rating: 'A', fragment: 'The pod housing anode was severely depleted or missing. Per ABYC E-2, a new anode must be installed before the vessel is placed in the water.' }
        ]
      },
      {
        name: 'Anode — cavitation plate',
        key: 'anodeCavitationPlate',
        quantityPrompt: 'How many?',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Not present on this vessel', rating: null, fragment: '' },
          { label: 'New or recently replaced', rating: 'C', fragment: 'The cavitation plate anode appeared new or recently replaced.' },
          { label: 'Adequate (>50% remaining)', rating: 'C', fragment: 'The cavitation plate anode had adequate material remaining.' },
          { label: 'Depleted (<50% remaining)', rating: 'B', fragment: 'The cavitation plate anode was more than 50% depleted. Per ABYC E-2, sacrificial anodes should be replaced when approximately 50% consumed.' },
          { label: 'Severely depleted or missing', rating: 'A', fragment: 'The cavitation plate anode was severely depleted or missing. Per ABYC E-2, a new anode must be installed before the vessel is placed in the water.' }
        ]
      },
      {
        name: 'Hull Seal / Penetration',
        key: 'hullSeal',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Secure, no leakage', rating: 'C', fragment: 'The seal at the hull penetration was secure with no leakage.' },
          { label: 'Minor weeping', rating: 'B', fragment: 'Minor weeping was observed at the hull seal. The seal should be inspected and monitored.' },
          { label: 'Leaking or failed', rating: 'A', fragment: 'The hull seal was leaking or had failed. An IPS hull penetration that leaks is a direct flooding hazard. The drive must be serviced and the seal replaced by an authorised dealer before the vessel is launched.' }
        ]
      },
      {
        name: 'Steering Actuators',
        key: 'steering',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Smooth operation', rating: 'C', fragment: 'The pod steering actuators operated smoothly through full range.' },
          { label: 'Stiff or binding', rating: 'B', fragment: 'The steering actuators were stiff or binding. They should be serviced by an authorised dealer.' },
          { label: 'Inoperable', rating: 'A', fragment: 'The steering actuators were inoperable. IPS steering is integral to the drive system and must be repaired before the vessel is operated.' }
        ]
      },
      {
        name: 'Paint / Anti-fouling',
        key: 'paint',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Intact', rating: 'C', fragment: 'The paint on the pod was intact.' },
          { label: 'Peeling or deteriorated', rating: 'B', fragment: 'The paint on the pod was peeling or deteriorated and should be stripped and repainted per manufacturer specifications.' },
          { label: 'Bare metal exposed', rating: 'B', fragment: 'The paint on the pod had failed with bare metal exposed, accelerating corrosion. The pod should be stripped and repainted per Volvo Penta specifications.' }
        ]
      }
    ]
  },
  'Engine, general condition/impression': {
    title: 'Engine Condition Builder',
    intro: 'The engine and engine space were visually inspected.',
    components: [
      {
        name: 'Overall Appearance',
        key: 'appearance',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Clean and well-maintained', rating: 'C', fragment: 'The engine appeared clean and well-maintained with no signs of neglect.' },
          { label: 'Normal wear for age', rating: 'C', fragment: 'The engine showed normal wear consistent with age and use.' },
          { label: 'Dirty but serviceable', rating: 'B', fragment: 'The engine was dirty with accumulated grime, indicating deferred maintenance. A thorough cleaning and service is recommended.' },
          { label: 'Poorly maintained', rating: 'A', fragment: 'The engine showed signs of poor maintenance and neglect. A comprehensive service by a qualified marine mechanic is required.' }
        ]
      },
      {
        name: 'Fluid Leaks',
        key: 'leaks',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'None observed', rating: 'C', fragment: 'No fluid leaks were observed.' },
          { label: 'Minor oil weep', rating: 'B', fragment: 'A minor oil weep was observed. This should be monitored and the source identified during the next service.' },
          { label: 'Active oil leak', rating: 'A', fragment: 'An active oil leak was observed. The source must be identified and repaired to prevent loss of lubricant and potential fire hazard per ABYC P-1.' },
          { label: 'Coolant leak', rating: 'A', fragment: 'A coolant leak was observed. The source must be identified and repaired to prevent overheating and potential engine damage.' },
          { label: 'Multiple leaks', rating: 'A', fragment: 'Multiple fluid leaks (oil and/or coolant) were observed. A full service and repair of all leak sources is required.' }
        ]
      },
      {
        name: 'Corrosion',
        key: 'corrosion',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Minimal or none', rating: 'C', fragment: '' },
          { label: 'Surface rust on fittings', rating: 'B', fragment: 'Surface rust was noted on some fittings and fasteners. These should be treated or replaced during the next service.' },
          { label: 'Significant corrosion', rating: 'A', fragment: 'Significant corrosion was present on the engine and surrounding fittings. The engine space environment should be assessed and all corroded components replaced.' }
        ]
      },
      {
        name: 'Wiring',
        key: 'wiring',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good condition', rating: 'C', fragment: 'Engine wiring and connections appeared in good condition.' },
          { label: 'Minor corrosion at terminals', rating: 'B', fragment: 'Minor corrosion was noted at some wiring terminals. Per ABYC E-11, all connections should be clean and tight. The terminals should be cleaned and treated with a corrosion inhibitor.' },
          { label: 'Deteriorated or jury-rigged', rating: 'A', fragment: 'Engine wiring was deteriorated or showed signs of improper modifications. Per ABYC E-11, all wiring must be marine-grade and properly terminated. The engine wiring must be assessed and brought to standard.' }
        ]
      },
      {
        name: 'Engine Space',
        key: 'engineSpace',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Clean, well-organised', rating: 'C', fragment: 'The engine space was clean and well-organised with adequate access for service.' },
          { label: 'Cluttered but accessible', rating: 'C', fragment: 'The engine space was somewhat cluttered but the engine remained accessible for routine service.' },
          { label: 'Dirty, oil in bilge', rating: 'B', fragment: 'The engine space was dirty with oil residue in the bilge. The bilge should be cleaned and degreased, and the source of any oil identified.' },
          { label: 'Poor access, safety concern', rating: 'A', fragment: 'Access to the engine for service was severely restricted. Adequate engine access is required for safe operation and emergency situations.' }
        ]
      }
    ]
  },
  'Generator (if installed)': {
    title: 'Generator Condition Builder',
    intro: 'The generator was visually inspected.',
    components: [
      {
        name: 'Overall Condition',
        key: 'condition',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Clean, well-maintained', rating: 'C', fragment: 'The generator appeared clean and well-maintained.' },
          { label: 'Normal wear for age', rating: 'C', fragment: 'The generator showed normal wear consistent with age and use.' },
          { label: 'Dirty, needs service', rating: 'B', fragment: 'The generator was dirty with accumulated grime, indicating deferred maintenance. A full service is recommended.' },
          { label: 'Poorly maintained', rating: 'A', fragment: 'The generator showed signs of poor maintenance and neglect requiring immediate service.' }
        ]
      },
      {
        name: 'Operation',
        key: 'operation',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Started and ran smoothly', rating: 'C', fragment: 'The generator started promptly and ran smoothly under load.' },
          { label: 'Ran rough or with smoke', rating: 'B', fragment: 'The generator ran rough or produced excessive smoke. It should be serviced and load-tested by a qualified technician.' },
          { label: 'Would not start', rating: 'A', fragment: 'The generator would not start. It must be repaired and load-tested by a qualified technician.' },
          { label: 'Not tested — winterized', rating: 'NT', fragment: 'The generator was not tested as the vessel was winterized. It should be commissioned and load-tested during spring service.' },
          { label: 'Not tested — other reason', rating: 'NT', fragment: 'The generator was not tested at the time of survey. It should be load-tested before the vessel is used.' }
        ]
      },
      {
        name: 'Fluid Leaks',
        key: 'leaks',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'None observed', rating: 'C', fragment: 'No fluid leaks were observed.' },
          { label: 'Minor oil weep', rating: 'B', fragment: 'A minor oil weep was noted. The source should be identified and monitored.' },
          { label: 'Active leak', rating: 'A', fragment: 'An active fluid leak was observed. The source must be identified and repaired.' }
        ]
      },
      {
        name: 'Exhaust System',
        key: 'exhaust',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good condition', rating: 'C', fragment: 'The generator exhaust system was in good condition with no leaks.' },
          { label: 'Rust or deterioration', rating: 'B', fragment: 'The generator exhaust showed rust or deterioration. Per ABYC P-1, the exhaust system must be gas-tight. It should be inspected and repaired.' },
          { label: 'Leaking or failed', rating: 'A', fragment: 'The generator exhaust was leaking. Per ABYC P-1, exhaust leaks are a carbon monoxide hazard and must be repaired immediately.' }
        ]
      },
      {
        name: 'Sound Shield',
        key: 'soundShield',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Intact', rating: 'C', fragment: '' },
          { label: 'Damaged or missing panels', rating: 'B', fragment: 'The generator sound shield was damaged or had missing panels. The shield should be repaired or replaced to reduce noise and contain heat.' }
        ]
      }
    ]
  }
};

// Rating priority for component builder: worst rating wins
const RATING_PRIORITY = { 'A': 3, 'B': 2, 'NT': 1, 'C': 0 };
const RATING_PRIORITY_REVERSE = { 3: 'A - Critical', 2: 'B - Needs Attention', 1: 'Not tested/not verified', 0: 'C - Serviceable' };

// Build finding text from component builder selections
function buildComponentFindings(builderKey, selections) {
  const builder = COMPONENT_BUILDERS[builderKey];
  if (!builder) return { text: '', rating: '' };

  const fragments = [builder.intro];
  let worstRating = 0;

  for (const comp of builder.components) {
    const sel = selections[comp.key];
    if (sel === undefined || sel === null || sel === '') continue;

    const option = comp.options[parseInt(sel)];
    if (!option) continue;

    // rating: null means "Not inspected" — skip this component entirely
    if (option.rating === null) continue;

    let fragment = option.fragment;
    if (!fragment) continue; // empty fragment = skip (e.g. "No issues" or "Same condition")

    // Replace quantity/location placeholders if present
    if (fragment.includes('{qty}')) {
      const qty = selections[comp.key + '_qty'] || '?';
      fragment = fragment.replace('{qty}', qty);
    }
    if (fragment.includes('{location}')) {
      const loc = selections[comp.key + '_location'] || '?';
      fragment = fragment.replace('{location}', loc);
    }

    fragments.push(fragment);

    const ratingVal = RATING_PRIORITY[option.rating] || 0;
    if (ratingVal > worstRating) worstRating = ratingVal;
  }

  // Deduplicate "Per ABYC X-Y, ..." clauses — keep only the first mention of each standard
  const mentionedStandards = new Set();
  const dedupedFragments = fragments.map(frag => {
    return frag.replace(/Per (ABYC [A-Z]+-\d+),\s*[^.]+\./g, (match, stdCode) => {
      if (mentionedStandards.has(stdCode)) {
        return ''; // Strip duplicate standard reference
      }
      mentionedStandards.add(stdCode);
      return match;
    }).replace(/\s{2,}/g, ' ').trim();
  });

  // Map worst rating back to display label
  const ratingLabel = RATING_PRIORITY_REVERSE[worstRating] || 'C';

  return {
    text: dedupedFragments.join(' '),
    rating: ratingLabel
  };
}

// Render the component builder HTML for the bottom sheet
function renderComponentBuilder(builderKey, itemLabel, savedSelections, categoryName) {
  const builder = COMPONENT_BUILDERS[builderKey];
  if (!builder) return '';

  const safeLabel = itemLabel.replace(/'/g, "\\'");
  const selections = savedSelections || {};

  let html = `
    <div id="component-builder-panel" style="border-bottom:2px solid #1e3a5f;margin-bottom:8px;">
      <div style="padding:8px 20px;background:#f0f7ff;border-bottom:1px solid #d1d5db;">
        <div style="font-size:13px;font-weight:700;color:#1e3a5f;">🔧 ${builder.title}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">Select the condition of each sub-component. The finding text and rating will be generated automatically.</div>
      </div>
  `;

  for (const comp of builder.components) {
    const selVal = selections[comp.key] !== undefined ? selections[comp.key] : '';
    html += `
      <div style="padding:8px 20px;border-bottom:1px solid #f0f0f0;">
        <label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">${comp.name}</label>
        <select id="cb-${comp.key}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;background:white;"
                onchange="onComponentBuilderChange('${safeLabel}', '${builderKey.replace(/'/g, "\\'")}')">
          <option value="">— Select —</option>
    `;
    comp.options.forEach((opt, idx) => {
      html += `<option value="${idx}" ${selVal === String(idx) ? 'selected' : ''}>${opt.label}</option>`;
    });
    html += `</select>`;

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
                       style="width:14px;height:14px;accent-color:#1e3a5f;">
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
                style="width:100%;padding:10px;background:#1e3a5f;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
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
    const el = document.getElementById(`cb-${comp.key}`);
    if (el) selections[comp.key] = el.value;
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

  // Collect selections
  const selections = {};
  for (const comp of builder.components) {
    const el = document.getElementById(`cb-${comp.key}`);
    if (el) selections[comp.key] = el.value;
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
  'Deck and coachroof/pilot house': 'Deck & Bowsprit',
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
  'Anti-vibration mounts': 'Anti vibration mounts',
  'Arch - cockpit (interior condition)': 'Arch',
  'Arch - external condition and equipment': 'Arch – external condition and equipment',
  'Battery ventillation': 'Battery ventilation',
  'Bilge, stringers and ribs (those accessible from cabin)': 'Bilge, stringers and ribs – accessible from cabin',
  'Boom, gooseneck, boomvang, outhaul, cunningham and reefing lines': 'Boom, gooseneck, boomvang, outhaul, and reefing lines',
  'Bowsprit, deck and coachroof/pilot house conductivity testing': 'Deck and coachroof/pilothouse conductivity testing',
  'Bowsprit, deck and coachroof/pilot house impact and resonance testing': 'Bowsprit, deck and coachroof/pilothouse impact and resonance testing',
  'Chainplates (exterior) pins and bolts': 'Chainplates (exterior)pins and bolts',
  'Cockpit lockers': 'Cockpit lockers and lazarettes',
  'Cockpit lockers/lazarettes': 'Cockpit lockers and lazarettes',
  'Cockpit sink and drain': 'Sink, faucets and drain',
  'Cockpit sink, faucets and drain': 'Sink, faucets and drain',
  'Deck and coachroof/pilot house conductivity testing': 'Deck and coachroof/pilothouse conductivity testing',
  'Deck and coachroof/pilot house impact and resonance testing': 'Bowsprit, deck and coachroof/pilothouse impact and resonance testing',
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
  'Hull and rudder(s)/drive(s) condition (below the waterline)': 'Hull and rudder(s) condition (below the waterline)',
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
  'Outdrive(s) - (external), corrosion, anodes, propeller(s), boots and bellows': 'Outdrive(s) corrosion, anodes, propeller(s), boots and bellows',
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
  'Trim tab mechanism (interior)': 'Trim tab hydraulic pump and system'
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
      fetch('survey_template.json'),
      fetch('insurance_survey_template.json'),
      fetch('text_library.json'),
      fetch('boat_specs_db.json'),
      fetch('boat_values_db.json'),
      fetch('engine_db.json'),
      fetch('outdrive_db.json')
    ]);

    surveyTemplate = await templateRes.json();
    insuranceSurveyTemplate = await insuranceTemplateRes.json();
    textLibrary = await libraryRes.json();
    boatSpecsDB = await specsRes.json();
    boatValuesDB = await valuesRes.json();
    engineDb = await engineRes.json();
    outdriveDb = await outdriveRes.json();

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

async function savePhoto(photo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['photos'], 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.put(photo);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(photo.id);
  });
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

    // Gather all photos for this survey
    const photos = await new Promise((resolve) => {
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
    });

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: 'kiki-marine-v31',
      survey: survey,
      photos: photos
    };

    const json = JSON.stringify(exportData);
    const vesselName = (survey.vesselName || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${vesselName}_${dateStr}.json`;

    // Use Web Share API on iOS/mobile (a.click() download doesn't work in Safari PWA)
    if (navigator.share && navigator.canShare) {
      const file = new File([json], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Survey: ${survey.vesselName}`,
            files: [file]
          });
          showToast(`Shared: ${filename}`);
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return; // User cancelled
          // Fall through to download approach
        }
      }
    }

    // Fallback: standard download link (works on desktop Chrome)
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported: ${filename}`);
  } catch (err) {
    console.error('Export error:', err);
    showAlert('Export failed: ' + err.message);
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
  toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e3a5f;color:white;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
                style="width:100%;padding:12px;background:#1e3a5f;color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">OK</button>
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
          <span>${option}</span>
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

    let snippetsHtml = '';
    // Cache variants on window so the click handler attached after mount can
    // read them by index without needing to round-trip text through HTML
    // attributes. This avoids all the escaping pitfalls of inline onclick.
    let sheetVariants = [];
    if (itemData.rating) {
      const baseRating = itemData.rating.charAt(0);
      sheetVariants = findTextVariants(categoryName, itemLabel, baseRating);
      if (sheetVariants.length > 0) {
        // Pre-compute diff-highlighted display texts for bottom sheet
        const highlightedTexts = highlightSnippetDiffs(sheetVariants);

        // Keyed cache lookup — escape the key for use in inline onclick
        const cacheKey = itemLabel.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        snippetsHtml = `<div class="sheet-section-title">Quick Insert (${sheetVariants.length} snippets)</div>`;
        sheetVariants.forEach((variant, idx) => {
          const ratingBadge = variant.rating || baseRating;
          const isActive = itemData.text === variant.text;
          // If the variant uses token syntax, render a clean preview instead
          // of showing raw {count:...}/{any:...} braces in the card.
          const hasTokens = /\{(count:|specify:|any:|standards\?)/.test(variant.text);
          const displayText = hasTokens
            ? escSnippet(renderSnippetPreview(variant.text))
            : (highlightedTexts[idx] || escSnippet(variant.text));
          snippetsHtml += `
            <button type="button" class="snippet-card-sheet" data-variant-idx="${idx}" style="display:block;width:100%;text-align:left;appearance:none;-webkit-appearance:none;border:none;border-bottom:1px solid #f0f0f0;padding:10px 20px;background:${isActive ? '#d1fae5' : 'white'};${isActive ? 'border-left:4px solid #16a34a;' : ''}cursor:pointer;font:inherit;color:inherit;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;pointer-events:none;">
                <span style="font-size:13px;color:#333;line-height:1.5;">${displayText}</span>
                <span style="flex-shrink:0;font-size:10px;background:#e5e7eb;color:#374151;padding:2px 6px;border-radius:4px;">${ratingBadge}</span>
              </div>
            </button>
          `;
        });
      }
    }
    // Stash variants + category on a module global keyed by item label.
    // The global tap handler (window._sheetCardTap) reads this.
    window._sheetVariantCache = window._sheetVariantCache || {};
    window._sheetVariantCache[itemLabel] = { categoryName: categoryName, variants: sheetVariants };

    // Standards section
    let standardsHtml = '';
    if (itemData.rating && (itemData.rating.startsWith('A') || itemData.rating.startsWith('B'))) {
      const standards = getStandardsForCategory(categoryName, itemData.rating);
      if (standards.length > 0) {
        standardsHtml = `<div class="sheet-section-title">Applicable Standards</div>`;
        standards.forEach(standard => {
          const isChecked = itemData.standards && itemData.standards.includes(standard);
          standardsHtml += `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 20px;border-bottom:1px solid #f0f0f0;cursor:pointer;">
              <input type="checkbox" value="${standard}" ${isChecked ? 'checked' : ''}
                     onchange="updateStandards('${safeLabel}', this)"
                     style="width:18px;height:18px;accent-color:#1e3a5f;" />
              <span style="font-size:13px;">${standard}</span>
            </label>
          `;
        });
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
    // Strip drive-line prefix (e.g., "Port — ", "Starboard — ", "#1 — ") for builder lookup
    // Strip drive-line prefix (e.g., "Port — ") and re-add "(s)" stripped during expansion
    let builderLookupLabel = itemLabel;
    const driveLinePrefixMatch = itemLabel.match(/^(?:Port|Starboard|#\d+)\s*—\s*/);
    if (driveLinePrefixMatch) {
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
      const savedSelections = itemData.componentSelections || {};
      componentBuilderHtml = renderComponentBuilder(builderKey, itemLabel, savedSelections, categoryName);
      // When a builder is present, hide the quick-insert snippets — the builder replaces them
      snippetsHtml = '';
    }

    const overlay = document.createElement('div');
    overlay.id = 'bottomSheetOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.innerHTML = `
      <div class="bottom-sheet" onclick="event.stopPropagation();">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-title">${itemLabel} — Notes <span style="font-size:10px;color:#9ca3af;font-weight:400;">${APP_VERSION}</span></div>
        ${mastOptionsHtml}
        ${outdriveOptionsHtml}
        ${winchOptionsHtml}
        ${componentBuilderHtml}
        <div style="padding:12px 20px;">
          <textarea id="sheet-text-${sanitizedLabel}" placeholder="Add inspection notes..." style="min-height:80px;width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;font-size:15px;resize:vertical;overflow:hidden;" autocapitalize="sentences" oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';">${itemData.text || ''}</textarea>
          <div id="sheet-text-${sanitizedLabel}-chipstrip" style="display:none;flex-wrap:wrap;gap:6px;margin-top:6px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;"></div>
        </div>
        ${snippetsHtml}
        ${standardsHtml}
        <div class="sheet-btn-row">
          <button onclick="document.getElementById('bottomSheetOverlay').remove();" style="background:#e5e7eb;color:#374151;">Cancel</button>
          <button onclick="saveNotesFromSheet('${safeLabel}', '${safeCat}', '${sanitizedLabel}');" style="background:#1e3a5f;color:white;">Save Notes</button>
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
    if (ta && ta.value) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
    // If textarea already has a template+placeholders from a prior session,
    // render the inline builder immediately
    if (ta && ta.dataset && ta.dataset.snippetTemplate) {
      refreshChipStrip(ta);
    }
  });
}

// Global tap handler for bottom-sheet snippet cards. Called from the
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
    const isPerDriveLine = /^(?:Port|Starboard|#\d+)\s*—\s*/.test(itemLabel);
    const dlc = isPerDriveLine
      ? 1
      : ((survey && survey.driveLineCount) ? parseInt(survey.driveLineCount, 10) || 1 : 1);
    const resolved = resolveCountTokens(text, dlc);
    // Replace — tapping a new snippet replaces the previous selection
    textarea.value = resolved;
    // Reset collected citations (new snippet starts fresh)
    setCollectedCitations(textarea, []);
    // Stash placeholders + template (for live builder) on the textarea
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
}

// Save notes from the notes sheet and close
function saveNotesFromSheet(itemLabel, categoryName, sanitizedLabel) {
  const textarea = document.getElementById(`sheet-text-${sanitizedLabel}`);
  if (!textarea) return;
  // Expand any {standards?...} block with collected citations before saving
  const finalized = (typeof finalizeSnippetText === 'function') ? finalizeSnippetText(textarea) : textarea.value;
  const newText = finalized.trim();

  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].text = newText;
    saveSurvey(survey).then(() => {
      const overlay = document.getElementById('bottomSheetOverlay');
      if (overlay) overlay.remove();
      updateCompactItem(survey, itemLabel, categoryName);
    });
  });
}

// ── Bottom Sheet: Media / Photos ────────────────────────────────────────────
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
      photosHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 20px;">';
      itemData.photos.forEach(photoId => {
        photosHtml += `
          <img id="sheet-thumb-${photoId}" src=""
               style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;"
               onclick="showPhotoActionOverlay('${photoId}', '${safeLabel}', '${safeCat}')" />
        `;
      });
      photosHtml += '</div>';
    }

    const overlay = document.createElement('div');
    overlay.id = 'bottomSheetOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.innerHTML = `
      <div class="bottom-sheet" onclick="event.stopPropagation();">
        <div class="bottom-sheet-handle"></div>
        <div class="bottom-sheet-title">${itemLabel} — Photos (${photoCount})</div>
        ${photosHtml}
        <div style="padding:12px 20px;">
          <button type="button"
                  onclick="document.getElementById('bottomSheetOverlay').remove(); openBatchCamera('${safeLabel}');"
                  style="display:block;width:100%;background:white;border:2px dashed #ddd;border-radius:8px;padding:16px;text-align:center;font-size:14px;font-weight:600;color:#1e3a5f;cursor:pointer;">
            📷 Capture Photos
          </button>
        </div>
        <div class="sheet-btn-row">
          <button onclick="document.getElementById('bottomSheetOverlay').remove();" style="background:#1e3a5f;color:white;">Done</button>
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
    }
  });
}

// Full-screen photo view with Edit / Move / Delete / Close actions.
// Opens when the user taps a thumbnail in the media sheet grid. Replaces the
// old inline red × and Move ↗ buttons with a clean lightbox-style overlay.
async function showPhotoActionOverlay(photoId, itemLabel, categoryName) {
  const photo = await getPhotoById(photoId);
  if (!photo) return;

  const overlay = document.createElement('div');
  overlay.id = 'photoActionOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="flex:0 0 auto;display:flex;justify-content:flex-end;padding:14px 18px;padding-top:calc(14px + env(safe-area-inset-top));">
      <button id="pao-close" aria-label="Close"
              style="background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:8px;width:44px;height:44px;font-size:22px;font-weight:700;cursor:pointer;">✕</button>
    </div>
    <div style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;padding:0 16px;overflow:hidden;">
      <img id="pao-img" src="" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;">
    </div>
    <div style="flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:16px 18px;padding-bottom:calc(16px + env(safe-area-inset-bottom));">
      <button id="pao-edit"
              style="background:#1e3a5f;color:#fff;border:none;border-radius:10px;padding:14px 0;font-size:15px;font-weight:700;cursor:pointer;min-height:52px;">✏️ Edit</button>
      <button id="pao-move"
              style="background:#0369a1;color:#fff;border:none;border-radius:10px;padding:14px 0;font-size:15px;font-weight:700;cursor:pointer;min-height:52px;">↗ Move</button>
      <button id="pao-delete"
              style="background:#64748b;color:#fff;border:none;border-radius:10px;padding:14px 0;font-size:15px;font-weight:700;cursor:pointer;min-height:52px;">🗑 Delete</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('pao-img').src = photo.dataUrl;

  const close = () => {
    const el = document.getElementById('photoActionOverlay');
    if (el) el.remove();
  };

  document.getElementById('pao-close').onclick = close;
  document.getElementById('pao-edit').onclick = () => {
    close();
    editSavedPhoto(photoId, itemLabel);
  };
  document.getElementById('pao-move').onclick = () => {
    close();
    movePhotoFromSheet(photoId, itemLabel, categoryName);
  };
  document.getElementById('pao-delete').onclick = async () => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    close();
    await deletePhotoFromSheet(photoId, itemLabel, categoryName);
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

  let optgroupsHtml = '';
  groups.forEach(g => {
    optgroupsHtml += `<optgroup label="${esc(g.category)}">`;
    g.items.forEach(label => {
      // Index into flat allItems array
      const idx = allItems.findIndex(i => i.label === label && i.category === g.category);
      if (idx >= 0) {
        optgroupsHtml += `<option value="${idx}">${esc(label)}</option>`;
      }
    });
    optgroupsHtml += `</optgroup>`;
  });

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px 16px 0 0;width:100%;max-width:560px;display:flex;flex-direction:column;box-shadow:0 -6px 24px rgba(0,0,0,0.25);padding-bottom:calc(16px + env(safe-area-inset-bottom));" onclick="event.stopPropagation();">
      <div style="padding:18px 20px 8px;font-weight:700;font-size:17px;color:#1e3a5f;">Move photo to…</div>
      <div style="padding:4px 20px 8px;font-size:12px;color:#6b7280;">From: ${esc(sourceItemLabel)}</div>
      <div style="padding:8px 20px 4px;">
        <select id="movePhotoSelect" size="1" style="width:100%;padding:14px 12px;border:2px solid #1e3a5f;border-radius:10px;font-size:16px;font-weight:600;color:#1e3a5f;background:white;box-sizing:border-box;-webkit-appearance:menulist;appearance:menulist;">
          <option value="" disabled selected>— Choose destination —</option>
          ${optgroupsHtml}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 20px 6px;">
        <button onclick="document.getElementById('movePhotoPickerOverlay').remove();" style="background:#64748b;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Cancel</button>
        <button id="movePhotoApply" style="background:#1e3a5f;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Move</button>
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
function findTextVariants(categoryName, itemLabel, baseRating) {
  if (!textLibrary) return [];

  const sheetName = SHEET_MAPPING[categoryName] || categoryName;
  const sheet = textLibrary[sheetName];

  if (!sheet) return [];

  // Strip "Head N — " prefix for matching expanded head items back to base snippets
  let resolvedLabel = itemLabel.replace(/^Head \d+ — /, 'Head, ');

  // Use explicit mapping if available, otherwise keep the resolved label
  const hadExplicitMap = !!ITEM_SNIPPET_MAP[resolvedLabel];
  resolvedLabel = ITEM_SNIPPET_MAP[resolvedLabel] || resolvedLabel;

  const matchLabel = resolvedLabel.toLowerCase();

  // 1. Exact section name match (case-insensitive)
  let matches = sheet.filter(entry => {
    if (!entry.section || !entry.rating) return false;
    const isRatingMatch = entry.rating.toString().charAt(0) === baseRating;
    if (!isRatingMatch) return false;
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
      const isRatingMatch = entry.rating.toString().charAt(0) === baseRating;
      if (!isRatingMatch) return false;
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
        const isRatingMatch = entry.rating.toString().charAt(0) === baseRating;
        return isRatingMatch && entry.section === bestSection;
      });
    }
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
      tokens.push({
        kind: 'any',
        literal: full,
        label: buildChipLabel(opts.map(o => o.label), true),
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
    html += `<div style="font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">${sectionTitle}</div>`;

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
                style="flex-shrink:0;margin-left:auto;border:1px solid #1e3a5f;background:#1e3a5f;color:white;border-radius:6px;min-width:40px;min-height:32px;padding:4px 10px;font-size:14px;font-weight:700;cursor:pointer;line-height:1;">1</button>
      ` : '';
      html += `
        <label style="display:flex;align-items:center;gap:10px;padding:7px 2px;cursor:pointer;min-height:40px;">
          <input type="${isMulti ? 'checkbox' : 'radio'}" name="snbld-${textarea.id}-${ti}"
                 data-token-idx="${ti}" data-opt-idx="${oi}"
                 style="width:20px;height:20px;accent-color:#1e3a5f;flex-shrink:0;" />
          <span style="font-size:14px;color:#1f2937;line-height:1.4;flex:1;">${escapeHtml(rawLabel)}${cites}</span>
          ${countBadge}
        </label>
      `;
    });

    html += `
      <input type="text" data-custom-idx="${ti}" placeholder="Add another item${isMulti ? ' (comma-separated, no punctuation)' : ''}"
             style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;" />
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
      <div style="font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Additional observations (optional)</div>
      <textarea data-freeform-notes="1" rows="2"
                placeholder="Type any extra details in your own words — appended as a separate sentence."
                style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
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
      inp.addEventListener('input', () => applyBuilderState(strip));
    }
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
      customRaw.split(/\s*,\s*/).filter(Boolean).forEach(l => selectedLabels.push(l));
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

  textarea.value = text;
  // Auto-expand the textarea to fit
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  // Persist citations
  const uniq = [];
  citations.forEach(c => { if (!uniq.includes(c)) uniq.push(c); });
  setCollectedCitations(textarea, uniq);
  // Auto-check matching Applicable Standards checkboxes in the active sheet.
  // Only adds checks — never removes — so manually-checked items are preserved.
  syncStandardsFromCitations(uniq);
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
               style="width:20px;height:20px;accent-color:#1e3a5f;flex-shrink:0;" />
        <span style="font-size:15px;color:#1f2937;line-height:1.4;">${escapeHtml(label)}${cites}</span>
      </label>
    `;
  });

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px 16px 0 0;width:100%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 -6px 24px rgba(0,0,0,0.25);padding-bottom:calc(16px + env(safe-area-inset-bottom));" onclick="event.stopPropagation();">
      <div style="padding:18px 20px 6px;font-weight:700;font-size:17px;color:#1e3a5f;">${escapeHtml(tok.label)}</div>
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
          style="background:#1e3a5f;color:white;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;">Apply</button>
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
  if (!survey || !survey.totalRatedItems) return 0;
  // Count items that are rated OR excluded
  const completedOrExcluded = Object.values(survey.items || {})
    .filter(item => (item.rating && item.rating !== '') || item.excluded).length;
  return Math.round((completedOrExcluded / survey.totalRatedItems) * 100);
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
  // Hide the floating collapse button (only relevant on inspection view)
  updateCollapseButton(false);
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
             alt="Kiki Marine" style="height:36px; width:auto;"
             onerror="this.style.display='none'">
        <div>
          <div class="header-title">Kiki Marine Survey</div>
          <div class="header-subtitle" style="display:flex;align-items:center;gap:8px;">
            Marine Vessel Surveys — ${APP_VERSION}
            <button onclick="forceAppUpdate()" style="background:none;border:1px solid rgba(255,255,255,0.4);color:rgba(255,255,255,0.8);border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;">↻ Update</button>
          </div>
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

    // Import button always visible at top
    const importBtn = `<div style="text-align:right;margin-bottom:12px;">
        <button class="btn-secondary" style="font-size:13px;padding:8px 16px;" onclick="importSurvey()">📥 Import Survey</button>
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
      let html = importBtn + '<div style="margin-bottom: 120px;">';
      surveys.forEach(survey => {
        const completion = getCompletionPercentage(survey);
        const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

        // Format date as "2026, April 7" from surveyDate (YYYY-MM-DD) or createdAt
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        let cardDate = '';
        const rawDate = survey.surveyDate || new Date(survey.createdAt).toISOString().split('T')[0];
        if (rawDate) {
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            cardDate = `${parts[0]}, ${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
          } else {
            cardDate = rawDate;
          }
        }

        // Short survey type label
        const typeShort = survey.surveyType === 'Insurance survey' ? 'Insurance'
          : survey.surveyType === 'Pre-purchase survey' ? 'Pre-Purchase'
          : survey.surveyType === 'Appraisal' ? 'Appraisal'
          : '';

        // Boat name with year/make/model: "Stardust a Beneteau First 2014"
        const boatLabel = [
          survey.vesselName ? esc(survey.vesselName) : '',
          survey.yearMakeModel ? 'a ' + esc(survey.yearMakeModel) : ''
        ].filter(Boolean).join(' ') || 'Unnamed';

        // Build card title: 2026, April 7, Insurance, Alf Kwinter, Stardust a Beneteau First 2014, Outer Harbour Marina
        const titleParts = [
          cardDate,
          typeShort,
          survey.clientName ? esc(survey.clientName) : '',
          boatLabel,
          survey.location ? esc(shortLocation(survey.location)) : ''
        ].filter(Boolean);

        // Type badge colour
        const typeBadgeBg = survey.surveyType === 'Insurance survey' ? '#f59e0b' : '#1e3a5f';
        const typeBadge = typeShort
          ? `<span style="display:inline-block;background:${typeBadgeBg};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;vertical-align:middle;">${esc(typeShort).toUpperCase()}</span>`
          : '';

        html += `
          <div class="survey-card" onclick="openSurvey('${survey.id}')">
            <p class="survey-name" style="font-size:14px;line-height:1.5;">${titleParts.join(', ')}</p>
            <div style="margin-top:6px;">${typeBadge}</div>
            <div class="progress-bar" style="margin-top:8px;">
              <div class="progress-fill" style="width: ${completion}%; background-color: ${completion === 100 ? '#16a34a' : '#1e3a5f'};"></div>
            </div>
            <div class="completion-text">${completion}% complete</div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button class="btn-secondary" style="flex:1;" onclick="event.stopPropagation(); exportSurvey('${survey.id}')">📤 Export</button>
              <div style="position:relative;flex:1;" onclick="event.stopPropagation();">
                <button class="btn-secondary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:4px;"
                        onclick="toggleSurveyMenu(this, '${survey.id}')">
                  More ▾
                </button>
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      content.innerHTML = html;
    }

    // Add floating action button for new survey (remove any existing fab first, e.g. report button)
    const existingFab = document.querySelector('.fab');
    if (existingFab) existingFab.remove();
    const reportBtnEl = document.getElementById('reportBtn');
    if (reportBtnEl) reportBtnEl.remove();

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.innerHTML = '+';
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

      <h3 style="margin-top:16px;color:#1e3a5f;">Engine & Transmission</h3>

      <!-- Engine 1 -->
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:10px;background:#f8fafc;">
        <div style="font-weight:700;font-size:13px;color:#1e3a5f;margin-bottom:8px;">Engine 1 (Port / Single)</div>
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
        <div style="font-weight:700;font-size:13px;color:#1e3a5f;margin:12px 0 8px;">Transmission 1</div>
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
          <div style="font-weight:700;font-size:13px;color:#1e3a5f;">Engine 2 (Starboard)</div>
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
        <div style="font-weight:700;font-size:13px;color:#1e3a5f;margin:12px 0 8px;">Transmission 2</div>
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
        <textarea id="vesselDescription" rows="8" placeholder="Describe the vessel: hull type/material, rig, keel, propulsion, layout, cabins, history (e.g., freshwater only), any known damage or repairs..." autocapitalize="sentences"></textarea>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Provide a narrative description of the vessel's type, layout, construction, and notable features. This is required by SAMS. Use the auto-generate button to create a template, then fill in the [bracketed] placeholders.</div>
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

      <h3 style="margin-top:16px;color:#1e3a5f;">Vessel Overview Photos (Four Corners)</h3>
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

      <h3 style="margin-top:16px;color:#1e3a5f;">Comparable Vessels</h3>
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

    const existingFab = document.querySelector('.fab');
    if (existingFab) existingFab.remove();
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
        <div style="flex:1;">
          <div class="header-title">${(survey.vesselName || 'Survey').replace(/</g, '&lt;')}</div>
          <div class="header-subtitle">Edit Vessel Information</div>
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
        <button class="btn-secondary" onclick="returnToInspection('${survey.id}')">Cancel</button>
        <button class="btn-primary" onclick="saveSurveyDetails('${survey.id}')">Save & Return to Inspection</button>
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
    }, 100);
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

    // Clean up incompatible drive settings when vessel type changes from intro
    if (survey.vesselType === 'sail') {
      survey.driveLineCount = 1;
      survey.hasRudder = true;
      if (survey.driveType === 'outdrive' || survey.driveType === 'ips') survey.driveType = '';
    } else if (survey.vesselType === 'power') {
      if (survey.driveType === 'saildrive') survey.driveType = '';
    }

    saveSurvey(survey).then(() => {
      renderInspection(survey);
    });
  });
}

function returnToInspection(surveyId) {
  getSurvey(surveyId).then(survey => {
    if (survey) {
      renderInspection(survey);
    } else {
      renderHome();
    }
  });
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

  // Hide the banner
  const banner = document.getElementById('specsBanner');
  if (banner) banner.remove();
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
      <p style="color:#1e3a5f;font-size:13px;margin:0 0 12px;">Check live sources for current market pricing:</p>
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
        <p style="color:#1e3a5f;font-size:20px;font-weight:bold;margin:0;">${lowFmt} – ${highFmt} USD</p>
        <p style="color:#374151;font-size:13px;margin:4px 0 0;">${lowCAD} – ${highCAD} CAD @ ${usdcad.toFixed(2)}</p>
      </div>

      <p style="color:#374151;font-size:12px;margin:0 0 4px;line-height:1.5;">
        <em>BUC guide values reflect average condition. Adjust for actual condition, equipment, upgrades, and location. SAMS requires corroboration from additional sources.</em>
      </p>
      <p style="color:#1e3a5f;font-size:13px;margin:0 0 10px;">${entry.rationale}</p>

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
  await saveSurvey(survey);
  showToast('Description regenerated with latest survey data');
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
  // Remove any existing fab buttons from home or other views
  const existingFab = document.querySelector('.fab');
  if (existingFab) existingFab.remove();

  const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

  currentView = 'inspection';
  currentSurveyId = survey.id;
  persistViewState();
  history.pushState({ view: 'inspection', surveyId: survey.id }, '');

  const app = document.getElementById('app');

  const surveyTypeBanner = survey.surveyType
    ? `<div style="background:${survey.surveyType === 'Insurance survey' ? '#f59e0b' : '#1e3a5f'};color:#fff;text-align:center;font-size:12px;font-weight:700;padding:4px 0;letter-spacing:0.5px;">${esc(survey.surveyType).toUpperCase()}</div>`
    : '';

  app.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="backToHome()">←</button>
      <div style="flex:1;">
        <div class="header-title">${esc(survey.vesselName)}</div>
        <div class="header-subtitle">Inspection</div>
      </div>
      <button onclick="regenerateDescriptionFromInspection()" style="background:none;border:1px solid rgba(255,255,255,0.4);color:white;font-size:11px;padding:4px 8px;border-radius:6px;cursor:pointer;margin-right:6px;">✨ Desc</button>
      <button onclick="editSurveyDetails('${survey.id}')" style="background:none;border:1px solid rgba(255,255,255,0.4);color:white;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;">✏️ Edit Intro</button>
      <div id="syncStatusIndicator" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;cursor:help;margin-left:6px;" title="Sync status"></div>
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

  // Check if conditional items should be shown
  function shouldShowItem(item) {
    if (isPowerboat && item.sailOnly) return false;
    if (isSailboat && item.powerOnly) return false;
    if (isPowerboat && item.rudderItem && !survey.hasRudder) return false;
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

  survey.totalRatedItems = totalRatedItems;

  // Render categories
  const content = document.getElementById('inspection-content');
  let html = `<div style="margin-bottom: 140px;">`;

  // Vessel type toggle — always shown so the surveyor can switch at any time
  const currentVesselType = survey.vesselType || '';
  html += `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding:10px 12px;background:#f0f7ff;border:1px solid #93c5fd;border-radius:10px;">
      <span style="font-size:13px;font-weight:700;color:#1e3a5f;">⛵ Vessel Type:</span>
      <div style="display:flex;gap:0;border:2px solid #1e3a5f;border-radius:8px;overflow:hidden;">
        <button onclick="setVesselTypeFromInspection('sail')"
                style="padding:8px 16px;font-size:13px;font-weight:700;border:none;cursor:pointer;
                       background:${currentVesselType === 'sail' ? '#1e3a5f' : 'white'};
                       color:${currentVesselType === 'sail' ? 'white' : '#1e3a5f'};">
          Sail
        </button>
        <button onclick="setVesselTypeFromInspection('power')"
                style="padding:8px 16px;font-size:13px;font-weight:700;border:none;border-left:2px solid #1e3a5f;cursor:pointer;
                       background:${currentVesselType === 'power' ? '#1e3a5f' : 'white'};
                       color:${currentVesselType === 'power' ? 'white' : '#1e3a5f'};">
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

    html += `
      <div class="category-accordion" data-category-name="${categoryName.replace(/"/g, '&quot;')}">
        <button class="accordion-header" onclick="toggleAccordion(this)">
          ${incompleteDot}
          <span class="category-title">${categoryName}${badges}</span>
          <span class="category-progress" style="color:${progressColor};font-weight:700;">${progressText}</span>
          <span style="margin-left: 12px;">▼</span>
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
          <span style="font-size:14px;font-weight:600;color:#1e3a5f;">Number of heads:</span>
          <select id="headCountSelect" onchange="updateHeadCount(parseInt(this.value))"
                  style="padding:8px 12px;border:1px solid #93c5fd;border-radius:6px;font-size:15px;font-weight:600;background:white;color:#1e3a5f;min-width:60px;">
            ${[1,2,3,4].map(n => `<option value="${n}" ${headCount === n ? 'selected' : ''}>${n}</option>`).join('')}
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
          <div style="font-size:13px;font-weight:700;color:#1e3a5f;margin-bottom:8px;">⚙️ Drive Configuration</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:600;color:#374151;">Drive type:</span>
              <select id="driveTypeSelect" onchange="updateDriveType(this.value)"
                      style="padding:8px 10px;border:1px solid #93c5fd;border-radius:6px;font-size:14px;font-weight:600;background:white;color:#1e3a5f;">
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
                      style="padding:8px 10px;border:1px solid #93c5fd;border-radius:6px;font-size:14px;font-weight:600;background:white;color:#1e3a5f;min-width:50px;">
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
                     style="width:18px;height:18px;accent-color:#1e3a5f;">
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
    const catMediaItems = mediaItemsByCategory[categoryName] || [];
    catMediaItems.forEach(mediaItem => {
      const mediaData = survey.items[mediaItem.label] || { photos: [] };
      const photos = mediaData.photos || [];
      const safeLabel = mediaItem.label.replace(/'/g, "\\'");
      const safeCat = categoryName.replace(/'/g, "\\'");
      const sanitized = mediaItem.label.replace(/[^a-zA-Z0-9]/g, '_');
      html += `
        <div id="area-photo-wrap-${sanitized}" style="margin-bottom:16px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
          <div style="font-weight:600;font-size:14px;color:#0369a1;margin-bottom:8px;">📷 ${mediaItem.label}</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
            ${photos.map(pid => `
              <div style="position:relative;width:84px;">
                <img id="thumb-${pid}" src="" style="width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="editSavedPhoto('${pid}', '${safeLabel}')">
                <button onclick="event.stopPropagation();deleteAreaPhoto('${pid}', '${safeLabel}')" aria-label="Delete photo" style="position:absolute;top:-8px;right:-8px;background:#dc2626;color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;font-size:16px;font-weight:700;cursor:pointer;line-height:26px;text-align:center;padding:0;box-shadow:0 1px 3px rgba(0,0,0,0.3);">×</button>
                <button onclick="event.stopPropagation();moveAreaPhoto('${pid}', '${safeLabel}', '${safeCat}')" style="display:block;width:100%;margin-top:4px;background:#1e3a5f;color:white;border:none;border-radius:6px;padding:6px 0;font-size:12px;font-weight:700;cursor:pointer;">Move ↗</button>
              </div>
            `).join('')}
          </div>
          <label style="display:inline-block;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;min-height:44px;box-sizing:border-box;">
            📷 ${photos.length > 0 ? `Add More (${photos.length})` : 'Take Photos'}
            <input type="file" accept="image/*" multiple
              onchange="handleAreaPhotoCapture('${safeLabel}', this)"
              style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;">
          </label>
        </div>
      `;
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
        <span class="category-title">🛡️ Safety Equipment (TC TP 511)</span>
        <span class="category-progress">${safetyPct}% (${safetyChecked}/${safetyTotal})</span>
        <span style="margin-left: 12px;">▼</span>
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
      html += `<div style="font-weight:bold;margin-top:14px;margin-bottom:6px;color:#1e3a5f;font-size:13px;border-bottom:1px solid #ddd;padding-bottom:4px;">${eq.category}</div>`;
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
          <div style="font-weight:600;font-size:13px;color:#1e3a5f;margin-bottom:6px;">Add Additional Safety Equipment</div>
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
        <span class="category-title">📡 Instruments &amp; Electronics</span>
        <span class="category-progress">${ieTotal > 0 ? `${iePct}% (${ieRated}/${ieTotal})` : 'No items'}</span>
        <span style="margin-left: 12px;">▼</span>
      </button>
      <div class="accordion-content" style="display: none;">
        <div style="padding: 10px 0; font-size: 13px; color: #555; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;">
          <em>Photograph each instrument or electronic device. Mark whether it is operational, then optionally use AI to identify make, model and year.</em>
          <br/><button onclick="updateGeminiApiKey()" style="margin-top:6px;background:none;border:1px solid #7c3aed;color:#7c3aed;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;">⚙️ ${localStorage.getItem('geminiApiKey') ? 'Update' : 'Set'} Gemini API Key</button>
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

  // Backup button (left side)
  const backupBtn = document.createElement('button');
  backupBtn.id = 'backupBtn';
  backupBtn.style.cssText = 'position:fixed;bottom:calc(20px + env(safe-area-inset-bottom, 0px));left:calc(20px + env(safe-area-inset-left, 0px));background:#16a34a;color:white;border:none;border-radius:28px;padding:12px 18px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:100;cursor:pointer;';
  backupBtn.innerHTML = '💾 Backup';
  backupBtn.onclick = async () => {
    // Suppress popstate during backup (share sheet can trigger it on iOS)
    window._backupActive = true;
    if (window.fsDb && FirebaseSync.isEnabled()) {
      // Firebase backup — stays on page
      backupBtn.innerHTML = '💾 Saving…';
      backupBtn.disabled = true;
      try {
        const survey = await getSurvey(currentSurveyId);
        if (!survey) { showToast('Survey not found'); return; }

        // Gather all photos for this survey
        const photos = await new Promise((resolve) => {
          const tx = db.transaction(['photos'], 'readonly');
          const store = tx.objectStore('photos');
          const index = store.index('surveyId');
          const range = IDBKeyRange.only(currentSurveyId);
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

        const exportData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          appVersion: APP_VERSION,
          survey: survey,
          photos: photos
        };

        const vesselName = (survey.vesselName || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '');
        const docId = `${vesselName}_${dateStr}_${timeStr}`;

        await window.fsDb.collection('backups').doc(docId).set({
          surveyId: currentSurveyId,
          vesselName: survey.vesselName || '',
          exportedAt: new Date().toISOString(),
          data: JSON.stringify(exportData)
        });

        window._hasUnsavedBackup = false;
        showToast(`Backed up to cloud: ${vesselName}`);
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
  document.body.appendChild(backupBtn);

  // Report button (right side)
  btn = document.createElement('button');
  btn.id = 'reportBtn';
  btn.style.cssText = 'position:fixed;bottom:calc(20px + env(safe-area-inset-bottom, 0px));right:calc(20px + env(safe-area-inset-right, 0px));background:#1e3a5f;color:white;border:none;border-radius:28px;padding:12px 18px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:100;cursor:pointer;';
  btn.innerHTML = '📄 Preview Report';
  btn.onclick = () => generateReport();
  document.body.appendChild(btn);
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
  renderInspection(survey);
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
    await saveSurvey(survey);
  }
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
  const safeLabel = mediaLabel.replace(/'/g, "\\'");
  // Look up the category name from the wrapper's enclosing accordion
  const accordion = wrapper.closest('.category-accordion');
  const catName = accordion ? (accordion.dataset.categoryName || '') : '';
  const safeCat = catName.replace(/'/g, "\\'");

  wrapper.innerHTML = `
    <div style="font-weight:600;font-size:14px;color:#0369a1;margin-bottom:8px;">📷 ${mediaLabel}</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
      ${photos.map(pid => `
        <div style="position:relative;width:84px;">
          <img id="thumb-${pid}" src="" style="width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="editSavedPhoto('${pid}', '${safeLabel}')">
          <button onclick="event.stopPropagation();deleteAreaPhoto('${pid}', '${safeLabel}')" aria-label="Delete photo" style="position:absolute;top:-8px;right:-8px;background:#dc2626;color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;font-size:16px;font-weight:700;cursor:pointer;line-height:26px;text-align:center;padding:0;box-shadow:0 1px 3px rgba(0,0,0,0.3);">×</button>
          <button onclick="event.stopPropagation();moveAreaPhoto('${pid}', '${safeLabel}', '${safeCat}')" style="display:block;width:100%;margin-top:4px;background:#1e3a5f;color:white;border:none;border-radius:6px;padding:6px 0;font-size:12px;font-weight:700;cursor:pointer;">Move ↗</button>
        </div>
      `).join('')}
    </div>
    <button type="button"
      onclick="openBatchCamera('${safeLabel}', { isArea: true, categoryName: '${safeCat}' })"
      style="display:inline-block;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;min-height:44px;box-sizing:border-box;">
      📷 ${photos.length > 0 ? `Add More (${photos.length})` : 'Take Photos'}
    </button>
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
      <div style="font-weight:600;margin-bottom:8px;color:#1e3a5f;font-size:14px;">Photo Preview — ${label}</div>
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
      <button id="annoToolCircle" onclick="setAnnotationTool('circle')" style="padding:6px 12px;border-radius:6px;border:2px solid #3b82f6;background:#1e3a5f;color:white;font-size:13px;font-weight:600;cursor:pointer;">⭕ Circle</button>
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
      btn.style.background = (t === tool) ? '#1e3a5f' : '#374151';
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

  // Notes preview (truncated)
  const notePreview = hasNotes ? (itemData.text.trim().length > 80 ? itemData.text.trim().substring(0, 80) + '…' : itemData.text.trim()) : '';

  // Compact card row: label + rating badge
  let html = `
    <div class="compact-item ${isExcluded ? 'excluded' : ''} ${isFlagged ? 'flagged' : ''}">
      <div class="compact-item-label ${isExcluded ? 'struck' : ''}">
        ${isFlagged ? '🚩 ' : ''}${isExcluded ? '⊘ ' : ''}${itemLabel}
      </div>
      <button class="compact-rating-badge ${itemData.rating ? '' : 'unrated'}"
              style="${itemData.rating ? `background:${ratingColor};` : ''}"
              data-options="${optionsAttr}"
              onclick="showRatingSheet('${safeLabel}', '${safeCat}', this.getAttribute('data-options').split('|||'))">
        ${itemData.rating || 'Select response'}
      </button>
    </div>
  `;

  // Notes preview under the rating
  if (notePreview) {
    html += `
      <div style="padding:0 12px 4px 12px;cursor:pointer;" onclick="showNotesSheet('${safeLabel}', '${safeCat}')">
        <div style="font-size:12px;color:#6b7280;line-height:1.3;background:#f9fafb;padding:6px 10px;border-radius:6px;border-left:3px solid ${ratingColor};">${notePreview}</div>
      </div>
    `;
  }

  // Standards tags (show selected ABYC/TC standards persistently)
  if (itemData.standards && itemData.standards.length > 0) {
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

  // Action row
  html += `
    <div class="compact-action-row">
      <button class="compact-action-btn ${hasNotes ? 'has-content' : ''}" onclick="showNotesSheet('${safeLabel}', '${safeCat}')">
        📝 ${hasNotes ? 'Notes ✓' : 'Add note'}
      </button>
      <button class="compact-action-btn ${photoCount > 0 ? 'has-content' : ''}" onclick="showMediaSheet('${safeLabel}', '${safeCat}')">
        📷 ${photoCount > 0 ? `Photos (${photoCount})` : 'Photos'}
      </button>
      <button class="compact-action-btn ${isFlagged ? 'has-content' : ''}" onclick="toggleFlag('${safeLabel}')"
              title="Flag for follow-up">
        ${isFlagged ? '🚩' : '🏳️'} Flag
      </button>
      <button class="compact-action-btn ${isExcluded ? 'has-content' : ''}" onclick="toggleExclude('${safeLabel}')"
              title="Exclude from report">
        ⊘ ${isExcluded ? 'Excluded' : 'Skip'}
      </button>
    </div>
  `;

  return html;
}

// Build the inner HTML for a single rated item (used by selectRating for targeted DOM updates)
function buildSingleItemInnerHTML(itemLabel, categoryName, itemData, options) {
  const safeLabel = itemLabel.replace(/'/g, "\\'");
  const safeCat = categoryName.replace(/'/g, "\\'");
  const isExcluded = itemData.excluded;
  const isFlagged = itemData.flagged;

  let html = `
    <div class="item-name" style="${isExcluded ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${isFlagged ? '🚩 ' : ''}${isExcluded ? '⊘ ' : ''}${itemLabel}</div>
    <div class="rating-options">
  `;

  // Rating buttons
  options.forEach(option => {
    const isActive = itemData.rating === option;
    const color = RATING_COLORS[option] || '#1e3a5f';
    html += `
      <button class="rating-btn ${isActive ? 'active' : ''}"
              style="${isActive ? `background-color: ${color}; border-color: ${color};` : ''}"
              title="${getRatingTooltip(option)}"
              onclick="selectRating('${safeLabel}', '${safeCat}', '${option}')">
        ${option}
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
    const variants = findTextVariants(categoryName, itemLabel, baseRating);

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
      <textarea id="text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}" placeholder="Add inspection notes..." style="min-height: 80px;" autocapitalize="sentences" onblur="autoSaveItemText('${safeLabel}', '${safeCat}')">${itemData.text || ''}</textarea>
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
    if (isPowerboat && item.rudderItem && !survey.hasRudder) return false;
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

  // Singularise drive line item labels when there is only 1 drive line
  const headerDriveLineCount = survey.driveLineCount || 1;
  if (headerDriveLineCount === 1) {
    categoryItems = categoryItems.map(item => {
      if (item.driveLineItem) return { ...item, label: item.label.replace(/\(s\)/g, '') };
      return item;
    });
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

  // Update the progress text
  const remaining = categoryItems.length - completionCount;
  const progressEl = header.querySelector('.category-progress');
  if (progressEl) {
    progressEl.textContent = allExcluded ? 'Skipped' : (isComplete ? 'Done' : `${remaining} left`);
    progressEl.style.color = progressColor;
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

    saveSurvey(survey).then(() => {
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
      itemDiv.innerHTML = buildSingleItemInnerHTML(itemLabel, categoryName, itemData, options);

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
    const isPerDriveLine = /^(?:Port|Starboard|#\d+)\s*—\s*/.test(itemLabel);
    const dlc = isPerDriveLine
      ? 1
      : ((survey && survey.driveLineCount) ? parseInt(survey.driveLineCount, 10) || 1 : 1);
    const resolved = resolveCountTokens(text, dlc);

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
function toggleExclude(itemLabel) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].excluded = !survey.items[itemLabel].excluded;
    saveSurvey(survey).then(() => {
      updateItemInPlace(survey, itemLabel);
    });
  });
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
  itemDiv.innerHTML = buildSingleItemInnerHTML(itemLabel, categoryName, itemData, options);

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
      // Powerboats: auto-set rudder based on drive type
      if (driveType === 'outdrive' || driveType === 'ips') {
        survey.hasRudder = false; // outdrives and IPS pods steer, no separate rudder
      } else if (driveType === 'shaft') {
        survey.hasRudder = true; // shaft-driven boats have rudder(s)
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

function toggleCategoryExclude(categoryName, exclude) {
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
            itemLabels.push(...cat.items.filter(i => i.type === 'list').map(i => i.label));
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

// Auto-save item text on blur — no alert, just a subtle toast
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

    saveSurvey(survey).then(() => {
      showToast('Saved');
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
      const otherChevron = otherHeader?.querySelector('span:last-child');
      if (otherChevron) otherChevron.style.transform = 'rotate(0deg)';
    }
  });

  // Toggle the clicked one
  content.style.display = isOpen ? 'none' : 'block';
  const chevron = button.querySelector('span:last-child');
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';

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
      btn.style.cssText = 'position:fixed;bottom:100px;right:16px;z-index:9998;background:#1e3a5f;color:white;border:none;border-radius:24px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;gap:6px;';
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
    const header = openContent.previousElementSibling;
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
          const chevron = header.querySelector('span:last-child');
          if (chevron) chevron.style.transform = 'rotate(180deg)';
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

async function deleteSurveyConfirm(surveyId) {
  const yes = await showConfirm('Delete this survey? This cannot be undone.', 'Delete', 'Cancel');
  if (yes) {
    await deleteSurvey(surveyId);
    renderHome();
  }
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
  const changed = await saveAllInspectionData();

  // If there are unsaved backup changes, prompt to back up first
  if (window._hasUnsavedBackup && currentSurveyId) {
    const backup = await showConfirm(
      'You have changes that haven\'t been backed up. Would you like to save a backup first?',
      '💾 Backup First', 'Skip'
    );
    if (backup) {
      await exportSurvey(currentSurveyId);
      window._hasUnsavedBackup = false;
    }
  }

  const msg = changed
    ? 'Your work has been saved. Return to home screen?'
    : 'Return to home screen?';
  const yes = await showConfirm(msg, 'Go Home', 'Stay');
  if (yes) {
    // Remove report and backup buttons when leaving inspection
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) reportBtn.remove();
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) backupBtn.remove();
    renderHome();
  }
}

// Report generation
async function generateReport() {
  try {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;

  const activeTemplate = getTemplateForSurvey(survey);
  const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const reportDate = survey.reportDate || new Date().toISOString().split('T')[0];

  // ── Fetch documentation photos (HIN plate, compliance plate, licence) ──
  let hinPhotoDataUrl = '';
  let compliancePhotoDataUrl = '';
  let licencePhotoDataUrl = '';
  if (survey.hinPhoto) {
    const p = await getPhotoById(survey.hinPhoto);
    if (p && p.dataUrl) hinPhotoDataUrl = p.dataUrl;
  }
  if (survey.compliancePhoto) {
    const p = await getPhotoById(survey.compliancePhoto);
    if (p && p.dataUrl) compliancePhotoDataUrl = p.dataUrl;
  }
  if (survey.licencePhoto) {
    const p = await getPhotoById(survey.licencePhoto);
    if (p && p.dataUrl) licencePhotoDataUrl = p.dataUrl;
  }
  let tcPaperLicencePhotoDataUrl = '';
  if (survey.tcPaperLicencePhoto) {
    const p = await getPhotoById(survey.tcPaperLicencePhoto);
    if (p && p.dataUrl) tcPaperLicencePhotoDataUrl = p.dataUrl;
  }
  let coverPhotoDataUrl = '';
  if (survey.coverPhoto) {
    const p = await getPhotoById(survey.coverPhoto);
    if (p && p.dataUrl) coverPhotoDataUrl = p.dataUrl;
  }
  // Helper to load all photos from a multi-doc field (array or single ID)
  async function loadDocPhotos(fieldValue) {
    if (!fieldValue) return [];
    const ids = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
    const urls = [];
    for (const id of ids) {
      const p = await getPhotoById(id);
      if (p && p.dataUrl) urls.push(p.dataUrl);
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

  // ── Pre-fetch all per-item photos ─────────────────────────────────────
  const itemPhotoCache = {};
  for (const itemLabel of Object.keys(survey.items || {})) {
    const itemData = survey.items[itemLabel];
    if (itemData.photos && itemData.photos.length > 0) {
      for (const photoId of itemData.photos) {
        if (!itemPhotoCache[photoId]) {
          const p = await getPhotoById(photoId);
          if (p && p.dataUrl) {
            itemPhotoCache[photoId] = p.dataUrl;
          }
        }
      }
    }
  }

  // Also pre-load safety equipment photos
  if (survey.safetyEquipment) {
    for (const eq of survey.safetyEquipment) {
      if (eq.photos && eq.photos.length > 0) {
        for (const photoId of eq.photos) {
          if (!itemPhotoCache[photoId]) {
            const p = await getPhotoById(photoId);
            if (p && p.dataUrl) {
              itemPhotoCache[photoId] = p.dataUrl;
            }
          }
        }
      }
    }
  }

  // Also pre-load instruments & electronics photos
  if (survey.instrumentsElectronics) {
    for (const item of survey.instrumentsElectronics) {
      if (item.photos && item.photos.length > 0) {
        for (const photoId of item.photos) {
          if (!itemPhotoCache[photoId]) {
            const p = await getPhotoById(photoId);
            if (p && p.dataUrl) {
              itemPhotoCache[photoId] = p.dataUrl;
            }
          }
        }
      }
    }
  }

  // ── Pass 1: collect all findings ──────────────────────────────────────
  let findingCount = { A: 0, B: 0, C: 0, NT: 0 };
  let findings = { A: [], B: [], C: [], NT: [] };

  activeTemplate.forEach(section => {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      section.categories.forEach(category => {
        if (!category.items || category.name === 'Survey Specifications' || category.name === 'Vessel Specifications') return;
        category.items.filter(i => i.type === 'list').forEach(item => {
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
    h1 { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 6px; }
    h2 { background: #1e3a5f; color: white; padding: 8px 12px; margin-top: 24px; font-size: 13pt; }
    h3 { color: #1e3a5f; margin-top: 18px; font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td, th { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10pt; }
    th { background: #f0f0f0; }
    .rating-a { color: #dc2626; font-weight: bold; }
    .rating-b { color: #d97706; font-weight: bold; }
    .rating-c { color: #16a34a; font-weight: bold; }
    .rating-nt { color: #6b7280; font-weight: bold; }
    .rating-safety { color: #2563eb; font-weight: bold; }
    .item { margin: 6px 0; padding: 4px 0 4px 10px; border-left: 3px solid #1e3a5f; }
    .standards { font-size: 9pt; color: #666; margin-top: 2px; }
    .item p { margin: 2px 0; }
    .footer { margin-top: 40px; padding: 20px; border-top: 2px solid #1e3a5f; }
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
    .checklist-table th { background: #1e3a5f; color: white; padding: 5px 6px; font-size: 8.5pt; text-align: left; }
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
  <div id="exportToolbar" style="position:sticky;top:0;z-index:999;background:#1e3a5f;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:3px solid #f0c040;margin:-20px -20px 16px -20px;padding:12px 24px;">
    <span style="color:white;font-size:11pt;font-weight:bold;">Kiki Marine — Survey Report</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="window.close(); if(!window.closed) history.back();" style="background:#4ade80;color:#1e3a5f;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">← Back to Inspection</button>
      <button onclick="window.print()" style="background:#fff;color:#1e3a5f;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">🖨️ Print / PDF</button>
      <button onclick="exportToWord()" style="background:#f0c040;color:#1e3a5f;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">📥 Download as Word</button>
      <button onclick="toggleProseMode()" id="proseModeBtn" style="background:#e5e7eb;color:#333;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10pt;">📝 Prose Mode</button>
    </div>
  </div>

  <!-- ═══ COVER PAGE ═══ -->
  <div style="text-align:center; padding-top: 20px;">
    <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
         alt="Kiki Marine Logo" style="max-width: 300px; width: 80%; height: auto;"
         onerror="this.style.display='none'">
    <h1 style="margin-top: 12px; font-size: 22pt;">KIKI MARINE</h1>
    <p style="font-size: 10pt; color: #555; margin-top: -8px;">SAMS &bull; ABYC Master Advisor</p>
    <h1 style="font-size: 16pt; border: none; margin-top: 20px; border-bottom: 2px solid #1e3a5f; display: inline-block; padding-bottom: 6px;">${survey.surveyType === 'Insurance survey' ? 'Insurance<br/>Marine Survey' : 'Report of Condition &amp; Value<br/>Marine Survey'}</h1>
  </div>

  ${coverPhotoDataUrl ? `
  <div style="text-align:center; margin: 24px auto; max-width: 700px;">
    <img src="${coverPhotoDataUrl}" alt="Vessel Photo"
         style="width:100%; max-height:400px; object-fit:cover; border:2px solid #1e3a5f; border-radius:4px;" />
  </div>` : ''}

  <table style="margin-top: 20px; border: 2px solid #1e3a5f;">
    <tr><td style="width:40%; background:#e8edf2;"><strong>Vessel</strong></td><td>"${esc(survey.vesselName)}" — ${esc(survey.yearMakeModel)}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>HIN</strong></td><td>${esc(survey.hinNumber) || 'N/A'}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Survey Conducted For</strong></td><td>${esc(survey.clientName) || 'N/A'}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Date of Inspection</strong></td><td>${survey.surveyDate || 'N/A'}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Date of Report</strong></td><td>${reportDate}</td></tr>
    <tr><td style="background:#e8edf2;"><strong>Surveyor</strong></td><td>Dave Seagrim, SAMS SA, ABYC Master Advisor</td></tr>
  </table>

  <div style="text-align:center; margin-top: 24px; font-size: 9pt; color: #666;">
    <p>Kiki Marine — kikimarinesurveyor.ca<br/>647-289-7876 — dave@kikimarine.ca</p>
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
    ${(survey.tcLicense || survey.tcLicenseType) ? `<tr><td><strong>TC Licence Type and Number</strong></td><td>${survey.tcLicenseType ? esc(survey.tcLicenseType) + ' — ' : ''}${esc(survey.tcLicense) || 'N/A'}</td></tr>` : ''}
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
    <tr><td><strong>Weather Conditions</strong></td><td>${esc(survey.weather) || 'N/A'}</td></tr>
    <tr><td><strong>Surveyor</strong></td><td>Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor</td></tr>
  </table>

${survey.locationLat && survey.locationLon ? `
  <div style="margin: 10px 0;">
    <img src="https://staticmap.openstreetmap.de/staticmap.php?center=${survey.locationLat},${survey.locationLon}&zoom=13&size=480x280&markers=${survey.locationLat},${survey.locationLon},red-pushpin" alt="Survey Location Map" style="border: 1px solid #ddd; border-radius: 4px;" />
  </div>
` : ''}

  <!-- ═══ RATING & VALUATION (early summary) ═══ -->
  <div style="border:2px solid #1e3a5f;padding:12px 16px;margin:16px 0;background:#f8f9fb;">
    <h3 style="margin:0 0 8px 0;color:#1e3a5f;border-bottom:1px solid #1e3a5f;padding-bottom:4px;font-size:12pt;">RATING &amp; VALUATION</h3>
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
    ${(survey.tcLicense || survey.tcLicenseType || licencePhotoDataUrl || tcPaperLicencePhotoDataUrl) ? `<tr><td><strong>TC Licence Type and Number</strong></td><td>${survey.tcLicenseType ? esc(survey.tcLicenseType) + ' — ' : ''}${esc(survey.tcLicense) || 'N/A'}${licencePhotoDataUrl ? '<br><em style="font-size:10px;color:#6b7280;">Licence number on hull:</em><br><img src="' + licencePhotoDataUrl + '" alt="Licence Number on Hull" style="max-width:500px;max-height:350px;margin-top:4px;border:1px solid #ccc;border-radius:4px;" />' : ''}${tcPaperLicencePhotoDataUrl ? '<br><em style="font-size:10px;color:#6b7280;">Transport Canada paper licence:</em><br><img src="' + tcPaperLicencePhotoDataUrl + '" alt="TC Paper Licence" style="max-width:500px;max-height:350px;margin-top:4px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>` : ''}
    <tr><td><strong>Tax Status (Duties Paid)</strong></td><td>${esc(survey.taxStatus) || 'N/A'}</td></tr>
    <tr><td><strong>NMMA/CE/TC Compliance Plate</strong></td><td>${esc(survey.compliancePlate) || 'N/A'}${compliancePhotoDataUrl ? '<br><img src="' + compliancePhotoDataUrl + '" alt="Compliance Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
  </table>

${survey.vesselDescription ? `
  <!-- ═══ VESSEL DESCRIPTION ═══ -->
  <h2>VESSEL DESCRIPTION</h2>
  <div class="scope-text">
    <p>${esc(survey.vesselDescription)}</p>
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
        html += `<tr><td colspan="7" style="background:#e8edf2;font-weight:bold;padding:5px 8px;font-size:9pt;border-top:2px solid #1e3a5f;">${esc(category.name)}</td></tr>`;

        answeredItems.forEach(item => {
          tableRow++;
          const d = survey.items[item.label];
          const rating = d.rating;
          const code = findingCodeMap[item.label] || '';
          const isViolation = rating.startsWith('A') || rating.startsWith('B');
          const ratingColor = rating.startsWith('A') ? '#dc2626' : rating.startsWith('B') ? '#d97706' : rating.startsWith('C') ? '#16a34a' : '#6b7280';
          const ratingShort = rating.startsWith('A') ? 'A' : rating.startsWith('B') ? 'B' : rating.startsWith('C') ? 'C' : 'NT';
          const textSnippet = d.text ? (d.text.length > 80 ? d.text.substring(0, 77) + '...' : d.text) : '—';
          const stdText = d.standards && d.standards.length > 0 ? d.standards.join('; ') : '—';

          html += `<tr>
            <td style="text-align:center;">${tableRow}</td>
            <td>${esc(item.label)}</td>
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
  html += `<h2 style="background:#1e3a5f;font-size:14pt;">DETAILED SURVEY FINDINGS</h2>`;

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

        const ratedItems = category.items.filter(item => item.type === 'list');
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
          const codeTag = code ? ` <strong style="color:${RATING_COLORS[ratingLabel] || '#1e3a5f'};">(Finding ${code})</strong>` : '';

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
  <div class="item" style="border-left-color: ${RATING_COLORS[ratingLabel] || '#1e3a5f'};">
    <p><strong>${esc(item.label)}</strong>${ratingLabel ? ` — <span class="${ratingClass}">${ratingLabel}</span>${codeTag}` : ''}</p>
    ${outdriveInfoHtml}
    ${winchInfoHtml}
    ${mastOptionsHtml}
    ${itemData.text ? `<p>${esc(itemData.text)}</p>` : ''}
    ${itemData.standards && itemData.standards.length > 0 ? `<p class="standards"><strong>Applicable Standards:</strong> ${itemData.standards.join(', ')}</p>` : ''}
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
    const stdCite = (f.standards && f.standards.length) ? ` (${f.standards.join('; ')})` : '';
    if (severity === 'A') {
      return `<p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Recommendation:</strong> Immediate correction required before the vessel is next underway${stdCite}. This finding represents a direct safety risk or code violation.</em></p>`;
    } else if (severity === 'B') {
      return `<p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Recommendation:</strong> Schedule repairs in the near future to maintain compliance with applicable codes, regulations, standards, or recommended practices${stdCite}.</em></p>`;
    } else {
      return `<p style="font-style:italic;color:#555;margin-top:4px;"><em><strong>Recommendation:</strong> Address in keeping with good marine maintenance practices${stdCite}.</em></p>`;
    }
  }

  // Helper to render a single finding entry
  function renderFinding(f, color, severity) {
    return `<div class="finding-section" style="margin-bottom:10px;padding-left:8px;border-left:3px solid ${color};">
      <strong style="color:${color};">Finding ${f.code}</strong> — ${esc(f.label)}
      ${f.text ? `<p style="margin:3px 0;">${esc(f.text)}</p>` : ''}
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
        ${f.text ? `<p style="margin:3px 0;">${esc(f.text)}</p>` : ''}
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
    <p style="font-size:14pt;font-weight:bold;text-align:center;padding:12px;border:2px solid #1e3a5f;">Overall Vessel Rating is: "${esc(survey.overallCondition) || 'Not yet assessed'}"</p>
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
      const p = await getPhotoById(survey[key]);
      if (p && p.dataUrl) fourCornerPhotos[key] = p.dataUrl;
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
      '  h1 { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 6px; }' +
      '  h2 { background: #1e3a5f; color: white; padding: 8px 12px; margin-top: 24px; font-size: 13pt; }' +
      '  h3 { color: #1e3a5f; margin-top: 18px; font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; }' +
      '  .page-break { page-break-after: always; }' +
      '  .rating-a { color: #dc2626; font-weight: bold; }' +
      '  .rating-b { color: #d97706; font-weight: bold; }' +
      '  .rating-c { color: #16a34a; font-weight: bold; }' +
      '  .rating-nt { color: #6b7280; font-weight: bold; }' +
      '  .rating-safety { color: #2563eb; font-weight: bold; }' +
      '  .item { margin: 12px 0; padding: 8px 10px; border-left: 4px solid #1e3a5f; }' +
      '  .footer { margin-top: 40px; padding: 20px; border-top: 2px solid #1e3a5f; }' +
      '  .checklist-table th { background: #1e3a5f; color: white; padding: 5px 6px; font-size: 8.5pt; }' +
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
      item.style.borderLeft = '3px solid #1e3a5f';
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
    <div style="position:fixed;top:0;left:0;right:0;z-index:100;background:#1e3a5f;padding:12px 16px;display:flex;align-items:center;gap:12px;">
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

// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.log('ServiceWorker registration failed: ', err);
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
  } catch (e) {
    console.error('Init error:', e);
    document.getElementById('app').innerHTML = `<div style="padding: 20px; color: red;">Error initializing app: ${e.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE REAL-TIME SYNC MODULE
// ═══════════════════════════════════════════════════════════════════════════════

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
            // Remote is newer — save locally (skip re-syncing to Firebase)
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
      <button id="batchCamShutter" aria-label="Take photo" style="width:88px;height:88px;border-radius:50%;background:#1e3a5f;border:5px solid #f5b942;box-shadow:0 4px 12px rgba(0,0,0,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:38px;padding:0;line-height:1;">📷</button>
      <button id="batchCamDone" aria-label="Done" style="width:88px;height:88px;border-radius:50%;background:#f5b942;color:#1e3a5f;border:5px solid #1e3a5f;box-shadow:0 4px 12px rgba(0,0,0,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;padding:0;line-height:1;letter-spacing:0.5px;">DONE</button>
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
    // Build a hidden input and hand off to handleAreaPhotoCapture
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
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
