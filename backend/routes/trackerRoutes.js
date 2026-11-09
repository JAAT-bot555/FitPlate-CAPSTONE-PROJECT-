const express = require('express');
const { Recipe, MealPlan, PantryItem, GroceryList, FoodLog, BodyMetric } = require('../models');
const { protect, wrap } = require('../middleware/auth');
const { createError, ensureFound } = require('./helpers');

const router = express.Router();
const TRACKER_CATEGORIES = ['breakfast', 'lunch', 'snack', 'dinner'];

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError('Date must use YYYY-MM-DD format');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createError('Date is invalid');
  }
  return date;
}

function parseNumericField(value, label, min, max, required = false) {
  if (value === undefined || value === '') {
    if (required) {
      throw createError(`${label} is required`);
    }
    return undefined;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    throw createError(`${label} must be between ${min} and ${max}`);
  }
  return num;
}

router.get(
  '/tracker',
  protect,
  wrap(async (req, res) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultFromStr = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

    const fromDate = parseDateOnly(req.query.from || defaultFromStr);
    const toDate = parseDateOnly(req.query.to || todayStr);

    if (fromDate > toDate) {
      throw createError('from must be on or before to');
    }

    const endExclusive = new Date(toDate.getTime() + 86400000);
    const dateRange = { $gte: fromDate, $lt: endExclusive };

    const [foodLogs, bodyMetrics] = await Promise.all([
      FoodLog.find({ userId: req.user._id, eatenAt: dateRange }).sort({
        eatenAt: -1,
        createdAt: -1,
      }),
      BodyMetric.find({ userId: req.user._id, measuredAt: dateRange }).sort({
        measuredAt: 1,
      }),
    ]);

    res.json({ foodLogs, bodyMetrics });
  })
);

router.post(
  '/tracker/foods',
  protect,
  wrap(async (req, res) => {
    const { recipeId, date, category } = req.body;
    const servings = parseNumericField(req.body.servings, 'Servings', 0.25, 20, true);

    if (!TRACKER_CATEGORIES.includes(category)) {
      throw createError('Choose a valid meal type');
    }

    const recipe = ensureFound(await Recipe.findById(recipeId), 'Recipe not found');
    const eatenAt = parseDateOnly(date);
    const scaleNutrient = (key) => Math.round((recipe[key] || 0) * servings * 10) / 10;

    const log = await FoodLog.create({
      userId: req.user._id,
      recipeId: recipe._id,
      name: recipe.name,
      category,
      servings,
      eatenAt,
      calories: scaleNutrient('calories'),
      protein: scaleNutrient('protein'),
      carbohydrates: scaleNutrient('carbohydrates'),
      fats: scaleNutrient('fats'),
    });

    res.status(201).json(log);
  })
);

router.delete(
  '/tracker/foods/:id',
  protect,
  wrap(async (req, res) => {
    const result = await FoodLog.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!result.deletedCount) {
      throw createError('Food log not found', 404);
    }
    res.status(204).end();
  })
);

router.post(
  '/tracker/body',
  protect,
  wrap(async (req, res) => {
    const { date } = req.body;
    const entry = await BodyMetric.create({
      userId: req.user._id,
      measuredAt: parseDateOnly(date),
      weightKg: parseNumericField(req.body.weightKg, 'Weight', 1, 1000, true),
      muscleMassKg: parseNumericField(req.body.muscleMassKg, 'Muscle mass', 0, 1000),
      bodyFatPct: parseNumericField(req.body.bodyFatPct, 'Body fat', 0, 100),
      waistCm: parseNumericField(req.body.waistCm, 'Waist', 1, 300),
      notes: String(req.body.notes || '').trim(),
    });

    res.status(201).json(entry);
  })
);

router.delete(
  '/tracker/body/:id',
  protect,
  wrap(async (req, res) => {
    const result = await BodyMetric.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!result.deletedCount) {
      throw createError('Body measurement not found', 404);
    }
    res.status(204).end();
  })
);

router.get(
  '/dashboard',
  protect,
  wrap(async (req, res) => {
    const [plans, lists, pantryCount] = await Promise.all([
      MealPlan.find({ userId: req.user._id }).sort('-startDate').populate('days.meals.recipe'),
      GroceryList.find({ userId: req.user._id }).sort('-createdAt'),
      PantryItem.countDocuments({ userId: req.user._id }),
    ]);

    const latest = plans[0] ? plans[0].toObject() : null;

    const dailyNutrition = ((latest && latest.days) || []).map((day) => {
      const summed = day.meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + ((meal.recipe && meal.recipe.calories) || 0),
          protein: acc.protein + ((meal.recipe && meal.recipe.protein) || 0),
          carbs: acc.carbs + ((meal.recipe && meal.recipe.carbohydrates) || 0),
          fats: acc.fats + ((meal.recipe && meal.recipe.fats) || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      return {
        day: `Day ${day.day}`,
        ...summed,
      };
    });

    const allMeals = plans.flatMap((plan) => plan.days.flatMap((day) => day.meals));
    const groceryByPlan = Object.fromEntries(
      lists.map((list) => [String(list.mealPlanId), list.totalEstimatedCost])
    );

    const macros = latest
      ? [
          { name: 'Protein', value: latest.totalProtein },
          { name: 'Carbs', value: latest.totalCarbs },
          { name: 'Fats', value: latest.totalFats },
        ]
      : [];

    const spending = plans
      .slice(0, 6)
      .reverse()
      .map((plan) => ({
        label: new Date(plan.startDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        meals: plan.estimatedCost,
        grocery: groceryByPlan[String(plan._id)] ?? 0,
      }));

    res.json({
      hasPlan: Boolean(latest),
      latestPlanId: latest ? latest._id : undefined,
      budget: latest ? latest.budget : undefined,
      planCost: (latest && latest.estimatedCost) || 0,
      groceryCost: (lists[0] && lists[0].totalEstimatedCost) || 0,
      mealsTotal: allMeals.length,
      mealsCompleted: allMeals.filter((meal) => meal.completed).length,
      dailyNutrition,
      macros,
      spending,
      pantryCount,
    });
  })
);

module.exports = router;
