const express = require('express');
const { User, Recipe, Ingredient, MealPlan, GroceryList } = require('../models');
const { protect, adminOnly, wrap } = require('../middleware/auth');
const { createError, ensureFound } = require('./helpers');

const router = express.Router();

router.use(protect, adminOnly);

router.get(
  '/stats',
  wrap(async (req, res) => {
    const [users, recipes, mealPlans, groceryLists] = await Promise.all([
      User.countDocuments(),
      Recipe.countDocuments(),
      MealPlan.countDocuments(),
      GroceryList.countDocuments(),
    ]);

    res.json({ users, recipes, mealPlans, groceryLists });
  })
);

router.get(
  '/users',
  wrap(async (req, res) => {
    const users = await User.find().sort('-createdAt');
    res.json(users);
  })
);

router.delete(
  '/users/:id',
  wrap(async (req, res) => {
    if (String(req.user._id) === req.params.id) {
      throw createError('You cannot delete yourself');
    }
    await User.deleteOne({ _id: req.params.id });
    res.status(204).end();
  })
);

router.post(
  '/recipes',
  wrap(async (req, res) => {
    const recipe = await Recipe.create(req.body);
    res.status(201).json(recipe);
  })
);

router.put(
  '/recipes/:id',
  wrap(async (req, res) => {
    const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(ensureFound(updated));
  })
);

router.delete(
  '/recipes/:id',
  wrap(async (req, res) => {
    await Recipe.findByIdAndDelete(req.params.id);
    res.status(204).end();
  })
);

router.get(
  '/ingredients',
  wrap(async (req, res) => {
    const ingredients = await Ingredient.find().sort('name');
    res.json(ingredients);
  })
);

router.post(
  '/ingredients',
  wrap(async (req, res) => {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json(ingredient);
  })
);

router.put(
  '/ingredients/:id',
  wrap(async (req, res) => {
    const updated = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(ensureFound(updated));
  })
);

router.delete(
  '/ingredients/:id',
  wrap(async (req, res) => {
    await Ingredient.findByIdAndDelete(req.params.id);
    res.status(204).end();
  })
);

router.get(
  '/categories',
  wrap(async (req, res) => {
    const categories = await Ingredient.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(categories);
  })
);

router.patch(
  '/categories/:name',
  wrap(async (req, res) => {
    if (!req.body.name) {
      throw createError('name is required');
    }
    const result = await Ingredient.updateMany(
      { category: req.params.name },
      { category: req.body.name }
    );
    res.json({ updated: result.modifiedCount });
  })
);

module.exports = router;
