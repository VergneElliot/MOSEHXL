import { 
  IPrintingService, 
  ReceiptData, 
  ClosureBulletinData, 
  PrintResult, 
  PrinterStatus, 
  Printer,
  PrintingConfig,
  ESC_POS 
} from './types';
import { formatEuroAmount } from '../../utils/formatCurrency';
import { groupReceiptLineItemsForPrint } from '../../printing/printLineGrouping';

function normalizeThermalText(content: string): string {
  const replaced = content
    .replace(/€/g, 'EUR')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/°/g, ' deg ')
    .replace(/\u00a0/g, ' ');

  const withoutDiacritics = replaced.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return Array.from(withoutDiacritics)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code <= 0x1f || (code >= 0x20 && code <= 0x7e)) {
        return char;
      }
      return '?';
    })
    .join('');
}

export abstract class BasePrintingService implements IPrintingService {
  protected config: PrintingConfig;
  protected isInitialized: boolean = false;

  constructor(config: PrintingConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract printReceipt(data: ReceiptData): Promise<PrintResult>;
  abstract printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult>;
  abstract checkPrinterStatus(printerId?: string): Promise<PrinterStatus>;
  abstract listPrinters(): Promise<Printer[]>;

  async testPrint(printerId?: string): Promise<PrintResult> {
    void printerId;
    const testData: ReceiptData = {
      order_id: 99999,
      sequence_number: 99999,
      total_amount: 10.00,
      total_tax: 2.00,
      payment_method: 'Test',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'TEST PRINT',
        address: 'Test Address',
        phone: '00 00 00 00 00',
        email: 'test@example.com'
      },
      receipt_type: 'summary',
      items: [{
        product_name: 'Test Item',
        quantity: 1,
        unit_price: 8.00,
        total_price: 8.00,
        tax_rate: 20
      }],
      compliance_info: {
        receipt_hash: 'TEST-HASH',
        cash_register_id: 'TEST-CR',
        operator_id: 'TEST-OP'
      }
    };

    try {
      const result = await this.printReceipt(testData);
      return {
        ...result,
        message: result.success ? 'Test print successful' : `Test print failed: ${result.message}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Test print error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  protected generateReceiptContent(data: ReceiptData): string {
    let content = '';
    const isInvoice = data.document_kind === 'invoice';
    const documentLabel = isInvoice ? 'FACTURE' : 'RECU';
    const documentNumber = data.document_number ?? String(data.sequence_number);
    const typeLabel = isInvoice
      ? data.receipt_type === 'summary'
        ? 'Facture sans detail'
        : 'Facture detaillee'
      : data.receipt_type === 'summary'
        ? 'Ticket simplifie'
        : 'Ticket detaille';
    
    // Initialize printer
    content += ESC_POS.INIT;
    
    // Header - Business Info
    content += ESC_POS.CENTER + ESC_POS.BOLD_ON + ESC_POS.DOUBLE_HEIGHT;
    content += data.business_info.name + '\n';
    content += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF;
    content += data.business_info.address + '\n';
    content += `Tel: ${data.business_info.phone}\n`;
    content += `Email: ${data.business_info.email}\n`;
    
    if (data.business_info.siret) {
      content += `SIRET: ${data.business_info.siret}\n`;
    }
    if (data.business_info.tax_identification) {
      content += `TVA: ${data.business_info.tax_identification}\n`;
    }
    
    // Separator
    content += ESC_POS.LEFT;
    content += '================================\n';
    
    // Receipt Info
    content += ESC_POS.BOLD_ON;
    content += `${documentLabel} #${documentNumber}\n`;
    content += ESC_POS.BOLD_OFF;
    content += `Type: ${typeLabel}\n`;
    content += `Commande: ${data.order_id}\n`;
    content += `Date: ${new Date(data.created_at).toLocaleString('fr-FR')}\n`;
    content += `Paiement: ${this.formatPaymentMethod(data.payment_method)}\n`;

    if (isInvoice && data.customer_info) {
      content += '--------------------------------\n';
      content += ESC_POS.BOLD_ON + 'CLIENT\n' + ESC_POS.BOLD_OFF;
      if (data.customer_info.name) content += `${data.customer_info.name}\n`;
      if (data.customer_info.address) content += `${data.customer_info.address}\n`;
      if (data.customer_info.email) content += `${data.customer_info.email}\n`;
      if (data.customer_info.tax_identification) {
        content += `TVA client: ${data.customer_info.tax_identification}\n`;
      }
    }
    
    content += '================================\n';
    
    // Items (for detailed receipts)
    if (data.items && data.receipt_type === 'detailed') {
      content += ESC_POS.BOLD_ON + 'ARTICLES\n' + ESC_POS.BOLD_OFF;
      
      for (const item of groupReceiptLineItemsForPrint(data.items)) {
        const itemLine = `${item.product_name} (${item.quantity} x ${formatEuroAmount(item.unit_price, 'EUR')})`;
        const totalLine = formatEuroAmount(item.total_price, 'EUR');
        content += this.padLine(itemLine, totalLine, 32) + '\n';
      }
      
      content += '================================\n';
    }
    
    // VAT Breakdown
    if (data.vat_breakdown && data.vat_breakdown.length > 0) {
      content += ESC_POS.BOLD_ON + 'TVA\n' + ESC_POS.BOLD_OFF;
      
      for (const vat of data.vat_breakdown) {
        const baseLine = `Base HT (${vat.rate}%): ${formatEuroAmount(vat.subtotal_ht, 'EUR')}`;
        const vatLine = `TVA ${vat.rate}%: ${formatEuroAmount(vat.vat, 'EUR')}`;
        content += baseLine + '\n';
        content += vatLine + '\n';
      }
      
      content += `TVA Totale: ${formatEuroAmount(data.total_tax, 'EUR')}\n`;
      content += `Sous-total HT: ${formatEuroAmount(data.total_amount - data.total_tax, 'EUR')}\n`;
      content += '================================\n';
    }
    
    // Tips and Change
    if (data.tips && data.tips > 0) {
      content += `Pourboire: ${formatEuroAmount(data.tips, 'EUR')}\n`;
    }
    if (data.change && data.change > 0) {
      content += `Monnaie: ${formatEuroAmount(data.change, 'EUR')}\n`;
    }
    
    // Total
    content += ESC_POS.BOLD_ON + ESC_POS.DOUBLE_HEIGHT;
    content += `TOTAL TTC: ${formatEuroAmount(data.total_amount, 'EUR')}\n`;
    content += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF;
    
    // Compliance Info
    if (data.compliance_info) {
      content += '================================\n';
      if (data.compliance_info.receipt_hash) {
        content += `Hash: ${data.compliance_info.receipt_hash.substring(0, 16)}...\n`;
      }
      if (data.compliance_info.invoice_hash) {
        content += `Hash facture: ${data.compliance_info.invoice_hash.substring(0, 16)}...\n`;
      }
      if (data.compliance_info.source_receipt_sequence) {
        content += `Ticket source: ${data.compliance_info.source_receipt_sequence}\n`;
      }
      if (data.compliance_info.cash_register_id) {
        content += `Caisse: ${data.compliance_info.cash_register_id}\n`;
      }
      if (data.compliance_info.operator_id) {
        content += `Opérateur: ${data.compliance_info.operator_id}\n`;
      }
    }
    
    // Footer
    content += ESC_POS.LEFT;
    content += `Ref. legale: Article 286-I-3 bis du CGI\n`;
    content += ESC_POS.CENTER;
    content += '\nMerci de votre visite!\n\n\n\n';
    
    // Cut paper
    content += ESC_POS.CUT;
    
    return normalizeThermalText(content);
  }

  protected generateClosureBulletinContent(data: ClosureBulletinData): string {
    let content = '';
    
    // Initialize printer
    content += ESC_POS.INIT;
    
    // Header - Business Info
    content += ESC_POS.CENTER + ESC_POS.BOLD_ON + ESC_POS.DOUBLE_HEIGHT;
    content += data.business_info.name + '\n';
    content += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF;
    content += data.business_info.address + '\n';
    content += `Tel: ${data.business_info.phone}\n`;
    content += `Email: ${data.business_info.email}\n`;
    
    if (data.business_info.siret) {
      content += `SIRET: ${data.business_info.siret}\n`;
    }
    if (data.business_info.tax_identification) {
      content += `TVA: ${data.business_info.tax_identification}\n`;
    }
    
    // Separator
    content += ESC_POS.LEFT;
    content += '================================\n';
    
    // Closure Bulletin Header
    content += ESC_POS.CENTER + ESC_POS.BOLD_ON + ESC_POS.DOUBLE_HEIGHT;
    content += 'BULLETIN DE CLOTURE\n';
    content += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF;
    
    // Closure Type and Period
    content += ESC_POS.BOLD_ON;
    content += `Type: ${this.formatClosureType(data.closure_type)}\n`;
    content += ESC_POS.BOLD_OFF;
    content += `Periode: ${new Date(data.period_start).toLocaleDateString('fr-FR')}\n`;
    content += `         ${new Date(data.period_end).toLocaleDateString('fr-FR')}\n`;
    content += `Bulletin #${data.id}\n`;
    
    content += '================================\n';
    
    // Summary Information
    content += ESC_POS.BOLD_ON + 'RESUME PERIODE:\n' + ESC_POS.BOLD_OFF;
    content += '--------------------------------\n';
    content += this.padLine('Transactions:', `${data.total_transactions}`, 32) + '\n';
    content += this.padLine('Total TTC:', formatEuroAmount(data.total_amount, 'EUR'), 32) + '\n';
    // Tie-out display: total VAT shown equals sum of displayed buckets.
    const vat10Shown = Math.round((data.vat_breakdown.vat_10?.vat ?? 0) * 100) / 100;
    const vat20Shown = Math.round((data.vat_breakdown.vat_20?.vat ?? 0) * 100) / 100;
    const vatTotalShown = vat10Shown + vat20Shown;
    const htTotalShown = Math.round((data.total_amount - vatTotalShown) * 100) / 100;
    content += this.padLine('Total HT:', formatEuroAmount(htTotalShown, 'EUR'), 32) + '\n';
    content += this.padLine('Montant total TVA:', formatEuroAmount(vatTotalShown, 'EUR'), 32) + '\n';
    
    // VAT Breakdown
    content += '--------------------------------\n';
    content += ESC_POS.BOLD_ON + 'DETAIL TVA:\n' + ESC_POS.BOLD_OFF;
    if (data.vat_breakdown.vat_10) {
      const ttc10 =
        (data.vat_breakdown.vat_10 as { ttc?: number }).ttc ??
        (data.vat_breakdown.vat_10.amount + data.vat_breakdown.vat_10.vat);
      content += this.padLine('Soumis TVA 10%:', formatEuroAmount(ttc10, 'EUR'), 32) + '\n';
      content += this.padLine('Montant TVA 10%:', formatEuroAmount(vat10Shown, 'EUR'), 32) + '\n';
    }
    if (data.vat_breakdown.vat_20) {
      const ttc20 =
        (data.vat_breakdown.vat_20 as { ttc?: number }).ttc ??
        (data.vat_breakdown.vat_20.amount + data.vat_breakdown.vat_20.vat);
      content += this.padLine('Soumis TVA 20%:', formatEuroAmount(ttc20, 'EUR'), 32) + '\n';
      content += this.padLine('Montant TVA 20%:', formatEuroAmount(vat20Shown, 'EUR'), 32) + '\n';
    }
    
    // Payment Methods Breakdown
    content += '--------------------------------\n';
    content += ESC_POS.BOLD_ON + 'MODES DE PAIEMENT:\n' + ESC_POS.BOLD_OFF;
    for (const [method, amount] of Object.entries(data.payment_methods_breakdown)) {
      content += this.padLine(this.formatPaymentMethod(method) + ':', formatEuroAmount(amount, 'EUR'), 32) + '\n';
    }
    
    // Tips and Change
    if (data.tips_total && data.tips_total > 0) {
      content += this.padLine('Pourboires:', formatEuroAmount(data.tips_total, 'EUR'), 32) + '\n';
    }
    if (data.change_total && data.change_total > 0) {
      content += this.padLine('Monnaie rendue:', formatEuroAmount(data.change_total, 'EUR'), 32) + '\n';
    }
    
    // Sequences
    content += '--------------------------------\n';
    content += ESC_POS.BOLD_ON + 'SEQUENCES:\n' + ESC_POS.BOLD_OFF;
    content += this.padLine('Premiere:', `${data.first_sequence}`, 32) + '\n';
    content += this.padLine('Derniere:', `${data.last_sequence}`, 32) + '\n';
    
    content += '================================\n';
    
    // Footer
    content += ESC_POS.CENTER;
    content += 'CLOTURE DEFINITIVE\n';
    content += 'Conformite fiscale\n\n';
    
    // Legal compliance info
    content += ESC_POS.LEFT;
    content += `Ref. legale: Article 286-I-3 bis du CGI\n`;
    if (data.compliance_info?.cash_register_id) {
      content += `Registre: ${data.compliance_info.cash_register_id}\n`;
    }
    content += `Hash: ${data.closure_hash.substring(0, 16)}...\n`;
    
    // Cut paper
    content += '\n\n\n';
    content += ESC_POS.CUT;
    
    return normalizeThermalText(content);
  }

  protected formatPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Espèces',
      'card': 'Carte',
      'split': 'Mixte',
      'check': 'Chèque',
      'transfer': 'Virement'
    };
    return methods[method] || method;
  }

  protected formatClosureType(type: string): string {
    const types: { [key: string]: string } = {
      'DAILY': 'Journalière',
      'WEEKLY': 'Hebdomadaire', 
      'MONTHLY': 'Mensuelle',
      'ANNUAL': 'Annuelle'
    };
    return types[type] || type;
  }

  protected padLine(left: string, right: string, width: number): string {
    const padding = width - left.length - right.length;
    if (padding <= 0) {
      return left + ' ' + right;
    }
    return left + ' '.repeat(padding) + right;
  }
}
