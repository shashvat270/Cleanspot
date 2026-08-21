require("dotenv").config();
const connectDB = require("../config/db");
const Spot = require("../models/Spot");
const Report = require("../models/Report");
const Incident = require("../models/Incident");
const Admin = require("../models/Admin");
const Drive = require("../models/Drive");

// Roughly the Pune region, matching the frontend prototype's mock spots.
const SAMPLE_SPOTS = [
  { name: "Riverside Ghat", coords: [73.8567, 18.5204], scores: { waste: 28, toilet: 22, general: 40, water: 35, area: 38 } },
  { name: "Hilltop Fort View", coords: [73.8700, 18.5300], scores: { waste: 80, toilet: 74, general: 82, water: 76, area: 79 } },
  { name: "Old Town Market Square", coords: [73.8450, 18.5100], scores: { waste: 60, toilet: 44, general: 55, water: 66, area: 60 } },
  { name: "Botanical Gardens", coords: [73.8900, 18.5400], scores: { waste: 90, toilet: 85, general: 89, water: 87, area: 88 } },
  { name: "Lakeview Promenade", coords: [73.8300, 18.5000], scores: { waste: 40, toilet: 38, general: 48, water: 50, area: 47 } },
  { name: "Cliffside Viewpoint", coords: [73.9000, 18.4900], scores: { waste: 20, toilet: 15, general: 28, water: 26, area: 31 } },
];

async function run() {
  await connectDB();

  console.log("Clearing existing demo data...");
  await Promise.all([Spot.deleteMany({}), Report.deleteMany({}), Incident.deleteMany({}), Drive.deleteMany({})]);

  console.log("Creating spots...");
  const spots = [];
  for (const s of SAMPLE_SPOTS) {
    const avg = Math.round(Object.values(s.scores).reduce((a, b) => a + b, 0) / 5);
    const spot = await Spot.create({
      name: s.name,
      description: `${s.name} — sample tourist spot for demo purposes.`,
      address: "Pune, Maharashtra",
      location: { type: "Point", coordinates: s.coords },
      categoryScores: s.scores,
      score: avg,
      totalReports: Math.round((100 - avg) / 2),
      openIssues: avg < 40 ? 6 : avg < 70 ? 3 : 0,
      reportsToday: avg < 40 ? 12 : avg < 70 ? 5 : 0,
    });
    spots.push(spot);
  }

  console.log("Creating an admin login (email: admin@cleanspot.local / password: cleanspot123)...");
  const passwordHash = await Admin.hashPassword("cleanspot123");
  await Admin.create({
    name: "Local Sanitation Authority",
    email: "admin@cleanspot.local",
    passwordHash,
    role: "local_authority",
  });

  console.log("Creating a sample community drive...");
  const riverside = spots.find((s) => s.name === "Riverside Ghat");
  await Drive.create({
    spot: riverside._id,
    title: "Riverside Ghat Saturday Clean-Up",
    date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    timeLabel: "8:00 AM",
    interestedCount: 27,
  });

  console.log("Done. Run `npm run dev` to start the API.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
