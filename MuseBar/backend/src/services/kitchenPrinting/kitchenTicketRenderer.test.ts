import { describe, expect, it } from 'vitest';

import { renderKitchenOrderTicket } from './kitchenTicketRenderer';

describe('kitchenTicketRenderer', () => {
  it('renders order header, lines, and options without prices', () => {
    const ticket = renderKitchenOrderTicket({
      orderId: 42,
      createdAt: '2026-07-01T14:30:00.000Z',
      printerName: 'Bar',
      lines: [
        {
          quantity: 2,
          product_name: 'Mojito',
          options: [{ group_name: 'Note', free_text: 'sans citron' }],
        },
      ],
    });

    expect(ticket).toContain('COMMANDE #42');
    expect(ticket).toContain('2x Mojito');
    expect(ticket).toContain('sans citron');
    expect(ticket).not.toContain('EUR');
    expect(ticket).not.toMatch(/\d+[.,]\d{2}/);
  });
});
