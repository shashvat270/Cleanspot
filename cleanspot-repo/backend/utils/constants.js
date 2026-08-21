// Report categories a tourist can pick, and which dashboard bucket each one
// affects when a spot's cleanliness score is recalculated.
const REPORT_CATEGORIES = {
  "Garbage accumulation": "waste",
  "Overflowing dustbin": "waste",
  "Plastic waste": "waste",
  "Dirty toilet": "toilet",
  "Damaged sanitation facility": "toilet",
  "Dirty water": "water",
  "Bad smell": "general",
  "Other hygiene problem": "general",
};

const SCORE_BUCKETS = ["waste", "toilet", "general", "water", "area"];

const REPORT_STATUSES = [
  "Reported",
  "Under Verification",
  "Verified",
  "Action Required",
  "In Progress",
  "Resolved",
];

const AUTHORITY_LEVELS = ["Local", "District", "State"];

const SEVERITIES = ["low", "medium", "high"];

module.exports = {
  REPORT_CATEGORIES,
  SCORE_BUCKETS,
  REPORT_STATUSES,
  AUTHORITY_LEVELS,
  SEVERITIES,
};
