# Kiki Marine Survey — Session Notes

Short, living "what's happening right now" doc. Updated at the end of
every push so the next session can re-enter context in one file-read
instead of re-deriving from summaries.

Keep this doc terse. Full explanations belong in `CHANGELOG.md`; full
backlog belongs in `TASKS.md`; this file is just the thread we're
currently pulling on.

---

## Current thread — 2026-05-04 (post v2528)

### Last shipped
**v2528 — Speaker and companionway section cleanup.** Outdoor/flybridge speaker
data now rolls into `Stereo and speakers` under gauges/instrumentation.
Companionway moved into Cabin and conveniences, with cabin-side companionway
snippets available.

### What's next
Watch v1 field-save behaviour around Windlass and other notes-only items.
Also watch the Aft deck lighting migration on any older pre-purchase survey
that already has notes/photos under the old label.

### Open questions / things to watch
- The visible Cancel button on the notes sheet still means discard un-saved
  edits in that sheet unless another save path is tapped first.

### Deferred (pre-field-survey priority shift)
- **#48** — Duplicate photo warning not clearing. Root cause identified,
  fix designed; resumes after tomorrow's field survey (2026-04-20).
  See TASKS.md for the intended v2405 plan.

### Longer-term plan
- #49 (thumbnail the duplicate photos in the Check Survey warning).
- Then evaluate whether to extract Check Survey (~2k lines) into
  `src/core/check_survey.js` as a follow-up refactor. Would cut future
  investigation time in that subsystem. Flagged but not scheduled.

### Recently resolved in this session
- Ex-Ta-Sea photo recovery: 158 of 158 photos re-imported, 1 JSON orphan
  deleted via cursor. v2400 prevents recurrence.
- v2399/v2400/v2401 trio shipped: write-destruction guard + photo-fetch
  validation + forensic write journal.
- Speed/quality doctrine captured in `WORKING_AGREEMENTS.md` (this push).

---

## Update protocol

When you ship a version:

1. Replace the "Last shipped" line with the new version + one-line summary.
2. Move the "What's next" block to match whatever you're actively doing.
3. Archive anything older than "last two pushes" — this is not a history
   log; `CHANGELOG.md` is the history log.
4. Keep the "Open questions" list current. Clear items once resolved.

If a session ends mid-investigation, leave a "**Paused on:**" line
describing exactly the last thing done and the next concrete step
(file:line and the specific edit planned). That's the seed the next
session reads first.
