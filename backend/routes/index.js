const express = require('express');
const authRoutes = require('./authRoutes');
const recipeRoutes = require('./recipeRoutes');
const pantryRoutes = require('./pantryRoutes');
const mealPlanRoutes = require('./mealPlanRoutes');
const groceryRoutes = require('./groceryRoutes');
const trackerRoutes = require('./trackerRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use(authRoutes);
router.use(recipeRoutes);
router.use(pantryRoutes);
router.use(mealPlanRoutes);
router.use(groceryRoutes);
router.use(trackerRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
