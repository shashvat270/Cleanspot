const Spot = require("../models/Spot");
const Report = require("../models/Report");
const { publicUrlFor } = require("../middleware/upload");
const { classifyImage } = require("../services/aiClassifier");
const { applyNewReportPenalty, applyResolutionRecovery, severityFor } = require("../utils/scoring");
const { checkAndEscalate, resolveIncidentsForSpot } = require("../utils/escalation");
const { REPORT_STATUSES } = require("../utils/constants");

function serializeReport(r) {
  return {
    id: r._id,
    spot: r.spot,
    category: r.category,
    description: r.description,
    photoUrl: r.photoUrl,
    afterPhotoUrl: r.afterPhotoUrl,
    status: r.status,
    severity: r.severity,
    aiAnalysis: r.aiAnalysis,
    independentConfirmations: r.independentConfirmations,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}

// POST /api/reports  (multipart/form-data: photo, spotId, category, description, lat, lng)
async function createReport(req, res) {
  try {
    const { spotId, category, description, lat, lng, reporterContact } = req.body;

    if (!spotId || !category) {
      return res.status(400).json({ error: "spotId and category are required." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Photo evidence is required to file a report." });
    }

    const spot = await Spot.findById(spotId);
    if (!spot) return res.status(404).json({ error: "Spot not found." });

    const photoUrl = publicUrlFor(req.file.filename);

    // AI-assisted verification — informs severity, does not auto-approve the report.
    const ai = await classifyImage(req.file.path, category);
    const severity = severityFor(ai.confidence);

    // Basic duplicate check: same category, same spot, still open, filed recently.
    const possibleDuplicate = await Report.findOne({
      spot: spot._id,
      category,
      status: { $ne: "Resolved" },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (possibleDuplicate) {
      possibleDuplicate.independentConfirmations += 1;
      await possibleDuplicate.save();
    }

    const report = await Report.create({
      spot: spot._id,
      category,
      description: description || "",
      photoUrl,
      beforePhotoUrl: photoUrl,
      location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
      reporterContact: reporterContact || "",
      aiAnalysis: ai,
      severity,
      status: "Reported",
    });

    // Update the spot's live counters and score.
    spot.rollDailyCounterIfNeeded();
    spot.totalReports += 1;
    spot.openIssues += 1;
    spot.reportsToday += 1;
    applyNewReportPenalty(spot, category, severity);
    await spot.save();

    const incident = await checkAndEscalate(spot, report);

    res.status(201).json({
      report: serializeReport(report),
      spot: { id: spot._id, score: spot.score, statusLabel: spot.statusLabel() },
      escalated: Boolean(incident),
      incidentId: incident ? incident._id : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not file the report.", detail: err.message });
  }
}

// GET /api/reports/:id
async function getReport(req, res) {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  res.json(serializeReport(report));
}

// PATCH /api/reports/:id/status   body: { status }   (admin)
async function updateStatus(req, res) {
  const { status } = req.body;
  if (!REPORT_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${REPORT_STATUSES.join(", ")}` });
  }

  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found." });

  const wasOpen = report.status !== "Resolved";
  report.status = status;
  if (status === "Resolved") report.resolvedAt = new Date();
  await report.save();

  // Resolving via this endpoint (no after-photo) still frees up the open-issue
  // count; use POST /api/reports/:id/resolve when you have after-evidence to
  // also recover the spot's score.
  if (status === "Resolved" && wasOpen) {
    const spot = await Spot.findById(report.spot);
    if (spot) {
      spot.openIssues = Math.max(0, spot.openIssues - 1);
      await spot.save();
    }
  }

  res.json(serializeReport(report));
}

// POST /api/reports/:id/resolve  (multipart: afterPhoto)  (admin)
// Marks a report resolved with verified after-evidence and lets the spot's
// score recover in that category — this is the "Before/After Verification"
// feature from the project plan.
async function resolveWithEvidence(req, res) {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found." });
  if (!req.file) return res.status(400).json({ error: "An after-photo is required to verify resolution." });

  const spot = await Spot.findById(report.spot);
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const wasOpen = report.status !== "Resolved";

  report.afterPhotoUrl = publicUrlFor(req.file.filename);
  report.status = "Resolved";
  report.resolvedAt = new Date();
  await report.save();

  if (wasOpen) spot.openIssues = Math.max(0, spot.openIssues - 1);
  applyResolutionRecovery(spot, report.category);
  await spot.save();

  if (spot.score >= Number(process.env.ATTENTION_THRESHOLD || 40)) {
    await resolveIncidentsForSpot(spot);
  }

  res.json({
    report: serializeReport(report),
    spot: { id: spot._id, score: spot.score, statusLabel: spot.statusLabel() },
  });
}

module.exports = { createReport, getReport, updateStatus, resolveWithEvidence, serializeReport };
