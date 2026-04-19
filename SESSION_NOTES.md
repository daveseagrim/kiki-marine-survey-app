# Kiki Marine Survey — Session Notes

Short, living "what's happening right now" doc. Updated at the end of
every push so the next session can re-enter context in one file-read
instead of re-deriving from summaries.

Keep this doc terse. Full explanations belong in `CHANGELOG.md`; full
backlog belongs in `TASKS.md`; this file is just the thread we're
currently pulling on.

---

## Current thread — 2026-04-19 (post v2402)

### Last shipped
**v2402 — Tooling: session-context persistence (TASKS.md, SESSION_NOTES.md,
WORKING_AGREEMENTS.md)**. Non-app change; cache version bumped so iPhone
PWAs pick up the new manifest and Dave can verify the update banner works.

### What's next
**#48 — Duplicate photo warning not clearing after one copy deleted.**
Investigation complete, fix designed, ready to implement as v2403.

Plan for v2403:
1. Extract `app.js:15129–15186` (duplicate detection inside `checkSurvey`)
   into `async function _scanDuplicatePhotos(survey)` returning buckets
   `[{hash, refs: [{id, label, navId, isDoc, isSafety, isInstrument}]}]`
   where `refs.length >= 2`.
2. Replace the inline block in `checkSurvey` with a call to the helper.
3. Change `_csCheckSingleIssue(issue, data, survey)` at `app.js:16828`
   to `async`. Update the single caller at `app.js:16798` to `await` it.
4. Add a `cat === 'Duplicate Photos'` branch:
   - Parse issue.message: `/^Same photo appears in \d+ places?: (.+)$/`
     → split locations on ` • `.
   - `const buckets = await _scanDuplicatePhotos(survey)`.
   - For each bucket, compute overlap count between `bucket.refs.map(r=>r.label)`
     and the parsed originals.
   - If max overlap `< 2`, return `{ fixed: true }`. Else return
     `{ fixed: false, reason: 'Duplicate photo still exists in N of the
     original locations. Delete at least one more copy.' }`.

### Open questions / things to watch
- Helper extraction is mostly cut-and-paste but **must not silently
  change behaviour**. Triple-check pass needs to compare the
  pre-extraction `checkSurvey` flow against the post-extraction flow
  line-by-line before the push block.
- `_csCheckSingleIssue` becoming async is low-risk (one caller already
  in an `async function`), but verify no other callers get added by a
  stale grep by re-running the grep immediately before the edit.

### Longer-term plan (not v2403)
Once #48 ships:
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
