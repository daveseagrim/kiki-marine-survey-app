// Tests for src/core/component_builder.js — B-07 pt 2 checkbox composition
const { composeFindings, joinAsList } = require('../src/core/component_builder');

describe('joinAsList', () => {
  it('returns empty for no parts', () => {
    assert.equal(joinAsList([]), '');
    assert.equal(joinAsList(null), '');
  });
  it('returns the single part as-is', () => {
    assert.equal(joinAsList(['the deck']), 'the deck');
  });
  it('joins two parts with " and "', () => {
    assert.equal(joinAsList(['A', 'B']), 'A and B');
  });
  it('joins three parts with Oxford comma', () => {
    assert.equal(joinAsList(['A', 'B', 'C']), 'A, B, and C');
  });
  it('joins four parts with Oxford comma', () => {
    assert.equal(joinAsList(['A', 'B', 'C', 'D']), 'A, B, C, and D');
  });
});

describe('composeFindings - single select (legacy path)', () => {
  const schema = {
    intro: 'Inspection summary.',
    components: [
      {
        key: 'housing',
        options: [
          { label: 'Not inspected', rating: null, fragment: '' },
          { label: 'Good', rating: 'C', fragment: 'The housing was in good condition.' },
          { label: 'Corrosion', rating: 'B', fragment: 'The housing had moderate corrosion.' }
        ]
      }
    ]
  };
  it('emits intro + fragment for single-select C', () => {
    const result = composeFindings(schema, { housing: '1' });
    assert.contains(result.text, 'Inspection summary.');
    assert.contains(result.text, 'in good condition');
    assert.equal(result.rating, 'C - Serviceable');
  });
  it('picks B as the rating when B option is selected', () => {
    const result = composeFindings(schema, { housing: '2' });
    assert.equal(result.rating, 'B - Needs Attention');
  });
  it('returns empty rating when nothing is selected', () => {
    const result = composeFindings(schema, {});
    assert.equal(result.rating, '');
  });
});

describe('composeFindings - multi-select', () => {
  const schema = {
    intro: '',
    components: [
      {
        key: 'findings',
        multiSelect: true,
        options: [
          { label: 'A1', rating: 'A', fragment: 'A-level finding one.' },
          { label: 'A2', rating: 'A', fragment: 'A-level finding two.' },
          { label: 'B1', rating: 'B', fragment: 'B-level finding one.' },
          { label: 'C1', rating: 'C', fragment: 'All good.' }
        ]
      }
    ]
  };
  it('concatenates fragments from multiple ticked options', () => {
    const result = composeFindings(schema, { findings: ['0', '2'] });
    assert.contains(result.text, 'A-level finding one.');
    assert.contains(result.text, 'B-level finding one.');
  });
  it('picks the worst rating across ticked options', () => {
    const result = composeFindings(schema, { findings: ['2', '3'] }); // B + C
    assert.equal(result.rating, 'B - Needs Attention');
  });
  it('picks A when any A option is ticked', () => {
    const result = composeFindings(schema, { findings: ['3', '0'] }); // C + A
    assert.equal(result.rating, 'A - Critical');
  });
  it('handles empty selection array', () => {
    const result = composeFindings(schema, { findings: [] });
    assert.equal(result.text, '');
    assert.equal(result.rating, '');
  });
});

describe('composeFindings - join=list with prefix/suffix', () => {
  const schema = {
    intro: '',
    components: [
      {
        key: 'areas',
        multiSelect: true,
        join: 'list',
        prefix: 'Percussion testing was performed on ',
        suffix: '.',
        options: [
          { label: 'Deck', rating: null, alwaysInclude: true, fragment: 'the deck' },
          { label: 'Coachroof', rating: null, alwaysInclude: true, fragment: 'the coachroof' },
          { label: 'Cockpit sole', rating: null, alwaysInclude: true, fragment: 'the cockpit sole' }
        ]
      }
    ]
  };
  it('produces a grammatical single-item sentence', () => {
    const result = composeFindings(schema, { areas: ['0'] });
    assert.equal(result.text, 'Percussion testing was performed on the deck.');
  });
  it('produces a grammatical two-item sentence', () => {
    const result = composeFindings(schema, { areas: ['0', '1'] });
    assert.equal(result.text, 'Percussion testing was performed on the deck and the coachroof.');
  });
  it('produces a grammatical three-item sentence with Oxford comma', () => {
    const result = composeFindings(schema, { areas: ['0', '1', '2'] });
    assert.equal(result.text, 'Percussion testing was performed on the deck, the coachroof, and the cockpit sole.');
  });
});

describe('composeFindings - alwaysInclude options', () => {
  const schema = {
    intro: '',
    components: [
      {
        key: 'findings',
        multiSelect: true,
        options: [
          { label: 'No issues', rating: 'C', fragment: 'All clear.' },
          { label: 'Limited by coatings', rating: null, alwaysInclude: true, fragment: 'Testing was limited by thick coatings in some areas.' }
        ]
      }
    ]
  };
  it('includes alwaysInclude option even with rating=null', () => {
    const result = composeFindings(schema, { findings: ['0', '1'] });
    assert.contains(result.text, 'All clear.');
    assert.contains(result.text, 'Testing was limited');
  });
  it('alwaysInclude option does not contribute a rating', () => {
    const result = composeFindings(schema, { findings: ['1'] }); // only always-include
    assert.equal(result.rating, ''); // no rating anywhere
  });
  it('picks correct rating when alwaysInclude mixed with rated option', () => {
    const result = composeFindings(schema, { findings: ['0', '1'] });
    assert.equal(result.rating, 'C - Serviceable');
  });
});

describe('composeFindings - multi-component composition (deck/coachroof style)', () => {
  // Mimics the real COMPONENT_BUILDERS schema for percussion testing
  const schema = {
    intro: '',
    components: [
      {
        key: 'areas', multiSelect: true, join: 'list',
        prefix: 'Percussion testing was performed on ',
        suffix: '.',
        options: [
          { label: 'Deck', rating: null, alwaysInclude: true, fragment: 'the deck' },
          { label: 'Coachroof', rating: null, alwaysInclude: true, fragment: 'the coachroof' }
        ]
      },
      {
        key: 'method', multiSelect: true, join: 'list',
        prefix: 'Testing was conducted using ',
        suffix: '.',
        options: [
          { label: 'Hammer', rating: null, alwaysInclude: true, fragment: 'a sounding hammer' }
        ]
      },
      {
        key: 'findings', multiSelect: true,
        options: [
          { label: 'No issues', rating: 'C', fragment: 'No tonal anomalies were detected.' }
        ]
      }
    ]
  };
  it('composes a multi-sentence report from all three components', () => {
    const result = composeFindings(schema, {
      areas: ['0', '1'],
      method: ['0'],
      findings: ['0']
    });
    assert.contains(result.text, 'Percussion testing was performed on the deck and the coachroof.');
    assert.contains(result.text, 'Testing was conducted using a sounding hammer.');
    assert.contains(result.text, 'No tonal anomalies were detected.');
    assert.equal(result.rating, 'C - Serviceable');
  });
});

describe('composeFindings - per-option location text (v2156)', () => {
  const schemaWithLocationPlaceholder = {
    intro: '',
    components: [
      {
        key: 'findings', multiSelect: true,
        options: [
          { label: 'Soft area', rating: 'B', fragment: 'A possible soft area was detected at {location}.' },
          { label: 'Delamination', rating: 'A', fragment: 'Delamination was confirmed at {location}.' }
        ]
      }
    ]
  };
  const schemaNoPlaceholder = {
    intro: '',
    components: [
      {
        key: 'findings', multiSelect: true,
        options: [
          { label: 'Soft area', rating: 'B', fragment: 'A soft area was detected.' }
        ]
      }
    ]
  };

  it('substitutes {location} with per-option location text', () => {
    const result = composeFindings(schemaWithLocationPlaceholder, {
      findings: ['0'],
      findings_locText: { '0': 'the forward starboard stanchion base' }
    });
    assert.equal(result.text, 'A possible soft area was detected at the forward starboard stanchion base.');
  });
  it('handles different locations for different ticked options', () => {
    const result = composeFindings(schemaWithLocationPlaceholder, {
      findings: ['0', '1'],
      findings_locText: { '0': 'stanchion 3', '1': 'port coachroof corner' }
    });
    assert.contains(result.text, 'soft area was detected at stanchion 3');
    assert.contains(result.text, 'Delamination was confirmed at port coachroof corner');
  });
  it('leaves {location} as [LOCATION] placeholder if nothing provided', () => {
    const result = composeFindings(schemaWithLocationPlaceholder, { findings: ['0'] });
    assert.contains(result.text, '[LOCATION]');
  });
  it('appends location in parentheses when fragment has no {location} placeholder', () => {
    const result = composeFindings(schemaNoPlaceholder, {
      findings: ['0'],
      findings_locText: { '0': 'port side near stanchion 3' }
    });
    assert.contains(result.text, 'A soft area was detected (port side near stanchion 3).');
  });
  it('ignores per-option location text for options not ticked', () => {
    const result = composeFindings(schemaWithLocationPlaceholder, {
      findings: ['1'],
      findings_locText: { '0': 'should be ignored', '1': 'coachroof' }
    });
    assert.contains(result.text, 'Delamination was confirmed at coachroof');
    assert.notContains(result.text, 'should be ignored');
  });
});

describe('composeFindings - ABYC citation dedup', () => {
  const schema = {
    intro: '',
    components: [
      {
        key: 'findings', multiSelect: true,
        options: [
          { label: 'F1', rating: 'B', fragment: 'Per ABYC E-11, wiring must be supported every 18 inches. The first section needs attention.' },
          { label: 'F2', rating: 'B', fragment: 'Per ABYC E-11, wiring must be supported every 18 inches. A second section also needs attention.' }
        ]
      }
    ]
  };
  it('keeps first ABYC citation, strips duplicates', () => {
    const result = composeFindings(schema, { findings: ['0', '1'] });
    // First ABYC E-11 citation kept
    assert.contains(result.text, 'Per ABYC E-11');
    // Should appear only once
    const matches = result.text.match(/Per ABYC E-11/g) || [];
    assert.equal(matches.length, 1);
  });
});
