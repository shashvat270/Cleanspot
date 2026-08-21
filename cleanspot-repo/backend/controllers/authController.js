const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

function signToken(admin) {
  return jwt.sign({ sub: admin._id, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

// POST /api/auth/login  body: { email, password }
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required." });

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) return res.status(401).json({ error: "Invalid email or password." });

  const ok = await admin.checkPassword(password);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });

  res.json({
    token: signToken(admin),
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
}

// POST /api/auth/register  body: { name, email, password, role }
// In production, gate this behind a super_admin-only route rather than
// leaving it open — left simple here for the hackathon/dev setup.
async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required." });
  }
  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  const passwordHash = await Admin.hashPassword(password);
  const admin = await Admin.create({ name, email: email.toLowerCase(), passwordHash, role });

  res.status(201).json({
    token: signToken(admin),
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
}

module.exports = { login, register };
