const express = require("express");
const router = express.Router();
const { createReport, getReport, updateStatus, resolveWithEvidence } = require("../controllers/reportController");
const { upload } = require("../middleware/upload");
const { requireAuth } = require("../middleware/auth");

router.post("/", upload.single("photo"), createReport); // tourist-facing, no auth required
router.get("/:id", getReport);

router.patch("/:id/status", requireAuth, updateStatus); // admin advances the status pipeline
router.post("/:id/resolve", requireAuth, upload.single("afterPhoto"), resolveWithEvidence);

module.exports = router;
