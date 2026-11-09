const { Schema, model } = require('mongoose');

const ingredientSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  category: {
    type: String,
  },
  price: {
    type: Number,
  },
});

module.exports = model('Ingredient', ingredientSchema);
