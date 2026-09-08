import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findActive: vi.fn(),
  touch: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../models/staffPinSession', () => ({
  StaffPinSessionModel: {
    findActive: mocks.findActive,
    touch: mocks.touch,
  },
}));

vi.mock('../../utils/logger', () => ({
  Logger: { getInstance: () => ({ error: mocks.error }) },
}));

import { checkPinSession, resetPinSessionTouchCache, touchPinSession } from './pinSessionGuard';

const EST = 'est-1';

describe('checkPinSession', () => {
  beforeEach(() => {
    mocks.findActive.mockReset();
    mocks.touch.mockReset();
    mocks.error.mockReset();
    resetPinSessionTouchCache();
    mocks.touch.mockResolvedValue(undefined);
  });

  it('treats a token without sid as unknown, so pre-session tokens keep working', async () => {
    await expect(checkPinSession(undefined, EST)).resolves.toBe('unknown');
    expect(mocks.findActive).not.toHaveBeenCalled();
  });

  it('reports an open session as active', async () => {
    mocks.findActive.mockResolvedValue({ id: 'sid-1' });
    await expect(checkPinSession('sid-1', EST)).resolves.toBe('active');
  });

  it('reports a closed or expired session as revoked', async () => {
    mocks.findActive.mockResolvedValue(null);
    await expect(checkPinSession('sid-1', EST)).resolves.toBe('revoked');
  });

  it('does not revoke the floor when the lookup itself fails', async () => {
    mocks.findActive.mockRejectedValue(new Error('db down'));
    await expect(checkPinSession('sid-1', EST)).resolves.toBe('unknown');
    expect(mocks.error).toHaveBeenCalled();
  });
});

describe('touchPinSession', () => {
  beforeEach(() => {
    mocks.touch.mockReset();
    mocks.touch.mockResolvedValue(undefined);
    resetPinSessionTouchCache();
  });

  it('writes once per session within the throttle window', () => {
    touchPinSession('sid-1', EST);
    touchPinSession('sid-1', EST);
    touchPinSession('sid-1', EST);
    expect(mocks.touch).toHaveBeenCalledTimes(1);
  });

  it('throttles per session, not globally', () => {
    touchPinSession('sid-1', EST);
    touchPinSession('sid-2', EST);
    expect(mocks.touch).toHaveBeenCalledTimes(2);
  });

  it('ignores tokens without a session id', () => {
    touchPinSession(undefined, EST);
    expect(mocks.touch).not.toHaveBeenCalled();
  });
});
