const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    required: [true, 'Generic name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Tablets', 'Capsules', 'Syrups', 'Injections', 'Ointments', 'Drops', 'Powders', 'Medical Equipment']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required']
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    unique: true
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: 0
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0,
    default: 0
  },
  reorderLevel: {
    type: Number,
    default: 50,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  description: String,
  dosage: String,
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  discountApplied: {
    type: Boolean,
    default: false
  },
  originalPrice: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Indexes - removed duplicate batchNumber index
medicineSchema.index({ category: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ name: 'text', genericName: 'text' });

// Virtual for stock status
medicineSchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'Out of Stock';
  if (this.quantity <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

// Virtual for expiry status
medicineSchema.virtual('expiryStatus').get(function() {
  const days = Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Critical';
  if (days <= 60) return 'Warning';
  return 'Good';
});

// Update timestamp
medicineSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Enable virtuals in JSON
medicineSchema.set('toJSON', { virtuals: true });
medicineSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Medicine', medicineSchema);