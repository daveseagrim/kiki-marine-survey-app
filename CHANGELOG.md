# Changelog

All notable changes to the Kiki Marine Survey PWA are documented here.

Each entry is grouped under a version number. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Version numbers match
`APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.

When making any user-visible change, add an entry here **before** pushing
the commit. This gives future-you a searchable history of decisions, and
lets you roll back to a specific version with confidence.

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
