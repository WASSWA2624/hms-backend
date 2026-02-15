/**
 * createAuditLog helper tests
 */

jest.mock('@lib/logging', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const prisma = require('@prisma/client');
const { logger } = require('@lib/logging');
const { createAuditLog } = require('@lib/audit/createAuditLog');

const flushImmediate = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('createAuditLog helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.audit_log.create.mockReset();
  });

  it('returns early when required fields are missing', async () => {
    await createAuditLog({ action: 'CREATE' });

    expect(logger.warn).toHaveBeenCalledWith(
      'Invalid audit log data: missing required fields',
      expect.any(Object)
    );
    expect(prisma.audit_log.create).not.toHaveBeenCalled();
  });

  it('persists a valid audit log asynchronously', async () => {
    prisma.audit_log.create.mockResolvedValue({ id: 'audit-1' });

    await createAuditLog({
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      action: 'CREATE',
      entity: 'invoice',
      entity_id: 'inv-1',
      diff: { after: { id: 'inv-1' } },
      ip_address: '127.0.0.1',
    });

    await flushImmediate();

    expect(prisma.audit_log.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        action: 'CREATE',
        entity: 'invoice',
        entity_id: 'inv-1',
        diff_json: { after: { id: 'inv-1' } },
        ip_address: '127.0.0.1',
      }),
    });
  });

  it('maps unknown actions to ACCESS and preserves original action', async () => {
    prisma.audit_log.create.mockResolvedValue({ id: 'audit-2' });

    await createAuditLog({
      tenant_id: 'tenant-1',
      action: 'publish_shift',
      entity: 'shift',
      entity_id: 'shift-1',
      diff: 'payload',
      ip: '10.0.0.1',
    });

    await flushImmediate();

    expect(prisma.audit_log.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ACCESS',
        diff_json: {
          details: 'payload',
          original_action: 'PUBLISH_SHIFT',
        },
        ip_address: '10.0.0.1',
      }),
    });
  });

  it('logs persistence failures but does not throw', async () => {
    prisma.audit_log.create.mockRejectedValue(new Error('db failure'));

    await createAuditLog({
      tenant_id: 'tenant-1',
      action: 'UPDATE',
      entity: 'patient',
      entity_id: 'patient-1',
    });

    await flushImmediate();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create audit log entry',
      expect.objectContaining({ error: 'db failure' })
    );
  });

  it('logs scheduling failures when setImmediate errors', async () => {
    const setImmediateSpy = jest
      .spyOn(global, 'setImmediate')
      .mockImplementation(() => {
        throw new Error('schedule failure');
      });

    await createAuditLog({
      tenant_id: 'tenant-1',
      action: 'DELETE',
      entity: 'user',
      entity_id: 'user-1',
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to schedule audit log creation',
      expect.objectContaining({ error: 'schedule failure' })
    );

    setImmediateSpy.mockRestore();
  });

  it('warns and skips when prisma client is unavailable', async () => {
    jest.resetModules();

    const warnMock = jest.fn();
    jest.doMock('@lib/logging', () => ({
      logger: {
        warn: warnMock,
        error: jest.fn(),
        info: jest.fn(),
      },
    }));
    jest.doMock('@prisma/client', () => {
      throw new Error('missing prisma');
    });

    let isolatedCreateAuditLog;
    jest.isolateModules(() => {
      ({ createAuditLog: isolatedCreateAuditLog } = require('@lib/audit/createAuditLog'));
    });

    await isolatedCreateAuditLog({
      tenant_id: 'tenant-1',
      action: 'CREATE',
      entity: 'user',
      entity_id: 'user-1',
    });

    expect(warnMock).toHaveBeenCalledWith(
      'Prisma client not available, skipping audit log creation',
      expect.objectContaining({
        action: 'CREATE',
        entity: 'user',
        entity_id: 'user-1',
      })
    );
  });
});
