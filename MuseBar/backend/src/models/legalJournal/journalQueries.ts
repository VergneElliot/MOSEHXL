/**
 * Legal Journal Database Queries Facade
 * Keeps the legacy JournalQueries API stable while implementations are split by concern.
 */

import { JournalEntry, ClosureBulletin } from './types';
import * as journalAppend from './journalAppend';
import * as journalRead from './journalRead';
import * as journalStats from './journalStats';
import * as journalDevReset from './journalDevReset';

export class JournalQueries {
  static async getNextSequenceNumber(establishmentId: string): Promise<number> {
    return await journalAppend.getNextSequenceNumber(establishmentId);
  }

  static async getLastEntry(establishmentId: string): Promise<JournalEntry | null> {
    return await journalAppend.getLastEntry(establishmentId);
  }

  static async getEntriesForPeriod(establishmentId: string, start: Date, end: Date): Promise<JournalEntry[]> {
    return await journalRead.getEntriesForPeriod(establishmentId, start, end);
  }

  static async getSaleSummaryForPeriod(
    establishmentId: string,
    start: Date,
    end: Date
  ): Promise<{ count: number; amount: number; vat: number }> {
    return await journalStats.getSaleSummaryForPeriod(establishmentId, start, end);
  }

  static async getEntries(establishmentId: string, limit?: number, offset?: number): Promise<JournalEntry[]> {
    return await journalRead.getEntries(establishmentId, limit, offset);
  }

  static async getEntriesWithCountForPeriod(params: {
    establishment_id: string;
    start_date?: string;
    end_date?: string;
    limit: number;
    offset: number;
  }): Promise<{
    entries: JournalEntry[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return await journalRead.getEntriesWithCountForPeriod(params);
  }

  static async getJournalStatsSummary(establishmentId: string): Promise<Record<string, unknown>> {
    return await journalStats.getJournalStatsSummary(establishmentId);
  }

  static async resetJournalDevOnly(establishmentId: string): Promise<void> {
    return await journalDevReset.resetJournalDevOnly(establishmentId);
  }

  static async getEntriesByType(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    limit?: number
  ): Promise<JournalEntry[]> {
    return await journalRead.getEntriesByType(establishmentId, transactionType, limit);
  }

  static async getEntriesForOrder(establishmentId: string, orderId: number): Promise<JournalEntry[]> {
    return await journalRead.getEntriesForOrder(establishmentId, orderId);
  }

  static async insertEntry(
    sequenceNumber: number,
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    previousHash: string,
    currentHash: string,
    timestamp: Date,
    userId?: string,
    registerId?: string
  ): Promise<JournalEntry> {
    return await journalAppend.insertEntry(
      sequenceNumber,
      establishmentId,
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
      registerId
    );
  }

  static async appendEntryTransactional(
    establishmentId: string,
    transactionType: 'SALE' | 'REFUND' | 'CORRECTION' | 'CLOSURE' | 'ARCHIVE' | 'CHANGE',
    orderId: number | null,
    amount: number,
    vatAmount: number,
    paymentMethod: string,
    transactionData: Record<string, unknown>,
    userId?: string,
    registerId?: string
  ): Promise<JournalEntry> {
    return await journalAppend.appendEntryTransactional(
      establishmentId,
      transactionType,
      orderId,
      amount,
      vatAmount,
      paymentMethod,
      transactionData,
      userId,
      registerId
    );
  }

  static async getClosureBulletins(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL'
  ): Promise<ClosureBulletin[]> {
    return await journalRead.getClosureBulletins(establishmentId, type);
  }

  static async getClosureBulletinsPaginated(
    establishmentId: string,
    type?: 'DAILY' | 'MONTHLY' | 'ANNUAL',
    opts?: { limit?: number; offset?: number }
  ): Promise<{ bulletins: ClosureBulletin[]; total: number }> {
    return await journalRead.getClosureBulletinsPaginated(establishmentId, type, opts);
  }

  static async getLastFondDeCaisse(establishmentId: string): Promise<number | null> {
    return await journalRead.getLastFondDeCaisse(establishmentId);
  }

  static async insertClosureBulletin(
    closureType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    startDate: Date,
    endDate: Date,
    totalTransactions: number,
    fondDeCaisse: number,
    totalAmount: number,
    totalVat: number,
    vatBreakdown: Record<string, { amount: number; vat: number }>,
    paymentBreakdown: Record<string, number>,
    tipsTotal: number,
    changeTotal: number,
    journalSalesCount: number,
    journalSalesAmount: number,
    journalSalesVat: number,
    reconciliationOk: boolean,
    reconciliationDetails: Record<string, unknown>,
    firstSequence: number,
    lastSequence: number,
    closureHash: string,
    establishmentId: string,
    isClosed = true
  ): Promise<ClosureBulletin> {
    return await journalAppend.insertClosureBulletin(
      closureType,
      startDate,
      endDate,
      totalTransactions,
      fondDeCaisse,
      totalAmount,
      totalVat,
      vatBreakdown,
      paymentBreakdown,
      tipsTotal,
      changeTotal,
      journalSalesCount,
      journalSalesAmount,
      journalSalesVat,
      reconciliationOk,
      reconciliationDetails,
      firstSequence,
      lastSequence,
      closureHash,
      establishmentId,
      isClosed
    );
  }

  static async closeOpenClosureBulletin(
    closureBulletinId: number,
    establishmentId: string
  ): Promise<ClosureBulletin | null> {
    return await journalAppend.closeOpenClosureBulletin(closureBulletinId, establishmentId);
  }

  static async deleteOpenClosureBulletin(
    closureBulletinId: number,
    establishmentId: string
  ): Promise<boolean> {
    return await journalAppend.deleteOpenClosureBulletin(closureBulletinId, establishmentId);
  }

  static async closureBulletinExists(
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    startDate: Date,
    endDate: Date,
    establishmentId: string
  ): Promise<boolean> {
    return await journalRead.closureBulletinExists(type, startDate, endDate, establishmentId);
  }
}
