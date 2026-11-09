const { normName } = require('./grocery');

const GOAL_CRITERIA = {
  'weight-loss': (recipe) => recipe.calories <= 450,
  'weight-gain': (recipe) => recipe.calories >= 550,
  'muscle-gain': (recipe) => recipe.protein >= 25,
  maintenance: () => true,
};

function isAllergic(recipe, allergies = []) {
  const allergyList = allergies
    .map((item) => String(item).toLowerCase().trim())
    .filter(Boolean);

  if (!allergyList.length) {
    return false;
  }

  return (recipe.ingredients || []).some((ing) => {
    const normalized = normName(ing.name);
    return allergyList.some((allergy) => normalized.includes(allergy));
  });
}

function matchesDiet(recipe, preference) {
  const tags = recipe.dietaryTags || [];
  if (preference === 'vegan') {
    return tags.includes('vegan');
  }
  if (preference === 'vegetarian') {
    return tags.includes('vegetarian') || tags.includes('vegan');
  }
  return true;
}

const SCORING_FACTORS = {
  diet: (recipe, user) => {
    return matchesDiet(recipe, user.dietaryPreference) ? 30 : 0;
  },
  goal: (recipe, user) => {
    const checkGoal = GOAL_CRITERIA[user.fitnessGoal] || GOAL_CRITERIA.maintenance;
    return checkGoal(recipe) ? 20 : 5;
  },
  budget: (recipe, user, options) => {
    const cap = options.perMealBudget;
    if (!cap) {
      return 20;
    }
    if (recipe.estimatedCost <= cap) {
      return 20;
    }
    return Math.max(0, Math.round(20 * (1 - (recipe.estimatedCost - cap) / cap)));
  },
  time: (recipe, user, options) => {
    const limit = options.maxTime || user.cookingTime || 60;
    return recipe.cookingTime <= limit ? 10 : 0;
  },
  pantry: (recipe, user, options) => {
    const pantryNames = options.pantryNames || new Set();
    const totalIngredients = (recipe.ingredients || []).length || 1;
    const matchedCount = (recipe.ingredients || []).filter((ing) =>
      pantryNames.has(normName(ing.name))
    ).length;
    return Math.round(10 * (matchedCount / totalIngredients));
  },
  cuisine: (recipe, user) => {
    if (!user.preferredCuisine || !recipe.cuisine) {
      return 0;
    }
    return recipe.cuisine.toLowerCase() === user.preferredCuisine.toLowerCase() ? 10 : 0;
  },
};

function scoreRecipe(recipe, user = {}, options = {}) {
  if (isAllergic(recipe, user.allergies) || !matchesDiet(recipe, user.dietaryPreference)) {
    return {
      eligible: false,
      score: 0,
    };
  }

  const breakdown = {};
  let totalScore = 0;

  for (const [key, calcFn] of Object.entries(SCORING_FACTORS)) {
    const points = calcFn(recipe, user, options);
    breakdown[key] = points;
    totalScore += points;
  }

  // Apply a mild penalty if the recipe contains a disliked ingredient
  const dislikes = (user.dislikes || [])
    .map((d) => String(d).toLowerCase().trim())
    .filter(Boolean);
  if (dislikes.length > 0) {
    const hasDislike = (recipe.ingredients || []).some((ing) => {
      const normalized = normName(ing.name);
      return dislikes.some((disliked) => normalized.includes(disliked));
    });
    if (hasDislike) {
      totalScore = Math.max(0, totalScore - 15);
    }
  }

  return {
    eligible: true,
    score: totalScore,
    breakdown,
  };
}

function rank(recipes, user, options = {}) {
  return recipes
    .map((recipe) => ({
      recipe,
      ...scoreRecipe(recipe, user, options),
    }))
    .filter((entry) => entry.eligible)
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  scoreRecipe,
  rank,
  isAllergic,
};
