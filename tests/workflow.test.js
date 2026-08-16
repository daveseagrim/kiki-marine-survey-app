const { canEditSurvey, reopenForEditing } = require('../src/core/workflow');

describe('canEditSurvey', () => {
  it('allows field surveys to be edited', () => {
    assert.equal(canEditSurvey({ workflowStatus: 'field' }), true);
  });

  it('blocks completed and transferred surveys before edits create orphan data', () => {
    assert.equal(canEditSurvey({ workflowStatus: 'completed' }), false);
    assert.equal(canEditSurvey({ workflowStatus: 'transferred_to_laptop' }), false);
    assert.equal(canEditSurvey({ completedAt: '2026-08-16T04:00:00.000Z' }), false);
  });
});

describe('reopenForEditing', () => {
  it('clears only workflow locks while preserving delivered survey data', () => {
    const original = {
      id: '1777042617097',
      vesselName: 'Ciao Baby II',
      workflowStatus: 'completed',
      completedAt: '2026-08-16T04:00:00.000Z',
      completedOnDevice: 'Mac',
      transferredAt: '2026-08-15T20:00:00.000Z',
      transferredFromDevice: 'iPhone',
      lockedReason: 'Completed survey archive created',
      delivered: true,
      deliveredAt: '2026-08-16T04:00:00.000Z',
      items: {
        'Hot water tank, plumbing and electrical': {
          rating: 'A',
          notes: 'Power remained available from the breaker.',
          photos: ['photo-1', 'photo-2']
        }
      }
    };

    const reopened = reopenForEditing(original, '2026-08-16T13:30:00.000Z');

    assert.equal(reopened.workflowStatus, 'field');
    assert.equal(reopened.reopenedAt, '2026-08-16T13:30:00.000Z');
    assert.equal(reopened.lastModified, '2026-08-16T13:30:00.000Z');
    assert.falsy(reopened.completedAt);
    assert.falsy(reopened.completedOnDevice);
    assert.falsy(reopened.transferredAt);
    assert.falsy(reopened.transferredFromDevice);
    assert.falsy(reopened.lockedReason);
    assert.equal(reopened.delivered, true);
    assert.equal(reopened.deliveredAt, '2026-08-16T04:00:00.000Z');
    assert.equal(reopened.items, original.items);
    assert.equal(original.workflowStatus, 'completed');
    assert.equal(original.completedAt, '2026-08-16T04:00:00.000Z');
  });

  it('rejects a missing survey record', () => {
    assert.throws(() => reopenForEditing(null, '2026-08-16T13:30:00.000Z'));
  });
});
