const AuditLog = require('../models/AuditLog');

/**
 * Logs an audit entry. Call this from controllers after successful operations.
 * 
 * @param {Object} params
 * @param {string} params.action - CREATE, UPDATE, DELETE, LOGIN, LOGOUT, SETTINGS_CHANGE
 * @param {string} params.entity - Medicine, Sale, Purchase, Supplier, User, Settings
 * @param {string} [params.entityId] - MongoDB ObjectId of the affected record
 * @param {string} [params.entityName] - Human-readable name (e.g. "Paracetamol 500mg")
 * @param {Object} [params.user] - The req.user object (must have _id and name)
 * @param {Object} [params.changes] - { field: { from: oldValue, to: newValue } }
 * @param {string} [params.details] - Free-text description
 * @param {string} [params.ipAddress] - Request IP
 */
const logAudit = async ({ action, entity, entityId, entityName, user, changes, details, ipAddress }) => {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId: entityId || undefined,
      entityName: entityName || '',
      user: user?._id || undefined,
      userName: user?.name || 'System',
      changes: changes || null,
      details: details || '',
      ipAddress: ipAddress || ''
    });
  } catch (error) {
    // Never let audit logging crash the actual operation
    console.error('⚠️ Audit logging failed:', error.message);
  }
};

/**
 * Computes a diff between two objects, returning only changed fields.
 * Useful for UPDATE audit entries.
 * 
 * @param {Object} oldDoc - The document before update (plain object)
 * @param {Object} newDoc - The document after update (plain object)
 * @param {string[]} fields - Fields to compare
 * @returns {Object|null} - { field: { from, to } } or null if no changes
 */
const computeChanges = (oldDoc, newDoc, fields) => {
  const changes = {};
  let hasChanges = false;

  for (const field of fields) {
    const oldVal = oldDoc[field];
    const newVal = newDoc[field];

    // Handle Date comparison
    const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? '');
    const newStr = newVal instanceof Date ? newVal.toISOString() : String(newVal ?? '');

    if (oldStr !== newStr) {
      changes[field] = { from: oldVal, to: newVal };
      hasChanges = true;
    }
  }

  return hasChanges ? changes : null;
};

module.exports = { logAudit, computeChanges };
