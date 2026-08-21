const express = require("express");
const router = express.Router();
const { dashboard, listIncidents, updateIncident } = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth); // every route below requires a logged-in authority/admin

router.get("/dashboard", dashboard);
router.get("/incidents", listIncidents);
router.patch("/incidents/:id", updateIncident);

module.exports = router;
