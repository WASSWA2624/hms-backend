/**
 * Room routes integration tests
 *
 * @module tests/modules/room/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/room/room.controller');

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
const roomController = require('@controllers/room/room.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const roomRoutes = require('../../../../modules/room/routes/room.routes');

describe('Room Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/rooms', roomRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/rooms/', () => {
    it('should call listRooms controller', async () => {
      roomController.listRooms.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Rooms retrieved successfully',
          data: [
            { id: 'room-1', name: 'Room 101', tenant_id: 'tenant-123' },
            { id: 'room-2', name: 'Room 102', tenant_id: 'tenant-123' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/rooms/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(roomController.listRooms).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      roomController.listRooms.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Rooms retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/rooms/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          ward_id: 'ward-123',
          search: '101',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(roomController.listRooms).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/rooms/:id', () => {
    it('should call getRoomById controller', async () => {
      roomController.getRoomById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Room retrieved successfully',
          data: {
            id: 'room-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: 'ward-123',
            name: 'Room 101',
            floor: '1st Floor'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/rooms/room-123');

      expect(response.status).toBe(200);
      expect(roomController.getRoomById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'room-123');
    });
  });

  describe('POST /api/v1/rooms/', () => {
    it('should call createRoom controller', async () => {
      roomController.createRoom.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Room created successfully',
          data: {
            id: 'room-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: 'ward-123',
            name: 'Room 101',
            floor: '1st Floor',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/rooms/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          ward_id: 'ward-123',
          name: 'Room 101',
          floor: '1st Floor'
        });

      expect(response.status).toBe(201);
      expect(roomController.createRoom).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should create room with minimal data', async () => {
      roomController.createRoom.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Room created successfully',
          data: {
            id: 'room-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: null,
            name: 'Room 101',
            floor: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/rooms/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          name: 'Room 101'
        });

      expect(response.status).toBe(201);
      expect(roomController.createRoom).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/rooms/:id', () => {
    it('should call updateRoom controller', async () => {
      roomController.updateRoom.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Room updated successfully',
          data: {
            id: 'room-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: 'ward-123',
            name: 'Updated Room',
            floor: '2nd Floor',
            created_at: new Date('2026-01-19').toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/rooms/room-123')
        .send({
          name: 'Updated Room',
          floor: '2nd Floor'
        });

      expect(response.status).toBe(200);
      expect(roomController.updateRoom).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'room-123');
    });

    it('should update room with partial data', async () => {
      roomController.updateRoom.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Room updated successfully',
          data: {
            id: 'room-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: 'ward-123',
            name: 'Updated Room',
            floor: '1st Floor',
            created_at: new Date('2026-01-19').toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/rooms/room-123')
        .send({ name: 'Updated Room' });

      expect(response.status).toBe(200);
      expect(roomController.updateRoom).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/rooms/:id', () => {
    it('should call deleteRoom controller', async () => {
      roomController.deleteRoom.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/rooms/room-123');

      expect(response.status).toBe(204);
      expect(roomController.deleteRoom).toHaveBeenCalled();
    });
  });

  describe('Middleware application', () => {
    it('should apply authenticate middleware on all routes', async () => {
      roomController.listRooms.mockImplementation((req, res) => {
        res.status(200).json({ data: [], pagination: {} });
      });

      await request(app).get('/api/v1/rooms/');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware on routes', async () => {
      roomController.listRooms.mockImplementation((req, res) => {
        res.status(200).json({ data: [], pagination: {} });
      });

      await request(app).get('/api/v1/rooms/');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
