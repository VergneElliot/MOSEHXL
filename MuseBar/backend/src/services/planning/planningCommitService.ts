/**
 * Apply a batch of planning create/update/delete ops, then open confirmation
 * batches (one per employee) and send summary emails.
 */

import { StaffShiftModel, isValidRecurrence, type StaffShift } from '../../models/staffShift';
import { StaffShiftConfirmationModel } from '../../models/staffShiftConfirmation';
import { StaffLeaveModel } from '../../models/staffLeave';
import { UserModel } from '../../models/user';
import { pool } from '../../db/pool';
import { shiftOverlapsApprovedLeave } from '../labor/laborCompliance';
import { notifyEmployeePlanningBatch } from './planningEmailService';
import { AppError, ValidationError } from '../../middleware/errorHandler';

export type CommitCreateOp = {
  user_id: number;
  starts_at: string;
  ends_at: string;
  label?: string | null;
  note?: string | null;
  recurrence?: string;
};

export type CommitUpdateOp = {
  id: number;
  apply_to?: 'one' | 'series';
  user_id?: number;
  starts_at?: string;
  ends_at?: string;
  label?: string | null;
  note?: string | null;
};

export type CommitDeleteOp = {
  id: number;
  apply_to?: 'one' | 'series';
};

type PendingItemSeed = {
  user_id: number;
  shift_id: number | null;
  change_type: 'create' | 'update' | 'delete';
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  previous_starts_at?: string | null;
  previous_ends_at?: string | null;
  previous_label?: string | null;
};

async function assertNoLeaveOverlap(
  establishmentId: string,
  userId: number,
  startsAt: string,
  endsAt: string
): Promise<void> {
  const approvedLeaves = await StaffLeaveModel.listApprovedForRange(
    establishmentId,
    startsAt,
    endsAt
  );
  const leaveSpans = approvedLeaves.map((l) => ({
    user_id: l.user_id,
    starts_on: l.starts_on,
    ends_on: l.ends_on,
    half_day_start: l.half_day_start,
    half_day_end: l.half_day_end,
    status: l.status,
    leave_type: l.leave_type,
  }));
  const overlap = shiftOverlapsApprovedLeave(
    new Date(startsAt),
    new Date(endsAt),
    leaveSpans,
    userId
  );
  if (overlap) {
    throw new AppError(
      `Impossible de planifier : congé approuvé (${overlap.leave_type}) du ${overlap.starts_on} au ${overlap.ends_on}.`,
      409,
      'SHIFT_ON_APPROVED_LEAVE'
    );
  }
}

export async function commitPlanningChanges(opts: {
  establishmentId: string;
  actorUserId: number | null;
  creates?: CommitCreateOp[];
  updates?: CommitUpdateOp[];
  deletes?: CommitDeleteOp[];
}): Promise<{
  created_count: number;
  updated_count: number;
  deleted_count: number;
  emails_queued: number;
  batches: Array<{ user_id: number; token: string; item_count: number }>;
}> {
  const creates = opts.creates || [];
  const updates = opts.updates || [];
  const deletes = opts.deletes || [];
  if (creates.length + updates.length + deletes.length === 0) {
    throw new ValidationError('Aucune modification à enregistrer');
  }

  const itemSeeds: PendingItemSeed[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;

  // Deletes first so updates/creates do not fight removed rows.
  for (const op of deletes) {
    const existing = await StaffShiftModel.getById(opts.establishmentId, op.id);
    if (!existing) continue;
    const applyTo = op.apply_to === 'series' ? 'series' : 'one';
    if (applyTo === 'series' && existing.series_id) {
      const siblings = await StaffShiftModel.listBySeries(
        opts.establishmentId,
        existing.series_id
      );
      const n = await StaffShiftModel.deleteSeries(opts.establishmentId, existing.series_id);
      deletedCount += n;
      for (const s of siblings) {
        itemSeeds.push({
          user_id: s.user_id,
          shift_id: null,
          change_type: 'delete',
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          label: s.label,
        });
      }
    } else {
      await StaffShiftModel.delete(opts.establishmentId, op.id);
      deletedCount += 1;
      itemSeeds.push({
        user_id: existing.user_id,
        shift_id: null,
        change_type: 'delete',
        starts_at: existing.starts_at,
        ends_at: existing.ends_at,
        label: existing.label,
      });
    }
  }

  for (const op of updates) {
    const existing = await StaffShiftModel.getById(opts.establishmentId, op.id);
    if (!existing) throw new ValidationError(`Vacation #${op.id} introuvable`);
    const applyTo = op.apply_to === 'series' ? 'series' : 'one';
    const nextStarts = op.starts_at ?? existing.starts_at;
    const nextEnds = op.ends_at ?? existing.ends_at;
    const nextUser = op.user_id ?? existing.user_id;
    if (new Date(nextEnds) <= new Date(nextStarts)) {
      throw new ValidationError('ends_at must be after starts_at');
    }
    const belongs = await UserModel.userBelongsToEstablishment(nextUser, opts.establishmentId);
    if (!belongs) throw new ValidationError('Employé introuvable dans cet établissement');
    await assertNoLeaveOverlap(opts.establishmentId, nextUser, nextStarts, nextEnds);

    if (applyTo === 'series' && existing.series_id) {
      const before = await StaffShiftModel.listBySeries(
        opts.establishmentId,
        existing.series_id
      );
      const { updated } = await StaffShiftModel.updateSeriesFromAnchor(
        opts.establishmentId,
        op.id,
        {
          user_id: op.user_id,
          starts_at: op.starts_at,
          ends_at: op.ends_at,
          label: op.label,
          note: op.note,
        }
      );
      updatedCount += updated.length;
      const byId = new Map(before.map((s) => [s.id, s]));
      for (const s of updated) {
        const prev = byId.get(s.id);
        itemSeeds.push({
          user_id: s.user_id,
          shift_id: s.id,
          change_type: 'update',
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          label: s.label,
          previous_starts_at: prev?.starts_at ?? null,
          previous_ends_at: prev?.ends_at ?? null,
          previous_label: prev?.label ?? null,
        });
      }
    } else {
      const updated = await StaffShiftModel.update(opts.establishmentId, op.id, {
        user_id: op.user_id,
        starts_at: op.starts_at,
        ends_at: op.ends_at,
        label: op.label,
        note: op.note,
      });
      if (!updated) throw new ValidationError(`Vacation #${op.id} introuvable`);
      updatedCount += 1;
      itemSeeds.push({
        user_id: updated.user_id,
        shift_id: updated.id,
        change_type: 'update',
        starts_at: updated.starts_at,
        ends_at: updated.ends_at,
        label: updated.label,
        previous_starts_at: existing.starts_at,
        previous_ends_at: existing.ends_at,
        previous_label: existing.label,
      });
    }
  }

  for (const op of creates) {
    if (!Number.isFinite(op.user_id)) throw new ValidationError('user_id requis');
    if (!op.starts_at || !op.ends_at) throw new ValidationError('starts_at et ends_at requis');
    if (new Date(op.ends_at) <= new Date(op.starts_at)) {
      throw new ValidationError('ends_at must be after starts_at');
    }
    const recurrenceRaw = String(op.recurrence || 'once');
    if (!isValidRecurrence(recurrenceRaw)) throw new ValidationError('Fréquence invalide');
    const belongs = await UserModel.userBelongsToEstablishment(op.user_id, opts.establishmentId);
    if (!belongs) throw new ValidationError('Employé introuvable dans cet établissement');
    await assertNoLeaveOverlap(opts.establishmentId, op.user_id, op.starts_at, op.ends_at);

    const created = await StaffShiftModel.createSeries({
      establishment_id: opts.establishmentId,
      user_id: op.user_id,
      starts_at: op.starts_at,
      ends_at: op.ends_at,
      label: op.label ?? null,
      note: op.note ?? null,
      created_by: opts.actorUserId,
      recurrence: recurrenceRaw,
      requireEmployeeConfirmation: true,
    });
    createdCount += created.shifts.length;
    for (const s of created.shifts) {
      itemSeeds.push({
        user_id: s.user_id,
        shift_id: s.id,
        change_type: 'create',
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        label: s.label,
      });
    }
  }

  // Group by employee → one batch + email
  const byUser = new Map<number, PendingItemSeed[]>();
  for (const seed of itemSeeds) {
    const list = byUser.get(seed.user_id) || [];
    list.push(seed);
    byUser.set(seed.user_id, list);
  }

  const est = await pool.query(`SELECT name FROM establishments WHERE id = $1`, [
    opts.establishmentId,
  ]);
  const establishmentName = String(est.rows[0]?.name || '');
  const batches: Array<{ user_id: number; token: string; item_count: number }> = [];
  let emailsQueued = 0;

  for (const [userId, seeds] of byUser) {
    const batch = await StaffShiftConfirmationModel.createBatch(opts.establishmentId, userId);
    const items = [];
    for (const seed of seeds) {
      const item = await StaffShiftConfirmationModel.addItem({
        batch_id: batch.id,
        shift_id: seed.shift_id,
        change_type: seed.change_type,
        starts_at: seed.starts_at,
        ends_at: seed.ends_at,
        label: seed.label,
        previous_starts_at: seed.previous_starts_at,
        previous_ends_at: seed.previous_ends_at,
        previous_label: seed.previous_label,
        decision: seed.change_type === 'delete' ? 'confirmed' : 'pending',
      });
      items.push(item);

      if (seed.shift_id != null && seed.change_type !== 'delete') {
        await StaffShiftModel.update(opts.establishmentId, seed.shift_id, {
          approval_status: 'pending_employee',
          confirmation_token: batch.token,
          decline_reason: null,
        });
      }
    }

    const employee = await UserModel.findById(userId);
    if (employee?.email) {
      const employeeName =
        `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
      void notifyEmployeePlanningBatch({
        employeeEmail: employee.email,
        employeeName,
        establishmentName,
        token: batch.token,
        items,
      });
      emailsQueued += 1;
    }

    batches.push({ user_id: userId, token: batch.token, item_count: items.length });
  }

  return {
    created_count: createdCount,
    updated_count: updatedCount,
    deleted_count: deletedCount,
    emails_queued: emailsQueued,
    batches,
  };
}

export type { StaffShift };
