// ============================================================================
// core/skip_logic.js — Classify skipped items by category for the Check function
// ============================================================================
// Wrapped in an IIFE to prevent name collisions with app.js.
// ============================================================================

(function () {
  'use strict';

  function summarizeSkippedByCategory(expandedItems, surveyItems) {
    if (!Array.isArray(expandedItems)) return [];
    surveyItems = surveyItems || {};

    const totalByCategory = {};
    expandedItems.forEach(item => {
      totalByCategory[item.categoryName] = (totalByCategory[item.categoryName] || 0) + 1;
    });

    const skippedByCategory = {};
    expandedItems.forEach(item => {
      const data = surveyItems[item.label];
      if (data && data.excluded) {
        if (!skippedByCategory[item.categoryName]) skippedByCategory[item.categoryName] = [];
        skippedByCategory[item.categoryName].push(item.label);
      }
    });

    const summaries = [];
    for (const catName in skippedByCategory) {
      const skippedLabels = skippedByCategory[catName];
      const total = totalByCategory[catName] || skippedLabels.length;
      let summaryType;
      if (skippedLabels.length === total && total > 1) {
        summaryType = 'entire-category';
      } else if (skippedLabels.length > 3) {
        summaryType = 'many-in-category';
      } else {
        summaryType = 'individual';
      }
      summaries.push({
        categoryName: catName,
        skippedCount: skippedLabels.length,
        totalCount: total,
        summaryType,
        items: skippedLabels
      });
    }
    return summaries;
  }

  function describeSkipSummary(summary) {
    if (!summary) return '';
    if (summary.summaryType === 'entire-category') {
      return `Entire "${summary.categoryName}" section skipped (${summary.totalCount} items) — excluded from report`;
    }
    if (summary.summaryType === 'many-in-category') {
      const preview = summary.items.slice(0, 3).join(', ');
      return `${summary.skippedCount} items skipped in "${summary.categoryName}": ${preview} (+${summary.skippedCount - 3} more)`;
    }
    return `Skipped in "${summary.categoryName}": ${summary.items.join(', ')}`;
  }

  const API = { summarizeSkippedByCategory, describeSkipSummary };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.KikiSkipLogic = API;
  }
})();
