// Tests for src/core/skip_logic.js
// These encode the regression fix where skipped items should be treated as
// handled and grouped by category, not listed individually in the Check.
const {
  summarizeSkippedByCategory,
  describeSkipSummary
} = require('../src/core/skip_logic');

describe('summarizeSkippedByCategory', () => {
  it('returns empty array when no items given', () => {
    assert.deepEqual(summarizeSkippedByCategory([], {}), []);
    assert.deepEqual(summarizeSkippedByCategory(null, null), []);
  });
  it('returns empty array when nothing is skipped', () => {
    const items = [
      { label: 'Hull 1', categoryName: 'Hull' },
      { label: 'Hull 2', categoryName: 'Hull' }
    ];
    const surveyItems = {
      'Hull 1': { rating: 'C - Serviceable', excluded: false },
      'Hull 2': { rating: 'C - Serviceable', excluded: false }
    };
    assert.deepEqual(summarizeSkippedByCategory(items, surveyItems), []);
  });
  it('reports "entire-category" when all items in a category are skipped', () => {
    const items = [
      { label: 'Hull 1', categoryName: 'Hull' },
      { label: 'Hull 2', categoryName: 'Hull' },
      { label: 'Hull 3', categoryName: 'Hull' }
    ];
    const surveyItems = {
      'Hull 1': { excluded: true },
      'Hull 2': { excluded: true },
      'Hull 3': { excluded: true }
    };
    const result = summarizeSkippedByCategory(items, surveyItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].summaryType, 'entire-category');
    assert.equal(result[0].skippedCount, 3);
    assert.equal(result[0].totalCount, 3);
  });
  it('reports "many-in-category" when more than 3 items are skipped', () => {
    const items = [
      { label: 'A', categoryName: 'X' }, { label: 'B', categoryName: 'X' },
      { label: 'C', categoryName: 'X' }, { label: 'D', categoryName: 'X' },
      { label: 'E', categoryName: 'X' }, { label: 'F', categoryName: 'X' }
    ];
    const surveyItems = {
      'A': { excluded: true }, 'B': { excluded: true },
      'C': { excluded: true }, 'D': { excluded: true }
      // E, F not skipped
    };
    const result = summarizeSkippedByCategory(items, surveyItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].summaryType, 'many-in-category');
    assert.equal(result[0].skippedCount, 4);
    assert.equal(result[0].totalCount, 6);
  });
  it('reports "individual" when 3 or fewer are skipped', () => {
    const items = [
      { label: 'A', categoryName: 'X' }, { label: 'B', categoryName: 'X' },
      { label: 'C', categoryName: 'X' }, { label: 'D', categoryName: 'X' }
    ];
    const surveyItems = {
      'A': { excluded: true }, 'B': { excluded: true }
    };
    const result = summarizeSkippedByCategory(items, surveyItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].summaryType, 'individual');
    assert.equal(result[0].skippedCount, 2);
  });
  it('handles multiple categories independently', () => {
    const items = [
      { label: 'Hull 1', categoryName: 'Hull' },
      { label: 'Hull 2', categoryName: 'Hull' },
      { label: 'Engine 1', categoryName: 'Engine' },
      { label: 'Engine 2', categoryName: 'Engine' }
    ];
    const surveyItems = {
      'Hull 1': { excluded: true },
      'Hull 2': { excluded: true },
      'Engine 1': { excluded: true }
      // Engine 2 rated, not skipped
    };
    const result = summarizeSkippedByCategory(items, surveyItems);
    assert.equal(result.length, 2);
    const hull = result.find(r => r.categoryName === 'Hull');
    const engine = result.find(r => r.categoryName === 'Engine');
    assert.equal(hull.summaryType, 'entire-category');
    assert.equal(engine.summaryType, 'individual');
  });
  it('does not treat a single-item category skip as "entire-category"', () => {
    // Special case: if a category has only 1 item, we want individual treatment
    // not "entire-category" (which reads awkwardly for 1 item).
    const items = [{ label: 'Only one', categoryName: 'Solo' }];
    const surveyItems = { 'Only one': { excluded: true } };
    const result = summarizeSkippedByCategory(items, surveyItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].summaryType, 'individual');
  });
});

describe('describeSkipSummary', () => {
  it('formats entire-category nicely', () => {
    const summary = {
      categoryName: 'Hull',
      skippedCount: 14,
      totalCount: 14,
      summaryType: 'entire-category',
      items: []
    };
    const msg = describeSkipSummary(summary);
    assert.contains(msg, 'Entire');
    assert.contains(msg, 'Hull');
    assert.contains(msg, '14 items');
  });
  it('formats many-in-category with a preview and count', () => {
    const summary = {
      categoryName: 'Electrical',
      skippedCount: 5,
      totalCount: 20,
      summaryType: 'many-in-category',
      items: ['A', 'B', 'C', 'D', 'E']
    };
    const msg = describeSkipSummary(summary);
    assert.contains(msg, '5 items');
    assert.contains(msg, 'Electrical');
    assert.contains(msg, '+2 more');
  });
  it('returns empty string for null input', () => {
    assert.equal(describeSkipSummary(null), '');
  });
});
