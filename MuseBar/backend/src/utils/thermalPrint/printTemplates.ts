/**
 * Print Templates - Receipt and Document Templates
 * Generates complete formatted content for different document types
 */

import { ReceiptData, ClosureBulletinData, FormattedContent } from './types';
import { PrintFormatters } from './printFormatters';
import { PrintCommands, PrintCommandBuilder } from './printCommands';

/**
 * Receipt and Document Templates
 */
export class PrintTemplates {
  private static readonly PAPER_WIDTH = 32; // Standard thermal printer width
  
  /**
   * Generate complete receipt content
   */
  static generateReceipt(data: ReceiptData): string {
    const builder = new PrintCommandBuilder();
    
    // Initialize printer
    builder.init();
    
    // Header - Business Info
    builder
      .text(data.business_info.name, { align: 'center', bold: true, doubleHeight: true })
      .newLine()
      .text(PrintFormatters.formatBusinessHeader(data.business_info, this.PAPER_WIDTH), { align: 'left' })
      .separator('=', this.PAPER_WIDTH);
    
    // Receipt Info
    builder
      .text(`RECU #${data.sequence_number}`, { bold: true })
      .newLine()
      .text(`Commande: ${data.order_id}`)
      .newLine()
      .text(`Date: ${PrintFormatters.formatDate(data.created_at)}`)
      .newLine()
      .text(`Paiement: ${PrintFormatters.formatPaymentMethod(data.payment_method as any)}`)
      .newLine()
      .separator('=', this.PAPER_WIDTH);
    
    // Items (for detailed receipts)
    if (data.receipt_type === 'detailed' && data.items && data.items.length > 0) {
      const itemsContent = PrintFormatters.formatReceiptItems(data.items, this.PAPER_WIDTH);
      builder.text(itemsContent).separator('-', this.PAPER_WIDTH);
    }
    
    // VAT Breakdown
    if (data.vat_breakdown && data.vat_breakdown.length > 0) {
      const vatContent = PrintFormatters.formatVATBreakdown(data.vat_breakdown, this.PAPER_WIDTH);
      builder.text(vatContent).separator('-', this.PAPER_WIDTH);
    }
    
    // Totals
    const totalsContent = PrintFormatters.formatTotals({
      total_amount: data.total_amount,
      total_tax: data.total_tax,
      tips: data.tips,
      change: data.change
    }, this.PAPER_WIDTH);
    builder.text(totalsContent);
    
    // Footer
    const footerContent = PrintFormatters.formatLegalFooter(data.compliance_info, this.PAPER_WIDTH);
    builder.text(footerContent);
    
    // QR Code with receipt data (optional)
    if (data.compliance_info?.receipt_hash) {
      const qrData = JSON.stringify({
        id: data.sequence_number,
        amount: data.total_amount,
        date: data.created_at,
        hash: data.compliance_info.receipt_hash.substring(0, 16)
      });
      builder.newLine(2).text('QR Code:', { align: 'center' }).qrCode(qrData, 4);
    }
    
    // Final spacing and cut
    builder.newLine(3).cut();
    
    return builder.build();
  }
  
  /**
   * Generate closure bulletin content
   */
  static generateClosureBulletin(data: ClosureBulletinData): string {
    const builder = new PrintCommandBuilder();
    
    // Initialize printer
    builder.init();
    
    // Header - Business Info
    builder
      .text(data.business_info.name, { align: 'center', bold: true, doubleHeight: true })
      .newLine()
      .text(PrintFormatters.formatBusinessHeader(data.business_info, this.PAPER_WIDTH), { align: 'left' })
      .separator('=', this.PAPER_WIDTH);
    
    // Closure Bulletin Header
    builder
      .text('BULLETIN DE CLOTURE', { align: 'center', bold: true, doubleHeight: true })
      .newLine(2)
      .text(`Type: ${PrintFormatters.formatClosureType(data.closure_type)}`, { bold: true })
      .newLine()
      .text(`Période: ${PrintFormatters.formatDate(data.period_start)} - ${PrintFormatters.formatDate(data.period_end)}`)
      .newLine()
      .text(`Créé le: ${PrintFormatters.formatDate(data.created_at)}`)
      .newLine()
      .separator('=', this.PAPER_WIDTH);
    
    // Summary Statistics
    builder
      .text('RESUME GENERAL:', { bold: true })
      .newLine()
      .text(PrintFormatters.padLine('Transactions:', data.total_transactions.toString(), this.PAPER_WIDTH))
      .newLine()
      .text(PrintFormatters.padLine('Montant total:', PrintFormatters.formatCurrency(data.total_amount), this.PAPER_WIDTH))
      .newLine()
      .text(PrintFormatters.padLine('TVA totale:', PrintFormatters.formatCurrency(data.total_vat), this.PAPER_WIDTH))
      .newLine()
      .separator('-', this.PAPER_WIDTH);
    
    // Payment Methods Summary
    if (data.transactions_summary && data.transactions_summary.length > 0) {
      builder.text('PAIEMENTS PAR MODE:', { bold: true }).newLine();
      
      for (const payment of data.transactions_summary) {
        const methodText = PrintFormatters.formatPaymentMethod(payment.payment_method as any);
        const countText = `${payment.count} trans.`;
        const amountText = PrintFormatters.formatCurrency(payment.total);
        
        builder
          .text(`${methodText}:`)
          .newLine()
          .text(PrintFormatters.padLine(`  ${countText}`, amountText, this.PAPER_WIDTH))
          .newLine();
      }
      
      builder.separator('-', this.PAPER_WIDTH);
    }
    
    // VAT Summary
    if (data.vat_summary && data.vat_summary.length > 0) {
      builder.text('RESUME TVA:', { bold: true }).newLine();
      
      for (const vat of data.vat_summary) {
        const rateText = `TVA ${(vat.rate * 100).toFixed(1)}%:`;
        builder
          .text(rateText, { bold: true })
          .newLine()
          .text(PrintFormatters.padLine('  Base HT:', PrintFormatters.formatCurrency(vat.subtotal_ht), this.PAPER_WIDTH))
          .newLine()
          .text(PrintFormatters.padLine('  TVA:', PrintFormatters.formatCurrency(vat.vat), this.PAPER_WIDTH))
          .newLine()
          .text(PrintFormatters.padLine('  Total TTC:', PrintFormatters.formatCurrency(vat.total_ttc), this.PAPER_WIDTH))
          .newLine()
          .text(PrintFormatters.padLine('  Transactions:', vat.count.toString(), this.PAPER_WIDTH))
          .newLine(2);
      }
      
      builder.separator('-', this.PAPER_WIDTH);
    }
    
    // Legal compliance footer
    builder
      .newLine()
      .text('CLOTURE DEFINITIVE', { align: 'center', bold: true })
      .newLine()
      .text('Conformité fiscale', { align: 'center' })
      .newLine(2)
      .text('Ref. légale: Article 286-I-3 bis du CGI')
      .newLine()
      .text('Registre: MUSEBAR-REG-001')
      .newLine()
      .text(`Hash: ${data.closure_hash.substring(0, 16)}...`)
      .newLine()
      .text(`Bulletin #${data.id}`, { align: 'center' })
      .newLine(3)
      .cut();
    
    return builder.build();
  }
  
  /**
   * Generate simple summary receipt
   */
  static generateSummaryReceipt(data: ReceiptData): string {
    const builder = new PrintCommandBuilder();
    
    // Initialize printer
    builder.init();
    
    // Simplified header
    builder
      .text(data.business_info.name, { align: 'center', bold: true })
      .newLine()
      .text(`RECU #${data.sequence_number}`, { align: 'center', bold: true })
      .newLine()
      .separator('=', this.PAPER_WIDTH);
    
    // Essential info only
    builder
      .text(`Date: ${PrintFormatters.formatDate(data.created_at)}`)
      .newLine()
      .text(`Paiement: ${PrintFormatters.formatPaymentMethod(data.payment_method as any)}`)
      .newLine()
      .separator('-', this.PAPER_WIDTH);
    
    // Total only
    builder
      .text(PrintFormatters.padLine('TOTAL:', PrintFormatters.formatCurrency(data.total_amount), this.PAPER_WIDTH), { bold: true })
      .newLine()
      .separator('=', this.PAPER_WIDTH);
    
    // Simple footer
    builder
      .newLine()
      .text('MERCI !', { align: 'center', bold: true })
      .newLine(3)
      .cut();
    
    return builder.build();
  }
  
  /**
   * Generate test print
   */
  static generateTestPrint(): string {
    const builder = new PrintCommandBuilder();
    
    builder
      .init()
      .text('TEST D\'IMPRESSION', { align: 'center', bold: true, doubleHeight: true })
      .newLine(2)
      .separator('=', this.PAPER_WIDTH)
      .text('Imprimante thermique')
      .newLine()
      .text(`Date: ${PrintFormatters.formatDate(new Date())}`)
      .newLine()
      .separator('-', this.PAPER_WIDTH)
      .text('Caractères spéciaux:')
      .newLine()
      .text('éèàùçêîôû')
      .newLine()
      .text('1234567890')
      .newLine()
      .text('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      .newLine()
      .text('abcdefghijklmnopqrstuvwxyz')
      .newLine()
      .separator('=', this.PAPER_WIDTH)
      .text('Test réussi !', { align: 'center', bold: true })
      .newLine(3)
      .cut();
    
    return builder.build();
  }
  
  /**
   * Generate daily summary template
   */
  static generateDailySummary(data: {
    date: string;
    totalTransactions: number;
    totalAmount: number;
    paymentMethods: Array<{ method: string; count: number; total: number; }>;
  }): string {
    const builder = new PrintCommandBuilder();
    
    builder
      .init()
      .text('RESUME JOURNALIER', { align: 'center', bold: true, doubleHeight: true })
      .newLine(2)
      .text(`Date: ${PrintFormatters.formatDate(data.date)}`, { align: 'center' })
      .newLine()
      .separator('=', this.PAPER_WIDTH)
      .text(PrintFormatters.padLine('Transactions:', data.totalTransactions.toString(), this.PAPER_WIDTH), { bold: true })
      .newLine()
      .text(PrintFormatters.padLine('Chiffre d\'affaires:', PrintFormatters.formatCurrency(data.totalAmount), this.PAPER_WIDTH), { bold: true })
      .newLine()
      .separator('-', this.PAPER_WIDTH);
    
    // Payment methods breakdown
    builder.text('Détail par mode de paiement:', { bold: true }).newLine();
    
    for (const method of data.paymentMethods) {
      const methodText = PrintFormatters.formatPaymentMethod(method.method as any);
      builder
        .text(`${methodText}:`)
        .newLine()
        .text(PrintFormatters.padLine(`  ${method.count} trans.`, PrintFormatters.formatCurrency(method.total), this.PAPER_WIDTH))
        .newLine();
    }
    
    builder
      .separator('=', this.PAPER_WIDTH)
      .text('Fin de journée', { align: 'center', bold: true })
      .newLine(3)
      .cut();
    
    return builder.build();
  }
  
  /**
   * Parse template variables in content
   */
  static parseTemplate(template: string, variables: Record<string, any>): string {
    let content = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    }
    
    return content;
  }
  
  /**
   * Get formatted content structure
   */
  static getFormattedContent(data: ReceiptData | ClosureBulletinData, type: 'receipt' | 'closure'): FormattedContent {
    let content: string;
    
    if (type === 'receipt') {
      content = this.generateReceipt(data as ReceiptData);
    } else {
      content = this.generateClosureBulletin(data as ClosureBulletinData);
    }
    
    // Split content into logical sections
    const sections = content.split(PrintCommands.CUT);
    const commands = content.match(/[\x1B\x1D][^\x1B\x1D]*/g)?.join('') || '';
    
    return {
      header: sections[0]?.substring(0, 200) || '',
      body: sections[0]?.substring(200) || content,
      footer: 'Generated by MuseBar POS System',
      commands: commands
    };
  }
}

