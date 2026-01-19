/**
 * Provider schedule routes tests
 *
 * @module tests/modules/provider-schedule/routes
 * @description Integration tests for provider schedule routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const providerScheduleRoutes = require('@routes/provider-schedule/provider-schedule.routes');
const providerScheduleController = require('@controllers/provider-schedule/provider-schedule.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/provider-schedules', providerScheduleRoutes);

// Mock dependencies
jest.mock('@controllers/provider-schedule/provider-schedule.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Provider Schedule Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    // Mock validateRequest middleware to pass through
    validateRequest.mockImplementation(() => (req, res, next) => next());

    // Mock controller methods
    providerScheduleController.listProviderSchedules.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    providerScheduleController.getProviderScheduleById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    providerScheduleController.createProviderSchedule.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    providerScheduleController.updateProviderSchedule.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    providerScheduleController.deleteProviderSchedule.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/provider-schedules', () => {
    it('should list schedules', async () => {
      const response = await request(app).get('/api/v1/provider-schedules');

      expect(response.status).toBe(200);
      expect(providerScheduleController.listProviderSchedules).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/provider-schedules');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/provider-schedules');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/provider-schedules')
        .query({
          page: '1',
          limit: '20',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          day_of_week: '1'
        });

      expect(providerScheduleController.listProviderSchedules).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/provider-schedules/:id', () => {
    const scheduleId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get schedule by ID', async () => {
      const response = await request(app).get(`/api/v1/provider-schedules/${scheduleId}`);

      expect(response.status).toBe(200);
      expect(providerScheduleController.getProviderScheduleById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/provider-schedules/${scheduleId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get(`/api/v1/provider-schedules/${scheduleId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/provider-schedules', () => {
    const scheduleData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      provider_user_id: '550e8400-e29b-41d4-a716-446655440002',
      day_of_week: 1,
      start_time: '2026-01-20T08:00:00.000Z',
      end_time: '2026-01-20T17:00:00.000Z'
    };

    it('should create a schedule', async () => {
      const response = await request(app)
        .post('/api/v1/provider-schedules')
        .send(scheduleData);

      expect(response.status).toBe(201);
      expect(providerScheduleController.createProviderSchedule).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .post('/api/v1/provider-schedules')
        .send(scheduleData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app)
        .post('/api/v1/provider-schedules')
        .send(scheduleData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });
  });

  describe('PUT /api/v1/provider-schedules/:id', () => {
    const scheduleId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { day_of_week: 3 };

    it('should update a schedule', async () => {
      const response = await request(app)
        .put(`/api/v1/provider-schedules/${scheduleId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(providerScheduleController.updateProviderSchedule).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .put(`/api/v1/provider-schedules/${scheduleId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app)
        .put(`/api/v1/provider-schedules/${scheduleId}`)
        .send(updateData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });
  });

  describe('DELETE /api/v1/provider-schedules/:id', () => {
    const scheduleId = '550e8400-e29b-41d4-a716-446655440000';

    it('should soft delete a schedule', async () => {
      const response = await request(app).delete(`/api/v1/provider-schedules/${scheduleId}`);

      expect(response.status).toBe(204);
      expect(providerScheduleController.deleteProviderSchedule).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/provider-schedules/${scheduleId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).delete(`/api/v1/provider-schedules/${scheduleId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });
});
