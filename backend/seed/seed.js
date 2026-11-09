const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { User, Recipe, Ingredient } = require('../models');
const { INGREDIENTS, RECIPES, DEMO_USERS } = require('./seedData');

async function seedDatabase() {
  await Promise.all([Recipe.deleteMany(), Ingredient.deleteMany()]);
  await Recipe.insertMany(RECIPES);
  await Ingredient.insertMany(INGREDIENTS);

  for (const demoAccount of DEMO_USERS) {
    await User.deleteOne({ email: demoAccount.email });
    const hashedPassword = await bcrypt.hash(demoAccount.passwordPlain, 10);
    await User.create({
      name: demoAccount.name,
      email: demoAccount.email,
      role: demoAccount.role,
      password: hashedPassword,
    });
  }

  return {
    recipesCount: RECIPES.length,
    ingredientsCount: INGREDIENTS.length,
    usersCount: DEMO_USERS.length,
  };
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const stats = await seedDatabase();
      console.log(
        `Seeded ${stats.recipesCount} recipes, ${stats.ingredientsCount} ingredients, and ${stats.usersCount} demo users.`
      );
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed database:', error);
      process.exit(1);
    }
  })();
}

module.exports = { seedDatabase };
