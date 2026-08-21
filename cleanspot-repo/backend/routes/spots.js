const express = require("express");
const router = express.Router();
const { listNearby, getSpotDetail, createSpot } = require("../controllers/spotController");
const { requireAuth } = require("../middleware/auth");

router.get("/", listNearby); // GET /api/spots?lat=&lng=
router.get("/:id", getSpotDetail); // GET /api/spots/:id

// Any logged-in authority can add a spot to monitor — tighten this to specific
// roles (e.g. requireRole("super_admin","state_authority")) if you introduce
// multiple admin accounts and want to restrict who can expand coverage.
router.post("/", requireAuth, createSpot);

module.exports = router;

