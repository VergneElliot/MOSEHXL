import { verifyDigitalSignature } from './archiveCrypto';
import { exportArchiveData, generateExportContent, initializeArchiveExportDir } from './archiveExport';
import { downloadArchiveExport, getArchiveExportById, getArchiveExports } from './archiveList';
import { verifyArchiveExport } from './archiveVerify';
import type { ArchiveExport, ExportData } from './archiveServiceTypes';

export type { ArchiveExport, ExportData } from './archiveServiceTypes';

export class ArchiveService {
  static async initialize(): Promise<void> {
    return initializeArchiveExportDir();
  }

  static verifyDigitalSignature(data: string | Buffer, signature: string): boolean {
    return verifyDigitalSignature(data, signature);
  }

  static async exportData(exportData: ExportData): Promise<ArchiveExport> {
    return exportArchiveData(exportData);
  }

  // Keep on the class so existing tests can reach it via a type cast.
  private static async generateExportContent(exportData: ExportData): Promise<string | Buffer> {
    return generateExportContent(exportData);
  }

  static async getArchiveExports(establishmentId: string): Promise<ArchiveExport[]> {
    return getArchiveExports(establishmentId);
  }

  static async getArchiveExportById(id: number, establishmentId: string): Promise<ArchiveExport | null> {
    return getArchiveExportById(id, establishmentId);
  }

  static async verifyArchiveExport(
    id: number,
    establishmentId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    return verifyArchiveExport(id, establishmentId);
  }

  static async downloadArchiveExport(
    id: number,
    establishmentId: string
  ): Promise<{ filePath: string; fileName: string } | null> {
    return downloadArchiveExport(id, establishmentId);
  }
}
