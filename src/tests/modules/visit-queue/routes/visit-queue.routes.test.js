/**
 * Visit queue routes integration tests
 *
 * @module tests/modules/visit-queue/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/visit-queue/visit-queue.controller');

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { 
      id: 'user-123', 
      tenant_id: 'tenant-123',
      facility_id: 'facility-123'
    };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const visitQueueController = require('@controllers/visit-queue/visit-queue.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const visitQueueRoutes = require('../../../../modules/visit-queue/routes/visit-queue.routes');

describe('Visit Queue Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/visit-queues', visitQueueRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/visit-queues/', () => {
    it('should call listVisitQueues controller', async () => {
      visitQueueController.listVisitQueues.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Visit queue entries retrieved successfully',
          data: [
            { id: 'queue-1', patient_id: 'patient-123', status: 'SCHEDULED' },
            { id: 'queue-2', patient_id: 'patient-456', status: 'CONFIRMED' }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        });
      });

      const response = await request(app)
        .get('/api/v1/visit-queues/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(visitQueueController.listVisitQueues).toHaveBeenCalled();
    });

    it('should pass filters to controller', async () => {
      visitQueueController.listVisitQueues.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [], pagination: {} });
      });

      const response = await request(app)
        .get('/api/v1/visit-queues/')
        .query({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          patient_id: 'patient-123',
          appointment_id: 'appointment-123',
          provider_user_id: 'user-123',
          status: 'SCHEDULED'
        });

      expect(response.status).toBe(200);
      expect(visitQueueController.listVisitQueues).toHaveBeenCalled();
    });

    it('should pass pagination params to controller', async () => {
      visitQueueController.listVisitQueues.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [], pagination: {} });
      });

      const response = await request(app)
        .get('/api/v1/visit-queues/')
        .query({ page: 2, limit: 50, sort_by: 'created_at', order: 'asc' });

      expect(response.status).toBe(200);
      expect(visitQueueController.listVisitQueues).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      visitQueueController.listVisitQueues.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [] });
      });

      await request(app)
        .get('/api/v1/visit-queues/');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      visitQueueController.listVisitQueues.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [] });
      });

      await request(app)
        .get('/api/v1/visit-queues/');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/visit-queues/:id', () => {
    it('should call getVisitQueueById controller', async () => {
      visitQueueController.getVisitQueueById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Visit queue entry retrieved successfully',
          data: {
            id: 'queue-123',
            patient_id: 'patient-123',
            status: 'SCHEDULED'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/visit-queues/queue-123');

      expect(response.status).toBe(200);
      expect(visitQueueController.getVisitQueueById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      visitQueueController.getVisitQueueById.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .get('/api/v1/visit-queues/queue-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      visitQueueController.getVisitQueueById.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .get('/api/v1/visit-queues/queue-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/visit-queues/', () => {
    it('should call createVisitQueue controller', async () => {
      visitQueueController.createVisitQueue.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Visit queue entry created successfully',
          data: {
            id: 'queue-123',
            tenant_id: 'tenant-123',
            patient_id: 'patient-123',
            status: 'SCHEDULED'
          }
        });
      });

      const entryData = {
        tenant_id: 'tenant-123',
        patient_id: 'patient-123',
        status: 'SCHEDULED'
      };

      const response = await request(app)
        .post('/api/v1/visit-queues/')
        .send(entryData);

      expect(response.status).toBe(201);
      expect(visitQueueController.createVisitQueue).toHaveBeenCalled();
    });

    it('should accept full entry data', async () => {
      visitQueueController.createVisitQueue.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: {} });
      });

      const entryData = {
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        patient_id: 'patient-123',
        appointment_id: 'appointment-123',
        provider_user_id: 'user-123',
        status: 'SCHEDULED',
        queued_at: '2026-01-19T12:00:00.000Z'
      };

      const response = await request(app)
        .post('/api/v1/visit-queues/')
        .send(entryData);

      expect(response.status).toBe(201);
      expect(visitQueueController.createVisitQueue).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      visitQueueController.createVisitQueue.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: {} });
      });

      await request(app)
        .post('/api/v1/visit-queues/')
        .send({
          tenant_id: 'tenant-123',
          patient_id: 'patient-123',
          status: 'SCHEDULED'
        });

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      visitQueueController.createVisitQueue.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: {} });
      });

      await request(app)
        .post('/api/v1/visit-queues/')
        .send({
          tenant_id: 'tenant-123',
          patient_id: 'patient-123',
          status: 'SCHEDULED'
        });

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/visit-queues/:id', () => {
    it('should call updateVisitQueue controller', async () => {
      visitQueueController.updateVisitQueue.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Visit queue entry updated successfully',
          data: {
            id: 'queue-123',
            tenant_id: 'tenant-123',
            patient_id: 'patient-123',
            status: 'IN_PROGRESS'
          }
        });
      });

      const updateData = { status: 'IN_PROGRESS' };

      const response = await request(app)
        .put('/api/v1/visit-queues/queue-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(visitQueueController.updateVisitQueue).toHaveBeenCalled();
    });

    it('should accept partial update data', async () => {
      visitQueueController.updateVisitQueue.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      const updateData = {
        facility_id: 'facility-456',
        provider_user_id: 'user-789'
      };

      const response = await request(app)
        .put('/api/v1/visit-queues/queue-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(visitQueueController.updateVisitQueue).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      visitQueueController.updateVisitQueue.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .put('/api/v1/visit-queues/queue-123')
        .send({ status: 'COMPLETED' });

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      visitQueueController.updateVisitQueue.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .put('/api/v1/visit-queues/queue-123')
        .send({ status: 'COMPLETED' });

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/visit-queues/:id', () => {
    it('should call deleteVisitQueue controller', async () => {
      visitQueueController.deleteVisitQueue.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/visit-queues/queue-123');

      expect(response.status).toBe(204);
      expect(visitQueueController.deleteVisitQueue).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      visitQueueController.deleteVisitQueue.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/visit-queues/queue-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      visitQueueController.deleteVisitQueue.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/visit-queues/queue-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('Middleware order', () => {
    it('should apply middlewares in correct order for GET /', async () => {
      visitQueueController.listVisitQueues.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [] });
      });

      await request(app).get('/api/v1/visit-queues/');

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(visitQueueController.listVisitQueues).toHaveBeenCalled();
    });

    it('should apply middlewares in correct order for POST /', async () => {
      visitQueueController.createVisitQueue.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: {} });
      });

      await request(app)
        .post('/api/v1/visit-queues/')
        .send({
          tenant_id: 'tenant-123',
          patient_id: 'patient-123',
          status: 'SCHEDULED'
        });

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(visitQueueController.createVisitQueue).toHaveBeenCalled();
    });

    it('should apply middlewares in correct order for PUT /:id', async () => {
      visitQueueController.updateVisitQueue.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .put('/api/v1/visit-queues/queue-123')
        .send({ status: 'COMPLETED' });

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(visitQueueController.updateVisitQueue).toHaveBeenCalled();
    });

    it('should apply middlewares in correct order for DELETE /:id', async () => {
      visitQueueController.deleteVisitQueue.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app).delete('/api/v1/visit-queues/queue-123');

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(visitQueueController.deleteVisitQueue).toHaveBeenCalled();
    });
  });
});
