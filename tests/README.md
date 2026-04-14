# Tests — How to run and how to add new tests

## What this is, in plain English

When Claude or you fix a bug, you want to make sure that bug stays fixed. Not
just today, but a year from now when someone (probably you) edits code near
the fix and accidentally breaks it again. Tests are how you guarantee that.

Every test in this folder describes a rule: "given this input, the code must
produce this output." If someone changes the code so the rule is violated,
the test fails loudly, and you catch the regression before shipping.

## Running the tests

In Terminal, from the `kiki-survey-app` folder:

```bash
node tests/run_tests.js
```

Takes about a second. Green ✓ means pass, red ✗ means fail. At the end
you get a summary. If anything fails, don't ship that change until it's
fixed or the test is updated.

## When to add a new test

Add a test whenever:

1. **A bug was just fixed.** Write a test that would have caught it.
   Example: "skipped items no longer count as unrated" → a test that gives
   the Check function a skipped item and expects zero "unrated" warnings.
2. **A tricky function is being added.** If the logic is non-obvious
   (e.g. fuzzy matching, text generation, rating sorting), write tests.
3. **You're about to refactor something scary.** Write tests for the
   current behaviour first, then refactor. If the tests still pass,
   the behaviour didn't change.

Don't bother writing tests for trivial stuff (one-line getters, pure UI
rendering). The ROI comes from testing the complicated pure logic.

## How to add a new test

1. Find or create the right `*.test.js` file in this folder. Group tests
   by which module they exercise (e.g. `ratings.test.js` tests
   `src/core/ratings.js`).
2. Use the existing pattern:

```js
const { someFunction } = require('../src/core/some_module');

describe('someFunction', () => {
  it('does the thing when given this input', () => {
    assert.equal(someFunction('input'), 'expected output');
  });
});
```

3. Run `node tests/run_tests.js` and make sure it passes.

## Assertion helpers available

- `assert.equal(actual, expected)` — strict ===
- `assert.deepEqual(actual, expected)` — JSON-equal (for arrays/objects)
- `assert.truthy(value)` / `assert.falsy(value)`
- `assert.contains(string, substring)` / `assert.notContains(...)`
- `assert.arrayLength(arr, expected)`
- `assert.throws(fn)` — passes if the function threw an error
