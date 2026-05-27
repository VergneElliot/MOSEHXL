import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Pool } from 'pg';
import { MigrationManager } from './migration-manager';

function writeMigrationFile(directory: string, id: string, name: string, upSql: string, downSql: string) {
  const filename = `${id}_${name}.sql`;
  fs.writeFileSync(
    path.join(directory, filename),
    `-- UP
${upSql}

-- DOWN
${downSql}
`,
    'utf8'
  );
}

describe('MigrationManager checksum verification', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails migrate when an applied migration checksum mismatches file checksum', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosehxl-migrations-'));
    tempDirs.push(dir);
    writeMigrationFile(
      dir,
      '2026_01_01_00_00_00',
      'checksum_mismatch_guard',
      'CREATE TABLE sample (id INT);',
      'DROP TABLE sample;'
    );

    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id, name, up_checksum, executed_at FROM migrations')) {
        return {
          rows: [
            {
              id: '2026_01_01_00_00_00',
              name: 'checksum mismatch guard',
              up_checksum: 'deadbeef',
              executed_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    });
    const manager = new MigrationManager({ query } as unknown as Pool, dir);

    await expect(manager.migrate()).rejects.toThrow(/Migration checksum mismatch/);
    expect(query).not.toHaveBeenCalledWith('BEGIN');
  });

  it('stores one-time baseline checksum for legacy executed migration rows missing checksum', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosehxl-migrations-'));
    tempDirs.push(dir);
    writeMigrationFile(
      dir,
      '2026_01_02_00_00_00',
      'baseline_missing_checksum',
      'CREATE TABLE baseline_test (id INT);',
      'DROP TABLE baseline_test;'
    );

    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, name, up_checksum, executed_at FROM migrations')) {
        return {
          rows: [
            {
              id: '2026_01_02_00_00_00',
              name: 'baseline missing checksum',
              up_checksum: null,
              executed_at: new Date(),
            },
          ],
        };
      }
      if (sql.includes('UPDATE migrations SET up_checksum = $2 WHERE id = $1')) {
        expect(params?.[0]).toBe('2026_01_02_00_00_00');
        expect(typeof params?.[1]).toBe('string');
        expect(String(params?.[1])).toMatch(/^[a-f0-9]{64}$/);
      }
      return { rows: [] };
    });
    const manager = new MigrationManager({ query } as unknown as Pool, dir);

    await expect(manager.migrate()).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      'UPDATE migrations SET up_checksum = $2 WHERE id = $1',
      expect.arrayContaining(['2026_01_02_00_00_00', expect.any(String)])
    );
  });

  it('persists checksum when applying a new migration', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosehxl-migrations-'));
    tempDirs.push(dir);
    writeMigrationFile(
      dir,
      '2026_01_03_00_00_00',
      'pending_checksum_persist',
      'CREATE TABLE pending_test (id INT);',
      'DROP TABLE pending_test;'
    );

    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, name, up_checksum, executed_at FROM migrations')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO migrations (id, name, up_checksum) VALUES ($1, $2, $3)')) {
        expect(params?.[0]).toBe('2026_01_03_00_00_00');
        expect(params?.[1]).toBe('pending checksum persist');
        expect(typeof params?.[2]).toBe('string');
        expect(String(params?.[2])).toMatch(/^[a-f0-9]{64}$/);
      }
      return { rows: [] };
    });
    const manager = new MigrationManager({ query } as unknown as Pool, dir);

    await expect(manager.migrate()).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      'INSERT INTO migrations (id, name, up_checksum) VALUES ($1, $2, $3)',
      expect.arrayContaining(['2026_01_03_00_00_00', 'pending checksum persist', expect.any(String)])
    );
  });
});
