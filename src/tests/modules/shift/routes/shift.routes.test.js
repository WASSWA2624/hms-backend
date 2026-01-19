/**
 * Shift routes tests
 *
 * @module tests/modules/shift/routes
 * @description Tests for shift route definitions and middleware application
 * Per testing.mdc: Route tests verify middleware and endpoint configuration
 */

const express = require('express');
const request = require('supertest');
const shiftRoutes = require('@routes/shift/shift.routes');
const shiftController = require('@controllers/shift/shift.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Mock middlewares and controller
jest.mock('@controllers/shift/shift.controller');
jest.mock('@middlewares/validate.middleware');
jest.mock('@middlewares/auth.middleware');

describe('Shift Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock authenticate middleware
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });
    
    // Mock validateRequest middleware
    validateRequest.mockImplementation(() => (req, res, next) => next());
    
    // Mock all controller functions
    shiftController.listShifts.mockImplementation((req, res) => 
      res.status(200).json({ success: true, data: [] })
    );
    shiftController.getShiftById.mockImplementation((req, res) => 
      res.status(200).json({ success: true, data: {} })
    );
    shiftController.createShift.mockImplementation((req, res) => 
      res.status(201).json({ success: true, data: {} })
    );
    shiftController.updateShift.mockImplementation((req, res) => 
      res.status(200).json({ success: true, data: {} })
    );
    shiftController.deleteShift.mockImplementation((req, res) => 
      res.status(204).send()
    );
    shiftController.publishShift.mockImplementation((req, res) => 
      res.status(200).json({ success: true, data: {} })
    );
    
    app.use('/shifts', shiftRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /shifts', () => {
    it('should call listShifts controller', async () => {
      const response = await request(app).get('/shifts');
      
      expect(response.status).toBe(200);
      expect(shiftController.listShifts).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/shifts');
      
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/shifts');
      
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /shifts/:id', () => {
    it('should call getShiftById controller', async () => {
      const response = await request(app).get('/shifts/123');
      
      expect(response.status).toBe(200);
      expect(shiftController.getShiftById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/shifts/123');
      
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/shifts/123');
      
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /shifts', () => {
    it('should call createShift controller', async () => {
      const shiftData = {
        tenant_id: '123',
        shift_type: 'DAY',
        status: 'SCHEDULED',
        start_time: '2026-01-20T08:00:00.000Z',
        end_time: '2026-01-20T16:00:00.000Z'
      };
      
      const response = await request(app)
        .post('/shifts')
        .send(shiftData);
      
      expect(response.status).toBe(201);
      expect(shiftController.createShift).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/shifts').send({});
      
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).post('/shifts').send({});
      
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /shifts/:id', () => {
    it('should call updateShift controller', async () => {
      const updateData = { shift_type: 'NIGHT' };
      
      const response = await request(app)
        .put('/shifts/123')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(shiftController.updateShift).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).put('/shifts/123').send({});
      
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).put('/shifts/123').send({});
      
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /shifts/:id', () => {
    it('should call deleteShift controller', async () => {
      const response = await request(app).delete('/shifts/123');
      
      expect(response.status).toBe(204);
      expect(shiftController.deleteShift).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete('/shifts/123');
      
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).delete('/shifts/123');
      
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /shifts/:id/publish', () => {
    it('should call publishShift controller', async () => {
      const publishData = { notify_staff: true };
      
      const response = await request(app)
        .post('/shifts/123/publish')
        .send(publishData);
      
      expect(response.status).toBe(200);
      expect(shiftController.publishShift).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/shifts/123/publish').send({});
      
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).post('/shifts/123/publish').send({});
      
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
