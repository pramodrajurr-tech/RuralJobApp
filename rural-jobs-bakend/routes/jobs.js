const express = require('express');
const Job = require('../models/Job');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newJob = new Job(req.body);
    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/apply', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const hasApplied = job.applicants.some(app => app.workerId.toString() === req.body.workerId);
    if (hasApplied) return res.status(400).json({ message: "You already applied for this job." });

    job.applicants.push(req.body);
    const updatedJob = await job.save();
    res.status(200).json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:jobId/approve/:workerId', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    const applicant = job.applicants.find(app => app.workerId.toString() === req.params.workerId);
    if (applicant) {
      applicant.status = 'Approved';
      await job.save();
      res.status(200).json(job);
    } else {
      res.status(404).json({ message: "Applicant not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: Reject Route
router.patch('/:jobId/reject/:workerId', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    const applicant = job.applicants.find(app => app.workerId.toString() === req.params.workerId);
    if (applicant) {
      applicant.status = 'Rejected';
      await job.save();
      res.status(200).json(job);
    } else {
      res.status(404).json({ message: "Applicant not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;