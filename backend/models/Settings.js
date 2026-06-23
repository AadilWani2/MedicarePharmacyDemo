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
  // GST Configuration
  pharmacyGSTIN: {
    type: String,
    default: '01ABCDE1234F1Z5',
    trim: true
  },
  pharmacyState: {
    type: String,
    default: '01',
    trim: true
  },
  pharmacyStateName: {
    type: String,
    default: 'Jammu & Kashmir',
    trim: true
  },
  defaultGSTRate: {
    type: Number,
    default: 12,
    enum: [0, 5, 12, 18, 28]
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp before saving
settingsSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Settings', settingsSchema);
