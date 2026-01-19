/**
 * Availability slot routes tests
 *
 * @module tests/modules/availability-slot/routes
 * @description Integration tests for availability slot routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const availabilitySlotRoutes = require('@routes/availability-slot/availability-slot.routes');
const availabilitySlotController = require('@controllers/availability-slot/availability-slot.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/availability-slots', availabilitySlotRoutes);

// Mock dependencies
jest.mock('@controllers/availability-slot/availability-slot.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Availability Slot Routes', () => {
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
    availabilitySlotController.listAvailabilitySlots.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    availabilitySlotController.getAvailabilitySlotById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    availabilitySlotController.createAvailabilitySlot.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    availabilitySlotController.updateAvailabilitySlot.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    availabilitySlotController.deleteAvailabilitySlot.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/availability-slots', () => {
    it('should list slots', async () => {
      const response = await request(app).get('/api/v1/availability-slots');

      expect(response.status).toBe(200);
      expect(availabilitySlotController.listAvailabilitySlots).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/availability-slots');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/availability-slots');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/availability-slots')
        .query({
          page: '1',
          limit: '20',
          schedule_id: '550e8400-e29b-41d4-a716-446655440000',
          is_available: 'true'
        });

      expect(availabilitySlotController.listAvailabilitySlots).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/availability-slots/:id', () => {
    const slotId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get slot by ID', async () => {
      const response = await request(app).get(`/api/v1/availability-slots/${slotId}`);

      expect(response.status).toBe(200);
      expect(availabilitySlotController.getAvailabilitySlotById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/availability-slots/${slotId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get(`/api/v1/availability-slots/${slotId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/availability-slots', () => {
    const slotData = {
      schedule_id: '550e8400-e29b-41d4-a716-446655440001',
      start_time: '2026-01-20T08:00:00.000Z',
      end_time: '2026-01-20T09:00:00.000Z',
      is_available: true
    };

    it('should create a slot', async () => {
      const response = await request(app)
        .post('/api/v1/availability-slots')
        .send(slotData);

      expect(response.status).toBe(201);
      expect(availabilitySlotController.createAvailabilitySlot).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .post('/api/v1/availability-slots')
        .send(slotData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app)
        .post('/api/v1/availability-slots')
        .send(slotData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });
  });

  describe('PUT /api/v1/availability-slots/:id', () => {
    const slotId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { is_available: false };

    it('should update a slot', async () => {
      const response = await request(app)
        .put(`/api/v1/availability-slots/${slotId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(availabilitySlotController.updateAvailabilitySlot).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .put(`/api/v1/availability-slots/${slotId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app)
        .put(`/api/v1/availability-slots/${slotId}`)
        .send(updateData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });
  });

  describe('DELETE /api/v1/availability-slots/:id', () => {
    const slotId = '550e8400-e29b-41d4-a716-446655440000';

    it('should soft delete a slot', async () => {
      const response = await request(app).delete(`/api/v1/availability-slots/${slotId}`);

      expect(response.status).toBe(204);
      expect(availabilitySlotController.deleteAvailabilitySlot).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/availability-slots/${slotId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).delete(`/api/v1/availability-slots/${slotId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });
});
