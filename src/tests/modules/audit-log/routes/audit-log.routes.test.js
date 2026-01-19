/**
 * Audit log routes tests
 *
 * @module tests/modules/audit-log/routes
 * @description Tests for audit log route definitions
 */

// Mock dependencies before imports
jest.mock('@modules/audit-log/controllers/audit-log.controller', () => ({
  getAuditLogById: jest.fn(),
  getAuditLogs: jest.fn(),
  getAuditLogsByUserId: jest.fn(),
  getAuditLogsByEntity: jest.fn()
}));
jest.mock('@middlewares/validate.middleware', () => jest.fn(() => (req, res, next) => next()));

const express = require('express');
const request = require('supertest');
const auditLogRoutes = require('@modules/audit-log/routes/audit-log.routes');
const auditLogController = require('@modules/audit-log/controllers/audit-log.controller');

describe('Audit Log Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/audit-logs', auditLogRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/audit-logs', () => {
    it('should call getAuditLogs controller', async () => {
      auditLogController.getAuditLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/v1/audit-logs')
        .expect(200);

      expect(auditLogController.getAuditLogs).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should accept query parameters', async () => {
      auditLogController.getAuditLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .get('/api/v1/audit-logs?page=1&limit=20&action=CREATE')
        .expect(200);

      expect(auditLogController.getAuditLogs).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/audit-logs/:id', () => {
    it('should call getAuditLogById controller', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      auditLogController.getAuditLogById.mockImplementation((req, res) => {
        res.status(200).json({ success: true, id: req.params.id });
      });

      const response = await request(app)
        .get(`/api/v1/audit-logs/${mockId}`)
        .expect(200);

      expect(auditLogController.getAuditLogById).toHaveBeenCalled();
      expect(response.body.id).toBe(mockId);
    });
  });

  describe('GET /api/v1/audit-logs/user/:userId', () => {
    it('should call getAuditLogsByUserId controller', async () => {
      const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
      auditLogController.getAuditLogsByUserId.mockImplementation((req, res) => {
        res.status(200).json({ success: true, userId: req.params.userId });
      });

      const response = await request(app)
        .get(`/api/v1/audit-logs/user/${mockUserId}`)
        .expect(200);

      expect(auditLogController.getAuditLogsByUserId).toHaveBeenCalled();
      expect(response.body.userId).toBe(mockUserId);
    });
  });

  describe('GET /api/v1/audit-logs/entity/:entity/:entityId', () => {
    it('should call getAuditLogsByEntity controller', async () => {
      const mockEntity = 'user';
      const mockEntityId = '123e4567-e89b-12d3-a456-426614174000';
      auditLogController.getAuditLogsByEntity.mockImplementation((req, res) => {
        res.status(200).json({ 
          success: true, 
          entity: req.params.entity, 
          entityId: req.params.entityId 
        });
      });

      const response = await request(app)
        .get(`/api/v1/audit-logs/entity/${mockEntity}/${mockEntityId}`)
        .expect(200);

      expect(auditLogController.getAuditLogsByEntity).toHaveBeenCalled();
      expect(response.body.entity).toBe(mockEntity);
      expect(response.body.entityId).toBe(mockEntityId);
    });
  });
});
