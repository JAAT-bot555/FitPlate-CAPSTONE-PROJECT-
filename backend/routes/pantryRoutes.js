const express = require('express');
const { PantryItem } = require('../models');
const { protect, wrap } = require('../middleware/auth');
const { createError, ensureFound, pickFields } = require('./helpers');

const router = express.Router();
const PANTRY_FIELDS = ['ingredient', 'quantity', 'unit', 'expiryDate'];

router.get(
  '/pantry',
  protect,
  wrap(async (req, res) => {
    const items = await PantryItem.find({ userId: req.user._id }).sort('ingredient');
    res.json(items);
  })
);

router.post(
  '/pantry',
  protect,
  wrap(async (req, res) => {
    if (!req.body.ingredient || !(req.body.quantity >= 0)) {
      throw createError('Ingredient and non-negative quantity required');
    }

    const item = await PantryItem.create({
      ...pickFields(req.body, PANTRY_FIELDS),
      userId: req.user._id,
    });

    res.status(201).json(item);
  })
);

router.put(
  '/pantry/:id',
  protect,
  wrap(async (req, res) => {
    const updated = await PantryItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      pickFields(req.body, PANTRY_FIELDS),
      { new: true, runValidators: true }
    );

    res.json(ensureFound(updated));
  })
);

router.delete(
  '/pantry/:id',
  protect,
  wrap(async (req, res) => {
    await PantryItem.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.status(204).end();
  })
);

module.exports = router;
