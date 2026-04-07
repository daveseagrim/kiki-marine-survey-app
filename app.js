/**
 * Kiki Marine Survey App - Complete Implementation
 * All data persisted to IndexedDB
 * Service worker for offline support
 * Photo storage and annotation capabilities
 */

let db = null;
let textLibrary = null;
let surveyTemplate = null;
let boatSpecsDB = null;
let boatValuesDB = null;
let engineDb = null;
let currentSurveyId = null;
let currentView = 'surveys';

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
  'Safety': 'Safety & Nav Equipment'
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
    const [templateRes, libraryRes, specsRes, valuesRes, engineRes] = await Promise.all([
      fetch('survey_template.json'),
      fetch('text_library.json'),
      fetch('boat_specs_db.json'),
      fetch('boat_values_db.json'),
      fetch('engine_db.json')
    ]);

    surveyTemplate = await templateRes.json();
    textLibrary = await libraryRes.json();
    boatSpecsDB = await specsRes.json();
    boatValuesDB = await valuesRes.json();
    engineDb = await engineRes.json();
  } catch (e) {
    console.error('Error fetching data files:', e);
  }
}

// Database operations
async function saveSurvey(survey) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys'], 'readwrite');
    const store = tx.objectStore('surveys');
    const request = store.put(survey);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(survey.id);
  });
}

async function getSurvey(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['surveys'], 'readonly');
    const store = tx.objectStore('surveys');
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
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
    if (!survey) { alert('Survey not found'); return; }

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
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const vesselName = (survey.vesselName || 'survey').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${vesselName}_${dateStr}.kikisurvey`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show brief success message
    showToast(`Exported: ${filename}`);
  } catch (err) {
    console.error('Export error:', err);
    alert('Export failed: ' + err.message);
  }
}

async function importSurvey() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.kikisurvey,.json';

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.survey || !data.version) {
        alert('This file does not appear to be a valid Kiki Marine survey export.');
        return;
      }

      const survey = data.survey;
      const photos = data.photos || [];

      // Check if survey already exists
      const existing = await getSurvey(survey.id);
      if (existing) {
        const replace = confirm(
          `A survey for "${existing.vesselName || 'Unnamed'}" already exists on this device.\n\nReplace it with the imported version?`
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
      alert('Import failed: ' + err.message);
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

// ── Transport Canada TP 511 Safety Equipment Requirements ────────────────
// Based on Small Vessel Regulations (SOR/2010-91) and TP 511E Safe Boating Guide
// Organized by vessel type and length bracket
const TC_SAFETY_EQUIPMENT = {
  // Length brackets in metres
  brackets: [
    { id: 'under6', label: 'Not over 6 m', maxM: 6 },
    { id: '6to9',   label: 'Over 6 m, not over 9 m', maxM: 9 },
    { id: '9to12',  label: 'Over 9 m, not over 12 m', maxM: 12 },
    { id: '12to24', label: 'Over 12 m, not over 24 m', maxM: 24 },
    { id: 'over24', label: 'Over 24 m', maxM: Infinity }
  ],
  // Equipment items — each has a name, the brackets where it applies, qty or detail,
  // and which vessel types it applies to (power, sail, all)
  items: [
    // ── Personal Protection Equipment ──
    { category: 'Personal Protection Equipment',
      name: 'Approved PFD or lifejacket for each person on board',
      applies: { under6: '1 per person', '6to9': '1 per person', '9to12': '1 per person', '12to24': '1 per person', over24: '1 per person' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Personal Protection Equipment',
      name: 'Buoyant heaving line (min. 15 m / 49 ft)',
      applies: { '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Personal Protection Equipment',
      name: 'Buoyant heaving line (min. 15 m) OR lifebuoy with line',
      applies: { under6: '1' },
      types: ['power', 'sail'] },
    { category: 'Personal Protection Equipment',
      name: 'SOLAS lifebuoy with min. 30 m buoyant line attached',
      applies: { '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Personal Protection Equipment',
      name: 'SOLAS lifebuoy with self-igniting light',
      applies: { over24: '1' },
      types: ['power', 'sail'] },
    // ── Vessel Safety Equipment ──
    { category: 'Vessel Safety Equipment',
      name: 'Manual propelling device (paddle or oar) OR anchor with min. 15 m cable/chain/line',
      applies: { under6: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Vessel Safety Equipment',
      name: 'Anchor with min. 15 m (49 ft) of cable, rope, or chain',
      applies: { '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Anchor with min. 50 m (164 ft) of cable, rope, or chain',
      applies: { over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Bailer OR manual bilge pump',
      applies: { under6: '1', '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Manual bilge pump OR bilge-pumping arrangement',
      applies: { '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Vessel Safety Equipment',
      name: 'Bailer or manual water pump',
      applies: { under6: '1' },
      types: ['human-powered'] },
    // ── Distress Equipment ──
    { category: 'Distress Equipment',
      name: 'Watertight flashlight OR 3 pyrotechnic distress signals (Type A, B, or C)',
      applies: { under6: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Distress Equipment',
      name: 'Watertight flashlight',
      applies: { '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Distress Equipment',
      name: 'Pyrotechnic distress signals — Type A (parachute flare)',
      applies: { '6to9': '6', '9to12': '6', '12to24': '12', over24: '12' },
      types: ['power', 'sail'] },
    { category: 'Distress Equipment',
      name: 'Pyrotechnic distress signals — Type B (multi-star flare)',
      applies: { '6to9': '6', '9to12': '6' },
      types: ['power', 'sail'] },
    { category: 'Distress Equipment',
      name: 'Pyrotechnic distress signals — Type C (hand-held flare)',
      applies: { '6to9': '6', '9to12': '6', '12to24': '6', over24: '6' },
      types: ['power', 'sail'] },
    { category: 'Distress Equipment',
      name: 'Pyrotechnic distress signals — Type D (smoke signal)',
      applies: { '6to9': '6', '9to12': '6', '12to24': '6', over24: '6' },
      types: ['power', 'sail'] },
    // ── Navigation Equipment ──
    { category: 'Navigation Equipment',
      name: 'Navigation lights conforming to the Collision Regulations',
      applies: { under6: 'Required if operating after sunset, before sunrise, or in restricted visibility', '6to9': '1 set', '9to12': '1 set', '12to24': '1 set', over24: '1 set' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Navigation Equipment',
      name: 'Sound signalling device (horn or whistle)',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail', 'human-powered'] },
    { category: 'Navigation Equipment',
      name: 'Sound signalling appliance (power-driven, audible for 0.5 nm)',
      applies: { '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Navigation Equipment',
      name: 'Bell (required for vessels 12 m and over)',
      applies: { '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Navigation Equipment',
      name: 'Magnetic compass',
      applies: { '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Navigation Equipment',
      name: 'Radar reflector (if substantially constructed of non-metallic materials)',
      applies: { '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    // ── Fire Fighting Equipment ──
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 5B:C (marine-rated, if equipped with motor/fuel-burning appliance)',
      applies: { under6: '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 5B:C (marine-rated)',
      applies: { '6to9': '1', '9to12': '1' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire extinguisher — 10B:C (marine-rated)',
      applies: { '12to24': '1', over24: '2' },
      types: ['power', 'sail'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire axe (power-driven vessel, 12 m and over)',
      applies: { '12to24': '1', over24: '1' },
      types: ['power'] },
    { category: 'Fire Fighting Equipment',
      name: 'Fire bucket with lanyard (2 required over 24 m)',
      applies: { over24: '2' },
      types: ['power', 'sail'] },
    // ── Other Required Equipment ──
    { category: 'Other Required Equipment',
      name: 'First aid kit (marine or equivalent)',
      applies: { '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Other Required Equipment',
      name: 'Reboarding device (ladder, swim platform, etc.) if freeboard > 0.5 m',
      applies: { under6: '1', '6to9': '1', '9to12': '1', '12to24': '1', over24: '1' },
      types: ['power', 'sail'] },
    { category: 'Other Required Equipment',
      name: 'Manual propelling device (paddle or oar)',
      applies: { under6: '1', '6to9': '1' },
      types: ['power', 'sail'] },
    { category: 'Other Required Equipment',
      name: 'Sound signalling device — whistle (attached to each PFD, recommended)',
      applies: { under6: '1 per PFD', '6to9': '1 per PFD', '9to12': '1 per PFD', '12to24': '1 per PFD', over24: '1 per PFD' },
      types: ['power', 'sail', 'human-powered'] }
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

// Find text variants from library
function findTextVariants(categoryName, itemLabel, baseRating) {
  if (!textLibrary) return [];

  const sheetName = SHEET_MAPPING[categoryName] || categoryName;
  const sheet = textLibrary[sheetName];

  if (!sheet) return [];

  // First try exact contains match
  let matches = sheet.filter(entry => {
    if (!entry.section || !entry.rating) return false;
    const section = entry.section.toLowerCase();
    const label = itemLabel.toLowerCase();
    const isLabelMatch = section.includes(label) || label.includes(section);
    const isRatingMatch = entry.rating.toString().charAt(0) === baseRating;
    return isLabelMatch && isRatingMatch;
  });

  // If no exact match, try fuzzy word overlap matching
  if (matches.length === 0) {
    matches = sheet.filter(entry => {
      if (!entry.section || !entry.rating) return false;
      const isRatingMatch = entry.rating.toString().charAt(0) === baseRating;
      if (!isRatingMatch) return false;
      const score = matchScore(entry.section, itemLabel);
      return score >= 0.5; // At least 50% word overlap
    });
  }

  return matches;
}

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

    // Inspection items - will be populated as user rates items
    items: {},

    // Status tracking
    completedCount: 0,
    totalRatedItems: 0
  };

  return survey;
}

// Calculate completion percentage
function getCompletionPercentage(survey) {
  if (survey.totalRatedItems === 0) return 0;
  return Math.round((survey.completedCount / survey.totalRatedItems) * 100);
}

// UI Rendering Functions
function renderHome() {
  currentView = 'surveys';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="https://kikimarinesurveyor.ca/wp-content/uploads/2024/11/new_logo.png"
             alt="Kiki Marine" style="height:36px; width:auto;"
             onerror="this.style.display='none'">
        <div>
          <div class="header-title">Kiki Marine Survey</div>
          <div class="header-subtitle">Marine Vessel Surveys</div>
        </div>
      </div>
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
        </div>
      `;
    } else {
      let html = importBtn + '<div style="margin-bottom: 120px;">';
      surveys.forEach(survey => {
        const date = new Date(survey.createdAt).toLocaleDateString();
        const completion = getCompletionPercentage(survey);
        const esc = (s) => (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const subtitle = esc(survey.yearMakeModel || '');
        const client = survey.clientName ? `Client: ${esc(survey.clientName)}` : '';
        const surveyDateStr = survey.surveyDate ? `Survey: ${esc(survey.surveyDate)}` : '';
        const detailParts = [subtitle, client, surveyDateStr].filter(Boolean);
        html += `
          <div class="survey-card" onclick="openSurvey('${survey.id}')">
            <p class="survey-name">${esc(survey.vesselName) || 'Unnamed Survey'}</p>
            ${subtitle ? `<p style="font-size:13px;color:#1e3a5f;margin:2px 0 0;font-weight:600;">${subtitle}</p>` : ''}
            <p class="survey-date">${[date, client, surveyDateStr].filter(Boolean).join(' · ')}</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${completion}%; background-color: #1e3a5f;"></div>
            </div>
            <div class="completion-text">${completion}% complete</div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button class="btn-secondary" style="flex:1;" onclick="event.stopPropagation(); exportSurvey('${survey.id}')">📤 Export</button>
              <button class="btn-secondary" style="flex:1;color:#dc2626;" onclick="event.stopPropagation(); deleteSurveyConfirm('${survey.id}')">🗑 Delete</button>
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
  currentView = 'new-survey';
  const existingFab = document.querySelector('.fab');
  if (existingFab) existingFab.remove();
  const reportBtnEl = document.getElementById('reportBtn');
  if (reportBtnEl) reportBtnEl.remove();

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="renderHome()">←</button>
      <div class="header-title">New Survey</div>
    </div>
    <div class="content">
      <h2 class="form-heading">Vessel Information</h2>

      <div class="form-group">
        <label class="form-label">Vessel Name *</label>
        <input type="text" id="vesselName" placeholder="e.g., Sea Dream II">
      </div>

      <div class="form-group">
        <label class="form-label">Year / Make / Model *</label>
        <input type="text" id="yearMakeModel" placeholder="e.g., 2015 Beneteau Oceanis 46"
               onblur="checkSpecsOnBlur()" oninput="checkSpecsDebounced()">
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Tip: Enter year, make and model — specs may auto-fill from built-in database</div>
      </div>

      <div style="display: flex; gap: 8px; margin: 0 0 16px;">
        <button class="btn-secondary" style="flex: 1; font-size: 14px;" onclick="lookupSpecs()">
          🔍 Auto-Fill Specs
        </button>
        <button class="btn-secondary" style="flex: 1; font-size: 14px;" onclick="lookupComparables()">
          💰 Suggest Valuation
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Client Name</label>
        <input type="text" id="clientName" placeholder="Client name">
      </div>

      <div class="form-group">
        <label class="form-label">Survey Date</label>
        <input type="date" id="surveyDate" value="${new Date().toISOString().split('T')[0]}">
      </div>

      <div class="form-group" style="position:relative;">
        <label class="form-label">Location</label>
        <input type="text" id="location" placeholder="Start typing an address or marina name..."
               oninput="searchLocation(this.value)" autocomplete="off">
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
        <select id="vesselType">
          <option value="">Select</option>
          <option value="power">Power-driven</option>
          <option value="sail">Sailing vessel</option>
          <option value="human-powered">Human-powered (canoe, kayak, rowboat)</option>
        </select>
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

      <div class="form-group">
        <label class="form-label">Ballast</label>
        <input type="text" id="ballast" placeholder="">
      </div>

      <div class="form-group">
        <label class="form-label">Max Draft</label>
        <input type="text" id="maxDraft" placeholder="">
      </div>

      <div class="form-group">
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

      <div class="form-group">
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
        <textarea id="changesToPlan" placeholder="Any modifications or changes"></textarea>
      </div>

      <h3 style="margin-top:16px;color:#1e3a5f;">Engine & Transmission</h3>
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
      <div class="form-group">
        <label class="form-label" style="font-size:12px;">Engine Data Plate Photo</label>
        <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
          📷 Capture Engine Plate
          <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('enginePlatePhoto', 'Engine Data Plate', event)" />
        </label>
        <div id="enginePlatePhotoPreview" style="margin-top:4px;"></div>
      </div>

      <h2 class="form-heading">Survey Conditions</h2>

      <div class="form-group">
        <label class="form-label">Persons in Attendance</label>
        <input type="text" id="personsInAttendance" placeholder="e.g., Dave Seagrim (surveyor), John Smith (broker)">
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
          <option value="Vessel was on a trailer">Vessel was on a trailer</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Storage / Observation Details</label>
        <textarea id="storageDetails" rows="2" placeholder="e.g., Mast unstepped and stored on rack. Vessel winterized with antifreeze in all systems. Steel cradle, 6-pad."></textarea>
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
        <textarea id="vesselDescription" rows="8" placeholder="Describe the vessel: hull type/material, rig, keel, propulsion, layout, cabins, history (e.g., freshwater only), any known damage or repairs..."></textarea>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Provide a narrative description of the vessel's type, layout, construction, and notable features. This is required by SAMS. Use the auto-generate button to create a template, then fill in the [bracketed] placeholders.</div>
      </div>

      <h2 class="form-heading">Vessel Documentation</h2>

      <div class="form-group">
        <label class="form-label">Cover Photo of Vessel</label>
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">This photo will appear as the hero image on the report cover page. Take a clear, well-lit photo of the vessel.</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:6px 12px;">
            📷 Take Cover Photo
            <input type="file" accept="image/*" capture="environment" style="display:none;"
                   onchange="captureDocPhoto('coverPhoto', 'Cover Photo', event)" />
          </label>
          <span id="coverPhotoStatus" style="font-size:12px;color:#6b7280;"></span>
        </div>
        <div id="coverPhotoPreview" style="margin-top:8px;"></div>
      </div>

      <h3 style="margin-top:16px;color:#1e3a5f;">Vessel Overview Photos (Four Corners)</h3>
      <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">SAMS requires four overview photos showing the vessel from each corner. These appear at the end of the report.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="form-label" style="font-size:12px;">Port Bow</label>
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
            📷 Capture
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerPortBow', 'Port Bow', event)" />
          </label>
          <div id="fourCornerPortBowPreview" style="margin-top:4px;"></div>
        </div>
        <div>
          <label class="form-label" style="font-size:12px;">Starboard Bow</label>
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
            📷 Capture
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerStbdBow', 'Starboard Bow', event)" />
          </label>
          <div id="fourCornerStbdBowPreview" style="margin-top:4px;"></div>
        </div>
        <div>
          <label class="form-label" style="font-size:12px;">Port Stern</label>
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
            📷 Capture
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerPortStern', 'Port Stern', event)" />
          </label>
          <div id="fourCornerPortSternPreview" style="margin-top:4px;"></div>
        </div>
        <div>
          <label class="form-label" style="font-size:12px;">Starboard Stern</label>
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:5px 10px;">
            📷 Capture
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="captureDocPhoto('fourCornerStbdStern', 'Starboard Stern', event)" />
          </label>
          <div id="fourCornerStbdSternPreview" style="margin-top:4px;"></div>
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
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:6px 10px;">
            📷 Licence Number on Hull
            <input type="file" accept="image/*" capture="environment" style="display:none;"
                   onchange="captureDocPhoto('licencePhoto', 'Licence Number on Hull', event)" />
          </label>
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;padding:6px 10px;">
            📷 TC Paper Licence
            <input type="file" accept="image/*" capture="environment" style="display:none;"
                   onchange="captureDocPhoto('tcPaperLicencePhoto', 'TC Paper Licence', event)" />
          </label>
        </div>
        <div id="licencePhotoPreview" style="margin-top:8px;"></div>
        <div id="tcPaperLicencePhotoPreview" style="margin-top:8px;"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Hull Identification Number (HIN)</label>
        <input type="text" id="hinNumber" placeholder="">
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:6px 12px;">
            📷 Photo of HIN Plate
            <input type="file" accept="image/*" capture="environment" style="display:none;"
                   onchange="captureDocPhoto('hinPhoto', 'HIN Plate', event)" />
          </label>
          <span id="hinPhotoStatus" style="font-size:12px;color:#6b7280;"></span>
        </div>
        <div id="hinPhotoPreview" style="margin-top:8px;"></div>
      </div>

      <div class="form-group">
        <label class="form-label">Tax Status (Duties and Taxes Paid)</label>
        <input type="text" id="taxStatus" placeholder="Yes/No">
      </div>

      <div class="form-group">
        <label class="form-label">NMMA/CE/TC Compliance Plate</label>
        <input type="text" id="compliancePlate" placeholder="Details or photo">
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
          <label class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;padding:6px 12px;">
            📷 Photo of Compliance Plate
            <input type="file" accept="image/*" capture="environment" style="display:none;"
                   onchange="captureDocPhoto('compliancePhoto', 'Compliance Plate', event)" />
          </label>
          <span id="compliancePhotoStatus" style="font-size:12px;color:#6b7280;"></span>
        </div>
        <div id="compliancePhotoPreview" style="margin-top:8px;"></div>
      </div>

      <h2 class="form-heading" data-section="valuation">Valuation</h2>

      <div style="display: flex; gap: 8px; margin: 0 0 16px;">
        <button class="btn-primary" style="flex: 1; font-size: 14px;" onclick="suggestValuation()">
          📊 Auto-Suggest Value (BUC / Yachtworld)
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Fair Market Value - Low (USD)</label>
        <input type="text" id="valuationLow" placeholder="e.g., 150000">
      </div>

      <div class="form-group">
        <label class="form-label">Fair Market Value - High (USD)</label>
        <input type="text" id="valuationHigh" placeholder="e.g., 175000">
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
        <textarea id="valuationRationale" rows="5" placeholder="Will auto-generate from sources checked above — or type your own..."></textarea>
        <button class="btn-secondary" style="font-size:12px;margin-top:4px;padding:4px 10px;" onclick="updateValuationRationale()">🔄 Regenerate from sources</button>
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
        <button class="btn-secondary" onclick="renderHome()">Cancel</button>
        <button class="btn-primary" onclick="startNewSurvey()">Start Survey</button>
      </div>
    </div>
  `;

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
      opt.textContent = m.model;
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
}

function onEngineModelChange() {
  if (!engineDb) return;
  const makeVal = document.getElementById('engineMake').value;
  const modelSelect = document.getElementById('engineModel');
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
}

function onTransmissionMakeChange() {
  if (!engineDb) return;
  const select = document.getElementById('transmissionMake');
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
      opt.textContent = m.model;
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
  const searchWords = stripped.split(/\s+/).filter(w => w.length > 1);
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
        if (isNumeric(a) || isNumeric(b)) {
          return a === b;
        }
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

// Debounced version — updates the picker as you type (500ms delay)
let _specsDebounceTimer = null;
function checkSpecsDebounced() {
  clearTimeout(_specsDebounceTimer);
  _specsDebounceTimer = setTimeout(() => checkSpecsOnBlur(), 500);
}

function checkSpecsOnBlur() {
  const input = document.getElementById('yearMakeModel')?.value || '';
  if (!input || input.length < 5) return;

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
    // Single clear match — show simple banner
    const label = `${best.boat.make} ${best.boat.model}${best.boat.yearStart ? ' (' + best.boat.yearStart + (best.boat.yearEnd ? '–' + best.boat.yearEnd : '+') + ')' : ''}`;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="color:#065f46;font-size:14px;flex:1;">✓ Specs found: <strong>${label}</strong></span>
        <button class="btn-primary" style="padding:8px 16px;font-size:13px;"
                onclick="applyPendingSpecs()">Auto-fill Specs</button>
        <button class="btn-secondary" style="padding:8px 12px;font-size:13px;"
                onclick="document.getElementById('specsBanner').remove()">Dismiss</button>
      </div>
    `;
  } else {
    // Multiple close matches — let user pick
    const scrollStyle = topResults.length > 6 ? 'max-height:280px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-right:4px;' : '';
    let optionsHtml = '<div style="color:#065f46;font-size:14px;margin-bottom:8px;"><strong>Multiple matches found — select one:</strong></div>';
    optionsHtml += `<div style="${scrollStyle}">`;
    topResults.forEach((r, i) => {
      const b = r.boat;
      const label = `${b.make} ${b.model}${b.yearStart ? ' (' + b.yearStart + (b.yearEnd ? '–' + b.yearEnd : '+') + ')' : ''}`;
      const yearRange = b.yearStart ? `${b.yearStart}–${b.yearEnd || 'present'}` : '';
      optionsHtml += `
        <button onclick="window._pendingSpecs=boatSpecsDB.boats.find(x=>x.id==='${b.id}');applyPendingSpecs();document.getElementById('specsBanner').remove();"
                style="display:block;width:100%;text-align:left;background:${i === 0 ? '#ecfdf5' : 'white'};border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;margin:4px 0;cursor:pointer;font-size:13px;">
          <strong>${label}</strong>
          <span style="color:#6b7280;margin-left:8px;">${b.loa || ''} LOA${b.beam ? ' · ' + b.beam + ' beam' : ''}</span>
        </button>`;
    });
    optionsHtml += '</div>'; // close scrollable container
    optionsHtml += `<button class="btn-secondary" style="padding:6px 12px;font-size:12px;margin-top:6px;"
            onclick="document.getElementById('specsBanner').remove()">Dismiss</button>`;
    banner.innerHTML = optionsHtml;
  }

  const field = document.getElementById('yearMakeModel');
  if (field) field.closest('.form-group').insertAdjacentElement('afterend', banner);
}

function applyPendingSpecs() {
  if (_pendingSpecs) applyBoatSpecs(_pendingSpecs);
}

// Show auto-suggested valuation card
function suggestValuation() {
  const input = document.getElementById('yearMakeModel')?.value || '';
  if (!input) { alert('Enter Year/Make/Model first'); return; }

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

// Generate a vessel description template from filled-in form fields
function generateVesselDescription() {
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

  // Determine rig description for sailboats
  let rigDesc = '';
  if (vesselType === 'sail') {
    rigDesc = ' She is [SLOOP/CUTTER/KETCH]-rigged with a [DECK-STEPPED/KEEL-STEPPED] [ALUMINUM/CARBON FIBRE] mast.';
    if (sailArea) rigDesc += ` Total sail area is ${sailArea}.`;
  }

  // Build engine description
  let engineDesc = '';
  if (vesselType === 'sail') {
    engineDesc = 'Auxiliary power is provided by a [MAKE/MODEL] [DIESEL/GASOLINE] [INBOARD/OUTBOARD] engine rated at [XX] horsepower, driving a [FIXED/FOLDING/FEATHERING] [2/3]-blade propeller through a [SHAFT DRIVE/SAILDRIVE].';
  } else {
    engineDesc = 'Power is provided by [NUMBER] [MAKE/MODEL] [DIESEL/GASOLINE] [INBOARD/OUTBOARD/STERNDRIVE] engine(s) rated at [XX] horsepower each, driving [FIXED/FOLDING] [3/4]-blade propeller(s) through [SHAFT DRIVE(S)/STERNDRIVE(S)].';
  }

  const constructionStr = construction || '[FIBREGLASS/WOOD/ALUMINUM/STEEL]';
  const hullTypeStr = hullType || '[DISPLACEMENT/SEMI-DISPLACEMENT/PLANING]';
  const keelStr = keelType ? `, equipped with a ${keelType.toLowerCase()} keel` : ' with a [FIN/FULL/SHOAL/WING] keel';
  const draftStr = draft ? ` with a maximum draft of ${draft}` : ' with a maximum draft of [X\'X"]';

  let desc = `"${vesselName}" is a ${yearStr} ${makeStr} ${modelStr}, a ${constructionStr} ${hullTypeStr} ${typeStr}. `;
  desc += `She has an overall length of ${loa || '[XX\'XX"]'}, a beam of ${beam || '[XX\'XX"]'}${keelStr}${draftStr}`;
  if (displacement) desc += `, and a displacement of ${displacement}`;
  desc += `.`;
  desc += rigDesc;
  desc += `\n\n`;
  desc += engineDesc;
  desc += `\n\n`;
  desc += `The hull is [COLOUR] with a [COLOUR] boot stripe. The deck is [COLOUR] with [NON-SKID MOULDED/TEAK OVERLAY] surfaces. `;
  desc += `The vessel features [NUMBER] cabin(s)${cabins ? ' (' + cabins + ')' : ''} with [NUMBER] berth(s), [NUMBER] head(s) with [MANUAL/ELECTRIC] marine toilet(s), and a [V-BERTH/AFT CABIN/SALON] layout. `;
  desc += `The galley is [PORT/STARBOARD/AFT] and includes a [PROPANE/ELECTRIC/ALCOHOL] stove with [OVEN], a [12V/120V] refrigerator, and a [SINGLE/DOUBLE] stainless steel sink.`;
  desc += `\n\n`;
  if (electrical) {
    desc += `The electrical system is ${electrical}. `;
  } else {
    desc += `The electrical system is [12V DC / 120V AC] with [XX] amp shore power service. `;
  }
  desc += `Navigation and communication equipment includes [GPS/CHARTPLOTTER], [VHF RADIO], [DEPTH SOUNDER], [RADAR], and [AUTOPILOT]. `;
  desc += `Safety equipment includes [NUMBER] fire extinguisher(s), [NUMBER] PFD(s), flares, and a throwable flotation device.`;
  desc += `\n\n`;
  desc += `The vessel is in [GOOD/FAIR/POOR] overall cosmetic condition and appears to have been [WELL/REASONABLY/POORLY] maintained. [ANY NOTABLE MODIFICATIONS, DAMAGE HISTORY, OR OBSERVATIONS].`;

  const textarea = document.getElementById('vesselDescription');
  if (textarea) {
    if (textarea.value.trim() && !confirm('This will replace the current description. Continue?')) return;
    textarea.value = desc;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
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

function updateValuationRationale() {
  const checkedSources = Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value);
  const rationaleEl = document.getElementById('valuationRationale');
  if (!rationaleEl || checkedSources.length === 0) return;

  // Only auto-generate if empty or was previously auto-generated
  const isAutoGenerated = !rationaleEl.value || rationaleEl.dataset.autoGenerated === 'true';
  if (!isAutoGenerated) return;

  const vessel = document.getElementById('yearMakeModel')?.value || 'the subject vessel';
  const comparables = collectComparables ? collectComparables() : [];
  const compCount = comparables.filter(c => c.vessel).length;

  let rationale = `The Fair Market Value of the ${vessel} has been determined through consultation of the following independent sources: ${checkedSources.join(', ')}.`;

  if (compCount > 0) {
    rationale += ` A total of ${compCount} comparable vessel${compCount !== 1 ? 's were' : ' was'} reviewed to corroborate the valuation range.`;
  }

  rationale += ' The value range reflects the vessel in its current surveyed condition, taking into account age, equipment, maintenance history, and current market conditions. Values may vary based on geographic location, season, and individual negotiation.';

  rationaleEl.value = rationale;
  rationaleEl.dataset.autoGenerated = 'true';
}

function lookupSpecs() {
  const input = document.getElementById('yearMakeModel')?.value || '';
  if (!input) { alert('Enter Year/Make/Model first'); return; }

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

function startNewSurvey() {
  const formData = {
    vesselName: document.getElementById('vesselName').value,
    yearMakeModel: document.getElementById('yearMakeModel').value,
    clientName: document.getElementById('clientName').value,
    surveyDate: document.getElementById('surveyDate').value,
    location: document.getElementById('location').value,
    locationLat: window._surveyLat || null,
    locationLon: window._surveyLon || null,
    surveyType: document.getElementById('surveyType').value,

    vesselType: document.getElementById('vesselType')?.value || 'power',
    boatStyle: document.getElementById('boatStyle')?.value || '',
    hullType: document.getElementById('hullType').value,
    loa: document.getElementById('loa').value,
    lwl: document.getElementById('lwl').value,
    beam: document.getElementById('beam').value,
    displacement: document.getElementById('displacement').value,
    ballast: document.getElementById('ballast').value,
    maxDraft: document.getElementById('maxDraft').value,
    totalSailArea: document.getElementById('totalSailArea').value,
    construction: document.getElementById('construction').value,
    keelType: document.getElementById('keelType').value,
    numberCabins: document.getElementById('numberCabins').value,
    electricalSystem: document.getElementById('electricalSystem').value,
    changesToPlan: document.getElementById('changesToPlan').value,

    personsInAttendance: document.getElementById('personsInAttendance').value,
    reportDate: document.getElementById('reportDate').value,
    weather: document.getElementById('weather').value,
    onLandOrWater: document.getElementById('onLandOrWater').value,
    seaTrial: document.getElementById('seaTrial').value,
    powerAtTime: document.getElementById('powerAtTime').value,
    waterAtTime: document.getElementById('waterAtTime').value,
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

    bilgePumps: collectBilgePumps(),
    comparables: collectComparables(),

    vesselDescription: document.getElementById('vesselDescription').value,

    tcLicenseType: document.getElementById('tcLicenseType').value,
    tcLicense: document.getElementById('tcLicense').value,
    hinNumber: document.getElementById('hinNumber').value,
    taxStatus: document.getElementById('taxStatus').value,
    compliancePlate: document.getElementById('compliancePlate').value,

    valuationLow: document.getElementById('valuationLow').value,
    valuationHigh: document.getElementById('valuationHigh').value,
    exchangeRate: parseFloat(document.getElementById('exchangeRate').value) || 1.35,
    valuationSources: Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value),
    valuationSource: Array.from(document.querySelectorAll('.val-source:checked')).map(cb => cb.value).join(', '),
    valuationRationale: document.getElementById('valuationRationale').value,
    replacementCost: document.getElementById('replacementCost').value,
    overallCondition: document.getElementById('overallCondition').value
  };

  const survey = createNewSurvey(formData);
  saveSurvey(survey).then(id => {
    currentSurveyId = id;
    renderInspection(survey);
  });
}

function renderInspection(survey) {
  // Remove any existing fab buttons from home or other views
  const existingFab = document.querySelector('.fab');
  if (existingFab) existingFab.remove();

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
  currentView = 'inspection';
  currentSurveyId = survey.id;

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      <button class="header-back" onclick="backToHome()">←</button>
      <div>
        <div class="header-title">${survey.vesselName}</div>
        <div class="header-subtitle">Inspection</div>
      </div>
    </div>
    <div class="content" id="inspection-content">
      <div style="text-align: center; padding: 20px;">Loading inspection items...</div>
    </div>
  `;

  // Count and identify rated items
  let totalRatedItems = 0;
  const ratedItemsByCategory = {};

  surveyTemplate.forEach(section => {
    if (section.name === 'Kiki Marine Survey' && section.categories) {
      section.categories.forEach(category => {
        if (category.items) {
          const ratedItems = category.items.filter(item => item.type === 'list');
          if (ratedItems.length > 0) {
            ratedItemsByCategory[category.name] = ratedItems;
            totalRatedItems += ratedItems.length;
          }
        }
      });
    }
  });

  survey.totalRatedItems = totalRatedItems;

  // Render categories
  const content = document.getElementById('inspection-content');
  let html = `<div style="margin-bottom: 140px;">`;

  Object.entries(ratedItemsByCategory).forEach(([categoryName, items]) => {
    const categoryCompletionCount = items.filter(item =>
      survey.items[item.label]?.rating
    ).length;
    const categoryCompletion = Math.round((categoryCompletionCount / items.length) * 100);
    const flaggedCount = items.filter(item => survey.items[item.label]?.flagged).length;
    const excludedCount = items.filter(item => survey.items[item.label]?.excluded).length;
    const allExcluded = excludedCount === items.length;

    html += `
      <div class="category-accordion">
        <button class="accordion-header" onclick="toggleAccordion(this)">
          <span class="category-title">${categoryName}${flaggedCount > 0 ? ` <span style="color:#f59e0b;font-size:12px;">🚩${flaggedCount}</span>` : ''}${excludedCount > 0 ? ` <span style="color:#9ca3af;font-size:12px;">⊘${excludedCount}</span>` : ''}</span>
          <span class="category-progress">${categoryCompletion}%</span>
          <span style="margin-left: 12px;">▼</span>
        </button>
        <div class="accordion-content" style="display: none;">
          <div style="display:flex;gap:8px;margin-bottom:12px;padding:8px;background:#f9fafb;border-radius:8px;">
            <button class="btn-secondary" style="font-size:12px;padding:6px 12px;${allExcluded ? 'background:#fee2e2;border-color:#fca5a5;' : ''}"
                    onclick="toggleCategoryExclude('${categoryName.replace(/'/g, "\\'")}', ${!allExcluded})">
              ${allExcluded ? '✅ Include All' : '⊘ Skip Entire Category'}
            </button>
          </div>
    `;

    items.forEach(item => {
      const itemData = survey.items[item.label] || { rating: '', text: '', standards: [], photos: [] };
      const ratingColor = RATING_COLORS[itemData.rating] || '#6b7280';
      const ratingLabel = itemData.rating || 'Not rated';

      const isExcluded = itemData.excluded;
      html += `
        <div class="rated-item" style="${isExcluded ? 'opacity:0.5;border-left:4px solid #d1d5db;' : itemData.flagged ? 'border-left:4px solid #f59e0b;' : ''}">
          <div class="item-name" style="${isExcluded ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${itemData.flagged ? '🚩 ' : ''}${isExcluded ? '⊘ ' : ''}${item.label}</div>

          <div class="rating-options">
      `;

      // Rating buttons
      item.options.forEach(option => {
        const isActive = itemData.rating === option;
        const color = RATING_COLORS[option];
        html += `
          <button class="rating-btn ${isActive ? 'active' : ''}"
                  style="${isActive ? `background-color: ${color}; border-color: ${color};` : ''}"
                  title="${getRatingTooltip(option)}"
                  onclick="selectRating('${item.label.replace(/'/g, "\\'")}', '${categoryName.replace(/'/g, "\\'")}', '${option}')">
            ${option}
          </button>
        `;
      });

      html += `
          </div>
      `;

      // Text snippet cards (tap to insert)
      if (itemData.rating && ['A - Critical', 'B - Needs Attention', 'C - Serviceable', 'Powered up only', 'Not tested / not verified', 'Not applicable'].includes(itemData.rating)) {
        const baseRating = itemData.rating.charAt(0);
        const variants = findTextVariants(categoryName, item.label, baseRating);

        if (variants.length > 0) {
          const safeLabel = item.label.replace(/'/g, "\\'");
          const safeCat = categoryName.replace(/'/g, "\\'");
          html += `
            <div class="form-group">
              <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
                <span>📋 Quick Insert (${variants.length} snippet${variants.length > 1 ? 's' : ''})</span>
                <button class="btn-secondary" style="font-size:11px;padding:2px 8px;" onclick="toggleSnippets('${safeLabel}')">Show/Hide</button>
              </label>
              <div id="snippets-${item.label.replace(/[^a-zA-Z0-9]/g, '_')}" style="display:none;max-height:300px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
          `;
          variants.forEach((variant, idx) => {
            const preview = variant.text.length > 120 ? variant.text.substring(0, 120) + '…' : variant.text;
            const escapedText = variant.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
            const ratingBadge = variant.rating || baseRating;
            const isActive = itemData.text === variant.text;
            html += `
                <div class="snippet-card" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;cursor:pointer;${isActive ? 'background:#d1fae5;border-left:4px solid #16a34a;' : ''}"
                     onclick="insertSnippet('${safeLabel}', '${safeCat}', '${escapedText}')">
                  <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
                    <span style="font-size:12px;color:#333;line-height:1.4;">${preview}</span>
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
            <textarea id="text-${item.label.replace(/[^a-zA-Z0-9]/g, '_')}" placeholder="Add inspection notes..." style="min-height: 80px;">${itemData.text || ''}</textarea>
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
                       onchange="updateStandards('${item.label.replace(/'/g, "\\'")}', this)" />
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
          <div class="photo-grid" id="photos-${item.label.replace(/'/g, '')}">
      `;

      if (itemData.photos && itemData.photos.length > 0) {
        itemData.photos.forEach(photoId => {
          html += `
            <div class="photo-item" style="position: relative;">
              <img src="" id="thumb-${photoId}" class="photo-thumbnail"
                   onclick="viewPhotoAnnotation('${photoId}')" />
              <button style="position: absolute; top: -8px; right: -8px; width: 28px; height: 28px;
                           border-radius: 50%; background: #dc2626; color: white; border: none;
                           font-weight: bold; cursor: pointer;"
                      onclick="deletePhotoAndRefresh('${photoId}')">×</button>
            </div>
          `;
        });

  // ── Bilge Pump Section (moved from new survey form) ──────────────────────
  html += `
    <div class="category-accordion">
      <button class="accordion-header" onclick="toggleAccordion(this)">
        <span class="category-title">⚙️ Bilge Pumps</span>
        <span style="margin-left: 12px;">▼</span>
      </button>
      <div class="accordion-content" style="display: none;">
        <div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Document each bilge pump installed: location, type, capacity, float switch, and test results.</div>
        <div id="bilgePumpEntries"></div>
        <button class="btn-secondary" style="font-size:12px;padding:6px 12px;margin-top:8px;" onclick="addBilgePumpEntry()">+ Add Bilge Pump</button>
      </div>
    </div>
  `;

      }

      html += `
          </div>
          <label class="btn-photo-upload">
            📷 Capture Photo
            <input type="file" accept="image/*" capture="environment" style="display: none;"
                   onchange="capturePhoto('${item.label.replace(/'/g, "\\'")}', event)" />
          </label>
        </div>
      `;

      // Save and flag buttons
      const isFlagged = itemData.flagged;
      html += `
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn-primary" style="flex:1;"
                  onclick="saveItemData('${item.label.replace(/'/g, "\\'")}', '${categoryName.replace(/'/g, "\\'")}')"
          >Save Item</button>
          <button class="btn-secondary" style="font-size:13px;padding:8px 12px;${isExcluded ? 'background:#fee2e2;border-color:#fca5a5;' : ''}"
                  onclick="toggleExclude('${item.label.replace(/'/g, "\\'")}')"
                  title="Exclude from report"
          >${isExcluded ? '⊘ Excluded' : '⊘ Skip'}</button>
          <button class="btn-secondary" style="font-size:13px;padding:8px 12px;${isFlagged ? 'background:#fef3c7;border-color:#f59e0b;' : ''}"
                  onclick="toggleFlag('${item.label.replace(/'/g, "\\'")}')"
                  title="Flag for follow-up"
          >${isFlagged ? '🚩 Flagged' : '🏳️ Flag'}</button>
        </div>
      `;

      html += `
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  // ── Safety Equipment Section (TP 511) ──────────────────────────────────
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
    html += `
      <div class="rated-item" style="border-left: 4px solid ${eq.checked ? '#16a34a' : '#2563eb'}; padding: 8px 10px; margin-bottom: 8px;">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
          <input type="checkbox" ${checkedAttr}
                 onchange="toggleSafetyItem(${idx}, this.checked)"
                 style="margin-top:3px;width:18px;height:18px;accent-color:#2563eb;" />
          <div style="flex:1;">
            <strong>${eq.name}</strong>
            <span style="display:inline-block;background:#2563eb;color:white;font-size:10px;padding:1px 6px;border-radius:3px;margin-left:6px;">Req: ${eq.requirement}</span>
            ${eq.checked ? '<span style="color:#16a34a;font-weight:bold;margin-left:6px;">✓ On board</span>' : '<span style="color:#dc2626;font-size:11px;margin-left:6px;">Not verified</span>'}
          </div>
        </label>
        <div style="margin-top:4px;margin-left:28px;">
          <input type="text" placeholder="Notes (condition, expiry date, location...)"
                 value="${(eq.notes || '').replace(/"/g, '&quot;')}"
                 onchange="updateSafetyNote(${idx}, this.value)"
                 style="width:100%;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;" />
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  html += `</div>`;
  content.innerHTML = html;

  // Load and display photos
  loadAndDisplayPhotos(survey);

  // Repopulate bilge pump entries if they exist
  if (survey.bilgePumps && survey.bilgePumps.length > 0) {
    survey.bilgePumps.forEach(bp => {
      addBilgePumpEntry();
      const lastEntry = document.querySelectorAll('#bilgePumpEntries > div');
      if (lastEntry.length > 0) {
        const entry = lastEntry[lastEntry.length - 1];
        entry.querySelector('.bilgePumpLocation').value = bp.location || '';
        entry.querySelector('.bilgePumpType').value = bp.type || '';
        entry.querySelector('.bilgePumpMakeModel').value = bp.makeModel || '';
        entry.querySelector('.bilgePumpCapacity').value = bp.capacity || '';
        entry.querySelector('.bilgePumpFloatSwitch').value = bp.floatSwitch || '';
        entry.querySelector('.bilgePumpTested').value = bp.tested || '';
        entry.querySelector('.bilgePumpDischarge').value = bp.discharge || '';
      }
    });
  }

  // Auto-fill single variants
  document.querySelectorAll('[data-auto-fill-item]').forEach(el => {
    const itemLabel = el.getAttribute('data-auto-fill-item');
    const variantText = el.getAttribute('data-variant-text');
    const textareaId = `text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const textarea = document.getElementById(textareaId);
    if (textarea && !textarea.value) {
      textarea.value = variantText;
    }
  });

  // Add floating report preview button
  if (!document.getElementById('reportBtn')) {
    const fab = document.querySelector('.fab');
    if (fab) fab.remove();

    const reportBtn = document.createElement('button');
    reportBtn.id = 'reportBtn';
    reportBtn.style.cssText = 'position:fixed;bottom:calc(20px + env(safe-area-inset-bottom, 0px));right:calc(20px + env(safe-area-inset-right, 0px));background:#1e3a5f;color:white;border:none;border-radius:28px;padding:12px 18px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:100;cursor:pointer;';
    reportBtn.innerHTML = '📄 Preview Report';
    reportBtn.onclick = () => generateReport();
    document.body.appendChild(reportBtn);
  }
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

async function regenerateSafetyChecklist() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;
  const result = generateSafetyChecklist(survey);
  // Preserve checked state for matching items
  const previousMap = {};
  if (survey.safetyEquipment) {
    survey.safetyEquipment.forEach(eq => {
      previousMap[eq.name] = { checked: eq.checked, notes: eq.notes };
    });
  }
  result.checklist.forEach(eq => {
    if (previousMap[eq.name]) {
      eq.checked = previousMap[eq.name].checked;
      eq.notes = previousMap[eq.name].notes;
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

async function capturePhoto(itemLabel, event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const photoId = `${currentSurveyId}_${Date.now()}`;
    const photo = {
      id: photoId,
      surveyId: currentSurveyId,
      itemLabel: itemLabel,
      dataUrl: e.target.result,
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

    // Refresh inspection view
    renderInspection(survey);
  };

  reader.readAsDataURL(file);

  // Reset input
  event.target.value = '';
}

// Capture a documentation photo (HIN plate, compliance plate, etc.)
async function captureDocPhoto(fieldKey, label, event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const photoId = `${currentSurveyId}_doc_${fieldKey}_${Date.now()}`;
    const photo = {
      id: photoId,
      surveyId: currentSurveyId,
      itemLabel: label,
      dataUrl: e.target.result,
      annotated: false,
      isDocPhoto: true,
      docField: fieldKey,
      createdAt: new Date().toISOString()
    };

    await savePhoto(photo);

    // Store the photo ID on the survey object
    const survey = await getSurvey(currentSurveyId);
    // Delete old photo if replacing
    if (survey[fieldKey]) {
      try { await deletePhoto(survey[fieldKey]); } catch(e) {}
    }
    survey[fieldKey] = photoId;
    await saveSurvey(survey);

    // Update UI
    updateDocPhotoPreview(fieldKey, e.target.result);
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

// Remove a documentation photo
async function removeDocPhoto(fieldKey) {
  const survey = await getSurvey(currentSurveyId);
  if (survey[fieldKey]) {
    try { await deletePhoto(survey[fieldKey]); } catch(e) {}
    delete survey[fieldKey];
    await saveSurvey(survey);
  }
  const preview = document.getElementById(fieldKey + 'Preview');
  if (preview) preview.innerHTML = '';
  const status = document.getElementById(fieldKey + 'Status');
  if (status) status.textContent = '';
}

// Update the preview thumbnail for a documentation photo
function updateDocPhotoPreview(fieldKey, dataUrl) {
  const preview = document.getElementById(fieldKey + 'Preview');
  if (preview) {
    preview.innerHTML = `
      <div style="position:relative;display:inline-block;">
        <img src="${dataUrl}" style="max-width:200px;max-height:150px;border:2px solid #ddd;border-radius:6px;" />
        <button style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#dc2626;color:white;border:none;font-weight:bold;cursor:pointer;font-size:14px;"
                onclick="removeDocPhoto('${fieldKey}')">×</button>
      </div>`;
  }
  const status = document.getElementById(fieldKey + 'Status');
  if (status) status.textContent = '✓ Photo captured';
  status.style.color = '#16a34a';
}

// Load documentation photo previews when navigating to the form
async function loadDocPhotoPreview(fieldKey) {
  if (!currentSurveyId) return;
  const survey = await getSurvey(currentSurveyId);
  if (survey && survey[fieldKey]) {
    const photo = await getPhotoById(survey[fieldKey]);
    if (photo && photo.dataUrl) {
      updateDocPhotoPreview(fieldKey, photo.dataUrl);
    }
  }
}

function selectRating(itemLabel, categoryName, rating) {
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].rating = rating;
    survey.items[itemLabel].text = '';
    survey.items[itemLabel].standards = [];
    survey.items[itemLabel].variantText = '';

    saveSurvey(survey).then(() => {
      renderInspection(survey);
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
function insertSnippet(itemLabel, categoryName, text) {
  const safeId = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const textarea = document.getElementById('text-' + safeId);
  if (textarea) {
    // If textarea is empty, replace. If it has content, append with a space.
    if (textarea.value.trim()) {
      textarea.value = textarea.value.trim() + ' ' + text;
    } else {
      textarea.value = text;
    }
    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // Save to survey
  getSurvey(currentSurveyId).then(survey => {
    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }
    survey.items[itemLabel].text = textarea ? textarea.value : text;
    survey.items[itemLabel].variantText = text;
    saveSurvey(survey).then(() => {
      // Highlight the selected snippet card briefly
      const safeLabel = itemLabel.replace(/[^a-zA-Z0-9]/g, '_');
      const panel = document.getElementById('snippets-' + safeLabel);
      if (panel) {
        panel.querySelectorAll('.snippet-card').forEach(card => {
          card.style.background = '';
          card.style.borderLeft = '';
        });
        // Find and highlight the matching card
        // Re-render is not needed — just visual feedback
      }
    });
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
      renderInspection(survey);
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
      renderInspection(survey);
    });
  });
}

// Toggle exclude for all items in a category
function toggleCategoryExclude(categoryName, exclude) {
  getSurvey(currentSurveyId).then(survey => {
    const template = survey.template || {};
    const ratedItemsByCategory = template.ratedItemsByCategory || {};
    const items = ratedItemsByCategory[categoryName] || [];
    items.forEach(item => {
      if (!survey.items[item.label]) {
        survey.items[item.label] = { rating: '', text: '', standards: [], photos: [] };
      }
      survey.items[item.label].excluded = exclude;
    });
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
  getSurvey(currentSurveyId).then(survey => {
    const textareaId = `text-${itemLabel.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const textArea = document.getElementById(textareaId);
    const text = textArea ? textArea.value : '';

    if (!survey.items[itemLabel]) {
      survey.items[itemLabel] = { rating: '', text: '', standards: [], photos: [] };
    }

    survey.items[itemLabel].text = text;

    // Update completed count
    survey.completedCount = Object.values(survey.items)
      .filter(item => item.rating && item.rating !== '' && !item.rating.includes('Not'))
      .length;

    saveSurvey(survey).then(() => {
      alert('Item saved');
    });
  });
}

function toggleAccordion(button) {
  const content = button.nextElementSibling;
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';

  const chevron = button.querySelector('span:last-child');
  chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
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
      for (const itemLabel in survey.items) {
        if (survey.items[itemLabel].photos) {
          survey.items[itemLabel].photos = survey.items[itemLabel].photos.filter(id => id !== photoId);
        }
      }
      saveSurvey(survey).then(() => {
        renderInspection(survey);
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

function deleteSurveyConfirm(surveyId) {
  if (confirm('Delete this survey? This cannot be undone.')) {
    deleteSurvey(surveyId).then(() => {
      renderHome();
    });
  }
}

function backToHome() {
  if (confirm('Go back to home? Make sure you saved your changes.')) {
    renderHome();
  }
}

// Report generation
async function generateReport() {
  const survey = await getSurvey(currentSurveyId);
  if (!survey) return;

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
  let enginePlatePhotoDataUrl = '';
  if (survey.enginePlatePhoto) {
    const p = await getPhotoById(survey.enginePlatePhoto);
    if (p && p.dataUrl) enginePlatePhotoDataUrl = p.dataUrl;
  }

  // ── Pass 1: collect all findings ──────────────────────────────────────
  let findingCount = { A: 0, B: 0, C: 0, NT: 0 };
  let findings = { A: [], B: [], C: [], NT: [] };

  surveyTemplate.forEach(section => {
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
  <title>Kiki Marine — Report of Condition &amp; Value</title>
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
        content: "${esc(survey.vesselName)}";
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
    .item { margin: 12px 0; padding: 8px 10px; border-left: 4px solid #1e3a5f; }
    .standards { font-size: 9pt; color: #666; margin-top: 4px; }
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
    <div style="display:flex;gap:8px;">
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
    <h1 style="font-size: 16pt; border: none; margin-top: 20px; border-bottom: 2px solid #1e3a5f; display: inline-block; padding-bottom: 6px;">Report of Condition &amp; Value<br/>Marine Survey</h1>
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
    <p>A conductivity (moisture) meter measured conductivity in the hull and deck. Readings are relative indicators only and may be influenced by material or surface conditions. High readings are not a certainty of underlying moisture; therefore, careful interpretation and further investigation are recommended.</p>

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
      <tr><td style="vertical-align:top;"><strong>Conductivity Meter</strong></td><td>A non-destructive testing instrument that measures the electrical conductivity of hull and deck laminates to detect elevated moisture levels. Readings are relative indicators only.</td></tr>
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
    <tr><td style="width:40%;"><strong>Type of Survey Requested</strong></td><td>${esc(survey.surveyType)}</td></tr>
    <tr><td><strong>Date of Survey Inspection</strong></td><td>${survey.surveyDate || 'N/A'}</td></tr>
    <tr><td><strong>Date of Report</strong></td><td>${reportDate}</td></tr>
    <tr><td><strong>Vessel Name</strong></td><td>${esc(survey.vesselName)}</td></tr>
    <tr><td><strong>Year/Make/Model</strong></td><td>${esc(survey.yearMakeModel)}</td></tr>
    <tr><td><strong>HIN (Hull Identification Number)</strong></td><td>${esc(survey.hinNumber) || 'N/A'}${hinPhotoDataUrl ? '<br><img src="' + hinPhotoDataUrl + '" alt="HIN Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
    ${(survey.tcLicense || survey.tcLicenseType) ? `<tr><td><strong>TC Licence Type and Number</strong></td><td>${survey.tcLicenseType ? esc(survey.tcLicenseType) + ' — ' : ''}${esc(survey.tcLicense) || 'N/A'}</td></tr>` : ''}
    <tr><td><strong>NMMA/CE/TC Compliance Plate</strong></td><td>${esc(survey.compliancePlate) || 'N/A'}${compliancePhotoDataUrl ? '<br><img src="' + compliancePhotoDataUrl + '" alt="Compliance Plate Photo" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>
    <tr><td><strong>Vessel Material</strong></td><td>${esc(survey.construction) || 'N/A'}</td></tr>
    <tr><td><strong>LOA (Length Overall)</strong></td><td>${esc(survey.loa) || 'N/A'}</td></tr>
    <tr><td><strong>LWL (Length at Waterline)</strong></td><td>${esc(survey.lwl) || 'N/A'}</td></tr>
    <tr><td><strong>Beam</strong></td><td>${esc(survey.beam) || 'N/A'}</td></tr>
    <tr><td><strong>Displacement</strong></td><td>${esc(survey.displacement) || 'N/A'}</td></tr>
    <tr><td><strong>Draft</strong></td><td>${esc(survey.maxDraft) || 'N/A'}</td></tr>
    <tr><td><strong>Location of Survey Inspection</strong></td><td>${esc(survey.location) || 'N/A'}${survey.onLandOrWater ? ' — ' + esc(survey.onLandOrWater) : ''}</td></tr>
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

  <!-- ═══ VESSEL SPECIFICATIONS ═══ -->
  <h2>VESSEL SPECIFICATIONS</h2>
  <table>
    <tr><td style="width:40%;"><strong>Boat Style</strong></td><td>${esc(survey.boatStyle) || 'N/A'}</td></tr>
    <tr><td><strong>Construction</strong></td><td>${esc(survey.construction) || 'N/A'}</td></tr>
    <tr><td><strong>Hull Type</strong></td><td>${esc(survey.hullType) || 'N/A'}</td></tr>
    <tr><td><strong>Keel Type</strong></td><td>${esc(survey.keelType) || 'N/A'}</td></tr>
    <tr><td><strong>LOA</strong></td><td>${esc(survey.loa) || 'N/A'}</td></tr>
    <tr><td><strong>LWL</strong></td><td>${esc(survey.lwl) || 'N/A'}</td></tr>
    <tr><td><strong>Beam</strong></td><td>${esc(survey.beam) || 'N/A'}</td></tr>
    <tr><td><strong>Displacement</strong></td><td>${esc(survey.displacement) || 'N/A'}</td></tr>
    <tr><td><strong>Ballast</strong></td><td>${esc(survey.ballast) || 'N/A'}</td></tr>
    <tr><td><strong>Max Draft</strong></td><td>${esc(survey.maxDraft) || 'N/A'}</td></tr>
    <tr><td><strong>Total Sail Area</strong></td><td>${esc(survey.totalSailArea) || 'N/A'}</td></tr>
    <tr><td><strong>Number of Cabins</strong></td><td>${esc(survey.numberCabins) || 'N/A'}</td></tr>
    <tr><td><strong>Electrical System</strong></td><td>${esc(survey.electricalSystem) || 'N/A'}</td></tr>
    <tr><td><strong>Changes to Original Plan</strong></td><td>${esc(survey.changesToPlan) || 'None noted'}</td></tr>
    ${survey.engineMake ? `<tr><td colspan="2" style="background:#e8edf2;font-weight:bold;">Engine &amp; Transmission</td></tr>` : ''}
    ${survey.engineMake ? `<tr><td><strong>Engine</strong></td><td>${esc(survey.engineMake)} ${esc(survey.engineModel || '')} — SN: ${esc(survey.engineSerial) || 'N/A'}${enginePlatePhotoDataUrl ? '<br><img src="' + enginePlatePhotoDataUrl + '" alt="Engine Data Plate" style="max-width:500px;max-height:350px;margin-top:6px;border:1px solid #ccc;border-radius:4px;" />' : ''}</td></tr>` : ''}
    ${survey.engineHP ? `<tr><td><strong>Power Rating</strong></td><td>${esc(survey.engineHP)}</td></tr>` : ''}
    ${survey.engineHours ? `<tr><td><strong>Engine Hours</strong></td><td>${esc(survey.engineHours)}</td></tr>` : ''}
    ${survey.fuelType ? `<tr><td><strong>Fuel Type</strong></td><td>${esc(survey.fuelType)}</td></tr>` : ''}
    ${survey.transmissionMakeModel ? `<tr><td><strong>Transmission</strong></td><td>${esc(survey.transmissionMakeModel)} — SN: ${esc(survey.transmissionSerial) || 'N/A'}</td></tr>` : ''}
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
  surveyTemplate.forEach(section => {
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
      html += `<tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${esc(eq.name)}</td>
        <td style="text-align:center;">${esc(eq.requirement)}</td>
        <td style="text-align:center;font-weight:bold;color:${statusColor};">${statusText}</td>
        <td style="font-size:9pt;">${esc(eq.category)}</td>
        <td style="font-size:9pt;">${esc(eq.notes || '—')}</td>
      </tr>`;
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

  surveyTemplate.forEach(section => {
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

          html += `
  <div class="item" style="border-left-color: ${RATING_COLORS[ratingLabel] || '#1e3a5f'};">
    <p><strong>${esc(item.label)}</strong>${ratingLabel ? ` — <span class="${ratingClass}">${ratingLabel}</span>${codeTag}` : ''}</p>
    ${itemData.text ? `<p>${esc(itemData.text)}</p>` : ''}
    ${itemData.standards && itemData.standards.length > 0 ? `<p class="standards"><strong>Applicable Standards:</strong> ${itemData.standards.join(', ')}</p>` : ''}
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

  // Type A findings
  html += `<h3 style="color:#dc2626;">Findings &amp; Recommendations (Type A — Critical / Safety)</h3>`;
  if (findings.A.length === 0) {
    html += `<p>No Type A findings.</p>`;
  } else {
    findings.A.forEach(f => {
      html += `<div class="finding-section">
        <strong style="color:#dc2626;">Finding ${f.code}</strong> — ${esc(f.label)}
        ${f.text ? `<p>${esc(f.text)}</p>` : ''}
        ${f.standards && f.standards.length ? `<p class="standards"><em>Standards: ${f.standards.join(', ')}</em></p>` : ''}
        <p style="font-style:italic;color:#555;margin-top:4px;"><strong>Recommendation:</strong> Immediate correction required before the vessel is next underway. This finding represents a direct safety risk or code violation.</p>
      </div>`;
    });
  }

  // Type B findings
  html += `<h3 style="color:#d97706;">Findings &amp; Recommendations (Type B — Needs Attention)</h3>`;
  if (findings.B.length === 0) {
    html += `<p>No Type B findings.</p>`;
  } else {
    findings.B.forEach(f => {
      html += `<div class="finding-section">
        <strong style="color:#d97706;">Finding ${f.code}</strong> — ${esc(f.label)}
        ${f.text ? `<p>${esc(f.text)}</p>` : ''}
        ${f.standards && f.standards.length ? `<p class="standards"><em>Standards: ${f.standards.join(', ')}</em></p>` : ''}
        <p style="font-style:italic;color:#555;margin-top:4px;"><strong>Recommendation:</strong> Schedule repairs in the near future to maintain compliance with applicable codes, regulations, standards, or recommended practices.</p>
      </div>`;
    });
  }

  // Type C findings
  html += `<h3 style="color:#16a34a;">Findings &amp; Recommendations (Type C — Serviceable / General Notes)</h3>`;
  if (findings.C.length === 0) {
    html += `<p>No Type C findings.</p>`;
  } else {
    findings.C.forEach(f => {
      html += `<div class="finding-section">
        <strong style="color:#16a34a;">Finding ${f.code}</strong> — ${esc(f.label)}
        ${f.text ? `<p>${esc(f.text)}</p>` : ''}
        ${f.standards && f.standards.length ? `<p class="standards"><em>Standards: ${f.standards.join(', ')}</em></p>` : ''}
        <p style="font-style:italic;color:#555;margin-top:4px;"><strong>Recommendation:</strong> Address in keeping with good marine maintenance practices or as an upgrade when convenient.</p>
      </div>`;
    });
  }

  // Not tested items
  if (findings.NT.length > 0) {
    html += `<h3 style="color:#6b7280;">Not Tested / Not Verified</h3>`;
    findings.NT.forEach(f => {
      html += `<div class="finding-section">
        <strong style="color:#6b7280;">Finding ${f.code}</strong> — ${esc(f.label)}
        ${f.text ? `<p>${esc(f.text)}</p>` : ''}
        <p style="font-style:italic;color:#555;margin-top:4px;"><strong>Note:</strong> A comprehensive inspection was attempted but was not possible due to constraints imposed upon the surveyor. Further inspection is recommended when conditions permit.</p>
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
  <p class="scope-text">${esc(survey.valuationRationale) || 'Based on the condition of the vessel as surveyed, comparable sales data from BUCValu, soldboats.com, yachtworld.com, and current market conditions.'}</p>

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
    <p><strong>Appraisal Methodology:</strong> ${esc(survey.valuationRationale) || 'Based on the condition of the vessel as surveyed, comparable sales data from BUCValu, soldboats.com, yachtworld.com, and current market conditions.'}</p>
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
    var vesselName = document.title.split('—')[1] ? document.title.split('—')[1].trim().split('—')[0].trim() : 'Vessel';
    var dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = 'Kiki_Marine_Survey_' + vesselName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + dateStr + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    alert('Export failed: ' + e.message);
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

  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write(html);
    reportWindow.document.close();
  } else {
    alert('Popup blocked — please allow popups for this site and try again.');
  }
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

    await initDB();
    await fetchDataFiles();
    renderHome();
  } catch (e) {
    console.error('Init error:', e);
    document.getElementById('app').innerHTML = `<div style="padding: 20px; color: red;">Error initializing app: ${e.message}</div>`;
  }
}

// Start app when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
