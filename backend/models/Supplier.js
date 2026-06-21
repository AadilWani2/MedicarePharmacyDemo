const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person is required']
  },
  email: {
    type: String,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone is required']
  },
  alternatePhone: String,
  address: {
    street: String,
    city: { type: String, default: 'Srinagar' },
    state: { type: String, default: 'Jammu & Kashmir' },
    pincode: String
  },
  gstNumber: String,
  drugLicenseNumber: String,
  paymentTerms: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  notes: String,
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

// Indexes
supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });

// Update timestamp
supplierSchema.pre('save', function() {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Supplier', supplierSchema);