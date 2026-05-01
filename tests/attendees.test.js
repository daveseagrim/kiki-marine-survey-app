const { formatPersonsInAttendance } = require('../src/core/attendees');

describe('formatPersonsInAttendance', () => {
  it('collapses owner name appended twice without spacing', () => {
    const raw = 'Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor, Ian Koster (Owner)Ian Koster';
    assert.equal(
      formatPersonsInAttendance(raw),
      'Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor, Ian Koster (Owner)'
    );
  });

  it('deduplicates repeated attendees by name', () => {
    const raw = 'Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor, Ian Koster (Owner), Ian Koster';
    assert.equal(
      formatPersonsInAttendance(raw),
      'Dave Seagrim, SAMS Surveyor Associate, ABYC Master Advisor, Ian Koster (Owner)'
    );
  });
});
