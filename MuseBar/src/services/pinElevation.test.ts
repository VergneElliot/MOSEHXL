import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearElevationScopes,
  clearTransientElevation,
  closeElevationScope,
  hasElevationScope,
  openElevationScope,
  registerSessionTokenProvider,
  resetPinElevation,
  resolvePinActorToken,
  setTransientElevation,
} from './pinElevation';

describe('pinElevation', () => {
  beforeEach(() => {
    resetPinElevation();
    vi.useRealTimers();
  });

  it('falls back to the active session badge', () => {
    registerSessionTokenProvider(() => 'session-token');
    expect(resolvePinActorToken()).toBe('session-token');
    expect(resolvePinActorToken()).toBe('session-token');
  });

  it('returns nothing when no identity is available', () => {
    expect(resolvePinActorToken()).toBeNull();
  });

  it('uses a step-up token for one request only', () => {
    registerSessionTokenProvider(() => 'session-token');
    setTransientElevation('manager-token');

    expect(resolvePinActorToken()).toBe('manager-token');
    expect(resolvePinActorToken()).toBe('session-token');
  });

  it('drops a step-up token that was never used in time', () => {
    vi.useFakeTimers();
    registerSessionTokenProvider(() => 'session-token');
    setTransientElevation('manager-token');

    vi.advanceTimersByTime(31_000);

    expect(resolvePinActorToken()).toBe('session-token');
  });

  it('keeps a page scope across several requests', () => {
    registerSessionTokenProvider(() => 'session-token');
    openElevationScope('access_closure', 'manager-token');

    expect(resolvePinActorToken()).toBe('manager-token');
    expect(resolvePinActorToken()).toBe('manager-token');

    closeElevationScope('access_closure');
    expect(resolvePinActorToken()).toBe('session-token');
  });

  it('prefers a step-up token over an open scope', () => {
    openElevationScope('access_closure', 'closure-token');
    setTransientElevation('cancel-token');

    expect(resolvePinActorToken()).toBe('cancel-token');
    expect(resolvePinActorToken()).toBe('closure-token');
  });

  it('uses the most recently opened scope', () => {
    openElevationScope('access_closure', 'closure-token');
    openElevationScope('access_planning', 'planning-token');

    expect(resolvePinActorToken()).toBe('planning-token');
  });

  it('reports and clears open scopes', () => {
    openElevationScope('access_planning', 'planning-token');
    expect(hasElevationScope('access_planning')).toBe(true);

    clearElevationScopes();
    expect(hasElevationScope('access_planning')).toBe(false);
  });

  it('clears a pending step-up token on demand', () => {
    setTransientElevation('manager-token');
    clearTransientElevation();

    expect(resolvePinActorToken()).toBeNull();
  });
});
