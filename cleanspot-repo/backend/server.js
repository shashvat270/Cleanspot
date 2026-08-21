require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const spotRoutes = require("./routes/spots");
const reportRoutes = require("./routes/reports");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const driveRoutes = require("./routes/drives");

const app = express();

app.use(cors({
    origin: "https://cleanspot-seven.vercel.app",
  }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "cleanspot-api" }));

app.use("/api/spots", spotRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/drives", driveRoutes);

// Central error handler — catches multer errors (e.g. bad file type, size limit) too.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` }));

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] CleanSpot API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] Failed to start:", err.message);
    process.exit(1);
  });
