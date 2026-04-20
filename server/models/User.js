const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String }, // Name can be set later after initial OTP login
  email: { type: String, required: true, unique: true },
  picture: { type: String },
  credits: { type: Number, default: 50 },
  role: { type: String, enum: ['User', 'Admin'], default: 'User' },
  otp: { type: String },
  otpExpiry: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
