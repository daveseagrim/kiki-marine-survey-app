// ============================================================================
// Riverdance Photo Import Script
// Paste this entire script into Chrome DevTools console while the Kiki Marine
// Survey PWA is open. It will prompt you to select the "riverdance-all-photos"
// folder, then import all photos into the correct survey checklist items.
// ============================================================================

(async function importRiverdancePhotos() {
  'use strict';

  // ── Verify we have access to the app's globals ──────────────────────────
  if (typeof db === 'undefined') {
    console.error('[IMPORT] Global "db" not found. Make sure the PWA is fully loaded.');
    return;
  }
  if (typeof savePhoto !== 'function' || typeof saveSurvey !== 'function' || typeof getSurvey !== 'function') {
    console.error('[IMPORT] Required functions (savePhoto, saveSurvey, getSurvey) not found.');
    return;
  }

  // ── Find the Riverdance survey ──────────────────────────────────────────
  console.log('[IMPORT] Looking for Riverdance survey...');
  const allSurveys = await getAllSurveys();
  const survey = allSurveys.find(s =>
    s.vesselName && s.vesselName.toLowerCase().includes('riverdance')
  );
  if (!survey) {
    console.error('[IMPORT] No survey found with vesselName containing "Riverdance".');
    console.log('[IMPORT] Available surveys:', allSurveys.map(s => s.vesselName));
    return;
  }
  const surveyId = survey.id;
  console.log(`[IMPORT] Found survey: "${survey.vesselName}" (ID: ${surveyId})`);

  // ── Ensure survey.items exists ──────────────────────────────────────────
  if (!survey.items) survey.items = {};

  // ── Helper: ensure an item entry exists in survey.items ─────────────────
  function ensureItem(label) {
    if (!survey.items[label]) {
      survey.items[label] = { rating: '', text: '', standards: [], photos: [], flagged: false, excluded: false };
    }
    if (!Array.isArray(survey.items[label].photos)) {
      survey.items[label].photos = [];
    }
  }

  // ── Helper: generate unique photo ID ────────────────────────────────────
  function makePhotoId() {
    return `${surveyId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  }

  // ── Helper: read a file as data URL ─────────────────────────────────────
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // ── Helper: check if a filename matches a pattern (case-insensitive) ────
  function fnMatch(filename, pattern) {
    return filename.toLowerCase().includes(pattern.toLowerCase());
  }

  // ── FOLDER-TO-ITEM MAPPING ─────────────────────────────────────────────
  // Simple folders: entire folder maps to one or two checklist items.
  // Complex folders: need filename-based sub-mapping (handled separately).

  const SIMPLE_FOLDER_MAP = {
    'riverdance, anti-fouling below waterline': ['Primer, barrier coat, anti-fouling'],
    'riverdance, bow roller': ['Bow roller'],
    'riverdance, cutlass bearing': ['Cutlass bearing(s)'],
    'riverdance, deck aft': ['Aft deck photos'],
    'riverdance, deck aft conductivity': ['Conductivity testing'],
    'riverdance, deck coachroof and pilot house': ['Deck and coachroof photos'],
    'riverdance, deck condition': ['Deck and coachroof condition (spider cracks, etc.)'],
    'riverdance, deck conductivity': ['Deck and coachroof conductivity testing'],
    'riverdance, deck percussion': ['Deck and coachroof impact and resonance testing'],
    'riverdance, exhaust ports': ['Exhaust discharge position and condition'],
    'riverdance, generator': ['Generator (if installed)'],
    'riverdance, hull above waterline': ['Hull exterior above the waterline'],
    'riverdance, hull and ruddeer percussion testing': ['Hull and rudder(s) (if applicable) impact and resonance testing'],
    'riverdance, hull conductivity': ['Hull and rudder(s) (if applicable) conductivity testing'],
    'riverdance, mooring cleats': ['Mooring cleats and chocks'],
    'riverdance, prop shafts': ['Propeller shaft(s)'],
    'riverdance, propellers': ['Propeller(s)'],
    'riverdance, pulpit': ['Pulpit'],
    'riverdance, rub rail': ['Rub rail'],
    'riverdance, rudders': ['Rudder(s) condition'],
    'riverdance, through hulls': ['Through-hulls, strainers'],
    'riverdance, water plumbing': ['Fresh water tank(s) and plumbing'],
    'riverdance, windows portholes doors': ['Hull side windows and portholes (exterior observations)'],
  };

  // Anchor folder — map by filename
  const ANCHOR_FOLDER = 'riverdance, anchor and locker';
  function mapAnchorFile(fn) {
    if (fnMatch(fn, 'locker')) return 'Anchor locker';
    return 'Primary anchor, chain and rode';
  }

  // ── COMPLEX FOLDER MAPPINGS (filename-based) ───────────────────────────

  function mapCabinFile(fn) {
    if (fnMatch(fn, 'cabin floor') || fnMatch(fn, 'cabin sole')) return 'Cabin sole';
    if (fnMatch(fn, 'cabin lighting')) return 'Interior lighting';
    if (fnMatch(fn, 'cabin window')) return 'Cabin windows and hatches (interior observations)';
    if (fnMatch(fn, 'galley sink') || fnMatch(fn, 'kitchen sink drain')) return 'Sink, faucet and drain (galley)';
    if (fnMatch(fn, 'refrigerator')) return 'Refrigerator/freezer';
    if (fnMatch(fn, 'stove')) return 'Stove';
    if (fnMatch(fn, 'galley')) return 'Cabin and conveniences photos'; // generic galley after specific
    // Default: cabin photos, cabin ceiling, cabin storage, microwave, television, etc.
    return 'Cabin and conveniences photos';
  }

  function mapElectricalFile(fn) {
    if (fnMatch(fn, '120v panel') || fnMatch(fn, '120V panel')) return 'Distribution panel 120V';
    if (fnMatch(fn, '12v panel') || fnMatch(fn, '12V panel')) return 'Distribution panel 12V';
    if (fnMatch(fn, 'battery switch')) return 'Battery selector switch, combiner, VSR';
    if (fnMatch(fn, 'charger')) return 'Battery charger';
    if (fnMatch(fn, 'bundling')) return 'Bundling support and wiring';
    if (fnMatch(fn, 'hot water tank')) return 'Hot water tank(s), plumbing and electrical';
    if (fnMatch(fn, 'shore power cable')) return 'Shore power cable(s)';
    if (fnMatch(fn, 'shore power connection') || fnMatch(fn, 'shore power receptacle')) return 'Shore power receptacle';
    if (fnMatch(fn, 'battery')) return 'Battery(ies), house'; // generic battery after battery switch
    return null; // unmapped — will log warning
  }

  function mapFlybridgeFile(fn) {
    if (fnMatch(fn, 'flybridge seating') || fnMatch(fn, 'flybridge seat')) return 'Flybridge Seating';
    if (fnMatch(fn, 'flybridge instrument')) return 'Gauges and instrumentation photos';
    if (fnMatch(fn, 'flybridge vhf')) return 'VHF radio and antenna';
    if (fnMatch(fn, 'flybridge depth sounder') || fnMatch(fn, 'flybridge depth')) return 'Depth sounder';
    if (fnMatch(fn, 'flybridge flooring') || fnMatch(fn, 'flybridge floor')) return 'Flybridge floor, seats and coaming (spider cracks, etc.)';
    if (fnMatch(fn, 'flybridge ladder') || fnMatch(fn, 'flybridge staircase')) return 'Flybridge ladder/staircase';
    if (fnMatch(fn, 'flybridge lighting') || fnMatch(fn, 'flybridge light')) return 'Flybridge lighting';
    if (fnMatch(fn, 'flybridge steering')) return 'Flybridge steering wheel, steering';
    if (fnMatch(fn, 'flybridge storage')) return 'Flybridge Storage locker(s)';
    // Default: flybridge compass, ceiling, generic flybridge photos
    return 'Flybridge photos';
  }

  function mapHeadFile(fn) {
    if (fnMatch(fn, 'head sink') || fnMatch(fn, 'head faucet')) return 'Head, faucet, sink and drain';
    if (fnMatch(fn, 'head toilet')) return 'Head, toilet and seacock';
    return 'Head photos';
  }

  function mapPropulsionFile(fn) {
    if (fnMatch(fn, 'anti-vibration') || fnMatch(fn, 'antivibration')) return 'Anti-vibration mounts';
    if (fnMatch(fn, 'cooling')) return 'Coolant level and quality';
    if (fnMatch(fn, 'engine belt') || fnMatch(fn, 'belt')) return 'Belts and pulleys';
    if (fnMatch(fn, 'engine hours') || fnMatch(fn, 'engine hour')) return 'Engine hours';
    if (fnMatch(fn, 'engine name plate') || fnMatch(fn, 'engine nameplate')) return 'Engine name plate(s)';
    if (fnMatch(fn, 'engine oil') || fnMatch(fn, 'oil level')) return 'Oil level and condition';
    if (fnMatch(fn, 'exhaust')) return 'Exhaust condition';
    if (fnMatch(fn, 'gearbox') || fnMatch(fn, 'geabox') || fnMatch(fn, 'transmission')) return 'Gearbox general condition/impressions';
    if (fnMatch(fn, 'manual fuel pump') || fnMatch(fn, 'fuel filter')) return 'Fuel filter(s) and water separator(s)';
    if (fnMatch(fn, 'sea strainer') || fnMatch(fn, 'raw water strainer')) return 'Cooling water intake seacock(s) and strainer(s)';
    if (fnMatch(fn, 'stuffing box') || fnMatch(fn, 'packing gland') || fnMatch(fn, 'dripless seal')) return 'Drive coupling(s), interior propeller shaft(s), stuffing box(es)/packing gland(s)/dripless seal(s), interior stern tube(s)';
    if (fnMatch(fn, 'engine')) return 'Engine(s) and drive(s) photos'; // generic engine after specifics
    return null; // unmapped
  }

  function mapTanksFile(fn) {
    if (fnMatch(fn, 'fuel tank')) return 'Fuel tank(s)';
    if (fnMatch(fn, 'hot water tank')) return 'Hot water tank(s), plumbing and electrical';
    if (fnMatch(fn, 'black water')) return 'Black water tank(s) and plumbing';
    if (fnMatch(fn, 'water tank') || fnMatch(fn, 'fresh water')) return 'Fresh water tank(s) and plumbing';
    return null; // unmapped
  }

  function mapSafetyRailFile(fn) {
    if (fnMatch(fn, 'stanchion')) return 'Stanchions';
    return 'Lifelines/safety rail';
  }

  // Map of complex folder names (lowercase) to their mapping functions
  const COMPLEX_FOLDER_MAP = {
    'riverdance, cabin and conveniences': mapCabinFile,
    'riverdance, electrical': mapElectricalFile,
    'riverdance, flybridge': mapFlybridgeFile,
    'riverdance, head': mapHeadFile,
    'riverdance, propulsion engine transmission exhaust gearbox stuffing coolant oil belts': mapPropulsionFile,
    'riverdance, tanks': mapTanksFile,
    'riverdance, safety rail and stanchions': mapSafetyRailFile,
  };

  // Folders to skip entirely
  const SKIP_FOLDERS = new Set([
    'riverdance, safety',           // safety equipment — different data model
    'riverdance, intro vessel pictures', // cover photos — no checklist item
  ]);

  // Standalone registration file
  const REGISTRATION_PATTERN = 'riverdance registration';

  // ── Image file extensions ───────────────────────────────────────────────
  const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'bmp', 'tiff', 'tif']);

  function isImageFile(name) {
    const ext = name.split('.').pop().toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  }

  // ── Use File System Access API to pick the folder ───────────────────────
  let rootHandle;
  if (typeof window.showDirectoryPicker === 'function') {
    try {
      rootHandle = await window.showDirectoryPicker({ mode: 'read' });
      console.log(`[IMPORT] Selected folder: ${rootHandle.name}`);
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[IMPORT] Folder selection cancelled.');
        return;
      }
      throw e;
    }
  } else {
    console.error('[IMPORT] window.showDirectoryPicker() not available. Use desktop Chrome.');
    return;
  }

  // ── Recursively collect all files from the directory ─────────────────────
  // Returns array of { file: File, path: string, folderName: string }
  async function collectFiles(dirHandle, parentPath) {
    const results = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory') {
        const subResults = await collectFiles(handle, parentPath ? `${parentPath}/${name}` : name);
        results.push(...subResults);
      } else if (handle.kind === 'file' && isImageFile(name)) {
        const file = await handle.getFile();
        // folderName is the immediate parent directory name (or '' for root files)
        const folderName = parentPath || '';
        results.push({ file, fileName: name, folderName, path: parentPath ? `${parentPath}/${name}` : name });
      }
    }
    return results;
  }

  console.log('[IMPORT] Scanning folder structure...');
  const allFiles = await collectFiles(rootHandle, '');
  console.log(`[IMPORT] Found ${allFiles.length} image files total.`);

  // ── Process each file ──────────────────────────────────────────────────
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let unmapped = 0;
  const unmappedFiles = [];
  const skippedSafetyFiles = [];
  const skippedIntroFiles = [];

  for (let i = 0; i < allFiles.length; i++) {
    const { file, fileName, folderName, path } = allFiles[i];
    // Use the last path segment as folder name for matching
    // (handles both "Riverdance, flybridge" and "riverdance-all-photos/Riverdance, flybridge")
    const lastFolder = folderName.includes('/') ? folderName.split('/').pop() : folderName;
    const folderLower = lastFolder.toLowerCase();
    const fileNameLower = fileName.toLowerCase();

    // Progress logging every 10 files
    if (i % 10 === 0) {
      console.log(`[IMPORT] Processing ${i + 1} / ${allFiles.length}...`);
    }

    // ── Determine the target checklist item label ─────────────────────
    let targetLabels = null; // array of labels this photo maps to

    // Check if this is a standalone registration file (at root or one level deep)
    if (fileNameLower.includes('riverdance registration') || fileNameLower.includes('registration')) {
      // Registration photo — this is vessel documentation
      // Store as a doc photo or skip with note
      console.log(`[IMPORT] Found registration file: ${fileName} — skipping (add via app as vessel documentation photo)`);
      skipped++;
      continue;
    }

    // Check if folder should be skipped
    if (SKIP_FOLDERS.has(folderLower)) {
      if (folderLower.includes('safety')) {
        skippedSafetyFiles.push(path);
      } else {
        skippedIntroFiles.push(path);
      }
      skipped++;
      continue;
    }

    // Check simple folder map
    if (SIMPLE_FOLDER_MAP[folderLower]) {
      targetLabels = SIMPLE_FOLDER_MAP[folderLower];
    }
    // Check anchor folder (filename-based split)
    else if (folderLower === ANCHOR_FOLDER) {
      targetLabels = [mapAnchorFile(fileNameLower)];
    }
    // Check complex folder map (filename-based sub-mapping)
    else if (COMPLEX_FOLDER_MAP[folderLower]) {
      const mapFn = COMPLEX_FOLDER_MAP[folderLower];
      const label = mapFn(fileNameLower);
      if (label) {
        targetLabels = [label];
      } else {
        console.warn(`[IMPORT] UNMAPPED file in complex folder: ${path}`);
        unmappedFiles.push(path);
        unmapped++;
        continue;
      }
    }
    // Root-level files without a folder
    else if (!folderName) {
      console.warn(`[IMPORT] Root-level file with no folder mapping: ${path}`);
      unmappedFiles.push(path);
      unmapped++;
      continue;
    }
    // Unknown folder
    else {
      console.warn(`[IMPORT] Unknown folder "${folderName}" — file: ${path}`);
      unmappedFiles.push(path);
      unmapped++;
      continue;
    }

    // ── Read the file as data URL ─────────────────────────────────────
    let dataUrl;
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch (e) {
      console.error(`[IMPORT] Error reading file ${path}:`, e);
      errors++;
      continue;
    }

    // ── Save photo and link to each target item ───────────────────────
    for (const label of targetLabels) {
      const photoId = makePhotoId();
      const photo = {
        id: photoId,
        surveyId: surveyId,
        itemLabel: label,
        dataUrl: dataUrl,
        annotated: false,
        createdAt: new Date().toISOString()
      };

      try {
        await savePhoto(photo);
      } catch (e) {
        console.error(`[IMPORT] Error saving photo ${path} -> "${label}":`, e);
        errors++;
        continue;
      }

      // Link photo ID to the survey item
      ensureItem(label);
      if (!survey.items[label].photos.includes(photoId)) {
        survey.items[label].photos.push(photoId);
      }

      imported++;

      // Small delay every 25 photos to avoid overwhelming IndexedDB
      if (imported % 25 === 0) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
  }

  // ── Save the survey with all photo links ────────────────────────────────
  console.log('[IMPORT] Saving survey with all photo links...');
  try {
    await saveSurvey(survey);
    console.log('[IMPORT] Survey saved successfully.');
  } catch (e) {
    console.error('[IMPORT] ERROR saving survey:', e);
  }

  // ── Final report ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  RIVERDANCE PHOTO IMPORT — COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Photos imported:    ${imported}`);
  console.log(`  Files skipped:      ${skipped}`);
  console.log(`  Unmapped files:     ${unmapped}`);
  console.log(`  Errors:             ${errors}`);
  console.log(`  Total files found:  ${allFiles.length}`);
  console.log('═══════════════════════════════════════════════════');

  if (skippedSafetyFiles.length > 0) {
    console.log(`\n[IMPORT] Skipped ${skippedSafetyFiles.length} SAFETY EQUIPMENT photos (add manually via the app):`);
    skippedSafetyFiles.forEach(f => console.log(`  - ${f}`));
  }

  if (skippedIntroFiles.length > 0) {
    console.log(`\n[IMPORT] Skipped ${skippedIntroFiles.length} INTRO/COVER photos:`);
    skippedIntroFiles.forEach(f => console.log(`  - ${f}`));
  }

  if (unmappedFiles.length > 0) {
    console.log(`\n[IMPORT] ${unmappedFiles.length} UNMAPPED files (no matching checklist item):`);
    unmappedFiles.forEach(f => console.log(`  - ${f}`));
  }

  // Show which items received photos
  const itemsWithPhotos = Object.entries(survey.items)
    .filter(([, v]) => v.photos && v.photos.length > 0)
    .sort((a, b) => b[1].photos.length - a[1].photos.length);
  console.log(`\n[IMPORT] Items with photos (${itemsWithPhotos.length} items):`);
  itemsWithPhotos.forEach(([label, item]) => {
    console.log(`  ${item.photos.length.toString().padStart(3)} photos — ${label}`);
  });

  console.log('\n[IMPORT] Done! Reload the survey to see photos in the checklist.');

})();
