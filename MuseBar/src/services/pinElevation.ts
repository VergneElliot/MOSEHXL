/**
 * Which PIN identity is sent with an API request.
 *
 * Three sources, in priority order:
 *
 * 1. **Transient elevation** — the PIN typed into a step-up prompt for one action. Consumed by
 *    the first request that reads it, so authorization never carries over to a later click.
 * 2. **Open scope** — the PIN that authorized entry into a gated page. Lives until the page is
 *    left, because the page's own reads and writes need the same rights.
 * 3. **Active PIN session** — the badge currently selected in the header.
 *
 * The API layer reads this through `resolvePinActorToken()`; React writes to it.
 */

type TokenProvider = () => string | null;

const TRANSIENT_TTL_MS = 30_000;

let sessionTokenProvider: TokenProvider | null = null;
let transient: { token: string; expiresAt: number } | null = null;
const scopes = new Map<string, string>();

export function registerSessionTokenProvider(provider: TokenProvider | null): void {
  sessionTokenProvider = provider;
}

/** Authorize the next request with `token` (single action). */
export function setTransientElevation(token: string): void {
  transient = { token, expiresAt: Date.now() + TRANSIENT_TTL_MS };
}

export function clearTransientElevation(): void {
  transient = null;
}

export function openElevationScope(key: string, token: string): void {
  scopes.set(key, token);
}

export function closeElevationScope(key: string): void {
  scopes.delete(key);
}

export function clearElevationScopes(): void {
  scopes.clear();
}

export function hasElevationScope(key: string): boolean {
  return scopes.has(key);
}

/** Most recently opened scope wins when several pages were entered. */
function latestScopeToken(): string | null {
  let token: string | null = null;
  for (const value of scopes.values()) token = value;
  return token;
}

export function resolvePinActorToken(): string | null {
  if (transient) {
    const { token, expiresAt } = transient;
    transient = null;
    if (expiresAt > Date.now()) return token;
  }
  return latestScopeToken() ?? sessionTokenProvider?.() ?? null;
}

/** Test seam. */
export function resetPinElevation(): void {
  sessionTokenProvider = null;
  transient = null;
  scopes.clear();
}
