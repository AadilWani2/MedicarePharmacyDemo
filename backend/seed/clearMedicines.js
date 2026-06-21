const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Medicine = require('../models/Medicine');

const clearMedicines = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Medicine.deleteMany({});
    console.log(`🗑️ Cleared all medicines from database. Removed ${result.deletedCount} items.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Clear error:', error.message);
    process.exit(1);
  }
};

clearMedicines();
