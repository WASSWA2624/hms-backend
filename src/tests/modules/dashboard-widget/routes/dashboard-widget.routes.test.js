/**
 * Dashboard widget routes tests
 *
 * @module tests/modules/dashboard-widget/routes
 * @description Tests for dashboard widget routes configuration
 * Per testing.mdc: Comprehensive route tests required
 */

const request = require('supertest');
const express = require('express');
const dashboardWidgetRoutes = require('@modules/dashboard-widget/routes/dashboard-widget.routes');
const dashboardWidgetController = require('@modules/dashboard-widget/controllers/dashboard-widget.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Mock middlewares and controllers
jest.mock('@modules/dashboard-widget/controllers/dashboard-widget.controller');
jest.mock('@middlewares/validate.middleware');
jest.mock('@middlewares/auth.middleware');

describe('Dashboard Widget Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/dashboard-widgets', dashboardWidgetRoutes);
    authenticate.mockImplementation(() => (req, res, next) => { req.user = { id: 'user-id-123' }; next(); });
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /dashboard-widgets', () => {
    it('should call listDashboardWidgets controller', async () => {
      dashboardWidgetController.listDashboardWidgets.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/dashboard-widgets');
      expect(dashboardWidgetController.listDashboardWidgets).toHaveBeenCalled();
    });
  });

  describe('GET /dashboard-widgets/:id', () => {
    it('should call getDashboardWidgetById controller', async () => {
      dashboardWidgetController.getDashboardWidgetById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/dashboard-widgets/test-id');
      expect(dashboardWidgetController.getDashboardWidgetById).toHaveBeenCalled();
    });
  });

  describe('POST /dashboard-widgets', () => {
    it('should call createDashboardWidget controller', async () => {
      dashboardWidgetController.createDashboardWidget.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/dashboard-widgets').send({});
      expect(dashboardWidgetController.createDashboardWidget).toHaveBeenCalled();
    });
  });

  describe('PUT /dashboard-widgets/:id', () => {
    it('should call updateDashboardWidget controller', async () => {
      dashboardWidgetController.updateDashboardWidget.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/dashboard-widgets/test-id').send({});
      expect(dashboardWidgetController.updateDashboardWidget).toHaveBeenCalled();
    });
  });

  describe('DELETE /dashboard-widgets/:id', () => {
    it('should call deleteDashboardWidget controller', async () => {
      dashboardWidgetController.deleteDashboardWidget.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/dashboard-widgets/test-id');
      expect(dashboardWidgetController.deleteDashboardWidget).toHaveBeenCalled();
    });
  });
});
