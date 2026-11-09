const { Schema, model } = require('mongoose');

const recipeIngredientSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
    },
    unit: {
      type: String,
    },
  },
  { _id: true }
);

const recipeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  cuisine: {
    type: String,
  },
  category: {
    type: String,
    enum: ['breakfast', 'lunch', 'snack', 'dinner'],
    required: true,
  },
  ingredients: [recipeIngredientSchema],
  instructions: {
    type: [String],
    default: [],
  },
  cookingTime: {
    type: Number,
  },
  calories: {
    type: Number,
  },
  protein: {
    type: Number,
  },
  carbohydrates: {
    type: Number,
  },
  fats: {
    type: Number,
  },
  estimatedCost: {
    type: Number,
  },
  dietaryTags: {
    type: [String],
    default: [],
  },
  image: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model('Recipe', recipeSchema);
