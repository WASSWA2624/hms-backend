/**
 * Message routes tests
 *
 * @module tests/modules/message/routes
 * @description Tests for message routes
 * Per testing.mdc: Test route configuration, middleware application
 */

const express = require('express');
const request = require('supertest');
const messageRoutes = require('@modules/message/routes/message.routes');
const messageController = require('@controllers/message/message.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/message/message.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: jest.fn(() => (req, res, next) => next())
}));

describe('Message Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/messages', messageRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /messages', () => {
    it('should call listMessages controller', async () => {
      messageController.listMessages.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .get('/messages')
        .expect(200);

      expect(messageController.listMessages).toHaveBeenCalled();
    });
  });

  describe('GET /messages/:id', () => {
    it('should call getMessage controller', async () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      messageController.getMessage.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .get(`/messages/${messageId}`)
        .expect(200);

      expect(messageController.getMessage).toHaveBeenCalled();
    });
  });

  describe('GET /messages/conversation/:conversationId', () => {
    it('should call getMessagesByConversation controller', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000';
      messageController.getMessagesByConversation.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .get(`/messages/conversation/${conversationId}`)
        .expect(200);

      expect(messageController.getMessagesByConversation).toHaveBeenCalled();
    });
  });

  describe('POST /messages', () => {
    it('should call createMessage controller', async () => {
      messageController.createMessage.mockImplementation((req, res) => 
        res.status(201).json({ success: true })
      );

      await request(app)
        .post('/messages')
        .send({ conversation_id: '550e8400-e29b-41d4-a716-446655440000', content: 'Test' })
        .expect(201);

      expect(messageController.createMessage).toHaveBeenCalled();
    });
  });

  describe('PUT /messages/:id', () => {
    it('should call updateMessage controller', async () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      messageController.updateMessage.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .put(`/messages/${messageId}`)
        .send({ content: 'Updated' })
        .expect(200);

      expect(messageController.updateMessage).toHaveBeenCalled();
    });
  });

  describe('DELETE /messages/:id', () => {
    it('should call deleteMessage controller', async () => {
      const messageId = '550e8400-e29b-41d4-a716-446655440000';
      messageController.deleteMessage.mockImplementation((req, res) => 
        res.status(204).send()
      );

      await request(app)
        .delete(`/messages/${messageId}`)
        .expect(204);

      expect(messageController.deleteMessage).toHaveBeenCalled();
    });
  });
});
