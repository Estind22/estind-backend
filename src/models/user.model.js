// models/user.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema({
  active: { type: Boolean, default: true },
  status: { type: String, enum: ["active", "deleted", "blocked", "inactive"], default: "active" },

  uniqueId: { type: String, required: true }, // unique id for every user

  // Auth
  passwordHash: { type: String, required: true },

  // Profile
  name: { type: String, required: true },
  email: { type: String },
  phoneNo: { type: String, required: true },
  profilePhoto: { type: String },
  // address: { type: Schema.Types.ObjectId, ref: 'Address' },

  // Role/Designation
  role: { type: String, enum: ['admin', 'employee', 'keyman'], default: 'employee' },
  designation: { type: String },
  city: { type: Schema.Types.ObjectId, ref: 'City', default: null },

  // Permissions
  permissions: [{ type: String }],

}, { timestamps: true });

// Indexes
UserSchema.index({ uniqueId: 1 }, { unique: true });

const User = mongoose.model("User", UserSchema);

export default User;
