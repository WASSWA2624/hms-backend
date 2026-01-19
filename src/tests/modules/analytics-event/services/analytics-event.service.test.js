/**
 * Analytics event service tests
 *
 * @module tests/modules/analytics-event/services
 * @description Tests for analytics event service layer
 * Per testing.mdc: Comprehensive service tests with mocked repository
 */

const analyticsEventService = require('@modules/analytics-event/services/analytics-event.service');
const analyticsEventRepository = require('@modules/analytics-event/repositories/analytics-event.repository');
const { createAuditLog } = require('@lib/audit');

// Mock repository and audit
jest.mock('@modules/analytics-event/repositories/analytics-event.repository');
jest.mock('@lib/audit');

describe('Analytics Event Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'user-id-123';
  const mockIpAddress = '127.0.0.1';

  const mockAnalyticsEvent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: '660e8400-e29b-41d4-a716-446655440000',
    user_id: '770e8400-e29b-41d4-a716-446655440000',
    event_name: 'page_view',
    payload_json: { page: '/dashboard' },
    occurred_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    version: 1
  };

  describe('listAnalyticsEvents', () => {
    it('should list analytics events with pagination', async () => {
      const mockEvents = [mockAnalyticsEvent];
      analyticsEventRepository.findMany.mockResolvedValue(mockEvents);
      analyticsEventRepository.count.mockResolvedValue(1);

      const result = await analyticsEventService.listAnalyticsEvents(
        {},
        1,
        20,
        'created_at',
        'desc',
        mockUserId,
        mockIpAddress
      );

      expect(result.analyticsEvents).toEqual(mockEvents);
    });
  });

  describe('getAnalyticsEventById', () => {
    it('should get analytics event by ID', async () => {
      analyticsEventRepository.findById.mockResolvedValue(mockAnalyticsEvent);

      const result = await analyticsEventService.getAnalyticsEventById(
        mockAnalyticsEvent.id,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockAnalyticsEvent);
    });
  });

  describe('createAnalyticsEvent', () => {
    it('should create analytics event and audit log', async () => {
      analyticsEventRepository.create.mockResolvedValue(mockAnalyticsEvent);
      createAuditLog.mockResolvedValue({});

      const result = await analyticsEventService.createAnalyticsEvent(
        {},
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockAnalyticsEvent);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateAnalyticsEvent', () => {
    it('should update analytics event and audit log', async () => {
      const updated = { ...mockAnalyticsEvent, event_name: 'button_click' };
      analyticsEventRepository.findById.mockResolvedValue(mockAnalyticsEvent);
      analyticsEventRepository.update.mockResolvedValue(updated);
      createAuditLog.mockResolvedValue({});

      const result = await analyticsEventService.updateAnalyticsEvent(
        mockAnalyticsEvent.id,
        {},
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(updated);
    });
  });

  describe('deleteAnalyticsEvent', () => {
    it('should soft delete analytics event and audit log', async () => {
      analyticsEventRepository.findById.mockResolvedValue(mockAnalyticsEvent);
      analyticsEventRepository.softDelete.mockResolvedValue({ ...mockAnalyticsEvent, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await analyticsEventService.deleteAnalyticsEvent(
        mockAnalyticsEvent.id,
        mockUserId,
        mockIpAddress
      );

      expect(analyticsEventRepository.softDelete).toHaveBeenCalled();
    });
  });
});
