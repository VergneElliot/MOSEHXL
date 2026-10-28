import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  emit: vi.fn(),
}));

vi.mock('../../models/notifications', () => ({
  NotificationModel: { emit: mocks.emit },
}));

import { emitInboxNotification } from './emitInboxNotification';

describe('emitInboxNotification', () => {
  beforeEach(() => {
    mocks.emit.mockReset();
    mocks.emit.mockResolvedValue(42);
  });

  it('emits inbox_message with access_inbox for plain mail', async () => {
    await emitInboxNotification({
      establishmentId: 'est',
      messageId: 9,
      subject: 'Hello',
    });
    expect(mocks.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'inbox_message',
        permissionKey: 'access_inbox',
        dedupeKey: 'inbox:9',
        title: 'Nouveau message reçu',
      })
    );
  });

  it('emits reservation_request when reservationId is set', async () => {
    await emitInboxNotification({
      establishmentId: 'est',
      messageId: 10,
      subject: 'Resa',
      reservationId: 3,
    });
    expect(mocks.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reservation_request',
        permissionKey: 'access_reservations',
        dedupeKey: 'inbox:10',
      })
    );
  });
});
