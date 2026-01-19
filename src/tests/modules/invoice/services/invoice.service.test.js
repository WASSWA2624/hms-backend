/**
 * Invoice service tests
 *
 * @module tests/modules/invoice/services
 * @description Tests for invoice service
 * Per testing.mdc: Mock repository, test business logic
 */

const invoiceService = require('@services/invoice/invoice.service');
const invoiceRepository = require('@repositories/invoice/invoice.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/invoice/invoice.repository');
jest.mock('@lib/audit');

describe('Invoice Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listInvoices', () => {
    const mockInvoices = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'DRAFT',
        total_amount: '1000.00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'PAID',
        total_amount: '2500.50'
      }
    ];

    it('should list invoices with pagination', async () => {
      invoiceRepository.findMany.mockResolvedValue(mockInvoices);
      invoiceRepository.count.mockResolvedValue(2);

      const result = await invoiceService.listInvoices({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(result).toHaveProperty('invoices', mockInvoices);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'PAID'
      };
      invoiceRepository.findMany.mockResolvedValue(mockInvoices);
      invoiceRepository.count.mockResolvedValue(2);

      await invoiceService.listInvoices(filters, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(invoiceRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: filters.tenant_id,
          status: filters.status
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply search filter with OR clause', async () => {
      const filters = { search: 'invoice-123' };
      invoiceRepository.findMany.mockResolvedValue(mockInvoices);
      invoiceRepository.count.mockResolvedValue(2);

      await invoiceService.listInvoices(filters, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(invoiceRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: expect.arrayContaining([
            { id: { contains: 'invoice-123' } }
          ])
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      invoiceRepository.findMany.mockResolvedValue(mockInvoices);
      invoiceRepository.count.mockResolvedValue(42);

      const result = await invoiceService.listInvoices({}, 2, 10, null, 'asc', 'user-id', '127.0.0.1');

      expect(result.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 42,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true
      });
      expect(invoiceRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        10, // skip: (2-1) * 10
        10,
        expect.any(Object)
      );
    });

    it('should apply custom sorting', async () => {
      invoiceRepository.findMany.mockResolvedValue(mockInvoices);
      invoiceRepository.count.mockResolvedValue(2);

      await invoiceService.listInvoices({}, 1, 20, 'issued_at', 'desc', 'user-id', '127.0.0.1');

      expect(invoiceRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        { issued_at: 'desc' }
      );
    });

    it('should use default sorting when sortBy not provided', async () => {
      invoiceRepository.findMany.mockResolvedValue(mockInvoices);
      invoiceRepository.count.mockResolvedValue(2);

      await invoiceService.listInvoices({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1');

      expect(invoiceRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        { created_at: 'desc' }
      );
    });

    it('should handle repository errors', async () => {
      invoiceRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        invoiceService.listInvoices({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.unexpected', 500);
      invoiceRepository.findMany.mockRejectedValue(httpError);

      await expect(
        invoiceService.listInvoices({}, 1, 20, null, 'asc', 'user-id', '127.0.0.1')
      ).rejects.toThrow(httpError);
    });
  });

  describe('getInvoiceById', () => {
    const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
    const mockInvoice = {
      id: invoiceId,
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'DRAFT',
      total_amount: '1500.50'
    };

    it('should get invoice by ID with relations', async () => {
      invoiceRepository.findById.mockResolvedValue(mockInvoice);

      const result = await invoiceService.getInvoiceById(invoiceId, 'requester-id', '127.0.0.1');

      expect(result).toEqual(mockInvoice);
      expect(invoiceRepository.findById).toHaveBeenCalledWith(
        invoiceId,
        expect.objectContaining({
          items: true,
          payments: true,
          tenant: true,
          facility: true,
          patient: true
        })
      );
    });

    it('should throw HttpError if invoice not found', async () => {
      invoiceRepository.findById.mockResolvedValue(null);

      await expect(
        invoiceService.getInvoiceById(invoiceId, 'requester-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.invoice.not_found',
        statusCode: 404
      });
    });

    it('should handle repository errors', async () => {
      invoiceRepository.findById.mockRejectedValue(new Error('DB Error'));

      await expect(
        invoiceService.getInvoiceById(invoiceId, 'requester-id', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createInvoice', () => {
    const invoiceData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      patient_id: '550e8400-e29b-41d4-a716-446655440002',
      status: 'DRAFT',
      billing_status: 'DRAFT',
      total_amount: '1500.50',
      currency: 'USD'
    };

    const createdInvoice = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...invoiceData
    };

    it('should create new invoice', async () => {
      invoiceRepository.create.mockResolvedValue(createdInvoice);
      createAuditLog.mockResolvedValue(null);

      const result = await invoiceService.createInvoice(invoiceData, 'user-id', '127.0.0.1');

      expect(result).toEqual(createdInvoice);
      expect(invoiceRepository.create).toHaveBeenCalledWith(invoiceData);
    });

    it('should create audit log after creation', async () => {
      invoiceRepository.create.mockResolvedValue(createdInvoice);
      createAuditLog.mockResolvedValue(null);

      await invoiceService.createInvoice(invoiceData, 'user-id', '127.0.0.1');

      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'CREATE',
        entity: 'invoice',
        entity_id: createdInvoice.id,
        diff: { after: createdInvoice },
        ip_address: '127.0.0.1'
      });
    });

    it('should not throw if audit log fails', async () => {
      invoiceRepository.create.mockResolvedValue(createdInvoice);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      await expect(
        invoiceService.createInvoice(invoiceData, 'user-id', '127.0.0.1')
      ).resolves.toEqual(createdInvoice);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.unique_field', 409);
      invoiceRepository.create.mockRejectedValue(httpError);

      await expect(
        invoiceService.createInvoice(invoiceData, 'user-id', '127.0.0.1')
      ).rejects.toThrow(httpError);
    });
  });

  describe('updateInvoice', () => {
    const invoiceId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'PAID',
      billing_status: 'PAID'
    };

    const beforeInvoice = {
      id: invoiceId,
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'DRAFT',
      billing_status: 'DRAFT',
      total_amount: '1500.50'
    };

    const updatedInvoice = {
      ...beforeInvoice,
      ...updateData
    };

    it('should update invoice', async () => {
      invoiceRepository.findById.mockResolvedValue(beforeInvoice);
      invoiceRepository.update.mockResolvedValue(updatedInvoice);
      createAuditLog.mockResolvedValue(null);

      const result = await invoiceService.updateInvoice(invoiceId, updateData, 'user-id', '127.0.0.1');

      expect(result).toEqual(updatedInvoice);
      expect(invoiceRepository.update).toHaveBeenCalledWith(invoiceId, updateData);
    });

    it('should throw HttpError if invoice not found', async () => {
      invoiceRepository.findById.mockResolvedValue(null);

      await expect(
        invoiceService.updateInvoice(invoiceId, updateData, 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.invoice.not_found',
        statusCode: 404
      });
    });

    it('should create audit log with before and after', async () => {
      invoiceRepository.findById.mockResolvedValue(beforeInvoice);
      invoiceRepository.update.mockResolvedValue(updatedInvoice);
      createAuditLog.mockResolvedValue(null);

      await invoiceService.updateInvoice(invoiceId, updateData, 'user-id', '127.0.0.1');

      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'UPDATE',
        entity: 'invoice',
        entity_id: invoiceId,
        diff: { before: beforeInvoice, after: updatedInvoice },
        ip_address: '127.0.0.1'
      });
    });

    it('should not throw if audit log fails', async () => {
      invoiceRepository.findById.mockResolvedValue(beforeInvoice);
      invoiceRepository.update.mockResolvedValue(updatedInvoice);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      await expect(
        invoiceService.updateInvoice(invoiceId, updateData, 'user-id', '127.0.0.1')
      ).resolves.toEqual(updatedInvoice);
    });
  });

  describe('deleteInvoice', () => {
    const invoiceId = '550e8400-e29b-41d4-a716-446655440000';

    const beforeInvoice = {
      id: invoiceId,
      tenant_id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'DRAFT',
      total_amount: '1500.50'
    };

    it('should soft delete invoice', async () => {
      invoiceRepository.findById.mockResolvedValue(beforeInvoice);
      invoiceRepository.softDelete.mockResolvedValue(null);
      createAuditLog.mockResolvedValue(null);

      await invoiceService.deleteInvoice(invoiceId, 'user-id', '127.0.0.1');

      expect(invoiceRepository.softDelete).toHaveBeenCalledWith(invoiceId);
    });

    it('should throw HttpError if invoice not found', async () => {
      invoiceRepository.findById.mockResolvedValue(null);

      await expect(
        invoiceService.deleteInvoice(invoiceId, 'user-id', '127.0.0.1')
      ).rejects.toMatchObject({
        messageKey: 'errors.invoice.not_found',
        statusCode: 404
      });
    });

    it('should create audit log with before state', async () => {
      invoiceRepository.findById.mockResolvedValue(beforeInvoice);
      invoiceRepository.softDelete.mockResolvedValue(null);
      createAuditLog.mockResolvedValue(null);

      await invoiceService.deleteInvoice(invoiceId, 'user-id', '127.0.0.1');

      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user-id',
        action: 'DELETE',
        entity: 'invoice',
        entity_id: invoiceId,
        diff: { before: beforeInvoice },
        ip_address: '127.0.0.1'
      });
    });

    it('should not throw if audit log fails', async () => {
      invoiceRepository.findById.mockResolvedValue(beforeInvoice);
      invoiceRepository.softDelete.mockResolvedValue(null);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      await expect(
        invoiceService.deleteInvoice(invoiceId, 'user-id', '127.0.0.1')
      ).resolves.toBeUndefined();
    });
  });
});
