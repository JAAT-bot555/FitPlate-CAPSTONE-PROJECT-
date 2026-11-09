const { Schema, model, Types } = require('mongoose');

const pantryItemSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ingredient: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 0,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

pantryItemSchema.index({ userId: 1, ingredient: 1 });

module.exports = model('PantryItem', pantryItemSchema);
