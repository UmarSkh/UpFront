const express = require('express');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, credits: 50, otp, otpExpiry });
    } else {
      user.otp = otp;
      user.otpExpiry = otpExpiry;
    }
    await user.save();

    // Always log OTP to server console for dev convenience
    console.log(`[OTP] ${email} → ${otp}`);

    // Send OTP via Resend
    const apiKey = process.env.RESEND_API_KEY;
    let emailDelivered = false;

    if (!apiKey || apiKey === 'YOUR_RESEND_API_KEY_HERE') {
      // No API key configured
    } else {
      const resend = new Resend(apiKey);
      try {
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'UpFront <onboarding@resend.dev>',
          to: email,
          subject: 'Your UpFront Login OTP',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; width: 48px; height: 48px; border-radius: 12px; font-size: 24px; font-weight: bold; line-height: 48px; text-align: center;">U</div>
                <h2 style="margin: 12px 0 4px; color: #111827;">Your UpFront Login Code</h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Use this OTP to sign in to your account.</p>
              </div>
              <div style="background: #f5f3ff; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${otp}</span>
              </div>
              <p style="color: #6b7280; font-size: 13px; text-align: center;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
          `
        });
        if (!result.error) emailDelivered = true;
        else console.log(`[Resend blocked] ${result.error.message}`);
      } catch (sendErr) {
        console.log(`[Resend exception] ${sendErr.message}`);
      }
    }

    // In dev: if email not delivered, return the OTP directly so UI can show it
    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
      message: emailDelivered ? 'OTP sent to your email' : 'OTP generated',
      ...(isDev && !emailDelivered ? { devOtp: otp, devNote: 'Email delivery unavailable — use this OTP directly' } : {})
    });
  } catch (error) {
    console.error('OTP Request Error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isNewUser = !user.name;

    // Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;

    if (isNewUser) {
      user.name = `User_${Math.floor(Math.random() * 10000)}`;
      await Transaction.create({
        toUser: user._id,
        amount: 50,
        description: 'Initial signup bonus'
      });
    }
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwtkey',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture || null,
        credits: user.credits,
        role: user.role
      },
      isNewUser
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

module.exports = router;
