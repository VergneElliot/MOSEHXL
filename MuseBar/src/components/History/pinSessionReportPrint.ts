import type { PinSessionReportSnapshot } from '../../services/api/pinSessionReports';
import { formatCurrency } from '../../utils/formatCurrency';

const PARIS_SHORT = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : PARIS_SHORT.format(d);
}

/** Opens a minimal browser print window for an operational session sheet. */
export function printPinSessionReport(snap: PinSessionReportSnapshot): void {
  const payments = Object.entries(snap.payment_breakdown || {})
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td style="text-align:right">${formatCurrency(v)}</td></tr>`)
    .join('');
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Rapport de session — ${escapeHtml(snap.staff_display_name)}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  .muted { color: #555; font-size: 0.85rem; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  td, th { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Rapport de session PIN</h1>
<p class="muted">Document informatif — ce n’est pas un bulletin de clôture fiscal.</p>
<p><strong>${escapeHtml(snap.staff_display_name)}</strong></p>
<p>Du ${fmt(snap.period_start)} au ${fmt(snap.period_end)}
 (${snap.session_closed ? 'session fermée' : 'session ouverte'})</p>
<p>${snap.order_count} vente${snap.order_count > 1 ? 's' : ''} —
 <strong>${formatCurrency(snap.total_amount)}</strong></p>
<table>
  <thead><tr><th>Paiement</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>${payments || '<tr><td colspan="2">Aucun paiement</td></tr>'}</tbody>
</table>
<table>
  <thead><tr><th>TVA</th><th style="text-align:right">HT</th><th style="text-align:right">TVA</th><th style="text-align:right">TTC</th></tr></thead>
  <tbody>
    <tr><td>10 %</td>
      <td style="text-align:right">${formatCurrency(snap.vat_breakdown.vat_10.amount)}</td>
      <td style="text-align:right">${formatCurrency(snap.vat_breakdown.vat_10.vat)}</td>
      <td style="text-align:right">${formatCurrency(snap.vat_breakdown.vat_10.ttc)}</td></tr>
    <tr><td>20 %</td>
      <td style="text-align:right">${formatCurrency(snap.vat_breakdown.vat_20.amount)}</td>
      <td style="text-align:right">${formatCurrency(snap.vat_breakdown.vat_20.vat)}</td>
      <td style="text-align:right">${formatCurrency(snap.vat_breakdown.vat_20.ttc)}</td></tr>
  </tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
