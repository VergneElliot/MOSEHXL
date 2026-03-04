/**
 * Legal Journal Module Exports
 * Clean exports for all legal journal components and utilities
 */

// Import classes first
import { JournalOperations } from './journalOperations';
import { JournalQueries } from './journalQueries';
import { JournalSigning } from './journalSigning';
import { ClosureOperations } from './closureOperations';

// Main classes
export { JournalOperations, JournalQueries, JournalSigning, ClosureOperations };

// Types
export type {
  JournalEntry,
  ClosureBulletin,
  IntegrityCheckResult,
  VATBreakdown,
  PaymentBreakdown,
  OrderForJournal,
  ClosureType
} from './types';

// Legacy compatibility - Main class that maintains the original API
export class LegalJournalModel {
  // Journal operations
  static async addEntry(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    userId?: string
  ) {
    return await JournalOperations.addEntry(
      transactionType,
      orderId,
      amount,
      vatAmount,
      paymentMethod,
      transactionData,
      userId
    );
  }

  static async logTransaction(
    order: {
      id: number;
      total_amount?: number | string;
      total_tax?: number | string;
      taxAmount?: number | string;
      payment_method?: string;
      items?: unknown[];
      created_at?: Date;
    },
    userId?: string
  ) {
    return await JournalOperations.logTransaction(order, userId);
  }

  // Integrity verification
  static async verifyJournalIntegrity() {
    return await JournalSigning.verifyJournalIntegrity();
  }

  // Query operations
  static async getEntries(limit?: number, offset?: number) {
    return await JournalQueries.getEntries(limit, offset);
  }

  static async getEntriesForPeriod(start: Date, end: Date) {
    return await JournalQueries.getEntriesForPeriod(start, end);
  }

  static async getEntriesByType(
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE',
    limit?: number
  ) {
    return await JournalQueries.getEntriesByType(transactionType, limit);
  }

  static async getEntriesForOrder(orderId: number) {
    return await JournalQueries.getEntriesForOrder(orderId);
  }

  // Closure operations (establishmentId required for multi-tenant data isolation)
  static async createDailyClosure(date: Date, establishmentId: string) {
    return await ClosureOperations.createDailyClosure(date, establishmentId);
  }

  static async createWeeklyClosure(date: Date, establishmentId: string) {
    return await ClosureOperations.createWeeklyClosure(date, establishmentId);
  }

  static async createMonthlyClosure(date: Date, establishmentId: string) {
    return await ClosureOperations.createMonthlyClosure(date, establishmentId);
  }

  static async createAnnualClosure(date: Date, establishmentId: string) {
    return await ClosureOperations.createAnnualClosure(date, establishmentId);
  }

  static async getClosureBulletins(type?: 'DAILY' | 'MONTHLY' | 'ANNUAL', establishmentId?: string) {
    return await ClosureOperations.getClosureBulletins(type, establishmentId);
  }
}

// Default export for backward compatibility
export default LegalJournalModel;
