import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pool } from '../app';
import LegalJournalModel from './legalJournal';

export interface ArchiveExport {
  id: number;
  establishment_id?: string | null;
  export_type: 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'FULL';
  period_start: Date;
  period_end: Date;
  file_path: string;
  file_hash: string;
  file_size: number;
  format: 'CSV' | 'XML' | 'PDF' | 'JSON';
  digital_signature: string;
  export_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'VERIFIED';
  created_by: string;
  created_at: Date;
  verified_at?: Date;
}

export interface ExportData {
  export_type: 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'FULL';
  period_start?: Date;
  period_end?: Date;
  format: 'CSV' | 'XML' | 'PDF' | 'JSON';
  created_by: string;
  /** Required for DAILY exports so the closure bulletin is scoped to one establishment. */
  establishment_id?: string;
}

export class ArchiveService {
  private static readonly EXPORT_DIR = path.join(process.cwd(), 'exports');
  // No hardcoded fallback: use ARCHIVE_SECRET_KEY from env; throw if missing when signing/verifying.

  // Initialize export directory
  static async initialize(): Promise<void> {
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }
  }

  // Create HMAC signature for file integrity
  private static createDigitalSignature(data: string): string {
    const key = process.env.ARCHIVE_SECRET_KEY;
    if (!key || key.length < 32) {
      throw new Error(
        'ARCHIVE_SECRET_KEY environment variable is required for archive signing (at least 32 characters). ' +
        'Set it in your .env file. In production it is required.'
      );
    }
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  // Verify HMAC signature (throws if ARCHIVE_SECRET_KEY is not set)
  static verifyDigitalSignature(data: string, signature: string): boolean {
    const expectedSignature = this.createDigitalSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Generate file hash for integrity verification
  private static generateFileHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Export data in specified format
  static async exportData(exportData: ExportData): Promise<ArchiveExport> {
    await this.initialize();

    // Create archive export record
    const query = `
      INSERT INTO archive_exports (
        export_type, period_start, period_end, file_path, file_hash,
        file_size, format, digital_signature, export_status, created_by, establishment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const tempFilePath = path.join(this.EXPORT_DIR, `temp_${Date.now()}.${exportData.format.toLowerCase()}`);
    const values = [
      exportData.export_type,
      exportData.period_start,
      exportData.period_end,
      tempFilePath,
      '', // Will be updated after file creation
      0,  // Will be updated after file creation
      exportData.format,
      '', // Will be updated after file creation
      'PENDING',
      exportData.created_by,
      exportData.establishment_id ?? null
    ];

    const result = await pool.query(query, values);
    const archiveExport = result.rows[0];

    try {
      // Generate export data based on type
      const exportContent = await this.generateExportContent(exportData);
      
      // Write file
      fs.writeFileSync(tempFilePath, exportContent);
      
      // Generate file hash and digital signature
      const fileHash = this.generateFileHash(exportContent);
      const digitalSignature = this.createDigitalSignature(exportContent);
      const fileSize = fs.statSync(tempFilePath).size;

      // Update archive export record
      const updateQuery = `
        UPDATE archive_exports 
        SET file_hash = $1, file_size = $2, digital_signature = $3, export_status = $4
        WHERE id = $5
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, [
        fileHash,
        fileSize,
        digitalSignature,
        'COMPLETED',
        archiveExport.id
      ]);

      return updateResult.rows[0];
    } catch (error) {
      // Update status to failed
      await pool.query(
        'UPDATE archive_exports SET export_status = $1 WHERE id = $2',
        ['FAILED', archiveExport.id]
      );
      throw error;
    }
  }

  // Generate export content based on format and type
  private static async generateExportContent(exportData: ExportData): Promise<string> {
    let data: Record<string, unknown> = {};

    switch (exportData.export_type) {
      case 'DAILY':
        if (exportData.period_start) {
          if (!exportData.establishment_id) {
            throw new Error('DAILY export requires establishment_id for multi-tenant legal journal.');
          }
          const closure = await LegalJournalModel.createDailyClosure(exportData.period_start, exportData.establishment_id);
          data = {
            export_type: 'DAILY',
            period: {
              start: exportData.period_start.toISOString(),
              end: exportData.period_end?.toISOString()
            },
            closure_data: closure,
            compliance_info: {
              legal_reference: 'Article 286-I-3 bis du CGI',
              export_timestamp: new Date().toISOString(),
              register_id: 'MUSEBAR-REG-001'
            }
          };
        }
        break;

      case 'MONTHLY': {
        if (!exportData.establishment_id) {
          throw new Error('MONTHLY export requires establishment_id for legal journal scoping.');
        }
        // Get monthly data
        const monthStart = exportData.period_start || new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        monthEnd.setHours(23, 59, 59, 999);

        const monthlyEntries = await LegalJournalModel.getEntriesForPeriod(
          exportData.establishment_id,
          monthStart,
          monthEnd
        );
        const monthlySales = monthlyEntries.filter(e => e.transaction_type === 'SALE');
        
        data = {
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
            register_id: 'MUSEBAR-REG-001'
          }
        };
        break;
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
        const allClosures = await LegalJournalModel.getClosureBulletins(undefined, eid);
        
        data = {
          export_type: 'FULL',
          export_timestamp: new Date().toISOString(),
          journal_entries: allEntries.rows,
          closure_bulletins: allClosures,
          compliance_info: {
            legal_reference: 'Article 286-I-3 bis du CGI',
            register_id: 'MUSEBAR-REG-001',
            total_entries: allEntries.rows.length,
            integrity_verification: await LegalJournalModel.verifyJournalIntegrity(eid)
          }
        };
        break;
      }
    }

    // Format data according to specified format
    switch (exportData.format) {
      case 'JSON':
        return JSON.stringify(data, null, 2);
      
      case 'XML':
        return this.convertToXML(data);
      
      case 'CSV':
        return this.convertToCSV(data);
      
      case 'PDF':
        return this.convertToPDF(data);
      
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Convert data to XML format
  private static convertToXML(data: {
    export_type?: string;
    compliance_info?: { legal_reference?: string; export_timestamp?: string; register_id?: string };
    closure_data?: { total_transactions: number; total_amount: number; total_vat: number; period_start: string; period_end: string };
    period?: { start: string; end: string };
    summary?: { total_transactions: number; total_amount: number; total_vat: number };
  }): string {
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
    const rootElement = '<musebar_export>';
    const closingRoot = '</musebar_export>';
    
    let xmlContent = xmlDeclaration + '\n' + rootElement + '\n';
    
    // Add compliance header
    xmlContent += '  <compliance_info>\n';
    xmlContent += `    <legal_reference>${data.compliance_info?.legal_reference || 'Article 286-I-3 bis du CGI'}</legal_reference>\n`;
    xmlContent += `    <export_timestamp>${data.compliance_info?.export_timestamp || new Date().toISOString()}</export_timestamp>\n`;
    xmlContent += `    <register_id>${data.compliance_info?.register_id || 'MUSEBAR-REG-001'}</register_id>\n`;
    xmlContent += '  </compliance_info>\n';
    
    // Add export data
    if (data.export_type === 'DAILY' && data.closure_data) {
      xmlContent += '  <daily_closure>\n';
      xmlContent += `    <total_transactions>${data.closure_data.total_transactions}</total_transactions>\n`;
      xmlContent += `    <total_amount>${data.closure_data.total_amount}</total_amount>\n`;
      xmlContent += `    <total_vat>${data.closure_data.total_vat}</total_vat>\n`;
      xmlContent += `    <period_start>${data.closure_data.period_start}</period_start>\n`;
      xmlContent += `    <period_end>${data.closure_data.period_end}</period_end>\n`;
      xmlContent += '  </daily_closure>\n';
    }
    
    xmlContent += closingRoot;
    return xmlContent;
  }

  // Convert data to CSV format
  private static convertToCSV(data: {
    export_type?: string;
    compliance_info?: { export_timestamp?: string };
    closure_data?: { total_transactions: number; total_amount: number; total_vat: number; period_start: string; period_end: string };
    period?: { start: string; end: string };
    summary?: { total_transactions: number; total_amount: number; total_vat: number };
  }): string {
    let csvContent = 'Export Type,Period Start,Period End,Total Transactions,Total Amount,Total VAT,Export Timestamp\n';
    
    const exportTimestamp = data.compliance_info?.export_timestamp || new Date().toISOString();
    if (data.export_type === 'DAILY' && data.closure_data) {
      csvContent += `${data.export_type},${data.closure_data.period_start},${data.closure_data.period_end},${data.closure_data.total_transactions},${data.closure_data.total_amount},${data.closure_data.total_vat},${exportTimestamp}\n`;
    } else if (data.export_type === 'MONTHLY') {
      csvContent += `${data.export_type},${data.period?.start ?? ''},${data.period?.end ?? ''},${data.summary?.total_transactions ?? ''},${data.summary?.total_amount ?? ''},${data.summary?.total_vat ?? ''},${exportTimestamp}\n`;
    }
    
    return csvContent;
  }

  /** PDF export: placeholder until a real PDF library is integrated. */
  private static convertToPDF(data: { export_type?: string }): string {
    return `MuseBar export (${data.export_type ?? 'unknown'}) — PDF generation not implemented.`;
  }

  /**
   * List exports for one establishment only. Callers must pass a real tenant id —
   * no global listing (fiscal / GDPR isolation).
   */
  static async getArchiveExports(establishmentId: string): Promise<ArchiveExport[]> {
    const result = await pool.query(
      'SELECT * FROM archive_exports WHERE establishment_id = $1 ORDER BY created_at DESC',
      [establishmentId]
    );
    return result.rows;
  }

  /**
   * Fetch a single export only if it belongs to the given establishment.
   */
  static async getArchiveExportById(id: number, establishmentId: string): Promise<ArchiveExport | null> {
    const result = await pool.query(
      'SELECT * FROM archive_exports WHERE id = $1 AND establishment_id = $2',
      [id, establishmentId]
    );
    return result.rows[0] || null;
  }

  // Verify archive export integrity (tenant-scoped: cannot verify another tenant's file by id alone)
  static async verifyArchiveExport(
    id: number,
    establishmentId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const exportRecord = await this.getArchiveExportById(id, establishmentId);
    if (!exportRecord) {
      return { isValid: false, errors: ['Archive export not found'] };
    }

    const errors: string[] = [];

    try {
      // Check if file exists
      if (!fs.existsSync(exportRecord.file_path)) {
        errors.push('Export file not found');
        return { isValid: false, errors };
      }

      // Read file content
      const fileContent = fs.readFileSync(exportRecord.file_path, 'utf8');
      
      // Verify file hash
      const currentHash = this.generateFileHash(fileContent);
      if (currentHash !== exportRecord.file_hash) {
        errors.push('File hash verification failed - file may have been tampered with');
      }

      // Verify digital signature
      if (!this.verifyDigitalSignature(fileContent, exportRecord.digital_signature)) {
        errors.push('Digital signature verification failed - file authenticity compromised');
      }

      // Verify file size
      const currentSize = fs.statSync(exportRecord.file_path).size;
      if (currentSize !== exportRecord.file_size) {
        errors.push('File size mismatch - file may have been modified');
      }

      // Update verification timestamp if valid
      if (errors.length === 0) {
        await pool.query(
          'UPDATE archive_exports SET export_status = $1, verified_at = $2 WHERE id = $3 AND establishment_id = $4',
          ['VERIFIED', new Date(), id, establishmentId]
        );
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Error during verification: ${error}`);
      return { isValid: false, errors };
    }
  }

  // Download archive export file (tenant-scoped)
  static async downloadArchiveExport(
    id: number,
    establishmentId: string
  ): Promise<{ filePath: string; fileName: string } | null> {
    const exportRecord = await this.getArchiveExportById(id, establishmentId);
    if (!exportRecord || !fs.existsSync(exportRecord.file_path)) {
      return null;
    }

    const fileName = `musebar_export_${exportRecord.export_type}_${exportRecord.id}.${exportRecord.format.toLowerCase()}`;
    
    return {
      filePath: exportRecord.file_path,
      fileName
    };
  }
} 