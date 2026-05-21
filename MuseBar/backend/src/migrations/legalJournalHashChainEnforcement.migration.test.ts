import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  __dirname,
  'files',
  '2026_05_21_18_45_00_enforce_legal_journal_hash_chain_on_insert.sql'
);

describe('legal_journal hash-chain enforcement migration', () => {
  it('enables sha256 hashing support and adds INSERT integrity trigger', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION enforce_legal_journal_insert_integrity()');
    expect(sql).toContain("digest(expected_previous_hash || '|' || payload, 'sha256')");
    expect(sql).toContain('CREATE TRIGGER trigger_enforce_legal_journal_insert_integrity');
    expect(sql).toContain('BEFORE INSERT ON legal_journal');
  });

  it('validates both sequence continuity and hash continuity', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('Invalid legal journal sequence number');
    expect(sql).toContain('Invalid legal journal previous_hash');
    expect(sql).toContain('Invalid legal journal current_hash');
    expect(sql).toContain('COALESCE(last_sequence, 0) + 1');
  });
});
