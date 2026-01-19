/**
 * PHI access log routes tests
 *
 * @module tests/modules/phi-access-log/routes
 * @description Tests for PHI access log route definitions
 */

// Mock dependencies before imports
jest.mock('@modules/phi-access-log/controllers/phi-access-log.controller', () => ({
  getPhiAccessLogById: jest.fn(),
  getPhiAccessLogs: jest.fn(),
  getPhiAccessLogsByUserId: jest.fn(),
  createPhiAccessLog: jest.fn(),
  updatePhiAccessLog: jest.fn(),
  deletePhiAccessLog: jest.fn()
}));
jest.mock('@middlewares/validate.middleware', () => jest.fn(() => (req, res, next) => next()));

const express = require('express');
const request = require('supertest');
const phiAccessLogRoutes = require('@modules/phi-access-log/routes/phi-access-log.routes');
const phiAccessLogController = require('@modules/phi-access-log/controllers/phi-access-log.controller');

describe('PHI Access Log Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/phi-access-logs', phiAccessLogRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/phi-access-logs', () => {
    it('should call getPhiAccessLogs controller', async () => {
      phiAccessLogController.getPhiAccessLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/v1/phi-access-logs')
        .expect(200);

      expect(phiAccessLogController.getPhiAccessLogs).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should accept query parameters', async () => {
      phiAccessLogController.getPhiAccessLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/v1/phi-access-logs?page=1&limit=20&access_scope=PATIENT')
        .expect(200);

      expect(phiAccessLogController.getPhiAccessLogs).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/phi-access-logs/:id', () => {
    it('should call getPhiAccessLogById controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      phiAccessLogController.getPhiAccessLogById.mockImplementation((req, res) => {
        res.status(200).json({ success: true, id: req.params.id });
      });

      const response = await request(app)
        .get(`/api/v1/phi-access-logs/${mockId}`)
        .expect(200);

      expect(phiAccessLogController.getPhiAccessLogById).toHaveBeenCalled();
      expect(response.body.id).toBe(mockId);
    });
  });

  describe('GET /api/v1/phi-access-logs/user/:userId', () => {
    it('should call getPhiAccessLogsByUserId controller', async () => {
      const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
      phiAccessLogController.getPhiAccessLogsByUserId.mockImplementation((req, res) => {
        res.status(200).json({ success: true, userId: req.params.userId });
      });

      const response = await request(app)
        .get(`/api/v1/phi-access-logs/user/${mockUserId}`)
        .expect(200);

      expect(phiAccessLogController.getPhiAccessLogsByUserId).toHaveBeenCalled();
      expect(response.body.userId).toBe(mockUserId);
    });
  });

  describe('POST /api/v1/phi-access-logs', () => {
    it('should call createPhiAccessLog controller', async () => {
      const mockData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        patient_id: '123e4567-e89b-12d3-a456-426614174002',
        access_scope: 'PATIENT'
      };
      phiAccessLogController.createPhiAccessLog.mockImplementation((req, res) => {
        res.status(201).json({ success: true, data: req.body });
      });

      const response = await request(app)
        .post('/api/v1/phi-access-logs')
        .send(mockData)
        .expect(201);

      expect(phiAccessLogController.createPhiAccessLog).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/phi-access-logs/:id', () => {
    it('should call updatePhiAccessLog controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      const mockData = { access_scope: 'FACILITY' };
      phiAccessLogController.updatePhiAccessLog.mockImplementation((req, res) => {
        res.status(200).json({ success: true, id: req.params.id, data: req.body });
      });

      const response = await request(app)
        .put(`/api/v1/phi-access-logs/${mockId}`)
        .send(mockData)
        .expect(200);

      expect(phiAccessLogController.updatePhiAccessLog).toHaveBeenCalled();
      expect(response.body.id).toBe(mockId);
    });
  });

  describe('DELETE /api/v1/phi-access-logs/:id', () => {
    it('should call deletePhiAccessLog controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      phiAccessLogController.deletePhiAccessLog.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete(`/api/v1/phi-access-logs/${mockId}`)
        .expect(204);

      expect(phiAccessLogController.deletePhiAccessLog).toHaveBeenCalled();
    });
  });
});
