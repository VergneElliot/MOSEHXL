/**
 * Pure helpers for PWA install / standalone detection (unit-testable).
 */

export const PWA_IOS_HINT_DISMISSED_KEY = 'mosehxl.pwa.iosHintDismissed';

export type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function isStandaloneDisplay(
  matchMedia: (query: string) => { matches: boolean },
  navigatorLike: { standalone?: boolean }
): boolean {
  if (matchMedia('(display-mode: standalone)').matches) return true;
  if (matchMedia('(display-mode: fullscreen)').matches) return true;
  if (navigatorLike.standalone === true) return true;
  return false;
}

export function isIosSafariUserAgent(userAgent: string): boolean {
  const ua = userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && ua.includes('Mobile'));
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

export function readIosHintDismissed(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(PWA_IOS_HINT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeIosHintDismissed(storage: Pick<Storage, 'setItem'>): void {
  try {
    storage.setItem(PWA_IOS_HINT_DISMISSED_KEY, '1');
  } catch {
    // private mode / quota — ignore
  }
}
