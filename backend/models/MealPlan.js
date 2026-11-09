const { Schema, model, Types } = require('mongoose');

const mealSlotSchema = new Schema(
  {
    slot: {
      type: String,
    },
    recipe: {
      type: Types.ObjectId,
      ref: 'Recipe',
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const dayPlanSchema = new Schema(
  {
    day: {
      type: Number,
    },
    meals: [mealSlotSchema],
  },
  { _id: true }
);

const mealPlanSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    budget: {
      type: Number,
    },
    days: [dayPlanSchema],
    totalCalories: {
      type: Number,
    },
    totalProtein: {
      type: Number,
    },
    totalCarbs: {
      type: Number,
    },
    totalFats: {
      type: Number,
    },
    estimatedCost: {
      type: Number,
    },
  },
  { timestamps: true }
);

mealPlanSchema.index({ userId: 1, startDate: -1 });

module.exports = model('MealPlan', mealPlanSchema);
