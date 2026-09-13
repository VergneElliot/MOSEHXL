import type { Order as LegalReceiptOrder, ReceiptItem } from '../Legal/LegalReceipt/types';

export type BusinessInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret?: string;
  taxIdentification?: string;
};

export type PreviewPayload = {
  order: LegalReceiptOrder;
  businessInfo: BusinessInfo;
};

export function normalizeReceiptForPreview(raw: unknown): PreviewPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawRecord = raw as Record<string, unknown>;

  const toNumber = (v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : 0;
  };

  const items = Array.isArray(rawRecord.items) ? rawRecord.items : [];
  const normalizedItems: ReceiptItem[] = items.map((it) => {
    const item = typeof it === 'object' && it !== null ? (it as Record<string, unknown>) : {};
    const unit = toNumber(item.unit_price);
    const total = toNumber(item.total_price);
    const rateRaw = toNumber(item.tax_rate);
    const ratePercent = rateRaw > 0 && rateRaw <= 1 ? rateRaw * 100 : rateRaw;
    const rate = ratePercent / 100;
    const taxAmount = toNumber(item.tax_amount) || (total * rate) / (1 + rate);
    return {
      ...item,
      name: String(item.name ?? item.product_name ?? ''),
      product_name: String(item.product_name ?? item.name ?? ''),
      quantity: toNumber(item.quantity) || 1,
      unit_price: unit,
      total_price: total,
      tax_rate: ratePercent,
      tax_amount: taxAmount,
      happy_hour_applied: Boolean(item.happy_hour_applied) || false,
      happy_hour_discount_amount: toNumber(item.happy_hour_discount_amount),
    };
  });

  const businessInfoRaw =
    typeof rawRecord.business_info === 'object' && rawRecord.business_info !== null
      ? (rawRecord.business_info as Record<string, unknown>)
      : {};

  return {
    order: {
      id: toNumber(rawRecord.order_id ?? rawRecord.id),
      sequence_number: toNumber(rawRecord.sequence_number ?? 0),
      total_amount: toNumber(rawRecord.total_amount),
      total_tax: toNumber(rawRecord.total_tax),
      payment_method: String(rawRecord.payment_method ?? ''),
      created_at: String(rawRecord.created_at ?? new Date().toISOString()),
      items: normalizedItems,
      vat_breakdown: Array.isArray(rawRecord.vat_breakdown) ? rawRecord.vat_breakdown : [],
    },
    businessInfo: {
      name: String(businessInfoRaw.name ?? ''),
      address: String(businessInfoRaw.address ?? ''),
      phone: String(businessInfoRaw.phone ?? ''),
      email: String(businessInfoRaw.email ?? ''),
      siret: String(businessInfoRaw.siret ?? ''),
      taxIdentification: String(
        businessInfoRaw.tax_identification ?? businessInfoRaw.taxIdentification ?? ''
      ),
    },
  };
}
