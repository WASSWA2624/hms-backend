/**
 * Data processing log routes tests
 *
 * @module tests/modules/data-processing-log/routes
 * @description Tests for data processing log route definitions
 */

// Mock dependencies before imports
jest.mock('@modules/data-processing-log/controllers/data-processing-log.controller', () => ({
  getDataProcessingLogById: jest.fn(),
  getDataProcessingLogs: jest.fn(),
  createDataProcessingLog: jest.fn(),
  updateDataProcessingLog: jest.fn(),
  deleteDataProcessingLog: jest.fn()
}));
jest.mock('@middlewares/validate.middleware', () => jest.fn(() => (req, res, next) => next()));

const express = require('express');
const request = require('supertest');
const dataProcessingLogRoutes = require('@modules/data-processing-log/routes/data-processing-log.routes');
const dataProcessingLogController = require('@modules/data-processing-log/controllers/data-processing-log.controller');

describe('Data Processing Log Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/data-processing-logs', dataProcessingLogRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/data-processing-logs', () => {
    it('should call getDataProcessingLogs controller', async () => {
      dataProcessingLogController.getDataProcessingLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });
      const response = await request(app).get('/api/v1/data-processing-logs').expect(200);
      expect(dataProcessingLogController.getDataProcessingLogs).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/data-processing-logs/:id', () => {
    it('should call getDataProcessingLogById controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      dataProcessingLogController.getDataProcessingLogById.mockImplementation((req, res) => {
        res.status(200).json({ success: true, id: req.params.id });
      });
      const response = await request(app).get(`/api/v1/data-processing-logs/${mockId}`).expect(200);
      expect(dataProcessingLogController.getDataProcessingLogById).toHaveBeenCalled();
      expect(response.body.id).toBe(mockId);
    });
  });

  describe('POST /api/v1/data-processing-logs', () => {
    it('should call createDataProcessingLog controller', async () => {
      const mockData = { tenant_id: '123e4567-e89b-12d3-a456-426614174000', purpose: 'TREATMENT', legal_basis: 'CONSENT' };
      dataProcessingLogController.createDataProcessingLog.mockImplementation((req, res) => {
        res.status(201).json({ success: true, data: req.body });
      });
      const response = await request(app).post('/api/v1/data-processing-logs').send(mockData).expect(201);
      expect(dataProcessingLogController.createDataProcessingLog).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/data-processing-logs/:id', () => {
    it('should call updateDataProcessingLog controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      const mockData = { purpose: 'OPERATIONS' };
      dataProcessingLogController.updateDataProcessingLog.mockImplementation((req, res) => {
        res.status(200).json({ success: true, id: req.params.id, data: req.body });
      });
      const response = await request(app).put(`/api/v1/data-processing-logs/${mockId}`).send(mockData).expect(200);
      expect(dataProcessingLogController.updateDataProcessingLog).toHaveBeenCalled();
      expect(response.body.id).toBe(mockId);
    });
  });

  describe('DELETE /api/v1/data-processing-logs/:id', () => {
    it('should call deleteDataProcessingLog controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      dataProcessingLogController.deleteDataProcessingLog.mockImplementation((req, res) => {
        res.status(204).send();
      });
      await request(app).delete(`/api/v1/data-processing-logs/${mockId}`).expect(204);
      expect(dataProcessingLogController.deleteDataProcessingLog).toHaveBeenCalled();
    });
  });
});
