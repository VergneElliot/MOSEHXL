import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveReservationEdit } from './saveReservationEdit';

const createReservation = vi.fn();
const updateReservation = vi.fn();

vi.mock('../../services/api/adminSpace', () => ({
  createReservation: (...args: unknown[]) => createReservation(...args),
  updateReservation: (...args: unknown[]) => updateReservation(...args),
}));

vi.mock('../../utils/formatDate', () => ({
  parisDateTimeLocalToUtcIso: (local: string) => `utc:${local}`,
}));

describe('saveReservationEdit', () => {
  beforeEach(() => {
    createReservation.mockReset();
    updateReservation.mockReset();
  });

  it('rejects missing required fields', async () => {
    await expect(saveReservationEdit({ customer_name: 'A' })).rejects.toThrow(/requis/);
  });

  it('creates a reservation and converts local datetime', async () => {
    createReservation.mockResolvedValue({ reservation: { id: 1 } });
    await expect(
      saveReservationEdit({
        customer_name: 'Alice',
        starts_at: '2026-10-14T19:00',
        party_size: 2,
        customer_email: 'a@b.c',
      })
    ).resolves.toEqual({ emailWarning: null });
    expect(createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: 'Alice',
        starts_at: 'utc:2026-10-14T19:00',
        party_size: 2,
        status: 'requested',
      })
    );
  });

  it('updates and surfaces guest email delivery failures', async () => {
    updateReservation.mockResolvedValue({
      reservation: { id: 9 },
      guest_email_delivery: { sent: false, to: 'a@b.c', error: 'smtp_down' },
    });
    const result = await saveReservationEdit({
      id: 9,
      customer_name: 'Alice',
      starts_at: '2026-10-14T19:00:00.000Z',
      party_size: 3,
    });
    expect(result.emailWarning).toContain('smtp_down');
    expect(updateReservation).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ starts_at: 'utc:2026-10-14T19:00:00.000Z' })
    );
  });

  it('ignores benign guest email skip reasons', async () => {
    updateReservation.mockResolvedValue({
      reservation: { id: 9 },
      guest_email_delivery: { sent: false, to: null, error: 'status_unchanged' },
    });
    await expect(
      saveReservationEdit({
        id: 9,
        customer_name: 'Alice',
        starts_at: '2026-10-14T19:00:00.000Z',
        party_size: 2,
      })
    ).resolves.toEqual({ emailWarning: null });
  });
});
