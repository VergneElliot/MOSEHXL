import { describe, expect, it, vi } from 'vitest';
import { StatusTransitionValidator } from './StatusTransitionValidator';

function logger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('StatusTransitionValidator', () => {
  it('isValidStatus accepts known statuses only', () => {
    expect(StatusTransitionValidator.isValidStatus('active')).toBe(true);
    expect(StatusTransitionValidator.isValidStatus('nope')).toBe(false);
  });

  it('validateTransitionRequest fails on invalid transition', async () => {
    const v = new StatusTransitionValidator(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ status: 'active' }] }) };
    const result = await v.validateTransitionRequest(client as never, {
      establishmentId: 'est-1',
      fromStatus: 'active',
      toStatus: 'pending_setup',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/Invalid status transition/);
  });

  it('requires approval when rule says so', async () => {
    const v = new StatusTransitionValidator(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ status: 'active' }] }) };
    const result = await v.validateTransitionRequest(client as never, {
      establishmentId: 'est-1',
      fromStatus: 'active',
      toStatus: 'suspended',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Approval'))).toBe(true);
  });

  it('passes when transition, approval, and current status match', async () => {
    const v = new StatusTransitionValidator(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ status: 'active' }] }) };
    const result = await v.validateTransitionRequest(client as never, {
      establishmentId: 'est-1',
      fromStatus: 'active',
      toStatus: 'suspended',
      approvedBy: 'admin-1',
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('flags mismatched current status and missing establishment', async () => {
    const v = new StatusTransitionValidator(logger() as never);
    const client = { query: vi.fn().mockResolvedValue({ rows: [{ status: 'suspended' }] }) };
    const mismatch = await v.validateTransitionRequest(client as never, {
      establishmentId: 'est-1',
      fromStatus: 'active',
      toStatus: 'suspended',
      approvedBy: 'a',
    });
    expect(mismatch.isValid).toBe(false);
    expect(mismatch.errors.some((e) => e.includes('Expected status'))).toBe(true);

    const missing = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const fail = await v.validateTransitionRequest(missing as never, {
      establishmentId: 'missing',
      fromStatus: 'pending_setup',
      toStatus: 'setup_in_progress',
    });
    expect(fail.errors.some((e) => e.includes('Failed to verify'))).toBe(true);
  });
});
