const Spot = require("../models/Spot");
const Report = require("../models/Report");

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function serializeSpot(spot, distanceKm) {
  return {
    id: spot._id,
    name: spot.name,
    description: spot.description,
    address: spot.address,
    location: { lat: spot.location.coordinates[1], lng: spot.location.coordinates[0] },
    score: spot.score,
    statusLabel: spot.statusLabel(),
    categoryScores: spot.categoryScores,
    reportsToday: spot.reportsToday,
    openIssues: spot.openIssues,
    totalReports: spot.totalReports,
    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : undefined,
  };
}

// GET /api/spots?lat=&lng=&radiusKm=
async function listNearby(req, res) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = parseFloat(req.query.radiusKm) || 25;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    // No location provided — fall back to returning all spots, unsorted by distance.
    const spots = await Spot.find().sort({ score: 1 }).limit(50);
    return res.json(spots.map((s) => serializeSpot(s)));
  }

  const spots = await Spot.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(50);

  if (!spots.length) {
    // Nothing within range (e.g. demo data lives in a different city than the
    // user's real/fallback location) — better UX to show something than an
    // empty screen. Distances are omitted since they'd be misleading.
    const allSpots = await Spot.find().sort({ score: 1 }).limit(50);
    return res.json(allSpots.map((s) => serializeSpot(s)));
  }

  const withDistance = spots.map((s) =>
    serializeSpot(s, haversineKm(lat, lng, s.location.coordinates[1], s.location.coordinates[0]))
  );
  res.json(withDistance);
}

// GET /api/spots/:id
async function getSpotDetail(req, res) {
  const spot = await Spot.findById(req.params.id);
  if (!spot) return res.status(404).json({ error: "Spot not found." });

  const recentReports = await Report.find({ spot: spot._id }).sort({ createdAt: -1 }).limit(20);

  res.json({
    ...serializeSpot(spot),
    recentReports: recentReports.map((r) => ({
      id: r._id,
      category: r.category,
      status: r.status,
      severity: r.severity,
      photoUrl: r.photoUrl,
      createdAt: r.createdAt,
      aiAnalysis: r.aiAnalysis,
    })),
  });
}

// POST /api/spots  (admin — add a new tourist spot to monitor)
async function createSpot(req, res) {
  const { name, description, address, lat, lng } = req.body;
  if (!name || lat == null || lng == null) {
    return res.status(400).json({ error: "name, lat, and lng are required." });
  }
  const spot = await Spot.create({
    name,
    description,
    address,
    location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
  });
  res.status(201).json(serializeSpot(spot));
}

module.exports = { listNearby, getSpotDetail, createSpot, serializeSpot };
