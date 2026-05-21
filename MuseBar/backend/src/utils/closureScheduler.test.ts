import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  createDailyClosure: vi.fn(),
  logClosure: vi.fn(),
  auditLogAction: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  pool: {
    query: mocks.poolQuery,
  },
}));

vi.mock('../models/legalJournal', () => ({
  LegalJournalModel: {
    createDailyClosure: mocks.createDailyClosure,
    logClosure: mocks.logClosure,
  },
}));

vi.mock('../models/auditTrail', () => ({
  AuditTrailModel: {
    logAction: mocks.auditLogAction,
  },
}));

vi.mock('./logger', () => ({
  Logger: {
    getInstance: () => ({
      error: mocks.loggerError,
    }),
  },
}));

import { ClosureScheduler } from './closureScheduler';

const ESTABLISHMENT_ID = 'estab-abc';
const NOW = new Date('2026-05-20T03:00:00.000Z');

function fakeBulletin(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    total_amount: '123.45',
    total_vat: '12.34',
    total_transactions: 7,
    period_start: new Date('2026-05-19T22:00:00.000Z'),
    period_end: new Date('2026-05-20T22:00:00.000Z'),
    closure_hash: 'closure-hash-abc',
    first_sequence: 100,
    last_sequence: 117,
    ...overrides,
  };
}

describe('ClosureScheduler.executeAutomaticClosureForEstablishment', () => {
  beforeEach(() => {
    mocks.poolQuery.mockReset();
    mocks.createDailyClosure.mockReset();
    mocks.logClosure.mockReset();
    mocks.auditLogAction.mockReset();
    mocks.loggerError.mockReset();

    mocks.poolQuery.mockResolvedValue({ rows: [] });
    mocks.auditLogAction.mockResolvedValue(undefined);
  });

  it('appends a CLOSURE legal journal entry after the bulletin is created', async () => {
    const bulletin = fakeBulletin();
    mocks.createDailyClosure.mockResolvedValue(bulletin);
    mocks.logClosure.mockResolvedValue({ sequence_number: 118 });

    const result = await ClosureScheduler.executeAutomaticClosureForEstablishment(
      ESTABLISHMENT_ID,
      NOW
    );

    expect(result).toEqual({ establishmentId: ESTABLISHMENT_ID, bulletinId: 42 });

    expect(mocks.logClosure).toHaveBeenCalledTimes(1);
    expect(mocks.logClosure).toHaveBeenCalledWith(
      ESTABLISHMENT_ID,
      'DAILY',
      123.45,
      12.34,
      expect.objectContaining({
        closure_bulletin_id: 42,
        closure_type: 'DAILY',
        period_start: bulletin.period_start,
        period_end: bulletin.period_end,
        closure_hash: 'closure-hash-abc',
        first_sequence: 100,
        last_sequence: 117,
        force: false,
        trigger: 'AUTOMATIC',
      })
    );

    const executedCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_EXECUTED'
    );
    expect(executedCall).toBeDefined();
    expect(executedCall![0]).toMatchObject({
      action_type: 'AUTO_CLOSURE_EXECUTED',
      resource_type: 'CLOSURE_BULLETIN',
      resource_id: '42',
      action_details: expect.objectContaining({
        closure_type: 'DAILY',
        establishment_id: ESTABLISHMENT_ID,
        trigger: 'AUTOMATIC',
        journal_sequence_number: 118,
      }),
    });

    const failureCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_JOURNAL_APPEND_FAILED'
    );
    expect(failureCall).toBeUndefined();
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });

  it('returns null and skips the journal append when the bulletin already exists', async () => {
    mocks.createDailyClosure.mockRejectedValue(
      new Error('Daily closure bulletin already exists for this period')
    );

    const result = await ClosureScheduler.executeAutomaticClosureForEstablishment(
      ESTABLISHMENT_ID,
      NOW
    );

    expect(result).toBeNull();
    expect(mocks.logClosure).not.toHaveBeenCalled();

    const executedCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_EXECUTED'
    );
    expect(executedCall).toBeUndefined();

    const failureCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_FAILED'
    );
    expect(failureCall).toBeUndefined();
  });

  it('records AUTO_CLOSURE_JOURNAL_APPEND_FAILED and continues when the journal append fails', async () => {
    const bulletin = fakeBulletin();
    mocks.createDailyClosure.mockResolvedValue(bulletin);
    mocks.logClosure.mockRejectedValue(new Error('journal append boom'));

    const result = await ClosureScheduler.executeAutomaticClosureForEstablishment(
      ESTABLISHMENT_ID,
      NOW
    );

    expect(result).toEqual({ establishmentId: ESTABLISHMENT_ID, bulletinId: 42 });

    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Auto closure journal append failed for bulletin 42'),
      expect.any(Error),
      'LEGAL_JOURNAL'
    );

    const failureCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_JOURNAL_APPEND_FAILED'
    );
    expect(failureCall).toBeDefined();
    expect(failureCall![0]).toMatchObject({
      action_type: 'AUTO_CLOSURE_JOURNAL_APPEND_FAILED',
      resource_type: 'CLOSURE_BULLETIN',
      resource_id: '42',
      action_details: expect.objectContaining({
        bulletin_id: 42,
        establishment_id: ESTABLISHMENT_ID,
        error: 'journal append boom',
      }),
    });

    const executedCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_EXECUTED'
    );
    expect(executedCall).toBeDefined();
    expect(executedCall![0].action_details).toMatchObject({
      journal_sequence_number: null,
    });
  });

  it('rethrows non-"already exists" bulletin failures and records AUTO_CLOSURE_FAILED', async () => {
    mocks.createDailyClosure.mockRejectedValue(new Error('database down'));

    await expect(
      ClosureScheduler.executeAutomaticClosureForEstablishment(ESTABLISHMENT_ID, NOW)
    ).rejects.toThrow('database down');

    expect(mocks.logClosure).not.toHaveBeenCalled();

    const failureCall = mocks.auditLogAction.mock.calls.find(
      ([entry]) => entry?.action_type === 'AUTO_CLOSURE_FAILED'
    );
    expect(failureCall).toBeDefined();
    expect(failureCall![0].action_details).toMatchObject({
      error: 'database down',
      establishment_id: ESTABLISHMENT_ID,
    });
  });
});
