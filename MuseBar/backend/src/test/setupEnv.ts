/**
 * Ensures `middleware/auth` can load: it requires JWT_SECRET to be at least 32 characters.
 * Loaded before any test file via vitest `setupFiles`.
 */
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = '0'.repeat(32);
}
