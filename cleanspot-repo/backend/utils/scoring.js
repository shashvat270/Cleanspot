const { SCORE_BUCKETS, REPORT_CATEGORIES } = require("./constants");

// How much a new report knocks a category down, by severity.
const PENALTY_BY_SEVERITY = { low: 3, medium: 6, high: 11 };

// How much a category recovers when a report against it is resolved with
// verified before/after evidence.
const RECOVERY_ON_RESOLVE = 18;

function bucketForCategory(category) {
  return REPORT_CATEGORIES[category] || "general";
}

// Confidence from AI verification scales the penalty a little — a confidently
// detected problem should move the score more than a low-confidence guess,
// but AI is never the sole authority (see AI_FEATURE notes in README).
function severityFor(confidence) {
  if (confidence >= 85) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}

function recomputeOverallScore(spot) {
  const total = SCORE_BUCKETS.reduce((sum, key) => sum + spot.categoryScores[key], 0);
  spot.score = Math.round(total / SCORE_BUCKETS.length);
  return spot.score;
}

// Call when a new report is filed. Mutates the spot in place; caller saves it.
function applyNewReportPenalty(spot, category, severity) {
  const bucket = bucketForCategory(category);
  const penalty = PENALTY_BY_SEVERITY[severity] || PENALTY_BY_SEVERITY.medium;
  spot.categoryScores[bucket] = Math.max(0, spot.categoryScores[bucket] - penalty);
  recomputeOverallScore(spot);
  return bucket;
}

// Call when a report is marked Resolved with verified after-evidence.
function applyResolutionRecovery(spot, category) {
  const bucket = bucketForCategory(category);
  spot.categoryScores[bucket] = Math.min(100, spot.categoryScores[bucket] + RECOVERY_ON_RESOLVE);
  recomputeOverallScore(spot);
  return bucket;
}

module.exports = {
  bucketForCategory,
  severityFor,
  recomputeOverallScore,
  applyNewReportPenalty,
  applyResolutionRecovery,
};
