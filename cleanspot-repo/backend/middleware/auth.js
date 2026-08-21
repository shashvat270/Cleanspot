const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Verifies the Bearer token and attaches req.admin. Use on any route that
// only local/district/state authorities or super-admins should reach.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub).select("-passwordHash");
    if (!admin) return res.status(401).json({ error: "Token is valid but the account no longer exists." });
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Restricts a route to specific admin roles, e.g. requireRole("state_authority", "super_admin").
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: "Not authenticated." });
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: `This action requires one of: ${roles.join(", ")}.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
