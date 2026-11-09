const { Schema, model, Types } = require('mongoose');

const groceryItemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
    },
    required: {
      type: Number,
      min: 0,
      required: true,
    },
    quantity: {
      type: Number,
      min: 0,
      required: true,
    },
    category: {
      type: String,
      default: 'Other',
    },
    estimatedCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    purchased: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const groceryListSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mealPlanId: {
      type: Types.ObjectId,
      ref: 'MealPlan',
      required: true,
    },
    items: [groceryItemSchema],
    totalEstimatedCost: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

groceryListSchema.index({ userId: 1, createdAt: -1 });
groceryListSchema.index({ userId: 1, mealPlanId: 1 });

module.exports = model('GroceryList', groceryListSchema);
