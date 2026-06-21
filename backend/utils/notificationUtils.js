let notificationClients = [];

const registerNotificationClient = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  notificationClients.push(newClient);

  req.on('close', () => {
    notificationClients = notificationClients.filter(c => c.id !== clientId);
  });
};

const sendRealtimeNotification = (notification) => {
  const data = JSON.stringify(notification);
  notificationClients.forEach(client => {
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch (e) {
      // client connection might be broken
    }
  });
};

module.exports = {
  registerNotificationClient,
  sendRealtimeNotification
};
