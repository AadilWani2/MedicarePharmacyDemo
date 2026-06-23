const path = require('path');
const fs = require('fs');

let connectionStatus = 'disconnected';
let sseClients = [];

const broadcastWhatsAppStatus = () => {
  const data = JSON.stringify({ status: connectionStatus, qr: null });
  sseClients.forEach(c => {
    try {
      c.res.write(`data: ${data}\n\n`);
    } catch (e) {
      // client connection might be broken
    }
  });
};

const registerStatusClient = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders();

  // Send current state immediately
  const initialData = JSON.stringify({ status: connectionStatus, qr: null });
  res.write(`data: ${initialData}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
};

const syncStatusFromDB = async () => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    if (settings && settings.whatsappEnabled && settings.whatsappRecipient && settings.whatsappApiKey) {
      connectionStatus = 'ready';
    } else {
      connectionStatus = 'disconnected';
    }
  } catch (err) {
    console.error('❌ Error syncing WhatsApp status from DB:', err.message);
    connectionStatus = 'disconnected';
  }
};

const initWhatsApp = async () => {
  console.log('🔄 Initializing CallMeBot WhatsApp Alerts Gateway...');
  await syncStatusFromDB();
  console.log(`📱 WhatsApp status synchronized: ${connectionStatus}`);
};

const sendWhatsAppAlert = async ({ text, csvContent, csvFilename }) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne();
    
    if (!settings || !settings.whatsappEnabled || !settings.whatsappRecipient || !settings.whatsappApiKey) {
      console.log('⚠️ WhatsApp Alerts are disabled or not configured in settings. Skipping.');
      return;
    }

    let recipient = settings.whatsappRecipient.replace(/[^0-9]/g, '');
    // If it's a 10-digit Indian number, auto-prepend 91
    if (recipient.length === 10) {
      recipient = '91' + recipient;
    }

    const apiKey = settings.whatsappApiKey.trim();

    // Prepare text content
    let fullText = text;
    if (csvContent) {
      const lines = csvContent.split('\n').filter(line => line.trim());
      const summaryLines = lines.slice(1, 10); // Grab up to 9 rows
      if (summaryLines.length > 0) {
        fullText += '\n\nAlert Details:\n' + summaryLines.map(l => l.replace(/,/g, ' | ')).join('\n');
        if (lines.length > 10) {
          fullText += `\n...and ${lines.length - 10} more items.`;
        }
      }
    }

    // CallMeBot API URL
    const url = `https://api.callmebot.com/whatsapp.php?phone=${recipient}&text=${encodeURIComponent(fullText)}&apikey=${apiKey}`;

    console.log(`📡 Sending CallMeBot WhatsApp alert to ${recipient}...`);
    const response = await fetch(url);
    if (response.ok) {
      console.log(`✅ WhatsApp alert successfully sent to ${recipient} via CallMeBot!`);
    } else {
      const responseText = await response.text();
      console.error(`❌ CallMeBot failed to send message: Status ${response.status} - ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp alert via CallMeBot:', error.message);
  }
};

const disconnectClient = async () => {
  try {
    const Settings = require('../models/Settings');
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    settings.whatsappEnabled = false;
    await settings.save();
    
    connectionStatus = 'disconnected';
    broadcastWhatsAppStatus();
    console.log('🔌 WhatsApp Alerts disabled successfully.');
    return true;
  } catch (e) {
    console.error('❌ Error disabling WhatsApp:', e.message);
    connectionStatus = 'disconnected';
    broadcastWhatsAppStatus();
    return false;
  }
};

const connectClient = async () => {
  try {
    const Settings = require('../models/Settings');
    let settings = await Settings.findOne();
    if (!settings || !settings.whatsappRecipient || !settings.whatsappApiKey) {
      console.log('⚠️ Cannot enable WhatsApp: recipient phone or API key is not configured.');
      return false;
    }
    
    settings.whatsappEnabled = true;
    await settings.save();
    
    connectionStatus = 'ready';
    broadcastWhatsAppStatus();
    console.log('🔌 WhatsApp Alerts enabled successfully.');
    return true;
  } catch (e) {
    console.error('❌ Error enabling WhatsApp:', e.message);
    return false;
  }
};

module.exports = {
  initWhatsApp,
  sendWhatsAppAlert,
  isWhatsAppReady: () => connectionStatus === 'ready',
  registerStatusClient,
  disconnectClient,
  connectClient,
  getStatus: () => ({ status: connectionStatus, qr: null }),
  syncStatusFromDB
};
