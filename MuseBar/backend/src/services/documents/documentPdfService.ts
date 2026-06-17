import PDFDocument from 'pdfkit';
import type { ClosureBulletinData, ReceiptData } from '../printing/types';

type PdfDoc = InstanceType<typeof PDFDocument>;

function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} EUR`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR');
}

async function renderToBuffer(render: (doc: PdfDoc) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    render(doc);
    doc.end();
  });
}

function writeBusinessHeader(doc: PdfDoc, data: ReceiptData | ClosureBulletinData, title: string): void {
  const info = data.business_info;
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text(info.name, { align: 'center' });
  doc.font('Helvetica').fontSize(9).text(info.address, { align: 'center' });
  if (info.phone) doc.text(`Tél: ${info.phone}`, { align: 'center' });
  if (info.email) doc.text(info.email, { align: 'center' });
  const siret = info.siret ? `SIRET: ${info.siret}` : '';
  const tva = info.tax_identification ? `TVA: ${info.tax_identification}` : '';
  if (siret || tva) doc.text([siret, tva].filter(Boolean).join(' | '), { align: 'center' });
  doc.moveDown();
}

function writeReceiptLines(doc: PdfDoc, data: ReceiptData): void {
  doc.fontSize(10).font('Helvetica');
  doc.text(`N° document: ${data.document_number ?? data.sequence_number}`);
  doc.text(`Date: ${formatDateTime(data.created_at)}`);
  doc.text(`Paiement: ${data.payment_method}`);
  doc.moveDown(0.5);

  if (data.document_kind === 'invoice' && data.customer_info) {
    doc.font('Helvetica-Bold').text('Client');
    doc.font('Helvetica');
    if (data.customer_info.name) doc.text(data.customer_info.name);
    if (data.customer_info.address) doc.text(data.customer_info.address);
    if (data.customer_info.tax_identification) {
      doc.text(`N° TVA client: ${data.customer_info.tax_identification}`);
    }
    if (data.customer_info.email) doc.text(`Email: ${data.customer_info.email}`);
    doc.moveDown(0.5);
  }

  if (data.receipt_type === 'detailed' && Array.isArray(data.items) && data.items.length > 0) {
    doc.font('Helvetica-Bold').text('Détail');
    doc.font('Helvetica');
    for (const item of data.items) {
      const line = `${item.quantity} x ${item.product_name} — ${formatEuro(item.total_price)} (TVA ${item.tax_rate}%)`;
      doc.text(line);
    }
    doc.moveDown(0.5);
  }

  if (Array.isArray(data.vat_breakdown) && data.vat_breakdown.length > 0) {
    doc.font('Helvetica-Bold').text('Ventilation TVA');
    doc.font('Helvetica');
    for (const vat of data.vat_breakdown) {
      doc.text(
        `TVA ${vat.rate}% — HT ${formatEuro(vat.subtotal_ht)} | TVA ${formatEuro(vat.vat)}`
      );
    }
    doc.moveDown(0.5);
  }

  doc.font('Helvetica-Bold');
  doc.text(`Total TTC: ${formatEuro(data.total_amount)}`);
  doc.font('Helvetica');
  doc.text(`Total TVA: ${formatEuro(data.total_tax)}`);
  if (data.tips != null) doc.text(`Pourboires: ${formatEuro(data.tips)}`);
  if (data.change != null) doc.text(`Monnaie rendue: ${formatEuro(data.change)}`);
}

function writeInvoiceLegalMentions(doc: PdfDoc, data: ReceiptData): void {
  const legal = data.legal_info;
  if (!legal) return;
  doc.moveDown();
  doc.font('Helvetica-Bold').fontSize(10).text('Mentions légales facture');
  doc.font('Helvetica').fontSize(9);
  if (legal.payment_due_date) doc.text(`Échéance: ${formatDate(legal.payment_due_date)}`);
  if (legal.payment_terms) doc.text(`Conditions de paiement: ${legal.payment_terms}`);
  if (legal.late_penalty_terms) doc.text(`Pénalités de retard: ${legal.late_penalty_terms}`);
  if (legal.recovery_fee_note) doc.text(legal.recovery_fee_note);
  if (legal.seller_legal_form) doc.text(`Forme juridique: ${legal.seller_legal_form}`);
  if (legal.seller_share_capital_eur != null) {
    doc.text(`Capital social: ${formatEuro(legal.seller_share_capital_eur)}`);
  }
}

function writeComplianceFooter(doc: PdfDoc, data: ReceiptData): void {
  const compliance = data.compliance_info;
  if (!compliance) return;
  doc.moveDown();
  doc.fontSize(8).font('Helvetica');
  if (compliance.cash_register_id) doc.text(`Caisse: ${compliance.cash_register_id}`);
  if (compliance.operator_id) doc.text(`Opérateur: ${compliance.operator_id}`);
  const hash = compliance.invoice_hash ?? compliance.receipt_hash;
  if (hash) doc.text(`Empreinte: ${hash.slice(0, 16)}…`);
}

export async function renderReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return renderToBuffer((doc) => {
    writeBusinessHeader(doc, data, 'TICKET DE CAISSE');
    writeReceiptLines(doc, data);
    writeComplianceFooter(doc, data);
    doc.moveDown();
    doc.fontSize(8).text(
      'Document généré par MOSEHXL — ticket de caisse (non facture).',
      { align: 'center' }
    );
  });
}

export async function renderInvoicePdf(data: ReceiptData): Promise<Buffer> {
  return renderToBuffer((doc) => {
    writeBusinessHeader(doc, data, 'FACTURE');
    writeReceiptLines(doc, data);
    writeInvoiceLegalMentions(doc, data);
    writeComplianceFooter(doc, data);
    doc.moveDown();
    doc.fontSize(8).text('Document généré par MOSEHXL — facture B2B.', { align: 'center' });
  });
}

function closureTypeLabel(type: string): string {
  const map: Record<string, string> = {
    DAILY: 'Journalière',
    WEEKLY: 'Hebdomadaire',
    MONTHLY: 'Mensuelle',
    ANNUAL: 'Annuelle',
  };
  return map[type] ?? type;
}

export async function renderClosureBulletinPdf(data: ClosureBulletinData): Promise<Buffer> {
  return renderToBuffer((doc) => {
    writeBusinessHeader(doc, data, 'BULLETIN DE CLÔTURE');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Type: ${closureTypeLabel(data.closure_type)}`);
    doc.text(`Période: ${formatDate(data.period_start)} au ${formatDate(data.period_end)}`);
    doc.text(`Transactions: ${data.total_transactions}`);
    doc.text(`Séquences: ${data.first_sequence} — ${data.last_sequence}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Totaux');
    doc.font('Helvetica');
    doc.text(`Total TTC: ${formatEuro(data.total_amount)}`);
    doc.text(`Total TVA: ${formatEuro(data.total_vat)}`);
    doc.text(`Fond de caisse: ${formatEuro(data.fond_de_caisse)}`);
    if (data.tips_total != null) doc.text(`Pourboires: ${formatEuro(data.tips_total)}`);
    if (data.change_total != null) doc.text(`Monnaie rendue: ${formatEuro(data.change_total)}`);

    const vat = data.vat_breakdown;
    if (vat) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Détail TVA');
      doc.font('Helvetica');
      if (vat.vat_10) {
        doc.text(
          `TVA 10% — base ${formatEuro(vat.vat_10.amount)} | TVA ${formatEuro(vat.vat_10.vat)} | TTC ${formatEuro(vat.vat_10.ttc ?? vat.vat_10.amount + vat.vat_10.vat)}`
        );
      }
      if (vat.vat_20) {
        doc.text(
          `TVA 20% — base ${formatEuro(vat.vat_20.amount)} | TVA ${formatEuro(vat.vat_20.vat)} | TTC ${formatEuro(vat.vat_20.ttc ?? vat.vat_20.amount + vat.vat_20.vat)}`
        );
      }
    }

    const payments = data.payment_methods_breakdown ?? {};
    const paymentKeys = Object.keys(payments);
    if (paymentKeys.length > 0) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Modes de paiement');
      doc.font('Helvetica');
      for (const key of paymentKeys) {
        doc.text(`${key}: ${formatEuro(Number(payments[key] ?? 0))}`);
      }
    }

    doc.moveDown();
    doc.fontSize(8).text(`Empreinte clôture: ${data.closure_hash.slice(0, 16)}…`);
    if (data.compliance_info?.cash_register_id) {
      doc.text(`Caisse: ${data.compliance_info.cash_register_id}`);
    }
    doc.moveDown();
    doc.text('Document généré par MOSEHXL — bulletin de clôture.', { align: 'center' });
  });
}

export async function renderReceiptOrInvoicePdf(data: ReceiptData): Promise<Buffer> {
  return data.document_kind === 'invoice' ? renderInvoicePdf(data) : renderReceiptPdf(data);
}
