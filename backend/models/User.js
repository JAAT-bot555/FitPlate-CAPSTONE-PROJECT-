const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
    },
    dietaryPreference: {
      type: String,
      enum: ['any', 'vegetarian', 'vegan'],
      default: 'any',
    },
    fitnessGoal: {
      type: String,
      enum: ['weight-loss', 'weight-gain', 'muscle-gain', 'maintenance'],
      default: 'maintenance',
    },
    allergies: {
      type: [String],
      default: [],
    },
    dislikes: {
      type: [String],
      default: [],
    },
    preferredCuisine: {
      type: String,
    },
    budget: {
      type: Number,
      default: 1500,
    },
    cookingTime: {
      type: Number,
      default: 45,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);
