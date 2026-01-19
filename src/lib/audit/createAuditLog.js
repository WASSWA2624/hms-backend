/**
 * Create Audit Log Entry
 * 
 * Creates audit log entry for mutations per compliance.mdc and prisma.mdc
 * Audit logs must include: user_id, action, entity, entity_id, diff (before/after), ip, created_at
 * Audit log creation must not prevent primary operation from completing (non-blocking)
 * 
 * Per prisma.mdc: Audit trail creation should be handled in service layer, not repositories
 * Audit trail failures must not prevent the primary operation (log errors, don't throw)
 */

const { logger } = require('@lib/logging');

// Prisma may not be available during initial setup
let prisma = null;
try {
  prisma = require('@prisma/client'); // This resolves to src/prisma/client.js
} catch (err) {
  // Prisma not available yet, will be handled gracefully
}

/**
 * Create audit log entry (non-blocking)
 * 
 * @param {Object} auditData - Audit log data
 * @param {string} [auditData.user_id] - User ID who performed the action
 * @param {string} auditData.action - Action type (e.g., 'create', 'update', 'delete')
 * @param {string} auditData.entity - Entity type (e.g., 'user', 'product', 'order')
 * @param {string} auditData.entity_id - Entity ID
 * @param {Object} [auditData.diff] - Before/after changes (JSON object)
 * @param {string} [auditData.ip] - IP address of the request
 * @returns {Promise<void>} Resolves when audit log is created (or fails silently)
 */
const createAuditLog = async (auditData) => {
  // Validate required fields
  if (!auditData || !auditData.action || !auditData.entity || !auditData.entity_id) {
    logger.warn('Invalid audit log data: missing required fields', { auditData });
    return;
  }

  // If Prisma is not available, log warning and return (non-blocking)
  if (!prisma) {
    logger.warn('Prisma client not available, skipping audit log creation', {
      action: auditData.action,
      entity: auditData.entity,
      entity_id: auditData.entity_id
    });
    return;
  }

  try {
    // Create audit log entry asynchronously (non-blocking)
    // Use setImmediate to ensure it doesn't block the main operation
    setImmediate(async () => {
      try {
        await prisma.audit_log.create({
          data: {
            user_id: auditData.user_id || null,
            action: auditData.action,
            entity: auditData.entity,
            entity_id: auditData.entity_id,
            diff: auditData.diff || null,
            ip: auditData.ip || null,
            created_at: new Date()
          }
        });
      } catch (err) {
        // Log error but don't throw (non-blocking)
        logger.error('Failed to create audit log entry', {
          error: err.message,
          action: auditData.action,
          entity: auditData.entity,
          entity_id: auditData.entity_id
        });
      }
    });
  } catch (err) {
    // Log error but don't throw (non-blocking)
    logger.error('Failed to schedule audit log creation', {
      error: err.message,
      action: auditData.action,
      entity: auditData.entity,
      entity_id: auditData.entity_id
    });
  }
};

module.exports = { createAuditLog };

