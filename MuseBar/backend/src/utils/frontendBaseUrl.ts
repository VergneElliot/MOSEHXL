/**
 * Resolve the public frontend origin for invitation / setup emails.
 * Prefer FRONTEND_URL; fall back to first https CORS origin in production.
 */
export function resolveFrontendBaseUrl(): string {
  const fromEnv = process.env.FRONTEND_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const cors = process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '';
  const httpsOrigin = cors
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.startsWith('https://'));
  if (httpsOrigin) return httpsOrigin.replace(/\/$/, '');

  return 'http://localhost:3000';
}
