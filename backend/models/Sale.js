const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  customerPhone: String,
  customerGSTIN: {
    type: String,
    default: ''
  },
  items: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    medicineName: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalPrice: Number,
    // GST fields per item
    hsnCode: { type: String, default: '' },
    gstRate: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  // GST totals
  isInterState: { type: Boolean, default: false },
  totalTaxableAmount: { type: Number, default: 0 },
  totalCGST: { type: Number, default: 0 },
  totalSGST: { type: Number, default: 0 },
  totalIGST: { type: Number, default: 0 },
  totalGST: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'credit'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'cancelled'],
    default: 'paid'
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  saleDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

saleSchema.statics.generateBillNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const last = await this.findOne({
    billNumber: new RegExp(`SAL-${year}${month}`)
  }).sort({ billNumber: -1 });
  
  let seq = '001';
  if (last) {
    seq = String(parseInt(last.billNumber.split('-')[2]) + 1).padStart(3, '0');
  }
  
  return `SAL-${year}${month}-${seq}`;
};

saleSchema.index({ saleDate: -1 });
saleSchema.index({ soldBy: 1 });

module.exports = mongoose.model('Sale', saleSchema);