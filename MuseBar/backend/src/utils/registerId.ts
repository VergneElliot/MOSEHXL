const DEFAULT_REGISTER_PREFIX = 'CR';
const FALLBACK_REGISTER_ID = `${DEFAULT_REGISTER_PREFIX}-UNKNOWN`;

export function getRegisterIdForEstablishment(establishmentId?: string | null): string {
  if (!establishmentId || typeof establishmentId !== 'string') {
    return FALLBACK_REGISTER_ID;
  }

  const trimmed = establishmentId.trim();
  if (!trimmed) {
    return FALLBACK_REGISTER_ID;
  }

  return `${DEFAULT_REGISTER_PREFIX}-${trimmed}`;
}
