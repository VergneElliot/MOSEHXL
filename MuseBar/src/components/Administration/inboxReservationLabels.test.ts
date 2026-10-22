import { describe, expect, it } from 'vitest';
import {
  INBOX_RESERVATION_ACTION_LABEL,
  INBOX_RESERVATION_STATUS_LABEL,
} from './inboxReservationLabels';

describe('inboxReservationLabels', () => {
  it('covers reservation statuses used in inbox', () => {
    expect(INBOX_RESERVATION_STATUS_LABEL.requested).toBe('Demandée');
    expect(INBOX_RESERVATION_STATUS_LABEL.confirmed).toBe('Confirmée');
    expect(INBOX_RESERVATION_STATUS_LABEL.no_show).toBe('No-show');
  });

  it('covers action verbs for guest updates', () => {
    expect(INBOX_RESERVATION_ACTION_LABEL.confirmed).toBe('valider');
    expect(INBOX_RESERVATION_ACTION_LABEL.on_hold).toBe('mettre en attente');
    expect(INBOX_RESERVATION_ACTION_LABEL.refused).toBe('refuser');
  });
});
