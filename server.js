const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
const verifyToken = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // optional, for form data

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// ================= User Schema =================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date }
});

const User = mongoose.model("User", userSchema);

// ================= Notes Schema =================
const noteSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);
const Note = mongoose.model('Note', noteSchema);

// ================= Nodemailer Setup =================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= Auth Routes =================
const OtpVerificationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
}, { timestamps: true });


const OtpVerification = mongoose.model('OtpVerification', OtpVerificationSchema);

app.get('/ping', (req, res) => {
  console.log('Ping received at', new Date().toLocaleTimeString());
  res.send('pong');
});

// ================= Registration =================
app.post('/register/send-otp', async (req, res) => {
  const { name, dob, email } = req.body;
  // console.log("Incoming request body:", req.body);
  try {
    let user = await User.findOne({ email });

    // If user exists and is verified
    if (user && user.isVerified) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (!user) {
      // Create new user with OTP
      user = new User({
        name,
        dob,
        email,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000)
      });
    } else {
      // Update OTP for existing unverified user
      user.name = name;
      user.dob = dob;
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    }

    await user.save();

    // Send OTP via email
    await transporter.sendMail({
      from: `"NoteWallet Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "NoteWallet - Verify your account",
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP is <b>${otp}</b>. It is valid for 10 minutes.</p>`
    });

    res.status(201).json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    console.error("Error in /register/send-otp:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/register/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'No user found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

    // Validate OTP
    if ((user.otp || '').trim() !== String(otp).trim())
      return res.status(400).json({ message: 'Invalid OTP' });

    // Check OTP expiry
    if (new Date() > new Date(user.otpExpires))
      return res.status(400).json({ message: 'OTP expired' });

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret_key",
      { expiresIn: "1h" }
    );

    return res.json({
      success: true,
      message: "Account created successfully!",
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/login/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isVerified) return res.status(403).json({ message: 'Registration incomplete: verify your email to activate your account.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your login OTP - NoteWallet',
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/login/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first' });

    if (user.otp !== otp || user.otpExpires < Date.now())
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });

    res.json({ success: true, message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ================= Notes Routes =================
// Get all notes of logged in user
app.get('/notes', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const notes = await Note.find({ userEmail: user.email }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

// Add a new note
app.post('/notes', verifyToken, async (req, res) => {
  console.log("Incoming content:", req.body.content);
  console.log("UserId from token:", req.userId);

  const { content } = req.body;
  try {
    const user = await User.findById(req.userId);
    console.log("Fetched user:", user);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const note = await Note.create({ userEmail: user.email, content });
    res.status(201).json(note);
  } catch (err) {
    console.error("Error in /notes:", err);
    res.status(500).json({ message: 'Error creating note' });
  }
});

// Delete note
app.delete('/notes/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const note = await Note.findById(id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const user = await User.findById(req.userId);
    if (note.userEmail !== user.email)
      return res.status(403).json({ message: 'Unauthorized' });

    await Note.findByIdAndDelete(id);
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting note' });
  }
});

// ================= Server Start =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

mongoose.connection.on('connected', () => {
  console.log(`✅ Connected to MongoDB database: ${mongoose.connection.name}`);
});
