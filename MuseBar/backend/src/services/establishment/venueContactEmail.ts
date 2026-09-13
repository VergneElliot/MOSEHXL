import { pool } from '../../db/pool';

/**
 * Contact email for venue copies (reservation notify / autoforward).
 * Prefers Paramètres → business_settings.email, falls back to establishments.email.
 */
export async function resolveVenueContactEmail(
  establishmentId: string
): Promise<string | null> {
  const result = await pool.query(
    `SELECT
       NULLIF(TRIM(bs.email), '') AS settings_email,
       NULLIF(TRIM(e.email), '') AS establishment_email
     FROM establishments e
     LEFT JOIN business_settings bs ON bs.establishment_id = e.id
     WHERE e.id = $1`,
    [establishmentId]
  );
  const row = result.rows[0] as
    | { settings_email: string | null; establishment_email: string | null }
    | undefined;
  if (!row) return null;
  return row.settings_email || row.establishment_email || null;
}

export async function syncEstablishmentContactEmail(
  establishmentId: string,
  email: string | null | undefined
): Promise<void> {
  const trimmed = email != null ? String(email).trim() : '';
  await pool.query(
    `UPDATE establishments
     SET email = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [establishmentId, trimmed || null]
  );
}
