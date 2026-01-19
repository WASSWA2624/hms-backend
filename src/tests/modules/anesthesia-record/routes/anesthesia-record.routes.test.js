/**
 * Anesthesia record routes tests
 *
 * @module tests/modules/anesthesia-record/routes
 * @description Tests for Anesthesia record API endpoints
 * Per testing.mdc: Route tests must validate HTTP methods, status codes, and response format
 */

const request = require('supertest');
const express = require('express');
const anesthesiaRecordRoutes = require('@routes/anesthesia-record/anesthesia-record.routes');
const anesthesiaRecordController = require('@controllers/anesthesia-record/anesthesia-record.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/anesthesia-record/anesthesia-record.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/anesthesia-records', anesthesiaRecordRoutes);

describe('Anesthesia record Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/anesthesia-records', () => {
    it('should call listanesthesiaRecords controller', async () => {
      anesthesiaRecordController.listanesthesiaRecords.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/anesthesia-records');

      expect(response.status).toBe(200);
      expect(anesthesiaRecordController.listanesthesiaRecords).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/anesthesia-records/:id', () => {
    const anesthesiaRecordId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call getanesthesiaRecordById controller', async () => {
      anesthesiaRecordController.getanesthesiaRecordById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get(`/api/v1/anesthesia-records/${anesthesiaRecordId}`);

      expect(response.status).toBe(200);
      expect(anesthesiaRecordController.getanesthesiaRecordById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/anesthesia-records', () => {
    const createData = {
      encounter_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-01-20T10:00:00.000Z',
      status: 'SCHEDULED'
    };

    it('should call createanesthesiaRecord controller', async () => {
      anesthesiaRecordController.createanesthesiaRecord.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/anesthesia-records')
        .send(createData);

      expect(response.status).toBe(201);
      expect(anesthesiaRecordController.createanesthesiaRecord).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/anesthesia-records/:id', () => {
    const anesthesiaRecordId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'IN_PROGRESS'
    };

    it('should call updateanesthesiaRecord controller', async () => {
      anesthesiaRecordController.updateanesthesiaRecord.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put(`/api/v1/anesthesia-records/${anesthesiaRecordId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(anesthesiaRecordController.updateanesthesiaRecord).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/anesthesia-records/:id', () => {
    const anesthesiaRecordId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call deleteanesthesiaRecord controller', async () => {
      anesthesiaRecordController.deleteanesthesiaRecord.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete(`/api/v1/anesthesia-records/${anesthesiaRecordId}`);

      expect(response.status).toBe(204);
      expect(anesthesiaRecordController.deleteanesthesiaRecord).toHaveBeenCalled();
    });
  });
});
