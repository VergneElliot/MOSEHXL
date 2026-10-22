import { describe, expect, it } from 'vitest';
import { isValidLeaveStatus, isValidLeaveType } from './staffLeave';

describe('staffLeave validators', () => {
  it('accepts known leave types', () => {
    expect(isValidLeaveType('paid_leave')).toBe(true);
    expect(isValidLeaveType('rtt')).toBe(true);
    expect(isValidLeaveType('sick_leave')).toBe(true);
    expect(isValidLeaveType('bogus')).toBe(false);
  });

  it('accepts known leave statuses', () => {
    expect(isValidLeaveStatus('pending')).toBe(true);
    expect(isValidLeaveStatus('approved')).toBe(true);
    expect(isValidLeaveStatus('rejected')).toBe(true);
    expect(isValidLeaveStatus('cancelled')).toBe(true);
    expect(isValidLeaveStatus('done')).toBe(false);
  });
});
