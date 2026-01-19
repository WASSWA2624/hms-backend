/**
 * Dashboard widget service tests
 *
 * @module tests/modules/dashboard-widget/services
 * @description Tests for dashboard widget service layer
 * Per testing.mdc: Comprehensive service tests with mocked repository
 */

const dashboardWidgetService = require('@modules/dashboard-widget/services/dashboard-widget.service');
const dashboardWidgetRepository = require('@modules/dashboard-widget/repositories/dashboard-widget.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@modules/dashboard-widget/repositories/dashboard-widget.repository');
jest.mock('@lib/audit');

describe('Dashboard Widget Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'user-id-123';
  const mockIpAddress = '127.0.0.1';

  const mockDashboardWidget = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Sales Dashboard',
    config_json: { layout: 'grid' },
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    version: 1
  };

  describe('listDashboardWidgets', () => {
    it('should list dashboard widgets with pagination', async () => {
      const mockWidgets = [mockDashboardWidget];
      dashboardWidgetRepository.findMany.mockResolvedValue(mockWidgets);
      dashboardWidgetRepository.count.mockResolvedValue(1);

      const result = await dashboardWidgetService.listDashboardWidgets(
        {},
        1,
        20,
        'created_at',
        'desc',
        mockUserId,
        mockIpAddress
      );

      expect(result.dashboardWidgets).toEqual(mockWidgets);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      const filters = { tenant_id: mockDashboardWidget.tenant_id };
      dashboardWidgetRepository.findMany.mockResolvedValue([mockDashboardWidget]);
      dashboardWidgetRepository.count.mockResolvedValue(1);

      await dashboardWidgetService.listDashboardWidgets(
        filters,
        1,
        20,
        'created_at',
        'desc',
        mockUserId,
        mockIpAddress
      );

      expect(dashboardWidgetRepository.findMany).toHaveBeenCalledWith(
        { tenant_id: filters.tenant_id },
        0,
        20,
        { created_at: 'desc' },
        {}
      );
    });

    it('should handle search filter', async () => {
      const filters = { search: 'dashboard' };
      dashboardWidgetRepository.findMany.mockResolvedValue([mockDashboardWidget]);
      dashboardWidgetRepository.count.mockResolvedValue(1);

      await dashboardWidgetService.listDashboardWidgets(
        filters,
        1,
        20,
        null,
        'asc',
        mockUserId,
        mockIpAddress
      );

      expect(dashboardWidgetRepository.findMany).toHaveBeenCalledWith(
        { OR: [{ name: { contains: 'dashboard' } }] },
        0,
        20,
        { created_at: 'desc' },
        {}
      );
    });

    it('should calculate pagination correctly', async () => {
      dashboardWidgetRepository.findMany.mockResolvedValue([mockDashboardWidget]);
      dashboardWidgetRepository.count.mockResolvedValue(25);

      const result = await dashboardWidgetService.listDashboardWidgets(
        {},
        2,
        10,
        null,
        'asc',
        mockUserId,
        mockIpAddress
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should throw HttpError on repository error', async () => {
      dashboardWidgetRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        dashboardWidgetService.listDashboardWidgets({}, 1, 20, null, 'asc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getDashboardWidgetById', () => {
    it('should get dashboard widget by ID', async () => {
      dashboardWidgetRepository.findById.mockResolvedValue(mockDashboardWidget);

      const result = await dashboardWidgetService.getDashboardWidgetById(
        mockDashboardWidget.id,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockDashboardWidget);
      expect(dashboardWidgetRepository.findById).toHaveBeenCalledWith(mockDashboardWidget.id);
    });

    it('should throw HttpError when dashboard widget not found', async () => {
      dashboardWidgetRepository.findById.mockResolvedValue(null);

      await expect(
        dashboardWidgetService.getDashboardWidgetById('non-existent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should propagate HttpError from repository', async () => {
      const error = new HttpError('errors.database.unexpected', 500);
      dashboardWidgetRepository.findById.mockRejectedValue(error);

      await expect(
        dashboardWidgetService.getDashboardWidgetById(mockDashboardWidget.id, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createDashboardWidget', () => {
    it('should create dashboard widget and audit log', async () => {
      const createData = {
        tenant_id: mockDashboardWidget.tenant_id,
        name: mockDashboardWidget.name,
        config_json: mockDashboardWidget.config_json
      };
      dashboardWidgetRepository.create.mockResolvedValue(mockDashboardWidget);
      createAuditLog.mockResolvedValue({});

      const result = await dashboardWidgetService.createDashboardWidget(
        createData,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockDashboardWidget);
      expect(dashboardWidgetRepository.create).toHaveBeenCalledWith(createData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'dashboard_widget',
        entity_id: mockDashboardWidget.id,
        diff: { after: mockDashboardWidget },
        ip_address: mockIpAddress
      });
    });

    it('should create dashboard widget even if audit log fails', async () => {
      dashboardWidgetRepository.create.mockResolvedValue(mockDashboardWidget);
      createAuditLog.mockRejectedValue(new Error('Audit error'));

      const result = await dashboardWidgetService.createDashboardWidget(
        {},
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockDashboardWidget);
    });

    it('should propagate HttpError from repository', async () => {
      const error = new HttpError('errors.database.unique_field', 409);
      dashboardWidgetRepository.create.mockRejectedValue(error);

      await expect(
        dashboardWidgetService.createDashboardWidget({}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('updateDashboardWidget', () => {
    it('should update dashboard widget and audit log', async () => {
      const updateData = { name: 'Updated Dashboard' };
      const updated = { ...mockDashboardWidget, ...updateData };
      dashboardWidgetRepository.findById.mockResolvedValue(mockDashboardWidget);
      dashboardWidgetRepository.update.mockResolvedValue(updated);
      createAuditLog.mockResolvedValue({});

      const result = await dashboardWidgetService.updateDashboardWidget(
        mockDashboardWidget.id,
        updateData,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(updated);
      expect(dashboardWidgetRepository.findById).toHaveBeenCalledWith(mockDashboardWidget.id);
      expect(dashboardWidgetRepository.update).toHaveBeenCalledWith(mockDashboardWidget.id, updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'UPDATE',
        entity: 'dashboard_widget',
        entity_id: updated.id,
        diff: { before: mockDashboardWidget, after: updated },
        ip_address: mockIpAddress
      });
    });

    it('should throw HttpError when dashboard widget not found', async () => {
      dashboardWidgetRepository.findById.mockResolvedValue(null);

      await expect(
        dashboardWidgetService.updateDashboardWidget('non-existent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should update dashboard widget even if audit log fails', async () => {
      const updated = { ...mockDashboardWidget, name: 'Updated' };
      dashboardWidgetRepository.findById.mockResolvedValue(mockDashboardWidget);
      dashboardWidgetRepository.update.mockResolvedValue(updated);
      createAuditLog.mockRejectedValue(new Error('Audit error'));

      const result = await dashboardWidgetService.updateDashboardWidget(
        mockDashboardWidget.id,
        {},
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(updated);
    });
  });

  describe('deleteDashboardWidget', () => {
    it('should soft delete dashboard widget and audit log', async () => {
      dashboardWidgetRepository.findById.mockResolvedValue(mockDashboardWidget);
      dashboardWidgetRepository.softDelete.mockResolvedValue({ ...mockDashboardWidget, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await dashboardWidgetService.deleteDashboardWidget(
        mockDashboardWidget.id,
        mockUserId,
        mockIpAddress
      );

      expect(dashboardWidgetRepository.findById).toHaveBeenCalledWith(mockDashboardWidget.id);
      expect(dashboardWidgetRepository.softDelete).toHaveBeenCalledWith(mockDashboardWidget.id);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'DELETE',
        entity: 'dashboard_widget',
        entity_id: mockDashboardWidget.id,
        diff: { before: mockDashboardWidget },
        ip_address: mockIpAddress
      });
    });

    it('should throw HttpError when dashboard widget not found', async () => {
      dashboardWidgetRepository.findById.mockResolvedValue(null);

      await expect(
        dashboardWidgetService.deleteDashboardWidget('non-existent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should delete dashboard widget even if audit log fails', async () => {
      dashboardWidgetRepository.findById.mockResolvedValue(mockDashboardWidget);
      dashboardWidgetRepository.softDelete.mockResolvedValue({ ...mockDashboardWidget, deleted_at: new Date() });
      createAuditLog.mockRejectedValue(new Error('Audit error'));

      await dashboardWidgetService.deleteDashboardWidget(
        mockDashboardWidget.id,
        mockUserId,
        mockIpAddress
      );

      expect(dashboardWidgetRepository.softDelete).toHaveBeenCalled();
    });
  });
});
