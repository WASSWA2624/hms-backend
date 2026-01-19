/**
 * Dashboard widget controller tests
 *
 * @module tests/modules/dashboard-widget/controllers
 * @description Tests for dashboard widget controllers
 * Per testing.mdc: Comprehensive controller tests with mocked service
 */

const dashboardWidgetController = require('@modules/dashboard-widget/controllers/dashboard-widget.controller');
const dashboardWidgetService = require('@modules/dashboard-widget/services/dashboard-widget.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

// Mock service and response helpers
jest.mock('@modules/dashboard-widget/services/dashboard-widget.service');
jest.mock('@lib/response');

describe('Dashboard Widget Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = {
    query: {},
    params: {},
    body: {},
    user: { id: 'user-id-123' },
    ip: '127.0.0.1'
  };

  const mockRes = {};

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
    it('should list dashboard widgets', async () => {
      const mockResult = {
        dashboardWidgets: [mockDashboardWidget],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      dashboardWidgetService.listDashboardWidgets.mockResolvedValue(mockResult);

      await dashboardWidgetController.listDashboardWidgets(mockReq, mockRes);

      expect(dashboardWidgetService.listDashboardWidgets).toHaveBeenCalled();
      expect(sendPaginated).toHaveBeenCalledWith(
        mockRes,
        'messages.dashboard_widget.list.success',
        mockResult.dashboardWidgets,
        mockResult.pagination
      );
    });

    it('should pass query parameters to service', async () => {
      mockReq.query = {
        tenant_id: mockDashboardWidget.tenant_id,
        name: 'Dashboard',
        search: 'sales',
        page: '2',
        limit: '50',
        sort_by: 'name',
        order: 'asc'
      };
      dashboardWidgetService.listDashboardWidgets.mockResolvedValue({
        dashboardWidgets: [],
        pagination: {}
      });

      await dashboardWidgetController.listDashboardWidgets(mockReq, mockRes);

      expect(dashboardWidgetService.listDashboardWidgets).toHaveBeenCalledWith(
        {
          tenant_id: mockDashboardWidget.tenant_id,
          name: 'Dashboard',
          search: 'sales'
        },
        2,
        50,
        'name',
        'asc',
        mockReq.user.id,
        mockReq.ip
      );
    });
  });

  describe('getDashboardWidgetById', () => {
    it('should get dashboard widget by ID', async () => {
      mockReq.params = { id: mockDashboardWidget.id };
      dashboardWidgetService.getDashboardWidgetById.mockResolvedValue(mockDashboardWidget);

      await dashboardWidgetController.getDashboardWidgetById(mockReq, mockRes);

      expect(dashboardWidgetService.getDashboardWidgetById).toHaveBeenCalledWith(
        mockDashboardWidget.id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.dashboard_widget.get.success',
        mockDashboardWidget
      );
    });
  });

  describe('createDashboardWidget', () => {
    it('should create dashboard widget', async () => {
      mockReq.body = {
        tenant_id: mockDashboardWidget.tenant_id,
        name: mockDashboardWidget.name,
        config_json: mockDashboardWidget.config_json
      };
      dashboardWidgetService.createDashboardWidget.mockResolvedValue(mockDashboardWidget);

      await dashboardWidgetController.createDashboardWidget(mockReq, mockRes);

      expect(dashboardWidgetService.createDashboardWidget).toHaveBeenCalledWith(
        mockReq.body,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        201,
        'messages.dashboard_widget.create.success',
        mockDashboardWidget
      );
    });
  });

  describe('updateDashboardWidget', () => {
    it('should update dashboard widget', async () => {
      mockReq.params = { id: mockDashboardWidget.id };
      mockReq.body = { name: 'Updated Dashboard' };
      const updated = { ...mockDashboardWidget, name: 'Updated Dashboard' };
      dashboardWidgetService.updateDashboardWidget.mockResolvedValue(updated);

      await dashboardWidgetController.updateDashboardWidget(mockReq, mockRes);

      expect(dashboardWidgetService.updateDashboardWidget).toHaveBeenCalledWith(
        mockDashboardWidget.id,
        mockReq.body,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.dashboard_widget.update.success',
        updated
      );
    });
  });

  describe('deleteDashboardWidget', () => {
    it('should delete dashboard widget', async () => {
      mockReq.params = { id: mockDashboardWidget.id };
      dashboardWidgetService.deleteDashboardWidget.mockResolvedValue();

      await dashboardWidgetController.deleteDashboardWidget(mockReq, mockRes);

      expect(dashboardWidgetService.deleteDashboardWidget).toHaveBeenCalledWith(
        mockDashboardWidget.id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });
  });
});
