import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  getArchiveExportById: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
  generateFileHash: vi.fn(),
  verifyDigitalSignature: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: { query: mocks.poolQuery },
}));

vi.mock('./archiveList', () => ({
  getArchiveExportById: mocks.getArchiveExportById,
}));

vi.mock('./archiveCrypto', () => ({
  generateFileHash: mocks.generateFileHash,
  verifyDigitalSignature: mocks.verifyDigitalSignature,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
    statSync: mocks.statSync,
  },
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
  statSync: mocks.statSync,
}));

import { verifyArchiveExport } from './archiveVerify';

describe('verifyArchiveExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not found when export missing', async () => {
    mocks.getArchiveExportById.mockResolvedValue(null);
    const result = await verifyArchiveExport(1, 'est-1');
    expect(result).toEqual({ isValid: false, errors: ['Archive export not found'] });
  });

  it('fails when file is missing on disk', async () => {
    mocks.getArchiveExportById.mockResolvedValue({
      file_path: '/tmp/missing.bin',
      file_hash: 'abc',
      digital_signature: 'sig',
      file_size: 10,
    });
    mocks.existsSync.mockReturnValue(false);
    const result = await verifyArchiveExport(1, 'est-1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export file not found');
  });

  it('collects hash/signature/size errors', async () => {
    mocks.getArchiveExportById.mockResolvedValue({
      file_path: '/tmp/export.bin',
      file_hash: 'expected-hash',
      digital_signature: 'sig',
      file_size: 100,
    });
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(Buffer.from('content'));
    mocks.generateFileHash.mockReturnValue('wrong-hash');
    mocks.verifyDigitalSignature.mockReturnValue(false);
    mocks.statSync.mockReturnValue({ size: 50 });

    const result = await verifyArchiveExport(2, 'est-1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/hash/i),
        expect.stringMatching(/signature/i),
        expect.stringMatching(/size/i),
      ])
    );
    expect(mocks.poolQuery).not.toHaveBeenCalled();
  });

  it('marks verified and updates row when all checks pass', async () => {
    mocks.getArchiveExportById.mockResolvedValue({
      file_path: '/tmp/export.bin',
      file_hash: 'ok-hash',
      digital_signature: 'sig',
      file_size: '12',
    });
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(Buffer.from('content'));
    mocks.generateFileHash.mockReturnValue('ok-hash');
    mocks.verifyDigitalSignature.mockReturnValue(true);
    mocks.statSync.mockReturnValue({ size: 12 });
    mocks.poolQuery.mockResolvedValue({ rowCount: 1 });

    const result = await verifyArchiveExport(3, 'est-1');
    expect(result).toEqual({ isValid: true, errors: [] });
    expect(mocks.poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE archive_exports'),
      expect.arrayContaining(['VERIFIED', expect.any(Date), 3, 'est-1'])
    );
  });
});
