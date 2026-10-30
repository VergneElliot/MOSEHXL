import type { PinPortalCardDto } from '../../services/api/pin';

export type CardTone = 'green' | 'orange' | 'red';

/** Solid fills that stay readable on a dark portal background. */
export const SOLID: Record<CardTone, { bg: string; fg: string }> = {
  green: { bg: '#1b5e20', fg: '#ffffff' },
  orange: { bg: '#e65100', fg: '#ffffff' },
  red: { bg: '#b71c1c', fg: '#ffffff' },
};

export function cardTone(card: PinPortalCardDto): CardTone {
  if (card.badge === 'closed' && card.pointage === 'closed') return 'red';
  if (card.badge === 'open' && card.pointage === 'open') return 'green';
  return 'orange';
}

/** Green local → green remote → orange local → orange remote → red; A–Z inside each bucket. */
export function sortPortalCards(
  cards: PinPortalCardDto[],
  unlockedUserIds: Set<number>
): PinPortalCardDto[] {
  const bucket = (card: PinPortalCardDto): number => {
    const tone = cardTone(card);
    const local = unlockedUserIds.has(card.user_id);
    if (tone === 'green' && local) return 0;
    if (tone === 'green') return 1;
    if (tone === 'orange' && local) return 2;
    if (tone === 'orange') return 3;
    return 4;
  };
  return [...cards].sort((a, b) => {
    const d = bucket(a) - bucket(b);
    if (d !== 0) return d;
    return a.display_name.localeCompare(b.display_name, 'fr', { sensitivity: 'base' });
  });
}

export function formatClockIn(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}
