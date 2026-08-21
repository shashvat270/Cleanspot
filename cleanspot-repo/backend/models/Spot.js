const mongoose = require("mongoose");

const spotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    address: { type: String, default: "" },

    // GeoJSON point — required for "nearby spots" queries.
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    categoryScores: {
      waste: { type: Number, default: 80, min: 0, max: 100 },
      toilet: { type: Number, default: 80, min: 0, max: 100 },
      general: { type: Number, default: 80, min: 0, max: 100 },
      water: { type: Number, default: 80, min: 0, max: 100 },
      area: { type: Number, default: 80, min: 0, max: 100 },
    },

    score: { type: Number, default: 80, min: 0, max: 100 },

    totalReports: { type: Number, default: 0 },
    openIssues: { type: Number, default: 0 },
    reportsToday: { type: Number, default: 0 },
    reportsTodayDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { timestamps: true }
);

spotSchema.index({ location: "2dsphere" });

// Keeps the reportsToday counter accurate across day boundaries without a cron job.
spotSchema.methods.rollDailyCounterIfNeeded = function rollDailyCounterIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  if (this.reportsTodayDate !== today) {
    this.reportsToday = 0;
    this.reportsTodayDate = today;
  }
};

spotSchema.methods.statusLabel = function statusLabel() {
  const good = Number(process.env.GOOD_THRESHOLD || 70);
  const attention = Number(process.env.ATTENTION_THRESHOLD || 40);
  if (this.score >= good) return "Good";
  if (this.score >= attention) return "Needs Attention";
  return "Critical";
};

module.exports = mongoose.model("Spot", spotSchema);
