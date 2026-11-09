const { normName } = require('./grocery');
const { rank } = require('./recommend');

function parseQuery(queryText, catalogNames = []) {
  const text = String(queryText || '').toLowerCase();
  const matchedIngredients = catalogNames.filter((name) =>
    new RegExp(`\\b${name}s?\\b`).test(text)
  );

  const budgetMatch = text.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*(\d+)/);
  const slot = ['breakfast', 'lunch', 'snack', 'dinner'].find((meal) => text.includes(meal));
  const highProtein = /high[- ]protein/.test(text);

  let diet = null;
  if (/vegan/.test(text)) {
    diet = 'vegan';
  } else if (/veg(etarian)?\b/.test(text) && !/non[- ]?veg/.test(text)) {
    diet = 'vegetarian';
  }

  return {
    have: [...new Set(matchedIngredients.map(normName))],
    maxCost: budgetMatch ? Number(budgetMatch[1]) : null,
    slot,
    highProtein,
    diet,
  };
}

function suggest(queryText, recipes, user, catalogNames) {
  const parsed = parseQuery(queryText, catalogNames);
  const effectiveUser = {
    ...user,
    dietaryPreference: parsed.diet || user.dietaryPreference,
  };

  const filteredPool = recipes.filter((recipe) => {
    if (parsed.slot && recipe.category !== parsed.slot) return false;
    if (parsed.maxCost && recipe.estimatedCost > parsed.maxCost) return false;
    if (parsed.highProtein && recipe.protein < 20) return false;
    return true;
  });

  const ownedSet = new Set(parsed.have);

  const ranked = rank(filteredPool, effectiveUser, { pantryNames: ownedSet })
    .map((entry) => {
      const ingredientNames = (entry.recipe.ingredients || []).map((ing) => normName(ing.name));
      const owned = ingredientNames.filter((name) => ownedSet.has(name));
      const missing = ingredientNames.filter((name) => !ownedSet.has(name));

      return {
        recipe: entry.recipe,
        score: entry.score + owned.length * 5,
        owned,
        missing,
      };
    })
    .filter((entry) => !ownedSet.size || entry.owned.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    parsed,
    suggestions: ranked.map((entry) => ({
      id: entry.recipe._id,
      name: entry.recipe.name,
      category: entry.recipe.category,
      cost: entry.recipe.estimatedCost,
      protein: entry.recipe.protein,
      calories: entry.recipe.calories,
      youHave: entry.owned,
      youNeed: entry.missing,
    })),
  };
}

async function ask(queryText, recipes, user, catalogNames) {
  const result = suggest(queryText, recipes, user, catalogNames);
  const count = result.suggestions.length;

  let replyText = 'No recipes matched your filters. Try adjusting your ingredients or increasing your budget.';
  if (count > 0) {
    const usingClause = result.parsed.have.length
      ? ` using ${result.parsed.have.join(', ')}`
      : '';
    replyText = `Here are ${count} recipes that match your request${usingClause}.`;
  }

  return {
    reply: replyText,
    aiUsed: false,
    ...result,
  };
}

module.exports = {
  ask,
  parseQuery,
  suggest,
};
