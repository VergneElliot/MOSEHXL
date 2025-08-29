/**
 * Print Formatters - Text and Content Formatting Utilities
 * Handles all text formatting, layout, and content preparation
 */

import { ReceiptData, ClosureBulletinData, PaymentMethod, ClosureType } from './types';

/**
 * Text Formatting Utilities
 */
export class PrintFormatters {
  /**
   * Wrap text to specified width
   */
  static wrapText(text: string, width: number): string {
    if (text.length <= width) {
      return text;
    }
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is longer than width, split it
          lines.push(word.substring(0, width));
          currentLine = word.substring(width);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Pad line with text on left and right
   */
  static padLine(left: string, right: string, width: number): string {
    const padding = width - left.length - right.length;
    if (padding <= 0) {
      return left + ' ' + right;
    }
    return left + ' '.repeat(padding) + right;
  }
  
  /**
   * Center text within specified width
   */
  static centerText(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
  }
  
  /**
   * Right align text within specified width
   */
  static rightAlignText(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    
    return ' '.repeat(width - text.length) + text;
  }
  
  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency: string = 'EUR'): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
  
  /**
   * Format date for receipt display
   */
  static formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  /**
   * Format payment method for display
   */
  static formatPaymentMethod(method: PaymentMethod): string {
    const methods: Record<PaymentMethod, string> = {
      cash: 'Espèces',
      card: 'Carte Bancaire',
      split: 'Paiement Mixte'
    };
    return methods[method] || method;
  }
  
  /**
   * Format closure type for display
   */
  static formatClosureType(type: ClosureType): string {
    const types: Record<ClosureType, string> = {
      DAILY: 'Clôture Journalière',
      WEEKLY: 'Clôture Hebdomadaire',
      MONTHLY: 'Clôture Mensuelle',
      ANNUAL: 'Clôture Annuelle'
    };
    return types[type] || type;
  }
  
  /**
   * Generate table row with proper spacing
   */
  static formatTableRow(columns: string[], widths: number[], totalWidth: number): string {
    if (columns.length !== widths.length) {
      throw new Error('Columns and widths arrays must have the same length');
    }
    
    const formattedColumns = columns.map((col, index) => {
      const width = widths[index];
      if (col.length > width) {
        return col.substring(0, width);
      }
      return col.padEnd(width);
    });
    
    return formattedColumns.join(' ').substring(0, totalWidth);
  }
  
  /**
   * Format VAT breakdown section
   */
  static formatVATBreakdown(vatBreakdown: Array<{
    rate: number;
    subtotal_ht: number;
    vat: number;
  }>, width: number = 32): string {
    if (!vatBreakdown || vatBreakdown.length === 0) {
      return '';
    }
    
    let content = '';
    content += 'DETAIL TVA:\n';
    content += '-'.repeat(width) + '\n';
    
    for (const vat of vatBreakdown) {
      const rateText = `TVA ${(vat.rate * 100).toFixed(1)}%:`;
      const amountText = this.formatCurrency(vat.vat);
      content += this.padLine(rateText, amountText, width) + '\n';
      
      const baseText = `  Base HT:`;
      const baseAmount = this.formatCurrency(vat.subtotal_ht);
      content += this.padLine(baseText, baseAmount, width) + '\n';
    }
    
    return content;
  }
  
  /**
   * Format business header
   */
  static formatBusinessHeader(businessInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  }, width: number = 32): string {
    let content = '';
    
    // Business name (centered, bold)
    content += this.centerText(businessInfo.name, width) + '\n';
    
    // Address
    content += this.wrapText(businessInfo.address, width) + '\n';
    
    // Contact info
    content += `Tél: ${businessInfo.phone}\n`;
    content += `Email: ${businessInfo.email}\n`;
    
    // Legal info
    if (businessInfo.siret) {
      content += `SIRET: ${businessInfo.siret}\n`;
    }
    if (businessInfo.tax_identification) {
      content += `TVA: ${businessInfo.tax_identification}\n`;
    }
    
    return content;
  }
  
  /**
   * Format receipt items section
   */
  static formatReceiptItems(items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate: number;
  }>, width: number = 32): string {
    if (!items || items.length === 0) {
      return '';
    }
    
    let content = '';
    content += 'ARTICLES:\n';
    content += '-'.repeat(width) + '\n';
    
    for (const item of items) {
      // Product name
      content += this.wrapText(item.product_name, width) + '\n';
      
      // Quantity x Price = Total
      const qtyPrice = `${item.quantity} x ${this.formatCurrency(item.unit_price)}`;
      const total = this.formatCurrency(item.total_price);
      content += this.padLine(qtyPrice, total, width) + '\n';
      
      // Tax rate
      const taxRatePercent = (item.tax_rate * 100).toFixed(1);
      content += `  TVA ${taxRatePercent}%\n`;
      content += '\n';
    }
    
    return content;
  }
  
  /**
   * Format totals section
   */
  static formatTotals(data: {
    total_amount: number;
    total_tax?: number;
    tips?: number;
    change?: number;
  }, width: number = 32): string {
    let content = '';
    content += '-'.repeat(width) + '\n';
    
    // Subtotal (if tax is available)
    if (data.total_tax !== undefined) {
      const subtotal = data.total_amount - data.total_tax;
      content += this.padLine('Sous-total HT:', this.formatCurrency(subtotal), width) + '\n';
      content += this.padLine('TVA:', this.formatCurrency(data.total_tax), width) + '\n';
    }
    
    // Total
    content += this.padLine('TOTAL TTC:', this.formatCurrency(data.total_amount), width) + '\n';
    
    // Tips
    if (data.tips && data.tips > 0) {
      content += this.padLine('Pourboire:', this.formatCurrency(data.tips), width) + '\n';
      content += this.padLine('TOTAL + Pourboire:', this.formatCurrency(data.total_amount + data.tips), width) + '\n';
    }
    
    // Change
    if (data.change && data.change > 0) {
      content += this.padLine('Rendu:', this.formatCurrency(data.change), width) + '\n';
    }
    
    return content;
  }
  
  /**
   * Format footer with legal information
   */
  static formatLegalFooter(complianceInfo?: {
    receipt_hash?: string;
    cash_register_id?: string;
    operator_id?: string;
  }, width: number = 32): string {
    let content = '';
    
    content += '\n';
    content += this.centerText('MERCI DE VOTRE VISITE', width) + '\n';
    content += this.centerText('A BIENTOT !', width) + '\n';
    content += '\n';
    
    // Legal compliance
    content += this.centerText('Conforme NF 525', width) + '\n';
    content += this.centerText('Art. 286-I-3 bis du CGI', width) + '\n';
    
    if (complianceInfo) {
      if (complianceInfo.cash_register_id) {
        content += `Caisse: ${complianceInfo.cash_register_id}\n`;
      }
      if (complianceInfo.operator_id) {
        content += `Opérateur: ${complianceInfo.operator_id}\n`;
      }
      if (complianceInfo.receipt_hash) {
        content += `Hash: ${complianceInfo.receipt_hash.substring(0, 16)}...\n`;
      }
    }
    
    return content;
  }
  
  /**
   * Validate and sanitize text for thermal printing
   */
  static sanitizeText(text: string): string {
    // Remove or replace characters that might cause issues
    return text
      .replace(/[\x00-\x08\x0E-\x1F\x7F]/g, '') // Remove control characters except \t, \n, \r
      .replace(/[\u0080-\uFFFF]/g, '?') // Replace non-ASCII characters
      .trim();
  }
  
  /**
   * Split long content into pages if needed
   */
  static paginateContent(content: string, maxLines: number = 100): string[] {
    const lines = content.split('\n');
    const pages: string[] = [];
    
    for (let i = 0; i < lines.length; i += maxLines) {
      const pageLines = lines.slice(i, i + maxLines);
      pages.push(pageLines.join('\n'));
    }
    
    return pages;
  }
}

