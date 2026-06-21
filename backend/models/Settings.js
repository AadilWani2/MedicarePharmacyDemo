const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  lowStockThreshold: {
    type: Number,
    default: 20,
    required: true,
    min: 1
  },
  expiryWarningDays: {
    type: Number,
    default: 60,
    required: true,
    min: 1
  },
  emailAlertIntervalHours: {
    type: Number,
    default: 24,
    required: true,
    min: 1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp before saving
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
