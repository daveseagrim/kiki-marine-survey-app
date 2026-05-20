// ============================================================================
// core/drive_backup.js — Pure helpers for Drive backup resume logic
// ============================================================================
// B-01 fix: before uploading a photo, we check whether a file with the same
// deterministic filename already exists in the vessel's Drive folder and
// skip it if so. The filename generator is deterministic — a given photo
// always produces the same filename — so a filename match means "already
// uploaded, safe to skip." These helpers are pure (no DOM, no Drive API,
// no IndexedDB) so they can be tested in Node.
// ============================================================================

(function () {
  'use strict';

  /**
   * Build the deterministic filename that Drive backup will use for a photo.
   * Matches the logic in DriveBackup.backupSurvey — if this ever changes,
   * the change must happen in BOTH places or the skip-on-resume check will
   * misbehave.
   *
   * @param {Object} photo - has { label, id, dataUrl }. dataUrl may be null
   *                         if caller hasn't loaded the blob yet.
   * @param {number} index - fallback counter used when label and id are both
   *                         missing (rare).
   * @returns {string} - e.g. "hull_portside_01.jpg"
   */
  function photoFilename(photo, index) {
    const ext = photo && photo.dataUrl && photo.dataUrl.startsWith('data:image/png')
      ? '.png'
      : '.jpg';
    const base = (photo && (photo.label || photo.id)) || `photo_${index || 0}`;
    return base.replace(/[^a-zA-Z0-9_-]/g, '_') + ext;
  }

  /**
   * Classify a list of photos into "needs upload" vs "already on Drive".
   * Called once per backup — takes the set of filenames already present
   * in the vessel's Drive folder and decides which photos to upload.
   *
   * Photos without a usable dataUrl are excluded from toUpload — they
   * can't be uploaded and are reported separately.
   *
   * @param {Set|Array} existingFilenames - filenames present in Drive folder
   * @param {Array} photos - photo metadata objects, in the order they
   *                         will be iterated by the caller
   * @returns {Object} - { toUpload: [{photo, name}], toSkip: [{photo, name}], missingData: [photo] }
   */
  function classifyPhotosForBackup(existingFilenames, photos) {
    const existingSet = existingFilenames instanceof Set
      ? existingFilenames
      : new Set(existingFilenames || []);
    const toUpload = [];
    const toSkip = [];
    const missingData = [];
    (photos || []).forEach((photo, i) => {
      if (!photo || !photo.dataUrl) {
        missingData.push(photo);
        return;
      }
      const name = photoFilename(photo, i);
      if (existingSet.has(name)) {
        toSkip.push({ photo, name });
      } else {
        toUpload.push({ photo, name });
      }
    });
    return { toUpload, toSkip, missingData };
  }

  function folderMatchKeys(name) {
    const base = String(name || '')
      .toLowerCase()
      .replace(/[,\u2013\u2014-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const stripped = base
      .replace(/^\d+\s*[-_.:)]?\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped && stripped !== base ? [base, stripped] : [base];
  }

  function driveFolderNameMatches(actualName, targetName) {
    const target = String(targetName || '')
      .toLowerCase()
      .replace(/[,\u2013\u2014-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!target) return false;
    return folderMatchKeys(actualName).includes(target);
  }

  const API = { photoFilename, classifyPhotosForBackup, folderMatchKeys, driveFolderNameMatches };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiDriveBackup = API;
  }
})();
