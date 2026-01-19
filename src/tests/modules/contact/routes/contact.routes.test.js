/**
 * Contact routes integration tests
 *
 * @module tests/modules/contact/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/contact/contact.controller');

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { 
      id: 'user-123', 
      tenant_id: 'tenant-123'
    };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const contactController = require('@controllers/contact/contact.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const contactRoutes = require('../../../../modules/contact/routes/contact.routes');

describe('Contact Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/contacts', contactRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/contacts/', () => {
    it('should call listContacts controller', async () => {
      contactController.listContacts.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Contacts retrieved successfully',
          data: [
            { id: 'contact-1', value: '+1234567890', contact_type: 'PHONE', tenant_id: 'tenant-123' },
            { id: 'contact-2', value: 'user@example.com', contact_type: 'EMAIL', tenant_id: 'tenant-123' }
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
        .get('/api/v1/contacts/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(contactController.listContacts).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      contactController.listContacts.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Contacts retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/contacts/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          contact_type: 'PHONE',
          facility_id: 'facility-123',
          is_primary: 'true',
          search: '1234',
          sort_by: 'value',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(contactController.listContacts).toHaveBeenCalled();
    });

    it('should call authentication middleware', async () => {
      contactController.listContacts.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [], pagination: {} });
      });

      await request(app)
        .get('/api/v1/contacts/')
        .query({ page: 1, limit: 20 });

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      contactController.listContacts.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [], pagination: {} });
      });

      await request(app)
        .get('/api/v1/contacts/')
        .query({ page: 1, limit: 20 });

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/contacts/:id', () => {
    it('should call getContactById controller', async () => {
      contactController.getContactById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Contact retrieved successfully',
          data: {
            id: 'contact-123',
            tenant_id: 'tenant-123',
            contact_type: 'EMAIL',
            value: 'user@example.com',
            is_primary: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/contacts/contact-123');

      expect(response.status).toBe(200);
      expect(contactController.getContactById).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
    });

    it('should call authentication middleware', async () => {
      contactController.getContactById.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .get('/api/v1/contacts/contact-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      contactController.getContactById.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .get('/api/v1/contacts/contact-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/contacts/', () => {
    it('should call createContact controller', async () => {
      contactController.createContact.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Contact created successfully',
          data: {
            id: 'contact-123',
            tenant_id: 'tenant-123',
            contact_type: 'PHONE',
            value: '+1234567890',
            is_primary: true,
            created_at: new Date('2026-01-19').toISOString(),
            updated_at: new Date('2026-01-19').toISOString()
          }
        });
      });

      const contactData = {
        tenant_id: 'tenant-123',
        contact_type: 'PHONE',
        value: '+1234567890',
        is_primary: true
      };

      const response = await request(app)
        .post('/api/v1/contacts/')
        .send(contactData);

      expect(response.status).toBe(201);
      expect(contactController.createContact).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should call authentication middleware', async () => {
      contactController.createContact.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: {} });
      });

      const contactData = {
        tenant_id: 'tenant-123',
        contact_type: 'EMAIL',
        value: 'user@example.com'
      };

      await request(app)
        .post('/api/v1/contacts/')
        .send(contactData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      contactController.createContact.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: {} });
      });

      const contactData = {
        tenant_id: 'tenant-123',
        contact_type: 'PHONE',
        value: '+1234567890'
      };

      await request(app)
        .post('/api/v1/contacts/')
        .send(contactData);

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/contacts/:id', () => {
    it('should call updateContact controller', async () => {
      contactController.updateContact.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Contact updated successfully',
          data: {
            id: 'contact-123',
            tenant_id: 'tenant-123',
            contact_type: 'EMAIL',
            value: 'updated@example.com',
            is_primary: true,
            updated_at: new Date('2026-01-19').toISOString()
          }
        });
      });

      const updateData = {
        value: 'updated@example.com',
        is_primary: true
      };

      const response = await request(app)
        .put('/api/v1/contacts/contact-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(contactController.updateContact).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
    });

    it('should call authentication middleware', async () => {
      contactController.updateContact.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .put('/api/v1/contacts/contact-123')
        .send({ value: 'test@example.com' });

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      contactController.updateContact.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: {} });
      });

      await request(app)
        .put('/api/v1/contacts/contact-123')
        .send({ value: 'test@example.com' });

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    it('should call deleteContact controller', async () => {
      contactController.deleteContact.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/contacts/contact-123');

      expect(response.status).toBe(204);
      expect(contactController.deleteContact).toHaveBeenCalled();
    });

    it('should call authentication middleware', async () => {
      contactController.deleteContact.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/contacts/contact-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware', async () => {
      contactController.deleteContact.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/contacts/contact-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
