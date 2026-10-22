import { describe, expect, it } from 'vitest';
import {
  applyPlanningDraftToShifts,
  emptyPlanningDraft,
  isPlanningUiDirty,
  localIdToTempId,
  planningDraftCount,
  planningDraftIsDirty,
  setPlanningUiDirty,
  type PlanningDraftState,
} from './planningDraft';

type Shift = {
  id: number;
  user_id: number;
  starts_at: string;
  ends_at: string;
  label: string | null;
  series_id?: string | null;
  recurrence?: string;
  approval_status?: string;
};

function shift(partial: Partial<Shift> & Pick<Shift, 'id'>): Shift {
  return {
    user_id: 1,
    starts_at: '2026-10-01T08:00:00.000Z',
    ends_at: '2026-10-01T12:00:00.000Z',
    label: null,
    series_id: null,
    ...partial,
  };
}

describe('planningDraft', () => {
  it('emptyPlanningDraft / dirty / count', () => {
    const empty = emptyPlanningDraft();
    expect(empty).toEqual({ creates: [], updates: [], deletes: [] });
    expect(planningDraftIsDirty(empty)).toBe(false);
    expect(planningDraftCount(empty)).toBe(0);

    const dirty: PlanningDraftState = {
      creates: [
        {
          localId: 'c-1',
          user_id: 1,
          starts_at: '2026-10-01T08:00:00.000Z',
          ends_at: '2026-10-01T12:00:00.000Z',
          recurrence: 'once',
        },
      ],
      updates: [],
      deletes: [{ id: 9, apply_to: 'one' }],
    };
    expect(planningDraftIsDirty(dirty)).toBe(true);
    expect(planningDraftCount(dirty)).toBe(2);
  });

  it('setPlanningUiDirty / isPlanningUiDirty module flag', () => {
    setPlanningUiDirty(true);
    expect(isPlanningUiDirty()).toBe(true);
    setPlanningUiDirty(false);
    expect(isPlanningUiDirty()).toBe(false);
  });

  it('localIdToTempId is stable negative hash', () => {
    const a = localIdToTempId('c-abc');
    expect(a).toBeLessThan(0);
    expect(localIdToTempId('c-abc')).toBe(a);
    expect(localIdToTempId('other')).not.toBe(a);
  });

  it('applyPlanningDraftToShifts deletes one and series', () => {
    const server = [
      shift({ id: 1, series_id: 's1' }),
      shift({ id: 2, series_id: 's1' }),
      shift({ id: 3 }),
    ];
    const draft: PlanningDraftState = {
      creates: [],
      updates: [],
      deletes: [
        { id: 3, apply_to: 'one' },
        { id: 1, apply_to: 'series' },
      ],
    };
    expect(applyPlanningDraftToShifts(server, draft).map((s) => s.id)).toEqual([]);
  });

  it('applyPlanningDraftToShifts updates one occurrence', () => {
    const server = [shift({ id: 1, label: 'Old' })];
    const draft: PlanningDraftState = {
      creates: [],
      updates: [
        {
          id: 1,
          apply_to: 'one',
          user_id: 2,
          starts_at: '2026-10-02T09:00:00.000Z',
          ends_at: '2026-10-02T13:00:00.000Z',
          label: 'New',
        },
      ],
      deletes: [],
    };
    const next = applyPlanningDraftToShifts(server, draft);
    expect(next[0]).toMatchObject({
      id: 1,
      user_id: 2,
      label: 'New',
      _draft: true,
      approval_status: 'pending_employee',
    });
  });

  it('applyPlanningDraftToShifts shifts series by start delta', () => {
    const server = [
      shift({
        id: 1,
        series_id: 's1',
        starts_at: '2026-10-01T08:00:00.000Z',
        ends_at: '2026-10-01T12:00:00.000Z',
      }),
      shift({
        id: 2,
        series_id: 's1',
        starts_at: '2026-10-08T08:00:00.000Z',
        ends_at: '2026-10-08T12:00:00.000Z',
      }),
    ];
    const draft: PlanningDraftState = {
      creates: [],
      updates: [
        {
          id: 1,
          apply_to: 'series',
          user_id: 1,
          starts_at: '2026-10-01T09:00:00.000Z',
          ends_at: '2026-10-01T14:00:00.000Z',
          label: 'Late',
        },
      ],
      deletes: [],
    };
    const next = applyPlanningDraftToShifts(server, draft);
    expect(next[0]?.starts_at).toBe('2026-10-01T09:00:00.000Z');
    expect(next[0]?.ends_at).toBe('2026-10-01T14:00:00.000Z');
    expect(next[1]?.starts_at).toBe('2026-10-08T09:00:00.000Z');
    expect(next[1]?.ends_at).toBe('2026-10-08T14:00:00.000Z');
  });

  it('applyPlanningDraftToShifts appends creates with temp ids', () => {
    const draft: PlanningDraftState = {
      creates: [
        {
          localId: 'local-x',
          user_id: 7,
          starts_at: '2026-10-03T10:00:00.000Z',
          ends_at: '2026-10-03T11:00:00.000Z',
          label: 'Extra',
          recurrence: 'weekly',
        },
      ],
      updates: [],
      deletes: [],
    };
    const next = applyPlanningDraftToShifts([], draft);
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe(localIdToTempId('local-x'));
    expect(next[0]?.user_id).toBe(7);
    expect(next[0]?._draft).toBe(true);
  });
});
