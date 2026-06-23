const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

let client = null;
let isReady = false;
let connectionStatus = 'disconnected';
let qrText = null;
let sseClients = [];

const broadcastWhatsAppStatus = () => {
  const data = JSON.stringify({ status: connectionStatus, qr: qrText });
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
  const initialData = JSON.stringify({ status: connectionStatus, qr: qrText });
  res.write(`data: ${initialData}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
};

const killOrphanedChromes = () => {
  if (process.platform !== 'win32') return;
  try {
    console.log('🧹 Scanning for orphaned Puppeteer Chrome processes...');
    // Finds and kills any chrome.exe process that has wwebjs_auth in its command-line arguments safely without $_ variable
    const cmd = 'powershell -Command "Get-Process -Id (Get-CimInstance Win32_Process -Filter \'Name = \'\'chrome.exe\'\'\' | Where-Object CommandLine -like \'*wwebjs_auth*\' | ForEach-Object ProcessId) -ErrorAction SilentlyContinue | Stop-Process -Force"';
    execSync(cmd, { stdio: 'ignore' });
    console.log('🧹 Cleaned up orphaned Puppeteer processes.');
  } catch (e) {
    // Ignore errors (e.g. if no processes found)
  }
};

const initWhatsApp = () => {
  if (process.env.WHATSAPP_ALERTS_ENABLED !== 'true') {
    console.log('🔌 WhatsApp Alerts are disabled in .env. Skipping initialization.');
    connectionStatus = 'disconnected';
    broadcastWhatsAppStatus();
    return;
  }

  connectionStatus = 'connecting';
  qrText = null;
  broadcastWhatsAppStatus();

  // Kill orphaned processes first to release any folder locks
  killOrphanedChromes();

  // Wait 1.5 seconds to let the OS fully release file handles
  try {
    execSync('powershell -Command "Start-Sleep -m 1500"', { stdio: 'ignore' });
  } catch (e) {
    // Ignore error
  }

  console.log('🔄 Initializing WhatsApp client...');
  
  // Find system Chrome/Edge to avoid Puppeteer download issues
  const getExecutablePath = () => {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome-unstable'
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return undefined;
  };

  const executablePath = getExecutablePath();
  if (executablePath) {
    console.log(`🔎 Found system browser to launch Puppeteer: ${executablePath}`);
  }

  // Clear any stale browser locks (very common on nodemon restarts)
  const sessionDirs = [
    path.join(__dirname, '../.wwebjs_auth/session-medicare-pharmacy-session'),
    path.join(__dirname, '../.wwebjs_auth/RemoteAuth-medicare-pharmacy-session')
  ];
  const lockFiles = [];
  sessionDirs.forEach(dir => {
    lockFiles.push(path.join(dir, 'lockfile'));
    lockFiles.push(path.join(dir, 'SingletonLock'));
  });

  lockFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        console.log(`🧹 Removing stale Puppeteer lock file: ${path.basename(file)}`);
        fs.unlinkSync(file);
      }
    } catch (e) {
      console.log(`⚠️ Puppeteer lock file cleanup skipped for ${path.basename(file)}:`, e.message);
    }
  });

  try {
    console.log('💾 Using LocalAuth to persist WhatsApp session...');
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'medicare-pharmacy-session',
        dataPath: path.join(__dirname, '../.wwebjs_auth')
      }),
      puppeteer: {
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process', // Critical for saving memory on Linux (Render)
          '--disable-features=site-per-process', // Prevent Chrome process overhead
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-software-rasterizer',
          '--disable-gl-drawing',
          '--js-flags="--max-old-space-size=150"' // Restrict V8 heap size inside Chrome
        ]
      }
    });

    client.on('qr', (qr) => {
      console.log('\n📲 Scan the QR code below with your WhatsApp app (Linked Devices) to log in:');
      qrcode.generate(qr, { small: true });
      connectionStatus = 'qr';
      qrText = qr;
      broadcastWhatsAppStatus();
    });

    client.on('authenticated', () => {
      console.log('\n🔐 WhatsApp QR scanned & authenticated! Waiting for client to be ready...');
      connectionStatus = 'authenticated';
      qrText = null;
      broadcastWhatsAppStatus();
    });

    client.on('ready', () => {
      console.log('\n✅ WhatsApp client is ready and connected!');
      isReady = true;
      connectionStatus = 'ready';
      qrText = null;
      broadcastWhatsAppStatus();
    });

    client.on('auth_failure', (msg) => {
      console.error('\n❌ WhatsApp Authentication failure:', msg);
      isReady = false;
      connectionStatus = 'disconnected';
      qrText = null;
      broadcastWhatsAppStatus();
    });

    client.on('disconnected', (reason) => {
      console.log('\n🔌 WhatsApp client disconnected:', reason);
      isReady = false;
      connectionStatus = 'disconnected';
      qrText = null;
      broadcastWhatsAppStatus();
      
      // Auto-restart client on disconnection
      console.log('🔄 Attempting to re-initialize WhatsApp client...');
      setTimeout(() => {
        try {
          if (client) {
            connectionStatus = 'connecting';
            broadcastWhatsAppStatus();
            client.initialize();
          }
        } catch (e) {
          console.error('❌ Failed to re-initialize WhatsApp:', e.message);
          connectionStatus = 'disconnected';
          broadcastWhatsAppStatus();
        }
      }, 10000);
    });

    client.initialize();
  } catch (error) {
    console.error('❌ WhatsApp initialization failed:', error.message);
    connectionStatus = 'disconnected';
    broadcastWhatsAppStatus();
  }
};

const sendWhatsAppAlert = async ({ text, csvContent, csvFilename }) => {
  if (process.env.WHATSAPP_ALERTS_ENABLED !== 'true') {
    return;
  }

  if (!client || !isReady) {
    console.log('⚠️ WhatsApp client is not initialized or not ready. Check QR connection.');
    return;
  }

  const recipient = process.env.WHATSAPP_RECIPIENT;
  if (!recipient) {
    console.log('⚠️ WHATSAPP_RECIPIENT is not configured in .env. Skipping WhatsApp alert.');
    return;
  }

  try {
    // Format recipient phone number: e.g. 919876543210 (must have country code, no + sign)
    let formattedPhone = recipient.replace(/[^0-9]/g, '');
    // If it's a 10-digit number (typical for Indian numbers), auto-prepend 91
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    let chatId = `${formattedPhone}@c.us`;
    try {
      const numberId = await client.getNumberId(formattedPhone);
      if (numberId) {
        chatId = numberId._serialized;
      } else {
        console.warn(`⚠️ The phone number ${recipient} was not found by WhatsApp lookup. Attempting to send to default ID ${chatId}...`);
      }
    } catch (err) {
      console.warn(`⚠️ WhatsApp number lookup failed for ${recipient}: ${err.message}. Falling back to default ID ${chatId}...`);
    }
    
    // Send text alert
    await client.sendMessage(chatId, text);
    console.log(`📱 WhatsApp text alert sent to ${recipient} (chat ID: ${chatId})`);

    // Send CSV attachment if available
    if (csvContent && csvFilename) {
      const base64Content = Buffer.from(csvContent).toString('base64');
      const media = new MessageMedia(
        'text/csv',
        base64Content,
        csvFilename
      );
      await client.sendMessage(chatId, media);
      console.log(`📎 WhatsApp CSV report attachment sent to ${recipient}`);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp alert:', error.message);
  }
};

const disconnectClient = async () => {
  if (!client) return true;
  try {
    connectionStatus = 'connecting';
    broadcastWhatsAppStatus();
    
    try {
      await client.logout();
    } catch (err) {
      console.log('WhatsApp client logout warning:', err.message);
    }
    
    try {
      await client.destroy();
    } catch (err) {
      console.log('WhatsApp client destroy warning:', err.message);
    }
    
    client = null;
    isReady = false;
    connectionStatus = 'disconnected';
    qrText = null;
    broadcastWhatsAppStatus();
    
    // Delete session directory
    const sessionDir = path.join(__dirname, '../.wwebjs_auth/session-medicare-pharmacy-session');
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log('🧹 Deleted WhatsApp session directory for clean logout.');
      } catch (rmErr) {
        console.warn('⚠️ Could not remove session directory:', rmErr.message);
      }
    }
    
    return true;
  } catch (e) {
    console.error('Error disconnecting WhatsApp:', e.message);
    connectionStatus = 'disconnected';
    broadcastWhatsAppStatus();
    return false;
  }
};

const connectClient = async () => {
  if (client && (connectionStatus === 'ready' || connectionStatus === 'connecting' || connectionStatus === 'qr')) {
    return false;
  }
  initWhatsApp();
  return true;
};

module.exports = {
  initWhatsApp,
  sendWhatsAppAlert,
  isWhatsAppReady: () => isReady,
  registerStatusClient,
  disconnectClient,
  connectClient,
  getStatus: () => ({ status: connectionStatus, qr: qrText })
};
// Trigger restart
