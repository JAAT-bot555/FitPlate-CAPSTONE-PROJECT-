const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const app = require('./app');
const { Recipe } = require('./models');
const { seedDatabase } = require('./seed/seed');

const PORT = process.env.PORT || 5000;
let httpServer;

async function startServer() {
  try {
    await connectDB();

    const existingRecipes = await Recipe.countDocuments();
    if (existingRecipes === 0) {
      console.log('Database is empty. Running initial seed for FitPlate...');
      await seedDatabase();
    }

    httpServer = app.listen(PORT, () => {
      console.log(`FitPlate backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received; closing FitPlate server and database connection`);
  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  await mongoose.disconnect();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

startServer();
