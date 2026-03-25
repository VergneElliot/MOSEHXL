import { BasePrintingService } from './BasePrintingService';
import { 
  ReceiptData, 
  ClosureBulletinData, 
  PrintResult, 
  PrinterStatus, 
  Printer,
  PrintingConfig 
} from './types';

export class BrowserPrintingService extends BasePrintingService {
  constructor(config: PrintingConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    // Browser printing doesn't require initialization
    this.isInitialized = true;
    console.log('Browser printing service initialized');
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    try {
      const htmlContent = this.generateReceiptHTML(data);
      
      return {
        success: true,
        message: 'Receipt prepared for browser printing',
        provider: 'browser',
        metadata: {
          html: htmlContent,
          printInstructions: 'Use window.print() or open print dialog in browser'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Browser printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'browser'
      };
    }
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    try {
      const htmlContent = this.generateClosureBulletinHTML(data);
      
      return {
        success: true,
        message: 'Closure bulletin prepared for browser printing',
        provider: 'browser',
        metadata: {
          html: htmlContent,
          printInstructions: 'Use window.print() or open print dialog in browser'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Browser printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: 'browser'
      };
    }
  }

  async checkPrinterStatus(printerId?: string): Promise<PrinterStatus> {
    // Browser printing is always available
    return {
      available: true,
      status: 'Browser printing is available',
      printerId: 'browser',
      printerName: 'Browser Print Dialog',
      provider: 'browser'
    };
  }

  async listPrinters(): Promise<Printer[]> {
    return [{
      id: 'browser',
      name: 'Browser Print Dialog',
      description: 'Print using browser print dialog (PDF/HTML)',
      capabilities: ['pdf', 'html', 'receipt', 'bulletin'],
      isDefault: true,
      status: 'Available',
      provider: 'browser'
    }];
  }

  private generateReceiptHTML(data: ReceiptData): string {
    const styles = this.getReceiptStyles();
    
    let itemsHTML = '';
    if (data.items && data.receipt_type === 'detailed') {
      itemsHTML = `
        <div class="section">
          <h3>ARTICLES</h3>
          <table class="items-table">
            ${data.items.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td class="quantity">${item.quantity} x ${item.unit_price.toFixed(2)} €</td>
                <td class="price">${item.total_price.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    }

    let vatHTML = '';
    if (data.vat_breakdown && data.vat_breakdown.length > 0) {
      vatHTML = `
        <div class="section">
          <h3>TVA</h3>
          <table class="vat-table">
            ${data.vat_breakdown.map(vat => `
              <tr>
                <td>Base HT (${vat.rate}%):</td>
                <td class="price">${vat.subtotal_ht.toFixed(2)} €</td>
              </tr>
              <tr>
                <td>TVA ${vat.rate}%:</td>
                <td class="price">${vat.vat.toFixed(2)} €</td>
              </tr>
            `).join('')}
            <tr class="separator-row">
              <td colspan="2"><hr></td>
            </tr>
            <tr>
              <td><strong>TVA Totale:</strong></td>
              <td class="price"><strong>${data.total_tax.toFixed(2)} €</strong></td>
            </tr>
            <tr>
              <td><strong>Sous-total HT:</strong></td>
              <td class="price"><strong>${(data.total_amount - data.total_tax).toFixed(2)} €</strong></td>
            </tr>
          </table>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reçu #${data.sequence_number}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>${data.business_info.name}</h1>
            <p>${data.business_info.address}</p>
            <p>Tel: ${data.business_info.phone}</p>
            <p>Email: ${data.business_info.email}</p>
            ${data.business_info.siret ? `<p>SIRET: ${data.business_info.siret}</p>` : ''}
            ${data.business_info.tax_identification ? `<p>TVA: ${data.business_info.tax_identification}</p>` : ''}
          </div>
          
          <div class="separator"></div>
          
          <div class="receipt-info">
            <h2>REÇU #${data.sequence_number}</h2>
            <p><strong>Commande:</strong> ${data.order_id}</p>
            <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleString('fr-FR')}</p>
            <p><strong>Paiement:</strong> ${this.formatPaymentMethod(data.payment_method)}</p>
          </div>
          
          <div class="separator"></div>
          
          ${itemsHTML}
          ${vatHTML}
          
          ${data.tips && data.tips > 0 ? `<p class="extra-line">Pourboire: ${data.tips.toFixed(2)} €</p>` : ''}
          ${data.change && data.change > 0 ? `<p class="extra-line">Monnaie: ${data.change.toFixed(2)} €</p>` : ''}
          
          <div class="total-section">
            <h2>TOTAL TTC: ${data.total_amount.toFixed(2)} €</h2>
          </div>
          
          ${data.compliance_info ? `
            <div class="separator"></div>
            <div class="compliance-info">
              ${data.compliance_info.receipt_hash ? `<p>Hash: ${data.compliance_info.receipt_hash.substring(0, 16)}...</p>` : ''}
              ${data.compliance_info.cash_register_id ? `<p>Caisse: ${data.compliance_info.cash_register_id}</p>` : ''}
              ${data.compliance_info.operator_id ? `<p>Opérateur: ${data.compliance_info.operator_id}</p>` : ''}
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Merci de votre visite!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateClosureBulletinHTML(data: ClosureBulletinData): string {
    const styles = this.getBulletinStyles();
    
    const vat10Shown = Math.round((data.vat_breakdown.vat_10?.vat ?? 0) * 100) / 100;
    const vat20Shown = Math.round((data.vat_breakdown.vat_20?.vat ?? 0) * 100) / 100;
    const vatTotalShown = vat10Shown + vat20Shown;
    const htTotalShown = Math.round((data.total_amount - vatTotalShown) * 100) / 100;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bulletin de Clôture #${data.id}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="bulletin-container">
          <div class="header">
            <h1>${data.business_info.name}</h1>
            <p>${data.business_info.address}</p>
            <p>Tel: ${data.business_info.phone}</p>
            <p>Email: ${data.business_info.email}</p>
            ${data.business_info.siret ? `<p>SIRET: ${data.business_info.siret}</p>` : ''}
            ${data.business_info.tax_identification ? `<p>TVA: ${data.business_info.tax_identification}</p>` : ''}
          </div>
          
          <div class="separator"></div>
          
          <div class="bulletin-header">
            <h1>BULLETIN DE CLÔTURE</h1>
            <h3>Type: ${this.formatClosureType(data.closure_type)}</h3>
            <p>Période: ${new Date(data.period_start).toLocaleDateString('fr-FR')} - ${new Date(data.period_end).toLocaleDateString('fr-FR')}</p>
            <p>Bulletin #${data.id}</p>
          </div>
          
          <div class="separator"></div>
          
          <div class="section">
            <h3>RÉSUMÉ PÉRIODE:</h3>
            <table class="summary-table">
              <tr>
                <td>Transactions:</td>
                <td class="value">${data.total_transactions}</td>
              </tr>
              <tr>
                <td>Total TTC:</td>
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
            <h3>DÉTAIL TVA:</h3>
            <table class="vat-table">
              ${data.vat_breakdown.vat_10 ? `
                <tr>
                  <td>Total soumis à TVA 10%:</td>
                  <td class="value">${(((data.vat_breakdown.vat_10 as any).ttc ?? (data.vat_breakdown.vat_10.amount + data.vat_breakdown.vat_10.vat)) as number).toFixed(2)} EUR</td>
                </tr>
                <tr>
                  <td>Montant TVA 10%:</td>
                  <td class="value">${vat10Shown.toFixed(2)} EUR</td>
                </tr>
              ` : ''}
              ${data.vat_breakdown.vat_20 ? `
                <tr>
                  <td>Total soumis à TVA 20%:</td>
                  <td class="value">${(((data.vat_breakdown.vat_20 as any).ttc ?? (data.vat_breakdown.vat_20.amount + data.vat_breakdown.vat_20.vat)) as number).toFixed(2)} EUR</td>
                </tr>
                <tr>
                  <td>Montant TVA 20%:</td>
                  <td class="value">${vat20Shown.toFixed(2)} EUR</td>
                </tr>
              ` : ''}
            </table>
          </div>
          
          <div class="section">
            <h3>MODES DE PAIEMENT:</h3>
            <table class="payment-table">
              ${Object.entries(data.payment_methods_breakdown).map(([method, amount]) => `
                <tr>
                  <td>${this.formatPaymentMethod(method)}:</td>
                  <td class="value">${amount.toFixed(2)} EUR</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          ${data.tips_total && data.tips_total > 0 ? `
            <p class="extra-line">Pourboires: ${data.tips_total.toFixed(2)} EUR</p>
          ` : ''}
          ${data.change_total && data.change_total > 0 ? `
            <p class="extra-line">Monnaie rendue: ${data.change_total.toFixed(2)} EUR</p>
          ` : ''}
          
          <div class="section">
            <h3>SÉQUENCES:</h3>
            <table class="sequence-table">
              <tr>
                <td>Première:</td>
                <td class="value">${data.first_sequence}</td>
              </tr>
              <tr>
                <td>Dernière:</td>
                <td class="value">${data.last_sequence}</td>
              </tr>
            </table>
          </div>
          
          <div class="separator"></div>
          
          <div class="footer">
            <h3>CLÔTURE DÉFINITIVE</h3>
            <p>Conformité fiscale</p>
            <p>Réf. légale: Article 286-I-3 bis du CGI</p>
            <p>Registre: MUSEBAR-REG-001</p>
            <p>Hash: ${data.closure_hash.substring(0, 16)}...</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getReceiptStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: #fff;
      }
      
      .receipt-container {
        width: 280px;
        margin: 0 auto;
        padding: 10px;
      }
      
      .header {
        text-align: center;
        margin-bottom: 10px;
      }
      
      .header h1 {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .header p {
        font-size: 11px;
      }
      
      .separator {
        border-top: 1px dashed #000;
        margin: 10px 0;
      }
      
      .receipt-info {
        text-align: center;
        margin-bottom: 10px;
      }
      
      .receipt-info h2 {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .receipt-info p {
        font-size: 11px;
        text-align: left;
      }
      
      .section {
        margin: 10px 0;
      }
      
      .section h3 {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .items-table, .vat-table, .summary-table {
        width: 100%;
        font-size: 11px;
      }
      
      .items-table td {
        padding: 2px 0;
      }
      
      .quantity {
        text-align: center;
        font-size: 10px;
      }
      
      .price {
        text-align: right;
        font-weight: bold;
      }
      
      .separator-row hr {
        border: none;
        border-top: 1px dashed #000;
        margin: 5px 0;
      }
      
      .extra-line {
        font-size: 11px;
        margin: 5px 0;
      }
      
      .total-section {
        text-align: center;
        margin: 15px 0;
        padding: 10px;
        border: 2px solid #000;
      }
      
      .total-section h2 {
        font-size: 18px;
        font-weight: bold;
      }
      
      .compliance-info {
        font-size: 9px;
        text-align: center;
      }
      
      .footer {
        text-align: center;
        margin-top: 15px;
        font-size: 11px;
      }
      
      @media print {
        body {
          width: 280px;
        }
        
        .receipt-container {
          page-break-after: always;
        }
      }
    `;
  }

  private getBulletinStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #000;
        background: #fff;
      }
      
      .bulletin-container {
        width: 280px;
        margin: 0 auto;
        padding: 10px;
      }
      
      .header {
        text-align: center;
        margin-bottom: 10px;
      }
      
      .header h1 {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .header p {
        font-size: 11px;
      }
      
      .separator {
        border-top: 1px dashed #000;
        margin: 10px 0;
      }
      
      .bulletin-header {
        text-align: center;
        margin-bottom: 10px;
      }
      
      .bulletin-header h1 {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .bulletin-header h3 {
        font-size: 13px;
        margin-bottom: 3px;
      }
      
      .bulletin-header p {
        font-size: 11px;
      }
      
      .section {
        margin: 10px 0;
      }
      
      .section h3 {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .summary-table, .vat-table, .payment-table, .sequence-table {
        width: 100%;
        font-size: 11px;
      }
      
      .summary-table td, .vat-table td, .payment-table td, .sequence-table td {
        padding: 3px 0;
      }
      
      .value {
        text-align: right;
        font-weight: bold;
      }
      
      .extra-line {
        font-size: 11px;
        margin: 5px 0;
      }
      
      .footer {
        text-align: center;
        margin-top: 15px;
        font-size: 10px;
      }
      
      .footer h3 {
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      @media print {
        body {
          width: 280px;
        }
        
        .bulletin-container {
          page-break-after: always;
        }
      }
    `;
  }
}
