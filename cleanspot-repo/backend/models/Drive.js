const mongoose = require("mongoose");

const driveSchema = new mongoose.Schema(
  {
    spot: { type: mongoose.Schema.Types.ObjectId, ref: "Spot", required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    timeLabel: { type: String, default: "" }, // e.g. "8:00 AM"

    interestedCount: { type: Number, default: 0 },
    joinedContacts: [{ type: String }], // simple list of names/emails, no auth required to join

    beforePhotoUrl: { type: String, default: "" },
    afterPhotoUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drive", driveSchema);
