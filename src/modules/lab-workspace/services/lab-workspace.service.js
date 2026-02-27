const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { normalizeIdentifier } = require('@lib/identifiers/resolve-entity-id');
const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');
const prisma = require('@prisma/client');
const labWorkspaceRepository = require('@repositories/lab-workspace/lab-workspace.repository');
const { emitToUsers, DIAGNOSTIC_EVENTS } = require('@lib/websocket');
const { ROLES } = require('@config/roles');
const {
  LAB_ORDER_WITH_RELATIONS_INCLUDE,
  buildPagination,
  normalizeSearchTerm,
  resolveModelIdOrThrow,
  resolveModelRecordOrThrow,
  toDateOrNull,
  applyDateRangeFilter,
} = require('@services/lab-workspace/lab.shared');
const {
  toPublicIdentifier,
  mapLabOrderRecord,
  mapLabOrderWorkflowRecord,
  mapLabResultRecord,
} = require('@services/lab-workspace/lab.serializer');

const ORDER_COMPLETION_STATES = new Set(['COMPLETED', 'CANCELLED']);
const SAMPLE_COLLECTABLE_STATES = new Set(['PENDING', 'COLLECTED']);
const SAMPLE_REJECTABLE_STATES = new Set(['PENDING', 'COLLECTED', 'RECEIVED']);
const LAB_RECIPIENT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.TENANT_ADMIN,
  ROLES.FACILITY_ADMIN,
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.LAB_TECH,
];
const LEGACY_ROUTE_CONFIG = Object.freeze({
  'lab-orders': {
    model: 'lab_order',
    resource: 'orders',
    route: '/lab/orders',
  },
  'lab-order-items': {
    model: 'lab_order_item',
    resource: 'order-items',
    route: '/lab/order-items',
  },
  'lab-samples': {
    model: 'lab_sample',
    resource: 'samples',
    route: '/lab/samples',
  },
  'lab-results': {
    model: 'lab_result',
    resource: 'results',
    route: '/lab/results',
  },
  'lab-tests': {
    model: 'lab_test',
    resource: 'tests',
    route: '/lab/tests',
  },
  'lab-panels': {
    model: 'lab_panel',
    resource: 'panels',
    route: '/lab/panels',
  },
  'lab-qc-logs': {
    model: 'lab_qc_log',
    resource: 'qc-logs',
    route: '/lab/qc-logs',
  },
});

const appendAnd = (where, clause) => {
  if (!clause || typeof clause !== 'object') return;
  if (!Array.isArray(where.AND)) where.AND = [];
  where.AND.push(clause);
};

const normalizeEnumFilter = (value, fallback) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return fallback;
  return normalized;
};

const assertTransition = (condition, details = {}) => {
  if (condition) return;
  throw new HttpError('errors.lab_workflow.invalid_transition', 400, [details]);
};

const buildWorkbenchOrderWhere = async (filters = {}, options = {}) => {
  const includeSearch = options.includeSearch !== false;
  const where = {};

  if (filters.patient_id) {
    where.patient_id = await resolveModelIdOrThrow({
      identifier: filters.patient_id,
      model: 'patient',
      where: { deleted_at: null },
      errorKey: 'errors.patient.not_found',
    });
  }

  if (filters.encounter_id) {
    where.encounter_id = await resolveModelIdOrThrow({
      identifier: filters.encounter_id,
      model: 'encounter',
      where: { deleted_at: null },
      errorKey: 'errors.encounter.not_found',
    });
  }

  if (filters.status) {
    where.status = filters.status;
  }

  applyDateRangeFilter(where, 'ordered_at', filters.from, filters.to);

  const stage = normalizeEnumFilter(filters.stage, 'ALL');
  if (stage === 'COLLECTION') {
    appendAnd(where, { status: { in: ['ORDERED', 'COLLECTED'] } });
  } else if (stage === 'PROCESSING') {
    appendAnd(where, { status: 'IN_PROCESS' });
  } else if (stage === 'RESULTS') {
    appendAnd(where, {
      items: {
        some: {
          deleted_at: null,
          OR: [
            { status: { in: ['COLLECTED', 'IN_PROCESS'] } },
            { results: { some: { deleted_at: null, status: 'PENDING' } } },
          ],
        },
      },
    });
  } else if (stage === 'COMPLETED') {
    appendAnd(where, { status: 'COMPLETED' });
  } else if (stage === 'CANCELLED') {
    appendAnd(where, { status: 'CANCELLED' });
  }

  const criticality = normalizeEnumFilter(filters.criticality, 'ALL');
  if (criticality === 'CRITICAL') {
    appendAnd(where, {
      items: {
        some: {
          deleted_at: null,
          results: {
            some: {
              deleted_at: null,
              status: 'CRITICAL',
            },
          },
        },
      },
    });
  } else if (criticality === 'NON_CRITICAL') {
    appendAnd(where, {
      items: {
        none: {
          deleted_at: null,
          results: {
            some: {
              deleted_at: null,
              status: 'CRITICAL',
            },
          },
        },
      },
    });
  }

  const searchTerm = normalizeSearchTerm(filters.search);
  if (includeSearch && searchTerm) {
    appendAnd(where, {
      OR: [
        { human_friendly_id: { contains: searchTerm.upper } },
        { patient: { human_friendly_id: { contains: searchTerm.upper } } },
        { patient: { first_name: { contains: searchTerm.raw } } },
        { patient: { last_name: { contains: searchTerm.raw } } },
        { encounter: { human_friendly_id: { contains: searchTerm.upper } } },
        { samples: { some: { human_friendly_id: { contains: searchTerm.upper } } } },
        { items: { some: { human_friendly_id: { contains: searchTerm.upper } } } },
        { items: { some: { lab_test: { human_friendly_id: { contains: searchTerm.upper } } } } },
        { items: { some: { lab_test: { name: { contains: searchTerm.raw } } } } },
        { items: { some: { lab_test: { code: { contains: searchTerm.raw } } } } },
        { items: { some: { results: { some: { human_friendly_id: { contains: searchTerm.upper } } } } } },
      ],
    });
  }

  return where;
};

const mapReleasedResultFromOrder = (orderRecord, releasedResultId) => {
  if (!orderRecord || !releasedResultId) return null;
  for (const item of orderRecord.items || []) {
    for (const result of item.results || []) {
      if (result.id === releasedResultId) {
        return mapLabResultRecord({
          ...result,
          lab_order_item: item,
        });
      }
    }
  }
  return null;
};

const resolveRoleRecipients = async ({ tenantId, facilityId = null }) => {
  if (!tenantId || !prisma?.user_role?.findMany) return [];

  const rows = await prisma.user_role.findMany({
    where: {
      deleted_at: null,
      tenant_id: tenantId,
      role: {
        name: {
          in: LAB_RECIPIENT_ROLES,
        },
        deleted_at: null,
      },
      ...(facilityId ? { OR: [{ facility_id: null }, { facility_id: facilityId }] } : {}),
    },
    select: {
      user_id: true,
    },
  });

  return rows.map((item) => item.user_id).filter(Boolean);
};

const buildLabRealtimePayload = ({
  workflow,
  action,
  resourceType = null,
  resourceId = null,
}) => {
  const order = workflow?.order || null;
  const orderId = String(order?.id || '').trim() || null;
  const patientId = String(order?.patient_id || '').trim() || null;
  const nowIso = new Date().toISOString();

  return {
    order_id: orderId,
    order_public_id: orderId,
    patient_id: patientId,
    patient_public_id: patientId,
    patient_display_name: order?.patient_display_name || null,
    status: order?.status || null,
    action: String(action || 'UPDATED').trim().toUpperCase(),
    resource_type: resourceType,
    resource_id: resourceId,
    occurred_at: nowIso,
    target_path: orderId ? `/lab?id=${encodeURIComponent(orderId)}` : '/lab',
    workflow,
  };
};

const publishLabRealtimeUpdates = async ({
  workflow,
  orderRecord,
  actorUserId = null,
  action,
  resourceType = null,
  resourceId = null,
  releasedResult = null,
}) => {
  try {
    const tenantId = orderRecord?.patient?.tenant_id || null;
    if (!tenantId) return;

    const facilityId = orderRecord?.patient?.facility_id || null;
    const recipientUserIds = await resolveRoleRecipients({
      tenantId,
      facilityId,
    });

    const recipients = recipientUserIds.filter(
      (userId) => userId && userId !== actorUserId
    );
    if (!recipients.length) return;

    const workflowPayload = buildLabRealtimePayload({
      workflow,
      action,
      resourceType,
      resourceId,
    });

    emitToUsers(
      recipients,
      DIAGNOSTIC_EVENTS.LAB_WORKFLOW_UPDATED,
      workflowPayload
    );

    if (!releasedResult) return;

    const resultStatus = String(releasedResult.status || '')
      .trim()
      .toUpperCase();
    const compatibilityPayload = {
      order_id: workflowPayload.order_id,
      order_public_id: workflowPayload.order_public_id,
      patient_id: workflowPayload.patient_id,
      patient_public_id: workflowPayload.patient_public_id,
      result_id: releasedResult.id || null,
      result_public_id: releasedResult.id || null,
      result_status: resultStatus || null,
      action: workflowPayload.action,
      occurred_at: workflowPayload.occurred_at,
      target_path: releasedResult.id
        ? `/lab/results/${encodeURIComponent(releasedResult.id)}`
        : workflowPayload.target_path,
    };

    emitToUsers(
      recipients,
      DIAGNOSTIC_EVENTS.LAB_RESULT_UPDATED,
      compatibilityPayload
    );

    if (resultStatus && resultStatus !== 'PENDING') {
      emitToUsers(
        recipients,
        DIAGNOSTIC_EVENTS.LAB_RESULT_READY,
        compatibilityPayload
      );
    }
  } catch (_error) {
    // realtime should never block lab workflow updates
  }
};

const getLabWorkbench = async (filters, page, limit, sortBy, order) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { ordered_at: 'desc' };

    const [where, summaryWhere] = await Promise.all([
      buildWorkbenchOrderWhere(filters, { includeSearch: true }),
      buildWorkbenchOrderWhere(filters, { includeSearch: false }),
    ]);

    const [
      worklistRecords,
      total,
      totalOrders,
      collectionQueue,
      processingQueue,
      completedOrders,
      cancelledOrders,
      resultsQueue,
      criticalResults,
      rejectedSamples,
    ] = await Promise.all([
      labWorkspaceRepository.findManyOrders(
        where,
        skip,
        limit,
        orderBy,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      ),
      labWorkspaceRepository.countOrders(where),
      labWorkspaceRepository.countOrders(summaryWhere),
      labWorkspaceRepository.countOrders({
        ...summaryWhere,
        status: { in: ['ORDERED', 'COLLECTED'] },
      }),
      labWorkspaceRepository.countOrders({
        ...summaryWhere,
        status: 'IN_PROCESS',
      }),
      labWorkspaceRepository.countOrders({
        ...summaryWhere,
        status: 'COMPLETED',
      }),
      labWorkspaceRepository.countOrders({
        ...summaryWhere,
        status: 'CANCELLED',
      }),
      labWorkspaceRepository.countOrderItems({
        status: { in: ['COLLECTED', 'IN_PROCESS'] },
        lab_order: {
          deleted_at: null,
          ...summaryWhere,
        },
      }),
      labWorkspaceRepository.countResults({
        status: 'CRITICAL',
        lab_order_item: {
          deleted_at: null,
          lab_order: {
            deleted_at: null,
            ...summaryWhere,
          },
        },
      }),
      labWorkspaceRepository.countSamples({
        status: 'REJECTED',
        lab_order: {
          deleted_at: null,
          ...summaryWhere,
        },
      }),
    ]);

    return {
      summary: {
        total_orders: totalOrders,
        collection_queue: collectionQueue,
        processing_queue: processingQueue,
        results_queue: resultsQueue,
        critical_results: criticalResults,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        rejected_samples: rejectedSamples,
      },
      worklist: worklistRecords.map((record) => mapLabOrderRecord(record)).filter(Boolean),
      pagination: buildPagination(page, limit, total),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const getLabOrderWorkflow = async (identifier) => {
  try {
    const orderId = await resolveModelIdOrThrow({
      identifier,
      model: 'lab_order',
      where: { deleted_at: null },
      errorKey: 'errors.lab_order.not_found',
    });

    const orderRecord = await labWorkspaceRepository.findOrderById(
      orderId,
      LAB_ORDER_WITH_RELATIONS_INCLUDE
    );
    if (!orderRecord) {
      throw new HttpError('errors.lab_order.not_found', 404);
    }

    return mapLabOrderWorkflowRecord(orderRecord);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const collectLabOrder = async (identifier, payload = {}, userId, ipAddress) => {
  try {
    const orderId = await resolveModelIdOrThrow({
      identifier,
      model: 'lab_order',
      where: { deleted_at: null },
      errorKey: 'errors.lab_order.not_found',
    });

    const mutation = await labWorkspaceRepository.withTransaction(async (tx) => {
      const order = await labWorkspaceRepository.txFindOrderById(
        tx,
        orderId,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );
      if (!order) {
        throw new HttpError('errors.lab_order.not_found', 404);
      }

      assertTransition(!ORDER_COMPLETION_STATES.has(order.status), {
        from: order.status,
        to: 'COLLECTED',
      });

      const collectedAt = toDateOrNull(payload.collected_at, new Date());
      let targetSample = null;

      if (payload.sample_id) {
        const sampleId = await resolveModelIdOrThrow({
          identifier: payload.sample_id,
          model: 'lab_sample',
          where: { deleted_at: null, lab_order_id: order.id },
          errorKey: 'errors.lab_sample.not_found',
        });
        targetSample = await labWorkspaceRepository.txFindSampleById(tx, sampleId);
        if (!targetSample || targetSample.lab_order_id !== order.id) {
          throw new HttpError('errors.lab_sample.not_found', 404);
        }
        assertTransition(SAMPLE_COLLECTABLE_STATES.has(targetSample.status), {
          from: targetSample.status,
          to: 'COLLECTED',
        });
      } else {
        const existing = (order.samples || []).find((sample) =>
          SAMPLE_COLLECTABLE_STATES.has(sample.status)
        );
        if (existing) {
          targetSample = await labWorkspaceRepository.txFindSampleById(tx, existing.id);
        }
      }

      if (targetSample) {
        targetSample = await labWorkspaceRepository.txUpdateSample(tx, targetSample.id, {
          status: 'COLLECTED',
          collected_at: collectedAt,
        });
      } else {
        targetSample = await labWorkspaceRepository.txCreateSample(tx, {
          lab_order_id: order.id,
          status: 'COLLECTED',
          collected_at: collectedAt,
        });
      }

      await labWorkspaceRepository.txUpdateOrderItemsMany(
        tx,
        { lab_order_id: order.id, status: 'ORDERED' },
        { status: 'COLLECTED' }
      );

      if (order.status === 'ORDERED') {
        await labWorkspaceRepository.txUpdateOrder(tx, order.id, { status: 'COLLECTED' });
      }

      const refreshedOrder = await labWorkspaceRepository.txFindOrderById(
        tx,
        order.id,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );

      return {
        beforeStatus: order.status,
        order: refreshedOrder,
        sampleId: targetSample.id,
      };
    });

    createAuditLog({
      user_id: userId,
      action: 'COLLECT',
      entity: 'lab_order',
      entity_id: orderId,
      diff: {
        metadata: {
          before_status: mutation.beforeStatus,
          after_status: mutation.order?.status,
          sample_id: mutation.sampleId,
          notes: payload.notes || null,
        },
      },
      ip_address: ipAddress,
    }).catch(() => {});

    const workflow = mapLabOrderWorkflowRecord(mutation.order);
    publishLabRealtimeUpdates({
      workflow,
      orderRecord: mutation.order,
      actorUserId: userId || null,
      action: 'COLLECT',
      resourceType: 'order',
      resourceId: workflow?.order?.id || null,
    }).catch(() => {});

    return { workflow };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const receiveLabSample = async (identifier, payload = {}, userId, ipAddress) => {
  try {
    const sampleId = await resolveModelIdOrThrow({
      identifier,
      model: 'lab_sample',
      where: { deleted_at: null },
      errorKey: 'errors.lab_sample.not_found',
    });

    const mutation = await labWorkspaceRepository.withTransaction(async (tx) => {
      const sample = await labWorkspaceRepository.txFindSampleById(tx, sampleId);
      if (!sample) {
        throw new HttpError('errors.lab_sample.not_found', 404);
      }

      assertTransition(sample.status !== 'REJECTED', {
        from: sample.status,
        to: 'RECEIVED',
      });

      const receivedAt = toDateOrNull(payload.received_at, new Date());
      await labWorkspaceRepository.txUpdateSample(tx, sample.id, {
        status: 'RECEIVED',
        received_at: receivedAt,
      });

      const order = await labWorkspaceRepository.txFindOrderById(
        tx,
        sample.lab_order_id,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );
      if (!order) {
        throw new HttpError('errors.lab_order.not_found', 404);
      }

      if (!ORDER_COMPLETION_STATES.has(order.status)) {
        await labWorkspaceRepository.txUpdateOrder(tx, order.id, { status: 'IN_PROCESS' });
      }

      await labWorkspaceRepository.txUpdateOrderItemsMany(
        tx,
        {
          lab_order_id: order.id,
          status: { in: ['ORDERED', 'COLLECTED'] },
        },
        { status: 'IN_PROCESS' }
      );

      const refreshedOrder = await labWorkspaceRepository.txFindOrderById(
        tx,
        order.id,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );

      return {
        beforeStatus: order.status,
        order: refreshedOrder,
      };
    });

    createAuditLog({
      user_id: userId,
      action: 'RECEIVE',
      entity: 'lab_sample',
      entity_id: sampleId,
      diff: {
        metadata: {
          before_order_status: mutation.beforeStatus,
          after_order_status: mutation.order?.status,
          notes: payload.notes || null,
        },
      },
      ip_address: ipAddress,
    }).catch(() => {});

    const workflow = mapLabOrderWorkflowRecord(mutation.order);
    publishLabRealtimeUpdates({
      workflow,
      orderRecord: mutation.order,
      actorUserId: userId || null,
      action: 'RECEIVE',
      resourceType: 'sample',
      resourceId: identifier,
    }).catch(() => {});

    return { workflow };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const rejectLabSample = async (identifier, payload = {}, userId, ipAddress) => {
  try {
    const sampleId = await resolveModelIdOrThrow({
      identifier,
      model: 'lab_sample',
      where: { deleted_at: null },
      errorKey: 'errors.lab_sample.not_found',
    });

    const mutation = await labWorkspaceRepository.withTransaction(async (tx) => {
      const sample = await labWorkspaceRepository.txFindSampleById(tx, sampleId);
      if (!sample) {
        throw new HttpError('errors.lab_sample.not_found', 404);
      }

      assertTransition(SAMPLE_REJECTABLE_STATES.has(sample.status), {
        from: sample.status,
        to: 'REJECTED',
      });

      await labWorkspaceRepository.txUpdateSample(tx, sample.id, {
        status: 'REJECTED',
      });

      const order = await labWorkspaceRepository.txFindOrderById(
        tx,
        sample.lab_order_id,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );
      if (!order) {
        throw new HttpError('errors.lab_order.not_found', 404);
      }

      const activeSamples = await labWorkspaceRepository.txCountSamples(tx, {
        lab_order_id: order.id,
        status: { in: ['PENDING', 'COLLECTED', 'RECEIVED'] },
      });

      if (activeSamples === 0 && !ORDER_COMPLETION_STATES.has(order.status)) {
        await labWorkspaceRepository.txUpdateOrder(tx, order.id, { status: 'ORDERED' });
        await labWorkspaceRepository.txUpdateOrderItemsMany(
          tx,
          {
            lab_order_id: order.id,
            status: { in: ['COLLECTED', 'IN_PROCESS'] },
          },
          { status: 'ORDERED' }
        );
      }

      const refreshedOrder = await labWorkspaceRepository.txFindOrderById(
        tx,
        order.id,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );

      return {
        beforeStatus: order.status,
        order: refreshedOrder,
      };
    });

    createAuditLog({
      user_id: userId,
      action: 'REJECT',
      entity: 'lab_sample',
      entity_id: sampleId,
      diff: {
        metadata: {
          reason: payload.reason || null,
          notes: payload.notes || null,
          before_order_status: mutation.beforeStatus,
          after_order_status: mutation.order?.status,
        },
      },
      ip_address: ipAddress,
    }).catch(() => {});

    const workflow = mapLabOrderWorkflowRecord(mutation.order);
    publishLabRealtimeUpdates({
      workflow,
      orderRecord: mutation.order,
      actorUserId: userId || null,
      action: 'REJECT',
      resourceType: 'sample',
      resourceId: identifier,
    }).catch(() => {});

    return { workflow };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const releaseLabOrderItem = async (identifier, payload = {}, userId, ipAddress) => {
  try {
    const orderItemId = await resolveModelIdOrThrow({
      identifier,
      model: 'lab_order_item',
      where: { deleted_at: null },
      errorKey: 'errors.lab_order_item.not_found',
    });

    const mutation = await labWorkspaceRepository.withTransaction(async (tx) => {
      const item = await labWorkspaceRepository.txFindOrderItemById(tx, orderItemId, {
        lab_test: {
          select: {
            id: true,
            unit: true,
          },
        },
        lab_order: {
          select: {
            id: true,
            status: true,
          },
        },
      });
      if (!item) {
        throw new HttpError('errors.lab_order_item.not_found', 404);
      }

      assertTransition(item.status !== 'CANCELLED', {
        from: item.status,
        to: 'COMPLETED',
      });

      let targetResult = null;
      if (payload.result_id) {
        const resultId = await resolveModelIdOrThrow({
          identifier: payload.result_id,
          model: 'lab_result',
          where: { deleted_at: null, lab_order_item_id: item.id },
          errorKey: 'errors.lab_result.not_found',
        });
        targetResult = await labWorkspaceRepository.txFindResultById(tx, resultId);
      } else {
        targetResult = await labWorkspaceRepository.txFindFirstResult(tx, {
          lab_order_item_id: item.id,
          status: 'PENDING',
        });
        if (!targetResult) {
          targetResult = await labWorkspaceRepository.txFindFirstResult(
            tx,
            { lab_order_item_id: item.id },
            { created_at: 'desc' }
          );
        }
      }

      const hasResultValue = Object.prototype.hasOwnProperty.call(payload, 'result_value');
      const hasResultUnit = Object.prototype.hasOwnProperty.call(payload, 'result_unit');
      const hasResultText = Object.prototype.hasOwnProperty.call(payload, 'result_text');

      const resultData = {
        status:
          payload.status ||
          (targetResult?.status && targetResult.status !== 'PENDING' ? targetResult.status : 'NORMAL'),
        result_value: hasResultValue ? payload.result_value : targetResult?.result_value || null,
        result_unit: hasResultUnit
          ? payload.result_unit
          : targetResult?.result_unit || item?.lab_test?.unit || null,
        result_text: hasResultText ? payload.result_text : targetResult?.result_text || null,
        reported_at: toDateOrNull(payload.reported_at, new Date()),
      };

      let releasedResult = null;
      if (targetResult) {
        releasedResult = await labWorkspaceRepository.txUpdateResult(tx, targetResult.id, resultData);
      } else {
        releasedResult = await labWorkspaceRepository.txCreateResult(tx, {
          ...resultData,
          lab_order_item_id: item.id,
        });
      }

      await labWorkspaceRepository.txUpdateOrderItem(tx, item.id, {
        status: 'COMPLETED',
      });

      const remainingItems = await labWorkspaceRepository.txCountOrderItems(tx, {
        lab_order_id: item.lab_order_id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      });

      if (remainingItems === 0) {
        await labWorkspaceRepository.txUpdateOrder(tx, item.lab_order_id, {
          status: 'COMPLETED',
        });
      } else if (item.lab_order && item.lab_order.status !== 'CANCELLED') {
        await labWorkspaceRepository.txUpdateOrder(tx, item.lab_order_id, {
          status: 'IN_PROCESS',
        });
      }

      const refreshedOrder = await labWorkspaceRepository.txFindOrderById(
        tx,
        item.lab_order_id,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      );

      return {
        beforeItemStatus: item.status,
        beforeOrderStatus: item.lab_order?.status || null,
        order: refreshedOrder,
        releasedResultId: releasedResult.id,
      };
    });

    createAuditLog({
      user_id: userId,
      action: 'RELEASE',
      entity: 'lab_order_item',
      entity_id: orderItemId,
      diff: {
        metadata: {
          before_item_status: mutation.beforeItemStatus,
          after_order_status: mutation.order?.status || null,
          before_order_status: mutation.beforeOrderStatus,
          released_result_id: mutation.releasedResultId,
          notes: payload.notes || null,
        },
      },
      ip_address: ipAddress,
    }).catch(() => {});

    const workflow = mapLabOrderWorkflowRecord(mutation.order);
    const releasedResult = mapReleasedResultFromOrder(
      mutation.order,
      mutation.releasedResultId
    );
    publishLabRealtimeUpdates({
      workflow,
      orderRecord: mutation.order,
      actorUserId: userId || null,
      action: 'RELEASE',
      resourceType: 'order-item',
      resourceId: identifier,
      releasedResult,
    }).catch(() => {});

    return {
      workflow,
      released_result: releasedResult,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const resolveLegacyRouteIdentifier = async (resource, identifier) => {
  try {
    const normalizedResource = String(resource || '').trim().toLowerCase();
    const normalizedIdentifier = normalizeIdentifier(identifier);
    if (!normalizedIdentifier) {
      throw new HttpError('errors.resource.not_found', 404);
    }

    const config = LEGACY_ROUTE_CONFIG[normalizedResource];
    if (!config) {
      throw new HttpError('errors.resource.not_found', 404);
    }

    const record = await resolveModelRecordOrThrow({
      identifier: normalizedIdentifier,
      model: config.model,
      where: { deleted_at: null },
      select: {
        id: true,
        human_friendly_id: true,
      },
      errorKey: 'errors.resource.not_found',
    });

    const publicIdentifier = toPublicIdentifier(
      record?.human_friendly_id,
      normalizedIdentifier
    );
    const safeIdentifier =
      publicIdentifier ||
      (isUuidLike(normalizedIdentifier)
        ? null
        : String(normalizedIdentifier).trim().toUpperCase());

    if (!safeIdentifier) {
      throw new HttpError('errors.resource.not_found', 404);
    }

    return {
      id: safeIdentifier,
      resource: config.resource,
      identifier: safeIdentifier,
      route: `${config.route}/${encodeURIComponent(safeIdentifier)}`,
      matched_by: isUuidLike(normalizedIdentifier)
        ? 'uuid'
        : 'human_friendly_id',
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  getLabWorkbench,
  getLabOrderWorkflow,
  collectLabOrder,
  receiveLabSample,
  rejectLabSample,
  releaseLabOrderItem,
  resolveLegacyRouteIdentifier,
};
