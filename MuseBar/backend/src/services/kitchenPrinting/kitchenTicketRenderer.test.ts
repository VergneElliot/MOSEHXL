import { describe, expect, it } from 'vitest';

import { ESC_POS } from '../printing/types';
import {
  renderCustomerOrderNumberTicket,
  renderKitchenOrderTicket,
  renderKitchenCancellationTicket,
} from './kitchenTicketRenderer';

describe('kitchenTicketRenderer', () => {
  it('renders order header, lines, and options without prices', () => {
    const ticket = renderKitchenOrderTicket({
      ticketDayNumber: 3,
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

    expect(ticket).toContain('COMMANDE #3');
    expect(ticket).toContain('2x Mojito');
    expect(ticket).toContain('sans citron');
    expect(ticket).toContain(ESC_POS.DOUBLE_SIZE);
    expect(ticket).toContain(ESC_POS.BEEP);
    expect(ticket).toContain(ESC_POS.feedLines(8));
    expect(ticket).not.toContain('EUR');
    expect(ticket).not.toMatch(/\d+[.,]\d{2}/);
  });

  it('renders customer pickup slip with ticket day number only', () => {
    const ticket = renderCustomerOrderNumberTicket(3);
    expect(ticket).toContain('COMMANDE');
    expect(ticket).toContain('#3');
    expect(ticket).not.toContain('Mojito');
    expect(ticket).toContain(ESC_POS.DOUBLE_SIZE);
    expect(ticket).not.toContain(ESC_POS.BEEP);
  });

  it('renders cancellation header with ticket day number', () => {
    const ticket = renderKitchenCancellationTicket({
      ticketDayNumber: 3,
      createdAt: '2026-07-01T14:32:00.000Z',
      printerName: 'Cuisine',
      cancellationType: 'full',
      lines: [{ quantity: 1, product_name: 'Entrecote', options: [{ group_name: 'Cuisson', choice_label: 'Bien cuit' }] }],
    });

    expect(ticket).toContain('ANNULATION');
    expect(ticket).toContain('Commande #3');
    expect(ticket).toContain('1x Entrecote');
    expect(ticket).toContain('Cuisson: Bien cuit');
  });
});
