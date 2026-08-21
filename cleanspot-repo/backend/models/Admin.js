const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["local_authority", "district_authority", "state_authority", "super_admin"],
      default: "local_authority",
    },
    assignedSpots: [{ type: mongoose.Schema.Types.ObjectId, ref: "Spot" }],
  },
  { timestamps: true }
);

adminSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

module.exports = mongoose.model("Admin", adminSchema);
