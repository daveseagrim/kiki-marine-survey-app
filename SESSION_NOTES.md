# Kiki Marine Survey — Session Notes

Short, living "what's happening right now" doc. Updated at the end of
every push so the next session can re-enter context in one file-read
instead of re-deriving from summaries.

Keep this doc terse. Full explanations belong in `CHANGELOG.md`; full
backlog belongs in `TASKS.md`; this file is just the thread we're
currently pulling on.

---

## Current thread — 2026-04-19 (post v2403)

### Last shipped
**v2403 — Photo-capture hang hardening.** Added `try/catch` in async
`FileReader.onload` bodies and `reader.onerror` handlers at six capture
sites: `capturePhoto`, `handleAreaPhotoCapture`, `rapidCaptureInstruments`,
`addInstrumentByPhoto`, `captureDocPhoto`, safety-equipment handler. A
corrupt HEIC or transient iOS memory error no longer wedges the "Saving
X photos…" loop — a warning toast fires and the loop moves on.

### What's next
**v2404 — Save-path completion flush.** Companion to v2403. Close the
stale-save gap in the two save entry points plus the iOS tab-suspend
gap.

Plan for v2404:
1. In `saveEverywhere()` at `app.js:3022` — if `currentView === 'inspection'`,
   `await saveAllInspectionData()` before `await getSurvey(currentSurveyId)`.
   The current code (lines 3030–3033) fetches the survey from IDB without
   first flushing DOM textareas/inputs → stale write.
2. Same fix in `saveSurveyWithProgress()` at `app.js:3270` — flush before
   the `await getSurvey(...)` at line 3276 (or at least before the else
   branch's `saveSurvey(survey)` at line 3301).
3. Add a `pagehide` / `visibilitychange` listener at app init that calls
   `saveAllInspectionData()` synchronously-enough to land before iOS
   suspends the tab. (Use `keepalive` fetch or just fire-and-forget IDB
   writes — they survive tab suspension reliably.)
4. Triple-check: verify `saveAllInspectionData()` is safe to call when
   not in inspection view (it should early-return on no `currentSurveyId`
   — confirm before shipping).

### Open questions / things to watch
- `saveAllInspectionData()` runs `guardedAssignComparables` and a few
  other flush paths. Confirm it is idempotent and cheap — worst case
  is it's called twice on a Save tap.
- `pagehide` semantics differ between iOS Safari standalone vs in-tab.
  Test both paths before declaring the iOS suspend gap closed.

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
