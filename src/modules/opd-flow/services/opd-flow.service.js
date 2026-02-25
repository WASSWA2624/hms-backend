/**
 * OPD flow service
 *
 * @module modules/opd-flow/services
 * @description OPD patient flow orchestration rooted on encounter records.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: direct model operations in service are limited to prisma.$transaction orchestration.
 */

const opdFlowRepository = require('@repositories/opd-flow/opd-flow.repository');
const prisma = require('@prisma/client');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { emitToUser, emitToUsers, OPD_EVENTS, NOTIFICATION_EVENTS } = require('@lib/websocket');
const { ROLES } = require('@config/roles');

const STAGES = {
  WAITING_CONSULTATION_PAYMENT: 'WAITING_CONSULTATION_PAYMENT',
  WAITING_VITALS: 'WAITING_VITALS',
  WAITING_DOCTOR_ASSIGNMENT: 'WAITING_DOCTOR_ASSIGNMENT',
  WAITING_DOCTOR_REVIEW: 'WAITING_DOCTOR_REVIEW',
  LAB_REQUESTED: 'LAB_REQUESTED',
  RADIOLOGY_REQUESTED: 'RADIOLOGY_REQUESTED',
  LAB_AND_RADIOLOGY_REQUESTED: 'LAB_AND_RADIOLOGY_REQUESTED',
  PHARMACY_REQUESTED: 'PHARMACY_REQUESTED',
  WAITING_DISPOSITION: 'WAITING_DISPOSITION',
  ADMITTED: 'ADMITTED',
  DISCHARGED: 'DISCHARGED'
};

const TERMINAL_STAGES = new Set([STAGES.ADMITTED, STAGES.DISCHARGED]);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BLOOD_PRESSURE_VALUE_REGEX = /^(\d{2,3}(?:\.\d{1,2})?)\s*\/\s*(\d{2,3}(?:\.\d{1,2})?)$/;

const TRIAGE_ALIAS_MAP = {
  IMMEDIATE: 'LEVEL_1',
  URGENT: 'LEVEL_2',
  LESS_URGENT: 'LEVEL_3',
  NON_URGENT: 'LEVEL_4',
  LEVEL_1: 'LEVEL_1',
  LEVEL_2: 'LEVEL_2',
  LEVEL_3: 'LEVEL_3',
  LEVEL_4: 'LEVEL_4',
  LEVEL_5: 'LEVEL_5'
};

const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');

const isUuid = (value) => UUID_REGEX.test(normalizeIdentifier(value));

const resolvePatientLookupWhere = (identifier, tenantId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  const where = {
    deleted_at: null,
    ...(tenantId ? { tenant_id: tenantId } : {})
  };

  if (isUuid(normalized)) {
    return {
      ...where,
      id: normalized
    };
  }

  return {
    ...where,
    human_friendly_id: normalized.toUpperCase()
  };
};

const resolvePatientByIdentifier = async (tx, identifier, tenantId = null) => {
  const where = resolvePatientLookupWhere(identifier, tenantId);
  if (!where) return null;

  return tx.patient.findFirst({ where });
};

const resolveUserLookupWhere = (identifier, tenantId = null, facilityId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  const where = {
    deleted_at: null,
    ...(tenantId ? { tenant_id: tenantId } : {})
  };

  if (facilityId) {
    where.OR = [{ facility_id: facilityId }, { facility_id: null }];
  }

  if (isUuid(normalized)) {
    return {
      ...where,
      id: normalized
    };
  }

  const upper = normalized.toUpperCase();
  return {
    ...where,
    AND: [
      ...(Array.isArray(where.OR) ? [{ OR: where.OR }] : []),
      {
        OR: [
          { human_friendly_id: upper },
          { email: normalized },
          { phone: normalized }
        ]
      }
    ]
  };
};

const resolveProviderByIdentifier = async (tx, identifier, tenantId = null, facilityId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!tx?.user?.findFirst) {
    return { id: normalized, staff_profile: null };
  }

  const where = resolveUserLookupWhere(identifier, tenantId, facilityId);
  if (!where) return null;

  return tx.user.findFirst({
    where,
    include: {
      staff_profile: true
    }
  });
};

const resolveAppointmentByIdentifier = async (tx, identifier, tenantId = null, facilityId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!tx?.appointment?.findFirst) return null;

  const where = {
    deleted_at: null,
    ...(tenantId ? { tenant_id: tenantId } : {}),
    ...(facilityId ? { facility_id: facilityId } : {})
  };

  if (isUuid(normalized)) {
    return tx.appointment.findFirst({
      where: {
        ...where,
        id: normalized
      }
    });
  }

  return tx.appointment.findFirst({
    where: {
      ...where,
      human_friendly_id: normalized.toUpperCase()
    }
  });
};

const resolveEncounterByIdentifier = async (tx, identifier, options = {}) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!tx?.encounter?.findFirst) return null;
  const include = options?.include || undefined;
  return tx.encounter.findFirst({
    where: {
      OR: [
        { id: normalized },
        { human_friendly_id: normalized.toUpperCase() }
      ],
      deleted_at: null,
      encounter_type: { in: ['OPD', 'EMERGENCY'] }
    },
    ...(include ? { include } : {})
  });
};

const NEXT_STEP_BY_STAGE = {
  [STAGES.WAITING_CONSULTATION_PAYMENT]: 'PAY_CONSULTATION',
  [STAGES.WAITING_VITALS]: 'RECORD_VITALS',
  [STAGES.WAITING_DOCTOR_ASSIGNMENT]: 'ASSIGN_DOCTOR',
  [STAGES.WAITING_DOCTOR_REVIEW]: 'DOCTOR_REVIEW',
  [STAGES.WAITING_DISPOSITION]: 'DISPOSITION',
  [STAGES.LAB_REQUESTED]: 'DISPOSITION',
  [STAGES.RADIOLOGY_REQUESTED]: 'DISPOSITION',
  [STAGES.LAB_AND_RADIOLOGY_REQUESTED]: 'DISPOSITION',
  [STAGES.PHARMACY_REQUESTED]: 'DISPOSITION',
  [STAGES.ADMITTED]: null,
  [STAGES.DISCHARGED]: null
};

const STAGE_ROLE_TEAM_MAP = {
  [STAGES.WAITING_CONSULTATION_PAYMENT]: [ROLES.RECEPTIONIST, ROLES.BILLING],
  [STAGES.WAITING_VITALS]: [ROLES.NURSE],
  [STAGES.WAITING_DOCTOR_ASSIGNMENT]: [ROLES.RECEPTIONIST, ROLES.NURSE],
  [STAGES.WAITING_DOCTOR_REVIEW]: [ROLES.DOCTOR],
  [STAGES.LAB_REQUESTED]: [ROLES.LAB_TECH],
  [STAGES.RADIOLOGY_REQUESTED]: [ROLES.LAB_TECH],
  [STAGES.LAB_AND_RADIOLOGY_REQUESTED]: [ROLES.LAB_TECH],
  [STAGES.PHARMACY_REQUESTED]: [ROLES.PHARMACIST],
  [STAGES.WAITING_DISPOSITION]: [ROLES.DOCTOR],
  [STAGES.ADMITTED]: [ROLES.RECEPTIONIST, ROLES.OPERATIONS],
  [STAGES.DISCHARGED]: [ROLES.RECEPTIONIST, ROLES.OPERATIONS]
};

const formatStageLabel = (stage) =>
  String(stage || 'UPDATED')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase();

const buildFlowSummary = (snapshot) => {
  const flow = snapshot?.flow || {};
  const timeline = Array.isArray(flow.timeline)
    ? flow.timeline
    : Array.isArray(snapshot?.timeline)
      ? snapshot.timeline
      : [];

  return {
    stage: flow.stage || null,
    next_step: flow.next_step || null,
    encounter_type: snapshot?.encounter?.encounter_type || null,
    timeline_count: timeline.length
  };
};

const buildRealtimePayload = ({ snapshot, transition, context }) => {
  const encounterPublicId = snapshot?.encounter?.human_friendly_id || null;
  const encounterInternalId = snapshot?.encounter?.id || null;
  const stageTo = transition?.stage_to || snapshot?.flow?.stage || null;
  const stageFrom = transition?.stage_from || null;
  const occurredAt =
    transition?.occurred_at ||
    snapshot?.encounter?.updated_at?.toISOString?.() ||
    new Date().toISOString();

  return {
    encounter_id: encounterInternalId,
    encounter_public_id: encounterPublicId,
    tenant_id: snapshot?.encounter?.tenant_id || context?.tenant_id || null,
    facility_id: snapshot?.encounter?.facility_id || context?.facility_id || null,
    patient_id: snapshot?.encounter?.patient_id || null,
    provider_user_id: snapshot?.encounter?.provider_user_id || transition?.provider_user_id || null,
    stage_from: stageFrom,
    stage_to: stageTo,
    next_step: snapshot?.flow?.next_step || null,
    action: transition?.action || 'OPD_FLOW_UPDATED',
    actor_user_id: context?.user_id || null,
    occurred_at: occurredAt,
    flow_summary: buildFlowSummary(snapshot),
    target_path: encounterPublicId
      ? `/scheduling/opd-flows/${encounterPublicId}`
      : '/scheduling/opd-flows'
  };
};

const buildOpdNotificationContent = (payload) => {
  const stageLabel = formatStageLabel(payload?.stage_to || payload?.flow_summary?.stage);
  const title = `OPD flow update: ${stageLabel}`;
  const message = `Encounter ${payload.encounter_public_id || 'unknown'} is now ${stageLabel}.`;

  return {
    title,
    message
  };
};

const resolveRoleRecipients = async ({ tenantId, facilityId, roles = [] }) => {
  if (!tenantId || !Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  if (!prisma?.user_role?.findMany) {
    return [];
  }

  const where = {
    tenant_id: tenantId,
    deleted_at: null,
    role: {
      deleted_at: null,
      name: { in: roles }
    }
  };

  if (facilityId) {
    where.OR = [{ facility_id: facilityId }, { facility_id: null }];
  }

  const rows = await prisma.user_role.findMany({
    where,
    select: { user_id: true }
  });

  return rows.map((row) => row.user_id).filter(Boolean);
};

const resolveOpdRecipientUserIds = async ({ payload }) => {
  const roleTeams = STAGE_ROLE_TEAM_MAP[payload.stage_to] || [];
  const roleRecipients = await resolveRoleRecipients({
    tenantId: payload.tenant_id,
    facilityId: payload.facility_id,
    roles: roleTeams
  });

  const recipientSet = new Set(roleRecipients);
  if (payload.provider_user_id) {
    recipientSet.add(payload.provider_user_id);
  }
  if (payload.actor_user_id) {
    recipientSet.delete(payload.actor_user_id);
  }

  return Array.from(recipientSet).filter(Boolean);
};

const toSafeNotificationPayload = (notification, targetPath) => ({
  id: notification.id,
  tenant_id: notification.tenant_id,
  user_id: notification.user_id,
  notification_type: notification.notification_type,
  priority: notification.priority,
  title: notification.title,
  message: notification.message,
  read_at: notification.read_at || null,
  created_at: notification.created_at,
  updated_at: notification.updated_at,
  target_path: targetPath
});

const createAndEmitOpdNotifications = async ({ payload, recipientUserIds }) => {
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
    return [];
  }

  if (!prisma?.notification?.create) {
    return [];
  }

  const priority = payload?.flow_summary?.encounter_type === 'EMERGENCY' ? 'HIGH' : 'MEDIUM';
  const { title, message } = buildOpdNotificationContent(payload);

  const createdNotifications = [];

  for (const userId of recipientUserIds) {
    // Keep notification creation resilient and non-blocking per user.
    try {
      const notification = await prisma.notification.create({
        data: {
          tenant_id: payload.tenant_id,
          user_id: userId,
          notification_type: 'SYSTEM',
          priority,
          title,
          message
        }
      });
      createdNotifications.push(notification);
    } catch (_err) {
      // Notification creation should not block OPD flow progression.
    }
  }

  if (createdNotifications.length > 0 && prisma?.notification_delivery?.createMany) {
    try {
      await prisma.notification_delivery.createMany({
        data: createdNotifications.map((notification) => ({
          notification_id: notification.id,
          channel: 'IN_APP',
          status: 'PENDING_ATTENTION',
          sent_at: new Date()
        }))
      });
    } catch (_err) {
      // Delivery metadata failure should not block clinical flow.
    }
  }

  createdNotifications.forEach((notification) => {
    emitToUser(notification.user_id, NOTIFICATION_EVENTS.NOTIFICATION_CREATED, {
      notification: toSafeNotificationPayload(notification, payload.target_path),
      target_path: payload.target_path
    });
  });

  return createdNotifications;
};

const publishOpdRealtimeUpdates = async ({ snapshot, transition, context }) => {
  try {
    const payload = buildRealtimePayload({
      snapshot,
      transition,
      context
    });
    const recipientUserIds = await resolveOpdRecipientUserIds({ payload });
    if (recipientUserIds.length > 0) {
      emitToUsers(recipientUserIds, OPD_EVENTS.OPD_FLOW_UPDATED, payload);
      await createAndEmitOpdNotifications({ payload, recipientUserIds });
    }
  } catch (_err) {
    // Realtime updates must never fail the OPD transaction response path.
  }
};

const toDecimalNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value.toNumber === 'function') return value.toNumber();
  if (typeof value.toString === 'function') return Number(value.toString());
  return Number(value);
};

const normalizeDecimalString = (value, fallback = '0.00') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value.toString === 'function') {
    return value.toString();
  }
  return String(value);
};

const normalizeCurrencyCode = (value, fallback = null) => {
  const normalized = normalizeIdentifier(value).toUpperCase();
  return normalized || fallback;
};

const resolveCurrencyFromExtension = (extensionJson) => {
  if (!extensionJson || typeof extensionJson !== 'object' || Array.isArray(extensionJson)) return null;

  const directCandidates = [
    extensionJson.currency,
    extensionJson.default_currency,
    extensionJson.defaultCurrency
  ];
  const nestedCandidates = [
    extensionJson.settings?.currency,
    extensionJson.settings?.default_currency,
    extensionJson.settings?.defaultCurrency,
    extensionJson.billing?.currency,
    extensionJson.billing?.default_currency,
    extensionJson.billing?.defaultCurrency,
    extensionJson.preferences?.currency,
    extensionJson.preferences?.default_currency,
    extensionJson.preferences?.defaultCurrency
  ];

  const matched = [...directCandidates, ...nestedCandidates].find(
    (candidate) => typeof candidate === 'string' && candidate.trim()
  );

  return normalizeCurrencyCode(matched, null);
};

const resolveDefaultCurrency = async (tx, tenantId, facilityId = null) => {
  let facilityCurrency = null;
  if (facilityId && tx?.facility?.findFirst) {
    const facility = await tx.facility.findFirst({
      where: { id: facilityId, deleted_at: null },
      select: { extension_json: true }
    });
    facilityCurrency = resolveCurrencyFromExtension(facility?.extension_json);
  }

  if (facilityCurrency) return facilityCurrency;

  if (tenantId && tx?.tenant?.findFirst) {
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, deleted_at: null },
      select: { extension_json: true }
    });
    const tenantCurrency = resolveCurrencyFromExtension(tenant?.extension_json);
    if (tenantCurrency) return tenantCurrency;
  }

  return 'USD';
};

const resolveProviderConsultationDefaults = (provider) => {
  const profile = provider?.staff_profile || null;
  if (!profile || profile.deleted_at) {
    return {
      consultationFee: null,
      consultationCurrency: null
    };
  }

  const practitionerType = normalizeIdentifier(profile.practitioner_type).toUpperCase();
  if (practitionerType !== 'SPECIALIST') {
    return {
      consultationFee: null,
      consultationCurrency: null
    };
  }

  return {
    consultationFee: normalizeDecimalString(profile.consultation_fee, null),
    consultationCurrency: normalizeCurrencyCode(profile.consultation_currency, null)
  };
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value?.toNumber === 'function') {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value?.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const roundToTwo = (value) => {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const formatBloodPressureValueComponent = (value) => {
  const rounded = roundToTwo(value);
  if (!Number.isFinite(rounded)) return '';
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const parseLegacyBloodPressureValue = (value) => {
  const match = String(value || '').trim().match(BLOOD_PRESSURE_VALUE_REGEX);
  if (!match) return null;

  const systolic = roundToTwo(toFiniteNumber(match[1]));
  const diastolic = roundToTwo(toFiniteNumber(match[2]));

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return null;
  }

  return { systolic, diastolic };
};

const computeMeanArterialPressure = (systolic, diastolic) => {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  return roundToTwo((systolic + 2 * diastolic) / 3);
};

const normalizeBloodPressureVital = (vital) => {
  const parsedLegacy = parseLegacyBloodPressureValue(vital.value);
  const systolic = roundToTwo(toFiniteNumber(vital.systolic_value)) ?? parsedLegacy?.systolic ?? null;
  const diastolic = roundToTwo(toFiniteNumber(vital.diastolic_value)) ?? parsedLegacy?.diastolic ?? null;

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    throw new HttpError('errors.validation.required', 400, [
      { field: 'systolic_value' },
      { field: 'diastolic_value' }
    ]);
  }

  const mapValue = roundToTwo(toFiniteNumber(vital.map_value)) ?? computeMeanArterialPressure(systolic, diastolic);
  const canonicalValue = `${formatBloodPressureValueComponent(systolic)}/${formatBloodPressureValueComponent(
    diastolic
  )}`;

  return {
    value: canonicalValue,
    systolic_value: systolic,
    diastolic_value: diastolic,
    map_value: mapValue
  };
};

const normalizeVitalForPersistence = (vital) => {
  const vitalType = String(vital?.vital_type || '').trim().toUpperCase();
  if (vitalType === 'BLOOD_PRESSURE') {
    const normalizedBp = normalizeBloodPressureVital(vital);
    return {
      vital_type: vitalType,
      value: normalizedBp.value,
      systolic_value: normalizedBp.systolic_value,
      diastolic_value: normalizedBp.diastolic_value,
      map_value: normalizedBp.map_value
    };
  }

  return {
    vital_type: vitalType,
    value: String(vital?.value || '').trim(),
    systolic_value: null,
    diastolic_value: null,
    map_value: null
  };
};

const deriveArrivalMode = (data, appointment) => {
  if (data.arrival_mode) return data.arrival_mode;
  if (data.emergency) return 'EMERGENCY';
  if (appointment || data.appointment_id) return 'ONLINE_APPOINTMENT';
  return 'WALK_IN';
};

const mapTriageLevel = (triageLevel) => {
  if (!triageLevel) return null;
  return TRIAGE_ALIAS_MAP[triageLevel] || null;
};

const getOpdFlowState = (encounter) => {
  const opdFlow = encounter?.extension_json?.opd_flow;
  if (!opdFlow) {
    throw new HttpError('errors.opd_flow.not_found', 404);
  }
  return opdFlow;
};

const getNextStep = (stage) => NEXT_STEP_BY_STAGE[stage] || null;

const appendTimelineEvent = (flow, event, context = {}, details = {}, at = new Date()) => {
  if (!Array.isArray(flow.timeline)) {
    flow.timeline = [];
  }

  flow.timeline.push({
    event,
    at: at.toISOString(),
    by_user_id: context.user_id || null,
    details
  });
};

const setFlowStage = (flow, stage) => {
  flow.stage = stage;
  flow.next_step = getNextStep(stage);
};

const ensureNonTerminalStage = (flow) => {
  if (TERMINAL_STAGES.has(flow.stage)) {
    throw new HttpError('errors.opd_flow.already_terminal', 400);
  }
};

const buildEncounterWhereClause = (filters = {}) => {
  const where = {
    encounter_type: { in: ['OPD', 'EMERGENCY'] }
  };

  if (filters.tenant_id) where.tenant_id = filters.tenant_id;
  if (filters.facility_id) where.facility_id = filters.facility_id;
  if (filters.patient_id) {
    const patientIdentifier = normalizeIdentifier(filters.patient_id);
    if (patientIdentifier) {
      if (isUuid(patientIdentifier)) {
        where.patient_id = patientIdentifier;
      } else {
        where.patient = {
          human_friendly_id: patientIdentifier.toUpperCase()
        };
      }
    }
  }
  if (filters.provider_user_id) {
    const providerIdentifier = normalizeIdentifier(filters.provider_user_id);
    if (providerIdentifier) {
      if (isUuid(providerIdentifier)) {
        where.provider_user_id = providerIdentifier;
      } else {
        const providerUpper = providerIdentifier.toUpperCase();
        where.provider = {
          OR: [
            { human_friendly_id: providerUpper },
            { email: providerIdentifier },
            { phone: providerIdentifier }
          ]
        };
      }
    }
  }
  if (filters.encounter_type) where.encounter_type = filters.encounter_type;
  if (filters.stage) {
    where.extension_json = {
      path: ['opd_flow', 'stage'],
      equals: filters.stage
    };
  }
  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search } },
      { human_friendly_id: { contains: filters.search } },
      { patient: { first_name: { contains: filters.search } } },
      { patient: { last_name: { contains: filters.search } } },
      { patient: { human_friendly_id: { contains: filters.search } } }
    ];
  }

  return where;
};

const getOpdFlowById = async (id) => {
  const result = await prisma.$transaction(async (tx) => {
    const encounter = await resolveEncounterByIdentifier(tx, id, {
      include: {
        tenant: true,
        facility: true,
        patient: true,
        provider: true,
        vital_signs: { where: { deleted_at: null }, orderBy: { recorded_at: 'asc' } },
        clinical_notes: { where: { deleted_at: null }, orderBy: { created_at: 'asc' } },
        diagnoses: { where: { deleted_at: null }, orderBy: { created_at: 'asc' } },
        procedures: { where: { deleted_at: null }, orderBy: { created_at: 'asc' } },
        admissions: { where: { deleted_at: null }, orderBy: { created_at: 'desc' } },
        lab_orders: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          include: {
            items: {
              where: { deleted_at: null }
            }
          }
        },
        radiology_orders: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' }
        },
        pharmacy_orders: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          include: {
            items: { where: { deleted_at: null } }
          }
        }
      }
    });
    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);

    const [visitQueue, appointment, consultationInvoice, consultationPayment, emergencyCase, triageAssessment] =
      await Promise.all([
        flow.visit_queue_id
          ? tx.visit_queue.findFirst({
              where: { id: flow.visit_queue_id, deleted_at: null },
              include: { provider: true, facility: true, appointment: true }
            })
          : null,
        flow.appointment_id
          ? tx.appointment.findFirst({
              where: { id: flow.appointment_id, deleted_at: null },
              include: { provider: true, facility: true }
            })
          : null,
        flow.consultation?.invoice_id
          ? tx.invoice.findFirst({
              where: { id: flow.consultation.invoice_id, deleted_at: null },
              include: { payments: { where: { deleted_at: null }, orderBy: { created_at: 'desc' } } }
            })
          : null,
        flow.consultation?.payment_id
          ? tx.payment.findFirst({
              where: { id: flow.consultation.payment_id, deleted_at: null }
            })
          : null,
        flow.emergency_case_id
          ? tx.emergency_case.findFirst({
              where: { id: flow.emergency_case_id, deleted_at: null }
            })
          : null,
        flow.triage_assessment_id
          ? tx.triage_assessment.findFirst({
              where: { id: flow.triage_assessment_id, deleted_at: null }
            })
          : null
      ]);

    return {
      encounter,
      flow,
      visit_queue: visitQueue,
      appointment,
      consultation_invoice: consultationInvoice,
      consultation_payment: consultationPayment,
      emergency_case: emergencyCase,
      triage_assessment: triageAssessment
    };
  });

  return result;
};

const listOpdFlows = async (filters = {}, page = 1, limit = 20, sortBy = 'started_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const where = buildEncounterWhereClause(filters);
  const orderBy = { [sortBy]: order };

  const [encounters, total] = await Promise.all([
    opdFlowRepository.findMany(where, skip, limit, orderBy),
    opdFlowRepository.count(where)
  ]);

  const items = encounters.map((encounter) => {
    const flow = encounter?.extension_json?.opd_flow || null;
    return {
      encounter,
      flow
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
};

const startOpdFlow = async (data, context = {}) => {
  const startedAt = new Date();

  const startedResult = await prisma.$transaction(async (tx) => {
    const appointmentIdentifier = normalizeIdentifier(data.appointment_id);
    const appointment = appointmentIdentifier
      ? await resolveAppointmentByIdentifier(
          tx,
          appointmentIdentifier,
          data.tenant_id || context.tenant_id || null,
          data.facility_id || context.facility_id || null
        )
      : null;

    if (appointmentIdentifier && !appointment) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    if (appointment && (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW')) {
      throw new HttpError('errors.opd_flow.appointment_terminal_status', 400);
    }

    if (appointment) {
      const existingFlow = await tx.encounter.findFirst({
        where: {
          deleted_at: null,
          status: 'OPEN',
          encounter_type: { in: ['OPD', 'EMERGENCY'] },
          extension_json: {
            path: ['opd_flow', 'appointment_id'],
            equals: appointment.id
          }
        },
        select: { id: true }
      });

      if (existingFlow) {
        throw new HttpError('errors.opd_flow.appointment_already_linked', 409, [
          { field: 'appointment_id' }
        ]);
      }
    }

    const arrivalMode = deriveArrivalMode(data, appointment);

    if (arrivalMode === 'ONLINE_APPOINTMENT' && !appointment) {
      throw new HttpError('errors.opd_flow.appointment_required_for_online_mode', 400);
    }

    const tenantId = data.tenant_id || context.tenant_id || appointment?.tenant_id || null;
    if (!tenantId) {
      throw new HttpError('errors.validation.required', 400, [{ field: 'tenant_id' }]);
    }

    const facilityId =
      data.facility_id !== undefined
        ? data.facility_id
        : context.facility_id || appointment?.facility_id || null;

    const requestedPatientIdentifier = normalizeIdentifier(data.patient_id);
    let patientId = appointment?.patient_id || null;

    if (requestedPatientIdentifier) {
      const existingPatient = await resolvePatientByIdentifier(tx, requestedPatientIdentifier, tenantId);
      if (!existingPatient) {
        throw new HttpError('errors.opd_flow.patient_not_found', 404);
      }

      if (appointment && appointment.patient_id !== existingPatient.id) {
        throw new HttpError('errors.opd_flow.appointment_patient_mismatch', 400);
      }

      patientId = existingPatient.id;
    } else if (patientId) {
      const existingPatient = await resolvePatientByIdentifier(tx, patientId, tenantId);
      if (!existingPatient) {
        throw new HttpError('errors.opd_flow.patient_not_found', 404);
      }

      patientId = existingPatient.id;
    } else if (data.patient_registration) {
      const createdPatient = await tx.patient.create({
        data: {
          tenant_id: tenantId,
          facility_id: facilityId,
          first_name: data.patient_registration.first_name,
          last_name: data.patient_registration.last_name,
          date_of_birth: data.patient_registration.date_of_birth
            ? new Date(data.patient_registration.date_of_birth)
            : null,
          gender: data.patient_registration.gender || null,
          is_active: true
        }
      });
      patientId = createdPatient.id;
    } else {
      throw new HttpError('errors.opd_flow.patient_or_appointment_required', 400);
    }

    const providerIdentifier =
      normalizeIdentifier(data.provider_user_id) ||
      normalizeIdentifier(appointment?.provider_user_id);
    let resolvedProvider = null;
    if (providerIdentifier) {
      resolvedProvider = await resolveProviderByIdentifier(tx, providerIdentifier, tenantId, facilityId);
      if (!resolvedProvider && normalizeIdentifier(data.provider_user_id)) {
        throw new HttpError('errors.user.not_found', 404, [{ field: 'provider_user_id' }]);
      }
    }

    const providerUserId =
      resolvedProvider?.id ||
      (normalizeIdentifier(appointment?.provider_user_id) ? appointment.provider_user_id : null);
    const providerDefaults = resolveProviderConsultationDefaults(resolvedProvider);
    const defaultCurrency = await resolveDefaultCurrency(tx, tenantId, facilityId);
    const consultationFee = normalizeDecimalString(
      data.consultation_fee,
      providerDefaults.consultationFee || '0.00'
    );
    const currency = normalizeCurrencyCode(
      data.currency,
      providerDefaults.consultationCurrency || defaultCurrency || 'USD'
    );
    const requireConsultationPayment =
      data.require_consultation_payment !== undefined
        ? data.require_consultation_payment
        : arrivalMode !== 'EMERGENCY';
    const createConsultationInvoice =
      data.create_consultation_invoice !== undefined
        ? data.create_consultation_invoice
        : requireConsultationPayment || Boolean(data.pay_now);

    let consultationInvoice = null;
    let consultationPayment = null;
    let isConsultationPaid = false;
    let consultationPaidAt = null;

    if (createConsultationInvoice || data.pay_now) {
      consultationInvoice = await tx.invoice.create({
        data: {
          tenant_id: tenantId,
          facility_id: facilityId,
          patient_id: patientId,
          status: 'SENT',
          billing_status: 'ISSUED',
          total_amount: consultationFee,
          currency,
          issued_at: startedAt
        }
      });
    }

    if (data.pay_now) {
      const paymentStatus = data.pay_now.status || 'COMPLETED';
      const paidAt = data.pay_now.paid_at ? new Date(data.pay_now.paid_at) : startedAt;
      const amount = normalizeDecimalString(data.pay_now.amount, consultationFee);

      consultationPayment = await tx.payment.create({
        data: {
          tenant_id: tenantId,
          facility_id: facilityId,
          patient_id: patientId,
          invoice_id: consultationInvoice.id,
          status: paymentStatus,
          method: data.pay_now.method,
          amount,
          paid_at: paymentStatus === 'COMPLETED' ? paidAt : null,
          transaction_ref: data.pay_now.transaction_ref || null
        }
      });

      if (paymentStatus === 'COMPLETED') {
        isConsultationPaid = true;
        consultationPaidAt = consultationPayment.paid_at || paidAt;

        const invoiceAmount = toDecimalNumber(consultationInvoice.total_amount);
        const paymentAmount = toDecimalNumber(amount);
        await tx.invoice.update({
          where: { id: consultationInvoice.id },
          data: {
            status: paymentAmount >= invoiceAmount ? 'PAID' : 'SENT',
            billing_status: paymentAmount >= invoiceAmount ? 'PAID' : 'PARTIAL'
          }
        });
      }
    }

    let emergencyCase = null;
    let triageAssessment = null;

    if (arrivalMode === 'EMERGENCY') {
      emergencyCase = await tx.emergency_case.create({
        data: {
          tenant_id: tenantId,
          facility_id: facilityId,
          patient_id: patientId,
          severity: data.emergency?.severity || 'HIGH',
          status: 'OPEN'
        }
      });

      const triageLevel = mapTriageLevel(data.emergency?.triage_level);
      if (triageLevel) {
        triageAssessment = await tx.triage_assessment.create({
          data: {
            emergency_case_id: emergencyCase.id,
            triage_level: triageLevel,
            notes: data.emergency?.notes || null
          }
        });
      }
    }

    const initialStage =
      arrivalMode !== 'EMERGENCY' && requireConsultationPayment && !isConsultationPaid
        ? STAGES.WAITING_CONSULTATION_PAYMENT
        : STAGES.WAITING_VITALS;

    const flowState = {
      version: 1,
      arrival_mode: arrivalMode,
      stage: initialStage,
      next_step: getNextStep(initialStage),
      consultation: {
        require_payment: requireConsultationPayment,
        consultation_fee: consultationFee,
        currency,
        invoice_id: consultationInvoice?.id || null,
        payment_id: consultationPayment?.id || null,
        is_paid: isConsultationPaid,
        paid_at: consultationPaidAt ? consultationPaidAt.toISOString() : null
      },
      appointment_id: appointment?.id || null,
      visit_queue_id: null,
      emergency_case_id: emergencyCase?.id || null,
      triage_assessment_id: triageAssessment?.id || null,
      lab_order_ids: [],
      radiology_order_ids: [],
      pharmacy_order_id: null,
      admission_id: null,
      review_completed: false,
      timeline: []
    };

    appendTimelineEvent(
      flowState,
      'FLOW_STARTED',
      context,
      {
        arrival_mode: arrivalMode,
        notes: data.notes || null
      },
      startedAt
    );

    if (consultationInvoice) {
      appendTimelineEvent(
        flowState,
        'CONSULTATION_INVOICE_CREATED',
        context,
        {
          invoice_id: consultationInvoice.id,
          consultation_fee: consultationFee,
          currency
        },
        startedAt
      );
    }

    if (consultationPayment) {
      appendTimelineEvent(
        flowState,
        'CONSULTATION_PAYMENT_RECORDED',
        context,
        {
          payment_id: consultationPayment.id,
          status: consultationPayment.status
        },
        startedAt
      );
    }

    if (emergencyCase) {
      appendTimelineEvent(
        flowState,
        'EMERGENCY_CASE_OPENED',
        context,
        {
          emergency_case_id: emergencyCase.id,
          severity: emergencyCase.severity,
          triage_assessment_id: triageAssessment?.id || null
        },
        startedAt
      );
    }

    const queuedAt = data.queued_at ? new Date(data.queued_at) : startedAt;
    const visitQueue = await tx.visit_queue.create({
      data: {
        tenant_id: tenantId,
        facility_id: facilityId,
        patient_id: patientId,
        appointment_id: appointment?.id || null,
        provider_user_id: providerUserId,
        status: 'CONFIRMED',
        queued_at: queuedAt
      }
    });
    flowState.visit_queue_id = visitQueue.id;

    const encounter = await tx.encounter.create({
      data: {
        tenant_id: tenantId,
        facility_id: facilityId,
        patient_id: patientId,
        provider_user_id: providerUserId,
        encounter_type: arrivalMode === 'EMERGENCY' ? 'EMERGENCY' : 'OPD',
        status: 'OPEN',
        started_at: startedAt,
        extension_json: {
          opd_flow: flowState
        }
      },
      include: {
        tenant: true,
        facility: true,
        patient: true,
        provider: true
      }
    });

    if (appointment && appointment.status !== 'IN_PROGRESS') {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    return {
      encounter,
      transition: {
        action: 'START_FLOW',
        stage_from: null,
        stage_to: initialStage,
        provider_user_id: providerUserId,
        occurred_at: startedAt.toISOString()
      }
    };
  });

  createAuditLog({
    tenant_id: startedResult.encounter.tenant_id,
    user_id: context.user_id,
    action: 'CREATE',
    entity: 'opd_flow',
    entity_id: startedResult.encounter.id,
    diff: { after: startedResult.encounter },
    ip_address: context.ip_address
  }).catch(() => {});

  const snapshot = await getOpdFlowById(startedResult.encounter.id);
  await publishOpdRealtimeUpdates({
    snapshot,
    transition: startedResult.transition,
    context
  });
  return snapshot;
};

const payConsultation = async (id, data, context = {}) => {
  const updatedResult = await prisma.$transaction(async (tx) => {
    const encounter = await resolveEncounterByIdentifier(tx, id);
    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);
    const stageBefore = flow.stage;

    const consultation = flow.consultation || {};

    if (consultation.is_paid) {
      throw new HttpError('errors.opd_flow.consultation_already_paid', 400);
    }

    let invoiceId = data.invoice_id || consultation.invoice_id || null;
    let invoice = null;

    if (invoiceId) {
      invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, deleted_at: null }
      });
      if (!invoice) {
        throw new HttpError('errors.invoice.not_found', 404);
      }
    } else {
      invoice = await tx.invoice.create({
        data: {
          tenant_id: encounter.tenant_id,
          facility_id: encounter.facility_id,
          patient_id: encounter.patient_id,
          status: 'SENT',
          billing_status: 'ISSUED',
          total_amount: normalizeDecimalString(data.amount, consultation.consultation_fee || '0.00'),
          currency: data.currency || consultation.currency || 'USD',
          issued_at: new Date()
        }
      });
      invoiceId = invoice.id;
    }

    const paymentStatus = data.status || 'COMPLETED';
    const amount = normalizeDecimalString(
      data.amount,
      consultation.consultation_fee || normalizeDecimalString(invoice.total_amount, '0.00')
    );

    const payment = await tx.payment.create({
      data: {
        tenant_id: encounter.tenant_id,
        facility_id: encounter.facility_id,
        patient_id: encounter.patient_id,
        invoice_id: invoiceId,
        status: paymentStatus,
        method: data.method,
        amount,
        paid_at: paymentStatus === 'COMPLETED' ? (data.paid_at ? new Date(data.paid_at) : new Date()) : null,
        transaction_ref: data.transaction_ref || null
      }
    });

    const invoiceTotal = toDecimalNumber(invoice.total_amount);
    const paidAmount = toDecimalNumber(amount);
    const isPaid = paymentStatus === 'COMPLETED' && paidAmount >= invoiceTotal;

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: isPaid ? 'PAID' : 'SENT',
        billing_status: paymentStatus === 'COMPLETED' ? (isPaid ? 'PAID' : 'PARTIAL') : 'ISSUED'
      }
    });

    consultation.invoice_id = invoice.id;
    consultation.payment_id = payment.id;
    consultation.is_paid = paymentStatus === 'COMPLETED';
    consultation.paid_at = payment.paid_at ? payment.paid_at.toISOString() : null;
    consultation.currency = data.currency || consultation.currency || invoice.currency;
    flow.consultation = consultation;

    if (flow.stage === STAGES.WAITING_CONSULTATION_PAYMENT && consultation.is_paid) {
      setFlowStage(flow, STAGES.WAITING_VITALS);
    }

    appendTimelineEvent(flow, 'CONSULTATION_PAYMENT_RECORDED', context, {
      payment_id: payment.id,
      invoice_id: invoice.id,
      amount,
      status: paymentStatus,
      notes: data.notes || null
    });

    const updatedEncounter = await tx.encounter.update({
      where: { id: encounter.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });

    return {
      encounter: updatedEncounter,
      transition: {
        action: 'PAY_CONSULTATION',
        stage_from: stageBefore,
        stage_to: flow.stage,
        provider_user_id: encounter.provider_user_id || null,
        occurred_at: new Date().toISOString()
      }
    };
  });

  createAuditLog({
    tenant_id: updatedResult.encounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedResult.encounter.id,
    diff: { after: updatedResult.encounter },
    ip_address: context.ip_address
  }).catch(() => {});

  const snapshot = await getOpdFlowById(updatedResult.encounter.id);
  await publishOpdRealtimeUpdates({
    snapshot,
    transition: updatedResult.transition,
    context
  });
  return snapshot;
};

const recordVitals = async (id, data, context = {}) => {
  const updatedResult = await prisma.$transaction(async (tx) => {
    const encounter = await resolveEncounterByIdentifier(tx, id);
    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);
    const stageBefore = flow.stage;

    const isEmergency = encounter.encounter_type === 'EMERGENCY';
    if (!isEmergency && flow.consultation?.require_payment && !flow.consultation?.is_paid) {
      throw new HttpError('errors.opd_flow.consultation_payment_required', 400);
    }

    if (flow.stage !== STAGES.WAITING_VITALS && flow.stage !== STAGES.WAITING_DOCTOR_ASSIGNMENT) {
      throw new HttpError('errors.opd_flow.invalid_stage_transition', 400);
    }

    await tx.vital_sign.createMany({
      data: data.vitals.map((vital) => {
        const normalizedVital = normalizeVitalForPersistence(vital);
        return {
          encounter_id: encounter.id,
          vital_type: normalizedVital.vital_type,
          value: normalizedVital.value,
          systolic_value: normalizedVital.systolic_value,
          diastolic_value: normalizedVital.diastolic_value,
          map_value: normalizedVital.map_value,
          unit: vital.unit || null,
          recorded_at: vital.recorded_at ? new Date(vital.recorded_at) : new Date()
        };
      })
    });

    if (flow.emergency_case_id && (data.triage_level || data.triage_notes)) {
      const triageLevel = mapTriageLevel(data.triage_level);
      if (data.triage_level && !triageLevel) {
        throw new HttpError('errors.opd_flow.invalid_stage_transition', 400, [{ field: 'triage_level' }]);
      }

      if (flow.triage_assessment_id) {
        await tx.triage_assessment.update({
          where: { id: flow.triage_assessment_id },
          data: {
            triage_level: triageLevel || undefined,
            notes: data.triage_notes || undefined
          }
        });
      } else if (triageLevel) {
        const triageAssessment = await tx.triage_assessment.create({
          data: {
            emergency_case_id: flow.emergency_case_id,
            triage_level: triageLevel,
            notes: data.triage_notes || null
          }
        });
        flow.triage_assessment_id = triageAssessment.id;
      }
    }

    setFlowStage(flow, STAGES.WAITING_DOCTOR_ASSIGNMENT);
    appendTimelineEvent(flow, 'VITALS_RECORDED', context, {
      vitals_count: data.vitals.length,
      triage_level: data.triage_level || null
    });

    if (flow.visit_queue_id) {
      await tx.visit_queue.update({
        where: { id: flow.visit_queue_id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    const updatedEncounter = await tx.encounter.update({
      where: { id: encounter.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });

    return {
      encounter: updatedEncounter,
      transition: {
        action: 'RECORD_VITALS',
        stage_from: stageBefore,
        stage_to: flow.stage,
        provider_user_id: encounter.provider_user_id || null,
        occurred_at: new Date().toISOString()
      }
    };
  });

  createAuditLog({
    tenant_id: updatedResult.encounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedResult.encounter.id,
    diff: { after: updatedResult.encounter },
    ip_address: context.ip_address
  }).catch(() => {});

  const snapshot = await getOpdFlowById(updatedResult.encounter.id);
  await publishOpdRealtimeUpdates({
    snapshot,
    transition: updatedResult.transition,
    context
  });
  return snapshot;
};

const assignDoctor = async (id, data, context = {}) => {
  const updatedResult = await prisma.$transaction(async (tx) => {
    const encounter = await resolveEncounterByIdentifier(tx, id);
    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);
    const stageBefore = flow.stage;

    if (flow.stage !== STAGES.WAITING_DOCTOR_ASSIGNMENT && flow.stage !== STAGES.WAITING_DOCTOR_REVIEW) {
      throw new HttpError('errors.opd_flow.invalid_stage_transition', 400);
    }

    const provider = await resolveProviderByIdentifier(
      tx,
      data.provider_user_id,
      encounter.tenant_id,
      encounter.facility_id
    );
    if (!provider) {
      throw new HttpError('errors.user.not_found', 404, [{ field: 'provider_user_id' }]);
    }

    const updated = await tx.encounter.update({
      where: { id: encounter.id },
      data: {
        provider_user_id: provider.id
      }
    });

    if (flow.visit_queue_id) {
      await tx.visit_queue.update({
        where: { id: flow.visit_queue_id },
        data: {
          provider_user_id: provider.id,
          status: 'IN_PROGRESS'
        }
      });
    }

    setFlowStage(flow, STAGES.WAITING_DOCTOR_REVIEW);
    appendTimelineEvent(flow, 'DOCTOR_ASSIGNED', context, {
      provider_user_id: provider.id
    });

    const updatedEncounter = await tx.encounter.update({
      where: { id: updated.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });

    return {
      encounter: updatedEncounter,
      transition: {
        action: 'ASSIGN_DOCTOR',
        stage_from: stageBefore,
        stage_to: flow.stage,
        provider_user_id: provider.id,
        occurred_at: new Date().toISOString()
      }
    };
  });

  createAuditLog({
    tenant_id: updatedResult.encounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedResult.encounter.id,
    diff: { after: updatedResult.encounter },
    ip_address: context.ip_address
  }).catch(() => {});

  const snapshot = await getOpdFlowById(updatedResult.encounter.id);
  await publishOpdRealtimeUpdates({
    snapshot,
    transition: updatedResult.transition,
    context
  });
  return snapshot;
};

const doctorReview = async (id, data, context = {}) => {
  const updatedResult = await prisma.$transaction(async (tx) => {
    const encounter = await resolveEncounterByIdentifier(tx, id);
    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);
    const stageBefore = flow.stage;

    if (flow.stage !== STAGES.WAITING_DOCTOR_REVIEW) {
      throw new HttpError('errors.opd_flow.invalid_stage_transition', 400);
    }

    const authorUserId = context.user_id || encounter.provider_user_id;
    if (!authorUserId) {
      throw new HttpError('errors.opd_flow.invalid_stage_transition', 400, [{ field: 'author_user_id' }]);
    }

    const note = await tx.clinical_note.create({
      data: {
        encounter_id: encounter.id,
        author_user_id: authorUserId,
        note: data.note
      }
    });

    if (Array.isArray(data.diagnoses) && data.diagnoses.length) {
      await tx.diagnosis.createMany({
        data: data.diagnoses.map((diagnosis) => ({
          encounter_id: encounter.id,
          diagnosis_type: diagnosis.diagnosis_type,
          code: diagnosis.code || null,
          description: diagnosis.description
        }))
      });
    }

    if (Array.isArray(data.procedures) && data.procedures.length) {
      await tx.procedure.createMany({
        data: data.procedures.map((procedure) => ({
          encounter_id: encounter.id,
          code: procedure.code || null,
          description: procedure.description,
          performed_at: procedure.performed_at ? new Date(procedure.performed_at) : null
        }))
      });
    }

    let labOrder = null;
    if (Array.isArray(data.lab_requests) && data.lab_requests.length) {
      labOrder = await tx.lab_order.create({
        data: {
          encounter_id: encounter.id,
          patient_id: encounter.patient_id,
          status: 'ORDERED',
          ordered_at: new Date()
        }
      });

      await tx.lab_order_item.createMany({
        data: data.lab_requests.map((item) => ({
          lab_order_id: labOrder.id,
          lab_test_id: item.lab_test_id,
          status: item.status || 'ORDERED'
        }))
      });
    }

    const radiologyOrderIds = [];
    if (Array.isArray(data.radiology_requests) && data.radiology_requests.length) {
      for (const request of data.radiology_requests) {
        const radiologyOrder = await tx.radiology_order.create({
          data: {
            encounter_id: encounter.id,
            patient_id: encounter.patient_id,
            radiology_test_id: request.radiology_test_id || null,
            status: request.status || 'ORDERED',
            ordered_at: new Date()
          }
        });
        radiologyOrderIds.push(radiologyOrder.id);
      }
    }

    let pharmacyOrder = null;
    if (Array.isArray(data.medications) && data.medications.length) {
      pharmacyOrder = await tx.pharmacy_order.create({
        data: {
          encounter_id: encounter.id,
          patient_id: encounter.patient_id,
          status: 'ORDERED',
          ordered_at: new Date()
        }
      });

      await tx.pharmacy_order_item.createMany({
        data: data.medications.map((medication) => ({
          pharmacy_order_id: pharmacyOrder.id,
          drug_id: medication.drug_id,
          quantity: medication.quantity,
          dosage: medication.dosage || null,
          frequency: medication.frequency || null,
          route: medication.route || null,
          status: medication.status || 'ACTIVE'
        }))
      });
    }

    const hasLab = Boolean(labOrder);
    const hasRadiology = radiologyOrderIds.length > 0;
    const hasMedication = Boolean(pharmacyOrder);

    if (hasLab && hasRadiology) {
      setFlowStage(flow, STAGES.LAB_AND_RADIOLOGY_REQUESTED);
    } else if (hasLab) {
      setFlowStage(flow, STAGES.LAB_REQUESTED);
    } else if (hasRadiology) {
      setFlowStage(flow, STAGES.RADIOLOGY_REQUESTED);
    } else if (hasMedication) {
      setFlowStage(flow, STAGES.PHARMACY_REQUESTED);
    } else {
      setFlowStage(flow, STAGES.WAITING_DISPOSITION);
    }

    flow.review_completed = true;
    flow.clinical_note_id = note.id;
    if (labOrder) {
      flow.lab_order_ids = [labOrder.id];
    }
    if (radiologyOrderIds.length) {
      flow.radiology_order_ids = radiologyOrderIds;
    }
    if (pharmacyOrder) {
      flow.pharmacy_order_id = pharmacyOrder.id;
    }

    appendTimelineEvent(flow, 'DOCTOR_REVIEW_COMPLETED', context, {
      note_id: note.id,
      diagnosis_count: Array.isArray(data.diagnoses) ? data.diagnoses.length : 0,
      procedure_count: Array.isArray(data.procedures) ? data.procedures.length : 0,
      lab_order_count: hasLab ? 1 : 0,
      radiology_order_count: radiologyOrderIds.length,
      medication_count: Array.isArray(data.medications) ? data.medications.length : 0,
      notes: data.notes || null
    });

    const updatedEncounter = await tx.encounter.update({
      where: { id: encounter.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });

    return {
      encounter: updatedEncounter,
      transition: {
        action: 'DOCTOR_REVIEW',
        stage_from: stageBefore,
        stage_to: flow.stage,
        provider_user_id: encounter.provider_user_id || authorUserId || null,
        occurred_at: new Date().toISOString()
      }
    };
  });

  createAuditLog({
    tenant_id: updatedResult.encounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedResult.encounter.id,
    diff: { after: updatedResult.encounter },
    ip_address: context.ip_address
  }).catch(() => {});

  const snapshot = await getOpdFlowById(updatedResult.encounter.id);
  await publishOpdRealtimeUpdates({
    snapshot,
    transition: updatedResult.transition,
    context
  });
  return snapshot;
};

const disposition = async (id, data, context = {}) => {
  const dispositionAt = new Date();

  const updatedResult = await prisma.$transaction(async (tx) => {
    const encounter = await resolveEncounterByIdentifier(tx, id);
    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);
    const stageBefore = flow.stage;

    if (!flow.review_completed) {
      throw new HttpError('errors.opd_flow.doctor_review_required', 400);
    }

    let admission = null;
    if (data.decision === 'ADMIT') {
      admission = await tx.admission.create({
        data: {
          tenant_id: encounter.tenant_id,
          facility_id:
            data.admission_facility_id !== undefined ? data.admission_facility_id : encounter.facility_id || null,
          patient_id: encounter.patient_id,
          encounter_id: encounter.id,
          status: 'ADMITTED',
          admitted_at: dispositionAt
        }
      });
      flow.admission_id = admission.id;
      setFlowStage(flow, STAGES.ADMITTED);
    } else {
      if (data.decision === 'SEND_TO_PHARMACY' && !flow.pharmacy_order_id) {
        throw new HttpError('errors.opd_flow.pharmacy_order_required_for_disposition', 400);
      }

      setFlowStage(flow, STAGES.DISCHARGED);
    }

    appendTimelineEvent(flow, 'DISPOSITION_RECORDED', context, {
      decision: data.decision,
      admission_id: admission?.id || null,
      notes: data.notes || null
    });

    const finalizedEncounter = await tx.encounter.update({
      where: { id: encounter.id },
      data: {
        status: 'CLOSED',
        ended_at: dispositionAt,
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });

    if (flow.visit_queue_id) {
      await tx.visit_queue.update({
        where: { id: flow.visit_queue_id },
        data: {
          status: 'COMPLETED'
        }
      });
    }

    if (flow.appointment_id) {
      const appointment = await tx.appointment.findFirst({
        where: { id: flow.appointment_id, deleted_at: null }
      });
      if (appointment && appointment.status !== 'CANCELLED' && appointment.status !== 'NO_SHOW') {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: 'COMPLETED' }
        });
      }
    }

    if (flow.emergency_case_id) {
      await tx.emergency_case.update({
        where: { id: flow.emergency_case_id },
        data: {
          status: 'CLOSED'
        }
      });
    }

    return {
      encounter: finalizedEncounter,
      transition: {
        action: 'DISPOSITION',
        stage_from: stageBefore,
        stage_to: flow.stage,
        provider_user_id: encounter.provider_user_id || null,
        occurred_at: dispositionAt.toISOString()
      }
    };
  });

  createAuditLog({
    tenant_id: updatedResult.encounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedResult.encounter.id,
    diff: { after: updatedResult.encounter },
    ip_address: context.ip_address
  }).catch(() => {});

  const snapshot = await getOpdFlowById(updatedResult.encounter.id);
  await publishOpdRealtimeUpdates({
    snapshot,
    transition: updatedResult.transition,
    context
  });
  return snapshot;
};

module.exports = {
  listOpdFlows,
  getOpdFlowById,
  startOpdFlow,
  payConsultation,
  recordVitals,
  assignDoctor,
  doctorReview,
  disposition
};
