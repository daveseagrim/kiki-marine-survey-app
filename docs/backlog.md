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
