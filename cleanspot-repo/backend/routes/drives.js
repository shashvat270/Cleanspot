const express = require("express");
const router = express.Router();
const { listDrives, createDrive, joinDrive } = require("../controllers/driveController");
const { requireAuth } = require("../middleware/auth");

router.get("/", listDrives);
router.post("/", requireAuth, createDrive); // organizing a drive goes through an authority/admin
router.post("/:id/join", joinDrive); // joining is open to any tourist

module.exports = router;
