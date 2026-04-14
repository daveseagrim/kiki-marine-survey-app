// ============================================================================
// core/skip_logic.js — Classify skipped items by category for the Check function
// ============================================================================
// When Dave taps "Skip Entire Category" on a section, we don't want to report
// each item individually in the Check output. This module groups skipped
// items by category and decides how to summarize them.
// ============================================================================

/**
 * Build a structured summary of skipped items for the Check function.
 *
 * @param {Array} expandedItems - Array of { label, categoryName } for all
 *   applicable items in the survey (after hull/head/drive expansion).
 * @param {Object} surveyItems - survey.items map keyed by item label.
 *   Each value has shape { rating, text, excluded, flagged, ... }.
 * @returns {Array} - Array of summary objects, one per affected category.
 *   Each has: { categoryName, skippedCount, totalCount, summaryType, items }
 *   summaryType is 'entire-category' | 'many-in-category' | 'individual'
 */
function summarizeSkippedByCategory(expandedItems, surveyItems) {
  if (!Array.isArray(expandedItems)) return [];
  surveyItems = surveyItems || {};

  // Count total items per category
  const totalByCategory = {};
  expandedItems.forEach(item => {
    totalByCategory[item.categoryName] = (totalByCategory[item.categoryName] || 0) + 1;
  });

  // Collect skipped items per category
  const skippedByCategory = {};
  expandedItems.forEach(item => {
    const data = surveyItems[item.label];
    if (data && data.excluded) {
      if (!skippedByCategory[item.categoryName]) skippedByCategory[item.categoryName] = [];
      skippedByCategory[item.categoryName].push(item.label);
    }
  });

  // Build summaries
  const summaries = [];
  for (const [catName, skippedLabels] of Object.entries(skippedByCategory)) {
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

/**
 * Given a skip summary from summarizeSkippedByCategory, return the
 * human-readable message string for the Check output.
 *
 * @param {Object} summary - One entry from summarizeSkippedByCategory
 * @returns {string} - A friendly message like "Entire 'Hull' section skipped"
 */
function describeSkipSummary(summary) {
  if (!summary) return '';
  if (summary.summaryType === 'entire-category') {
    return `Entire "${summary.categoryName}" section skipped (${summary.totalCount} items) — excluded from report`;
  }
  if (summary.summaryType === 'many-in-category') {
    const preview = summary.items.slice(0, 3).join(', ');
    return `${summary.skippedCount} items skipped in "${summary.categoryName}": ${preview} (+${summary.skippedCount - 3} more)`;
  }
  // 'individual' — caller will typically loop items[] and emit one message each
  return `Skipped in "${summary.categoryName}": ${summary.items.join(', ')}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    summarizeSkippedByCategory,
    describeSkipSummary
  };
} else if (typeof window !== 'undefined') {
  window.summarizeSkippedByCategory = summarizeSkippedByCategory;
  window.describeSkipSummary = describeSkipSummary;
}
