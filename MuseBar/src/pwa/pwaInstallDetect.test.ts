import { describe, expect, it } from 'vitest';
import {
  PWA_IOS_HINT_DISMISSED_KEY,
  isIosSafariUserAgent,
  isStandaloneDisplay,
  readIosHintDismissed,
  writeIosHintDismissed,
} from './pwaInstallDetect';

describe('isStandaloneDisplay', () => {
  it('detects display-mode standalone', () => {
    const matchMedia = (q: string) => ({ matches: q.includes('standalone') });
    expect(isStandaloneDisplay(matchMedia, {})).toBe(true);
  });

  it('detects iOS navigator.standalone', () => {
    const matchMedia = () => ({ matches: false });
    expect(isStandaloneDisplay(matchMedia, { standalone: true })).toBe(true);
  });

  it('returns false in a normal browser tab', () => {
    const matchMedia = () => ({ matches: false });
    expect(isStandaloneDisplay(matchMedia, {})).toBe(false);
  });
});

describe('isIosSafariUserAgent', () => {
  it('matches iPhone Safari', () => {
    expect(
      isIosSafariUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true);
  });

  it('rejects Chrome on iOS', () => {
    expect(
      isIosSafariUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.0.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false);
  });
});

describe('ios hint storage', () => {
  it('reads and writes dismissed flag', () => {
    const store: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    expect(readIosHintDismissed(storage)).toBe(false);
    writeIosHintDismissed(storage);
    expect(store[PWA_IOS_HINT_DISMISSED_KEY]).toBe('1');
    expect(readIosHintDismissed(storage)).toBe(true);
  });
});
