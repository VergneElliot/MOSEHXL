import type { StaffShift, StaffShiftPatch } from './staffShiftTypes';

export const STAFF_SHIFT_UPDATE_SQL = `UPDATE staff_shifts SET
         user_id = $3,
         starts_at = $4,
         ends_at = $5,
         label = $6,
         note = $7,
         approval_status = $8,
         confirmation_token = $9,
         decline_reason = $10,
         updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2
       RETURNING *`;

/** Patch semantics: undefined keeps the existing value, null clears nullable columns. */
export function staffShiftUpdateValues(
  establishmentId: string,
  id: number,
  patch: StaffShiftPatch,
  existing: StaffShift
): unknown[] {
  return [
    establishmentId,
    id,
    patch.user_id ?? existing.user_id,
    patch.starts_at ?? existing.starts_at,
    patch.ends_at ?? existing.ends_at,
    patch.label !== undefined ? patch.label : existing.label,
    patch.note !== undefined ? patch.note : existing.note,
    patch.approval_status ?? existing.approval_status,
    patch.confirmation_token !== undefined
      ? patch.confirmation_token
      : existing.confirmation_token,
    patch.decline_reason !== undefined
      ? patch.decline_reason
      : existing.decline_reason ?? null,
  ];
}
