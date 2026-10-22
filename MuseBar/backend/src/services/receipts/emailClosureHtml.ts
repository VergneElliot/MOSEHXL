import { ClosureBulletinData } from '../printing/types';
import { formatEuroAmount } from '../../utils/formatCurrency';
import { formatDateOnly, formatDateTime } from '@mosehxl/types';
import { formatClosureType, formatPaymentMethod } from './emailReceiptFormat';

export function generateClosureBulletinHTML(data: ClosureBulletinData): string {
  const vat10Shown = Math.round((data.vat_breakdown.vat_10?.vat ?? 0) * 100) / 100;
  const vat20Shown = Math.round((data.vat_breakdown.vat_20?.vat ?? 0) * 100) / 100;
  const vatTotalShown = vat10Shown + vat20Shown;
  const htTotalShown = Math.round((data.total_amount - vatTotalShown) * 100) / 100;

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .bulletin-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .bulletin-header {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
          }
          .bulletin-header h1 {
            margin: 0;
          }
          .section {
            margin: 30px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 5px;
          }
          .section h3 {
            margin-top: 0;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 8px 0;
          }
          .value {
            text-align: right;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: #f0f0f0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="bulletin-container">
          <div class="header">
            <h1>${data.business_info.name}</h1>
            <p>${data.business_info.address}</p>
            <p>Tel: ${data.business_info.phone} | Email: ${data.business_info.email}</p>
            ${data.business_info.siret ? `<p>SIRET: ${data.business_info.siret}</p>` : ''}
            ${data.business_info.tax_identification ? `<p>TVA: ${data.business_info.tax_identification}</p>` : ''}
          </div>
          
          <div class="bulletin-header">
            <h1>BULLETIN DE CLÔTURE</h1>
            <h3>Type: ${formatClosureType(data.closure_type)}</h3>
            <p>Période: ${formatDateOnly(data.period_start)} - ${formatDateOnly(data.period_end)}</p>
            <p>Bulletin #${data.id}</p>
          </div>
          
          <div class="section">
            <h3>RÉSUMÉ PÉRIODE</h3>
            <table>
              <tr>
                <td>Nombre de transactions:</td>
                <td class="value">${data.total_transactions}</td>
              </tr>
              <tr>
                <td>Montant total TTC:</td>
                <td class="value">${formatEuroAmount(data.total_amount, 'EUR')}</td>
              </tr>
              <tr>
                <td>Total HT:</td>
                <td class="value">${formatEuroAmount(htTotalShown, 'EUR')}</td>
              </tr>
              <tr>
                <td>Montant total TVA:</td>
                <td class="value">${formatEuroAmount(vatTotalShown, 'EUR')}</td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h3>DÉTAIL TVA</h3>
            <table>
              ${data.vat_breakdown.vat_10 ? `
                <tr>
                  <td>Total soumis à TVA 10%:</td>
                  <td class="value">${formatEuroAmount((((data.vat_breakdown.vat_10 as { ttc?: number }).ttc ?? (data.vat_breakdown.vat_10.amount + data.vat_breakdown.vat_10.vat)) as number), 'EUR')}</td>
                </tr>
                <tr>
                  <td>Montant TVA 10%:</td>
                  <td class="value">${formatEuroAmount(vat10Shown, 'EUR')}</td>
                </tr>
              ` : ''}
              ${data.vat_breakdown.vat_20 ? `
                <tr>
                  <td>Total soumis à TVA 20%:</td>
                  <td class="value">${formatEuroAmount((((data.vat_breakdown.vat_20 as { ttc?: number }).ttc ?? (data.vat_breakdown.vat_20.amount + data.vat_breakdown.vat_20.vat)) as number), 'EUR')}</td>
                </tr>
                <tr>
                  <td>Montant TVA 20%:</td>
                  <td class="value">${formatEuroAmount(vat20Shown, 'EUR')}</td>
                </tr>
              ` : ''}
            </table>
          </div>
          
          <div class="section">
            <h3>MODES DE PAIEMENT</h3>
            <table>
              ${Object.entries(data.payment_methods_breakdown).map(([method, amount]) => `
                <tr>
                  <td>${formatPaymentMethod(method)}:</td>
                  <td class="value">${formatEuroAmount(amount, 'EUR')}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          ${data.tips_total && data.tips_total > 0 ? `
            <div class="section">
              <p><strong>Total des pourboires:</strong> ${formatEuroAmount(data.tips_total, 'EUR')}</p>
            </div>
          ` : ''}
          
          ${data.change_total && data.change_total > 0 ? `
            <div class="section">
              <p><strong>Total de la monnaie rendue:</strong> ${formatEuroAmount(data.change_total, 'EUR')}</p>
            </div>
          ` : ''}
          
          <div class="section">
            <h3>SÉQUENCES</h3>
            <table>
              <tr>
                <td>Première séquence:</td>
                <td class="value">${data.first_sequence}</td>
              </tr>
              <tr>
                <td>Dernière séquence:</td>
                <td class="value">${data.last_sequence}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            <h3>CLÔTURE DÉFINITIVE</h3>
            <p>Conformité fiscale assurée</p>
            <p>Réf. légale: Article 286-I-3 bis du CGI</p>
            ${data.compliance_info?.cash_register_id ? `<p>Registre: ${data.compliance_info.cash_register_id}</p>` : ''}
            <p>Hash de clôture: ${data.closure_hash.substring(0, 16)}...</p>
            ${data.closed_at ? `<p>Clôturé le: ${formatDateTime(data.closed_at)}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
}
