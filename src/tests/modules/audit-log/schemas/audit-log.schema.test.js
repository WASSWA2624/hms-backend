/**
 * Audit log schema tests
 *
 * @module tests/modules/audit-log/schemas
 * @description Tests for audit log validation schemas
 */

const {
  auditLogIdParamsSchema,
  userIdParamsSchema,
  entityParamsSchema,
  listAuditLogsQuerySchema
} = require('@modules/audit-log/schemas/audit-log.schema');

describe('Audit Log Schemas', () => {
  describe('auditLogIdParamsSchema', () => {
    it('should validate valid UUID', () => {
      const validData = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const result = auditLogIdParamsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = { id: 'invalid-uuid' };
      const result = auditLogIdParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const invalidData = {};
      const result = auditLogIdParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('userIdParamsSchema', () => {
    it('should validate valid user ID', () => {
      const validData = { userId: '123e4567-e89b-12d3-a456-426614174000' };
      const result = userIdParamsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid user ID', () => {
      const invalidData = { userId: 'not-a-uuid' };
      const result = userIdParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('entityParamsSchema', () => {
    it('should validate valid entity params', () => {
      const validData = {
        entity: 'user',
        entityId: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = entityParamsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid entity ID', () => {
      const invalidData = {
        entity: 'user',
        entityId: 'invalid-id'
      };
      const result = entityParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty entity', () => {
      const invalidData = {
        entity: '',
        entityId: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = entityParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject entity exceeding max length', () => {
      const invalidData = {
        entity: 'a'.repeat(121),
        entityId: '123e4567-e89b-12d3-a456-426614174000'
      };
      const result = entityParamsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('listAuditLogsQuerySchema', () => {
    it('should validate empty query', () => {
      const validData = {};
      const result = listAuditLogsQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with pagination params', () => {
      const validData = {
        page: '1',
        limit: '20',
        sort_by: 'created_at',
        order: 'desc'
      };
      const result = listAuditLogsQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with filter params', () => {
      const validData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'CREATE',
        entity: 'user',
        entity_id: '123e4567-e89b-12d3-a456-426614174000',
        ip_address: '192.168.1.1'
      };
      const result = listAuditLogsQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with date range', () => {
      const validData = {
        date_from: '2026-01-01T00:00:00.000Z',
        date_to: '2026-01-31T23:59:59.999Z'
      };
      const result = listAuditLogsQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate valid action enum', () => {
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'EXPORT', 'LOGIN', 'LOGOUT'];
      actions.forEach(action => {
        const validData = { action };
        const result = listAuditLogsQuerySchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid action', () => {
      const invalidData = { action: 'INVALID_ACTION' };
      const result = listAuditLogsQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const invalidData = { date_from: '2026-01-01' };
      const result = listAuditLogsQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in filters', () => {
      const invalidData = { tenant_id: 'not-a-uuid' };
      const result = listAuditLogsQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
