/**
 * System change log routes tests
 *
 * @module tests/modules/system-change-log/routes
 * @description Tests for system change log route endpoints
 * Per testing.mdc: Comprehensive route tests with middleware validation
 */

// Mock dependencies BEFORE importing routes
jest.mock('@controllers/system-change-log/system-change-log.controller', () => ({
  listSystemChangeLogs: jest.fn(),
  getSystemChangeLogById: jest.fn(),
  createSystemChangeLog: jest.fn(),
  updateSystemChangeLog: jest.fn(),
  approveSystemChangeLog: jest.fn(),
  implementSystemChangeLog: jest.fn(),
  deleteSystemChangeLog: jest.fn()
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const systemChangeLogRoutes = require('@routes/system-change-log/system-change-log.routes');
const systemChangeLogController = require('@controllers/system-change-log/system-change-log.controller');

describe('System Change Log Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/system-change-logs', systemChangeLogRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/system-change-logs', () => {
    it('should call listSystemChangeLogs controller', async () => {
      systemChangeLogController.listSystemChangeLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/v1/system-change-logs')
        .expect(200);

      expect(systemChangeLogController.listSystemChangeLogs).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('GET /api/v1/system-change-logs/:id', () => {
    it('should call getSystemChangeLogById controller', async () => {
      systemChangeLogController.getSystemChangeLogById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/v1/system-change-logs/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(systemChangeLogController.getSystemChangeLogById).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/v1/system-change-logs', () => {
    it('should call createSystemChangeLog controller', async () => {
      systemChangeLogController.createSystemChangeLog.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/system-change-logs')
        .send({
          change_type: 'DATABASE_MIGRATION',
          details: 'Added new column to users table'
        })
        .expect(201);

      expect(systemChangeLogController.createSystemChangeLog).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('PUT /api/v1/system-change-logs/:id', () => {
    it('should call updateSystemChangeLog controller', async () => {
      systemChangeLogController.updateSystemChangeLog.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/system-change-logs/550e8400-e29b-41d4-a716-446655440000')
        .send({ change_type: 'CONFIG_UPDATE' })
        .expect(200);

      expect(systemChangeLogController.updateSystemChangeLog).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/v1/system-change-logs/:id/approve', () => {
    it('should call approveSystemChangeLog controller', async () => {
      systemChangeLogController.approveSystemChangeLog.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/system-change-logs/550e8400-e29b-41d4-a716-446655440000/approve')
        .send({ approval_notes: 'Approved after review' })
        .expect(200);

      expect(systemChangeLogController.approveSystemChangeLog).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/v1/system-change-logs/:id/implement', () => {
    it('should call implementSystemChangeLog controller', async () => {
      systemChangeLogController.implementSystemChangeLog.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/system-change-logs/550e8400-e29b-41d4-a716-446655440000/implement')
        .send({ implementation_notes: 'Successfully implemented' })
        .expect(200);

      expect(systemChangeLogController.implementSystemChangeLog).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('DELETE /api/v1/system-change-logs/:id', () => {
    it('should call deleteSystemChangeLog controller', async () => {
      systemChangeLogController.deleteSystemChangeLog.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/system-change-logs/550e8400-e29b-41d4-a716-446655440000')
        .expect(204);

      expect(systemChangeLogController.deleteSystemChangeLog).toHaveBeenCalled();
    });
  });
});
