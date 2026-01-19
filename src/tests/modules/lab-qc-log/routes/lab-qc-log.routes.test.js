/**
 * Lab QC log routes tests
 */

const express = require('express');
const request = require('supertest');
const labQcLogRoutes = require('@routes/lab-qc-log/lab-qc-log.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/lab-qc-log/lab-qc-log.controller', () => ({
  listLabQcLogs: jest.fn((req, res) => res.status(200).json({ success: true })),
  getLabQcLogById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createLabQcLog: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateLabQcLog: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteLabQcLog: jest.fn((req, res) => res.status(204).send())
}));

describe('Lab QC Log Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/lab-qc-logs', labQcLogRoutes);
  });

  describe('GET /api/v1/lab-qc-logs', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/lab-qc-logs');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/lab-qc-logs');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/lab-qc-logs/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/lab-qc-logs/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/lab-qc-logs', () => {
    it('should return 201 status', async () => {
      const response = await request(app).post('/api/v1/lab-qc-logs').send({
        lab_test_id: '456',
        status: 'Passed'
      });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/lab-qc-logs/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).put('/api/v1/lab-qc-logs/123').send({ status: 'Failed' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/lab-qc-logs/:id', () => {
    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/lab-qc-logs/123');
      expect(response.status).toBe(204);
    });
  });
});
