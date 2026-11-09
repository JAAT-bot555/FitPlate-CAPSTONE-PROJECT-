const { Schema, model, Types } = require('mongoose');

const bodyMetricSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    measuredAt: {
      type: Date,
      required: true,
      index: true,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    muscleMassKg: {
      type: Number,
      min: 0,
      max: 1000,
    },
    bodyFatPct: {
      type: Number,
      min: 0,
      max: 100,
    },
    waistCm: {
      type: Number,
      min: 1,
      max: 300,
    },
    notes: {
      type: String,
      maxlength: 300,
      trim: true,
    },
  },
  { timestamps: true }
);

bodyMetricSchema.index({ userId: 1, measuredAt: 1 });

module.exports = model('BodyMetric', bodyMetricSchema);
