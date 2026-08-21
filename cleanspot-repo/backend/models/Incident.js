const mongoose = require("mongoose");
const { AUTHORITY_LEVELS } = require("../utils/constants");

const incidentSchema = new mongoose.Schema(
  {
    spot: { type: mongoose.Schema.Types.ObjectId, ref: "Spot", required: true, index: true },
    relatedReports: [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],

    severity: { type: String, enum: ["MEDIUM", "HIGH"], default: "HIGH" },
    authorityLevel: { type: String, enum: AUTHORITY_LEVELS, default: "Local" },
    status: { type: String, enum: ["Open", "ActionTaken", "Resolved"], default: "Open" },

    firstReportedAt: { type: Date, default: Date.now },
    escalatedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Incident", incidentSchema);
