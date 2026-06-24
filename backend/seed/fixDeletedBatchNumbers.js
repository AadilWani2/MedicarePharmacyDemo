const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Medicine = require('../models/Medicine');

const fixDeletedBatchNumbers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all inactive (soft-deleted) medicines whose batchNumber does NOT contain "-deleted-"
    const inactiveMedicines = await Medicine.find({
      isActive: false,
      batchNumber: { $not: /-deleted-/ }
    });

    console.log(`🔍 Found ${inactiveMedicines.length} soft-deleted medicines needing batch number index release.`);

    let fixedCount = 0;
    for (const med of inactiveMedicines) {
      const oldBatch = med.batchNumber;
      med.batchNumber = `${oldBatch}-deleted-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await med.save();
      console.log(`⚡ Fixed: ${med.name} (Batch: ${oldBatch} -> ${med.batchNumber})`);
      fixedCount++;
    }

    console.log(`🎉 Successfully fixed and released ${fixedCount} batch numbers in MongoDB!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing batch numbers:', error.message);
    process.exit(1);
  }
};

fixDeletedBatchNumbers();
