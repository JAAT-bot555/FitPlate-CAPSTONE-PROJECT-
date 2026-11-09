const express = require('express');
const { Ingredient, MealPlan, PantryItem, GroceryList } = require('../models');
const { protect, wrap } = require('../middleware/auth');
const { generateGrocery } = require('../services/grocery');
const { ensureFound } = require('./helpers');

const router = express.Router();

async function getCatalogMap() {
  const ingredients = await Ingredient.find();
  return Object.fromEntries(
    ingredients.map((item) => [item.name, { category: item.category, price: item.price }])
  );
}

router.post(
  '/grocery/generate',
  protect,
  wrap(async (req, res) => {
    const mealPlan = ensureFound(
      await MealPlan.findOne({
        _id: req.body.mealPlanId,
        userId: req.user._id,
      }).populate('days.meals.recipe'),
      'Meal plan not found'
    );

    const recipes = mealPlan.days.flatMap((day) => day.meals.map((meal) => meal.recipe));
    const [pantry, catalog] = await Promise.all([
      PantryItem.find({ userId: req.user._id }),
      getCatalogMap(),
    ]);

    const generated = generateGrocery(recipes, pantry, catalog);
    const groceryList = await GroceryList.create({
      userId: req.user._id,
      mealPlanId: mealPlan._id,
      ...generated,
    });

    res.status(201).json(groceryList);
  })
);

router.get(
  '/grocery',
  protect,
  wrap(async (req, res) => {
    const lists = await GroceryList.find({ userId: req.user._id }).sort('-createdAt');
    res.json(lists);
  })
);

router.patch(
  '/grocery/:id/items/:index',
  protect,
  wrap(async (req, res) => {
    const groceryList = ensureFound(
      await GroceryList.findOne({ _id: req.params.id, userId: req.user._id }),
      'Grocery list not found'
    );

    const idx = Number(req.params.index);
    const item = ensureFound(groceryList.items[idx], 'Item not found');

    item.purchased = Boolean(req.body.purchased);
    groceryList.markModified('items');
    await groceryList.save();

    res.json(groceryList);
  })
);

router.delete(
  '/grocery/:id',
  protect,
  wrap(async (req, res) => {
    await GroceryList.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.status(204).end();
  })
);

module.exports = router;
