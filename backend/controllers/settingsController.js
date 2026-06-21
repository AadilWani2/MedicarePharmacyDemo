const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    console.error('❌ Error in getSettings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { lowStockThreshold, expiryWarningDays, emailAlertIntervalHours } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    if (lowStockThreshold !== undefined) settings.lowStockThreshold = Number(lowStockThreshold);
    if (expiryWarningDays !== undefined) settings.expiryWarningDays = Number(expiryWarningDays);
    if (emailAlertIntervalHours !== undefined) settings.emailAlertIntervalHours = Number(emailAlertIntervalHours);
    
    await settings.save();
    
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
