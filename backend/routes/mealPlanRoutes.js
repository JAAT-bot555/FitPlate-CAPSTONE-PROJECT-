const express = require('express');
const { Recipe, MealPlan, PantryItem, GroceryList } = require('../models');
const { protect, wrap } = require('../middleware/auth');
const { generatePlan, totals, optimize } = require('../services/mealplan');
const { rank } = require('../services/recommend');
const { createError, ensureFound } = require('./helpers');

const router = express.Router();

async function persistMealPlan(userId, generatedDays, budget) {
  return MealPlan.create({
    userId,
    budget,
    days: generatedDays.map((day) => ({
      day: day.day,
      meals: day.meals.map((meal) => ({
        slot: meal.slot,
        recipe: meal.recipe._id,
      })),
    })),
    ...totals(generatedDays),
  });
}

async function getHydratedPlan(id, userId) {
  const plan = await MealPlan.findOne({ _id: id, userId }).populate('days.meals.recipe');
  return ensureFound(plan, 'Meal plan not found');
}

router.post(
  '/meal-plans/generate',
  protect,
  wrap(async (req, res) => {
    const { days = 3, meals, budget, maxTime } = req.body;
    const userProfile = req.user.toObject();

    if (!(days >= 1 && days <= 14)) {
      throw createError('days must be between 1 and 14');
    }

    userProfile.dietaryPreference = req.body.dietaryPreference || userProfile.dietaryPreference;
    userProfile.fitnessGoal = req.body.goal || userProfile.fitnessGoal;

    const [allRecipes, pantry] = await Promise.all([
      Recipe.find(),
      PantryItem.find({ userId: userProfile._id }),
    ]);

    const effectiveBudget = budget ?? userProfile.budget;
    const effectiveMaxTime = maxTime ?? userProfile.cookingTime;

    const generated = generatePlan(allRecipes, userProfile, {
      days,
      meals,
      budget: effectiveBudget,
      maxTime: effectiveMaxTime,
      pantry,
    });

    const savedDoc = await persistMealPlan(userProfile._id, generated, effectiveBudget);
    const populated = await getHydratedPlan(savedDoc._id, userProfile._id);

    res.status(201).json(populated);
  })
);

router.get(
  '/meal-plans',
  protect,
  wrap(async (req, res) => {
    const plans = await MealPlan.find({ userId: req.user._id }).sort('-startDate');
    res.json(plans);
  })
);

router.get(
  '/meal-plans/:id',
  protect,
  wrap(async (req, res) => {
    const plan = await getHydratedPlan(req.params.id, req.user._id);
    res.json(plan);
  })
);

router.get(
  '/meal-plans/:id/optimize',
  protect,
  wrap(async (req, res) => {
    const hydrated = (await getHydratedPlan(req.params.id, req.user._id)).toObject();
    const normalizedPlan = hydrated.days.map((day) => ({
      day: day.day,
      meals: day.meals.map((meal) => ({
        slot: meal.slot,
        recipe: meal.recipe,
      })),
    }));

    const allRecipes = await Recipe.find();
    const optimization = optimize(
      normalizedPlan,
      allRecipes,
      req.user.toObject(),
      hydrated.budget
    );

    res.json({
      budget: hydrated.budget,
      ...optimization,
    });
  })
);

router.get(
  '/meal-plans/:id/alternatives',
  protect,
  wrap(async (req, res) => {
    const mealPlan = ensureFound(
      await MealPlan.findOne({ _id: req.params.id, userId: req.user._id }),
      'Meal plan not found'
    );

    const { slot } = req.query;
    if (!slot) {
      throw createError('slot is required');
    }

    const usedRecipeIds = new Set(
      mealPlan.days.flatMap((day) => day.meals.map((meal) => String(meal.recipe)))
    );

    const [pantryItems, slotRecipes] = await Promise.all([
      PantryItem.find({ userId: req.user._id }),
      Recipe.find({ category: slot }),
    ]);

    const pantryNames = new Set(pantryItems.map((item) => item.ingredient.toLowerCase()));
    const availableRecipes = slotRecipes.filter(
      (recipe) => !usedRecipeIds.has(String(recipe._id))
    );

    const ranked = rank(availableRecipes, req.user.toObject(), { pantryNames });
    const topAlternatives = ranked.slice(0, 6).map((entry) => ({
      ...entry.recipe.toObject(),
      score: entry.score,
    }));

    res.json(topAlternatives);
  })
);

router.patch(
  '/meal-plans/:id/replace',
  protect,
  wrap(async (req, res) => {
    const { day, slot, recipeId } = req.body;
    const mealPlan = ensureFound(
      await MealPlan.findOne({ _id: req.params.id, userId: req.user._id }),
      'Meal plan not found'
    );

    const dayEntry = mealPlan.days.find((d) => d.day === day);
    const mealSlot = ensureFound(
      dayEntry && dayEntry.meals.find((m) => m.slot === slot),
      'Meal slot not found'
    );

    ensureFound(await Recipe.exists({ _id: recipeId }), 'Recipe not found');

    mealSlot.recipe = recipeId;
    await mealPlan.save();

    const hydrated = await getHydratedPlan(mealPlan._id, req.user._id);
    Object.assign(mealPlan, totals(hydrated.toObject().days));
    await mealPlan.save();

    res.json(await getHydratedPlan(mealPlan._id, req.user._id));
  })
);

router.patch(
  '/meal-plans/:id/complete',
  protect,
  wrap(async (req, res) => {
    const mealPlan = ensureFound(
      await MealPlan.findOne({ _id: req.params.id, userId: req.user._id }),
      'Meal plan not found'
    );

    const dayEntry = mealPlan.days.find((d) => d.day === req.body.day);
    const mealSlot = ensureFound(
      dayEntry && dayEntry.meals.find((m) => m.slot === req.body.slot),
      'Meal slot not found'
    );

    mealSlot.completed = Boolean(req.body.completed);
    await mealPlan.save();

    res.json({
      ok: true,
      completed: mealSlot.completed,
    });
  })
);

router.delete(
  '/meal-plans/:id',
  protect,
  wrap(async (req, res) => {
    await MealPlan.deleteOne({ _id: req.params.id, userId: req.user._id });
    await GroceryList.deleteMany({ mealPlanId: req.params.id, userId: req.user._id });
    res.status(204).end();
  })
);

module.exports = router;
