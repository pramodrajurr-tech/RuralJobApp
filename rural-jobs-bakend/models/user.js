const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Worker', 'Admin'], required: true },
  name: { type: String, required: true },
  
  // Worker Specific Fields
  age: { type: Number },
  village: { type: String },
  skill: { type: String },
  experience: { type: String },
  certificate: { type: String },
  isVerified: { type: Boolean, default: false },

  // Admin Specific Fields
  company: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);