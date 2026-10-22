/**
 * Pure draft mutations for shift edits — kept React-free so they are unit-testable.
 */

import { localIdToTempId, type PlanningDraftState } from '../planningDraft';
import type { ApplyTo, ShiftForm } from './planningTypes';

type UtcRange = { starts_at: string; ends_at: string };

function newLocalId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Positive id → queue an update; negative id → edit a pending local create;
 * no id → queue a new create.
 */
export function upsertShiftInDraft(
  prev: PlanningDraftState,
  form: ShiftForm,
  utc: UtcRange,
  applyTo: ApplyTo
): PlanningDraftState {
  const label = form.label || undefined;
  const id = form.id;
  if (id != null && id > 0) {
    const updates = prev.updates.filter((u) => u.id !== id);
    updates.push({
      id,
      apply_to: applyTo,
      user_id: form.user_id,
      starts_at: utc.starts_at,
      ends_at: utc.ends_at,
      label,
    });
    return { ...prev, updates };
  }
  if (id != null && id < 0) {
    return {
      ...prev,
      creates: prev.creates.map((c) =>
        localIdToTempId(c.localId) === id
          ? { ...c, user_id: form.user_id, starts_at: utc.starts_at, ends_at: utc.ends_at, label }
          : c
      ),
    };
  }
  return {
    ...prev,
    creates: [
      ...prev.creates,
      {
        localId: newLocalId(),
        user_id: form.user_id,
        starts_at: utc.starts_at,
        ends_at: utc.ends_at,
        label,
        recurrence: form.recurrence || 'once',
      },
    ],
  };
}

/** Negative id → drop the local create; otherwise queue a delete (and drop any pending update). */
export function removeShiftFromDraft(
  prev: PlanningDraftState,
  id: number,
  applyTo: ApplyTo
): PlanningDraftState {
  if (id < 0) {
    return {
      ...prev,
      creates: prev.creates.filter((c) => localIdToTempId(c.localId) !== id),
    };
  }
  const updates = prev.updates.filter((u) => u.id !== id);
  const deletes = prev.deletes.filter((d) => d.id !== id);
  deletes.push({ id, apply_to: applyTo });
  return { ...prev, updates, deletes };
}
