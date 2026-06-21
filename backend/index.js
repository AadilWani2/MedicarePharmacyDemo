const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100),
  message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Patch Express 5 read-only query getter
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true
    });
  }
  next();
});

// Sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', pharmacy: 'MediCare Pharmacy' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    // Initialize WhatsApp Web Client
    const { initWhatsApp } = require('./utils/whatsappUtils');
    initWhatsApp();
  })
  .catch(err => {
    console.error('❌ MongoDB Error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   🏥 MediCare Pharmacy System      ║
║   📍 Srinagar, Jammu & Kashmir     ║
║   🌐 http://localhost:${PORT}         ║
╚══════════════════════════════════════╝
  `);
});

const runDailyCheck = async () => {
  try {
    const Medicine = require('./models/Medicine');
    const Settings = require('./models/Settings');
    const { sendAlertEmail } = require('./utils/emailUtils');

    let settings = await Settings.findOne();
    if (!settings) {
      settings = { lowStockThreshold: 20, expiryWarningDays: 60, emailAlertIntervalHours: 24 };
    }

    const expiryWindow = new Date();
    expiryWindow.setDate(expiryWindow.getDate() + settings.expiryWarningDays);

    // Get low stock medicines (quantity <= configured lowStockThreshold)
    const lowStockMedicines = await Medicine.find({
      quantity: { $lte: settings.lowStockThreshold },
      isActive: true
    }).sort({ quantity: 1 });

    // Get expiring medicines (expiryDate <= configured window)
    const expiringMedicines = await Medicine.find({
      expiryDate: { $lte: expiryWindow },
      isActive: true
    }).sort({ expiryDate: 1 });

    if (lowStockMedicines.length === 0 && expiringMedicines.length === 0) {
      console.log('📅 Daily Alert Check: No low-stock or expiring items found. Skip email.');
      return;
    }

    console.log(`📅 Daily Alert Check: Found ${lowStockMedicines.length} low-stock & ${expiringMedicines.length} expiring medicines. Dispatched alert email.`);

    // Generate CSV content
    const headers = ['Alert Type', 'Medicine Name', 'Generic Name', 'Category', 'Batch Number', 'Stock Quantity', 'Reorder Level', 'Expiry Date', 'Selling Price'];
    const csvRows = [headers.join(',')];

    lowStockMedicines.forEach(med => {
      const row = [
        'LOW STOCK',
        med.name,
        med.genericName || 'N/A',
        med.category || 'N/A',
        med.batchNumber || 'N/A',
        med.quantity,
        med.reorderLevel,
        new Date(med.expiryDate).toLocaleDateString('en-IN'),
        med.sellingPrice
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      csvRows.push(row);
    });

    expiringMedicines.forEach(med => {
      const row = [
        'EXPIRING SOON',
        med.name,
        med.genericName || 'N/A',
        med.category || 'N/A',
        med.batchNumber || 'N/A',
        med.quantity,
        med.reorderLevel,
        new Date(med.expiryDate).toLocaleDateString('en-IN'),
        med.sellingPrice
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');

    // 1. Send email alert (concurrently)
    sendAlertEmail({
      lowStockItems: lowStockMedicines,
      expiringItems: expiringMedicines,
      csvContent
    })
    .then(() => console.log('✉️ Daily Email check dispatched successfully.'))
    .catch(emailError => console.error('❌ Daily Email check dispatch failed:', emailError.message));

    // 2. Send WhatsApp alert (concurrently)
    try {
      const { sendWhatsAppAlert } = require('./utils/whatsappUtils');
      const totalLow = lowStockMedicines.length;
      const totalExp = expiringMedicines.length;
      
      let text = `🚨 *MediCare Pharmacy Inventory Alert* 🚨\n\n`;
      if (totalLow > 0) text += `• *Low Stock Items:* ${totalLow} items are below safety thresholds.\n`;
      if (totalExp > 0) text += `• *Expiring Items:* ${totalExp} items are expiring soon.\n`;
      text += `\nPlease review the attached CSV report file.`;

      sendWhatsAppAlert({
        text,
        csvContent,
        csvFilename: `Inventory_Alert_${new Date().toISOString().split('T')[0]}.csv`
      })
      .then(() => console.log('📱 Daily WhatsApp check dispatched successfully.'))
      .catch(whatsappError => console.error('❌ Daily WhatsApp check dispatch failed:', whatsappError.message));
    } catch (whatsappError) {
      console.error('❌ Daily WhatsApp check dispatch setup failed:', whatsappError.message);
    }
  } catch (error) {
    console.error('❌ Daily Alert Check failed:', error.message);
  }
};

// Start background timers
setTimeout(runDailyCheck, 10000);
setInterval(runDailyCheck, 24 * 60 * 60 * 1000);