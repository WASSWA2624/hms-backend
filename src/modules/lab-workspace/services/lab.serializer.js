const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');

const toText = (value) => (value == null ? '' : String(value).trim());

const toPublicIdentifier = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = toText(candidate);
    if (!normalized) continue;
    if (isUuidLike(normalized)) continue;
    return normalized;
  }
  return null;
};

const toIsoDateTime = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const toDisplayName = (...segments) => {
  const value = segments.map(toText).filter(Boolean).join(' ').trim();
  return value || null;
};

const toLabOrderStatusRank = (status) => {
  const normalized = toText(status).toUpperCase();
  if (normalized === 'CANCELLED') return 4;
  if (normalized === 'COMPLETED') return 3;
  if (normalized === 'IN_PROCESS') return 2;
  if (normalized === 'COLLECTED') return 1;
  return 0;
};

const mapLabTestRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  return {
    id: publicId,
    display_id: publicId,
    name: toText(record.name) || null,
    code: toText(record.code) || null,
    unit: toText(record.unit) || null,
    reference_range: toText(record.reference_range) || null,
    tenant_id: toPublicIdentifier(record.tenant?.human_friendly_id, record.tenant_id),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapLabPanelRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  return {
    id: publicId,
    display_id: publicId,
    name: toText(record.name) || null,
    code: toText(record.code) || null,
    tenant_id: toPublicIdentifier(record.tenant?.human_friendly_id, record.tenant_id),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapLabOrderItemRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const order = record.lab_order;
  const patient = order?.patient;
  const test = record.lab_test;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  const resultStatus = Array.isArray(record.results) && record.results.length
    ? record.results
        .map((entry) => toText(entry?.status).toUpperCase())
        .find(Boolean) || null
    : null;

  return {
    id: publicId,
    display_id: publicId,
    status: toText(record.status) || null,
    result_status: resultStatus,
    lab_order_id: toPublicIdentifier(order?.human_friendly_id, record.lab_order_id),
    lab_test_id: toPublicIdentifier(test?.human_friendly_id, record.lab_test_id),
    patient_id: toPublicIdentifier(patient?.human_friendly_id, order?.patient_id),
    patient_display_name: toDisplayName(patient?.first_name, patient?.last_name),
    test_display_name: toText(test?.name) || toText(test?.code) || null,
    test_code: toText(test?.code) || null,
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapLabSampleRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const order = record.lab_order;
  const patient = order?.patient;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  return {
    id: publicId,
    display_id: publicId,
    status: toText(record.status) || null,
    lab_order_id: toPublicIdentifier(order?.human_friendly_id, record.lab_order_id),
    patient_id: toPublicIdentifier(patient?.human_friendly_id, order?.patient_id),
    patient_display_name: toDisplayName(patient?.first_name, patient?.last_name),
    collected_at: toIsoDateTime(record.collected_at),
    received_at: toIsoDateTime(record.received_at),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapLabResultRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const item = record.lab_order_item;
  const order = item?.lab_order;
  const patient = order?.patient;
  const test = item?.lab_test;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  return {
    id: publicId,
    display_id: publicId,
    status: toText(record.status) || null,
    result_value: toText(record.result_value) || null,
    result_unit: toText(record.result_unit) || null,
    result_text: toText(record.result_text) || null,
    reported_at: toIsoDateTime(record.reported_at),
    lab_order_item_id: toPublicIdentifier(item?.human_friendly_id, record.lab_order_item_id),
    lab_order_id: toPublicIdentifier(order?.human_friendly_id, item?.lab_order_id),
    lab_test_id: toPublicIdentifier(test?.human_friendly_id, item?.lab_test_id),
    patient_id: toPublicIdentifier(patient?.human_friendly_id, order?.patient_id),
    patient_display_name: toDisplayName(patient?.first_name, patient?.last_name),
    test_display_name: toText(test?.name) || toText(test?.code) || null,
    test_code: toText(test?.code) || null,
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapLabQcLogRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const test = record.lab_test;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  return {
    id: publicId,
    display_id: publicId,
    status: toText(record.status) || null,
    notes: toText(record.notes) || null,
    lab_test_id: toPublicIdentifier(test?.human_friendly_id, record.lab_test_id),
    test_display_name: toText(test?.name) || toText(test?.code) || null,
    test_code: toText(test?.code) || null,
    logged_at: toIsoDateTime(record.logged_at),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapLabOrderRecord = (record, options = {}) => {
  if (!record || typeof record !== 'object') return null;
  const { includeChildren = true } = options;
  const patient = record.patient;
  const encounter = record.encounter;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);

  const items = includeChildren && Array.isArray(record.items)
    ? record.items.map((entry) => mapLabOrderItemRecord({
        ...entry,
        lab_order: record,
      })).filter(Boolean)
    : [];
  const samples = includeChildren && Array.isArray(record.samples)
    ? record.samples.map((entry) => mapLabSampleRecord({
        ...entry,
        lab_order: record,
      })).filter(Boolean)
    : [];

  const rankedItemStatuses = items.map((entry) => toLabOrderStatusRank(entry?.status));
  const highestItemState = rankedItemStatuses.length ? Math.max(...rankedItemStatuses) : 0;
  const inProgressItems = items.filter((entry) => ['COLLECTED', 'IN_PROCESS'].includes(toText(entry?.status).toUpperCase())).length;
  const pendingItems = items.filter((entry) => toText(entry?.status).toUpperCase() === 'ORDERED').length;
  const completedItems = items.filter((entry) => toText(entry?.status).toUpperCase() === 'COMPLETED').length;

  return {
    id: publicId,
    display_id: publicId,
    status: toText(record.status) || null,
    status_rank: Math.max(toLabOrderStatusRank(record.status), highestItemState),
    encounter_id: toPublicIdentifier(encounter?.human_friendly_id, record.encounter_id),
    patient_id: toPublicIdentifier(patient?.human_friendly_id, record.patient_id),
    patient_display_name: toDisplayName(patient?.first_name, patient?.last_name),
    ordered_at: toIsoDateTime(record.ordered_at),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
    item_count: items.length,
    pending_item_count: pendingItems,
    in_process_item_count: inProgressItems,
    completed_item_count: completedItems,
    sample_count: samples.length,
    items,
    samples,
  };
};

const mapLabOrderWorkflowRecord = (record) => {
  const order = mapLabOrderRecord(record, { includeChildren: true });
  if (!order) return null;
  const timeline = [
    {
      id: 'ordered',
      type: 'ORDER_PLACED',
      at: order.ordered_at || order.created_at,
      label: 'Order requested',
    },
  ];

  order.samples.forEach((sample, index) => {
    if (sample.collected_at) {
      timeline.push({
        id: `sample-collected-${sample.id || index}`,
        type: 'SAMPLE_COLLECTED',
        at: sample.collected_at,
        label: `Sample ${sample.display_id || index + 1} collected`,
      });
    }
    if (sample.received_at) {
      timeline.push({
        id: `sample-received-${sample.id || index}`,
        type: 'SAMPLE_RECEIVED',
        at: sample.received_at,
        label: `Sample ${sample.display_id || index + 1} received`,
      });
    }
  });

  const results = [];
  (record?.items || []).forEach((item) => {
    (item?.results || []).forEach((result) => {
      const mapped = mapLabResultRecord({
        ...result,
        lab_order_item: item,
      });
      if (mapped) {
        results.push(mapped);
        if (mapped.reported_at) {
          timeline.push({
            id: `result-${mapped.id || `${item.id}-reported`}`,
            type: 'RESULT_REPORTED',
            at: mapped.reported_at,
            label: `Result reported for ${mapped.test_display_name || mapped.lab_test_id || 'test item'}`,
          });
        }
      }
    });
  });

  timeline.sort((a, b) => {
    const left = Date.parse(a.at || '');
    const right = Date.parse(b.at || '');
    if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
    if (!Number.isFinite(left)) return 1;
    if (!Number.isFinite(right)) return -1;
    return left - right;
  });

  return {
    order,
    results,
    timeline,
    next_actions: {
      can_collect: ['ORDERED', 'COLLECTED'].includes(toText(order.status).toUpperCase()),
      can_receive_sample: order.samples.some((sample) => ['PENDING', 'COLLECTED'].includes(toText(sample.status).toUpperCase())),
      can_release_result: order.items.some((item) => ['ORDERED', 'COLLECTED', 'IN_PROCESS'].includes(toText(item.status).toUpperCase())),
    },
  };
};

module.exports = {
  toPublicIdentifier,
  toIsoDateTime,
  mapLabTestRecord,
  mapLabPanelRecord,
  mapLabOrderRecord,
  mapLabOrderItemRecord,
  mapLabSampleRecord,
  mapLabResultRecord,
  mapLabQcLogRecord,
  mapLabOrderWorkflowRecord,
};
