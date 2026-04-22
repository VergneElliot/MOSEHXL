/**
 * Legal Journal Operations
 * Core CRUD operations for legal journal entries
 */

import { JournalEntry, OrderForJournal } from './types';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';

export class JournalOperations {
  /**
   * Add a new entry to the legal journal (scoped to one establishment).
   */
  static async addEntry(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    const sequenceNumber = await JournalQueries.getNextSequenceNumber(establishmentId);

    const lastEntry = await JournalQueries.getLastEntry(establishmentId);
    const previousHash = lastEntry
      ? lastEntry.current_hash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date();

    const orderIdForHash = orderId === null ? 'null' : (orderId || '');
    const dataString = `${sequenceNumber}|${transactionType}|${orderIdForHash}|${amount}|${vatAmount}|${paymentMethod}|${timestamp.toISOString()}|${JournalSigning.getRegisterKey()}`;

    const currentHash = JournalSigning.generateHash(dataString, previousHash);

    return await JournalQueries.insertEntry(
      establishmentId,
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

  static async logTransaction(order: OrderForJournal, userId?: string): Promise<JournalEntry> {
    if (!order.establishment_id) {
      throw new Error('order.establishment_id is required for legal journal (multi-tenant)');
    }
    const rawAmount = typeof order.total_amount === 'number' ? order.total_amount : parseFloat(String(order.total_amount ?? 0));
    const rawVatAmount = typeof order.total_tax === 'number' ? order.total_tax : parseFloat(String(order.total_tax ?? order.taxAmount ?? 0));

    const amount = Number.isFinite(rawAmount) ? rawAmount : 0;
    const vatAmount = Number.isFinite(rawVatAmount) ? rawVatAmount : 0;

    return await this.addEntry(
      order.establishment_id,
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

  static async logRefund(
    establishmentId: string,
    orderId: number,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    refundData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      establishmentId,
      'REFUND',
      orderId,
      -amount,
      -vatAmount,
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

  static async logCorrection(
    establishmentId: string,
    correctionType: string,
    amount: number,
    vatAmount: number,
    correctionData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      establishmentId,
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

  static async logClosure(
    establishmentId: string,
    closureType: string,
    totalAmount: number,
    totalVat: number,
    closureData: Record<string, unknown>,
    userId?: string
  ): Promise<JournalEntry> {
    return await this.addEntry(
      establishmentId,
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

  static async logChange(establishmentId: string, orderId: number, amount: number, userId?: string): Promise<JournalEntry> {
    return await this.addEntry(
      establishmentId,
      'CHANGE',
      orderId,
      amount,
      0,
      'change',
      {
        card: amount,
        cash: -amount,
        operation: 'faire_de_la_monnaie',
        register_id: JournalSigning.getRegisterKey(),
      },
      userId
    );
  }

  static async logArchive(establishmentId: string, archiveData: Record<string, unknown>, userId?: string): Promise<JournalEntry> {
    return await this.addEntry(
      establishmentId,
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

  static async getEntries(establishmentId: string, limit?: number, offset?: number): Promise<JournalEntry[]> {
    return await JournalQueries.getEntries(establishmentId, limit, offset);
  }

  static async getEntriesForPeriod(establishmentId: string, start: Date, end: Date): Promise<JournalEntry[]> {
    return await JournalQueries.getEntriesForPeriod(establishmentId, start, end);
  }

  static async getEntriesByType(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    limit?: number
  ): Promise<JournalEntry[]> {
    return await JournalQueries.getEntriesByType(establishmentId, transactionType, limit);
  }

  static async getEntriesForOrder(establishmentId: string, orderId: number): Promise<JournalEntry[]> {
    return await JournalQueries.getEntriesForOrder(establishmentId, orderId);
  }

  static async verifyIntegrity(establishmentId: string) {
    return await JournalSigning.verifyJournalIntegrity(establishmentId);
  }
}
