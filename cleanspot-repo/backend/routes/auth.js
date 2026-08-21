const express = require("express");
const router = express.Router();
const { login, register } = require("../controllers/authController");

router.post("/login", login);
router.post("/register", register); // consider locking this down in production, see comment in controller

module.exports = router;
