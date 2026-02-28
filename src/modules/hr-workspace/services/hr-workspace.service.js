
const prisma = require('@prisma/client');
const repo = require('@repositories/hr-workspace/hr-workspace.repository');
const { HttpError } = require('@lib/errors');
const { createAuditLog } = require('@lib/audit');
const { normalizeIdentifier, resolveModelRecordByIdentifier } = require('@lib/identifiers/resolve-entity-id');
const { resolveIdentifierForFilter, resolveIdentifierForPayload, resolvePublicIdentifier } = require('@lib/billing/identifiers');
const { buildWorkflow, generateRosterAssignments, resolveRecordOrThrow, resolveDisplayId } =
  require('@services/hr-workspace/hr-roster-engine');

const normalizeString = (value) => String(value || '').trim();
const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const buildScope = async (filters = {}) => {
  const where = {};
  const facilityId = await resolveIdentifierForFilter({
    value: filters.facility_id,
    model: 'facility',
    where: { deleted_at: null },
  });
  if (facilityId) where.facility_id = facilityId;

  const departmentId = await resolveIdentifierForFilter({
    value: filters.department_id,
    model: 'department',
    where: { deleted_at: null },
  });
  if (departmentId) where.department_id = departmentId;

  return {
    where,
    from: normalizeDate(filters.from),
    to: normalizeDate(filters.to),
  };
};

const mapQueueMeta = (queue, label, count) => ({
  queue,
  label,
  count: Number(count || 0),
});

const mapLeave = (item) => ({
  queue: 'LEAVE_REQUESTS',
  display_id: resolveDisplayId(item),
  backend_identifier: item.id,
  status: item.status,
  staff_profile_id: item.staff_profile_id,
  staff_profile_display_id: resolveDisplayId(item.staff_profile || {}),
  start_date: item.start_date,
  end_date: item.end_date,
  reason: item.reason || null,
  timeline_at: item.updated_at || item.created_at,
});

const mapSwap = (item) => ({
  queue: 'SWAP_REQUESTS',
  display_id: resolveDisplayId(item),
  backend_identifier: item.id,
  status: item.status,
  shift_id: item.shift_id,
  shift_display_id: resolveDisplayId(item.shift || {}),
  requester_staff_id: item.requester_staff_id,
  requester_staff_display_id: resolveDisplayId(item.requester || {}),
  target_staff_id: item.target_staff_id,
  target_staff_display_id: resolveDisplayId(item.target || {}),
  timeline_at: item.updated_at || item.created_at,
});

const mapRoster = (item) => ({
  queue: 'ROSTER_DRAFTS',
  display_id: resolveDisplayId(item),
  backend_identifier: item.id,
  status: item.status,
  period_start: item.period_start,
  period_end: item.period_end,
  timeline_at: item.updated_at || item.created_at,
});

const mapShift = (item, queue = 'UNASSIGNED_SHIFTS') => ({
  queue,
  display_id: resolveDisplayId(item),
  backend_identifier: item.id,
  status: item.status,
  shift_type: item.shift_type,
  start_time: item.start_time,
  end_time: item.end_time,
  nurse_roster_display_id: resolveDisplayId(item.nurse_roster || {}),
  assignment_count: Array.isArray(item.assignments) ? item.assignments.length : 0,
  timeline_at: item.updated_at || item.created_at,
});

const mapPayroll = (item) => ({
  queue: 'PAYROLL_DRAFTS',
  display_id: resolveDisplayId(item),
  backend_identifier: item.id,
  status: item.status,
  period_start: item.period_start,
  period_end: item.period_end,
  timeline_at: item.updated_at || item.created_at,
});

const getWorkspace = async (filters = {}, page = 1, limit = 20) => {
  const { where } = await buildScope(filters);
  const now = new Date();

  const [totalStaff, leaveRequests, swapRequests, draftRosters, draftPayroll, unassignedShifts, overdueShifts] =
    await Promise.all([
      repo.countStaffProfiles({ ...(where.department_id ? { department_id: where.department_id } : {}) }),
      repo.countStaffLeaves({ status: 'REQUESTED' }),
      repo.countShiftSwaps({ status: 'SCHEDULED', shift: { deleted_at: null, ...(where.facility_id ? { facility_id: where.facility_id } : {}) } }),
      repo.countRosters({ status: 'DRAFT', ...(where.facility_id ? { facility_id: where.facility_id } : {}), ...(where.department_id ? { department_id: where.department_id } : {}) }),
      repo.countPayrollRuns({ status: 'DRAFT' }),
      repo.countShifts({ ...(where.facility_id ? { facility_id: where.facility_id } : {}), assignments: { none: { deleted_at: null } } }),
      repo.countShifts({ ...(where.facility_id ? { facility_id: where.facility_id } : {}), start_time: { lt: now }, status: { in: ['SCHEDULED'] } }),
    ]);

  const queues = [
    mapQueueMeta('LEAVE_REQUESTS', 'Leave requests', leaveRequests),
    mapQueueMeta('SWAP_REQUESTS', 'Swap requests', swapRequests),
    mapQueueMeta('ROSTER_DRAFTS', 'Draft rosters', draftRosters),
    mapQueueMeta('UNASSIGNED_SHIFTS', 'Unassigned shifts', unassignedShifts),
    mapQueueMeta('PAYROLL_DRAFTS', 'Draft payroll runs', draftPayroll),
    mapQueueMeta('OVERDUE_SHIFTS', 'Overdue shifts', overdueShifts),
  ];

  const timelineLimit = Math.max(10, Math.min(limit, 60));
  const [leaves, swaps, rosters, payrollRuns, shifts] = await Promise.all([
    repo.findTimelineLeaves({}, timelineLimit),
    repo.findTimelineSwaps({ shift: { deleted_at: null, ...(where.facility_id ? { facility_id: where.facility_id } : {}) } }, timelineLimit),
    repo.findTimelineRosters({ ...(where.facility_id ? { facility_id: where.facility_id } : {}), ...(where.department_id ? { department_id: where.department_id } : {}) }, timelineLimit),
    repo.findTimelinePayrollRuns({}, timelineLimit),
    repo.findTimelineShifts({ ...(where.facility_id ? { facility_id: where.facility_id } : {}) }, timelineLimit),
  ]);

  const timelineItems = [
    ...leaves.map((item) => ({ type: 'LEAVE', action: 'UPDATED', status: item.status, display_id: resolveDisplayId(item), backend_identifier: item.id, timeline_at: item.updated_at || item.created_at })),
    ...swaps.map((item) => ({ type: 'SWAP', action: 'UPDATED', status: item.status, display_id: resolveDisplayId(item), backend_identifier: item.id, timeline_at: item.updated_at || item.created_at })),
    ...rosters.map((item) => ({ type: 'ROSTER', action: item.status === 'PUBLISHED' ? 'PUBLISHED' : 'UPDATED', status: item.status, display_id: resolveDisplayId(item), backend_identifier: item.id, timeline_at: item.updated_at || item.created_at })),
    ...payrollRuns.map((item) => ({ type: 'PAYROLL', action: item.status === 'PROCESSED' ? 'PROCESSED' : 'UPDATED', status: item.status, display_id: resolveDisplayId(item), backend_identifier: item.id, timeline_at: item.updated_at || item.created_at })),
    ...shifts.map((item) => ({ type: 'SHIFT', action: 'UPDATED', status: item.status, display_id: resolveDisplayId(item), backend_identifier: item.id, timeline_at: item.updated_at || item.created_at })),
  ]
    .filter((item) => item.timeline_at)
    .sort((a, b) => new Date(b.timeline_at).getTime() - new Date(a.timeline_at).getTime())
    .slice(0, timelineLimit);

  return {
    summary: {
      total_staff: totalStaff,
      leave_requests: leaveRequests,
      swap_requests: swapRequests,
      draft_rosters: draftRosters,
      unassigned_shifts: unassignedShifts,
      payroll_draft_runs: draftPayroll,
      overdue_shifts: overdueShifts,
    },
    queues,
    timeline: {
      items: timelineItems,
      pagination: buildPagination(page, timelineLimit, timelineItems.length),
    },
    generated_at: new Date().toISOString(),
  };
};
const listQueueItems = async ({ queue, where, from, to, skip, take }) => {
  if (queue === 'LEAVE_REQUESTS') {
    const items = await repo.findManyLeaves({ where: { status: 'REQUESTED' }, skip, take });
    const total = await repo.countStaffLeaves({ status: 'REQUESTED' });
    return { items: items.map(mapLeave), total };
  }

  if (queue === 'SWAP_REQUESTS') {
    const whereClause = { status: 'SCHEDULED', shift: { deleted_at: null, ...(where.facility_id ? { facility_id: where.facility_id } : {}) } };
    const items = await repo.findManyShiftSwaps({ where: whereClause, skip, take });
    const total = await repo.countShiftSwaps(whereClause);
    return { items: items.map(mapSwap), total };
  }

  if (queue === 'ROSTER_DRAFTS') {
    const whereClause = { status: 'DRAFT', ...(where.facility_id ? { facility_id: where.facility_id } : {}), ...(where.department_id ? { department_id: where.department_id } : {}) };
    const items = await repo.findManyRosters({ where: whereClause, skip, take });
    const total = await repo.countRosters(whereClause);
    return { items: items.map(mapRoster), total };
  }

  if (queue === 'PAYROLL_DRAFTS') {
    const whereClause = { status: 'DRAFT' };
    const items = await repo.findManyPayrollRuns({ where: whereClause, skip, take });
    const total = await repo.countPayrollRuns(whereClause);
    return { items: items.map(mapPayroll), total };
  }

  if (queue === 'OVERDUE_SHIFTS') {
    const whereClause = {
      ...(where.facility_id ? { facility_id: where.facility_id } : {}),
      start_time: { lt: new Date() },
      status: { in: ['SCHEDULED'] },
    };
    const items = await repo.findManyOverdueShifts({ where: whereClause, skip, take });
    const total = await repo.countShifts(whereClause);
    return { items: items.map((item) => mapShift(item, 'OVERDUE_SHIFTS')), total };
  }

  const whereClause = {
    ...(where.facility_id ? { facility_id: where.facility_id } : {}),
    ...(where.department_id ? { nurse_roster: { department_id: where.department_id } } : {}),
    ...(from || to
      ? {
          start_time: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const items = await repo.findManyUnassignedShifts({ where: whereClause, skip, take });
  const total = await repo.countShifts({ ...whereClause, assignments: { none: { deleted_at: null } } });
  return { items: items.map((item) => mapShift(item, 'UNASSIGNED_SHIFTS')), total };
};

const getWorkItems = async (filters = {}, page = 1, limit = 20) => {
  const { where, from, to } = await buildScope(filters);
  const queue = normalizeString(filters.queue).toUpperCase();
  const skip = (page - 1) * limit;

  if (queue) {
    const { items, total } = await listQueueItems({ queue, where, from, to, skip, take: limit });
    return { queue, items, pagination: buildPagination(page, limit, total) };
  }

  const queues = ['LEAVE_REQUESTS', 'SWAP_REQUESTS', 'ROSTER_DRAFTS', 'UNASSIGNED_SHIFTS', 'PAYROLL_DRAFTS', 'OVERDUE_SHIFTS'];
  const grouped = [];

  for (const currentQueue of queues) {
    const { items, total } = await listQueueItems({
      queue: currentQueue,
      where,
      from,
      to,
      skip: 0,
      take: Math.min(limit, 10),
    });
    grouped.push({ queue: currentQueue, total, items });
  }

  return { queues: grouped };
};

const getRosterWorkflow = async (rosterIdentifier) => buildWorkflow(rosterIdentifier);

const publishRoster = async (rosterIdentifier, body = {}, userId = null, ipAddress = null) => {
  const notifyStaff = Boolean(body.notify_staff);
  const allowPartial = Boolean(body.allow_partial_publish);
  const publishNote = normalizeString(body.publish_note) || null;

  const workflow = await buildWorkflow(rosterIdentifier);
  const hasGaps = Array.isArray(workflow.gaps) && workflow.gaps.length > 0;

  if (hasGaps && !allowPartial) {
    throw new HttpError('errors.hr_workspace.publish_blocked_unassigned', 400, [
      { reason: 'unassigned_shifts_present', unassigned_count: workflow.gaps.length },
    ]);
  }

  if (hasGaps && allowPartial && !publishNote) {
    throw new HttpError('errors.validation.invalid', 400, [{ field: 'publish_note' }]);
  }

  const roster = await resolveModelRecordByIdentifier({
    model: 'nurse_roster',
    identifier: rosterIdentifier,
    where: { deleted_at: null },
    select: { id: true, tenant_id: true, status: true, published_at: true, human_friendly_id: true },
  });

  if (!roster?.id) {
    throw new HttpError('errors.nurse_roster.not_found', 404);
  }

  const updated = await prisma.nurse_roster.update({
    where: { id: roster.id },
    data: { status: 'PUBLISHED', published_at: new Date() },
  });

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'nurse_roster',
    entity_id: roster.id,
    tenant_id: roster.tenant_id,
    diff: {
      before: { status: roster.status, published_at: roster.published_at },
      after: { status: updated.status, published_at: updated.published_at },
      metadata: {
        operation: 'PUBLISH_ROSTER',
        notify_staff: notifyStaff,
        allow_partial_publish: allowPartial,
        publish_note: publishNote,
        gaps: workflow.gaps,
      },
    },
    ip_address: ipAddress,
  }).catch(() => {});

  return {
    published_roster: {
      id: updated.id,
      display_id: resolveDisplayId(updated),
      status: updated.status,
      published_at: updated.published_at,
    },
    publish_summary: {
      notify_staff: notifyStaff,
      allow_partial_publish: allowPartial,
      has_unassigned_gaps: hasGaps,
      unassigned_gaps: workflow.gaps,
      coverage: workflow.coverage,
    },
  };
};
const overrideShiftAssignment = async (shiftIdentifier, payload = {}, userId = null, ipAddress = null) => {
  const shiftRecord = await resolveRecordOrThrow({
    model: 'shift',
    identifier: shiftIdentifier,
    where: { deleted_at: null },
    errorKey: 'errors.shift.not_found',
  });

  const staffProfileId = await resolveIdentifierForPayload({
    value: payload.staff_profile_id,
    model: 'staff_profile',
    field: 'staff_profile_id',
    where: { deleted_at: null },
  });

  const reason = normalizeString(payload.reason);

  const assignment = await prisma.$transaction(async (tx) => {
    await tx.shift_assignment.updateMany({
      where: { deleted_at: null, shift_id: shiftRecord.id },
      data: { deleted_at: new Date() },
    });

    return tx.shift_assignment.create({
      data: {
        shift_id: shiftRecord.id,
        staff_profile_id: staffProfileId,
        assigned_at: new Date(),
      },
      include: {
        shift: {
          select: {
            id: true,
            human_friendly_id: true,
            shift_type: true,
            status: true,
            start_time: true,
            end_time: true,
          },
        },
        staff_profile: {
          select: {
            id: true,
            human_friendly_id: true,
            staff_number: true,
          },
        },
      },
    });
  });

  const auditRef = `HR-OVR-${Date.now()}`;

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'shift_assignment',
    entity_id: assignment.id,
    diff: {
      metadata: {
        operation: 'SHIFT_ASSIGNMENT_OVERRIDE',
        reason,
        audit_ref: auditRef,
        shift_id: shiftRecord.id,
        staff_profile_id: staffProfileId,
      },
    },
    ip_address: ipAddress,
  }).catch(() => {});

  return {
    assignment: {
      id: assignment.id,
      display_id: resolveDisplayId(assignment),
      shift_id: assignment.shift_id,
      shift_display_id: resolveDisplayId(assignment.shift || {}),
      staff_profile_id: assignment.staff_profile_id,
      staff_profile_display_id: resolveDisplayId(assignment.staff_profile || {}),
      assigned_at: assignment.assigned_at,
    },
    shift: {
      id: assignment.shift?.id,
      display_id: resolveDisplayId(assignment.shift || {}),
      shift_type: assignment.shift?.shift_type || null,
      status: assignment.shift?.status || null,
      start_time: assignment.shift?.start_time || null,
      end_time: assignment.shift?.end_time || null,
    },
    audit_ref: auditRef,
  };
};

const approveSwap = async (swapIdentifier, payload = {}, userId = null, ipAddress = null) => {
  const swapRecord = await resolveModelRecordByIdentifier({
    model: 'shift_swap_request',
    identifier: swapIdentifier,
    where: { deleted_at: null },
    select: {
      id: true,
      human_friendly_id: true,
      status: true,
      shift_id: true,
      requester_staff_id: true,
      target_staff_id: true,
    },
  });

  if (!swapRecord?.id) {
    throw new HttpError('errors.shift_swap_request.not_found', 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedSwap = await tx.shift_swap_request.update({
      where: { id: swapRecord.id },
      data: { status: 'COMPLETED' },
    });

    const mutations = [];

    if (swapRecord.target_staff_id) {
      const existing = await tx.shift_assignment.findFirst({
        where: {
          deleted_at: null,
          shift_id: swapRecord.shift_id,
          staff_profile_id: swapRecord.requester_staff_id,
        },
      });

      if (existing) {
        const updated = await tx.shift_assignment.update({
          where: { id: existing.id },
          data: { staff_profile_id: swapRecord.target_staff_id },
        });
        mutations.push(updated);
      } else {
        const created = await tx.shift_assignment.create({
          data: {
            shift_id: swapRecord.shift_id,
            staff_profile_id: swapRecord.target_staff_id,
            assigned_at: new Date(),
          },
        });
        mutations.push(created);
      }
    }

    return { updatedSwap, mutations };
  });

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'shift_swap_request',
    entity_id: swapRecord.id,
    diff: {
      metadata: {
        operation: 'SWAP_APPROVE',
        reason: normalizeString(payload.reason) || null,
      },
    },
    ip_address: ipAddress,
  }).catch(() => {});

  return {
    swap: {
      id: result.updatedSwap.id,
      display_id: resolveDisplayId(result.updatedSwap),
      status: result.updatedSwap.status,
    },
    shift_assignments: result.mutations.map((entry) => ({
      id: entry.id,
      display_id: resolveDisplayId(entry),
      shift_id: entry.shift_id,
      staff_profile_id: entry.staff_profile_id,
      assigned_at: entry.assigned_at,
    })),
  };
};

const rejectSwap = async (swapIdentifier, payload = {}, userId = null, ipAddress = null) => {
  const swapRecord = await resolveRecordOrThrow({
    model: 'shift_swap_request',
    identifier: swapIdentifier,
    where: { deleted_at: null },
    errorKey: 'errors.shift_swap_request.not_found',
  });

  const updatedSwap = await prisma.shift_swap_request.update({
    where: { id: swapRecord.id },
    data: { status: 'CANCELLED' },
  });

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'shift_swap_request',
    entity_id: swapRecord.id,
    diff: {
      metadata: {
        operation: 'SWAP_REJECT',
        reason: normalizeString(payload.reason) || null,
      },
    },
    ip_address: ipAddress,
  }).catch(() => {});

  return {
    swap: {
      id: updatedSwap.id,
      display_id: resolveDisplayId(updatedSwap),
      status: updatedSwap.status,
    },
  };
};

const approveLeave = async (leaveIdentifier, payload = {}, userId = null, ipAddress = null) => {
  const leaveRecord = await resolveRecordOrThrow({
    model: 'staff_leave',
    identifier: leaveIdentifier,
    where: { deleted_at: null },
    errorKey: 'errors.staff_leave.not_found',
  });

  const updated = await prisma.staff_leave.update({ where: { id: leaveRecord.id }, data: { status: 'APPROVED' } });

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'staff_leave',
    entity_id: leaveRecord.id,
    diff: {
      metadata: { operation: 'LEAVE_APPROVE', reason: normalizeString(payload.reason) || null },
    },
    ip_address: ipAddress,
  }).catch(() => {});

  return { leave: { id: updated.id, display_id: resolveDisplayId(updated), status: updated.status } };
};

const rejectLeave = async (leaveIdentifier, payload = {}, userId = null, ipAddress = null) => {
  const leaveRecord = await resolveRecordOrThrow({
    model: 'staff_leave',
    identifier: leaveIdentifier,
    where: { deleted_at: null },
    errorKey: 'errors.staff_leave.not_found',
  });

  const updated = await prisma.staff_leave.update({ where: { id: leaveRecord.id }, data: { status: 'REJECTED' } });

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'staff_leave',
    entity_id: leaveRecord.id,
    diff: {
      metadata: { operation: 'LEAVE_REJECT', reason: normalizeString(payload.reason) || null },
    },
    ip_address: ipAddress,
  }).catch(() => {});

  return { leave: { id: updated.id, display_id: resolveDisplayId(updated), status: updated.status } };
};
const buildPayrollProposedItems = async (payrollRunRecord, filters = {}) => {
  const facilityId = await resolveIdentifierForFilter({
    value: filters.facility_id,
    model: 'facility',
    where: { deleted_at: null },
  });
  const departmentId = await resolveIdentifierForFilter({
    value: filters.department_id,
    model: 'department',
    where: { deleted_at: null },
  });

  const assignments = await prisma.shift_assignment.findMany({
    where: {
      deleted_at: null,
      shift: {
        deleted_at: null,
        tenant_id: payrollRunRecord.tenant_id,
        ...(facilityId ? { facility_id: facilityId } : {}),
        start_time: { gte: payrollRunRecord.period_start, lte: payrollRunRecord.period_end },
      },
      ...(departmentId ? { staff_profile: { department_id: departmentId } } : {}),
    },
    include: {
      shift: { select: { start_time: true, end_time: true } },
      staff_profile: {
        select: {
          id: true,
          human_friendly_id: true,
          staff_number: true,
          consultation_fee: true,
          consultation_currency: true,
          user: { select: { first_name: true, last_name: true, email: true } },
        },
      },
    },
  });

  const grouped = new Map();
  for (const assignment of assignments) {
    if (!grouped.has(assignment.staff_profile_id)) {
      grouped.set(assignment.staff_profile_id, {
        profile: assignment.staff_profile,
        totalHours: 0,
        assignmentCount: 0,
      });
    }

    const entry = grouped.get(assignment.staff_profile_id);
    entry.assignmentCount += 1;
    const hours = Math.max(
      0,
      (new Date(assignment.shift.end_time).getTime() - new Date(assignment.shift.start_time).getTime()) / 3600000
    );
    entry.totalHours += hours;
  }

  const proposedItems = Array.from(grouped.values()).map((entry) => {
    const hourlyRate = Number(entry.profile.consultation_fee || 0) || 0;
    const amount = Number((entry.totalHours * hourlyRate).toFixed(2));
    const currency = normalizeString(entry.profile.consultation_currency).toUpperCase() || 'USD';

    return {
      staff_profile_id: entry.profile.id,
      staff_profile_display_id: resolveDisplayId(entry.profile || {}),
      staff_number: entry.profile.staff_number || null,
      staff_name: normalizeString(`${entry.profile.user?.first_name || ''} ${entry.profile.user?.last_name || ''}`) || entry.profile.user?.email || null,
      assignment_count: entry.assignmentCount,
      total_hours: Number(entry.totalHours.toFixed(2)),
      hourly_rate: Number(hourlyRate.toFixed(2)),
      amount,
      currency,
    };
  });

  const totals = proposedItems.reduce(
    (acc, item) => {
      acc.total_amount += Number(item.amount || 0);
      acc.total_hours += Number(item.total_hours || 0);
      acc.staff_count += 1;
      return acc;
    },
    { total_amount: 0, total_hours: 0, staff_count: 0, currency: proposedItems[0]?.currency || 'USD' }
  );

  totals.total_amount = Number(totals.total_amount.toFixed(2));
  totals.total_hours = Number(totals.total_hours.toFixed(2));

  return { proposedItems, totals };
};

const previewPayrollRun = async (payrollRunIdentifier, filters = {}) => {
  const payrollRunRecord = await resolveModelRecordByIdentifier({
    model: 'payroll_run',
    identifier: payrollRunIdentifier,
    where: { deleted_at: null },
    select: { id: true, human_friendly_id: true, tenant_id: true, status: true, period_start: true, period_end: true },
  });

  if (!payrollRunRecord?.id) throw new HttpError('errors.payroll_run.not_found', 404);

  const { proposedItems, totals } = await buildPayrollProposedItems(payrollRunRecord, filters);
  return {
    run_summary: {
      id: payrollRunRecord.id,
      display_id: resolveDisplayId(payrollRunRecord),
      status: payrollRunRecord.status,
      period_start: payrollRunRecord.period_start,
      period_end: payrollRunRecord.period_end,
    },
    proposed_items: proposedItems,
    totals,
  };
};

const processPayrollRun = async (payrollRunIdentifier, payload = {}, userId = null, ipAddress = null) => {
  const payrollRunRecord = await resolveModelRecordByIdentifier({
    model: 'payroll_run',
    identifier: payrollRunIdentifier,
    where: { deleted_at: null },
    select: { id: true, human_friendly_id: true, tenant_id: true, status: true, period_start: true, period_end: true },
  });

  if (!payrollRunRecord?.id) throw new HttpError('errors.payroll_run.not_found', 404);
  if (String(payrollRunRecord.status || '').toUpperCase() === 'PAID') {
    throw new HttpError('errors.hr_workspace.payroll_already_paid', 400);
  }

  const { proposedItems, totals } = await buildPayrollProposedItems(payrollRunRecord, {});
  const replaceExisting = Boolean(payload.replace_existing_items);

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.payroll_item.updateMany({
        where: { deleted_at: null, payroll_run_id: payrollRunRecord.id },
        data: { deleted_at: new Date() },
      });
    }

    for (const item of proposedItems) {
      const existing = await tx.payroll_item.findFirst({
        where: { deleted_at: null, payroll_run_id: payrollRunRecord.id, staff_profile_id: item.staff_profile_id },
      });

      if (existing) {
        await tx.payroll_item.update({ where: { id: existing.id }, data: { amount: String(item.amount.toFixed(2)), currency: item.currency } });
      } else {
        await tx.payroll_item.create({ data: { payroll_run_id: payrollRunRecord.id, staff_profile_id: item.staff_profile_id, amount: String(item.amount.toFixed(2)), currency: item.currency } });
      }
    }

    await tx.payroll_run.update({ where: { id: payrollRunRecord.id }, data: { status: 'PROCESSED' } });
  });

  createAuditLog({
    user_id: userId,
    action: 'UPDATE',
    entity: 'payroll_run',
    entity_id: payrollRunRecord.id,
    tenant_id: payrollRunRecord.tenant_id,
    diff: { metadata: { operation: 'PAYROLL_PROCESS', replace_existing_items: replaceExisting, notes: normalizeString(payload.notes) || null, processed_items: proposedItems.length, totals } },
    ip_address: ipAddress,
  }).catch(() => {});

  return {
    processed_summary: {
      id: payrollRunRecord.id,
      display_id: resolveDisplayId(payrollRunRecord),
      status: 'PROCESSED',
      processed_items: proposedItems.length,
      totals,
    },
    items: proposedItems,
  };
};

const LEGACY_RESOURCE_CONFIG = Object.freeze({
  'staff-positions': { model: 'staff_position', panel: 'staffing', resource: 'staff-positions' },
  'staff-profiles': { model: 'staff_profile', panel: 'staffing', resource: 'staff-profiles' },
  'staff-assignments': { model: 'staff_assignment', panel: 'staffing', resource: 'staff-assignments' },
  'staff-leaves': { model: 'staff_leave', panel: 'staffing', resource: 'staff-leaves' },
  shifts: { model: 'shift', panel: 'shifts', resource: 'shifts' },
  'shift-assignments': { model: 'shift_assignment', panel: 'shifts', resource: 'shift-assignments' },
  'shift-swap-requests': { model: 'shift_swap_request', panel: 'shifts', resource: 'shift-swap-requests' },
  'nurse-rosters': { model: 'nurse_roster', panel: 'roster', resource: 'nurse-rosters' },
  'shift-templates': { model: 'shift_template', panel: 'shifts', resource: 'shift-templates' },
  'roster-day-offs': { model: 'roster_day_off', panel: 'roster', resource: 'roster-day-offs' },
  'staff-availabilities': { model: 'staff_availability', panel: 'staffing', resource: 'staff-availabilities' },
  'payroll-runs': { model: 'payroll_run', panel: 'payroll', resource: 'payroll-runs' },
  'payroll-items': { model: 'payroll_item', panel: 'payroll', resource: 'payroll-items' },
  doctors: { model: 'doctor', panel: 'onboarding', resource: 'doctors' },
});

const resolveLegacyRouteIdentifier = async (resource, id) => {
  const config = LEGACY_RESOURCE_CONFIG[resource];
  if (!config) throw new HttpError('errors.resource.not_found', 404);

  const normalizedIdentifier = normalizeIdentifier(id);
  const record = await resolveModelRecordByIdentifier({
    model: config.model,
    identifier: normalizedIdentifier,
    where: { deleted_at: null },
    select: { id: true, human_friendly_id: true },
  });

  if (!record?.id) throw new HttpError('errors.resource.not_found', 404);

  const displayId = resolvePublicIdentifier(record.human_friendly_id, record.id) || normalizedIdentifier;

  return {
    resource,
    backend_identifier: record.id,
    display_id: displayId,
    matched_by: normalizedIdentifier.toLowerCase() === String(record.id || '').toLowerCase() ? 'uuid' : 'human_friendly_id',
    target_path: `/hr?panel=${encodeURIComponent(config.panel)}&resource=${encodeURIComponent(config.resource)}&legacyId=${encodeURIComponent(displayId)}`,
  };
};

module.exports = {
  getWorkspace,
  getWorkItems,
  getRosterWorkflow,
  generateRosterAssignments,
  publishRoster,
  overrideShiftAssignment,
  approveSwap,
  rejectSwap,
  approveLeave,
  rejectLeave,
  previewPayrollRun,
  processPayrollRun,
  resolveLegacyRouteIdentifier,
};
