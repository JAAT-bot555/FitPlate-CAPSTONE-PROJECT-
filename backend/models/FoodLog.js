const { Schema, model, Types } = require('mongoose');

const foodLogSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipeId: {
      type: Types.ObjectId,
      ref: 'Recipe',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'snack', 'dinner'],
      required: true,
    },
    servings: {
      type: Number,
      required: true,
      min: 0.25,
      max: 20,
    },
    calories: {
      type: Number,
      min: 0,
      required: true,
    },
    protein: {
      type: Number,
      min: 0,
      required: true,
    },
    carbohydrates: {
      type: Number,
      min: 0,
      required: true,
    },
    fats: {
      type: Number,
      min: 0,
      required: true,
    },
    eatenAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

foodLogSchema.index({ userId: 1, eatenAt: -1 });

module.exports = model('FoodLog', foodLogSchema);
