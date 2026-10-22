import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../middleware/errorHandler';

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  delete: vi.fn(),
  deleteSeries: vi.fn(),
  listBySeries: vi.fn(),
  update: vi.fn(),
  updateSeriesFromAnchor: vi.fn(),
  createSeries: vi.fn(),
  createBatch: vi.fn(),
  addItem: vi.fn(),
  listApprovedForRange: vi.fn(),
  userBelongs: vi.fn(),
  findById: vi.fn(),
  poolQuery: vi.fn(),
  notify: vi.fn(),
  isValidRecurrence: vi.fn((v: string) => ['once', 'weekly'].includes(v)),
}));

vi.mock('../../models/staffShift', () => ({
  StaffShiftModel: {
    getById: mocks.getById,
    delete: mocks.delete,
    deleteSeries: mocks.deleteSeries,
    listBySeries: mocks.listBySeries,
    update: mocks.update,
    updateSeriesFromAnchor: mocks.updateSeriesFromAnchor,
    createSeries: mocks.createSeries,
  },
  isValidRecurrence: mocks.isValidRecurrence,
}));

vi.mock('../../models/staffShiftConfirmation', () => ({
  StaffShiftConfirmationModel: {
    createBatch: mocks.createBatch,
    addItem: mocks.addItem,
  },
}));

vi.mock('../../models/staffLeave', () => ({
  StaffLeaveModel: {
    listApprovedForRange: mocks.listApprovedForRange,
  },
}));

vi.mock('../../models/user', () => ({
  UserModel: {
    userBelongsToEstablishment: mocks.userBelongs,
    findById: mocks.findById,
  },
}));

vi.mock('../../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('./planningEmailService', () => ({
  notifyEmployeePlanningBatch: mocks.notify,
}));

import { commitPlanningChanges } from './planningCommitService';

const EST = 'est-plan-1';

describe('commitPlanningChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listApprovedForRange.mockResolvedValue([]);
    mocks.userBelongs.mockResolvedValue(true);
    mocks.poolQuery.mockResolvedValue({ rows: [{ name: 'Le Bar' }] });
    mocks.createBatch.mockResolvedValue({ id: 1, token: 'tok-1' });
    mocks.addItem.mockImplementation(async (item: { change_type: string }) => ({
      ...item,
      id: 99,
    }));
    mocks.findById.mockResolvedValue({
      email: 'a@example.com',
      first_name: 'Ann',
      last_name: 'Lee',
    });
  });

  it('rejects empty change sets', async () => {
    await expect(
      commitPlanningChanges({ establishmentId: EST, actorUserId: 1 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('creates a once shift, opens a confirmation batch, and queues email', async () => {
    mocks.createSeries.mockResolvedValue({
      shifts: [
        {
          id: 10,
          user_id: 5,
          starts_at: '2026-09-01T10:00:00.000Z',
          ends_at: '2026-09-01T18:00:00.000Z',
          label: 'Service',
        },
      ],
    });
    mocks.update.mockResolvedValue({});

    const result = await commitPlanningChanges({
      establishmentId: EST,
      actorUserId: 1,
      creates: [
        {
          user_id: 5,
          starts_at: '2026-09-01T10:00:00.000Z',
          ends_at: '2026-09-01T18:00:00.000Z',
          label: 'Service',
          recurrence: 'once',
        },
      ],
    });

    expect(result.created_count).toBe(1);
    expect(result.emails_queued).toBe(1);
    expect(result.batches).toEqual([{ user_id: 5, token: 'tok-1', item_count: 1 }]);
    expect(mocks.notify).toHaveBeenCalled();
  });

  it('rejects create when ends_at is not after starts_at', async () => {
    await expect(
      commitPlanningChanges({
        establishmentId: EST,
        actorUserId: 1,
        creates: [
          {
            user_id: 5,
            starts_at: '2026-09-01T18:00:00.000Z',
            ends_at: '2026-09-01T10:00:00.000Z',
          },
        ],
      })
    ).rejects.toThrow('ends_at must be after starts_at');
  });

  it('rejects create when employee is on approved leave', async () => {
    mocks.listApprovedForRange.mockResolvedValue([
      {
        user_id: 5,
        starts_on: '2026-09-01',
        ends_on: '2026-09-02',
        half_day_start: false,
        half_day_end: false,
        status: 'approved',
        leave_type: 'paid_leave',
      },
    ]);

    await expect(
      commitPlanningChanges({
        establishmentId: EST,
        actorUserId: 1,
        creates: [
          {
            user_id: 5,
            starts_at: '2026-09-01T10:00:00.000Z',
            ends_at: '2026-09-01T18:00:00.000Z',
          },
        ],
      })
    ).rejects.toMatchObject({ errorCode: 'SHIFT_ON_APPROVED_LEAVE', statusCode: 409 });
  });

  it('deletes a single shift and seeds a delete confirmation item', async () => {
    mocks.getById.mockResolvedValue({
      id: 8,
      user_id: 3,
      starts_at: '2026-09-01T10:00:00.000Z',
      ends_at: '2026-09-01T12:00:00.000Z',
      label: 'Midi',
      series_id: null,
    });
    mocks.delete.mockResolvedValue(true);

    const result = await commitPlanningChanges({
      establishmentId: EST,
      actorUserId: 1,
      deletes: [{ id: 8 }],
    });

    expect(result.deleted_count).toBe(1);
    expect(mocks.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ change_type: 'delete', decision: 'confirmed' })
    );
  });
});
