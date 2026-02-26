/**
 * IPD flow service
 */

const prisma = require('@prisma/client');
const ipdFlowRepository = require('@repositories/ipd-flow/ipd-flow.repository');
const { HttpError } = require('@lib/errors');
const { createAuditLog } = require('@lib/audit');
const {
  emitToUser,
  emitToUsers,
  IPD_EVENTS,
  ADMISSION_BED_EVENTS,
  NOTIFICATION_EVENTS,
} = require('@lib/websocket');
const { ROLES } = require('@config/roles');

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STAGES = Object.freeze({
  ADMITTED_PENDING_BED: 'ADMITTED_PENDING_BED',
  ADMITTED_IN_BED: 'ADMITTED_IN_BED',
  TRANSFER_REQUESTED: 'TRANSFER_REQUESTED',
  TRANSFER_IN_PROGRESS: 'TRANSFER_IN_PROGRESS',
  DISCHARGE_PLANNED: 'DISCHARGE_PLANNED',
  DISCHARGED: 'DISCHARGED',
  CANCELLED: 'CANCELLED',
});

const TRANSFER_ACTIONS = Object.freeze({
  APPROVE: 'APPROVE',
  START: 'START',
  COMPLETE: 'COMPLETE',
  CANCEL: 'CANCEL',
});

const QUEUE_SCOPES = Object.freeze({
  ACTIVE: 'ACTIVE',
  ALL: 'ALL',
});
const TERMINAL_STAGES = new Set([STAGES.DISCHARGED, STAGES.CANCELLED]);
const LEGACY_ROUTE_CONFIG = Object.freeze({
  admissions: { delegate: 'admission', admissionField: 'id', panel: 'snapshot', action: 'open_admission' },
  'bed-assignments': { delegate: 'bed_assignment', admissionField: 'admission_id', panel: 'beds', action: 'manage_bed' },
  'ward-rounds': { delegate: 'ward_round', admissionField: 'admission_id', panel: 'rounds', action: 'add_ward_round' },
  'nursing-notes': { delegate: 'nursing_note', admissionField: 'admission_id', panel: 'nursing', action: 'add_nursing_note' },
  'medication-administrations': { delegate: 'medication_administration', admissionField: 'admission_id', panel: 'medication', action: 'add_medication' },
  'discharge-summaries': { delegate: 'discharge_summary', admissionField: 'admission_id', panel: 'discharge', action: 'plan_discharge' },
  'transfer-requests': { delegate: 'transfer_request', admissionField: 'admission_id', panel: 'transfer', action: 'manage_transfer' },
});

const TERMINAL_ADMISSION_STATUSES = new Set(['DISCHARGED', 'CANCELLED']);
const OPEN_TRANSFER_STATUSES = new Set(['REQUESTED', 'APPROVED', 'IN_PROGRESS']);
const IPD_RECIPIENT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.TENANT_ADMIN,
  ROLES.FACILITY_ADMIN,
  ROLES.DOCTOR,
  ROLES.NURSE,
];

const toDate = (value, fallback = new Date()) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const sanitizeIdentifier = (value) => String(value || '').trim();
const isUuidLike = (value) => UUID_LIKE_REGEX.test(sanitizeIdentifier(value));
const normalizeQueueScope = (value) =>
  String(value || QUEUE_SCOPES.ACTIVE).trim().toUpperCase() === QUEUE_SCOPES.ALL
    ? QUEUE_SCOPES.ALL
    : QUEUE_SCOPES.ACTIVE;

const toPublicScalarIdentifier = (value) => {
  const normalized = sanitizeIdentifier(value);
  if (!normalized) return null;
  return isUuidLike(normalized) ? null : normalized;
};

const resolvePublicIdentifier = (record) => {
  if (!record) return null;
  if (typeof record === 'string') return toPublicScalarIdentifier(record);
  return toPublicScalarIdentifier(record.human_friendly_id) || null;
};

const resolvePatientDisplayName = (patient) => {
  const firstName = sanitizeIdentifier(patient?.first_name);
  const lastName = sanitizeIdentifier(patient?.last_name);
  return [firstName, lastName].filter(Boolean).join(' ').trim();
};

const resolveByIdentifier = async (delegate, identifier, where = {}, select = { id: true }) => {
  const normalized = sanitizeIdentifier(identifier);
  if (!normalized || !delegate || typeof delegate.findFirst !== 'function') return null;

  const baseWhere = {
    deleted_at: null,
    ...(where || {}),
  };

  if (isUuidLike(normalized)) {
    const byUuid = await delegate.findFirst({
      where: {
        ...baseWhere,
        id: normalized.toLowerCase(),
      },
      select,
    });

    if (byUuid) return byUuid;
  }

  return delegate.findFirst({
    where: {
      ...baseWhere,
      human_friendly_id: normalized.toUpperCase(),
    },
    select,
  });
};

const resolveAdmissionByIdentifier = (tx, identifier) =>
  resolveByIdentifier(tx.admission, identifier, {}, {
    id: true,
    tenant_id: true,
    facility_id: true,
    status: true,
    patient_id: true,
  });

const resolveTenantByIdentifier = (tx, identifier) =>
  resolveByIdentifier(tx.tenant, identifier, {}, { id: true });

const resolveFacilityByIdentifier = (tx, identifier, tenantId = null) =>
  resolveByIdentifier(tx.facility, identifier, tenantId ? { tenant_id: tenantId } : {}, {
    id: true,
    tenant_id: true,
  });

const resolvePatientByIdentifier = (tx, identifier, tenantId = null, facilityId = null) =>
  resolveByIdentifier(
    tx.patient,
    identifier,
    {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(facilityId ? { facility_id: facilityId } : {}),
    },
    {
      id: true,
      tenant_id: true,
      facility_id: true,
    }
  );

const resolveEncounterByIdentifier = (tx, identifier, tenantId = null, facilityId = null) =>
  resolveByIdentifier(
    tx.encounter,
    identifier,
    {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(facilityId ? { facility_id: facilityId } : {}),
    },
    {
      id: true,
      tenant_id: true,
      facility_id: true,
      patient_id: true,
    }
  );

const resolveBedByIdentifier = (tx, identifier, tenantId = null, facilityId = null) =>
  resolveByIdentifier(
    tx.bed,
    identifier,
    {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(facilityId ? { facility_id: facilityId } : {}),
    },
    {
      id: true,
      status: true,
      ward_id: true,
      tenant_id: true,
      facility_id: true,
      human_friendly_id: true,
      label: true,
    }
  );

const resolveWardByIdentifier = (tx, identifier, tenantId = null, facilityId = null) =>
  resolveByIdentifier(
    tx.ward,
    identifier,
    {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(facilityId ? { facility_id: facilityId } : {}),
    },
    {
      id: true,
      name: true,
      human_friendly_id: true,
    }
  );

const resolveUserByIdentifier = (tx, identifier, tenantId = null, facilityId = null) =>
  resolveByIdentifier(
    tx.user,
    identifier,
    {
      ...(tenantId ? { tenant_id: tenantId } : {}),
      ...(facilityId ? { facility_id: facilityId } : {}),
    },
    {
      id: true,
    }
  );

const resolveTransferByIdentifier = (tx, identifier, admissionId = null) =>
  resolveByIdentifier(
    tx.transfer_request,
    identifier,
    admissionId ? { admission_id: admissionId } : {},
    {
      id: true,
      admission_id: true,
      status: true,
    }
  );

const getActiveBedAssignment = (admission) =>
  (Array.isArray(admission?.bed_assignments) ? admission.bed_assignments : []).find(
    (item) => !item.released_at && !item.deleted_at
  ) || null;

const getOpenTransferRequest = (admission) =>
  (Array.isArray(admission?.transfer_requests) ? admission.transfer_requests : []).find((item) =>
    OPEN_TRANSFER_STATUSES.has(String(item?.status || '').toUpperCase())
  ) || null;

const getLatestDischargeSummary = (admission) =>
  (Array.isArray(admission?.discharge_summaries) ? admission.discharge_summaries : [])[0] || null;
const deriveIpdStage = ({ admission, activeBedAssignment, openTransferRequest, latestDischargeSummary }) => {
  const admissionStatus = String(admission?.status || '').toUpperCase();
  if (admissionStatus === 'CANCELLED') return STAGES.CANCELLED;
  if (admissionStatus === 'DISCHARGED') return STAGES.DISCHARGED;

  const dischargeStatus = String(latestDischargeSummary?.status || '').toUpperCase();
  if (dischargeStatus === 'PLANNED') return STAGES.DISCHARGE_PLANNED;

  const transferStatus = String(openTransferRequest?.status || '').toUpperCase();
  if (transferStatus === 'IN_PROGRESS') return STAGES.TRANSFER_IN_PROGRESS;
  if (transferStatus === 'REQUESTED' || transferStatus === 'APPROVED') return STAGES.TRANSFER_REQUESTED;

  return activeBedAssignment ? STAGES.ADMITTED_IN_BED : STAGES.ADMITTED_PENDING_BED;
};

const deriveNextStep = (stage, openTransferRequest = null) => {
  if (stage === STAGES.ADMITTED_PENDING_BED) return 'ASSIGN_BED';
  if (stage === STAGES.ADMITTED_IN_BED) return 'RECORD_NURSING_NOTE';
  if (stage === STAGES.TRANSFER_REQUESTED) {
    return String(openTransferRequest?.status || '').toUpperCase() === 'APPROVED'
      ? 'START_TRANSFER'
      : 'APPROVE_TRANSFER';
  }
  if (stage === STAGES.TRANSFER_IN_PROGRESS) return 'COMPLETE_TRANSFER';
  if (stage === STAGES.DISCHARGE_PLANNED) return 'FINALIZE_DISCHARGE';
  return null;
};

const buildFlowSummary = (snapshot) => ({
  stage: snapshot?.flow?.stage || null,
  next_step: snapshot?.flow?.next_step || null,
  admission_status: snapshot?.admission?.status || null,
  has_active_bed: Boolean(snapshot?.active_bed_assignment),
  transfer_status: snapshot?.open_transfer_request?.status || null,
});

const buildIpdSnapshot = (admission) => {
  const activeBedAssignment = getActiveBedAssignment(admission);
  const openTransferRequest = getOpenTransferRequest(admission);
  const latestDischargeSummary = getLatestDischargeSummary(admission);

  const stage = deriveIpdStage({
    admission,
    activeBedAssignment,
    openTransferRequest,
    latestDischargeSummary,
  });

  const snapshot = {
    admission: {
      id: admission.id,
      human_friendly_id: admission.human_friendly_id || null,
      tenant_id: admission.tenant_id,
      facility_id: admission.facility_id || null,
      patient_id: admission.patient_id,
      encounter_id: admission.encounter_id || null,
      status: admission.status,
      admitted_at: admission.admitted_at,
      discharged_at: admission.discharged_at || null,
      created_at: admission.created_at,
      updated_at: admission.updated_at,
    },
    patient: admission.patient || null,
    encounter: admission.encounter || null,
    facility: admission.facility || null,
    tenant: admission.tenant || null,
    active_bed_assignment: activeBedAssignment || null,
    open_transfer_request: openTransferRequest || null,
    latest_discharge_summary: latestDischargeSummary || null,
    transfer_requests: Array.isArray(admission.transfer_requests) ? admission.transfer_requests : [],
    discharge_summaries: Array.isArray(admission.discharge_summaries)
      ? admission.discharge_summaries
      : [],
    ward_rounds: Array.isArray(admission.ward_rounds) ? admission.ward_rounds : [],
    nursing_notes: Array.isArray(admission.nursing_notes) ? admission.nursing_notes : [],
    medication_administrations: Array.isArray(admission.medication_administrations)
      ? admission.medication_administrations
      : [],
    flow: {
      stage,
      next_step: deriveNextStep(stage, openTransferRequest),
      transfer_status: openTransferRequest?.status || null,
      has_active_bed: Boolean(activeBedAssignment),
      admission_status: admission.status,
    },
  };

  snapshot.flow_summary = buildFlowSummary(snapshot);
  return snapshot;
};

const mapPublicWard = (ward) => {
  if (!ward) return null;
  return {
    id: resolvePublicIdentifier(ward),
    name: sanitizeIdentifier(ward.name) || null,
    ward_type: sanitizeIdentifier(ward.ward_type) || null,
  };
};

const mapPublicRoom = (room) => {
  if (!room) return null;
  return {
    id: resolvePublicIdentifier(room),
    name: sanitizeIdentifier(room.name) || null,
    floor: room.floor ?? null,
  };
};

const mapPublicBed = (bed) => {
  if (!bed) return null;
  return {
    id: resolvePublicIdentifier(bed),
    label: sanitizeIdentifier(bed.label) || null,
    status: sanitizeIdentifier(bed.status) || null,
    ward: mapPublicWard(bed.ward),
    room: mapPublicRoom(bed.room),
  };
};

const mapPublicBedAssignment = (assignment) => {
  if (!assignment) return null;
  return {
    id: resolvePublicIdentifier(assignment),
    assigned_at: assignment.assigned_at || null,
    released_at: assignment.released_at || null,
    bed: mapPublicBed(assignment.bed),
  };
};

const mapPublicTransferRequest = (request) => {
  if (!request) return null;
  return {
    id: resolvePublicIdentifier(request),
    status: sanitizeIdentifier(request.status) || null,
    requested_at: request.requested_at || null,
    from_ward: mapPublicWard(request.from_ward),
    to_ward: mapPublicWard(request.to_ward),
  };
};

const mapPublicDischargeSummary = (summary) => {
  if (!summary) return null;
  return {
    id: resolvePublicIdentifier(summary),
    status: sanitizeIdentifier(summary.status) || null,
    summary: summary.summary || null,
    discharged_at: summary.discharged_at || null,
    created_at: summary.created_at || null,
    updated_at: summary.updated_at || null,
  };
};

const mapPublicWardRound = (round) => {
  if (!round) return null;
  return {
    id: resolvePublicIdentifier(round),
    round_at: round.round_at || null,
    notes: round.notes || null,
    created_at: round.created_at || null,
  };
};

const resolveUserDisplayName = (user) => {
  if (!user || !user.profile) return '';
  const first = sanitizeIdentifier(user.profile.first_name);
  const middle = sanitizeIdentifier(user.profile.middle_name);
  const last = sanitizeIdentifier(user.profile.last_name);
  return [first, middle, last].filter(Boolean).join(' ').trim();
};

const mapPublicNursingNote = (note) => {
  if (!note) return null;
  return {
    id: resolvePublicIdentifier(note),
    nurse_user_id: resolvePublicIdentifier(note.nurse),
    nurse_name: resolveUserDisplayName(note.nurse) || sanitizeIdentifier(note.nurse?.email) || null,
    note: note.note || null,
    created_at: note.created_at || null,
  };
};

const mapPublicMedicationAdministration = (entry) => {
  if (!entry) return null;
  return {
    id: resolvePublicIdentifier(entry),
    prescription_id: toPublicScalarIdentifier(entry.prescription_id),
    administered_at: entry.administered_at || null,
    dose: entry.dose || null,
    unit: entry.unit || null,
    route: sanitizeIdentifier(entry.route) || null,
    created_at: entry.created_at || null,
  };
};

const buildPublicTimeline = (snapshot) => {
  const events = [];

  (Array.isArray(snapshot?.ward_rounds) ? snapshot.ward_rounds : []).forEach((round) => {
    events.push({
      type: 'WARD_ROUND',
      at: round.round_at || round.created_at || null,
      label: round.notes || 'Ward round recorded',
    });
  });

  (Array.isArray(snapshot?.nursing_notes) ? snapshot.nursing_notes : []).forEach((note) => {
    events.push({
      type: 'NURSING_NOTE',
      at: note.created_at || null,
      label: note.note || 'Nursing note recorded',
    });
  });

  (Array.isArray(snapshot?.medication_administrations) ? snapshot.medication_administrations : []).forEach(
    (entry) => {
      events.push({
        type: 'MEDICATION_ADMINISTRATION',
        at: entry.administered_at || entry.created_at || null,
        label:
          sanitizeIdentifier(entry.dose)
            ? `Dose ${entry.dose}${entry.unit ? ` ${entry.unit}` : ''}`
            : 'Medication recorded',
      });
    }
  );

  (Array.isArray(snapshot?.transfer_requests) ? snapshot.transfer_requests : []).forEach((request) => {
    events.push({
      type: 'TRANSFER',
      at: request.requested_at || null,
      label: `Transfer ${sanitizeIdentifier(request.status) || 'UPDATED'}`,
    });
  });

  return events
    .filter((entry) => sanitizeIdentifier(entry.at))
    .sort((left, right) => {
      const leftTs = new Date(left.at).getTime() || 0;
      const rightTs = new Date(right.at).getTime() || 0;
      return rightTs - leftTs;
    });
};

const toPublicIpdSnapshot = (snapshot) => {
  const admissionPublicId = resolvePublicIdentifier(snapshot?.admission);
  const patientPublicId = resolvePublicIdentifier(snapshot?.patient);
  const encounterPublicId = resolvePublicIdentifier(snapshot?.encounter);
  const activeBed = mapPublicBedAssignment(snapshot?.active_bed_assignment);
  const openTransfer = mapPublicTransferRequest(snapshot?.open_transfer_request);
  const latestDischarge = mapPublicDischargeSummary(snapshot?.latest_discharge_summary);
  const patientName = resolvePatientDisplayName(snapshot?.patient);

  const publicSnapshot = {
    id: admissionPublicId,
    human_friendly_id: admissionPublicId,
    display_id: admissionPublicId,
    admission: {
      id: admissionPublicId,
      status: sanitizeIdentifier(snapshot?.admission?.status) || null,
      admitted_at: snapshot?.admission?.admitted_at || null,
      discharged_at: snapshot?.admission?.discharged_at || null,
      created_at: snapshot?.admission?.created_at || null,
      updated_at: snapshot?.admission?.updated_at || null,
    },
    tenant: snapshot?.tenant
      ? {
          id: resolvePublicIdentifier(snapshot.tenant),
          name: sanitizeIdentifier(snapshot.tenant.name) || null,
        }
      : null,
    facility: snapshot?.facility
      ? {
          id: resolvePublicIdentifier(snapshot.facility),
          name: sanitizeIdentifier(snapshot.facility.name) || null,
          facility_type: sanitizeIdentifier(snapshot.facility.facility_type) || null,
        }
      : null,
    patient: snapshot?.patient
      ? {
          id: patientPublicId,
          first_name: snapshot.patient.first_name || null,
          last_name: snapshot.patient.last_name || null,
          date_of_birth: snapshot.patient.date_of_birth || null,
          gender: sanitizeIdentifier(snapshot.patient.gender) || null,
        }
      : null,
    encounter: snapshot?.encounter
      ? {
          id: encounterPublicId,
          encounter_type: sanitizeIdentifier(snapshot.encounter.encounter_type) || null,
          status: sanitizeIdentifier(snapshot.encounter.status) || null,
          started_at: snapshot.encounter.started_at || null,
          ended_at: snapshot.encounter.ended_at || null,
          provider_user_id: null,
        }
      : null,
    active_bed_assignment: activeBed,
    open_transfer_request: openTransfer,
    latest_discharge_summary: latestDischarge,
    transfer_requests: (Array.isArray(snapshot?.transfer_requests) ? snapshot.transfer_requests : [])
      .map(mapPublicTransferRequest)
      .filter(Boolean),
    discharge_summaries: (Array.isArray(snapshot?.discharge_summaries) ? snapshot.discharge_summaries : [])
      .map(mapPublicDischargeSummary)
      .filter(Boolean),
    ward_rounds: (Array.isArray(snapshot?.ward_rounds) ? snapshot.ward_rounds : [])
      .map(mapPublicWardRound)
      .filter(Boolean),
    nursing_notes: (Array.isArray(snapshot?.nursing_notes) ? snapshot.nursing_notes : [])
      .map(mapPublicNursingNote)
      .filter(Boolean),
    medication_administrations: (
      Array.isArray(snapshot?.medication_administrations) ? snapshot.medication_administrations : []
    )
      .map(mapPublicMedicationAdministration)
      .filter(Boolean),
    flow: {
      stage: sanitizeIdentifier(snapshot?.flow?.stage) || null,
      next_step: sanitizeIdentifier(snapshot?.flow?.next_step) || null,
      transfer_status: sanitizeIdentifier(snapshot?.flow?.transfer_status) || null,
      has_active_bed: Boolean(snapshot?.flow?.has_active_bed),
      admission_status: sanitizeIdentifier(snapshot?.flow?.admission_status) || null,
    },
    flow_summary: {
      stage: sanitizeIdentifier(snapshot?.flow_summary?.stage) || null,
      next_step: sanitizeIdentifier(snapshot?.flow_summary?.next_step) || null,
      admission_status: sanitizeIdentifier(snapshot?.flow_summary?.admission_status) || null,
      has_active_bed: Boolean(snapshot?.flow_summary?.has_active_bed),
      transfer_status: sanitizeIdentifier(snapshot?.flow_summary?.transfer_status) || null,
    },
    stage: sanitizeIdentifier(snapshot?.flow?.stage) || null,
    next_step: sanitizeIdentifier(snapshot?.flow?.next_step) || null,
    transfer_status: sanitizeIdentifier(snapshot?.flow?.transfer_status) || null,
    patient_display_name: patientName || patientPublicId || null,
    patient_display_id: patientPublicId,
    ward_display_name:
      sanitizeIdentifier(activeBed?.bed?.ward?.name) ||
      sanitizeIdentifier(openTransfer?.to_ward?.name) ||
      null,
  };

  publicSnapshot.timeline = buildPublicTimeline(publicSnapshot);
  return publicSnapshot;
};

const toQueueCardDto = (snapshot) => {
  const publicSnapshot = toPublicIpdSnapshot(snapshot);
  return {
    id: publicSnapshot.id,
    admission_id: publicSnapshot.id,
    display_id: publicSnapshot.display_id,
    human_friendly_id: publicSnapshot.human_friendly_id,
    stage: publicSnapshot.stage,
    next_step: publicSnapshot.next_step,
    transfer_status: publicSnapshot.transfer_status,
    has_active_bed: Boolean(publicSnapshot?.flow_summary?.has_active_bed),
    patient_id: publicSnapshot.patient_display_id,
    patient_display_id: publicSnapshot.patient_display_id,
    patient_display_name: publicSnapshot.patient_display_name,
    ward_display_name: publicSnapshot.ward_display_name,
    bed_id: publicSnapshot?.active_bed_assignment?.bed?.id || null,
    bed_display_label: publicSnapshot?.active_bed_assignment?.bed?.label || null,
    admitted_at: publicSnapshot?.admission?.admitted_at || null,
    discharged_at: publicSnapshot?.admission?.discharged_at || null,
    flow_summary: publicSnapshot.flow_summary,
    admission_status: publicSnapshot?.admission?.status || null,
  };
};

const matchesDerivedFilters = (snapshot, filters = {}) => {
  if (filters.stage && snapshot.flow?.stage !== filters.stage) return false;

  if (filters.transfer_status) {
    if (
      String(snapshot?.open_transfer_request?.status || '').toUpperCase() !==
      String(filters.transfer_status).toUpperCase()
    ) {
      return false;
    }
  }

  if (typeof filters.has_active_bed === 'boolean') {
    if (Boolean(snapshot?.active_bed_assignment) !== filters.has_active_bed) return false;
  }

  if (filters.ward_id) {
    const wardId =
      snapshot?.active_bed_assignment?.bed?.ward_id || snapshot?.active_bed_assignment?.bed?.ward?.id || null;
    if (!wardId || wardId !== filters.ward_id) return false;
  }

  if (filters.queue_scope === QUEUE_SCOPES.ACTIVE && !filters.stage) {
    if (TERMINAL_STAGES.has(snapshot?.flow?.stage)) return false;
  }

  return true;
};

const getIpdSnapshotByIdInternal = async (id) => {
  const resolved = await resolveAdmissionByIdentifier(prisma, id);
  if (!resolved) {
    throw new HttpError('errors.ipd_flow.not_found', 404);
  }

  const admission = await ipdFlowRepository.findById(resolved.id);
  if (!admission) {
    throw new HttpError('errors.ipd_flow.not_found', 404);
  }

  return buildIpdSnapshot(admission);
};

const getIpdFlowById = async (id) => toPublicIpdSnapshot(await getIpdSnapshotByIdInternal(id));

const listIpdFlows = async (filters = {}, page = 1, limit = 20, sortBy = 'admitted_at', order = 'desc') => {
  const currentPage = Math.max(1, Number(page) || 1);
  const currentLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (currentPage - 1) * currentLimit;
  const direction = String(order || '').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const queueScope = normalizeQueueScope(filters.queue_scope);

  const where = {};

  if (filters.tenant_id) {
    const tenant = await resolveTenantByIdentifier(prisma, filters.tenant_id);
    if (!tenant) throw new HttpError('errors.tenant.not_found', 404, [{ field: 'tenant_id' }]);
    where.tenant_id = tenant.id;
  }

  if (filters.facility_id) {
    const facility = await resolveFacilityByIdentifier(prisma, filters.facility_id, where.tenant_id || null);
    if (!facility) throw new HttpError('errors.facility.not_found', 404, [{ field: 'facility_id' }]);
    where.facility_id = facility.id;
    if (!where.tenant_id) where.tenant_id = facility.tenant_id;
  }

  if (filters.patient_id) {
    const patient = await resolvePatientByIdentifier(
      prisma,
      filters.patient_id,
      where.tenant_id || null,
      where.facility_id || null
    );

    if (!patient) throw new HttpError('errors.ipd_flow.patient_not_found', 404, [{ field: 'patient_id' }]);
    where.patient_id = patient.id;
  }

  if (queueScope === QUEUE_SCOPES.ACTIVE && !filters.stage) {
    where.status = { notIn: ['DISCHARGED', 'CANCELLED'] };
  }

  const searchText = sanitizeIdentifier(filters.search);
  if (searchText) {
    where.OR = [
      { human_friendly_id: { contains: searchText } },
      { patient: { is: { human_friendly_id: { contains: searchText } } } },
      { patient: { is: { first_name: { contains: searchText } } } },
      { patient: { is: { last_name: { contains: searchText } } } },
      { encounter: { is: { human_friendly_id: { contains: searchText } } } },
    ];
  }

  let wardId = null;
  if (filters.ward_id) {
    const ward = await resolveWardByIdentifier(
      prisma,
      filters.ward_id,
      where.tenant_id || null,
      where.facility_id || null
    );
    if (!ward) throw new HttpError('errors.ward.not_found', 404, [{ field: 'ward_id' }]);
    wardId = ward.id;
  }

  const hasDerivedFilters = Boolean(
    filters.stage || filters.transfer_status || wardId || typeof filters.has_active_bed === 'boolean'
  );

  if (hasDerivedFilters) {
    const rows = await ipdFlowRepository.findMany(where, 0, 300, {
      [sortBy || 'admitted_at']: direction,
    });
    const filtered = rows
      .map((row) => buildIpdSnapshot(row))
      .filter((snapshot) =>
        matchesDerivedFilters(snapshot, {
          stage: filters.stage,
          transfer_status: filters.transfer_status,
          has_active_bed: filters.has_active_bed,
          ward_id: wardId,
          queue_scope: queueScope,
        })
      );

    const items = filtered.slice(skip, skip + currentLimit).map(toQueueCardDto);

    return {
      items,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / currentLimit) || 1,
        hasNextPage: skip + currentLimit < filtered.length,
        hasPreviousPage: currentPage > 1,
      },
    };
  }

  const [rows, total] = await Promise.all([
    ipdFlowRepository.findMany(where, skip, currentLimit, { [sortBy || 'admitted_at']: direction }),
    ipdFlowRepository.count(where),
  ]);

  return {
    items: rows.map((row) => toQueueCardDto(buildIpdSnapshot(row))),
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages: Math.ceil(total / currentLimit) || 1,
      hasNextPage: skip + currentLimit < total,
      hasPreviousPage: currentPage > 1,
    },
  };
};

const resolveLegacyRoute = async (resource, id) => {
  const normalizedResource = sanitizeIdentifier(resource).toLowerCase();
  const config = LEGACY_ROUTE_CONFIG[normalizedResource];
  if (!config) throw new HttpError('errors.ipd_flow.not_found', 404);

  const delegate = prisma[config.delegate];
  if (!delegate || typeof delegate.findFirst !== 'function') {
    throw new HttpError('errors.ipd_flow.not_found', 404);
  }

  const select = {
    id: true,
    human_friendly_id: true,
    [config.admissionField]: true,
  };

  const resolvedResource = await resolveByIdentifier(delegate, id, {}, select);
  if (!resolvedResource) throw new HttpError('errors.ipd_flow.not_found', 404);

  const admissionInternalId =
    config.admissionField === 'id' ? resolvedResource.id : resolvedResource[config.admissionField];

  if (!admissionInternalId) throw new HttpError('errors.ipd_flow.not_found', 404);

  const admission = await prisma.admission.findFirst({
    where: {
      id: admissionInternalId,
      deleted_at: null,
    },
    select: {
      id: true,
      human_friendly_id: true,
      status: true,
    },
  });

  if (!admission) throw new HttpError('errors.ipd_flow.not_found', 404);

  return {
    admission_id: resolvePublicIdentifier(admission),
    resource: normalizedResource,
    resource_id: resolvePublicIdentifier(resolvedResource),
    panel: config.panel,
    action: config.action,
    stage_hint:
      String(admission.status || '').toUpperCase() === 'DISCHARGED'
        ? STAGES.DISCHARGED
        : String(admission.status || '').toUpperCase() === 'CANCELLED'
          ? STAGES.CANCELLED
          : null,
  };
};

const ensureAdmissionIsMutable = (admission) => {
  const status = String(admission?.status || '').toUpperCase();
  if (TERMINAL_ADMISSION_STATUSES.has(status)) {
    throw new HttpError('errors.ipd_flow.admission_terminal', 400);
  }
};

const fetchAdmissionForMutation = async (tx, admissionId) => {
  const admission = await tx.admission.findFirst({
    where: {
      id: admissionId,
      deleted_at: null,
    },
    include: {
      bed_assignments: {
        where: { deleted_at: null },
        orderBy: { assigned_at: 'desc' },
        include: { bed: true },
      },
      transfer_requests: {
        where: { deleted_at: null },
        orderBy: { requested_at: 'desc' },
      },
      discharge_summaries: {
        where: { deleted_at: null },
        orderBy: { updated_at: 'desc' },
      },
    },
  });

  if (!admission) throw new HttpError('errors.ipd_flow.not_found', 404);
  return admission;
};

const buildRealtimePayload = ({ snapshot, transition }) => {
  const admissionPublicId = snapshot?.id || snapshot?.admission?.id || null;
  const patientPublicId = snapshot?.patient?.id || null;

  return {
    admission_id: admissionPublicId,
    admission_public_id: admissionPublicId,
    patient_id: patientPublicId,
    patient_public_id: patientPublicId,
    stage_from: transition?.stage_from || null,
    stage_to: transition?.stage_to || snapshot?.flow?.stage || null,
    next_step: snapshot?.flow?.next_step || null,
    action: transition?.action || 'UPDATED',
    occurred_at: transition?.occurred_at || new Date().toISOString(),
    flow_summary: snapshot?.flow_summary || null,
    target_path: admissionPublicId ? `/ipd?id=${encodeURIComponent(admissionPublicId)}` : '/ipd',
  };
};

const resolveRoleRecipients = async ({ tenantId, facilityId = null, roles = [] }) => {
  if (!tenantId || !Array.isArray(roles) || roles.length === 0) return [];

  if (!prisma?.user_role?.findMany) return [];

  const rows = await prisma.user_role.findMany({
    where: {
      deleted_at: null,
      tenant_id: tenantId,
      role: {
        name: {
          in: roles,
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

const createAndEmitNotifications = async ({ payload, recipientUserIds, tenantId }) => {
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) return;
  if (!prisma?.notification?.create) return;

  const title = `IPD flow update: ${String(payload?.stage_to || 'UPDATED').replace(/_/g, ' ')}`;
  const message = `Admission ${payload?.admission_public_id || 'unknown'} moved to ${payload?.stage_to || 'UPDATED'}.`;

  for (const userId of recipientUserIds) {
    try {
      const notification = await prisma.notification.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          notification_type: 'SYSTEM',
          priority: payload?.stage_to === STAGES.TRANSFER_IN_PROGRESS ? 'HIGH' : 'MEDIUM',
          title,
          message,
        },
      });

      emitToUser(notification.user_id, NOTIFICATION_EVENTS.NOTIFICATION_CREATED, {
        notification: {
          id: notification.human_friendly_id || null,
          tenant_id: null,
          user_id: null,
          notification_type: notification.notification_type,
          priority: notification.priority,
          title: notification.title,
          message: notification.message,
          read_at: notification.read_at || null,
          created_at: notification.created_at,
          updated_at: notification.updated_at,
          target_path: payload.target_path,
        },
        target_path: payload.target_path,
      });
    } catch (_error) {
      // ignore notification errors
    }
  }
};

const buildCompatibilityEvents = (signals = []) => {
  const events = [];
  if (signals.includes('PATIENT_ADMITTED')) events.push(ADMISSION_BED_EVENTS.PATIENT_ADMITTED);
  if (signals.includes('PATIENT_TRANSFERRED')) events.push(ADMISSION_BED_EVENTS.PATIENT_TRANSFERRED);
  if (signals.includes('PATIENT_DISCHARGED')) events.push(ADMISSION_BED_EVENTS.PATIENT_DISCHARGED);
  if (signals.includes('BED_ASSIGNMENT_CHANGED')) events.push(ADMISSION_BED_EVENTS.BED_ASSIGNMENT_CHANGED);
  return [...new Set(events)];
};

const publishIpdRealtimeUpdates = async ({
  snapshot,
  transition,
  context,
  compatibilitySignals = [],
  tenantInternalId = null,
  facilityInternalId = null,
}) => {
  try {
    const payload = buildRealtimePayload({ snapshot, transition });
    const resolvedTenantId = tenantInternalId || context?.tenant_id || null;
    const resolvedFacilityId = facilityInternalId || context?.facility_id || null;
    const recipientUserIds = await resolveRoleRecipients({
      tenantId: resolvedTenantId,
      facilityId: resolvedFacilityId,
      roles: IPD_RECIPIENT_ROLES,
    });

    const recipients = recipientUserIds.filter((userId) => userId && userId !== context?.user_id);
    if (!recipients.length) return;

    emitToUsers(recipients, IPD_EVENTS.IPD_FLOW_UPDATED, payload);

    const compatibilityPayload = {
      admission_id: payload.admission_id,
      admission_public_id: payload.admission_public_id,
      patient_id: payload.patient_id,
      patient_public_id: payload.patient_public_id,
      stage_to: payload.stage_to,
      action: payload.action,
      occurred_at: payload.occurred_at,
      target_path: payload.target_path,
    };

    buildCompatibilityEvents(compatibilitySignals).forEach((eventName) => {
      emitToUsers(recipients, eventName, compatibilityPayload);
    });

    await createAndEmitNotifications({ payload, recipientUserIds: recipients, tenantId: resolvedTenantId });
  } catch (_error) {
    // realtime should not block workflow
  }
};

const writeAuditLog = ({ context, admissionId, tenantId, action, after, metadata = {} }) => {
  createAuditLog({
    tenant_id: tenantId,
    user_id: context?.user_id,
    action,
    entity: 'ipd_flow',
    entity_id: admissionId,
    diff: {
      after,
      metadata,
    },
    ip_address: context?.ip_address,
  }).catch(() => {});
};

const finalizeAction = async ({ result, context, metadata = {} }) => {
  const internalSnapshot = await getIpdSnapshotByIdInternal(result.admission_id);
  const snapshot = toPublicIpdSnapshot(internalSnapshot);
  await publishIpdRealtimeUpdates({
    snapshot,
    transition: {
      ...result.transition,
      stage_to: snapshot?.flow?.stage || null,
    },
    context,
    compatibilitySignals: result.compatibilitySignals,
    tenantInternalId: result.tenant_id || internalSnapshot?.admission?.tenant_id || context?.tenant_id || null,
    facilityInternalId: internalSnapshot?.admission?.facility_id || context?.facility_id || null,
  });

  writeAuditLog({
    context,
    admissionId: result.admission_id,
    tenantId: result.tenant_id,
    action: 'UPDATE',
    after: snapshot,
    metadata,
  });

  return snapshot;
};
const startIpdFlow = async (data, context = {}) => {
  const admittedAt = toDate(data?.admitted_at, new Date());

  const result = await prisma.$transaction(async (tx) => {
    const tenantFromPayload = data?.tenant_id ? await resolveTenantByIdentifier(tx, data.tenant_id) : null;
    if (data?.tenant_id && !tenantFromPayload) {
      throw new HttpError('errors.tenant.not_found', 404, [{ field: 'tenant_id' }]);
    }

    const tenantId = tenantFromPayload?.id || context?.tenant_id || null;
    if (!tenantId) {
      throw new HttpError('errors.validation.field.required', 400, [{ field: 'tenant_id' }]);
    }

    let facilityId = context?.facility_id || null;
    if (data?.facility_id !== undefined) {
      if (data.facility_id === null) {
        facilityId = null;
      } else {
        const facility = await resolveFacilityByIdentifier(tx, data.facility_id, tenantId);
        if (!facility) {
          throw new HttpError('errors.facility.not_found', 404, [{ field: 'facility_id' }]);
        }
        facilityId = facility.id;
      }
    }

    const patient = await resolvePatientByIdentifier(tx, data.patient_id, tenantId, facilityId);
    if (!patient) {
      throw new HttpError('errors.ipd_flow.patient_not_found', 404, [{ field: 'patient_id' }]);
    }

    let encounterId = null;
    if (data?.encounter_id) {
      const encounter = await resolveEncounterByIdentifier(tx, data.encounter_id, tenantId, facilityId);
      if (!encounter) {
        throw new HttpError('errors.encounter.not_found', 404, [{ field: 'encounter_id' }]);
      }
      encounterId = encounter.id;
    }

    const admission = await tx.admission.create({
      data: {
        tenant_id: tenantId,
        facility_id: facilityId,
        patient_id: patient.id,
        encounter_id: encounterId,
        status: 'ADMITTED',
        admitted_at: admittedAt,
      },
    });

    const compatibilitySignals = ['PATIENT_ADMITTED'];

    if (data?.bed_id) {
      const bed = await resolveBedByIdentifier(tx, data.bed_id, tenantId, facilityId);
      if (!bed) throw new HttpError('errors.bed.not_found', 404, [{ field: 'bed_id' }]);
      if (String(bed.status || '').toUpperCase() !== 'AVAILABLE') {
        throw new HttpError('errors.ipd_flow.bed_not_available', 400, [{ field: 'bed_id' }]);
      }

      await tx.bed_assignment.create({
        data: {
          admission_id: admission.id,
          bed_id: bed.id,
          assigned_at: admittedAt,
        },
      });

      await tx.bed.update({
        where: { id: bed.id },
        data: { status: 'OCCUPIED' },
      });

      compatibilitySignals.push('BED_ASSIGNMENT_CHANGED');
    }

    return {
      admission_id: admission.id,
      tenant_id: tenantId,
      transition: {
        action: 'START',
        stage_from: null,
        stage_to: null,
        occurred_at: admittedAt.toISOString(),
      },
      compatibilitySignals,
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'start' } });
};

const assignBed = async (id, data, context = {}) => {
  const assignedAt = toDate(data?.assigned_at, new Date());

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    if (getActiveBedAssignment(admission)) {
      throw new HttpError('errors.ipd_flow.active_bed_exists', 400);
    }

    const bed = await resolveBedByIdentifier(tx, data?.bed_id, admission.tenant_id, admission.facility_id || null);
    if (!bed) throw new HttpError('errors.bed.not_found', 404, [{ field: 'bed_id' }]);
    if (String(bed.status || '').toUpperCase() !== 'AVAILABLE') {
      throw new HttpError('errors.ipd_flow.bed_not_available', 400, [{ field: 'bed_id' }]);
    }

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment: null,
      openTransferRequest: getOpenTransferRequest(admission),
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    await tx.bed_assignment.create({
      data: {
        admission_id: admission.id,
        bed_id: bed.id,
        assigned_at: assignedAt,
      },
    });

    await tx.bed.update({
      where: { id: bed.id },
      data: { status: 'OCCUPIED' },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'ASSIGN_BED',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: assignedAt.toISOString(),
      },
      compatibilitySignals: ['BED_ASSIGNMENT_CHANGED'],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'assign_bed' } });
};

const releaseBed = async (id, data, context = {}) => {
  const releasedAt = toDate(data?.released_at, new Date());

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const activeBedAssignment = getActiveBedAssignment(admission);
    if (!activeBedAssignment) {
      throw new HttpError('errors.ipd_flow.active_bed_required', 400);
    }

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment,
      openTransferRequest: getOpenTransferRequest(admission),
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    await tx.bed_assignment.update({
      where: { id: activeBedAssignment.id },
      data: { released_at: releasedAt },
    });

    await tx.bed.update({
      where: { id: activeBedAssignment.bed_id },
      data: { status: 'AVAILABLE' },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'RELEASE_BED',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: releasedAt.toISOString(),
      },
      compatibilitySignals: ['BED_ASSIGNMENT_CHANGED'],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'release_bed' } });
};

const requestTransfer = async (id, data, context = {}) => {
  const requestedAt = toDate(data?.requested_at, new Date());

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    if (getOpenTransferRequest(admission)) {
      throw new HttpError('errors.ipd_flow.invalid_transfer_transition', 400);
    }

    const activeBedAssignment = getActiveBedAssignment(admission);
    let fromWardId = activeBedAssignment?.bed?.ward_id || null;

    if (data?.from_ward_id) {
      const fromWard = await resolveWardByIdentifier(
        tx,
        data.from_ward_id,
        admission.tenant_id,
        admission.facility_id || null
      );
      if (!fromWard) throw new HttpError('errors.ward.not_found', 404, [{ field: 'from_ward_id' }]);
      fromWardId = fromWard.id;
    }

    const toWard = await resolveWardByIdentifier(
      tx,
      data?.to_ward_id,
      admission.tenant_id,
      admission.facility_id || null
    );
    if (!toWard) throw new HttpError('errors.ward.not_found', 404, [{ field: 'to_ward_id' }]);

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment,
      openTransferRequest: null,
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    await tx.transfer_request.create({
      data: {
        admission_id: admission.id,
        from_ward_id: fromWardId,
        to_ward_id: toWard.id,
        status: 'REQUESTED',
        requested_at: requestedAt,
      },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'REQUEST_TRANSFER',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: requestedAt.toISOString(),
      },
      compatibilitySignals: ['PATIENT_TRANSFERRED'],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'request_transfer' } });
};
const resolveTransferForAction = async (tx, admission, transferRequestId = null) => {
  if (transferRequestId) {
    const transfer = await resolveTransferByIdentifier(tx, transferRequestId, admission.id);
    if (!transfer) throw new HttpError('errors.ipd_flow.transfer_request_not_found', 404);

    return tx.transfer_request.findFirst({
      where: {
        id: transfer.id,
        deleted_at: null,
      },
    });
  }

  return getOpenTransferRequest(admission);
};

const updateTransfer = async (id, data, context = {}) => {
  const action = String(data?.action || '').trim().toUpperCase();

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const transferRequest = await resolveTransferForAction(tx, admission, data?.transfer_request_id);
    if (!transferRequest) throw new HttpError('errors.ipd_flow.transfer_request_not_found', 404);

    const transferStatus = String(transferRequest.status || '').toUpperCase();
    const activeBedAssignment = getActiveBedAssignment(admission);
    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment,
      openTransferRequest: transferRequest,
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    const occurredAt = new Date();
    const compatibilitySignals = ['PATIENT_TRANSFERRED'];

    if (action === TRANSFER_ACTIONS.APPROVE) {
      if (transferStatus !== 'REQUESTED') throw new HttpError('errors.ipd_flow.invalid_transfer_transition', 400);
      await tx.transfer_request.update({ where: { id: transferRequest.id }, data: { status: 'APPROVED' } });
    } else if (action === TRANSFER_ACTIONS.START) {
      if (transferStatus !== 'APPROVED') throw new HttpError('errors.ipd_flow.invalid_transfer_transition', 400);
      await tx.transfer_request.update({ where: { id: transferRequest.id }, data: { status: 'IN_PROGRESS' } });
    } else if (action === TRANSFER_ACTIONS.CANCEL) {
      if (!OPEN_TRANSFER_STATUSES.has(transferStatus)) {
        throw new HttpError('errors.ipd_flow.invalid_transfer_transition', 400);
      }
      await tx.transfer_request.update({ where: { id: transferRequest.id }, data: { status: 'CANCELLED' } });
    } else if (action === TRANSFER_ACTIONS.COMPLETE) {
      if (transferStatus !== 'IN_PROGRESS') throw new HttpError('errors.ipd_flow.invalid_transfer_transition', 400);
      if (!activeBedAssignment) throw new HttpError('errors.ipd_flow.active_bed_required', 400);
      if (!data?.to_bed_id) {
        throw new HttpError('errors.ipd_flow.transfer_destination_bed_required', 400, [{ field: 'to_bed_id' }]);
      }

      const destinationBed = await resolveBedByIdentifier(
        tx,
        data.to_bed_id,
        admission.tenant_id,
        admission.facility_id || null
      );
      if (!destinationBed) throw new HttpError('errors.bed.not_found', 404, [{ field: 'to_bed_id' }]);
      if (String(destinationBed.status || '').toUpperCase() !== 'AVAILABLE') {
        throw new HttpError('errors.ipd_flow.bed_not_available', 400, [{ field: 'to_bed_id' }]);
      }

      await tx.bed_assignment.update({
        where: { id: activeBedAssignment.id },
        data: { released_at: occurredAt },
      });
      await tx.bed.update({ where: { id: activeBedAssignment.bed_id }, data: { status: 'AVAILABLE' } });

      await tx.bed_assignment.create({
        data: {
          admission_id: admission.id,
          bed_id: destinationBed.id,
          assigned_at: occurredAt,
        },
      });
      await tx.bed.update({ where: { id: destinationBed.id }, data: { status: 'OCCUPIED' } });

      await tx.transfer_request.update({
        where: { id: transferRequest.id },
        data: {
          status: 'COMPLETED',
          to_ward_id: destinationBed.ward_id,
        },
      });

      compatibilitySignals.push('BED_ASSIGNMENT_CHANGED');
    } else {
      throw new HttpError('errors.ipd_flow.invalid_transfer_transition', 400);
    }

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: `TRANSFER_${action}`,
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: occurredAt.toISOString(),
      },
      compatibilitySignals,
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'update_transfer' } });
};

const addWardRound = async (id, data, context = {}) => {
  const roundAt = toDate(data?.round_at, new Date());

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment: getActiveBedAssignment(admission),
      openTransferRequest: getOpenTransferRequest(admission),
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    await tx.ward_round.create({
      data: {
        admission_id: admission.id,
        round_at: roundAt,
        notes: data?.notes || null,
      },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'ADD_WARD_ROUND',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: roundAt.toISOString(),
      },
      compatibilitySignals: [],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'add_ward_round' } });
};

const addNursingNote = async (id, data, context = {}) => {
  const note = String(data?.note || '').trim();
  if (!note) throw new HttpError('errors.ipd_flow.nursing_note_required', 400, [{ field: 'note' }]);

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const nurseIdentifier = sanitizeIdentifier(data?.nurse_user_id) || sanitizeIdentifier(context?.user_id);
    if (!nurseIdentifier) throw new HttpError('errors.validation.field.required', 400, [{ field: 'nurse_user_id' }]);

    const nurse = await resolveUserByIdentifier(tx, nurseIdentifier, admission.tenant_id, admission.facility_id || null);
    if (!nurse) throw new HttpError('errors.user.not_found', 404, [{ field: 'nurse_user_id' }]);

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment: getActiveBedAssignment(admission),
      openTransferRequest: getOpenTransferRequest(admission),
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    await tx.nursing_note.create({
      data: {
        admission_id: admission.id,
        nurse_user_id: nurse.id,
        note,
      },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'ADD_NURSING_NOTE',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: new Date().toISOString(),
      },
      compatibilitySignals: [],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'add_nursing_note' } });
};

const addMedicationAdministration = async (id, data, context = {}) => {
  const dose = String(data?.dose || '').trim();
  if (!dose) throw new HttpError('errors.ipd_flow.medication_dose_required', 400, [{ field: 'dose' }]);

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment: getActiveBedAssignment(admission),
      openTransferRequest: getOpenTransferRequest(admission),
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    await tx.medication_administration.create({
      data: {
        admission_id: admission.id,
        prescription_id: sanitizeIdentifier(data?.prescription_id) || null,
        administered_at: toDate(data?.administered_at, new Date()),
        dose,
        unit: data?.unit || null,
        route: data?.route || 'ORAL',
      },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'ADD_MEDICATION_ADMINISTRATION',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: new Date().toISOString(),
      },
      compatibilitySignals: [],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'add_medication_administration' } });
};

const planDischarge = async (id, data, context = {}) => {
  const summary = String(data?.summary || '').trim();
  if (!summary) {
    throw new HttpError('errors.ipd_flow.discharge_summary_required', 400, [{ field: 'summary' }]);
  }

  const plannedDischargeAt = data?.discharged_at ? toDate(data.discharged_at, new Date()) : null;

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const openTransferRequest = getOpenTransferRequest(admission);
    if (openTransferRequest) {
      throw new HttpError('errors.ipd_flow.transfer_must_be_resolved_before_discharge', 400);
    }

    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment: getActiveBedAssignment(admission),
      openTransferRequest: null,
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    const latestDischargeSummary = getLatestDischargeSummary(admission);
    const latestStatus = String(latestDischargeSummary?.status || '').toUpperCase();

    if (latestDischargeSummary && latestStatus !== 'COMPLETED') {
      await tx.discharge_summary.update({
        where: { id: latestDischargeSummary.id },
        data: {
          summary,
          status: 'PLANNED',
          discharged_at: plannedDischargeAt,
        },
      });
    } else {
      await tx.discharge_summary.create({
        data: {
          admission_id: admission.id,
          summary,
          status: 'PLANNED',
          discharged_at: plannedDischargeAt,
        },
      });
    }

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'PLAN_DISCHARGE',
        stage_from: stageBefore,
        stage_to: null,
        occurred_at: new Date().toISOString(),
      },
      compatibilitySignals: [],
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'plan_discharge' } });
};

const finalizeDischarge = async (id, data, context = {}) => {
  const dischargedAt = toDate(data?.discharged_at, new Date());
  const payloadSummary = String(data?.summary || '').trim();

  const result = await prisma.$transaction(async (tx) => {
    const resolved = await resolveAdmissionByIdentifier(tx, id);
    if (!resolved) throw new HttpError('errors.ipd_flow.not_found', 404);

    const admission = await fetchAdmissionForMutation(tx, resolved.id);
    ensureAdmissionIsMutable(admission);

    const openTransferRequest = getOpenTransferRequest(admission);
    if (openTransferRequest) {
      throw new HttpError('errors.ipd_flow.transfer_must_be_resolved_before_discharge', 400);
    }

    const activeBedAssignment = getActiveBedAssignment(admission);
    const stageBefore = deriveIpdStage({
      admission,
      activeBedAssignment,
      openTransferRequest: null,
      latestDischargeSummary: getLatestDischargeSummary(admission),
    });

    const latestDischargeSummary = getLatestDischargeSummary(admission);
    const summary = payloadSummary || String(latestDischargeSummary?.summary || '').trim();
    if (!summary) {
      throw new HttpError('errors.ipd_flow.discharge_summary_required', 400, [{ field: 'summary' }]);
    }

    if (latestDischargeSummary) {
      await tx.discharge_summary.update({
        where: { id: latestDischargeSummary.id },
        data: {
          summary,
          status: 'COMPLETED',
          discharged_at: dischargedAt,
        },
      });
    } else {
      await tx.discharge_summary.create({
        data: {
          admission_id: admission.id,
          summary,
          status: 'COMPLETED',
          discharged_at: dischargedAt,
        },
      });
    }

    const compatibilitySignals = ['PATIENT_DISCHARGED'];

    if (activeBedAssignment) {
      await tx.bed_assignment.update({
        where: { id: activeBedAssignment.id },
        data: { released_at: dischargedAt },
      });
      await tx.bed.update({
        where: { id: activeBedAssignment.bed_id },
        data: { status: 'AVAILABLE' },
      });
      compatibilitySignals.push('BED_ASSIGNMENT_CHANGED');
    }

    await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: 'DISCHARGED',
        discharged_at: dischargedAt,
      },
    });

    return {
      admission_id: admission.id,
      tenant_id: admission.tenant_id,
      transition: {
        action: 'FINALIZE_DISCHARGE',
        stage_from: stageBefore,
        stage_to: STAGES.DISCHARGED,
        occurred_at: dischargedAt.toISOString(),
      },
      compatibilitySignals,
    };
  });

  return finalizeAction({ result, context, metadata: { operation: 'finalize_discharge' } });
};

const emitAdmissionRefreshEvent = async (admissionIdentifier, context = {}) => {
  const normalized = sanitizeIdentifier(admissionIdentifier);
  if (!normalized) return null;

  try {
    const internalSnapshot = await getIpdSnapshotByIdInternal(normalized);
    const snapshot = toPublicIpdSnapshot(internalSnapshot);
    await publishIpdRealtimeUpdates({
      snapshot,
      transition: {
        action: 'OPD_ADMITTED',
        stage_from: null,
        stage_to: snapshot?.flow?.stage || null,
        occurred_at: new Date().toISOString(),
      },
      context,
      compatibilitySignals: ['PATIENT_ADMITTED'],
      tenantInternalId: internalSnapshot?.admission?.tenant_id || context?.tenant_id || null,
      facilityInternalId: internalSnapshot?.admission?.facility_id || context?.facility_id || null,
    });
    return snapshot;
  } catch (_error) {
    return null;
  }
};

module.exports = {
  STAGES,
  TRANSFER_ACTIONS,
  listIpdFlows,
  resolveLegacyRoute,
  getIpdFlowById,
  startIpdFlow,
  assignBed,
  releaseBed,
  requestTransfer,
  updateTransfer,
  addWardRound,
  addNursingNote,
  addMedicationAdministration,
  planDischarge,
  finalizeDischarge,
  emitAdmissionRefreshEvent,
};
