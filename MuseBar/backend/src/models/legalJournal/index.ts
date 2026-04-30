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
  static async addEntry(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    userId?: string
  ) {
    return await JournalOperations.addEntry(
      establishmentId,
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
      establishment_id: string;
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

  static async logChange(establishmentId: string, orderId: number, amount: number, userId?: string) {
    return await JournalOperations.logChange(establishmentId, orderId, amount, userId);
  }

  static async logClosure(
    establishmentId: string,
    closureType: string,
    totalAmount: number,
    totalVat: number,
    closureData: Record<string, unknown>,
    userId?: string
  ) {
    return await JournalOperations.logClosure(
      establishmentId,
      closureType,
      totalAmount,
      totalVat,
      closureData,
      userId
    );
  }

  static async logSoftwareEvent(
    establishmentId: string,
    eventType: string,
    eventData: Record<string, unknown>,
    userId?: string
  ) {
    return await JournalOperations.logSoftwareEvent(establishmentId, eventType, eventData, userId);
  }

  static async verifyJournalIntegrity(establishmentId: string) {
    return await JournalOperations.verifyIntegrity(establishmentId);
  }

  static async getEntries(establishmentId: string, limit?: number, offset?: number) {
    return await JournalQueries.getEntries(establishmentId, limit, offset);
  }

  static async getEntriesForPeriod(establishmentId: string, start: Date, end: Date) {
    return await JournalQueries.getEntriesForPeriod(establishmentId, start, end);
  }

  static async getEntriesByType(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    limit?: number
  ) {
    return await JournalQueries.getEntriesByType(establishmentId, transactionType, limit);
  }

  static async getEntriesForOrder(establishmentId: string, orderId: number) {
    return await JournalQueries.getEntriesForOrder(establishmentId, orderId);
  }

  static async createDailyClosure(
    date: Date,
    establishmentId: string,
    timezone?: string,
    force?: boolean,
    fondDeCaisse?: number
  ) {
    return await ClosureOperations.createDailyClosure(date, establishmentId, timezone, force, fondDeCaisse);
  }

  static async createWeeklyClosure(date: Date, establishmentId: string, force?: boolean, fondDeCaisse?: number) {
    return await ClosureOperations.createWeeklyClosure(date, establishmentId, force ?? false, fondDeCaisse);
  }

  static async createMonthlyClosure(date: Date, establishmentId: string, force?: boolean, fondDeCaisse?: number) {
    return await ClosureOperations.createMonthlyClosure(date, establishmentId, force ?? false, fondDeCaisse);
  }

  static async createAnnualClosure(date: Date, establishmentId: string, force?: boolean, fondDeCaisse?: number) {
    return await ClosureOperations.createAnnualClosure(date, establishmentId, force ?? false, fondDeCaisse);
  }

  static async getClosureBulletins(establishmentId: string, type?: 'DAILY' | 'MONTHLY' | 'ANNUAL') {
    return await ClosureOperations.getClosureBulletins(establishmentId, type);
  }

  static async getClosureBulletinsPaginated(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    opts?: { limit?: number; offset?: number }
  ) {
    return await ClosureOperations.getClosureBulletinsPaginated(establishmentId, type, opts);
  }

  static async getLastFondDeCaisse(establishmentId: string): Promise<number | null> {
    return await JournalQueries.getLastFondDeCaisse(establishmentId);
  }
}

export default LegalJournalModel;
