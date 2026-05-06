const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

// 📡 THE RADAR: This will log every request to your terminal so you know it's working!
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] 📬 Received ${req.method} request to: ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB Successfully!'))
.catch((err) => console.log('❌ MongoDB Connection Error: ', err));

// Start Server - Hardcoded to 5001 to bypass Mac AirPlay blocks
const PORT = 5001; 
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Rural Jobs Backend is explicitly running on port ${PORT}`);
  console.log(`📡 Listening for frontend connections...`);
});