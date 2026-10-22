import { describe, expect, it } from 'vitest';
import { computePaymentBreakdownFromOrders } from './paymentBreakdown';

describe('computePaymentBreakdownFromOrders', () => {
  it('aggregates card and cash sales', () => {
    const { totalAmount, paymentBreakdown } = computePaymentBreakdownFromOrders(
      [
        { id: 1, total_amount: 10, payment_method: 'card' },
        { id: 2, total_amount: '20.5', payment_method: 'cash' },
      ],
      []
    );
    expect(totalAmount).toBe(30.5);
    expect(paymentBreakdown.card).toBe(10);
    expect(paymentBreakdown.cash).toBe(20.5);
  });

  it('skips non-finite totals', () => {
    const { totalAmount, paymentBreakdown } = computePaymentBreakdownFromOrders(
      [
        { id: 1, total_amount: 'NaN', payment_method: 'card' },
        { id: 2, total_amount: 5, payment_method: 'cash' },
      ],
      []
    );
    expect(totalAmount).toBe(5);
    expect(paymentBreakdown.cash).toBe(5);
    expect(paymentBreakdown.card).toBeUndefined();
  });

  it('applies change ops as +card -cash', () => {
    const { paymentBreakdown } = computePaymentBreakdownFromOrders(
      [
        {
          id: 1,
          total_amount: 0,
          operation_type: 'change',
          change_amount: 3,
          payment_method: 'cash',
        },
      ],
      []
    );
    expect(paymentBreakdown.card).toBe(3);
    expect(paymentBreakdown.cash).toBe(-3);
  });

  it('fills split orders from sub_bills only', () => {
    const { paymentBreakdown } = computePaymentBreakdownFromOrders(
      [{ id: 10, total_amount: 30, payment_method: 'split' }],
      [
        { order_id: 10, payment_method: 'card', amount: 12 },
        { order_id: 10, payment_method: 'cash', amount: '18' },
        { order_id: 99, payment_method: 'card', amount: 100 },
      ]
    );
    expect(paymentBreakdown.card).toBe(12);
    expect(paymentBreakdown.cash).toBe(18);
  });

  it('moves tips from cash to card', () => {
    const { paymentBreakdown } = computePaymentBreakdownFromOrders(
      [
        { id: 1, total_amount: 50, payment_method: 'cash', tips: 5 },
        { id: 2, total_amount: 20, payment_method: 'card', tips: '2.5' },
      ],
      []
    );
    expect(paymentBreakdown.cash).toBe(50 - 7.5);
    expect(paymentBreakdown.card).toBe(20 + 7.5);
  });

  it('ignores negative or non-finite tips', () => {
    const { paymentBreakdown } = computePaymentBreakdownFromOrders(
      [
        { id: 1, total_amount: 10, payment_method: 'cash', tips: -1 },
        { id: 2, total_amount: 10, payment_method: 'cash', tips: 'bad' },
      ],
      []
    );
    expect(paymentBreakdown.cash).toBe(20);
    expect(paymentBreakdown.card).toBeUndefined();
  });
});
