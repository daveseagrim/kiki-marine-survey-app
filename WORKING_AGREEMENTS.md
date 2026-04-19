# Working Agreements — Dave × Claude, Kiki Marine Survey

These are the rules of engagement. Safeguards that prevent flabby code
and shortcuts are non-negotiable. Speed practices reduce friction
without sacrificing any safeguard. Written down so both sides can point
at the same text instead of relitigating.

**Last revised:** 2026-04-19 (v2402).

---

## Non-negotiable safeguards

### 1. Triple-check every change before the push block

Three passes, in order, on every code edit before the copy-paste push
command is handed over:

1. **Mechanical validation.** Re-read the edited region. Verify the
   diff makes syntactic sense (brackets balanced, semicolons where
   needed, no stray characters, indentation preserved).
2. **Re-read-in-context.** Read the surrounding ~40 lines and verify
   the edit fits the control flow, variable scopes, and naming of the
   code around it. Catches "looked right on its own, wrong in context".
3. **Trace execution path.** Walk the code mentally from the nearest
   entry point into and through the changed region. Ask: what inputs
   reach here, what side-effects leave here, what other call sites
   depend on the invariants this region maintains.

If any pass surfaces a concern, fix it and restart the triple-check. No
partial passes; no skipping even for "trivial" changes.

### 2. One feature per version

Each push ships exactly one logical change. Bundle-saves (two fixes in
one version) are banned — they fog the CHANGELOG, make reverts messy,
and make `git bisect` useless.

A "logical change" can touch multiple files (app.js + sw.js + index.html
+ CHANGELOG.md is the normal atomic unit for a version bump), but all
those touches must serve one feature.

### 3. Atomic version bumps

Every user-visible change bumps:
- `APP_VERSION` in `app.js:8`
- `CACHE_NAME` in `sw.js:1` (format: `'kiki-marine-vNNNN'`)
- Meta `app-version` in `index.html:9`
- All seven cache-busters in `index.html:706–712` (`?v=NNNN`)
- A new `CHANGELOG.md` entry under the new version heading

Missing any of these produces cache-drift — the bug class that caused
the iPhone Safari crashes mitigated by v2390/2391/2392. Always verify
the full set before the push block.

### 4. Hand Dave the push command — don't run it

Dave runs all `git add` / `git commit` / `git push` commands himself in
his terminal. Claude presents a copy-paste block; Dave executes it.
This keeps the human in the loop for every deployment to the live PWA.

### 5. Canadian English

Canadian spellings throughout the app and documentation: "fibreglass",
"colour", "centre", "analyse", "organise", "defence", "licence" (noun)
/ "license" (verb), etc.

**Exception:** "labeled" stays as one L. Captured in memory, codified
here so it survives memory resets.

### 6. Post-push workflow

After handing Dave the push command:

1. Wait for Dave to confirm the push is done ("done" / "ok next" /
   similar).
2. Provide testing instructions (what to tap, what to verify in what
   view, what console output to expect).
3. Show the remaining task list so Dave can pick the next thing.
4. Don't preemptively move on mid-push.

### 7. No auto-asking between tasks

Once Dave has set the queue, work through it without asking "ready for
the next one?" between items. He'll redirect if he wants to stop.

### 8. Memory hygiene

User-role, feedback, project, and reference memory types are defined in
Claude's system context. Save the moments that matter (non-obvious
preferences, "don't do X because Y", project-state-that-doesn't-live-in-the-code).
Don't save derivable things (file paths, code patterns, git history).

---

## Speed practices that preserve all safeguards

These reduce conversation time without compromising QC. When it's
tempting to skip one of these to go faster, that's a smell — the right
move is a better-scoped read or grep, never a weaker triple-check.

### A. Narrow reads

Prefer `Read(file, offset=N, limit=M)` over `Read(file)` whenever the
target region is known. `Grep` first to find the line number, then
Read a focused window. Full-file reads are reserved for small files
(<300 lines) or when the initial structure of a file is genuinely
unknown.

### B. Grep before Read

For symbol location, `Grep` is faster than reading and scanning. Use
`output_mode: "content"` with `-n` to get line numbers directly.

### C. Batch independent tool calls

Multiple Read/Grep calls that don't depend on each other's output go in
a single message (multiple tool uses at once). Serial chains only when
one result determines the next.

### D. Don't re-read just-edited files

The Edit tool errors out if a file hasn't been read in this turn, so
the harness already guards against stale edits. Don't waste a Read
turn re-verifying an edit that Edit accepted — Edit would have failed
loudly if the old_string didn't match.

### E. Extract subsystems when they're under investigation

When a subsystem (Check Survey, photos, report generation, etc.) needs
more than a narrow touch-up — say, a third fix in a week, or a design
change — the right move is to extract it into its own file under
`src/core/`. This is not a shortcut; it's a structural speedup that
reduces future read surface by an order of magnitude.

Gated by: the triple-check still applies to the extraction. No
behavioural change in the extraction commit (pure code move). Any
behaviour change ships as a separate follow-up version.

### F. Persist thread state in `SESSION_NOTES.md`

At the end of every push, `SESSION_NOTES.md` captures what we're on,
what's next, and any open question. The next session reads one file
and is in context. This eliminates the "summary lost my place"
failure mode.

### G. Use `TASKS.md` as the backlog view

The session task tool is the source of truth, but `TASKS.md` is the
human-readable view that survives any context. When backlog state
meaningfully shifts (task added, task completed, task sub-divided),
update `TASKS.md` as part of that push.

### H. Don't bloviate

Short messages. Skip preamble. State the finding, state the plan,
move. Exception: post-mortems on incidents or architecture decisions
that need full written reasoning — those go long on purpose.

---

## What to push back on

These aren't in the safeguards list above, but they're things worth
saying "wait" to:

- Requests to combine two features into one version. ("Ship the journal
  and the iPhone crash fix together.") → Explain why bundling hurts
  later debugging, ship them separately.
- Requests to skip the triple-check because "the change is obvious." →
  The triple-check costs <30 seconds and catches things the writer
  can't see. Obvious changes are where confirmation bias is worst.
- Requests for me to run the push command "just this once." → The
  handoff is a safety protocol, not a style preference.
- Changes that spread a single concern across many files for
  "flexibility" without a concrete near-term need. → YAGNI.

On everything else, default to getting the change in front of Dave
fast.
