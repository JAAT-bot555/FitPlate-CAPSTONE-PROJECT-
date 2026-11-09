const test = require('node:test');
const assert = require('node:assert');
const { generateGrocery } = require('../services/grocery');
const { scoreRecipe } = require('../services/recommend');
const { generatePlan, optimize, totals } = require('../services/mealplan');

function buildMockRecipe(name, category, cost, ingredients, extra = {}) {
  return {
    _id: name,
    name,
    category,
    estimatedCost: cost,
    calories: 400,
    protein: 20,
    cookingTime: 20,
    dietaryTags: ['vegetarian'],
    ingredients,
    ...extra,
  };
}

test('grocery: combines duplicates and subtracts pantry', () => {
  const recipes = [200, 300, 250].map((qty, index) =>
    buildMockRecipe(`meal_${index}`, 'lunch', 10, [
      { name: 'Rice', quantity: qty, unit: 'g' },
    ])
  );
  const pantry = [{ ingredient: 'rice', quantity: 500, unit: 'g' }];
  const catalog = { rice: { category: 'Grains', price: 100 } };

  const grocery = generateGrocery(recipes, pantry, catalog);
  assert.equal(grocery.items.length, 1);
  assert.equal(grocery.items[0].quantity, 250);
  assert.equal(grocery.items[0].estimatedCost, 25);
});

test('grocery: kg/g conversion, aliases, fully-stocked items removed', () => {
  const recipes = [
    buildMockRecipe('a', 'lunch', 1, [
      { name: 'Potatoes', quantity: 0.5, unit: 'kg' },
      { name: 'Onion', quantity: 100, unit: 'g' },
    ]),
    buildMockRecipe('b', 'dinner', 1, [
      { name: 'potato', quantity: 300, unit: 'g' },
    ]),
  ];
  const pantry = [{ ingredient: 'onion', quantity: 1, unit: 'kg' }];

  const grocery = generateGrocery(recipes, pantry, {});
  assert.deepEqual(
    grocery.items.map((item) => [item.name, item.quantity]),
    [['potato', 800]]
  );
});

test('recommender: allergy and diet exclusion', () => {
  const peanutRecipe = buildMockRecipe('x', 'lunch', 10, [
    { name: 'Peanuts', quantity: 10, unit: 'g' },
  ]);

  assert.equal(scoreRecipe(peanutRecipe, { allergies: ['peanut'] }).eligible, false);
  assert.equal(
    scoreRecipe({ ...peanutRecipe, dietaryTags: ['non-veg'] }, { dietaryPreference: 'vegetarian' })
      .eligible,
    false
  );
  assert.equal(scoreRecipe(peanutRecipe, { allergies: [] }, {}).eligible, true);
});

test('meal plan: avoids repeats; optimizer cuts cost under budget', () => {
  const recipes = [];
  for (const slot of ['breakfast', 'lunch']) {
    for (const [tier, cost] of [
      ['hi', 100],
      ['mid', 60],
      ['lo', 30],
    ]) {
      recipes.push(
        buildMockRecipe(`${slot}_${tier}`, slot, cost, [
          { name: 'dal', quantity: 1, unit: 'g' },
        ])
      );
    }
  }

  const user = {
    dietaryPreference: 'any',
    fitnessGoal: 'maintenance',
    allergies: [],
  };

  const plan = generatePlan(recipes, user, {
    days: 2,
    meals: ['breakfast', 'lunch'],
    budget: 10000,
  });

  const uniqueRecipeNames = new Set(
    plan.flatMap((day) => day.meals.map((meal) => meal.recipe.name))
  );
  assert.equal(uniqueRecipeNames.size, 4);

  const initialCost = totals(plan).estimatedCost;
  const optResult = optimize(plan, recipes, user, initialCost - 40);
  assert.ok(
    optResult.exceeded &&
      optResult.suggestions.length > 0 &&
      optResult.newTotal <= initialCost - 40
  );
});
