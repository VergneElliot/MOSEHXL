import type { Pool } from 'pg';
import type { PrintResult } from '../services/printing/types';

export async function logPrintingHistory(
  pool: Pool,
  establishmentId: string,
  printType: 'receipt' | 'closure_bulletin' | 'invoice',
  result: PrintResult,
  metadata: Record<string, unknown>
) {
  await pool.query(
    `INSERT INTO printing_history 
     (establishment_id, print_type, provider, status, metadata) 
     VALUES ($1, $2, $3, $4, $5)`,
    [
      establishmentId,
      printType,
      result.provider || 'unknown',
      result.success ? 'success' : 'failed',
      JSON.stringify({ ...metadata, ...result.metadata }),
    ]
  );
}
