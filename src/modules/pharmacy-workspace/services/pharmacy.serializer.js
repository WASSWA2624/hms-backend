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

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
};

const mapInventoryItemRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);

  return {
    id: publicId,
    display_id: publicId,
    tenant_id: toPublicIdentifier(record.tenant?.human_friendly_id, record.tenant_id),
    name: toText(record.name) || null,
    category: toText(record.category).toUpperCase() || null,
    sku: toText(record.sku) || null,
    unit: toText(record.unit) || null,
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapInventoryStockRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  const inventoryItem = mapInventoryItemRecord(record.inventory_item);

  return {
    id: publicId,
    display_id: publicId,
    inventory_item_id: toPublicIdentifier(inventoryItem?.id, record.inventory_item_id),
    inventory_item: inventoryItem,
    facility_id: toPublicIdentifier(record.facility?.human_friendly_id, record.facility_id),
    facility_name: toText(record.facility?.name) || null,
    quantity: Number(record.quantity || 0),
    reorder_level: Number(record.reorder_level || 0),
    low_stock:
      Number.isFinite(Number(record.reorder_level)) && Number(record.quantity) <= Number(record.reorder_level),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapDispenseLogRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);

  return {
    id: publicId,
    display_id: publicId,
    pharmacy_order_item_id: toPublicIdentifier(
      record.pharmacy_order_item?.human_friendly_id,
      record.pharmacy_order_item_id
    ),
    dispense_batch_ref: toText(record.dispense_batch_ref) || null,
    status: toText(record.status).toUpperCase() || null,
    quantity_dispensed: Number(record.quantity_dispensed || 0),
    dispensed_at: toIsoDateTime(record.dispensed_at),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapPharmacyAttestationRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);

  return {
    id: publicId,
    display_id: publicId,
    pharmacy_order_id: toPublicIdentifier(
      record.pharmacy_order?.human_friendly_id,
      record.pharmacy_order_id
    ),
    dispense_batch_ref: toText(record.dispense_batch_ref) || null,
    phase: toText(record.phase).toUpperCase() || null,
    attested_by_user_id: toPublicIdentifier(record.attested_by_user_id),
    attested_role: toText(record.attested_role) || null,
    statement: toText(record.statement) || null,
    reason: toText(record.reason) || null,
    attested_at: toIsoDateTime(record.attested_at),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const computeItemDispenseMetrics = (item) => {
  const logs = Array.isArray(item?.dispense_logs) ? item.dispense_logs : [];

  const dispensedQuantity = logs
    .filter((entry) => String(entry.status || '').toUpperCase() === 'DISPENSED')
    .reduce((sum, entry) => sum + Number(entry.quantity_dispensed || 0), 0);
  const returnedQuantity = logs
    .filter((entry) => String(entry.status || '').toUpperCase() === 'RETURNED')
    .reduce((sum, entry) => sum + Number(entry.quantity_dispensed || 0), 0);
  const pendingQuantity = logs
    .filter((entry) => String(entry.status || '').toUpperCase() === 'PENDING')
    .reduce((sum, entry) => sum + Number(entry.quantity_dispensed || 0), 0);

  const prescribedQuantity = Number(item?.quantity || 0);
  const netDispensedQuantity = Math.max(0, dispensedQuantity - returnedQuantity);
  const remainingQuantity = Math.max(0, prescribedQuantity - netDispensedQuantity);

  return {
    prescribedQuantity,
    dispensedQuantity,
    returnedQuantity,
    pendingQuantity,
    netDispensedQuantity,
    remainingQuantity,
  };
};

const mapDrugInventoryMapRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);

  return {
    id: publicId,
    display_id: publicId,
    drug_id: toPublicIdentifier(record.drug?.human_friendly_id, record.drug_id),
    inventory_item_id: toPublicIdentifier(
      record.inventory_item?.human_friendly_id,
      record.inventory_item_id
    ),
    is_default: Boolean(record.is_default),
    deduction_factor: toFiniteNumber(record.deduction_factor, 1),
    inventory_item: mapInventoryItemRecord(record.inventory_item),
  };
};

const mapPharmacyOrderItemRecord = (record) => {
  if (!record || typeof record !== 'object') return null;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);
  const metrics = computeItemDispenseMetrics(record);
  const inventoryMaps = Array.isArray(record.drug?.inventory_maps)
    ? record.drug.inventory_maps.map(mapDrugInventoryMapRecord).filter(Boolean)
    : [];

  return {
    id: publicId,
    display_id: publicId,
    pharmacy_order_id: toPublicIdentifier(
      record.pharmacy_order?.human_friendly_id,
      record.pharmacy_order_id
    ),
    drug_id: toPublicIdentifier(record.drug?.human_friendly_id, record.drug_id),
    drug_display_name: toText(record.drug?.name) || toText(record.drug?.code) || null,
    drug_code: toText(record.drug?.code) || null,
    dosage: toText(record.dosage) || null,
    frequency: toText(record.frequency).toUpperCase() || null,
    route: toText(record.route).toUpperCase() || null,
    status: toText(record.status).toUpperCase() || null,
    quantity_prescribed: metrics.prescribedQuantity,
    quantity_dispensed: metrics.netDispensedQuantity,
    quantity_pending: metrics.pendingQuantity,
    quantity_returned: metrics.returnedQuantity,
    quantity_remaining: metrics.remainingQuantity,
    dispense_logs: (record.dispense_logs || []).map(mapDispenseLogRecord).filter(Boolean),
    stock_mappings: inventoryMaps,
    default_stock_mapping: inventoryMaps.find((entry) => entry.is_default) || inventoryMaps[0] || null,
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
  };
};

const mapPharmacyOrderRecord = (record, options = {}) => {
  if (!record || typeof record !== 'object') return null;
  const { includeChildren = true } = options;
  const publicId = toPublicIdentifier(record.human_friendly_id, record.id);

  const items = includeChildren && Array.isArray(record.items)
    ? record.items.map((entry) => mapPharmacyOrderItemRecord({ ...entry, pharmacy_order: record })).filter(Boolean)
    : [];
  const attestations = includeChildren && Array.isArray(record.dispense_attestations)
    ? record.dispense_attestations.map(mapPharmacyAttestationRecord).filter(Boolean)
    : [];

  const totals = items.reduce(
    (acc, item) => {
      acc.prescribed += Number(item.quantity_prescribed || 0);
      acc.dispensed += Number(item.quantity_dispensed || 0);
      acc.pending += Number(item.quantity_pending || 0);
      acc.returned += Number(item.quantity_returned || 0);
      acc.remaining += Number(item.quantity_remaining || 0);
      return acc;
    },
    { prescribed: 0, dispensed: 0, pending: 0, returned: 0, remaining: 0 }
  );

  const attestationByBatch = new Map();
  attestations.forEach((entry) => {
    const batchRef = entry.dispense_batch_ref;
    if (!batchRef) return;
    const current = attestationByBatch.get(batchRef) || {};
    current[entry.phase] = entry;
    attestationByBatch.set(batchRef, current);
  });

  const pendingAttestationBatches = Array.from(attestationByBatch.entries())
    .filter(([, phases]) => phases.PREPARE && !phases.ATTEST)
    .map(([batchRef, phases]) => ({
      dispense_batch_ref: batchRef,
      prepared_at: phases.PREPARE?.attested_at || null,
      prepared_by_role: phases.PREPARE?.attested_role || null,
    }));

  return {
    id: publicId,
    display_id: publicId,
    encounter_id: toPublicIdentifier(record.encounter?.human_friendly_id, record.encounter_id),
    patient_id: toPublicIdentifier(record.patient?.human_friendly_id, record.patient_id),
    patient_display_name: toDisplayName(record.patient?.first_name, record.patient?.last_name),
    status: toText(record.status).toUpperCase() || null,
    ordered_at: toIsoDateTime(record.ordered_at),
    created_at: toIsoDateTime(record.created_at),
    updated_at: toIsoDateTime(record.updated_at),
    item_count: items.length,
    quantity_prescribed_total: totals.prescribed,
    quantity_dispensed_total: totals.dispensed,
    quantity_pending_total: totals.pending,
    quantity_returned_total: totals.returned,
    quantity_remaining_total: totals.remaining,
    pending_attestation_batch_count: pendingAttestationBatches.length,
    pending_attestation_batches: pendingAttestationBatches,
    items,
    dispense_attestations: attestations,
  };
};

const mapPharmacyOrderWorkflowRecord = (record) => {
  const order = mapPharmacyOrderRecord(record, { includeChildren: true });
  if (!order) return null;

  const timeline = [
    {
      id: 'order-placed',
      type: 'ORDER_PLACED',
      at: order.ordered_at || order.created_at,
      label: 'Pharmacy order created',
    },
  ];

  order.items.forEach((item, itemIndex) => {
    item.dispense_logs.forEach((log, logIndex) => {
      timeline.push({
        id: `dispense-log-${log.id || `${item.id}-${logIndex}`}`,
        type: `DISPENSE_${toText(log.status).toUpperCase() || 'UPDATED'}`,
        at: log.dispensed_at || log.updated_at || log.created_at,
        label: `Medication ${item.drug_display_name || item.display_id || itemIndex + 1} ${
          toText(log.status).toLowerCase() || 'updated'
        }`,
      });
    });
  });

  order.dispense_attestations.forEach((attestation, index) => {
    timeline.push({
      id: `dispense-attestation-${attestation.id || index}`,
      type: `DISPENSE_${toText(attestation.phase).toUpperCase() || 'ATTESTED'}`,
      at: attestation.attested_at || attestation.created_at,
      label: `Dispense ${toText(attestation.phase).toLowerCase() || 'attested'} for batch ${
        attestation.dispense_batch_ref || '-'
      }`,
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

  const hasPendingAttestation = Number(order.pending_attestation_batch_count || 0) > 0;

  return {
    order,
    items: order.items,
    attestations: order.dispense_attestations,
    timeline,
    next_actions: {
      can_prepare_dispense: ['ORDERED', 'PARTIALLY_DISPENSED'].includes(order.status) && !hasPendingAttestation,
      can_attest_dispense: ['ORDERED', 'PARTIALLY_DISPENSED'].includes(order.status) && hasPendingAttestation,
      can_cancel: ['ORDERED', 'PARTIALLY_DISPENSED'].includes(order.status),
      can_return: ['DISPENSED', 'PARTIALLY_DISPENSED'].includes(order.status),
      can_adjust_inventory: true,
    },
  };
};

module.exports = {
  toPublicIdentifier,
  toIsoDateTime,
  mapInventoryItemRecord,
  mapInventoryStockRecord,
  mapDispenseLogRecord,
  mapPharmacyAttestationRecord,
  mapPharmacyOrderItemRecord,
  mapPharmacyOrderRecord,
  mapPharmacyOrderWorkflowRecord,
};
