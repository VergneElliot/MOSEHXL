export type VatBand = { amount?: number; vat?: number; ttc?: number };
export type VatBreakdown = {
  vat_10?: VatBand;
  vat_20?: VatBand;
};

export type DailyClosureRow = {
  id: number;
  period_start: Date;
  period_end: Date;
  total_transactions: number;
  fond_de_caisse: number;
  total_amount: number;
  total_vat: number;
  tips_total: number | null;
  change_total: number | null;
  payment_methods_breakdown: Record<string, number>;
  vat_breakdown: VatBreakdown;
  first_sequence: number | null;
  last_sequence: number | null;
  closure_hash: string;
  reconciliation_ok: boolean;
};

export type DailyOrderRow = {
  id: number;
  sequence_number: number | null;
  created_at: Date;
  payment_method: string;
  operation_type: string;
  total_amount: number;
  total_vat: number;
  tips: number;
  change: number;
  card_total: number;
  cash_total: number;
  vat_breakdown: VatBreakdown;
};

export type ClosureExportData =
  | { kind: 'daily'; orderRows: DailyOrderRow[] }
  | { kind: 'period'; dailyRows: DailyClosureRow[] };

export type AccountingRow = {
  label: string;
  sourceId: string | number;
  date: string;
  periodStart: string;
  periodEnd: string;
  transactions: number | null;
  paymentMethod: string;
  totalTtc: number;
  totalHt: number;
  totalVat: number;
  vat10Ttc: number;
  vat10Ht: number;
  vat10Vat: number;
  vat20Ttc: number;
  vat20Ht: number;
  vat20Vat: number;
  card: number;
  cash: number;
  tips: number;
  change: number;
  fond: number | null;
  firstSequence: number | null;
  lastSequence: number | null;
  hash: string;
  reconciliation: string;
};
