import { describe, expect, it } from 'vitest';
import { emptyPlanningDraft, localIdToTempId, type PlanningDraftState } from '../planningDraft';
import { removeShiftFromDraft, upsertShiftInDraft } from './planningShiftDraft';
import type { ShiftForm } from './planningTypes';

const utc = {
  starts_at: '2026-10-01T08:00:00.000Z',
  ends_at: '2026-10-01T12:00:00.000Z',
};

function form(partial: Partial<ShiftForm> & Pick<ShiftForm, 'user_id'>): ShiftForm {
  return {
    starts_at: '2026-10-01T10:00',
    ends_at: '2026-10-01T14:00',
    label: '',
    recurrence: 'once',
    ...partial,
  };
}

describe('planningShiftDraft', () => {
  it('upsertShiftInDraft queues create when no id', () => {
    const next = upsertShiftInDraft(
      emptyPlanningDraft(),
      form({ user_id: 3, label: 'Midi', recurrence: 'weekly' }),
      utc,
      'one'
    );
    expect(next.creates).toHaveLength(1);
    expect(next.creates[0]).toMatchObject({
      user_id: 3,
      label: 'Midi',
      recurrence: 'weekly',
      starts_at: utc.starts_at,
      ends_at: utc.ends_at,
    });
    expect(next.creates[0]?.localId).toMatch(/^c-/);
  });

  it('upsertShiftInDraft queues update for positive id (replacing prior)', () => {
    const prev: PlanningDraftState = {
      creates: [],
      updates: [
        {
          id: 5,
          apply_to: 'one',
          user_id: 1,
          starts_at: utc.starts_at,
          ends_at: utc.ends_at,
        },
      ],
      deletes: [],
    };
    const next = upsertShiftInDraft(prev, form({ id: 5, user_id: 9, label: 'X' }), utc, 'series');
    expect(next.updates).toHaveLength(1);
    expect(next.updates[0]).toMatchObject({
      id: 5,
      apply_to: 'series',
      user_id: 9,
      label: 'X',
    });
  });

  it('upsertShiftInDraft edits pending local create by temp id', () => {
    const localId = 'c-fixed';
    const tempId = localIdToTempId(localId);
    const prev: PlanningDraftState = {
      creates: [
        {
          localId,
          user_id: 1,
          starts_at: utc.starts_at,
          ends_at: utc.ends_at,
          recurrence: 'once',
        },
      ],
      updates: [],
      deletes: [],
    };
    const next = upsertShiftInDraft(
      prev,
      form({ id: tempId, user_id: 4, label: 'Edited' }),
      {
        starts_at: '2026-10-02T08:00:00.000Z',
        ends_at: '2026-10-02T10:00:00.000Z',
      },
      'one'
    );
    expect(next.creates).toHaveLength(1);
    expect(next.creates[0]).toMatchObject({
      localId,
      user_id: 4,
      label: 'Edited',
      starts_at: '2026-10-02T08:00:00.000Z',
    });
  });

  it('removeShiftFromDraft drops local create or queues delete', () => {
    const localId = 'c-rm';
    const tempId = localIdToTempId(localId);
    const withCreate: PlanningDraftState = {
      creates: [
        {
          localId,
          user_id: 1,
          starts_at: utc.starts_at,
          ends_at: utc.ends_at,
          recurrence: 'once',
        },
      ],
      updates: [],
      deletes: [],
    };
    expect(removeShiftFromDraft(withCreate, tempId, 'one').creates).toEqual([]);

    const withUpdate: PlanningDraftState = {
      creates: [],
      updates: [
        {
          id: 8,
          apply_to: 'one',
          user_id: 1,
          starts_at: utc.starts_at,
          ends_at: utc.ends_at,
        },
      ],
      deletes: [],
    };
    const next = removeShiftFromDraft(withUpdate, 8, 'series');
    expect(next.updates).toEqual([]);
    expect(next.deletes).toEqual([{ id: 8, apply_to: 'series' }]);
  });
});
