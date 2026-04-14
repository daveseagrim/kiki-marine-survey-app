// Tests for src/core/ratings.js
const {
  getRatingShortLabel,
  getRatingColor,
  getRatingPriority,
  getRatingBaseCode
} = require('../src/core/ratings');

describe('getRatingShortLabel', () => {
  it('returns "A" for "A - Critical"', () => {
    assert.equal(getRatingShortLabel('A - Critical'), 'A');
  });
  it('returns "B" for "B - Needs Attention"', () => {
    assert.equal(getRatingShortLabel('B - Needs Attention'), 'B');
  });
  it('returns "C" for "C - Serviceable"', () => {
    assert.equal(getRatingShortLabel('C - Serviceable'), 'C');
  });
  it('returns "NA" for "Not applicable"', () => {
    assert.equal(getRatingShortLabel('Not applicable'), 'NA');
  });
  it('returns "Not Tested" for "Not tested/not verified"', () => {
    assert.equal(getRatingShortLabel('Not tested/not verified'), 'Not Tested');
  });
  it('returns "PO" for "Powered up only"', () => {
    assert.equal(getRatingShortLabel('Powered up only'), 'PO');
  });
  it('returns the input unchanged for unknown ratings', () => {
    assert.equal(getRatingShortLabel('Unknown'), 'Unknown');
  });
});

describe('getRatingColor', () => {
  it('returns red for A - Critical', () => {
    assert.equal(getRatingColor('A - Critical'), '#dc2626');
  });
  it('returns orange for B - Needs Attention', () => {
    assert.equal(getRatingColor('B - Needs Attention'), '#d97706');
  });
  it('returns green for C - Serviceable', () => {
    assert.equal(getRatingColor('C - Serviceable'), '#16a34a');
  });
  it('returns grey fallback for unknown ratings', () => {
    assert.equal(getRatingColor('Mystery'), '#6b7280');
  });
});

describe('getRatingPriority', () => {
  it('sorts A above B above NT above C', () => {
    assert.truthy(getRatingPriority('A - Critical') > getRatingPriority('B - Needs Attention'));
    assert.truthy(getRatingPriority('B - Needs Attention') > getRatingPriority('Not tested/not verified'));
    assert.truthy(getRatingPriority('Not tested/not verified') > getRatingPriority('C - Serviceable'));
  });
  it('returns 0 for unknown ratings', () => {
    assert.equal(getRatingPriority('anything'), 0);
  });
});

describe('getRatingBaseCode', () => {
  it('returns A for "A - Critical"', () => {
    assert.equal(getRatingBaseCode('A - Critical'), 'A');
  });
  it('returns N for "Not tested/not verified"', () => {
    assert.equal(getRatingBaseCode('Not tested/not verified'), 'N');
  });
  it('returns empty string for empty input', () => {
    assert.equal(getRatingBaseCode(''), '');
    assert.equal(getRatingBaseCode(null), '');
    assert.equal(getRatingBaseCode(undefined), '');
  });
});
