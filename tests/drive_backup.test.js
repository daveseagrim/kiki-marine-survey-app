// Tests for src/core/drive_backup.js — B-01 resume logic
const { photoFilename, classifyPhotosForBackup } = require('../src/core/drive_backup');

describe('photoFilename', () => {
  it('uses label when available', () => {
    const photo = { label: 'Hull portside 01', dataUrl: 'data:image/jpeg;base64,xxx' };
    assert.equal(photoFilename(photo, 0), 'Hull_portside_01.jpg');
  });
  it('falls back to id when label is missing', () => {
    const photo = { id: 'abc-123-xyz', dataUrl: 'data:image/jpeg;base64,xxx' };
    assert.equal(photoFilename(photo, 0), 'abc-123-xyz.jpg');
  });
  it('falls back to photo_N when label and id are both missing', () => {
    const photo = { dataUrl: 'data:image/jpeg;base64,xxx' };
    assert.equal(photoFilename(photo, 5), 'photo_5.jpg');
  });
  it('uses .png extension when dataUrl is PNG', () => {
    const photo = { label: 'compliance-plate', dataUrl: 'data:image/png;base64,xxx' };
    assert.equal(photoFilename(photo, 0), 'compliance-plate.png');
  });
  it('sanitises special characters in the label', () => {
    const photo = { label: "Port bow — stem & bow roller", dataUrl: 'data:image/jpeg;base64,xxx' };
    // all non-alphanumeric (except _ and -) collapsed to _
    const out = photoFilename(photo, 0);
    assert.notContains(out, '—');
    assert.notContains(out, '&');
    assert.notContains(out, ' ');
    assert.contains(out, '.jpg');
  });
  it('produces the same filename every call for the same photo (deterministic)', () => {
    const photo = { label: 'engine plate', dataUrl: 'data:image/jpeg;base64,xxx' };
    assert.equal(photoFilename(photo, 0), photoFilename(photo, 0));
  });
  it('produces the same filename regardless of index, when label is present', () => {
    const photo = { label: 'hull', dataUrl: 'data:image/jpeg;base64,xxx' };
    assert.equal(photoFilename(photo, 0), photoFilename(photo, 99));
  });
});

describe('driveFolderNameMatches', () => {
  const { driveFolderNameMatches } = require('../src/core/drive_backup');

  it('matches exact folder names', () => {
    assert.truthy(driveFolderNameMatches('completed', 'completed'));
  });

  it('matches folders with leading ordering numbers', () => {
    assert.truthy(driveFolderNameMatches('01 completed', 'completed'));
    assert.truthy(driveFolderNameMatches('2 - in progress', 'in progress'));
    assert.truthy(driveFolderNameMatches('03_surveys', 'surveys'));
  });

  it('matches the 2026 survey folder with or without punctuation', () => {
    assert.truthy(driveFolderNameMatches('02 Surveys, 2026', 'Surveys 2026'));
    assert.truthy(driveFolderNameMatches('02 Surveys, 2026', '02 Surveys, 2026'));
    assert.truthy(driveFolderNameMatches('Surveys, 2026', 'Surveys 2026'));
    assert.truthy(driveFolderNameMatches('Surveys 2026', 'Surveys, 2026'));
  });

  it('does not strip meaningful year-only folder names', () => {
    assert.truthy(driveFolderNameMatches('2026', '2026'));
    assert.truthy(driveFolderNameMatches('04 2026', '2026'));
  });
});

describe('classifyPhotosForBackup', () => {
  it('puts all photos in toUpload when Drive folder is empty', () => {
    const photos = [
      { label: 'a', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'b', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'c', dataUrl: 'data:image/jpeg;base64,x' }
    ];
    const result = classifyPhotosForBackup(new Set(), photos);
    assert.equal(result.toUpload.length, 3);
    assert.equal(result.toSkip.length, 0);
    assert.equal(result.missingData.length, 0);
  });
  it('puts all photos in toSkip when every filename is already on Drive', () => {
    const photos = [
      { label: 'a', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'b', dataUrl: 'data:image/jpeg;base64,x' }
    ];
    const existing = new Set(['a.jpg', 'b.jpg']);
    const result = classifyPhotosForBackup(existing, photos);
    assert.equal(result.toSkip.length, 2);
    assert.equal(result.toUpload.length, 0);
  });
  it('splits photos correctly when Drive folder has some but not all', () => {
    // This is the B-01 resume case: backup was interrupted after 'a' and 'b'
    // uploaded. On retry, 'c' and 'd' should be the only ones uploaded.
    const photos = [
      { label: 'a', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'b', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'c', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'd', dataUrl: 'data:image/jpeg;base64,x' }
    ];
    const existing = new Set(['a.jpg', 'b.jpg']);
    const result = classifyPhotosForBackup(existing, photos);
    assert.equal(result.toSkip.length, 2);
    assert.equal(result.toUpload.length, 2);
    assert.deepEqual(result.toSkip.map(x => x.name).sort(), ['a.jpg', 'b.jpg']);
    assert.deepEqual(result.toUpload.map(x => x.name).sort(), ['c.jpg', 'd.jpg']);
  });
  it('accepts an array as well as a Set for existing filenames', () => {
    const photos = [{ label: 'x', dataUrl: 'data:image/jpeg;base64,y' }];
    const result = classifyPhotosForBackup(['x.jpg'], photos);
    assert.equal(result.toSkip.length, 1);
  });
  it('puts photos without dataUrl in missingData, not in upload queue', () => {
    const photos = [
      { label: 'real', dataUrl: 'data:image/jpeg;base64,x' },
      { label: 'no-data' /* no dataUrl */ },
      { label: 'null-data', dataUrl: null }
    ];
    const result = classifyPhotosForBackup(new Set(), photos);
    assert.equal(result.toUpload.length, 1);
    assert.equal(result.missingData.length, 2);
  });
  it('handles empty or null inputs safely', () => {
    const a = classifyPhotosForBackup(null, null);
    assert.equal(a.toUpload.length, 0);
    assert.equal(a.toSkip.length, 0);
    const b = classifyPhotosForBackup(new Set(), []);
    assert.equal(b.toUpload.length, 0);
  });
  it('distinguishes png and jpg extensions when matching', () => {
    // photo.png and photo.jpg are different files in Drive
    const photos = [
      { label: 'compliance', dataUrl: 'data:image/png;base64,x' }
    ];
    // Drive has compliance.jpg but we want to upload compliance.png
    const existing = new Set(['compliance.jpg']);
    const result = classifyPhotosForBackup(existing, photos);
    assert.equal(result.toUpload.length, 1);
    assert.equal(result.toUpload[0].name, 'compliance.png');
  });
});
