import type { Pool } from 'pg';
import type { ReceiptData } from '../services/printing/types';
import { buildReceiptDataForOrder, type PrintingUser } from './printDataRepo';

export type SubBillReceiptData = ReceiptData & {
  sub_bill_id: number;
  sub_bill_index: number;
  sub_bill_count: number;
};

/**
 * Receipt/invoice payload for one split payment part.
 * Sub-bills store amount + method only (no line assignment), so the document uses
 * a single synthetic line for that part and proportional VAT from the parent order.
 */
export async function buildReceiptDataForSubBill(
  pool: Pool,
  establishmentId: string,
  user: PrintingUser,
  orderId: number,
  subBillId: number,
  type: string
): Promise<SubBillReceiptData> {
  const billsRes = await pool.query(
    `SELECT sb.id, sb.payment_method, sb.amount
     FROM sub_bills sb
     JOIN orders o ON o.id = sb.order_id
     WHERE sb.order_id = $1 AND o.establishment_id = $2
     ORDER BY sb.created_at ASC, sb.id ASC`,
    [orderId, establishmentId]
  );
  const bills = billsRes.rows as Array<{ id: number; payment_method: string; amount: string | number }>;
  const index = bills.findIndex((b) => Number(b.id) === subBillId);
  if (index < 0) {
    const err = Object.assign(new Error('Split payment part not found'), { statusCode: 404 });
    throw err;
  }
  const bill = bills[index]!;
  const base = await buildReceiptDataForOrder(pool, establishmentId, user, orderId, type);
  const partAmount =
    typeof bill.amount === 'number' ? bill.amount : parseFloat(String(bill.amount ?? 0));
  const orderTotal = Number(base.total_amount) || 0;
  const ratio = orderTotal > 0 ? Math.min(1, Math.max(0, partAmount / orderTotal)) : 1;
  const partTax = Number((Number(base.total_tax) * ratio).toFixed(4));
  const methodLabel = bill.payment_method === 'cash' ? 'Espèces' : 'Carte';
  const label = `Paiement ${index + 1}/${bills.length} — ${methodLabel}`;

  const vatBreakdown = (base.vat_breakdown ?? []).map((row) => ({
    rate: row.rate,
    subtotal_ht: Number((Number(row.subtotal_ht) * ratio).toFixed(4)),
    vat: Number((Number(row.vat) * ratio).toFixed(4)),
  }));

  return {
    ...base,
    total_amount: Number(partAmount.toFixed(4)),
    total_tax: partTax,
    payment_method: String(bill.payment_method ?? base.payment_method),
    tips: undefined,
    change: undefined,
    items: [
      {
        product_name: label,
        quantity: 1,
        unit_price: Number(partAmount.toFixed(4)),
        total_price: Number(partAmount.toFixed(4)),
        tax_rate: partAmount > 0 ? Number(((partTax / partAmount) * 100).toFixed(2)) : 20,
      },
    ],
    vat_breakdown: vatBreakdown,
    sub_bill_id: subBillId,
    sub_bill_index: index + 1,
    sub_bill_count: bills.length,
  };
}
