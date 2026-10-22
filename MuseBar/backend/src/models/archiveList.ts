import fs from 'fs';
import { pool } from '../db/pool';
import type { ArchiveExport } from './archiveServiceTypes';

/**
 * List exports for one establishment only. Callers must pass a real tenant id —
 * no global listing (fiscal / GDPR isolation).
 */
export async function getArchiveExports(establishmentId: string): Promise<ArchiveExport[]> {
  const result = await pool.query(
    'SELECT * FROM archive_exports WHERE establishment_id = $1 ORDER BY created_at DESC',
    [establishmentId]
  );
  return result.rows;
}

/**
 * Fetch a single export only if it belongs to the given establishment.
 */
export async function getArchiveExportById(id: number, establishmentId: string): Promise<ArchiveExport | null> {
  const result = await pool.query(
    'SELECT * FROM archive_exports WHERE id = $1 AND establishment_id = $2',
    [id, establishmentId]
  );
  return result.rows[0] || null;
}

export async function downloadArchiveExport(
  id: number,
  establishmentId: string
): Promise<{ filePath: string; fileName: string } | null> {
  const exportRecord = await getArchiveExportById(id, establishmentId);
  if (!exportRecord || !fs.existsSync(exportRecord.file_path)) {
    return null;
  }

  const fileName = `musebar_export_${exportRecord.export_type}_${exportRecord.id}.${exportRecord.format.toLowerCase()}`;
  
  return {
    filePath: exportRecord.file_path,
    fileName
  };
}
