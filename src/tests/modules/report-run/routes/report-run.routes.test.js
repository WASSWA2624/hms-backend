/**
 * Report run routes tests
 *
 * @module tests/modules/report-run/routes
 * Per testing.mdc: Test route definitions, not implementations
 */

// Mock all dependencies before imports
jest.mock('@controllers/report-run/report-run.controller', () => ({
  listReportRuns: jest.fn((req, res) => res.json({ success: true })),
  getReportRunById: jest.fn((req, res) => res.json({ success: true })),
  createReportRun: jest.fn((req, res) => res.json({ success: true })),
  updateReportRun: jest.fn((req, res) => res.json({ success: true })),
  deleteReportRun: jest.fn((req, res) => res.status(204).send())
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));

const express = require('express');
const request = require('supertest');
const reportRunController = require('@controllers/report-run/report-run.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const reportRunRoutes = require('@routes/report-run/report-run.routes');

describe('Report Run Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/report-runs', reportRunRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/report-runs', () => {
    it('should handle list report runs request', async () => {
      const response = await request(app)
        .get('/api/v1/report-runs')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportRunController.listReportRuns).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/report-runs/:id', () => {
    it('should handle get report run by ID request', async () => {
      const response = await request(app)
        .get('/api/v1/report-runs/run-123')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportRunController.getReportRunById).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/report-runs', () => {
    it('should handle create report run request', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'PDF'
      };

      const response = await request(app)
        .post('/api/v1/report-runs')
        .send(newData)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportRunController.createReportRun).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/report-runs/:id', () => {
    it('should handle update report run request', async () => {
      const updateData = { status: 'COMPLETED' };

      const response = await request(app)
        .put('/api/v1/report-runs/run-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(reportRunController.updateReportRun).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/report-runs/:id', () => {
    it('should handle delete report run request', async () => {
      await request(app)
        .delete('/api/v1/report-runs/run-123')
        .expect(204);

      expect(reportRunController.deleteReportRun).toHaveBeenCalled();
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
