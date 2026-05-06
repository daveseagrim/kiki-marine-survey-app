## v2536
- Kept overall vessel condition strictly surveyor-entered; valuation methodology text no longer mentions a BUC condition adjustment until an overall condition rating has been selected.
- Updated the app version metadata and service-worker cache to keep the GitHub-hosted app on the same version.

## v2535
- Made engine and gearbox nameplate photos auto-fill blank detail fields whenever a survey is opened or nameplate photos are added.
- Kept the manual read buttons as fallback/retry controls, but made the normal workflow automatic for every survey with readable plate photos.
- Hardened the nameplate reader so decorative engine decals and non-data labels are ignored instead of being treated as serial plates.

## v2534
- Removed the manual second-engine add/remove workflow from Version 1; the Engine & Gearbox Details panel now follows the survey's drive-line/engine count automatically.
- Synced the second engine slot whenever drive-line count or matched boat specs indicate twin engines, while preserving existing entered data.
- Added engine and gearbox nameplate readers that can populate make, model, serial, HP, and fuel type from saved plate photos for surveyor review.

## v2533
- Marked the 2001 Silverton 350 boat-spec entry as a twin shaft-drive vessel so Version 1 opens the second engine slot automatically.
- Applied twin-engine defaults when matched boat specs are selected or when an existing matched survey is opened, without overwriting entered engine details.
- Copied shared make/model/HP/fuel defaults into Engine 2 only when those fields are still blank.

## v2532
- Removed duplicate engine and gearbox entry controls from Edit Vessel Information so Version 1 has one engine-entry workflow in the survey body.
- Added Engine & Gearbox Details to the Engine(s) and drive(s) survey section, including twin-engine fields, make/model datalists, and report save support.
- Migrated legacy intro engine photos into the matching survey-section photo items and updated the checker/report to use those survey-section photos.

## v2531
- Restored saved Persons in Attendance entries into the visible Edit Vessel Information attendee controls instead of leaving only the default surveyor row.
- Added guards so blank auto-fill saves cannot wipe saved hull/deck colours, attendee text, or intro/documentation photo fields.
- Changed engine and gearbox photo syncing so checklist body photos are copied into the intro photo galleries without clearing existing intro photos.

## v2530
- Added `2001 Silverton 350` to `boat_specs_db.json` so the Year / Make / Model field can auto-fill the current Tethys V specs.
- Added survey-condition choices for vessels inspected in slings, on a cradle, or on blocks before launch.
- Added a water-at-survey choice for freshwater tanks plus shore-water hookup.
- Updated the Overall Description of Vessel generator to keep survey variables populated without bracket placeholders and to use past-tense wording.

## v2529
- Fixed the home-screen Check workflow so survey quality results open over the selected survey, allowing Go buttons to jump to the correct checklist item instead of returning to the home screen.
- Expanded the Version 1 checker with professional narrative, model-survey reference, valuation, placeholder, spelling/style, and photo-support checks.

## v2528
- Moved `Companionway and washboards` into Cabin and conveniences for pre-purchase surveys.
- Moved insurance `Companionway` into Cabin and conveniences.
- Replaced the separate cockpit `Outdoor speakers` row with `Stereo and speakers` in gauges/instrumentation.
- Added migration protection so old `Outdoor speakers`, `Entertainment/stereo`, and flybridge speaker data merge into `Stereo and speakers`.

## v2527
- Added an `Aft deck fridge` checklist item to pre-purchase and insurance Aft deck sections.
- Added aft-deck fridge/cooler note snippets for serviceable, finding, powered-up-only, and not-tested paths.
- Bumped the offline cache so phones load the new checklist item.

## v2526
- Renamed the pre-purchase Aft deck item from `Lighting (cabin)` to `Aft deck lighting`.
- Added a migration so existing non-insurance surveys keep any saved aft-deck lighting rating, notes, standards, and photos.
- Kept the insurance-survey `Lighting (cabin)` item unchanged.

## v2525
- Fixed inspection-note saving so the phone notes sheet and the older inline notes field both flush into the local survey before Save, Home, report generation, or backup/export.
- Notes now create the item record when text is entered before a rating is selected, preventing Windlass-style text from disappearing.
- When both the inline row and the open phone notes sheet exist, the open notes sheet is treated as the live version.

## v2524
- Fixed HIN, licence, and NMMA documentation photos so they print uncropped instead of using the cropped finding-photo thumbnail style.
- Added safer wrapping for long HIN values in the cover details box.
- Kept ordinary finding photos unchanged.

## v2523
- Enlarged and rebalanced the report title page so it fills page 1 instead of clustering at the top.
- Kept the running Kiki Marine footer on page 1 and every page.
- Preserved the page 2 start at Vessel overview photographs.

## v2522
- Tightened the report cover again so the details table no longer spills the Surveyor row onto page 2.
- Kept the standard Kiki Marine running footer on page 1 and every page.
- Hid the duplicate in-body cover footer during printing and compacted the cover photo/details box for Chrome print-to-PDF.

## v2521
- Made the report cover print as a true first page: title, full vessel photo, details box, and Kiki Marine company footer stay together.
- Forced page 2 to begin with `Vessel overview photographs` at the top when overview photos are present.

## v2520
- Fixed conductivity-report wording at the source: one recorded value now prints as a representative reading instead of a false range like `215 to 215`.
- Updated the Dash desktop export copies so the current client-ready import file uses the same single-reading wording.

## v2519
- Cleaned identical conductivity ranges in reports, so values like `215 to 215` read as approximately/uniform readings.
- Corrected the Beneteau Oceanis 323 beam in generated vessel-description prose.
- Made B-finding action extraction more tolerant so recommendation sentences are pulled into a separate `Recommendation:` line.

## v2518
- Shortened the survey overflow menu and grouped cloud/recovery tools under Advanced so the menu fits on small screens.
- Tightened the cover-page photo height so title, vessel photo, and vessel summary table fit together.
- Removed misapplied ABYC H-22 / TP 1332 citations from bilge/stringer access and keel-bolt access findings.
- Made PFD/lifejacket safety wording explicit when not verified, added the NT action line, and clarified TC TP 511 length brackets as LOA-based.
- Corrected the Beneteau Oceanis 323 lookup specs and cleaned recurring Dash wording issues in generated reports.
- Added a condition caveat when Above Average is selected but Type A findings remain.

## v2517
- Added a photo-only repair tool inside the Photos sheet.
- "Repair missing photos from export" restores missing image data from a full JSON/photo export without replacing survey wording, ratings, findings, or report edits.
- Updated the linked-photo warning to point to the new repair workflow.

## v2516
- Made linked photo counts open the photo sheet directly.
- Collapsed item thumbnails now open the photo viewer/editor directly.
- Photo sheets now show a clear missing-image placeholder instead of silently hiding linked photos when the image data is not on the device.
- Added a plain warning when a linked photo cannot be opened because the image data is missing locally.

## v2515
- Google Drive backups now route to Dave's 2026 survey archive: `Boating / kiki marine / surveys 2026 / surveys / 2026 / in progress` or `completed`.
- Folder matching tolerates leading order numbers, so `01 completed` still matches `completed`.
- Mark Completed now uploads the survey JSON and photos to the completed Drive folder, with photos in a separate `photos` subfolder.
- PDF upload is still manual from the Report screen because the browser print dialog does not give the app a PDF file to upload.
- Verified: `node tests/run_tests.js` — 111 tests passed; `node --check app.js` — passed.

## v2514
- Added a **Transfer to laptop** workflow: exports the survey with photos, then locks the phone/device copy so it cannot overwrite laptop edits later.
- Added a **Mark completed** workflow: exports the final JSON/photo package, marks the survey completed, and locks it against later accidental edits.
- Imports now protect completed/transferred same-ID surveys by importing as a new copy instead of replacing the locked local record.
- The completed-survey Google Drive folder upload is intentionally not pointed at a folder yet while the Drive folder structure is being reorganized.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2513
- Made the red Drive backup warning banner shorter so it takes up much less screen space.
- Left the Google Drive folder destination unchanged while the Drive folders are being reorganized.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2512
- Report cover photos now preserve portrait orientation instead of being forced into a landscape crop.
- Vessel-description condition wording is rebuilt from the final BUC condition dropdown at report time, so stale manual text cannot keep saying "fair" after a different rating is assigned.
- Conductivity findings now show a recorded low-to-high range in the report whenever readings are present but the generated text omitted the range.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2511
- Add Port Whitby Marina as a built-in survey-location suggestion.
- Version bump forces browsers to fetch the updated location search code.

## v2510
- Add the 2005 Beneteau First 47.7 to the boat-specs database, including standard and deep/race draft options.
- Version bump forces browsers to fetch the updated boat database.

## v2509
- Restore the NMMA Yacht Certification Plate field and photo slot directly after the HIN number.
- Report documentation now prints the NMMA plate row immediately after HIN when text or a plate photo is present.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2508
- Add the 1989 Tollycraft 34 Sport Sedan to the boat-specs database, including "Tolleycraft" spelling aliases for lookup.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2507
- Move "Pilot house gauges and instrumentation" so it appears immediately after "Pilot house" in the insurance survey template.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2506
- Manual edits to the Vessel Description now immediately stop auto-regeneration during that same save.
- Manual edits to the Propulsion Narrative are saved from the inspection view and stop auto-regeneration until Regenerate is tapped.
- Engine location/access wording now normalizes "companion way" to "companionway" and strips trailing punctuation before building the propulsion sentence.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2505
- Disable the hard stale-save refusal path so legitimate report edits can save tonight.
- The app no longer blocks saves with "Save refused — stale data detected"; use export/backup after major edits.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2504
- Change the stale-save guard from blocking saves to recovering protected dropped survey content before saving.
- This keeps ratings, photos, chips, and substantial notes from being lost while avoiding the "Save refused — stale data detected" loop during normal edits.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2503
- Tighten the stale-save guard again to reduce false "Save refused — stale data detected" warnings during normal editing.
- The guard now focuses on dropped protected item content such as ratings, photos, selected chips, or substantial notes rather than treating ordinary shortened shared text as stale data.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2502
- Remove the remaining generic B-finding recommendation fallback: "Address this finding as described in the observation."
- B findings now print a Recommendation line only when a specific action sentence is available.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2501
- Clean up Persons in Attendance before saving and rendering the report.
- Fixes broken output such as `Ian Koster (Owner)Ian Koster` and avoids duplicate attendee names in the printed table.
- Verified: `node tests/run_tests.js` — 108 tests passed.

## v2500
- Ensure v1 report generation auto-populates the Overall Description of Vessel if the stored description is blank.
- This covers direct survey patches/imports that update valuation or metadata without passing through the normal save path.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2499
- Update the Abbott 36 specs entry with sourced 1985 Abbott 36 particulars.
- Add the original-equipment engine as Volvo Penta 2002, 18 HP diesel.
- Add Volvo Penta 2002 to the engine database so v1 can recognize/autofill the model.
- Verified: JSON parse clean; `node tests/run_tests.js` — 106 tests passed.

## v2498
- Tighten the stale-save protection so empty template/catalog rows do not trigger a false "Save refused — stale data detected" warning.
- The guard still blocks saves that would drop rated items, notes, recommendations, chips, or photos.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2497
- Add Abbott 36 to the boat specifications database for lookup/autofill.
- Covers model years 1979-1986, including 1985 Abbott 36.
- Verified: JSON parse clean; `node tests/run_tests.js` — 106 tests passed.

## v2496
- Turn off browser/iOS autocorrect on survey prose fields while keeping sentence capitalization and spellcheck. This prevents marine terms like "mast", "forepeak", "berth", and "aft berth" from being changed while typing.
- Add a local warning for the common iOS autocorrect trap where "mast" becomes "mask" in nearby rigging/sail context.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2495
- Rename the deck section wording from "Deck and coachroof/pilot house" to "Deck and coachroof" in the v1 templates and chip-library references.
- Existing saved surveys migrate their old deck/coachroof item keys to the new labels so ratings, notes, and photos are preserved.
- The separate Pilot house station section remains unchanged for boats with a pilothouse helm.
- Verified: template JSON parse clean; `node tests/run_tests.js` — 106 tests passed.

## v2494
- Stop the vessel description from automatically guessing an overall condition such as "fair" from the finding counts.
- The condition sentence now comes only from the Overall Vessel Condition Rating dropdown: Excellent (Bristol), Above Average, Average, Fair, Poor, or Restorable.
- If no final condition is selected, the vessel description leaves that condition sentence out instead of inserting placeholder or guessed wording.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2493
- Fix the Transport Canada safety-equipment length class. The app now parses common LOA formats such as `35'4"` and `35 ft 4 in` instead of falling back to "Not over 6 m".
- If the saved LOA field is blank, the safety checklist can use the matched boat-spec database LOA from the vessel model.
- Opening or generating a report now auto-corrects stale safety checklists to the proper length bracket while preserving matching safety-item notes, checked status, and photos.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2492
- Fix sailboat mast wording in the vessel description. The generated report now uses past tense ("was ... rigged") and no longer prints `[deck-stepped/keel-stepped] [aluminium/carbon fibre]`.
- Mast material now defaults to aluminium. Carbon fibre is no longer offered in the automatic vessel-description wording.
- Mast stepping is pulled from the saved Main mast item first, then from the boat-spec database if that source includes it. If neither source knows the stepping, the description omits the stepping term rather than guessing.
- Existing saved descriptions with the old mast placeholder are cleaned during report generation, so current reports such as Big Surprise can render cleanly after the app updates.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2491
- Confirm active survey templates and report wording use 120V, not 110V.
- Update the Riverdance photo-import helper so old "110v panel" photo filenames attach to the current "Distribution panel 120V" item label.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2490
- Hide the "Licence number on hull:" photo/caption block for Small Vessel Register (SVR) vessels, because SVR vessels use an Official Number rather than a visible hull licence number.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2489
- Make the Findings Overview wording consistent: Not Tested and Powered Up Only counts now say "finding/findings" instead of "item/items".
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2488
- Remove the generic boilerplate B-finding recommendation fallback that said "Schedule repairs in the near future to maintain compliance..." when no specific action could be extracted.
- B findings without a specific extracted action now use a neutral fallback: "Address this finding as described in the observation..." so the report does not invent vague standards/compliance language.
- Grace O'Malley keel wording can now be patched with the matching Desktop helper script so B-1 uses the specific keel repair recommendation instead of boilerplate.
- Verified: `node tests/run_tests.js` — 106 tests passed.

## v2487
- **Pull-blocked-if-local guard on `pullSurvey`.** Per Dave 2026-04-30 — the iPhone-field → laptop-edit workflow makes the cloud a one-shot handoff channel, not a synced replica. Once a survey is on the laptop the cloud copy is by definition ≤ local, so a pull would always overwrite laptop work with a stale copy. The guard now refuses the pull and shows a clear alert when a local copy of that surveyId exists. To genuinely replace local with cloud, delete the local copy first via Diagnostics, then run pull.
- **Type-to-confirm guard on `importSurvey`.** Imports while other surveys exist on the device now require Dave to type the imported vessel name exactly to confirm. Catches fat-finger imports and any future bug where a malformed export wraps a destructive payload. Cancellation does not modify state.
- Both guards are deliberate UX friction — added because the 2026-04-30 IDB wipe of 5 surveys remains unexplained at root cause and Dave's workflow analysis showed the destructive paths (pull, import) are the high-risk surface area. The non-destructive paths (single-survey Save, single-survey ☁️ Force push, 💾 Save All Surveys batch push) are unchanged and operate normally.
- Verified: `node --check app.js` clean.

## v2486
- Replace the Page 3 water-leak limitation with clearer professional wording: leaks are assessed visually only, and evidence of past/intermittent leaks may be cleaned, concealed, or absent.
- Shorten safety-equipment photo captions in the PDF generator. Fire extinguisher photos now caption as "Fire extinguisher — photo X of Y" instead of repeating the full TC requirement under every image.
- Verified: `node --check app.js`, `scripts/release.sh` test suite: 106 tests passed, version check clean after this entry.

## v2485
- Fix twin-engine horsepower wording so the generated vessel description and propulsion narrative no longer use Engine 1 horsepower as "each" when Engine 2 has a different recorded rating.
- Keep D12D-A MP report language aligned with the corrected 715 HP / 526 kW data and avoid silently masking port/starboard horsepower mismatches.
- Stop PDF generation from appending a second overall-condition sentence when the vessel description already states the condition.
- Tighten the auto-generated above-average condition sentence by hyphenating "above-average" and removing the overly broad "minor and typical" sentence.
- Verified: `node --check app.js`, `scripts/release.sh` test suite: 106 tests passed, version check clean after this entry.

## v2484
- **Colour fields now persist on auto-save** (per Dave 2026-04-29: "Items on the homepage are not saving. In particular, hull colour, boot stripe colour and deck colour.")
- `saveEditFormSilently()` — the silent path used for back-nav, on-blur, and on-app-background — was missing `hullColour`, `bootStripeColour`, and `deckColour`. The fields[] array loop didn't handle them because they're `<select>`s with an `__other__` sentinel value that needs custom-value resolution; only the explicit Save button (`saveSurveyDetails`) ran the resolver. Dave's colour edits silently failed unless he remembered to tap Save before navigating away.
- Fix: call `getColourValue('hullColour' / 'bootStripeColour' / 'deckColour')` in `saveEditFormSilently` with the same v2377 undefined-skip guard already used in `saveSurveyDetails` — write only when the colour `<select>` is in the DOM, leave the saved value alone otherwise. Same pattern as the existing valuation-sources / comparables guards in the surrounding code.
- **Volvo Penta D12D-A MP and D12D MH added to engine_db.json**, under the "Volvo Penta" make block between the existing D13 Inboard entry and the legacy gasoline inboards.
- D12D-A MP — Marine Pleasure rating in the 615-715 HP range @ 2300 rpm. Stored at the 715 HP top-of-range value (manufacturer part no. 869186 = 715 HP); description notes the range and instructs the surveyor to record "Not verified from data plate" when the visible plate doesn't confirm horsepower, since the same designation ships at 615 / 650 / 675 / 715 HP.
- D12D MH — Medium-Heavy duty rating @ 2200 rpm, 450 HP / 331 kW. Distinct designation from D12D-A MP; the 450 HP rating belongs here, not under the MP family.
- Both 12.13 L inline-6, direct-injected, turbocharged + aftercooled, 4-valve OHC, EMS 2 electronic control, freshwater-cooled, ~2002-2010 production.
- Engine picker on the home screen / new survey form will now offer the D12D-A MP and D12D MH designations alongside the existing D4 / D6 / D13 entries.
- Per Dave 2026-04-29: an earlier draft of this file conflated the D12D-A MP (615-715 HP) with the D12D MH (450 HP) — the corrected entries above match the manufacturer's designation logic.

## v2483
- Restore three Hull(s) condition (below the waterline) chips that v2472 dropped in error
- Source-truth review against the 4 PDF surveys + Cut and paste.xlsx confirmed these are chips Dave actually uses verbatim — they are not "meta filler" or "vague summary catch-alls" as v2472 wrongly classified them
- Restored to A/observed/sev1: "An inspection of the hull below the waterline was conducted." (lead-in, used as scene-setter)
- Restored to C/observed/sev1: "Below the waterline, no evident damage was observed on the hull." (used verbatim as the entire C-rating finding in Footloose surveys)
- Restored to C/observed/sev1: "The hull appeared in good overall condition with only cosmetic wear." (used verbatim as the entire C-rating finding in the powerboat survey)
- Section count: 25 → 28. Grid now A 5/1/1, B 3/1/2, C 12/1/2 — deliberate deviation from the strict propellers grid (4/1/1, 3/1/2, 10/1/2) because the surveyor-voice content takes precedence over shape symmetry. The propellers shape remains the structural model, but source-truth content rules whenever they conflict.

## v2482
- Two coupled changes — bundled because the second references terminology introduced by the first.

### Rename "Keel and keel joint" → "Keel and keel-hull joint"
- Applies to: pre-purchase template, insurance template, text library (14 entries), ITEM_STANDARD_MAP, SAIL_ONLY_ITEM_LABELS, checkSurvey powerboat-exclusion list.
- Existing surveys: ITEM_LABEL_MIGRATIONS entry added — `survey.items["Keel and keel joint"]` carries forward to the new label on next open. currentVersion bumped 2114 → 2482 so the migration re-runs on already-migrated surveys.
- Backcompat: non-destructive (`if (survey.items[oldLabel] && !survey.items[newLabel])`) — won't overwrite if both keys coexist.
- Term sourced from the v2472 Hull(s) condition C/observed chip ("The keel-hull joint appeared sound…") — section name now matches the chip terminology.

### Rewrite "Hull and rudder(s) percussion testing" chip list to propellers shape
- Phase 1 section 2 of the chip-shape migration. 24 entries → 25 (A 4/1/1, B 3/1/2, C 10/1/2 — identical grid + severity ladder to Propeller(s)).
- Drop 3 `[describe area(s)]` typing-required chips and the 3 "Percussion testing was carried out across the hull and rudder(s)" meta/process chips per the library-wide rule.
- Add `{specify:solid laminate|cored composite}` configuration chip in C/observed (cored composites have a different baseline percussion tone).
- A/observed atomic failure tones: dull thud across multiple areas, hollow ringing indicating delamination, multiple discrete voids, audible fluid behind laminate.
- B/observed: localized dullness, light tone variations, isolated ringing suggesting small void.
- C/observed: 5 cosmetic-but-serviceable variations (tonal variations, age-typical, fastener locations, repair sites, high-resin areas) + 5 specific positives (configuration-aware solid-vs-cored, hull below waterline clear tone, no hollow areas, topsides clear tone, rudder sound).
- Domain note: percussion testing is performed on hull, rudder(s), deck, and coachroof/pilot house only — never on the keel or the keel-hull joint. Earlier draft incorrectly included a "Percussion testing of the keel-hull joint" chip; corrected before push to "The topsides returned a clear and even tone consistent with sound laminate."

## v2480
- Add five new rated items to the pre-purchase template
- Cockpit category: Cockpit table, Bimini/dodger/canvas enclosure, Companionway and washboards (sail-only), Outdoor speakers
- Cabin and conveniences category: Indoor speakers
- All five items use the standard A/B/C/Powered up only/Not applicable/Not tested rating list

## v2479
- Remove Valuation Sources, Fair Market Value range, and Estimated Replacement Cost rows from the Statement of Valuation table
- Per Dave 2026-04-27: report should surface only the Final Concluded Fair Market Value (the punch-line block at the bottom of the valuation section, before the Surveyor's Certification). The sources/range/replacement working data lives in the surveyor's notes, not the client-facing report.
- Final Concluded Fair Market Value block is unchanged — still renders with the boxed callout when survey.concludedValue is set, with the Exchange Rate row riding along.
- Statement of Valuation header + Fair Market Value definition + Appraisal Methodology + Summary + Condition Adjustment paragraphs all still render.
- Comparables table still renders when at least one comparable vessel has a name.

## v2478
- Statement of Valuation also renders for Insurance surveys (correction to v2477)
- v2477 had gated the table to Pre-purchase + Appraisal only based on a misread of the example PDF. Insurance surveys also need a valuation table.
- All three survey types (insurance, pre-purchase, appraisal) now show the table with "—" placeholders for empty fields.

## v2477
- Restore Statement of Valuation section to the report — all survey types
- Bug: v2374 gate hid the whole table when no FMV/replacement/concluded/sources data was present, leaving only the BUC grading boilerplate. Dave reported the section "disappeared from the report" on 2026-04-27.
- Fix: every row in the Statement of Valuation table now ALWAYS renders on every survey type (insurance, pre-purchase, appraisal). Empty fields show "—" placeholders so the surveyor sees what to fill in.
- Comparables and Final Concluded blocks remain conditional below the table; they're additive and meaningless when empty.
- Exchange Rate row no longer requires the table to be hidden — renders on its own when an FX rate is present.

## v2476
- Add full generator section to prepurchase template (survey_template.json)
- Pre-purchase was missing 9 generator items the insurance template already had
- Added: Manufacturer and model #, Nameplate (photo), Operation, Exhaust, Oil level and condition, Air filter, Hoses, Anti-siphon, Battery
- Kept: Generator (if installed) as the first item, Generator valve and sea strainer (already present)
- Same A/B/C/Powered up only/Not applicable/Not tested options as the engine equivalents
- Items remain independent — surveyor still rates each one separately

## v2475
- Add Volvo Penta D6-370D-B IPS to engine_db.json
- 370 hp / 272 kW, 6-cyl, 5.5L common-rail diesel, IPS pod-paired
- IMO NOx Tier 2 (Annex VI) compliant
- Production 2005-Present

## v2474
- Add 2006 Cruisers Yachts 420 Express to boat_specs_db.json
- Production years 2003-2008, planing fibreglass powerboat
- LOA 42'8", beam 13'10", maxDraft 3'6", displacement 22,500 lbs
- Aliases: cruisers420, cruisers 420, 420 express, 420
- Verify on-vessel — auto-fill is a starting point, not the final word

## v2473
- Add Delivered checkbox to each survey row
- New Delivered section at the bottom of the home screen
- Tap a row to expand the action panel; check "Delivered to client" to move the survey to the Delivered section
- Inside Delivered: uncheck to send a survey back to the active list
- Adds delivered + deliveredAt fields to the survey object (no schema migration needed)

## v2472
- Add Yanmar 3JH4E to engine_db.json (39 hp / 28.7 kW / 3-cyl / 1.64L diesel inboard, JH-series family)

# Changelog

All notable changes to the Kiki Marine Survey PWA are documented here.

Each entry is grouped under a version number. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Version numbers match
`APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.

When making any user-visible change, add an entry here **before** pushing
the commit. This gives future-you a searchable history of decisions, and
lets you roll back to a specific version with confidence.

---

## v2472 — 2026-04-25
### Rewritten — Hull(s) condition (below the waterline) A/B/C chip list

First section in the Phase-1 migration: bring every observational
section to match the propellers chip shape exactly. Propellers (v2189)
is the canonical reference — same A/B/C distribution, same
observed/means/action ratios, same severity ladder, same `{specify:}`
configuration chip pattern, same minor-cosmetic-but-serviceable cluster.

**Why this release exists.** Dave's call: *"All sections that have
observational questions need the same format as propellers."* Hull
condition was the first section in the pre-purchase survey using the
old typing-required `[describe area(s)]` chip pattern that propellers
had migrated away from. 10 of the 35 existing entries forced the
surveyor to type an area into a free-text input embedded inside the
chip; the rest were a mix of vague summary statements and synonym
clusters (4 different ways to say "in good condition"). Mirrored the
propellers shape exactly so the chip-tap UX behaves identically here.

**Canonical reference (Propeller(s), unchanged):**
- A: 4 observed (sevs 5,5,4,4) + 1 means (sev 5) + 1 action (sev 5) = 6
- B: 3 observed (sevs 3,2,2) + 1 means (sev 3) + 2 actions (sevs 3,2) = 6
- C: 10 observed (5×sev2 cosmetic + 5×sev1 specific positive) + 1 means
  (sev 1) + 2 actions (sevs 2,1) = 13
- 25 entries total. C/observed includes a `{specify:…7 types…}`
  configuration chip that expands to 7 atomic chips at render.

**Hull(s) condition (below the waterline) — same shape, same counts,
same severity ladder:**
- A: 4 observed (sevs 5,5,4,4) + 1 means (sev 5) + 1 action (sev 5) = 6
- B: 3 observed (sevs 3,2,2) + 1 means (sev 3) + 2 actions (sevs 3,2) = 6
- C: 10 observed (5×sev2 cosmetic + 5×sev1 specific positive) + 1 means
  (sev 1) + 2 actions (sevs 2,1) = 13
- 25 entries total. C/observed includes a `{specify:fibreglass|aluminium|wood}`
  hull-material configuration chip that expands to 3 atomic chips at render.

**Chip-by-chip mirror to propellers:**

| Propellers | → | Hull(s) condition (below the waterline) |
|---|---|---|
| A/obs sev5 "blades chipped, cracked, or bent" | → | "The hull was gouged, cracked, or penetrated to the laminate." |
| A/obs sev5 "blade was missing" | → | "An area of the hull laminate was exposed below the waterline." |
| A/obs sev4 "Severe pitting/corrosion compromised blades" | → | "Severe osmotic blistering had compromised the hull below the waterline." |
| A/obs sev4 "retaining nut/pin loose or missing" | → | "Delamination of the hull laminate was detected below the waterline." |
| A/means sev5 "compromised propeller creates vibration… damage shaft, cutlass, transmission" | → | "A compromised hull creates risk of water ingress, reduces structural integrity, and can damage the keel, stringers, and interior structures." |
| A/action sev5 "removed, professionally assessed, repaired/replaced" | → | "The hull should be professionally assessed and repaired before the vessel is returned to service." |
| B/obs sev3 "Light edge nicks or minor blade damage" | → | "Light gouging or scrapes were observed on the hull below the waterline." |
| B/obs sev2 "Light pitting or surface corrosion on blades" | → | "Surface cracking of the gelcoat was observed below the waterline." |
| B/obs sev2 "Minor galling/tool marks at shaft-end interface" | → | "Small osmotic blisters were observed in localized areas below the waterline." |
| B/means sev3 "warranted attention to prevent further deterioration, vibration, imbalance" | → | "These findings warranted attention to prevent further deterioration, water ingress, or osmotic spread." |
| B/action sev3 "Dress the light nicks at next service and monitor" | → | "Touch up the affected areas with gelcoat at next service and monitor." |
| B/action sev2 "Remove, inspect, recondition at haul-out" | → | "Sand to the barrier coat and recoat the affected areas at the next scheduled haul-out." |
| C/obs sev2 "Despite minor cosmetic corrosion… satisfactory and properly attached" | → | "Despite minor cosmetic blemishes, the hull appeared in satisfactory condition below the waterline." |
| C/obs sev2 "Minor surface corrosion on blades, typical of vessel of this age" | → | "Light surface scoring was observed on the hull below the waterline, typical of a vessel of this age." |
| C/obs sev2 "Light galvanic corrosion on blade surfaces but had not compromised blade profile" | → | "Light gelcoat crazing was present on the hull below the waterline but had not compromised the laminate." |
| C/obs sev2 "Electrolysis staining but blade integrity not affected" | → | "Faint blister scarring was observed on the hull but laminate integrity was not affected." |
| C/obs sev2 "Minor marine growth on blades" | → | "Minor marine growth was present on the hull below the waterline." |
| C/obs sev1 `{specify:…7 types…}` "propeller appeared in serviceable condition with no significant damage, pitting, or corrosion" | → | `{specify:fibreglass\|aluminium\|wood}` "The {specify:…} hull below the waterline appeared in serviceable condition with no significant damage, blistering, or delamination." |
| C/obs sev1 "blades intact and securely attached to shaft" | → | "The hull below the waterline was true and fair with no visible impact damage." |
| C/obs sev1 "folding/feathering propeller opened and closed smoothly" *(no hull analogue — substituted)* | → | "The gelcoat below the waterline was intact with no significant cracking, crazing, or blistering." |
| C/obs sev1 "propeller properly secured with retaining nut and pin" *(propellers cross-references its mounting hardware; mirrored here)* | → | "The keel-hull joint appeared sound with no signs of separation or weeping." |
| C/obs sev1 "propeller showed no significant corrosion or damage" | → | "The hull showed no significant blistering, delamination, or laminate damage." |
| C/means sev1 "propeller appeared to provide effective propulsion" | → | "The hull appeared structurally sound and watertight at the time of survey." |
| C/action sev2 "Continued routine seasonal inspection is recommended" | → | (verbatim) |
| C/action sev1 "No corrective action is recommended at this time" | → | (verbatim) |

**What's gone.**
- 10 `[describe area(s)]` typing-required chips replaced with atomic
  observations that name the area inline ("below the waterline",
  "in localized areas").
- "An inspection of the hull below the waterline was conducted." —
  meta/process statement, not a finding. Dropped here and rule logged
  for the rest of the migration: drop "an inspection was conducted"
  / "I looked at X" filler library-wide.
- "Below the waterline, no evident damage was observed on the hull." —
  appeared verbatim in BOTH B and C ratings; dropped from both.
  Negative-summary catch-all chip; positive specific findings cover
  the C-rating space instead.
- 4 C/observed synonym chips ("good order with no visible damage",
  "good overall condition with only cosmetic wear", "serviceable
  condition for normal use") collapsed into the propellers-style
  5×specific-positive cluster (gelcoat intact, hull true and fair,
  keel-hull joint sound, no significant blistering/delamination, etc.).
- 4 of the 6 B/action chips (fill-and-recoat-with-epoxy, sand-to-gelcoat,
  lightly-sand-and-fill, etc.) dropped — propellers has only 2 B/action
  chips so the mirror trims to match.

**Spelling deferred to library convention** since propellers itself
doesn't use these words: `fibreglass` (UK; library has 8 vs 0
fiberglass), `aluminium` (UK; library has 3 vs 0 aluminum). Library
spelling supersedes Dave's earlier "aluminum" note per the
match-propellers-exactly rule.

**Spell-check spot-check.** All 20 marine words used in the new chips
are recognized by the global `dictionary.json` (128,587 words +
`MARINE_EXTRAS`). No additions to `MARINE_EXTRAS` needed for this
section. The live tone-warning banner and `polishSnippetProse` /
`applyWritingFixups` save-time fixups continue to apply unchanged —
they were already global, propellers wasn't special on this dimension.

### Audit

- text_library.json parses ✓
- app.js compiles ✓
- sw.js compiles ✓
- Hull(s) condition entry count: 25 (was 35) ✓
- Hull(s) condition grid identical to Propeller(s): A 4/1/1, B 3/1/2, C 10/1/2 ✓
- Severity ladder identical to Propeller(s): A obs [5,5,4,4]/[5]/[5], B [3,2,2]/[3]/[3,2], C [2,2,2,2,2,1,1,1,1,1]/[1]/[2,1] ✓
- Zero `[describe area(s)]` tokens remaining in section ✓
- One `{specify:fibreglass|aluminium|wood}` config chip present ✓
- All 20 chip-text marine words recognized by dictionary.json ✓
- APP_VERSION (app.js) = `v2472` ✓
- CACHE_NAME (sw.js) = `kiki-marine-v2472` ✓

---

## v2471 — 2026-04-24
### Added — Battery(ies), house + Battery(ies), starter items to the insurance template

**Why this release exists.** Dave's note during the Dehler 39 SQ
survey: *"batteries have disappeared from the electrical section"*.
Investigation showed this was a long-standing template gap rather
than a regression from v2470 — `insurance_survey_template.json` has
always had the derivative battery items (charger, selector, ventilation,
overcurrent protection) but not the actual physical batteries. The
pre-purchase template (`survey_template.json`) carries both
`Battery(ies), house` and `Battery(ies), starter` in the same section.
Dave noticed the gap now because of the heavy recent scrutiny on the
electrical section (v2470 voltmeter split, v2469 autocapitalize fix).

### What changed

**`insurance_survey_template.json`** — added two new list items
between `Battery ventilation` and `Battery(ies) overcurrent protection`:

- **Battery(ies), house**
- **Battery(ies), starter**

Placement groups the battery-related inspections in logical sequence:
charger → selector → ventilation → the batteries themselves → the
breakers/fuses protecting them → the panels they feed. Both new items
use the standard six-rating option set.

Pre-purchase template unchanged — it already had these items.

### Version markers

- `app.js` — `APP_VERSION = 'v2471'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2471'` (line 1).
- `index.html` — `<meta name="app-version" content="v2471">` and all
  7 core cache-busters → `?v=2471`.

### Test plan

1. Hard-refresh the PWA; console should print `[Sync] v2471…`.
2. Open the **Refuge** or a new insurance survey. Scroll to the
   Electrical section. Between `Battery ventilation` and
   `Battery(ies) overcurrent protection`, two new rating items should
   appear: `Battery(ies), house` and `Battery(ies), starter`.
3. Existing insurance surveys that pre-date v2471 will show these as
   unrated — rate them like any other item.
4. Pre-purchase surveys unaffected.

*Behaviour unchanged from v2470:* voltmeter 12V DC + 120V AC split,
v2469 iOS autocapitalize restoration, v2468 Bulkheads ordering,
v2467 Catalina 350.

---

## v2470 — 2026-04-24
### Changed — Voltmeter/ammeter split into separate 12V DC and 120V AC items, with migration

**Why this release exists.** Dave's note during the Dehler 39 SQ
survey: *"voltmeter and ammeter check should be on both 12V and 110V"*.
Previously both templates had a single ambiguous "Voltmeter/ammeter"
item positioned after the 120V Distribution panel + Reverse polarity
light (implied AC context) — but the Footloose report showed Dave
using it to describe the 12V house/starter voltmeter. Two items make
the check explicit on each voltage.

### What changed

**`insurance_survey_template.json` + `survey_template.json`**
(identical change to both). The interior electrical block now reads:

- Distribution panel 12V
- **Voltmeter/ammeter (12V DC)** ← new, co-located with the 12V panel
- Distribution panel 120V
- Reverse polarity light
- **Voltmeter/ammeter (120V AC)** ← renamed from "Voltmeter/ammeter"
- Bundling support and wiring

Each voltage now has its own inspection line immediately after or
within the panel block that monitors it. No more ambiguity about
which meter is being rated.

**`app.js` — one-time migration in `openSurvey`.** When a survey is
opened, if it has data under the legacy `"Voltmeter/ammeter"` key AND
neither new key has data, the legacy data is copied to
`"Voltmeter/ammeter (12V DC)"` and the old key is deleted. Rationale:
Dave's Footloose report demonstrates the legacy item was used for 12V
house/starter monitoring, so a silent migration to the 12V DC variant
is the best default. Surveyors who were treating the legacy item as
120V (rare — most boats don't have a separate AC voltmeter) can
manually move the rating via the checklist UI after opening the
affected survey. Migration is idempotent: re-opens after migration
see neither old nor new-12V-empty conditions and do nothing.

### Version markers

- `app.js` — `APP_VERSION = 'v2470'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2470'` (line 1).
- `index.html` — `<meta name="app-version" content="v2470">` and all
  7 core cache-busters → `?v=2470`.

### Test plan

1. Hard-refresh the PWA; console should print `[Sync] v2470…`.
2. Open a newly-created survey. The Electrical section should show
   two distinct items: `Voltmeter/ammeter (12V DC)` next to the 12V
   distribution panel, and `Voltmeter/ammeter (120V AC)` near the
   Reverse polarity light.
3. Open the **Refuge** or **Footloose** survey (pre-v2470). The
   previously-rated `Voltmeter/ammeter` entry should now appear under
   `Voltmeter/ammeter (12V DC)` — same rating, same note. A
   `Voltmeter/ammeter (120V AC)` slot should appear unrated.
4. The legacy `"Voltmeter/ammeter"` item should no longer appear in
   the checklist (migrated and removed).
5. Re-open the same survey: migration must not re-run — already-
   migrated surveys stay as-is.

*Behaviour unchanged from v2469:* restored iOS autocapitalize +
autocorrect, Bulkheads / Bilge / Keel bolts ordering, Catalina 350
fin/wing variants, all prior text-library cleanup.

---

## v2469 — 2026-04-24
### Fixed — iOS autocapitalize + autocorrect restored across every input and textarea

**Why this release exists.** Dave's report during the Dehler 39 SQ
survey: *"The spell check in 1.0 does not automatically capitalize the
first letter in a sentence. Also, there is supposed to be grammar
check (like grammarly) but it does not seem to work."*

Both symptoms had a single root cause: the MutationObserver at
`app.js:25273` that was added to suppress the iOS autofill bar (the
keyboard accessory strip that suggests saved passwords, credit cards,
addresses, etc. when typing into a text input) was doing too much.
It set three attributes on every input/textarea added to the DOM:

```js
el.setAttribute('autocomplete', 'off');
el.setAttribute('autocorrect', 'off');       // ← broke autocorrect
el.setAttribute('autocapitalize', 'off');    // ← broke sentence caps
```

`autocomplete="off"` does the job the observer was added for — suppresses
the autofill bar. The other two attributes are orthogonal to autofill
and should not have been touched:

- `autocapitalize` controls whether iOS capitalizes the first letter
  of a sentence (or every word, depending on the value). The per-
  element HTML already sets this to the right value per field type —
  `"sentences"` on notes textareas, `"words"` on vessel-name inputs,
  `"off"` where it genuinely shouldn't happen. The observer was
  overwriting all of those with `"off"`.
- `autocorrect` controls whether iOS's built-in spelling autocorrect
  runs. With it set to `"off"`, iOS doesn't surface correction
  suggestions at the keyboard bar, doesn't red-underline misspellings,
  and doesn't offer the tap-to-replace affordance. This is as close
  as a browser gets to a "grammar check" without a third-party service
  like Grammarly or LanguageTool.

With both forced off, surveyors had to manually hit Shift for every
new sentence and got zero typo feedback from iOS.

### What changed

**`app.js` (one-function rewrite).** `disableAutofill` now sets only
`autocomplete="off"`. Removed the two other `setAttribute` calls.
Comment updated to explain why, so a future reader doesn't think
they were accidentally removed.

**`app.js:8098` (one input-tag attribute).** The "Add another item"
input in the snippet-add flow had a hardcoded `autocapitalize="none"`.
Changed to `autocapitalize="sentences"` so the first letter of a
typed-in phrase gets capitalized. This is a tiny standalone fix that
would have landed even without the observer bug.

### Version markers

- `app.js` — `APP_VERSION = 'v2469'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2469'` (line 1).
- `index.html` — `<meta name="app-version" content="v2469">` and all
  7 core cache-busters → `?v=2469`.

### Test plan

1. Hard-refresh the PWA; console should print `[Sync] v2469…`.
2. Open any survey, scroll to an item's Notes / Description textarea.
   Type `"the rudder appeared serviceable. "` (trailing period +
   space) — the next letter typed should auto-capitalize.
3. Misspell a word on purpose (`"shrowds"`). iOS should red-underline
   it and offer correction at the keyboard bar (iPhone/iPad only;
   macOS Chrome doesn't do this).
4. Fields that should still NOT autocapitalize (e.g., emails, URLs,
   anything explicitly set to `autocapitalize="off"` in the HTML)
   remain uncapitalized — the observer no longer overrides them, but
   their explicit HTML attribute still wins.
5. The iOS autofill bar (credit cards, passwords, "scan credit card"
   suggestion) should still be suppressed — `autocomplete="off"` is
   doing that alone.

### Grammar check — what to expect and what NOT to expect

iOS / Safari / Chrome do not ship with a true grammar check (subject-
verb agreement, clause boundaries, style suggestions) the way
Grammarly does. What they DO offer, with `autocorrect="on"` + default
browser spellcheck:

- Red underline on misspelled words.
- Tap-the-underline to see replacement suggestions.
- iOS keyboard-bar inline auto-replacement for common typos
  ("teh" → "the").
- Double-space at end of sentence = period + space.
- Capitalize-after-period.

v2469 restores all of the above. For genuine grammar checking
(Grammarly-style), the report should be reviewed on the desktop
Chrome with the Grammarly extension installed, or pasted through
a grammar-check service before sending to clients. That's outside
the PWA's scope.

*Behaviour unchanged from v2468:* Bulkheads placement in insurance
template, Catalina 350 fin/wing draft variants, all prior v2466+ text
cleanup.

---

## v2468 — 2026-04-24
### Changed — Bulkheads moved above Bilge/stringers in insurance template so bilge-accessed items are adjacent

**Why this release exists.** Dave's note during the Dehler 39 SQ survey:
*"Keel bolts and ribs and stringers visible from the bilge should be
next to each other."* Both items are inspected from inside the bilge —
having them adjacent in the report lets the reader follow the
surveyor's physical workflow. Previously Bulkheads sat between them:

**Before (v2467):**
- Signs of water ingress
- Chainplates (interior)
- Bilge, stringers and ribs (those accessible from cabin)
- **Bulkheads** ← split the bilge-accessed items
- Keel bolts

**After (v2468):**
- Signs of water ingress
- Chainplates (interior)
- **Bulkheads** ← moved up above the bilge-accessed items
- Bilge, stringers and ribs (those accessible from cabin)
- Keel bolts

Bulkheads are visible throughout the cabin (not just from the bilge),
so placing them with the other cabin-wide inspections (water ingress,
chainplates) makes sense. The two bilge-accessed structural items now
render as a pair at the end of the interior structural block.

### What changed

**`insurance_survey_template.json`** — swapped the order of the
Bulkheads and Bilge/stringers blocks inside the interior section.
Pure reorder — labels, options, and all other fields unchanged.
`survey_template.json` is untouched because its interior section
already has Bulkheads before Bilge/stringers (the v1 and insurance
templates drifted apart at some point).

### Version markers

- `app.js` — `APP_VERSION = 'v2468'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2468'` (line 1).
- `index.html` — `<meta name="app-version" content="v2468">` and all 7
  core cache-busters → `?v=2468`.

### Test plan

1. Hard-refresh the PWA; console should print `[Sync] v2468…`.
2. Open or create an **insurance** survey. Scroll to the interior
   section. Item order should be: Signs of water ingress →
   Chainplates (interior) → Bulkheads → Bilge/stringers → Keel bolts.
3. Existing surveys with already-entered data for these items keep
   their entries — this is a template order change, not a data
   migration.
4. Pre-purchase surveys (`survey_template.json`) unaffected; their
   interior order was already correct.

*Behaviour unchanged from v2467:* Catalina 350 with wing/fin draft
variants, all v2466 "acceptable" → "serviceable" library cleanup,
Gearbox rename, saildrive dropdown, Dehler 39 SQ auto-fill.

---

## v2467 — 2026-04-24
### Added — Catalina 350 (2002–2007) to boat_specs_db

**Why this release exists.** A specific vessel Dave needs to survey. The
Catalina 350 (2002-2007 production, Gerry Douglas design) fills a gap
between the Catalina 34 (ends 2003) and the Catalina 36 Mk II already
in the DB. Typing "2004 Catalina 350" into the Auto-fill field now
resolves cleanly.

### What changed

**`boat_specs_db.json`** — new entry inserted between `catalina-34`
and `catalina-36-mk2` (ID order preserved), modelled on the existing
`catalina-470` pattern for dual-keel vessels:

```json
{
  "id": "catalina-350",
  "make": "Catalina",
  "model": "350",
  "aliases": ["catalina350", "catalina 350"],
  "yearStart": 2002,
  "yearEnd": 2007,
  "type": "sailboat",
  "loa": "35'4\"",
  "lwl": "30'3\"",
  "beam": "12'4\"",
  "displacement": "13,500 lbs",
  "ballast": "5,000 lbs",
  "maxDraft": "6'10\"",
  "totalSailArea": "601 sq ft",
  "hullType": "Fin keel",
  "keelType": "Fin",
  "construction": "Fibreglass",
  "designer": "Gerry Douglas",
  "draftVariants": [
    { "label": "Fin keel", "draft": "6'10\"" },
    { "label": "Wing keel", "draft": "4'10\"" }
  ]
}
```

Database count: 262 → 263. `draftVariants` follows the pattern already
used by the Catalina 470 and Beneteau Oceanis 343/38 entries — on
vessels shipped with more than one keel option, the Auto-fill lookup
offers radio buttons to pick the correct variant, updating the
surveyed vessel's `maxDraft` to match. `maxDraft` at the top level
holds the deeper variant (fin) as the canonical value; the wing
variant is selectable from `draftVariants`.

`lastUpdated` field bumped to reference v2467.

### Version markers
- `app.js` — `APP_VERSION = 'v2467'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2467'` (line 1).
- `index.html` — `<meta name="app-version" content="v2467">` and all 7
  core cache-busters → `?v=2467`.

### Test plan

1. Hard-refresh the PWA on the Mac; console should print `[Sync] v2467…`.
2. Create a new survey, type `2004 Catalina 350` into the Year/Make/Model
   field, blur. The Auto-fill banner should offer "Catalina 350
   (2002-2007)". Apply — LOA, beam, draft, displacement, ballast, sail
   area, and designer should populate.
3. Existing Catalina 34 and Catalina 36 Mk II lookups still resolve
   correctly (no collision from the new entry).

*Behaviour unchanged from v2466:* "acceptable" → "serviceable" library
cleanup, Gearbox rename, saildrive entries, Dehler 39 SQ auto-fill.

---

## v2466 — 2026-04-24
### Changed — Every "acceptable" in snippet library replaced with "serviceable"

**Why this release exists.** Dave's directive during the 2.0 snippet-design
review: *"'acceptable' should not be part of a survey."* Reason: "acceptable"
reads as an opinion ("I find this acceptable") rather than a survey fact.
"Serviceable" is the canonical word of art for a survey finding in the C lane
— it has a specific meaning (the item functioned as intended with no
material deficiency observed) and doesn't carry the subjective-endorsement
weight that "acceptable" does. Every occurrence in the snippet library was
either (a) redundant with "serviceable" already appearing in the same
sentence, or (b) replaceable one-for-one without loss of meaning. Two
occurrences used the phrase "acceptable limits" where straight substitution
produced "serviceable limits" (not idiomatic English); those two were
rewritten to "normal operating range" instead.

### What changed

**`text_library.json` (26 library entries touched).**

Global find/replace `\bacceptable\b` → `serviceable` across the library.
Grammar preserved in every case. A few representative before/afters:

- *"The hull appeared in acceptable condition for normal use."* → *"The
  hull appeared in serviceable condition for normal use."*
- *"All bulkheads appeared in acceptable condition with no cracking at
  seams, failed repairs, or rot."* → *"All bulkheads appeared in serviceable
  condition with no cracking at seams, failed repairs, or rot."*
- *"Swage fittings and turnbuckles were in acceptable condition, though tool
  marks on the turnbuckles suggested past adjustments made with toothed
  instruments."* → *"Swage fittings and turnbuckles were in serviceable
  condition, though tool marks on the turnbuckles suggested past adjustments
  made with toothed instruments."*

Two "limits" entries rewritten (not find/replaced):

- *"The drip rate appeared within **acceptable limits** at approximately
  one to two drops per minute under load."* → *"The drip rate appeared
  within **normal operating range** at approximately one to two drops per
  minute under load."*
- *"The traditional stuffing box was dripping at a rate exceeding
  **acceptable limits**."* → *"The traditional stuffing box was dripping
  at a rate exceeding **normal operating range**."*

**`app.js` (2 UI strings touched).**

- Line 13878 — rating-tooltip for the C lane: "Functional and in
  acceptable condition — no action required" → "Functional and in
  serviceable condition — no action required".
- Line 18078 — Force-OK button label: "✓ Force OK — mark as acceptable"
  → "✓ Force OK — mark as serviceable".

One occurrence of the word in `app.js:17227` was left in place because it
appears inside a code comment (`// acceptable because the old one still
has all its handlers wired.`) describing code behaviour, not survey text.

### Version markers
- `app.js` — `APP_VERSION = 'v2466'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2466'` (line 1).
- `index.html` — `<meta name="app-version" content="v2466">` and all 7 core
  cache-busters → `?v=2466`.

### Test plan

1. Hard-refresh the PWA on the Mac; console should print `[Sync] v2466…`.
2. Open any survey with previously-generated snippet text that previously
   contained "acceptable" — e.g., regenerate the report text for a
   previously-saved item. The word should no longer appear.
3. Grep-check the generated report HTML: `grep -i acceptable` should
   return 0 hits on any report produced after v2466 installs.
4. Existing stored survey data (per-item `text` fields already written
   into IDB before v2466) is NOT auto-rewritten by this patch — the
   library is the source of future inserts only. To purge "acceptable"
   from older generated text, re-tap the snippets on the affected items,
   or use find/replace directly in the item's note field.

*Behaviour unchanged from v2465:* Gearbox rename, saildrive entries,
Dehler 39 SQ auto-fill, I&E TOC skip logic, all v2463 report text polish.

---

## v2465 — 2026-04-23
### Added — Saildrive entries in gearbox make dropdown + Dehler 39 SQ in specs DB; Changed — "Transmission" → "Gearbox" across UI

**Why this release exists — and why three changes ship bundled.** Dave is in the middle of a live Dehler 39 SQ survey and hit three gaps in one sitting: (1) the boat has a Yanmar saildrive, which was not an option in the transmission/gearbox make dropdown — only traditional gearbox makers (ZF, Twin Disc, Borg Warner, etc.) were listed; (2) "Dehler 39 SQ" is not in `boat_specs_db.json`, so Auto-fill could not seed dimensions on the Vessel Info form; (3) the form and report consistently used the word "Transmission", but Dave's surveyor convention — and the field-more-common term when a saildrive is involved — is "Gearbox". All three are independent, non-logic text/data edits with no shared state. Bundling is safe under the same reasoning as v2463: isolated UI/data changes, no new code paths, no regression surface between them. Shipping this way lets Dave unblock the active survey in a single refresh.

---

### What changed

**1. Saildrive makes added to `engine_db.json` (gearbox dropdown).**
Three new entries appended to the gearbox make list so saildrives surface alongside traditional inboards:

- **Yanmar Saildrive** — 7 models: SD20, SD25, SD40, SD50, SD60, SD60-4T, SD70.
- **Volvo Penta Saildrive** — 8 models: 110S, 120S, 130S, 130SR, 150S, 150SR, MS25L, MS25S.
- **ZF Saildrive** — 4 models: SD2, SD4, SD6, SD8.

When the surveyor selects "Yanmar Saildrive" as the gearbox make, the model dropdown now lists the SD-series rather than HC/KBW/KMH traditional gearbox models. `lastUpdated` bumped.

**2. Dehler 39 SQ added to `boat_specs_db.json`.**
Entry `dehler-39sq` — year range 2019-2026, LOA 39'3", LWL 35'5", beam 12'8", displacement 16,534 lbs, ballast 5,732 lbs, max draft 7'3", total sail area 916 sq ft, designer Judel/Vrolijk & Co, construction Fibreglass. Auto-fill lookup now resolves "2023 Dehler 39 SQ" (and year variants) to these specs. Database count: 261 → 262.

**3. "Transmission" → "Gearbox" rename across UI, form labels, camera captions, and report narrative (`app.js`).**
All user-visible occurrences now say "Gearbox". Specifically:

- Section heading `Engine & Transmission` → `Engine & Gearbox` (form + check-survey category — all 3 call sites).
- Subsection labels `Transmission 1 (Port)` / `Transmission 2 (Starboard)` → `Gearbox 1 (Port)` / `Gearbox 2 (Starboard)` (both form and report render).
- Field labels `Transmission Make`, `Transmission Model`, `Transmission Serial No.`, `Transmission Photo` → `Gearbox ...`.
- Camera button captions `📷 Transmission` → `📷 Gearbox`.
- `docPhotoLabels` entries `'Transmission'` / `'Transmission plate'` → `'Gearbox'` / `'Gearbox plate'`.
- `photoKindLabels` entries `'transmissionPhoto': 'Transmission'` / `'transmission2Photo': 'Transmission 2'` → `'Gearbox'` / `'Gearbox 2'`.
- Report render: nameplate image alt-text and the propulsion-block titles in the generated HTML.

**Deliberately *not* renamed** — the persistent data schema. `survey.transmissionMake`, `survey.transmissionModel`, `survey.transmissionMakeModel`, `survey.transmission2*`, DOM `id="transmissionMake"`, and `onTransmissionMakeChange()` are the on-disk keys inside every stored survey in IndexedDB. Renaming them would either (a) silently drop data on every existing survey when v2465 loaded, or (b) require a migration that rewrites every IndexedDB record on version handshake — high risk, zero benefit since these keys are never user-visible. The internal→external translation is one-way at render time: reads happen from the `transmission*` keys, labels render as "Gearbox".

### Scope audit

Grep after changes confirmed zero user-visible "Transmission" occurrences remain in `app.js`, `index.html`, or template JSON. The 18 surviving `transmission*` references are all internal field names (survey object keys, DOM IDs, handler function names). Saildrive entries were appended to the existing arrays in `engine_db.json` with no reordering of prior entries — existing surveys that reference "ZF Marine" or "Twin Disc" model indexes remain stable. The Dehler 39 SQ entry was inserted in alphabetical-by-make order within the Dehler block; no existing IDs were changed.

### Version markers
- `app.js` — `APP_VERSION = 'v2465'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2465'` (line 1).
- `index.html` — `<meta name="app-version" content="v2465">` and all 7 core-module cache-busters → `?v=2465`.

### Test plan

1. Hard-refresh the PWA on the Mac; console should print `[Sync] v2465: Manual Firebase sync only…`. No cache errors on the install handshake.
2. Open the Dehler 39 SQ survey. On the Vessel Info screen, type `2023 Dehler 39 SQ` into the year/make/model field and blur — the Auto-fill banner should offer the new entry. Applying it should populate LOA 39'3", beam 12'8", max draft 7'3", sail area 916 sq ft, designer Judel/Vrolijk & Co.
3. Still on that survey, scroll to **Engine & Gearbox** (heading should now read *Gearbox*, not *Transmission*). Open the gearbox make dropdown — **Yanmar Saildrive**, **Volvo Penta Saildrive**, **ZF Saildrive** should appear alphabetically amongst the traditional makers. Select *Yanmar Saildrive*; the model dropdown should list SD20–SD70.
4. Check camera/photo-capture labels: the photo tile should say *Gearbox Photo*, the capture button should say *📷 Gearbox*.
5. Generate the report. The narrative propulsion block titles should say *Gearbox 1 (Port)* / *Gearbox 2 (Starboard)* (or just *Gearbox* for single-engine), and nameplate image alts should read *Gearbox serial plate* etc.
6. Open any *existing* survey saved before v2465 (e.g., Footloose). Verify the existing `transmissionMake` / `transmissionMakeModel` data still renders correctly under the new "Gearbox" labels — no empty fields, no data loss.

If any of 2–6 regresses, roll back to v2464.

*Behaviour unchanged from v2464:* TOC skip-logic for I&E section, all v2463 report text polish, condition sentence derivation at render time.

---

## v2464 — 2026-04-23
### Fixed — Table of Contents no longer lists *Instruments & Electronics Inventory* when that section has been skipped

**Why this release exists.** On the Footloose report Dave confirmed post-v2463 that the *Instruments & Electronics Inventory* entry was still showing up as item 14 in the Table of Contents even though he had explicitly ticked "Skip Instruments & Electronics" on the Edit Vessel Info screen, and the body of the report correctly omitted the section. The heading existed in the TOC as a static `<li>`, unconditional; the body section correctly checked `!survey.skipInstrumentsElectronics && survey.instrumentsElectronics?.length > 0` before rendering itself, but the TOC had no such gate. Readers who scan the TOC and then flip to the section it promises found a gap where they expected content.

### What changed

**`app.js` (inside the Table of Contents `<ol>`, around the `Safety Equipment — TC TP 511` / `Findings & Recommendations` boundary):**

The static line
```html
<li>Instruments &amp; Electronics Inventory</li>
```
is now wrapped in the same predicate the body section uses:
```js
${(!survey.skipInstrumentsElectronics && survey.instrumentsElectronics && survey.instrumentsElectronics.length > 0) ? '<li>Instruments &amp; Electronics Inventory</li>' : ''}
```

The predicate is duplicated inline rather than factored into a shared flag because there are only two call sites (TOC + body) and the predicate itself is short. If a third consumer shows up, lift it to a named `const showInstrumentsElectronics` at the top of `generateReport()` and reuse.

Browser-standard `<ol>` auto-numbering carries the rest: when the I&E `<li>` is suppressed, items 15/16/17 become 14/15/16 automatically — no manual renumbering in any downstream code is needed.

### Scope audit

I grep'd every `survey.skip*` flag in the codebase to confirm this was the only TOC/body mismatch of its kind. Two skip flags exist: `skipInstrumentsElectronics` (this one) and `skipComparables`. Comparables live inside *Rating & Valuation* (TOC item 16), which is a single top-level entry whose presence is unconditional — the comparables table within it is gated, but the TOC heading is not tied to the table. No fix needed there.

### Version markers
- `app.js` — `APP_VERSION = 'v2464'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2464'` (line 1).
- `index.html` — `<meta name="app-version" content="v2464">` and all 7 core-module cache-busters → `?v=2464`.

### Test plan

1. Hard-refresh the PWA on the Mac; console should print `[Sync] v2464: Manual Firebase sync only…`.
2. Open a survey where **Skip Instruments & Electronics** is checked on Edit Vessel Info. Generate the report. TOC should show 16 items (I&E no longer listed); the *Safety Equipment — TC TP 511* item is still 13; *Findings & Recommendations* is now 14 (not 15).
3. Open a survey where the checkbox is *unchecked* **and** at least one instrument has been logged. Generate the report. TOC should show 17 items with *Instruments & Electronics Inventory* at position 14, and the body should render the Inventory section as before.
4. Open a survey where the checkbox is unchecked **but** no instruments have been logged yet. TOC should omit the entry (predicate requires `length > 0`) and body should omit it too — same behaviour as pre-v2464, just now reflected consistently in the TOC.

If any of 2–4 regresses, roll back to v2463.

*Behaviour unchanged from v2463:* all nine text/template fixes from that bundle, condition-sentence sync at render time, migration-map alignment, etc.

---

## v2463 — 2026-04-23
### Fixed — Report text polish bundle (nine independent fixes surfaced during review of the Footloose insurance survey)

**Why this release exists — and why it's bundled.** Dave reviewed the Footloose report end-to-end on the morning of 2026-04-23 and flagged nine separate text/template issues that made the PDF look drafty instead of professional. Each is a pure text or template fix — no shared state, no cross-dependency, no new logic path — which is why they ship as a single version instead of nine sequential ones. The regular "one feature per version" rule exists to prevent logic regressions masking each other; for isolated text/template edits with zero shared surface, bundling is safe and lets Dave deploy once and regenerate every pending report against the same fixed baseline. Each fix is listed below as its own bullet, with the exact location and the before/after shape, so history stays searchable.

---

### What changed

**1. "Impact and resonance" → "percussion" (60 replacements across 4 files).**
SAMS convention and the report's own Definitions of Terms both use "Percussion Testing" as the canonical name for hammer/sounding inspection. The snippet library and two survey templates had previously used "impact and resonance testing" in 60 places, causing the adjacent-heading mismatch Dave spotted on p. 9 of Footloose (heading said *"Hull and rudder percussion testing"* but narrative said *"Impact and resonance testing was carried out…"*). All 60 occurrences rewritten, preserving case. Files touched: `text_library.json` (51), `survey_template.json` (3), `src/core/snippet_tokens.js` (1 comment), `tests/snippet_tokens.test.js` (5 test fixtures — tests still exercise the same matching paths with the new literal).

**2. Verbose geocoded address — new `formatReportLocation()` helper.**
The report's *Location of Survey Inspection* row rendered `survey.location` verbatim — which is Nominatim's full `display_name` including suburb, regional muncipality, and informal region ("Peel Region, Golden Horseshoe"). Footloose rendered as *"Port Credit Yacht Club, 115, Lakefront Promenade, Lakeview, Mississauga, Peel Region, Golden Horseshoe, Ontario, L5E 3G9, Canada"*. New helper `formatReportLocation(fullLocation)` at `app.js` (defined just below `shortLocation()`): drops parts matching `/Region$| Horseshoe$|^Regional Municipality| County$|^Canada$/i`, abbreviates Canadian province names to two-letter codes, joins a pure-digit house number to the next part with a space, merges province + postal into one comma-less segment per Canada Post. Wired in at the single report call site (`app.js` row generator for `'Location of Survey Inspection'`). `shortLocation()` — still used for UI labels — is left unchanged. Footloose now renders as *"Port Credit Yacht Club, 115 Lakefront Promenade, Lakeview, Mississauga, ON L5E 3G9"* (the "Lakeview" suburb still shows when Nominatim returns it separately — stripping that reliably would need the structured `address` object, which we don't currently capture at geocode time; flagged as v2464 scope).

**3. Missing "house" in percussion-testing label (`insurance_survey_template.json`).**
Item label at line 405 read *"Deck and coachroof/pilot percussion testing"*; sibling items at lines 393, 417, 585 all correctly said *"…pilot house…"*. One-word fix: added **house** to bring this one in line. Affects the heading on the detailed-findings page for any insurance survey generated going forward.

**4. Colour names capitalised mid-sentence (9 interpolations).**
Dropdown at `app.js:9509` stores colour values capitalised ("White", "Navy blue") — correct for a <select> option, wrong when interpolated into prose. Footloose narrative: *"finished in white with a **B**lue boot stripe, and the deck is **W**hite."* All 9 interpolations across the 3 vessel-description generators now wrap the value in `.toLowerCase()`. Inside the `if` guard, the value is guaranteed non-empty, so lowercasing is safe. Placeholders (when value is empty) stay uppercase intentionally.

**5. Construction / hull type / boat style capitalised mid-sentence (9 interpolations).**
Same class of bug as #4 but for `construction`, `hullType`, `boatStyle`. Footloose: *"a Fibreglass Displacement Sloop"*. Each `const X = value || '[PLACEHOLDER]'` rewritten as `const X = value ? value.toLowerCase() : '[PLACEHOLDER]'` — real values become lowercase, placeholders remain uppercase to signal "needs filling in" to the surveyor reviewing the draft. Three generators × three fields = 9 spots.

**6. "Hours not available hrs" double unit (2 spots in `propulsionItem` block).**
The "Hours not available" checkbox at line 9656 stores the literal string "Hours not available" as the value of `engineHours`. The report render at `app.js:24103` and `:24119` unconditionally appended ` hrs` to that value, producing *"Hours not available hrs"*. Wrapped each in `(/^[\d,.\s]+$/.test(survey.engineHours) ? ... : survey.engineHours)` — only append the ` hrs` unit when the value is purely numeric. A blank field still renders blank; a numeric field still gets the unit. Applied identically for engine 2.

**7. "29HP / 21.3kW horsepower" redundancy (3 spots in vessel-description generators).**
`const engHPStr = engineHP ? \`${engineHP} horsepower\` : '[XX] horsepower'` unconditionally appended the word *horsepower* — but `engineHP` is almost always already a formatted string like "29HP / 21.3kW" (populated by the boat-specs auto-fill at line 10295). Now uses the same regex the smart-append helper `_fmtHP` uses: `/(hp|h\.p\.|horsepower|kw|bhp)/i` — if the value already carries a unit it's rendered verbatim; only bare-number entries get the word "horsepower" appended. Three generators, so three identical edits.

**8. 110V → 120V (24 replacements across 3 files).**
North American AC-shore-power convention is 120V (the modern nominal voltage; 110V is the legacy low-end of the ±10% tolerance band). The snippet library and both survey templates had 24 places using the old "110V" label. Rewritten en masse with a digit-boundary-aware regex (`(?<![0-9])110(\s?)V(?![0-9])` → `120\1V`) so only standalone "110V" tokens match and not any `1110V` / `110V2` substring that might appear in serial numbers or model names. Files: `text_library.json` (22), `survey_template.json` (1 — the "Distribution panel 110V" item label), `insurance_survey_template.json` (1).

**9. Condition narrative out of sync with formal BUC rating (at report render, not at description generation).**
`_buildConditionSentence(survey)` in `app.js:12455` produces the " At the time of the survey the vessel was in … overall condition" sentence, and the three `generateVesselDescription*` functions append it at the end of the description. Problem: the sentence is FROZEN into `survey.vesselDescription` at the moment Dave clicks "Generate Vessel Description". If he sets or changes `overallCondition` afterwards (the common workflow — write the description early, finalise the rating late), the stored description stays stale and contradicts pp. 58-60. Footloose p. 8 said "fair overall condition" while the formal rating was "Above Average".

Fix sits inside `generateReport()`, just after `migrateSurveyLabels`: detect and strip the existing " At the time of the survey…" tail from a local copy of `survey.vesselDescription` (regex `/\s*At the time of the survey[\s\S]*$/`), then append a freshly-built sentence via `_buildConditionSentence(survey)`. The mutation is in-place on the scoped `survey` object only — not persisted back to IndexedDB — so Dave's stored description stays exactly as he last regenerated it, but every rendered report is always in sync with the current BUC grade. If Dave has manually added prose *after* the condition sentence, this refresh will strip it; that's a conscious trade-off to guarantee sync and is called out here for future reference.

---

### Also fixed (surfaced during v2463 QC)

**Migration-map alignment with the new "percussion" terminology.** The mass replace in fix #1 hit four files directly; the two long lookup tables in `app.js` (`ITEM_SNIPPET_MAP` at line 1499 and `ITEM_LABEL_MIGRATIONS` at line 2352) were not touched by the replace and contained entries that pointed at the OLD "impact and resonance" strings, plus one backwards migration. QC pass 3 caught four `ITEM_SNIPPET_MAP` values that aimed at text_library sections that no longer exist under those names (Hull, Aft deck, Cockpit, the `(if applicable)` hull variant) — all retargeted to the current `…percussion testing` sections. QC also caught one `ITEM_LABEL_MIGRATIONS` entry (`'… percussion testing' → '… impact and resonance testing'`) whose direction was actively harmful post-v2463: with "percussion" now the live template label, that entry would have rewritten good current-survey labels back to the retired "impact and resonance" string every time `migrateSurveyLabels` ran. Direction reversed so any lingering old-labelled survey upgrades to the current term. No stored survey should need any user action to benefit.

---

### Version markers
- `app.js` — `APP_VERSION = 'v2463'` (line 8).
- `sw.js` — `CACHE_NAME = 'kiki-marine-v2463'` (line 1).
- `index.html` — `<meta name="app-version" content="v2463">` and all 7 core-module cache-busters → `?v=2463`.

---

### Test plan (for Dave post-deploy)

After the push and a hard-refresh on the Mac (and a reload on the iPhone PWA):

1. **Version confirm.** Chrome DevTools → Console: should see `[Sync] v2463: Manual Firebase sync only. …`. Application → Cache Storage: a bucket named `kiki-marine-v2463` exists.
2. **Percussion terminology.** Open any inspection section that includes percussion testing (Hull, Deck/coachroof, Cockpit). Heading + snippet chips should say *"percussion testing"* — no remaining *"impact and resonance"*.
3. **Location line.** Open any survey, generate report. The *Location of Survey Inspection* row should show *"Venue, Street, City, ON Postal"* with no *Region*, *Horseshoe*, or *Canada* components.
4. **"House" restored.** Open the deck/coachroof section of any new insurance survey. Item 3 should read *"Deck and coachroof/pilot house percussion testing"*.
5. **Lowercase colours and construction.** Re-generate a vessel description for any survey with hull/boot/deck colours and a construction value. Sentence should read as prose: *"a fibreglass displacement sloop"*, *"finished in white with a blue boot stripe"*.
6. **Hours not available.** Tick the "Hours not available" checkbox on a survey's engine, save, generate report. Engine block should read *"Hours not available"* (no trailing " hrs").
7. **Horsepower formatting.** Verify engines with auto-filled HP (e.g., "29HP / 21.3kW") render as *"rated at 29HP / 21.3kW"* in the description — not *"…horsepower"*. Verify a bare-number entry (e.g., type just "54" into the HP field) renders as *"rated at 54 horsepower"*.
8. **120V everywhere.** Search generated report for "110V" → should be zero hits. Check the Electrical section snippet chips — "Distribution panel 120V" heading, all 120V in snippet text.
9. **Condition sync.** Create or reopen a survey. Set *overallCondition* dropdown to something other than what the description currently says. Regenerate the report — the description's condition sentence should now match the dropdown, even though the stored description text was left alone.

If any of 1–9 regresses, roll back to v2462.

*Behaviour unchanged from v2462:* Manual-only Firebase sync, Force push SaveProgress modal, Drive auto-backup, neutered bidirectional-sync stubs.

---

## v2462 — 2026-04-22
### Fixed — `☁️ Force push to cloud` now shows the SaveProgress modal (the Save button's progress UI) instead of flickering hidden button text

**Why this release exists.** Dave tapped `☁️ Force push to cloud` on the "Liquid Wisdom" survey and reported: *"I don't see any indication that it has pushed and no progress bar."* Bug confirmed — the handler's only post-confirm UI was `pushOpt.innerHTML = '☁️ Pushing…'` and a 4-second toast at the end, but the overflow menu containing that button is hidden as the very first line of the handler (`overflowMenu.style.display = 'none';` at line ~15355). Every subsequent `pushOpt.innerHTML` and `pushOpt.disabled` change lands on an off-screen element. For a photo-heavy survey the push runs many seconds with zero on-screen feedback, and the end-of-push toast is easy to miss if Dave has switched apps, locked the phone, or simply looked away.

The `💾 Save` button has never had this problem — `saveSurveyWithProgress` (v2257) uses the `SaveProgress` overlay, which is a full-screen modal with per-backend rows, a progress bar, photo-by-photo detail text, elapsed-time counter, and a Close button. v2462 reuses that same modal for Force push. One row, Firebase only (Force push is firebase-only by design), so Dave sees the same familiar `🔥 Firebase` row he's used to from Save, with `Photo 47 of 138 (32 already synced)`-style updates.

---

### What changed in code

**`app.js` (around line 15404, inside `ensureReportButton`'s `pushOpt.onclick`):**

Removed: the useless pre-try `pushOpt.innerHTML = '☁️ Pushing…'; pushOpt.disabled = true;` dance, the toast/alert branches at end of try, and the `finally` block that re-enabled the hidden button.

Added: a `SaveProgress.show` call with a single Firebase row, followed by the same photo-collection + batch-existence-check + per-photo-push loop pattern `saveSurveyWithProgress` uses. Photo loop is duplicated (not delegated to `FirebaseSync.pushAllPhotosForSurvey`) because that helper takes no progress callback — same trade-off v2257 made for Save. The v2260 batch `photoExistsInFirebase` optimisation is preserved: one `where('surveyId', '==', …)` query replaces N round trips.

Flow now:

1. Confirm dialog (unchanged — the before/after snapshot summary is the useful part and already appears).
2. `SaveProgress.show('Force pushing to cloud…', vesselName, [{ id:'firebase', label:'Firebase', icon:'🔥' }])` — opens the modal.
3. `markActive('firebase', 'Pushing survey data…')` + `pushSurvey` + `setProgress(20)`.
4. Collect photo IDs, `setProgress(fbTotal > 0 ? 30 : 90)`.
5. Batch-check existing Firebase photos in one query.
6. Photo loop: for each photo, skip if already uploaded, else `pushPhoto`; after each, `updateDetail('Photo N of M (K already synced)')` + `setProgress(30 + (processed/total)*70)`.
7. `markDone('firebase', 'Survey + N photos (K already synced) ✓')` + `finish(true, '✓ Pushed to cloud')`.
8. On throw: `markFailed('firebase', 'Error: …')` + `finish(false, '⚠ Push failed')`.

The `SaveProgress` modal's Cancel-turned-Close button handles dismissal, so the old `finally` block's job (re-enabling a hidden button) is no longer needed.

**`sw.js`:** `CACHE_NAME` → `kiki-marine-v2462`.

**`index.html`:** `<meta name="app-version">` → `v2462`; all 7 core-module cache-busters → `?v=2462`.

**Startup console banner:** bumped to `v2462` (same sentence, just the version number).

---

### What did NOT change (deliberately)

- **The confirm dialog and its before/after snapshot summary.** That's the pre-push UX layer and works fine — Dave sees "Cloud now (will be replaced): 47 rated · 138 photos · 12.3k chars" before he commits to the overwrite. Untouched.
- **`FirebaseSync.pushSurvey` / `pushPhoto` / `pushAllPhotosForSurvey`.** The sync module's public API is stable; the fix is purely in the UI glue layer inside `pushOpt.onclick`.
- **`⬇️ Force pull from cloud`.** Same hidden-button UX quirk exists there (pullOpt's `innerHTML` dances on an off-screen element too). Not fixed in this release to honour the one-feature-per-version rule. Flagged in the inline comment and noted here — next single-feature candidate. A pull is usually faster than a push (no photo upload, just download + IDB writes) so the cost of leaving it one version longer is smaller than combining would be.
- **The peek-before-confirm button-text flash** (`pushOpt.innerHTML = '☁️ Checking cloud…'`). Same hidden-button problem in principle, but `peekCloudSurvey` is a single Firestore `get()` — typically <1 second. Not worth widening scope for this release. If it ever becomes user-noticeable on slow networks, a lightweight overlay spinner during peek is a future candidate.

---

### Regression check

**What could break:**

- `SaveProgress` is a shared UI singleton. If the user already has the Save modal open (they tapped 💾 Save) and then somehow triggers Force push before Save finishes, calling `.show()` again would call `existing.remove()` on the existing overlay (line 25700) and start a fresh one. In practice this isn't reachable: the overflow menu that contains Force push is positioned inside the bottom bar, the Save modal overlays the whole viewport with `position:fixed;inset:0;` at `z-index:10002`, which blocks pointer events on the overflow menu. No known path for concurrent show calls.
- `SaveProgress.isCancelled()` is honoured inside the photo loop — if Dave taps Cancel mid-push, the loop breaks and the modal stays in "Cancelling…" state until the awaited `pushPhoto` resolves. `pushSurvey` and the initial batch-existence-check don't check cancellation — same behaviour as `saveSurveyWithProgress`, accepted.
- If `FirebaseSync.pushSurvey` throws, control jumps to the catch block and `markFailed` + `finish(false, …)` show an error. The photo loop never runs — same failure surface as `pushAllPhotosForSurvey` throwing from inside.

**Manual test checklist (iPhone, on Liquid Wisdom):**

1. Open Liquid Wisdom survey.
2. Tap ⋯ → `☁️ Force push to cloud`.
3. Confirm the "before/after" dialog appears (unchanged).
4. Tap `Force push`.
5. Expect: SaveProgress modal appears with title `Force pushing to cloud…`, the vessel name below it, and a `🔥 Firebase` row with `Pushing survey data…` detail.
6. Progress bar should advance smoothly as photos upload; detail text should read `Photo N of M (K already synced)`.
7. On completion: title changes to `✓ Pushed to cloud`, Firebase row row shows `Survey + N photos (…) ✓` in green, Cancel button becomes Close.
8. Tap Close → modal dismisses, no stale state left behind.
9. Re-tap `☁️ Force push to cloud` → confirm dialog should show the updated cloud snapshot (photo count matching what was just pushed) proving the push actually landed.

**Cache verification:** `document.querySelector('meta[name=app-version]').content` → `v2462`; `caches.keys()` → `['kiki-marine-v2462']`; all seven `?v=2462` cache-busters in page source; console `APP_VERSION` → `v2462`.

---

## v2461 — 2026-04-21
### Neutered — `periodicSync()` replaced with loud-failure stub (P1 hardening — closes the last dormant bidirectional-sync body)

**Why this release exists.** v2460 stubbed `startListening()` and `initialSync()` but deliberately left `periodicSync()` alone, per one-feature-per-version. That comment block in the v2460 CHANGELOG ("What about `periodicSync()`?") explicitly flagged it as "Scope for a future release." This is that release. The third orphaned bidirectional-sync body — ~80 lines of `getAllSurveys() + fsDb.collection('surveys').get()` reconciling every local and remote survey by `lastModified`, pushing deltas and pulling orphans — is now a three-line loud-failure stub.

`periodicSync()` has been orphaned since v2426 (removed from the public `FirebaseSync` export and no longer invoked by any timer, `visibilitychange` listener, or `pushNow`/`pullNow` caller). The v2460 surface map listed it under "ORPHANED-BUT-LIVE" as a future stubbing candidate for exactly this reason: the body was still fully wired, the v2428 manual-only sync contract still technically depended on nothing grep-renaming or accidentally re-exporting it. After v2461 that dependency is gone — even a rename/re-export would yield an immediately-throwing stub.

---

### Why now, not later

Three reasons this couldn't wait:

1. **Consistency with v2460.** Leaving one of the three orphaned sync bodies alive while two are stubbed is the kind of asymmetry that catches future-Dave at 11pm trying to remember "wait, is periodicSync dead or just unwired?" Stubbing the third closes the pattern.
2. **Smallest-blast-radius argument from v2460 is weaker than it looked.** The v2460 CHANGELOG argued periodicSync was OK to leave because it had `_periodicSyncRunning`, `_backupActive`, and a 30-second timestamp throttle — three layers of self-gating. Those gates don't actually *prevent* the bidirectional sync from running; they just throttle it. A single call during a quiet moment would still iterate every local+remote survey and push/pull the delta, violating the v2428 manual-only contract just as hard as `initialSync` would.
3. **The Ex-Ta-Sea disappearance forensics (2026-04-10 / 2026-04-19) are still open** (task #74). Until that's root-caused, every dormant bidirectional-sync body is a suspect. Stubbing narrows the suspect list.

---

### What changed in code

**`app.js`:**

- **`periodicSync()` (around line 27143)** — full ~80-line reconcile loop replaced with the three-line stub:

  ```js
  async function periodicSync() {
    console.error('[Sync] periodicSync() was removed in v2426 and stubbed in v2461. See CHANGELOG. This is a bug — the call path that reached here should be rewritten around per-survey pullSurvey/pushSurvey (manual ☁️ / ⬇️ buttons).');
    console.trace('[Sync] periodicSync call trace');
    throw new Error('periodicSync removed — use per-survey pullSurvey/pushSurvey');
  }
  ```

  Removed: the `_syncEnabled`/`window.fsDb` guards, the `_periodicSyncRunning` overlap check, the `_backupActive` check, the 30-second throttle, the `_suppressLocalWrite` flag dance, the dual-fetch `getAllSurveys()` + `fsDb.collection('surveys').get()`, the local-newer push branch, the remote-newer pull branch with the `_scoreSurveyContent` richness guard, the orphan-remote-survey pull loop, the `updateSyncStatusUI` calls, the toast, the push/pull log line.

  Kept: the function signature (`async function periodicSync()`), and the entire v2259 doc comment block above it. The doc comment now carries a v2426 amendment ("removed from public API") and a v2461 amendment ("loud-failure stub"), giving future maintainers the full three-version archaeology without scrolling git blame.

- **`_periodicSyncRunning` declaration (line ~26654)** — left in place. Dead let (the stub no longer assigns it). Same treatment as `_unsubscribeSurveys` from v2460: removing a dead module-private variable alongside a scope-limited stub-replacement would drift into unrelated cleanup. Flagged for the module-wide dead-state sweep whenever that happens.

- **`init()` comment block (around line 27328)** — the "NEUTERED STUBS" map line gains `periodicSync() — v2461`:

  ```
  NEUTERED STUBS (throw on call): startListening(), initialSync() — v2460
                                  periodicSync() — v2461
  ```

  A short explanatory sentence is added after the map: "All three bidirectional-sync bodies have been replaced with the same console.error + console.trace + throw pattern so any accidental re-wire surfaces synchronously in the stack trace."

- **Export-site comment at `periodicSync` (around line 27373 in the module's `return {...}` block)** — gets a v2461 amendment noting the body is now a stub.

- **Startup console.log** — bumped to v2461 and the orphaned-engines list extended: `[Sync] v2461: Manual Firebase sync only. Photos auto-backup to Drive only; Firebase reached via 💾 Save / ☁️ Force push / ⬇️ Force pull / 🗑️ Delete cloud copy. Orphaned sync engines (startListening, initialSync, periodicSync) throw on call.`

- **pullNow-removal comment (around line 27346)** — updated to reflect that all three bodies are now stubs, not just orphaned.

**`sw.js`:** `CACHE_NAME` → `kiki-marine-v2461`.

**`index.html`:** `<meta name="app-version">` → `v2461`; all 7 core-module cache-busters → `?v=2461`.

---

### Updated Firebase surface map (post-v2461)

**USER-INITIATED (manual only — unchanged since v2459):**

- `backupAllEverywhere()` — home-screen "💾 Save All Surveys" button.
- `saveSurveyWithProgress()` — bottom-bar "💾 Save" on an open survey.
- `☁️ Force push to cloud` (overflow menu) — per-survey push.
- `⬇️ Force pull from cloud` (overflow menu) — per-survey pull.
- `🗑️ Delete cloud copy` (overflow menu, v2457) — per-survey destructive.

**AUTO-PUSH:** (none — emptied in v2459)

**NEUTERED STUBS — throw on call:**

- `startListening()` — onSnapshot real-time sync engine. Throws since v2460.
- `initialSync()` — batch local+remote reconciler. Throws since v2460.
- `periodicSync()` — 5-minute two-way reconciler. Throws since v2461 (new this release).

**ORPHANED-BUT-LIVE:** (none — v2461 closes this category)

This is the first release since the manual-sync program started (v2426) where there is no dormant bidirectional-sync body anywhere in the module. Every Firebase write path is now either explicit manual-button or an immediately-throwing stub.

---

### Dead-state follow-up (future release, not in this one)

Three module-private lets are now fully dead:

- `_unsubscribeSurveys` (since v2460 — `startListening` no longer assigns it)
- `_periodicSyncRunning` (since v2461 — `periodicSync` no longer assigns it)
- `_lastSyncTimestamp` (since v2461 — was read and written only by `periodicSync`)

All three are private to the IIFE with zero external footprint. Removing them is a mechanical cleanup that should be done as a single dead-state sweep alongside any other orphaned variables discovered in a full module audit — not piecemeal as part of a feature release. This note exists so future-Dave can grep the CHANGELOG for "dead-state follow-up" and find the inventory.

---

### How to verify

*Stub throws when called:*

1. Open Safari Web Inspector → Console on the running app.
2. Type `FirebaseSync.periodicSync`. Expect: `undefined` (it's private to the IIFE and was never exported — confirming the v2426 unexport still holds).
3. Confirm no call site remains in-module: `grep -n 'periodicSync' app.js` should show the function definition plus comment-only references (CHANGELOG-style archaeology). Zero live callers.

*Startup banner confirms neutering:*

4. Fresh load. The startup console line should begin `[Sync] v2461:` and end with `Orphaned sync engines (startListening, initialSync, periodicSync) throw on call.`

*Version atoms coherent:*

5. View page source: `<meta name="app-version" content="v2461">`, all seven `?v=2461` cache-busters present.
6. DevTools → Application → Service Workers: active worker is `kiki-marine-v2461`.
7. DevTools → Application → Cache Storage: a bucket named `kiki-marine-v2461` exists; old `kiki-marine-v2460` bucket should be gone after activate (per v2392 atomic install + v2391 handshake).

*Behaviour unchanged from v2460:*

8. Snap a photo, wait 5 seconds → `✓ N photos backed up to Drive` banner fires; no Firebase network activity in DevTools → Network.
9. Save a survey via bottom-bar 💾 → Firebase Save still works (user-initiated path, untouched by this release).
10. 🗑️ Delete cloud copy overflow button still works (user-initiated path, untouched).

If any of 1–10 regresses, roll back to v2460.

---

## v2460 — 2026-04-21
### Neutered — `startListening()` + `initialSync()` replaced with loud-failure stubs (P1 hardening — removes the last two dormant bidirectional-sync bodies so they cannot be accidentally re-wired)

**Why this release exists.** v2426 through v2459 closed every live Firebase auto-sync path. But two orphaned functions — `startListening()` and `initialSync()` — still carried their full, working implementations inside the `FirebaseSync` IIFE. `startListening()` had the complete `onSnapshot` real-time sync engine (richness guard, cloud-delete-refusal, toast-on-remote-update). `initialSync()` had the complete "walk every local and remote survey, reconcile by timestamp, pull or push the delta" loop. Both were unreachable in v2459 — no callers, not exported, private to the IIFE — but their bodies sat there fully wired, one grep-to-rename or one well-meaning refactor away from flipping bidirectional auto-sync back on.

The Ex-Ta-Sea disappearance (2026-04-10 and 2026-04-19) traced directly to the `change.type === 'removed'` branch inside `startListening`'s onSnapshot handler. That branch was fixed defensively in v2412 (refuses cloud-driven deletes, re-pushes local) — but the rest of the engine stayed dormant, not gone. A future re-wire could still reintroduce the richness-guard logic being wrong on a partial write, or the "pull remote when remote is newer" branch overwriting a fresh local edit whose `lastModified` wasn't bumped (e.g. during a schema migration). The fix is to delete the bodies entirely so the blast radius doesn't exist.

---

### Why loud-failure stubs instead of deletion

Three options considered:

1. **Delete the functions outright.** Cleanest. But if any code path anywhere (including future code, pasted console commands, or a stale bookmarklet) calls `FirebaseSync._private.startListening` via a reflection trick, the `undefined is not a function` error is cryptic and doesn't name v2460 or explain what to do instead.
2. **Keep the body, add an `if (false) return;` guard.** Worst of both worlds: body still sits there, the guard is a diff readers will be tempted to remove.
3. **Replace body with loud-failure stub (console.error + console.trace + throw).** This is what Dave drafted. The throw stops execution immediately. The `console.error` names the version and directs callers to the replacement API. The `console.trace` gives a stack breadcrumb naming the caller site. If a future contributor accidentally calls one of these, they see the error, open DevTools, and have everything they need in under 10 seconds: what was removed, why, and what to use instead.

Went with option 3. Dave's drafted stubs (locked in via conversation, not changed):

```js
function startListening() {
  console.error('[Sync] startListening() is no longer supported. The onSnapshot real-time sync engine has been removed. Firebase reads must be per-survey via pullSurvey/peekCloudSurvey.');
  console.trace('[Sync] startListening call trace');
  throw new Error('startListening removed — use per-survey pullSurvey/peekCloudSurvey');
}

async function initialSync() {
  console.error('[Sync] initialSync() was removed in v2458. See CHANGELOG. This is a bug — the call path that reached here should be rewritten around pullSurvey/pushSurvey.');
  console.trace('[Sync] initialSync call trace');
  throw new Error('initialSync removed — use per-survey pullSurvey/pushSurvey');
}
```

Note the deliberate asymmetry: `initialSync`'s message references v2458 (when it was first orphaned by the `pullNow` removal), while `startListening`'s message drops the version chatter and leads with what the caller should use instead. Per Dave: "lead with what the caller should use instead." `initialSync` keeps the one version tie to v2458 because its history has a clean anchor; `startListening` has been orphaned across multiple versions so a version tag would be noise.

---

### What changed in code

**`app.js`:**

- **`startListening()` (around line 26853)** — full onSnapshot body replaced with the three-line stub. Removed: the `onSnapshot` subscription, the `_unsubscribeSurveys` assignment, the `added`/`modified`/`removed` branches including the v2167 richness guard, the v2412 cloud-delete-refusal branch, the `updateSyncStatusUI('synced', ...)` / `('error', ...)` calls, the `updateSyncStatusUI` callback block. Kept: function signature, the enclosing IIFE scope. The comment block above the stub explains why the loaded bodies had to go (grep-to-rename risk, Ex-Ta-Sea failure-mode history).
- **`initialSync()` (around line 27218)** — full reconcile loop replaced with the three-line stub. Removed: the `getAllSurveys` + `fsDb.collection('surveys').get()` dual-fetch, the local-newer push branch (including `pushAllPhotosForSurvey`), the remote-newer pull branch (including `pullPhotosForSurvey`), the orphan-remote-survey pull loop, the `updateSyncStatusUI('synced', 'Initial sync complete')` call. Kept: function signature as `async` so existing `await initialSync()` would still be valid syntax if anything (nothing currently) called it.
- **`_unsubscribeSurveys` declaration (line 26646)** — left in place. It's now a dead let (startListening no longer assigns it), but removing it alongside the stub would drift into unrelated cleanup. The variable is private to the IIFE so it has no external footprint. Flagged for future module-level cleanup if we ever do a full sync-module rewrite.
- **`init()` comment block (around line 27356)** — gains a v2460 amendment explaining the neutering. The Firebase-surface map inside that block grows a new line: `NEUTERED STUBS (throw on call): startListening(), initialSync() — v2460`.
- **Startup console.log** — `[Sync] v2460: Manual Firebase sync only. Photos auto-backup to Drive only; Firebase reached via 💾 Save / ☁️ Force push / ⬇️ Force pull / 🗑️ Delete cloud copy. Orphaned sync engines (startListening, initialSync) throw on call.` Replaces the v2459 string.

**`sw.js`:** `CACHE_NAME` → `kiki-marine-v2460`.

**`index.html`:** `<meta name="app-version">` → `v2460`; all 7 core-module cache-busters → `?v=2460`.

---

### What about `periodicSync()`?

Considered leaving `periodicSync()` alone (it's the third orphaned sync function, orphaned since v2426, body still live) vs. stubbing it in the same release. Kept it out of scope for v2460 because:

1. Its body is ~70 lines of a single-loop pattern — smaller blast radius than `startListening`'s 120-line onSnapshot handler with three change-type branches.
2. It already has a `_periodicSyncRunning` overlap guard, a `_backupActive` check, and a `_lastSyncTimestamp` throttle — three layers of self-gating that make accidental invocation less likely to cascade.
3. One-feature-per-version is the rule. If `periodicSync` should also be stubbed, it gets its own version (v2461+) with its own three-pass QC.

The v2460 comment block at `init()` does NOT claim `periodicSync` is neutered. It remains orphaned-but-live, same treatment as it had under v2459.

---

### Updated Firebase surface map (post-v2460)

**USER-INITIATED (manual only — unchanged from v2459):**

- `backupAllEverywhere()` — home-screen "💾 Save All Surveys" button.
- `saveSurveyWithProgress()` — bottom-bar "💾 Save" on an open survey.
- `☁️ Force push to cloud` (overflow menu) — per-survey push.
- `⬇️ Force pull from cloud` (overflow menu) — per-survey pull.
- `🗑️ Delete cloud copy` (overflow menu, v2457) — per-survey destructive.

**AUTO-PUSH:** (none — emptied in v2459)

**NEUTERED STUBS — throw on call (new in v2460):**

- `startListening()` — was the onSnapshot real-time sync engine. Now throws `Error('startListening removed — use per-survey pullSurvey/peekCloudSurvey')`.
- `initialSync()` — was the batch local+remote reconciler. Now throws `Error('initialSync removed — use per-survey pullSurvey/pushSurvey')`.

**ORPHANED-BUT-LIVE (body still present, no callers — candidates for future stubbing):**

- `periodicSync()` — ~70-line reconciler, orphaned since v2426. Scope for a future release.

---

### How to verify

*Stubs actually throw:*

1. Open Safari Web Inspector → Console. Type `FirebaseSync.startListening` and press enter. Expect: `undefined` — the function is private to the IIFE and never exposed on the public export. This is unchanged from before v2460 (it was always private).
2. Type `Object.keys(FirebaseSync).includes('startListening')`. Expect: `false`.
3. Same for `initialSync`. These two were never on the public API and still aren't. So from a Dave-facing console surface, nothing about the v2460 change is directly observable — which is the point. The change is about code-reachability inside the IIFE, not about what's exposed.

*Nothing in the app calls them during normal use:*

4. Hard-reload the app. Open DevTools Console. Expect: no `[Sync] startListening call trace` or `[Sync] initialSync call trace` entries. Normal startup should show only `[Sync] v2460: Manual Firebase sync only...`.
5. Exercise the full manual-sync surface: open a survey, tap `💾 Save`, tap `☁️ Force push to cloud`, tap `⬇️ Force pull from cloud`, tap `🗑️ Delete cloud copy`, navigate home, tap `💾 Save All Surveys`. Expect: no stub-error traces at any point. Each manual path uses `pushSurvey` / `pullSurvey` / `peekCloudSurvey` / `removeSurvey` / `pushAllPhotosForSurvey` — none of them touches the neutered stubs.

*Stubs remain callable (self-test):*

6. If you want to prove the stubs work, you can reach into the IIFE via closure variables only if they were exported — which they aren't. So the stubs are effectively unreachable from the console. This is correct: the stubs are a defense against future code changes (accidental re-wire, automated refactor, copy/paste), not a user-facing feature.

*Startup log reflects the new state:*

7. Console should show `[Sync] v2460: Manual Firebase sync only. Photos auto-backup to Drive only; Firebase reached via 💾 Save / ☁️ Force push / ⬇️ Force pull / 🗑️ Delete cloud copy. Orphaned sync engines (startListening, initialSync) throw on call.`

*Version atomicity:*

8. `document.querySelector('meta[name=app-version]').content` → `v2460`. `caches.keys()` → `['kiki-marine-v2460']`. Inspect script tags in index.html → all core-module `?v=2460`. Console `APP_VERSION` → `v2460`.

*Photo backup still works (regression check):*

9. Capture 3 photos. Wait 6 seconds. Expect: 3 Drive uploads in the Network tab (`www.googleapis.com/upload/drive/v3/files`), zero Firebase Storage uploads. Badge turns green `☁️ 3/3`.

*Manual push still works (regression check):*

10. Tap bottom-bar `💾 Save`. Expect: Firestore writes + Storage uploads for any photos that weren't already in cloud. No stub-error traces.

---

### Risk analysis

**What could break:**

- Any code path that reaches `startListening()` or `initialSync()` will now throw instead of no-op-ing. In v2459 these were unreachable — no callers, not on the public API. In v2460 they remain unreachable. So the downside risk is zero under current code.
- **If a future PR accidentally exposes or calls one of these,** the stub will throw immediately with a clear error and a stack trace. That's a feature: the failure mode is loud and easy to diagnose, vs. the v2459 behaviour where a newly-exposed `startListening` would silently re-enable auto-sync and we'd only notice when another Ex-Ta-Sea-style incident happened.

**What can't break:**

- Manual-sync surfaces (all five buttons). They never called these functions.
- Photo idle backup (`_processBackupQueue`). Drive-only since v2459; doesn't touch Firebase at all.
- Startup sequence. `FirebaseSync.init()` only sets `_syncEnabled = true` and logs; it never called `startListening` or `initialSync`.

---

### Locked-in requirement for v2430 Device Roles

v2430 Device Roles cannot use either of these stubs as building blocks. If a "report mode" wants batch-like reconciliation behaviour, it must implement it via iteration over per-survey `pullSurvey(id)` calls with an explicit per-survey confirm — not by re-enabling `initialSync`. Same for a "field mode" that might want real-time updates: that would need a fresh design against `pullSurvey` + a UI that shows the user exactly what's about to change, not a resurrection of `onSnapshot`.

---

## v2459 — 2026-04-21
### Removed — Firebase auto-push from `_processBackupQueue` (P0 correctness — closes the last auto-push seam; photos auto-backup to Drive only, Firebase is now manual-only end to end)

**Why this release exists.** v2455/v2456/v2457/v2458 landed the manual-sync contract across save, delete, and pull surfaces — but the photo idle-backup queue (5-second idle timer after `savePhoto()`) was still auto-pushing every captured photo to Firebase Storage on the way to Drive. That was explicitly flagged in the v2458 surface map as the remaining auto-push seam and deferred to its own release so v2458 stayed single-feature. v2459 is that release: `_processBackupQueue()` now uploads to Google Drive only. Firebase is reached exclusively through the explicit 💾 Save / ☁️ Force push / ⬇️ Force pull / 🗑️ Delete cloud copy buttons.

The **v2428 "local + Drive automatic, Firebase manual only"** contract is now complete: every code path that writes to Firebase requires a deliberate button tap.

---

### What `_processBackupQueue` was doing before v2459

`savePhoto()` writes a photo to IndexedDB instantly and queues its ID in `_pendingBackupIds`. A 5-second idle timer (`_resetIdleTimer()`) starts when the user stops activity. When the timer fires, `_processBackupQueue()` walks the queue and, for each photo: (a) loads it from IDB, (b) pushes to Firebase Storage if Firebase is connected, (c) pushes to Google Drive if Drive is signed in, (d) removes from the queue on success.

The Firebase push (step b) was firing automatically on every photo capture — no confirm, no user action. That contradicted the v2428 contract and was the last remaining auto-push path after v2455/v2456.

---

### Four reasons to strip the Firebase auto-push (and keep Drive)

1. **Contract consistency.** Every other Firebase write path is now manual (v2455 save-pill, v2456 delete wrappers, v2458 pullNow). The photo idle queue was the only remaining place where an ordinary user action (capturing a photo) silently triggered a Firebase write. Asymmetry like this is how Dave ended up surprised by unexpected cloud state in the first place.

2. **Drive is a better fit for the idle auto-path.** Drive backup uses resumable uploads, survives token refresh, handles large photos in chunks, and offers a user-visible folder in the user's own Google account. Firebase Storage auto-pushes are less resilient, less visible, and less directly-controlled by Dave.

3. **Firebase Storage cost + quota concerns.** Every auto-push consumes Storage bytes. Across a full survey (200+ photos) that adds up, and since the contract is "user explicitly pushes when they want a cloud snapshot," a silent auto-push is work (and cost) that wasn't asked for.

4. **Delete-resurrection lite.** Photos auto-pushed to Firebase Storage persist until manually removed via the 🗑️ Delete cloud copy button. If a photo is deleted locally and the cloud copy is later pulled (via the per-survey ⬇️ Force pull from cloud), the resurrected cloud photo could surprise Dave — same pattern as the v2458 survey-resurrection fix but at photo granularity. Stripping the auto-push eliminates the seam.

---

### What changed in code

**`app.js`:**

- **`_processBackupQueue()` (around line 2537)** — the `firebaseOk` local is removed; the `!firebaseOk && !driveOk` guard becomes `!driveOk` with the warning `"Drive backup not connected — Sign in to Google Drive to auto-backup photos"`. The `if (firebaseOk) { await FirebaseSync.pushPhoto(photo); _backupStats.firebase++; }` block is deleted; a comment replaces it explaining that Firebase is reached only via the explicit buttons. The final "photos backed up" banner simplifies to `✓ N photos backed up to Drive`. The queue no longer references Firebase at all.
- **`_backupStats` declaration** — adds a `drive: 0` counter alongside the existing `firebase: 0`. `_backupStats.drive` is incremented on each Drive success in the queue loop. `_backupStats.firebase` stays declared (legacy readers; a future Device Roles mode might bring it back) but the idle path no longer increments it.
- **`_updateBackupStatusUI()` (around line 3739)** — the bottom-bar backup badge is rewired to count Drive instead of Firebase. Green when all queued photos have landed in Drive; amber if queued or partial; red if none backed up. Firebase connection state no longer affects the badge colour (Firebase is user-initiated elsewhere with its own progress UI).
- **Startup backup-readiness check (around line 25530)** — the "no cloud backup connected" warning now fires when **Drive** isn't signed in (previously fired only when both were off). Drive is the automatic protection path now, so its absence is the actionable state. If Firebase is off but Drive is on, that's a normal state — `console.log` only.
- **`init()` comment block (around line 27430)** — adds a v2459 amendment explaining this strip; the "Paths that still invoke Firebase" map's AUTO-PUSH section now reads `(none — emptied in v2459)`.
- **Startup console.log** — `[Sync] v2459: Manual Firebase sync only. Photos auto-backup to Drive only; Firebase reached via 💾 Save / ☁️ Force push / ⬇️ Force pull / 🗑️ Delete cloud copy.` Replaces the v2458 string.

**`sw.js`:** `CACHE_NAME` → `kiki-marine-v2459`.

**`index.html`:** `<meta name="app-version">` → `v2459`; all 7 core-module cache-busters → `?v=2459`.

---

### Updated Firebase surface map (post-v2459 — final v2428 compliance)

**USER-INITIATED (all confirm-gated or explicit button):**

- `backupAllEverywhere()` — home-screen "💾 Save All Surveys" button. Pushes every local survey to Firebase + Drive. Explicit, user-triggered.
- `saveSurveyWithProgress()` — bottom-bar "💾 Save" on an open survey. Pushes the current survey to Firebase + Drive.
- `☁️ Force push to cloud` (overflow menu) — per-survey push with peek + confirm showing cloud vs local scores.
- `⬇️ Force pull from cloud` (overflow menu) — per-survey pull with peek + confirm. The only cross-device pull surface.
- `🗑️ Delete cloud copy` (overflow menu, v2457) — per-survey destructive with peek + confirm.

**AUTO-PUSH:** (none — emptied in v2459 ✓)

**REMOVED/ORPHANED (do NOT re-wire without re-auditing the manual-sync contract):**

- `FirebaseSync.pullNow()` — removed outright in v2458.
- `initialSync()` — orphaned in v2458; private, no callers, body kept for rollback only.
- `startListening()` / `stopListening()` — orphaned since v2426; onSnapshot real-time sync is dead.
- `periodicSync()` — orphaned in v2426; private, no callers, body kept for rollback only.
- Auto-push on `saveSurvey` / `saveEverywhere` — stripped in v2455.
- Auto-delete on `deletePhoto` / `deleteSurvey` — stripped in v2456.
- Auto-push in `_processBackupQueue` — stripped in v2459 (this release).

---

### How to verify

*Firebase auto-push is actually gone:*

1. Open Safari Web Inspector → Console with the **Network** tab filtered for `firebasestorage.googleapis.com`. On iPhone: Settings → Safari → Advanced → Web Inspector, then connect via Mac.
2. Capture 3 photos inside any checklist item. Do NOT tap any Save button. Wait 8 seconds (the 5s idle timer plus a couple of upload ticks).
3. Expect: **zero** POST requests to `firebasestorage.googleapis.com`. Previously (v2458) you'd see 3 uploads to Firebase Storage within ~10 seconds of capture.
4. If Drive is signed in, you WILL see POST requests to `www.googleapis.com/upload/drive/v3/files` for those 3 photos. The Drive backup still happens — it's the intended auto-path.

*Manual Firebase push still works (regression check):*

5. Open a survey with the 3 new photos. Tap the bottom-bar `💾 Save` button. Expect: Firebase Storage uploads for all 3 photos in the Network tab, plus the survey doc write to Firestore. This is the manual path — it should work.
6. Tap the overflow `☁️ Force push to cloud`. Expect: confirm dialog, then the same upload pattern. Manual push surfaces are unchanged.

*Bottom-bar backup badge reflects Drive, not Firebase:*

7. With Drive signed OUT and Firebase connected: capture 2 photos. The badge should show red `🚨 0/2` (because Drive — the auto path — has backed up nothing). Tapping the badge or hovering shows `No photos backed up to Drive! Sign in to Google Drive.` Pre-v2459 it would have shown green if Firebase had completed.
8. Sign in to Drive. Wait 6 seconds. Badge turns amber `⏳ 2 queued`, then green `☁️ 2/2 All 2 photos backed up to Drive` once the queue drains.

*Startup warning fires on missing Drive:*

9. With Drive signed out (Firebase state irrelevant), hard-reload the app. After 3 seconds expect the red warning bar at the top: `⚠️ Drive backup not connected — Sign in to Google Drive so photos auto-backup as you work`. Pre-v2459 this warning only fired when BOTH were off.
10. Sign in to Drive. Hard-reload. Expect: no warning bar. Console shows `[Backup] Drive connected (auto) + Firebase connected (manual) ✓` (or the "manual push disabled" variant if Firebase is off — both are fine states).

*Startup log reflects the new state:*

11. Console should show `[Sync] v2459: Manual Firebase sync only. Photos auto-backup to Drive only; Firebase reached via 💾 Save / ☁️ Force push / ⬇️ Force pull / 🗑️ Delete cloud copy.`

*Version atomicity:*

12. In DevTools: `caches.keys()` → expect `['kiki-marine-v2459']`. `document.querySelector('meta[name=app-version]').content` → expect `v2459`. Inspect `<script>` tags in index.html → all core-module `?v=2459`. Console `APP_VERSION` → `v2459`.

---

### Locked-in requirement for v2430 Device Roles

v2430 Device Roles (field-mode iPhone vs report-mode Mac) can now assume the Firebase surface is entirely manual. A future "field mode" that wanted to re-enable auto-push for photos would need to: (a) be explicit in the UI ("field mode auto-syncs photos to Firebase — you'll see network activity during capture"), (b) show a visible progress indicator per photo, and (c) not reuse `_processBackupQueue` — it would need its own code path so the Drive-only automatic behaviour remains the default for every other mode. The v2459 strip is intentionally simple: one code path, one destination.

---

## v2458 — 2026-04-21
### Removed — `FirebaseSync.pullNow()` batch-pull escape hatch (P0 correctness — closes v2456's one remaining delete-resurrection path)

**Why this release exists.** v2456 stripped the auto-delete hooks so ordinary local deletes would stop silently wiping Firebase. v2457 added the `🗑️ Delete cloud copy` button and hardened the cascade so manual cloud cleanup actually works. But there was one piece left on Dave's original three-item stability priority: `FirebaseSync.pullNow()` — a console-only batch-pull escape hatch that iterated every local+remote survey and overwrote local from cloud via `initialSync()`. After v2456/v2457, that function became the single path that could still silently resurrect a deliberately-deleted survey: if Dave deleted a survey locally (which no longer touches the cloud) and then later typed `FirebaseSync.pullNow()` in DevTools for any unrelated reason, the cloud copy would re-create the local record with no warning. v2458 removes the function entirely.

**Dave's original three-item priority (from v2455 audit).** ✅ `saveEverywhere` strip (v2455), ✅ delete-hook strip (v2456), ✅ 🗑️ Delete cloud copy button + cascade hardening (v2457), ✅ `pullNow()` removal (this commit). Manual-sync model is now complete.

---

### What `pullNow()` was and why it had to go

`FirebaseSync.pullNow()` was added in v2426 as the console-level replacement for the bidirectional auto-sync that v2426 disabled. It delegated to the private `initialSync()` function, which pulls every survey from Firestore whose cloud timestamp beats local (and pushes the reverse). It was never wired to any UI — Dave ran it in Safari Web Inspector / Chrome DevTools on the Mac as a "load everything from iPhone" step when starting a report session.

**Four reasons it had to go:**

1. **Delete-resurrection risk.** This is the blocker. Post-v2456, a local delete no longer auto-propagates to Firebase (by design — cloud delete is now explicit via the 🗑️ button). So the cloud retains copies of deleted surveys until Dave manually removes them. If `pullNow()` ran for any reason against a cloud that still held a deleted survey, the survey would re-appear in local IDB. No confirm dialog, no warning. The one lingering path that could reverse a deliberate delete — gone.

2. **Redundant with the per-survey pull.** v2428 introduced the per-survey `⬇️ Force pull from cloud` overflow button (calls `pullSurvey(id)` + `pullPhotosForSurvey(id)` with a confirm dialog showing rated-items / photo count / last-modified before overwrite). Every legitimate pull use-case is covered by that button with stronger guarantees: explicit per-survey intent, visible before-state, and no risk of touching other surveys as collateral.

3. **Console-only surface invites forgotten invocations.** A console command with no UI means Dave could type it months from now after the mental model of "this is safe" has faded, and not remember that the cloud state it pulls from may no longer be authoritative. Removing the function means the DevTools autocomplete won't even offer it.

4. **Violated the v2428 "manual sync, per-survey explicit" contract in spirit.** v2428 said all Firebase reads and writes should be per-survey and user-confirmed. `pullNow()` was a batch-all read that bypassed the confirm dialog. Keeping it while removing every other batch sync path was inconsistent.

---

### What changed in code

**`app.js`:**

- **Function deleted** — the entire `async function pullNow()` body at the former line 27471 is gone. Replaced with a comment block explaining the removal so anyone grep-ing for the name sees the rationale instead of wondering why it's missing.
- **Public API export** — `pullNow` removed from the IIFE's return object (sat next to `periodicSync`'s equivalent v2426 removal comment, now gets its own v2458 removal comment for the same treatment).
- **`initialSync()` marked orphaned** — its only caller was `pullNow`. Body stays for diff legibility / rollback (same treatment as `periodicSync` after v2426), with a clear comment that future re-wiring would recreate the delete-resurrection risk.
- **Four doc/comment sites cleaned up** — the v2427 dismiss-memory comment no longer lists `pullNow` as a clearing path; the v2428 `pushSurvey` caller-contract comment no longer references `pullNow` as a caller; the v2426 cross-device-pulls paragraph rewritten around the per-survey ⬇️ button as the sole pull surface; the `init()` comment block gains a v2458 amendment explaining the removal in context of v2455/v2456/v2457.
- **Startup log** — `[Sync] v2458: Manual Firebase sync only. Saves/deletes do not auto-sync. Batch pullNow() removed — use per-survey ⬇️ Force pull from cloud.` Replaces the v2457 string.

**`sw.js`:** `CACHE_NAME` → `kiki-marine-v2458`.

**`index.html`:** `<meta name="app-version">` → `v2458`; all 7 core-module cache-busters → `?v=2458`.

---

### Updated Firebase surface map (post-v2458)

**USER-INITIATED (all confirm-gated, all per-survey or explicit batch):**

- `backupAllEverywhere()` — home-screen "💾 Save All Surveys" button. Pushes every local survey to Firebase + Drive. Explicit action, progress UI, user-triggered.
- `saveSurveyWithProgress()` — bottom-bar "💾 Save" on an open survey. Pushes the current survey to Firebase + Drive.
- `☁️ Force push to cloud` (overflow menu) — per-survey push with peek + confirm showing cloud vs local scores.
- `⬇️ Force pull from cloud` (overflow menu) — per-survey pull with peek + confirm. **The only cross-device pull surface after v2458.**
- `🗑️ Delete cloud copy` (overflow menu, v2457) — per-survey destructive with peek + confirm.

**AUTO-PUSH (still fires during ordinary use — future-version scope, not in v2458):**

- `_processBackupQueue()` — 5-second idle timer after `savePhoto()`, pushes the queued photo(s) + parent survey to Firebase. This is the remaining auto-push seam; leaving it for a later release so v2458 stays single-feature.

**REMOVED/ORPHANED (do NOT re-wire):**

- `FirebaseSync.pullNow()` — removed outright in v2458.
- `initialSync()` — orphaned in v2458; private, no callers, body kept for rollback only.
- `periodicSync()` — orphaned in v2426; private, no callers, body kept for rollback only.
- Auto-push on `saveSurvey` / `saveEverywhere` — stripped in v2455.
- Auto-delete on `deletePhoto` / `deleteSurvey` — stripped in v2456.

---

### Locked-in requirement for v2430 Device Roles

v2430 Device Roles (field-mode iPhone vs report-mode Mac) was originally going to wire `pullNow()` into the mode switcher — e.g., "entering report mode runs pullNow to load latest from cloud". That's now impossible (function doesn't exist) AND undesirable (would resurrect deleted surveys). v2430 MUST instead either: (a) list cloud surveys and let Dave tap per-survey Pull for each one he wants, or (b) if a batch pull is built, gate it on first asking "these N surveys were deleted locally — do you want them resurrected, or do you want to delete them from cloud first?" with the v2457 🗑️ Delete cloud copy button available in the same UI.

---

### What's left on the stability checklist

✅ v2455 save-pill Firebase strip  
✅ v2456 delete-hook Firebase strip  
✅ v2457 🗑️ Delete cloud copy button + cascade hardening  
✅ v2458 `pullNow()` removal (this commit)  

All four items from Dave's v2455 audit are now landed. Remaining Firebase auto-push seams (separate tasks, future versions):

- **Photo idle-backup queue** (`savePhoto` → `_pendingBackupIds` → `_processBackupQueue`, 5s-idle after capture). Still auto-pushes photos + parent survey to Firebase during ordinary field use. Largest remaining asymmetry vs. the "manual Firebase" model; will need its own design decision (surface-as-pending UI? or strip entirely and rely on the manual ☁️ Force push?).
- **Bottom-bar "💾 Save" button** (`saveSurveyWithProgress`) still pushes to Firebase. User-initiated but asymmetric with the save-pill (which is local+Drive only post-v2455); UX polish task.

---

### How to verify

*pullNow is actually gone:*

1. Open Safari Web Inspector → Console. Type `FirebaseSync.pullNow` and press enter. Expect: `undefined` (or a ReferenceError if typed without the object prefix). Pre-v2458 it would have printed `async function pullNow()`.
2. Type `FirebaseSync.pullNow()` and press enter. Expect: `TypeError: FirebaseSync.pullNow is not a function`. Do NOT expect any sync activity — no "Pulling from Firebase..." log, no network calls.
3. Check `Object.keys(FirebaseSync)` in the console — `pullNow` is no longer in the list. `pullSurvey`, `pullPhotosForSurvey`, and the 🗑️ `removeSurvey` / `removePhoto` helpers are still there.

*Per-survey pull still works (regression check):*

4. Open a survey that has a richer cloud copy than local (e.g., push from iPhone, edit-and-save locally to make it thinner). Open `⋯` → tap `⬇️ Force pull from cloud`. Confirm dialog shows cloud snapshot. Tap Pull. Verify the survey reloads with the cloud state.
5. No other surveys were touched. Navigate back to home, open a different survey — unchanged from before step 4.

*Delete-resurrection path is actually closed (the whole point of v2458):*

6. Delete a survey locally (via the overflow `🗑️ Delete survey` or home-screen swipe). Confirm it's gone from the home list.
7. Verify the cloud copy still exists (it should, post-v2456): Firebase Console → Firestore → surveys collection → survey ID is still there.
8. In the Safari Web Inspector console, attempt `FirebaseSync.pullNow()`. Expect the TypeError from step 2 — no pull happens, the deleted survey does NOT re-appear in IDB.
9. (Optional — the other way to get the cloud copy back into local is per-survey pull, but the survey is deleted locally so there's no overflow menu to tap from; this is correct — the survey is deleted and staying deleted until Dave explicitly chooses to re-create it by running a push from another device that still has it, or by manually typing the ID.)

*Startup log reflects the new state:*

10. Hard-reload the app (Cmd-Shift-R or close the PWA and reopen). Console should show `[Sync] v2458: Manual Firebase sync only. Saves/deletes do not auto-sync. Batch pullNow() removed — use per-survey ⬇️ Force pull from cloud.`

---

## v2457 — 2026-04-21
### Added — `🗑️ Delete cloud copy` overflow button + hardened `removeSurvey` / `removeAllPhotosForSurvey` cascade (P0 correctness — closes the gap v2456 opened)

**Why this release exists.** v2456 stripped the `deletePhoto` / `deleteSurvey` auto-delete hooks so ordinary local deletes would stop silently wiping Firebase. That fix was correct but incomplete on its own — with no manual replacement, any survey deleted locally would linger in Firebase indefinitely and could resurrect on a future pull. Dave flagged this in his audit: *"This commit is only correct if your manual push flow has a real way to remove deleted photos/surveys from Firebase later. Otherwise they will stay in the cloud and may come back on a later pull."* v2457 closes that gap with two pieces: a deliberate destructive UI affordance, and a hardened cascade underneath it so the affordance can't leave orphan Storage blobs.

Dave's directive (verbatim for this release): *"A: strip the auto-delete hooks + add the 🗑️ Delete cloud copy button in the same release + make the confirm dialog very explicit: vessel name, rated items, photo count, last modified, 'local copy will remain untouched'. On success show a clear toast. On failure show a visible error, not just a console log. One caution: make sure `removeSurvey` really deletes the survey doc and its cloud photos, or the button will look complete but leave orphaned storage behind."* The strip landed in v2456; the button + cascade hardening land in v2457.

---

### Part 1 — New `🗑️ Delete cloud copy` overflow-menu button

**Where it lives.** Survey overflow menu (`⋯`), in the cloud-sync cluster with `☁️ Force push to cloud` and `⬇️ Force pull from cloud`. Directly below the Force pull button, above the recovery divider. Destructive-red styling (`color: #b91c1c`) distinguishes it at a glance from the two non-destructive sync actions. Element id: `manualDeleteCloudBtn`.

**UX flow (matches the spec point-for-point).**

1. **Guard.** If Firebase sync isn't active on the device (`!FirebaseSync.isEnabled() || !window.fsDb`), alert and bail — no half-state where the button looks live but can't do anything.

2. **Peek first.** Call `FirebaseSync.peekCloudSurvey(currentSurveyId)`. Three outcomes:
   - **Cloud copy exists** → proceed to confirm dialog with full snapshot.
   - **`null` (clean miss, no cloud copy)** → alert `No cloud copy of "<vessel>" exists. Nothing to delete.` — button does not pretend to work when there's nothing there.
   - **Peek throws (network/auth)** → alert `Could not reach the cloud — check connection and try again.` Never proceed to destructive action on unknown cloud state.

3. **Confirm dialog (exactly Dave's spec).**
   - `Delete cloud copy of "<vessel>"?` header in destructive red.
   - `<strong>Cloud copy (will be removed):</strong>` — the `_snapshotSummary(cloudCopy)` block: rated items count, photo count, last modified.
   - Green footnote: `This device's local copy will remain untouched.`
   - Red warning footnote: `Firestore survey doc, all photo docs, and all Storage blobs for this survey will be deleted from Firebase. This cannot be undone from the app — you'd need to push from another device that still has the data.`
   - Primary button `Delete cloud copy` / secondary `Cancel`.

4. **Execute.** Calls the hardened `FirebaseSync.removeSurvey(currentSurveyId)` (see Part 2). Button shows `🗑️ Deleting…` and is disabled during the operation.

5. **Inspect the structured result** `{ surveyDocDeleted, photos: { deleted, failed: [...] }, error }`:
   - **Full success** (`surveyDocDeleted === true && !error && photos.failed.length === 0`): toast `🗑️ Cloud copy of "<vessel>" deleted (N photos).` (uses `showToast` when available, falls back to `showAlert`).
   - **Any failure**: visible `showAlert` (not a silent console.error) titled `Delete cloud copy — incomplete`, listing:
     - top-level error code,
     - photo-query error (if the initial query failed),
     - up to 5 failed photo IDs with their stage (`storage`, `storage-no-ref`, `doc`) and error message, plus `… and N more` if the list was truncated,
     - explicit final line noting whether the survey doc was deleted (partial state — manual cleanup needed) or kept as anchor (retry is safe).

**Surfaces it's missing on purpose.** The button is per-survey, not batch. There is no "delete all cloud copies" affordance — that's exactly the kind of destructive batch command Dave's manual-sync model is meant to avoid. Cleaning up many cloud copies is still Firebase-Console work.

---

### Part 2 — Harden the cascade (`removeSurvey` + `removeAllPhotosForSurvey`)

**Why the primitives needed hardening, not just the button.** The button's failure-reporting is only as honest as what `removeSurvey` returns. The prior implementation silently swallowed failures at several points — a legitimate `storage/object-not-found` was lumped in with real network failures, and the outer try/catch aborted the whole cascade on the first exception. Bandaging the button to handle broken primitives would have papered over the same orphan-risk class Dave explicitly warned about in the v2456 audit (problem #5: partial-cascade orphan risk).

**`removeAllPhotosForSurvey` — before v2457.**

Silent `try { ... } catch (e) { /* may not exist */ }` around Storage delete ate every error equally; single outer try/catch around the loop aborted on the first Firestore doc delete failure, leaving remaining photos unattempted.

**`removeAllPhotosForSurvey` — v2457.**

- Per-photo try/catch around BOTH the Storage delete and the Firestore doc delete — one photo's failure no longer aborts the loop.
- `storage/object-not-found` is treated as **idempotent success** (blob is already gone; that's what we wanted). Any other Storage error is logged to `failed` with `stage: 'storage'`.
- Photos whose doc has no `storageRef` (legacy records from before the storageRef migration) are logged to `failed` with `stage: 'storage-no-ref'`. The Firestore doc is still deleted. Caller sees these in the result and can flag them for manual cleanup.
- Returns `{ deleted: int, failed: [{id, stage, error}], error?: string }`. The top-level `error` is only set on a pre-loop failure (`firebase-unavailable`, or the initial Firestore `.where('surveyId','==',surveyId).get()` throwing). Individual per-photo failures go into `failed[]` so the caller can show them in the UI.
- A photo only increments `deleted` if **both** `storageOk` and `docOk` are true — a photo where Storage succeeded but the doc delete failed (or vice versa) is counted as failed, not deleted. No false-positive success counts.

**`removeSurvey` — order flipped.**

Old order: `delete survey doc` → `cascade photos`. On cascade failure, the survey doc was gone but the photo docs were orphaned with no parent — and no way to retry the cascade because the query pivot (`surveyId == X`) was fine but the caller had nothing to do with the result.

New order: `cascade photos first` → `delete survey doc only if cascade fully succeeded`. On partial photo failure, the survey doc stays in Firestore as an **anchor** — Dave can retry the Delete cloud copy button, and `removeAllPhotosForSurvey` will pick up the photos that previously failed. The half-torn-down state is now recoverable instead of orphaned.

Returns `{ surveyDocDeleted: bool, photos: {...}, error?: string }`:

- `photos` is the verbatim return from `removeAllPhotosForSurvey` (or `{deleted: 0, failed: [], error: 'photo-cascade-threw'}` if the cascade itself threw — which it shouldn't anymore given the per-photo try/catch, but defensive).
- `error` surface values: `firebase-unavailable`, `photo-cascade-threw`, `photo-cascade-error: <msg>` (pre-loop failure from the cascade), `partial-photo-delete` (one or more photos in `failed[]`), `survey-doc-delete-failed: <msg>` (photos succeeded but doc delete rejected).
- `surveyDocDeleted` is only `true` if the final `.delete()` call succeeded. The button UI keys off exactly this flag for toast-vs-alert.

---

**Locked-in requirement for v2430 Device Roles.** The button is now available for manual cloud cleanup, but v2430 still needs to integrate it properly. The moment Device Roles re-introduces any pull-on-startup flow (field-mode → report-mode handoff, etc.), deleted-locally-but-still-in-cloud surveys will come back on pull unless the user has tapped 🗑️ Delete cloud copy. v2430 MUST prompt for cloud cleanup on delete (or auto-invoke the hardened cascade with explicit confirmation) before re-enabling any pull path, otherwise deletes will feel like they didn't stick.

**What else is left on the stability checklist.**

Dave's original three-item priority: ✅ saveEverywhere (v2455), ✅ delete-hook strip (v2456), ✅ 🗑️ Delete cloud copy button + cascade hardening (this commit), ⏳ `pullNow()` (v2458 — next up; was tentatively v2457 until the button + cascade earned its own release).

Two auto-push seams remain outside this commit's scope:

- **Photo idle-backup queue** (`savePhoto` → `_pendingBackupIds` → `_processBackupQueue`, 5s-idle after capture). Still auto-pushes photos + parent survey to Firebase during ordinary field use. Separate task, future version.
- **Bottom-bar "💾 Save" button** (`saveSurveyWithProgress`) still pushes to Firebase. User-initiated but asymmetric with the save-pill; UX polish task, future version.

**Files changed.** `app.js` (5 edit zones: `APP_VERSION` bump, init() comment amended with v2457 note, new `🗑️ Delete cloud copy` button block in showReportControls, hardened `removeSurvey`, hardened `removeAllPhotosForSurvey`; the delete-hook comment blocks at the file's bottom were retouched to reference v2457 as the release where the manual button shipped), `sw.js` (`CACHE_NAME` → v2457), `index.html` (meta + 7 cache-busters → v2457), this file.

**How to verify.**

*🗑️ Delete cloud copy — happy path:*

1. Open a survey that has a cloud copy. Open the `⋯` overflow menu — confirm the red **🗑️ Delete cloud copy** entry sits directly under ⬇️ Force pull from cloud.
2. Tap it. Button changes to `🗑️ Checking cloud…` briefly, then a confirm dialog appears with the vessel name in red, a `Cloud copy (will be removed):` block showing rated-items / photo count / last-modified, and both the green "local copy untouched" note and the red Firestore+Storage warning.
3. Tap **Delete cloud copy**. Button changes to `🗑️ Deleting…`. On success: a toast `🗑️ Cloud copy of "<vessel>" deleted (N photos).` Refresh Firebase Console — survey doc + all photo docs gone from Firestore, all blobs gone from Storage.
4. Local copy of the survey is still present on the device (navigate back and open it — all data intact).

*🗑️ Delete cloud copy — edge cases:*

5. Tap the button on a survey that has NO cloud copy (never pushed, or already deleted): alert `No cloud copy of "<vessel>" exists. Nothing to delete.` Button doesn't proceed.
6. Kill Wi-Fi and cellular. Tap the button: alert `Could not reach the cloud — check connection and try again.` No destructive action.
7. Simulate partial failure (e.g., revoke Storage permission on a single photo via Firebase Rules console, then tap the button): confirm dialog still appears; after confirm, the failure alert `Delete cloud copy — incomplete` lists the failed photo ID with stage `storage`, and explicitly states `Survey doc was NOT deleted (kept as anchor so you can retry).` Firebase Console shows the survey doc still present with remaining photos — retry is safe.

*v2458 preview.* Next up: remove `FirebaseSync.pullNow()`. With v2455 / v2456 / v2457 landed, the app's Firebase surfaces are: push via overflow `☁️ Force push to cloud`; pull via per-survey `⬇️ Force pull from cloud`; delete via per-survey `🗑️ Delete cloud copy`; plus the batch tools (`backupAllEverywhere`, `saveSurveyWithProgress`) and the idle-backup queue. `pullNow()` as a console-only batch escape hatch is redundant with per-survey pull and dangerous in combination with the now-stripped delete path (it's the one thing that could resurrect a local delete). Gone in v2458.

---

## v2456 — 2026-04-21
### Fixed — `deletePhoto` / `deleteSurvey` no longer auto-delete from Firebase (P0 correctness — manual-sync symmetry restored)

**Dave's audit.** After v2455 stripped the save-side Firebase auto-push, Dave audited the delete path and found that the symmetrical bug was still live: *"These two blocks violate [the local + Drive auto, Firebase manual-only rule]. They make deletes automatic to Firebase. Both hooks turn a local delete into a cloud delete without an explicit user action."*

**The five problems with the prior hooks** (all caught by Dave's audit, all fixed in v2456):

1. **Deletes were auto-syncing destructively.** `v2428` promised manual-only Firebase, but a local `deletePhoto` / `deleteSurvey` still force-removed the cloud copy without any explicit "yes, remove from cloud" confirmation. Direct contradiction of the v2428/v2455 contract.

2. **`deletePhoto` was missing the suppression check.** `deleteSurvey` had `!FirebaseSync.isSuppressed()` guarding the cloud call; `deletePhoto` did not. During restore / rebuild / recovery flows where sync is supposed to be suppressed, a local photo delete could still hit Firebase. Real latent bug — would have bitten during any future bulk-recovery flow.

3. **Local-first, cloud-second with silent `.catch`.** Both hooks deleted locally first, then fired-and-forgot the cloud delete with `.catch(err => console.error(...))`. Failures were invisible outside DevTools. Result: silent divergence — local record gone, cloud record stuck, no retry, no toast, no surface. If the survey or photo later got pulled from cloud somehow, it would resurrect with no explanation.

4. **No explicit confirmation for a destructive cloud action.** The local delete confirmation dialog doesn't mention cloud. If Firebase pushes need a deliberate tap, Firebase deletes need the same bar. The symmetry argument from v2455 applies verbatim.

5. **Partial-cascade orphan risk.** `FirebaseSync.removeSurvey(surveyId)` (`app.js:26657`) does cascade: it deletes the Firestore survey doc, then calls `removeAllPhotosForSurvey(surveyId)` to clean up Storage. Happy-path, no orphans. BUT: both are wrapped in a single try/catch with only `console.error`. If the Firestore doc delete succeeds and the Storage cascade fails partway (network hiccup, rate limit, one photo's delete rejects), you get: parent doc gone + some photos gone from Storage + **remaining photos orphaned with no Firestore parent and no retry/surface path**. Not *designed* to orphan, but not bulletproof either. (Fixed in v2457.)

**The fix.** Both hooks now run the local delete only and emit a `console.info` so Dave can see in DevTools that the cloud copy was deliberately left alone. The wrapper shape is preserved (not deleted entirely) so v2430's "☁️ Delete cloud copy" action has a hook point to graft onto. Both hooks include `!FirebaseSync.isSuppressed()` so no log spam during restore/rebuild flows — this corrects the pre-v2456 asymmetry where `deletePhoto` lacked that check.

**Before (v2455):**

```js
const _originalDeletePhoto = deletePhoto;
deletePhoto = async function(photoId) {
  const photo = await getPhotoById(photoId);
  const result = await _originalDeletePhoto(photoId);
  if (FirebaseSync.isEnabled() && photo) {
    FirebaseSync.removePhoto(photoId, photo.surveyId).catch(err => console.error('[Sync] Photo delete failed:', err));
  }
  return result;
};
```

**After (v2456):**

```js
const _originalDeletePhoto = deletePhoto;
deletePhoto = async function(photoId) {
  const result = await _originalDeletePhoto(photoId);
  if (FirebaseSync.isEnabled() && !FirebaseSync.isSuppressed()) {
    console.info(`[Sync] Photo ${photoId} deleted locally. Cloud deletion will occur only if you confirm it manually.`);
  }
  return result;
};
```

**Note on the `result &&` guard that's NOT in the final code.** Dave's first drafts proposed `if (result && FirebaseSync.isEnabled() && ...)` to gate the log on success. Investigation showed the base `deletePhoto` (app.js:3883-3891) and `deleteSurvey` (app.js:2372-2394) both `resolve()` with no value on success — `result` is always `undefined`, which means `result && ...` would always be falsy and the log would never fire. Dropped the `result` guard in favour of `await` semantics: if the base function throws the wrapper throws and the log is skipped; if `await` returns (even `undefined`) the local delete succeeded and the log is appropriate. Same behaviour, fewer moving parts, no need to change `deletePhoto`/`deleteSurvey` return signatures outside the v2456 scope.

Same treatment for `deleteSurvey`. Full reasoning is preserved in the comment block above each hook (app.js:27381-27418) so future work can reference Dave's audit directly.

**The re-add hazard (why v2456 ships safely today).** Once the auto-delete is gone, a locally-deleted survey still exists in Firebase. On its own this could be a problem if anything pulls from Firebase and resurrects the survey. Today it's safe because:

- The live `onSnapshot` listener (`startListening`, app.js:26669) is **not** called from `init()` in the v2428+ manual-sync model. No 'added' event will resurrect a local delete.
- `FirebaseSync.pullNow()` is console-only — not wired to any UI (v2457 will remove it entirely).
- `initialSync()` isn't called from init() anymore either.

**⚠️ BUT — locked-in requirement for v2430 Device Roles.** The moment Device Roles re-introduces any pull-on-startup flow (field-mode → report-mode handoff, etc.), deleted-locally-but-still-in-cloud surveys will come back on pull. v2430 MUST therefore include an explicit **"☁️ Remove from cloud"** action before re-enabling any pull path, otherwise deletes will feel like they didn't stick. This is the symmetrical "Force push to cloud" analogue and is the missing half of the manual-sync UX.

**What else is left on the stability checklist.**

Dave's original three-item priority (from his v2455 audit): ✅ saveEverywhere (v2455), ✅ delete hooks (this commit), ⏳ `pullNow()` (v2457 — next up).

Two auto-push seams surfaced by the v2455 audit remain outside this commit's scope:

- **Photo idle-backup queue** (`savePhoto` → `_pendingBackupIds` → `_processBackupQueue`, 5s-idle after capture). Still auto-pushes photos + parent survey to Firebase during ordinary field use. Separate task, future version.
- **Bottom-bar "💾 Save" button** (`saveSurveyWithProgress`) still pushes to Firebase. User-initiated but asymmetric with the save-pill; UX polish task, future version.

**Files changed.** `app.js` (delete hook rewrites + `APP_VERSION` bump), `sw.js` (`CACHE_NAME` → v2456), `index.html` (meta + 7 cache-busters → v2456), this file.

**How to verify.**

1. Open a survey. Confirm it exists in Firebase Console (Firestore → surveys collection).
2. On iPhone, delete the survey locally (trash icon, confirm).
3. Wait 10 seconds. Refresh the Firebase Console — survey doc should STILL be there. Before v2456, it would have vanished from cloud within a second or two.
4. Same test with a single photo inside a survey: delete a photo locally, confirm the Firestore `photos/{id}` doc still exists.
5. Remote DevTools console should show exactly ONE `[Sync]` info log after each local delete: `[Sync] Survey {id} deleted locally. Cloud deletion will occur only if you confirm it manually.` (or the photo equivalent). No `console.error` — the old `[Sync] Photo delete failed:` / `[Sync] Survey delete failed:` errors are gone because we don't talk to Firebase at all.
6. Repeat step 4 while an `initialSync` or `pullPhotosForSurvey` is in progress (sync suppressed) — the log should NOT fire in that window. (Rare edge case, worth a spot-check; confirms the symmetric `!isSuppressed()` guard works.)
7. To actually remove the cloud copy for now, manual curation in Firebase Console is the only surface — the explicit "Delete cloud copy" UI is v2430 scope (tracked on task #119).

**v2457 preview.** Next up: remove `FirebaseSync.pullNow()`. With v2455 and v2456 landed, the app's Firebase read/write surfaces are: push via overflow "☁️ Force push to cloud"; pull via per-survey "⬇️ Force pull from cloud"; plus the batch tools (`backupAllEverywhere`, `saveSurveyWithProgress`) and the idle-backup queue. `pullNow()` as a console-only batch escape hatch is redundant with per-survey pull and dangerous in combination with the now-stripped delete path (it's the one thing that could resurrect a local delete). Gone in v2457.

---

## v2455 — 2026-04-21
### Fixed — `saveEverywhere()` no longer auto-pushes to Firebase (P0 correctness — manual sync model restored)

**Dave's audit.** *"The save-status panel still says Firebase 'auto-syncs on every save,' and the save pill still calls `saveEverywhere()`, which explicitly pushes to Firebase and Drive. That clashes with the v2428 design, where normal saves were supposed to stay local + Drive, and Firebase pushes were supposed to happen only when you explicitly tap the force-push control. So a normal 'Save' tap can still perform cloud writes. That is not a freeze/crash problem, but it is a serious correctness/surprise problem."*

**The bug.** `v2428` promised a manual-only Firebase sync model, but `saveEverywhere()` — the function the save pill invokes on every tap — still force-pushed the current survey to Firebase (at `app.js:3315-3323`) AND force-pushed to Drive (bypassing the throttle) on every Save tap. The Save-status hold-to-view panel explicitly advertised this: *"Connected · auto-syncs on every save"* and *"Saves happen automatically — local is instant, Firebase on every change, Drive every 30 seconds."* So in practice, the save pill was a **three-backend push button**, not the local-first checkpoint the v2428 redesign claimed. Cloud writes fired on every Save, contradicting both the UI promise (manual-sync overflow button) and the v2428 changelog.

**What changed in v2455.**

| Surface | Before | After |
| --- | --- | --- |
| `saveEverywhere()` (`app.js` ~3290) | Step 1 local save → **Step 2 force Firebase push** → Step 3 force Drive sync | Step 1 local save → Step 2 force Drive sync. Firebase block replaced with a comment explaining the removal and pointing at the overflow-menu Force push. |
| Save-status hold panel, Firebase status line (`app.js` ~3264) | "Connected · auto-syncs on every save" | "Connected · manual push only" |
| Save-status hold panel, footer advice (`app.js` ~3269-3274) | "Saves happen automatically — local is instant, Firebase on every change, Drive every 30 seconds." | "Local is instant; Drive auto-syncs every 30 seconds. Firebase pushes only when you tap ☁️ Force push to cloud in the overflow menu." |
| Save-pill tap handler comment (`app.js` ~3165) | `// Short tap — save everywhere` | `// Short tap — save locally + trigger Drive auto-sync. v2455: no longer pushes to Firebase...` |
| v2428 init() comment block (`app.js` ~27206-27216) | Claimed saveEverywhere "invokes pushSurvey explicitly" as if this were correct behaviour | Amended with a v2455 note explaining the stripped auto-push and listing the remaining paths that still invoke `FirebaseSync.pushSurvey` (backupAllEverywhere, saveSurveyWithProgress, explicit overflow-menu ☁️ Force push). Console log updated to cite v2455 rather than v2428. |

**Drive is unchanged.** Drive auto-sync still fires on every Save (bypassing the 30-second throttle) and the save pill still reflects this in the UI — that was always the v2428 model: *local + Drive auto, Firebase manual*. This commit only removes the Firebase step that was contaminating that model.

**What still pushes to Firebase.** Five paths remain. Three are clearly user-initiated; two fire during ordinary use and are candidates for v2456+ work. Dave explicitly audited this list before this commit landed — nothing below is hidden.

1. **User-initiated — ☁️ Force push to cloud** (overflow-menu button, `app.js:15331`) — per-survey Firebase push with toast confirmation. This is the intended manual-sync affordance.
2. **User-initiated — "💾 Save All Surveys"** (home-screen `backupAllEverywhere()`, `app.js:9142`) — deliberate batch maintenance tool. Dave's finding #4 flagged this as "fine as a deliberate maintenance tool" and it stays.
3. **User-initiated — bottom-bar "💾 Save" button** (`saveSurveyWithProgress`, called from the inspection and edit screens at `app.js:10941` and `15239`). The user taps it explicitly, but it behaves *differently* than the save-pill: the pill is now local + Drive, the bottom-bar Save is local + Drive + Firebase. That UX asymmetry is real and needs a follow-up pass — keep it on the radar.
4. **Auto-push — idle-triggered photo backup queue.** `savePhoto()` (`app.js:2444`) pushes the photo id into `_pendingBackupIds` and calls `_resetIdleTimer()`. 5 seconds after the user stops interacting, `_processBackupQueue()` (`app.js:2538`) wakes up and calls `FirebaseSync.pushPhoto()` on every queued photo, then pushes the parent survey alongside it. This fires during ordinary field use every time Dave takes a photo and pauses. **v2455 did NOT remove this path** — it only removed the save-pill push. Dave flagged this as a v2456 candidate.
5. **Auto-push — delete hooks.** `_originalDeletePhoto` / `_originalDeleteSurvey` (`app.js:27382-27401`) still force-push deletes to Firebase. Dave's audit called this out: deletes shouldn't be more eager than creates. v2456 scope.

**One other Firebase surface, listed for completeness.** `syncAllPhotosToFirebase()` (`app.js:2646`) also calls `FirebaseSync.pushPhoto` and `FirebaseSync.pushSurvey` (lines 2767 / 2776). It has no UI invocation in `index.html` and is not wired to any button — it's a console-only batch helper, effectively dormant during normal use. Not a user-facing auto-push. Flagged here so the audit inventory is complete.

**What DOES change with v2455.**

- Save-pill tap (the big one — every Save tap on the inspection screen, edit screen, and new-survey screen) no longer pushes to Firebase.
- The save-status UI no longer misleads about Firebase being automatic on every save.

**Why this is a stability fix, not a feature.** Silent cloud writes on every save were the exact behaviour that produced cross-device regressions (device A's stale closure pushing shrunken state, device B pulling it) — the class of bug the v2424 freshness guard and v2426/v2427/v2428 sync redesign were meant to eliminate. Leaving the save pill on auto-push kept that hazard alive, just narrowed. v2455 closes the last remaining auto-push seam.

**Files changed.** `app.js` (4 edits: saveEverywhere body, status-panel text, tap-handler comment, init() comment), `sw.js` (CACHE_NAME → v2455), `index.html` (meta + 7 cache-busters → v2455), this file.

**How to verify.**

1. Open a survey on the iPhone. Tap the Save pill. Open DevTools / remote inspector on the device's console: no `[Sync]` push log. The Save-status panel (hold the pill) shows "🔥 Firebase: Connected · manual push only".
2. Make a change. Tap Save. Open another browser tab or device. Do **not** pull. The change should be absent — it only exists locally and in Drive.
3. Pull the same survey from the other device. Change is still absent (no Firebase push happened).
4. Go back to the first device. Open the overflow menu, tap **☁️ Force push to cloud**. Get a confirmation toast. Pull from the other device. Change now arrives.

**v2456/v2457 follow-up.** Two more sync-symmetry fixes are next in the queue per Dave's audit: v2456 strips the `deletePhoto`/`deleteSurvey` Firebase hooks (deletes shouldn't be more eager than creates), and v2457 removes `FirebaseSync.pullNow()` (batch pull should only exist inside the planned Device Roles feature, not as a console escape hatch).

---

## v2454 — 2026-04-21
### Added — Hot water tank NT observed chip: "electrical and plumbing connections appeared serviceable"

Dave's ask: *"For the hot water tank, put when not tested that electrical and plumbing connections appeared serviceable."*

**New chip (Not tested/not verified, observed, severity 1).**

> The electrical and plumbing connections appeared serviceable.

**Where it sits.** Inserted in `text_library.json` between the existing NT/observed "…were not tested because the vessel was on shore and winterized…" chip and the NT/action "Recommend testing…when commissioned…" chip. Section chip count for "Hot water tank, plumbing and electrical" goes from 25 → 26; NT observed count 1 → 2.

**Why this chip matters.** Most Ontario surveys happen with the vessel on the hard, winterized — the tank itself can't be energized or pressurized. But the surveyor can still visually inspect the wiring, junctions, supply line, discharge line, and connections. This chip lets the surveyor report that positive visual observation without contradicting the separate "could not be run because winterized" chip. Both can appear in the same report since they describe complementary observations (test status vs. connection condition).

**Wording notes.**

- "serviceable" matches the library's post-`v2415` direction (replaced "satisfactory" in the hull-deck joint chip for the same reason — more concrete, less value-laden).
- "appeared" keeps it past-tense and hedged per the `v2420+` past-tense sweep.
- Kept Dave's exact word order: "electrical and plumbing connections" rather than flipping to "plumbing and electrical connections" to match the section name. His ask specified the former.

**Why NT and not C.** Dave was explicit that the chip should appear in the Not Tested list. A C-rating chip in this section already exists for "The electrical supply to the hot water tank was properly installed with appropriate wire gauge and connections" — but C requires the system to have been tested and found good. When the tank is winterized, C is not reachable; NT is.

**Files changed.** `text_library.json` (1 new chip), `app.js` (APP_VERSION → v2454), `sw.js` (CACHE_NAME → `kiki-marine-v2454`), `index.html` (meta + 7 cache-busters → v2454), this file.

---

## v2453 — 2026-04-21
### Removed — Tax Status + NMMA/CE/TC Compliance Plate fields

Dave's ask: *"Remove tax status and compliance plate details from all surveys."*

**What came out.**

| Surface | Before | After |
| --- | --- | --- |
| Intro form (`app.js` ~10026–10044) | Two `form-group` blocks: "Tax Status (Duties and Taxes Paid)" text input + "NMMA/CE/TC Compliance Plate" text input with 📷 camera button | Both blocks removed; placeholder comment left in place |
| Vessel Documentation Data report section (`app.js` ~23695) | Tax Status row + Compliance Plate row (with optional photo) | Both rows removed |
| Preflight check (`app.js` ~15884) | Warning: "Missing: Compliance plate photo" | Removed |
| `survey_template.json` / `insurance_survey_template.json` | "Tax status for navigation in Canada (duties and taxes paid)" question item under "Vessel documentation and regulatory compliance" | Removed (section kept with TC licensing item) |

**Save / load plumbing.** Also stripped from five write-sites in `app.js` so the fields are no longer populated on new save paths:

1. `createNewSurvey` seed (`~8899`) — `taxStatus` + `compliancePlate` no longer copied from `formData`
2. `saveSurveyDetails` updates object (`~11235`) — no longer written to the guarded update batch
3. `saveEditFormSilently` migration field list (`~11313`) — removed from the array consumed by the `if (el) survey[f] = el.value` loop
4. New-survey formData builder (`~13715`) — no longer read from the DOM on create
5. Form → survey field loader (`~10710`) — no longer populated into the form when an existing survey is opened

**What we deliberately left alone.**

- `survey.taxStatus` and `survey.compliancePlate` values already stored in IndexedDB on existing surveys are NOT deleted. The code paths that would overwrite them no longer run, so they persist untouched as orphaned fields. Safer than a destructive cleanup: if Dave ever wants this data back, it's still in the vessel's save record.
- `survey.compliancePhoto` blob storage — not deleted. If Dave ever re-enables compliance plate capture, the existing `captureDocPhoto` infrastructure and photo mapping (`'compliancePhoto': 'Compliance Plate'` at `~20634`, `~15918`) are still wired up. Only the UI button is gone.
- `compliancePhotoDataUrl` load in the report path (`~23107`) — deleted since nothing consumes it now. One less async photo decompress per report render on existing surveys.
- The "Vessel documentation and regulatory compliance" template section itself — kept, with its one remaining question item (TC licensing). Dave only asked for tax status to be removed.

**Why this path over "hard delete all the data".** Dave's triple-check rule and the stability-first roadmap both point away from destructive migrations. If he re-adds the field in v24xx or wants to audit old surveys that DID have tax status filled in, the data is still accessible programmatically. Silent UI removal costs nothing vs. a one-way migration.

**Files changed.** `app.js` (7 edits across UI, save, load, report, preflight), `survey_template.json` (tax-status question removed), `insurance_survey_template.json` (tax-status question removed), `sw.js` (CACHE_NAME → v2453), `index.html` (meta + 7 cache-busters → v2453), this file.

---

## v2452 — 2026-04-21
### Changed — Propane N/A chips: present → past tense

Dave's ask: *"Propane. The not applicable section has to be in the past tense."*

**Before — two N/A chips, identical text.**

> There is no propane system installed on this vessel.

**After.**

> There was no propane system installed on this vessel.

**Locations.** Both instances share the identical string, so a single library-wide replacement hit both:

- `Cockpit` › `Propane valve, regulator, gauge, storage compartment and vent` › N/A observed
- `Safety & Nav Equipment` › `LPG cut off solenoid valve switch` › N/A observed

The LPG solenoid section also carries a second N/A chip — *"There was an alcohol stove on board."* — which is already past tense and was not touched.

**Why past tense matters.** The entire library is being migrated to past-tense observational reporting ("appeared", "was", "were", "opened") because the survey document a frozen observation at the time of inspection, not a claim about the vessel's current state. Present-tense N/A copy like "there is no X" leaks a live-state assertion into a historical report. Same pattern as `v2424` grammar sweep and the ongoing `v2420+` sweep (task #103).

**Scope.** Two chip texts changed. Section chip counts unchanged. No other propane-related N/A chips flagged.

**Files changed.** `text_library.json` (replace-all on the sentence), `app.js` (APP_VERSION → v2452), `sw.js` (CACHE_NAME → `kiki-marine-v2452`), `index.html` (meta + 7 cache-busters → v2452), this file.

---

## v2451 — 2026-04-21
### Changed — Engine locker lid C chip: rewrite around hinges + open/close

Dave's ask: *"The engine locker lid was undamaged. This should be one sentence. Add to this that it was firmly affixed to his hinges. And another sentence that it opened and closed easily."*

**Before — Engine locker lid C/observed chip (severity 1).**

> The engine locker lid appeared undamaged and easily removed.

**After.**

> The engine locker lid was undamaged and firmly affixed to its hinges. It opened and closed easily.

**Structure.** Per Dave's instructions the chip now contains two sentences in one snippet: sentence one covers damage state + hinge attachment (one sentence as Dave specified), sentence two covers functional operation. Surveyors pick the whole block in a single tap; nothing splits across chips. If a specific boat needs only one half — e.g. lid hinged but damaged — the B/observed "Localized wear or cosmetic damage" chip still covers that case without this C chip being invoked.

**Why "its" instead of "his".** Dave's dictation came through as "his hinges" — voice-to-text slip. Canadian English grammar uses the neuter possessive "its" for inanimate objects. Documented here so future-me doesn't "correct" it back.

**What stayed.** The other two C/observed chips in the same section are untouched: the hydraulic/electric lid control (`{specify:hydraulic|electric}` token) covers powered lids, and the seal/gasket chip covers the weather-tight fit. Those describe different inspection points from the lid-itself chip, so consolidating them would lose information.

**Pattern.** Same direction as `v2446` grab rails, `v2448` deck hatches, `v2449` windshield, `v2450` cockpit drains: swap "appeared + adverbial value judgment" for concrete observable state ("was undamaged", "firmly affixed", "opened and closed easily"). "Easily" survives because it's describing motion quality, not making a pass/fail judgment.

**Scope.** One chip text replaced. C/observed chip count in Engine locker lid section unchanged (still 3). B/observed chip at line 9807 ("appeared sound and undamaged") not touched — Dave's ask was specifically about the lid-is-fine scenario, which maps to C not B.

**Files changed.** `text_library.json` (one chip text rewritten), `app.js` (APP_VERSION → v2451), `sw.js` (CACHE_NAME → `kiki-marine-v2451`), `index.html` (meta + 7 cache-busters → v2451), this file.

---

## v2450 — 2026-04-21
### Changed — Cockpit drains C chip: strip "and drained the cockpit properly"

Dave's ask: *"Remove the words 'drained the cockpit properly' from the drain section."*

**Before — Cockpit[18] C/observed (section: Cockpit drains).**

> The drains were free of debris and drained the cockpit properly.

**After.**

> The drains were free of debris.

**Why the trailing "and" also came out.** Removing just the four quoted words would leave the fragment "The drains were free of debris and." Dropping the connector keeps the sentence grammatical while stripping exactly what Dave flagged. Net change: 6 words removed (" and drained the cockpit properly") instead of 4, but the semantic cut matches his ask.

**Why not replace "properly" with another adverb (smoothly, freely, readily).** Same pattern as `v2448` deck hatches and `v2446` grab rails: the library is moving away from adverbial value judgments in C-rated observed chips. "Drained properly" is a value claim — was it properly drained, or just drained? "Free of debris" is a concrete, observable state. If a surveyor wants to call out flow-test behaviour (e.g. slow drainage despite clear passages), the B-rated chips in the section cover that on a case-by-case basis.

**Only one hit.** Grep for chips matching drain + cockpit + proper across the library returned exactly this chip. No other drain sections carried the phrasing.

**Files changed.** `text_library.json` (Cockpit drains C/observed text trimmed), `app.js` (APP_VERSION → v2450), `sw.js` (CACHE_NAME → `kiki-marine-v2450`), `index.html` (meta + 7 cache-busters → v2450), this file.

---

## v2449 — 2026-04-21
### Removed — Windshield: two redundant C/observed chips in `Windshield, pilothouse windows, frames, and studs`

Dave's ask: *"Windshield. There are three snippets that say exactly the same thing."*

**Audit finding.** The Deck section `Windshield, pilothouse windows, frames, and studs` carried three C/observed chips that all made the same claim — windshield assembly in fine shape — with different word choices:

| Idx | Text | Issue |
|---|---|---|
| 74 | The windshield, pilothouse windows, frames, and studs were **in acceptable condition**. | "acceptable" — phrasing the library is moving away from |
| 75 | The windshield, pilothouse windows, frames, and **seals** were in **good working order**. | Text says "seals"; section name says "studs" — word mismatch |
| 76 | The windshield, pilothouse windows, frames, and studs were **structurally sound, solid, and without deficiency**. | Triple-redundant (sound = solid = without deficiency) |

**After.** One consolidated C/observed chip:

> The windshield, pilothouse windows, frames, and studs were in good working order.

This is Deck[75]'s phrasing with the "seals" → "studs" bug fixed to match the section name. Deck[74] and Deck[76] removed.

**Why this wording.** "Good working order" aligns with the v2448 "Good" chip pattern (deck hatches), uses concrete operational phrasing (working order, not condition), and reads naturally as a one-line inspector note.

**Out of scope — near-duplicates in other sections kept intentionally.**
- Flybridge[129] `Flybridge splash shield/windshield`: *"The Flybridge splash shield or windshield is in serviceable condition without deficiencies with no cracks or crazing."* — different section (Flybridge vs Deck), covers different hardware, one chip in its own section. Not redundant.
- Deck[161] `Windshield, pilot house windows, frames and seals`: *"The windshield and pilot house windows were in proper working condition with clear visibility and secure frames."* — this is the *second* windshield section (note "pilot house" vs "pilothouse", "seals" vs "studs"), which appears to be a parallel section that evolved separately from v1. Contains "proper working condition" which is the exact phrasing v2448 targeted for deck hatches; candidate for future cleanup, but Dave's ask was scoped to the three identical chips, not a broader windshield polish.

**Why two sections still exist.** The file has both `Windshield, pilothouse windows, frames, and studs` (8 chips, Deck[72-76, 235-237]) and `Windshield, pilot house windows, frames and seals` (10 chips, Deck[156-162, 256-258]). These are parallel copies from a data consolidation — the survey template probably only references one, but both are searched. Consolidating them is a separate cleanup (candidate for a future version after confirming which the survey template actually uses).

**Net.** Section shrinks from 8 chips to 6 (B/observed x2, C/observed x1, B/action x1, C/means x1, C/action x1). Surveyor now has exactly one positive C-rated chip to tap for "windshield is fine."

**Files changed.** `text_library.json` (two duplicate chips removed, one kept with seals→studs fix), `app.js` (APP_VERSION → v2449), `sw.js` (CACHE_NAME → `kiki-marine-v2449`), `index.html` (meta + 7 cache-busters → v2449), this file.

---

## v2448 — 2026-04-21
### Changed — Deck hatches: remove "proper/properly"; surface a "Good" chip at top of C list

Dave's ask: *"Remove the word proper from deck hatches. There should also be 'Good' rating And it should be moved to the top of the list."*

**Four chips edited across three sections.**

| Section | Rating / Phase | Before | After |
|---|---|---|---|
| Cabin and conveniences → `Deck hatches, windows and portholes – interior observations` | C - min crazing / observed | All deck hatches and portholes opened and closed **properly**. | All deck hatches and portholes opened and closed **smoothly**. |
| Cabin and conveniences → same section | C - min crazing / observed | Hatches, portholes, and windows were in **proper** working condition with minimal crazing. | Hatches, portholes, and windows were in **good** working condition with minimal crazing. |
| Cabin and conveniences → `Cabin windows and hatches (interior observations)` | C / observed | All cabin windows and hatches opened and closed **properly**. | All cabin windows and hatches opened and closed **smoothly**. |
| Deck → `Deck hatches, windows, and portholes – exterior observations` | C / observed | All deck hatches, windows, and portholes appeared in **proper** condition from the exterior. | All deck hatches, windows, and portholes appeared in **good** condition from the exterior. |

**Plus a reorder.** The rewritten exterior "good condition" chip was moved to the top of the C/observed list for `Deck hatches, windows, and portholes – exterior observations`. New C/observed order:

1. *All deck hatches, windows, and portholes appeared in good condition from the exterior.*  ← first ("Good" chip per Dave's ask)
2. The single deck hatch appeared without deficiency from the exterior.
3. Despite age-typical crazing, all deck hatches, windows, and portholes appeared in good order from the exterior.

**Why "smoothly" replaces "properly" on the open-and-close chips.** Stripping "properly" without replacement leaves "opened and closed." which reads awkwardly (trailing adverb implied). "Smoothly" describes the same successful-operation observation without the value-laden "proper" framing. Matches the way `v2442` substituted "serviceable" for "proper" on swim-platform conductivity and `v2446` dropped the "free of corrosion" chip on grab rails — Dave's library is moving away from judgement/absence-of-deficiency phrasing toward concrete, observable descriptions.

**Why "good" replaces "proper" on condition chips.** Dave's ask specifically called for a "Good" chip. Using "good" aligns with his choice. Already-present "good order" chip (`Despite age-typical crazing... appeared in good order from the exterior.`) stays untouched — that one was already compliant.

**Scope boundaries — kept untouched.**
- `Deck[341]` A/action: *"The corroded frame(s) should be removed, repaired or replaced, and **properly** rebedded."* — "properly rebedded" is industry terminology meaning "rebedded to spec with appropriate compound and technique." Different semantic load than "proper condition." Leaving this alone.
- Cabin and conveniences → `Cabin windows and hatches (interior observations)` A/observed: *"The cabin windows and hatches were cracked, damaged, or not sealing **properly**."* — same reasoning: "sealing properly" is an adverbial quality-of-operation phrase describing a failure mode, not the value-laden "proper condition" C-rating pattern Dave's ask targets.
- Any "properly" in non-hatch sections (nav table lid, storage/galley/drawer chips) — out of scope. Dave's ask was scoped to deck hatches.

**Files changed.** `text_library.json` (three text edits + one chip reorder in Deck), `app.js` (APP_VERSION → v2448), `sw.js` (CACHE_NAME → `kiki-marine-v2448`), `index.html` (meta + 7 cache-busters → v2448), this file.

---

## v2447 — 2026-04-21
### Removed — Bow thruster C chip: "Corrosion was not concerning"

Dave's ask: *"Remove this from bow thruster: Corrosion was not concerning."*

**Before — Hull Bow thruster C/observed (was Hull[124] after the v2445 NT insert).**

> Corrosion was not concerning.

**After.** Chip deleted entirely — same reasoning as v2446's grab rails change: a C-rating observation declaring the *absence* of corrosion on a bow thruster gear leg isn't a meaningful finding. If the gear leg is sound, the preceding chip ("The bow thruster gear leg appeared solid and the propeller rotated freely.") already covers it. If corrosion *is* present and concerning, that's the A/B-rating territory ("Significant corrosion was present on the gear leg.", Hull A/observed).

**Hull Bow thruster chip ladder after removal (6 chips).**

| Rating | Phase | Text |
|---|---|---|
| A | observed | The bow thruster gear leg appeared solid and the propeller rotated freely. |
| A | observed | Significant corrosion was present on the gear leg. |
| B | observed | The bow thruster gear leg appeared solid and the propeller rotated freely. |
| C | observed | The bow thruster gear leg appeared solid and the propeller rotated freely. |
| Not tested | observed | The bow thruster was not tested because the vessel was out of the water. *(added v2445)* |
| N/A | observed | No bow thruster was installed on this vessel. |

**Parallel with v2446.** Same pattern as the grab rails `free of significant corrosion` removal: Dave's library is moving away from "absence-of-deficiency" C-rating copy in favour of positive condition statements only. A bow thruster in serviceable condition is described by the solidity/rotation chip; an unserviceable one gets the A-rating significant-corrosion chip. Nothing in between that says "we looked and it was fine."

**Files changed.** `text_library.json` (Hull Bow thruster C/observed corrosion chip removed), `app.js` (APP_VERSION → v2447), `sw.js` (CACHE_NAME → `kiki-marine-v2447`), `index.html` (meta + 7 cache-busters → v2447), this file.

---

## v2446 — 2026-04-21
### Removed — Grab rails C chip: "stainless steel finish appeared clean and free of significant corrosion"

Dave's ask: *"Grab rails. Remove the part about stainless being free of corrosion. These don't corrode."*

**Before — Deck[303] C/observed (section: Grab rails).**

> The stainless steel finish appeared clean and free of significant corrosion.

**After.** Chip deleted entirely. Not rewritten — a C-rated observation that the finish was "free of corrosion" reads like saying a brick is "free of leaks": the category of deficiency doesn't apply to marine-grade stainless on grab rails in the first place, so stating its absence is meaningless. Removing the chip is cleaner than softening the language.

**Coverage after removal.** The remaining C-rated observed chips for Grab rails still cover:
- Deck[298] "The vessel was fitted with teak grab rails."
- Deck[299] "The vessel was fitted with stainless steel grab rails." *(material identification — kept)*
- Deck[300] "All grab rails were solidly mounted and showed no visible deficiencies."
- Deck[301] "The mounting hardware and bedding were intact."
- Deck[302] "The teak showed normal weathering consistent with a vessel of this age and appeared structurally sound."

Net: teak gets a dedicated condition-and-aging sentence (302); stainless gets identification (299) plus the generic "solidly mounted / no visible deficiencies" (300). The parallel isn't perfect but matches reality — stainless grab rails don't need a weathering chip.

**Out of scope — kept intentionally.**
- Deck[291] B/observed: *"Surface rust staining was observed on one or more stainless steel grab rails."* — this is a legitimate B-rating deficiency observation when rust staining is actually present. Dave's ask targets the "free of corrosion" C-rating framing, not all mentions of stainless and rust. Surface rust on stainless is a real field observation (from dissimilar-metal contact, iron contamination, pickling failure) that Dave should be able to report when he sees it.

**Files changed.** `text_library.json` (Deck Grab rails C/observed stainless chip removed), `app.js` (APP_VERSION → v2446), `sw.js` (CACHE_NAME → `kiki-marine-v2446`), `index.html` (meta + 7 cache-busters → v2446), this file.

---

## v2445 — 2026-04-21
### Added — Hull → Bow thruster: "Not tested — vessel out of water" chip

Dave asked for the "boat was out of the water" reason to be available as an NT option on the bow thruster.

**Audit.** The Hull section's `Bow thruster` entries (Hull[120–124]) only covered A/B/C ratings — there was no NT chip, so a surveyor inspecting a vessel on the hard had nothing to tap. Meanwhile, `Gauges and Instrumentation[31]` and `Flybridge gauges and instrument[31]` already carried the exact NT chip Dave wanted, so the phrasing is already established in the library.

**After — new chip appended after Hull[124] in the Bow thruster section.**

| Section | Rating | Phase | Text |
|---|---|---|---|
| Bow thruster | Not tested | observed | The bow thruster was not tested because the vessel was out of the water. |

**Why this phrasing.** It mirrors the existing NT wording in the Gauges sections verbatim so a boat surveyed on land produces consistent copy no matter which panel the surveyor inserts from. "Was out of the water" matches the report's other rating-explanation format (`v2419` generator on-the-hard wording, `v2387` drive coupling NT option at C rating, etc.).

**Placement.** The new chip sits between the last C-rated Bow thruster chip (Hull[124] `Corrosion was not concerning.`) and the first Transom chip, so section grouping in the text library panel stays intact.

**Out of scope.** The Gauges/Flybridge versions of this chip already exist and remain untouched. A similar NT chip probably belongs on the generator section too — Dave raised that separately as a later queued item (v2467), not rolled in here per the one-feature-per-version rule.

**Files changed.** `text_library.json` (new NT chip inserted in Hull Bow thruster section), `app.js` (APP_VERSION → v2445), `sw.js` (CACHE_NAME → `kiki-marine-v2445`), `index.html` (meta + 7 cache-busters → v2445), this file.

---

## v2444 — 2026-04-21
### Changed — Trim tabs C-rated chip: removed "during limited trial run" clause

Dave asked for the "limited trial run" mention to come out of the trim tabs section. An audit across the `Trim tabs (exterior tabs, actuators, mounts and anodes)` section found exactly one hit:

**Before — Hull[496] C/observed.**

> The trim tabs, actuators, and mounts appeared sound and well-maintained and functioned properly during limited trial run.

**After.**

> The trim tabs, actuators, and mounts appeared sound and well-maintained and functioned properly.

**Why.** Trim tab function is not meaningfully evaluated in a "limited trial run" — the relevant test is actuator extension/retraction at the dock or on the hard, not underway manoeuvring. The phrase implied a sea-trial-style observation that wasn't actually the basis for the rating, which could confuse readers of the report.

**Out of scope.** The phrase `limited trial run` appears in ~15 other chips across unrelated sections (Cutlass bearing, Outboard general impression, Engine gauges, Bow thruster, Autopilot, MFD/Chartplotter, Stuffing box, Windlass). Those all remain as-is — Dave's ask was scoped to the trim tabs section specifically. Each other section may or may not warrant its own edit based on whether a trial run genuinely informs the observation; that's a future conversation.

**Files changed.** `text_library.json` (Hull[496] text at L3482 edited), `app.js` (APP_VERSION → v2444), `sw.js` (CACHE_NAME → `kiki-marine-v2444`), `index.html` (meta + 7 cache-busters → v2444), this file.

---

## v2443 — 2026-04-21
### Changed — Transducer speed wheel chip: dropped "acceptable condition" clause, added standalone "serviceable condition" chip

Dave asked for the phrase "acceptable condition" to be removed from the speed-wheel chip in the `Transducers (speed, depth, etc.)` section, and for the descriptor to appear **on its own** as a separate tappable snippet rather than tacked onto the speed-wheel sentence.

**Before — Hull[80] C/observed.**

> The speed wheel turned freely, and the installation appeared in acceptable condition.

**After — two separate chips so the surveyor can tap either or both.**

| Idx | Rating | Text |
|---|---|---|
| 80 | C / observed | The speed wheel turned freely. |
| 81 (new) | C / observed | The installation was in serviceable condition. |

**Why split.** Dave's preference: "Adding serviceable condition on its own without being attached to a separate sentence seems like the way to go." When the two ideas were welded together, the surveyor couldn't report on the speed-wheel spin without also implicitly commenting on the whole installation. Two chips give independent coverage — a speed-only tap is now possible, and "serviceable condition" becomes a reusable descriptor that can stand alone in contexts where the speed wheel isn't relevant (e.g. a depth-only transducer).

**Word choice.** "acceptable condition" → "serviceable condition" matches Dave's established vocabulary preference (see `v2415` hull-deck joint satisfactory → serviceable, `v2442` conductivity `proper` → `serviceable`).

**Chip ordering.** The new standalone chip was inserted immediately after the speed-wheel chip so the two render adjacent in the panel. Existing neighbours ("The transducer face appeared clean…", "The installation appeared in good working order.") stay in their current order afterward.

**Existing stored surveys.** Past surveys that captured the old combined chip retain that exact text in their `items[...].text` field — the edit only changes the insertable library, not saved notes. Dave can re-tap if he wants to split an old survey's note.

**Files changed.** `text_library.json` (Hull[80] text edited + 1 new chip inserted at position 81), `app.js` (APP_VERSION → v2443), `sw.js` (CACHE_NAME → `kiki-marine-v2443`), `index.html` (meta + 7 cache-busters → v2443), this file.

---

## v2442 — 2026-04-21
### Fixed — Swim platform conductivity chip: removed the word "proper"

Dave flagged the word "proper" as unwanted language in conductivity-related chips. An audit across every chip whose `section` field contains "conductivity" (case-insensitive) surfaced exactly one hit:

| Location | Rating | Before | After |
|---|---|---|---|
| Hull[358] — "Swim platform and ladder - condition and conductivity readings" | C / observed | Conductivity readings on the swim platform ranged between [insert reading range] and were consistent with **proper** condition. | Conductivity readings on the swim platform ranged between [insert reading range] and were consistent with **serviceable** condition. |

The four location-unified conductivity sections (`Hull and rudder(s) conductivity testing`, `Aft deck conductivity testing`, `Flybridge conductivity testing`, `Deck and coachroof/pilothouse conductivity testing`) were already clean — no "proper" usage in any of the 176 chips that v2429 unified. The single remaining instance was in the swim platform's condition-and-conductivity chip, which lives under the Hull category but in its own section string.

**Word choice.** Replaced with "serviceable" rather than deleting the descriptor entirely, matching the language pattern Dave has preferred elsewhere (e.g. `v2415` hull-deck joint satisfactory → serviceable, and the in-flight preference that "serviceable condition" reads best on its own).

**Out of scope for this version.** Other "proper" occurrences elsewhere in `text_library.json` (e.g. on deck hatches, the drain-section "drained the cockpit properly" phrasing, and generic action chips like "restore proper function") were flagged separately and are queued for their own versions — one feature per push.

**Files changed.** `text_library.json` (1 chip text edited at L2513), `app.js` (APP_VERSION → v2442), `sw.js` (CACHE_NAME → `kiki-marine-v2442`), `index.html` (meta + 7 cache-busters → v2442), this file.

---

## v2441 — 2026-04-21
### Fixed — Condition Adjustment paragraph now hides when no BUC-determined price is entered

The valuation section's `Condition Adjustment` paragraph read:

> Condition Adjustment: The vessel's overall condition rating of "Average" has been factored into the final valuation range using the BUC Marine Grading System.

This is a claim about an interaction between the overall condition rating and a valuation range. When no BUC-determined price is entered — i.e., the Fair Market Value low/high fields are blank — there is no valuation range to factor into. The sentence in that case implies a methodology that wasn't performed and is misleading.

**Fix.** The paragraph was previously guarded only on `_overallCondRaw` (the surveyor picked an overall BUC grade). Now additionally guarded on `_hasFMV` (the surveyor also entered a valuation range). When either is missing, the paragraph is suppressed.

**Preserved behaviour.** The earlier `Overall Vessel Rating is: "…"` callout box continues to render on `_overallCondRaw` alone — it only states the rating and makes no claim about applying it to a valuation range, so it's correct with or without FMV data entered. Only the `Condition Adjustment` prose is gated on both.

**Single-line change.** One boolean added to the guard in `generateReport`'s valuation block. No other behaviour touched.

**Files changed.** `app.js` (L24495 guard; APP_VERSION → v2441), `sw.js` (CACHE_NAME → `kiki-marine-v2441`), `index.html` (meta + 7 cache-busters → v2441), this file.

---

## v2440 — 2026-04-21
### Fixed — Black water tank C-rated chip cleanup: dropped redundant ASTM chip, moved "not visible" chip adjacent to "was mounted"

Polish pass on the Black water tank chip panel at the C ("Serviceable") rating. The panel currently surfaces every entry whose `rating` field starts with `C` — so both plain `"C"` chips and `"C - not visible but looks right"` chips render together in one panel, in JSON-file order. Before this pass, that order read awkwardly: a location chip, then a condition chip, then another condition chip, then a second location chip. After the pass, location chips are adjacent and condition chips follow.

**Before (JSON order within Fuel & Tanks section).**

| Idx | Rating | Text |
|---|---|---|
| 35 | C | The black water tank was mounted [insert location]. |
| 36 | C | It appeared correctly installed with ASTM D3262 hose fitted. |
| 37 | C | No leakage or unusual odour was observed. |
| 38 | C - not visible but looks right | The black water tank was located in the [insert location] and not visible. |
| 39 | C - not visible but looks right | The installation appeared proper with ASTM D3262 hose fitted. |

**After.**

| Idx | Rating | Text |
|---|---|---|
| 35 | C | The black water tank was mounted [insert location]. |
| 36 | C - not visible but looks right | The black water tank was located in the [insert location] and not visible. |
| 37 | C | No leakage or unusual odour was observed. |
| 38 | C - not visible but looks right | The installation appeared proper with ASTM D3262 hose fitted. |

Two changes:

1. **Deleted** the old index 36 entry (`"It appeared correctly installed with ASTM D3262 hose fitted."` at rating `C`). It was redundant with the index 39 entry (`"The installation appeared proper with ASTM D3262 hose fitted."` at rating `C - not visible but looks right`) which expresses the same idea in slightly different prose. Dave flagged the first as the redundancy to drop.
2. **Moved** the `"The black water tank was located in the [insert location] and not visible."` entry from its old index 38 position to sit immediately after the `"was mounted [insert location]"` entry. Result: the two location-describing chips render back-to-back in the UI before any condition chips.

**Why these two variants both exist.** `"was mounted"` is the chip the surveyor taps when they physically saw the tank (it gets the visible location filled in — under the V-berth, in the lazarette, etc.). `"was located in the... and not visible"` is the chip the surveyor taps when a panel, liner, or cabinetry obscures direct view but the location is known. Keeping both adjacent lets Dave pick whichever wording matches field conditions without scrolling past a condition chip to reach the alternate location phrasing.

**Rating-match note.** `findTextVariants` resolves the C rating through first-character comparison (see `isRatingMatch` in app.js L7438–7449), so both `"C"` and `"C - not visible but looks right"` entries continue to surface together when the surveyor picks `C - Serviceable` from the template's rating dropdown. No code change needed for the new order to render correctly.

**Side effect on existing reports.** Past surveys that captured the deleted `"It appeared correctly installed with ASTM D3262 hose fitted."` chip still have that text stored in their `items[...].text` field — the delete only removes the chip from the insertable library, not from any stored note. Dave can edit those past surveys manually if he wants to replace the text with the surviving `"The installation appeared proper..."` variant; untouched surveys keep reading the way they already read.

**Files changed.** `text_library.json` (1 entry deleted, 1 entry relocated within Fuel & Tanks array — 138 entries down from 139), `app.js` (APP_VERSION → v2440), `sw.js` (CACHE_NAME → `kiki-marine-v2440`), `index.html` (meta + 7 cache-busters → v2440), this file.

---

## v2439 — 2026-04-21
### Changed — Valuation section cleanup: removed VALUATION WORKSHEET subsection, moved Final Concluded FMV to just before the Surveyor's Certificate

Dave flagged the final valuation section of the report as choppy and redundant. The offending structure was two back-to-back tables showing essentially the same data twice, with a `VALUATION WORKSHEET` header and a boilerplate intro sentence separating them. This pass collapses the redundancy into a single clean flow and gives the Final Concluded Fair Market Value its own standalone display right before the Surveyor's Certificate, so the report closes on its punch line.

**Before (old flow).**

1. `STATEMENT OF VALUATION` h3 + FMV definition paragraph
2. Table with: Valuation Source, Fair Market Value range (big CAD + USD), Estimated Replacement Cost, **Final Concluded Fair Market Value** (big CAD + USD + "Tax not included."), Exchange Rate
3. Appraisal Methodology / Summary / Condition Adjustment paragraphs
4. `VALUATION WORKSHEET` h3
5. "The following data sources and comparables were used..." intro sentence
6. Second table with: Sources Consulted, Source list, BUC Range (USD/CAD), Exchange Rate, Replacement Cost, **Final Concluded FMV** (smaller inline row)
7. Comparables / Market Research table

**After (new flow).**

1. `STATEMENT OF VALUATION` h3 + FMV definition paragraph
2. Table with: Valuation Source, Fair Market Value range, Estimated Replacement Cost (Final Concluded row + Exchange Rate row removed — they now render at the end)
3. Appraisal Methodology / Summary / Condition Adjustment paragraphs
4. Comparables / Market Research table
5. **Final Concluded Fair Market Value** standalone table — big CAD + USD with rate note + "Tax not included." — followed by Exchange Rate row

**Why the second table was safe to delete wholesale.**

Every row in the old worksheet table was already surfaced in the Statement of Valuation table above it, just with different labels:

| Worksheet row | Already shown in top table as |
|---|---|
| Sources Consulted | Valuation Source(s) |
| BUC Value Range (USD/CAD) | Fair Market Value (big CAD range + USD range with `@ rate` note) |
| Exchange Rate (USD→CAD) | `(USD→CAD @ rate)` note on each money row |
| Estimated Replacement Cost | Estimated Replacement Cost (identical) |
| Final Concluded FMV (inline small) | Final Concluded Fair Market Value (big block) |

The worksheet was essentially a second rendering of the same five data points. Removing it drops zero information from the report.

**Why the Final Concluded block moved to the end.**

Dave's ask was specifically to place it "just before the Surveyor's Certification". The valuation number is the deliverable — the thing the client cares about most — and having it appear twice (once mid-section, once at the end of the worksheet) diluted it. Putting the block at the bottom of the valuation flow means the reader's eye lands on the concluded value just as they roll into the signed certificate. It's a cleaner document narrative.

**Edge cases preserved from v2374.**

- If no valuation data is entered at all, the whole `_hasValuationData` block stays suppressed — no empty "STATEMENT OF VALUATION" heading, no blank tables.
- If Final Concluded FMV is missing but FMV range is set, the top table still shows the range and the new trailing block simply doesn't render (guarded by `if (_hasConc)`).
- If Exchange Rate is zero / not set, `_xrRow` already evaluates to empty string (unchanged from before), so the new trailing block shows just the Final Concluded FMV without an exchange rate row.
- If there are no comparables, the comparables table is suppressed as before; the Final Concluded block still renders on its own right after the Condition Adjustment paragraph.

**Files changed.** `app.js` (three targeted edits to `generateReport`'s valuation section at ~L24493–24564; APP_VERSION → v2439), `sw.js` (CACHE_NAME → `kiki-marine-v2439`), `index.html` (meta + 7 cache-busters → v2439), this file.

---

## v2438 — 2026-04-21
### Fixed — "Hot water tank(s)" label made singular throughout

Small polish pass. The checklist item under the Fuel & Tanks category was labelled `"Hot water tank(s), plumbing and electrical"`. The parenthetical `(s)` was a holdover from an earlier style; Dave wanted it dropped so the label reads cleanly as singular: `"Hot water tank, plumbing and electrical"`. Virtually every vessel Dave surveys has a single hot water tank, and when a survey does have two (rare), the surveyor writes it in prose.

**Why this touches more than the template file.**

`findTextVariants()` in `app.js` matches an item label to the relevant `section` field in `text_library.json` via an exact-match-then-contains fallback. If the template label was changed to the singular form but the library `section` strings still carried `(s)`, the contains fallback would break — the shorter singular label `"Hot water tank, plumbing and electrical"` is NOT a substring of `"Hot water tank(s), plumbing and electrical"`. Any snippet with `(s)` in its section field would silently fall out of the match set and no chips would appear on that item. This is the same failure mode documented under task #95 (snippet disappearance on pluralized labels) and must be avoided here.

So the label change had to be applied atomically in lockstep across:

| File | Change |
|---|---|
| `insurance_survey_template.json` | 1 label at L2237: `Hot water tank(s)...` → `Hot water tank...` |
| `survey_template.json` | 1 label at L1914: same change |
| `text_library.json` | 26 `section` field occurrences updated to the singular form |

**Two snippet bodies also updated.**

Within the Fuel & Tanks section, two NT-family chip texts referenced the plural noun "tanks" in running prose:

| Idx | Before | After |
|---|---|---|
| 135 | "The hot water **tanks**, plumbing and electrical were not tested..." | "The hot water **tank**, plumbing and electrical were not tested..." |
| 136 | "Recommend testing the hot water **tanks**, plumbing and electrical..." | "Recommend testing the hot water **tank**, plumbing and electrical..." |

Index 135 composes cleanly with the v2437 compound-subject fix — the verb stays `were` because the subject is still compound (`The hot water tank, plumbing and electrical`). Index 136 uses singular `is` elsewhere in the sentence, which is correct with singular `tank` as the recipient of `testing`.

**Not changed.**

- `app.js` L6968 — `'Hot water tank': 'ABYC E-11 - AC and DC Electrical Systems on Boats'` — already keyed singular as the standards-mapping lookup key. No change needed.
- `import_photos_riverdance.js` — a one-off photo-import script that references the old label string in two places. Not versioned, not user-facing; left alone to avoid churning unrelated files in a label-polish push. Will be cleaned up organically the next time that script is touched.

**Side effect on existing reports.** Past surveys that already captured the item under the old `(s)` label will still show the chip text on re-open. `findTextVariants` reads the template label at render time, and the survey's stored per-item data is keyed by the label string used on creation. If a past survey still has a `Hot water tank(s), plumbing and electrical` key in its `items` object, the new template label won't match it and the saved notes could look "orphaned" on that survey until Dave re-opens the item and taps again. For Dave's active surveys this is fine — he'll re-hit the chip and the stored data will re-key to the singular form. Documented here so future-me doesn't panic if a very old survey looks sparse in that row.

**Files changed.** `survey_template.json` (1 label), `insurance_survey_template.json` (1 label), `text_library.json` (26 section fields + 2 snippet bodies), `app.js` (APP_VERSION → v2438), `sw.js` (CACHE_NAME → `kiki-marine-v2438`), `index.html` (meta + 7 cache-busters → v2438), this file.

---

## v2437 — 2026-04-20
### Fixed — NT snippet library: compound-subject "was" → "were" agreement

v2389 fixed one compound-subject/singular-verb error in the NT ("Not tested") snippet library ("head, faucet, sink and drain was not tested"). Dave flagged that the same pattern existed in several other NT sections that weren't swept at the time. This pass audits every NT snippet across `text_library.json` and corrects subject/verb agreement where a compound subject is paired with a singular verb.

**Audit approach.**

1. Filtered `text_library.json` to entries whose `rating` field matches `/^(not tested|not verified|not inspected|nt\b)/i` — that's the rating strings Dave actually uses on NT chips ("Not tested", "Not tested - out of water", "Not tested/not verified", "Not tested - dripless", etc.).
2. Within those, scanned text for patterns like `X, Y and Z was`, `X, Y, Z and W was`, and `plural-noun and plural-noun was`.
3. Hand-classified each hit to separate true compound-subject errors from false positives where "was" is grammatically correct — two-clause constructions joined by "and" (e.g., "the vessel was on shore and the water tank was empty") and idiomatic singular-system names ("the outdrive trim and tilt hydraulic system was not tested" — one system named "trim and tilt", not two components).

**Seven corrections applied.**

| Section | Idx | Before | After |
|---|---|---|---|
| Aft Deck | 86 | sink, faucet and drain **was** not tested | **were** not tested |
| Cabin and conveniences | 315 | cockpit sink, faucets and drain **was** not tested | **were** not tested |
| Cabin and conveniences | 317 | fresh water tanks and plumbing **was** not tested | **were** not tested |
| Head | 42 | head, toilet and seacock **was** not tested | **were** not tested |
| Fuel & Tanks | 135 | hot water tanks, plumbing and electrical **was** not tested | **were** not tested |
| Fuel & Tanks | 137 | black water tanks and plumbing **was** not tested | **were** not tested |
| Engine & Powertrain | 221 | cooling water intake seacocks and strainers **was** not tested | **were** not tested |

Each fix swaps exactly one instance of `and <last-element> was not tested` → `and <last-element> were not tested`, preserving the rest of the sentence ("...because the vessel was on shore and winterized at the time of survey." — the later "was"s are correct, their subjects are singular).

**Not changed (false positives).**

- Companion "Recommend testing..." snippets ("Recommend testing the sink, faucet and drain when the vessel **is** commissioned") — subject of "is" is "the vessel" (singular), correct as-is.
- `[Cabin and conveniences] idx 42` — already uses "were" ("The faucet, sink, and drain were not tested...").
- `[Head] idx 10, 13, 44` — already use "were".
- `[Engine & Powertrain] idx 309` — already uses "were".
- `[Steering & Hydraulics] idx 14` — "The outdrive trim and tilt hydraulic system was not tested" — "trim and tilt hydraulic system" is a singular named system; "was" is correct.
- `[Deck] idx 33` — "The vessel was ashore and the windlass was not tested under load" — two independent clauses each with singular subject.
- `[Deck] idx 386` — "Conductivity testing of the deck and coachroof was not carried out" — subject is "testing" (singular), "deck and coachroof" is a prepositional phrase.
- `[Fuel & Tanks] idx 41` — "The installation appeared proper and no leakage was observed" — two clauses.

**Side effect on existing reports.** Past surveys that already inserted the old phrasing into their notes are unaffected — the fix updates the library chip text, not any stored survey data. Dave can re-tap the corrected chip on existing surveys if he wants to overwrite the stored text with the grammatically correct version.

**Files changed.** `text_library.json` (7 snippets corrected, identified by section+index in the table above), `app.js` (APP_VERSION → v2437), `sw.js` (CACHE_NAME → `kiki-marine-v2437`), `index.html` (meta + 7 cache-busters → v2437), this file.

---

## v2436 — 2026-04-20
### Fixed — Report: running page header now matches the title page survey type

The `@page @top-center` running header — the small grey line that repeats at the top of every printed page after the cover — was hardcoded to `"Report of Condition & Value Marine Survey"`. The cover page h1, by contrast, already picks between `"Insurance Marine Survey"` and `"Report of Condition & Value Marine Survey"` based on `survey.surveyType`. Consequence: when an Insurance Survey was printed, the cover said "Insurance Marine Survey" but pages 2..N all said "Report of Condition & Value Marine Survey" — an internal contradiction that readers noticed and that weakens the document.

**Root cause.** Single static string in the print CSS at app.js:23301. Predates the Insurance template branch entirely — when Insurance support was added to the cover (see the `surveyType === 'Insurance survey'` check at app.js:23422) the running-header CSS was missed.

**Fix.** Replace the static string with the same conditional the title-page h1 uses:

```css
@top-center {
  content: "${survey.surveyType === 'Insurance survey' ? 'Insurance Marine Survey' : 'Report of Condition & Value Marine Survey'}";
  ...
}
```

Because this block lives inside the big template literal that builds the report HTML (`let html = \`...\``), the `${}` interpolation runs once at report-generation time — Chrome's print engine just sees the already-resolved literal string.

**Why the two spots are now yoked.** If a future survey type is added (e.g. Appraisal gets its own h1 phrasing), the cover and the running header must be updated together to stay in lockstep. The inline comment added at app.js:23300 explicitly documents that constraint alongside the line number of the sibling branch.

**Appraisal note.** Dave's current cover-page logic already treats `Appraisal` the same as `Pre-purchase survey` (both produce "Report of Condition & Value Marine Survey"), so the running header now does the same. This isn't a regression — it mirrors what the cover already does. If Appraisals should have their own phrasing ("Marine Survey Appraisal", "Appraisal Report", etc.) that's a separate task for a future version, and updating both sites at once is enforced by the comment.

**What is not changed.** The `@bottom-left` contact strip, `@bottom-center` vessel name, and `@bottom-right` page X of Y are all correct already and stay as-is. The `@page :first { @top-center { content: none; } }` rule that suppresses the running header on the cover page (v2227) is also untouched — the cover's own h1 is the title on page 1. The Word (.doc) export has no running header so nothing to change there.

**Files changed.** `app.js` (APP_VERSION → v2436; `@top-center` content replaced with conditional at app.js:23301 plus comment), `sw.js` (CACHE_NAME → `kiki-marine-v2436`), `index.html` (meta + 7 cache-busters → v2436), this file.

---

## v2435 — 2026-04-20
### Fixed — Report: uniform vertical spacing between every section

Dave spotted a large whitespace gap between Comparable Vessels (end of Statement of Valuation) and the SURVEYOR'S CERTIFICATION heading, then expanded the scope: "Vertical spacing should be uniform throughout the report. Please look throughout the report and make everything even." This pass audits and normalizes every section-level top margin in the report CSS + template so every `<h2>` boundary gets the same canonical 24px gap and every `<h3>` subsection gets the same 18px.

**What was wrong.**

1. **`.report-end-page` bottom-anchor trick (v2397).** The SURVEYOR'S CERTIFICATION was wrapped in `<div class="report-end-page">`, which an `@media print` rule styled with `page-break-before: always` + `min-height: calc(100vh - 1mm)` + `display: flex; flex-direction: column; justify-content: flex-end`. The intent was to push the cert to the bottom of its own dedicated final page — v2397 was solving the opposite complaint at the time ("cert lands high on page with 4–6 inches empty below signature"). Trade-off wasn't free: the page break plus bottom-anchor moved the whitespace from below the signature to above the heading, producing the giant gap Dave is now seeing.

2. **`.footer { margin-top: 40px; padding: 16px 0 0 0; border-top: 2px solid #066aab }`.** The cert sits inside a `.footer` div. Its 40px outer margin stacked on top of the h2's own canonical 24px `margin-top` to create an effective ~56–66px gap above the cert — vs. the 24px that separates every other h2. The 16px padding-top layered on top of that for a total visual offset that matched nothing else in the report.

3. **Valuation h3 overrides.** Two inline h3 tags inside the Rating & Valuation IIFE used `style="margin:20px 0 8px 0"` — close to the canonical h3 `margin-top: 18px` from the stylesheet but not equal, producing a subtle 2px inconsistency between STATEMENT OF VALUATION / VALUATION WORKSHEET and every other h3 (Purpose & Scope, Methodology, BUC grades, etc.).

**Fixes.**

- **Removed the `@media print` `.report-end-page` rules entirely.** No `page-break-before`, no `min-height: 100vh`, no flex column, no flex-end. The cert flows inline after the Statement of Valuation like every other section. The `<div class="report-end-page">` wrapper stays in the emitted HTML as a no-op hook for any future alternate print treatment, but it no longer imposes any layout.

- **`.footer { margin-top: 0; padding: 0; border-top: 2px solid #066aab; ... }`.** The outer margin and top padding are zeroed so the h2 inside provides the canonical 24px inter-section spacing used everywhere else. The 2px top border remains as a subtle visual cue for the legal signature block — a single hairline, not a spacing contribution. Total gap above the cert h2 is now 24px + 2px border = visually indistinguishable from any other section boundary.

- **Valuation h3 inline overrides normalized.** Both `margin:20px 0 8px 0` overrides (STATEMENT OF VALUATION at app.js:24470, VALUATION WORKSHEET at app.js:24499) are now `margin:18px 0 8px 0`, matching the default `h3 { margin-top: 18px }` from the stylesheet. The bottom margin (8px) is preserved because it tightens the heading to the content table that immediately follows — same pattern used throughout the h3 style.

**Spacing reference (canonical values in the stylesheet, unchanged by this pass).**

- `h1` (cover page title): `margin-top: 16px; margin-bottom: 8px` — unchanged, only appears once.
- `h2` (top-level section heading): `margin-top: 24px` — canonical inter-section gap.
- `h3` (subsection heading): `margin-top: 18px` — canonical subsection gap.
- `table`: `margin: 8px 0` — tight around content.
- `.item`: `margin: 6px 0` — tight around checklist items.
- `.finding-section`: `margin-top: 8px` — internal spacing inside findings blocks.
- `.bold-disclaimer`: `margin: 16px 0` — disclaimer callouts.

**Internal cert spacing not touched.** The cert block still has a `margin-top:20px` on the signature row (separates text from signature image) and `margin-top:16px` on the bottom contact strip (separates signature from contact line). Those are internal-to-the-cert rhythms, not inter-section spacing, and they were never part of Dave's complaint.

**Files changed.** `app.js` (APP_VERSION → v2435; `@media print` `.report-end-page` rules removed at app.js:23336; `.footer` rule at app.js:23370 normalized to `margin-top:0; padding:0`; STATEMENT OF VALUATION + VALUATION WORKSHEET h3 inline margins normalized from 20px to 18px; comment block above the cert updated to document the revert), `sw.js` (CACHE_NAME → `kiki-marine-v2435`), `index.html` (meta + 7 cache-busters → v2435), this file.

---

## v2434 — 2026-04-20
### Fixed — Report: pleasure-craft licence photos now match HIN/compliance plate sizing

Dave reviewed the Ex-Ta-Sea report and spotted that the Pleasure Craft Licence number on the hull ("ON406313") was rendering at roughly 2× the size of the HIN photo in the VESSEL DOCUMENTATION DATA table. The two rows sit one above the other, so the size mismatch was obvious and unprofessional.

**Root cause.** In the report generator at app.js:23688, the two licence photos (`licencePhoto` "Licence Number on Hull" and `tcPaperLicencePhoto` "Transport Canada paper licence") were emitted with inline styles:

```html
<img ... style="max-width:500px;max-height:350px;margin-top:4px;border:1px solid #ccc;border-radius:4px;" />
```

The HIN photo one row above and the Compliance plate photo one row below use `class="report-photo"`, which is defined at app.js:23398 as a fixed `234 × 176` — the standardized in-report thumb size applied to every other body photo in the document (item photos, finding photos, nameplates, four-corner overviews, safety equipment, instruments). The licence photos were the only outliers — they pre-dated the v2370 standardization pass and were never migrated to the class.

**Fix.** Replace the inline `max-width/max-height/border/border-radius` styles on both licence `<img>` tags with `class="report-photo"`, keeping only `style="margin-top:4px;"` to preserve the small top margin that separates the photo from its `<em>` caption line. The `.report-photo` CSS already provides the border + border-radius + object-fit:cover treatment that the inline styles were reimplementing, so the visual identity stays the same — just at the correct 234×176 size that matches every other report photo.

**Downstream effect.** All four VESSEL DOCUMENTATION DATA photos (HIN, Licence on Hull, TC Paper Licence, Compliance Plate) now render at identical 234×176 with identical borders. The caption lines ("Licence number on hull:" and "Transport Canada paper licence:") are unchanged, so the differentiation between Licence-on-Hull and Paper-Licence is still legible. Older reports regenerated from the same survey data will automatically pick up the corrected sizing on next Report-open — the data is untouched; only the emitted HTML changes.

**Files changed.** `app.js` (APP_VERSION → v2434; two licence `<img>` tags migrated from inline styles to `class="report-photo"` at app.js:23688), `sw.js` (CACHE_NAME → `kiki-marine-v2434`), `index.html` (meta + 7 cache-busters → v2434), this file.

---

## v2433 — 2026-04-20
### Added — Skip toggle on Instruments & Electronics section (mirrors skipComparables)

Dave's request: "I need to be able to skip the instruments and electronics section." Many surveys — especially dinghies, tenders, small day-sailers, and some charter turnovers where electronics are handled separately — have no meaningful I&E inventory to record. In those cases the surveyor doesn't want the accordion to demand a filled-in list, doesn't want the preflight to nag "No instruments or electronics listed," and doesn't want an empty INSTRUMENTS & ELECTRONICS INVENTORY section to appear in the report.

**Pattern — soft-skip, not delete.** This copies the `skipComparables` pattern introduced earlier. Toggling the checkbox sets `survey.skipInstrumentsElectronics = true` and persists. Nothing is deleted — if Dave has already added instruments (with photos, working/not-working flags, etc.) and later ticks Skip, every item stays intact in storage. Un-ticking Skip restores the full UI with all data present. This is important because the Skip toggle is a late decision for some surveys: Dave may enter a handful of instruments, then realize the section is overkill for this vessel, skip it, and later un-skip if he changes his mind without losing work.

**Three gates open when skip is true.**

1. **Inspection view body.** The accordion header still shows (so the Skip checkbox is always reachable). The body renders a lavender "Instruments & Electronics section is skipped." notice with a preserved-count line if items exist, replacing the normal item list + capture UI. The progress badge reads `Skipped` instead of the usual `N instruments • M photos` counter.

2. **Report generator.** The entire INSTRUMENTS & ELECTRONICS INVENTORY `<h2>` block at app.js:24108 is suppressed by adding `!survey.skipInstrumentsElectronics &&` to the existing length-gate. No title, no stats line, no inventory table — nothing appears between the sections that bracket I&E.

3. **Preflight.** The "No instruments or electronics listed" warning at app.js:16296 is suppressed when skipped. Without this the skip would produce a paradox: Dave skips because there's nothing to inventory, preflight then nags about the absence. Warning is now gated on `!survey.skipInstrumentsElectronics`.

**Checkbox plumbing.** The toggle is inline in the accordion header as `<label>…<input type="checkbox" onchange="toggleInstrumentsElectronicsSkip(this.checked)">`. Two `event.stopPropagation()` calls — one on the label's `onclick`, one on the input's `onclick` — prevent the accordion-toggle parent button from swallowing the tap. `toggleInstrumentsElectronicsSkip` is a new async function near the other instrument helpers (app.js:18398): fetches the current survey, sets the flag, saves via the normal `saveSurvey` pipeline (which goes through the freshness guard and guarded write chokepoint), and re-renders the inspection view.

**Data model.** Initializer at app.js:8922 adds `skipInstrumentsElectronics: formData.skipInstrumentsElectronics || false,` — defaults to false so existing surveys load with the I&E section active, exactly as they did pre-v2433.

**Push sync note.** The manual Push button still aggregates instrument photo IDs into the upload set regardless of the skip flag. Intentional — skipping the section must not orphan photos if Dave later un-skips on another device. Photos stay in the photo store; only the UI and report suppress them.

**Files changed.** `app.js` (APP_VERSION → v2433; `skipInstrumentsElectronics` field on survey init; I&E accordion rewrite with header checkbox + skipped-body branch; new `toggleInstrumentsElectronicsSkip` function; preflight gate; report gate), `sw.js` (CACHE_NAME → `kiki-marine-v2433`), `index.html` (meta + 7 cache-busters → v2433), this file.

---

## v2432 — 2026-04-20
### Changed — Comparables UI revision: Source is a real dropdown; price/currency swapped to currency-left/price-right

Dave tested v2430's Comparable Vessels changes on-device and reported two issues. Both fixed here.

**Issue 1 — Source datalist wasn't obvious as a dropdown on iOS Safari.** v2430 shipped Source as an `<input type="text" list="compSourceOptions">` paired with a shared `<datalist>` — the idea being that typing would surface preset suggestions while still allowing free-form source names. On macOS Chrome this renders with a visible chevron and is clearly a combo. On iPhone Safari it renders as a plain text field; the dropdown only opens after the user starts typing, so Dave saw "just a text box" and the presets might as well not have existed. Not acceptable for a field-first app.

**Fix.** Source is now a real `<select class="compSourceSelect">` with five options — the four preset marketplaces (BUCValu, Soldboats.com, YachtWorld, Boat Trader) plus `Other (type below)...` as the last option. Picking "Other..." reveals a conditional `<input class="compSourceCustom">` underneath, which gets focused so iOS pops the keyboard automatically. Picking any preset hides and clears the custom input. This trades off a tiny amount of typing speed for massive clarity on mobile — the presets are now visible in the picker wheel without the surveyor having to know they exist.

**Issue 2 — Price/Currency were in the wrong order and wrong proportions.** v2430 put the price input on the LEFT with `flex:1` and the currency `<select>` on the RIGHT with `flex:0 0 auto`. On Dave's screenshot the price field ended up tiny (~40px wide after the Cur select swallowed the available width) and the currency selector looked like the dominant control. Dave's request: "currency should be to the left in a smaller space and then I should be able to type the amount in the larger space to the right."

**Fix.** The currency `<select>` now sits on the LEFT with `flex:0 0 65px; width:65px` — narrow, consistent, unambiguously a picker. The price `<input>` sits on the RIGHT with `flex:1; min-width:0` — the dominant field, where the surveyor expects to type a number. Order and proportions now match Dave's mental model of the row.

**Plumbing.**

- `addComparableEntry` (app.js:13813) rewrote the Source and Price/Currency blocks. Source cell is a `flex-direction:column` wrapping the select plus the hidden custom input. Price cell is `flex-direction:row` with currency first, then price. The blur formatter is unchanged — `formatComparablePriceInput` is still attached to `.compPrice` after appending.

- New helpers `handleComparableSourceChange(sel)` and `setComparableSource(entry, savedValue)` (app.js:13425) handle show/hide of the custom input on change, and the preset-vs-custom classification on load. `COMP_SOURCE_PRESETS = ['BUCValu', 'Soldboats.com', 'YachtWorld', 'Boat Trader']` is the single source of truth for what counts as a preset; anything else loads as "Other..." with the saved text prefilled in the custom input.

- `collectComparables` (app.js:13901) now reads `.compSourceSelect.value`. If it's `"__OTHER__"` it falls back to `.compSourceCustom.value.trim()`; otherwise it uses the select value directly. Empty/placeholder select yields empty source.

- All three survey-repopulate paths (loadSurveyForEdit app.js:10841, restoreComparablesFromBackup app.js:13783, renderInspection app.js:15052) now call `setComparableSource(entry, comp.source)` in place of the old raw `.value = comp.source` assignment.

- The old shared `<datalist id="compSourceOptions">` block at app.js:10138 is removed — no longer referenced.

**Data shape unchanged.** `collectComparables` still returns `{source: "BUCValu"}` or `{source: "Some Custom Marketplace"}` identically to v2430 — the select+custom UI is just a different front-end for reading/writing the same string. Surveys saved under v2430 (free-form text) load correctly: any value not in `COMP_SOURCE_PRESETS` is classified as "Other..." and shown in the custom input. Surveys saved under ≤v2429 with a legacy preset select value also load correctly because the v2432 preset list matches the old option values exactly.

**Files changed.** `app.js` (APP_VERSION → v2432; comparables section datalist removed; `addComparableEntry` rewrite; new `handleComparableSourceChange` + `setComparableSource` helpers + `COMP_SOURCE_PRESETS` constant; `collectComparables` select+custom read; 3 populate paths updated), `sw.js` (CACHE_NAME → `kiki-marine-v2432`), `index.html` (meta + 7 cache-busters → v2432), this file.

---

## v2431 — 2026-04-20
### Fixed — BUC matcher cross-brand collision: "Silverton 34C" no longer returns "C&C 34"

Dave reported that entering **1988 Silverton 34C** in Edit Intro and tapping the 📊 valuation suggestion populated **C&C 34 (1984–1990)** as the match — clearly the wrong boat. Root-caused in `findBoatValues` at app.js:11713.

**Root cause.** The existing matcher stripped non-alphanumerics from both the input and every DB candidate, then did two-way substring overlap on every token. For this input:

- Input tokens (after year strip, lowercase, non-alphanumerics removed): `["silverton", "34c"]`
- C&C 34 tokens (`&` stripped): `["cc", "34"]`
- `"34c".includes("34")` returns true, and `"34".includes("34c")` is checked the other direction too, so the matcher counted a hit on both the input side (matchedSearch=1) and the candidate side (matchedCand=1).
- Score = (1/2 + 1/2) / 2 = **0.5**, which cleared the 0.4 threshold. The C&C 34 range `lowUSD: 28000, highUSD: 45000` was returned for a 1988 Silverton.

The Silverton 34C isn't actually in `boat_values_db.json` — the correct behaviour for this input is a null return, which triggers the "No built-in value data found" fallback card with Yachtworld and BUCValu links. The matcher was just too permissive.

**Fix — two gates run before scoring.** Either gate can skip a candidate outright, preventing it from competing for the best-score slot.

- **Brand gate.** An input token of length ≥ 3 that doesn't start with a digit counts as a "brand word" (`silverton`, `beneteau`, `alberg`). If the input has any brand words, the candidate must (a) have at least one brand word of its own, AND (b) at least one input brand word must substring-match at least one candidate brand word. For `Silverton 34C` vs `C&C 34`: candidate brand words = `[]` (`cc` is too short), so the candidate is rejected. The whole wrong-brand class of bugs collapses to this one gate.

- **Digit-token gate.** A token that starts with a digit is treated as a model number (`34`, `34c`, `407` from `40.7`, etc.). If **both** the input and the candidate have digit-starting tokens, at least one pair must substring-match either way. This catches the adjacent bug the brand gate wouldn't — `Silverton 34C` silently matching `Silverton 31 Sedan` on brand alone. With the digit gate, `34c` vs `31` has no substring overlap, so the candidate is skipped. If the input has no digit tokens (user omitted the model), the gate is inert — anything with the right brand can match.

- **Threshold unchanged at 0.4.** The gates prevent the bad cases from being scored in the first place; the threshold only matters for borderline cases that clear both gates. Raising it would also reject legitimate loose matches like `Silverton 34C` → `Silverton 34 Convertible` (if that entry existed), which is the kind of fuzziness this matcher is supposed to provide.

**Trace of Dave's example after the fix.** Input `1988 Silverton 34C` → tokens `["silverton", "34c"]`. Walking the DB: every `Alberg` / `Bavaria` / `Beneteau` / `C&C` / `Catalina` / `Hunter` / etc. entry fails the brand gate (their brand tokens don't contain or get contained by `silverton`). The two Silverton entries in the DB (`Silverton 31 Sedan`, `Silverton 38 Convertible`) pass the brand gate but fail the digit gate (`34c` vs `31`, `34c` vs `38` — no overlap). Result: `null`, which triggers the Yachtworld / BUCValu fallback card. Exactly what should have happened the first time.

**What didn't change.** The score formula, the 0.4 threshold, the year-range selection inside a matched entry, the single call site (`suggestValuation` at app.js:12011), the fallback card UI, and the `boat_values_db.json` contents. The change is scoped to four inserted blocks inside `findBoatValues`: the helper classifiers, the brand gate, the digit gate, and a header comment explaining the rationale.

**Known limitation retained.** If the user types only a model without a brand (`1988 34C` on its own), `hasBrand` is false, the brand gate is skipped, and the matcher falls back to the original substring behaviour — which could still match `C&C 34`. No real user types model-only, so this is left alone rather than adding guess-the-brand heuristics.

**Files changed.** `app.js` (APP_VERSION → v2431; `findBoatValues` brand + digit gates + header docblock), `sw.js` (CACHE_NAME → `kiki-marine-v2431`), `index.html` (meta + 7 cache-busters → v2431), this file.

---

## v2430 — 2026-04-20
### Changed — Comparable Vessels: free-form Source input, per-row currency selector, auto-formatted "9,999,999.00" price

Small but overdue usability fix to the Comparable Vessels section on Edit Intro. Dave asked for three things together and they all touch the same DOM/collector/report triad, so they ship as a single feature version.

**What this ships.**

- **Source is now free-form text with autosuggest (app.js:13720).** Previously Source was a fixed `<select>` whose only escape hatch was an "Other" option. Typing a marketplace that wasn't in the preset list was not possible. It is now an `<input type="text">` backed by a shared `<datalist id="compSourceOptions">` (app.js:10138) that offers BUCValu / Soldboats.com / YachtWorld / Boat Trader as suggestions while accepting any text Dave types. No schema change: the saved shape is still `{source: "..."}` — it's just no longer constrained to a preset list.

- **New per-row currency selector (app.js:13724).** A compact `.compCurrency` `<select>` sits to the right of the price input in the same grid cell, with options: (blank) / CAD / USD / EUR / GBP / AUD. The report header used to hardcode "Price (USD)" — this was wrong for Canadian market comparables and was probably misleading Dave on desktop review. It's now "Price", and the per-row currency (when set) is rendered as a prefix on the price cell: `CAD 125,000.00`.

- **Price auto-formats to "9,999,999.00" on blur (app.js:13326).** New helper `formatComparablePriceInput(input)` is wired up by `addComparableEntry()` and by all three survey-repopulate paths. It strips non-numeric chars (keeping at most one decimal), parses to a float, and reformats via `toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})`. Distinct from `formatCurrencyInput` because comparables need cents (the concluded-value field does not), and comparables should not trigger the aggressive "low-value warning" that catches concluded-value data-entry errors (a listed sailboat at $499 isn't a data-entry error).

**Data shape.** `collectComparables` (app.js:13789) now returns `{source, vessel, price, currency, location, date, water, notes}` per row. Existing surveys saved before v2430 have no `currency` field; the report rendering tolerates this (just omits the prefix) and the populate paths read `comp.currency || ''`, so nothing breaks on load.

**Populate paths updated (3 call sites).** All three spots where saved comparables are written back into DOM inputs now also set `.compCurrency.value` and fire a synthetic `blur` on `.compPrice` to reuse the formatter that `addComparableEntry` already attached. The third path (app.js:14983) also renames the local `sourceSelect` variable to `sourceInput` since Source is no longer a `<select>`.

**What did NOT change.** `guardedAssignComparables` (v2383), the undefined-sentinel in `collectComparables` (v2377), and the sessionStorage backup / one-tap restore (v2383) are all untouched. The report comparables table still appears only when `survey.comparables.some(c => c.vessel)` and still respects `survey.skipComparables`. Valuation inputs (`valuationLow`, `valuationHigh`, `concludedValue`, `replacementCost`) still use the original `formatCurrencyInput` — whole-dollar, comma-only — since those are surveyor's-opinion fields, not quoted market prices.

**Files changed.** `app.js` (APP_VERSION → v2430; `formatComparablePriceInput` added; `addComparableEntry` template rewrite; `collectComparables` currency field; 3 populate paths; report header + price-cell rendering), `sw.js` (CACHE_NAME → `kiki-marine-v2430`), `index.html` (meta + 7 cache-busters → v2430), this file.

---

## v2429 — 2026-04-20
### Changed — Unified conductivity chip set across Hull / Deck / Aft Deck / Flybridge; rudder scrub extended to cover conductivity on power boats

Three closely related changes ship together as v2429. All four conductivity sections now share a consistent observation ladder (lead → rating-specific observed → means → action → NT block), with wording Dave approved 2026-04-20 in `reference-docs/CONDUCTIVITY_CHIP_AUDIT.md`. The rebuild is scripted and reproducible.

**What this ships.**

- **174 new conductivity chips, 103 old chips removed (scripted rebuild).** The script at `scripts/rebuild_conductivity_chips.py` strips every existing chip from these sections in `text_library.json` and writes the unified set in their place:
  - Hull category → "Hull and rudder(s) conductivity testing" (+9 net)
  - Deck category → "Deck and coachroof/pilothouse conductivity testing" (+24 net)
  - Aft Deck category → "Aft deck conductivity testing" (+12 net; the "Conductivity testing" alias section is deleted from the library and routed via `SHEET_MAPPING` at app.js:1523)
  - Flybridge category → "Flybridge conductivity testing" (+26 net)
  - Cockpit conductivity testing is intentionally untouched (different surface, not in Dave's scope for this pass).

- **Per-rating chip template.** For each of A / B / C, every section contains: 2 lead chips (always present) + 4 "observed" body chips + 3–4 "means" chips + 3–4 "action" chips. The NT (not tested) block has 1 lead, section-specific reason chips, 1 means, and section-specific action chips.

- **Lead chip wording chosen to avoid subject/verb pitfalls.** Reworded from the previous "The {loc} was checked with a conductivity meter..." to **"Conductivity testing was carried out on the {loc} using a relative scale of 0 to 999."** The earlier form produced the ungrammatical "The hull and rudder(s) **was** checked..." on sailboats (compound subject takes a plural verb). The new form's subject is always "testing" (singular), so it reads naturally for every section, compound or not. The NT lead uses the same grammatical pattern: "Process / limitation: Conductivity testing of the {loc} was not carried out."

- **Resolves task #121 ("remove redundant 'consistent with vessels of similar age' chip").** The pre-v2429 Hull section had two near-identical C-rating chips using "consistent with vessels of similar age and construction." Both are stripped in the rebuild. The replacement set keeps a single "within an expected range for a vessel of similar age and construction" chip that communicates the same surveyor intent more cleanly.

- **Resolves task #122 ("conductivity testing: strip rudders from power boats (item + snippets)").** In `app.js`, renamed `isPowerBoatRudderResonanceItem` → **`isPowerBoatHullRudderTest`** and broadened the regex to also match "conductivity testing" alongside impact / resonance / percussion. The existing alias `const isPowerBoatRudderResonanceItem = isPowerBoatHullRudderTest;` keeps all current call sites working — `_itemSnippetCtx`, `displayItemLabel`, post-expand `pluralizeRudder` gate, and `findTextVariants` post-process scrub. Net effect: on a power boat, the Hull conductivity label displays as "Hull conductivity testing" (rudder stripped) and chip text like "Conductivity testing was carried out on the hull and rudder(s) using..." gets scrubbed by `scrubNakedRudderRefs` to "Conductivity testing was carried out on the hull using..." at chip-tap time. Rationale: a bronze power-boat rudder has no fibreglass laminate, so a moisture-meter reading on it is meaningless — the same logic Dave approved for resonance/percussion in v2386.

**Script details.** `scripts/rebuild_conductivity_chips.py` is idempotent: re-running produces the same output (section chips are stripped and rewritten, not appended). `SECTION_CFG` holds per-section `{loc}` values, NT reasons, and NT actions. `OBSERVED`, `MEANS`, and `ACTION` dicts hold the shared, location-neutral body chip text per rating. `SEVERITY` maps rating → severity integer to match existing library conventions.

**What did NOT change.** No changes to `findTextVariants` matching order, `ITEM_SNIPPET_MAP` routing, snippet token expansion, or any other code path. The library JSON change is section-scoped — everything outside the four conductivity sections is byte-identical to pre-v2429.

**Files changed.** `app.js` (APP_VERSION → v2429; `isPowerBoatHullRudderTest` rename + conductivity regex), `sw.js` (CACHE_NAME → `kiki-marine-v2429`), `index.html` (meta + 7 cache-busters → v2429), `text_library.json` (174 chips added, 103 removed across 4 sections), `scripts/rebuild_conductivity_chips.py` (docstring + lead-wording update), this file.

---

## v2428 — 2026-04-20
### Changed — Manual sync rollback: auto-push REMOVED, explicit Push / Pull buttons per survey (P0 correction to v2427)

v2427 added safety rails around the automatic push path. Dave pushed back: "This is not what we discussed. This is supposed to be manual. No automatic decisions about what is richer. I decide — do I want to push or pull from either side." v2428 implements that.

**What this ships.**

- **`saveSurvey` wrapper no longer auto-pushes to Firebase (app.js ~26849).** Every save used to fire `FirebaseSync.pushSurvey(survey)` in the background. That call is gone. Local IndexedDB save still happens exactly as before. The lastModified timestamp bump still happens. Drive auto-sync (every 30 s per survey) still happens — Drive was never the problem and is useful as a low-risk secondary backup. Only the Firestore leg is now manual.

- **`savePhoto` wrapper no longer auto-pushes to Firebase Storage (app.js ~26864).** Same rationale: capture a photo → IDB write only. Cloud upload waits for an explicit Push. The wrapper is kept as a pass-through so future work can re-hook it (queued batch upload, Drive-side push, etc.) without restructuring.

- **`FirebaseSync.pushSurvey()` is now an unconditional overwrite (app.js ~26118).** The v2427 conflict-copy logic is gone: no `checkCloudRichness` call, no `survey_conflicts/{id}__{device}__{ts}` write path, no rate-limit, no richness-based UI warning. The function does exactly what its name says — write the local copy to `surveys/{id}`. Callers are responsible for asking Dave first.

- **New overflow-menu buttons (app.js ~15030), with side-by-side overwrite-confirm dialogs:**
  - **☁️ Force push to cloud** — Before running, peeks at the cloud doc and shows a red-headlined confirm with the content scores for BOTH sides: `rated · photos · chars` + `modified {time}` for this device and for cloud. If the cloud has no copy yet, the summary says "no cloud copy yet — this push will create one" instead. Only after Dave taps `Force push` does it call `pushSurvey(survey)` + `pushAllPhotosForSurvey(survey)`. Photos are idempotent — re-pushes skip anything already in Firebase Storage.
  - **⬇️ Force pull from cloud** — Same side-by-side confirm pattern (cloud on top, local on bottom). If the peek returns null (no cloud copy, or cloud unreachable), the pull is blocked with a clear message rather than silently overwriting local with nothing. On confirm, calls `pullSurvey(id)`. Survey + photos are overwritten from cloud. The survey is re-rendered so Dave sees the pulled copy.
  - Button labels use the word "Force" and the confirm dialog shows the word "OVERWRITE" in red. The old "Push to cloud" / "Pull from cloud" wording was too soft — two outside reviewers flagged that unconditional overwrite without explicit "force" framing is the biggest remaining data-loss risk in this architecture.

- **`pushAllPhotosForSurvey` exposed on `FirebaseSync`'s public API.** Already existed as a private helper inside the module; now callable from the menu button.

- **`peekCloudSurvey(surveyId)` added to `FirebaseSync` (new helper, app.js ~26230).** Reads the cloud doc without writing anywhere. Returns the remote survey object on hit, null on a clean miss (no cloud copy yet), and **throws** on any transient failure (network down, permission error, firebase not loaded). The throw-vs-null distinction is load-bearing: the Push dialog uses it to show "no cloud copy yet — this push will create one" vs "could not reach cloud — any existing cloud copy WILL be overwritten if it exists", and the Pull dialog uses it to block with "Could not reach the cloud — check connection and try again" instead of silently telling Dave there's no cloud copy when in fact we just couldn't see one.

- **`scoreSurveyContent` exposed on `FirebaseSync`'s public API.** The same `_scoreSurveyContent({textChars, photoCount, ratedItems})` the open-survey richness banner uses internally. Exposing it keeps the numbers in the Force-push/pull confirm identical to the numbers in the open-survey banner — one source of truth for "how rich is this survey?"

**What did NOT change.**

- Drive auto-sync is unchanged. Saves still trigger a throttled (30 s per survey) JSON push to Drive if signed in. Drive has no automatic pull and no "is richer" logic — it's append-only backup per vessel/date.
- The `checkCloudRichnessBanner` on survey open (v2427) still fires: it informs Dave when the cloud copy has more content and offers Pull / Keep-local buttons. It does not write anything automatically. Kept because it surfaces information Dave wants without taking action behind his back.
- `pullNow()` console helper is still there. `pullSurvey(id)` is still there. Everything that was already manual stays manual.
- `removeSurvey` / `removePhoto` wrappers still auto-propagate deletes to Firebase. Delete is an explicit one-shot user action (not triggered by every keystroke), and Dave has not asked for manual delete sync.

**Rationale.**

The v2427 conflict-copy branch was an attempt to make automatic sync safe. Dave's position is that automatic sync should not exist at all — richness scoring is the app making a decision, and he wants to make the decision. v2428 is a full rollback to manual: saves never touch cloud, button taps do. This matches the Device Roles design planned for v2430 (field mode vs report mode) and is a cleaner architectural foundation for that work.

**Files changed.** `app.js` (APP_VERSION bumped to v2428; saveSurvey wrapper; savePhoto wrapper; `pushSurvey` body; public API surface; inspection overflow menu), `sw.js` (CACHE_NAME → `kiki-marine-v2428`), `index.html` (meta + 7 cache-busters → v2428), this file.

---

## v2427 — 2026-04-20
### Added — Safe sync, half 1: push-side conflict-copy + open-survey richness banner (P0 follow-up to v2426)

v2426 removed automatic pulls. v2427 closes the remaining hole: the unchecked `pushSurvey` path that let a thin local save silently overwrite a richer cloud copy. This was the failure mode that cost 6% of Legacy II (81% → 75%) earlier today.

**Standard pattern chosen.** After a back-and-forth discussion about how other apps handle this, Dave chose the Dropbox / iCloud Drive model: on conflict, **preserve both copies, never overwrite**. A second screen (v2428) provides the reconciliation UI. This is a well-known pattern — it's what Dropbox calls "conflicted copy" and what iCloud calls "version conflict." We're not inventing.

**What ships in v2427 (half 1 — the safety layer).**

- **Push-side conflict-copy fallback (`pushSurvey`, app.js:25939+).** Every `pushSurvey` call now begins with a `checkCloudRichness()` probe. If the cloud copy of the same survey is richer than local (same threshold formula the old pull-side guard used: text chars +20%+50ch, strict photo count, strict rated-items count), the push does NOT touch `surveys/{id}`. Instead it writes to `survey_conflicts/{id}__{device}__{timestamp}`. Both the cloud main doc and the local attempt are preserved. Sync status shows "Conflict saved — reconcile in Settings"; a toast tells Dave what happened.

- **Separate Firestore collection for conflicts (`survey_conflicts`).** Conflict copies live outside the `surveys` collection so `initialSync()` doesn't pull them down as phantom entries on the home screen. The v2428 reconciliation UI will read from this new collection.

- **Rate-limit on conflict-copy writes (60 s per survey).** A session where the user keeps editing while cloud stays richer would otherwise create a conflict copy on every save. First save in a 60 s window writes the copy; subsequent saves within that window skip. Local IDB is always updated regardless.

- **Open-survey richness banner (`openSurvey`, app.js:22087+).** When a survey opens, an async cloud probe fires 50 ms after `renderInspection`. If cloud is richer, a yellow banner slides in at the top of the inspection view with the numeric breakdown (Cloud: X chars · Y photos · Z rated  vs  This device: ...) and two buttons:
  - **Pull cloud down** — confirms, then calls `FirebaseSync.pullSurvey(id)` to overwrite local with cloud (survey + photos). On success, re-opens the survey with fresh data.
  - **Keep local** — dismisses the banner for this survey for the session (a reload clears the dismiss). No push is triggered; Dave keeps editing local.

- **New helpers on `FirebaseSync`.**
  - `checkCloudRichness(survey)` — probes cloud, returns `{cloudRicher, localScore, remoteScore, cloudSurvey}` or `{cloudRicher:false, error}` on failure.
  - `pullSurvey(id)` — pulls one survey + photos from Firestore. Scoped to a single survey, unlike `pullNow()` which iterates all.
  - `_getDeviceLabel()` — cheap userAgent-based device label for conflict-copy paths (iPhone / iPad / Mac / Windows / Android).

- **No change to the rest of v2426.** Bidirectional auto-sync stays disabled. `pullNow()` still exists as the console-level manual pull. The richness guard inside the dead `startListening` path is untouched.

**What did NOT change.**

- Normal `pushSurvey` path (when cloud is not richer) is identical to v2426. Writes to `surveys/{id}` exactly as before.
- Photo sync is unchanged. Conflict-copy docs in `survey_conflicts` do NOT trigger photo pushes — photos stay local until Dave promotes the conflict (v2428). The `surveys/{id}` main doc's photo references are unchanged, so photos tied to the cloud main are still reachable via `pullPhotosForSurvey`.
- iPhone is still on v2426 until Dave force-refreshes it. Once iPhone picks up v2427, it gets the same guarantees.

**What's next (v2428 — half 2).**

- Settings > Sync Conflicts screen listing everything in `survey_conflicts`. Per-conflict buttons: Promote to main (overwrites `surveys/{id}` + pushes conflict photos, then deletes the conflict doc), Pull to this device (overwrites local IDB with conflict data), Discard (deletes the conflict doc).
- Home-tile badges showing per-survey divergence at a glance.

**Files changed.** `app.js` (APP_VERSION, `FirebaseSync` push/helpers, `openSurvey` hook, new `checkCloudRichnessBanner`), `sw.js` (CACHE_NAME), `index.html` (meta + 7 cache-busters), this file.

---

## v2426 — 2026-04-20
### Changed — Bidirectional sync disabled; device handoff is now manual-only (P0 architecture change, follow-up to Legacy II recovery)

Third ship of the day. v2424 closed stale-write; v2425 closed silent-quota; v2426 closes the cross-device auto-pull hazard that caused the Legacy II data-loss scare.

**Why this ships now.** During the Legacy II recovery, an iPhone→Mac onSnapshot fired a pull that started to overwrite richer local state on the Mac with a thinner cloud snapshot. The richness guard (app.js:25992) refused the overwrite, but the fact that an automatic pull was even attempted is the underlying design flaw. Two devices editing the same Firestore document with onSnapshot is a race by construction. v2426 removes the race by removing the automatic pull path entirely.

**The new rules (per Dave, 2026-04-20):**

1. *No cross-device auto-sync, ever.* iPhone and Mac never pull each other's state without an explicit user action. Handoff between devices is always manual.

2. *In-field auto-backup scoped to the CURRENT survey only.* While editing a survey, the device continues to push to Firebase and Drive for that one survey — that's belt-and-braces insurance against device loss. No other survey on the device is touched by auto-backup.

3. *Non-blocking.* The backup path must not slow capture or cause crashes.

**What changed in code.**

- **`FirebaseSync.init()` (app.js:26505)** — Already rewritten. Sets `_syncEnabled = true` (so the push wrapper at line 26598 still fires on every `saveSurvey`) but skips `startListening()`, skips installing the 5-minute periodic timer, and skips the `visibilitychange` handler. One log line: `v2426: Bidirectional sync disabled. Pushes active. Call FirebaseSync.pullNow() for explicit pull.`

- **`FirebaseSync.pullNow()` (app.js:26523)** — New explicit, user-initiated pull. Delegates to the existing `initialSync()` path so the richness guard and `lastModified` resolution still apply per-survey. Returns `{ ok: true }` or `{ error: ... }` so a console caller can see the result.

- **`FirebaseSync` public API (app.js:26551)** — **Removed `periodicSync`** from the exports. `periodicSync()` iterates every local and remote survey and pulls each one, which directly violates Rule 2 (auto-backup must be scoped to the CURRENT survey). The function body is intentionally left in place in the module so the diff stays legible and so future rollback is cheap, but it has zero callers after this change. **Added `pullNow`** so manual pull is callable from the console.

**What did NOT change.**

- `pushSurvey` / `pushPhoto` hooks on `saveSurvey` (app.js:26598+) — still fire on every save. Rule 2 compliance: `saveSurvey` only ever writes one survey at a time, so the per-save push is inherently scoped to the survey being edited. No other survey is touched.
- `_scheduleDriveAutoSync` (app.js:26574) — 30-second throttled Drive push per active survey. Same per-survey scope argument.
- Idle-drain queue (app.js:2458) — local-only; no network; unaffected.
- Richness guard (app.js:25992) — still in place as a second line of defence if a `pullNow()` is triggered against a thinner cloud snapshot.

**Handoff workflow (interim, until v2430 "Device Roles" UI ships).**

- *iPhone finish → Mac start:* run `FirebaseSync.pullNow()` in Mac DevTools console. Wait for `Manual pull complete`. Reload the Mac app. Verify the surveys in the home list match what was last on the iPhone.
- *Mac finish → iPhone start:* same idea in reverse (iPhone Safari → Web Inspector → `FirebaseSync.pullNow()`). v2428 will introduce photo-placeholder pushes so the iPhone doesn't re-download hundreds of MB.

**Pre-ship safety net.** Before this version shipped, `pre_v2426_full_backup.js` produced one stored-mode zip per survey in Mac IDB (`/Documents/Kiki Marine App/Backups/pre-v2426/`). If v2426 exposes a regression, roll back by re-running the reconstruction script from those zips.

**Atomic cache bump**: APP_VERSION (app.js:8), CACHE_NAME (sw.js:1), meta app-version (index.html:9), 6 core module cache-busters + app.js cache-buster (index.html:714-720) all to v2426.

---

## v2425 — 2026-04-20
### Added — Persistent storage request + QuotaExceededError surfacing (P0 hotfix, iPhone-only survey day)

Second stability hotfix of the morning, ahead of Dave's iPhone-only field survey today. v2424 closed the stale-write regression class; v2425 closes two remaining silent-loss risks on the capture path.

**1. `navigator.storage.persist()` request on startup (app.js initApp, line 24257)**

On iOS Safari, IndexedDB storage is subject to eviction under storage pressure. A 6-8h field survey generating hundreds of photos can push the iPhone into the eviction window without any user-visible signal — Dave would only notice when a photo "wasn't there anymore." The Storage Standard's `persist()` API promotes the origin's IDB to "persistent," meaning the browser must not evict it without user action.

The call is fire-and-forget: it returns a Promise resolving to `true` (granted) or `false` (denied). PWAs installed to the iOS home screen are typically granted persistence automatically, so Dave's installed app gets this for free; the explicit call is a belt-and-braces guarantee for the non-installed Safari case (e.g. if he ever opens the site in a browser tab directly). Wrapped in try/catch so any exception or missing-API environment falls through silently — persist() is pure upside and must never block startup.

**2. `_v2425HandleQuotaError` — QuotaExceededError surfacing in savePhoto + saveSurvey (app.js)**

Before v2425, a QuotaExceededError on `store.put()` in either savePhoto (line 2393) or saveSurvey (the `_performPut` helper inside the v2424 freshness-guarded Promise at line 1889) would reject the promise and log. From Dave's perspective in the field, the only visible signal was "the photo didn't appear" or "my save didn't stick" — the first clue that storage filled could be silent photo loss hours later.

`_v2425HandleQuotaError(err, context)` is a shared helper called from both IDB onerror handlers we own. It sniffs for the three common quota-error names (`QuotaExceededError` on Chromium/WebKit, `NS_ERROR_DOM_QUOTA_REACHED` on Gecko, plus any `/quota/i` match in the message) and surfaces a prominent toast when detected:

`STORAGE FULL - back up to Drive and free iPhone space before continuing.`

The original reject still fires so upstream error handling (SaveStatus.markError, _kkSaveInProgress cleanup, promise rejection) is unchanged — v2425 is purely additive surfacing on top of the existing error path. The helper is wrapped in its own try/catch so a failure in the surfacing layer can never block the reject.

**Out of scope for v2425** (deferred so the surface area stays small on a same-day ship):
- Visible storage-usage banner driven by `navigator.storage.estimate()` — planned for a future version, would show a yellow banner if iPhone free space falls below ~500MB. Requires UI work; skipped today to minimise regression risk.
- Pre-save free-space check with a refuse-and-warn path — same reason; today's fix catches the quota error when it happens rather than anticipating it.

**Atomic cache bump**: APP_VERSION (app.js:8), CACHE_NAME (sw.js:1), meta app-version (index.html:9), 6 core module cache-busters + app.js cache-buster (index.html:714-720) all to v2425.

---

## v2424 — 2026-04-20
### Added — Stale-write freshness guard on saveSurvey (P0 hotfix)

Post-mortem on the 2026-04-19 Ex-Ta-Sea regression identified Firestore two-way sync as the carrier. On the Mac, a visibilitychange/pagehide event fired `_flushOnHide` (app.js:2065), which persisted the page's in-memory survey object — but that object was a *stale closure* from an earlier edit session, missing items and text that had since arrived via the Firestore `onSnapshot` listener. The sync wrapper at app.js:26340 stamped a fresh `lastModified` and pushed the shrunken record to Firestore, which propagated back to the iPhone. The existing richness-guard at app.js:25786 only fires on a >20% shrink; Ex-Ta-Sea shrank ~5%, so the guard missed it.

v2424 adds a content-based freshness guard inside `saveSurvey` itself, one layer below the sync wrapper so the refused write never even hits the Firestore push path.

**Detection (app.js `_v2424DetectStaleRegression`)** — a write is treated as a stale regression when ALL of:

1. **droppedItems ≥ 2** — at least two item keys present in the existing IDB record are missing from the incoming save payload. One dropped item is plausible (misclick, relabel); two-plus in a single save is almost never intentional and matches the Ex-Ta-Sea pattern (3 items dropped).
2. **nameChanged OR textShrunk ≥ 200 chars** — either the vessel name changed from a non-empty existing value, OR item-level `text` shrank by ≥ 200 chars total (chars lost from dropped keys plus per-item shrinkage on shared keys). The Ex-Ta-Sea regression reverted the name "Ex-Ta-Sea." and wiped 522 chars of narrative — both signals light up.

The thresholds are deliberately conservative to avoid blocking legitimate edits. Empty-existing-name is excluded so newly-saved surveys with a blank name can be filled in freely.

**Enforcement (app.js `saveSurvey`, restructured)** — the existing `store.get(survey.id)` pre-read (from v2401 journaling) now gates the `store.put(survey)`. The put is only issued inside `getReq.onsuccess` after the guard has cleared the save. On regression:

- `store.put()` is NOT called — the transaction commits unchanged, so IDB stays at the richer pre-save state.
- The refusal is journaled via `_journalSurveyWrite(survey, _v2401Caller + ':REFUSED_STALE', beforeRecord)` so the forensic trail records the attempt, the caller, and the before/after sizes.
- A toast — `⚠️ Save refused — stale data detected. Reload the page.` — surfaces the refusal to Dave in the field.
- The promise resolves with `null`.

**Sync short-circuit (app.js:26340 sync wrapper)** — the wrapper now checks `if (result === null) return null;` immediately after the `_originalSaveSurvey` call. This skips both the Firestore push and the Drive auto-sync, so the stale in-memory state never leaves this device. Without this short-circuit, the `lastModified` bump earlier in the wrapper would have been pushed to Firestore attached to the unchanged IDB record, and the regression would still leak across devices.

**Fail-open behaviour** — every guard path is wrapped in try/catch. Any exception inside `_v2424DetectStaleRegression` or the journal/toast calls silently falls through to the normal save path. Silently blocking saves on a guard-bug would be worse than the original regression class.

**Bundled with v2423** — v2423 (anti-vibration mounts C observed chip reorder) was staged but never pushed. Both changes ship together in the v2424 push. The atomic cache bump (app.js APP_VERSION, sw.js CACHE_NAME, index.html app-version meta + 7 module cache-busters) covers both.

---

## v2423 — 2026-04-20
### Changed — Anti-vibration mounts C observed chip order

Dave flagged that on the anti-vibration mounts C-rating chip list, "They showed virtually no corrosion or cracking and appeared in satisfactory condition." should be the first snippet in the list. Previous order surfaced the more technical "very little corrosion" / "visual observation only" chips first, with the positive confirmation chips at the bottom.

New order in `text_library.json`:

1. "They showed virtually no corrosion or cracking and appeared in satisfactory condition." (C - just changed)
2. "The anti-vibration mounts showed very little corrosion or cracking and appeared in acceptable condition." (C)
3. "As this was a visual observation only and did not constitute a mechanical assessment, serviceability could not be confirmed." (C)
4. "According to the owner, the anti-vibration mounts had been changed recently." (C - just changed)

All four entries already live under the `"section": "Anti-vibration mounts"` bucket in text_library.json so the chip picker renders them in file order. `isRatingMatch` in `findTextVariants` (app.js:7220) uses first-char match for C, so both "C" and "C - just changed" variants surface on a C-rated item — ordering is preserved as Dave sees it in the UI.

No wording changes — this is strictly a reorder so Dave's most common selection is a single-tap away. The "They" pronoun in chip 1 is intentional: in Dave's workflow the chip combines naturally with the owner-confirmation chip (#4) when both are tapped, producing a full sentence pair. When tapped alone, Dave routinely adjusts the leading pronoun in the note textbox before saving.

text_library.json is fetched network-first by the service worker (sw.js:154), so the new order propagates on next survey open without needing a cache bump — the CACHE_NAME bump to v2423 is standard atomic-release practice.

---

## v2422 — 2026-04-19
### Fixed — Round X delete buttons on photo thumbnails (iOS)

Photo-thumbnail delete X buttons rendered as horizontal ovals on iPhone/iPad Safari instead of the clean round circles they are on desktop Chrome. Dave flagged this multiple times across versions — the fix was deferred because it kept getting bumped behind snippet work. Addressed comprehensively across all four thumbnail-delete call sites.

Root cause varied per site:

- **`<button>` sites** — iOS Safari applies `-webkit-appearance: button` by default to every `<button>` element. That stylesheet rule layers a native-button chrome (rounded-rect pill on iOS) on top of any author CSS, so `width: 28px; height: 28px; border-radius: 50%` gets quietly overridden into an oval the width of the button's computed minimum plus native padding.
- **`<span>` sites** — spans don't have the webkit-appearance issue, but they did not have `min-width` / `max-width` / `min-height` / `max-height` constraints. Under flex layout (and the occasional iOS font-metric quirk on emoji-adjacent glyphs like ✕), the intrinsic content width of the ✕ glyph could force the span slightly wider than `width: 22px` on some font-size renderings.

Fixes applied at four sites:

1. **app.js:14347** — Area-photo initial render delete X (main category loop). `<span>`: added `min-width / max-width / min-height / max-height: 22px` matching the existing `width / height`, plus `overflow:hidden`, `box-sizing:border-box`, `line-height:22px`, `text-align:center`, `-webkit-text-size-adjust:none`, `-webkit-tap-highlight-color:transparent`.
2. **app.js:18559** — Area-photo `refreshAreaPhotoGrid` delete X (re-render after reorder / toggle). Same `<span>` fix as above so both render paths stay in sync. (The initial render and the refresh must match verbatim — divergence here would mean thumbnails render round the first time and oval after a reorder, or vice versa.)
3. **app.js:20395** — Form-view photo-item delete X (post-save / renderInspection form). `<button>`: added `-webkit-appearance:none; appearance:none;`, `type="button"`, `aria-label`, `min-width / max-width / min-height / max-height: 28px`, `padding:0`, `line-height:1`, `display:flex / align-items:center / justify-content:center` so the × glyph centres regardless of native-button padding. This is the bigger 28px button with a negative `top: -8px; right: -8px;` that sits on the corner of each photo card.
4. **app.js:26798** — Batch camera strip delete X (in-camera staged-photo strip). `<button>`: added `-webkit-appearance:none; appearance:none;`, `type="button"`, plus `min/max width/height 18px`, `overflow:hidden`, `-webkit-tap-highlight-color:transparent`. This is the small 18x18 button with a `2px solid #111` border that sits on the top-right of each staged thumbnail in the batch cam strip.

All four sites now use the same idiom:

```
-webkit-appearance:none;appearance:none;  /* only on <button> — overrides iOS native chrome */
width:Npx;height:Npx;
min-width:Npx;min-height:Npx;
max-width:Npx;max-height:Npx;
border-radius:50%;
box-sizing:border-box;
overflow:hidden;
display:flex;align-items:center;justify-content:center;
-webkit-tap-highlight-color:transparent;   /* kills the grey tap flash on iOS */
```

No visual change on desktop Chrome where `-webkit-appearance: button` wasn't overriding author CSS anyway. On iOS PWA / Safari the delete X's now render as clean red circles at every size.

`type="button"` added on the two `<button>` sites to prevent any stray form submission if these end up inside a `<form>` ancestor — defensive hardening.

Remaining queue after this push: v2423 anti-vibration reorder, v2424 black water chip cleanup, v2425 hot water singular, v2426 stove fuel-type picker, v2427 shore power NT snippets, v2428 aft deck conductivity mirror.

---

## v2421 — 2026-04-19
### Added — Drop files onto category area-photo grids

v2419 added drag-to-reorder inside the area-photo thumbnails but did **not** add file-drop from the OS into those grids — Dave flagged the miss in the field ("I'm not seeing the photo changes (drag and drop and drag in one place…)"). v2421 finishes the job: dragging image files from Finder/Files app / the Photos app / a desktop folder directly onto a category area-photo section (e.g. "Deck and coachroof/pilot house photos", "Flybridge photos") now attaches those files to that media item and refreshes the grid in place.

Implementation reuses the existing checklist drop pipeline — `setupChecklistDragDrop` already event-delegates drops on `.compact-item-wrapper` and `.safety-item-wrapper`. Extended three seams:

1. **`findWrapper`** (app.js:6156) — added a third `el.closest('[id^="area-photo-wrap-"]')` check after compact and safety. Wrappers marked `data-media-excluded="1"` (skipped media sections) are rejected so drops can't land in a skipped bucket.
2. **Drop-handler routing** (app.js:6199+) — new branch for wrappers whose `id` starts with `area-photo-wrap-`: reads the media label from `data-media-label` and forwards to the existing `attachPhotosToItem(mediaLabel, files)`. `attachPhotosToItem` already has an area-photo tail at app.js:6063 that calls `refreshAreaPhotoGrid` when it detects an area wrapper exists for the label, so the new photos appear in the grid immediately without a full re-render.
3. **Wrapper attributes** — `data-media-label` (HTML-escaped via existing `escapeHtml` helper) added to both branches of the initial render in the main category loop (app.js:14327 excluded, app.js:14336 normal). `data-media-excluded="1"` added only on the excluded branch. `refreshAreaPhotoGrid` now syncs both attributes on every re-render (app.js:18509+) so toggling Skip / Unskip correctly enables / disables drops without re-running the main category loop.

Visual feedback uses a new CSS rule `[id^="area-photo-wrap-"].drag-target` in index.html:502 — same dashed #066aab outline + #eff6ff fill as `.compact-item-wrapper.drag-target` so drag feedback is uniform across checklist items, safety items, and area-photo sections.

HTML-attribute escaping: the legacy `safeLabel` variable replaces `'` with `\'` for JavaScript string interpolation inside `onclick="fn('${safeLabel}')"` — that escaping is wrong for a plain HTML attribute value, so `data-media-label` goes through `escapeHtml()` (app.js:8498) which only escapes `&`, `<`, `>`, `"`. Standard media labels like "Cockpit photos" / "Foredeck photos" have no special characters, but the defensive escape survives if a template label ever acquires `&`.

Tested paths:
- Desktop Chrome: drag one or more JPG/PNG/HEIC files from Finder onto a category "📷 X photos" section → files attach, thumbnails appear, photo count badge updates.
- iPhone Safari (PWA): drag photos from the Photos app onto the area-photo card → same result via the file-drop event.
- Skipped section: dragging onto a "⊘ X — skipped" card does nothing (findWrapper rejects `data-media-excluded="1"`). No toast, no phantom attach.

No new state, no IndexedDB schema changes. Existing surveys behave identically except that area-photo sections are now drop targets.

Roadmap: round-oval X's on photo thumbnails (iOS) ships as v2422 next.

---

## v2420 — 2026-04-19
### Added — Flybridge Magnetic compass chip set (A/B/C/N-A/Not tested)

The "Flybridge Magnetic compass" item in the insurance survey template's "Flybridge gauges and instrumentation" category had no chips — empty observation buckets at every rating. Dave flagged missing C chips in the field; debugging showed the miss was at every rating, not just C.

Why the chip picker was empty: `ITEM_SNIPPET_MAP` at app.js:1550 redirects `'Flybridge Magnetic compass' → 'Magnetic compass'`, and because `hadExplicitMap` is true in `findTextVariants` (app.js:7265), the function returns the exact-match result without falling through to fuzzy matching. The library sheet `"Flybridge gauges and instrument"` had zero `"Magnetic compass"` entries, so the exact match was empty and no chips rendered.

Fix: 14 new entries added to the `"Flybridge gauges and instrument"` sheet in `text_library.json`, all with `section: "Magnetic compass"` so the explicit map redirect hits them:

- **A (3 chips)** — observed: "The flybridge magnetic compass was non-functional or severely damaged." (sev 4); means: "A non-functional compass at the flybridge helm removes a primary navigation reference." (sev 5); action: "Replacement of the flybridge magnetic compass is required before the vessel is returned to service." (sev 5).
- **B (6 chips)** — three observed/action pairs covering broken lens, badly clouded & unreadable, and slightly clouded. Severity 3 throughout.
- **C (3 chips)** — observed: "The flybridge magnetic compass appeared securely mounted, easy to read, and worked correctly." (sev 3); means: "No immediate concern was identified." (sev 1); action: "No corrective action is recommended at this time." (sev 1).
- **N/A (1 chip)** — observed: "No magnetic compass was installed at the flybridge helm station." (sev 3).
- **Not tested (1 chip)** — observed: "The flybridge magnetic compass was not tested." (sev 3).

All observed phrasing is past tense and specifically names "the flybridge magnetic compass" (not "the magnetic compass" generic) so the generated report is unambiguous about which helm station is being described. This matches the dual-helm insurance survey pattern where Pilot house Magnetic compass and cockpit Magnetic compass are separately rated.

The generic `"Magnetic compass"` entries in the Cockpit and Gauges-and-Instrumentation sheets (cockpit/salon helm) are left untouched — each helm station now has its own chip set.

No code changes, no UI changes — text_library.json data only. Picked up automatically on next survey open because sw.js network-first fetches `.json` files (sw.js:154).

---

## v2419 — 2026-04-19
### Added — Drag-to-reorder on category area-photo grids

Categories like Deck, Flybridge, Aft deck, and Cockpit have a dedicated "area photos" section rendered by `refreshAreaPhotoGrid` (app.js:18499). These thumbnails are separate from the per-checklist-item photo grid — they attach to a media-type item on the category (e.g. "Flybridge photos") rather than to a specific inspection item. Until now, area-photo thumbnails rendered without drag handlers, so Dave could not reorder them once captured. The per-item media sheet has had drag-to-reorder since v2162, so this was a consistency gap.

Minimal-surface fix — reuse the existing `setupPhotoSortable` pattern:

1. Parameterized `setupPhotoSortable(gridEl, itemLabel, reRender)` (app.js:6096). The new optional third arg is a callback that fires after the reorder is persisted to IndexedDB. When provided, it replaces the default "remove & reopen the media sheet" re-render. The existing caller at app.js:6292 is untouched (no third arg → falls back to the media-sheet re-render path).
2. Added `data-photo-idx="${i}"` to each `.area-photo-wrap` in `refreshAreaPhotoGrid` (app.js:18534). The drag-reorder logic walks `[data-photo-idx]` to find draggable thumbnails, so the attribute is required.
3. Added `id="area-photo-grid-${sanitized}"` to the area-photo grid container (app.js:18533) so the drag wiring can find it after innerHTML assignment.
4. After the innerHTML render + thumbnail load loop, `refreshAreaPhotoGrid` now calls `setupPhotoSortable(areaGrid, mediaLabel, survey => refreshAreaPhotoGrid(survey, mediaLabel))` (app.js:18581+). The re-render callback keeps the reorder in-page — no media sheet opens, no page scroll, just the grid snapping to the new order.

Data path is unchanged: area photos are already persisted at `survey.items[mediaLabel].photos` (same schema as per-item photos), so `setupPhotoSortable`'s existing reorder logic works verbatim. The only behavioural difference is the re-render target.

Desktop: drag one thumbnail onto another to swap their order. iOS: drag-to-reorder uses the same touch-drag pipeline as the media sheet — works on iPhone/iPad, press-and-hold to begin the drag. A `title="Drag to reorder"` tooltip appears on hover.

No migration, no data reshaping. Existing surveys open with their area-photo order intact; reordering takes effect only when Dave drags.

Roadmap slides: round-oval-X iOS fix moves from v2419 → v2420+.

---

## v2418 — 2026-04-19
### Fixed — Aft deck percussion snippet: removed incorrect "coachroof" reference

The C-rated observed chip for "Aft deck impact and resonance testing" read:

> "Percussion testing of the aft deck and coachroof produced a clear and even tone with no indications of delamination or voids."

The aft deck is structurally separate from the coachroof — they are tested as independent areas and warrant their own sections. The chip was likely copy-pasted from the "Deck and coachroof/pilot percussion testing" section when the aft deck section was created and never edited to match its new scope. Dave flagged it during a live survey.

Changed to:

> "Percussion testing of the aft deck produced a clear and even tone with no indications of delamination or voids."

Left the adjacent "Both areas presented no deficiencies." chip alone — "both areas" in this context could reasonably refer to the port and starboard halves of the aft deck or to aft deck vs. cockpit sole if the surveyor is composing across scopes. Flag for future review only if Dave reports it reads wrong in the field.

No code touched, no downstream refactors — isolated text_library.json edit. Roadmap slides by one: previous v2418 (rotate button on photo lightbox) → v2420+, previous v2419 (snippet disappearance on pluralized labels) → v2421+. Round-oval-X iOS fix from the interrupted earlier task moves to v2419.

---

## v2417 — 2026-04-19
### Fixed — Deck percussion testing: removed two duplicate "clear tone" chips

The C-rating observed bucket for "Deck and coachroof/pilot percussion testing" had three chips saying essentially the same thing in three different ways:

1. "Most of the deck and coachroof produced a clear and even tone with no indications of core moisture, voids, or delamination." (sev 1)
2. "The deck and coachroof produced a clear and even tone throughout with no indications of core moisture, voids, or delamination." (sev 1)
3. "Percussion testing of the deck, and coachroof produced a clear and even tone with no indications of delamination or voids." (sev 5, with a comma-splice typo before "and")

Chips #1 and #3 were removed. Kept #2 as the canonical "all clear" phrasing because (a) "throughout" is the correct qualifier for an all-clear finding — "most of" implies some exceptions exist, (b) it reads cleanly without the typo in #3, and (c) the "no indications of core moisture, voids, or delamination" wording is more precise than "delamination or voids" alone.

The alternative-phrasing chip "No dull thuds or ringing tones were detected during impact testing." is kept — it's phrased differently enough to let the surveyor compose a two-sentence observation like "Clear and even tone throughout… no dull thuds or ringing tones detected."

---

## v2416 — 2026-04-19
### Fixed — Deck and coachroof spider cracks: removed misphased/redundant C-rating chip

The C-rated observed bucket for "Deck and coachroof/pilot house condition (spider cracks, etc.)" contained a chip that broke the SAMS observation → means → action flow:

> "The condition appeared serviceable, with no immediate corrective action recommended."

Two problems:

1. **Mis-phased.** The chip was tagged `phase: "observed"` but the sentence contains both a "means" judgement ("condition appeared serviceable") and an "action" recommendation ("no immediate corrective action recommended"). It belongs nowhere in the observed bucket.
2. **Redundant.** The content is already covered by the existing means chip ("No immediate concern was identified.") + the action chip ("No corrective action is recommended at this time.") — surveyors who want that combined meaning can tick those two phase-correct chips.

Removed the single entry. The remaining C-rating observed chips now all state pure observations; the means and action phases hold the judgement and recommendation respectively. SAMS three-phase flow restored for this section.

---

## v2415 — 2026-04-19
### Changed — Hull-deck joint snippet: "satisfactory" → "serviceable"

The C-rated observed chip for the "Hull-deck joint (exterior)" section in `text_library.json` read:

> The hull and deck joint appeared intact and in satisfactory condition.

Dave's preferred term throughout the report is **serviceable**, which also matches the C-rating legend ("C — Serviceable, routine maintenance"). Replaced the single word in-place — no structural changes to the entry, no rating or phase changes. Only one match in the library.

**Roadmap shift:** the thumbnail/purge/lazy-cache work previously allocated to v2415-v2420 slides by one version (now v2416-v2421). The v2416 entry (Fix snippet disappearance on pluralized rudder labels) is now next in line and will be shipped separately.

---

## v2414 — 2026-04-19
### Changed — Kill the yellow "photos on another device" banner

The yellow `#photo-integrity-warn` banner (app.js:4143) fired on every app startup whenever `validatePhotoIntegrity` found any photo ID in a survey that didn't have a local IndexedDB blob. Its dismissal was session-only (`window._photoWarnDismissed`) so every page reload and every service-worker update reset it. Dave's field workflow involves many reloads, so the banner became a constant distraction while conducting surveys.

Deeper than the UX issue: the banner's core premise — "photo referenced but not local = warning" — stops being correct in the lazy-cache photo architecture shipping across v2415-v2420, where "only in cloud, not on device" becomes the **default** state for any survey Dave isn't actively working on. Keeping the banner and making it smarter would mean patching it again in v2420, so it's getting removed now and the new integrity check will be built from scratch for the new world.

**What changed**

- The banner render block (app.js ≈4143-4170) is gone. No more DOM insert, no more dismiss button, no more session-flag dance.
- `validatePhotoIntegrity` still walks every survey on startup, still counts orphan photo IDs, still pings Firestore for each orphan to check recoverability. All that output now goes to `console.warn` / `console.log` only — zero user-visible UI.
- Read-only guarantees from v2413 are preserved: this function never mutates `survey.items[].photos[]`, never calls `saveSurvey()`.

**What's next** (see roadmap in this changelog)

- v2415: thumbnail pipeline (256px thumbs stored alongside full images)
- v2416: survey-exit purge (60-second deferred delete of full-res for non-current surveys; thumbs stay)
- v2417: on-demand pull (full-res downloaded from Firebase when a purged survey is reopened)
- v2418: report pre-pull gate (`generateReport` blocks until every photo is local)
- v2419: "Free up space" tool in Settings with per-survey breakdown
- v2420: new integrity check — only flags photos missing from BOTH local AND cloud

---

## v2413 — 2026-04-19
### Fixed (EMERGENCY) — `validatePhotoIntegrity` no longer silently strips photo IDs from surveys on startup

Minutes after v2412 deployed and Dave re-imported Ex-Ta-Sea from the Drive RESTORE.json, the photos disappeared from the survey entirely ("No photos in ex ta sea now"). The survey record itself was intact this time — the v2412 sync-delete fix held — but every `items[k].photos[]` array had been emptied. Same pattern of harm, different code path. Still destructive-action-on-unreliable-remote-state.

**Root cause at `app.js:4075-4100` (the v2317 block inside `validatePhotoIntegrity`).**

On every app startup, this function walks every survey, finds photo IDs whose local blob is missing from IndexedDB ("orphans"), and for each orphan it asks Firestore "do you have a `storageRef` for this?". If the metadata doc didn't exist or had no `storageRef` field, the code ran:

```js
item.photos = item.photos.filter(id => id !== pid);
cleaned++;
// ...and then:
await saveSurvey(survey);
```

— silently stripping the photo ID reference from the survey and persisting the stripped version to IndexedDB. Permanent, no user prompt, no undo.

This bit Ex-Ta-Sea because: (1) the fresh import loaded 137 photo references into IndexedDB, (2) `pullPhotosFromFirebase` hadn't finished hydrating the blobs yet, so most IDs were "orphans" by definition at the moment `validatePhotoIntegrity` ran, and (3) many of the corresponding Firestore metadata docs had no usable `storageRef` (Dave's earlier session logged `storage/object-not-found` errors for dozens of photos — the Storage blobs had been lost upstream for reasons still under investigation). The combination turned an app reload into a mass photo-reference wipe.

**The fix — `validatePhotoIntegrity` is now strictly read-only.**

- It still scans surveys and counts orphans so the yellow "photos on another device" banner still surfaces.
- It still pings Firestore for each orphan so we can log recoverable-vs-unrecoverable counts for forensics.
- It no longer calls `filter(...)` on `item.photos`. It no longer calls `saveSurvey(survey)`. No code path in this function mutates persisted survey data.
- `cleaned` stays 0 by design; the variable is preserved only to keep downstream conditionals stable without a wider refactor.

A future "Clean missing photo references" recovery tool can reintroduce a deliberate cleanup path — gated by an explicit user confirmation and a dry-run preview — but it will never be automatic on startup.

**Why this passed review before (v2317) and still was wrong.**

At the time the block was written, the failure mode it was designed to handle — an orphan ID that truly had no recoverable copy anywhere — is real and rare, and the "clean it up" response looked tidy. But it implicitly trusted Firebase's response as authoritative ("if Firestore says no `storageRef`, the blob is gone forever") when Firebase's response is just a point-in-time query against a system that can itself be out-of-sync, in the middle of a write, returning a stale proxy cache, or — as happened here — missing Storage blobs for reasons unrelated to the survey's local integrity. The general rule, same as v2412: **never let a destructive local mutation hinge on a remote lookup that can be wrong.**

### Scope
- Single block rewritten at `app.js:4075-4100` — orphan check no longer mutates `survey.items[k].photos`, no longer calls `saveSurvey`. Warning banner still surfaces, forensics still logged.
- Atomic version bump (v2412 → v2413): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2413` cache-busters.
- No behavioural change to any other code path.

### Not included
- Surfacing a user-gated "Clean missing photo references" action — queued as a future UX item.
- Forensics on why the Firebase Storage blobs for Ex-Ta-Sea photos went `object-not-found` (upload-path investigation — separate thread).
- v2414 (vessel description auto-regen — propeller + missed fields), v2415 (preflight undo toast), v2416 (report page header survey-type), v2417 (compound-subject NT grammar) — queue reordered by one.

---

## v2412 — 2026-04-19
### Fixed (EMERGENCY) — Firebase sync-delete cascade: cloud-driven 'removed' events no longer wipe local surveys

Ex-Ta-Sea disappeared from Dave's home screen twice — once on 2026-04-10 and again today on 2026-04-19, mid-report. Both times the local IndexedDB `surveys` store lost the record while the `photos` store kept most of the referenced photos (86 of 137 photos survived locally today). The narrowness of the loss — survey gone, photos intact — was the tell: this was not storage-pressure eviction, not a cache wipe, not a corruption event. Something was deleting the surveys row specifically, by primary key, without touching anything else.

**Root cause found at `app.js:25757-25765`.**

The Firebase realtime listener (`FirebaseSync.startListening` → `onSnapshot` on `collection('surveys')`) handled `change.type === 'removed'` by unconditionally calling `deleteSurvey(remoteSurvey.id)` on the local device. Any cause of the remote Firestore doc going away — a stray tap on the trash button from a second device, a stale tab firing `removeSurvey` on re-auth, a Firestore infrastructure hiccup, a race between `pushSurvey` and `removeSurvey`, or even a transient listener re-snapshot bug — would cascade the deletion to every listening device, wiping the survey locally at each one. No guard. No confirmation. No richness check. Remote said "gone", local obeyed.

The failure was genuinely recurrent: fired 2026-04-10, fired again 2026-04-19. Same mechanism both times. And because the 'removed' listener runs unconditionally whenever the app is open and online, there was no way for Dave to finish a report without the risk of it happening again mid-session. Airplane mode was the only interim protection.

**The fix — deletion is now a user-initiated action only.**

The 'removed' branch no longer calls `deleteSurvey` locally. Instead, when a cloud 'removed' event arrives for a survey that still exists locally, the listener logs a warning (`[Sync] REFUSED cloud-driven delete of "<vesselName>" — local copy preserved. Re-pushing to restore cloud.`) and calls `pushSurvey(localSurvey)` to put the local copy back into Firestore. This has three properties:

1. **Local data is always safe.** There is no longer any code path by which Firestore can cause a local survey row to be deleted. The sole path to deletion is the user tapping the in-app Delete button, which routes through `deleteSurveyConfirm` and prompts for confirmation.
2. **Cloud data self-heals.** If the Firestore doc disappears for any reason other than intentional user deletion, the local copy re-publishes automatically. The next device to connect sees an 'added' event and restores itself too.
3. **Intentional deletes still work.** `deleteSurveyConfirm` → `deleteSurvey` (local) → `removeSurvey` (Firestore) executes in the same order as before. Other devices listening will see their own 'removed' events and — under the new rule — preserve local. That's fine: the deleting device has authoritative state, will re-push if needed, and the intent was to delete on the originating device only. If the user wants a multi-device delete, they run Delete on each device.

**Why we can't use a richness guard here (unlike the 'modified' path).**

The 'modified' listener at line 25713 compares `_scoreSurveyContent(local)` vs `_scoreSurveyContent(remote)` and refuses remote-over-local if local is substantially richer. That rescue doesn't translate to 'removed' — by the time a 'removed' event fires, the remote doc is already gone, so there is nothing to score against. A conservative refusal-with-repush is the only safe posture.

**Shipped together (non-emergency, pre-staged before the incident).**

Camera UI tweaks that were already edited and triple-checked for v2412 before the sync bug surfaced, bundled here as a one-time exception to the one-feature-per-version rule because reverting them would burn time Dave doesn't have and risk introducing new mistakes in a hotfix:

- Portrait shutter grown another 10% (97 → 107 px, icon 42 → 46 pt). Ask: "please increase the camera button an additional 10%."
- Landscape shutter matched (70 → 77 px, icon 32 → 35 pt).
- Landscape DONE button absolute-positioned to bottom-right of the controls column (was vertically-centred). Creates a large dead zone between the centre-mounted shutter and the bottom-corner DONE. Ask: "I don't want to risk closing until I'm done."

### Scope
- One branch rewritten at `app.js:25757-25793` — 'removed' path refuses local delete, preserves local, re-pushes to heal Firestore.
- Landscape CSS block at `app.js:26393-26411` — shutter 70→77, DONE absolute-positioned bottom-right.
- Portrait shutter inline style at `app.js:26426-26432` — 97→107 px, 42→46 pt icon.
- Atomic version bump (v2411 → v2412): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2412` cache-busters.
- Task #74 (Forensics: why did Ex-Ta-Sea disappear) → root cause identified and closed by this fix.

### Not included
- v2413 (vessel description auto-regen — propeller + missed fields) — next in queue per Dave's priority flip.
- v2414 (preflight undo on green check-off toast), v2415 (report page-header survey-type), v2416 (compound-subject NT grammar) queued behind that.
- Yellow Firebase banner persistent-dismissal (the `_photoWarnDismissed` session-only flag). Separate follow-up — surfaced during this incident but not the emergency.
- Autosync-JSON import path (raw-survey-wrapper detection in `importSurvey`). Surfaced when recovering Ex-Ta-Sea from `Ex-Ta-Sea-RESTORE.json`, which happened to be pre-wrapped — but the raw `Ex-Ta-Sea_2026-04-19.json` autosync would have required manual wrapping. Queued as a quality-of-life improvement.

---

## v2411 — 2026-04-19
### Changed — Safety Equipment report section: styling unification

Dave flagged that the Safety Equipment (TC TP 511) section of the generated report didn't look like it belonged with the rest of the document. The section-level banner and per-item cards already followed the standard pattern, but the per-category h3 subheader (e.g. "Personal Lifesaving Appliances", "Visual Signals", "Fire Fighting Equipment", "Navigation Equipment") rendered differently from every other h3 in the report.

**The outlier.**
The previous per-category h3 at `app.js:23221` overrode almost every default h3 property:
- `font-size: 10pt` — against the report-wide default of 12pt (set in the inline stylesheet at `app.js:22517`).
- `border-bottom: 1px solid #2563eb` — against the default of `1px solid #d1d5db` (neutral grey). The solid blue underline visually fought with the underlying items' left-rail borders.
- `margin: 14px 0 6px` — tighter than the default 18px top margin, so the heading sat closer to the preceding item than to its own category contents.
- `padding-bottom: 3px` — one pixel tighter than the default 4px.

Meanwhile, every other h3 in the report — the Findings & Recommendations A/B/C/NT/PO subheaders at `app.js:23441–23503`, the Valuation Worksheet headings at `app.js:23624/23653`, the Bilge Pump Detail heading at `app.js:22935` — follows one pattern: override nothing but the text colour, and let the default h3 CSS supply size, margin, and border. Five sections using one convention, Safety Equipment using its own.

**The fix.**
Match the F&R convention: `<h3 style="color:#2563eb;">` — colour-only override. The "safety blue" accent is preserved so the section retains its visual identity, but the heading now reads at 12pt with the standard 18px top margin and the neutral-grey under-border, consistent with every other category subheader across the report.

### Scope
- One line change at `app.js:23221`, preserving the safety-theme colour and dropping the four non-conforming inline properties.
- Atomic version bump (v2410 → v2411): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2411` cache-busters.
- Does not touch the section-level h2 banner (already consistent — blue background, white text, standard 13pt banner weight).
- Does not touch the per-item `<div class="item">` cards — already identical to Detailed Survey Findings + Instruments & Electronics.
- Does not touch the summary paragraph (on-board/missing counters) — already at 10pt, matching Instruments & Electronics.

### Not included
- v2412 (vessel description auto-regen — propeller + missed fields) — next.
- v2413 (preflight undo on green check-off toast), v2414 (report page-header survey-type consistency), v2415 (compound-subject NT grammar sweep) queued behind that.

---

## v2410 — 2026-04-19
### Added — Audible shutter click on in-app camera capture

Dave: *"I need to clearly hear when I take a picture."* The in-app batchCam overlay (`snapStagedPhoto`) captures by drawing a `<video>` frame onto a canvas — a completely silent operation. Unlike the `<input type="file" capture="environment">` fallback path, which hands off to the native iOS/Android camera app and inherits its OS shutter sound, the in-app path had no auditory confirmation. Only a brief red flash on the shutter button, which is easy to miss when the surveyor is looking at the subject rather than the screen.

**Added `playShutterClick()` — WebAudio-synthesized mechanical click.**
- 60 ms burst of white noise through a bandpass filter centred at 3.5 kHz, with a 2 ms attack ramp and 15 ms exponential decay. Reads as a crisp mechanical "snap" without boomy low-end or harsh high-end.
- No audio asset to cache or fetch — the sound is generated at the sample rate of the device on demand. Works offline, works on every supported browser.
- Plays through WebAudio's media bus, so on iOS the click is audible even when the ringer switch is silent. Matches the behaviour of purpose-built camera apps.
- Volume gain 0.6 — loud enough to cut through a marina's background noise without clipping through cheap phone speakers.

**Wired into `snapStagedPhoto` success path.**
- Called immediately after `dataUrl` is generated and pushed to `bc.staged`, before the visual flash. If the capture fails (e.g. `video.videoWidth` is 0 because the stream isn't ready), the click does NOT fire — the audio is a truth signal, not a placebo.

**iOS Safari audio-unlock handling.**
- The `AudioContext` is created lazily on the first shutter tap, so the tap itself counts as the user gesture required to unlock audio. Subsequent taps skip the unlock — the context stays live for the session.
- `ctx.state === 'suspended'` is checked on every play and resumed on demand, because iOS can re-suspend the context when the camera overlay temporarily backgrounds (e.g. when the app shows the zoom slider constraint change or the surveyor switches tabs).

### Scope
- One new helper `playShutterClick()` with a module-level `_shutterAudioCtx` cache (~26571-26633 region).
- One-line call `playShutterClick();` injected into `snapStagedPhoto` right after the staged photo is pushed.
- Atomic version bump (v2409 → v2410): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2410` cache-busters.
- Only affects the in-app batchCam overlay. The `<input type="file" capture="environment">` paths (`rapidCaptureInstruments`, `addInstrumentByPhoto`, `capturePhoto`, `handleAreaPhotoCapture`, `captureDocPhoto`, safety-equipment handler) continue to use the native camera app and its built-in shutter sound — intentionally unchanged so iPhone's camera behaviour is consistent where it hands off to the OS.

### Not included
- v2411 (preflight undo on green check-off toast) — next in queue. Dave flagged that the toast currently auto-dismisses the ticked item with no recovery path.
- v2412 (report page header survey-type consistency), v2413 (grammar NT sweep), v2414 (Safety Equipment styling parity), v2415 (vessel description auto-regen — propeller + missed fields) queued behind that.

---

## v2409 — 2026-04-19
### Fixed — Rudder snippets: sailboat stuffing-box false positives + weak action chip

Dave flagged the "Rudder(s) condition" snippet picker on a sailboat survey. Two of the B-rating chips referenced a "rudder stuffing box" — a component only present on power-driven vessels. Sailboat rudders ride on a post through a bearing tube; there is no stuffing box to weep. The chips needed to disappear on sail surveys. Dave also pushed back on the vague action chip ("Inspect the rudder for moisture at the next haul-out and recondition the anti-fouling surface") — not an action, just a reminder to look again. He wanted an active remedy.

**1. Sailboat filter on the two stuffing-box chips.**
- Tagged both with `"vesselType": "power"` in `text_library.json` ("Rudder(s) condition" section):
  - Observed/severity 2: *"Minor weeping was observed at the rudder stuffing box; this is common when the vessel has been out of the water."*
  - Action/severity 3: *"Monitor the rudder stuffing box after launch; continued leakage beyond a few days warrants service."*
- The existing vessel-type filter in `findTextVariants` (app.js ~7286-7292) drops any entry whose `vesselType` doesn't match `survey.vesselType` — chips without the tag still show for everyone, so no other rudder chips are affected.
- Human-powered vessels (canoes, kayaks) also won't see these chips, which is correct.

**2. Replaced the weak "inspect the rudder" action chip with a concrete remedy.**
- Was: *"Inspect the rudder for moisture at the next haul-out and recondition the anti-fouling surface."* — describes preparation, not action; the moisture reading already happened and that's why the B rating exists.
- Now: *"Consider drilling one or two holes in the rudder (one higher and one lower) after haul-out in an attempt to drain some of the water."* — Dave's own wording, which fits the actual repair sequence (haul → drain → dry → re-seal → paint).
- No `vesselType` tag on this one — drilling drain holes is a legitimate remedy for a wet rudder core on either power or sail.
- `pluralizeRudder` still adapts "the rudder" → "the rudders" on twin-rudder surveys.

### Scope
- `text_library.json`: three line edits in the "Rudder(s) condition" section (two `vesselType` tags added, one text replacement).
- Atomic version bump (v2408 → v2409): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2409` cache-busters.
- Zero app.js changes — filter infrastructure already in place from v2214.

### Not included
- v2410 (page-header survey-type consistency) — next in queue.
- v2411 ("was" → "were" compound-subject NT grammar sweep), v2412 (Safety Equipment report styling parity), v2413 (vessel description auto-regen — propeller + other missed fields) queued behind that.

---

## v2408 — 2026-04-19
### Changed — Camera UI polish (batchCam overlay)

Three related tweaks to the in-app camera overlay, reported by Dave during the Ex-Ta-Sea hull-below-the-waterline capture. Screenshots showed the shutter and DONE button weighted equally in the centre of the controls row, and the thumbnail delete buttons rendering as horizontal ovals on iOS Safari.

**1. Shutter button — centred and 10 % larger (88 → 97 px).**
- Was flexed side-by-side with DONE via `justify-content:center; gap:40px`, which placed the shutter off-centre (to the left) and competing with DONE for the visual anchor.
- Now the controls row is `position:relative`, with the shutter as the sole flex child at `justify-content:center` — it sits on the true horizontal centre line of the frame, where your thumb naturally lands.
- Icon scaled proportionally: 38 → 42 px.

**2. DONE button — moved to the right side and 20 % smaller (88 → 70 px).**
- Re-anchored with `position:absolute; top:50%; right:calc(24px + env(safe-area-inset-right)); transform:translateY(-50%)` so it lives on the edge where a secondary action belongs and doesn't steal gravity from the shutter.
- Border dropped 5 → 4 px, font 15 → 13 px, shadow softened 4/12 → 3/10 to match the reduced scale.
- Right-side placement keeps it reachable with a right-thumb without crossing over the shutter; left-handed surveyors can still tap it — it's just out of the way.

**3. Thumbnail remove-X — rendered as proper circles, and smaller (22 → 18 px).**
- Old style: `width:22px; height:22px; border-radius:50%;` plus `line-height:18px; padding:0;`. On iOS Safari the baseline-aligned `×` glyph and the default `box-sizing:content-box` behaviour combined with the 2 px border could render the button slightly wider than tall — hence Dave's "oval" observation.
- New style adds `box-sizing:border-box; display:flex; align-items:center; justify-content:center; line-height:1;` which forces a 1:1 box and centres the glyph cleanly at any DPR. Font 12 → 11 to suit the smaller button. `top/right` offsets adjusted -6 → -5 so the button stays anchored to the thumbnail corner at the new diameter.

### Scope
- One rewrite of the `data-cam="controls"` row (~26374-26377) covering both button styles.
- One update of the landscape media-query override (~26357-26368) to keep the portrait proportions (shutter 70 px, DONE 51 px) in landscape.
- One update to the thumbnail X markup in `refreshBatchCamStrip` (~26620-26622).
- Atomic version bump (v2407 → v2408): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2408` cache-busters.
- Zero data-model changes; no behavioural changes to snapping / discarding / committing photos.

### Not included
- v2409 (page-header survey-type consistency) is now next — the camera polish cut the line after Dave flagged it mid-session.
- v2410 ("was" → "were" NT grammar sweep), v2411 (Safety Equipment report styling parity), v2412 (vessel description propeller regen) queued behind that.

---

## v2407 — 2026-04-19
### Fixed — "Back to Check Survey" pill: orphaned on home, overlap, size

Three issues with the floating pill that surfaces when Check Survey hands off to an in-page element, all reported by Dave in one pass.

**1. Pill stayed on screen after navigating to the home view.**
- `_csShowBackButton` dropped the pill into `document.body` with an onclick handler that removed it only on the "return to Check Survey" path. Any other route home — the header logo, `backToHome`, back-button, programmatic `renderHome()` — left it floating on top of the home screen.
- Fix: added `document.getElementById('csBackToCheckBtn')?.remove();` inside `renderHome()` itself, right next to the existing `inspectionBottomBar` and `SaveStatus.hide()` cleanup. `renderHome` is the single funnel for every "go home" path (16+ call sites — `backToHome`, history-popstate handlers, header logo, save-with-success, abandon-new-survey, Firebase onSnapshot, etc.) so one line covers them all. No per-caller edits needed.

**2. Pill overlapped checklist items.**
- Previous placement was `top: 12px; left: 50%; transform: translateX(-50%)` — top-centre — which sat directly over the first checklist item and the app header on iPhone. Dave: *"this should not overlap items."*
- Fix: moved to `bottom: calc(70px + safe-area-inset-bottom); right: 12px` so it floats above the 56 px-tall inspection bottom bar with its safe-area padding, tucked into the right side where no checklist content lives.

**3. Pill was too big.**
- Shrunk dimensions ~25 %: padding `10 / 20` → `7 / 15`, font-size `14` → `11`, border-radius `20` → `15`, shadow softened from `4px 12px / 0.3` to `2px 8px / 0.25` so the smaller pill doesn't feel heavy.
- z-index (10001) kept — still has to ride above the Check Survey overlay during its 200 ms fade-out.

### Scope
- One new line in `renderHome()` (~8847).
- One `cssText` rewrite in `_csShowBackButton()` (~16514).
- Atomic version bump (v2406 → v2407): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2407` cache-busters.
- Zero data-model changes.

### Not included
- v2408 (page-header survey-type consistency) still next.
- v2409 (compound-subject "was" → "were" NT grammar sweep) queued behind that.
- v2410 (Safety Equipment report styling unification) and v2411 (vessel description propeller regen) filed after.

---

## v2406 — 2026-04-19
### Changed — Intro form cleanup

**Remove Independent Surveys field from the intro form.**
- The "Independent Surveys" textarea (engine/electrical/gauging statement) is gone from both the New Survey form and the Edit Intro view.
- Dave: *"Remove the section about 'independent surveys' on the intro page. This will likely never happen."*
- The report row at `_row('independentSurveys', ...)` still renders the SAMS-required default sentence (*"No independent surveys (engine, electrical, ultrasonic gauging, etc.) were conducted in conjunction with this inspection."*) when the field is empty, so the report output is unchanged.
- `saveSurveyDetails` now preserves any pre-existing `survey.independentSurveys` value via a `|| survey.independentSurveys || ''` fallback — a save on an old survey that had a value won't wipe it just because the DOM field is gone.
- The preflight check (`Consider listing any independent surveys…`) is removed — without a visible field there's nowhere for Dave to act on it.

**Move Report Completion Date to the bottom of the intro form.**
- Previously sat next to Weather / On Land or In Water in the Survey Specs section. Now sits below the Comparable Vessels block, right before the Cancel / Start Survey action row.
- Dave: *"Report completion date should be moved to the bottom of that page, beneath 'comparable vessels'"*.
- Field `id="reportDate"` is unchanged, so every downstream reader (report cover page, XLSX export, etc.) keeps working. Data model untouched.

### Scope
- Three edits in `app.js`: remove the two form-groups from `renderNewSurveyForm` (~9576-9585), add the Report Completion Date form-group after the Comparables section (~9880), preserve `independentSurveys` value in `saveSurveyDetails` (~10922).
- Remove the preflight info entry in `runPreflight` (~15632-15635).
- Atomic version bump (v2405 → v2406): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2406` cache-busters.
- Zero DB / template changes, zero migration.

### Not included
- v2407 (check-survey pill auto-dismiss + shrink + reposition) is on deck next.
- v2408 (page header consistency — subsequent pages should match the title-page survey type) queued behind that.

---

## v2405 — 2026-04-19
### Fixed — Engine/drive pluralisation and missing HP unit

Three cosmetic text bugs surfaced while Dave was preparing the Ex-Ta-Sea report on a twin-engine sterndrive vessel. Internal data model unchanged; display-layer only.

**1. "Engine(s) and drive(s)" section title → "Engine and drive" / "Engines and drives"**
- New `displayCategoryName(categoryName, survey)` helper resolves the `(s)` marker at render time using `survey.engine2Make` as the single-vs-twin signal (same field used by every other propulsion-text builder).
- Wired into both the inspection accordion title (line ~14024) and the report `<h2>` header (line ~23051, chained after the existing `pluralizeRudder`).
- `category.name` stays literal (`'Engine(s) and drive(s)'`) in the template JSON and in IDB — the 8+ identity-matching sites (`isEngineCategory`, propulsion-chip injection, `pullPhotosForSurvey` mapping, etc.) keep working against the stable key.

**2. Propulsion narrative — "rated at 300 each" → "rated at 300 hp each"**
- `buildPropulsionNarrative` now runs `engineHP` through a new `_fmtHP()` helper before interpolating into the opener sentence. Smart-append: bare numbers get `" hp"` suffixed; strings that already contain `hp` / `HP` / `h.p.` / `bhp` / `horsepower` / `kW` pass through unchanged so surveyors who type "300 hp" or "220 kW (300 hp)" don't end up duplicating the unit.
- Only touches the narrative builder. The three `generateEngineDescription` variants already use `${engineHP} horsepower` and are unaffected.

**3. Propulsion narrative — "outdrive (sterndrive)s" → "sterndrives"**
- Changed the `driveLabel` map entry for `'outdrive'` from `'outdrive (sterndrive)'` to `'sterndrive'`. The simple `${driveLabel}s` pluralisation now emits "sterndrives" cleanly.
- Brings the narrative builder into alignment with the `_driveLabelMap1/2` map used by `generateEngineDescription` (line ~12183), which already used `'sterndrive'`. One terminology, one place.

### Scope
- Two small additions in the helper region of `app.js` (post-`pluralizeRudder`): `displayCategoryName`, `_fmtHP`.
- Four edits in existing builders: narrative opener, drive map, inspection title, report title.
- Atomic version bump (v2404 → v2405): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2405` cache-busters.
- Zero DB / template changes, zero migration.

### Not included
- The drive-line migration helper (v2406 candidate) is still on deck behind this. Keeping v2405 to text fixes only so it can ship immediately without waiting on the migration review.

---

## v2404 — 2026-04-19
### Fixed — Save-path completion flush
- `saveEverywhere()` (inspection-view Save pill) now calls `saveAllInspectionData()` before re-saving the survey when the inspection view is active. Before: the inspection-view branch did `await getSurvey(...); await saveSurvey(survey)` without flushing DOM state first, so a Save tap that happened while the surveyor was mid-textarea (before `onblur` had fired) read the stale IDB copy and silently dropped the fresh keystrokes on the next reload.
- `saveSurveyWithProgress()` (per-survey progress dialog) now does the same flush, gated on `currentView === 'inspection' && currentSurveyId === surveyId` so that a home-screen save of a *different* survey doesn't accidentally touch unrelated DOM state.
- New `visibilitychange`→hidden and `pagehide` handlers fire-and-forget `saveAllInspectionData()` so that mid-typing textareas are flushed when iOS backgrounds the tab (user hits home, switches apps, gets a call, screen locks). IDB honours in-flight transactions even after the JS context suspends, so the fire-and-forget pattern is safe here — an `await` would never resume.

### Why this exists
- External review flagged item 1 of a batch as "the single most important fix." Independent verification against the codebase confirmed it: the stale-save path existed at `app.js:3030–3033` and again at `app.js:3300–3302` (pre-v2404 line numbers). Matches the pattern Dave has hit in the field when "I swear I typed that" notes disappear after a reload.
- The `pagehide`/`visibilitychange` handler closes the companion gap: iPhone Safari and the iOS PWA shell can suspend the tab with almost no notice, and nothing in the existing event handlers was flushing text on that transition. The v2383 guarded-assign paths (comparables, colours) already prevent destructive writes on empty DOM reads, so firing on `pagehide` is safe even if the DOM is mid-tear-down when the handler runs.

### Scope
- Three edits in `app.js` (saveEverywhere branch, saveSurveyWithProgress prelude, new hide handler at module scope near the existing `beforeunload` handler). Atomic version bump only (v2403 → v2404): `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2404` cache-busters.
- Zero DB schema change, zero migration, zero change to the successful-keystroke path. Purely additive safety.
- Pairs with v2403 (FileReader hang hardening) as the two halves of "close the data-loss paths on iPhone before tomorrow's field survey."

### Related
- v2399 `guardedSurveyUpdate` chokepoint — prevented destructive no-op writes.
- v2400 `pullPhotosForSurvey` three-guard validation — prevented photo corruption.
- v2401 write journal — made the write history forensically recoverable.
- v2403 FileReader hang hardening — prevented photo-capture UI wedge.
- v2404 (this) — closes the unsaved-DOM-state save-path gap.

---

## v2403 — 2026-04-19
### Fixed — Photo-capture hang hardening
- Six photo-capture call sites now wrap the `FileReader.onload` async body in `try/catch` and attach a `FileReader.onerror` handler that resolves the surrounding Promise. Before: a thrown error inside the async `onload` was a silent unhandled rejection, and `FileReader` failures (corrupt EXIF, truncated HEIC, out-of-memory on a large pick) had no `onerror` handler at all — the Promise never settled, the `for (const file of files)` loop blocked forever, and the "Saving X photos…" toast wedged the UI. On iPhone this was indistinguishable from a crash.
- Call sites patched: `capturePhoto` (item-level camera), `handleAreaPhotoCapture` (area photo strips), `rapidCaptureInstruments` (rapid capture loop), `addInstrumentByPhoto` (multi-select instrument import), `captureDocPhoto` (HIN / compliance plate), and the safety-equipment photo handler.
- Failure mode now: a warning toast ("⚠️ One photo failed to save — continuing") and the loop moves to the next file. For the rapid-capture loop, the camera still reopens on failure so the surveyor isn't stranded mid-session. For the single-shot HIN / compliance plate path, the toast tells the surveyor to retry instead of leaving them staring at an unopened preview modal.

### Why this exists
- Tomorrow's field survey (2026-04-20) is on iPhone, which is exactly the device class where a corrupt HEIC or transient iOS memory pressure on a FileReader read is most likely to fire. A hang in this path is the worst failure mode: the surveyor thinks the photo is saving, taps again, and the app is unresponsive. Hardening the six sites is cheap insurance against a mid-survey wedge.
- Independently confirmed during a field-readiness audit earlier today — the pattern (async onload with no try/catch and no onerror) was consistent across all six sites.

### Scope
- Purely additive error handling. No change to the successful-read path, no change to photo format, no change to IndexedDB write ordering, no change to the date-stamp pipeline. Atomic version bump only (v2402 → v2403) — `APP_VERSION`, `CACHE_NAME`, `app-version` meta, seven `?v=2403` cache-busters.
- No DB schema change, no migration.

### Follow-up
- v2404 will add the complementary save-path fix: force `saveAllInspectionData()` at the top of `saveEverywhere()` / `saveSurveyWithProgress()` when in the inspection view, plus a `pagehide`/`visibilitychange` flush handler to close the iOS tab-suspend gap. Split out so the two changes can be reverted independently if either misbehaves in the field.

---

## v2402 — 2026-04-19
### Added — Tooling (non-app change)
- **`TASKS.md`** — human-readable mirror of the session task-tool backlog, grouped by priority (in-flight, stability, polish, recently shipped). Includes the root cause and fix plan for task #48 (Duplicate Photos warning not clearing) so the next session can resume without re-investigation.
- **`SESSION_NOTES.md`** — "current thread" doc updated at the end of every push. Captures last shipped version, what's next, open questions. Replaces the "current work" slice of the conversation summary that gets lost at context-window boundaries.
- **`WORKING_AGREEMENTS.md`** — codified rules of engagement: non-negotiable safeguards (triple-check QC before every push, one feature per version, atomic version bumps, Canadian English except "labeled", hand push command to Dave) plus speed practices that preserve those safeguards (narrow reads, grep-before-read, batched independent tool calls, subsystem extraction when warranted, no bloviating).

### Why this exists
- Conversations across sessions were slowing down as `app.js` grew past ~26 K lines and context-summary boundaries kept erasing mid-investigation state. Dave flagged it directly: speed up without sacrificing QC.
- The friction wasn't in the safeguards (triple-check costs <30 s and catches real bugs) — it was in time wasted re-deriving state (which task is in flight, what was the root cause we found last time, what's the exact next edit planned). Persisting that state in the repo fixes the recurring cost. Safeguards stay exactly as before.
- Writing down the working agreements also makes it possible to point at the same text when asked to bundle versions or skip a triple-check — no relitigating.

### Scope
- Zero app-code change. `app.js`, `sw.js`, `index.html` receive the standard atomic version bump (v2401 → v2402) only — `APP_VERSION` string, `CACHE_NAME` string, `app-version` meta tag, and all seven `?v=2402` cache-busters. The cache bump forces the three new docs to propagate via the service worker's normal update path so iPhone PWAs pick them up.
- `sw.js` CRITICAL_URLS / OPTIONAL_URLS lists are unchanged (the three new `.md` files are not cached — they're reference docs for Claude / Dave, not runtime assets).
- No runtime behaviour or DB schema changes. No migration, no risk surface.

### Usage
- Start of any future session: read `SESSION_NOTES.md` first. It'll point at the current thread and any paused investigation.
- When backlog changes meaningfully (new task, completed task, sub-divided task): update `TASKS.md` as part of that push.
- When the agreements need a revision (new rule, retired rule): bump the "Last revised" line in `WORKING_AGREEMENTS.md` and include the change in the version's CHANGELOG entry.

### Related
- Direct response to Dave's 2026-04-19 request: "keep this conversation at high speed without sacrificing any safeguards regarding putting in flabby code or taking shortcuts."
- Unblocks the #48 investigation (Duplicate Photos warning not clearing) by persisting the fix plan where the next session can read it in one file.

---

## v2401 — 2026-04-19
### Added
- **Survey write journal — forensic trail of every save.** New `writeJournal` IndexedDB object store (schema v2 → v3, additive upgrade) captures a one-line audit record on every successful `saveSurvey()` call: epoch, ISO timestamp, surveyId, vesselName, caller (inferred from stack), beforeSize (JSON length of the pre-write record), afterSize, delta, itemCount, isNew, lastModified, ageDaysAtSave. Capped at 500 entries via ring-buffer pruning (oldest-first, indexed on `epoch`).
- Console inspection API at `window.kkJournal`:
  - `kkJournal.recent(n=50)` — last N entries, newest first.
  - `kkJournal.forSurvey(id)` — all entries for a given surveyId, chronological.
  - `kkJournal.suspicious(pct=20)` — entries where `afterSize` shrank by ≥ pct% vs `beforeSize`. The smoking-gun filter for "why did my survey lose content?".
  - `kkJournal.dump()` — download the entire journal as JSON (timestamped filename).
  - `kkJournal.count()` — total journal entries.
- `_inferSaveCaller()` helper extracts the calling function name from `(new Error()).stack` — matches both Chrome (`at funcName (...)`) and Safari (`funcName@...`) formats, skips known frames (`Error`, `_inferSaveCaller`, `saveSurvey`, `_originalSaveSurvey`, `Promise`), falls back to `"unknown"` if the stack is unreadable. No call-site refactor needed — every one of the ~30 `saveSurvey()` invocations in app.js gets labelled automatically.

### Why this exists
- The 2026-04-19 Ex-Ta-Sea incident revealed we had zero forensic trail for survey writes. The record was present in the April 11 master backup and gone some days later, with no way to reconstruct when it disappeared or what caller was responsible. v2399 closed the write-destruction class at the merge layer; v2401 adds the observability layer so next time we can answer "when did it shrink, and who did it?" in under a minute via `kkJournal.suspicious()`.
- Size-delta tracking (beforeSize / afterSize / delta) is the single most useful signal: legitimate edits grow or leave the survey size roughly constant; silent data loss shows up as a sharp drop. The `suspicious()` filter surfaces drops of ≥ 20% so the surveyor (or future debugger) can spot them without reading every entry.
- Stack-inference captures caller names without requiring a cross-codebase refactor. This matters because `saveSurvey` has ~30 invocations (several in async callbacks with no convenient place to thread a caller arg); retrofitting them one-by-one would multiply review surface for no benefit.

### Design
- Journal writes fire-and-forget AFTER `store.put(survey)` resolves — journal pressure never blocks the save resolve. Separate IDB transaction (`['writeJournal']`) so the save path doesn't wait on journal I/O. Errors inside `_journalSurveyWrite` are swallowed at `console.debug` level; journal failures MUST NOT break saves.
- `beforeSize` is captured by reading the pre-existing record inside the same save transaction (`store.get(survey.id)` serial-to-`store.put(survey)`). One extra O(1) read per save; negligible vs the stringify + auto-regen cost already on the path.
- Ring buffer prune runs after every write via a cursor on the `epoch` index (ascending = oldest-first). At 500 × ~300 B/entry = ~150 KB — noise vs photo storage. Double-prune races from concurrent saves are harmless (cursor.delete is idempotent per key).
- Schema upgrade (v2 → v3) is additive only: existing `surveys` and `photos` stores unchanged, new `writeJournal` store created with `autoIncrement` id and indexes on `surveyId` (for per-survey replay) and `epoch` (for newest-first retrieval and oldest-first pruning). `onblocked` handler warns if another open tab is holding v2.

### Scope
- No behaviour change on any save path. `saveSurvey` adds one pre-put `get` (same tx) and one post-put fire-and-forget call; both are additive. If the `writeJournal` store is missing (e.g., upgrade didn't run), every journal entry point short-circuits via `objectStoreNames.contains('writeJournal')` and saves proceed unchanged.
- Only `saveSurvey` is instrumented. `savePhoto` is not journaled — photo writes are less forensically interesting (binary content, no field-level data loss to diagnose) and would bloat the journal at the volume they run.
- Cache version bumped (v2400 → v2401) along with APP_VERSION, the HTML meta tag, and all seven cache-busters — standard atomic-version routine.

### Usage
- `kkJournal.recent(20)` — quick peek at what's been saved lately.
- `kkJournal.suspicious()` — any shrinks ≥ 20%? Empty array = healthy.
- `kkJournal.forSurvey(<surveyId>)` — full save history for one vessel, chronological.
- `kkJournal.dump()` — download a JSON file; attach to an issue or email when filing a data-integrity bug.

### Related
- Answers the forensic half of task #74 (Ex-Ta-Sea disappearance) — the original incident is unrecoverable (journal wasn't running), but any future occurrence is now diagnosable.
- Completes the v2399 / v2400 / v2401 trio shipped 2026-04-19: v2399 prevents silent survey writes, v2400 prevents photo-download corruption, v2401 records everything that makes it through for after-the-fact analysis.

---

## v2400 — 2026-04-19
### Fixed
- **`pullPhotosForSurvey` no longer saves Firebase Storage error responses as photos.** Three guards added before `savePhoto`: (1) `response.ok` check — reject any non-2xx HTTP status from Storage up front; (2) `blob.type.startsWith('image/')` — reject JSON error envelopes, HTML error pages, and any other non-image Content-Type; (3) magic-byte sniff on the first 4 bytes of the blob — verify JPEG (`FF D8`), PNG (`89 50 4E 47`), or WebP (`52 49 46 46`) signature before persisting.
- Each rejected download logs a `console.warn` naming the cause (HTTP status, Content-Type, or hex of the bad header) and skips that photo without aborting the rest of the batch pull.

### Why this exists
- Root cause of the 2026-04-19 Ex-Ta-Sea photo corruption. Firebase Storage returned a 200-shaped response whose body was a JSON 404 envelope (`{"error":{"code":404,"message":"Not Found"}}`) for photos whose binary had never been uploaded or had been deleted. The pre-v2400 code did `blob = await response.blob()` then `blobToDataUrl(blob)` without validation, producing `dataUrl = "data:application/json;base64,ewogICJlcnJvciI6…"` and calling `savePhoto({...meta, dataUrl})`. That record overwrote the real photo in IndexedDB (shared `id` keyPath), silently turning 131 of 158 Ex-Ta-Sea photos into JSON error strings.
- The existing `if (local && local.dataUrl) continue` guard at the top of the pull loop did NOT protect us — when a fresh restore lands a new survey record, `pullPhotosForSurvey` can fire BEFORE the batch-import photos have been written to IDB, so `local.dataUrl` is still empty at the moment of the overwrite.
- Manual recovery: sync disabled via console snippet, all 11 batch `.kikisurvey` zips re-imported through `import.html` (which writes dataUrls directly without touching Firebase), one orphan JSON record deleted via cursor. 158 of 158 photos now valid. v2400 prevents the recurrence.

### Design
- Guards ordered cheapest-first: HTTP status check (no body read) → Content-Type string match (one property read) → 4-byte magic sniff (smallest possible blob.slice().arrayBuffer()). Rejection at any stage skips the photo without materialising the rest of the body.
- Magic-byte sniff uses `blob.slice(0, 4).arrayBuffer()` — reads only 4 bytes from the blob, not the whole payload. Costs nothing vs the pre-v2400 path which was already reading the entire blob anyway.
- Exceptions caught by the existing per-photo `try/catch`. One corrupt entry in a batch of 150 photos no longer aborts the whole pull; pre-v2400 behaviour is preserved for the happy path.
- No signature change. No new dependencies. No telemetry beyond the existing `[Sync] Downloaded photo` / `[Sync] Could not download photo` log lines — just the cause strings are more actionable now.

### Scope
- Only `pullPhotosForSurvey` at app.js line ~25374 is touched. The companion `pushPhoto` write path is not symmetric (no non-image source — photos come from the camera or the annotation canvas, both of which produce real image blobs by construction).
- The v2385 `local.dataUrl` dedupe guard is unchanged. It still short-circuits re-downloads when a valid photo is already in IDB — v2400 only adds protection for the case when that guard doesn't apply.
- `blobToDataUrl` itself is untouched. The validation runs before it, so the helper never sees a non-image blob.
- Cache version bumped (v2399 → v2400) along with APP_VERSION, the HTML meta tag, and all seven cache-busters — standard atomic-version routine.

### Related
- v2399 (`guardedSurveyUpdate` chokepoint) and v2400 (photo download validation) are the two sibling fixes for the 2026-04-19 incident. v2399 closes the "survey record disappears" category; v2400 closes the "photos get clobbered by sync" category.
- v2401 (planned) will add a survey write journal — the forensic trail we wish we'd had when Ex-Ta-Sea first disappeared.

---

## v2399 — 2026-04-19
### Added
- **`guardedSurveyUpdate(survey, updates, caller)` — central chokepoint for top-level survey writes.** New ~50-line function in app.js (with ~60-line docblock) routes every bulk survey mutation through one place-to-trust. Three guarantees: (1) `undefined` values never written (v2377 class), (2) `comparables` routed through `guardedAssignComparables` with `skipComparables` pre-applied so the v2383 empty-over-nonempty refusal sees the user's intent, (3) ancient-survey telemetry — surveys with `lastModified` > 30 days or missing get a `console.info` line naming the caller, so dormant-record mutations show up in logs. Empty strings and empty arrays are still assigned (they represent legitimate user-intent clears; caller distinguishes by passing `undefined` vs `''`/`[]`).
- `saveSurveyDetails` migrated to the chokepoint: replaces the historically layered v2377 undefined-strip loop + v2383 comparables pre-guard + terminal `Object.assign(survey, updates)` trio with a single `guardedSurveyUpdate(survey, updates, 'saveSurveyDetails')` call. One of the 5 HIGH-risk sites inventoried in v2398's audit block; remaining 4 (per-field loop in `saveEditFormSilently`, `safetyEquipment` rebuilds, `_syncEnginePhotosFromBody`, auto-prose writers) get migrated in v2400–v2402.

### Why this exists
- v2377 / v2383 / v2386 were each reactive patches wrapping ONE specific save-path entry point. A new entry point added later (e.g., a future auto-save, sync pull, or AI-assisted writer) would bypass those protections by default. The chokepoint flips the polarity: new entry points get all three guards just by using `guardedSurveyUpdate` — no copy-pasted defensive loops to maintain. This is the P0 deliverable from the 2026-04-19 stability-first roadmap.
- Today's recovery of Ex-Ta-Sea surfaced the broader pattern: multiple ways existed to silently destroy a survey record, and the only forensic evidence was "it's gone". The chokepoint plus its ancient-survey telemetry gives us both prevention (guards) and visibility (caller logging) on the highest-risk path.

### Design
- Function declared at app.js line ~13233 (immediately after `guardedAssignComparables` at ~13141). Both are hoisted function declarations, so call order in source is irrelevant.
- Signature returns `{ applied, skipped }` — applied count and the list of keys skipped (undefined-valued or comparables-refused). Call sites that want to log or alert on skips can read the return; `saveSurveyDetails` currently ignores it.
- Ordering inside the function: ancient-survey telemetry (one-shot) → comparables routing (with skipComparables pre-apply, then delete from updates) → generic undefined-safe merge loop. Matches the pre-existing ordering at `saveSurveyDetails` so behaviour is identical.
- Explicit non-goals: per-item writes (`survey.items[label].X = Y`) stay out of scope — they have their own mutation patterns and no evidence of item-level data loss. The function also does NOT persist (no `saveSurvey` call) and does NOT deep-clone (shallow Object.assign semantics preserved by reference).

### Scope
- `saveSurveyDetails` write-path behaviour is semantically identical to v2398 — the trio it replaces did the same three things in the same order. Only the code locality changed.
- Cache version bumped (v2398 → v2399) along with APP_VERSION, the HTML meta tag, and all seven cache-busters — standard atomic-version routine.
- 4 HIGH/MED risk sites from v2398's audit remain un-migrated: `saveEditFormSilently` per-field loop (~10512), `safetyEquipment` rebuilds (13712 / 17398 / 17425), `_syncEnginePhotosFromBody` (20409-20425), auto-prose writers. These land in v2400–v2402 per the one-feature-per-version rule.

### Related
- Ex-Ta-Sea recovery: survey record restored from April 11 master backup; 158 photos re-imported from batch zips (`.kikisurvey` archives 1–11). Incident also surfaced a separate bug in `pullPhotosForSurvey` — Firebase Storage 404 JSON responses were being saved as `dataUrl` and overwriting real photos. That fix lands as v2400 (`pullPhotosForSurvey` blob-type validation).

---

## v2398 — 2026-04-19
### Changed
- **P0.1 audit pass: added a comprehensive write-site inventory comment block above `saveSurveyDetails` in app.js.** No executable code change, no behaviour change — inventory only. The block catalogues every top-level `survey.X = Y` assignment in app.js (~55 sites) plus the single `Object.assign(survey, updates)` call at line ~10453, groups them into 10 categories (bulk-merge / per-field guarded writes / vessel-type derived / auto-prose / safety rebuilds / photo-slot sync / engine-field migrations / single-field UI writes / timestamp-admin / fully-guarded), ranks them by blast-radius risk, and names the highest-risk sites by line number so v2399's `guardedSurveyUpdate` chokepoint can replace them with precision.

### Why this exists
- Three separate emergency data-loss patches have shipped in the last week — v2377 (strip `undefined` before Object.assign), v2383 (`guardedAssignComparables` empty-over-nonempty refusal), v2386 (lastModified timestamp for Firebase merges). Each was reactive: the bug surfaced, then we wrapped one specific write site. The stability-first roadmap (saved 2026-04-19) calls for a single guarded chokepoint (`guardedSurveyUpdate(survey, updates, caller)`) in v2399 that replaces the scattered defenses with one place-to-trust. Landing that chokepoint without first inventorying every write site risks missing a category; landing it WITH an inventory lets every subsequent tranche (v2400-v2402) point at specific line numbers to migrate. The inventory is the scaffold for everything in the P0 block of the roadmap.

### Design
- Pure documentation. The comment block is ~180 lines of pure `//` text wedged between the preceding `}` (end of the Edit Intro builder) and the `function saveSurveyDetails(surveyId) {` declaration at app.js line ~10345. Location chosen because `saveSurveyDetails` is both the highest-blast-radius write path (80+ intro fields via Object.assign) and the home of v2399's guarded chokepoint — readers asking "why this function?" will find the audit right above it.
- Structure: (a) Motivation — cite v2377 / v2383 / v2386 incident trail; (b) Scope — top-level writes only; item-scoped writes out of scope; (c) Save-path entry points — the 5 functions that actually persist to IndexedDB via `saveSurvey(...)`; (d) Classified write sites in 10 categories A–J, each with approximate line numbers and a one-line risk note; (e) Risk ranking 1–5 highest-first; (f) v2399 plan naming the target function signature and which categories get routed through it.
- Every line number annotated `~NNNN` (approximate) because minor refactors shift line numbers and we don't want the comment to go stale if the next version touches lines above 10345. The category labels (A, B, C, …) are stable references — future audits can point to "category A bulk-merge" without a line number.
- Chose to leave item-scoped writes (`survey.items[label].X = Y`, ~40 sites) OUT of this pass. Those mutate a per-item record, not the survey-top-level shape that the save chokepoint persists. A separate audit pass will cover them if item-level data loss ever surfaces; no evidence today that any item-scoped write has been destructive.

### Scope
- Zero behaviour change. Zero DOM change. Zero save-path change. Zero data-model change. Every function and every `survey.X = Y` line operates identically to v2397.
- Cache version bumped (v2397 → v2398) along with APP_VERSION, the HTML meta tag, and all seven cache-busters — standard atomic-version routine. No other edits beyond the comment block.
- This is the first of the P0.1 "audit + guarded chokepoint" pair. v2399 lands the actual `guardedSurveyUpdate(survey, updates, caller)` function and flips the Object.assign site at line ~10453 to route through it. v2400-v2402 then migrate the `saveEditFormSilently` loop, the `safetyEquipment` rebuilds, and the `_syncEnginePhotosFromBody` mutations onto the guarded path in separate one-feature-per-version tranches.

### Risk ranking (reproduced from the inventory for roadmap readers)
- **1 (HIGH)** `Object.assign(survey, updates)` at ~10453 — 80+ intro keys. Guarded against `undefined` (v2377) and `.comparables` wipe (v2383), but plain `''` and `[]` still pass through. v2399 target.
- **2 (HIGH)** `survey[f] = el.value` loop at ~10512 in `saveEditFormSilently`. No new-vs-old compare. v2400-v2402 target.
- **3 (MED)** `survey.safetyEquipment = result.checklist` at 13712 / 17398 / 17425. Safe today; empty-over-nonempty not explicitly refused.
- **4 (MED)** `_syncEnginePhotosFromBody` (20409-20425). Can null intro photo slots during a delete-and-reupload window. P0.3 scope.
- **5 (LOW)** Everything else. Narrow surface, well-guarded today.

### Related
- Sits at the head of the P0.1 thread per the stability-first roadmap: v2398 = audit → v2399 = guarded chokepoint → v2400-v2402 = migrate write sites in tranches → v2403-v2405 = P0.2 iPhone storage control UI → v2406-v2408 = P0.3 canonical photo state machine → v2409-v2410 = P0.4 regression checklist.
- Builds on v2377 (undefined-key strip in saveSurveyDetails), v2383 (`guardedAssignComparables`), and v2386 (`lastModified` timestamp in saveSurvey override) — the three reactive patches the inventory cites as motivation. The inventory exists so v2399 can retire all three as the scattered defenses of record and replace them with one canonical path.

---

## v2397 — 2026-04-19
### Changed
- **Report now ends within the last ~20% of the final printed 8.5×11 page instead of stranding the Surveyor's Certification near the top of a mostly-empty sheet.** Dave flagged that on several recent reports the signature block (SURVEYOR'S CERTIFICATION header + six certification bullets + logo + signature + contact line) rendered at the top of the final printed page with 4–6 inches of white space below it — unprofessional for a client deliverable and inconsistent with how formal marine-survey reports are traditionally laid out (signature anchored to the bottom). Now the cert block is forced onto its own dedicated last page and pushed to the bottom edge so the final printed line sits in the bottom ~20% zone of the sheet.

### Design
- Wrapped the existing Surveyor's Certification `.footer` block (app.js ~line 22955) in a new `<div class="report-end-page">` container. Print-only CSS rules added inside the existing `@media print` block (app.js ~line 21768) do three things in combination: (a) `page-break-before: always` + `break-before: page` force the wrapper onto a new printed page — guarantees the cert is never split across the page boundary and never shares a page with the preceding Valuation Worksheet / Comparables table; (b) `min-height: calc(100vh - 1mm)` claims the full printable page height so the flex layout has vertical room to distribute children; (c) `display: flex; flex-direction: column; justify-content: flex-end` with a belt-and-suspenders `margin-top: auto` on the child `.footer` pushes the entire cert block to the bottom of the page. Screen view is untouched — all rules are inside `@media print` so Dave's in-browser report preview still flows naturally for scrolling.
- Kept both legacy (`page-break-before: always`) and modern (`break-before: page`) declarations for the same reason v2395 kept both: Chrome, Safari, and Firefox all honour the legacy spec, and the modern CSS Fragmentation Module spelling is the path forward. Including both is idempotent — browsers collapse them to a single break.
- Chose forced page break over a "push to bottom only if room allows" heuristic. The heuristic variant (e.g. wrapper with `break-inside: avoid` but no forced break-before) would have left the cert on the preceding page when it happened to fit, with possibly several inches of trailing whitespace above the signature. Forcing a dedicated final page gives a predictable, professional result: one clean signature page regardless of how the preceding Valuation Worksheet / Comparables table filled out. In the edge case where the preceding content already ended near the top of a page, we trade a little extra whitespace on the penultimate page for a correctly-anchored signature on the last page — the correct trade-off for a client-facing document.

### Scope
- Print layout only. No change to the in-browser report view, the Word export path, the PDF export button, or any data-generation logic — the cert HTML itself is identical to v2396's, just nested inside one additional wrapper div.
- Applies to every generated report regardless of length. A one-page report (rare but possible for a very short valuation-only survey) would still push the cert to the bottom of page two since the wrapper forces a break; a ten-page report behaves the same way on page ten. No length-dependent branching.
- Complements v2395 (eliminated the blank page between Safety and F&amp;R) and v2374 (suppressed empty rows inside sections). Together these three changes cover the full vertical-whitespace audit of the generated report: no blank pages BETWEEN sections (v2395), no empty rows WITHIN sections (v2374), no orphaned trailing content on the final sheet (v2397).

### Related
- v2396 announced this in its `Related` note ("v2397 will tune end-of-report page balance so the final page fills most of its vertical space"). Delivered.
- Part of the broader report-polish thread that also includes v2368 (Print/PDF button rationalization), v2370 (uniform photo sizing), and v2227 (cert block flush alignment + reviewer-flagged page numbering).

---

## v2396 — 2026-04-19
### Changed
- **Engine + transmission info in Detailed Survey Findings now renders as `.item` blocks instead of a 2-column `<table>`.** Dave flagged that the engine/transmission/gearbox section was visually different from every other block in the Detailed Survey Findings section — a boxed table with `Make / Model / Serial No. / Power Rating / Engine Hours / Fuel Type / Photos` rows, surrounded by `.item` divs for every actual checklist item. The inconsistency made the propulsion header look like a separate sub-report glued into the section. Now each engine and transmission renders as its own left-rail bordered `.item` card, matching the pattern used by the Instruments &amp; Electronics inventory and by every rated item in this section.

### Design
- New local helper `propulsionItem(title, specParts, photoCards)` inside the propulsionHeaderHtml builder (app.js ~line 22263). Renders a `.item` div with `border-left-color: #066aab` (the default informational colour that non-rated items fall back to, so propulsion blocks visually group with the checklist items below them), a bold title line (`Engine 1 (Port)` / `Engine 2 (Starboard)` / `Transmission 1 (Port)` / `Transmission 2 (Starboard)` / `Engine` / `Transmission` depending on install count), an italic grey spec line joined by em-dashes (`Volvo Penta D4-260 — Serial ABC123 — 260 HP — 1450 hrs — Diesel`), and a `.report-photo-row` below for any nameplate or serial-plate photos. Empty spec parts are filtered out via `.filter(Boolean)` before the em-dash join, so a partially-populated engine still reads cleanly (e.g. just `Volvo Penta D4-260 — Diesel` if only make/model and fuel are set).
- Block-level gating. Each of the four possible blocks (Engine 1, Engine 2, Transmission 1, Transmission 2) is only rendered when at least one of its source fields is populated (make, model, serial, HP, hours, fuel, photos, or plate photos). A survey with only Engine 1 filled in renders a single card — no empty "Engine 2" block, no empty "Transmission" block. Matches the v2374 "no empty rows" principle applied elsewhere in the report.
- Singular-vs-numbered titling. When only Engine 1 is set, the title reads `Engine` (not `Engine 1`), and the transmission reads `Transmission` (not `Transmission 1`). When a twin install is detected (`survey.engine2Make` or `survey.transmission2MakeModel`), the numbered/sided forms kick in. Mirrors the conditional title rendering the old table did — kept for parity so surveys with twin-engine + single-transmission rigs (rare but real) still label the single gearbox as "Transmission" without a "1" suffix.
- `Serial No.` / `Power Rating` / `Engine Hours` / `Fuel Type` row labels from the old table are collapsed into the inline spec line. `Serial` is kept as a literal prefix (it's the only spec component where the number alone would be ambiguous); `HP`, hours suffix, and fuel-type values carry their own self-labelling (the placeholder on the HP input is `e.g., 54HP / 39.7kW` and the fuel dropdown stores a full type name, so no additional label is needed). Engine hours render with a ` hrs` suffix since the field is raw-numeric in most real entries.

### Scope
- Detailed Survey Findings → engine category header only. The individual checklist items rendered below the header (`Port — Engine condition`, `Starboard — Engine condition`, `Engine start and stop`, etc.) are unchanged — they were already `.item` divs. The propulsion *narrative paragraph* (from `survey.propulsionNarrative` or `buildPropulsionNarrative`) still renders above the new blocks in its existing `.scope-text` wrapper — that's a paragraph of prose, not a per-unit data display, so it gets the scope-text treatment like the safety-equipment and instruments preambles do.
- Photo handling preserved from the old table. `enginePhotos`, `enginePlatePhotos`, `engine2Photos`, `engine2PlatePhotos`, `transmissionPhotos`, `transmissionPlatePhotos`, `transmission2Photos`, `transmission2PlatePhotos` are still loaded once at the top of the section (app.js ~line 21560), still mapped through `nameplateImg(url, label)` with the same per-unit labels (`Engine` / `Engine data plate` / `Engine 2` / `Engine 2 data plate` / `Transmission` / `Transmission serial plate` / `Transmission 2` / `Transmission 2 serial plate`), and the photo-card HTML is concatenated into a single `.report-photo-row` under each block instead of sitting in a `<td>` of the table. Output size and caption text are identical — only the wrapper geometry changed.
- No data-model change. `survey.engineMake`, `survey.engine2Make`, `survey.transmissionMakeModel`, `survey.transmission2MakeModel`, `survey.engineHP`, `survey.engineHours`, `survey.fuelType`, `survey.engineSerial` etc. all still write through the same Edit Intro fields. Edit Intro form, validation, and save paths untouched.

### Related
- Sits alongside v2395 (blank-page removal before F&amp;R) and v2374 (no empty rows) as part of the ongoing polish on the Detailed Survey Findings section. Next in that thread: v2397 will tune end-of-report page balance so the final page fills most of its vertical space (within last 20%) rather than orphaning one or two lines on a mostly-blank sheet.

---

## v2395 — 2026-04-19
### Fixed
- **Blank page no longer appears between Safety Equipment and Findings &amp; Recommendations.** Dave flagged a visibly empty page in the Marty Selnick report wedged between the TC TP 511 safety inventory and F&amp;R. Root cause: the Safety Equipment section ends with `<div class="page-break"></div>` (a zero-height div with `page-break-after: always;`), and the F&amp;R section was starting with ANOTHER identical `<div class="page-break"></div>`. Chrome and Safari interpret stacked empty page-break divs differently on different content lengths — when the preceding section almost exactly filled its printable page, the double break produced a truly blank sheet between sections. Same stacking problem existed between Instruments &amp; Electronics (if present) and F&amp;R.

### Design
- Removed the leading `<div class="page-break"></div>` from the F&amp;R section (app.js ~line 22525). The preceding Safety Equipment and Instruments &amp; Electronics sections each already emit their own trailing page-break, so the second one was always redundant.
- Moved the "F&amp;R must start on a new page" guarantee onto the H2 itself via inline `page-break-before: always; break-before: page;`. This covers the edge case where BOTH preceding sections happen to be absent (extremely rare — every Canadian pleasure-craft survey populates Safety Equipment — but the guarantee is preserved). Modern browsers consolidate `page-break-before` against a preceding `page-break-after` into a single break, so the fix is idempotent: exactly one blank page boundary between the preceding content and F&amp;R, no more, no less.
- Used both `page-break-before` (legacy spec, still honoured by Chrome/Safari/Firefox) and `break-before: page` (modern CSS Fragmentation Module). Either property alone would work in every browser Dave uses, but including both is cheap insurance against future deprecation.

### Scope
- Only affects the transition INTO Findings &amp; Recommendations. Other section transitions (Detailed Survey Findings → Safety Equipment, Safety Equipment → Instruments &amp; Electronics, F&amp;R → Rating &amp; Valuation, etc.) are unchanged — those were already emitting single breaks because each section trails with one page-break div and the next section has no leading page-break.
- Does NOT remove the trailing page-break divs from Safety or Instruments. They're still correct — they ensure Safety flows onto its own page (after Detailed Survey Findings), and Instruments (if present) flows onto its own. Removing them would run Safety directly into F&amp;R in the case where Instruments is empty, which is worse than the original bug.
- Pure cosmetic report-layout fix. No data model, no save path, no offline cache logic touched. Safe to ship under the atomic-install SW (v2392) that's already active.

### Related
- Complements v2374 (suppress empty rows/sections so no blank space within a section) — v2374 trims vertical whitespace INSIDE sections, v2395 trims blank pages BETWEEN sections. Same reader-experience goal: a polished, professional report with no filler.

---

## v2394 — 2026-04-19
### Changed
- **Findings &amp; Recommendations now shows the full observation text, and the recommendation reflects the surveyor's prescribed action when one exists.** Two related changes reported together because they interact: (1) Observation text in F&amp;R is no longer clipped to its first sentence + "…". Dave: "I don't think A or B recommendations should be abbreviated in the findings and recommendations. It is important the purchaser or insurance company can read all of this." The full multi-sentence observation is now rendered verbatim so the reader can read the complete description without cross-referencing Detailed Survey Findings. (2) If the last sentence of the observation is a recognised repair/inspect instruction, that sentence is pulled OUT of the observation and used AS the recommendation — with the standards citation appended and NO generic "Schedule repairs in the near future…" boilerplate. If no action sentence is detected, the observation stays intact and the recommendation uses the boilerplate + standards citation (same text the report already used). Dave: "I don't want that action sentence to appear twice. If I recommend an action, then there should be no boilerplate. Only my action plus the appropriate ABYC or TC standard stated. If I do not prescribe an action, then the boilerplate plus the ABYC TC info should be appended."

### Why this exists
- F&amp;R is frequently read standalone by a purchaser's bank, an insurance underwriter, or a broker who doesn't wade into Detailed Survey Findings. The first-sentence truncation (added in v2236 on the theory that F&amp;R was an action list, not a second verbatim copy) was hiding exactly the description those readers need. Meanwhile the v2241 "extract action and append to boilerplate" behaviour paired with a full observation would have caused the action to appear twice — once in observation, once grafted onto the recommendation. v2394 reconciles both: observation is complete, recommendation is precise, and nothing appears in both places.

### Design
- New helper `extractActionFromObservation(text)` (app.js, immediately after `truncateForFR` ~line 22537) — takes the cleaned observation text, sentence-splits with the same regex the v2241 code used (`/[^.!?]+[.!?]+/g`), inspects the last sentence, and returns `{ body, action }`. The split fires only when (a) there are ≥2 sentences so the body can still carry context, (b) the last sentence isn't a disclaimer (matches the same phrase list v2241 used — "visual observation only", "does not constitute", "confirmation of serviceability"), AND (c) the last sentence contains an action verb (same list: replace, repair, service, inspect, reapply, address, correct, install, secure, test, recommend). Single-sentence observations never split — they stay whole as the body and the recommendation falls back to boilerplate, since pulling the only sentence out would leave the observation empty.
- `buildRecommendation(f, severity, action)` (third parameter added) — when `action` is truthy, builds the recommendation body as `<action-sentence-with-standards-merged-into-parenthetical>.` with no boilerplate; when `action` is empty it falls back to the pre-v2394 boilerplate text (with the A/B differentiation preserved: A gets "Immediate correction required before the vessel is next underway…", B gets "Schedule repairs in the near future…"). A small inner helper `actionWithCite(s)` strips the trailing `.!?` terminator, appends the `(ABYC/TC/…)` citation, and restores the original terminator — so "Replace the anode before launch." becomes "Replace the anode before launch (ABYC E-2-7)." rather than "Replace the anode before launch.(ABYC E-2-7)."
- `renderFinding(f, color, severity)` now: runs `dedup → depersonalise → cleanupTypos → pluralizeRudder` on `f.text`, then `extractActionFromObservation(cleaned)` to get `{ body, action }`, renders `body` inside the `<p>` (or omits the `<p>` entirely if body is empty — defensive, shouldn't happen in practice), and hands `action` to `buildRecommendation`. Order of string transforms preserved from v2236 except `truncateForFR` is removed from the pipeline and `pluralizeRudder` now runs before the extraction (both body and action come out rudder-pluralized uniformly).

### Scope
- A and B findings only. C and NT findings keep their v2373/v2376 two-column tables (no observation text shown — the label IS the summary).
- PO (Powered Up Only) findings still use `truncateForFR` in their Notes column — the PO table is a compact at-a-glance format for "we energised this but didn't fully test", which doesn't have the purchaser-readability concern Dave raised. `truncateForFR` is kept in the codebase specifically for that caller.
- Detailed Survey Findings section unchanged — it has always rendered the full observation text + photos, and remains the canonical full record. F&amp;R and Detailed now carry duplicate observation prose by design, which is fine: F&amp;R is the action list, Detailed is the narrative.
- Action detection regex intentionally unchanged from v2241 (same verb list, same disclaimer list). If Dave later wants to catch past-tense forms ("was replaced"), passive ("should be replaced"), or more verbs, that's a separate task.
- Edge case: an observation that's a single action sentence ("Replace the anode.") does NOT split — the whole sentence stays in the observation and the recommendation gets boilerplate. The alternative (empty observation, action becomes recommendation) would strip context the reader needs.

### Related
- Reverses the narrowing that v2236 introduced ("F&amp;R is an action list, not a second verbatim copy") now that Dave has re-evaluated the reader population for F&amp;R. Supersedes the v2241 action-extraction-then-append behaviour with action-extraction-then-replace.

---

## v2393 — 2026-04-19
### Added
- **🧹 Reset App Cache button now lives on the survey-page ⋯ menu too.** Cache drift doesn't wait for you to be on the home screen. The original v2387 iPhone crash hit while Dave was mid-typing in Vessel Name, i.e. inside a survey — so the self-heal needs to be reachable from inside a survey. v2390 added the button to `homeOverflowMenu`; v2393 mirrors the same entry onto `inspOverflowMenu`, directly below Force Update. Red text (`#dc2626`) matches the home-menu styling, and the `title` attribute ("Clears app cache and reloads — surveys and photos are preserved") carries through so the hover hint reminds Dave (and anyone he hands the app to) that data is safe.

### Why this exists
- Dave noticed the survey-page ⋯ menu was missing the Reset App Cache entry even though the same failure mode (drift → crash mid-survey) is much more likely to surface while a survey is open than while staring at the home list. Forcing a round-trip back to home to reach the self-heal wastes time at exactly the moment the app has gone sideways. Mirroring the button keeps the fix one tap away wherever drift shows up.

### Design
- Button appended in `renderInspection` right after the existing `updateOpt` (app.js ~line 14277). Uses `document.createElement('button')` + `onclick = () => { overflowMenu.style.display = 'none'; resetAppCache(); }` — same pattern as the surrounding menu entries. Styling matches the home-menu entry verbatim (same padding, font size, weight, red `#dc2626`), so the two menus present an identical Reset experience.
- `resetAppCache()` itself is unchanged from v2390/v2391 — still wraps `_doResetAppCache(false)` (interactive mode: confirm dialog, toasts, error alert on failure). Surveys and photos survive every invocation because `_doResetAppCache` deliberately skips IndexedDB.

### Scope
- Only the inspection ⋯ menu changes. Home menu already had the button from v2390. No other pages currently have overflow menus — Edit Intro and Boat Info rely on the tappable version-number text in the header for access to `forceAppUpdate`. If those pages grow a ⋯ menu later, this same button should go onto them.
- Does NOT change the page-specific items on either menu (Generate Report / Pre-Flight Check / Edit Vessel Info / Recover Photos / Remove Date Stamps on inspection; Export All / Import / Force Update on home). Those stay where they belong since they only make sense in their respective contexts.

### Related
- Completes the cache-reliability user-facing surface: v2390 put the button on home, v2391 made the heal happen automatically on version mismatch, v2392 prevented drift at source in the SW install, v2393 makes sure the manual fallback is reachable wherever the user happens to be.

---

## v2392 — 2026-04-19
### Changed
- **Service worker install is now atomic on critical files.** Phase 3 of the 3-part cache-reliability programme (v2390 button, v2391 auto-heal, v2392 prevention). The install handler in `sw.js` previously wrapped every `cache.add(url)` call in `.catch(warn)`, which meant a single flaky network fetch during install would log a console warning and then happily activate the service worker with a partially-populated cache. That half-populated cache was the root cause of the v2387 iPhone Safari crash: index.html was fresh, some of the JSON files were fresh, but app.js was still the old version — Dave's "mixed-version chaos" scenario. v2392 splits `URLS_TO_CACHE` into `CRITICAL_URLS` (HTML, JS, JSON — all the files that parse or read each other) and `OPTIONAL_URLS` (icons, logos, external Firebase SDK from gstatic). Critical files are cached with `Promise.all` and NO per-file catch, so the first failure rejects the whole install and the browser keeps the previous (working) service worker active. Optional files retain per-file tolerance — individual icon failures don't block anything and network fallback covers them at runtime.

### Why this exists
- v2390 and v2391 are recovery mechanisms — they let Dave heal from drift after it has already corrupted a session. v2392 is prevention at the source: a service worker can no longer publish a partial cache. The only way a `CACHE_NAME = 'kiki-marine-vNNNN'` bucket becomes active is if every critical file under that version successfully cached in the same install pass. Mixed-version caches become impossible by construction, which removes the failure mode rather than papering over it.

### Design
- `CRITICAL_URLS`: `./`, `index.html`, `app.js`, the six `src/core/*.js` modules, `manifest.json`, both survey templates, `text_library.json`, and the five database JSONs (`boat_specs_db`, `boat_values_db`, `engine_db`, `outdrive_db`, `winch_db`, `dictionary`). These are every file the app parses or reads during startup and normal operation — if any one of them is a different version than the others, app.js's contracts against the JSON schemas can drift silently.
- `OPTIONAL_URLS`: the seven PNG assets (`apple-touch-icon`, `icon-192`, `icon-512`, `icon-192-maskable`, `icon-512-maskable`, `signature.png`, `new_logo.png`) and the four external `gstatic.com` Firebase SDK URLs. These either display fine when missing (icons fall back to platform defaults), are fetched live when cache misses (Firebase SDK via network), or are surface-only and can be loaded on next successful install.
- Install flow: `caches.open(CACHE_NAME) → Promise.all(CRITICAL_URLS.map(cache.add))` with NO catch. Rejection in the try block deletes the incomplete `CACHE_NAME` bucket (so the next install attempt starts clean rather than partially pre-filled), then rethrows — the rethrow is what rejects `event.waitUntil`, which tells the browser the SW install failed. Browser keeps the previous SW active. On success, `OPTIONAL_URLS` cache with per-file `.catch(warn)` tolerance, then `self.skipWaiting()` fires. `skipWaiting` was moved INSIDE the async IIFE (was outside `event.waitUntil` previously) so that a failed install can't accidentally promote a broken SW.
- The old global `URLS_TO_CACHE` constant is removed. No other code in sw.js referenced it.

### Scope
- No app.js change beyond the version bump. All prevention logic lives in sw.js.
- `activate` handler is unchanged — still deletes old caches whose names don't match the current `CACHE_NAME`, still calls `self.clients.claim()`. Activation only runs when a new SW successfully installed, which (post-v2392) guarantees the new cache is complete, so the old cache can be safely deleted.
- The `fetch` handler is unchanged. Network-first for `.json` and `app.js`, cache-first for the gstatic Firebase SDK, stale-while-revalidate for everything else — same as v2391.
- Does NOT retry failed installs automatically. If a critical file fails to cache (e.g. Dave has flaky wifi at a boatyard), the old SW stays active and the next page load will re-attempt install. Once network recovers, install succeeds and the new version activates.

### Related
- Closes the 3-part cache-reliability programme: #64 (v2390 button) → #65 (v2391 auto-heal) → #66 (v2392 atomic install). The root-cause task #63 (iPhone Safari crash) is now mitigated by v2390, auto-healed by v2391, and prevented at source by v2392.

---

## v2391 — 2026-04-19
### Added
- **Startup version handshake — automatic self-heal on cache drift.** On every app load, app.js reads `<meta name="app-version">` from index.html and compares it to the `APP_VERSION` constant. If the two don't match, app.js silently invokes the v2390 reset path (unregister service workers, delete CacheStorage, reload) before any other startup code runs. The user never sees the drift symptom — no crash, no white screen, no manual tap on the Reset button — just a brief page reload that heals the cache and brings everything in sync.

### Why this exists
- v2390 gave Dave a button to self-heal when cache drift caused visible problems. But by the time he notices the drift (crash, UI weirdness), the session is already broken and the survey-in-progress is at risk. v2391 closes the gap — the moment the app loads with mismatched versions, it heals itself before the user can touch anything. In the common case (versions match), the handshake runs once, returns in microseconds, and is invisible.

### Design
- `<meta name="app-version" content="v2391">` added to index.html `<head>`. Bumped on every version bump (same cadence as the cache-buster query strings). When index.html is fresh-from-server and app.js is stale-from-cache, the meta tag reflects the server's current version and `APP_VERSION` reflects the cached version — the mismatch exposes the drift.
- `_checkVersionHandshake()` (app.js, immediately after `resetAppCache` ~line 372) — reads the meta, strips any leading `v`, compares normalized values. On mismatch, sets a `sessionStorage` guard flag and invokes `_doResetAppCache(true)` (silent mode). The flag prevents a reload loop: if the mismatch somehow persists across the heal (e.g. CDN returning stale files), the second detection in the same tab session just logs a warning and lets the app continue loading with whatever cache state exists — better than a reload loop that locks Dave out.
- `resetAppCache()` refactored into a private `_doResetAppCache(silent)` helper called by both the public entry (with confirm dialog + toasts + error alert) and the new handshake (no prompts, shorter delay, rethrows on failure so the caller can log). No behaviour change for the v2390 user-facing button.
- Call site: `_checkVersionHandshake()` fires at module load, as early as possible in app.js — before any initApp, before IndexedDB opens, before the service worker registers. This means: if drift is detected, the reload triggers before the old code's state gets rehydrated against a stale cache, so none of the broken interactions that drift normally causes ever happen in that tab.

### Scope
- Detection is one-way: version string equality. No version comparison (less-than / greater-than) — the heal path is the same whether the cache is ahead or behind of index.html. This keeps the handshake simple and robust.
- Leading `v` is stripped before comparison, so `v2391` (what's in APP_VERSION) and `2391` (what could appear in meta content) both match. Current build uses `v2391` on both sides but the normalization future-proofs against format drift.
- Does NOT add any new UI. The reset is silent — the only visible effect is a page reload, which iOS Safari and Chrome already indicate via their own loading indicators. Toast messages are suppressed because a visible toast right before `location.replace` is confusing (it flashes and vanishes).
- IndexedDB remains untouched (same as v2390). Surveys and photos survive every auto-heal.
- Does NOT modify the service worker. v2392 is the SW change.

### Related
- Phase 1 of 3: v2390 button (task #64). This ships Phase 2 (task #65). Phase 3: v2392 atomic SW install (not yet created — will be task #66 when started).
- Root cause of the 3-phase plan: today's iPhone vessel-name crash (#63). v2390 let Dave recover in one tap. v2391 means future drifts recover with no taps. v2392 will stop drift from ever happening by refusing to activate a SW that couldn't cache every critical file.

---

## v2390 — 2026-04-19
### Added
- **"Reset App Cache" button in the home-screen three-dot menu.** Self-heal for the drifted-service-worker-cache failure mode. Dave hit it today: on a cached iPhone Safari session the app crashed to the home screen every time he typed into the Vessel Name field on a new survey. Desktop Chrome worked fine, Safari Private Mode worked fine — which isolated the fault to the iPhone's service-worker cache holding a mixed-version set of files (likely a newer index.html alongside an older app.js, because the SW's install handler currently tolerates per-file `cache.add` failures and activates with partial caches). The fix required clearing Website Data via iOS Settings → Safari → Advanced — a multi-step ritual that also wipes IndexedDB and risks local-only survey data. One button in the app itself turns that into a single tap.

### Why this exists
- Cache drift has happened "several times" on Dave's field iPhone. Each recovery burned 10+ minutes and required walking away from whatever survey he was mid-stream. A dedicated Reset button removes the Settings-app dance AND keeps IndexedDB intact, so the surveyor's data never gets collateral-damaged by a cache fix. This is the field-survival fix.

### Design
- `resetAppCache()` (app.js, right after `forceAppUpdate` ~line 302) — single async function, nuclear by design. Confirms with a dialog that calls out what is and isn't affected ("surveys and photos are NOT affected"), then: unregisters every `serviceWorker` registration for the origin (so a stale SW can't re-populate caches from its fetch handler on first offline request), deletes every `CacheStorage` bucket returned by `caches.keys()` (current + stale from prior versions), and hard-reloads with a `?_reset=<timestamp>` query so the browser's own HTTP cache (a separate thing from CacheStorage) is bypassed when re-fetching index.html. IndexedDB is deliberately untouched — no call to `indexedDB.deleteDatabase` anywhere in the path.
- Menu entry added to the existing `homeOverflowMenu` in `renderHome` (app.js ~line 8384), immediately after "Force Update". Same button styling as its siblings; the label is rendered in `#dc2626` (red) to signal this is a bigger action than Force Update, with a `title` hover explaining surveys are preserved.

### Scope
- This is the first of three planned cache-reliability layers. v2391 will add an automatic version-handshake on app load (compares `APP_VERSION` in the parsed app.js to a version injected into index.html; mismatch auto-triggers `resetAppCache()` silently — no button press needed). v2392 will change the service-worker install from "tolerate per-file failures" to all-or-nothing (fail install if any critical file can't be cached, so a broken cache never activates in the first place). Shipping one per version per Dave's workflow discipline.
- Does NOT delete any IndexedDB object store, localStorage key, sessionStorage key, or cookie. Does NOT touch Drive. Does NOT sign Dave out of Firebase Auth (that state lives in IndexedDB).
- Does NOT modify the service worker itself. `sw.js` is unchanged in this version other than `CACHE_NAME` being bumped to `kiki-marine-v2390`. The atomic-install fix belongs to v2392.

### Related
- Diagnostic path for the iPhone crash that prompted this: task #63. Follow-up tasks for the 3-phase plan: #64 (this one), #65 (v2391 handshake), #66 (v2392 atomic install). #65 and #66 will be created when they're ready to start.

---

## v2389 — 2026-04-18
### Fixed
- **Subject-verb agreement in the "Head, faucet, sink and drain — Not tested" snippet.** Dave caught: "There is a grammar error in head faucet sink and drain. One of the sentences uses 'was' when it should say 'were'." The observed-phase snippet read "The head, faucet, sink and drain **was** not tested because the vessel was on shore and winterized at the time of survey." Compound subject with four members ("head, faucet, sink and drain") takes a plural verb — changed to **were**.

### Scope
- Only the one snippet at `text_library.json` ~line 17494 changed. Parallel patterns in other sections (e.g. "The head, toilet and seacock was not tested…" at line 17480, "The sink, faucet and drain was not tested…" at line 7173) share the same grammatical structure and are likely the same error — flagged for Dave's decision rather than swept together, because he asked specifically about the head faucet/sink/drain line.

---

## v2388 — 2026-04-18
### Added
- **Drive token stays alive across the hour boundary on desktop.** Dave: "it would be great if the 55 min token did not expire or at least lasted longer." Google's OAuth access tokens are capped at ~60 minutes server-side, so the previous 55-min safety margin cannot be extended upward — but the app no longer *has* to hit the margin. Two changes make the 55-min expiry effectively invisible on desktop: a 5-minute heartbeat that proactively refreshes the token once it crosses 50 minutes of age, and a new fallback in `autoSyncJSON` that attempts a silent refresh instead of bailing when an auto-sync lands past the 55-min mark.

### Why this exists
- Auto-sync previously gave up the moment the token crossed the 55-min safety margin (`3300000` ms), cleared the cached token, showed an expiry banner, and required Dave to hit "Sign In" to get back to work. Long survey sessions reliably hit this — Dave would work for an hour, save something, and discover silently-skipped Drive writes. With the proactive heartbeat, a desktop session that stays open and focused will refresh around minute 50 before any user operation ever hits the 55-min wall. With the auto-sync fallback, even a session that wasn't focused at minute 50 (laptop lid closed, background tab) recovers automatically on the next save.

### Design
- `_proactiveRefreshIfNeeded()` (app.js, after `ensureToken` ~line 24097) — fired by a 5-minute `setInterval`. Skips when `_useRedirect` is true (iOS PWA — the "silent" refresh there is a visible redirect, so triggering it mid-survey would be worse than letting the existing expiry banner stand), when no access token is cached (not signed in), or when `document.hidden` is true (background tab — don't burn a refresh on a tab the user isn't looking at). Fires only once token age exceeds `_PROACTIVE_REFRESH_AT` (50 min / `3000000` ms), giving a 10-minute window before the 55-min hard cutoff.
- `_safeRefresh()` (same block) — single-flight guard that does its own inline `prompt: 'none'` Firebase refresh rather than delegating to `ensureToken()`. This is deliberate: `ensureToken()` falls back to a full `signIn()` (which opens a consent popup) when the silent path fails, and a background heartbeat must never surprise Dave with an unsolicited consent popup mid-survey. `_safeRefresh()` throws instead so callers fall back to the existing expiry-banner behaviour. The browser popup window that `signInWithPopup` opens does briefly flash even in the `prompt: 'none'` case — it closes automatically on success — but that is acceptable background noise compared to the old "silently-dropped save, see you in an hour" behaviour.
- `autoSyncJSON` (app.js ~line 24496) — on desktop, when token age >= 55 min, calls `_safeRefresh()` and retries instead of bailing. On iOS the pre-v2388 bail behaviour is preserved intentionally to avoid a disruptive redirect mid-survey. Failures in the desktop silent refresh fall back to the banner and bail, matching the old behaviour.

### Where Drive backups actually live
- Top-level folder `"Kiki Marine Survey Backups"` in My Drive (name defined at app.js:23949, scoped to `drive.file`). One subfolder per vessel named after `survey.vesselName` — so "Riverdance", "Ahoy Vey", "Grace O'Malley", "Ex Ta Sea". Inside each vessel folder: a `<vessel>_autosync.json` file plus one image per photo with a deterministic filename (`<label>_<slug>.jpg` / `.png`). Deterministic names let the B-01 resume logic skip photos already uploaded when a previous backup was interrupted.

### Scope
- Desktop only for the proactive refresh path. iOS continues to use the existing manual re-auth flow via the banner button — documented here so future-me remembers why the heartbeat has an iOS early-return.
- Does not raise the 55-min safety margin in `ensureToken` itself (the margin is Google-side, not ours — raising it past ~60 min would mean uploading with an already-expired token and getting 401s). The refresh just happens earlier and silently.
- Does not change the Firebase scope (`drive.file`), the consent parameters, or the redirect-vs-popup detection.

### Known limitations
- The `signInWithPopup` call inside `_safeRefresh` is subject to the browser's popup blocker. Chrome generally allows popups from same-origin Firebase Auth flows once the user has previously granted one (which Dave has), but a pop-up initiated from `setInterval` or a throttled auto-sync timer has no "user gesture" link, so it can be intercepted in some browser configurations. When that happens `_safeRefresh` throws, the caller falls back to the pre-v2388 expiry-banner behaviour, and Dave's experience is no worse than before. If this turns out to be common in the field, the follow-up is to switch the refresh path from Firebase Auth's popup flow to Google Identity Services' TokenClient with a hidden iframe (which does not require a popup).

---

## v2387 — 2026-04-18
### Added
- **Light grammatical polish on snippet chip taps.** Dave: "i want to implement the grammatical corrections to make proper sentences out of snippets." Scope confirmed via clarifying questions: live trigger on every chip tap, light dedupe only (no rewriting), preserve exact tap order. The polish drops sentences that are strict prefixes of another sentence already in the note (so tapping "Impact and resonance testing was carried out across the hull." then "Impact and resonance testing was carried out across the hull and rudder(s)." leaves only the longer, more-specific sentence), collapses exact case-insensitive duplicates while keeping the FIRST occurrence, and tidies double spaces / space-before-punctuation. No capitalization, no rewriting — hand-typed text is never reformatted and polish only fires on the chip-tap insertion paths.

### Why this exists
- The append-on-tap workflow (added in v2162 so Dave can stack 2-3 cards into a richer multi-sentence observation) makes it easy to end up with a generic chip immediately followed by a more specific chip whose first half is identical. The result reads as a near-duplicate. Field-edit cleanup costs Dave time on every survey; the polish removes the redundancy automatically without touching the surveyor's authority over which chips get tapped or in what order.

### Design
- `polishSnippetProse(text)` (app.js, immediately after `_itemSnippetCtx` ~line 545) — splits the input into sentence units via `/([^.!?]+[.!?]+)(\s*)/g` (preserving any unpunctuated trailing fragment so half-typed input is never truncated), normalizes each sentence (lowercase, terminator stripped, whitespace collapsed) for comparison, then walks the array twice: drop any sentence whose normalized form is a strict prefix of another sentence's normalized form (regardless of position), and drop later exact duplicates (first stays, later copies dropped). Survivors are joined with single spaces and the same whitespace/punctuation cleanup the token expander uses runs at the end.
- Three call sites wired (each adds ONE line `textarea.value = polishSnippetProse(textarea.value);` immediately after the value assignment): `insertSnippetFromSheet` (the APPEND path — the primary beneficiary), `_kkRebuildFromSentencePicker` (the ticking-rebuild path that reconstructs from prefix + checked chips), and `insertSnippet` (the non-sheet single-shot REPLACE path — polish is a near-no-op there but keeps whitespace handling identical across paths).

### Scope
- Triggers ONLY on chip-tap and sentence-picker rebuild paths. The textarea oninput handler, the manual-prefix capture, and saveItem persistence are all untouched — anything Dave types by hand survives untouched.
- Comparison is whole-sentence; sentences containing unfilled placeholders ([insert count], [side], [insert reading range], etc.) compare just like any other sentence so the polish doesn't strip half-filled chips.
- Preserves tap order. When two sentences are exact duplicates the FIRST stays in place (never reordered to the back). When one sentence is a strict prefix of another, the longer sentence stays at its original position and the shorter is dropped wherever it sits.

### Non-goals (for v2387 specifically)
- No verb-agreement rewriting ("hull and rudder were tested" → "hull was tested" still requires the v2386 `scrubNakedRudderRefs` path; the polish does not touch grammar within a sentence).
- No sentence reordering or pronoun threading.
- No paraphrasing or shortening of sentences.
- Does not touch timing chips (`insertTimingChip`) which have their own mutex logic and are managed separately.

---

## v2386 — 2026-04-18
### Fixed
- **Power-boat rudders no longer appear in the hull resonance testing section or its snippets.** Dave reported: "No percussion and resonance testing is done on power boat rudders. They are usually bronze. If it is a power boat, then rudders have to be removed from the resonance testing section, including the snippets." This covers the checklist item label ("Hull and rudder(s) (if applicable) impact and resonance testing" → "Hull impact and resonance testing" on power boats), every snippet card body (each hardcoded "hull and rudder(s)" mention is stripped), and saved textarea content from pre-v2386 surveys gets scrubbed on reopen.

### Why rudders leak into this section on power boats
- The contextFromSurvey helper derives hasRudder from drive type: outdrive / IPS / saildrive → no rudder; shaft drive (or unknown) → assume rudder. Shaft-driven power boats have rudders, so hasRudder was returning true and the rudder-gating tokens / label transforms kept rudder verbiage. But the relevant distinction for *this specific item* isn't "does the vessel have a rudder" — it's "is the rudder percussion-testable". Power-boat rudders are typically bronze castings, not fibreglass laminates, so they're not subject to impact/resonance testing at all. The fix is to override hasRudder to false for this item specifically on power boats, independent of the real-world rudder count.

### Design
- `isPowerBoatRudderResonanceItem(survey, label)` (app.js ~line 512) — returns true when the survey's vesselType is 'power' AND the label matches "Hull and rudder..." plus "impact and resonance testing" or "percussion testing". Matches both the raw template form and the ITEM_SNIPPET_MAP resolved section form, plus legacy "percussion testing" phrasing in case any surveyed templates still use it.
- `_itemSnippetCtx(survey, itemLabel)` (app.js ~line 533) — drop-in replacement for the inline `contextFromSurvey(survey)` + fallback pattern that appears at every snippet-expansion site. When the helper above returns true, overrides `ctx.hasRudder = false, ctx.rudderCount = 0`. Downstream `expandSnippetTokens` then calls `scrubNakedRudderRefs` automatically (it already fires on hasRudder=false).
- `findTextVariants` post-process (app.js ~line 6666) — after vesselType filtering, if this is the power-boat hull-resonance item, clone each match and run `scrubNakedRudderRefs` on `match.text`. Using a clone so we never mutate the shared textLibrary cache.
- `displayItemLabel` override (app.js ~line 545) — when `isPowerBoatRudderResonanceItem` returns true, forces hasRudder=false in the ctx passed to `transformLabelForDisplay`, which drops " and rudder(s) (if applicable)" from the label. Also skips the subsequent `pluralizeRudder` call so we don't re-insert a rudder word into a label we just stripped.
- `scrubNakedRudderRefs` is now exposed on `window` from `src/core/snippet_tokens.js` so app.js can call it directly from `findTextVariants`.

### Fixed (regex bug in scrubNakedRudderRefs)
- **Orphaned "(s)" after inline rudder strip.** Found while testing the v2386 path: `scrubNakedRudderRefs` was stripping " and rudder" from "hull and rudder(s)" but leaving "(s)" behind on "hull", producing the ungrammatical "Impact and resonance testing was carried out across the hull(s)." Root cause: the inline-strip regex ended in `\b`, which prevented the optional `(?:\(s\))?` group from ever matching — `\b` requires a word/non-word transition, and `)` → `.` is non-word → non-word so `\b` failed. The regex engine backed off to the shorter match " and rudder", leaving "(s)" dangling. Fix: replaced `\b` with an explicit lookahead `(?=[\s.,;:!?)]|$)` so the `(s)` suffix is captured and stripped as part of the match. This also improves the outdrive/IPS/saildrive scrubbing path that was already live — those vessels now get clean "hull" sentences instead of "hull(s)" too.

### Scope
- Affects ONLY power-boat surveys. Sail-boat and human-powered surveys are unchanged — fibreglass sail-boat rudders are still impact-tested and still show rudder snippets normally.
- Affects ONLY the hull resonance testing item. Other hull-related items (hull conductivity testing, hull exterior above/below waterline, etc.) still respect the survey's actual rudder configuration.
- Updates six snippet-expansion call sites to pass itemLabel into the ctx derivation: initial textarea expansion on sheet open, sheet variant display, variant text for display, stored-token cleanup, insertSnippetFromSheet, and insertSnippet. Also skips pluralizeRudder on the resolved snippet in insertSnippetFromSheet to avoid re-inserting rudder words.

### Non-goals
- Doesn't change the text library itself — the snippets still read "hull and rudder(s)" in the source data. That's deliberate: sail boats must continue to see the full phrasing. Stripping happens at display time, keyed off vesselType.
- Doesn't affect the "Rudder(s) condition" item (a separate visual-inspection item), the hull and rudder conductivity testing section, or anywhere else a power-boat surveyor would still want to document the rudder. This change is surgical to percussion/resonance testing specifically.

---

## v2385 — 2026-04-18
### Fixed
- **Check Survey overlay no longer flashes the inspection view during re-render.** Dave reported: "In the survey quality check, when I check off an item, I am briefly routed to the survey page and then back to the survey quality check page." Root cause: the check-off handler (`_csToggleReviewed`, `_csSkipItem`, and the animate-resolve block) was calling `document.getElementById('checkSurveyOverlay').remove()` BEFORE calling `checkSurvey()` to re-render. For the duration of the async rebuild — which on iPhone PWA can span a handful of paint frames — the underlying inspection view was visible, causing the "route to survey then back" effect.

### How
- **Build-first-then-swap pattern in `checkSurvey()`** (~line 15213). The new overlay is created with a pending id (`checkSurveyOverlay_pending`) and appended to `document.body` while the old overlay is still attached. Both are `position:fixed;inset:0` with `z-index:9999`, so the later-in-DOM-order overlay paints on top — the swap is visually seamless. Only THEN is the old overlay removed, and the new one renamed to the canonical id. No frame of the inspection view is ever exposed.
- **Dropped preemptive `.remove()` calls** from the four call sites that immediately follow with `checkSurvey()`: both branches of `_csToggleReviewed` (~line 15317 / 15325), `_csSkipItem` (~line 15384), and the animate-resolve block (~line 15475). Also the engine-migration button onclick (~line 15038). All of these now let `checkSurvey()` handle the overlay transition atomically.

### Non-goals
- The Close button (top-right X) still removes the overlay synchronously — that's a user-initiated dismiss, not a re-render, so no swap is needed.
- The `_csRemoveOverlay` fade-out helper (used when navigating AWAY to fix a specific item) is unchanged — the fade is intentional there to signal leaving the QC view.

---

## v2384 — 2026-04-18
### Added
- **Timing chips on every B and C rated item.** Dave requested two quick-tap options to qualify when a recommended repair needs to happen: "This repair can wait until next season." and "Must do before launch." The chips render in an amber-tinted block — under the snippet cards in the bottom-sheet notes editor, and above the notes textarea in the inline item form. Only appear for B (Needs Attention) and C (Serviceable) ratings. Tapping appends the phrase to the notes; tapping the other chip swaps it (mutually exclusive). The emoji marker (⏳ wait / ⚠️ launch) makes the two options instantly distinguishable without reading.

### Why two fixed phrases instead of free text
- These sentences appear verbatim across Dave's reports dozens of times per survey. Hard-coding them as chips eliminates the typing tax and guarantees exact wording — so the grouping logic in Findings & Recommendations can one day key off them to sort "must do before launch" items above "can wait until next season" items automatically.

### Design
- `window.KK_TIMING_PHRASES` — single source of truth. Both the render and the strip-and-replace logic in `insertTimingChip` read from this object, so changing a phrase in one place updates everywhere (chips, strip regex, active-state detection).
- `window.insertTimingChip(itemLabel, kind, btnEl)` — strips both phrases out of the current notes first, then appends the chosen one. Makes the two chips mutually exclusive and idempotent (double-tap of the same chip is a no-op). Dispatches an `input` event so tone-check and chip-strip listeners refresh. Saves immediately on the inline path (no explicit save button there); bottom-sheet path relies on Save Notes.
- `window.renderTimingChipsHtml(itemLabel, itemData)` — returns the chip HTML, or empty string for non-B/C ratings. Active state (green highlight) is derived from `itemData.text.includes(phrase)` at render time.

### Scope
- New render call in the bottom-sheet overlay: between `${snippetsHtml}` and `${standardsHtml}` at ~line 4416.
- New render call in the inline `renderItemFormHtml`: between the snippet card section and the Notes textarea, at ~line 19128. A regex strips the shared helper's `.sheet-section-title` header since the inline form uses its own `.form-label` styling.

### Non-goals
- Does not change the snippet library itself — these are interaction chips, not snippets. They don't appear in `findTextVariants` output.
- Does not yet influence Findings & Recommendations ordering. Wiring these phrases into report grouping is a later ticket.

---

## v2383 — 2026-04-18
### Fixed
- **EMERGENCY — comparables still getting wiped despite v2377.** Dave reported this is the third+ time he's lost his comparables array. The v2377 guards (undefined-as-DOM-absent-sentinel, plus checks at the three known save sites) handle the "container not rendered" case but left a gap: any path where the container IS rendered but empty would still overwrite a non-empty saved value with `[]`. That happens whenever a debounced auto-save fires after Edit Intro has been torn down partially, or when a rendering race has the container present but not yet populated. Rather than keep hunting for the exact sequence (Dave is losing billable work each time), v2383 blocks the whole class of bug with two layers of defence.

### Added
- **`guardedAssignComparables(survey, newValue, caller)`** — single chokepoint that every `survey.comparables = X` now goes through. The rule: if the new value is empty AND the saved value has real content (at least one entry with vessel / price / source / notes) AND `skipComparables` is not true, the assignment is **refused**. A `console.warn` labelled `[v2383] REFUSED` logs the caller name — useful diagnostic if this ever fires in production. If the user genuinely wants to clear, they tick "Skip comparables" first, which flips the guard off.
- **Per-session sessionStorage backup.** Every successful assignment of non-empty comparables also writes a JSON copy to `sessionStorage['kkComparablesBackup:' + surveyId]`. Scoped per PWA instance, so tab-local. No cross-device concerns.
- **One-tap restore banner on Edit Intro.** If Dave opens a survey whose saved comparables is empty but a sessionStorage backup exists for that surveyId, a yellow banner appears above the Comparable Vessels section: "N comparable(s) from earlier this session — looks like they were cleared" with **Restore** and **Dismiss** buttons. Restore writes the backup back into `survey.comparables`, saves, and repopulates the DOM entries. Dismiss removes the backup. This is the last-resort safety net — if somehow a wipe still slips past the guard, the data is still recoverable in the same session.

### Scope
- Three direct `survey.comparables = ...` sites rewritten: `saveEditFormSilently` (~line 10102), `saveComparablesFromInspection` (~line 15900), `saveAllInspectionData` (~line 20712).
- `saveSurveyDetails` (~line 10020) was doing `Object.assign(survey, updates)` — added a special-case that runs `guardedAssignComparables` first and removes the `comparables` key from `updates` if the guard refused. Also lifts `skipComparables` out of `updates` before the guard runs so the guard sees the user's current intent.

### Non-goals
- Does not change comparables data model or the Edit Intro UI beyond the banner.
- Does not prevent a user who ticks "Skip comparables" from clearing — that's an explicit intent and should still work.
- Does not touch cloud-sync (Firebase) paths — pushes continue to send whatever is in the local survey record, which is now protected by the guard upstream.

---

## v2382 — 2026-04-18
### Changed
- **Date-integrity one-tap fix now shows a confirmation before generating.** v2381 silently promoted `survey.surveyDate` and opened the report — Dave reported the report came up but there was no indication the date had actually been updated. He'd have to navigate back to the intro page or scrutinise the report cover to know it worked. Now after the promotion and save, a `showAlert` dismisses with "✓ Survey date updated to YYYY-MM-DD. The report will reflect this date." — the user explicitly acknowledges before the report window opens.
- The message is single-line because `showAlert`'s `<p>` doesn't use `white-space:pre-wrap`, so embedded `\n` characters would collapse to whitespace and render nothing useful. Kept local to this call rather than mutating `showAlert`'s template (other callers may rely on its current behaviour).

### Why not a toast
- A toast would also solve the feedback gap, but Dave is often working on iPhone in bright daylight where a 3-second auto-dismissing banner could be missed. A modal with an OK button forces an acknowledgement before generation continues — slower by one tap, but zero chance of missing the confirmation.

---

## v2381 — 2026-04-18
### Added
- **Date-integrity modal now has a one-tap fix.** The existing warning (v2244) already catches photos captured after the survey/report date and offers "Generate Anyway" / "Go Back and Fix." That's fine when the surveyor genuinely wants to backdate the certification, but when the real issue is that the survey date wasn't updated after a late photo was added, fixing it meant leaving the modal, navigating back to the intro page, editing the date, and re-running the report. Now a third button — **"Use YYYY-MM-DD as survey date"** — promotes the latest photo's local calendar date to `survey.surveyDate`, saves, and continues generation in one tap.
- The button label shows the actual target date so Dave sees exactly what he's agreeing to before tapping (e.g. "Use 2026-04-18 as survey date").

### Changed
- `showConfirm` is still the default two-button modal. Added a sibling helper `showThreeOptionConfirm(message, primary, secondary, tertiary)` that stacks buttons vertically — three side-by-side buttons would either overflow a 320px phone width or squish the "Use 2026-04-18 as survey date" label into two lines. Resolves to `'primary' | 'secondary' | 'tertiary'` rather than a boolean so future three-option prompts can reuse it.

### Technical notes
- Latest-photo date is computed from the **local** calendar day (`getFullYear` / `getMonth` / `getDate`), not the UTC ISO string. A photo captured at 8pm EDT would land on the next UTC day; using UTC would jump the survey date a day forward of what the surveyor actually remembers.
- `reportDate` continues to default to today. Only `surveyDate` is promoted — matching the meaning "the day I was on the vessel" rather than "the day I wrote the report."
- Scope is a single block in `generateReport()` in `app.js` around line 20805, plus the new modal helper beside `showConfirm`. No data-model change; surveys without a `surveyDate` still follow the pre-v2244 path (the check is skipped when `_certifiedISO` is empty).

---

## v2380 — 2026-04-18
### Changed
- **Report: USE OF RATINGS — "C — Serviceable" definition rewritten.** Dave's call, same legal-hedging pass as v2379. Old text claimed the item "currently meets all applicable safety and performance standards" — an overclaim, since a visual non-destructive inspection can't establish standards compliance. New text:
  - *Definition:* "The item appeared to be in generally serviceable condition based on a visual, non-destructive inspection, with no material deficiency noted at the time of survey."
  - *Action:* "No corrective action was recommended."
- "Appeared to be in generally serviceable condition" matches the observational stance the rest of the report takes (it's an opinion on appearance, not a compliance certification). "Based on a visual, non-destructive inspection" makes the methodology explicit inside the rating definition itself. "No material deficiency noted at the time of survey" scopes the rating to observations on inspection day.
- Code scope: single `<li>` replacement in `generateReport()` in the USE OF RATINGS block (`app.js` around line 21521). Colour chip, A/B/NT/PO/Safety definitions, and all downstream rating logic (findings bucketing, table rendering, rating-priority constants) are unchanged. The inspection-page hover tooltip in `getRatingTooltip()` (app.js line 12341) is intentionally left short and informal; it's UI scaffolding, not the formal report definition.

---

## v2379 — 2026-04-18
### Changed
- **Report: Purpose and Scope preamble rewritten to SAMS-style language.** Dave's call — the original preamble ("This surveyor attended aboard the vessel to determine its physical condition and market value…") had three legal exposures the new language closes:
  - "Physical condition" → **"apparent physical condition"**. SAMS-standard hedge — the surveyor's opinion is on what was apparent, not on the true underlying state. Mirrors Norm Behring / Cali Quigley reference reports.
  - "In accordance with ABYC standards…" → **"Reference was made, where applicable, to… relevant ABYC standards, and applicable Transport Canada requirements as inspection guidelines."** The new phrasing makes clear the standards informed the inspection; it does not certify the vessel's compliance with them. Critical distinction in any ABYC-non-compliance dispute.
  - "Surveyor's unbiased opinion as of the inspection date" → **"surveyor's opinion only as to the visible and accessible condition of the vessel on the date of inspection."** Explicitly scopes the opinion to visible/accessible condition. "Unbiased" removed — the word invites the question rather than closing it, and SAMS-style reports don't rely on it.
- Also added: **"visually inspected on a non-destructive basis"** (defines methodology upfront), and **"superstructure"** and **"spars and rigging (if applicable)"** in the scope list so the preamble covers both sail and power vessels. The original only listed "rigging" which skewed sail; the new scope is neutral.
- Preserved verbatim: the second paragraph (bold disclaimer) about pre-standard boats. That paragraph is load-bearing — it protects the surveyor when a later party cites ABYC non-compliance against a vessel built before the code existed. Not touched.
- Code scope: single replacement in `generateReport()` around line 21264 in `app.js`. No data model change. Service worker cache bumped so the report body refreshes on Dave's devices next launch.

---

## v2378 — 2026-04-18
### Added
- **Auto-delete pixel-identical photos within the same survey section.** Dave's request: when the same photo ends up attached to a single item twice (rapid double-tap on the shutter, picking the same file from the library twice, re-running a batch import), the app should silently drop the duplicate instead of requiring him to find and delete it in Check Survey. This is now automatic.
- **Scope is intentionally narrow.** Dedup runs only within the same location on the survey — one item's `photos` array, one safety-equipment slot's `photos` array, one instrument/electronics slot's `photos` array. A photo legitimately attached to two different items (for example the same bilge pump photo on both "Bilge pump" and "Automatic bilge pump switch") is preserved. Cross-section duplicates continue to be surfaced by the Duplicate Photos warning in Check Survey (v2371) for the surveyor to resolve manually.
- **How duplicates are detected.** SHA-256 over each photo's `dataUrl`. Photos are identified as duplicates only when their bytes are byte-for-byte identical — no perceptual matching, zero false positives. Photos re-encoded between captures (even of the same subject) will have different hashes and will not be deduped.
- **When it runs.**
  - At the capture site, right after the new photo ID is pushed into the scope's `photos` array. The older photo wins — the newly-pushed duplicate is dropped and its IndexedDB photo record is deleted. Hooks are in place at every push site: `attachPhotosToItem` (multi-import), `movePhoto` (cross-item move), the single-photo capture flow, the area-photo (media) capture flow, the confirm-photo-preview path, the safety-equipment capture (both overlay and fallback paths), the instrument/electronics capture, and the batch camera commit (for both items and safety items).
  - One-time startup migration (`_v2378_photo_dedup_migrated` localStorage key) that walks every existing survey and dedupes all three photo scopes in place. Removed duplicates are deleted from IndexedDB; the survey is saved once if anything changed. Failures are logged and the sweep continues.
- **New helpers in `app.js`:** `dedupePhotosWithinArray(photoIds)` returns `{ kept, removed }` for a single photo-ID array (hashes each photo's dataUrl, keeps the first occurrence of each hash, deletes the duplicate photo records). `dedupeSurveyPhotosInPlace(survey)` walks a survey's items, safetyEquipment, and instrumentsElectronics, deduping each scope and returning the total removed count.
- **Tolerant of failure.** Every dedup call is wrapped in `try/catch`. If the Web Crypto API is unavailable, if a photo can't be loaded, or if a delete fails, the original array is kept — the app prefers to ship a duplicate rather than lose a photo. Per-scope and per-survey failures don't abort the broader walk.

---

## v2377 — 2026-04-18
### Fixed
- **EMERGENCY: destructive no-op save pattern wiping comparables and hull/boot-stripe/deck colours.** The root cause of the recurring data-loss incidents Dave experienced (4 comparables wiped earlier today, hull/boot-stripe/deck colours wiped again minutes later while he was trying to send a report): every save path that collected form data from the DOM returned a zero-value (`[]` for comparables, `''` for colours) whenever the collector ran on a view where the form fields weren't mounted. The guards `(arr.length > 0 || survey.arr.length > 0)` in `saveAllInspectionData()` and unconditional assignments in `saveEditFormSilently()` / `saveSurveyDetails()` then wrote that empty value over the saved data, silently wiping it. This could fire whenever the surveyor tapped ANY Save button from a view other than Edit Intro — the inspection page, Check Survey page, etc.
- **Fix strategy: sentinel values for DOM-absent state.**
  - `collectComparables()` now returns `undefined` (not `[]`) when the `#comparablesEntries` container isn't in the DOM. Legitimate empty (container present, zero entries) still returns `[]`.
  - `getColourValue(id)` now returns `undefined` (not `''`) when the colour `<select>` element isn't in the DOM. Legitimate empty (select present, nothing chosen) still returns `''`.
- **All write sites audited and guarded:**
  - `saveSurveyDetails` / `Object.assign(survey, updates)` — now strips `undefined` keys from `updates` before merging, so a missing colour dropdown never wipes the saved colour.
  - `saveEditFormSilently` — comparables, skipComparables, excludedIntroFields, and valuationSources writes are now each gated on the relevant DOM container being present.
  - `saveAllInspectionData` — comparables save path now checks for `undefined` before the legacy `.length > 0 ||` guard.
  - `saveComparablesFromInspection` — same treatment.
- **Safe call sites preserved.** `generateVesselDescription` (the DOM-driven Describe button) and `startNewSurvey` (fresh form) coerce `undefined` to `''` explicitly so downstream narrative and record-creation code that expects a string keeps working. `collectComparables` call in `valuationRationale` builder falls back to `[]` when undefined so the `.filter()` call doesn't throw.
- **No migration needed** — this is a code-path fix. Saved surveys are untouched; existing data is preserved going forward. Surveys that were wiped BEFORE this fix must be recovered from Google Drive backup history (same procedure used for the 4 lost comparables).
- **Why the old pattern existed.** The `(arr.length > 0 || survey.arr.length > 0)` guard was originally intended as "only touch the data when there's something to write OR something to clear" — but it read the old saved state after the new empty was already collected, creating a false positive whenever saved data existed. The sentinel-value approach is the correct shape: the collector itself reports whether the DOM was available, and every write site respects that signal.

---

## v2376 — 2026-04-18
### Changed
- **Findings & Recommendations: NT (Not Tested / Not Verified) table streamlined to two columns — Finding + Item.** Dave's follow-up to the v2373 C-table change: the NT section in F&R was still rendering a three-column table (Finding / Item / Reason), and the Reason column was carrying a truncated echo of the "not tested because…" prose that already lives in Detailed Survey Findings. Fix: keep the NT subsection (so the reader still gets the at-a-glance index of every not-tested item in one place) but drop the Reason column entirely. Table is now a tight two-column index — finding code and item label only — mirroring the v2373 C-table.
- Code change: replaced the NT table render block in `generateReport()` (app.js ~line 21786) with a two-column version. No data model change — `baseRating === 'NT'` items are still collected the same way and still rendered in Detailed Survey Findings with their full observation text. The PO (Powered Up Only) table retains its three-column layout for now; revisit if Dave asks for the same treatment.

---

## v2375 — 2026-04-18
### Changed
- **Safety equipment removed from Overall Description of Vessel.** Dave's feedback: the auto-injected sentence "Safety equipment per Transport Canada TP 511: X of Y required items verified on board. Missing: …" was appearing in the Overall Description of Vessel textarea on the Edit Intro page and in the report's Vessel Description paragraph. That information belongs in the dedicated TC TP 511 Safety Equipment section of the report, not in the narrative description. Fix: the narrative no longer includes any safety-equipment summary. Paragraph 4 of the auto-built description now opens directly with the overall-condition sentence ("At the time of the survey the vessel was in …").
- Code scope: three near-identical description builders (`generateVesselDescription` — the DOM-based Describe button, `regenerateDescriptionFromInspection` — the Regenerate flow, and `buildDescriptionFromSurvey` — the pure function used by the auto-regen hook on every save) all had the same `safetyDesc` block and the same `desc += '\n\n'; desc += safetyDesc || '[fallback]';` pattern. All three are now stripped. The `\n\n` paragraph break is kept so paragraph 4 still renders as its own block.
- **Legacy data migration.** Existing saved surveys whose `vesselDescription` already contained the auto-injected safety sentence (from earlier versions) are cleaned up in two places: a one-time startup migration (`_v2375_safety_sentence_stripped` localStorage key) walks every saved survey and rewrites the description in IndexedDB, and a just-in-time scrubber (`_stripLegacySafetyFromDescription`) is applied when the description is loaded into the Edit Intro textarea and when it's rendered into the report. Both paths use the same regex-based stripper so behaviour is consistent. The stripper handles both the TP 511 variant ("Safety equipment per Transport Canada TP 511: …") and the fallback variant ("Safety equipment included [N] fire extinguisher(s), …") and preserves any condition sentence that follows.
- Does not change: TC TP 511 Safety Equipment report section, Findings Overview safety row, the safety checklist on the inspection page, or the BUC grading / condition-sentence logic that still lives in paragraph 4.

---

## v2374 — 2026-04-18
### Changed
- **Report: no information entered = no blank space.** Dave's rule — the report should not render `N/A`, `$0 – $0`, "Not yet assessed", or other placeholder text for fields he hasn't filled in. Across the entire report, rows and sections now suppress themselves when the underlying data is empty rather than emitting a blank or placeholder row. Specifically:
  - **Valuation block** (the case that triggered this): Valuation Sources row is dropped when no sources are set (was rendering `N/A`). Fair Market Value row is dropped when both low and high are zero (was rendering `CAD $0 – $0 / USD $0 – $0`). The entire Statement of Valuation + Appraisal Methodology + Summary + Condition Adjustment + Valuation Worksheet + Comparables table block is suppressed when there's no valuation data at all (no sources, no FMV, no replacement cost, no concluded value). When at least one piece of valuation data is present, only the rows with content render — empty rows are skipped individually. The BUC Value Range and Exchange Rate rows in the Worksheet are similarly guarded.
  - **Overall Vessel Rating callout** (boxed "Overall Vessel Rating is: ..."): suppressed entirely when `survey.overallCondition` hasn't been chosen yet (was falling back to "Not yet assessed"). The intro sentence "As a result of the Survey… my opinion is:" is also suppressed in that case so the paragraph doesn't orphan.
  - **Summary paragraph** in Statement of Valuation: only renders when a vessel name is present (was emitting `"" — …` for nameless surveys). Inspection-date sentence inside that paragraph is conditional on `survey.surveyDate` being set.
  - **Safety Equipment summary row** in Findings Overview: dropped entirely when no TC TP 511 checklist has been assessed (was rendering "Not yet assessed" in grey).
  - **Cover page identity table** (`Vessel`, `HIN`, `Survey Conducted For`, `Date of Inspection`): each row individually guarded; empty rows no longer render.
  - **General Vessel Information table** (`Type of Survey Requested`, `Date of Survey Inspection`, `Vessel Name`, `Year / Make / Model`): same treatment. `Date of Report` and `Surveyor` always render since they're populated from surveyor identity / current date, never blank.
  - **Vessel Specifications — sail-only rows** (`Keel Type`, `Ballast`, `Max Draft`, `Total Sail Area`): additional guard added so the row only renders when the vessel is a sailboat **AND** the value is non-empty (was showing `N/A` for sail-type vessels where the surveyor hadn't filled the field yet).
  - **Vessel Documentation HIN row**: the HIN row renders when either the HIN number or the HIN plate photo is present; dropped when both are absent. (Previously rendered `N/A` when both were missing.)
  - **Under-the-hood helper**: the `_row(field, label, value)` helper used by every spec, conditions, and general-info table row (~20 call sites) now also auto-suppresses rows whose value stripped of HTML is empty, whitespace-only, or literally `'N/A'`. This means no call-site edits are needed for the majority of rows — the existing `esc(survey.x) || 'N/A'` pattern now behaves as "show this value, or hide the row entirely."
- Behavioural impact: the `_row` helper change is a single-line semantic shift that affects every table row it renders. It converts rows that previously emitted `N/A` into rows that don't render at all. Explicit fallback sentences (like Independent Surveys' "No independent surveys were conducted in conjunction with this inspection." and Changes to Original Plan's "None noted") are still shown — those are meaningful content, not the `N/A` placeholder.
- Does not change: rating definitions, BUC grading glossary, Findings & Recommendations section, Detailed Survey Findings, TC TP 511 Safety Equipment section, Surveyor's Certification — all still render regardless of which fields are blank, because those sections either carry static content or are always meaningful when the survey has any data.

---

## v2373 — 2026-04-18
### Changed
- **Findings & Recommendations: C (Serviceable) table streamlined to two columns — Finding + Item.** Dave's feedback on pages 54–56: the F&R C-table was a three-column block (Finding / Item / Notes), and the Notes column was carrying a truncated echo of the same prose that appears in the Detailed Survey Findings body. On a typical survey that meant ~46 rows of duplicated summary text sitting between the B findings and the NT section, padding the report and diluting the B findings by burying them in serviceable-item noise. Fix: keep the C subsection (so the reader still gets the at-a-glance index of every serviceable item in one place) but drop the Notes column entirely. The table is now a tight two-column index — finding code and item label only. Full per-item observations continue to live in Detailed Survey Findings where a reader who wants the narrative can find it.
- Considered and rejected: removing the C subsection from F&R entirely. Downside was losing the single-page overview of which items were serviceable, which is genuinely useful context for a buyer skimming the quick-reference section. The two-column compromise keeps that at-a-glance utility without the prose padding.
- Code change: replaced the old three-column C-table render block in `generateReport()` (app.js ~line 21738) with a two-column version. No data model change — `baseRating === 'C'` items are still collected the same way and still rendered in Detailed Survey Findings. NT and PO tables retain their three-column layout (finding / item / reason) because their brief reason text is actionable signal, not duplicated prose.

---

## v2372 — 2026-04-18
### Changed
- **Findings & Recommendations: trimmed the "full observations appear in the Detailed Survey Findings section" disclaimers.** Dave's feedback on pages 54–56: the F&R section was explicitly telling the reader that the full content lives elsewhere, which reads as an admission of duplication rather than as useful signposting. The reader has already read the Detailed Survey Findings body by the time they reach F&R — pointing them back to it is filler. Cut two sentences:
  - C-findings table intro: `"The following N items were found to be in serviceable condition. Full observations appear in the Detailed Survey Findings section."` → `"The following N items were found to be in serviceable condition."`
  - NT (Not Tested) table intro: `"The following N items could not be fully tested or verified. Full details appear in the Detailed Survey Findings section."` → `"The following N items could not be fully tested or verified."`
- Surgical text-only change. No structural changes to the report — C and NT tables still render the same way, just with tighter intro copy. v2373 (#46) will separately remove the C table entirely so the F&R summary focuses on A + B findings.

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
