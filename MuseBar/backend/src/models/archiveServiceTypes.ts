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
