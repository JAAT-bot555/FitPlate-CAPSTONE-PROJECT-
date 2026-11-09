const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { protect, wrap } = require('../middleware/auth');
const { createError, pickFields } = require('./helpers');

const router = express.Router();

const PROFILE_FIELDS = [
  'name',
  'age',
  'gender',
  'dietaryPreference',
  'fitnessGoal',
  'allergies',
  'dislikes',
  'preferredCuisine',
  'budget',
  'cookingTime',
];

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.post(
  '/auth/register',
  wrap(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !/^\S+@\S+\.\S+$/.test(email || '')) {
      throw createError('Valid name and email are required');
    }

    if (!password || password.length < 8) {
      throw createError('Password must be at least 8 characters');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError('Email already registered', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      ...pickFields(req.body, PROFILE_FIELDS),
      email,
      password: hashedPassword,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      token: signToken(user),
      user: userObj,
    });
  })
);

router.post(
  '/auth/login',
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      throw createError('Invalid email or password', 401);
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      token: signToken(user),
      user: userObj,
    });
  })
);

router.get('/auth/me', protect, (req, res) => {
  res.json(req.user);
});

router.put(
  '/users/profile',
  protect,
  wrap(async (req, res) => {
    Object.assign(req.user, pickFields(req.body, PROFILE_FIELDS));
    await req.user.save();
    res.json(req.user);
  })
);

router.put(
  '/users/password',
  protect,
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      throw createError('New password must be at least 8 characters');
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword || '', user.password);

    if (!isMatch) {
      throw createError('Current password is incorrect', 401);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ ok: true });
  })
);

module.exports = router;
