// Tests for src/core/placeholders.js
const {
  findPlaceholders,
  countPlaceholders,
  hasPlaceholders,
  highlightPlaceholdersHtml
} = require('../src/core/placeholders');

describe('findPlaceholders', () => {
  it('returns empty array for null or empty input', () => {
    assert.deepEqual(findPlaceholders(null), []);
    assert.deepEqual(findPlaceholders(''), []);
    assert.deepEqual(findPlaceholders(undefined), []);
  });
  it('finds a single placeholder', () => {
    assert.deepEqual(findPlaceholders('The hull is [COLOUR].'), ['[COLOUR]']);
  });
  it('finds multiple placeholders in one string', () => {
    const p = findPlaceholders('Hull [COLOUR] with [COLOUR] stripe and [NUMBER] cabins');
    assert.equal(p.length, 3);
  });
  it('handles slash-separated alternatives like [PORT/STARBOARD]', () => {
    assert.deepEqual(findPlaceholders('[PORT/STARBOARD/AFT]'), ['[PORT/STARBOARD/AFT]']);
  });
  it('handles quotes and digits like [X\'X"]', () => {
    assert.deepEqual(findPlaceholders('a beam of [XX\'XX"]'), ['[XX\'XX"]']);
  });
  it('does NOT match lowercase bracketed text (not a placeholder)', () => {
    assert.arrayLength(findPlaceholders('this is [not a placeholder]'), 0);
  });
  it('does NOT match brackets that start with a number', () => {
    // Our pattern requires first char to be uppercase A-Z
    assert.arrayLength(findPlaceholders('[1-5 feet]'), 0);
  });
});

describe('countPlaceholders', () => {
  it('returns 0 for text with no placeholders', () => {
    assert.equal(countPlaceholders('Clean text no brackets'), 0);
  });
  it('returns count for multiple placeholders', () => {
    assert.equal(countPlaceholders('[A] and [B] and [C]'), 3);
  });
});

describe('hasPlaceholders', () => {
  it('returns true when placeholders exist', () => {
    assert.truthy(hasPlaceholders('This has [COLOUR]'));
  });
  it('returns false when none exist', () => {
    assert.falsy(hasPlaceholders('No brackets here'));
  });
});

describe('highlightPlaceholdersHtml', () => {
  it('wraps placeholders in a span with yellow background', () => {
    const out = highlightPlaceholdersHtml('The hull is [COLOUR].');
    assert.contains(out, 'background:#fef3c7');
    assert.contains(out, '[COLOUR]');
  });
  it('does not modify text without placeholders', () => {
    const out = highlightPlaceholdersHtml('Plain text');
    assert.equal(out, 'Plain text');
  });
  it('returns empty string for null input', () => {
    assert.equal(highlightPlaceholdersHtml(null), '');
    assert.equal(highlightPlaceholdersHtml(''), '');
  });
  it('wraps multiple placeholders independently', () => {
    const out = highlightPlaceholdersHtml('[A] and [B]');
    // Should have two span openings
    const spanCount = (out.match(/<span/g) || []).length;
    assert.equal(spanCount, 2);
  });
});
