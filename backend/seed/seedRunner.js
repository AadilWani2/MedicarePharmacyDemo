const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Supplier = require('../models/Supplier');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Medicine.deleteMany({});
    await Supplier.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Users - The password will be hashed by the pre-save hook
    const admin = await User.create({
      name: 'Imran Khan',
      email: 'admin@medicarepharmacy.com',
      password: 'Admin@MediCare2026!',
      role: 'admin',
      phone: '+91 98765 43210'
    });
    console.log('✅ Admin user created');

    const pharmacist = await User.create({
      name: 'Aisha Begum',
      email: 'aisha@medicarepharmacy.com',
      password: 'Pharma@MediCare2026!',
      role: 'pharmacist',
      phone: '+91 98765 43211'
    });
    console.log('✅ Pharmacist user created');

    // Create Medicines
    const medicines = await Medicine.insertMany([
      {
        name: 'Paracetamol 500mg',
        genericName: 'Acetaminophen',
        category: 'Tablets',
        manufacturer: 'Cipla Ltd',
        batchNumber: 'PCM-2026-001',
        purchasePrice: 12,
        sellingPrice: 20,
        quantity: 500,
        reorderLevel: 50,
        expiryDate: new Date('2027-10-15'),
        dosage: '1-2 tablets every 4-6 hours',
        createdBy: admin._id
      },
      {
        name: 'Azithromycin 500mg',
        genericName: 'Azithromycin',
        category: 'Tablets',
        manufacturer: 'Sun Pharma',
        batchNumber: 'AZM-2026-001',
        purchasePrice: 45,
        sellingPrice: 65,
        quantity: 250,
        reorderLevel: 30,
        expiryDate: new Date('2027-03-20'),
        dosage: '1 tablet daily for 3 days',
        requiresPrescription: true,
        createdBy: admin._id
      },
      {
        name: 'Crocin 650mg',
        genericName: 'Paracetamol',
        category: 'Tablets',
        manufacturer: 'GSK',
        batchNumber: 'CRC-2026-001',
        purchasePrice: 25,
        sellingPrice: 35,
        quantity: 80,
        reorderLevel: 50,
        expiryDate: new Date('2026-08-10'),
        dosage: '1 tablet as needed',
        createdBy: admin._id
      },
      {
        name: 'Amoxicillin 250mg',
        genericName: 'Amoxicillin',
        category: 'Capsules',
        manufacturer: 'Mankind Pharma',
        batchNumber: 'AMX-2026-001',
        purchasePrice: 35,
        sellingPrice: 50,
        quantity: 120,
        reorderLevel: 40,
        expiryDate: new Date('2026-09-25'),
        dosage: '1 capsule 3 times daily',
        requiresPrescription: true,
        createdBy: admin._id
      },
      {
        name: 'Vitamin D3 60K',
        genericName: 'Cholecalciferol',
        category: 'Capsules',
        manufacturer: 'Abbott',
        batchNumber: 'VTD-2026-001',
        purchasePrice: 80,
        sellingPrice: 120,
        quantity: 300,
        reorderLevel: 40,
        expiryDate: new Date('2027-12-31'),
        dosage: '1 capsule weekly',
        createdBy: admin._id
      },
      {
        name: 'ORS Powder',
        genericName: 'Oral Rehydration Salts',
        category: 'Powders',
        manufacturer: 'FDC Ltd',
        batchNumber: 'ORS-2026-001',
        purchasePrice: 15,
        sellingPrice: 25,
        quantity: 150,
        reorderLevel: 30,
        expiryDate: new Date('2027-01-15'),
        dosage: 'Dissolve in 1L water',
        createdBy: admin._id
      },
      {
        name: 'Cough Syrup',
        genericName: 'Dextromethorphan',
        category: 'Syrups',
        manufacturer: 'Pfizer',
        batchNumber: 'COF-2026-001',
        purchasePrice: 55,
        sellingPrice: 80,
        quantity: 100,
        reorderLevel: 20,
        expiryDate: new Date('2027-06-20'),
        dosage: '2 teaspoons 3 times daily',
        createdBy: admin._id
      },
      {
        name: 'Insulin Injection',
        genericName: 'Human Insulin',
        category: 'Injections',
        manufacturer: 'Novo Nordisk',
        batchNumber: 'INS-2026-001',
        purchasePrice: 250,
        sellingPrice: 350,
        quantity: 50,
        reorderLevel: 10,
        expiryDate: new Date('2027-03-15'),
        dosage: 'As prescribed',
        requiresPrescription: true,
        storageConditions: 'Store at 2-8°C',
        createdBy: admin._id
      }
    ]);
    console.log('✅ Medicines created:', medicines.length);

    // Create Suppliers
    const suppliers = await Supplier.insertMany([
      {
        name: 'Srinagar Pharma Distributors',
        contactPerson: 'Tariq Ahmad',
        email: 'tariq@srinagarpharma.com',
        phone: '+91 70060 12345',
        address: {
          street: 'Lal Chowk',
          city: 'Srinagar',
          state: 'Jammu & Kashmir',
          pincode: '190001'
        },
        gstNumber: '01AAACS1234L1Z5',
        rating: 5,
        createdBy: admin._id
      },
      {
        name: 'Kashmir Medical Supplies',
        contactPerson: 'Mohammad Yousuf',
        email: 'yousuf@kashmirmedical.com',
        phone: '+91 70060 67890',
        address: {
          street: 'Residency Road',
          city: 'Srinagar',
          state: 'Jammu & Kashmir',
          pincode: '190001'
        },
        gstNumber: '01BBBCD5678M2Z5',
        rating: 4,
        createdBy: admin._id
      }
    ]);
    console.log('✅ Suppliers created:', suppliers.length);

    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('  🏥 DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════');
    console.log('  👤 Admin:', admin.email);
    console.log('  🔑 Pass: Admin@MediCare2026!');
    console.log('  👤 Pharmacist:', pharmacist.email);
    console.log('  🔑 Pass: Pharma@MediCare2026!');
    console.log('  💊 Medicines:', medicines.length);
    console.log('  🚚 Suppliers:', suppliers.length);
    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

seedData();