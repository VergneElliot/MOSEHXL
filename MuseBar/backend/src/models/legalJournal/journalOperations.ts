/**
 * Legal Journal Operations
 * Core CRUD operations for legal journal entries
 */

import { JournalEntry, OrderForJournal } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';

export class JournalOperations {
  /**
   * Add a new entry to the legal journal
   * This is the core function for maintaining the legal journal chain
   */
  static async addEntry(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    // Get next sequence number
    const sequenceNumber = await JournalQueries.getNextSequenceNumber();
    
    // Get the previous hash from the last entry
    const lastEntry = await JournalQueries.getLastEntry();
    const previousHash = lastEntry ? lastEntry.current_hash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    // Create timestamp
    const timestamp = new Date();
    
    // Generate data string for hashing (same format as original)
    const orderIdForHash = orderId === null ? 'null' : (orderId || '');
    const dataString = `${sequenceNumber}|${transactionType}|${orderIdForHash}|${amount}|${vatAmount}|${paymentMethod}|${timestamp.toISOString()}|${JournalSigning.getRegisterKey()}`;
    
    // Generate current hash
    const currentHash = JournalSigning.generateHash(dataString, previousHash);
    
    // Insert the entry
    return await JournalQueries.insertEntry(
      sequenceNumber,
      transactionType,
      orderId,
      amount,
      vatAmount,
      paymentMethod,
      transactionData,
      previousHash,
      currentHash,
      timestamp,
      userId,
      JournalSigning.getRegisterKey()
    );
  }

  /**
   * Log a transaction in the legal journal (called after order creation)
   * This is the main entry point for logging sales transactions
   */
  static async logTransaction(order: OrderForJournal, userId?: string): Promise<JournalEntry> {
    const amount = parseFloat(String(order.total_amount ?? 0));
    const vatAmount = parseFloat(String(order.total_tax ?? order.taxAmount ?? 0));
    
    return await this.addEntry(
      'SALE',
      order.id,
      amount,
      vatAmount,
      order.payment_method || 'cash',
      {
        order_id: order.id,
        items: order.items || [],
        timestamp: order.created_at || new Date(),
        register_id: JournalSigning.getRegisterKey()
      },
      userId
    );
  }

  /**
   * Log a refund transaction
   */
  static async logRefund(
    orderId: number,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    refundData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      'REFUND',
      orderId,
      -amount, // Negative amount for refunds
      -vatAmount, // Negative VAT for refunds
      paymentMethod,
      {
        ...refundData,
        refund_type: 'CUSTOMER_REFUND',
        original_order_id: orderId,
        register_id: JournalSigning.getRegisterKey()
      },
      userId
    );
  }

  /**
   * Log a correction entry
   */
  static async logCorrection(
    correctionType: string,
    amount: number,
    vatAmount: number,
    correctionData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      'CORRECTION',
      null,
      amount,
      vatAmount,
      'correction',
      {
        ...correctionData,
        correction_type: correctionType,
        register_id: JournalSigning.getRegisterKey()
      },
      userId
    );
  }

  /**
   * Log a closure entry
   */
  static async logClosure(
    closureType: string,
    totalAmount: number,
    totalVat: number,
    closureData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      'CLOSURE',
      null,
      totalAmount,
      totalVat,
      'closure',
      {
        ...closureData,
        closure_type: closureType,
        register_id: JournalSigning.getRegisterKey()
      },
      userId
    );
  }

  /**
   * Log an archive entry
   */
  static async logArchive(
    archiveData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      'ARCHIVE',
      null,
      0,
      0,
      'archive',
      {
        ...archiveData,
        register_id: JournalSigning.getRegisterKey()
      },
      userId
    );
  }

  /**
   * Get journal entries with optional filtering
   */
  static async getEntries(limit?: number, offset?: number): Promise<JournalEntry[]> {
    return await JournalQueries.getEntries(limit, offset);
  }

  /**
   * Get entries for a specific period
   */
  static async getEntriesForPeriod(start: Date, end: Date): Promise<JournalEntry[]> {
    return await JournalQueries.getEntriesForPeriod(start, end);
  }

  /**
   * Get entries by transaction type
   */
  static async getEntriesByType(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    limit?: number
  ): Promise<JournalEntry[]> {
    return await JournalQueries.getEntriesByType(transactionType, limit);
  }

  /**
   * Get entries for a specific order
   */
  static async getEntriesForOrder(orderId: number): Promise<JournalEntry[]> {
    return await JournalQueries.getEntriesForOrder(orderId);
  }

  /**
   * Verify journal integrity
   */
  static async verifyIntegrity() {
    return await JournalSigning.verifyJournalIntegrity();
  }
}

