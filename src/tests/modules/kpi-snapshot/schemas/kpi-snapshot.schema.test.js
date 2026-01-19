/**
 * KPI snapshot schema tests
 *
 * @module tests/modules/kpi-snapshot/schemas
 * @description Tests for KPI snapshot validation schemas
 * Per testing.mdc: Comprehensive validation schema tests required
 */

const {
  createKpiSnapshotSchema,
  updateKpiSnapshotSchema,
  kpiSnapshotIdParamsSchema,
  listKpiSnapshotsQuerySchema
} = require('@modules/kpi-snapshot/schemas/kpi-snapshot.schema');

describe('KPI Snapshot Schemas', () => {
  describe('createKpiSnapshotSchema', () => {
    const validData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Revenue',
      value: '12500.50'
    };

    it('should validate correct KPI snapshot data', () => {
      const result = createKpiSnapshotSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require tenant_id', () => {
      const data = { ...validData };
      delete data.tenant_id;
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require name', () => {
      const data = { ...validData };
      delete data.name;
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require value', () => {
      const data = { ...validData };
      delete data.value;
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept recorded_at as optional', () => {
      const data = { ...validData, recorded_at: '2026-01-19T12:00:00Z' };
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept value with up to 4 decimal places', () => {
      const data = { ...validData, value: '123.4567' };
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject value with more than 4 decimal places', () => {
      const data = { ...validData, value: '123.45678' };
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept integer value', () => {
      const data = { ...validData, value: '123' };
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject non-numeric value', () => {
      const data = { ...validData, value: 'not-a-number' };
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should trim string fields', () => {
      const data = { ...validData, name: '  Revenue  ', value: '  123.45  ' };
      const result = createKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Revenue');
        expect(result.data.value).toBe('123.45');
      }
    });
  });

  describe('updateKpiSnapshotSchema', () => {
    it('should validate correct update data', () => {
      const data = {
        name: 'Updated Revenue',
        value: '15000.75'
      };
      const result = updateKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept partial updates', () => {
      const data = { name: 'Updated Name' };
      const result = updateKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateKpiSnapshotSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should enforce value format', () => {
      const data = { value: '123.45678' };
      const result = updateKpiSnapshotSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('kpiSnapshotIdParamsSchema', () => {
    it('should validate correct UUID', () => {
      const data = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = kpiSnapshotIdParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const data = { id: 'invalid-uuid' };
      const result = kpiSnapshotIdParamsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('listKpiSnapshotsQuerySchema', () => {
    it('should validate empty query', () => {
      const result = listKpiSnapshotsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate date range filters', () => {
      const data = {
        recorded_at_from: '2026-01-01T00:00:00Z',
        recorded_at_to: '2026-01-31T23:59:59Z'
      };
      const result = listKpiSnapshotsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate all filter params', () => {
      const data = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Revenue',
        search: 'kpi',
        recorded_at_from: '2026-01-01T00:00:00Z',
        recorded_at_to: '2026-01-31T23:59:59Z',
        page: '1',
        limit: '20',
        sort_by: 'name',
        order: 'asc'
      };
      const result = listKpiSnapshotsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
