# Backlog — non-SAMS improvements

Ideas, bugs, and enhancements that are not SAMS-compliance items. SAMS
items live in `docs/sams_rubric.md`. Urgent bugs should just be fixed;
this file is for things that should be remembered but not done right now.

When adding an entry, include:
- **What** — the problem or feature
- **Why** — what triggered the observation (date, context)
- **Where** — code area or user flow affected
- **Priority** — rough estimate: high / medium / low

---

## Active

### B-11 — Drag-and-drop photos onto checklist items (MacBook)

- **What:** On MacBook Chrome, drag a photo file from Finder onto a
  checklist-item card and have it attach to that item.
- **Why:** Dave requested during Ahoy Vey report push 2026-04-14.
- **Where:** `setupChecklistDragDrop()` already exists in app.js
  (added in v2162) but is NOT called from `renderInspection`. To
  activate, add one line to `renderInspection` after the survey
  renders. Also needs a `.drag-target` CSS class in index.html for
  visual feedback during dragover.
- **Priority:** Medium. Dave has the Import Photos button as an
  alternative right now, so this is UX polish rather than blocking.
- **Fix sketch:** Add `setupChecklistDragDrop()` call to the start of
  `renderInspection` (after `currentSurveyId` is set). Add CSS:
  `.compact-item-wrapper.drag-target { outline: 2px dashed #006699;
  background: #e0f7fa; }`. Ship as v2163.

### B-10 — Category-level area photos (e.g. "Deck and coachroof area photos")

- **What:** Support photos that belong to a whole category rather than
  a specific item. SafetyCulture has these — Dave referenced the
  pattern during Ahoy Vey report push.
- **Why:** Some observations are area-level (e.g. "deck condition
  overview") rather than item-level (e.g. "pulpit"). A shared photo
  container per category avoids forcing every photo to be assigned to
  one specific item.
- **Where:** `survey_template.json` needs a new `type: 'area'` item
  per category, and `survey.items[areaKey]` needs a photos array.
  `buildCompactItemHTML` and the media sheet need an area-aware path.
- **Priority:** Medium. B-05 previously removed similar items; this
  would re-introduce them with the improved UX.

### B-09 — Auto-derive `hasRudder` from `driveType` for power vessels

- **What:** `{if-rudder:}` token expansion depends on `survey.hasRudder`.
  Today:
  - Sailboats → `hasRudder = true` (correct)
  - Power + shaft drive → `hasRudder = true` (correct)
  - Power + outdrive / IPS / saildrive → `hasRudder` defaults to true
    but should be **false** (the drive steers, no separate rudder)
  - Twin engines → `driveLineCount = 2` → `{count:rudder|rudders}`
    renders "rudders" (correct)
- **Why:** Dave asked 2026-04-14 during Ahoy Vey survey how the rudder
  autofill gets its data. Surfaced that outdrive/IPS vessels aren't
  getting `hasRudder = false` automatically, so hull-and-rudder snippets
  incorrectly include rudder wording on drives that have no rudder.
- **Where:** `saveSurveyDetails` in app.js — the block that already
  clears incompatible drive settings when vesselType changes. Extend
  it to set `hasRudder = false` when `driveType` is outdrive / ips /
  saildrive, and `hasRudder = true` otherwise (unless manually overridden).
- **Priority:** Medium. Produces wrong-vessel-type wording in reports.
- **Fix sketch:** Add to `saveSurveyDetails`:
  ```js
  if (survey.vesselType === 'power') {
    const noRudderDrives = ['outdrive', 'ips', 'saildrive'];
    if (noRudderDrives.includes(survey.driveType)) {
      survey.hasRudder = false;
      survey.driveLineCount = survey.driveLineCount || 1;
    } else {
      survey.hasRudder = true;
    }
  }
  ```
  Consider a manual-override checkbox in Edit Intro for edge cases
  (e.g. outdrive vessel with a separate rudder, rare but possible).

### B-08 — Cannot un-skip an item back to a rated state

- **What:** Once an item is marked Skipped (⊘), tapping the rating
  badge / using the rating sheet does not seem to re-rate it. The
  excluded flag may be sticky, blocking subsequent rating changes.
- **Why:** Dave noted 2026-04-14 mid-survey. Not blocking but irritating.
- **Where:** `selectRating` / `selectRatingFromSheet` in app.js. Likely
  the path that sets `itemData.rating` doesn't also clear
  `itemData.excluded`. Or the UI doesn't re-render after the rating
  change. Or the toggleExclude path is needed first.
- **Priority:** Low (Dave explicitly said not a priority).
- **Fix sketch:** When `selectRating` is called on an item with
  `excluded === true`, automatically clear the excluded flag and
  re-render. Add a confirmation toast: "Item un-skipped and rated X".

### B-07 — Percussion testing: rudder gating ✅ (v2153) + checkbox builder (remaining)

**Part 1 — Rudder gating: ✅ Done in v2153.** Tokenisation system
(`{if-rudder:...}` and `{count:rudder|rudders}`) added in
`src/core/snippet_tokens.js`. Checklist item labels rewrite based on
hasRudder/rudderCount. 12 hull-and-rudder snippets in text_library.json
tokenised. Percussion and conductivity items now show on all vessels
(previously hidden on non-rudder vessels).

**Part 2 — Checkbox sentence builder: still pending.** The existing
component builder pattern is dropdown-based. Extending it to support
multi-select checkboxes requires design work around the
`onComponentBuilderChange` / `renderComponentBuilder` functions in
app.js. When re-starting this:

- **What:** Two related requests for the "Hull and rudder(s) percussion
  testing" checklist item:
  1. **Suppress rudder mentions when the vessel has no rudder.** An
     outdrive or IPS vessel has no rudder; the snippet must say only
     "The hull was percussion tested…" and omit any rudder clause.
     When `survey.hasRudder === true`, include rudder(s) using the
     `{count:rudder|rudders}` pluralisation pattern already in the
     app (see memory `project_drive_line_plurals.md`).
  2. **Build sentences from checkboxes.** Dave wants to tick multiple
     checkboxes describing what was tested and what was found, and have
     those compose into a grammatically-correct sentence. This is the
     same idea as the existing "component builder" pattern
     (`onComponentBuilderChange` / `cb-customNotes` referenced in
     app.js) but applied to percussion testing.
- **Why:** Dave noted 2026-04-14 while surveying. Currently snippets
  with rudder references appear on vessels that have no rudder — a
  report-accuracy issue. And the checkbox builder would turn a long
  fuzzy-match snippet pick into a quick tick-tick-done composition.
- **Where:** `text_library.json` under Hull category for the snippet
  content. For the checkbox builder: audit how `onComponentBuilderChange`
  works today and extend the pattern to percussion testing specifically.
  Likely new `componentSchema` for percussion testing in app.js or a
  data file.
- **Priority:** High. Rudder mention on a no-rudder vessel is an
  embarrassing error in a paid report.
- **Fix sketch:**
  1. Add `{if-hasRudder:...}` and `{count:rudder|rudders}` tokenisation
     support in whatever render function emits these snippets.
  2. Rewrite percussion-testing snippets to use the tokens.
  3. Add a component-builder schema for percussion testing with
     checkboxes for: testing method (hammer, mallet, other), areas
     tested (hull sides, transom, keel, rudder if present), findings
     (no anomalies, suspicious tonal change at X, voids detected, etc.).
     Selecting boxes composes a sentence via the existing builder
     framework.
  4. Covers a subset of the broader B-06 work but is more urgent —
     percussion testing is done on every survey, rudder-mention errors
     are visible every time.

### B-06 — Hull/rudder below-waterline snippets: separate damage from antifouling, include rudders when present

- **What:** Two related issues with the hull-and-rudder below-waterline
  snippets:
  1. **Damage and antifouling are conflated.** A vessel can have a
     perfectly sound hull with antifouling in terrible condition (or
     vice versa). Current snippets treat them as one observation.
     Need separate observations (or at least separate clauses) so the
     reader sees hull-damage status and antifouling status independently.
  2. **"Hull and rudder" in the checklist item, but snippets only
     mention the hull.** When the vessel has rudder(s), snippets should
     describe rudder condition alongside hull condition. When the vessel
     has no rudder (outdrive, IPS), the rudder part must be omitted
     entirely — can't leave orphaned text referencing something that
     doesn't exist.
- **Why:** Dave noted 2026-04-14 while surveying. Accurate SAMS reports
  require distinct observations per distinct system.
- **Where:** `text_library.json` under the Hull category. Also
  `survey_template.json` — may need to audit item labels. The
  `{count:rudder|rudders}` pluralisation token pattern (see memory
  `project_drive_line_plurals.md`) may apply here too — snippets should
  be tokenised so a hasRudder=false survey renders hull-only text.
- **Priority:** High. This directly affects report accuracy for
  pre-purchase surveys, which is the primary revenue case.
- **Fix sketch:**
  1. Audit every hull-and-rudder-below-waterline snippet. Split into
     two clauses: `{hull observation}. {rudder observation (omit if
     no rudder)}. {antifouling observation}.`
  2. Use `{count:rudder|rudders}` and `{plural:if-multi}` tokens for
     rudder count.
  3. Use `{if-no-rudder:...}` to gate rudder sentences.
  4. Add snippets covering the common combinations:
     - Hull OK / Rudder OK / Antifouling OK
     - Hull OK / Rudder OK / Antifouling degraded
     - Hull blistering / Rudder OK / Antifouling OK
     - Hull OK / Rudder pitted / Antifouling OK
     - etc.
  5. Consider splitting this item into two checklist items: "Hull
     condition below waterline (antifouling + substrate)" and "Rudder
     condition below waterline" so the snippets are naturally
     independent.

### B-05 — ✅ Done in v2152

Removed "Hull exterior photos" and "Rudder photo(s)" media items from
`survey_template.json`. Correction on location: these were in the Hull
category checklist, not above Vessel Type as originally logged.
JSON validated; no orphaned code refs.

### B-04 — OCR the HIN photo to auto-populate the HIN number field

- **What:** When Dave captures the HIN plate photo, the app should read
  the number off the photo and pre-fill the HIN text field. Dave
  currently re-types the number manually after every capture — tedious
  and error-prone.
- **Why:** Dave flagged this 2026-04-14 while surveying. Quote: "I take
  a picture of the HIN number. Could the app read the picture and
  populate the HIN number text?"
- **Where:** HIN photo capture (Vessel Documentation section) + the
  `hinNumber` field. Hook the OCR into the camera capture flow so it
  runs immediately after the photo is saved.
- **Priority:** Medium. Not blocking, but it's a per-survey friction
  point that would save ~30 seconds every time.
- **Fix sketch:** Gemini API is already partially integrated in the app
  (search for `geminiApiKey`). Gemini's vision mode can take an image
  and return the text on it. Flow: photo saved → if Gemini key set,
  submit photo + prompt "Extract the Hull Identification Number from
  this photo. Return only the HIN, no explanation." → set the
  `hinNumber` field with the result → show a "Verify ✓" button for
  Dave to confirm before save. Fall back to manual entry if Gemini
  key isn't set or the call fails. Same pattern could later be applied
  to compliance-plate reading, engine-plate serial extraction, etc.

### B-03 — Firebase photo download on iOS PWA — STILL BROKEN (re-opened 2026-04-14)

**Reopened 2026-04-14 after confirming v2145's XHR fallback did not fix
it.** Dave on v2157, iPhone Safari PWA (home-screen icon), 540 photos
across Riverdance / Ex-Ta-Sea / Grace O'Malley. Tapping "Download from
Firebase" produces errors and runs for a very long time.

**What we know:**

- fetch() → Load failed (from v2145 diagnostics). Stage-tagged `[fetch]`.
- XHR fallback → also failing (else downloaded count would advance).
  Stage tag should be `[xhr]` with a specific message.
- 30s XHR timeout × 2 attempts × 540 photos = potential 9 hours worst
  case. That matches "very long time."
- Chrome on iPhone (regular tab) pulls the same photos successfully.
  Only iOS Safari PWA context is affected.

**Next diagnostic step before more speculative fixes:**

Ask Dave to reproduce and screenshot the progress-dialog detail log
during failure. The stage tags `[url]` / `[fetch]` / `[xhr]` /
`[blob-read]` added in v2145 pinpoint which step is breaking. The
specific error text after the stage tag tells us whether it's:
- Network error (transport-level failure)
- HTTP status (403 auth / 404 missing / 429 rate limit / 5xx backend)
- Timeout (reaching the 30s ceiling)
- Some other JS exception

Don't ship another blind fix. Get the diagnostic first.

**Possible root causes to investigate once we have stage tags:**

1. **iOS PWA fetch/XHR throttling.** PWAs on iOS have undocumented
   network quota limits. May be hitting them.
2. **Firebase Storage CORS for the PWA origin.** The GitHub Pages
   origin may not be on the allowed-origins list. Verify with
   `gsutil cors get gs://<bucket>`.
3. **Auth token expiry mid-batch.** Firebase Storage download URLs
   may have short-lived tokens; a 540-photo run could span multiple
   token lifetimes. Reauthenticate per-batch.
4. **iOS keep-alive / connection-pool exhaustion.** Rapid sequential
   requests to the same origin may trigger iOS-specific limits.
   Could help by introducing larger pauses between photos.
5. **Service worker fetch-event interference.** Despite the origin
   check that should bypass firebasestorage.googleapis.com — verify
   in Safari Dev Tools (Web Inspector) that the SW really is bypassing.
6. **Signed URL format.** Check whether getDownloadURL() on v10
   compat SDK returns URLs that iOS PWA can actually resolve.

**For now: user has a workaround.** Chrome on iPhone (regular tab, not
PWA) does download these successfully. Dave can use that as a disaster
recovery path until B-03 is properly fixed.

- **What:** On iPhone Safari opened from the home-screen icon (PWA mode),
  tapping Download from Firebase with 589 photos produces 0% progress and
  every photo fails with `Load failed`. Same code path works on Chrome
  for iPhone (regular tab, not PWA).
- **Why:** Observed 2026-04-14 on v2149. Screenshot showed stacking
  `x Riverdance — <photo_id>: Load failed` entries.
- **Where:** `_downloadOneFirebasePhoto` in `app.js`. `fetch()` to the
  Firebase Storage download URL is throwing TypeError ("Load failed" is
  Safari's wording).
- **Priority:** High. This is the disaster-recovery path when iOS purges
  IndexedDB. If it doesn't work in the PWA, Dave can't recover photos
  on his primary capture device.
- **Suspects:**
  1. **CORS / Storage bucket config** — the signed download URL may be
     served from a domain that doesn't have CORS open to the PWA origin.
     Test: `gsutil cors get gs://<bucket>` — check the allowed origins
     include the GitHub Pages URL.
  2. **Service worker interception** — the SW has an origin check to
     bypass cross-origin requests, but verify it's actually skipping
     firebasestorage.googleapis.com.
  3. **Storage auth** — `getDownloadURL()` may need a fresh Firebase Auth
     token that isn't valid in the PWA context.
  4. **Connection pool exhaustion** — unlikely with only 1 outstanding
     request at a time.
- **Diagnostic next step:** Open DevTools remote inspection (iPhone
  connected to Mac, Safari → Develop menu → iPhone → the PWA window)
  and watch the Network tab to see what URL is being requested and what
  error Safari reports. Also run in the PWA console:
  ```js
  fetch('https://firebasestorage.googleapis.com/').then(r => r.status).catch(e => e.message)
  ```
  If this throws the same "Load failed", it's CORS or connectivity.

### B-02 — Deleting a survey on desktop leaves it on mobile + orphans photos in Firebase

- **What:** Dave deleted a survey named "TEST" from Chrome on MacBook.
  It's still visible on iOS Safari. Also, the Firebase-pull banner still
  offers to download photos for it. Local delete doesn't propagate to
  Firebase (and therefore doesn't propagate to other devices that pull
  from Firebase).
- **Why:** Observed 2026-04-14. Multi-device sync expected behaviour:
  delete on any device should mark the survey (and its photos) as
  deleted in Firebase, and other devices should honour that on next sync.
- **Where:** `deleteSurveyConfirm` / `deleteSurvey` in `app.js`, and
  `FirebaseSync` module. Likely missing: a Firestore delete call when a
  local survey is deleted, and a corresponding Storage delete for photos.
- **Priority:** High. Orphaned surveys clutter the list and waste Firebase
  Storage quota. The download-photos prompt for a deleted survey is also
  misleading.
- **Fix sketch:** On delete, also call `FirebaseSync.deleteSurvey(id)`
  which (a) removes the survey doc from Firestore, (b) deletes each
  photo doc from the `photos` collection, (c) deletes each photo blob
  from Firebase Storage. Consider a soft-delete flag so cross-device
  sync is deterministic. Also: the photo-integrity scanner that produces
  the yellow banner should skip surveys not present locally.

### B-01 — Drive backup restarts from photo 1 instead of resuming

- **What:** When the Drive backup is interrupted (Cancel, tab closed, network
  drop) and then restarted, it re-uploads every photo from the beginning,
  not from where it left off. For a 202-photo survey, if the first attempt
  got to photo 150, the second attempt re-uploads 1–150 again before
  reaching 151.
- **Why:** Dave noticed this during a Riverdance backup (202 photos) on
  2026-04-14. Backup had been running but restarting each time he tried.
  Screenshot attached to conversation.
- **Where:** `DriveBackup.backupSurvey` in `app.js`. Currently iterates all
  `photoIds` without checking which are already uploaded to Drive.
- **Priority:** High. With 200+ photo surveys, a failed backup currently
  means wasted bandwidth and a long wait every retry.
- **Fix sketch:** Before uploading each photo, check if a file with the
  same name already exists in the vessel's Drive folder (via a `list`
  query). Skip if present. Alternative: keep a local per-survey manifest
  of which photos have been successfully uploaded, and skip those on
  resume.

---

## How to use this file

- Add new entries at the top of "Active" with the next B-NN id.
- Move completed entries to a "Done" section below (or just remove them
  after referencing the fix version in CHANGELOG).
- If an item turns out to be a SAMS requirement, move it into
  `docs/sams_rubric.md` instead.
