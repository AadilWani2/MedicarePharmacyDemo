const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Medicine = require('../models/Medicine');
const indianMedicines = require('./indianMedicines');

const seedIndianMedicines = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let addedCount = 0;
    let skippedCount = 0;

    for (const med of indianMedicines) {
      // Check if medicine already exists by name
      const exists = await Medicine.findOne({ name: med.name });
      
      if (!exists) {
        await Medicine.create({
          ...med,
          batchNumber: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          purchasePrice: Math.floor(Math.random() * 100) + 10,
          sellingPrice: Math.floor(Math.random() * 200) + 20,
          quantity: Math.floor(Math.random() * 500) + 50,
          reorderLevel: 50,
          expiryDate: new Date(Date.now() + Math.floor(Math.random() * 730) * 24 * 60 * 60 * 1000),
        });
        addedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Indian Medicines Database Seeded:`);
    console.log(`   📦 Added: ${addedCount} medicines`);
    console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
    console.log(`   📊 Total in database: ${addedCount + skippedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedIndianMedicines();