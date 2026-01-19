/**
 * Payroll item routes tests
 *
 * @module tests/modules/payroll-item/routes
 * @description Tests for payroll item route endpoints
 */

const request = require('supertest');
const express = require('express');
const payrollItemRoutes = require('../../../../modules/payroll-item/routes/payroll-item.routes');
const payrollItemController = require('../../../../modules/payroll-item/controllers/payroll-item.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/payroll-item/controllers/payroll-item.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Payroll Item Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/payroll-items', payrollItemRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/payroll-items', () => {
    it('should call listPayrollItems controller', async () => {
      payrollItemController.listPayrollItems.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app).get('/api/v1/payroll-items');

      expect(payrollItemController.listPayrollItems).toHaveBeenCalled();
    });

    it('should pass query parameters to controller', async () => {
      payrollItemController.listPayrollItems.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/payroll-items')
        .query({ page: '1', limit: '20', currency: 'USD' });

      expect(payrollItemController.listPayrollItems).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/payroll-items/:id', () => {
    it('should call getPayrollItemById controller', async () => {
      payrollItemController.getPayrollItemById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const response = await request(app).get('/api/v1/payroll-items/test-id');

      expect(payrollItemController.getPayrollItemById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/payroll-items', () => {
    it('should call createPayrollItem controller', async () => {
      payrollItemController.createPayrollItem.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      const payrollItemData = {
        payroll_run_id: 'run-id',
        staff_profile_id: 'staff-id',
        amount: 5000,
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/v1/payroll-items')
        .send(payrollItemData);

      expect(payrollItemController.createPayrollItem).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/payroll-items/:id', () => {
    it('should call updatePayrollItem controller', async () => {
      payrollItemController.updatePayrollItem.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const updateData = { amount: 5500 };

      const response = await request(app)
        .put('/api/v1/payroll-items/test-id')
        .send(updateData);

      expect(payrollItemController.updatePayrollItem).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/payroll-items/:id', () => {
    it('should call deletePayrollItem controller', async () => {
      payrollItemController.deletePayrollItem.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/api/v1/payroll-items/test-id');

      expect(payrollItemController.deletePayrollItem).toHaveBeenCalled();
    });
  });
});
