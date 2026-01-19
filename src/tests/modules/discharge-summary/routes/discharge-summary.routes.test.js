/**
 * Discharge summary routes tests
 *
 * @module tests/modules/discharge-summary/routes
 * Per testing.mdc: Test route configuration and middleware application
 */

const express = require('express');
const request = require('supertest');

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@controllers/discharge-summary/discharge-summary.controller', () => ({
  listDischargeSummaries: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getDischargeSummaryById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createDischargeSummary: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateDischargeSummary: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteDischargeSummary: jest.fn((req, res) => res.status(204).send())
}));

const dischargeSummaryRoutes = require('@routes/discharge-summary/discharge-summary.routes');
const { authenticate } = require('@middlewares/auth.middleware');

const app = express();
app.use(express.json());
app.use('/discharge-summaries', dischargeSummaryRoutes);

describe('Discharge Summary Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /discharge-summaries', () => {
    it('should call authenticate middleware', async () => {
      await request(app).get('/discharge-summaries');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/discharge-summaries');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /discharge-summaries/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/discharge-summaries/discharge-123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /discharge-summaries', () => {
    it('should return 201 status', async () => {
      const response = await request(app).post('/discharge-summaries').send({});
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /discharge-summaries/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).put('/discharge-summaries/discharge-123').send({});
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /discharge-summaries/:id', () => {
    it('should return 204 status', async () => {
      const response = await request(app).delete('/discharge-summaries/discharge-123');
      expect(response.status).toBe(204);
    });
  });
});
