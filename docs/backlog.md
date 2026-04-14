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

### B-03 — Firebase photo download fails with "Load failed" on iOS Safari PWA

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
