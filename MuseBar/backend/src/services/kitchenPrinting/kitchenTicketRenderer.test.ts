import { describe, expect, it } from 'vitest';

import { renderKitchenOrderTicket, renderKitchenCancellationTicket } from './kitchenTicketRenderer';

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

  it('renders cancellation header with original order id', () => {
    const ticket = renderKitchenCancellationTicket({
      originalOrderId: 20,
      createdAt: '2026-07-01T14:32:00.000Z',
      printerName: 'Cuisine',
      cancellationType: 'full',
      lines: [{ quantity: 1, product_name: 'Entrecote', options: [{ group_name: 'Cuisson', choice_label: 'Bien cuit' }] }],
    });

    expect(ticket).toContain('ANNULATION');
    expect(ticket).toContain('Commande #20');
    expect(ticket).toContain('1x Entrecote');
    expect(ticket).toContain('Cuisson: Bien cuit');
  });
});
