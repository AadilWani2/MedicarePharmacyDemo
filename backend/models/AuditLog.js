const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SETTINGS_CHANGE']
  },
  entity: {
    type: String,
    required: true,
    enum: ['Medicine', 'Sale', 'Purchase', 'Supplier', 'User', 'Settings']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  entityName: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: {
    type: String,
    default: 'System'
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  details: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient querying
auditLogSchema.index({ entity: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
