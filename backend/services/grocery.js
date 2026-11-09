const INGREDIENT_ALIASES = {
  tomatoes: 'tomato',
  potatoes: 'potato',
  onions: 'onion',
  eggs: 'egg',
  chillies: 'green chilli',
  'green chillies': 'green chilli',
  lentils: 'dal',
};

function normName(rawName) {
  const cleaned = String(rawName || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return INGREDIENT_ALIASES[cleaned] || cleaned;
}

function toBaseUnit(quantity, unit) {
  const normalizedUnit = String(unit || 'pcs').toLowerCase().trim();
  if (normalizedUnit === 'kg') {
    return { quantity: quantity * 1000, unit: 'g' };
  }
  if (normalizedUnit === 'l') {
    return { quantity: quantity * 1000, unit: 'ml' };
  }
  if (normalizedUnit === 'gram' || normalizedUnit === 'grams') {
    return { quantity, unit: 'g' };
  }
  return { quantity, unit: normalizedUnit };
}

function combine(ingredientList) {
  const merged = new Map();

  for (const item of ingredientList) {
    const name = normName(item.name);
    const base = toBaseUnit(Number(item.quantity) || 0, item.unit);
    const key = `${name}|${base.unit}`;
    const existing = merged.get(key);

    merged.set(key, {
      name,
      unit: base.unit,
      quantity: (existing ? existing.quantity : 0) + base.quantity,
    });
  }

  return Array.from(merged.values());
}

function calculateItemCost(quantity, unit, catalogEntry) {
  const unitPrice = catalogEntry && catalogEntry.price != null ? catalogEntry.price : 80;
  const multiplier = unit === 'pcs' ? quantity : quantity / 1000;
  return Math.round(multiplier * unitPrice);
}

function generateGrocery(recipes, pantry = [], catalog = {}) {
  const allRecipeIngredients = recipes.flatMap((recipe) => recipe.ingredients || []);
  const requiredItems = combine(allRecipeIngredients);

  const normalizedPantry = combine(
    pantry.map((p) => ({
      name: p.ingredient,
      quantity: p.quantity,
      unit: p.unit,
    }))
  );

  const pantryStock = new Map(
    normalizedPantry.map((entry) => [`${entry.name}|${entry.unit}`, entry.quantity])
  );

  const groceryItems = [];

  for (const needed of requiredItems) {
    const inPantry = pantryStock.get(`${needed.name}|${needed.unit}`) || 0;
    const toBuy = needed.quantity - inPantry;

    if (toBuy <= 0) {
      continue;
    }

    const catalogEntry = catalog[needed.name];
    groceryItems.push({
      name: needed.name,
      unit: needed.unit,
      required: needed.quantity,
      quantity: toBuy,
      category: (catalogEntry && catalogEntry.category) || 'Other',
      estimatedCost: calculateItemCost(toBuy, needed.unit, catalogEntry),
      purchased: false,
    });
  }

  groceryItems.sort((a, b) => {
    const categoryOrder = a.category.localeCompare(b.category);
    return categoryOrder !== 0 ? categoryOrder : a.name.localeCompare(b.name);
  });

  const totalEstimatedCost = groceryItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  return {
    items: groceryItems,
    totalEstimatedCost,
  };
}

module.exports = {
  normName,
  combine,
  generateGrocery,
};
