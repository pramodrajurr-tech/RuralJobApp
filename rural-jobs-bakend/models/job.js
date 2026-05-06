const mongoose = require('mongoose');

const ApplicantSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workerName: String,
  workerPhone: String,
  workerSkill: String,
  isVerified: Boolean,
  additionalInfo: String,
  status: { type: String, enum: ['Pending', 'Approved', 'Auto-Approved', 'Rejected'], default: 'Pending' }
});

const JobSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  adminPhone: { type: String, required: true }, // NEW: Added so the worker can contact the admin
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  tasks: [{ type: String }],
  pay: { type: String, required: true },
  level: { type: String, required: true },
  workersNeeded: { type: Number, required: true },
  hours: { type: String, required: true },
  applicants: [ApplicantSchema]
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);