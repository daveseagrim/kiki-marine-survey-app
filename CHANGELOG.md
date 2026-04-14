# Changelog

All notable changes to the Kiki Marine Survey PWA are documented here.

Each entry is grouped under a version number. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Version numbers match
`APP_VERSION` in `app.js` and `CACHE_NAME` in `sw.js`.

When making any user-visible change, add an entry here **before** pushing
the commit. This gives future-you a searchable history of decisions, and
lets you roll back to a specific version with confidence.

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
