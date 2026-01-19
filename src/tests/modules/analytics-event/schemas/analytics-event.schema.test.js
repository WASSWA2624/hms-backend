/**
 * Analytics event schema tests
 *
 * @module tests/modules/analytics-event/schemas
 * @description Tests for analytics event validation schemas
 * Per testing.mdc: Comprehensive validation schema tests required
 */

const {
  createAnalyticsEventSchema,
  updateAnalyticsEventSchema,
  analyticsEventIdParamsSchema,
  listAnalyticsEventsQuerySchema
} = require('@modules/analytics-event/schemas/analytics-event.schema');

describe('Analytics Event Schemas', () => {
  describe('createAnalyticsEventSchema', () => {
    const validData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      event_name: 'page_view',
      user_id: '660e8400-e29b-41d4-a716-446655440000',
      payload_json: { page: '/dashboard', duration: 5000 }
    };

    it('should validate correct analytics event data', () => {
      const result = createAnalyticsEventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require tenant_id', () => {
      const data = { ...validData };
      delete data.tenant_id;
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require event_name', () => {
      const data = { ...validData };
      delete data.event_name;
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept user_id as optional', () => {
      const data = { ...validData };
      delete data.user_id;
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept null user_id', () => {
      const data = { ...validData, user_id: null };
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept payload_json as optional', () => {
      const data = { ...validData };
      delete data.payload_json;
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept complex payload_json object', () => {
      const data = { 
        ...validData, 
        payload_json: { 
          page: '/dashboard', 
          action: 'click',
          metadata: { button: 'save', location: 'top' } 
        } 
      };
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject payload_json as array', () => {
      const data = { ...validData, payload_json: ['item1', 'item2'] };
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should trim string fields', () => {
      const data = { ...validData, event_name: '  page_view  ' };
      const result = createAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.event_name).toBe('page_view');
      }
    });
  });

  describe('updateAnalyticsEventSchema', () => {
    it('should validate correct update data', () => {
      const data = {
        event_name: 'button_click',
        payload_json: { button: 'submit' }
      };
      const result = updateAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept partial updates', () => {
      const data = { event_name: 'Updated Event' };
      const result = updateAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateAnalyticsEventSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept null for nullable fields', () => {
      const data = { payload_json: null };
      const result = updateAnalyticsEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('analyticsEventIdParamsSchema', () => {
    it('should validate correct UUID', () => {
      const data = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const result = analyticsEventIdParamsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      const data = { id: 'invalid-uuid' };
      const result = analyticsEventIdParamsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('listAnalyticsEventsQuerySchema', () => {
    it('should validate empty query', () => {
      const result = listAnalyticsEventsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate all filter params', () => {
      const data = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '660e8400-e29b-41d4-a716-446655440000',
        event_name: 'page_view',
        search: 'click',
        occurred_at_from: '2026-01-01T00:00:00Z',
        occurred_at_to: '2026-01-31T23:59:59Z',
        page: '1',
        limit: '20',
        sort_by: 'event_name',
        order: 'asc'
      };
      const result = listAnalyticsEventsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
