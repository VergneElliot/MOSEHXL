import fs from 'fs';
import { pool } from '../db/pool';
import { generateFileHash, verifyDigitalSignature } from './archiveCrypto';
import { getArchiveExportById } from './archiveList';

export async function verifyArchiveExport(
  id: number,
  establishmentId: string
): Promise<{ isValid: boolean; errors: string[] }> {
  const exportRecord = await getArchiveExportById(id, establishmentId);
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
    const fileContent = fs.readFileSync(exportRecord.file_path);
    
    // Verify file hash
    const currentHash = generateFileHash(fileContent);
    if (currentHash !== exportRecord.file_hash) {
      errors.push('File hash verification failed - file may have been tampered with');
    }

    // Verify digital signature
    if (!verifyDigitalSignature(fileContent, exportRecord.digital_signature)) {
      errors.push('Digital signature verification failed - file authenticity compromised');
    }

    // Verify file size (pg may return bigint as string)
    const currentSize = fs.statSync(exportRecord.file_path).size;
    if (currentSize !== Number(exportRecord.file_size)) {
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
