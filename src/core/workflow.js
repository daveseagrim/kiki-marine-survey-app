// ============================================================================
// core/workflow.js — Safe survey workflow state transitions
// ============================================================================

(function () {
  'use strict';

  function workflowStatus(survey) {
    if (!survey || typeof survey !== 'object') return '';
    return survey.workflowStatus
      || (survey.completedAt ? 'completed' : '')
      || (survey.transferredAt ? 'transferred_to_laptop' : '');
  }

  function canEditSurvey(survey) {
    const status = workflowStatus(survey);
    return status !== 'completed' && status !== 'transferred_to_laptop';
  }

  function reopenForEditing(survey, reopenedAt) {
    if (!survey || typeof survey !== 'object') {
      throw new Error('A survey record is required.');
    }

    const timestamp = reopenedAt || new Date().toISOString();
    const reopened = {
      ...survey,
      workflowStatus: 'field',
      reopenedAt: timestamp,
      lastModified: timestamp
    };

    delete reopened.completedAt;
    delete reopened.completedOnDevice;
    delete reopened.transferredAt;
    delete reopened.transferredFromDevice;
    delete reopened.lockedReason;

    return reopened;
  }

  const API = { canEditSurvey, reopenForEditing };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiWorkflow = API;
  }
})();
