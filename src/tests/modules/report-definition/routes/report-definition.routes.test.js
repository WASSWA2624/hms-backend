/**
 * Report definition routes tests
 *
 * @module tests/modules/report-definition/routes
 * Per testing.mdc: Test route definitions, not implementations
 */

// Mock all dependencies before imports
jest.mock('@controllers/report-definition/report-definition.controller', () => ({
  listReportDefinitions: jest.fn((req, res) => res.json({ success: true })),
  getReportDefinitionById: jest.fn((req, res) => res.json({ success: true })),
  createReportDefinition: jest.fn((req, res) => res.json({ success: true })),
  updateReportDefinition: jest.fn((req, res) => res.json({ success: true })),
  deleteReportDefinition: jest.fn((req, res) => res.status(204).send())
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));

const express = require('express');
const request = require('supertest');
const reportDefinitionController = require('@controllers/report-definition/report-definition.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const reportDefinitionRoutes = require('@routes/report-definition/report-definition.routes');

describe('Report Definition Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/report-definitions', reportDefinitionRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/report-definitions', () => {
    it('should handle list report definitions request', async () => {
      const response = await request(app)
        .get('/api/v1/report-definitions')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportDefinitionController.listReportDefinitions).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/report-definitions/:id', () => {
    it('should handle get report definition by ID request', async () => {
      const response = await request(app)
        .get('/api/v1/report-definitions/report-123')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportDefinitionController.getReportDefinitionById).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/report-definitions', () => {
    it('should handle create report definition request', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        name: 'New Report',
        query_json: { query: 'SELECT * FROM sales' }
      };

      const response = await request(app)
        .post('/api/v1/report-definitions')
        .send(newData)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportDefinitionController.createReportDefinition).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/report-definitions/:id', () => {
    it('should handle update report definition request', async () => {
      const updateData = { name: 'Updated Report' };

      const response = await request(app)
        .put('/api/v1/report-definitions/report-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportDefinitionController.updateReportDefinition).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/report-definitions/:id', () => {
    it('should handle delete report definition request', async () => {
      await request(app)
        .delete('/api/v1/report-definitions/report-123')
        .expect(204);

      expect(reportDefinitionController.deleteReportDefinition).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
