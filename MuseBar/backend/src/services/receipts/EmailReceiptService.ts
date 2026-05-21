import * as nodemailer from 'nodemailer';
import { ReceiptData, ClosureBulletinData } from '../printing/types';
import * as QRCode from 'qrcode';

interface EmailConfig {
  from: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export class EmailReceiptService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config?: EmailConfig) {
    this.config = config || {
      from: process.env.EMAIL_FROM || 'noreply@musebar.com',
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      }
    };

    this.transporter = nodemailer.createTransport(this.config.smtp);
  }

  async sendReceipt(data: ReceiptData, email: string): Promise<void> {
    const html = this.generateReceiptHTML(data);
    const qrCode = await this.generateQRCode(data.order_id);

    await this.transporter.sendMail({
      from: this.config.from,
      to: email,
      subject: `Reçu #${data.sequence_number} - ${data.business_info.name}`,
      html: html,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrCode,
          cid: 'qrcode'
        }
      ]
    });
  }

  async sendClosureBulletin(data: ClosureBulletinData, email: string): Promise<void> {
    const html = this.generateClosureBulletinHTML(data);

    await this.transporter.sendMail({
      from: this.config.from,
      to: email,
      subject: `Bulletin de Clôture #${data.id} - ${data.business_info.name}`,
      html: html
    });
  }

  private async generateQRCode(orderId: number): Promise<Buffer> {
    const url = `${process.env.APP_URL || 'http://localhost:3000'}/receipts/${orderId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 2
    });
    
    // Convert data URL to buffer
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  private generateReceiptHTML(data: ReceiptData): string {
    const itemsHTML = data.items && data.receipt_type === 'detailed' ? `
      <table class="items-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Qté</th>
            <th>Prix Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td class="center">${item.quantity}</td>
              <td class="right">${item.unit_price.toFixed(2)} €</td>
              <td class="right">${item.total_price.toFixed(2)} €</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    const vatHTML = data.vat_breakdown && data.vat_breakdown.length > 0 ? `
      <div class="vat-section">
        <h3>Détail TVA</h3>
        <table class="vat-table">
          ${data.vat_breakdown.map(vat => `
            <tr>
              <td>Base HT (${vat.rate}%):</td>
              <td class="right">${vat.subtotal_ht.toFixed(2)} €</td>
            </tr>
            <tr>
              <td>TVA ${vat.rate}%:</td>
              <td class="right">${vat.vat.toFixed(2)} €</td>
            </tr>
          `).join('')}
          <tr class="separator">
            <td colspan="2"><hr></td>
          </tr>
          <tr>
            <td><strong>TVA Totale:</strong></td>
            <td class="right"><strong>${data.total_tax.toFixed(2)} €</strong></td>
          </tr>
          <tr>
            <td><strong>Sous-total HT:</strong></td>
            <td class="right"><strong>${(data.total_amount - data.total_tax).toFixed(2)} €</strong></td>
          </tr>
        </table>
      </div>
    ` : '';

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
          .receipt-container {
            max-width: 600px;
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
          .receipt-info {
            background: #f9f9f9;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .receipt-info h2 {
            margin-top: 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th {
            background: #f0f0f0;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #ddd;
          }
          .items-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .vat-section {
            margin: 20px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 5px;
          }
          .vat-table {
            width: 100%;
            margin-top: 10px;
          }
          .vat-table td {
            padding: 5px 0;
          }
          .separator hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 10px 0;
          }
          .total-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #333;
            color: white;
            border-radius: 5px;
          }
          .total-section h2 {
            margin: 0;
            font-size: 24px;
          }
          .compliance-info {
            font-size: 12px;
            color: #666;
            margin-top: 20px;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
          }
          .qr-code {
            text-align: center;
            margin: 30px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>${data.business_info.name}</h1>
            <p>${data.business_info.address}</p>
            <p>Tel: ${data.business_info.phone} | Email: ${data.business_info.email}</p>
            ${data.business_info.siret ? `<p>SIRET: ${data.business_info.siret}</p>` : ''}
            ${data.business_info.tax_identification ? `<p>TVA: ${data.business_info.tax_identification}</p>` : ''}
          </div>
          
          <div class="receipt-info">
            <h2>REÇU #${data.sequence_number}</h2>
            <p><strong>Commande:</strong> ${data.order_id}</p>
            <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleString('fr-FR')}</p>
            <p><strong>Mode de paiement:</strong> ${this.formatPaymentMethod(data.payment_method)}</p>
          </div>
          
          ${itemsHTML}
          ${vatHTML}
          
          ${data.tips && data.tips > 0 ? `<p><strong>Pourboire:</strong> ${data.tips.toFixed(2)} €</p>` : ''}
          ${data.change && data.change > 0 ? `<p><strong>Monnaie:</strong> ${data.change.toFixed(2)} €</p>` : ''}
          
          <div class="total-section">
            <h2>TOTAL TTC: ${data.total_amount.toFixed(2)} €</h2>
          </div>
          
          ${data.compliance_info ? `
            <div class="compliance-info">
              ${data.compliance_info.receipt_hash ? `<p>Hash: ${data.compliance_info.receipt_hash.substring(0, 16)}...</p>` : ''}
              ${data.compliance_info.cash_register_id ? `<p>Caisse: ${data.compliance_info.cash_register_id}</p>` : ''}
              ${data.compliance_info.operator_id ? `<p>Opérateur: ${data.compliance_info.operator_id}</p>` : ''}
            </div>
          ` : ''}
          
          <div class="qr-code">
            <p>Scannez pour voir le reçu en ligne:</p>
            <img src="cid:qrcode" alt="QR Code" />
          </div>
          
          <div class="footer">
            <p>Merci de votre visite!</p>
            <p>Ce reçu est conforme à l'Article 286-I-3 bis du CGI</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateClosureBulletinHTML(data: ClosureBulletinData): string {
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
            <h3>Type: ${this.formatClosureType(data.closure_type)}</h3>
            <p>Période: ${new Date(data.period_start).toLocaleDateString('fr-FR')} - ${new Date(data.period_end).toLocaleDateString('fr-FR')}</p>
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
                <td class="value">${data.total_amount.toFixed(2)} EUR</td>
              </tr>
              <tr>
                <td>Total HT:</td>
                <td class="value">${htTotalShown.toFixed(2)} EUR</td>
              </tr>
              <tr>
                <td>Montant total TVA:</td>
                <td class="value">${vatTotalShown.toFixed(2)} EUR</td>
              </tr>
            </table>
          </div>
          
          <div class="section">
            <h3>DÉTAIL TVA</h3>
            <table>
              ${data.vat_breakdown.vat_10 ? `
                <tr>
                  <td>Total soumis à TVA 10%:</td>
                  <td class="value">${(((data.vat_breakdown.vat_10 as { ttc?: number }).ttc ?? (data.vat_breakdown.vat_10.amount + data.vat_breakdown.vat_10.vat)) as number).toFixed(2)} EUR</td>
                </tr>
                <tr>
                  <td>Montant TVA 10%:</td>
                  <td class="value">${vat10Shown.toFixed(2)} EUR</td>
                </tr>
              ` : ''}
              ${data.vat_breakdown.vat_20 ? `
                <tr>
                  <td>Total soumis à TVA 20%:</td>
                  <td class="value">${(((data.vat_breakdown.vat_20 as { ttc?: number }).ttc ?? (data.vat_breakdown.vat_20.amount + data.vat_breakdown.vat_20.vat)) as number).toFixed(2)} EUR</td>
                </tr>
                <tr>
                  <td>Montant TVA 20%:</td>
                  <td class="value">${vat20Shown.toFixed(2)} EUR</td>
                </tr>
              ` : ''}
            </table>
          </div>
          
          <div class="section">
            <h3>MODES DE PAIEMENT</h3>
            <table>
              ${Object.entries(data.payment_methods_breakdown).map(([method, amount]) => `
                <tr>
                  <td>${this.formatPaymentMethod(method)}:</td>
                  <td class="value">${amount.toFixed(2)} EUR</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          ${data.tips_total && data.tips_total > 0 ? `
            <div class="section">
              <p><strong>Total des pourboires:</strong> ${data.tips_total.toFixed(2)} EUR</p>
            </div>
          ` : ''}
          
          ${data.change_total && data.change_total > 0 ? `
            <div class="section">
              <p><strong>Total de la monnaie rendue:</strong> ${data.change_total.toFixed(2)} EUR</p>
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
            ${data.closed_at ? `<p>Clôturé le: ${new Date(data.closed_at).toLocaleString('fr-FR')}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private formatPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Espèces',
      'card': 'Carte',
      'split': 'Mixte',
      'check': 'Chèque',
      'transfer': 'Virement'
    };
    return methods[method] || method;
  }

  private formatClosureType(type: string): string {
    const types: { [key: string]: string } = {
      'DAILY': 'Journalière',
      'WEEKLY': 'Hebdomadaire',
      'MONTHLY': 'Mensuelle',
      'ANNUAL': 'Annuelle'
    };
    return types[type] || type;
  }
}
