import fs from 'fs';
import path from 'path';
import { pool } from '../db/pool';
import { createDigitalSignature, generateFileHash } from './archiveCrypto';
import { convertArchiveToCSV, convertArchiveToPDF, convertArchiveToXML } from './archiveExportFormat';
import { buildArchiveExportPayload } from './archiveExportPayload';
import type { ArchiveExport, ExportData } from './archiveServiceTypes';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

export async function initializeArchiveExportDir(): Promise<void> {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

export async function generateExportContent(exportData: ExportData): Promise<string | Buffer> {
  const data = await buildArchiveExportPayload(exportData);

  // Format data according to specified format
  switch (exportData.format) {
    case 'JSON':
      return JSON.stringify(data, null, 2);
    
    case 'XML':
      return convertArchiveToXML(data);
    
    case 'CSV':
      return convertArchiveToCSV(data);
    
    case 'PDF':
      return await convertArchiveToPDF(data);
    
    default:
      return JSON.stringify(data, null, 2);
  }
}

export async function exportArchiveData(exportData: ExportData): Promise<ArchiveExport> {
  await initializeArchiveExportDir();

  const tempFilePath = path.join(
    EXPORT_DIR,
    `temp_${Date.now()}.${exportData.format.toLowerCase()}`
  );

  // Generate content before INSERT so we satisfy file_size > 0 and never
  // leave a PENDING row with a zero-byte placeholder.
  const exportContent = await generateExportContent(exportData);
  fs.writeFileSync(tempFilePath, exportContent);
  const fileHash = generateFileHash(exportContent);
  const digitalSignature = createDigitalSignature(exportContent);
  const fileSize = fs.statSync(tempFilePath).size;

  const query = `
      INSERT INTO archive_exports (
        export_type, period_start, period_end, file_path, file_hash,
        file_size, format, digital_signature, export_status, created_by, establishment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

  try {
    const result = await pool.query(query, [
      exportData.export_type,
      exportData.period_start,
      exportData.period_end,
      tempFilePath,
      fileHash,
      fileSize,
      exportData.format,
      digitalSignature,
      'COMPLETED',
      exportData.created_by,
      exportData.establishment_id ?? null,
    ]);
    return result.rows[0];
  } catch (error) {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
}
