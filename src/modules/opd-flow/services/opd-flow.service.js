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
  if (filters.patient_id) where.patient_id = filters.patient_id;
  if (filters.provider_user_id) where.provider_user_id = filters.provider_user_id;
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
    const encounter = await tx.encounter.findFirst({
      where: {
        id,
        deleted_at: null,
        encounter_type: { in: ['OPD', 'EMERGENCY'] }
      },
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

  const createdEncounter = await prisma.$transaction(async (tx) => {
    const appointment = data.appointment_id
      ? await tx.appointment.findFirst({
          where: {
            id: data.appointment_id,
            deleted_at: null
          }
        })
      : null;

    if (data.appointment_id && !appointment) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    if (appointment && (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW')) {
      throw new HttpError('errors.opd_flow.appointment_terminal_status', 400);
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

    let patientId = data.patient_id || appointment?.patient_id || null;

    if (data.patient_id && appointment && appointment.patient_id !== data.patient_id) {
      throw new HttpError('errors.opd_flow.appointment_patient_mismatch', 400);
    }

    if (patientId) {
      const existingPatient = await tx.patient.findFirst({
        where: {
          id: patientId,
          deleted_at: null
        }
      });

      if (!existingPatient) {
        throw new HttpError('errors.opd_flow.patient_not_found', 404);
      }
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

    const consultationFee = normalizeDecimalString(data.consultation_fee, '0.00');
    const currency = data.currency || 'USD';
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
    const providerUserId = data.provider_user_id || appointment?.provider_user_id || null;
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

    return encounter;
  });

  createAuditLog({
    tenant_id: createdEncounter.tenant_id,
    user_id: context.user_id,
    action: 'CREATE',
    entity: 'opd_flow',
    entity_id: createdEncounter.id,
    diff: { after: createdEncounter },
    ip_address: context.ip_address
  }).catch(() => {});

  return getOpdFlowById(createdEncounter.id);
};

const payConsultation = async (id, data, context = {}) => {
  const updatedEncounter = await prisma.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id, deleted_at: null }
    });

    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);

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

    return tx.encounter.update({
      where: { id: encounter.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });
  });

  createAuditLog({
    tenant_id: updatedEncounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedEncounter.id,
    diff: { after: updatedEncounter },
    ip_address: context.ip_address
  }).catch(() => {});

  return getOpdFlowById(id);
};

const recordVitals = async (id, data, context = {}) => {
  const updatedEncounter = await prisma.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id, deleted_at: null }
    });

    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);

    const isEmergency = encounter.encounter_type === 'EMERGENCY';
    if (!isEmergency && flow.consultation?.require_payment && !flow.consultation?.is_paid) {
      throw new HttpError('errors.opd_flow.consultation_payment_required', 400);
    }

    if (flow.stage !== STAGES.WAITING_VITALS && flow.stage !== STAGES.WAITING_DOCTOR_ASSIGNMENT) {
      throw new HttpError('errors.opd_flow.invalid_stage_transition', 400);
    }

    await tx.vital_sign.createMany({
      data: data.vitals.map((vital) => ({
        encounter_id: encounter.id,
        vital_type: vital.vital_type,
        value: vital.value,
        unit: vital.unit || null,
        recorded_at: vital.recorded_at ? new Date(vital.recorded_at) : new Date()
      }))
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

    return tx.encounter.update({
      where: { id: encounter.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });
  });

  createAuditLog({
    tenant_id: updatedEncounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedEncounter.id,
    diff: { after: updatedEncounter },
    ip_address: context.ip_address
  }).catch(() => {});

  return getOpdFlowById(id);
};

const assignDoctor = async (id, data, context = {}) => {
  const updatedEncounter = await prisma.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id, deleted_at: null }
    });

    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);

    if (flow.stage !== STAGES.WAITING_DOCTOR_ASSIGNMENT && flow.stage !== STAGES.WAITING_DOCTOR_REVIEW) {
      throw new HttpError('errors.opd_flow.invalid_stage_transition', 400);
    }

    const updated = await tx.encounter.update({
      where: { id: encounter.id },
      data: {
        provider_user_id: data.provider_user_id
      }
    });

    if (flow.visit_queue_id) {
      await tx.visit_queue.update({
        where: { id: flow.visit_queue_id },
        data: {
          provider_user_id: data.provider_user_id,
          status: 'IN_PROGRESS'
        }
      });
    }

    setFlowStage(flow, STAGES.WAITING_DOCTOR_REVIEW);
    appendTimelineEvent(flow, 'DOCTOR_ASSIGNED', context, {
      provider_user_id: data.provider_user_id
    });

    return tx.encounter.update({
      where: { id: updated.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });
  });

  createAuditLog({
    tenant_id: updatedEncounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedEncounter.id,
    diff: { after: updatedEncounter },
    ip_address: context.ip_address
  }).catch(() => {});

  return getOpdFlowById(id);
};

const doctorReview = async (id, data, context = {}) => {
  const updatedEncounter = await prisma.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id, deleted_at: null }
    });

    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);

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

    return tx.encounter.update({
      where: { id: encounter.id },
      data: {
        extension_json: {
          ...(encounter.extension_json || {}),
          opd_flow: flow
        }
      }
    });
  });

  createAuditLog({
    tenant_id: updatedEncounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedEncounter.id,
    diff: { after: updatedEncounter },
    ip_address: context.ip_address
  }).catch(() => {});

  return getOpdFlowById(id);
};

const disposition = async (id, data, context = {}) => {
  const dispositionAt = new Date();

  const updatedEncounter = await prisma.$transaction(async (tx) => {
    const encounter = await tx.encounter.findFirst({
      where: { id, deleted_at: null }
    });

    if (!encounter) {
      throw new HttpError('errors.opd_flow.not_found', 404);
    }

    const flow = getOpdFlowState(encounter);
    ensureNonTerminalStage(flow);

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

    return finalizedEncounter;
  });

  createAuditLog({
    tenant_id: updatedEncounter.tenant_id,
    user_id: context.user_id,
    action: 'UPDATE',
    entity: 'opd_flow',
    entity_id: updatedEncounter.id,
    diff: { after: updatedEncounter },
    ip_address: context.ip_address
  }).catch(() => {});

  return getOpdFlowById(id);
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
