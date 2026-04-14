# Development Process — the rules every change must follow

> This document is **the north star**. Before every change, re-read the
> relevant section. After every change, run the checklist at the bottom.

---

## Why this exists

Software gets worse every time a change slips past the checks. The checks
in this file prevent the three most common failure modes we've already hit:

1. **Regressions** — a fix that silently breaks an earlier fix.
   Solution: automated tests run before every commit.
2. **Version skew** — `APP_VERSION`, `CACHE_NAME`, and cache-busters
   getting out of sync (v2147 blank-page bug).
   Solution: `scripts/release.sh` bumps all three atomically; pre-commit
   hook verifies they match.
3. **Lost context** — changes made with no record of why.
   Solution: `CHANGELOG.md` entry required per version.

---

## The rules — follow these every session

### Rule 1 — Never edit `APP_VERSION`, `CACHE_NAME`, or index.html cache-busters by hand

Always use `scripts/release.sh`:

```bash
scripts/release.sh            # auto-bump to next version
scripts/release.sh v2160      # bump to a specific version
```

It edits all three in one atomic step and runs the tests. This is the
only way to avoid the v2147-style blank-page bug.

### Rule 2 — Run tests after every meaningful change

```bash
node tests/run_tests.js
```

Takes about 1 second. All tests must pass before you commit. The
pre-commit hook enforces this — you literally cannot commit with red tests.

### Rule 3 — When you fix a bug, add a test for it

Not always, but as the default. Any bug that got past code review deserves
a test that would have caught it. New test file pattern:

```js
// tests/new_behaviour.test.js
const { functionUnderTest } = require('../src/core/module');

describe('functionUnderTest', () => {
  it('handles the edge case we just hit', () => {
    assert.equal(functionUnderTest(input), expectedOutput);
  });
});
```

Run `node tests/run_tests.js` to confirm the new test passes.

### Rule 4 — When you change the report, update the SAMS rubric

`docs/sams_rubric.md` has a status icon for every SAMS criterion.
If your change addresses an item (📌 ❌ or 🟡), flip its status to ✅ and
reference the rubric ID in the CHANGELOG entry (e.g. "Fixes SAMS 3.11").

### Rule 5 — Every release gets a CHANGELOG entry

Add an entry to the top of `CHANGELOG.md`:

```markdown
## v2148 — 2026-04-14

### Added
- Independent Surveys field in Edit Intro — addresses SAMS 3.11.

### Changed
- "Sea trial" → "Limited trial run" in text library (15 snippets).
  Addresses SAMS 8.2.
```

The pre-commit hook will **block** the commit if the CHANGELOG has no
entry for the current `APP_VERSION`.

### Rule 6 — After every release, run manual regression checklist items 1 and 2

`docs/manual_regression.md` — the first two items are "Cold start" and
"Warm start". These are the 30-second tests that would have caught the
v2147 blank-page bug. Run them after every push on both MacBook and iPhone.

The full 30-step list should be run before any externally-submitted report.

### Rule 7 — Never remove or weaken an existing test

If a test fails because the behaviour intentionally changed, update the
test to encode the new expected behaviour. Don't delete it unless the
function itself no longer exists.

### Rule 8 — Respect the "never" list from memory

- Never suggest "Clear & Reset" in Chrome — wipes IndexedDB
- Never suggest "Clear Website Data" in iOS Safari — wipes IndexedDB
- Never amend commits by default — create new ones
- Never bypass the pre-commit hook with `--no-verify`

---

## First-time setup (do this once per clone)

```bash
cd kiki-survey-app
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit scripts/*.sh
```

This tells git to use the hooks in `.githooks/` instead of the
default `.git/hooks/` (which isn't checked into the repo).

Verify it's working:

```bash
# This should print "pre-commit"
git config core.hooksPath
```

---

## The standard change workflow

```bash
# 1. Make your changes — edit app.js, add a test, whatever.

# 2. Run tests to make sure you didn't break anything.
node tests/run_tests.js

# 3. Bump the version atomically.
scripts/release.sh

# 4. Add a CHANGELOG entry for the new version.
#    Edit CHANGELOG.md — add a new section at the top.

# 5. Commit.
#    The pre-commit hook runs tests and version checks automatically.
git add -A
git commit -m "v2148: <one-line summary>"

# 6. Push.
git push origin main

# 7. Test on iPhone AND MacBook Chrome (regression items 1-2).
#    If blank or broken, rollback: git revert HEAD && git push
```

---

## When the pre-commit hook blocks you

The hook prints the exact reason. Common ones:

**"Tests failed"** — Fix the test or the code. Don't `--no-verify`.

**"version mismatch"** — You edited one version by hand. Run
`scripts/release.sh` to re-align them.

**"CHANGELOG.md missing entry for vNNNN"** — Add a section for the
current version before retrying the commit.

---

## When to extract more code into `src/core/`

Extract when:

- A pure function (JSON in, JSON out) in app.js has complex logic that
  would benefit from tests.
- You're about to change that function's behaviour and want to protect
  existing users from regressions.
- The function is being reused in 3+ places and should be single-sourced.

Don't extract when:

- The function touches the DOM or IndexedDB (belongs in the data/UI layer).
- It's a one-line helper that would be silly to test.

After extracting:
1. Wrap the module in an IIFE, export API under `window.KikiXxxx`.
2. Add to `index.html` in the correct load order (core first, app.js last).
3. Add to `sw.js` URLS_TO_CACHE so it works offline.
4. Write tests in `tests/xxx.test.js`.
5. Follow rules 1, 2, 5, 6.

---

## Quick reference card

| Want to do | Command |
|------------|---------|
| Run tests | `node tests/run_tests.js` |
| Bump version | `scripts/release.sh` |
| Check versions consistent | `bash scripts/check_versions.sh` |
| See what the SAMS rubric wants next | `cat docs/sams_rubric.md` |
| See what to test before shipping | `cat docs/manual_regression.md` |
| See what changed recently | `cat CHANGELOG.md` |
| View what the pre-commit hook does | `cat .githooks/pre-commit` |
