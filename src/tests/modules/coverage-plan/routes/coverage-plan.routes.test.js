/**
 * Coverage Plan routes tests
 *
 * @module tests/modules/coverage-plan/routes
 * @description Tests for coverage plan route definitions
 * Per testing.mdc: Test route configuration and middleware application
 */

const express = require('express');
const request = require('supertest');
const coveragePlanRoutes = require('@routes/coverage-plan/coverage-plan.routes');
const coveragePlanController = require('@controllers/coverage-plan/coverage-plan.controller');
const { authenticate } = require('@middlewares/auth.middleware');

jest.mock('@controllers/coverage-plan/coverage-plan.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Coverage Plan Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: '550e8400-e29b-41d4-a716-446655440000' };
      next();
    });

    coveragePlanController.listCoveragePlans.mockImplementation((req, res) => 
      res.json({ success: true, data: [] })
    );
    coveragePlanController.getCoveragePlanById.mockImplementation((req, res) => 
      res.json({ success: true, data: {} })
    );
    coveragePlanController.createCoveragePlan.mockImplementation((req, res) => 
      res.status(201).json({ success: true, data: {} })
    );
    coveragePlanController.updateCoveragePlan.mockImplementation((req, res) => 
      res.json({ success: true, data: {} })
    );
    coveragePlanController.deleteCoveragePlan.mockImplementation((req, res) => 
      res.status(204).send()
    );

    app.use('/coverage-plans', coveragePlanRoutes);
  });

  describe('GET /coverage-plans', () => {
    it('should call listCoveragePlans controller', async () => {
      await request(app).get('/coverage-plans');
      expect(coveragePlanController.listCoveragePlans).toHaveBeenCalled();
    });
  });

  describe('GET /coverage-plans/:id', () => {
    it('should call getCoveragePlanById controller', async () => {
      await request(app).get('/coverage-plans/550e8400-e29b-41d4-a716-446655440000');
      expect(coveragePlanController.getCoveragePlanById).toHaveBeenCalled();
    });
  });

  describe('POST /coverage-plans', () => {
    it('should call createCoveragePlan controller', async () => {
      await request(app)
        .post('/coverage-plans')
        .send({ name: 'Test Plan', coverage_percentage: 80 });
      expect(coveragePlanController.createCoveragePlan).toHaveBeenCalled();
    });
  });

  describe('PUT /coverage-plans/:id', () => {
    it('should call updateCoveragePlan controller', async () => {
      await request(app)
        .put('/coverage-plans/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' });
      expect(coveragePlanController.updateCoveragePlan).toHaveBeenCalled();
    });
  });

  describe('DELETE /coverage-plans/:id', () => {
    it('should call deleteCoveragePlan controller', async () => {
      await request(app).delete('/coverage-plans/550e8400-e29b-41d4-a716-446655440000');
      expect(coveragePlanController.deleteCoveragePlan).toHaveBeenCalled();
    });
  });
});
