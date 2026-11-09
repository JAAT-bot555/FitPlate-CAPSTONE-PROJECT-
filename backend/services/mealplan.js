const { rank } = require('./recommend');
const { normName } = require('./grocery');

function getRecipeId(recipe) {
  return String(recipe._id != null ? recipe._id : recipe.id);
}

function generatePlan(
  recipes,
  user,
  {
    days = 3,
    meals = ['breakfast', 'lunch', 'snack', 'dinner'],
    budget,
    maxTime,
    pantry = [],
  } = {}
) {
  const pantryNames = new Set(pantry.map((item) => normName(item.ingredient)));
  const scoringOptions = {
    perMealBudget: budget ? budget / (days * meals.length) : null,
    maxTime,
    pantryNames,
  };

  const usageCount = new Map();
  const plan = [];

  for (let dayNum = 1; dayNum <= days; dayNum++) {
    const dayPlan = {
      day: dayNum,
      meals: [],
    };

    for (const slot of meals) {
      const candidates = recipes.filter((recipe) => recipe.category === slot);
      const rankedCandidates = rank(candidates, user, scoringOptions);

      if (!rankedCandidates.length) {
        const error = new Error(`No suitable ${slot} recipes for this profile`);
        error.status = 422;
        throw error;
      }

      // Penalize already-selected recipes so multi-day plans stay varied
      const bestMatch = rankedCandidates
        .map((candidate) => {
          const timesUsed = usageCount.get(getRecipeId(candidate.recipe)) || 0;
          return {
            ...candidate,
            adjustedScore: candidate.score - 25 * timesUsed,
          };
        })
        .sort((a, b) => b.adjustedScore - a.adjustedScore)[0];

      const chosenId = getRecipeId(bestMatch.recipe);
      usageCount.set(chosenId, (usageCount.get(chosenId) || 0) + 1);

      dayPlan.meals.push({
        slot,
        recipe: bestMatch.recipe,
        score: bestMatch.score,
      });
    }

    plan.push(dayPlan);
  }

  return plan;
}

function totals(plan) {
  const allMeals = plan.flatMap((day) => day.meals.map((meal) => meal.recipe));
  const sumField = (field) => allMeals.reduce((acc, recipe) => acc + ((recipe && recipe[field]) || 0), 0);

  return {
    totalCalories: sumField('calories'),
    totalProtein: sumField('protein'),
    totalCarbs: sumField('carbohydrates'),
    totalFats: sumField('fats'),
    estimatedCost: sumField('estimatedCost'),
  };
}

function optimize(plan, recipes, user, budget, options = {}) {
  const initialTotal = totals(plan).estimatedCost;
  let runningTotal = initialTotal;

  if (runningTotal <= budget) {
    return {
      exceeded: false,
      total: runningTotal,
      suggestions: [],
      newTotal: runningTotal,
    };
  }

  const usedIds = new Set(
    plan.flatMap((day) => day.meals.map((meal) => getRecipeId(meal.recipe)))
  );
  const currentGrid = plan.map((day) => day.meals.map((meal) => meal.recipe));
  const suggestions = [];

  while (runningTotal > budget) {
    let bestSwap = null;

    plan.forEach((day, dayIdx) => {
      day.meals.forEach((meal, mealIdx) => {
        const currentRecipe = currentGrid[dayIdx][mealIdx];
        const slotRecipes = recipes.filter(
          (r) => r.category === meal.slot && !usedIds.has(getRecipeId(r))
        );
        const rankedAlternatives = rank(slotRecipes, user, options);

        for (const alt of rankedAlternatives) {
          const saving = currentRecipe.estimatedCost - alt.recipe.estimatedCost;
          if (saving > 0 && (!bestSwap || saving > bestSwap.saving)) {
            bestSwap = {
              day: day.day,
              slot: meal.slot,
              dayIdx,
              mealIdx,
              from: currentRecipe,
              to: alt.recipe,
              saving,
            };
          }
        }
      });
    });

    if (!bestSwap) {
      break;
    }

    currentGrid[bestSwap.dayIdx][bestSwap.mealIdx] = bestSwap.to;
    usedIds.add(getRecipeId(bestSwap.to));
    runningTotal -= bestSwap.saving;

    suggestions.push({
      day: bestSwap.day,
      slot: bestSwap.slot,
      from: {
        id: getRecipeId(bestSwap.from),
        name: bestSwap.from.name,
        cost: bestSwap.from.estimatedCost,
      },
      to: {
        id: getRecipeId(bestSwap.to),
        name: bestSwap.to.name,
        cost: bestSwap.to.estimatedCost,
      },
      saving: bestSwap.saving,
    });
  }

  return {
    exceeded: true,
    total: initialTotal,
    suggestions,
    newTotal: runningTotal,
    withinBudgetAfter: runningTotal <= budget,
  };
}

module.exports = {
  generatePlan,
  totals,
  optimize,
};
