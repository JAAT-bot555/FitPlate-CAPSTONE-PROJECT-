const test = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const { generatePlan } = require('../services/mealplan');
const { rank } = require('../services/recommend');

const skip = !process.env.MONGO_URI || !process.env.JWT_SECRET;
const DIETS = ['any', 'vegetarian', 'vegan'];
const GOALS = ['weight-loss', 'weight-gain', 'muscle-gain', 'maintenance'];
const GENDERS = ['Female', 'Male', 'Other'];
const CATEGORIES = ['breakfast', 'lunch', 'snack', 'dinner'];
const BUDGETS = [50, 100, 250, 500, 1000];
const MEAL_SETS = Array.from({ length: 1 << CATEGORIES.length }, (_, mask) =>
  CATEGORIES.filter((_, index) => mask & (1 << index))).filter(meals => meals.length);

test('diet, goal, gender, budget and meal-selection matrix', { skip: skip && 'MONGO_URI/JWT_SECRET not set', timeout: 120000 }, async t => {
  execSync('node seed/seed.js', { stdio: 'pipe' });
  const mongoose = require('mongoose');
  const { Recipe, MealPlan, GroceryList, User } = require('../models');
  await mongoose.connect(process.env.MONGO_URI);
  const recipes = await Recipe.find();
  const suffix = `${Date.now()}-${process.pid}`;
  const users = [];
  const server = require('../app').listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, body, token) => {
    const response = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      ...(body && { body: JSON.stringify(body) }),
    });
    let data = null;
    try { data = await response.json(); } catch { data = null; }
    return { status: response.status, data };
  };

  t.after(async () => {
    const ids = users.map(user => user._id);
    await MealPlan.deleteMany({ userId: { $in: ids } });
    await GroceryList.deleteMany({ userId: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  });

  await t.test('recipe diet filters return matching recipes in each meal category', async () => {
    const registration = await call('POST', '/auth/register', {
      name: 'Diet Matrix', email: `matrix-${suffix}@test.com`, password: 'Passw0rd!',
    });
    assert.equal(registration.status, 201);
    users.push({ _id: registration.data.user._id });
    const token = registration.data.token;

    for (const tag of ['vegetarian', 'vegan', 'non-veg', 'high-protein', 'budget']) {
      for (const category of CATEGORIES) {
        const response = await call('GET', `/recipes?tag=${tag}&category=${category}&limit=100`, null, token);
        assert.equal(response.status, 200, `${tag}/${category} status`);
        assert.ok(response.data.total > 0, `expected recipes for ${tag}/${category}`);
        assert.ok(response.data.items.every(recipe =>
          recipe.category === category && recipe.dietaryTags.includes(tag)), `${tag}/${category} filter mismatch`);
      }
    }
  });

  await t.test('all profile genders × diets × goals × meal categories × budgets generate valid plans', async () => {
    const profiles = [];
    for (const gender of GENDERS) {
      const registration = await call('POST', '/auth/register', {
        name: `Matrix ${gender}`, email: `matrix-${gender.toLowerCase()}-${suffix}@test.com`,
        password: 'Passw0rd!',
      });
      assert.equal(registration.status, 201);
      const profile = await call('PUT', '/users/profile', { gender }, registration.data.token);
      assert.equal(profile.status, 200);
      assert.equal(profile.data.gender, gender);
      profiles.push({ gender, token: registration.data.token });
      users.push({ _id: registration.data.user._id });
    }

    let cases = 0;
    for (const { gender, token } of profiles) {
      for (const dietaryPreference of DIETS) {
        for (const goal of GOALS) {
          for (const category of CATEGORIES) {
            for (const budget of BUDGETS) {
              const response = await call('POST', '/meal-plans/generate', {
                days: 1, meals: [category], budget, maxTime: 60, dietaryPreference, goal,
              }, token);
              const label = `${gender}/${dietaryPreference}/${goal}/${category}/₹${budget}`;
              assert.equal(response.status, 201, `${label}: ${response.data?.message || 'plan generation failed'}`);
              assert.equal(response.data.days.length, 1, `${label}: day count`);
              assert.equal(response.data.days[0].meals.length, 1, `${label}: meal count`);
              const meal = response.data.days[0].meals[0];
              assert.equal(meal.slot, category, `${label}: category`);
              assert.ok(meal.recipe, `${label}: populated recipe`);
              if (dietaryPreference !== 'any') {
                assert.ok(meal.recipe.dietaryTags.includes(dietaryPreference), `${label}: diet mismatch`);
              }
              assert.ok(Number.isFinite(response.data.estimatedCost), `${label}: estimated cost`);
              assert.ok(Number.isFinite(response.data.totalCalories), `${label}: nutrition totals`);
              cases++;
            }
          }
        }
      }
    }
    assert.equal(cases, GENDERS.length * DIETS.length * GOALS.length * CATEGORIES.length * BUDGETS.length);
  });

  await t.test('all non-empty meal checkbox combinations work across diets, goals and genders', () => {
    let cases = 0;
    for (const gender of GENDERS) {
      for (const dietaryPreference of DIETS) {
        for (const fitnessGoal of GOALS) {
          for (const meals of MEAL_SETS) {
            const plan = generatePlan(recipes, {
              gender, dietaryPreference, fitnessGoal, allergies: [], cookingTime: 60,
            }, { days: 1, meals, budget: 1000, maxTime: 60 });
            assert.deepEqual(plan[0].meals.map(meal => meal.slot), meals);
            assert.ok(plan[0].meals.every(meal =>
              dietaryPreference === 'any' || meal.recipe.dietaryTags.includes(dietaryPreference)));
            cases++;
          }
        }
      }
    }
    assert.equal(cases, GENDERS.length * DIETS.length * GOALS.length * MEAL_SETS.length);
  });

  await t.test('every profile combination has eligible ranked recipes in every category', () => {
    for (const gender of GENDERS) {
      for (const dietaryPreference of DIETS) {
        for (const fitnessGoal of GOALS) {
          for (const category of CATEGORIES) {
            const results = rank(recipes.filter(recipe => recipe.category === category), {
              gender, dietaryPreference, fitnessGoal, allergies: [],
            }, { perMealBudget: 250, maxTime: 60, pantryNames: new Set() });
            assert.ok(results.length > 0, `${gender}/${dietaryPreference}/${fitnessGoal}/${category}`);
            assert.ok(results.every(item => item.eligible));
          }
        }
      }
    }
  });
});
