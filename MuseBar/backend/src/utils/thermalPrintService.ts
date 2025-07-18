import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ReceiptData {
  order_id: number;
  sequence_number: number;
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
  vat_breakdown?: Array<{
    rate: number;
    subtotal_ht: number;
    vat: number;
  }>;
  receipt_type: 'detailed' | 'summary';
  tips?: number;
  change?: number;
  compliance_info?: {
    receipt_hash?: string;
    cash_register_id?: string;
    operator_id?: string;
  };
}

interface ClosureBulletinData {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10: { amount: number; vat: number };
    vat_20: { amount: number; vat: number };
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
}

export class ThermalPrintService {
  private static readonly PRINTER_NAME = 'Oxhoo-TP85v-Network';
  private static readonly TEMP_DIR = '/tmp';
  
  // ESC/POS Commands
  private static readonly ESC = '\x1B';
  private static readonly INIT = '\x1B@';           // Initialize printer
  private static readonly BOLD_ON = '\x1B\x45\x01'; // Bold on
  private static readonly BOLD_OFF = '\x1B\x45\x00'; // Bold off
  private static readonly CENTER = '\x1B\x61\x01';   // Center align
  private static readonly LEFT = '\x1B\x61\x00';     // Left align
  private static readonly CUT = '\x1D\x56\x00';      // Cut paper
  private static readonly DOUBLE_HEIGHT = '\x1B\x21\x10'; // Double height
  private static readonly NORMAL_SIZE = '\x1B\x21\x00';   // Normal size
  
  /**
   * Generate thermal receipt content in ESC/POS format
   */
  private static generateReceiptContent(data: ReceiptData): string {
    let content = '';
    
    // Initialize printer
    content += this.INIT;
    
    // Header - Business Info
    content += this.CENTER + this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += data.business_info.name + '\n';
    content += this.NORMAL_SIZE + this.BOLD_OFF;
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
    content += this.LEFT;
    content += '================================\n';
    
    // Receipt Info
    content += this.BOLD_ON;
    content += `RECU #${data.sequence_number}\n`;
    content += this.BOLD_OFF;
    content += `Commande: ${data.order_id}\n`;
    content += `Date: ${new Date(data.created_at).toLocaleString('fr-FR')}\n`;
    content += `Paiement: ${this.formatPaymentMethod(data.payment_method)}\n`;
    
    content += '================================\n';
    
    // Items (for detailed receipts)
    if (data.receipt_type === 'detailed' && data.items && data.items.length > 0) {
      content += this.BOLD_ON + 'ARTICLES:\n' + this.BOLD_OFF;
      content += '--------------------------------\n';
      
      for (const item of data.items) {
        // Product name
        content += this.wrapText(item.product_name, 32) + '\n';
        
        // Quantity x Price = Total
        const qtyPrice = `${item.quantity} x ${item.unit_price.toFixed(2)} EUR`;
        const total = `${item.total_price.toFixed(2)} EUR`;
        content += this.padLine(qtyPrice, total, 32) + '\n';
        
        // Tax rate
        content += `  TVA ${item.tax_rate.toFixed(1)}%\n`;
        content += '\n';
      }
      
      content += '--------------------------------\n';
    }
    
    // VAT Breakdown
    if (data.vat_breakdown && data.vat_breakdown.length > 0) {
      content += this.BOLD_ON + 'DETAIL TVA:\n' + this.BOLD_OFF;
      for (const vat of data.vat_breakdown) {
        const htAmount = `HT ${vat.rate.toFixed(1)}%`;
        const vatAmount = `${vat.vat.toFixed(2)} EUR`;
        content += this.padLine(htAmount, vatAmount, 32) + '\n';
      }
      content += '--------------------------------\n';
    }
    
    // Totals
    const subtotalHT = data.total_amount - data.total_tax;
    content += this.padLine('Sous-total HT:', `${subtotalHT.toFixed(2)} EUR`, 32) + '\n';
    content += this.padLine('TVA:', `${data.total_tax.toFixed(2)} EUR`, 32) + '\n';
    content += '--------------------------------\n';
    
    // Final total
    content += this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += this.padLine('TOTAL:', `${data.total_amount.toFixed(2)} EUR`, 32) + '\n';
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    
    // Tips and change
    if (data.tips && data.tips > 0) {
      content += this.padLine('Pourboire:', `${data.tips.toFixed(2)} EUR`, 32) + '\n';
    }
    if (data.change && data.change > 0) {
      content += this.padLine('Rendu:', `${data.change.toFixed(2)} EUR`, 32) + '\n';
    }
    
    content += '================================\n';
    
    // Footer
    content += this.CENTER;
    content += 'Merci de votre visite!\n';
    content += 'A bientot!\n\n';
    
    // Legal compliance info
    content += this.LEFT;
    content += `Ref. legale: Article 286-I-3 bis du CGI\n`;
    content += `Registre: MUSEBAR-REG-001\n`;
    
    // Additional compliance info
    if (data.compliance_info) {
      if (data.compliance_info.cash_register_id) {
        content += `Caisse: ${data.compliance_info.cash_register_id}\n`;
      }
      if (data.compliance_info.operator_id) {
        content += `Operateur: ${data.compliance_info.operator_id}\n`;
      }
      if (data.compliance_info.receipt_hash) {
        content += `Hash: ${data.compliance_info.receipt_hash.substring(0, 16)}...\n`;
      }
    }
    
    // Cut paper
    content += '\n\n\n';
    content += this.CUT;
    
    return content;
  }

  /**
   * Generate thermal closure bulletin content in ESC/POS format
   */
  private static generateClosureBulletinContent(data: ClosureBulletinData): string {
    let content = '';
    
    // Initialize printer
    content += this.INIT;
    
    // Header - Business Info
    content += this.CENTER + this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += data.business_info.name + '\n';
    content += this.NORMAL_SIZE + this.BOLD_OFF;
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
    content += this.LEFT;
    content += '================================\n';
    
    // Closure Bulletin Header
    content += this.CENTER + this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += 'BULLETIN DE CLOTURE\n';
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    
    // Closure Type and Period
    content += this.BOLD_ON;
    content += `Type: ${this.formatClosureType(data.closure_type)}\n`;
    content += this.BOLD_OFF;
    content += `Periode: ${new Date(data.period_start).toLocaleDateString('fr-FR')}\n`;
    content += `         ${new Date(data.period_end).toLocaleDateString('fr-FR')}\n`;
    content += `Bulletin #${data.id}\n`;
    
    content += '================================\n';
    
    // Summary Information
    content += this.BOLD_ON + 'RESUME PERIODE:\n' + this.BOLD_OFF;
    content += '--------------------------------\n';
    content += this.padLine('Transactions:', `${data.total_transactions}`, 32) + '\n';
    content += this.padLine('Total TTC:', `${data.total_amount.toFixed(2)} EUR`, 32) + '\n';
    content += this.padLine('TVA collectee:', `${data.total_vat.toFixed(2)} EUR`, 32) + '\n';
    
    // VAT Breakdown
    content += '--------------------------------\n';
    content += this.BOLD_ON + 'DETAIL TVA:\n' + this.BOLD_OFF;
    if (data.vat_breakdown.vat_10) {
      content += this.padLine('TVA 10%:', `${data.vat_breakdown.vat_10.vat.toFixed(2)} EUR`, 32) + '\n';
    }
    if (data.vat_breakdown.vat_20) {
      content += this.padLine('TVA 20%:', `${data.vat_breakdown.vat_20.vat.toFixed(2)} EUR`, 32) + '\n';
    }
    
    // Payment Methods Breakdown
    content += '--------------------------------\n';
    content += this.BOLD_ON + 'MODES DE PAIEMENT:\n' + this.BOLD_OFF;
    if (data.payment_methods_breakdown.cash) {
      content += this.padLine('Especes:', `${data.payment_methods_breakdown.cash.toFixed(2)} EUR`, 32) + '\n';
    }
    if (data.payment_methods_breakdown.card) {
      content += this.padLine('Carte:', `${data.payment_methods_breakdown.card.toFixed(2)} EUR`, 32) + '\n';
    }
    
    // Tips and Change
    if (data.tips_total && data.tips_total > 0) {
      content += this.padLine('Pourboires:', `${data.tips_total.toFixed(2)} EUR`, 32) + '\n';
    }
    if (data.change_total && data.change_total > 0) {
      content += this.padLine('Monnaie rendue:', `${data.change_total.toFixed(2)} EUR`, 32) + '\n';
    }
    
    // Sequences
    content += '--------------------------------\n';
    content += this.BOLD_ON + 'SEQUENCES:\n' + this.BOLD_OFF;
    content += this.padLine('Premiere:', `${data.first_sequence}`, 32) + '\n';
    content += this.padLine('Derniere:', `${data.last_sequence}`, 32) + '\n';
    
    content += '================================\n';
    
    // Footer
    content += this.CENTER;
    content += 'CLOTURE DEFINITIVE\n';
    content += 'Conformite fiscale\n\n';
    
    // Legal compliance info
    content += this.LEFT;
    content += `Ref. legale: Article 286-I-3 bis du CGI\n`;
    content += `Registre: MUSEBAR-REG-001\n`;
    content += `Hash: ${data.closure_hash.substring(0, 16)}...\n`;
    content += `Cree le: ${new Date(data.created_at).toLocaleString('fr-FR')}\n`;
    if (data.closed_at) {
      content += `Cloture le: ${new Date(data.closed_at).toLocaleString('fr-FR')}\n`;
    }
    
    // Cut paper
    content += '\n\n\n';
    content += this.CUT;
    
    return content;
  }

  /**
   * Format payment method for display
   */
  private static formatPaymentMethod(method: string): string {
    switch (method) {
      case 'cash': return 'Especes';
      case 'card': return 'Carte';
      case 'split': return 'Mixte';
      default: return method;
    }
  }

  /**
   * Format closure type for display
   */
  private static formatClosureType(type: string): string {
    switch (type) {
      case 'DAILY': return 'QUOTIDIENNE';
      case 'MONTHLY': return 'MENSUELLE';
      case 'ANNUAL': return 'ANNUELLE';
      default: return type;
    }
  }
  
  /**
   * Wrap text to specified width
   */
  private static wrapText(text: string, width: number): string {
    if (text.length <= width) return text;
    
    const words = text.split(' ');
    let line = '';
    let result = '';
    
    for (const word of words) {
      if ((line + word).length > width) {
        if (result) result += '\n';
        result += line.trim();
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    
    if (line.trim()) {
      if (result) result += '\n';
      result += line.trim();
    }
    
    return result;
  }
  
  /**
   * Pad line with spaces to align left and right text
   */
  private static padLine(left: string, right: string, width: number): string {
    const totalLength = left.length + right.length;
    if (totalLength >= width) {
      return left + ' ' + right;
    }
    
    const spaces = ' '.repeat(width - totalLength);
    return left + spaces + right;
  }
  
  /**
   * Print receipt to thermal printer
   */
  static async printReceipt(receiptData: ReceiptData): Promise<{ success: boolean; message: string }> {
    try {
      // Generate receipt content
      const content = this.generateReceiptContent(receiptData);
      
      // Create temporary file
      const tempFile = path.join(this.TEMP_DIR, `receipt_${Date.now()}.txt`);
      await fs.writeFile(tempFile, content, 'utf8');
      
      // Print using lp command
      const result = await this.sendToPrinter(tempFile);
      
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error printing receipt:', error);
      return {
        success: false,
        message: `Error printing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Print closure bulletin to thermal printer
   */
  static async printClosureBulletin(bulletinData: ClosureBulletinData): Promise<{ success: boolean; message: string }> {
    try {
      // Generate closure bulletin content
      const content = this.generateClosureBulletinContent(bulletinData);
      
      // Create temporary file
      const tempFile = path.join(this.TEMP_DIR, `closure_bulletin_${Date.now()}.txt`);
      await fs.writeFile(tempFile, content, 'utf8');
      
      // Print using lp command
      const result = await this.sendToPrinter(tempFile);
      
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error printing closure bulletin:', error);
      return {
        success: false,
        message: `Error printing closure bulletin: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Send file to printer using lp command
   */
  private static sendToPrinter(filePath: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const lpProcess = spawn('lp', ['-d', this.PRINTER_NAME, filePath]);
      
      let stdout = '';
      let stderr = '';
      
      lpProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      lpProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      lpProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: 'Receipt printed successfully'
          });
        } else {
          resolve({
            success: false,
            message: `Print failed: ${stderr || stdout || `Exit code ${code}`}`
          });
        }
      });
      
      lpProcess.on('error', (error) => {
        resolve({
          success: false,
          message: `Print command failed: ${error.message}`
        });
      });
    });
  }
  
  /**
   * Check if printer is available
   */
  static async checkPrinterStatus(): Promise<{ available: boolean; status: string }> {
    return new Promise((resolve) => {
      const lpstatProcess = spawn('lpstat', ['-p', this.PRINTER_NAME]);
      
      let output = '';
      
      lpstatProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      lpstatProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      lpstatProcess.on('close', (code) => {
        if (code === 0 && output.includes('accepting requests')) {
          resolve({
            available: true,
            status: 'Printer is ready'
          });
        } else {
          resolve({
            available: false,
            status: output || 'Printer not found or not ready'
          });
        }
      });
      
      lpstatProcess.on('error', (error) => {
        resolve({
          available: false,
          status: `Error checking printer: ${error.message}`
        });
      });
    });
  }
  
  /**
   * Test print functionality
   */
  static async testPrint(): Promise<{ success: boolean; message: string }> {
    const testData: ReceiptData = {
      order_id: 999,
      sequence_number: 9999,
      total_amount: 10.50,
      total_tax: 0.95,
      payment_method: 'cash',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'MuseBar Test',
        address: '123 Test Street',
        phone: '01.23.45.67.89',
        email: 'test@musebar.com',
        siret: '12345678901234',
        tax_identification: 'FR12345678901'
      },
      items: [
        {
          product_name: 'Test Item',
          quantity: 1,
          unit_price: 10.50,
          total_price: 10.50,
          tax_rate: 10
        }
      ],
      receipt_type: 'detailed',
      vat_breakdown: [
        {
          rate: 10,
          subtotal_ht: 9.55,
          vat: 0.95
        }
      ]
    };
    
    return await this.printReceipt(testData);
  }
} 