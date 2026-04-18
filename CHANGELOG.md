# Changelog

All notable changes to the Kiki Marine Survey PWA are documented here.

Each entry is grouped under a version number. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Version numbers match
`APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.

When making any user-visible change, add an entry here **before** pushing
the commit. This gives future-you a searchable history of decisions, and
lets you roll back to a specific version with confidence.

---

## v2371 — 2026-04-18
### Added
- **Check Survey now flags duplicate photos.** Dave noticed the report sometimes felt photo-heavy and suspected the same image was being attached to multiple places (same photo imported twice, same shot dragged onto two items, camera fires twice and both land, etc.). Preflight now scans every photo on the survey — checklist items, safety equipment, instruments/electronics, HIN plate, compliance plate, cover photo, TC licence, four-corner overview, engine and transmission photos — computes a SHA-256 digest of each photo's dataUrl, groups by digest, and any bucket with two or more photos is reported as a warning under a new **"Duplicate Photos"** category. The warning body reads `Same photo appears in N places: <Location A> • <Location B> • ...`, and the Go button (when navigable) jumps to the first item-based location so Dave can review and delete the extras.
- Match criterion is **exact pixel match** only (byte-identical dataUrl). This guarantees zero false positives — two legitimately similar but distinct photos (e.g., two different bilge pumps shot from similar angles) will never be flagged. Perceptual / near-identical matching was considered and rejected because the false-positive cost on a survey that contains, say, eight engine-compartment shots is too high.
- Runs inside the existing `checkSurvey()` async flow, after the current photo-ref collection pass, in parallel via `Promise.all` for speed. Per-photo load failures are tolerated (a missing photo record just gets skipped rather than aborting the scan), and the whole duplicate pass is guarded in a try/catch so a crypto-subtle-missing environment silently skips duplicate detection without breaking the rest of preflight.

---

## v2370 — 2026-04-18
### Changed
- **Report photos are now 10% smaller across the board — new standard.** The `.report-photo` CSS class drops from the previous 260×195 baseline (established in v2227) down to **234×176 px**. `.report-photo-card` width drops from 260 → 234 to match. This change applies uniformly everywhere photos render in the generated report body: per-item inspection photos, findings photos, safety-equipment photos, instrument-panel photos, nameplates, HIN and compliance plates, and the four-corner overview grid. Aspect ratio (4:3) is preserved so photos taken in portrait/landscape don't squash; `object-fit: cover` continues to handle non-4:3 source photos cleanly. Net effect: tighter page layout, fewer awkward wraps across grid rows, a few more photos fit per page in the Findings section. No code change required at any photo call site — all inserts go through the shared `.report-photo` class, so every current and future photo location picks up the new size automatically.

---

## v2369 — 2026-04-18
### Fixed
- **Report generation's "Date integrity issue" modal suggested a remedy that doesn't actually remedy anything.** The modal fires when any photo's capture timestamp (decoded from the photo record's ID — `Date.now()` embedded at photo creation) is later than the survey's declared certification date. The old modal text listed two options, one of which was: "Use 'Remove Date Stamps' from the overflow menu." That was misleading on two counts:
  1. Since v2362 new photos no longer have date stamps burned into them at all, so the "Remove Date Stamps" feature is rapidly becoming irrelevant for active use — it only matters for legacy photos captured before v2362.
  2. More importantly, the batch only strips *visual* pixel overlays off the JPEG. It never touches the photo record's `createdAt` or the `Date.now()` portion of the photo ID, which are exactly what this check is comparing against. So running that batch would dismiss zero "Date integrity" warnings. The integrity check is a pure timestamp comparison: `latestPhotoMs > _certifiedEnd`.
- Replaced the two-bullet Options block with a single clear sentence: "The only fix is to update the survey date to match your most recent photos, or generate anyway and explain the discrepancy in the cover letter." Same two action buttons (Go Back and Fix / Generate Anyway); just the body copy is clarified.

---

## v2368 — 2026-04-18
### Fixed / Removed
- **Survey Report: two broken Print/PDF buttons reduced to one working button.** Two problems, both printing-related:
  1. **Parent-page top-right green "Print/PDF" button was only emitting page 1.** The report renders inside an iframe (`#reportFrame`) under a fixed parent header. That top-right button called `window.print()` on the *parent* window — so the browser's print pipeline treated the iframe as one element on the parent page and sent only the parent's current visible area to the printer. Result: page 1 prints, the rest of the report vanishes. **Fix: removed that button entirely** — the inside-iframe toolbar already has a Print / PDF button and a Word export, so the parent-header button was redundant.
  2. **Inside-iframe "Print / PDF" button wasn't triggering any print dialog.** The iframe was declared with `sandbox="allow-same-origin allow-scripts"` — without the `allow-modals` token, browsers block `window.print()` (and `alert`/`confirm`) calls from inside the sandboxed frame. So the button click fired, the handler executed, but the print dialog was silently suppressed. **Fix (two parts):**
     - Added `allow-modals` and `allow-popups` to the iframe sandbox so the print dialog isn't suppressed.
     - Belt-and-braces: the inside button now calls a new `window.printReportIframe()` helper on the parent (which targets `iframe.contentWindow.print()` directly), with a fallback to the original `window.print()` if the parent call fails. That sidesteps any residual sandbox suppression on older iOS Safari and makes the call context explicit about which document to print.
- Result: users now have exactly one Print / PDF button (inside the iframe's blue toolbar, next to Back to Inspection, Download as Word, and Prose Mode), and it prints the full multi-page report — not just page 1.

---

## v2367 — 2026-04-18
### Fixed
- **Check Survey (preflight) was flagging just-rated C items as "C rated but no notes" when notes had in fact been typed.** The bug was a save-order race: inspection-view textareas persist via the textarea's `onblur` → `autoSaveItemText()` handler, but if the user tapped the floating Check Survey button while a textarea was still focused (keyboard still up on iPhone), the click fired before the blur event completed — so the latest keystrokes never made it into IndexedDB. `checkSurvey()` then called `getSurvey()`, read the pre-edit snapshot with `data.text === ''`, hit the `baseRating === 'C' && !data.text` guard (app.js line 13935), and added a "Missing Notes" warning even though the notes were visibly on-screen. Same mechanism affected A/B ratings (line 13928) and the unreplaced-placeholder check (line 13940) — any preflight path that inspects `data.text` was reading stale data.
- Fix: call `saveAllInspectionData()` at the top of `checkSurvey()`, right after the Edit Intro view's `saveEditFormSilently()` branch and before the `getSurvey()` read. `saveAllInspectionData()` walks every `textarea[id^="text-"]`, matches each back to its survey item by sanitised label, and copies `.value` onto `survey.items[label].text` (plus persists bilge pumps and comparables). It's a safe no-op when there are no textareas present (the forEach loop simply doesn't execute), so the edit-view path and any future entry points are unaffected. Typeof-guarded so a very early call (before the function is defined) won't throw; wrapped in try/catch so any persistence error in pending edits can't block the preflight from running.
- Same race condition was latent on every report-generation path that reads `survey.items[*].text` — those already call `saveAllInspectionData()` directly (app.js line 20374 / 20393), which is why reports have always shown the right text but preflight didn't. This change brings preflight in line with the report path.

---

## v2366 — 2026-04-18
### Added
- **Safety Equipment section now accepts drag-and-drop and Import photos, matching the rest of the checklist.** Previously the TC TP 511 Safety Equipment items had only the 📷 camera button — the "Import photos from Library or Files" flow and the desktop drag-and-drop-from-Finder flow were both unavailable for safety items, so any photos originating from an existing library (e.g., a backup of a prior survey, or photos captured on a camera and transferred via AirDrop) had to be re-captured one by one. Two changes:
  1. **Import button** added next to each safety item's camera button. Opens the OS file picker in multi-select mode (same picker that the regular checklist items use via `importPhotosForItem`). HEIC files are converted to JPEG automatically via the existing `heicToJpegDataUrl` helper.
  2. **Drag-and-drop from Finder/Explorer** extended to safety items. Each safety row is now wrapped in `.safety-item-wrapper[data-safety-idx]`, and the shared `setupChecklistDragDrop()` event-delegation handler routes drops to a new `attachPhotosToSafetyItem(idx, fileList)` function instead of the regular `attachPhotosToItem(itemLabel, fileList)`. Skipped safety items (marked with `data-safety-skipped="1"`) are excluded from the valid-target check so a user can't accidentally dump photos onto a skipped row.
- Thumbnail grid and the 📷 count badge are updated in-place after import/drop — no full re-render needed, so the user keeps their scroll position in the Safety Equipment accordion.
- Photos saved this way get IDs prefixed `safety_` (matches the existing convention from `captureSafetyPhoto` → `openBatchCamera`), are stored under `survey.safetyEquipment[idx].photos[]`, and inherit the safety item's `name` as their `itemLabel` so report generation and photo-move flows can look them up consistently.
- Shared visual treatment: same `drag-target` outline/background (dashed #066aab border, #eff6ff fill) as the regular checklist items, wired up via a new `.safety-item-wrapper.drag-target` CSS rule in index.html.

---

## v2365 — 2026-04-18
### Fixed
- **`Remove Date Stamps` was running without error but stamps were still visible in photos.** After v2364 unblocked the function (the `openDatabase` ReferenceError), the batch ran through all photos and showed the completion toast, but stamps on Dave's real photos were still there. Isolated unit tests showed the structural-signature detection (darkPct > 30 AND brightPct > 1.5) correctly identified stamped canvas-drawn photos across every tested background, but something about Dave's real-world photos — HEIC→JPEG colour shifts, EXIF rotation side effects, or edge-of-stamp JPEG bleed from multiple compression rounds — was keeping the detection from firing.
- Rather than chase whatever subtle difference was defeating the heuristic, **the user-triggered batch now force-strips every photo unconditionally** (the detection logic is only kept as a safety guard for the automatic report-render auto-strip, which runs on every photo including ones that may never have been stamped). The justification: the "Remove Date Stamps" tool is behind a "This cannot be undone. Continue?" confirmation — the user has explicitly opted in. Photos without stamps will get a ~65 × ~290 px region in the bottom-right replaced with a vertical smear of the row directly above it, which is typically invisible on mechanical survey photos (engines, hulls, bilges tend to have uniform regions there).
- Signature change: `removeDateStampFromPhoto(dataUrl, opts)` now accepts an options object `{ force?: boolean, returnStats?: boolean }`. Backwards-compatible — callers passing just a `dataUrl` get the original behaviour (detection-based stripping, returns a string). The report auto-strip path is unchanged.
- **Added diagnostic stats to the batch toast.** The completion message now reports how many photos were "detected" (structural signature fired) vs "force-stripped" (force mode stepped in because detection missed). If that shows 0 detected out of N, we know the detection thresholds need tuning for real-world photos. The first 5 photos' detection stats (darkPct, brightPct) are also logged to console for inspection.

---

## v2364 — 2026-04-18
### Fixed
- **`Remove Date Stamps` tool was throwing a ReferenceError and aborting before any photo was processed.** `removeAllDateStamps()` called `const db = await openDatabase();` — but no function named `openDatabase` is defined anywhere in the codebase. The global `db` is set once by `initDB()` at app startup (app.js line 97). The line threw `ReferenceError: openDatabase is not defined` on the very first call, the try/catch blocks in the per-photo loop never got a chance to catch it (the error was at the loop's preamble), and the whole batch bailed with no toast and no visible effect. This bug has been present since v2238 when the feature was added — every tap of the button for ~125 versions has been a silent no-op. That is the real reason date stamps persisted through v2362 and v2363; the detection-logic fixes in those versions were both correct but the function they lived inside was never reached. Fix: remove the `const db = await openDatabase();` line so the IDB transactions use the global `db` directly (same pattern every other function in the file uses).

---

## v2363 — 2026-04-18
### Fixed
- **"Remove Date Stamps" was silently skipping every photo with a bright background.** v2362 fixed the removal rectangle's geometry but kept the old stamp-detection rule: "strip only if the average brightness in the stamp region is below 100". That rule is wrong on any photo with a light bottom-right corner — which is most boat photos (white hulls, cabin bulkheads, headliners, sky). The math: the stamp's `rgba(0,0,0,0.7)` background alpha-blends to `0.3 × original_brightness`, so on a white (255) background the stamped rect averages 76. The white text glyphs (brightness 255) boost the region's overall average above 100 for any reasonably light background — pure-white tested at 118, yellow at 115, pink at 104. Every stamped photo with a light corner was getting a no-op from the function, which matched Dave's report that date stamps persisted after running the batch.
  - Replaced average-brightness with **structural-signature detection**: a date stamp is a region that contains BOTH a substantial dark cluster (the alpha-blended rect background, brightness < 80) AND a thin bright cluster (the white text glyphs, brightness > 220). Natural image content almost never has that bimodal distribution concentrated in a tiny bottom-right area. Detection cutoffs: `darkPct > 30% AND brightPct > 1.5%`. Empirically measured stamped photos hit 65–84% dark / 12–21% bright; unstamped hit 0% on at least one of those metrics.
  - Tested across 7 scenarios with full JPEG round-trip (stamp → encode → reload → detect): all 4 stamped variants correctly stripped (white, sky, pink, dark backgrounds); all 3 unstamped variants correctly left alone (pure-white, pure-dark, mid-grey — where the old rule would have FALSELY stripped the pure-dark photo because avg < 100).
  - Same detection logic applied to the report generator's auto-strip (app.js ~line 348). That path was also affected — any stamped photo with a bright corner would have shown the stamp in the printed report.
- **Batch removal wasn't refreshing the in-app thumbnails.** After the batch updates IndexedDB, the DOM's `<img src="data:...">` elements were still pointing at the OLD (stamped) dataUrls — so even when the removal succeeded on disk, the user kept seeing stamps in the UI until they closed and reopened the survey. Added `renderInspection(refreshed)` call at the end of `removeAllDateStamps()` so all thumbnails reload from IndexedDB as soon as the batch completes. Doc photos (HIN, compliance, cover) will refresh the next time the user opens Edit Intro — they're not in the inspection view.

---

## v2362 — 2026-04-18
### Fixed
- **Date stamps: new photos are no longer branded with a date stamp, and the "Remove Date Stamps" batch tool now actually removes them.** Two related problems, fixed together:
  1. **Capture path was burning a date into every photo.** `addDateStampToPhoto()` — called from every photo-capture code path (main camera, item photos, HIN, compliance plate, etc.) — drew a dark rectangle with the survey date in white text into the bottom-right corner of the image before saving. The capture date is already preserved in the photo record (the ID is `Date.now()`) and on the parent survey (`survey.surveyDate`), so the burned-in stamp was redundant *and* destructive — once committed to the JPEG bytes it could not be removed cleanly. Stripped the drawing step while keeping the resize + JPEG-recompression that the function is otherwise responsible for, so existing call sites continue to work with no signature change.
  2. **`Remove Date Stamps` batch tool was under-masking old stamped photos.** The in-app removal tool used a tighter mask than the report-generator's auto-strip (which runs on every report render and had always worked): 4px margin vs 8px, narrower glyph measurement ('2026-04-16' vs '2088-08-08' — the latter is the widest possible digit string because `8` is the fattest numeral), and included a no-op "blur smoothing" pass that did nothing but slow the conversion. Rewrote to mirror the auto-strip logic exactly: margin=8, `measureText('2088-08-08')`, brightness sample check (skip if the strip above the stamp averages ≥ 100 — indicates no dark stamp present, avoid damaging clean photos), and dropped the dead blur pass. Now a survey with 50 stamped photos can be cleaned in one batch and the output matches what the report was already producing.
- Capture date is still recorded (`photoRecord.timestamp = Date.now()`, `survey.surveyDate`) — only the pixel overlay is gone. If the surveyor needs the date visible on a printed photo, the report generator can be extended to overlay it at render time rather than bake it into the source.

---

## v2361 — 2026-04-18
### Fixed
- **Check Survey: "Back to Check Survey" button was invisible on desktop.** Tapping Go on a preflight issue fades the check-survey overlay out over 150ms (opacity transition) and keeps it in the DOM for a further ≈200ms before removing it. The floating Back button had `z-index: 200` while the overlay had `z-index: 9999`, so for the entire fade-out window the button was rendered *behind* the fading white overlay. On iPhone the fade is fast enough that the flash went unnoticed; on laptop the longer perceived fade made the button effectively invisible — the user ended up at the target item with no way back to the preflight. Bumped back-button z-index to 10001 so it sits above the overlay from the moment it's appended.
- **Check Survey: Go button landed behind the floating Back button.** Navigation used `scrollIntoView({ block: 'center' })` which centers the item vertically in the viewport. The floating Back button is ≈60px tall at the top of the screen, so a "centered" item was partially (and sometimes entirely) tucked underneath it — it looked like the Go had jumped to the wrong item. Changed to `block: 'start'` combined with a temporary `scroll-margin-top: calc(72px + env(safe-area-inset-top, 0px))` applied to the target element, which `scrollIntoView` honours across nested scrollable containers. The style is restored after the smooth scroll completes (1.2s timeout). Same fix applied to the Edit Intro field path (header/engine/valuation/photo fields).

---

## v2360 — 2026-04-18
### Added
- **Edit Intro → Survey pill.** The Edit Intro page (Vessel Info / Header / Documentation / Photos / Valuation) had Save, Check, and Report pills in its bottom bar but no direct way back to the main inspection checklist — the user had to use the top-left back arrow or scroll up to tap the title. Added a 📋 Survey pill as the leftmost item in the bottom bar (so the bar reads: Survey | Save | Check | Report, left-to-right: navigation → save → validation → output). Tap saves the edit form silently (so no in-progress edits are lost), then calls `renderInspection(survey)` to jump straight to the checklist.

---

## v2359 — 2026-04-18
### Fixed
- **Preflight (Check Survey) was reporting rated drive-line items as unrated.** The surveyor would rate items like `Propeller shaft`, `Cutlass bearing`, `Engine, general condition/impression`, etc., and Check Survey would still list them under "Unrated" — the root cause was a label-mismatch between `renderInspection()` (which builds the UI and determines what label the user's rating is stored under) and `checkSurvey()` (which looks the rating back up). The template entries carry a plural "(s)" suffix (e.g. `"Propeller shaft(s)"`). `renderInspection` strips `(s)` for single-drive-line boats and also strips it when multiplying labels for twin/triple installs (so the user sees and rates `"Propeller shaft"` or `"Port — Propeller shaft"`). `checkSurvey`, however, was only handling hulls correctly — drive-line items passed through with the "(s)" intact in both the single-drive-line and multi-drive-line branches, so `survey.items["Propeller shaft(s)"]` was always `undefined` and the preflight reported the item as unrated.
  - Added a `driveLineItem && driveLineCount === 1` branch that singularises the label (mirrors `renderInspection` at line ~12481).
  - Fixed the `driveLineItem && driveLineCount > 1` branch to strip "(s)" from the base label *before* prefixing with `Port —`/`Starboard —`/`#n —` (mirrors `renderInspection` at line ~12504).
- Affects every survey that has any drive-line item rated — which is essentially every powerboat and auxiliary-sail survey. No data migration required; the fix is entirely in the check-survey lookup path, ratings on disk were always correct.

---

## v2358 — 2026-04-18
### Added
- **Dictionary: accepted-vocabulary additions.** The client-side spell-check (which underlines words not found in `dictionary.json` and offers inline suggestions) was flagging several domain-specific terms as typos. Added: `odour`, `odours`, `odourless` (Canadian English — the word was flagged even though `colour`, `labour`, `behaviour` etc. were already present); `flybridge` (marine term, was flagged in the Flybridge Storage locker chip screenshot); `romex` (brand/generic name for household solid-core non-marine wiring referenced in the ABYC E-11 chip set added in v2353); `untinned` (antonym of tinned, used throughout marine wiring findings). Dictionary total: 128,581 → 128,587 entries. All new entries lowercase per the file's case-insensitive convention — the spell-checker normalises to lowercase before lookup, so `Flybridge`, `FLYBRIDGE`, and `flybridge` will all pass.

---

## v2357 — 2026-04-18
### Changed
- **Past-tense sweep across observed chips.** Surveyor-report convention is past tense (the inspection is a historical record, not a live status), but a number of observed-phase chips had slipped in using present tense. Screenshot-flagged example was the `Flybridge Storage locker(s)` C-chip reading "Flybridge storage lockers **are** in satisfactory condition with properly functioning latches and hinges." Converted 47 chips across 16 sections, including:
  - `are/is in satisfactory condition` → `were/was in satisfactory condition`
  - `is in working order` / `is in acceptable condition` → `was in working order` / `was in acceptable condition`
  - `is properly mounted and functional` → `was properly mounted and functional`
  - `is operational and functions properly` → `was operational and functioned properly`
  - `X operates but shows signs of Y` → `X operated but showed signs of Y` (refrigeration, microwave, head pump, gearbox, inverter, shore-power cables, windlass, etc.)
  - `X is present but shows signs of Y` → `X was present but showed signs of Y` (galvanic isolator, battery overcurrent protection, propane gas detector, emergency tiller, isolation transformer)
  - `floor or carpet is severely damaged` → `floor or carpet was severely damaged`
  - `Keel bolts are secure` → `Keel bolts were secure`
  - `Plumbing is in working order` → `Plumbing was in working order` (across Aft Deck, Cockpit, Flybridge)
- All changes confined to chips with `phase: "observed"`. Means and action phases kept in present/imperative form as appropriate. No new chips added, none removed; 38 + 9 updates across a first and cleanup pass.

---

## v2356 — 2026-04-18
### Added
- **`Flybridge Bimini/dodger/hardtop` — hardtop-specific chip set.** Previously the chip panel for this item pulled only from the fuzzy-matched `Bimini, dodger and canvas enclosure` section, which is written for soft canvas structures — zippers, snaps, fabric wear. Hardtops are rigid (fibreglass, aluminum, composite) and have none of those features. Added 15 hardtop-focused chips covering the conditions an ABYC-trained surveyor actually assesses on a rigid top:
  - C (4 observed): solidly mounted + free of stress cracks, fasteners and mounting hardware secure, perimeter sealant and gaskets intact, gelcoat free of significant crazing or chalking.
  - B (4 observed + 1 means + 1 action): minor gelcoat stress cracks, corroded mounting hardware, weathered perimeter sealant, support-post play at base; means-phase narrative about water tracking into supporting structure; action chip recommending reseal + hardware inspection at routine service.
  - A (3 observed + 1 means + 1 action): significant structural cracking/delamination, loose or missing mounting hardware, active perimeter leak; means chip noting the wind/sea-loading structural hazard; action chip recommending professional repair or replacement before return to service.
- All B-observed and A-observed chips that reference a location use `[insert location(s)]` so the surveyor can specify port corner, forward mounts, overhead seam, etc.
- The existing bimini/dodger canvas chips remain available via the cross-section fuzzy match for vessels whose flybridge cover is actually canvas rather than rigid.

---

## v2355 — 2026-04-18
### Fixed
- **BUG: Engine 1 horsepower and fuel type were disappearing on every load.** On opening the Edit Intro view for a saved survey, the restore code set all fields from the stored survey (including `engineHP` and `fuelType`) and then called `onEngineMakeChange()` to cascade-populate the engine model dropdown. That cascade handler clears `engineHP` and `fuelType` as a side effect — intended when the user manually changes the make (old HP/fuel no longer apply) but wrong when we're just restoring saved data. The model field was being re-restored after the cascade; HP and fuel were not. Result: fields flashed in briefly then went blank, and the next auto-save wrote the blank strings back to IDB. Engine 2 had the same bug via the same pattern.
- Fix: after each `onEngine{,2}MakeChange()` call in the form-restore path, re-assign `engineHP`/`fuelType` (and `engine2HP`/`fuelType2`) from the saved survey, mirroring how `engineModel`/`engine2Model` are already re-restored.
- No changes to the "user changes make" codepath — when the user picks a different make from the dropdown, HP and fuel still clear (as intended) and the model's own change handler repopulates them from the database.

---

## v2354 — 2026-04-18
### Changed
- **Check Survey (pre-flight) Back button — silent return when nothing changed.** After tapping `Go → Fix` on a flagged issue, the Back button used to always evaluate the issue; if it was still broken the surveyor would get hit with a "⚠️ Not yet resolved" modal even if they had only glanced at the item and hadn't edited anything. Now, on entry, we snapshot the issue's state (rating, notes text, standards, photo count, flagged, excluded — or for header fields, the referenced survey-level field). On Back, we compare the current state to that snapshot:
  - **Unchanged** → close the Back button, reopen Check Survey, restore scroll. No modal. (The surveyor chose not to edit; don't nag them.)
  - **Changed and now fixes the issue** → existing behaviour: green "Fixed!" card animates and auto-advances the scroll to the next remaining item. (This is the "auto-advance if saved" case Dave asked for, already working.)
  - **Changed but still broken** → existing behaviour: "Not yet resolved" modal with Go-back / Force-OK / Return-without-resolving options.
- Net effect: the pre-flight → fix → pre-flight loop now has no wasted modal for cases where the surveyor decided the flagged item was fine as-is, while still catching real partial edits. Snapshot is captured asynchronously when the item opens and always completes well before any user Back tap.

---

## v2353 — 2026-04-18
### Added
- **`Bundling support and wiring` — A-rating non-marine-grade wiring chip set.** Four new chips for the common ABYC E-11 finding where household (Romex-type) solid-core untinned wiring has been installed instead of marine-grade tinned stranded copper. Uses `[insert location(s)]` so the surveyor can point to panels, bilge, head, or specific runs as appropriate:
  - Observed: `Non-marine-grade (household-type, solid-core untinned) wiring was observed at [insert location(s)].`
  - Observed: `Romex-type solid-core household wiring was used in place of marine-grade stranded tinned copper at [insert location(s)].`
  - Means: `Marine environments demand stranded, tinned copper conductors to resist vibration fatigue and galvanic corrosion. Solid-core untinned wiring is not permitted by ABYC E-11 and presents elevated fire and electrical-shock hazards as it ages in service.`
  - Action: `Replace the non-marine-grade conductors with tinned stranded copper wiring and marine-rated terminations in accordance with ABYC E-11.`
- Chips are additive to the existing A-rating content (chafe/support/bundling chips stay) and inserted immediately after the existing A-means so the "What it means for this vessel" column can offer the surveyor either the generic fault-risk framing or the specific ABYC E-11 non-compliance narrative.

---

## v2352 — 2026-04-18
### Added
- **"Not tested - out of water" chip set added to three drive-line sections**, using the canonical phrasing already used across the rest of the survey (toilet/seacock, engine start and stop, gearshift, outdrive tilt, bow thruster, autopilot, etc.): past-tense observed + "Recommend testing … when the vessel is commissioned for the season." action.
  - `Drive coupling(s), interior propeller shaft(s), stuffing box(es) or dripless seal(s), interior stern tube(s)` (bundled section):
    - Observed: `The drive coupling, propeller shaft, and stuffing box or dripless seal were not tested because the vessel was out of the water.`
    - Action: `Recommend testing the drive coupling, propeller shaft, and stuffing box or dripless seal when the vessel is commissioned for the season.`
  - `Drive coupling` (singular):
    - Observed: `The drive coupling was not tested because the vessel was out of the water.`
    - Action: `Recommend testing the drive coupling when the vessel is commissioned for the season.`
  - `Stuffing box/packing gland/dripless seal`:
    - Observed: `The stuffing box or dripless seal was not tested because the vessel was out of the water.`
    - Action: `Recommend testing the stuffing box or dripless seal when the vessel is commissioned for the season.`
- Rating is `Not tested - out of water`, which matches the existing "starts-with 'Not tested'" rule in `findTextVariants` so the chips appear alongside the `Not tested - dripless` and `Not tested - stuffing box` chip sets when the surveyor picks `Not tested/not verified` as the item rating. Surveyor now has an out-of-the-box canonical chip for the common "vessel on shore at time of survey" case without having to declare whether the rig is dripless or traditional.

---

## v2351 — 2026-04-18
### Added
- **`Distribution panel 110V` — A-rating reverse-polarity indicator chip set.** Three new chips covering the specific A-severity finding when an AC panel lacks a reverse-polarity indicator. Wording mirrors the adjacent protective-guard chip pair (past-tense observed, imperative action), uses Canadian English, and avoids the informal "this device" framing:
  - Observed: `A reverse-polarity indicator was not present on the AC shore-power panel.`
  - Means: `The indicator warns the crew of a reversed polarity in the shore-power connection. Without one, the reversed-polarity condition — which presents shock and fire hazards — can go undetected during normal use.`
  - Action: `Install a reverse-polarity indicator in accordance with ABYC E-11.`
- Chips are additive — the existing A-rating protective-guard chip pair is unchanged, as is the generic A-means fallback. Surveyor can now pick the reverse-polarity narrative independently from the guard narrative.

### Removed
- **`Distribution panel 110V` / A / observed — `The 110V distribution panel appeared clearly labeled, and all switches appeared to function properly.`** This sentence describes a serviceable panel and belongs in the C-rating bucket (an identical chip already exists at C / observed). Its presence on A / observed was a copy-paste legacy — a critical-rating card should not offer a "panel is fine" option.

---

## v2350 — 2026-04-18
### Changed
- **`Hull and rudder(s) conductivity testing` chips split — hull and rudder now separate chips.** The combined-phrasing chips forced the surveyor to tick both hull and rudder together even when only one was elevated, which made the sentence picker awkward when (for example) only the hull showed elevated readings. Split treatment at two rating levels:
  - B / observed: `The hull and rudder(s) returned elevated readings of [insert reading range].` → replaced with a hull-only variant (`The hull returned elevated readings of [insert reading range].`). The matching rudder-only chip was already present (`The rudder(s) returned elevated readings of [insert reading range].`).
  - B / observed: `Localized elevated readings of [insert reading range] were observed in several areas of the hull and rudder(s).` → split into two chips, hull-only and rudder-only (`…in several areas of the hull.` / `…in several areas of the rudder(s).`).
  - A / observed: `The hull and rudder(s) returned readings consistently at or near 999 across large areas.` → replaced with hull-only variant (`The hull returned readings…`). Matching rudder-only chip was already present.
- Means-column chips that describe the overall narrative assessment (e.g. `"…consistent with vessels of similar age and construction."`) are intentionally left combined — those sentences read better as a unified summary than as two parallel fragments.

### Removed
- **`Hull and rudder(s) conductivity testing` / B / observed — `No softness or delamination was observed at the time of survey.`** This was a blanket assurance that implied percussion-level confidence the conductivity test does not actually provide, so it could overstate the surveyor's findings. Dropped. Other sections that speak of softness/delamination as an explicit future-monitoring action (swim platform, aft deck conductivity, cockpit conductivity) are untouched.
- **Exact-duplicate chip entries removed from `text_library.json`** (43 total). Running the same dedup key (section + rating + phase + text) across all 16 groups surfaced entries that were copy-pasted 2× or 3× into the same bucket and would have rendered as duplicate chips in the sentence picker:
  - `Wiper blade operation` (Gauges and Instrumentation) — 15 chips each carried 3 copies (A/B/C observed, A means, A/B action). The worst single offender was `Not tested / observed` at 2 copies.
  - `Sail drive(s) - (external)` (Hull) — 4 chips duplicated (A action, A observed, C action ×3, C means).
  - `Outdrive(s) - (external)` (Hull) — `C action` "No corrective action is recommended at this time." appeared 2×.
  - `Trim tabs (exterior tabs, actuators, mounts)` (Hull) — `C action` "No corrective action is recommended at this time." appeared 2×.
  - `Freshwater tank and plumbing` (Fuel & Tanks) — `Not tested / observed` "No leakage was observed." appeared 2×.
  - `Deck and coachroof/pilot house condition` (Deck) — `C action` "No corrective action is recommended at this time." appeared 2×.
  - `Deck hatch(es), windows and portholes` (Deck) — `B action` "Address this at the next scheduled service." appeared 2×.
- **Engine condition plural/singular dedupe.** Removed the two plural variants `The engines exhibited a moderate level of cleanliness.` and `The engines were damaged or non-functional.` from the `Engine condition` section. The singular forms (`The engine exhibited…` / `The engine was damaged…`) are kept. Rationale: twin-engine surveys already expand to `Port — Engine condition` / `Starboard — Engine condition`, each describing ONE engine, so singular is always the correct form after the v2216 per-drive-line expansion landed. Plural was legacy content from before the expansion.
- `text_library.json` total entries down from 3,901 to 3,858. No surviving exact duplicates (verified with a Counter sweep across every group).

### Fixed
- **Chip text duplication on save → reopen → tick.** Ticking a sentence chip could produce 2×, 3×, or 4× copies of the same text in the notes textarea after successive save → reopen → tick cycles. Root cause: `_kkStampCheckOrder` and `_kkAutoCheckSavedSentences` could not match chips that still carry `[insert location]` / `[insert count]` / `[describe area(s)]` / `[side]` / `[appliance]` / `[compressor]` placeholders against the filled-in saved text. The chip text then leaked into the manual-prefix bucket, and the next tick prepended the prefix on top of the freshly-inserted chip — compounding on every reopen.
- Fix: in `_kkRebuildFromSentencePicker`, defensively dedupe the prefix by building a tolerant regex from each currently-ticked resolved sentence (placeholders swapped back to `.*?`) and stripping matches from the prefix before concatenation. The chip tick no longer double-prepends, regardless of how many prior save/reopen cycles occurred.
- Reported on Brightwork B (4× "The brightwork at several locations (see pictures) was deteriorated…") and Bundling support and wiring A (4× "Wiring at several locations was unsecured…"). Both share the same placeholder-chip pattern and both reproduce the fix.

### Changed
- **Library language polish: `was` / `looked` → `appeared`.** Swept `text_library.json` end-to-end converting visual-condition verbs from "was" / "looked" to "appeared" where the verb describes an observed condition (e.g. "oil was clean" → "oil appeared clean", "hull looked sound" → "hull appeared sound"). ~135 `was` lines and 4 `looked` lines changed across Hull, Running gear, Anodes, Rigging/Sails, Deck/Cockpit/Flybridge, Cabin/Interior, Heads/Plumbing, Engine/Drivetrain, Electrical, Safety, Deck fittings/Pulpit/Rails/Arch/Windows/Hatches.
- Preserved intentionally: passives ("was observed", "was noted"), operational state ("was not tested", "was not serviceable", "was not functional"), factual installation/construction ("was installed", "was fitted", "was encapsulated"), situational ("was out of the water", "was ashore", "was stationary"), standards/specs, and "As this was a visual observation only…" (reclassified separately in a later version).
- JSON validated end-to-end via `JSON.parse`. `looked` now at 0 occurrences; `appeared` up from ~230 to 353.

---

## v2348 — 2026-04-18
### Changed
- **Twin-engine `[side]` auto-fill.** On per-drive-line items — those prefixed `Port — `, `Starboard — `, or `#N — ` — snippets containing the `[side]` placeholder now auto-resolve to the item's side (port/starboard/#N) instead of rendering a port/starboard/both dropdown. The surveyor no longer has to pick a side on a card whose title already names it. Three sites updated in `app.js` so render, insert, and auto-check stay in sync:
  - Render-time placeholder IIFE (the chip display): per-drive-line items get the auto-side as inline text; other items keep the existing dropdown (twin-drive) or strip (single-drive) behaviour.
  - `_kkRebuildFromSentencePicker`: reads the item label from a new `data-item-label` attribute on `#sheet-sentence-picker`, derives `autoSide` as a fallback when the dropdown isn't present.
  - `_kkAutoCheckSavedSentences`: when the notes sheet re-opens, saved text like "The port bellows were cracked" re-matches its chip by resolving `[side]` with `autoSide`, not by stripping.
- Hull items with "Port hull — ", "Starboard hull — ", or "Centre hull — " prefixes are explicitly excluded from the side auto-fill (a catamaran's port hull isn't an engine side).
- QC caught a subtle JS bug in the first draft: `itemLabel.match(X) && !itemLabel.match(Y)` collapses the first match into a boolean, so the `[1]` capture is lost. Reworked to capture the match array and the hull exclusion separately.
- Applies to every snippet already using `[side]` — drive bellows, outdrive housing, lower seals, windshield wipers, rub rail, tilt-and-trim operation, etc. Existing singular/plural engine-condition chips (which don't use `[side]` yet) are unchanged this version; chip conversion is queued for a later pass.

---

## v2347 — 2026-04-18
### Removed
- **Fuel filter(s) and water separator(s)** removed from the Engine(s) and drive(s) section of `survey_template.json`. No app.js or report-generator references — clean removal. Continues the v2346 engine-section cleanup (duplicate items were already pulled; this one was Dave's decision to rate elsewhere or not at all).

### Changed
- Field-reported wording polish in `text_library.json`:
  - `Floor and carpet` / rating B / observed: "Minor stains, wear, or loose fasteners are visible." → "Minor stains and wear are visible." Dropped the loose-fasteners clause; fasteners belong to a different class of finding and muddied the chip.
  - `Engine condition` / rating C: "The engines were relatively clean with an appearance that suggested they had been maintained." moved from phase `means` to phase `observed`. This sentence is an observation, not a consequence — it was incorrectly rendering under "What it means for this vessel" on the Port/Starboard engine cards. Applies to both port and starboard engine items (both items strip their side prefix and remap to the same `Engine condition` section).

---

## v2346 — 2026-04-18
### Removed
- Engine section no longer lists **Fuel lines and fittings** or **Fuel tank(s) condition and installation**. Both were duplicates of items already covered under the separate Fuel, water and waste section (which keeps the single `Fuel tank(s)` item, line 1902 of `survey_template.json`, untouched). Removing them prevents double-rating and keeps engine findings focused on engine-side failures. No app.js or report-generator references to either label — clean removal.

### Added
- Cabin lighting B-rating snippet set, added to both "Cabin lights" (the section the `Interior lighting` template item resolves to via `ITEM_SNIPPET_MAP`) and "Lighting (cabin)" (Electrical group, direct match):
  - Observed: "[insert count] lights did not function in [insert location(s)]."
  - Observed: "[insert count] lights were loose in [insert location(s)]."
  - Observed: "[insert count] lights were missing from [insert location(s)], leaving only the wiring in place."
  - Action: "Repair of the affected light(s) is recommended to restore full illumination."
  - Action: "Installation of replacement light(s) at the affected locations is recommended to restore full illumination."
- `[insert count]` placeholders render as inline number inputs and `[insert location(s)]` as inline text inputs (existing sentence-picker behaviour), so field entry is: tick → type count → type locations. Cabin lighting B has no `means` snippets — matches the cabin sole v2345 precedent where no generic sentence fits.

### Fixed
- **Snippet routing fix — the reason v2345 cabin sole chips never appeared in the field.** Entries were added under `"section": "Cabin sole"`, but `ITEM_SNIPPET_MAP` in `app.js` redirects the `Cabin sole` template item to look up the `"Floor and carpet"` section, so the new chips were orphaned. Relabelled the 5 v2345 cabin sole B entries from `"Cabin sole"` to `"Floor and carpet"`. Same bug class caught pre-flight for v2346 cabin lighting: relabelled the 5 `"Interior lighting"` entries to `"Cabin lights"` (the target of the `Interior lighting` → `Cabin lights` remap). The `Lighting (cabin)` Electrical-group entries were already correct and are unchanged.
- QC lesson: trace each text-library addition through `ITEM_SNIPPET_MAP` before committing, not after the surveyor reports missing chips in the field.

---

## v2345 — 2026-04-18
### Changed
- Removed the generic B-rating "means" filler — "This finding warrants attention in the near term." — from every section of `text_library.json` (191 occurrences across 190 sections, all rating B / phase `means`). Leaving the "What it means for this vessel" column empty for B-rated items rather than padding the report with a one-size-fits-all sentence that said nothing useful.
### Added
- Cabin sole (group "Cabin and conveniences") B-rating snippet set fleshed out for the three conditions Dave most commonly sees:
  - Observed: "The cabin sole was structurally sound but the finish was worn and in need of refinishing."
  - Observed: "Localized rot was observed in the cabin sole at [describe area(s)]."
  - Observed: "The cabin sole was broken at [describe area(s)], compromising the finish and, potentially, the underlying structure."
  - Action: "Refinishing is recommended to restore appearance and protect the substrate from moisture ingress."
  - Action: "Repair and refinishing, or replacement of affected sections, is recommended to restore safe footing and preserve the surrounding structure."
- Cabin sole intentionally has no B-rating `means` snippets — none of the generic options fit.

---

## v2344 — 2026-04-18
### Fixed
- App was blank on load due to syntax error in the sentence-picker render chain. The v2343 patch added `.replace(/\[appliance\]/gi, ...)` and `.replace(/\[compressor\]/gi, ...)` after the `[side]` IIFE, but the existing `})());` terminated the `let rendered = escSnippet(s).replace(...)` chain before them, orphaning the new calls. Removed the stray `;` so the chain continues through the appliance/compressor replacements.

---

## v2343 — 2026-04-18
### Added
- `[appliance]` placeholder renders as dropdown: icebox / refrigerator / freezer / refrigerator/freezer.
- `[compressor]` placeholder renders as dropdown: remote compressor / internal compressor / no compressor (icebox only). Selecting "no compressor" strips the entire compressor clause from the sentence.
- Refrigerator/icebox and Refrigerator/freezer snippets rewritten with `[appliance]` and `[compressor]` dropdowns for C, B, and Not tested ratings.

---

## v2342 — 2026-04-18
### Changed
- Removed "Engine alignment" from survey template (not something Dave surveys).
### Fixed
- HEIC conversion: added `createImageBitmap` as primary strategy (most reliable on macOS Chrome), then Image element fallback, then heic2any library. Better error toast suggests converting to JPG in Preview if all methods fail.

---

## v2341 — 2026-04-18
### Fixed
- HEIC drag-and-drop conversion: now tries native canvas conversion first (macOS Chrome/Safari decode HEIC via OS codec), falls back to heic2any library only if native fails. Much faster and more reliable.

---

## v2340 — 2026-04-18
### Fixed
- Desktop drag-and-drop photos onto checklist items was defined but never wired up; added `setupChecklistDragDrop()` call in `renderInspection()` and `.drag-target` CSS for visual feedback.
- Hand-typed text was overwritten when ticking a sentence picker chip; prefix is now re-derived on every chip tick by stripping already-checked sentences from the current textarea value.
- Capitalized 28 snippets in `text_library.json` that started with a lowercase letter (e.g., "the installation appeared serviceable." → "The installation appeared serviceable.").

---

## v2339 — 2026-04-18

- **Windshield wiper standard corrected.** Changed from ABYC E-11
  (electrical) to TP1332 (construction standards) — E-11 is not the
  appropriate standard for wiper operation.
- **Windshield wiper snippets expanded.** All three ratings (A, B, C)
  now offer port/starboard/both options via `[side]` placeholder. Added
  A-rating snippets for wiper blades needing replacement even when the
  mechanism works. Added means and action snippets for all ratings.
  Updated across Gauges, Pilot house, and Flybridge sheets.
- **Thumbnail dataUrl guard.** All thumbnail-loading paths now check
  `photo.dataUrl` before unhiding the image, preventing broken image
  placeholders when photo data is missing from IndexedDB.
  `updateItemInPlace` now also unhides thumbnails after setting src.

## v2338 — 2026-04-18

- **Photo preview navigation arrows.** When tapping a photo thumbnail in
  the area photo grid to open the preview, left/right arrows now flank
  the image so you can scroll through all photos in that section without
  going back to the grid. A counter ("3 / 12") shows current position.
  Swipe left/right on the image also works on touch devices. Arrows
  hide at the first/last photo. New-capture and batch-camera previews
  are unaffected (no arrows).

## v2337 — 2026-04-18

- **Auto-advance on skip from "N left".** Tapping ⊘ Skip on an item
  reached via the "N left" list now advances to the next remaining item
  (or collapses the accordion if all done), matching the behaviour of
  rating an item.

## v2336 — 2026-04-18

- **Skip-with-data warning.** Tapping ⊘ Skip on an item that already has
  a rating, notes, or standards now shows a confirmation dialog. On
  confirm, the rating, notes, standards, and variant text are all cleared
  so the item reverts to a clean unrated/excluded state. Photos are
  retained. Unskipping never prompts. The bottom sheet also auto-closes
  when skipping from within it.

## v2335 — 2026-04-18

- **Progress circle enlarged.** The completion percentage ring in the
  survey header increased from 34×34 to 40×40 px so the % text fits
  comfortably inside the circle. Font bumped from 9 px to 10 px.
- **Duplicate snippet prevention.** Tapping the same snippet card twice
  no longer duplicates the sentence in the textarea. The app checks
  whether the resolved text already exists before appending.
- **Auto-advance from "N left" list.** When tapping an item from the
  "N left" popover and then rating it, the app automatically scrolls to
  the next unrated item in the same category. If that was the last item,
  the accordion collapses so the user can decide where to go next. The
  chain continues as long as items remain and the user keeps rating
  inline (opening the notes sheet cancels auto-advance).

## v2334 — 2026-04-18

- **Brightwork B-rating snippets expanded.** Added location-specific
  observed ("brightwork at [insert location] was deteriorated"), rebedding
  observed ("[insert location] needs to be rebedded to prevent moisture
  ingress and keep the laminate solid"), varnish deterioration observed,
  means (exposed wood → moisture → rot), and actions (strip/sand/refinish,
  remove/rebed/reinstall). Previously had only 1 generic observed.

---

## v2333 — 2026-04-18

- **Fix sail drive ITEM_SNIPPET_MAP mismatch.** Target was missing the
  ` - ` dash, so section-specific snippets were not appearing.
- **Fix deck/coachroof percussion testing section names.** Renamed
  lowercase "deck and coachroof/pilothouse impact and resonance testing"
  to "Deck and coachroof/pilot percussion testing" to match the
  ITEM_SNIPPET_MAP target.
- **Expand deck/coachroof B-rating snippets.** Added 6 observed
  sentences (spider cracks around hardware, stress cracks at transitions,
  gelcoat crazing/chalking, non-skid wear, coachroof window frame
  cracking, stanchion base cracks), 1 means (moisture/core saturation
  risk), and 3 action sentences (grind and fill, rebed hardware, renew
  non-skid). Previously had only 1 observed and 1 action.

---

## v2332 — 2026-04-18

- **Toerail/gunwale snippets.** Moved "refinishing for appearance"
  snippet from B to C rating. Added B-rating observed ("cracking along
  top deck at the toerail joint, moisture may penetrate the laminate"),
  means ("may saturate core material, cause softness, compromise deck
  integrity"), and action ("sand or grind out cracking, install backing
  where required, fill appropriately").

---

## v2331 — 2026-04-18

- **Mooring cleats and chocks — A-rating snippets expanded.** Added:
  observed ("loose and pulling away from the deck"), means ("should a
  cleat tear out, vessel will not be secure at the dock"), and action
  ("remove, inspect deck core for damage, confirm solid laminate or
  backing plate, rebed and retighten").

---

## v2330 — 2026-04-18

- **Fix first-sentence duplication bug.** Root cause: when ticking
  the first snippet on a fresh (empty) textarea, `_kkStampCheckOrder` did
  not set `_kkManualTextPrefix` because the textarea was empty. On the
  second tick, the rebuilt text ("Sentence A.") was captured as prefix,
  producing "Sentence A. Sentence A. Sentence B." Fix: always set the
  prefix (even if empty) on first tick so `hasOwnProperty` prevents
  re-capture.
- **Fix deck/coachroof snippet matching.** `ITEM_SNIPPET_MAP` mapped
  the item to "Deck and coachroof/pilothouse condition" but
  text_library.json used "Deck and coachroof/pilot house condition
  (spider cracks, etc.)". Corrected the mapping and renamed all legacy
  "pilothouse" section names to the canonical form.
- **Cap area photo grid thumbnails at 80 px.** Changed CSS grid from
  `minmax(72px, 1fr)` to `minmax(72px, 80px)` so photos stay small on
  iPad and desktop, matching the bottom sheet size.
- **Correct anchor sizing rule of thumb.** Changed from the incorrect
  1.5–2 lb/ft to the standard ~1 lb/ft for traditional anchors (CQR,
  Bruce, Delta), with note that modern high-performance designs (Rocna,
  Mantus, Spade) achieve comparable holding at lower weight.
- **Dictionary additions.** Added anchor brand names (Rocna, Mantus,
  Spade, Danforth, CQR, Bruce, Delta) and marine repair terms (rebed,
  rebedded, rebedding, retighten, retightened, retightening) to the
  spell-check supplement.

---

## v2329 — 2026-04-18

- **Anchor snippets — undersized anchor + sizing rule of thumb (A rating).**
  Added A-rating observed snippet: "The primary anchor is undersized for the
  vessel and should be replaced before the vessel is returned to service."
  Added A-rating action snippet with anchor sizing guidance: ~1.5–2 lb/ft for
  modern designs (Rocna, Mantus, Spade), ~2–2.5 lb/ft for traditional patterns
  (CQR, Bruce, Delta). Split "Replacement or significant repair is required."
  into two separate action snippets: "Replacement is required." and
  "Significant repair is required."

---

## v2328 — 2026-04-18

### Fixed
- **Area photo grid too large on iPad/desktop** — changed from fixed 4-column grid to `repeat(auto-fill, minmax(72px, 1fr))`. Photos stay ~72–100px on any screen: 4 columns on iPhone, more columns on wider screens instead of enormous thumbnails.

---

## v2327 — 2026-04-18

### Fixed
- **Photos disappear on rating change** — compact item thumbnails start `display:none` for lazy loading, but `selectRating` set `img.src` without removing `display:none`. Now unhides thumbnails after loading.
- **Conductivity snippets** — removed "elevated" from deck/coachroof and aft deck conductivity sentences; fixed double `[insert reading range]` placeholder (was rendering four input fields instead of two).

### Changed
- **Area photo grid — larger thumbnails** — switched from fixed 84×84px thumbnails with flex-wrap to a 4-column CSS grid with responsive sizing, matching the bottom sheet photo grid.
- **Area photo grid — collapsible** — tap the title bar to collapse/expand the photo grid and buttons. Chevron indicator (▼/▶) shows state. Keeps the inspection view tidy when categories have many photos.
- Photo count shown in area photo title bar (e.g. "📷 Deck photos (22)").

---

## v2326 — 2026-04-18

### Fixed
- **Snippet duplication / "removed sentence comes back" bug** — When the notes sheet opens, picker sentences that already appear in the saved text are now auto-checked. Previously, the entire saved text was captured as a "hand-typed prefix" on the first checkbox tick, so: (1) unchecking a sentence left it embedded in the prefix, making it reappear; (2) ticking a sentence already in the text produced it twice. Now only truly hand-typed or placeholder-filled text becomes the prefix.

---

## v2325 — 2026-04-18

### Added
- Move (↗) overlay button on bottom sheet photo grid — matches area photo grid style (blue 20px circle, bottom-right corner). Calls existing `movePhotoFromSheet()`.

### Changed
- Bottom sheet photo grid thumbnails ~10% smaller — side padding increased from 20px to 34px for a less crowded layout.

---

## v2324 — 2026-04-18
- Fixed "N left" counter mismatch: the category header counter could disagree with the "items left" popover list because the counter recalculated from the template (with filtering that drifted out of sync with the initial render). Now both the counter and the list read from the same DOM source, so they always agree.
- Safety equipment camera rewrite: safety photo capture now uses the same batch camera overlay (getUserMedia with proper stream cleanup) as regular checklist sections, instead of a bare file input. Falls back to file picker if camera is unavailable.
- Added exhaust port location snippet for A, B, and C ratings: "The exhaust {count:port was|ports were} located _________." Auto-adapts singular/plural based on engine count. Existing C-rated location snippets also converted to use count tokens.
- Expanded exhaust discharge A and B snippets: three specific observed conditions (physical damage/corrosion, leakage, blockage/restriction) each with a matched action snippet. Outlet singular/plural uses count tokens.
- Area photo grid: replaced oversized 30px delete buttons and bulky Move buttons with three compact 22px circle overlays per thumbnail — ↻ rotate (bottom-left), ✕ delete (top-right), ↗ move (bottom-right). Photos are now clean 84×84 squares with no extra vertical space. Lazy-load thumbnail visibility also fixed for area photo wrappers.
- Inspection page styling matched to home page: category titles now dark (#1e293b) instead of blue, tighter padding (10px 12px), smaller card gaps (6px), lighter chevrons (#94a3b8) matching home page.

## v2323 — 2026-04-18
- Added % complete indicator: progress ring badge shown in both the inspection page header and intro/edit page header. "Complete" now requires rating + notes + at least one photo (or excluded). Tap the badge to see breakdown: Checklist %, Intro %, Overall %. Home page progress ring also uses the stricter definition. Intro completion tracks 20 core fields (vessel info, specs, engine, documentation, description, survey conditions).

## v2322 — 2026-04-18
- Fixed ABYC standard for propeller shafting items: propeller, propeller shaft, cutlass bearing, stern tube, drive coupling, stuffing box, packing gland, and dripless seal now correctly cite ABYC P-7 (Propeller Shafting Systems) instead of ABYC P-4 (Inboard Engines). P-7 added to Hull exterior and Engine standards checkbox lists.

## v2321 — 2026-04-18
- Changed auto-generated N/A text from "fitted" to "installed": "No hull anodes were installed on this vessel" instead of "No hull anodes were fitted on this vessel." Applies to all auto-generated Not Applicable snippets across the entire app.

## v2320 — 2026-04-18
- Fixed safety equipment photo crash: captureSafetyPhoto() was never calling setCameraActive(false) after capture, leaving camera state permanently flagged. File input elements were never removed from DOM. Now uses a cleanup helper that clears the busy flag, resets camera state, and removes the orphaned input on every exit path (success, empty selection, cancel timeout).

## v2319 — 2026-04-18
- Complete text library phase audit: 268 snippets reclassified across all 16 categories to ensure every snippet is accurately categorized as "observed" (what was seen), "means" (what it means for the vessel), or "action" (what should be done). Fixed five recurring patterns: action directives labeled as observations, recommendations labeled as observations, standards citations labeled as observations instead of means, physical observations labeled as means, and consequence statements labeled as observations instead of means.
- Consistent N/A language: bow thruster, stern thruster (new), and blower snippets now all read "No [item] was installed on this vessel."

## v2318 — 2026-04-17
- Fixed data-loss risk: generateReport() and exportSurvey() now call saveAllInspectionData() before loading the survey from IndexedDB. Previously, last-minute textarea edits, bilge pump changes, or comparable updates could be missing from the generated report if the user hadn't navigated away first.

## v2317 — 2026-04-17
- Firebase "photos on another device" banner: now checks if each missing photo is actually recoverable (has a storageRef in Firebase). Unrecoverable orphan photo IDs are silently cleaned from the survey data. Banner only appears if there are genuinely downloadable photos.

## v2316 — 2026-04-17
- Photo placeholders: found the real culprit — the compact card view (buildCompactItemHTML) and the area photo grid (refreshAreaPhotoGrid) had their own thumbnail rendering paths that were never patched. All THREE thumbnail templates (compact cards, accordion detail, area photos) plus the media sheet now start thumbnails hidden and only show them when valid image data loads from IndexedDB.

## v2315 — 2026-04-17
- Broken photo placeholders: added post-load sweep that hides any thumbnail whose src is still not a data: URL after all async photo loads complete. Catches all edge cases (stubs, orphans, corrupt data) regardless of what getPhotoById returns. Applied to both accordion thumbnails and media sheet grid.

## v2314 — 2026-04-17
- Added onerror handlers to photo thumbnail img tags in both the accordion view and media sheet grid. If the browser fails to render a photo for any reason (corrupt data URL, Firebase stub with partial data, etc.), the thumbnail wrapper is automatically hidden. Belt-and-suspenders fix alongside the dataUrl check.

## v2313 — 2026-04-17
- Fixed photo placeholder check: now verifies `photo.dataUrl` exists (not just the photo record). Photos that exist as Firebase stubs without image data are now hidden instead of showing broken placeholders. Applies to both accordion thumbnails and media sheet grid.

## v2312 — 2026-04-17
- Fixed orphaned photo placeholders in the media sheet grid (the popup with delete/rotate buttons). Same hide-if-missing logic as v2311 but for the second code path.

## v2311 — 2026-04-17
- Fixed broken image placeholders for orphaned photos: thumbnails whose photo data no longer exists in IndexedDB are now hidden instead of showing a broken image icon.

## v2310 — 2026-04-17
- Hull percussion B-rating action snippets: removed "at the next haul-out" from monitoring snippet; rewrote recheck snippet to "Recommend rechecking with visual inspection, impact and conductivity testing periodically."
- Complete rewrite of Primer, barrier coat, anti-fouling snippets using correct hull layer model (anti-fouling → epoxy barrier coat → gelcoat → fibreglass). A-rating now covers gelcoat-exposed and fibreglass-exposed scenarios, plus anti-fouling applied without barrier coat or gelcoat. B-rating covers worn anti-fouling exposing epoxy barrier coat and legacy layer buildup. All "primer" and "coating system" references replaced with correct terminology.

## v2309 — 2026-04-17
- Hand-typed text preservation: typing in the observation textarea before ticking a snippet no longer overwrites your text — snippets append after what you wrote.
- Fixed: click-order counter and manual-text prefix now reset each time a notes sheet opens, preventing stale text from carrying over between items.
- Fixed: operator precedence bug in first-tick capture condition.

## v2308 — 2026-04-16

### Fixed
- **Photo grid delete visual glitch.** Deleted photo thumbnails now hide immediately on tap rather than showing a broken placeholder until the grid refreshes. Also increased refresh delay from 300ms to 600ms to ensure the database operation completes before rebuilding the grid.

---

## v2307 — 2026-04-16

### Changed
- **Text library: present-tense recommendations and consistency pass.** Applied 1,329 snippet updates across 104 unique replacements. Key changes: "No action required" → "No corrective action is recommended"; "was noted" → "was observed"; "This represents a significant concern" → "This condition represents a significant concern"; "The finding should be monitored and addressed" → "This finding warrants attention"; "is required" → "are recommended" (subject-verb agreement). All custom snippets (escutcheons, spreader boots, conductivity readings, `{specify:}` tokens) preserved.

---

## v2306 — 2026-04-16

### Added
- **Inline delete and rotate buttons on photo grid.** Each thumbnail in the media sheet now has a red ✕ button (top-right) to delete and a ↻ button (bottom-left) to rotate 90° clockwise. Both work without leaving the grid view — rotate updates the thumbnail in place, delete confirms then refreshes the grid. The full-screen tap-to-edit overlay is still available by tapping the photo itself.

---

## v2305 — 2026-04-16

### Fixed
- **Desktop Chrome crash on photo-heavy surveys (Aw Snap).** `loadAndDisplayPhotos()` previously loaded ALL photo thumbnails (full-resolution base64 data URLs) into the DOM simultaneously when a survey opened. With 360 photos this overwhelmed Chrome's memory. Replaced with lazy `loadCategoryThumbnails()` that only loads thumbnails for the currently expanded accordion category. Since only one category is open at a time, memory stays bounded. All three accordion-opening code paths (user click, accordion restore after re-render, jump-to-item from remaining list) now trigger the lazy loader.

---

## v2304 — 2026-04-16

### Added
- **Remote error logging to Firestore.** Errors caught by the global
  `window.onerror` and `unhandledrejection` handlers are now also written to
  a `error_logs` Firestore collection (when Firebase is connected). Each log
  includes app version, active view, survey ID, last user action, user agent,
  and online status. Rate-limited to 10 per minute. Fire-and-forget — never
  blocks and never throws.
- **`_kkLastAction` tracker** — 8 strategic placements (openSurvey,
  generateReport, createNewSurvey, capturePhoto, saveSurveyWithProgress,
  toggleSnippets, saveSurveyDetails) to provide context in error logs.
- **SW update safety gate.** Service worker update reloads are now deferred
  when a camera capture, Drive backup upload, or survey save is in progress.
  Three flags (`_kkCameraActive`, `_kkBackupInFlight`, `_kkSaveInProgress`)
  are checked in the `controllerchange` handler. If any flag is true, the
  reload is deferred until all operations complete via `_checkDeferredUpdate()`.
  This prevents mid-survey disruptions from background app updates.

---

## v2303 — 2026-04-16

### Removed
- **Main sheet — removed traveller snippet.** The "traveller tackle operated
  smoothly" C-rating snippet was removed from the Main sheet section since
  the traveller has its own dedicated section (Traveller and tackle).

---

## v2302 — 2026-04-16

### Changed
- **Spreaders/boots — added rubber boot snippets alongside integrated fittings.**
  C-rating: converted "tipped with integrated spreader end fittings" to
  `{specify:}` token offering integrated fittings or rubber boots. Added two
  new C-observed snippets for boot condition (intact/pliable, properly seated
  for chafe protection). Applied same `{specify:}` pattern to "Not tested"
  rating. B-rating: converted deterioration snippet to `{specify:}` with three
  options (cracked, UV-hardened, missing). Fixed phase assignments: water
  ingress moved to means, replacement moved to action. Added sail chafe
  and rigging corrosion language.

---

## v2301 — 2026-04-16

### Changed
- **Chainplates — deck-mounted escutcheon option.** Added C-rating snippet for
  vessels where shrouds feed through deck-mounted escutcheons into reinforced
  hull moulding (no external chainplates). Added companion snippet confirming
  escutcheons seated properly with no movement, cracking, or sealant failure.
  Replaced generic "These presented no deficiencies" with specific "No
  deficiencies were noted at the chainplate attachment points." Kept existing
  bolt-through escutcheon option as a lower-severity alternative.

---

## v2300 — 2026-04-16

### Changed
- **Deck/coachroof spider cracks snippet — removed age redundancy.** When
  composed after "gelcoat and non-skid surfaces were in very good order...
  consistent with the age and care of the vessel", the spider cracks sentence
  repeated an age reference. Converted the trailing clause to a
  `{specify:}` token with three options: "typical of a vessel of this age"
  (when used alone), "consistent with normal weathering and use" (when age
  is already mentioned), or "these were cosmetic and not structural in
  nature" (for emphasis on structural soundness).

---

## v2299 — 2026-04-16

### Changed
- **Swim platform conductivity — added "fine for age" snippets.** Added 6 new
  C-rating snippets matching the hull conductivity pattern: readings ranged
  between `[insert reading range]`, consistent with vessels of similar age,
  readings not abnormal for the vessel's age, within normal range for
  fibreglass of this age, and a monitoring action item.
- **Propulsion narrative — auto-lowercase user-entered locations.** Engine bay
  location, engine access, gauges location, and controls location values now
  have their first character lowercased before insertion so the narrative reads
  naturally mid-sentence (e.g. "located under the cockpit" instead of
  "located Under the cockpit"). Dave can capitalize freely in the input fields.

---

## v2298 — 2026-04-16

### Changed
- **Hot water tank — proper surveyor language for C-rating observed snippets.**
  Replaced 4 generic snippets with 7 detailed observations covering: tank
  location (with `[insert location]` input), condition assessment, plumbing
  connections and hose clamps, electrical supply and wire gauge, pressure
  relief valve placement, engine heat-exchange plumbing, and absence of
  leakage at connections.

---

## v2297 — 2026-04-16

### Fixed
- **"in in good order condition" grammar fix across 5 snippets.** Fixed double
  "in" and removed "order". Replaced with `{specify:good|serviceable}`
  condition token so the surveyor can choose between "good condition" and
  "serviceable condition". Affected sections: Bilge/stringers/ribs, sails,
  additional sails, helm seat, windshield seals.

---

## v2296 — 2026-04-16

### Changed
- **Cockpit drains — proper surveyor language with drain count.** Replaced
  "found to be in order" with proper descriptions: "free of debris and drained
  the cockpit properly", "drain hoses in serviceable condition". Added
  `[insert count]` sentence: "The cockpit was fitted with [#] drains." so the
  surveyor can specify how many. Separated the "under the engine lid" location
  sentence from the function sentence so they can be composed independently.

---

## v2295 — 2026-04-16

### Changed
- **Cockpit, floor, seats and coaming — expanded snippets.** Replaced "presented
  no deficiencies" with 8 proper C-rating observed sentences: good condition,
  good for age, gelcoat intact, minor spider cracks for age, non-skid
  serviceable, locker lids secure, coaming solid, cushions serviceable.
  B-rating expanded from 1 to 7 observed sentences: spider cracks with
  location, worn non-skid, cracked locker lid, loose hinge, water ingress at
  coaming, floor flexing. Added matching means and action sentences.

---

## v2294 — 2026-04-16

### Fixed
- **Jib/genoa tracks/cars — sentence order.** Swapped severity values so "The
  jib tracks were solidly attached…" sorts before "The blocks were intact…"
  in the sentence picker (tracks are the primary subject of the section).

---

## v2293 — 2026-04-16

### Added
- **Winch manufacturer woven into composed sentences.** Selecting "Lewmar" (or
  any manufacturer) from the Winch Manufacturer dropdown dynamically replaces
  "All winches" → "All Lewmar winches", "The winch" → "The Lewmar winch" in
  both the checkbox labels and the composed textarea. Works with the "Other"
  free-text input too. Changing the dropdown updates everything in real time.

---

## v2292 — 2026-04-16

### Fixed
- **Deckline organizers — "to the deck" fragment.** The C-rating had "to the
  deck." as a standalone snippet that produced broken prose when combined with
  "...were securely fastened." Replaced with two proper full sentences: one
  ending "fastened to the deck." and one ending "fastened." No other fragment
  snippets found in the library.

---

## v2291 — 2026-04-16

### Changed
- **Main mast — dropdown values woven into composed sentences.** When the
  surveyor selects "Deck-stepped" or "Keel-stepped" and a sail track type,
  the sentence picker automatically incorporates these into every sentence
  containing "The mast" or "the mast". Example: "The deck-stepped mast with
  in-mast roller furling appeared straight and properly aligned…". Changing
  the dropdowns triggers an immediate rebuild of the composed text.

---

## v2290 — 2026-04-16

### Changed
- **Deck hatches/windows/portholes — reworked with [insert location] templates.**
  Replaced the generic "one or more hatches/windows/portholes" snippets with
  `[insert location]` template sentences. The surveyor types which specific
  hatch, window, or porthole is affected, then ticks the issue from a
  comprehensive list. B-rating issues now include: sealant lifting, sealant
  cracked at periphery, crazing, hairline crack, loose hinge, hinges come
  loose, worn seal, deteriorating bedding, frame corrosion, difficult to
  open/close, stiff dogs, non-functioning latch, UV damage, torn flyscreen.
  A-rating issues: cracked lens, hinge pulled free, severe frame corrosion,
  not watertight, frame separated from deck. Matching means and action
  sentences expanded for both ratings.

---

## v2289 — 2026-04-16

### Added
- **Cutlass bearing — minimal wear snippets.** Two new C-rating observed sentences
  for bearings with acceptable wear: "minimal wear consistent with age" and
  "rubber flutes remained defined."
- **Transom — integrated swim platform snippets.** "The transom contained an
  integrated swim platform" added for all three ratings (A/B/C) with condition-
  specific sentences for C (good condition) and B (cosmetic wear).
- **Propeller — expanded C-rating corrosion options.** Five new observed sentences:
  minor surface corrosion typical of age, light galvanic corrosion, electrolysis
  staining, no significant corrosion, and minor marine growth.

---

## v2288 — 2026-04-16

### Added
- **Deck hatches, windows and portholes — expanded snippets.** 29 new sentences
  covering B and A ratings. B-rating: sealant lifting (hatch/window/porthole),
  crazing (hatch/window/porthole), loose hinges, stiff porthole dogs, failing
  bedding — with matching means and action sentences. A-rating: cracked lens
  (hatch/window/porthole), hinge pulled free, severely corroded frames — with
  matching means and action sentences.

---

## v2287 — 2026-04-16

### Added
- **Grab rail material snippets — teak and stainless steel.** New observed sentences
  for C and B ratings let the surveyor specify the grab rail material (teak or
  stainless steel) and include material-specific condition notes (e.g., teak
  weathering/checking, stainless rust staining, teak structurally sound).

---

## v2286 — 2026-04-16

### Added
- **Deck percussion "all clear tone" snippet.** New C-rating observed sentence:
  "The deck and coachroof produced a clear and even tone throughout…" for cases
  where the entire deck tested clean (complements the existing "Most of…" option).

---

## v2285 — 2026-04-16

### Added
- **Deck condition C-rating: "very good condition" snippets.** Added three new
  sentences for newer or well-maintained decks with no cracks or defects. The
  existing "minor spider cracks" sentences remain for older vessels.

---

## v2284 — 2026-04-16

### Added
- **Camera zoom control.** The batch camera now resets to 1x zoom on open
  (previously defaulted to whatever iOS chose, often full magnification).
  A slider appears at the bottom of the viewfinder to adjust zoom from 1x
  to max. Fully isolated in its own try/catch — if the browser doesn't
  support zoom capabilities, the camera works exactly as before.

---

## v2283 — 2026-04-16

### Changed
- **Transducer C-rating: removed redundant anti-fouling sentence.** The singular
  "The transducer was securely mounted and not coated with anti-fouling" repeated
  what the plural sentence already says. Replaced with "The transducer face was
  clean and free of marine growth" — complementary rather than redundant.

---

## v2282 — 2026-04-16

### Changed
- **Conductivity testing snippets now include rudder(s).** Updated 7 existing
  sentences in the "Hull and rudder(s) conductivity testing" section to mention
  "hull and rudder(s)". Added 3 new rudder-specific sentences (A/B/C ratings)
  for cases where the rudder alone shows elevated readings — common on
  fibreglass rudders.
- **Stern tube C-rating reworded.** Replaced "functioning as intended" (implies
  operational testing) with visual-inspection language: "appeared to be in
  satisfactory condition with no visible signs of corrosion, damage, or
  misalignment at the time of the survey."

---

## v2281 — 2026-04-16

### Fixed
- **Hull percussion/impact testing snippets now mention rudder(s).** Six
  sentences in the "Hull and rudder(s) impact and resonance testing" section
  of `text_library.json` only referenced "the hull" — now they say "the hull
  and rudder(s)". The `pluralizeRudder()` function resolves `(s)` based on
  rudderCount (1 → "rudder", 2 → "rudders").

---

## v2280 — 2026-04-16

### Changed
- **Tapping the version number on any page now triggers a force-update.** The
  version label is tappable (blue, dotted underline) on the survey list, new
  survey, edit vessel info, and inspection checklist pages. Tapping it checks
  for a new service worker, downloads it, and reloads the app.

---

## v2279 — 2026-04-16

### Fixed
- **Version number now shows on the inspection checklist page** below the
  vessel name in the header. Was missing after the v2255 header redesign.

---

## v2278 — 2026-04-16

### Changed
- **Hull Colour, Boot Stripe Colour, and Deck Colour are now dropdowns** with
  the most common boat colours pre-populated. Each includes an "Other…" option
  that reveals a text input for custom colours. Existing surveys with custom
  colour values restore correctly.
- **"+ Add Owner" button** on Persons in Attendance — pulls the Client Name and
  adds them as "[Name] (Owner)" in one tap. Prevents duplicates and prompts if
  Client Name is empty.

### Fixed
- **Database JSON files now include cache-buster query params** (`?v=APP_VERSION`)
  on `boat_specs_db.json`, `boat_values_db.json`, `engine_db.json`, and
  `outdrive_db.json`. Previously only the template/library files had busters,
  so the browser/CDN could serve stale database JSON even after a version bump.
  This was preventing the newly added Oceanis 343 from appearing.

---

## v2277 — 2026-04-16

### Added
- **Beneteau Oceanis 343** added to `boat_specs_db.json` (2005–2008, sailboat).
  Includes deep keel (6'5") and shallow keel (4'9") draft variants. Aliases
  cover "Oceanis 343 Clipper" and "Beneteau 343".

---

## v2276 — 2026-04-16

### Fixed
- **Build Observation sentence picker now pluralizes rudder text.** The "tick
  sentences to compose" UI was rendering raw singular text even when 2 rudders
  were selected. Added `pluralizeRudder()` to both the picker display path and
  the `_kkRebuildFromSentencePicker` assembly path so composed text uses correct
  plural/verb forms.

---

## v2275 — 2026-04-16
### Added
- **Rudder count selector** — new "Number of Rudders" dropdown on the vessel info
  screen (1 or 2). Stored as `survey.rudderCount`.
- **Specs auto-fill for rudder count** — Oceanis 38 (and future entries) in
  `boat_specs_db.json` can carry `rudderCount`; auto-filled on specs apply.
- **Rudder pluralization throughout the app** — `pluralizeRudder()` function
  transforms all displayed labels and snippet text based on rudderCount:
  - Labels: "Rudder(s) condition" → "Rudder condition" or "Rudders condition"
  - Snippet text: "The rudder was" → "Both rudders were"; "rudder post" →
    "rudder posts"; "rudder stuffing box" → "rudder stuffing boxes"; verb
    agreement (was/were, is/are, has/have) auto-corrected.
  - Applied in: inspection view labels, notes sheet title, text library snippet
    cards, snippet insertion, report body text, report findings, report category
    headers, items-left popover.
- Internal labels retain the `(s)` form as the canonical storage key; only the
  display layer resolves singular/plural. Existing survey data is unaffected.
- Fixed stale `rudderCount: survey.driveLineCount` fallback in all seven
  token-expansion call sites — now correctly reads `survey.rudderCount`.

---

## v2274 — 2026-04-16
### Fixed
- **Save status pill disappeared** — `ensureReportButton()` guarded on a stale
  `reportBtn` ID that no longer exists, so the 500 ms retry setTimeout created a
  *second* bottom bar that visually covered the first (which held the pill).
  Changed guard to check `inspectionBottomBar` instead; the retry now correctly
  bails when the bar already exists.

---

## v2273 — 2026-04-16

### UI — Bottom bar layout: Save | Status | ⋯
- Bottom bar now uses `justify-content:space-between` with three items: Save button (left), save status pill (centre), ⋯ overflow menu (right).
- Save status pill is placed directly into the bar (flow-based, not fixed-position) when the bar exists, with a fixed-position fallback for screens without a bottom bar (e.g. home).

## v2272 — 2026-04-16

### UI — Align save status pill with bottom bar
- Adjusted pill position to sit at the same vertical level as the Save button (inside the bottom bar area, right-aligned) instead of floating above it.

## v2271 — 2026-04-16

### UI — Move save status pill to bottom
- Moved the "Saved Xm ago · N 📷 🔥" pill from the top-right corner to the bottom-right, just above the bottom bar. Frees up the crowded header area.

## v2270 — 2026-04-16

### UI — Vessel Type label cleanup
- Removed sailboat emoji from "Vessel Type:" label.
- Split "Vessel Type:" onto two lines to shift the Sail/Power buttons left and reduce crowding at the top of the inspection view.

## v2269 — 2026-04-16

### UI — Compact category headers, "N left" is the toggle
- Removed the separate "▾ Show items left" row — saves vertical space per category.
- "N left ▾" text on the right side of the header is now directly clickable to toggle the items-left popover. Tap it to expand the list, tap again to collapse.
- Changed accordion-header from `<button>` to `<div>` to avoid nested interactive element issues on iOS Safari. The clickable "N left ▾" span uses `stopPropagation` so it doesn't also toggle the accordion.

## v2268 — 2026-04-16

### Hotfix — Blank screen on load
- `const accordion` was declared twice in `updateCategoryHeader`, causing a SyntaxError that prevented app.js from loading. Removed the duplicate declaration (reuses the existing one from earlier in the function).

## v2267 — 2026-04-16

### Fix — Category header layout (take 3)
- Separated concerns: "N left" is now plain text right-aligned in the header (no click handler, no arrow inside the button). The "▾ Show items left" toggle is a separate `<div>` OUTSIDE the `<button>` element, between the header and the accordion content. This avoids all nested-interactive-element issues that were causing stray ▾ rendering on iOS Safari.
- Toggle text flips between "▾ Show items left" and "▴ Hide items".

## v2266 — 2026-04-16

### Fix — Progress text now actually on the same line as category title
- v2265 had a `<button>` nested inside the `<button class="accordion-header">` — invalid HTML that browsers fix by closing the outer button early, pushing "N left" onto its own line. Replaced the inner button with a `<span>` so everything stays in the same flex row.

## v2265 — 2026-04-16

### UI — Category header layout
- "N left" now sits on the right side of the header, same line as the category title, in matching font, size, and weight. A small ▾ arrow next to it toggles the items-left list; tapping ▾ again (now ▴) collapses it.
- Removed old CSS overrides (`font-size:12px`, `opacity:0.7`) from `.category-progress` that were shrinking and fading the text.
- Toggling the accordion (expand/collapse) now closes any open "items left" popover list, so the collapse chevron works as expected when the list is showing.

## v2264 — 2026-04-16

### Fixed — Camera shutter closes overlay on iOS
- **Root cause**: On iOS Safari, tapping the shutter button dispatched the click event to both the shutter AND the adjacent DONE button in the same flex container. `commitStagedPhotos` found `staged.length === 0` and immediately closed the camera — before the photo could be captured.
- **Fix**: Added `stopPropagation()` + `stopImmediatePropagation()` on all three camera buttons (shutter, close, done) so tap events stay on the button that was actually tapped.
- **Safety net**: `commitStagedPhotos` no longer closes the camera when staged is empty — it shows a "Take some photos first" hint instead. Even if the event leak recurs, the camera stays open.
- Removed all v2261–v2263 diagnostic code (MutationObserver, sessionStorage stack traces, red banner, diagnostic toasts, console.log statements in snapStagedPhoto).

## v2263 — 2026-04-16

### Camera diagnostic v2 — persistent stack trace
- Previous toast diagnostics collided (both used the same DOM element). Now the `closeBatchCameraOverlay` call stack is saved to sessionStorage and displayed as a persistent red banner after the camera closes. This will show exactly what function is calling closeBatchCameraOverlay when the shutter is tapped.

## v2262 — 2026-04-16

### Camera diagnostic build
- Visible on-screen toasts show whether the shutter handler fires, what removes the camera overlay, and whether the page reloads mid-camera. Temporary diagnostics to identify the root cause of the shutter-closes-camera bug.

## v2261 — 2026-04-16

### Camera fix — defer SW reload while camera is open
- The service worker `controllerchange` handler was reloading the page while the batch camera overlay was active, destroying the camera and returning the user to the inspection view with no photo captured.
- Now defers the reload until `closeBatchCameraOverlay()` runs (after Done or Close), then reloads to apply the update.
- Added diagnostic logging to `snapStagedPhoto` (try-catch + console logs) to trace any remaining camera issues.

### Removed "Auto-Generate Description" button
- The manual "✨ Auto-Generate Description" button on the edit-survey form was removed. It was redundant — the description already auto-generates from survey data each time you save.
- The button was also error-prone (read DOM fields that might not be loaded, causing crashes).
- Updated placeholder and helper text to clarify that the description builds automatically on save, and editing the field manually overrides it.

## v2260 — 2026-04-16

### Drive "Tap to sign in" from save dialog
- When Google Drive shows "Not signed in" in the save progress dialog, the row now shows "Tap to sign in" and is tappable. Tapping triggers Google sign-in, and if successful, immediately runs the Drive backup without closing the dialog.
- Works in both single-survey Save and Save All Surveys.
- **iPhone/iPad redirect flow fix**: On iOS, Google sign-in uses a redirect (page unloads). The dialog now detects this and shows "Redirecting to Google…" instead of waiting for a callback that will never come. After returning from Google, a green banner confirms "Google Drive connected — tap Save to back up to Drive."
- **iPad detection fix**: Modern iPads (iPadOS 13+) report as desktop Safari. Redirect detection now includes the `navigator.platform + maxTouchPoints` check to match DriveBackup's own logic, preventing a mismatch where the dialog expected popup flow but sign-in actually did a redirect.

### Firebase save speed fix (batch photo check)
- Previously, checking whether photos already exist on Firebase made one Firestore query per photo (e.g., 138 round trips for 138 photos = 13 seconds of waiting). Now uses a single batch query per survey to fetch all existing photo IDs at once. Should reduce the check from ~13s to under 1s.

### Progress bar fix for skipped photos
- Firebase progress bar was stuck at ~30% when all photos were already synced (the `continue` statement for skipped photos jumped past the progress update). Now the bar advances for every photo whether uploaded or skipped.

## v2259 — 2026-04-16

### Two-way sync between devices
- **Periodic sync every 5 minutes**: Polls Firebase for remote changes and pulls newer surveys down, pushes locally-newer surveys up. Catches updates that the real-time Firestore listener may miss after iOS backgrounding.
- **Foreground trigger**: When the app comes back to foreground (switching apps, waking the phone), an immediate sync fires with a 30-second throttle to prevent excessive calls.
- **Last-save-wins conflict resolution**: If the same survey was edited on two devices, the more recently saved version wins. The existing richness guard prevents a stale remote copy from overwriting a richer local one.
- **Cloud pull notification**: Toast shows "☁️ 2 surveys updated from cloud" when remote changes are pulled down, and home screen refreshes automatically.
- **Photo pull on sync**: When a remote-newer survey is pulled, its photos are also downloaded from Firebase Storage.
- `FirebaseSync.periodicSync()` exposed for manual trigger if needed.

### Firebase save crash fix & resume support
- **Skip already-synced surveys**: `backupAllEverywhere()` now fetches remote timestamps in one batch and skips surveys whose `lastModified` already matches. If the app quit mid-save, restarting and tapping Save again picks up where it left off instead of re-uploading everything.
- **Skip already-uploaded photos**: Before loading a photo from IndexedDB, checks Firestore metadata to see if it's already on Firebase Storage. Skips if so — avoids loading large base64 strings into memory unnecessarily. Applied to `pushAllPhotosForSurvey`, `backupAllEverywhere`, and `saveSurveyWithProgress`.
- **Memory pressure fix**: Photo references are nulled out immediately after each upload/download (`photo = null`, `blob = null`, `dataUrl = null`) so the garbage collector can reclaim memory between operations. Applied across all photo push and pull functions.

### Crash prevention hardening
- **No photo downloads during periodic sync**: `periodicSync()` only syncs survey metadata (JSON). Photos are only downloaded during explicit Save or initial sync (app launch). Prevents memory pressure from background photo downloads while mid-survey.
- **No photo downloads during camera use**: Real-time listener skips `pullPhotosForSurvey` when `_cameraActive` or `_backupActive` is true.
- **Skip active survey during periodic sync**: The survey currently being edited (`currentSurveyId`) is excluded from periodic sync to prevent overwriting unsaved form data.
- **Backup-active guard**: Periodic sync skips entirely if a save/backup operation is running.
- **Race condition prevention**: Real-time Firestore listener is paused (`_suppressLocalWrite`) during periodic sync to prevent concurrent writes.
- **Drive auto-sync guard**: Suppressed-mode saves (from periodic sync pulls) no longer trigger Drive auto-sync.
- **Listener stacking fix**: `visibilitychange` handler uses a named reference, removed before re-adding on `init()` re-entry.

## v2258 — 2026-04-16

### Progress bars in save dialog
- Each backend row (📱 This Device, 🔥 Firebase, ☁️ Google Drive) now shows a 6px progress bar that fills in real time as the save runs.
- **Single-survey save**: Local bar jumps to 100% on completion. Firebase bar fills to 30% after survey data, then scales 30→100% as photos upload. Drive bar tracks the `percent` callback from the Drive upload loop.
- **Save All Surveys**: Each backend's bar fills proportionally as surveys complete (e.g., 3 of 10 = 30%). Drive bar interpolates intra-survey photo progress for smooth fill.
- Bars animate with a 0.3s CSS transition for a smooth visual.
- Bar colours: blue during progress, green on success, grey on skip, red on failure.
- `SaveProgress.setProgress(backendId, percent)` API added to the module's public interface.

## v2257 — 2026-04-16

### Per-backend save progress dialog
- New `SaveProgress` dialog shows a row for each save destination (📱 This Device, 🔥 Firebase, ☁️ Google Drive) with real-time status per row: ⏳ waiting → saving detail → ✅ done / ⚠️ failed / ⊘ not connected.
- **Inspection & Edit Intro**: "💾 Save" now opens the progress dialog showing each backend's status as the save runs. Single survey only.
- **Home screen**: "💾 Save All Surveys" shows the same dialog, iterating through all surveys with per-backend progress.
- Cancel button available during save — partially completed backends stay saved.
- Elapsed timer shown at bottom of dialog.
- `saveSurveyWithProgress(surveyId)` shared function used by both inspection and edit intro screens.

## v2256 — 2026-04-16

### Clean bottom bar — Save + overflow only
- Inspection bottom bar now shows only **💾 Save** and **⋯** (overflow menu).
- **📄 Generate Report**, **✅ Pre-Flight Check**, and **✏️ Edit Vessel Info** moved into the overflow menu, above the existing Recover Photos / Remove Date Stamps / Force Update options.
- Divider line separates primary actions from utility actions in the menu.

## v2255 — 2026-04-16

### One save button everywhere
- **Home screen**: Removed separate "☁️ Backup to Drive" and "🔥 Sync All to Firebase" buttons. Replaced with single "💾 Save All Surveys" that pushes every survey + photos to all connected backends.
- **Inspection screen**: Replaced "💾 Backup" with "💾 Save" — saves locally, pushes to Firebase, and uploads to Drive (with photos) in one tap.
- **Edit Intro screen**: Same — "💾 Save" replaces "💾 Backup", calls `saveEverywhere()`.
- **`backupAllEverywhere()` function**: New unified home-screen backup that pushes all surveys to Firebase + Drive with progress dialog. If neither backend is connected, prompts Drive sign-in first.

### Header and save pill layout fixes
- Removed version number from inspection header — cleaner, more room for vessel name.
- Reduced logo size slightly (36px → 32px) and tightened header gaps.
- Save pill moved down to `82px + safe-area` so it no longer overlaps the survey-type banner (e.g., "INSURANCE SURVEY").

## v2254 — 2026-04-16

### Drive session expiry warning
- Amber warning banner appears at the top of the screen when the Google Drive token expires (~55 minutes after sign-in).
- Banner includes a one-tap "Sign In" button to reconnect without leaving the current screen.
- "Dismiss" button hides the banner if you don't need Drive right now.
- Checked every 60 seconds and also triggered when an auto-sync detects the expired token.
- Banner auto-hides when sign-in succeeds (popup or redirect flow).

## v2253 — 2026-04-16

### Consolidated save architecture
- **Automatic Drive sync**: Survey JSON auto-pushes to Google Drive every 30 seconds (throttled, non-blocking). Uses a single `_autosync.json` file per vessel that overwrites on each push — no duplicate files.
- **Save pill → Save Now button**: Tapping the save status pill forces an immediate save to all three backends (IndexedDB + Firebase + Drive). Long-press shows the detail panel.
- **`saveEverywhere()` function**: Unified force-save accessible from any screen. Collects current form data, saves locally, pushes to Firebase, and pushes survey JSON to Drive — all in one tap.
- **Drive token persistence**: OAuth token saved to localStorage and auto-restored on app restart. Dave stays "signed in" to Drive across sessions (token valid ~55 minutes; silent refresh on desktop, graceful expiry on iOS).
- **Graceful token expiry**: Auto-sync skips silently when the Drive token has expired rather than triggering a disruptive redirect on iOS. Sign in again from the home screen when convenient.
- **Backend indicators on pill**: Shows 🔥 (Firebase) and ☁️ (Drive) icons on the save pill when those backends are connected.
- **Updated detail panel**: Long-press the pill to see per-backend status (Local, Firebase, Drive) with connection state and sync timing.
- **F&R explanatory text removed**: Duplicate rating definitions under Findings & Recommendations removed (already in Use of Ratings section).

## v2252 — 2026-04-16

### Condition sentence uses surveyor's BUC grade
- Extracted `_buildConditionSentence(survey)` as a shared function used by all three vessel description builders (sail, power, human-powered).
- When the surveyor sets an overall condition (Excellent/Bristol, Above Average, Average, Fair, Poor, Restorable), the description now uses a tailored sentence matching that grade instead of inferring from A/B/C rating distribution.
- Rating-distribution heuristic retained as fallback when no BUC grade is set.
- Fixed "her size" → "its size" in the Average condition sentence.
- One-time migration updates existing surveys whose saved vessel description had a heuristic sentence that doesn't match the BUC grade.

### F&R explanatory text removed
- Removed the 5-paragraph explanatory block under the Findings & Recommendations heading (rating definitions, repair advisory). This was a duplicate of the "Use of Ratings" section near the top of the report.

---

## v2251 — 2026-04-16

### Survey Checklist Summary removed from report

- **Entire section removed** — the Survey Checklist Summary showed every inspected item in a table (rating, finding code, truncated notes, standards) in the same category order as Detailed Survey Findings, just without photos. The Findings Overview count table provides the at-a-glance numbers, Detailed Survey Findings carries the full observations + photos, and Findings & Recommendations groups items by severity. The checklist summary added a full page+ without unique value.
- **TOC updated** — "Survey Checklist Summary" entry removed. Report now has 15 sections in the Table of Contents.
- **Dead code cleaned** — `tableRow` counter and all checklist summary rendering logic removed.

### Safety Equipment & Instruments rendered as finding blocks

- **Safety Equipment — TC TP 511** converted from a 6-column table to individual finding blocks matching the Detailed Survey Findings style: colored left border (green = on board, red = missing), bold equipment name + status pill, requirement line, notes text, and photos using the standard `report-photo-card` / `report-photo-row` layout. Items grouped by category with sub-headers.
- **Instruments & Electronics Inventory** converted the same way: colored left border (green/red/grey), bold name + status pill, make/model/year spec line, AI details, notes, and photos. All sections now have a consistent visual style throughout the report.

### Additional fixes

- **Persons in Attendance** default corrected to "Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor" (with comma after name) — all three instances (display, hidden input, attendee list builder).
- **Vessel description "She" → vessel name** — all six instances of "She has an overall length" and "She is [rig]-rigged" in the three description builders (sail/power/human-powered) now use `"${vesselName}"` instead.
- **One-time migration** — on first load, all existing surveys are patched: old personsInAttendance formats replaced with the correct string, and "She has/is" in saved vessel descriptions replaced with the quoted vessel name.
- **Tax Status / Compliance Plate** — these fields are now omitted from the Vessel Documentation section of the report when left blank, instead of showing "N/A". Compliance plate row also omitted when no photo is captured.
- **SaveStatus pill repositioned** — moved from `top: 8px` (overlapping header) to `top: 60px` (just below the header bar) so it no longer covers navigation buttons or content.

### Report section reorder

- **Safety Equipment and Instruments moved after Detailed Survey Findings** — previously sat before it. New order: Findings Overview → Detailed Survey Findings → Safety Equipment → Instruments & Electronics → Findings & Recommendations → Rating & Valuation → Surveyor's Certification.
- **TOC updated** — now 16 entries (Instruments & Electronics added to TOC; order matches report body).

---

## v2250 — 2026-04-16

### Report redundancy reduction

- **"Notes Regarding Report Format" section removed** — it was a numbered list of every section, immediately followed by the Table of Contents which listed the same sections. Removed entirely; TOC entry also removed.
- **Purpose and Scope trimmed** — previously repeated most of the content in Methodology and Limitations (non-destructive methods, no panel removal, engine/electrical/tankage limitations, not a warranty/guarantee). Now a concise 3-sentence statement of intent; the bold standards-applicability disclaimer is retained. All detail lives exclusively in Methodology and Limitations.
- **Findings Overview A/B bullet lists removed** — previously listed every A and B finding by code + label, duplicating the Findings & Recommendations section. The count table remains as an at-a-glance summary.
- **Post-checklist summary count line removed** — the A/B/C/NT/PO counts at the bottom of the Survey Checklist Summary table duplicated the Findings Overview table. Removed.
- **Dead code cleanup** — `_foAllA` and `_foAllB` variables (only used by the removed bullet lists) removed.

---

## v2249 — 2026-04-16

### Google Drive sign-in fix for iPhone / PWA

- **Redirect-based auth for iOS**: `signInWithPopup` is broken on iOS Safari and in PWA standalone mode (popups are blocked or can't return credentials). Drive sign-in now detects iOS and standalone mode and uses `signInWithRedirect` + `getRedirectResult` instead. On page reload after the redirect, the Drive access token is captured automatically and the home screen re-renders to reflect the signed-in state.
- **Startup redirect check**: `DriveBackup.checkRedirectResult()` is called during `initApp()` to pick up any pending redirect result.

### Accordion restore fix (section collapse on drive line change)

- **Section stays open after config changes**: `restoreAccordionState()` was using `header.nextElementSibling` to find the accordion content div, but a `flagged-summary` div between the header and the content div caused it to find the wrong element. Now uses `header.parentElement.querySelector('.accordion-content')`, matching the same pattern `toggleAccordion()` already uses. Hull exterior (and all other sections) now stays open after changing drive line count, drive type, or rudder settings.

---

## v2248 — 2026-04-16

### Batch camera portrait crash fix

- **Portrait shutter crash fixed**: The `getUserMedia` constraints requested `width: 1920, height: 1080` (landscape). On iOS Safari in portrait, the browser couldn't match those constraints and fell back to the full native sensor resolution (4032×3024). When `snapStagedPhoto` created a canvas at that size (~48 MB) and called `toDataURL`, iOS killed the tab. Two fixes applied: (1) `getUserMedia` now requests `width: 1920, height: 1920` — same ideal on both axes lets the browser pick the natural orientation without implying landscape; (2) `snapStagedPhoto` caps the canvas at 2048 px on the long edge before drawing, preventing memory-pressure crashes regardless of what resolution the stream provides.

### Propeller/drive anode singular/plural

- **Anode snippets now adapt to drive line count**: All 18 "Propeller/drive anode(s)" text library snippets tokenized with `{drives:singular|plural}`. Single-shaft vessels now produce "The anode was…" / "Replace the anode…"; twin-shaft vessels produce "The anodes were…" / "Replace the anodes…".

### Header navigation improvements

- **Save status pill no longer blocks header buttons**: The `.header` CSS now sets `position:relative;z-index:1600`, above the SaveStatus pill's `z-index:1500`. The ← back button is always tappable regardless of pill width.
- **Logo taps navigate home**: On the New Survey, Edit Intro, and Inspection screens, tapping the Kiki Marine logo navigates to the home screen (with appropriate save/abandon confirmation where needed).

---

## v2247 — 2026-04-16

### Service worker stability (pre-survey hardening)

- **Removed 60-second SW polling**: `setInterval(() => reg.update(), 60000)` deleted. The SW still updates on navigation via `updateViaCache: 'none'`, but no longer polls mid-survey — eliminates the risk of a forced reload while entering data.
- **Removed force-navigate on SW activate**: The `clients.matchAll()` + `client.navigate(client.url)` in the SW `activate` handler was causing crash-like full-page reloads on iPhone PWA whenever a new worker activated. Removed — the `controllerchange` listener in `app.js` already handles graceful reloads.
- **Cached firebase-auth-compat.js**: Added the missing auth SDK script to `URLS_TO_CACHE` in `sw.js`. All four Firebase SDK scripts loaded by `index.html` are now pre-cached, preventing brittle offline startup if auth is needed.

---

## v2246 — 2026-04-16

### Critical bounce-back fix, local logo, view-restore fix

- **Firebase sync bounce-back fix (CRITICAL)**: `renderHome()` called unconditionally after Firebase initial sync completes is now guarded with `if (currentView === 'surveys')`. Previously, if the user navigated to the new-survey form before sync finished, the async callback would fire `renderHome()` and bounce them back to the home screen.
- **Photo download bounce-back fix**: Same guard applied to the photo-download completion callback — `renderHome()` only fires if the user is still on the surveys list.
- **View-restore fix**: Session restore for `edit-survey` view was calling non-existent `editSurvey()` — corrected to `editSurveyDetails()`.
- **Local logo**: `new_logo.png` downloaded locally into the app directory. All six references in `app.js` and the service worker cache list in `sw.js` updated from the cross-origin URL (`kikimarinesurveyor.ca`) to the local file. Eliminates the CORS error on GitHub Pages.

---

## v2245 — 2026-04-16

### Date integrity, richer description, photo cleanup, audit fixes

- **Date-integrity validation**: `generateReport()` now checks all photo capture timestamps against the survey/report date. If any photo was taken after the certified date, a warning dialog explains the issue and offers to go back and fix it. Prevents underwriter-rejectable chronological discrepancies.
- **Auto-strip date stamps from report photos**: `compressPhotoForReport()` removes the YYYY-MM-DD date stamp from the bottom-right corner of photos during report generation. Original photos in IndexedDB are untouched; only the printed output is date-free.
  - v2245 audit fix: stamp removal now guarded — checks average brightness of the stamp region first. Only strips if a dark rectangle is detected (avg brightness < 100). Unstamped photos are left intact.
  - v2245 audit fix: uses widest possible date glyphs ('2088-08-08') for `measureText` plus +8px safety margin and +4px height margin, matching the geometry used by `removeDateStampFromPhoto()`.
  - v2245 audit fix: tiling loop uses single-row `putImageData` (cleaner, matches standalone remover).
  - v2245 audit fix: `console.warn` on failure for field debugging.
- **Richer vessel description template**: All three description builders updated:
  - Ballast included for sailboats when available
  - Hull/deck colours woven into the identification paragraph (not a standalone sentence)
  - "Below decks" paragraph groups accommodation with electrical and electronics
  - Auto-derived condition assessment from ratings distribution (good/fair to good/fair/significant deficiencies) replaces the generic placeholder
  - v2245 audit fix: driveType auto-resolution ported to Copies 1 and 2 (was only in Copy 3). `survey.driveType` now resolves to "shaft drive", "sterndrive", "saildrive", or "IPS pod drive" in all three builders.
- **Smaller report photos**: Inline photos reduced from 320×240 to 260×195 (same 4:3 ratio, ~35% less page area). Fits 3 across on a standard page width.
- **Finding classification fix**: "Not verified" and standalone "NT" rating values now correctly bucketed into the NT findings group in Findings & Recommendations (previously fell through unhandled).
- **Landscape camera fix**: Batch camera overlay now responsive in landscape orientation. Layout switches from column to row — video fills the left side, shutter/done buttons stack on the right, header and photo strip are hidden. Close button overlaid on the viewfinder in landscape. Prevents the "tiny horizontal slit" viewfinder on iPhone landscape.

---

## v2243 — 2026-04-16

### Report concision, accuracy, and structure fixes

- **Checklist summary truncation**: ALL items (including A/B) now show first sentence only in the at-a-glance summary table. Full text remains in Detailed Survey Findings.
- **F&R compact tables**: C, NT, and PO findings in Findings & Recommendations rendered as compact three-column tables (Finding / Item / Summary) instead of individual blocks with border-left styling. A/B findings retain the full block format with recommendations. Estimated page reduction: 8–10 pages.
- **Standards auto-merge**: New `mergeTextStandards()` helper scans observation text for ABYC, TC/TP, SAE, NFPA references and merges any not already in the checked standards list. Applied to Detailed Findings, Checklist Summary, and F&R citations.
- **Comparables language**: The Valuation Worksheet preamble now says "source was used" instead of "source and comparable were used" when no comparables are recorded.
- **Notes Regarding Report Format**: Now lists all 16 sections in actual print order, starting from Purpose and Scope through Surveyor's Certification.
- **Powered Up Only (PO) rating defined**: Added PO definition to the Use of Ratings section (previously used in the report but never defined).
- **Use of Ratings heading**: Simplified from the long "USE OF A, B, C, NOT TESTED AND SAFETY EQUIPMENT RATINGS" to "USE OF RATINGS".
- **Vessel description template**: Hull/deck colour sentences now omitted when data is unknown (instead of producing [COLOUR] placeholders that get stripped). Removed galley template sentence. Cosmetic condition sentence simplified. Electronics prose polished.

---

## v2241 — 2026-04-16

### Report quality fixes (from 64-page PDF review)

- **Photo captions**: First photo under each item keeps the item label; subsequent photos are numbered "photo 2 of N" etc. instead of repeating the same caption.
- **Vessel Description spacing**: Defensive fix ensures a period followed by a capital letter always gets a space (fixes "14,100 lbs.The electrical system" run-together).
- **cleanupTypos on checklist summary**: The typo-correction pipeline (`cleanupTypos()`) now runs on checklist summary table text too (previously only ran on Detailed Findings and F&R, so "th operation" etc. slipped through).
- **Estimated Replacement Cost conditionals**: Notes Regarding Report Format, the Summary paragraph, and the Valuation Worksheet preamble now omit "Estimated Replacement Cost" when the field is empty instead of referencing it.
- **B-finding recommendations**: Extract the specific action sentence from the surveyor's observation text (e.g., "Replace the depleted anodes before relaunching the vessel.") and prepend it to the standard recommendation. Disclaimer-style sentences are excluded.

---

## v2240 — 2026-04-16

### Fixed — Safety photo ReferenceError in report generation

The v2239 safety-photo render code referenced an undefined
`safetyPhotoFallback` variable, which would cause a ReferenceError. Removed
the broken fallback and added diagnostic `console.warn` logging when a safety
photo is missing from the pre-load cache.

### Fixed — Date-stamp removal reading wrong field (`photo.data` → `photo.dataUrl`)

`removeAllDateStamps()` read `photo.data` instead of `photo.dataUrl`, so the
function silently did nothing. Corrected to use the actual IndexedDB field
name.

### Changed — Removed C-rated recommendation boilerplate from F&R

The generic "Recommendation: Address in keeping with good marine maintenance
practices." line that appeared on every C-rated finding has been removed.
A- and B-rated findings keep their specific recommendation text.

### Changed — Removed cross-reference sentences from F&R

The "See full observation and N photos in Detailed Survey Findings → ..."
sentences below each finding have been removed. These are unnecessary on a
printed report where the reader can see the Detailed Findings section directly.

### Added — Surveyor's signature image in Surveyor's Certificate

Dave's signature image (`signature.png`) is now pre-loaded during report
generation, converted to base64, and displayed above the "Signed:" date line
in the Surveyor's Certificate section. Works in both Print/PDF and Word export.

### Changed — v2239 iterative report cleanup (previously unbundled)

Captures several v2239 changes that were made iteratively but not logged:
- Executive Summary: removed vessel info table and FMV row (redundant)
- Valuation Worksheet: removed Subject Vessel info block (redundant)
- Comparables table: suppressed when no comparable vessels are listed
- GPS location block: removed from below Survey Conditions table

### Changed — Report section reorder: Rating Definitions + Findings Overview

The Rating Definitions ("Use of Ratings") section moved from before the
Table of Contents to immediately after Vessel Description — right before
the Checklist Summary, where the ratings first appear. The Findings
Overview table and Key Items lists (formerly the Executive Summary) now
follow the Rating Definitions. The Executive Summary section has been
removed entirely. The TOC, Notes Regarding Report Format, and section
numbering all updated to match. Cover page footer tagline removed.

### Changed — Rating & Valuation moved to end of report

The Rating & Valuation section (BUC grading, Statement of Valuation,
valuation figures, methodology, and Valuation Worksheet) moved from
near the top of the report to just before the Surveyor's Certification.
The reader now sees all evidence (checklist, detailed findings, F&R)
before the valuation conclusion.

### Changed — "Surveyor's Certificate" renamed to "Surveyor's Certification"

All references in the report body, TOC, and Notes Regarding Report Format
updated.

### Changed — Signature image repositioned above name, reduced to 140px

The surveyor's signature now appears above "Dave Seagrim" (not below
the contact details) and is 30% smaller (140px vs 200px).

---

## v2239 — 2026-04-16

### Fixed — FMV formatting bug ($18 instead of $18,000)

Root cause: `parseInt('18,000')` stops at the comma and returns 18. All
valuation fields in the report (Executive Summary + R&V IIFE) now strip
non-numeric characters before parsing. Additionally, valuation input fields
now auto-format with commas as the user types and show an inline red warning
when the entered value is suspiciously low (< $500).

### Fixed — Vessel Description placeholders appearing in report

The auto-generated vessel description contained bracketed placeholders like
`[XX] horsepower` and `[COLOUR]` that were never filled. A new
`cleanupPlaceholders()` function runs at report time and strips any sentence
still containing `[BRACKETED]` template artefacts, so the printed report
only shows finalised prose.

### Changed — Checklist Summary truncation for C-rated items

To reduce redundancy between the three report sections (Checklist Summary,
Detailed Survey Findings, Findings & Recommendations), C-rated and
lower-severity items in the Checklist Summary table now show only the first
sentence of the surveyor's notes, with an ellipsis. A/B findings keep the
full text since they require the reader's immediate attention.

### Changed — Executive Summary lists all A and B findings

The Executive Summary previously capped at 3 items per severity with an
"…and X more" overflow link. Since this is printed on paper, the reader needs
the complete list. All A and B findings now appear in full.

### Added — Common typo auto-correction at report time

New `cleanupTypos()` function runs on all item text during report generation,
fixing patterns like "th operation" → "the operation", "located engine
compartment" → "located in the engine compartment", "appeared to be in
without deficiencies" → "appeared to be without deficiencies", and collapsed
double words ("the the" → "the", "was was" → "was").

---

## v2238 — 2026-04-16

### Added — Field-level exclude from report

Every intro-page form field (except Vessel Name and Year/Make/Model) now has a
⊘ toggle that excludes it from the generated report. Toggled fields dim to 45%
opacity with a red ⊘ indicator. Exclusions are saved per survey in
`excludedIntroFields[]` and checked via `_excl()` / `_row()` helpers in report
generation. Applies to General Vessel Info, Vessel Specs, Survey Conditions,
Vessel Documentation, and Vessel Description tables.

### Added — Photo date stamp removal tool

New "Remove Date Stamps" option in the inspection overflow menu (⋯ → 🗓 Remove
Date Stamps). Processes every photo in the current survey — doc photos, checklist
item photos, and safety equipment photos — using canvas pixel sampling to paint
over the bottom-right date overlay added by `addDateStampToPhoto()`. Each photo
gets a fresh IndexedDB transaction to avoid IDB auto-close during async canvas
work.

### Fixed — Report footer redundancy

Footer branding consolidated per Dave's exact wording: top line reads
"KIKI MARINE · (647) 289-7876 · dave@kikimarine.ca · kikimarine.ca"; bottom line
reads "Based in Toronto serving marinas and boatyards from Niagara to Pickering,
Muskokas, Simcoe and the Kawarthas." Applied to running page footer, cover page,
and Surveyor's Certificate.

---

## v2237 — 2026-04-16

### Added — Executive Summary page

New section after four-corner photos (near front of report) with: vessel info
table (YMM, HIN, condition rating, FMV), findings overview table (A/B/C/NT/PO
counts + safety equipment status), top 3 A findings, and top 3 B findings.

### Changed — Rating & Valuation moved to front of report

R&V section (BUC grading, Statement of Valuation, valuation figures, methodology,
worksheet, and comparables) relocated from after Safety Equipment to immediately
after the Executive Summary. TOC and Notes Regarding Report Format updated to
reflect new section order.

### Fixed — Skipped safety items still showing as missing in report

Items marked as skipped (individual or sub-category) in the Safety Equipment
section were still counted as "missing" in the report, Executive Summary,
description builders, and Check Report validator. All six locations now filter
out skipped items using the same `!e.skipped && !skippedCategoriesMap[e.category]`
pattern already used in the in-app accordion.

### Changed — Valuation sources singular/plural

When only one valuation source is consulted, all labels in the report now read
"Valuation Source" (singular) instead of "Valuation Sources". Applies to the
figures table, worksheet header, sources row, and worksheet introduction text.

### Changed — Report branding improvements

Running page footer now shows "Kiki Marine · (647) 289-7876 · kikimarine.ca"
in brand blue, with vessel name centered and page numbers on the right.
Surveyor's Certificate footer restyled with cleaner layout matching letterhead
aesthetic. Cover page footer updated with consistent branding bar.

### Fixed — Website domain corrected to kikimarine.ca

All report text references changed from kikimarinesurveyor.ca to kikimarine.ca.
Logo image URLs remain pointed at the image host.

### Changed — Home page header aligned with Edit Intro form

Home page header now uses the same branded layout (header-title + header-subtitle)
as the Edit Intro and inspection views for visual consistency.

---

## v2236 — 2026-04-15

### Changed — Report redundancy reduction (major page-count savings)

Findings & Recommendations now shows only the first sentence of each
observation, with a cross-reference to the full text + photos in Detailed
Survey Findings. Previously the entire observation was repeated verbatim.

Checklist Summary notes remain full-length (reverted mid-v2236 at surveyor's
request — complete notes are essential for at-a-glance review).

### Added — Hull / deck / boot stripe colour fields

Three new text fields on the Edit Intro form (Hull Colour, Boot Stripe Colour,
Deck Colour) auto-fill the `[COLOUR]` placeholders in the vessel description
template. All three description-builder functions updated.

### Added — Check Report warns on unfilled description placeholders

Scans the vessel description for `[UPPERCASE]` template tokens and flags them
as warnings with a count and list of unique placeholders found.

### Added — FMV sanity check in Check Report

If the concluded FMV, low value, or high value is under $500, a critical/warning
issue is raised suggesting a data-entry error (e.g. "$25" → "Did you mean $25,000?").

### Fixed — Safety equipment "and N more" truncation

Missing safety items in the vessel description were capped at 5 names with
"and N more". Now lists all missing items — there are rarely more than ~14 total,
so a single sentence handles them cleanly.

### Fixed — Outdrive / saildrive standards reference

Outdrive and saildrive checklist items now auto-apply both ABYC P-4 (Inboard
Engines) and ABYC E-2 (Cathodic Protection), since those items explicitly cover
corrosion and anodes. Previously only P-4 was cited. The consumer of the map
(`getStandardForItem`) now handles both string and array values.

---

## v2235 — 2026-04-15

### Added — Compact R&V summary after General Vessel Information

Matches the layout from Norm Behring's reference report (page 6). A bordered
3-line table showing Vessel Overall Rating, Estimated Market Value, and
Estimated Replacement Cost appears immediately after the General Vessel
Information table — only when at least one valuation field is filled. Shows
CAD/USD when exchange rate is available.

### Fixed — "was located [insert location]" preposition gap

Changed 4 text library snippets from "was located [insert location]" to
"was located in the [insert location]" so surveyors typing a bare noun
(e.g., "engine compartment") don't produce "located engine compartment".

---

## v2234 — 2026-04-15

### Added — Check Report warns on C-rated items with blank notes

Previously only A/B items without notes triggered a warning. C-rated items
also appear in the report body and Findings & Recommendations — blank notes
look incomplete to the reader. Now flagged as a warning-level issue.

### Fixed — Grammar errors in text library snippets

Corrected 5 instances of "in without deficiencies" → "in serviceable condition
without deficiencies" across forestay, sails, flybridge, table/support, and
shore power cable snippets.

### Fixed — PO (Powered Up Only) rating in report totals

"Powered up only" items were silently dropped from the report findings because
they had no bucket in the classification loop. Now:

- Added `PO` bucket to `findings` and `findingCount` objects
- PO items classified with `startsWith('Powered')` — appears between C and NT
  in the priority chain
- Checklist Summary totals now show PO count (conditionally, only when > 0)
- Findings & Recommendations includes a "Powered Up Only" sub-section
- Finding codes use `PO-1`, `PO-2`, etc.
- F&R intro text updated to mention "Powered up only"

### Fixed — TP 511 safety bracket auto-update on LOA change

The TC TP 511 safety equipment checklist was generated once when the
inspection view first rendered. If LOA was empty at that point (common when
creating a survey before specs auto-fill), the bracket defaulted to "Not
over 6 metres" and was never corrected — even after LOA was filled in. A
33-foot vessel could end up with under-6m safety requirements.

- Added `autoUpdateSafetyBracket(survey)` — detects when the current LOA or
  vessel type produces a different bracket than the stored one, regenerates
  the checklist (preserving existing checked/notes/photos/skipped state), and
  shows a toast like "Safety bracket updated: Not over 6m → 9m to 12m"
- Hooked into `saveSurveyDetails()` — fires every time the intro form is saved
- Hooked into `renderInspection()` — fires on inspection entry (catches
  bracket mismatches from previous sessions)
- Added Check Report warning: if the stored bracket doesn't match the current
  LOA, a critical-level issue is raised with specific bracket names
- Guard: skips regeneration if LOA is still empty (would just produce under6
  again)

---

## v2233 — 2026-04-15

### Changed — Unified refined aesthetic across all pages

Harmonised the visual weight of every page (New Survey form, Edit Intro,
Inspection view, bottom sheets, modals) to match the home page's lighter,
more delicate design language.

- **Buttons:** Removed gradient from .btn-primary; all button classes now use
  pill-shaped border-radius (14px) with lighter box-shadows
- **Form headings:** Reduced from 20px bold blue with 2px border to 13px
  uppercase slate-gray with 1px #e2e8f0 divider (matches home month headers)
- **Form labels:** Lighter weight (14px, #475569 slate instead of #333 black)
- **Inputs:** Border colour standardised to #e2e8f0; softer focus ring (2px
  at 8% opacity instead of 3px at 15%)
- **Header:** Thinner bottom border (1px #e2e8f0 instead of 2px #3399cc);
  lighter shadow; title reduced from 20px/700 to 17px/600
- **Back button:** Softer background (#f1f5f9); matched border-radius (10px)
- **Accordion headers:** Reduced min-height from 60px to 48px; font from 16px
  to 14px; tighter padding (12px 14px)
- **Cards & items:** All border colours aligned to #e2e8f0; border-radius to
  10px; subtle background tints (#f8fafc, #f1f5f9) instead of generic grays
- **Progress bar:** Slimmed from 8px to 4px height
- **FAB:** Flat gold fill (no gradient); smaller (52px); lighter shadow
- **Bottom sheet:** Softer dividers (#f1f5f9); pill-style action buttons
- **Modal:** Slightly more rounded (14px); lighter shadow

All changes are CSS-only — no JavaScript logic modified. No layout shifts or
functional behaviour affected.

---

## v2232 — 2026-04-15

### Changed — Brand colour alignment (#006699 → #066aab)

Unified the entire app UI to use the kikimarinesurveyor.ca brand colour
#066aab. Previously the app chrome (headers, buttons, accents, checkboxes,
toasts, dialogs, bottom sheets) used #006699 while the report already used
#066aab. Now both are consistent.

- index.html: 13 occurrences of #006699 → #066aab (header, buttons,
  gradients, borders, active states, accent-color)
- app.js: 106 occurrences of #006699 → #066aab (inline styles across
  component builder, bottom sheets, photo panels, dialogs, inspection UI)
- Header box-shadow rgba updated to match new primary

---

## v2231 — 2026-04-15

### Added — Skip Comparables toggle and Final Concluded Value field

**Skip Comparables:** A "Skip" checkbox next to the "Comparable Vessels"
heading on the Vessel Info form hides the comparables entry section. When
skipped, the Comparable Vessels / Market Research table is omitted from
the generated report. The Check Report audit suppresses the "No comparable
vessels entered" warning when comparables are skipped. Flag persists via
`survey.skipComparables`.

**Final Concluded Fair Market Value:** A new USD input field between the
FMV range and Replacement Cost. This is the surveyor's single concluded
figure after weighing all sources and condition — matching the Norm Behring
report style. Appears prominently in the Rating & Valuation report section
with CAD conversion emphasised in brand colour, and is also shown in the
Valuation Worksheet. Check Report warns if the field is empty.

---

## v2230 — 2026-04-15

### Fixed — Propeller/shaft/outdrive observations removed from Vessel Description

The auto-generated Vessel Description was pulling propeller, shaft, stern
tube, cutlass bearing, and outdrive inspection text from rated checklist
items into the description paragraph. These engine-section observations
(e.g. "Both anodes were more than 50% depleted…") do not belong in the
general vessel description — they already appear in the Engine(s) and
drive(s) Detailed Survey Findings and propulsion narrative.

Removed the `propDesc` block from all three description-builder functions:
`generateVesselDescription()`, `regenerateDescriptionFromInspection()`, and
`buildDescriptionFromSurvey()`.

---

## v2229 — 2026-04-15

### Changed — Consolidated Rating & Valuation into a single report section

Previously, rating and valuation content was scattered across four
locations in the generated report:

1. An early "Rating & Valuation" summary box (after General Vessel Info)
2. "Summary of Vessel Condition" (after Findings & Recommendations)
3. "Statement of Valuation" (after Summary of Vessel Condition)
4. "Valuation Worksheet" (final section before Surveyor's Certificate)

All four have been merged into one comprehensive **RATING & VALUATION**
section positioned immediately before Detailed Survey Findings. The
consolidated block contains:

- BUC Marine Grading System definitions
- Overall Vessel Condition rating (highlighted in brand colour)
- Statement of Valuation (FMV legal definition)
- Valuation figures table (CAD emphasised, USD as source of record)
- Appraisal methodology and summary
- Condition adjustment statement
- Valuation Worksheet (subject vessel, sources, comparables table)

This gives the reader the full verdict in one place, right before the
evidence that supports it — matching the Norm Behring J100 report flow.

Updated the "Notes Regarding Report Format" and Table of Contents to
reflect the new section ordering.

---

## v2228 — 2026-04-15

Report-only pass addressing SAMS-style feedback and a stack of small
follow-ups. No app-UI changes in this release.

### Fixed — Broken "Survey Location Map" on the report

The General Vessel Information block rendered an OpenStreetMap static
image via `staticmap.openstreetmap.de/staticmap.php?...` — that provider
has been unreliable and was rendering as a broken-image icon on shipped
reports (visible above the "Rating & Valuation" block).

Replaced with a compact, no-external-image GPS block that shows the
coordinates rounded to five decimal places and offers two clickable
deep-links — one to OpenStreetMap (`/?mlat=…&mlon=…#map=14/lat/lon`)
and one to Google Maps (`/maps?q=lat,lon`). Both render clean in the
HTML report, survive the Word export, and require no API key or
third-party availability. The surrounding `Survey Location` row in the
info table is unchanged.

The `getStaticMapUrl()` helper (previously unused dead code that also
pointed at the broken provider) was updated to return an OSM deep-link
URL so any future caller gets a working URL instead of a broken one.

### Fixed — NA items rendered as "NT — Not Tested" in the report

The Checklist Summary rating pill and the body-section `ratingClass`
used a hand-rolled `rating.startsWith('A') ? … : rating.startsWith('B')
? … : rating.startsWith('C') ? … : 'NT'` fallthrough chain that
silently swept every other rating — including "Not applicable" and
"Powered up only" — into the NT bucket. Dave caught it on a Bow thruster
rated NA in the survey that showed up as NT in the report.

Introduced `classifyRatingForReport(rating)` as the single source of
truth: returns `{ code, label, color, cssClass }` for each rating,
including a proper `NA / Not Applicable / rating-na` triple and
`PO / Powered Up Only / rating-po` for Powered up only. Every site in
`generateReport()` that was classifying ratings has been updated to use
it. Added matching `.rating-na` / `.rating-po` CSS rules to both the
scoped report stylesheet and the Word-export embedded styles.

### Changed — Not-applicable items are now dropped from the report

`Not applicable` ratings no longer appear in either the Checklist
Summary or the Detailed Survey Findings — they just clutter the
reader's view with "this item isn't on the vessel" noise. The NA
filter is applied after the existing `excluded` filter. Not-tested
items continue to appear everywhere (Summary, Body, Findings &
Recommendations) per Dave's policy.

### Changed — Checklist Summary preamble no longer mentions "Violation"

The Violation column was removed from the Checklist Summary in v2227,
but the intro paragraph still said "...whether it constitutes a
violation, and applicable standards." Updated to "...its surveyor
notes, rating, finding code where applicable, and the relevant
standards."

### Changed — Vessel Information and Vessel Documentation consolidated

General Vessel Information was double-printing every field that also
appeared in Vessel Specifications, Survey Conditions, or Vessel
Documentation Data: HIN + photo, TC Licence + expiry, Compliance
Plate + photo, Construction/Material, LOA, LWL, Beam, Displacement,
Draft, and Weather all appeared twice on the front of the report.

Trimmed the General Vessel Information table to survey-event metadata
only — Survey Type, Date of Inspection, Date of Report, Vessel Name,
Year/Make/Model, Location, Client, Persons in Attendance, Independent
Surveys, and Surveyor. Physical dimensions now live only in Vessel
Specifications; regulatory-ID fields (HIN, TC Licence, Tax Status,
Compliance Plate) live only in Vessel Documentation Data; Weather
lives only in Survey Conditions. Dates now render via
`formatLongDate()` ("April 15, 2026") for consistency with the cover
and signature.

### Changed — Vessel Description auto-fills more placeholders from survey data

`buildDescriptionFromSurvey()` — the function the saveSurvey auto-regen
path uses — now resolves more placeholders from live survey data so
the description keeps itself current as the surveyor enters values:

- **Drive type:** `[SHAFT DRIVE/STERNDRIVE]` now resolves from
  `survey.driveType`. Shaft → "shaft drive", outdrive → "sterndrive",
  IPS → "IPS pod drive", saildrive → "saildrive". Twin engines pluralise
  correctly (e.g. "sterndrives", "IPS pod drives"). When the DB lookup
  for inboard/outboard/sterndrive comes up empty, it now falls back to
  deriving from `driveType` before emitting the placeholder.
- **Head count:** `[NUMBER] head(s)` now resolves from
  `survey.headCount` (the value the Head(s) category uses for its
  expansion). Berth count field is not captured in the survey yet, so
  that placeholder remains until a field is added.
- **Electronics inventory:** widened to count any rated item that means
  "installed and at least functional" (A/B/C/Powered-up), not just C.
  Items rated NA emit an explicit "No X installed" sentence so the
  reader knows we checked. NT items are silent. Output now reads
  naturally — "Navigation and communication equipment includes VHF
  radio, GPS/chartplotter, and depth sounder. No radar or autopilot is
  installed." — instead of the old `[GPS/CHARTPLOTTER], [VHF RADIO], …`
  placeholder fallback.

The description auto-regenerates on any `saveSurvey()` call whose
survey has `descriptionAutoGenerated` truthy, so these updates flow
through whenever any contributing field is edited anywhere in the
app.

### Changed — Findings & Recommendations no longer duplicates photos

Every photo used to render twice: once inside Detailed Survey Findings
(the per-category body of the report) and again inside Findings &
Recommendations (the severity-grouped action list at the end). Dave
flagged the waste. F&R now renders the finding code + item label +
observation text + recommendation, with a small italic cross-reference
line — "See full observation and N photos in Detailed Survey Findings
→ §Hull" — that points the reader to the canonical location. The
severity grouping, finding codes, and recommendations are unchanged.
Report byte size and page count drop roughly in half on image-heavy
surveys. The `findingPhotos()` helper that used to render the F&R
photos is removed; git history preserves it if we ever want option 2
(small thumbnails in F&R).

### Changed — Vessel Description now uses past tense for surveyor evaluations

Dave's policy: things the surveyor evaluated (condition, maintenance,
equipment verification) read in past tense; identity and spec facts
(year/make/model, LOA, beam, rig type, cabin count) stay in present.
Updated across all three sibling description generators
(`buildDescriptionFromSurvey`, `generateVesselDescription`, and
`regenerateDescriptionFromInspection`) plus the Propulsion narrative:

- "The vessel **is** in [GOOD/FAIR/POOR] overall cosmetic condition and
  **appears** to have been [WELL/REASONABLY/POORLY] maintained" →
  "The vessel **was** in … and **appeared** to have been … maintained"
- "Navigation and communication equipment **includes** …" →
  "Navigation and communication equipment **included** …"
- "No radar **is** installed" → "No radar **was** installed"
- "Safety equipment **includes** …" → "Safety equipment **included** …"
- Propulsion coupling: "Each/The engine **is** coupled to …" →
  "Each/The engine **was** coupled to …"
- Propulsion standalone drive: "Power **is** delivered through …" →
  "Power **was** delivered through …"

Identity/spec sentences stay present tense — vessel name, make, model,
year, dimensions, rig configuration, cabin count, galley layout,
electrical-system specification.

### Changed — Smarter auto-regen gate: placeholders trigger refresh

Previously, any manual edit to the vessel description flipped
`descriptionAutoGenerated = false` and auto-regen stopped for that
survey forever — even when the surveyor only fixed a typo and left
most of the engine/electronics placeholders unresolved. Dave caught
this: his shipped descriptions still read "[MAKE/MODEL] [DIESEL/
GASOLINE] … [SHAFT DRIVE/STERNDRIVE] … [NUMBER] berth(s) … [GPS/
CHARTPLOTTER], [VHF RADIO], …" despite all the underlying survey
fields being populated.

New rule in `saveSurvey()`: a description is treated as auto-regen
eligible if **any** of the following is true: (a) the
`descriptionAutoGenerated` flag is truthy, (b) the description is
blank, or (c) the description still contains at least one
`[UPPERCASE_PLACEHOLDER]` token. By the third clause, a description
with visible placeholders is by definition still a template and
should keep refreshing as fields fill in. Once every placeholder is
resolved and the surveyor edits the prose, the flag alone gates
regen — so finalised descriptions are never clobbered.

### Changed — Evaluation sentences in Vessel Description now use past tense

Identity / specification facts about the vessel (e.g. "is a 2006
Formula 27 PC", "has an overall length of 33'1\"", "features 2 cabins")
stay in present tense because they describe the vessel's design, not
the surveyor's observations. Evaluation statements — what the surveyor
saw, tested, or verified at the time of the inspection — now use past
tense: "The vessel was in [GOOD] overall cosmetic condition and
appeared to have been [WELL] maintained", "Navigation and communication
equipment included VHF radio, GPS/chartplotter, and depth sounder.
No radar or autopilot was installed.", "Safety equipment included…".

### Changed — CAD value emphasised alongside USD in all valuation displays

BUC publishes values in USD, but Kiki Marine's Canadian clients and
insurers settle in CAD. The CAD equivalent (auto-computed from the
exchange rate already captured in the Edit Details form) now renders
prominently in every place a dollar amount appears in the report:

- **Rating & Valuation summary box** — CAD in 14pt bold brand-colour
  type above the smaller USD line, with exchange rate shown inline.
- **Statement of Valuation table** — CAD in 13pt brand-colour, USD
  below, "Tax not included" sub-line.
- **Valuation Worksheet** — BUC range and replacement cost rows now
  show "USD $X / **CAD $Y**" side-by-side.

Exchange rate is displayed to four decimal places so the reader can
reproduce the math. If no exchange rate is set on the survey, the
CAD line is simply omitted and the USD value renders alone.

### Changed — Inspection, Edit Intro, and New Survey pages now carry the Kiki Marine wordmark header

The Home page shows the KIKI MARINE logo + "Marine Vessel Surveys —
v…" header. The Inspection page, Edit Vessel Information page, and
New Survey page each had their own stripped-down header (back arrow
+ vessel name + version), so the brand disappeared as soon as the
surveyor opened a survey. All three now lead with the same Kiki
Marine logo on the left, followed by the back button, the vessel
name (or "New Survey" on that page), and the version subtitle.
Continuity of brand across every screen of the app.

---

## v2227 — 2026-04-15

### Changed — Report readability pass + inspection-view skip tidying

Wide-ranging follow-up to the SAMS review and Dave's report-cleanup
list. Everything below ships in one push.

**Report: redundant boilerplate removed.** The blanket "Note: A
comprehensive inspection was attempted but was not possible…"
sentence used to be auto-appended under every NT finding in Findings
& Recommendations, which produced the same sentence 20+ times in a
single report. Removed entirely — the equivalent disclaimer already
appears once in Purpose and Scope and once in Methodology, which is
enough.

**Report: Surveyor Notes column.** The checklist summary's "Selected
Text" column is renamed to "Surveyor Notes", the 80-character JS
truncation is removed, and the CSS `white-space: nowrap` +
`text-overflow: ellipsis` that was hiding the overflow is replaced
with normal wrapping at `word-break: break-word`. The full surveyor-
entered note now renders in full. The "Violation" column was dropped
because the Rating column already colour-codes A/B/C and violation
status is effectively redundant; column widths rebalanced (Surveyor
Notes now 42% of table width).

**Report: uniform photo sizing.** All body photos (checklist item
photos, Findings & Recommendations photos, HIN plate, compliance
plate, engine and transmission nameplates, four-corner overview) now
render through a single `.report-photo` CSS class at 320×240 with
`object-fit: cover`. Per Dave's brief, that's ~60% reduction from the
previous 800×600 body-item photos — and consistent everywhere. Photos
from the same item sit side-by-side through a `.report-photo-row`
flex container that wraps as needed.

**Report: Vessel Overview Photographs moved to the top.** The four-
corner (Port Bow / Starboard Bow / Port Stern / Starboard Stern)
block used to render at the very end of the report. It now renders
directly below the cover hero so the reader has visual context
before reading prose. The old end-of-report block was removed.

**Report: Surveyor's Certificate margins.** The `.footer` CSS had
`padding: 20px` on top of the body's existing 20px, which double-
inset the entire Surveyor's Certificate block compared with the
surrounding body text. Reduced to `padding: 16px 0 0 0` so the
Certificate lines up flush with the rest of the report.

**Report: Page X of Y on every page.** The `@page :first` rule was
suppressing the bottom-left vessel footer and the bottom-right page
counter on the cover page. Only the top-center running title is now
suppressed on page 1; page numbering and vessel footer appear on
every page, addressing SAMS reviewer's "pages numbered: all must be
numbered" flag.

**Report: Definitions of Terms is now dynamic.** The table no longer
lists every term unconditionally. Each definition carries a matcher
(including aliases — Percussion Testing also matches "impact and
resonance", "sounding hammer", "phenolic hammer"; Through-Hull also
matches "seacock", "thru-hull") and only appears when the haystack
(surveyor prose, item labels + ratings + notes + standards, safety
equipment names, plus the fixed boilerplate in Purpose and Scope /
Methodology / Conduct of Survey) contains a match. A small italic
note under the heading tells the reader the list is filtered. If
nothing matches the entire section is omitted.

**Inspection view: Safety Equipment skip controls.** Matches the
existing per-category skip behaviour for other sections. Three
levels: whole section (`survey.safetyEquipmentSkipped`), sub-
category (`survey.safetySubcategoriesSkipped[catName]`), and
individual item (`eq.skipped`). Each has its own button in the
accordion; tapping again unskips. Skipped items/sub-categories are
excluded from the progress count, from the generated report, and
render collapsed in the inspection view. The auto-generated checklist
is still regeneratable via the existing button.

**Inspection view: `toggleSafetyItem` no longer full-re-renders.**
Ticking a checkbox in the Safety section was triggering a
`renderInspection()` which collapsed the Safety accordion and
scrolled the surveyor back to the top. It now updates the single
item's border and status chip in place, plus the progress counter in
the header. No scroll jump, no accordion collapse.

**Inspection view: skipped sections moved to the bottom.** Fully
skipped categories (every item excluded) and a fully skipped Safety
Equipment section now render in a "⊘ Skipped Sections" block at the
bottom of the inspection view, under Instruments & Electronics —
rather than inline in template order. Keeps the active inspection
work at the top. Unskipping promotes the category back to its normal
position on the next render.

**Battery charger Not-tested chip re-phrased.** The "no AC power"
observed option now reads "Because the boat was not connected to AC
power, operation of the battery charger was not verified at the time
of survey." (was "the vessel was not connected…"). Updated in both
the text_library.json entry and the guaranteed showNotesSheet
injection.

---

## v2226 — 2026-04-15

### Changed — Definitions of Terms now filters to only the terms that appear in this survey

Previously the Definitions of Terms table rendered all fifteen terms
on every report, which padded the report and forced the reader to
skim definitions that were never cited in the body.

The section now assembles a haystack from everything that ends up in
the rendered report — surveyor-entered free text (vessel description,
propulsion narrative, valuation rationale/sources, storage details,
independent surveys, changes to plan, overall condition), every item
label plus its rating, notes, and applied standards, the safety
equipment names, and the fixed boilerplate prose from Purpose and
Scope / Methodology / Conduct of Survey. Each term carries its own
matcher function (with aliases, e.g. Percussion Testing also matches
"impact and resonance", "sounding hammer", "phenolic hammer"; Through-
Hull also matches "seacock" / "thru-hull"). Terms whose matchers
return false are dropped from the table.

Boilerplate-referenced terms (ABYC, Canada Shipping Act, Conductivity
Meter, Limited Trial Run, TP 1332, NFPA 302, TC TP 511, HIN) will
always appear — they're cited in prose that ships with every report.
The conditional ones (Bonding System, BUC, Percussion Testing, Fair
Market Value, Estimated Replacement Cost, Through-Hull Fitting, USCG
33 CFR 183) only show when actually used. A small italic note
directly under the DEFINITIONS OF TERMS heading tells the reader the
list is filtered to what this survey cites.

If no terms survive the filter (unlikely but possible for a minimal
stub survey), the entire section is omitted rather than rendering an
empty table.

---

## v2225 — 2026-04-15

### Changed — Propulsion narrative triple-checked + Check Report audits added + report aligned to Kiki Marine brand

After the v2224 Propulsion work shipped as a draft, this version does a
full pass addressing the SAMS review of the MY Bad / Quigley surveys
and matches the generated report to the kikimarinesurveyor.ca brand.

**Triple-check fixes in `buildPropulsionNarrative()`:**

- "A Evinrude" → "An Evinrude" — vowel-sensitive article selection on
  the engine phrase opener.
- Twin-engine coupling sentence was dropping the article. Rewritten to
  use "Each engine is coupled to a … transmission driving through a
  …" so both singular and twin configurations read cleanly.
- Removed a redundant tautology (`!findC(['exhaust', 'type'])`) and
  replaced it with a direct match on "exhaust condition".
- Propulsion block now renders in the report even when no rated items
  are completed yet, so identity + narrative + spec table still show
  if the surveyor is mid-inspection.

**Check Report audits for the SAMS review items.** The Check Report
now surfaces:

- Missing Date of Report (SAMS: "Date that report completed not
  shown").
- Missing or too-generic Parties Present (SAMS: "No statement of who
  was present at time of the inspection"). Flags when only the
  default surveyor entry is listed.
- Missing How Observed + optional Storage Details (SAMS: "Clear
  statement that vessel was laid up for winter storage not
  provided").
- Missing Independent Surveys listing.
- TC licence number entered but no expiry date.
- Every missing Propulsion spec: engine make, model, serial, HP,
  hours, fuel — plus each Narrative-chip field (location, access,
  gauges, controls).
- Missing engine / gearbox nameplate photos (SAMS: plate photos
  unreadable).
- Thin valuation rationale or no valuation sources selected (SAMS:
  "Statement of method used, however, on used BUC. Not sufficient to
  provide a reasonable valuation").

**Report aligned to Kiki Marine brand.** The report's scoped CSS (and
the matching Word-export styles) now use the site's primary `#066aab`
in place of the previous `#006699`. Covers, headings, h2/h3 rules,
item border-lefts, checklist-table header, footer border — all
consistent. Cover contact line now points to `kikimarinesurveyor.ca`
(previously truncated to `kikimarine.ca`) and carries the tagline
"Comprehensive Marine Surveying & Consulting". Surveyor's Certificate
footer now shows a formatted "Signed: April 15, 2026" date and a
centered brand line (`Kiki Marine • SAMS® Surveyor Associate • ABYC
Master Advisor • kikimarinesurveyor.ca • 647-289-7876`).

Date formatting helper `formatLongDate()` turns ISO dates into reader-
friendly long form ("2026-04-15" → "April 15, 2026") for Date of
Inspection, Date of Report, and the signature.

App UI colours (navy `#006699`) are intentionally untouched — only
the report output was rebranded.

---

## v2224 — 2026-04-15

### Added — Auto-assembled "Propulsion" narrative (Norm Behring style)

Addresses the SAMS review feedback on the MY Bad / Quigley surveys
("engine serial numbers insufficient, plate photos too small to read,
details on each system missing — what is it, does it work, what is
condition"). The engine write-up is now a single cohesive Propulsion
block that identity, narrative, and condition all share.

**Chip panel at the top of Engine(s) and drive(s) (inspection view).**
Four fields — Engine bay location, Engine access, Engine gauges
location, Engine controls location — each with a datalist of common
options and free-text for anything custom. Any edit saves
immediately and triggers an auto-regen.

**`buildPropulsionNarrative(survey)`** — pure function that assembles
a Behring-style paragraph: "A Volvo D6-370 diesel engine was located
aft under the cockpit deck, accessed through a cockpit engine hatch.
The engine is coupled to a ZF 63A transmission driving through an
IPS pod drive. Engine gauges were located at the flybridge helm —
operated smoothly. Engine controls were located at the helm —
operated smoothly." Followed by a short observations paragraph
derived from existing rated items (anti-vibration mounts, cooling
seacock, belts, manifolds, oil, exhaust — each sentence only surfaces
when that item is rated C, so A/B findings stay in the Findings &
Recommendations block instead of being buried in prose). Twin-engine
vessels get one combined paragraph.

**Auto-regen hook in `saveSurvey()`** — mirrors the vessel description
pattern. Rebuilds whenever any contributing field is saved, unless
the surveyor is mid-edit in the textarea (activeElement check plus a
sticky `window._propNarrUserEditing` flag set on input). Manual edits
survive; an explicit ✨ Regenerate click clears the flag and resumes
auto-updates.

**Merged Propulsion section in the generated report.** The top of the
Engine(s) and drive(s) body now renders, in order: the auto-
generated narrative, a compact spec block (Engine 1 / Engine 2 /
Transmission 1 / Transmission 2 with Make/Model/Serial/HP/Hours/Fuel
and data-plate photos at 600×480 max — SAMS reviewer noted the
previous 350×280 photos were unreadable), then the existing rated
items below. Engine/transmission rows were removed from Vessel
Specifications to avoid duplication; a pointer note replaces them.

**Template cleanup.** Removed the redundant text echoes from both
`survey_template.json` and `insurance_survey_template.json` that
duplicated what the spec block now shows: "Engine(s) manufacturer,
model # and serial number (if available)", "Fuel type", "Horsepower",
"Gearbox manufacturer, model # and serial # (if available)", and
"Sail drive manufacturer and model #". The rated condition items and
all nameplate media items remain untouched.

---

## v2223 — 2026-04-15

### Added — "No AC power" option on the Battery charger Not-tested chip set

The Notes sheet for Battery charger rated "Not tested/not verified"
previously offered only generic chips ("The battery charger was not
tested at the time of survey.", "Operation of the battery charger was
not verified at the time of survey.", plus the standard action). The
common real-world reason — the vessel wasn't plugged into shore/AC
power during the survey — now has a dedicated observed chip:

> Because the vessel was not connected to AC power, operation of the
> battery charger was not verified at the time of survey.

Two-layer delivery so this chip surfaces no matter the cache state:

- `text_library.json` — the existing Battery charger / Not tested /
  observed entry was rephrased to the above text (it previously read
  "The battery charger was not tested because the vessel was not
  connected to AC power."). Matches the prose style of the other
  synthesized NT chips.
- `app.js` — `showNotesSheet()` now injects the same chip into
  `sheetVariants` after the library lookup returns, specifically for
  label `Battery charger` with a Not-tested rating. A regex dedupe on
  "not connected to AC power" / "no AC power available" prevents
  double-adding when the library already surfaced the entry.

The existing generic chips keep showing too (they come from the synth
fallback when library returns empty), so the surveyor has the full
set when they open the sheet.

---

## v2222 — 2026-04-15

### Changed — Overall Description of Vessel auto-updates as variables are entered anywhere in the survey

Previously the vessel description only regenerated when the edit-intro
form was saved. Fields that feed the description but live elsewhere —
mast stepping on the Main mast checklist item, safety equipment ticks
in TC TP 511, electronics ratings, propeller/shaft notes, etc. —
didn't refresh it. The surveyor had to remember to click Regenerate
for every downstream edit.

Auto-regeneration now runs inside `saveSurvey()` itself, so any write
that touches a contributing field refreshes the description on the
very next persist. Gated conditions:

- Regenerates only when `survey.descriptionAutoGenerated` is truthy
  (or the description is blank). Manual edits still flip the flag off
  via `markDescriptionManuallyEdited()` and stay preserved.
- Skips the regen when the surveyor is actively typing — checks both
  `document.activeElement === #vesselDescription` and a new
  synchronous `window._descUserEditing` flag that `markDescription­
  ManuallyEdited()` sets on input. The sticky flag closes the race
  gap between the first keystroke and the 2-second debounced DB
  write, so concurrent saves from other views can't clobber
  in-progress edits.
- The sticky `window._descUserEditing` flag is cleared whenever the
  surveyor explicitly asks for a fresh description (either the
  ✨ Auto-Generate button in Edit Intro or the Regenerate path from
  the inspection view), so auto-updates resume on subsequent saves.
- Live textarea (if visible and not focused) is updated in place with
  the new text, its height recalculated, and the placeholder counter
  refreshed — no refresh needed.

Failures in the regen path are caught and logged; the underlying
IndexedDB save never blocks on description generation.

---

## v2221 — 2026-04-15

### Added — Tap "N left" in a category header to jump to remaining items

The grey `N skipped` pill in each category header stays as a plain,
non-interactive badge — skipped items should remain skipped and don't
need a jump list. The `N left` progress text next to it is now a
dotted-underlined button. Tapping it opens a red-tinted inline panel
under the header titled "Items left — tap to fill out", listing each
unrated non-skipped item by its full name. Tapping an item name closes
the panel, expands the accordion if collapsed, scrolls the item into
view, and flashes the yellow highlight so the surveyor can start
rating it. Reuses the existing `_csExpandAccordionAndScroll()` helper
from the Check function.

`event.stopPropagation()` on the button prevents the surrounding
accordion from toggling when the badge is tapped. Only one popover is
open at a time (opening one closes any other). When the category
state shifts to Done or fully Skipped, the button reverts to a plain
`<span>` via `outerHTML` swap, and `updateCategoryHeader()` clears any
open popover so it can't go stale after item edits.

### Changed — Dropped "and grounding" from three electrical sections

Three checklist labels renamed:

- `Battery charger and grounding` → `Battery charger`
- `Inverter and grounding` → `Inverter`
- `Inverter/charger and grounding` → `Inverter/charger`

Labels updated in `survey_template.json` and
`insurance_survey_template.json`. All matching `"section"` fields in
`text_library.json` (30 snippets across the three sections) were
renamed in lock-step so snippet lookup still resolves. Grounding-only
content was scrubbed from the Inverter A-rating: the two A snippets
about bonding the inverter case to the grounding system were deleted,
and the C snippet "A Xantrex DC to AC inverter was installed,
properly grounded, and in acceptable condition." was edited to "A
Xantrex DC to AC inverter was installed in acceptable condition."
The other two sections' body text never mentioned grounding, so no
further snippet edits were needed.

### Changed — "labelled" → "labeled" library-wide

Every occurrence of `labelled` replaced with `labeled` (lowercase,
American spelling). This is an explicit exception to the project's
Canadian English convention (the rest of the project still uses
fibreglass, colour, centre, etc.). Affected:

- `text_library.json` — 8 snippet bodies (exhaust outlet and the
  various "clearly labeled" panel/switch descriptions)
- `docs/sams_rubric.md`, `docs/manual_regression.md`,
  `reference-docs/REPORT_IMPROVEMENT_SUGGESTIONS.md` — one each

All instances were mid-sentence, so no capitalization adjustments
were required.

---

## v2220 — 2026-04-15

### Rewritten — Exhaust condition A/B/C cleaned up (redundancies removed, disclaimers relocated)

Dave flagged C-rating redundancies and asked for a matching audit of
A and B. Rebuilt the whole `Exhaust condition` section.

**C rating — redundancy removed.** The two atomic chips ("The exhaust
was in proper working condition and conformed to SAE J2006." + "Two
hose clamps were used at all connections.") were duplicated by a
combined chip ("The exhaust hose conformed to SAE J2006, and two hose
clamps were used at all connections."). Dropped the combined chip;
kept the atomic form so the surveyor composes observations by tapping
what applies. Also moved the "visual only, mechanical assessment"
disclaimer out of observed and into the means phase where it belongs.

**B rating — disclaimer relocated.** Same issue: the "visual only,
mechanical assessment" disclaimer was sitting in observed. Moved to
means. Added a second observed chip ("Minor surface corrosion was
noted at exhaust connection points.") for the lighter case.

**A rating — tightened.** Removed a stray "generally serviceable…
double hose clamps used at most connections" observation that read
as a C-level statement despite being under A. Moved the visual-only
disclaimer to means. Added three genuine A-level observations
covering critical scenarios: non-conforming SAE J2006 hose, heavy
corrosion / cracking / leaks, and exhaust gas in the engine
compartment. Added a life-safety-framed means chip ("Exhaust leaks
can introduce carbon monoxide into the accommodation and represent a
life-safety concern.") and bumped the action severities up to match.

**Ordering.** All three ratings now list chips in ascending severity
within each phase (least→worst), per the established v2210 rule.

**Not tested - covered in insulation** subclass preserved (the case
where the exhaust is wrapped in insulation and the hose can't be
visually inspected).

### Fixed — Anti-vibration mounts B/C chips now surface

`ITEM_SNIPPET_MAP['Anti-vibration mounts']` was redirecting to library
section `Anti vibration mounts` (no hyphen). The A rating chips lived
there, but the B/C rating chips lived in a parallel `Anti-vibration
mounts` (hyphenated) section — which was orphaned and never matched.
Dave reported "no options for B or C regarding anti-vibration mounts."

Fix:
- Updated the map to `'Anti-vibration mounts': 'Anti-vibration mounts'`
  (identity match, canonical hyphenated form).
- Merged the 5 no-hyphen chips into the hyphenated section; deduped.

Dave now sees the full A/B/C/Not-tested chip set (including the
`C - just changed` subclass) on that item.

### Added — Visual-observation disclaimer as a chip option on every engine-related section

Dave's rule: for any engine-related item, the surveyor should be able
to tap a standard disclaimer chip:

> As this is a visual observation only and does not constitute a
> mechanical assessment, confirmation of serviceability by a licensed
> marine mechanic is recommended.

Added to the **means phase** under every rating (A, B, C) across all
23 engine-related library sections:

- Engine & Powertrain sheet (20 sections) — Anti-vibration mounts,
  Automatic engine compartment fire extinguishing system, Belts and
  pulleys, Bilge/stringers/ribs, Coolant level and quality, Cooling
  water intake seacock(s) and strainer(s), Drive coupling (both
  variants), Engine condition, Exhaust condition, Gearbox general
  condition, Gearbox oil, Generator (if installed), Generator valve
  and sea strainer, Hoses, Manifolds and risers, Manual fuel pump(s),
  Oil level and condition, Stuffing box/packing gland/dripless seal.
- Outboard sheet (3 additional sections) — Engine mount, Outboard
  anodes, Outboard oil, Outboard propeller.

69 new chip instances total (23 sections × 3 ratings). Where a
section already carried a near-duplicate rating-specific variant
(Exhaust A/B/C had nuanced "full inspection" / "service and
confirmation" / "confirmation of serviceability" wordings), the
canonical text was skipped to avoid near-duplicate chips.

### Added — Automatic engine compartment fire extinguishing system: manual controller chips at all ratings

Dave: "may or may not have a manual controller at the helm — make it
pickable at all ratings." Added two observation chips at A/B/C:

- observed/sev 1: "A manual controller was fitted at the helm."
- observed/sev 2: "No manual controller was fitted at the helm."

6 new chips (2 options × 3 ratings).

### Audit

- JSON parses ✓
- JavaScript compiles ✓
- Exhaust condition A/B/C have observed / means / action coverage ✓
- Every phase ordered ascending severity ✓
- Anti-vibration mounts orphan count: 0 ✓
- Disclaimer coverage: A/B/C present on all 23 engine-related sections ✓
- Automatic engine fire system: manual-controller chips present at A/B/C ✓
- Version strings aligned ✓

---

## v2219 — 2026-04-15

### Added — Skip option for area-photo sections (and category skip now covers them)

Previously only rated (list) items were skippable; the area-photo
sections at the top of each category could not be individually skipped,
and the "Skip entire category" action left them in the unaffected
(camera / import) state.

**Individual skip on each area-photo section.** Each `📷 Area photos`
header now has a "⊘ Skip" button (top-right). Tapping it marks the
media item `excluded = true` and re-renders the section as a compact
dashed-border row:

    ⊘ Engine name plate(s) — skipped (4 photos retained)   [Unskip]

Any existing photos stay in IndexedDB — unskipping restores the full
UI with the photos intact. The skip state persists across reloads.

**Category skip now includes area photos.** `toggleCategoryExclude`
used to only flip `excluded` on `type === 'list'` items. It now also
flips `excluded` on `type === 'media'` items in the same category (and
in any linked categories, per the existing Pilot-house / Flybridge
linkage).

Note: area-photo items have never counted toward completion percentage
(only rated list items do), so skipping or unskipping them has no
effect on the progress bar — it's purely a UI-clutter reduction for
sections where the surveyor doesn't want to capture area photos.

### Audit

- JavaScript compiles ✓
- JSON parses ✓
- Both `renderInspection` (initial render) and `refreshAreaPhotoGrid`
  (post-toggle re-render) handle the excluded state ✓
- `toggleCategoryExclude` now covers both `list` and `media` items ✓
- Version strings aligned ✓

---

## v2218 — 2026-04-15

### Removed — "This item was inspected and found in acceptable condition" (library-wide)

Dave flagged this phrase as not SAMS-appropriate. Removed all 15
instances across the library (generic boilerplate in 15 C-rated
observation chips) and replaced each with a section-specific
SAMS-appropriate observation:

- Aft Deck / Cover → "The aft deck cover was sound and in good order at the time of survey."
- Aft Deck / Seating → "The aft deck seating was in good condition at the time of survey."
- Cabin / Berths and upholstery → "The berths and upholstery were sound and in good order at the time of survey."
- Cabin / Cabin sole → "The cabin sole was sound and in good order at the time of survey."
- Cabin / Floor and carpet → "The floor and carpet were in good order at the time of survey."
- Cabin / Interior lighting → "The interior lighting functioned properly at the time of survey."
- Deck / Fuel and water fill ports and waste deck pump-out port → "…were secure and in good order at the time of survey."
- Electrical / Generator → "The generator functioned properly at the time of survey."
- Engine condition → two chips (see next section)
- Engine / Generator (if installed) → "The generator functioned properly at the time of survey."
- Flybridge / Arch → "The arch was sound and in good order at the time of survey."
- Flybridge / Bimini/dodger/hardtop → "…was sound and in good order at the time of survey."
- Gauges / Entertainment/stereo → "…functioned properly at the time of survey."
- Gauges / Spotlight/searchlight → "…functioned properly at the time of survey."
- Spars / Backstay, turnbuckle(s), retaining rings/pins and chain →
  "The backstay, turnbuckles, retaining rings or pins, and chain were
  sound and in good order at the time of survey."

### Added — Engine condition singular + plural variants

Dave's rule: if there are two propellers, there are two engines, and
the chip should say "engines" plural. Pre-purchase template already
splits Engine into Port / Starboard (via `driveLineItem`) so each
side uses singular "engine" naturally; insurance template rates a
single combined Engine item where plural matters.

Now every rated phase of Engine condition has a singular + plural
variant chip:

- **C/observed/1**: "The engine was in good order at the time of survey." + plural
- **C/means/3**: "The engine was relatively clean with an appearance that suggested it had been maintained." + plural ("engines were … they had been maintained.")
- **B/observed/3**: "The engine exhibited a moderate level of cleanliness." + plural
- **A/observed/3**: "The engine was damaged or non-functional." + plural
  (also fixed the present-tense "is damaged" → past-tense "was damaged")

### Audit

- JSON parses ✓
- JavaScript compiles ✓
- Zero "this item was inspected" chips remain (expect 0) ✓
- Engine condition: singular + plural variants at every rated phase ✓
- Version strings aligned ✓

---

## v2217 — 2026-04-15

### Added — VHF antenna condition as a separate chip at every rating

Dave's rule: the VHF antenna can be in a different state than the
radio itself. The radio might work while the antenna is damaged or
missing, or vice versa. Antenna condition therefore belongs in its
own standalone chip.

Added three antenna observation chips under every VHF rating (A, B,
C, and Powered up) in both the Cockpit/Gauges sheet and the Flybridge
sheet:

- observed/sev 1: "The VHF antenna was installed and appeared serviceable."
- observed/sev 3: "The VHF antenna was installed but damaged."
- observed/sev 4: "No VHF antenna was installed on this vessel."

Tap whichever antenna chip matches alongside the existing radio
observation to compose a two-sentence statement that separates the
two components. Total: 24 new chips (3 antenna states × 4 ratings × 2
sheets).

### Consolidated — VHF section duplicates

The library had two overlapping sections, `VHF` and `VHF radio and
antenna`, each partially populated. Merged the 9 `VHF radio and
antenna` entries into the canonical `VHF` section and deduplicated.
Updated `ITEM_SNIPPET_MAP['Pilot house VHF radio and antenna']` from
`'VHF radio and antenna'` to `'VHF'` so every VHF template item now
hits the one canonical library section.

### Added — Windshield wipers singular/plural variants at every rating

Dave's rule: the vessel may have one wiper blade or two. Library chips
previously only used the plural ("windshield wipers were…"). Added
matching singular ("windshield wiper was…") variants at A, B, and C:

- **A** (non-functional): singular + plural versions of "non-functional
  or the motor was broken."
- **B** (sluggish / partial): singular + plural versions of "operated
  but with sluggish or streaking performance" plus a new twin-specific
  partial-failure chip: "One of the two windshield wipers was not
  working; the other operated correctly."
- **C** (serviceable): singular + plural versions of both
  "functioned properly and the blade(s) were in acceptable condition"
  and "operated smoothly and effectively cleared the windshield."

### Consolidated — Windshield wipers section duplicates

Merged the 9 chips under the orphan `Windshield wipers` library
section into the canonical `Wiper blade operation` section (which is
what `ITEM_SNIPPET_MAP` targets for every template item — `Windshield
wipers`, `Pilot house Windshield wiper(s) operation`, and `Windshield
wiper(s) operation`). Dedupe removed exact duplicates.

### Audit

- JSON parses ✓
- JavaScript compiles ✓
- VHF canonical section has 3 antenna chips × A/B/C/Powered up ✓
- Wiper blade operation has singular + plural observation chips at A/B/C ✓
- Orphan `VHF radio and antenna` and `Windshield wipers` section
  entries: 0 remaining ✓
- Version strings aligned ✓

---

## v2216 — 2026-04-15

### Fixed — "Not applicable" no longer pulls in "Not tested" chips (and vice versa)

The chip picker used to match library chips by the first character of
the rating only. Both "Not applicable" and "Not tested/not verified"
start with 'N', so selecting one rating surfaced chips from the other.
Dave's Autopilot N/A screenshot showed "The autopilot was not tested
because the vessel was out of the water." appearing (badge reading
"Not tested") when he'd rated it N/A. Same issue on the Propane item.

`findTextVariants(category, label, surveyRating, survey)` now takes the
full rating string (instead of a 1-char base) and uses a smarter
matcher:

- Survey rating `"Not applicable"` or `"N/A"` → matches only library
  chips whose rating starts with `N/A` or `Not applicable`.
- Survey rating `"Not tested/not verified"` → matches only library
  chips whose rating starts with `Not tested`, `Not verified`, or `NT`.
- A / B / C / Powered up → first-char match, unchanged.

Both call sites (`showNotesSheet` bottom-sheet flow + `buildSingleItem
InnerHTML` inline flow) updated to pass the full rating.

**Impact for Dave's N/A flow:** selecting N/A now either shows:
- The explicit N/A library chip when one exists (e.g. Propane → "There
  is no propane system installed on this vessel."; LPG → same; Bow
  thruster → "No bow thruster was installed."), OR
- The synthesized fallback ("No {item} was fitted on this vessel.")
  when the library has no N/A chip for that section.

Either way, "Not tested" verbiage is strictly confined to the Not
tested rating now.

### Audit

- JSON parses ✓
- JavaScript compiles ✓
- Both `findTextVariants` call sites pass full rating ✓
- Three internal rating-filter call sites updated to use `isRatingMatch`
  helper ✓
- Version strings aligned ✓

---

## v2215 — 2026-04-15

### Added — Bow thruster N/A chip: "No bow thruster was installed."

Matches the language pattern already used by Blower ("No blower was
installed."). Added to Hull sheet, Bow thruster section:

- N/A / observed / sev 1: "No bow thruster was installed."

When Bow thruster is rated N/A, the "Bow thruster controls" item is
already auto-hidden by the `conditional: 'bowThruster'` rule, so a
single chip on the physical-unit section covers both surveys.

### Audit

- JSON parses ✓
- JavaScript compiles ✓
- Version strings aligned ✓

---

## v2214 — 2026-04-15

### Added — Chip-level `vesselType` filtering

New capability: chips in the library can now carry a `vesselType: 'sail'`
or `vesselType: 'power'` tag. When present, the chip is dropped from
the picker if the survey's vesselType doesn't match. Chips without the
tag continue to show for every vessel (default behavior).

Implementation:

- `findTextVariants(category, label, baseRating, survey)` accepts a new
  optional `survey` param and applies the vesselType filter after all
  other matching stages.
- `buildSingleItemInnerHTML` accepts a new `survey` param and threads
  it through to `findTextVariants`.
- Both call sites (bottom-sheet notes flow + inline item rendering) now
  pass `survey`.
- `hasRudder`-style filtering already existed via `contextFromSurvey`;
  this is a parallel, simpler mechanism for binary vessel-type chips
  where no token expansion is needed.

### Steering wheel / helm — sail-only chips tagged

Dave's rule: on a power boat there's one cockpit helm, no binnacle, no
need to mention where the wheel is mounted. Applied via chip tags:

**Tagged `vesselType: 'sail'`** (hidden on power-boat surveys):
- Cockpit / Steering wheel and steering (B): "The steering wheel was
  solidly affixed to the binnacle, and the steering moved from block to
  block without binding or stiffness."
- Cockpit / Steering wheel and steering (C): "Both cockpit helms were
  solidly affixed and the steering moved from block to block without
  binding or stiffness."
- Cockpit / Steering wheel and steering (C - binnacle block to block):
  same binnacle text as B.
- Steering & Hydraulics / Mechanical steering (C - control cable):
  "The steering wheel was connected beneath the binnacle to a nylon
  jacketed control cable…"

**Added** neutral power-friendly chips (no binnacle, no mount location):
- B/observed/sev 3: "The steering wheel was solidly affixed and the
  steering moved from block to block without binding or stiffness."
- C/observed/sev 3: same text under C.

**Consolidated** the orphan library section `Steering wheel, steering`
(10 chips, unreachable via `ITEM_SNIPPET_MAP`) into the canonical
`Steering wheel and steering` section. Dupes deduplicated (4 removed).
Power boats now have a rich A/B/C chip list that works without any
sail-specific vocabulary.

### Insurance template — Tiller and Binnacle hidden on power boats

Pre-purchase template already had `sailOnly: true` on these items; the
insurance template did not. Added the flag so both surveys behave
identically — no binnacle or tiller checklist item surfaces for a
power boat.

### Propane / LPG — "no propane system installed" N/A chip

When the surveyor selects "Not applicable" on either of these items, a
new chip is now available:

> There is no propane system installed on this vessel.

Added to library sections:
- Cockpit / `Propane valve, regulator, gauge, storage compartment and vent`
- Safety & Nav Equipment / `LPG cut off solenoid valve switch`

Rating `N/A`, observed phase. The existing synthesis-fallback chip
("No propane valve, regulator, gauge, storage compartment and vent was
fitted on this vessel.") is bypassed because a real chip now exists.

### Blower — "two blowers" option at A, B, and C

Some power boats fit twin blowers. Added parallel twin-blower chips
beside the existing singular chips in both blower library sheets
(`Gauges and Instrumentation` + `Flybridge gauges and instrument`):

- A/observed/sev 3: "Both bilge blowers were inoperative during testing."
- B/observed/sev 3: "One of the two engine compartment blowers was not
  functional; the other operated correctly."
- C/observed/sev 1: "Both blowers operated properly and vent tubing was
  clear and intact from the fans to the outside."

### Audit

- JSON files parse ✓
- JavaScript compiles (app.js + sw.js) ✓
- `findTextVariants` signature and both call sites updated ✓
- `buildSingleItemInnerHTML` threads `survey` to both callers ✓
- Insurance template: Tiller + Binnacle carry `sailOnly: true` ✓
- 4 binnacle / twin-helm chips tagged `vesselType: 'sail'` ✓
- Steering wheel orphan section consolidated, dupes removed ✓
- Propane and LPG N/A chips present ✓
- Twin-blower chips present in both sheets ✓
- Version strings aligned across app.js, sw.js, index.html, CACHE_NAME ✓

---

## v2213 — 2026-04-15

### Added — Engine locker lid B rating: positive lid-body chip

The B rating covers two common deficiencies — the seal/gasket is
deteriorating OR the hydraulic/electric control is not working. In
either case the lid panel itself may be perfectly fine. Previously the
only B observation chips described deficiencies, so there was no way to
affirm "the lid body was good, it's the seal that's the issue" (or the
control).

New chip at B/observed/sev 1:

> The engine locker lid itself was sound and undamaged.

Appears at the top of the B observed list (ascending severity). Tap it
alongside the seal-deteriorating or control-not-working chip to compose
a clean observation that separates the lid body from the failing
component. Wording avoids "serviceable" per Dave's preference.

Final B observed ordering:
- sev 1: "The engine locker lid itself was sound and undamaged."
- sev 2: "Localized wear or cosmetic damage was noted on the engine locker lid."
- sev 3: "The {specify:hydraulic|electric} engine lid control was not working."
- sev 3: "The seal or gasket around the engine locker lid was deteriorating."

### Audit

- JSON files parse ✓
- JavaScript compiles ✓
- Version strings aligned ✓

---

## v2212 — 2026-04-15

### Fixed — ABYC anode recommendation moved from observation chips to action chips

In v2211 the ABYC "replace at ~50% degradation" sentence was appended to
each of the four degradation observation chips. Dave pointed out that
guideline belongs in the "what should be done" phase, not mixed into the
observed sentence — the observation should say what was seen, cleanly.

**Observation chips now read as plain single sentences** — no ABYC
trailer. 24 chips had the trailing ABYC sentence stripped:

- "The anodes were new with no visible degradation."
- "The anodes were approximately twenty-five percent degraded and
  retained adequate sacrificial material."
- "The anodes were approximately fifty percent degraded."
- "The anodes were approximately seventy-five percent degraded."

**Added as an action chip under every rating (A, B, C) in every anode
section:**

> It is recommended by the ABYC that anodes should be changed at fifty
> percent degradation.

So regardless of whether the surveyor rates the anodes A, B, or C, the
ABYC guideline chip surfaces in the action phase of the picker.

**Sections updated** (same chip set, consistent across both insurance
and pre-purchase templates since both read the same library):

1. Hull anodes
2. Propeller/drive anode(s)
3. Outboard anodes
4. Outdrive(s) - (external)…
5. Sail drive(s) - (external)…
6. Trim tabs (exterior tabs, actuators, mounts and anodes)

**Redundant chip removed.** The C/2 "Continue the regular seasonal
inspection program — replace when approximately fifty percent degraded"
action chip was a near-duplicate of the new ABYC line and has been
dropped from all six sections (6 chips total).

### Audit

- JSON files parse ✓
- JavaScript compiles ✓
- Every anode section has ABYC action chip under C, B, and A ✓
- Zero observation chips mention ABYC ✓
- Phase coverage (observed/means/action per A/B/C) intact ✓
- Version strings aligned across app.js, sw.js, index.html, CACHE_NAME ✓

---

## v2211 — 2026-04-15

### Rewritten — Anode chips standardized across every section with anodes

Dave's rule: **anode observations should never be mixed into sentences
about other parts**, because the part (hull, propeller shaft, trim tab,
outdrive housing, sail drive) can be in perfect order while the anodes
are degraded, or vice versa. Also, degradation should be rateable as
a level, not a vague "worn" observation.

Every anode-bearing section now carries the same standardized chip set:

**Observed chips (ordered least → worst, ABYC replacement line on each
degradation chip):**

- C/1 — "The anodes were new with no visible degradation. It is
  recommended by the ABYC that anodes be replaced when approximately
  fifty percent degraded."
- C/1 — "The anodes were approximately twenty-five percent degraded…"
  (same ABYC line)
- B/3 — "The anodes were approximately fifty percent degraded…" (ABYC)
- B/4 — "The anodes were approximately seventy-five percent degraded…"
  (ABYC)
- Plus mounting-condition chip, service-life chip, and A-rating chips
  for missing / fully consumed anodes.

**Means + action chips (per rating):**

- C: "providing effective galvanic protection" means; "no action" +
  "continue seasonal program — replace when approximately fifty percent
  degraded" action chips.
- B: "continued service will reduce galvanic protection" means;
  "replace at next scheduled service" (sev 3) and "replace before
  relaunch" (sev 4) action chips.
- A: "without anode protection, galvanic corrosion will progress
  rapidly" means; "new anodes must be installed per ABYC E-2" action.

**Sections standardized** (same chip set applied to every one):

1. **Hull anodes** — count/location template chip retained; 23 old
   chips → 17 standardized chips.
2. **Propeller/drive anode(s)** — keeps the "B - wrong metal" subclass
   for aluminium-where-magnesium-needed; overall 18 chips.
3. **Outboard anodes** — 16 chips.
4. **Outdrive(s) - (external)…** — 10 anode-mentioning chips removed
   from the combined section; 16 standardized anode chips added
   alongside the 40 remaining part-only chips (housing, bellows, seals,
   propeller, paint, tilt/trim).
5. **Sail drive(s) - (external)…** — duplicate no-hyphen section name
   collapsed into the canonical hyphenated name (10 entries merged);
   4 anode-mentioning chips removed; 16 standardized anode chips added
   alongside the 15 remaining part-only chips.
6. **Trim tabs (exterior tabs, actuators, mounts and anodes)** — 11
   anode-mentioning chips removed from the trim-tab-body chips (the
   v2210 neutral "not necessarily a deficiency" chips were anode-state
   statements — those are now covered by the standardized anode chips);
   16 standardized anode chips added alongside the 11 remaining trim-
   tab-body chips.

**Anode leakage scrubbed from non-anode sections:**

- **Bow thruster** — 2 chips had their anode clauses stripped ("…and
  the anode was intact" trimmed); 1 anode-only chip dropped.
- **Stern thruster** — 1 chip scrubbed, 1 dropped.

### Added — Rudder material chips (bronze / stainless steel)

For shaft-drive power boats (one or two rudders) and sailboats, two new
C-rating observation chips identify the rudder material:

- "The rudder was bronze."
- "The rudder was stainless steel."

These live under `Rudder(s) condition` alongside the v2210 curated
chip list. The surveyor taps whichever applies.

### Audit

- JSON files parse ✓
- JavaScript compiles (app.js + sw.js) ✓
- Every anode section has A/B/C × observed/means/action coverage ✓
- Every degradation-level observation chip carries the ABYC line ✓
- Zero anode mentions remain in Bow thruster / Stern thruster ✓
- Sail drive duplicate section consolidated into canonical name ✓
- Rudder material chips present on Rudder(s) condition ✓
- Version strings aligned across app.js, sw.js, index.html, CACHE_NAME ✓

---

## v2210 — 2026-04-15

### Changed — Cutlass bearing "too big to move" chips moved from Serviceable to Not tested

The three "C - large diameter" chips under Cutlass bearing(s) described
the case where a shaft is too big/heavy to physically wiggle for play
testing — i.e., the surveyor could not actually test the bearing. That
belongs in Not tested, not Serviceable. Re-rated them to
`Not tested - large diameter` (following the established
`Not tested - dripless` / `Not tested - stuffing box` naming pattern):

  - observed: "The cutlass bearings appeared in satisfactory condition."
  - observed: "Due to the large shaft diameter, manual play testing was inconclusive."
  - action:   "Confirm integrity during limited trial run."

The regular-diameter C chips (where play testing actually succeeds) stay
in Serviceable unchanged.

### Rewritten — Propeller(s) A/B/C chip list

The old Propeller(s) section was a mix of tokenized multi-chip blobs
({count:propeller|propellers}, {any:chipped|bent|cracked|…}) and a few
simple chips. Replaced with a fully curated chip list in the same style
as Stanchions / Engine locker lid:

- **A** (critical, 6 chips): missing/chipped/cracked/bent blades; severe
  pitting or corrosion; loose or missing retaining nut/pin; means chip
  explaining vibration + shaft/cutlass/transmission damage;
  professional-assessment action.
- **B** (attention, 6 chips): light edge nicks, light pitting, minor
  shaft-end galling; means chip for preventing further deterioration;
  recondition-at-haul-out and dress-at-service actions.
- **C** (serviceable, 8 chips): `{specify:fixed two-blade|fixed three-
  blade|fixed four-blade|folding two-blade|folding three-blade|
  feathering three-blade|controllable pitch}` type-select chip; blades
  intact; folding/feathering open-close chip; properly secured with
  nut + pin; minor-cosmetic-corrosion-but-serviceable chip; means chip
  confirming propulsion; no-action + seasonal-program action chips.

### Rewritten — Rudder(s) condition A/B/C chip list

Same treatment as Propeller(s). The old Rudder(s) section was thin
(two tokenized chips plus a handful of generic "An area warranting
attention was noted" fallbacks). Replaced with a curated chip list
covering the observations Dave actually writes on a shaft-drive power
boat or sailboat:

- **A** (critical, 5 chips): structural damage / delamination / impact
  damage; excessive play at rudder post or bearings; corrosion or
  pitting on shaft/stock; loss-of-steering-risk means chip; professional-
  assessment action.
- **B** (attention, 7 chips): minor surface cracking or crazing; worn
  anti-fouling on lower sections; slight play at rudder post; minor
  weeping at rudder stuffing box; water-ingress-prevention means chip;
  next-haul-out moisture-inspection action; post-launch stuffing-box
  monitoring action.
- **C** (serviceable, 7 chips): sound condition observations (blade,
  movement, post/bearings, anti-fouling); steering-responding means
  chip; no-action + seasonal-program action chips.

### Added — Rudder filtering for power boats without a rudder

`"Rudder(s) condition"` in `survey_template.json` now has
`rudderItem: true`. The item is hidden on power boats whose drive type
is outdrive, saildrive, or IPS (those have integrated steering, no
traditional rudder). Shaft-drive power boats and all sailboats
continue to see the item.

`shouldShowItem` was updated to derive `hasRudder` from `driveType`
when the explicit `survey.hasRudder` field is missing (older surveys
never saved it). Outdrive/saildrive/IPS → no rudder; shaft / sail /
unknown → has rudder. Explicit `survey.hasRudder === true|false` still
wins.

### Added — ITEM_SNIPPET_MAP: Propeller ↔ Propeller(s)

With the Propeller(s) chips now curated, added explicit mappings so
the snippet resolver always lands on the right library section even
when `driveLineCount = 1` strips the "(s)" from the checklist label.

### Rewritten — Trim tabs (exterior tabs, actuators, mounts and anodes) A/B/C

Three related fixes in one pass:

1. **Softer anode-neutral phrasing.** The shared neutral chip now reads
   "No anodes were fitted on the trim tabs — this varies by manufacturer
   and is **not necessarily** a deficiency." (was "is not a deficiency.")
   Applied to all three ratings so Dave isn't committing to a judgment
   call before he's seen the boat.

2. **B rating now has proper observed / means / action structure.**
   Previously the B chips were mostly miscategorized as "observed" when
   they were actually means or action statements, and most lived under a
   `B - none installed` subclass. Collapsed everything back under plain
   `B` and split into the three standard phases:

   - **observed** (4 chips, sev 1→3): neutral chip; minor corrosion;
     50% anode depletion; no anodes installed.
   - **means** (3 chips, sev 2→3): serviceability not currently affected
     but warrants attention; galvanic-corrosion exposure when anodes
     are absent; near-term monitoring.
   - **action** (3 chips, sev 2→3): replace anodes at next service;
     address at next service; install suitable anodes per ABYC A-28.

3. **Chips ordered least → worst within each phase.** All three ratings
   now list chips in ascending severity so the card flows from the
   mildest observation at the top to the most serious at the bottom.
   A: observed 1→4→5; B: observed 1→2→3→3, means 2→3→3, action 2→3→3;
   C: observed 1→1→2→3, means 1, action 1→2.

### Audit

- JSON files parse ✓
- JavaScript compiles (app.js + sw.js) ✓
- Every chip has text + rating + section + phase + severity ✓
- Trim tabs chips ordered ascending within each phase ✓
- Zero remaining "not a deficiency" (without "necessarily") phrases ✓
- Version strings aligned across app.js, sw.js, CACHE_NAME ✓

---

## v2190 — 2026-04-14

### Changed — ALL component builders retired; every item uses the chip picker

The remaining `COMPONENT_BUILDERS` entries (bow thruster, stern
thruster, sail drive, IPS pod drive, engine general condition,
generator, bowsprit/deck impact-and-resonance) were still rendering
the old dropdown-driven UI on Ahoy Vey. `COMPONENT_BUILDERS` is now
an empty object — every item in the survey falls through to the
chip picker using the library entries (which v2186 already tagged
with `phase` + `severity` metadata).

Net ~445-line reduction in app.js. Consistent UX across the entire
survey. Items without explicit curated chips use the auto-classifier
output from v2186's batch pass.

### Added — Strip "limited trial run" text when header setting isn't Yes

`applyWritingFixups` now reads `survey.seaTrial` and, when it isn't
"Yes", drops trial-run-referring sentences from already-saved notes
on load + save. 16 library entries mention trial run; they get
scrubbed for any survey where the intro page's Limited Trial Run
dropdown is blank or "No".

Applies to both the textarea initial value and the save path, so
existing text containing "…tested under load during the limited trial
run" becomes "…tested under load" automatically.

### Changed — Cards show FULL saved notes (no 80-char truncation)

Notes preview on the item card is no longer cut off. Font bumped to
13px, `white-space: pre-wrap` preserves paragraph breaks, content
HTML-escaped for safety. Tap the card still opens the notes sheet
for editing.

### Added — Neutral "No trim tab anodes fitted" chip for all A/B/C

Some boats ship without trim-tab anodes by design — it's a
manufacturer choice, not a deficiency. Added the same observed-phase
chip to all three trim tab ratings:
  "No anodes were fitted on the trim tabs — this varies by manufacturer
   and is not a deficiency."

### Fixed — Component-builder bypass for N/A and Not-tested ratings

Even when a builder existed, rating = Not applicable or Not tested
now skips the builder and shows the N/A chip ("No bow thruster was
fitted on this vessel.") or the NT chips. The dropdown builder only
renders for actual A/B/C ratings on the items that still have
builders — and after this release, that's zero items.

### Fixed — "The both anodes" grammar (side=both)

`[side]` → "both" now strips the preceding article, so "The [side]
anodes were more than 50% depleted." becomes "Both anodes were more
than 50% depleted." Port and starboard still read "The port anodes
…" / "The starboard anodes …" as before.

---

## v2209 — 2026-04-14

### Rewritten — Engine locker lid A/B/C (no conductivity, hydraulic/electric pick-one)

17 curated chips:
- **A** (critical): lid can't be opened / detached, {specify:hydraulic|
  electric} control not working; engine-access-safety means;
  repair-before-service action.
- **B** (attention): same {specify:hydraulic|electric} control not-
  working chip (B-rating severity), localized wear, deteriorating
  seal; means on seal/fume leakage; service-mechanism / replace-seal /
  localized-repair actions.
- **C** (serviceable): **"The engine locker lid was undamaged and
  easily removed."** (per user preference — moved from B to C), hydraulic/
  electric control was-working chip, seal intact; unimpeded-access
  means; no-action / seasonal-program actions.

The `{specify:hydraulic|electric}` token decomposes into two separate
chips at render time, so the surveyor picks the one that matches the
vessel.

### Removed — Conductivity references from non-conductivity sections

Library-wide sweep: any chip mentioning "conductivity" in a section
that is NOT about conductivity testing was either dropped (if the
entire chip was conductivity-only) or trimmed of its conductivity
clause. 21 chips removed, 0 trimmed (all leaks were entire-sentence
chips rather than tangential clauses).

6 phase gaps introduced by the removals were auto-backfilled with
generic rating-appropriate chips. Zero remaining conductivity leaks
into non-conductivity sections.

### Final audit

- 838/838 section-rating combos have all 3 phases ✓
- Zero conductivity-in-non-conductivity-section leaks ✓

---

## v2208 — 2026-04-14

### Fixed — One empty-rating chip in Flybridge ladder/staircase

Deep audit found 1 library entry with no rating field:
"The flybridge ladder/staircase was firmly affixed." Set rating to C,
phase to observed, severity 1.

### Final audit — zero breakable issues

Deep repair-audit scan complete:
- JSON files parse ✓
- JavaScript compiles (app.js + sw.js) ✓
- Every chip has text + rating + section + phase + severity ✓
- All bracket placeholders balanced ({}, [], ()) ✓
- All token names valid (if-rudder, if-no-rudder, count, drives,
  specify, any, standards?) — no unknown tokens ✓
- All 174 ITEM_SNIPPET_MAP targets exist in the library ✓
- Every onclick handler resolves to a defined function ✓
- Every local script referenced in index.html exists ✓
- Version strings aligned (app.js = sw.js = index.html cache busters) ✓
- Every section × active A/B/C rating has all 3 phases ✓
- No breaking syntax, no missing functions, no orphaned references.

Only outstanding item: 5 uncommitted local files (v2204→v2208
changes). One push deploys everything.

---

## v2207 — 2026-04-14

### Audit & Repair — Triple-read consistency check of every change from the last 12 hours

Ran a comprehensive audit against every invariant established in the
session. Three violations found and repaired:

1. **"for continued use" filler** — 262 chips still contained this
   phrase. Root cause: v2202's backfill `DEFAULTS` dict included it
   in C-rating means ("No immediate concern was noted for continued
   use.") and was applied to many sections. Stripped from all 262.
2. **"serviceable overall"** — 1 leftover entry (a rudder chip with
   nested `{any:...}` token that escaped v2178's cleanup). Rewrote
   to "in overall sound condition."
3. **9 elevated-reading conductivity chips without [insert reading
   range]** — heuristic classification introduced entries like "Some
   readings were elevated." without a range input. Injected
   [insert reading range] into every one.

### Triple-read pass — 16/16 invariants confirmed 3 times in a row:

- No "bowsprit" in library / insurance template / survey template.
- No "programme" (→ "program").
- No "vintage" (→ "age").
- No "serviceable overall" leftover.
- No "for continued use" filler.
- No "without deficiency condition" grammar bug.
- All 3,730 library chips have `severity`.
- All chips have `phase`.
- No `always` flag remaining (v2178 concept retired).
- All 838 active section-rating combos have all 3 phases
  (observed / means / action).
- All 7 conductivity sections × active ratings have a standalone
  0-to-999 scale chip.
- Every elevated-reading conductivity observed chip includes
  [insert reading range].
- COMPONENT_BUILDERS is empty — every item uses the chip picker.
- All 174 ITEM_SNIPPET_MAP targets exist in the library.

---

## v2206 — 2026-04-14

### Rewritten — Grab rails A/B/C (no "functioning as intended")

Curated 17 chips with non-mechanical vocabulary:

- **A**: loose/cracked/detached rails, severely corroded mounts,
  safety-hazard means, replace-and-rebed action.
- **B**: worn finish, failing bedding, minor movement, weathering
  concern means, refinish + rebed/retighten actions.
- **C**: solidly mounted / intact / minor cosmetic wear, safe
  handhold means, no action / routine program.

"Refinishing" sits in action phase (not observed) where it belongs.

### Re-classified — 42 library chips moved to correct phase

Library-wide pass over every chip currently tagged `observed`. Applied
the picker's phase classifier and moved chips whose text clearly
describes an ACTION (starts with Monitor / Replace / Refinish /
Refurbish / Service / The affected / A qualified / etc.) or a MEANS
(contains interpretive patterns like "represents", "is a concern",
"cannot be relied upon", "warrants", "consistent with", "provides
effective"). Conservative — only moved observed → action/means;
never demoted existing action or means chips.

- 7 chips moved observed → action
- 35 chips moved observed → means

After reclassification, 14 section-rating combos had new phase gaps
(chips that had been filling observed no longer did). Re-backfilled
those 14 gaps with the generic rating-appropriate default chips.

### Verified — 838/838 combos, 0 phase gaps

Final audit confirms: every section × active rating still has at
least one chip in each of observed / means / action.

---

## v2205 — 2026-04-14

### Added — "On shore + winterized" NT chips for every water-using item

10 water-system items in the template now have dedicated
Not-tested/not-verified chips explaining "vessel was on shore and
winterized at the time of survey":

- Shore water hookup
- Sink, faucet and drain
- Cockpit sink, faucets and drain
- Head, toilet and seacock
- Head, faucet, sink and drain
- Hot water tank(s), plumbing and electrical
- Black water tank(s) and plumbing
- Fresh water tank(s) and plumbing
- Fresh water pump
- Cooling water intake seacock(s) and strainer(s)

Each gets two chips:
- Observed: "The [item] was not tested because the vessel was on
  shore and winterized at the time of survey."
- Action: "Recommend testing the [item] when the vessel is
  commissioned for the season."

Shore water hookup already had this from v2204 so it was skipped —
9 net items received the NT chips in this pass.

---

## v2204 — 2026-04-14

### Rewritten — Stanchions A/B/C (hand-curated)

Old C rating had 5 near-duplicate chips describing the same "firmly
mounted to the deck" finding. Replaced with 19 curated chips across
the three ratings, past tense, severity-ordered, no redundancy:

- **A** (critical safety): loose/broken/pulled-free stanchions,
  structural cracking into the deck; fall-protection hazard means;
  rebed-or-replace-before-service action.
- **B** (attention): movement typical for age, minor spider cracks,
  failing bedding; warrants attention to prevent core ingress;
  inspect-rebed / monitor-at-haul actions.
- **C** (serviceable): solidly affixed, intact bases, minor cosmetic
  spider cracks, slight movement; effective fall protection / cosmetic
  means; no-action / routine-program.

### Removed — 44 library-wide near-duplicate chips

Pass over every (section, rating, phase) group using Jaccard word-set
similarity with a 0.82 threshold. 455 groups checked, 44 chips removed
where a near-identical sibling already existed in the same group.
Preserves every functionally distinct chip; eliminates variant
paraphrases that produced redundant prose when both were ticked.

Phase-coverage verification after dedupe: **838 active combos, 0 gaps**.
Severity field populated on every chip (v2186 batch + v2187/202
curated). Picker sorts by severity ascending within phase (v2175), so
chips always appear from lightest finding at top to most severe at
bottom.

### Added — Shore water hookup: "on-shore + winterized" NT chip

Dedicated Not-tested/not-verified chips for when the vessel was on
shore and winterized:
- Observed: "The shore water hookup was not tested because the vessel
  was on shore and winterized at the time of survey."
- Action: "Recommend testing the shore water hookup under pressure
  when the vessel is commissioned for the season."

---

## v2203 — 2026-04-14

### Changed — Split combined 0-999 chips into separate observed + means chips

v2202's backfill had each conductivity scale chip combined with its
interpretation ("…scale; readings were consistent with a sound
laminate.") — which mixed observed and means in one sentence. Split
all 18 combined chips into two separate chips:

- Observed: "Conductivity testing was carried out on a relative 0 to
  999 scale." (severity 1)
- Means: "The readings were consistent with a sound laminate." / "The
  readings indicated significant moisture or delamination." / etc.
  (severity matches rating)
- For B, "some readings were elevated" was re-classified as a
  second observed-phase chip rather than means — it's a finding, not
  an interpretation.

Also added the standalone 0-to-999 scale chip to Cockpit conductivity
testing A/B/C (which had inline-scaled chips from an earlier curation
but no bare scale statement).

### Fixed — Grammar on "without deficiency condition" phrasings

9 library entries contained malformed phrases like "readings
consistent with a without deficiency condition" and "indicated a in
good order condition". Rewrote to clean grammar:

- "readings consistent with a without deficiency condition" → "readings
  consistent with a sound laminate"
- "was in without deficiency condition" → "showed no deficiencies"
- "in a without deficiency condition" → "with no deficiencies"
- "indicated a in good order condition" → "indicated the vessel was
  in good order"
- "indicated a without deficiency condition" → "showed no deficiencies"
- "with in proper condition" → "in proper working condition"
- "without deficiency condition" → "without deficiencies"

Zero "without deficiency condition" patterns remain.

---

## v2202 — 2026-04-14

### Added (library-wide) — Every section × A/B/C rating now has all 3 phases

The 3-phase format (**observed / means / action**) is now guaranteed
for every rating in every section that has any chips — no exceptions.
Before this pass: 785 section-rating combos were missing at least one
phase (mostly "means" and "action"). Fix: backfill a generic rating-
appropriate chip for every missing phase.

Backfill defaults (per rating):
- **A** → observed: "A significant concern was observed with this
  item." / means: "This represents a significant concern for the
  vessel's safe or structural operation." / action: "Professional
  assessment and repair is required before the vessel is returned
  to service."
- **B** → observed: "An area warranting attention was noted on this
  item." / means: "The finding should be monitored and addressed in
  the near term." / action: "Address this at the next scheduled
  service."
- **C** → observed: "This item was inspected and found in acceptable
  condition." / means: "No immediate concern was noted for continued
  use." / action: "No action required at this time."

These are deliberately generic — section-specific curation replaces
them when the surveyor flags any section as needing tailored chips.
Total chips added: 1,189.

### Added — Every conductivity section has a 0-to-999 scale observed chip on each rating

Every section with "conductivity" in its name (7 sections × up to 3
active ratings) now guarantees at least one observed chip that
mentions the 0 to 999 relative scale. Rating-specific phrasing:

- **A**: "Conductivity testing was carried out on a relative 0 to 999
  scale; readings indicated significant moisture or delamination."
- **B**: "Conductivity testing was carried out on a relative 0 to 999
  scale; some readings were elevated."
- **C**: "Conductivity testing was carried out on a relative 0 to 999
  scale; readings were consistent with a sound laminate."

Added 18 scale chips total across: Aft deck, Cockpit, Conductivity
testing (generic), Deck and coachroof/pilothouse, Flybridge, Hull and
rudder(s), Swim platform.

### Triple-check

Audit passes 2 and 3 both confirm:
- 838 section-rating combos active, 0 phase gaps.
- All conductivity section × active ratings have a 0-to-999 chip.

---

## v2201 — 2026-04-14

### Fixed — Three ITEM_SNIPPET_MAP entries were pointing at non-existent sections

After v2199's bowsprit strip, three map entries still redirected
lookups to "Bowsprit, deck and coachroof/pilothouse impact and
resonance testing" — a section name that no longer existed. The
deck-percussion picker showed no chips on any rating because
`findTextVariants` found zero entries at the stale target.

Redirected all three to the actual curated section
("Deck and coachroof/pilot percussion testing"):
- "Bowsprit, deck and coachroof/pilot house impact and resonance testing" → …
- "Deck and coachroof/pilot house impact and resonance testing" → …
- "Deck and coachroof/pilot percussion testing" → …

Audit confirms zero remaining bad map entries. Deck percussion A/B/C
chips now render (the curated 19 from v2199).

### Changed — "in acceptable condition" → "in working condition" on bow roller

The bow roller assembly is a mechanical item ("intact and in working
condition" reads better than "in acceptable condition"). Rewrote the
specific entry.

---

## v2200 — 2026-04-14

### Fixed — Area photo INITIAL render also shows Take + Import buttons

v2196 updated `refreshAreaPhotoGrid` (the post-change redraw) to show
both the camera and the library-import buttons, but the initial
render of area-photo sections used a different code path inside
`renderInspection` — a `<label>` wrapping a hidden
`<input type="file">`. Deck and coachroof photos (and any section
rendered on first page load with zero photos) still showed only the
old single Take Photos button. Replaced the label-wrapped input with
the same two-button layout used by the refresh path.

Now every area-photo section shows:
- 📷 Take Photos (solid blue, opens batch camera)
- 🖼️ Import photos from library / files (outlined)
- Helper caption explaining multi-select + desktop drag-drop

---

## v2199 — 2026-04-14

### Removed — All bowsprit references throughout the survey

Per user preference, bowsprit has its own dedicated item elsewhere and
shouldn't bleed into deck/coachroof testing. Scrubbed:

- `survey_template.json`: "Bowsprit, deck and coachroof/pilot house
  impact and resonance testing" → "Deck and coachroof/pilot house
  impact and resonance testing" (+ conductivity equivalent).
- `text_library.json`: sheet "Deck & Bowsprit" renamed to "Deck";
  SHEET_MAPPING updated to point at the new name. 14 bowsprit
  occurrences (inline phrases, rating labels, 1 modified entry)
  cleaned. Zero bowsprit mentions remain across library + templates.

### Rewritten — Deck and coachroof percussion A/B/C with [insert location] inputs

Every A-rating and B-rating chip that says "most of the deck" now
has an `[insert location]` text input so the surveyor can specify
exactly where the dull thuds or ringing tones were detected:

- **A**: "Impact testing of most of the deck and coachroof produced
  dull thuds indicating possible saturation, specifically at
  [location]."
- **A**: "... produced ringing tones indicating possible voids, poor
  resin impregnation, or delamination, specifically at [location]."
- **B**: "Most of the deck and coachroof produced a clear and even
  tone; however, localized dull thuds indicating possible saturation
  were noted at [location]." (+ ringing-tone variant)
- **B**: "Isolated areas of slight dullness were noted at [location]."
- **C**: Pure no-concern findings — no location input needed.

19 chips total (5 A / 8 B / 6 C). Past tense, phase-sorted,
severity-ordered, no bowsprit mentions.

---

## v2198 — 2026-04-14

### Fixed — "Take Photos" in area sections now opens the camera (not the file picker)

When `navigator.mediaDevices.getUserMedia` isn't available, area-photo
capture falls back to a hidden `<input type="file">`. The fallback
was missing `capture="environment"`, so mobile browsers treated it as
a generic file picker and opened the photo library instead of the
rear camera. Added `input.capture = 'environment'` to the fallback
path.

Desktop Chrome still uses the live-camera overlay via getUserMedia.
The separate "🖼️ Import photos from library / files" button remains
available on every area section for users who want to pick existing
photos.

---

## v2197 — 2026-04-14

### Removed — Redundant standalone "Conductivity readings were taken" chips

Ticking both "Conductivity readings were taken on a relative 0 to 999
scale." AND any actual finding chip produced awkward double-
introduction prose. Deleted 15 of these standalone boilerplate chips
from conductivity sections across the library. The remaining
observation chips are self-describing (e.g. "The hull returned
elevated readings of [low to high]." / "Conductivity testing of the
cockpit, on a relative 0 to 999 scale, did not detect concerning
readings.") — ticking one chip yields a clean, complete sentence.

### Rewritten — Cockpit conductivity testing A/B/C self-contained chips

Every chip now works standalone — the 0-to-999 scale reference is
inlined where it adds context ("Conductivity testing of the cockpit,
on a relative 0 to 999 scale, did not detect concerning readings.")
and omitted where it would be verbose. No chip requires a companion
"readings were taken" chip. 26 chips total across A (6) / B (9) /
C (8) / Not tested (3).

### Fixed — Bracket placeholder bugs

- `[[insert value]]` (double brackets) → `[insert reading range]`
  (picker recognizes this form and renders as low-to-high inputs)
- `[insert reading]` (singular, missing "range") →
  `[insert reading range]`

Fixed 5 such placeholders across the library.

---

## v2196 — 2026-04-14

### Changed — Area photo sections now offer both Take and Import buttons

Area photo sections (cockpit photos, deck photos, cabin photos, etc.)
had a single "Add More" button that went straight to the camera. The
per-item media sheet has offered both Take + Import since v2163 — area
sections now match that UX.

- 📷 Take Photos (primary, filled) — launches the batch camera
- 🖼️ Import photos from library / files (outlined) — file picker,
  multi-select, converts HEIC to JPEG automatically
- Helper caption: "Both buttons support selecting multiple photos at
  once. On desktop, you can also drag photo files onto any item card."

Also wired `attachPhotosToItem` to refresh the area-photo grid when
the label has one, so imports into cockpit/deck/etc. sections show
the new thumbnails immediately without reload.

---

## v2195 — 2026-04-14

### Added — Confirm dialog when skipping an item that has saved notes

Tapping ⊘ (exclude from report) on an item with notes now prompts:
"This item has saved notes. Skipping will mark it excluded from the
report and clear the text. Continue?" — with **Skip and clear** /
**Cancel** buttons. Confirming clears the notes text AND marks the
item excluded in one atomic save. Cancel keeps the notes intact.

Unskipping (toggling exclude OFF) is always safe and doesn't prompt.
Skipping an item with no notes (nothing to lose) also skips silently
without a prompt.

---

## v2194 — 2026-04-14

### Changed — Conductivity range input now reads "low to high" + yellow pill styling

The `[insert reading range]` placeholder previously rendered as two
number inputs separated by a bare en-dash — when unfilled, output
looked like "readings of – were noted". Clarified:

- The two inputs now have an explicit "to" label between them (not
  "–"), each with a tooltip reading "low reading (0–999 scale)" /
  "high reading (0–999 scale)".
- Inputs rendered on a soft yellow pill background so the slot is
  visually distinct from surrounding text.
- Placeholder when unfilled reads "[low to high]" so the surveyor
  sees at a glance what the field expects.
- Output text now reads "readings of 50 to 125" (using "to", not
  en-dash) for better prose flow in the completed note.

### Added — Missing `[insert reading range]` injected into 11 conductivity chips

Audited every library entry containing "elevated" + "conductivity";
11 chips described elevated readings without any range input.
Injected `[insert reading range]` into each so the surveyor can
specify low-to-high readings every time elevated conductivity is
mentioned:

- "… elevated in [describe area(s)] with readings of [low to high]."
- "Areas of elevated conductivity were present with readings of …"
- "Spider cracks or minor signs of elevated conductivity with readings
  of … were visible"
- "minor cracking or elevated conductivity with readings of … was
  detected"
- …plus 7 more similar patterns across hull/deck/coaming/locker/etc.

---

## v2193 — 2026-04-14

### Changed — "Other" catch-all items get rating + free notes only (no picker)

18 template items labeled "… - other" or "other features" / "other
gauges and instrumentation" / "other, additional features" are
miscellaneous-observation fields by design — the structured chip
picker doesn't fit. `showNotesSheet` now detects these patterns and
skips the picker rendering entirely. Surveyor gets the rating badge,
textarea, and Save/Cancel — nothing else.

Applies to: Hull exterior and propulsion - other, Deck and
coachroof/pilot house - other features, Aft deck - other features,
Spars and rigging - other, Cockpit - other features, Pilot house -
other features, Flybridge - other features, Flybridge - other
gauges and instrumentation, Pilot house - other gauges and
instrumentation, Cockpit - other gauges and instrumentation, Cabin
and conveniences - other features, Fuel, water and waste - other
features, Outboard engine - other features, Engines and drives -
other features, Steering and trim mechanics - other features,
Electrical - other features, Electrical, other, additional features,
Sails - other.

### Changed — Dropped "for continued use" filler phrase

"The X was in sound condition for continued use" → "The X was in
sound condition." The phrase was redundant filler — the rating +
surrounding context already imply continued use. Fixed 4 entries
across the library.

---

## v2192 — 2026-04-14

### Rewritten — Swim platform and ladder A/B/C with conductivity chips across all ratings

Old chips read: "The swim ladder was solidly mounted and in proper
condition" / "in without deficiency condition" / multiple near-
duplicates of the same sentence. Curated both section names
("Swim platform and ladder" + "Swim platform and ladder - condition
and conductivity readings") with a single canonical set per rating,
including conductivity language:

- **A (Critical)** — 11 chips. Structural damage, delamination/soft
  spots, failed ladder hardware, readings at/near 999, saturated
  core moisture. Moisture-ingress means. Haul for exploratory work.
- **B (Needs Attention)** — 15 chips. Localized damage, elevated
  conductivity of [range], generally-acceptable-but-elevated,
  minor-corrosion / stiff-ladder, localized wear with loose fittings
  (non-awkward grammar). Warrant-monitoring means + moisture-
  absorption interpretation. Recheck at next haul-out + repair
  actions.
- **C (Serviceable)** — 10 chips. Integrated with transom, dry, no
  visible damage, ladder secure + smooth + protected feet, no
  elevated conductivity, no deficiencies. Sound-condition means.
  No action / routine program.

All chips past tense, no "proper condition" / "without deficiency
condition" / "shows wear" present-tense grammar. Verified both
section names render identically since the template item uses the
long form.

---

## v2191 — 2026-04-14

### Rewritten — Hull exterior above the waterline A/B/C with non-mechanical vocabulary

The section's chips were using mechanical phrasing ("in good working
order", "functioning as intended") inappropriate for a structural,
non-mechanical item, plus "serviceable" which the user is avoiding.
Replaced all existing entries with curated A/B/C chips using
structural/cosmetic vocabulary:

- **A (Critical)** — 8 chips. Significant damage, structural cracking,
  impact penetration. Structural-concern means. Immediate professional
  assessment actions.
- **B (Needs Attention)** — 12 chips. Cosmetic scratches, gelcoat
  crazing, surface cracking, chalking/UV degradation. Means chips
  cover cosmetic vs gelcoat protection. Actions: buff/wax, sand/fair,
  compound polish, gelcoat refinish.
- **C (Serviceable)** — 11 chips. Good overall condition, recently
  buffed/waxed, gelcoat in good condition, cosmetic scratches only.
  Sound-condition means. Routine wash/polish/wax actions.

Improved phrasing on the scratches-and-oxidation sentence:
  old: "The hull showed minor scratches and oxidation typical of a
        boat of this age."
  new: "Minor scratches and light oxidation were noted on the hull,
        consistent with a vessel of this age and use."

---

## v2189 — 2026-04-14

### Changed — Survey cards now display the FULL completed note (no truncation)

The item cards on the survey page were cutting notes off at 80
characters with "…". Surveyor wants to read the completed notes in
full from the card view without tapping in. Removed the truncation,
increased font to 13px, set `white-space: pre-wrap` to preserve
paragraph breaks, and HTML-escaped the content so punctuation in
notes can't break card markup.

### Added — Neutral "no trim tab anodes fitted" chip for A/B/C

Some boats have trim tab anodes, others don't — it's a manufacturer
choice, not a deficiency. Added the same observed-phase chip to all
three ratings for "Trim tabs (exterior tabs, actuators, mounts and
anodes)":
  "No anodes were fitted on the trim tabs — this varies by
   manufacturer and is not a deficiency."

Surveyor can tick this on any rating (including C Serviceable) when
documenting the trim tab inspection without implying a finding.

---

## v2188 — 2026-04-14

### Fixed — "The both anodes" → "Both anodes" (grammar for side=both)

`[side]` replacement produced "The both anodes were more than 50%
depleted." when the surveyor picked Both. Updated the rebuild
handler to special-case side=both: strip preceding article and
capitalize when at sentence start.

- "The [side] anodes were …"      → side=both → "Both anodes were …"
- "the [side] lower seals"        → side=both → "both lower seals"
- "on [side] sides"               → side=both → "on both sides"
- Port/starboard still work the standard way.

---

## v2187 — 2026-04-14

### Added — Drive-count-aware pluralization + port/starboard/both side selector

Twin-outdrive vessels were reading singular prose ("The outdrive unit
was visually inspected") even when `driveLineCount === 2`. Two
additions:

1. **`{drives:singular|plural}` token** — resolves against
   `driveLineCount` in `contextFromSurvey`. Works identically to
   `{count:...}` but driven by drive count rather than rudder count,
   so it applies to outdrive / shaft / saildrive / IPS regardless
   of rudder presence. Applied to 44 curated outdrive chips.
   Examples on a twin-drive survey:
   - "The outdrive {drives:unit was|units were} visually inspected."
     → "The outdrive units were visually inspected."
   - "Minor blade damage was noted on the {drives:propeller|propellers}."
     → "Minor blade damage was noted on the propellers."

2. **`[side]` placeholder** — renders as a Port / Starboard / Both
   selector inline in the chip. Only renders when the survey has
   2+ drive lines (single-drive vessels don't need a side qualifier
   — the placeholder is collapsed to empty on render). Applied to 12
   outdrive chips where side-specific findings are common:
   - "Moderate corrosion was observed on the [side] drive housings in [area]."
   - "A minor oil weep was visible at the [side] lower seals."
   - "The [side] anodes were more than 50% depleted."

Both the drives token and the side selector are extensible — future
curation for any twin-drive system (twin shafts, twin saildrives, IPS
pods) can reuse them without code changes.

---

## v2186 — 2026-04-14

### Added — Phase + severity metadata on every library entry (batch-tagged)

Every entry in `text_library.json` now carries `phase` and `severity`
fields. Multi-sentence entries were split into one entry per sentence,
each tagged individually. Process:

1. **Split**: entries containing 2+ sentences → one entry per sentence,
   preserving section + rating. 1789 multi-sentence entries split.
2. **Phase classification** (expanded from v2173 heuristic):
   - Starts with `Monitor/Recheck/Recommend/Haul/Investigate/Professional/
     Immediate/Schedule/Replace/Service/Repair/Strip/Sand/Clean/Install/
     Address/Reseal/Retighten/Tighten/Fair/Refinish/Inspect/Verify/Test/
     Consult/Check/Confirm/Consider/Ensure/Apply/Fill/Refresh/Continue/
     Restore` → **action**
   - Contains interpretive verbs
     (`indicates/suggests/consistent/considered/abnormal/warrants/
     implies/represents/compromises`) or modal-recommendation patterns
     (`should be`, `must be`, `will cause`, `can mask`, etc.) → **means**
   - Otherwise → **observed**
3. **Severity estimation** 1–5 based on keyword patterns
   (severe/critical → 5, mild/routine → 1).
4. Entries with unexpanded `{any:...}` / `{specify:...}` tokens get a
   single conservative phase/severity — the picker still decomposes
   them per-option at render time.

Result: **2,419 total entries, every one tagged.** Phase distribution:
1754 observed / 264 means / 401 action. Skew toward observed reflects
the library's descriptive-prose style — individual sections can be
rebalanced by explicit re-curation when the surveyor hits any case
where the heuristic misclassified.

The 6 sections with full hand-curation (Hull conductivity, Hull
below-waterline damage, Primer/barrier/anti-fouling, Hull percussion,
Hull anodes, Outdrive) stay as authored — this pass skipped entries
that already had `phase` and `severity` set.

### Fixed — Outdrive chip picker empty due to map mismatch

`ITEM_SNIPPET_MAP` redirected the outdrive label to a section name
(`Outdrive(s) corrosion, anodes, propeller(s), boots and bellows`)
that didn't exist in the library after v2181's rewrite. Fixed to
point at the same long-form section name used by the stored entries
(`Outdrive(s) - (external), corrosion, anodes, propeller(s), boots
and bellows`).

---

## v2185 — 2026-04-14

### Fixed (urgent) — Outdrive chip picker was silently empty due to section-name mismatch

`ITEM_SNIPPET_MAP['Outdrive(s) - (external), corrosion, anodes,
propeller(s), boots and bellows']` mapped to the SHORTER legacy
section name, but v2181's curated library entries were stored under
the FULL long form. `findTextVariants` couldn't find any section
match, returned zero entries, so the picker never rendered — only
the manufacturer/model dropdowns showed above an empty textarea.
Fixed the map so the lookup section equals the stored section.
After push, the Outdrive(s) item will show the 15 A + 19 B + 11 C
chips with 3-phase grouping.

---

## v2184 — 2026-04-14

### Added — Inline count, location, and area inputs on chips

Three new placeholder types supported in library text:
- `[insert count]` — renders as a small number input (0-99). The
  picker interpolates the typed number on rebuild.
- `[insert location(s)]` / `[insert location]` — renders as a text
  input (~180 px) for typing a location phrase.
- `[describe area(s)]` — renders as a text input for area descriptions
  (replaces the hand-fill-after placeholder).

All inputs stop click-propagation so typing doesn't toggle the
checkbox, and fire `oninput` rebuild so the textarea updates live as
the surveyor types.

### Rewritten — Hull anodes A/B/C

23 total chips across the three ratings. Each rating's observed phase
starts with a count + location chip: "[N] hull anodes were fitted on
this vessel, located at [location(s)]." The surveyor types the
count + the location freehand.

- **A (Critical)**: severe depletion, missing entirely, galvanic-
  protection-lost means, per-ABYC-E-2 replacement required.
- **B (Needs Attention)**: >50% depleted, degradation, approaching
  end-of-life, replace-before-relaunch or at-next-haul actions.
  Removed the transom-specific language — B chips now cover any
  mounting location.
- **C (Serviceable)**: securely mounted, >50% material remaining, new
  or recently replaced, **"Although not a hull anode, a bonding
  plate was present and without deficiency."** for the bonding-plate-
  instead case.

---

## v2183 — 2026-04-14

### Changed — N/A produces a single canonical chip

Cut the N/A synthesizer from 3 chips per item to 1. The sole chip
reads "No [item] was/were fitted on this vessel." with verb agreement
based on the plural detection from v2182. The other two phrasings
("This vessel was not equipped with …" and "[Item] was not applicable
to this vessel") were surplus — user preference is a single clean
statement.

Not-tested ratings still produce 3 chips (observed x2 + action x1)
since the distinction between "not tested" and "operation not
verified" carries different nuances.

---

## v2182 — 2026-04-14

### Fixed — Grammar for auto-synthesized N/A chips

Items with plural labels ("Hull anodes", "Stanchions", "Lifelines/safety
rail") were producing grammatically wrong chips:
  "A hull anodes was not fitted on this vessel." ← wrong
  "This vessel was not equipped with a hull anodes." ← wrong
  "The hull anodes was not applicable to this vessel." ← wrong verb

Rewrote the N/A and Not-tested synthesizer with proper English:

1. **Plural detection**: original had `(s)` token, label contains a
   known plural noun (anodes, stanchions, lifelines, rudders,
   propellers, shafts, chainplates, rails, cables, gauges, tanks,
   etc.), or ends in plural-sounding "s" (excluding "ss"/"us"/"is"/
   "ness"/"ous" which are singular).
2. **Uncountable detection**: labels containing "lighting",
   "plumbing", "heating", "steering", "wiring", "instrumentation",
   etc. get no article.
3. **Article choice**: "a" vs "an" based on first vowel.
4. **`(s)` → "s"** expansion so "Fuel tank(s)" renders as "Fuel
   tanks" (not "Fuel tank" which would produce "No fuel tank were
   fitted").
5. **Trailing periods stripped** so labels like "Propane valve,
   regulator, gauge, storage compartment and vent." no longer
   produce doubled periods.

Examples after the fix:
- "Hull anodes" → "No hull anodes were fitted on this vessel." /
  "This vessel was not equipped with hull anodes." / "Hull anodes
  were not applicable to this vessel."
- "Binnacle" → "No binnacle was fitted on this vessel." / "This
  vessel was not equipped with a binnacle." / "The binnacle was not
  applicable to this vessel."
- "Lighting (cabin)" → "No lighting (cabin) was fitted on this
  vessel." / "This vessel was not equipped with lighting (cabin)." /
  "Lighting (cabin) was not applicable to this vessel."
- "Fuel tank(s)" → "No fuel tanks were fitted on this vessel." /
  "This vessel was not equipped with fuel tanks." / "Fuel tanks were
  not applicable to this vessel."

Not-tested chips get parallel grammar treatment (was/were agreement,
article handling, "(s)" expansion).

---

## v2181 — 2026-04-14

### Changed — Outdrive now uses the chip picker (retired dropdown builder)

Removed `COMPONENT_BUILDERS['Outdrive(s) - (external), corrosion,
anodes, propeller(s), boots and bellows']`. This item now uses the
standard chip picker with curated library entries.

Scope cleanups baked into the rewrite:
- **Trim tab mentions removed** — trim tabs have their own dedicated
  item ("Trim tabs (exterior tabs, actuators, mounts and anodes)").
  The outdrive chips no longer mention trim tab anodes.
- **Gimbal bearing mentions removed** — belongs in a separate inboard-
  drive context, not the outdrive external inspection.
- **0-anode case covered** — new C chip reads "No anodes were fitted
  on this outdrive." Surveyor can pick this when the vessel has no
  sacrificial anodes on the drive.

### Rewritten — Outdrive(s) - (external) library (A/B/C)

15 A chips, 19 B chips, 16 C chips — all past tense, 3-phase pattern,
severity sorted:

- **A**: severe corrosion, impact damage, cracked bellows, active oil
  leak, significant propeller damage, missing anodes. Sinking-hazard
  and must-remediate-before-service actions.
- **B**: moderate corrosion, hardening bellows, minor oil weep, minor
  prop damage, 50%-depleted anodes, peeling paint, stiff tilt/trim.
  Service / replace / strip-and-repaint / recondition actions.
- **C**: no damage / no corrosion / minor surface only, pliable
  bellows, no leaks, good prop, adequate or recently-replaced anodes,
  OR no anodes fitted, intact paint, smooth tilt/trim. No action /
  continue seasonal program / monitor anodes.

---

## v2180 — 2026-04-14

### Changed — Primer/barrier/anti-fouling now uses the chip picker (retired dropdown builder)

Removed the `COMPONENT_BUILDERS['Primer, barrier coat, anti-fouling']`
entry. This item now falls through to the standard sentence picker
powered by v2177's curated library entries (A/B/C with phase
structure, severity sort, no "Rudder Anti-fouling" dropdown that
didn't apply to outdrive boats). UX is now consistent with every
other curated item.

### Hidden — "Keel and keel joint" + "Keel bolts" on power boats

Power vessels don't have external ballast keels or keel bolts.
Added the two items to a `SAIL_ONLY_ITEM_LABELS` filter in the three
`shouldShowItem` / `itemApplies` / `shouldShowHeaderItem` hooks so
they're hidden from any survey with `vesselType === 'power'`.

### Added — Auto-synthesized chips for "Not applicable" / "Not tested" ratings

The library has no entries for non-A/B/C ratings, so setting an item
to "Not applicable" previously showed an empty picker. v2180
synthesizes phase-structured chips on the fly using the item's
transformed display label:

- **Not applicable** → 3 observed-phase chips:
  - "A [item] was not fitted on this vessel."
  - "This vessel was not equipped with a [item]."
  - "The [item] was not applicable to this vessel."
- **Not tested / Not verified** → 2 observed + 1 action chip:
  - "The [item] was not tested at the time of survey."
  - "Operation of the [item] was not verified at the time of survey."
  - "Recommend testing the [item] under operational conditions."

All sentences past tense, grammatically sensible, and use
`displayItemLabel` so rudder-stripped labels flow through correctly
on no-rudder vessels.

### Fixed — Picker renders with 1 or more chips

Lowered the threshold from `>= 2` to `>= 1` so every item with at
least one chip shows the picker (was blocking Hull percussion C
which collapsed to a single chip after dedupe).

---

## v2179 — 2026-04-14

### Fixed — Picker now renders even with just 1 unique chip

Hull percussion testing C had only one library entry that, after
rudder-token expansion + dedupe, collapsed to a single sentence.
Threshold was `_pickerSentences.length >= 2`, so zero chips rendered
and the surveyor saw only "Change template ▸". Lowered to >= 1 so
every item with at least one chip shows the picker.

### Rewritten — Hull percussion testing (Hull and rudder(s) impact and resonance testing) A/B/C

Full 3-phase curation:
- **A (Critical)** — 9 chips. Dull thud across significant areas,
  ringing tone indicating voids/delamination. Structural-concern means.
  Immediate haul + professional assessment.
- **B (Needs Attention)** — 9 chips. Localized variations, slight
  dullness, isolated hollow spots. Warrant-monitoring means. Monitor +
  moisture-test follow-up.
- **C (Serviceable)** — 7 chips. Clear and even tone, no hollow/dull
  areas. Sound-laminate means. No action / continue seasonal program.

All chips past tense, no "serviceable" verbiage, no `always` flags.

---

## v2178 — 2026-04-14

### Changed — Writing conventions enforced: past tense + "program" + no "serviceable" + no auto-included sentence

Three user-preference changes that shape every future chip curation:

1. **Past tense** for observed + means phases. Rewrote 22 curated
   library entries that were present-tense ("the damage is cosmetic"
   → "the damage was cosmetic"). Action phase stays imperative
   ("should be sanded").

2. **"program"** not "programme" — explicit exception to the
   otherwise-Canadian-English rule. Library scan + rewrite converted
   all existing uses.

3. **Avoid "serviceable"** — Dave is consciously differentiating
   Kiki's output from stock SAMS prose. Rewrote 3 curated-section
   uses of "the hull was serviceable overall" to "no evident damage
   was observed on the hull" and similar alternatives. 50 remaining
   uses in non-curated sections will get rewritten as Dave touches
   those sections.

4. **"Always" locked-chip concept removed.** Previously the top of
   each picker showed a pre-checked, disabled "boilerplate" sentence
   (e.g. "Conductivity readings were taken on a relative 0 to 999
   scale"). Removed the green "always" badge, the disabled state, and
   the row tinting. All chips are now optional and equal. Dropped the
   `always: true` flag from 9 library entries.

### Added — `applyWritingFixups` runs on note load AND save

Known present-tense snippet fragments + "programme" → "program" get
rewritten every time a note is opened (display-side fix) and saved
(persistence fix). This progressively cleans up already-saved
observations as the surveyor works through the items. Surveyor does
not need to re-pick chips to get the corrected text — it appears
automatically when the item is opened.

### Saved — Writing style feedback memory

Persisted these writing conventions to `.auto-memory/feedback_writing_style.md`
so future conversations remember them.

---

## v2177 — 2026-04-14

### Changed — Scope split between Hull damage vs Primer/barrier coat/anti-fouling

Two separate template items exist:
- "Evident damage or repairs to hull and rudder(s) (if applicable) below
  the waterline" — structural damage/repair concerns
- "Primer, barrier coat, anti-fouling" — coating-system condition

Anti-fouling chips were bleeding into the damage section, overlapping
scope with the dedicated coating item. Removed 12 anti-fouling-related
chips from the hull damage section across all 3 ratings and replaced
the B-rating action chips with damage-focused treatments (sand to
gelcoat, fair with compound, recoat with epoxy barrier) that stop at
the barrier coat layer. Anti-fouling recommendations now live only in
the coating section.

### Rewritten — Primer, barrier coat, anti-fouling library (A/B/C)

Full 3-phase curation with severity sorting:
- **A (Critical)**: 8 chips. Failed/missing anti-fouling, compromised
  barrier coat, extensive primer flaking. Immediate coating restoration.
- **B (Needs Attention)**: 11 chips. Worn thin / worn off anti-fouling,
  accumulated legacy coats, localized barrier-coat issues. Monitor +
  spot-repair / full recoat recommendations.
- **C (Serviceable)**: 9 chips. Intact coating system in good order,
  normal seasonal wear. Routine touch-ups, seasonal refresh, or no
  action required.

All chips use coating-system vocabulary only — no reference to hull
structural damage, which lives in the other item.

---

## v2176 — 2026-04-14

### Fixed — `{specify:opt1|opt2|...}` tokens now decompose into chips

The picker's sentence decomposer only handled `{any:...}` tokens.
`{specify:...}` tokens (single-select inline lists) leaked raw into
chip previews. v2176 decomposes them the same way: for each option,
graft the surrounding sentence context so each chip reads as a
complete sentence.
  "The hull was {specify:good|fair|poor}." →
  "The hull was good." / "The hull was fair." / "The hull was poor."

### Added — Marine-surveyor vocabulary supplements the spell dictionary

Inspection notes were flagging common trade terms ("recoated",
"fibreglass", "gelcoat", "delamination", "stanchion", "saildrive",
etc.) as unknown words. Added ~60 marine/surveyor terms as a
MARINE_EXTRAS list that augments `SPELL_DICT` after the base
dictionary loads. Covers finishes, structures, rigging, hardware,
and common abbreviations (ABYC, TP1332, NMMA, SOLAS).

### Rewritten — Hull(s) condition (below the waterline) A and C ratings

Curated both A and C with the 3-phase pattern:
- **A (Critical)**: 5 observed chips covering structural damage,
  blistering, delamination, impact penetration. 2 means chips on
  seaworthiness and remediation. 3 action chips for immediate
  professional response.
- **C (Serviceable)**: 7 observed chips for "good order / cosmetic
  wear / acceptable condition" variants + anti-fouling state. 3
  means chips for reassurance. 3 action chips for "no action / routine
  maintenance / seasonal inspection".

All three ratings (A, B, C) for this section now follow the same
phase-structured, severity-ordered pattern.

---

## v2175 — 2026-04-14

### Added — Severity-sorted chips within each phase + rating badge in header

Chips within each phase section (Observed / Means / Action) now sort
by severity ascending — mild findings first, severe last. This
matches the natural SAMS writing flow where you mention the lightest
applicable issues before escalating to the most serious.

Library entries can set `severity: 1-5` (1 = mild, 5 = severe). When
unset, the picker estimates severity from keyword patterns:
- 5 (severe): "severe", "critical", "structural", "compromise",
  "delamination", "catastrophic", "replace immediately"
- 4: "exposed", "gouging", "fairing compound", "epoxy barrier", "haul"
- 3: "blistering", "cracking", "moisture", "elevated", "sanded to"
- 2: "worn thin", "cosmetic", "scrape", "ding", "lightly sand"
- 1 (mild): "serviceable", "no concerns", "no softness", "no signs",
  "consistent with proper condition", "within normal range"

Applied explicit severity to 47 chips across the three curated sections
(Hull conductivity A/B/C + Hull condition below-waterline B).

### Changed — Rating letter shown in modal header + picker header

The notes modal title now displays a coloured rating badge (A red,
B amber, C green, etc.) inline with the item label, so the surveyor
always sees which rating they're writing for. The "Build observation"
picker header also shows the same badge.

---

## v2174 — 2026-04-14

### Fixed — `{any:opt1|opt2|...}` tokens now decompose into individual chips

The sentence-splitter in the picker was treating the whole
`{any:...}` token as one "sentence", producing a giant raw-text chip
with all options concatenated by `|` (unusable). v2174 preprocesses
text by:

1. Scanning for `{any:...}` tokens
2. Splitting prose before/after each token as its own sentence
3. Splitting each option inside the token as its own sentence (with
   `^CITATION` tags stripped)
4. Then applying the normal sentence splitter

This means every non-curated item with `{any:...}` options now renders
each option as a separate tickable chip, auto-classified by phase via
the heuristic. Surveyor can tick the specific findings that apply
without reading a wall of pipe-separated text.

### Rewritten — Hull(s) condition (below the waterline) B rating

Replaced the single `{any:...}` pipe-encoded entry with 18 curated
chips split into observed (9) / means (3) / action (6). Each chip is
one discrete finding or recommendation:

- **Observed**: anti-fouling worn thin / worn off, surface cracking,
  blistering, gouging, scrapes and dings, cosmetic scoring, exposed
  fibreglass — each with `[describe area(s)]` placeholder for
  hand-fill.
- **Means**: damage is cosmetic / localized / consistent with age.
- **Action**: range of treatments from light sand-and-recoat up to
  fairing compound + epoxy barrier + gelcoat + anti-fouling.

Surveyor ticks the observations that apply + the matching treatment
action. Always-on "Below the waterline, the hull was serviceable
overall." anchors the paragraph.

---

## v2173 — 2026-04-14

### Added — Observed/Means/Action 3-phase grouping in sentence picker + rating-aware severity

Baked the SAMS observation pattern into the picker UI:
1. **What was observed** — findings (the measurements / what you saw)
2. **What it means for this vessel** — interpretation in context
3. **What should be done** — recommendation / next step

Library entries can set `phase: "observed" | "means" | "action"`.
Entries without a phase fall back to a heuristic classifier:
- Starts with Monitor/Recheck/Recommend/Haul/Investigate/Professional/
  Immediate/Schedule → action
- Contains indicates/suggests/consistent/considered/abnormal/warrants/
  evidences/implies → means
- Otherwise → observed

Chips render grouped under phase headers (gray section bars). `always`
boilerplate stays pinned at the top of its phase.

### Rewritten — Hull conductivity A/B/C with rating-appropriate severity

Each rating's chips now strictly match its severity:
- **A (Critical)** — 10 chips. Severe findings only ("readings at or near
  999 across large areas", "softness/delamination detected"),
  structural-compromise interpretations, immediate-action
  recommendations. No "age-appropriate" reassurance language.
- **B (Needs Attention)** — 11 chips. Moderate elevated readings,
  "warrants monitoring", proactive actions. No "immediate" language.
- **C (Serviceable)** — 8 chips. Clean/baseline findings, "within normal
  range for vessel age", routine monitoring only. No "warrants action"
  language.

Pattern reference for future curation: A-observed chips describe
severe measurements; A-means chips interpret as structural risk;
A-action chips are urgent. B-means describe concerns to track;
B-action is "monitor" / "recheck" / "address proactively". C-means
is reassuring; C-action is "no action required" / "routine check".

---

## v2172 — 2026-04-14

### Added — "always" boilerplate + inline range inputs in sentence picker

Two picker upgrades driven by the Ahoy Vey conductivity workflow:

1. Library entries can set `"always": true`. Those sentences render
   pre-checked and disabled at the top of the picker with a green
   "always" badge, and always appear in the rebuilt textarea. Used for
   the "Conductivity readings were taken on a relative 0 to 999 scale"
   boilerplate that the surveyor said is always part of the sentence.

2. Any `[insert reading range]` placeholder in a chip renders as two
   inline number inputs (low–high, 0-999). Typing numbers triggers the
   rebuild and interpolates them as an en-dash pair (e.g., "150–275")
   into the output sentence. Click events on the inputs don't bubble
   up to the label, so typing doesn't toggle the checkbox.

### Rewritten — Hull and rudder(s) conductivity testing library (A/B/C)

Replaced the 6 existing pre-written paragraph variants with 19
single-sentence entries across A, B, and C ratings. Each rating now
has one `always` boilerplate sentence + a curated set of distinct
follow-ups the surveyor can tick:

- A (Critical): 5 chips covering severity descriptors + remediation asks
- B (Needs Attention): 6 chips covering range readings, findings,
  monitoring recommendations
- C (Serviceable): 5 chips covering clean readings, elevated-but-normal
  readings, and monitor/recheck follow-ups

All rudder verbiage stripped — the rudder/bronze/saildrive branches
don't apply to Ahoy Vey (outdrive) and would have been token-scrubbed
anyway, so they're removed from the source for cleaner chips.

This pattern (always + tickable sentences, optional inline inputs)
should be extended to other sections as the surveyor encounters them.

---

## v2171 — 2026-04-14

### Added — Sentence-level picker ("chips") for fast observation composition

Multi-variant rating cards are pre-written paragraphs; the surveyor had
to read all of them to pick one. New UI breaks every variant into
sentences, dedupes across all variants, and renders each unique
sentence as a checkbox row above the card list. Ticking sentences
rebuilds the Notes textarea in the original sentence order with a
single space separator. Untick to remove.

Behaviour:
- If 2+ unique sentences exist, the picker renders at the top of the
  Quick Insert area.
- The full-paragraph card list collapses to "Full paragraph templates ▸"
  since the picker satisfies the same need faster.
- Picker is per-item: `window._sentencePicker[sanitizedLabel]` stores
  the sentence array; `_kkRebuildFromSentencePicker(sanitizedLabel)`
  is the onchange handler attached to each chip.
- Downstream chip-strip (`{any:...}`, `{specify:...}` token builder)
  still works on the rebuilt text via a dispatched `input` event.

For outdrive / IPS surveys this combines with v2169's token expansion
so the chip picker's sentence options are already rudder-stripped —
no manual cleanup needed.

---

## v2170 — 2026-04-14

### Fixed — Dedupe identical snippet variants on no-rudder vessels + strip "rudder" from rating badges

On outdrive / IPS surveys the library's "C - one rudder" and
"C - two rudders" variants produce identical cleaned text after rudder
token expansion, so the surveyor was seeing two apparently identical
cards with confusing rudder-count badges. Two changes in
`showNotesSheet`:

1. After token expansion, dedupe any variants whose `.text` collapses
   to the same string. Keep the first. Card list now shows one card
   instead of two.
2. If the remaining variant's `rating` field mentions "rudder"
   (e.g. "C - one rudder"), collapse the badge to the base rating
   letter (e.g. "C") when the vessel has no rudder.

Sail / shaft-drive vessels are unaffected — both variants produce
different expanded text, so both cards continue to show.

---

## v2169 — 2026-04-14

### Fixed (urgent) — Snippet card preview now shows expanded text on no-rudder vessels

Cards in the Quick Insert panel were showing raw tokens like
`{if-rudder: and {count:rudder|rudders}}` on outdrive surveys because
`highlightSnippetDiffs` operated on `v.text` directly — never running
the rudder-gating token expansion before diffing. The surveyor saw
the literal placeholder text on the card face even though insertion
into the textarea would have produced clean prose.

Fix in `showNotesSheet`: before diffing, build a parallel
`sheetVariantsForDisplay` array with each `.text` field pre-expanded
through `expandSnippetTokens` (using the survey's
`KikiSnippetTokens.contextFromSurvey` context). The originals stay on
`sheetVariants` so insertion-time expansion still runs on the raw
template.

---

## v2168 — 2026-04-14

### Fixed (urgent) — Snippet cards / chip-builder now appear for renamed hull+rudder + Hydraulic steering items

`ITEM_SNIPPET_MAP` only had the OLD label forms (pre-v2162), so items
with the current template labels had no snippet section match —
`findTextVariants` returned zero, no cards appeared, and the
check-off-chip builder never activated. Added mappings:

- `Evident damage or repairs to hull and rudder(s) (if applicable) below the waterline`
  → `Hull(s) condition (below the waterline)`
- `Hydraulic steering (hoses, fittings, steering cylinder, tiller arm / tiller bolt or tie-bar, rudder post and stuffing box, etc.)`
  → `Hydraulic steering (hoses, fittings, steering cylinder, tiller arm or tie bar, rudder post and stuffing box, etc.)`

The three other renamed rudder labels (percussion testing, conductivity
testing, impact-and-resonance testing) were already mapped correctly.

---

## v2167 — 2026-04-14

### Fixed (urgent) — Firestore listener will no longer overwrite richer local surveys

Root cause of the Ahoy Vey data loss: when the user ran a manual
DevTools migration that wrote directly to IndexedDB via
`objectStore.put()`, it bypassed the `saveSurvey` wrapper that bumps
`lastModified` and pushes to Firebase. Cloud kept its older copy with
the older timestamp. On next page load the Firestore real-time listener
saw `remote.lastModified > local.lastModified` (because cloud had been
pushed by an earlier in-app save with `lastModified=now`, while local's
was unchanged from the SC import) and called `saveSurvey(remoteSurvey)`,
silently overwriting the merged data — losing 135ch of observation
text and 6 of the 12 photos on the hull/rudder item.

Defensive guard added in the Firestore `onSnapshot` listener: before
overwriting local with remote, score both surveys for content density
(text length, photo count, rated-item count). If local has
substantially MORE content than remote, the listener REFUSES the
overwrite and instead pushes the local copy back to Firebase to repair
the cloud. Threshold: local wins if it has > remote.text * 1.2 + 50
chars of text, OR more photos, OR more rated items.

This protects against any future scenario — manual migrations, race
conditions on multi-device sync, or a corrupted cloud copy — where a
naive timestamp comparison would silently regress data.

Console will print a clear warning whenever the guard fires:
`[Sync] REFUSED overwrite of "Ahoy Vey" — local is richer (...). Pushing local to cloud instead.`

---

## v2166 — 2026-04-14

### Fixed — Card labels now strip rudder text on outdrive/IPS surveys

Two latent bugs combined to make v2165's transform invisible on cards:

1. `displayItemLabel(itemLabel)` in `buildCompactItemHTML` was called
   without a `survey` argument, so it fell back to
   `window._currentSurveyCache` — which was READ in two places but
   never WRITTEN anywhere in the codebase. The transform always saw
   a null survey and returned the raw label unchanged.
2. `contextFromSurvey` defaulted `hasRudder` to true unless the
   survey had `hasRudder === false` saved explicitly. The
   SafetyCulture import never sets `hasRudder` (the B-09 logic that
   derives it only fires inside `saveSurveyDetails`), so Ahoy Vey
   had `hasRudder === undefined` and resolved to true.

Fixes:

1. `renderInspection` now sets
   `window._currentSurveyCache = survey` at entry. All
   `displayItemLabel(label)` calls (cards, finding lists, anywhere
   the survey isn't passed in) now see the right context.
2. `contextFromSurvey` derives hasRudder from `driveType` when the
   explicit field isn't saved: outdrive / IPS / saildrive →
   `hasRudder=false`, shaft / sail → `hasRudder=true`. Explicit
   `survey.hasRudder` still wins if set.

Verified: Ahoy Vey-shaped survey (vesselType=power, driveType=outdrive,
no `hasRudder` field) now correctly transforms all 4 rudder labels to
the no-rudder form. Sailboats unaffected.

---

## v2165 — 2026-04-14

### Fixed — Strip naked rudder mentions from snippets and Hydraulic steering label on no-rudder vessels

Outdrive / IPS / saildrive vessels (`hasRudder=false`) were still seeing
"rudder" in inserted snippet text and on the Hydraulic steering item
label. Root cause: 37 of the 49 rudder-mentioning snippets in
`text_library.json` are legacy content that predates the
`{if-rudder:...}` token system, so they passed through expansion
unchanged. The Hydraulic steering label has "rudder post and stuffing
box" inline in the parenthetical — components that don't exist on
outdrive boats.

Fix in `src/core/snippet_tokens.js`:

1. `expandTokens` now calls `scrubNakedRudderRefs` whenever
   `ctx.hasRudder === false`. Conservative pattern set:
   - Drops any sentence whose subject is rudder
     ("Rudder(s) condition was good.", "The rudders showed wear.")
   - Drops sentences led by `{specify:rudder|rudders}` token
   - Special-case verb-agreement fix: "the hull and rudder were/are X"
     → "the hull was/is X" (avoids "The hull were percussion tested.")
   - Strips inline " and rudder(s)" / " and the rudder" / " and rudders"
   - Strips leading "rudder(s) and " before another noun
   - Drops any leftover `{specify:rudder|rudders}` tokens
2. `transformLabelForDisplay` now collapses "Hydraulic steering
   (... rudder post and stuffing box ...)" → "Hydraulic steering"
   when `hasRudder=false`.

Sail and shaft-drive power vessels (hasRudder=true) are unaffected —
all original text passes through unchanged.

Tested with 5 representative snippet patterns + both rudder labels;
all behaved as expected. Surveyor can still hand-edit textarea text
for any edge cases the scrubber misses (the 49 known rudder snippets
mostly use stable patterns the scrubber covers).

---

## v2164 — 2026-04-14

### Added — "Spotlight/searchlight" item in Cockpit gauges category

Inserted into `insurance_survey_template.json` under "Cockpit gauges,
instrumentation and entertainment" between "Flood lights/deck lights"
and "Cockpit - other gauges and instrumentation". Options match the
existing Flybridge/Pilot house Searchlight items
(A–C, Powered up only, Not applicable, Not tested/not verified).

Reason: SafetyCulture import for Ahoy Vey had a "Spotlight/searchlight"
item with 2 photos and a C rating. The existing template only had
flybridge- and pilot-house-specific versions, which don't apply to a
cockpit-layout outdrive boat. Added the generic item so the orphaned
data can migrate cleanly onto a real template key.

### Fixed — HEIC attach failures now log actual error

`attachPhotosToItem` caught heic2any errors but `console.error('heicToJpegDataUrl
failed:', err)` emitted `[Object]` in DevTools, making diagnosis hard.
No code change needed for this thread — the `sips` conversion bypass
on Mac proved reliable. Noting here so future-me remembers the pattern.

---

## v2163 — 2026-04-14

### Fixed — HEIC photos now convert to JPEG on import (MacBook / iPhone)

Surveyor imported 6 photos from MacBook Finder into the "Evident damage
or repairs to hull and rudder below the waterline" item and all 6
rendered as broken-image placeholders in the media sheet. Root cause:
HEIC is Apple's default format for iPhone / Mac Photos, and Chrome
cannot decode HEIC in a standard `<img>` tag. The old import pipeline
ran `img.src = dataUrl`, `img.onerror` fired, and the canvas path
returned the original HEIC dataUrl unchanged — which then got saved to
IndexedDB and could never be rendered.

Fix:
1. `attachPhotosToItem` now detects HEIC by MIME type
   (`image/heic`, `image/heif`) or filename (`.heic`, `.heif`).
2. On detection, `heic2any` is dynamically loaded from CDN
   (cdnjs, cached after first use) and the file is converted to a
   JPEG blob before entering the date-stamp / canvas pipeline.
3. A final guard rejects anything that is not a renderable image MIME
   (`jpeg`, `png`, `webp`, `gif`) so we can never save a non-renderable
   format to IndexedDB again, even if future formats slip through.
4. Drag-drop and file picker also accept files with a `.heic`/`.heif`
   extension when the browser reports an empty MIME type (Finder DnD
   case).
5. Toast messaging: "Converting N HEIC photos…" on start,
   per-file failure count reported on completion.

Any photo already saved in HEIC format from v2162 will still show as a
broken placeholder — those need to be re-imported after pulling v2163.

---

## v2162 — 2026-04-14

### Changed — Snippet cards now APPEND on tap (multi-sentence composition)
- Tapping a second snippet card in the Notes sheet now **appends** the
  new snippet to the existing textarea text with a space separator,
  instead of replacing. This lets you tap 2–3 snippet cards to compose
  a multi-sentence observation per item. Empty textarea → normal insert;
  non-empty textarea → append. Shipped tonight for the Ahoy Vey
  lawyer-review deadline where each item benefits from richer prose
  than a single-snippet pick.

### Added — Import photos from library / files (MacBook + iPhone)

Shipped urgently to support the Ahoy Vey report deadline. Surveyor can
now attach existing photos (Camera Roll on iPhone, Files / iCloud Drive
anywhere, Finder on MacBook) to any checklist item. Multi-select
enabled so a batch of 10-20 photos can be attached in one picker
session.

- **Media sheet redesign:** the single "📷 Capture Photos" button is
  replaced by two clearly-labeled buttons:
  - **📷 Take photos** — camera (existing live-capture flow).
  - **🖼️ Import photos from library / files** — opens the OS file
    picker with `accept="image/*" multiple`. No `capture` attribute,
    so iOS shows the library/files chooser and macOS shows Finder.
- **Sortable thumbnails:** existing photos in the media sheet grid
  can be reordered by dragging one onto another. Order persists to
  IndexedDB.
- **Shared import helper** (`attachPhotosToItem`): FileReader → date
  stamp → savePhoto → survey.items[label].photos.push → saveSurvey →
  refresh compact card. One code path for all import sources.

### Present but not yet wired (defer to v2163)

The v2162 work originally included drag-and-drop onto checklist items.
The helper functions (`setupChecklistDragDrop`) are in app.js but NOT
yet invoked from `renderInspection`. Shipping without wiring them is
intentional — lower risk the night of a hard deadline. Will wire in
v2163 tomorrow with proper testing.

### Process
- Triple-checked: 106 tests pass, app.js syntax valid, versions
  consistent, pre-commit hook green in no-node simulated environment.
- Backlog item B-10 (category-level area photos, e.g. "Deck and
  coachroof area photos") logged for a future release.

---

## v2161 — 2026-04-14

### Changed — B-03 Firebase download (attempt 4)

v2160 diagnostic confirmed the SW's internal `fetch(event.request)`
throws the same `TypeError: Load failed` as page-context fetch. That
proves the SW is not causing nor can it fix the problem. v2161:

- **Reverted the SW Firebase-cloud proxy** — passive return again.
  Keeping the proxy was only wrapping the failure in a 599 without
  helping. Weather and Nominatim fetches already work via passive
  return, so Firebase should have the same opportunity.
- **Explicit fetch options** on the app-side Firebase Storage
  download: `mode:'cors'`, `credentials:'omit'`, `cache:'no-store'`,
  `redirect:'follow'`. Strips default cookies/credentials that iOS
  WKWebView standalone (PWA) mode may reject cross-origin. This is
  the last code-level attempt; if it still fails the remaining path
  is Firebase Storage bucket CORS configuration (admin task, not app
  code).

### If this still fails — the likely remaining cause
Firebase Storage bucket needs explicit CORS config allowing the
GitHub Pages PWA origin. To check and fix (requires Google Cloud
shell or `gsutil` locally):

```
gsutil cors get gs://<your-bucket>
# If empty or restrictive, set:
echo '[{"origin":["https://daveseagrim.github.io"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://<your-bucket>
```

The bucket name is visible in Firebase Console → Storage → "gs://..."
header.

### Process
- Triple-checked: 106 tests pass, versions consistent, pre-commit hook
  green in no-node simulated environment.

---

## v2160 — 2026-04-14

### Fixed — B-03 Firebase download (attempt 3)

Dave's v2159 diagnostic showed my SW proxy also failed (returned the
custom HTTP 599 I used to signal SW fetch failure). This proves the
transport problem is deeper than which context originates the fetch —
both page fetch and SW-context fetch hit the same iOS PWA / WKWebView
cross-origin restriction. v2160 adds two more attack vectors:

1. **Firebase SDK's native `ref.getBlob()` / `ref.getBytes()`** as the
   primary download transport. Firebase's own SDK uses internal
   plumbing that may bypass the iOS WKWebView fetch restriction.
   Falls back to fetch/XHR if the method isn't available.
2. **SW proxy passes the real error message** through to the response
   body, and the app reads that body on non-OK status. So "HTTP 599"
   will no longer be opaque — the log will show something like
   `[xhr] ... HTTP 599: SW proxy (TypeError): Load failed` which
   pinpoints whether the SW's internal fetch failed with the same
   TypeError or something else.

### Other
- v2159's SW Firebase-cloud proxy retained (it doesn't hurt; if
  getBlob works via SDK internals the SW proxy never fires for that
  request path).

### Process
- Triple-checked: 106 tests pass, versions consistent, pre-commit
  hook green in no-node simulated environment.

### If v2160 still fails
- Next step is bucket-level Firebase Storage CORS config check.
  That's an admin task on the Firebase console, not a code fix.
- Workaround remains: Chrome on iPhone (regular tab) downloads the
  same photos successfully.

---

## v2159 — 2026-04-14

### Fixed — B-03 Firebase download (attempt 2) + token leak belt-and-suspenders
- **B-03 (Firebase download on iOS Safari PWA).** Dave's diagnostic
  screenshot showed both fetch and XHR failing with transport-level
  errors (`TypeError "Load failed"` + `XHR network error`) on the same
  URL. That rules out CORS, auth, timeout, and HTTP-status causes;
  the symptoms match a known iOS Safari PWA issue where the service
  worker's passive "return" from a cross-origin fetch event is not
  reliably honored. v2159's fix: `sw.js` now **explicitly proxies**
  requests to `firebasestorage.googleapis.com`, `firestore.googleapis.com`,
  and `*.firebaseapp.com` / `*.firebaseio.com` via
  `event.respondWith(fetch(event.request))`. The SW acts as a proxy
  layer that iOS PWA treats as a same-origin request, bypassing the
  cross-origin transport restriction.
- **Token leak belt-and-suspenders.** v2158's token-expansion fix for
  the Notes sheet textarea should have resolved the raw `{if-rudder:}`
  display bug, but Dave's screenshot on v2158 showed the tokens still
  visible. Cause unclear (possibly stale SW-cached code). v2159 adds a
  second cleanup pass **after the overlay is mounted** in the DOM —
  scans the textarea value for any residual `{if-rudder:...}` /
  `{if-no-rudder:...}` tokens and replaces them with the expanded form,
  then re-saves the cleaned value so the item's saved state is also
  migrated.

### Process
- Triple-checked: 106 tests pass, versions consistent, pre-commit hook
  green in no-node simulated environment.
- Belt-and-suspenders pattern noted: when a display fix isn't reliable
  (maybe due to stale caching), add a DOM-level cleanup that runs after
  mount to catch whatever slipped through.

---

## v2158 — 2026-04-14

### Fixed — raw `{if-rudder:...}` tokens leaking into the UI
- **Bug reported by Dave** on v2154 surveying Ahoy Vey: the Notes sheet
  for the Hull and rudder percussion testing item showed raw
  `{if-rudder: and rudder}` tokens in three places:
  1. **The snippet template cards** rendered the unexpanded template.
  2. **The textarea** showed saved text that still contained tokens.
  3. **The sheet title** showed the raw "(if applicable)" label.
- **Root cause:** v2153's token expansion only ran at snippet-insert
  time. Card rendering, textarea initial content, and the sheet title
  never passed through the expander, so raw tokens leaked into display.
- **Fix:** Expand rudder-gating tokens at every display point:
  - Template cards in the Notes sheet now expand
    `{if-rudder:...}` / `{count:rudder|rudders}` based on survey.hasRudder
    before rendering. No more raw braces in cards.
  - Textarea initial content (loaded from `survey.items[label].text`)
    expands tokens on sheet open, so previously-saved text with tokens
    is cleaned up on display.
  - The Notes sheet title uses `displayItemLabel()` so
    "Hull and rudder(s) (if applicable) percussion testing" becomes
    "Hull percussion testing" / "Hull and rudder percussion testing" /
    "Hull and rudders percussion testing" based on vessel rudder state.
- Consequence: the chip-strip builder no longer sees `{if-rudder:}`
  as a placeholder, so the empty "Choose one" panel that confused
  Dave earlier should be populated correctly based on actual
  placeholders in the expanded snippet (or hidden if none remain).

### About version packing
This push combines v2155 through v2158 since Dave was surveying between
my releases. CHANGELOG preserves per-version detail; git commit message
notes the version range.

### Process
- Triple-checked: 106 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2157 — 2026-04-14

### Changed — SAMS vocabulary + simplified method
- **Method simplified to Phenolic hammer only.** Dave confirmed this is
  the only tool used for percussion testing on deck/coachroof. The other
  options (sounding hammer, rubber mallet, brass hammer, plastic mallet)
  are removed from the Method checkbox group.
- **SAMS-compliant finding vocabulary** applied across all rating tiers:
  - "Soft area" / "soft spot" language removed — not SAMS vocabulary.
  - **B-rated findings rewritten** using the correct SAMS pattern:
    - "An area at {location} sounded as a **dull thud**, indicating
      possible moisture in the core."
    - "An area at {location} sounded **ringing**, which may indicate
      delamination, core separation, lack of resin, or a void beneath
      the skin."
  - **A-rated findings** escalate the same language: "extensive dull
    thuds" (widespread moisture), "widespread ringing" (widespread
    delamination / voids), combined pattern, structural separation at
    high-load fitting.
  - **C-rated findings** use "no dull thuds or ringing tones were
    detected" as the SAMS-appropriate positive finding.

### Scope
- This release updates the "Bowsprit, deck and coachroof/pilothouse
  impact and resonance testing" builder only. Same pattern will be
  applied to hull percussion and conductivity testing once this is
  validated on Ahoy Vey.

### Process
- Triple-checked: 106 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2156 — 2026-04-14

### Added — per-option location + Phenolic hammer (B-07 pt 2 progress)
- **Each ticked finding checkbox now reveals a free-text Location input.**
  Type where the issue was observed ("forward starboard stanchion base",
  "port coachroof corner", "amidships side deck, 18 inches aft of the
  rubrail") and the location flows into the composed finding.
- **Fragments with `{location}` placeholder** substitute the text inline
  so the sentence reads naturally: "A possible soft area was detected
  at the forward starboard stanchion base."
- **Fragments without `{location}`** (e.g. general observations) get the
  location appended in parentheses, nothing is lost.
- **B-rated findings rewritten** to use `{location}` placeholders where
  granular location matters. Added paired **Possible / Confirmed soft
  area** options so surveyor can express certainty level.
- **Phenolic hammer** added to the Method multi-select (alongside
  sounding hammer, rubber mallet, brass hammer, plastic mallet).

### Changed — internal refactor
- `app.js` `buildComponentFindings` now **delegates to the pure
  `src/core/component_builder.js` module** instead of duplicating the
  logic. Single source of truth; easier to extend; covered by the 25
  composition tests (including 5 new ones for per-option location).
  Total tests: 106.

### Scope note — testing before full rollout
- This release targets **only** the "Bowsprit, deck and coachroof/pilothouse
  impact and resonance testing" item. Try it on Ahoy Vey and report back
  before the same pattern is applied to hull percussion, conductivity
  testing, and other categories.

### Coming next (deferred to v2157+)
- Slot-based sentence templates (Certainty dropdown × Finding-type
  dropdown × Location text × Cause dropdown) for even more flexible
  sentence composition from a compact palette.
- Hull percussion / conductivity builders with rudder gating.

### Process
- Triple-checked: 106 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2155 — 2026-04-14

### Added — B-07 part 2: checkbox component builder for deck/coachroof percussion testing
- **First fully checkbox-driven component builder** ships against the
  "Bowsprit, deck and coachroof/pilothouse impact and resonance testing"
  checklist item.
- Three components: **Areas tested** (multi-select, joined as Oxford-comma
  list), **Method** (multi-select, joined as list), and **Findings**
  (multi-select, filtered by the item's current rating).
- **Granular options per rating tier** — 5 A-rated scenarios, 8 B-rated,
  4 C-rated, 3 Not-Tested limitations, and 3 always-available context
  add-ons (limited by coatings, areas not accessible, further
  investigation recommended). Surveyor ticks every observation that
  applies; the builder composes a multi-sentence finding.
- **Rating-aware option filtering** — when the item is rated B, only
  B-tier findings appear in the Findings checklist (plus the always-
  include context add-ons). Same for A, C, NT.
- **Pure composition logic** extracted to `src/core/component_builder.js`
  with 20 new tests in `tests/component_builder.test.js` covering
  single-select, multi-select, join=list with prefix/suffix,
  alwaysInclude options, multi-component composition, and ABYC citation
  dedup. Total tests now: 101.
- The existing dropdown-based component builders (outdrives, winches,
  generators, etc.) are unchanged — multi-select is opt-in per
  component via `multiSelect: true`.

### How the new builder works (workflow)
1. On the deck/coachroof percussion item, tap the rating badge (A / B /
   C / NT). The rating defines which Findings checkboxes appear.
2. Tap the 📝 (notes) icon. The bottom sheet opens with the builder
   panel instead of snippet cards.
3. Tick the areas tested (deck, coachroof, side decks, etc.).
4. Tick the methods used (sounding hammer, mallet, etc.).
5. Tick the granular findings that apply for your chosen rating.
6. Optionally tick context add-ons (limited by coatings, etc.).
7. Tap "Generate Finding Text" — the composed multi-sentence finding
   lands in the textarea with the correct rating set automatically.

### Coming next (deferred)
- Same builder pattern applied to: Bowsprit/deck/coachroof
  conductivity testing, Hull and rudder impact and resonance testing
  (with hasRudder gating via rudderOnly options), Hull and rudder
  conductivity testing.
- Hull/rudder/antifouling snippet split (B-06).
- B-04 (OCR HIN), B-02 (delete sync), SAMS 3.9 + 6.3, B-08.

### Process
- Triple-checked: 101 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2154 — 2026-04-14

### Added — Persistent Save Status indicator
- New **SaveStatus** pill in the top-right corner of every survey page
  (inspection + Edit Intro). Always visible, always current.
- Shows: green dot + "✓ Saved Xs ago · NN 📷" — the seconds-ago counter
  refreshes every 2 seconds, and the photo counter recounts after every
  photo capture.
- Goes amber + "Saving…" while a write is in progress, red + "Save error"
  if the IndexedDB write fails (with the error message in the tooltip).
- **Tap reveals a detail panel** with full sync status: photos in
  IndexedDB on this device, last data save time, Firebase backup state
  (connected? backed up? queued?), Drive backup state.
- Hooked into every save site: `savePhoto`, `autoSaveItemText`,
  `selectRating`, and the Edit Intro debounced auto-save. So whether
  you rate an item, type a note, take a photo, or change a form field,
  the pill blinks amber → green within a second to confirm the write.
- Pill auto-hides on the home page (it's per-survey).

### Other (deferred from B-07 part 2 → ships in a later release)
- Internal: `buildComponentFindings`, `renderComponentBuilder`, and
  `onComponentBuilderChange` extended with **multi-select checkbox
  support** for component builders. The plumbing is in place but no
  schema yet uses `multiSelect: true`, so no behaviour change for
  Dave. The percussion-testing and deck/coachroof checkbox builder
  schemas will land in v2155 with their own tests.

### Backlog additions
- **B-08** logged: cannot un-skip an item back to a rated state. Low
  priority per Dave's request.

### Process
- Triple-checked: 81 tests pass, version consistency confirmed,
  pre-commit hook green in no-node simulated environment.

---

## v2153 — 2026-04-14

### Added (B-07 part 1 — rudder gating)
- **New pure module** `src/core/snippet_tokens.js` with token-expansion and
  label-transformation functions, plus 26 tests (`snippet_tokens.test.js`).
  Now at 81 tests total.
- **`{if-rudder:...}` / `{if-no-rudder:...}` / `{count:rudder|rudders}`
  tokens** supported in snippet text. Expanded automatically at snippet
  insert time based on `survey.hasRudder` and `survey.driveLineCount`.
- **`transformLabelForDisplay()` helper** detects the legacy
  "and rudder(s) (if applicable)" phrase in checklist item labels and
  rewrites it based on the current survey:
  - hasRudder = false: drops the clause entirely. "Hull and rudder(s)
    (if applicable) impact and resonance testing" → "Hull impact and
    resonance testing"
  - hasRudder = true, rudderCount = 1: "Hull and rudder impact..."
  - hasRudder = true, rudderCount >= 2: "Hull and rudders impact..."
  Applied at three display sites: the compact checklist card, the
  single-item expanded view, and the report (both the checklist summary
  table and the Findings & Recommendations section).
- **Tokenised 12 hull-and-rudder snippets** in `text_library.json`
  (impact/resonance + conductivity testing). On no-rudder vessels the
  snippets now render as hull-only text, no awkward rudder mentions.

### Fixed
- **Percussion/conductivity testing items no longer hidden on
  non-rudder vessels.** Previous behaviour: `rudderItem: true` in
  the template caused these items to disappear on outdrive/IPS vessels,
  which meant they couldn't be rated at all. Now the items show for
  every vessel, and rudder-related wording is suppressed on no-rudder
  cases via the token system.

### Deferred (B-07 part 2 → v2154)
- Checkbox-driven percussion testing builder. The existing component
  builder pattern is dropdown-based; extending it to checkboxes for
  method/areas/findings is a UX design problem best tackled in its own
  focused release. Tracked in the backlog.

### Process
- Triple-checked: 81 tests, hook green in both node-present and no-node
  environments, version files consistent.

---

## v2152 — 2026-04-14

### Fixed
- **B-05** — Removed unused "Hull exterior photos" and "Rudder photo(s)"
  media items from `survey_template.json`. Dave doesn't use them; they
  were taking up space at the top of the Hull category. Changes apply
  to in-progress surveys (including Ahoy Vey) on next page load because
  the template is re-read each session.
  - JSON validated.
  - No orphaned references in app.js (the `rudderItem` flag is still
    used on the two percussion/conductivity testing items, which is
    the scope of B-07).
  - If any old survey captured photos under these now-removed items,
    the photo data remains in IndexedDB (nothing deleted) but won't
    display in the UI.

### Note on in-progress survey compatibility
- All Edit Intro field additions from v2151 (TC Licence expiry,
  Independent Surveys, new dropdown options) and Check-function
  changes apply to existing surveys automatically. Template changes
  like this one (removed items) also apply on next open. The only
  data preserved across template changes is item-level ratings,
  notes, and photos.

---

## v2151 — 2026-04-14

### Added
- **B-01 complete** — Drive backup now resumes where it left off instead
  of re-uploading every photo from scratch.
  - New `listExistingFilenamesInFolder(folderId)` queries Drive once per
    backup (with pagination for folders over 1000 files) and builds a
    Set of filenames already present.
  - `backupSurvey` now skips any photo whose deterministic filename
    already exists on Drive. Same-day JSON snapshot also skipped on
    repeat runs.
  - `src/core/drive_backup.js` is wired into `index.html` and the service
    worker; tests/drive_backup.test.js (14 tests) now run against the
    live module.
  - Progress dialog now distinguishes skipped vs uploaded photos in both
    step label (`Skipping 17 of 202 (already on Drive)`) and detail log
    (`⏭ hull_portside_01.jpg`).
  - Summary subtitle reads `N new + M already on Drive = T total` when
    any photos were skipped.
- **SAMS 2.4** — TC Licence expiry date field added to Edit Intro.
  Report now shows "(expires YYYY-MM-DD)" next to the licence number
  when populated.
- **SAMS 3.7** — Two new "laid up for winter storage" options in the
  on-land/in-water dropdown, matching SAMS's preferred phrasing.
- **SAMS 4.3** — Check function now warns when valuation uses fewer
  than 2 sources. The MY Bad review flagged BUC-only as insufficient;
  this makes the omission visible before you generate the report.

### Confirmed already-done (rubric updated)
- **SAMS 1.4** — TP 1332 is already referenced in Conduct of Survey
  and the Definitions table. Rubric status flipped to ✅.

### Backlog additions (not yet fixed, logged for future work)
- **B-04** — OCR the HIN photo to auto-populate the HIN number field.
  Implementation sketch includes using the existing Gemini integration.
- **B-05** — Remove unused "Hull exterior photos" and "Rudder photos"
  options above Vessel Type (cleanup).

### Process
- Triple-checked (intent, regression, Dave's environment). All 55 tests
  pass; pre-commit hook green in both node-available and no-node
  environments.

---

## v2150 — 2026-04-14

### Fixed
- **B-03** — Firebase photo download failing with "Load failed" on iOS
  Safari PWA. Rewrote `_downloadOneFirebasePhoto` with staged error
  reporting and an XMLHttpRequest fallback path:
  - Stage 1 (`getDownloadURL`) — errors now tagged `[url]`
  - Stage 2 (byte download) — tries `fetch()` first; on failure, falls
    back to `XMLHttpRequest`. XHR has historically succeeded in iOS
    Safari PWA contexts where `fetch()` throws `TypeError: Load failed`.
    Errors from this combined path are tagged `[fetch]` or `[xhr]`.
  - Stage 3 (read blob as data URL) — errors tagged `[blob-read]`.
  - Each per-photo failure shown in the progress dialog now includes
    the stage tag so we can see exactly which step broke. Example:
    `✗ Riverdance — 1775831...: [fetch] fetch: TypeError "Load failed"
    · xhr: XHR HTTP 403`.

### Added (parked)
- `src/core/drive_backup.js` + `tests/drive_backup.test.js` — pure
  helpers and 14 tests for the B-01 Drive-backup resume fix. Module
  is on disk and its tests pass, but it is **not yet wired** into
  `index.html` or `app.js` — we paused B-01 mid-way to address B-03
  first. Wire-up and the resume logic itself will ship in a later
  release. This file is safe to carry in-tree because no script tag
  loads it, so it has no runtime effect yet.

### Process
- Triple-checked by simulating the production environment before
  handing the commit command.

---

## v2149 — 2026-04-14

### Fixed
- **Pre-commit hook** now works on machines that don't have Node.js
  installed. Tests are skipped with a clear warning when `node` is
  missing; the version-consistency check and CHANGELOG check still
  run (both are bash-only and required). This unblocks commits from
  MacBook machines without Node, while preserving the critical gates.
- `scripts/release.sh` also handles missing Node gracefully — prints
  a skip message instead of failing.
- Expanded PATH search in both scripts to include MacPorts
  (`/opt/local/bin`), asdf shims (`~/.asdf/shims`), and `~/.local/bin`.

### Process
- Established "triple-check" methodology: before handing any push
  command to the user, verify (1) the code does what we intend,
  (2) it doesn't break anything that worked before, and (3) it works
  in the user's actual environment — not just the Claude sandbox.
  This standard caught the Node-missing issue that v2148's hook
  had in production.

---

## v2148 — 2026-04-14

### Added
- **Independent Surveys** field in Edit Intro — free-text list of any
  engine / electrical / ultrasonic surveys conducted alongside the
  inspection. Report shows a default "No independent surveys…" statement
  if blank. Addresses **SAMS 3.11**.
- `scripts/release.sh` — atomic version bumper. Updates `APP_VERSION`
  in app.js, `CACHE_NAME` in sw.js, and every `?v=` cache-buster in
  index.html in a single step. Runs tests and version check afterward.
- `scripts/check_versions.sh` — verifies all three versions agree and
  that CHANGELOG has an entry for the current version.
- `.githooks/pre-commit` — blocks commits when tests fail, versions are
  mis-aligned, or CHANGELOG is missing an entry. Enable with
  `git config core.hooksPath .githooks`.
- `DEVELOPMENT_PROCESS.md` — the north star document. Rules, workflow,
  quick-reference card for every change going forward.

### Changed
- All 15 snippet-library occurrences of "sea trial" replaced with
  "limited trial run" for SAMS / legal protection. Check-function label
  updated. Addresses **SAMS 8.2**. Report glossary retains the term
  "sea trial" in the definition of "Limited Trial Run" where it is
  deliberately distinguishing.

### Process
- Git hooks now enforce the process. Version-skew blank-page bugs
  (like v2147) can no longer happen — the hook checks version
  consistency before accepting the commit.
- Pre-commit hook and `release.sh` prepend common Node install paths
  (`/opt/homebrew/bin`, `/usr/local/bin`, `$HOME/.nvm/...`) so `node`
  is findable even when git runs hooks with a stripped-down PATH.
  Fallback error message gives install instructions instead of a
  cryptic "node: command not found".

---

## v2147 — 2026-04-14

### Fixed
- **Blank page on refresh** caused by `const` name collision between the
  new `src/core/*.js` modules and `app.js`. Both files declared
  `RATING_COLORS`, `getRatingShortLabel`, etc. with `const` at the top
  level, which classic-script semantics treat as a SyntaxError, blocking
  `app.js` from parsing. Wrapped each core module in an IIFE and exposed
  its API under a namespace (`window.KikiRatings`, `window.KikiPlaceholders`,
  `window.KikiSkipLogic`) so there's no conflict. `app.js` continues to
  work unchanged.

---

## v2146 — 2026-04-14

### Added
- `src/core/` folder with extracted pure functions for ratings, placeholder
  detection, and skip logic. These modules load in both the browser
  (via `<script>` tag) and Node.js (for testing).
- `tests/` folder with a minimal test runner and 41 unit tests covering
  the extracted core functions. Run with `node tests/run_tests.js`.
- `tests/README.md` explaining how to run and add tests.
- `CHANGELOG.md` (this file).
- `docs/sams_rubric.md` — formal SAMS compliance checklist derived from
  the SAMS review of the "MY Bad" survey.
- `docs/manual_regression.md` — 30-step pre-release checklist of user
  flows to verify before shipping each version.

### Changed
- Service worker now caches the new core JS files so they work offline.

---

## v2145 — 2026-04-14

### Fixed
- Firebase photo downloads no longer crash Safari on iOS with large
  photo counts. Rewrote `pullPhotosFromFirebase` to:
  - Download one photo at a time with explicit memory release between each
  - Retry each photo once on transient network failures (2-second gap)
  - Pause 300 ms between photos so iOS can reclaim memory
  - Show per-photo success/failure in the progress dialog
  - Surface a persistent progress bar instead of a vanishing toast
- Per-survey "Recover Photos" button now uses the same robust pattern.

---

## v2144 — 2026-04-14

### Added
- Persistent progress dialog for Drive backup — stays on screen through
  the whole upload with live progress bar, elapsed timer, per-photo detail
  log, and a Cancel button.

### Changed
- `backupSurvey()` and `backupAll()` now accept an `onProgress` callback
  and a `checkCancelled` function, allowing UI layers to drive the dialog.

---

## v2143 — 2026-04-14

### Added
- Friendly dialog when the Google Drive API hasn't been enabled on the
  Google Cloud project. Includes direct link to the Cloud Console, a
  copy-link button, and numbered steps for the one-time setup.

### Changed
- `backupAll()` stops at the first SERVICE_DISABLED 403 instead of
  retrying every survey against the same broken endpoint.

---

## v2142 — 2026-04-14

### Changed
- Skipped sections are now treated as dealt-with in the Check function:
  - Entire-category skip → single info acknowledgement, not per-item warnings
  - Many-item skip (>3) → summarized with preview and count
  - Few-item skip (≤3) → listed individually
- Skipped items auto-resolve in the Check list (no more "Force OK" needed).

---

## v2141 — 2026-04-14

### Added
- `✅ Check` button on the inspection bottom bar (replaces former `📝 Desc`).
- `✅ Check` button in the home page survey dropdown.
- Auto-description generation on Back to Inspection — if the description
  is empty or was auto-generated, it regenerates from current form data.
  Manual edits disable auto-regeneration.
- `[PLACEHOLDER]` text now highlighted with yellow background in the report.
- Placeholder count shown below the description textarea.

### Changed
- Rating buttons show short labels (A / B / C / NA / Not Tested / PO)
  instead of full strings.
- Compact action row on checklist items now shows icons only with larger
  44×44 touch targets. Labels removed; counts still visible as badges.

---

## v2140 — 2026-04-13

### Changed (Six Sigma button cleanup)
- Removed "Open" button from home survey dropdown (tap card to open).
- Replaced "Export" and "Import" home buttons with overflow (⋯) menu.
- Removed `↻ Update` dev button from inspection and Edit Intro bars.
- Removed "Cancel" button from Edit Intro form actions (auto-save is on).
- Simplified `backToHome()` to instant save + navigate (no double-confirm).
- Gemini API Key button only shows when no key is set.

### Removed
- Redundant buttons across home, inspection, and Edit Intro screens.

---

## Earlier versions

Earlier versions (pre-v2140) are recorded in git log only. Key milestones:

- **v2120** — Bulletproof auto-backup: Firebase on every photo, Drive every 5.
- **v2119** — Photo recovery — Firebase Storage pull to IndexedDB.
- **v2118** — Depersonalise filter, specs auto-save on Edit Intro.
- **v2111** — Desc button fix, home button brand consistency.
- **v2105** — Transmission photo sync, reliable service worker updates.

Run `git log --oneline` in the repo for the full history.

---

## How to add a new entry

1. Bump `APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.
2. Add a new section at the top of this file using today's date.
3. Group changes under **Added / Changed / Fixed / Removed**.
4. Reference specific SAMS rubric items by number when the change
   addresses one (e.g. "Fixes SAMS rubric item 3.4 — survey report date").
5. Commit and push.
