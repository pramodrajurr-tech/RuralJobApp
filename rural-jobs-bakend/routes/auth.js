const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const User = require('../models/User');
const router = express.Router();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const otpCache = new Map();

// 1. Send OTP for Registration
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ message: "Phone number already registered. Please log in." });

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    await client.messages.create({
      body: `Your Rural Jobs verification code is: ${generatedOtp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    otpCache.set(phone, { code: generatedOtp, expiry: Date.now() + 10 * 60 * 1000 });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Twilio Error. Ensure your number is verified." });
  }
});

// 2. Verify OTP & Register
router.post('/register', async (req, res) => {
  try {
    const { phone, otp, password, role, name, age, village, skill, experience, certificate, company } = req.body;

    const cachedOtp = otpCache.get(phone);
    if (!cachedOtp || cachedOtp.code !== String(otp) || Date.now() > cachedOtp.expiry) {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }
    otpCache.delete(phone);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const isVerified = (certificate && certificate.trim().length > 0) ? true : false;

    const newUser = new User({ phone, password: hashedPassword, role, name, age, village, skill, experience, certificate, isVerified, company });
    const savedUser = await newUser.save();
    
    const token = jwt.sign({ id: savedUser._id, role: savedUser.role }, process.env.JWT_SECRET);
    res.status(201).json({ token, user: savedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Login (STRICT ROLE CHECK ADDED)
router.post('/login', async (req, res) => {
  try {
    const { phone, password, role } = req.body;
    
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found." });

    // STRICT ROLE SEPARATION: Worker cannot log in as Admin, and vice versa
    if (user.role !== role) {
      return res.status(403).json({ message: `Account found, but it is registered as a ${user.role}. Please switch tabs.` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password." });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Send OTP for Forgot Password
router.post('/send-forgot-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const existingUser = await User.findOne({ phone });
    if (!existingUser) return res.status(404).json({ message: "No account found with this phone number." });

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    await client.messages.create({
      body: `Your password reset code is: ${generatedOtp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    otpCache.set(phone, { code: generatedOtp, expiry: Date.now() + 10 * 60 * 1000 });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Error sending reset OTP." });
  }
});

// 5. Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    const cachedOtp = otpCache.get(phone);
    if (!cachedOtp || cachedOtp.code !== String(otp) || Date.now() > cachedOtp.expiry) {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }
    otpCache.delete(phone);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findOneAndUpdate({ phone }, { password: hashedPassword });
    res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;