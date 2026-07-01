// Printing service types and interfaces

export interface ReceiptData {
  order_id: number;
  sequence_number: number;
  document_kind?: 'ticket' | 'invoice';
  document_number?: string;
  total_amount: number;
  total_tax: number;
  payment_method: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate: number;
  }>;
  business_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  };
  legal_info?: {
    payment_due_date?: string;
    payment_terms?: string;
    late_penalty_terms?: string;
    recovery_fee_note?: string;
    seller_legal_form?: string;
    seller_share_capital_eur?: number;
  };
  vat_breakdown?: Array<{
    rate: number;
    subtotal_ht: number;
    vat: number;
  }>;
  receipt_type: 'detailed' | 'summary';
  tips?: number;
  change?: number;
  customer_info?: {
    name?: string;
    address?: string;
    email?: string;
    tax_identification?: string;
  };
  compliance_info?: {
    receipt_hash?: string;
    invoice_hash?: string;
    previous_invoice_hash?: string;
    source_receipt_hash?: string;
    source_receipt_sequence?: number;
    cash_register_id?: string;
    operator_id?: string;
  };
}

export interface ClosureBulletinData {
  id: number;
  closure_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  fond_de_caisse: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10: { amount: number; vat: number; ttc?: number };
    vat_20: { amount: number; vat: number; ttc?: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  tips_total?: number;
  change_total?: number;
  business_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  };
  compliance_info?: {
    cash_register_id?: string;
    operator_id?: string;
  };
}

export interface PrintResult {
  success: boolean;
  message: string;
  printJobId?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface PrinterStatus {
  available: boolean;
  status: string;
  printerId?: string;
  printerName?: string;
  provider?: string;
}

export interface Printer {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  isDefault?: boolean;
  status?: string;
  provider?: string;
}

export interface PrintingConfig {
  /** Epson TM-Intelligent Server Direct Print (printer polls HTTPS, ePOS-Print XML). */
  provider: 'epson-server-direct' | 'network-escpos' | 'bridge' | 'digital';
  /** Establishment UUID (matches public.establishments.id and JWT payload). */
  establishmentId?: string;
  /** Shown in printer lists / status (optional). */
  printerLabel?: string;
  /** Validated on GET /api/printing/epson/poll — stored in printing_configurations.config */
  pollKey?: string;
  /** Validated on /api/printing/bridge/* — stored in printing_configurations.config. */
  bridgeKey?: string;
  /** LAN ESC/POS — printer IPv4/hostname (fallback: THERMAL_PRINTER_HOST). */
  printerHost?: string;
  /** LAN ESC/POS — raw socket port (default 9100). */
  printerPort?: number;
  timeout?: number;
}

export interface IPrintingService {
  initialize(): Promise<void>;
  printReceipt(data: ReceiptData): Promise<PrintResult>;
  printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult>;
  checkPrinterStatus(printerId?: string): Promise<PrinterStatus>;
  listPrinters(): Promise<Printer[]>;
  testPrint(printerId?: string): Promise<PrintResult>;
}

// ESC/POS Commands
export const ESC_POS = {
  ESC: '\x1B',
  INIT: '\x1B@',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  CENTER: '\x1B\x61\x01',
  LEFT: '\x1B\x61\x00',
  RIGHT: '\x1B\x61\x02',
  CUT: '\x1D\x56\x00',
  PARTIAL_CUT: '\x1D\x56\x01',
  DOUBLE_HEIGHT: '\x1B\x21\x10',
  DOUBLE_WIDTH: '\x1B\x21\x20',
  DOUBLE_SIZE: '\x1B\x21\x30',
  NORMAL_SIZE: '\x1B\x21\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  LINE_FEED: '\n',
  /** ASCII BEL — internal buzzer on many ESC/POS kitchen printers (Epson, Star, etc.). */
  BEEP: '\x07',
  /**
   * ESC/POS buzzer command (ESC B). More reliable on some Epson models than BEL alone.
   * count: 1-9 beeps, duration: 1-9 (× ~100 ms).
   */
  buzzer: (count = 3, duration = 2): string =>
    `${'\x1B\x42'}${String.fromCharCode(Math.min(9, Math.max(1, count)))}${String.fromCharCode(Math.min(9, Math.max(1, duration)))}`,
  /**
   * Epson TM-m30 / TM-T88 etc.: optional external buzzer (OT-BZ20) on drawer-kick port.
   * pattern: 1–7 (1 = pattern A), repeat: 1–255. No-op without external buzzer enabled in printer settings.
   */
  epsonExternalBuzzer: (pattern = 1, repeat = 2): string =>
    `${'\x1B\x28\x41\x03\x00\x61'}${String.fromCharCode(Math.min(7, Math.max(1, pattern)))}${String.fromCharCode(Math.min(255, Math.max(1, repeat)))}`,
  /** ESC d n — print and feed n lines (blank tail before cut). */
  feedLines: (count: number): string =>
    `${'\x1B\x64'}${String.fromCharCode(Math.min(255, Math.max(0, count)))}`,
} as const;
