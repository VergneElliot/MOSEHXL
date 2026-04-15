/**
 * Build ePOS-Print XML for Epson Server Direct Print.
 * Schema: http://www.epson-pos.com/schemas/2012/06/epos-print
 * See Epson "Server Direct Print" / ePOS-Print documentation for full element reference.
 */

import type { ClosureBulletinData, ReceiptData } from './types';

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

export function receiptToEposPrintXml(data: ReceiptData): string {
  const lines: string[] = [];
  lines.push(`<text align="center" weight="bold">${esc(data.business_info.name)}&#10;</text>`);
  lines.push(`<text align="center">${esc(data.business_info.address)}&#10;</text>`);
  lines.push(`<text align="center">${esc(data.business_info.phone)}&#10;</text>`);
  lines.push('<text>&#10;</text>');
  lines.push(line(`Ticket #${data.sequence_number}  Commande #${data.order_id}`));
  lines.push(line(`Date: ${new Date(data.created_at).toLocaleString('fr-FR')}`));
  lines.push(line(`Paiement: ${data.payment_method}`));
  lines.push('<text>&#10;</text>');

  if (data.items && data.receipt_type === 'detailed') {
    for (const item of data.items) {
      lines.push(
        line(
          `${item.product_name} x${item.quantity}  ${item.total_price.toFixed(2)} EUR`
        )
      );
    }
    lines.push('<text>&#10;</text>');
  }

  lines.push(line(`TOTAL TTC: ${data.total_amount.toFixed(2)} EUR`));
  lines.push(line(`TVA: ${data.total_tax.toFixed(2)} EUR`));

  if (data.compliance_info?.receipt_hash) {
    lines.push(line(`Hash: ${data.compliance_info.receipt_hash}`));
  }

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
  const lines: string[] = [];
  lines.push(`<text align="center" weight="bold">${esc(data.business_info.name)}&#10;</text>`);
  lines.push(line(`Bulletin de clôture — ${data.closure_type}`));
  lines.push(
    line(
      `${new Date(data.period_start).toLocaleDateString('fr-FR')} → ${new Date(data.period_end).toLocaleDateString('fr-FR')}`
    )
  );
  lines.push('<text>&#10;</text>');
  lines.push(line(`Transactions: ${data.total_transactions}`));
  lines.push(line(`Total TTC: ${data.total_amount.toFixed(2)} EUR`));
  lines.push(line(`TVA: ${data.total_vat.toFixed(2)} EUR`));
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
