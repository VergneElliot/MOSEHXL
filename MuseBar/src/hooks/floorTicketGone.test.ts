import { describe, expect, it } from 'vitest';
import { isOpenTicketGoneError } from './floorTicketGone';

describe('isOpenTicketGoneError', () => {
  it('matches API not-found / already-closed messages', () => {
    expect(isOpenTicketGoneError(new Error('Open ticket not found or already closed'))).toBe(
      true
    );
    expect(isOpenTicketGoneError(new Error('Open ticket not found'))).toBe(true);
    expect(isOpenTicketGoneError({ message: 'Ticket not found or already closed' })).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isOpenTicketGoneError(new Error('Badge requis'))).toBe(false);
    expect(isOpenTicketGoneError(new Error('Synchronisation table échouée'))).toBe(false);
    expect(isOpenTicketGoneError(null)).toBe(false);
  });
});
