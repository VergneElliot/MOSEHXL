/**
 * Build ePOS-Print XML for Epson Server Direct Print.
 * Schema: http://www.epson-pos.com/schemas/2012/06/epos-print
 * See Epson "Server Direct Print" / ePOS-Print documentation for full element reference.
 */

import type { ClosureBulletinData, ReceiptData } from './types';
import { groupReceiptLineItemsForPrint } from '../../printing/printLineGrouping';

const EPOS_NS = 'http://www.epson-pos.com/schemas/2012/06/epos-print';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function line(text: string): string {
  return `<text>${esc(text)}&#10;</text>`;
}

function money(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

export function receiptToEposPrintXml(data: ReceiptData): string {
  const toNumber = (value: unknown): number => {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
    return Number.isFinite(n) ? n : 0;
  };

  const totalTtc = toNumber(data.total_amount);
  const totalVat = toNumber(data.total_tax);
  const totalHt = totalTtc - totalVat;
  const documentKind = data.document_kind === 'invoice' ? 'invoice' : 'ticket';
  const docLabel = documentKind === 'invoice' ? 'Facture' : 'Ticket';
  const docTypeLabel =
    documentKind === 'invoice'
      ? data.receipt_type === 'summary'
        ? 'Facture sans detail'
        : 'Facture detaillee'
      : data.receipt_type === 'summary'
        ? 'Ticket simplifie'
        : 'Ticket detaille';
  const docNumber = data.document_number ?? String(data.sequence_number).padStart(6, '0');

  const lines: string[] = [];
  lines.push(`<text align="center" weight="bold">${esc(data.business_info.name)}&#10;</text>`);
  if (data.business_info.address) lines.push(`<text align="center">${esc(data.business_info.address)}&#10;</text>`);
  if (data.business_info.phone) lines.push(`<text align="center">Tel: ${esc(data.business_info.phone)}&#10;</text>`);
  if (data.business_info.email) lines.push(`<text align="center">${esc(data.business_info.email)}&#10;</text>`);
  if (data.business_info.siret) lines.push(line(`SIRET: ${data.business_info.siret}`));
  if (data.business_info.tax_identification) lines.push(line(`TVA: ${data.business_info.tax_identification}`));
  lines.push('<text>&#10;</text>');
  lines.push(line(`${docLabel} #${docNumber}  Commande #${data.order_id}`));
  lines.push(line(`Date: ${new Date(data.created_at).toLocaleString('fr-FR')}`));
  lines.push(line(`Paiement: ${data.payment_method}`));
  lines.push(line(`Type: ${docTypeLabel}`));
  lines.push('<text>&#10;</text>');

  if (data.items && data.items.length > 0 && data.receipt_type === 'detailed') {
    lines.push(line('ARTICLES:'));
    for (const item of groupReceiptLineItemsForPrint(data.items)) {
      lines.push(
        line(
          `${item.product_name} x${item.quantity}  ${money(item.total_price)}`
        )
      );
      lines.push(line(`  ${money(item.unit_price)} / unite  TVA ${item.tax_rate}%`));
    }
    lines.push('<text>&#10;</text>');
  }

  if (data.vat_breakdown && data.vat_breakdown.length > 0) {
    lines.push(line('DETAIL TVA:'));
    for (const vat of data.vat_breakdown) {
      lines.push(line(`Base HT ${vat.rate}%: ${money(toNumber(vat.subtotal_ht))}`));
      lines.push(line(`TVA ${vat.rate}%: ${money(toNumber(vat.vat))}`));
    }
    lines.push('<text>&#10;</text>');
  }

  lines.push(line(`Sous-total HT: ${money(totalHt)}`));
  lines.push(line(`TVA Totale: ${money(totalVat)}`));
  lines.push(line(`TOTAL TTC: ${money(totalTtc)}`));

  if (toNumber(data.tips) > 0) {
    lines.push(line(`Pourboire: ${money(toNumber(data.tips))}`));
  }
  if (toNumber(data.change) > 0) {
    lines.push(line(`Monnaie rendue: ${money(toNumber(data.change))}`));
  }

  if (documentKind === 'invoice' && data.legal_info) {
    lines.push('<text>&#10;</text>');
    lines.push(line('MENTIONS FACTURE:'));
    if (data.legal_info.payment_due_date) {
      lines.push(line(`Echeance paiement: ${data.legal_info.payment_due_date}`));
    }
    if (data.legal_info.payment_terms) {
      lines.push(line(`Conditions paiement: ${data.legal_info.payment_terms}`));
    }
    if (data.legal_info.late_penalty_terms) {
      lines.push(line(`Penalites retard: ${data.legal_info.late_penalty_terms}`));
    }
    if (data.legal_info.recovery_fee_note) {
      lines.push(line(data.legal_info.recovery_fee_note));
    }
    if (data.legal_info.seller_legal_form) {
      lines.push(line(`Forme juridique: ${data.legal_info.seller_legal_form}`));
    }
    if (typeof data.legal_info.seller_share_capital_eur === 'number') {
      lines.push(line(`Capital social: ${money(data.legal_info.seller_share_capital_eur)}`));
    }
  }

  const legalHash = data.compliance_info?.invoice_hash || data.compliance_info?.receipt_hash;
  if (legalHash) {
    lines.push(line(`Hash: ${legalHash}`));
  }
  if (data.compliance_info?.cash_register_id) {
    lines.push(line(`Caisse: ${data.compliance_info.cash_register_id}`));
  }
  if (data.compliance_info?.operator_id) {
    lines.push(line(`Operateur: ${data.compliance_info.operator_id}`));
  }

  lines.push(line('Ref. legale: Article 286-I-3 bis du CGI'));
  lines.push(line(documentKind === 'invoice' ? 'Facture securisee - Inalterable' : 'Ticket securise - Inalterable'));

  lines.push('<text>&#10;</text>');
  lines.push('<cut type="feed"/>');

  const body = lines.join('\n    ');
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<epos-print xmlns="${EPOS_NS}" version="1.0.0">\n` +
    `    ${body}\n` +
    `</epos-print>`
  );
}

export function closureBulletinToEposPrintXml(data: ClosureBulletinData): string {
  const toNumber = (value: unknown): number => {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
    return Number.isFinite(n) ? n : 0;
  };

  const roundToCents = (amount: number): number => Math.round(amount * 100);

  const totalTtc = toNumber(data.total_amount);
  const vat10Base = toNumber(data.vat_breakdown?.vat_10?.amount);
  const vat20Base = toNumber(data.vat_breakdown?.vat_20?.amount);
  const vat10Amount = toNumber(data.vat_breakdown?.vat_10?.vat);
  const vat20Amount = toNumber(data.vat_breakdown?.vat_20?.vat);
  const vat10Ttc = toNumber(data.vat_breakdown?.vat_10?.ttc) || vat10Base + vat10Amount;
  const vat20Ttc = toNumber(data.vat_breakdown?.vat_20?.ttc) || vat20Base + vat20Amount;
  const vatTotal = (roundToCents(vat10Amount) + roundToCents(vat20Amount)) / 100;
  const totalHt = (roundToCents(totalTtc) - roundToCents(vatTotal)) / 100;

  const cardTotal = toNumber(data.payment_methods_breakdown?.card);
  const cashTotal = toNumber(data.payment_methods_breakdown?.cash);
  const tipsTotal = toNumber(data.tips_total);
  const changeTotal = toNumber(data.change_total);
  const fondDeCaisse = toNumber(data.fond_de_caisse);

  const lines: string[] = [];
  lines.push(`<text align="center" weight="bold">${esc(data.business_info.name)}&#10;</text>`);
  if (data.business_info.address) lines.push(line(data.business_info.address));
  if (data.business_info.phone) lines.push(line(`Tel: ${data.business_info.phone}`));
  if (data.business_info.email) lines.push(line(`Email: ${data.business_info.email}`));
  if (data.business_info.siret) lines.push(line(`SIRET: ${data.business_info.siret}`));
  if (data.business_info.tax_identification) lines.push(line(`TVA: ${data.business_info.tax_identification}`));
  lines.push('<text>&#10;</text>');
  lines.push(line(`Bulletin de clôture — ${data.closure_type}`));
  lines.push(
    line(
      `${new Date(data.period_start).toLocaleDateString('fr-FR')} → ${new Date(data.period_end).toLocaleDateString('fr-FR')}`
    )
  );
  lines.push('<text>&#10;</text>');
  lines.push(line(`Transactions: ${data.total_transactions}`));
  lines.push(line(`Total TTC: ${money(totalTtc)}`));
  lines.push(line(`Total HT: ${money(totalHt)}`));
  lines.push(line(`Montant total TVA: ${money(vatTotal)}`));
  lines.push('<text>&#10;</text>');
  lines.push(line(`TVA 10% soumis: ${money(vat10Ttc)}`));
  lines.push(line(`TVA 10% montant: ${money(vat10Amount)}`));
  lines.push(line(`TVA 20% soumis: ${money(vat20Ttc)}`));
  lines.push(line(`TVA 20% montant: ${money(vat20Amount)}`));
  lines.push('<text>&#10;</text>');
  lines.push(line(`Total cartes: ${money(cardTotal)}`));
  lines.push(line(`Total cash: ${money(cashTotal)}`));
  lines.push(line(`Pourboires: ${money(tipsTotal)}`));
  lines.push(line(`Monnaie rendue: ${money(changeTotal)}`));
  lines.push(line(`Fond de caisse: ${money(fondDeCaisse)}`));
  lines.push(line(`Seq journal: ${data.first_sequence} -> ${data.last_sequence}`));
  lines.push(line(`Hash: ${data.closure_hash}`));
  lines.push('<text>&#10;</text>');
  lines.push('<cut type="feed"/>');

  const body = lines.join('\n    ');
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<epos-print xmlns="${EPOS_NS}" version="1.0.0">\n` +
    `    ${body}\n` +
    `</epos-print>`
  );
}
