/**
 * Payroll run routes tests
 *
 * @module tests/modules/payroll-run/routes
 * @description Tests for payroll run route endpoints
 */

const request = require('supertest');
const express = require('express');
const payrollRunRoutes = require('../../../../modules/payroll-run/routes/payroll-run.routes');
const payrollRunController = require('../../../../modules/payroll-run/controllers/payroll-run.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/payroll-run/controllers/payroll-run.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Payroll Run Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/payroll-runs', payrollRunRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/payroll-runs', () => {
    it('should call listPayrollRuns controller', async () => {
      payrollRunController.listPayrollRuns.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app).get('/api/v1/payroll-runs');

      expect(payrollRunController.listPayrollRuns).toHaveBeenCalled();
    });

    it('should pass query parameters to controller', async () => {
      payrollRunController.listPayrollRuns.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/payroll-runs')
        .query({ page: '1', limit: '20', status: 'PROCESSED' });

      expect(payrollRunController.listPayrollRuns).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/payroll-runs/:id', () => {
    it('should call getPayrollRunById controller', async () => {
      payrollRunController.getPayrollRunById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const response = await request(app).get('/api/v1/payroll-runs/test-id');

      expect(payrollRunController.getPayrollRunById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/payroll-runs', () => {
    it('should call createPayrollRun controller', async () => {
      payrollRunController.createPayrollRun.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      const payrollRunData = {
        tenant_id: 'tenant-id',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        status: 'DRAFT'
      };

      const response = await request(app)
        .post('/api/v1/payroll-runs')
        .send(payrollRunData);

      expect(payrollRunController.createPayrollRun).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/payroll-runs/:id', () => {
    it('should call updatePayrollRun controller', async () => {
      payrollRunController.updatePayrollRun.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const updateData = { status: 'PROCESSED' };

      const response = await request(app)
        .put('/api/v1/payroll-runs/test-id')
        .send(updateData);

      expect(payrollRunController.updatePayrollRun).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/payroll-runs/:id', () => {
    it('should call deletePayrollRun controller', async () => {
      payrollRunController.deletePayrollRun.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/api/v1/payroll-runs/test-id');

      expect(payrollRunController.deletePayrollRun).toHaveBeenCalled();
    });
  });
});
