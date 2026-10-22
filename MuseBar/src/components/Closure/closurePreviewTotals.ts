export type ClosurePreviewData = {
  id: number;
  closure_type: string;
  period_start: string;
  period_end: string;
  total_transactions: number;
  fond_de_caisse: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10?: { amount?: number; vat?: number; ttc?: number };
    vat_20?: { amount?: number; vat?: number; ttc?: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  tips_total?: number;
  change_total?: number;
  business_info?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    siret?: string;
    tax_identification?: string;
  };
};

export interface ClosurePreviewTotals {
  totalTtc: number;
  totalHt: number;
  totalVat: number;
  cardTotal: number;
  cashTotal: number;
  tipsTotal: number;
  changeTotal: number;
  fondDeCaisse: number;
  vat10Ttc: number;
  vat20Ttc: number;
  vat10Amount: number;
  vat20Amount: number;
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function roundToCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Display values in euros; HT/VAT totals are derived in integer cents so they add up exactly. */
export function computeClosurePreviewTotals(preview: ClosurePreviewData): ClosurePreviewTotals {
  const totalTtc = toNumber(preview.total_amount);

  const vat10Base = toNumber(preview.vat_breakdown?.vat_10?.amount);
  const vat20Base = toNumber(preview.vat_breakdown?.vat_20?.amount);
  const vat10Amount = toNumber(preview.vat_breakdown?.vat_10?.vat);
  const vat20Amount = toNumber(preview.vat_breakdown?.vat_20?.vat);

  const vat10TtcExact = toNumber(preview.vat_breakdown?.vat_10?.ttc) || vat10Base + vat10Amount;
  const vat20TtcExact = toNumber(preview.vat_breakdown?.vat_20?.ttc) || vat20Base + vat20Amount;

  const vat10AmountCents = roundToCents(vat10Amount);
  const vat20AmountCents = roundToCents(vat20Amount);
  const ttcTotalCents = roundToCents(totalTtc);
  const vatTotalCents = vat10AmountCents + vat20AmountCents;

  return {
    totalTtc,
    totalHt: (ttcTotalCents - vatTotalCents) / 100,
    totalVat: vatTotalCents / 100,
    cardTotal: toNumber(preview.payment_methods_breakdown?.card),
    cashTotal: toNumber(preview.payment_methods_breakdown?.cash),
    tipsTotal: toNumber(preview.tips_total),
    changeTotal: toNumber(preview.change_total),
    fondDeCaisse: toNumber(preview.fond_de_caisse),
    vat10Ttc: roundToCents(vat10TtcExact) / 100,
    vat20Ttc: roundToCents(vat20TtcExact) / 100,
    vat10Amount: vat10AmountCents / 100,
    vat20Amount: vat20AmountCents / 100,
  };
}
