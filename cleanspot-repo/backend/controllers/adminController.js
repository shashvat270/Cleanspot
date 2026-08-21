const Spot = require("../models/Spot");
const Report = require("../models/Report");
const Incident = require("../models/Incident");

// GET /api/admin/dashboard
async function dashboard(req, res) {
  const goodThreshold = Number(process.env.GOOD_THRESHOLD || 70);
  const attentionThreshold = Number(process.env.ATTENTION_THRESHOLD || 40);

  const spots = await Spot.find();
  const good = spots.filter((s) => s.score >= goodThreshold).length;
  const attention = spots.filter((s) => s.score >= attentionThreshold && s.score < goodThreshold).length;
  const critical = spots.filter((s) => s.score < attentionThreshold).length;

  const totalReports = spots.reduce((a, s) => a + s.totalReports, 0);
  const openIssues = spots.reduce((a, s) => a + s.openIssues, 0);

  res.json({
    totalSpots: spots.length,
    good,
    attention,
    critical,
    totalReports,
    openIssues,
    resolvedIssues: totalReports - openIssues,
    spots: spots
      .sort((a, b) => a.score - b.score)
      .map((s) => ({
        id: s._id,
        name: s.name,
        score: s.score,
        statusLabel: s.statusLabel(),
        openIssues: s.openIssues,
        totalReports: s.totalReports,
      })),
  });
}

// GET /api/admin/incidents
async function listIncidents(req, res) {
  const incidents = await Incident.find({ status: { $ne: "Resolved" } })
    .populate("spot", "name score")
    .sort({ escalatedAt: -1 });

  res.json(
    incidents.map((i) => ({
      id: i._id,
      spot: i.spot ? { id: i.spot._id, name: i.spot.name, score: i.spot.score } : null,
      severity: i.severity,
      authorityLevel: i.authorityLevel,
      status: i.status,
      relatedReportCount: i.relatedReports.length,
      firstReportedAt: i.firstReportedAt,
      escalatedAt: i.escalatedAt,
      notes: i.notes,
    }))
  );
}

// PATCH /api/admin/incidents/:id  body: { status? , authorityLevel? , notes? }
async function updateIncident(req, res) {
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found." });

  const { status, authorityLevel, notes } = req.body;
  if (status) incident.status = status;
  if (authorityLevel) incident.authorityLevel = authorityLevel;
  if (notes) incident.notes += `\n${notes}`;
  if (status === "Resolved") incident.resolvedAt = new Date();

  await incident.save();
  res.json(incident);
}

module.exports = { dashboard, listIncidents, updateIncident };
