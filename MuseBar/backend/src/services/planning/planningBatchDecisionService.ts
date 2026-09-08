/**
 * Apply employee confirm/decline decisions on planning confirmation batches.
 */

import { StaffShiftModel } from '../../models/staffShift';
import { StaffShiftConfirmationModel } from '../../models/staffShiftConfirmation';
import { ValidationError } from '../../middleware/errorHandler';

export async function applyPlanningBatchDecisions(opts: {
  token: string;
  decisions: Array<{
    item_id: string;
    action: 'confirm' | 'decline';
    reason?: string | null;
  }>;
}): Promise<{ updated_count: number; already_processed: boolean }> {
  const found = await StaffShiftConfirmationModel.findByToken(opts.token);
  if (!found) {
    // Legacy: confirmation_token on shifts only
    return { updated_count: 0, already_processed: false };
  }

  const { batch, items } = found;
  const byId = new Map(items.map((i) => [i.id, i]));
  let updated = 0;

  for (const d of opts.decisions) {
    const item = byId.get(d.item_id);
    if (!item || item.change_type === 'delete' || item.decision !== 'pending') continue;
    const reason =
      d.action === 'decline'
        ? String(d.reason || '').trim() || null
        : null;
    if (d.action === 'decline' && !reason) {
      throw new ValidationError('Un motif est requis pour refuser une modification');
    }

    const saved = await StaffShiftConfirmationModel.setItemDecisionWithBypass(
      item.id,
      d.action === 'confirm' ? 'confirmed' : 'declined',
      reason
    );
    if (!saved) continue;
    updated += 1;

    if (item.shift_id == null) continue;

    if (d.action === 'confirm') {
      await StaffShiftModel.updateWithBypass(batch.establishment_id, item.shift_id, {
        approval_status: 'confirmed',
        confirmation_token: null,
        decline_reason: null,
      });
    } else if (item.change_type === 'create') {
      await StaffShiftModel.updateWithBypass(batch.establishment_id, item.shift_id, {
        approval_status: 'declined',
        confirmation_token: null,
        decline_reason: reason,
      });
    } else {
      // update declined → restore previous snapshot
      await StaffShiftModel.updateWithBypass(batch.establishment_id, item.shift_id, {
        starts_at: item.previous_starts_at || undefined,
        ends_at: item.previous_ends_at || undefined,
        label: item.previous_label,
        approval_status: 'confirmed',
        confirmation_token: null,
        decline_reason: reason,
      });
    }
  }

  await StaffShiftConfirmationModel.closeBatchIfDoneWithBypass(batch.id);
  return { updated_count: updated, already_processed: updated === 0 };
}

/** Confirm or decline every pending (non-delete) item in a batch. */
export async function applyPlanningBatchAll(
  token: string,
  action: 'confirm' | 'decline',
  reason?: string | null
): Promise<{ updated_count: number; already_processed: boolean }> {
  const found = await StaffShiftConfirmationModel.findByToken(token);
  if (!found) return { updated_count: 0, already_processed: false };
  const pending = found.items.filter(
    (i) => i.decision === 'pending' && i.change_type !== 'delete'
  );
  if (action === 'decline' && !String(reason || '').trim()) {
    throw new ValidationError('Un motif est requis pour tout refuser');
  }
  return applyPlanningBatchDecisions({
    token,
    decisions: pending.map((i) => ({
      item_id: i.id,
      action,
      reason: action === 'decline' ? reason : null,
    })),
  });
}
