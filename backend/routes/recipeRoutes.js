const express = require('express');
const { Recipe, Ingredient, Favorite } = require('../models');
const { protect, wrap } = require('../middleware/auth');
const { ask } = require('../services/assistant');
const { createError, ensureFound } = require('./helpers');

const router = express.Router();

router.get(
  '/recipes',
  protect,
  wrap(async (req, res) => {
    const {
      q,
      cuisine,
      tag,
      category,
      maxTime,
      maxCalories,
      maxCost,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = new RegExp(escaped, 'i');
    }
    if (cuisine) filter.cuisine = cuisine;
    if (tag) filter.dietaryTags = tag;
    if (category) filter.category = category;
    if (maxTime) filter.cookingTime = { $lte: Number(maxTime) };
    if (maxCalories) filter.calories = { $lte: Number(maxCalories) };
    if (maxCost) filter.estimatedCost = { $lte: Number(maxCost) };

    const sortOptions = {
      cost: { estimatedCost: 1 },
      protein: { protein: -1 },
    };
    const sortBy = sortOptions[sort] || { name: 1 };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [items, total] = await Promise.all([
      Recipe.find(filter)
        .sort(sortBy)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Recipe.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
    });
  })
);

router.get(
  '/recipes/:id',
  protect,
  wrap(async (req, res) => {
    const recipe = ensureFound(
      await Recipe.findById(req.params.id),
      'Recipe not found'
    );
    res.json(recipe);
  })
);

router.get(
  '/ingredients',
  protect,
  wrap(async (req, res) => {
    const ingredients = await Ingredient.find().sort('name');
    res.json(ingredients);
  })
);

router.get(
  '/favorites',
  protect,
  wrap(async (req, res) => {
    const favorites = await Favorite.find({ userId: req.user._id }).populate('recipeId');
    res.json(favorites);
  })
);

router.post(
  '/favorites/:recipeId',
  protect,
  wrap(async (req, res) => {
    const favorite = await Favorite.findOneAndUpdate(
      { userId: req.user._id, recipeId: req.params.recipeId },
      {},
      { upsert: true, new: true }
    );
    res.status(201).json(favorite);
  })
);

router.delete(
  '/favorites/:recipeId',
  protect,
  wrap(async (req, res) => {
    await Favorite.deleteOne({
      userId: req.user._id,
      recipeId: req.params.recipeId,
    });
    res.status(204).end();
  })
);

router.post(
  '/assistant',
  protect,
  wrap(async (req, res) => {
    const query = String(req.body.message || '').trim();
    if (!query) {
      throw createError('message is required');
    }

    const [recipeDocs, ingredientDocs] = await Promise.all([
      Recipe.find(),
      Ingredient.find(),
    ]);

    const recipes = recipeDocs.map((doc) => doc.toObject());
    const catalogNames = ingredientDocs.map((ing) => ing.name);

    const response = await ask(query, recipes, req.user.toObject(), catalogNames);
    res.json(response);
  })
);

module.exports = router;
