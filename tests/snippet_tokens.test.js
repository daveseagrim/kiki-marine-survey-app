// Tests for src/core/snippet_tokens.js — B-07 rudder-gating tokens
const { expandTokens, contextFromSurvey, transformLabelForDisplay } = require('../src/core/snippet_tokens');

describe('expandTokens - basic', () => {
  it('returns empty string for null or empty input', () => {
    assert.equal(expandTokens(null, {}), '');
    assert.equal(expandTokens('', {}), '');
    assert.equal(expandTokens(undefined, {}), '');
  });
  it('returns plain text unchanged when no tokens present', () => {
    assert.equal(expandTokens('The hull was tested.', { hasRudder: true }),
      'The hull was tested.');
  });
});

describe('expandTokens - {if-rudder}', () => {
  it('includes content when hasRudder is true', () => {
    const out = expandTokens('The hull{if-rudder: and rudder} was tested.', { hasRudder: true, rudderCount: 1 });
    assert.equal(out, 'The hull and rudder was tested.');
  });
  it('drops content when hasRudder is false', () => {
    const out = expandTokens('The hull{if-rudder: and rudder} was tested.', { hasRudder: false });
    assert.equal(out, 'The hull was tested.');
  });
  it('handles multiple {if-rudder} blocks in the same string', () => {
    const out = expandTokens('{if-rudder:Rudder present. }The hull was tested.{if-rudder: Rudder also checked.}', { hasRudder: true, rudderCount: 1 });
    assert.equal(out, 'Rudder present. The hull was tested. Rudder also checked.');
  });
  it('drops all {if-rudder} blocks when hasRudder is false', () => {
    const out = expandTokens('{if-rudder:Rudder present. }The hull was tested.{if-rudder: Rudder also checked.}', { hasRudder: false });
    assert.equal(out, 'The hull was tested.');
  });
});

describe('expandTokens - {if-no-rudder}', () => {
  it('drops content when hasRudder is true', () => {
    const out = expandTokens('The hull was tested.{if-no-rudder: No rudder on this vessel.}', { hasRudder: true, rudderCount: 1 });
    assert.equal(out, 'The hull was tested.');
  });
  it('includes content when hasRudder is false', () => {
    const out = expandTokens('The hull was tested.{if-no-rudder: No rudder on this vessel.}', { hasRudder: false });
    assert.equal(out, 'The hull was tested. No rudder on this vessel.');
  });
});

describe('expandTokens - {count}', () => {
  it('picks singular when rudderCount is 1', () => {
    const out = expandTokens('The {count:rudder|rudders} was tested.', { hasRudder: true, rudderCount: 1 });
    assert.equal(out, 'The rudder was tested.');
  });
  it('picks plural when rudderCount is 2', () => {
    const out = expandTokens('The {count:rudder|rudders} were tested.', { hasRudder: true, rudderCount: 2 });
    assert.equal(out, 'The rudders were tested.');
  });
  it('picks plural when rudderCount is 3 or more', () => {
    const out = expandTokens('{count:it|they} tested fine.', { hasRudder: true, rudderCount: 3 });
    assert.equal(out, 'they tested fine.');
  });
  it('defaults to singular when rudderCount is 0 (no rudder)', () => {
    const out = expandTokens('The {count:rudder|rudders}', { hasRudder: false });
    assert.equal(out, 'The rudder');
  });
});

describe('expandTokens - combined tokens', () => {
  it('handles {if-rudder:...{count:...|...}...} nested one level', () => {
    const out1 = expandTokens('Hull{if-rudder: and {count:rudder|rudders}} tested.', { hasRudder: true, rudderCount: 1 });
    assert.equal(out1, 'Hull and rudder tested.');
    const out2 = expandTokens('Hull{if-rudder: and {count:rudder|rudders}} tested.', { hasRudder: true, rudderCount: 2 });
    assert.equal(out2, 'Hull and rudders tested.');
    const out3 = expandTokens('Hull{if-rudder: and {count:rudder|rudders}} tested.', { hasRudder: false });
    assert.equal(out3, 'Hull tested.');
  });
});

describe('expandTokens - whitespace cleanup', () => {
  it('collapses double spaces left after token removal', () => {
    const out = expandTokens('The hull {if-rudder:and rudder }was tested.', { hasRudder: false });
    assert.equal(out, 'The hull was tested.');
  });
  it('removes space before punctuation', () => {
    // After {if-rudder:...} drop, comma would have a space before it
    const out = expandTokens('Hull{if-rudder:, rudder}, and keel tested.', { hasRudder: false });
    assert.equal(out, 'Hull, and keel tested.');
  });
  it('cleans up around parentheses', () => {
    const out = expandTokens('Hull ({if-rudder:with rudder})', { hasRudder: false });
    assert.equal(out, 'Hull ()');
    // Note: empty parens are not ideal, but acceptable — caller should not
    // write snippets that produce empty parens on the no-rudder path.
  });
});

describe('transformLabelForDisplay', () => {
  const PERCUSSION = 'Hull and rudder(s) (if applicable) impact and resonance testing';
  const CONDUCTIVITY = 'Hull and rudder(s) (if applicable) conductivity testing';

  it('drops "and rudder(s) (if applicable)" when hasRudder is false', () => {
    assert.equal(
      transformLabelForDisplay(PERCUSSION, { hasRudder: false, rudderCount: 0 }),
      'Hull impact and resonance testing'
    );
    assert.equal(
      transformLabelForDisplay(CONDUCTIVITY, { hasRudder: false }),
      'Hull conductivity testing'
    );
  });
  it('becomes "and rudder" (singular) when rudderCount is 1', () => {
    assert.equal(
      transformLabelForDisplay(PERCUSSION, { hasRudder: true, rudderCount: 1 }),
      'Hull and rudder impact and resonance testing'
    );
  });
  it('becomes "and rudders" (plural) when rudderCount is 2 or more', () => {
    assert.equal(
      transformLabelForDisplay(PERCUSSION, { hasRudder: true, rudderCount: 2 }),
      'Hull and rudders impact and resonance testing'
    );
    assert.equal(
      transformLabelForDisplay(PERCUSSION, { hasRudder: true, rudderCount: 4 }),
      'Hull and rudders impact and resonance testing'
    );
  });
  it('returns label unchanged when no "(if applicable)" clause is present', () => {
    assert.equal(transformLabelForDisplay('Propeller shaft', { hasRudder: false }), 'Propeller shaft');
    assert.equal(transformLabelForDisplay('Main mast', { hasRudder: true }), 'Main mast');
  });
  it('handles null/empty input safely', () => {
    assert.equal(transformLabelForDisplay(null, {}), '');
    assert.equal(transformLabelForDisplay('', {}), '');
  });
});

describe('contextFromSurvey', () => {
  it('returns hasRudder=true by default when survey.hasRudder is undefined', () => {
    const ctx = contextFromSurvey({});
    assert.truthy(ctx.hasRudder);
  });
  it('returns hasRudder=false when survey.hasRudder === false', () => {
    const ctx = contextFromSurvey({ hasRudder: false });
    assert.falsy(ctx.hasRudder);
    assert.equal(ctx.rudderCount, 0);
  });
  it('returns rudderCount matching driveLineCount when hasRudder is true', () => {
    const ctx = contextFromSurvey({ driveLineCount: 2 });
    assert.truthy(ctx.hasRudder);
    assert.equal(ctx.rudderCount, 2);
  });
  it('returns rudderCount=1 when driveLineCount not set', () => {
    const ctx = contextFromSurvey({});
    assert.equal(ctx.rudderCount, 1);
  });
  it('handles null survey', () => {
    const ctx = contextFromSurvey(null);
    assert.falsy(ctx.hasRudder);
    assert.equal(ctx.rudderCount, 0);
  });
});
