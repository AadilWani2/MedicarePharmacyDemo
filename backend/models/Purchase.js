const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  items: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    medicineName: String,
    batchNumber: String,
    quantity: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, required: true },
    sellingPrice: Number,
    expiryDate: Date,
    totalPrice: Number,
    // GST fields per item
    hsnCode: { type: String, default: '' },
    gstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 }
  }],
  totalAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi'],
    default: 'bank_transfer'
  },
  purchaseDate: { type: Date, default: Date.now },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

purchaseSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const last = await this.findOne({
    invoiceNumber: new RegExp(`PUR-${year}${month}`)
  }).sort({ invoiceNumber: -1 });
  
  let seq = '001';
  if (last) {
    seq = String(parseInt(last.invoiceNumber.split('-')[2]) + 1).padStart(3, '0');
  }
  
  return `PUR-${year}${month}-${seq}`;
};

purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ purchaseDate: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);