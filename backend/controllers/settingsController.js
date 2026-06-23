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
      pharmacyGSTIN, pharmacyState, pharmacyStateName, defaultGSTRate
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
    
    await settings.save();

    const changes = computeChanges(oldData, settings.toObject(), [
      'lowStockThreshold', 'expiryWarningDays', 'emailAlertIntervalHours',
      'pharmacyGSTIN', 'pharmacyState', 'pharmacyStateName', 'defaultGSTRate'
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
