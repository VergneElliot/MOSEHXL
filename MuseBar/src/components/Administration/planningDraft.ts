/**
 * Local draft queue for planning edits — flushed via /admin/planning/shifts/commit.
 */

export type PlanningDraftCreate = {
  localId: string;
  user_id: number;
  starts_at: string; // UTC ISO
  ends_at: string;
  label?: string;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
};

export type PlanningDraftUpdate = {
  id: number;
  apply_to: 'one' | 'series';
  user_id: number;
  starts_at: string;
  ends_at: string;
  label?: string;
};

export type PlanningDraftDelete = {
  id: number;
  apply_to: 'one' | 'series';
};

export type PlanningDraftState = {
  creates: PlanningDraftCreate[];
  updates: PlanningDraftUpdate[];
  deletes: PlanningDraftDelete[];
};

export const emptyPlanningDraft = (): PlanningDraftState => ({
  creates: [],
  updates: [],
  deletes: [],
});

export function planningDraftIsDirty(draft: PlanningDraftState): boolean {
  return draft.creates.length + draft.updates.length + draft.deletes.length > 0;
}

export function planningDraftCount(draft: PlanningDraftState): number {
  return draft.creates.length + draft.updates.length + draft.deletes.length;
}

/** Module flag so AdministrationContainer can prompt before leaving the tab. */
let planningUiDirty = false;

export function setPlanningUiDirty(dirty: boolean): void {
  planningUiDirty = dirty;
}

export function isPlanningUiDirty(): boolean {
  return planningUiDirty;
}

/** Merge server shifts with local draft for display. */
export function applyPlanningDraftToShifts<
  T extends {
    id: number;
    user_id: number;
    starts_at: string;
    ends_at: string;
    label: string | null;
    series_id?: string | null;
    recurrence?: string;
    approval_status?: string;
  },
>(serverShifts: T[], draft: PlanningDraftState): Array<T & { _draft?: boolean }> {
  const deletedIds = new Set<number>();
  const deletedSeries = new Set<string>();
  for (const d of draft.deletes) {
    if (d.apply_to === 'series') {
      const anchor = serverShifts.find((s) => s.id === d.id);
      if (anchor?.series_id) deletedSeries.add(anchor.series_id);
      else deletedIds.add(d.id);
    } else {
      deletedIds.add(d.id);
    }
  }

  let list: Array<T & { _draft?: boolean }> = serverShifts
    .filter((s) => !deletedIds.has(s.id) && !(s.series_id && deletedSeries.has(s.series_id)))
    .map((s) => ({ ...s }));

  for (const u of draft.updates) {
    if (u.apply_to === 'series') {
      const anchor = list.find((s) => s.id === u.id);
      if (!anchor?.series_id) {
        list = list.map((s) =>
          s.id === u.id
            ? {
                ...s,
                user_id: u.user_id,
                starts_at: u.starts_at,
                ends_at: u.ends_at,
                label: u.label ?? null,
                _draft: true,
                approval_status: 'pending_employee',
              }
            : s
        );
      } else {
        const oldStart = new Date(anchor.starts_at).getTime();
        const oldEnd = new Date(anchor.ends_at).getTime();
        const newStart = new Date(u.starts_at).getTime();
        const newEnd = new Date(u.ends_at).getTime();
        const startDelta = newStart - oldStart;
        const duration = newEnd - newStart;
        const seriesId = anchor.series_id;
        list = list.map((s) => {
          if (s.series_id !== seriesId) return s;
          const starts = new Date(new Date(s.starts_at).getTime() + startDelta).toISOString();
          const ends = new Date(new Date(starts).getTime() + duration).toISOString();
          return {
            ...s,
            user_id: u.user_id,
            starts_at: starts,
            ends_at: ends,
            label: u.label ?? null,
            _draft: true,
            approval_status: 'pending_employee',
          };
        });
      }
    } else {
      list = list.map((s) =>
        s.id === u.id
          ? {
              ...s,
              user_id: u.user_id,
              starts_at: u.starts_at,
              ends_at: u.ends_at,
              label: u.label ?? null,
              _draft: true,
              approval_status: 'pending_employee',
            }
          : s
      );
    }
  }

  for (const c of draft.creates) {
    list.push({
      ...(serverShifts[0] || ({} as T)),
      id: localIdToTempId(c.localId),
      user_id: c.user_id,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      label: c.label ?? null,
      series_id: null,
      recurrence: c.recurrence,
      approval_status: 'pending_employee',
      _draft: true,
    } as T & { _draft?: boolean });
  }

  return list;
}

function hashLocalId(localId: string): number {
  let h = 0;
  for (let i = 0; i < localId.length; i += 1) {
    h = (h * 31 + localId.charCodeAt(i)) | 0;
  }
  return h === 0 ? 1 : h;
}

export function localIdToTempId(localId: string): number {
  return -Math.abs(hashLocalId(localId));
}

