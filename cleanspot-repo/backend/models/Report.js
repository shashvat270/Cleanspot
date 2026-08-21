const mongoose = require("mongoose");
const { REPORT_STATUSES, SEVERITIES } = require("../utils/constants");

const reportSchema = new mongoose.Schema(
  {
    spot: { type: mongoose.Schema.Types.ObjectId, ref: "Spot", required: true, index: true },

    category: { type: String, required: true },
    description: { type: String, default: "" },

    photoUrl: { type: String, required: true },
    beforePhotoUrl: { type: String, default: "" }, // snapshot of photoUrl at report time
    afterPhotoUrl: { type: String, default: "" },  // filled in on resolution

    // Where the report was filed from — used for basic GPS plausibility checks.
    location: {
      lat: Number,
      lng: Number,
    },

    reporterContact: { type: String, default: "" }, // optional, anonymous by default

    aiAnalysis: {
      detectedCategory: { type: String, default: "" },
      confidence: { type: Number, default: 0 }, // 0-100
      matchesUserCategory: { type: Boolean, default: null },
      provider: { type: String, default: "mock" },
    },

    severity: { type: String, enum: SEVERITIES, default: "medium" },
    status: { type: String, enum: REPORT_STATUSES, default: "Reported" },

    independentConfirmations: { type: Number, default: 0 }, // duplicate/independent reports of same issue

    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ spot: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
