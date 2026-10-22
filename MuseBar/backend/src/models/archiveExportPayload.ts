import { pool } from '../db/pool';
import LegalJournalModel from './legalJournal';
import { resolveArchiveRegisterId } from './archiveCrypto';
import type { ExportData } from './archiveServiceTypes';

export async function buildArchiveExportPayload(exportData: ExportData): Promise<Record<string, unknown>> {
  switch (exportData.export_type) {
    case 'DAILY':
      if (!exportData.establishment_id) {
        throw new Error('DAILY export requires establishment_id for multi-tenant legal journal.');
      }
      if (!exportData.period_start) {
        throw new Error('DAILY export requires period_start.');
      }
      {
        const dayStart = new Date(exportData.period_start);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = exportData.period_end ? new Date(exportData.period_end) : new Date(dayStart);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const dailyEntries = await LegalJournalModel.getEntriesForPeriod(
          exportData.establishment_id,
          dayStart,
          dayEnd
        );
        const dailySales = dailyEntries.filter(e => e.transaction_type === 'SALE');
        const dailyClosures = await LegalJournalModel.getClosureBulletins(exportData.establishment_id, 'DAILY');
        const matchingClosure = dailyClosures.find((closure) =>
          new Date(closure.period_start).getTime() === dayStart.getTime() &&
          new Date(closure.period_end).getTime() === dayEnd.getTime()
        ) ?? null;

        return {
          export_type: 'DAILY',
          period: {
            start: dayStart.toISOString(),
            end: dayEnd.toISOString()
          },
          summary: {
            total_transactions: dailySales.length,
            total_amount: dailySales.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
            total_vat: dailySales.reduce((sum, e) => sum + parseFloat(e.vat_amount.toString()), 0)
          },
          transactions: dailySales,
          closure_data: matchingClosure,
          compliance_info: {
            legal_reference: 'Article 286-I-3 bis du CGI',
            export_timestamp: new Date().toISOString(),
            register_id: resolveArchiveRegisterId(exportData.establishment_id)
          }
        };
      }

    case 'MONTHLY': {
      if (!exportData.establishment_id) {
        throw new Error('MONTHLY export requires establishment_id for legal journal scoping.');
      }
      // Get monthly data
      const monthStart = exportData.period_start || new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
      monthEnd.setUTCDate(0);
      monthEnd.setUTCHours(23, 59, 59, 999);

      const monthlyEntries = await LegalJournalModel.getEntriesForPeriod(
        exportData.establishment_id,
        monthStart,
        monthEnd
      );
      const monthlySales = monthlyEntries.filter(e => e.transaction_type === 'SALE');
      
      return {
        export_type: 'MONTHLY',
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        },
        summary: {
          total_transactions: monthlySales.length,
          total_amount: monthlySales.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
          total_vat: monthlySales.reduce((sum, e) => sum + parseFloat(e.vat_amount.toString()), 0)
        },
        transactions: monthlySales,
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          export_timestamp: new Date().toISOString(),
          register_id: resolveArchiveRegisterId(exportData.establishment_id)
        }
      };
    }

    case 'ANNUAL': {
      if (!exportData.establishment_id) {
        throw new Error('ANNUAL export requires establishment_id for legal journal scoping.');
      }
      const annualStart = exportData.period_start || new Date();
      const year = annualStart.getUTCFullYear();
      const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

      const annualEntries = await LegalJournalModel.getEntriesForPeriod(
        exportData.establishment_id,
        yearStart,
        yearEnd
      );
      const annualSales = annualEntries.filter(e => e.transaction_type === 'SALE');
      const annualClosures = await LegalJournalModel.getClosureBulletins(exportData.establishment_id, 'ANNUAL');
      const matchingAnnualClosure = annualClosures.find((closure) =>
        new Date(closure.period_start).getTime() === yearStart.getTime() &&
        new Date(closure.period_end).getTime() === yearEnd.getTime()
      ) ?? null;

      return {
        export_type: 'ANNUAL',
        period: {
          start: yearStart.toISOString(),
          end: yearEnd.toISOString()
        },
        summary: {
          total_transactions: annualSales.length,
          total_amount: annualSales.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0),
          total_vat: annualSales.reduce((sum, e) => sum + parseFloat(e.vat_amount.toString()), 0)
        },
        transactions: annualSales,
        closure_data: matchingAnnualClosure,
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          export_timestamp: new Date().toISOString(),
          register_id: resolveArchiveRegisterId(exportData.establishment_id)
        }
      };
    }

    case 'FULL': {
      if (!exportData.establishment_id) {
        throw new Error('FULL export requires establishment_id for legal journal scoping.');
      }
      const eid = exportData.establishment_id;
      const allEntries = await pool.query(
        'SELECT * FROM legal_journal WHERE establishment_id = $1 ORDER BY sequence_number ASC',
        [eid]
      );
      const allClosures = await LegalJournalModel.getClosureBulletins(eid);
      
      return {
        export_type: 'FULL',
        export_timestamp: new Date().toISOString(),
        journal_entries: allEntries.rows,
        closure_bulletins: allClosures,
        compliance_info: {
          legal_reference: 'Article 286-I-3 bis du CGI',
          register_id: resolveArchiveRegisterId(eid),
          total_entries: allEntries.rows.length,
          integrity_verification: await LegalJournalModel.verifyJournalIntegrity(eid)
        }
      };
    }
  }
}
