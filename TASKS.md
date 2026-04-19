# Kiki Marine Survey — Task Backlog

Human-readable snapshot of the work queue. The canonical source of truth is
the session task tool; this file mirrors it so future sessions (and Dave)
can read the backlog without any tool access, and so the state survives
context-window summarization.

**Snapshot date:** 2026-04-19 (after v2401 push)

Regenerate this file when meaningful task state changes. Add a new
"Snapshot date" header; don't rewrite history inline.

---

## In flight

### #48 — Duplicate photo warning not clearing after one copy deleted
- **State:** investigation, root cause identified
- **Root cause (found 2026-04-19):** `_csCheckSingleIssue` in `app.js` at
  ~line 16828 switches on `issue.category` but has no branch for
  `'Duplicate Photos'`. When the surveyor deletes one copy and clicks
  Back, the switch falls through to the default `{ fixed: false, reason: msg }`
  path, so the "Not yet resolved" modal pops even though the duplicate
  is gone.
- **Fix plan:**
  1. Extract the duplicate-detection block at `app.js:15129–15186` into a
     helper `async function _scanDuplicatePhotos(survey)` returning
     `[{hash, refs: [{id, label, navId, isDoc, isSafety, isInstrument}]}]`
     for buckets with `length >= 2`.
  2. Refactor `checkSurvey()` to call the helper in place of the inline
     block.
  3. Make `_csCheckSingleIssue` async (only one caller — `_csEvaluateAndReturn`
     at `app.js:16798` — so this is a one-line await change).
  4. Add a `cat === 'Duplicate Photos'` branch:
     - Parse location labels out of `issue.message`
       (`/^Same photo appears in \d+ places?: (.+)$/`, split on ` • `).
     - Call `_scanDuplicatePhotos(survey)`.
     - Find the bucket whose location overlap with the original labels
       is maximal; if `overlap < 2`, return `{ fixed: true }`.
     - Else return `{ fixed: false, reason: ... }`.
- **Ships as:** v2403 (next version after this housekeeping push).

---

## Pending — Stability / Correctness (P0–P1)

These are behaviour bugs the surveyor can hit in the field. Fix order
should generally favour "field-reachable" over "polish".

### #63 — URGENT: iPhone Safari crash when tapping vessel name on new survey
- Reproduces on v2387 on real iPhone.
- Partially mitigated already by v2390 (manual Reset App Cache), v2391
  (auto-heal on version mismatch), v2392 (atomic SW install).
- Root cause still not conclusively identified. Worth attempting to
  reproduce in iOS Safari remote debugger next time Dave is on a Mac with
  the phone tethered.

### #38 — Preflight (Check Survey) polish set
- C-rated items with notes still flagged as missing notes.
- Skipped items reappear after being skipped.
- "Go" button doesn't land on the correct item.
- Back button missing on laptop layout.
- Scope is large; may split into sub-tasks when tackled.

### #74 — Forensics: why did Ex-Ta-Sea disappear (2026-04-19)
- Original incident unrecoverable: v2401 journal wasn't running at the
  time of loss.
- Any future recurrence is diagnosable via `kkJournal.suspicious()`.
- Task stays open as a "revisit if it happens again" reminder rather
  than an active investigation.

---

## Pending — Polish / Content (P2)

### Snippets & library
- **#3** — Text library expansion (668 → more). Priority hinge for
  InspectX Pro feature parity.
- **#10 (v2348)** — Twin-engine port/starboard snippets.
- **#11 (v2349)** — Cabin windows B-rating snippets.
- **#8 (v2352)** — Ground tackle detail snippets.
- **#16** — "As this was a visual observation only..." phrasing fix.

### UI / UX
- **#6 (v2350)** — Search bar hidden behind three-dots menu.
- **#7 (v2351)** — Recommended safety equipment section.
- **#40** — Remove Date Stamps: progress indicator during batch.
- **#29** — Two-way sync: engine info in survey ↔ boat info page.
- **#49** — Duplicate Photos warning: show thumbnails of the duplicate images.

### Platform
- **#61** — Duplicate cockpit instrument list to flybridge + pilot house.
- **#4** — Capacitor native wrap (planned). Also captured in memory.

---

## Recently shipped (reverse chronological, reference only)

Abbreviated — see `CHANGELOG.md` for full entries.

| Version | Task | Summary |
|---------|------|---------|
| v2401 | #77 | Survey write journal (forensics) |
| v2400 | #76 | pullPhotosForSurvey blob-type validation (3 guards) |
| v2399 | #75 | guardedSurveyUpdate chokepoint |
| v2398 | #72 | P0.1 audit — write-site inventory |
| v2397 | #71 | Report ends within last 20% of final page |
| v2396 | #70 | Reformat engine + transmission/gearbox section |
| v2395 | #69 | Remove blank page before Findings & Recommendations |
| v2394 | #68 | Full observation text in F&R (no ellipsis) |
| v2393 | #67 | Reset App Cache + menu uniformity |
| v2392 | #66 | Atomic SW install (cache-drift prevention) |
| v2391 | #65 | Startup version handshake + auto-heal |
| v2390 | #64 | Self-heal Reset App Cache button |
| v2389 | #62 | Grammar fix — subject/verb agreement |
| v2388 | #60 | Drive token proactive refresh |
| v2387 | #58 | Light polish on snippet chip taps |
| v2386 | #57 | Strip rudder from resonance testing on powerboats |
| v2385 | #56 | Fix QC overlay flash |
| v2384 | #55 | Timing chips on B/C snippet cards |

---

## Conventions

- Task numbers (#N) are stable; once assigned, they don't change.
- Version numbers are monotonic; no reuse even if a version is reverted.
- Every shipped task gets both a CHANGELOG entry and a row in "Recently
  shipped" above.
- Pending items with a version number were planned under that version
  but haven't shipped yet; that version slot is burned and the task will
  ship under a later number.
