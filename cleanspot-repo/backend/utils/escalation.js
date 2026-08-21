const Incident = require("../models/Incident");

// Open-issue counts at which a still-unresolved incident gets bumped up the
// hierarchy: Application -> Local -> District -> State (see project plan §9).
const DISTRICT_THRESHOLD = 10;
const STATE_THRESHOLD = 20;

const CRITICAL_THRESHOLD = Number(process.env.ATTENTION_THRESHOLD || 40);

// Called after a spot's score/openIssues are updated by a new report.
// Creates or updates the Incident record for this spot when it qualifies.
async function checkAndEscalate(spot, report) {
  if (spot.score >= CRITICAL_THRESHOLD) return null;

  let incident = await Incident.findOne({ spot: spot._id, status: { $ne: "Resolved" } });

  const targetLevel =
    spot.openIssues >= STATE_THRESHOLD ? "State" : spot.openIssues >= DISTRICT_THRESHOLD ? "District" : "Local";

  if (!incident) {
    incident = await Incident.create({
      spot: spot._id,
      relatedReports: [report._id],
      severity: spot.score < CRITICAL_THRESHOLD / 2 ? "HIGH" : "MEDIUM",
      authorityLevel: targetLevel,
      status: "Open",
      notes: `Auto-escalated: score ${spot.score}/100, ${spot.openIssues} open issues.`,
    });
    return incident;
  }

  incident.relatedReports.push(report._id);
  if (targetLevel !== incident.authorityLevel) {
    incident.authorityLevel = targetLevel;
    incident.notes += `\nEscalated to ${targetLevel}: ${spot.openIssues} open issues.`;
  }
  incident.escalatedAt = new Date();
  await incident.save();
  return incident;
}

// Called when a spot recovers above the critical threshold — closes out any
// open incident and stamps it as resolved.
async function resolveIncidentsForSpot(spot) {
  await Incident.updateMany(
    { spot: spot._id, status: { $ne: "Resolved" } },
    { $set: { status: "Resolved", resolvedAt: new Date() } }
  );
}

module.exports = { checkAndEscalate, resolveIncidentsForSpot };
