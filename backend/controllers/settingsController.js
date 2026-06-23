const Settings = require('../models/Settings');
const { logAudit, computeChanges } = require('../middleware/auditMiddleware');

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        lowStockThreshold: 20,
        expiryWarningDays: 60,
        emailAlertIntervalHours: 24
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error('❌ Error in getSettings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { 
      lowStockThreshold, expiryWarningDays, emailAlertIntervalHours,
      pharmacyGSTIN, pharmacyState, pharmacyStateName, defaultGSTRate,
      whatsappEnabled, whatsappRecipient, whatsappApiKey
    } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const oldData = settings.toObject();
    
    if (lowStockThreshold !== undefined) settings.lowStockThreshold = Number(lowStockThreshold);
    if (expiryWarningDays !== undefined) settings.expiryWarningDays = Number(expiryWarningDays);
    if (emailAlertIntervalHours !== undefined) settings.emailAlertIntervalHours = Number(emailAlertIntervalHours);
    if (pharmacyGSTIN !== undefined) settings.pharmacyGSTIN = pharmacyGSTIN;
    if (pharmacyState !== undefined) settings.pharmacyState = pharmacyState;
    if (pharmacyStateName !== undefined) settings.pharmacyStateName = pharmacyStateName;
    if (defaultGSTRate !== undefined) settings.defaultGSTRate = Number(defaultGSTRate);
    
    if (whatsappEnabled !== undefined) settings.whatsappEnabled = Boolean(whatsappEnabled);
    if (whatsappRecipient !== undefined) settings.whatsappRecipient = whatsappRecipient;
    if (whatsappApiKey !== undefined) settings.whatsappApiKey = whatsappApiKey;
    
    await settings.save();

    // Sync WhatsApp status in memory after database update
    await whatsappUtils.syncStatusFromDB();

    const changes = computeChanges(oldData, settings.toObject(), [
      'lowStockThreshold', 'expiryWarningDays', 'emailAlertIntervalHours',
      'pharmacyGSTIN', 'pharmacyState', 'pharmacyStateName', 'defaultGSTRate',
      'whatsappEnabled', 'whatsappRecipient', 'whatsappApiKey'
    ]);

    if (changes) {
      await logAudit({
        action: 'SETTINGS_CHANGE',
        entity: 'Settings',
        entityId: settings._id,
        entityName: 'System Settings',
        user: req.user,
        changes,
        details: `Updated system settings`,
        ipAddress: req.ip
      });
    }
    
    res.json({ 
      success: true, 
      settings, 
      message: 'Settings updated successfully!' 
    });
  } catch (error) {
    console.error('❌ Error in updateSettings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const whatsappUtils = require('../utils/whatsappUtils');

exports.getWhatsAppStatusSSE = (req, res) => {
  whatsappUtils.registerStatusClient(req, res);
};

exports.disconnectWhatsApp = async (req, res) => {
  try {
    const success = await whatsappUtils.disconnectClient();
    res.json({ success, message: success ? 'WhatsApp client disconnected and logged out.' : 'Failed to disconnect.' });
  } catch (error) {
    console.error('❌ Error in disconnectWhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.connectWhatsApp = async (req, res) => {
  try {
    const success = await whatsappUtils.connectClient();
    res.json({ success, message: success ? 'WhatsApp client initialization started.' : 'Client is already connecting or active.' });
  } catch (error) {
    console.error('❌ Error in connectWhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWhatsAppStatusJSON = (req, res) => {
  try {
    const { status, qr } = whatsappUtils.getStatus();
    res.json({ success: true, status, qr });
  } catch (error) {
    console.error('❌ Error in getWhatsAppStatusJSON:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendTestWhatsApp = async (req, res) => {
  try {
    const { whatsappRecipient, whatsappApiKey } = req.body;
    
    let recipient = whatsappRecipient || '';
    let apiKey = whatsappApiKey || '';
    
    if (!recipient || !apiKey) {
      const settings = await Settings.findOne();
      if (settings) {
        if (!recipient) recipient = settings.whatsappRecipient;
        if (!apiKey) apiKey = settings.whatsappApiKey;
      }
    }
    
    if (!recipient || !apiKey) {
      return res.status(400).json({ success: false, message: 'Recipient phone number and API key are required to send a test alert.' });
    }
    
    recipient = recipient.replace(/[^0-9]/g, '');
    if (recipient.length === 10) {
      recipient = '91' + recipient;
    }
    
    const text = 'Hello! This is a test message from Medicare Pharmacy alert system. Your WhatsApp configuration is working perfectly! 🚀';
    const url = `https://api.callmebot.com/whatsapp.php?phone=${recipient}&text=${encodeURIComponent(text)}&apikey=${apiKey.trim()}`;
    
    console.log(`📡 Sending manual test CallMeBot alert to ${recipient}...`);
    const response = await fetch(url);
    if (response.ok) {
      res.json({ success: true, message: 'Test message sent successfully! Please check your WhatsApp.' });
    } else {
      const responseText = await response.text();
      res.status(500).json({ success: false, message: `CallMeBot failed to send message: ${responseText}` });
    }
  } catch (error) {
    console.error('❌ Error in sendTestWhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
