import { pool } from '../db/pool';
import { resolveEffectivePermissions } from '../permissions/resolve';

export async function getUserPermissions(
  userId: number,
  establishmentId?: string | null
): Promise<string[]> {
  const userResult = await pool.query(
    'SELECT role, establishment_id FROM users WHERE id = $1',
    [userId]
  );
  const userRow = userResult.rows[0] as { role?: string; establishment_id?: string | null } | undefined;
  if (!userRow) return [];

  // Resolve membership role when an establishment context is available.
  let role = userRow.role || '';
  const activeEstablishmentId = establishmentId ?? userRow.establishment_id ?? null;
  if (activeEstablishmentId && role !== 'system_admin') {
    const mem = await pool.query(
      `SELECT role FROM user_establishment_memberships
         WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE`,
      [userId, activeEstablishmentId]
    );
    if (mem.rows[0]?.role) role = String(mem.rows[0].role);
  }

  if (!activeEstablishmentId) {
    return [];
  }

  if (role === 'establishment_admin') {
    return resolveEffectivePermissions({
      role,
      grantedNames: [],
      hasEstablishmentContext: true,
    });
  }

  const result = await pool.query(
    `SELECT p.name FROM permissions p
       JOIN user_permissions up ON up.permission_id = p.id
       WHERE up.user_id = $1 AND up.establishment_id = $2`,
    [userId, activeEstablishmentId]
  );

  return resolveEffectivePermissions({
    role,
    grantedNames: result.rows.map((row) => (row as { name: string }).name),
    hasEstablishmentContext: true,
  });
}

/**
 * Replace all permissions for a user in one establishment.
 */
export async function setUserPermissions(
  userId: number,
  permissions: string[],
  establishmentId?: string | null
): Promise<void> {
  let estId = establishmentId;
  if (!estId) {
    const u = await pool.query('SELECT establishment_id FROM users WHERE id = $1', [userId]);
    estId = u.rows[0]?.establishment_id ?? null;
  }
  if (!estId) {
    throw Object.assign(new Error('establishment_id required to set permissions'), {
      statusCode: 400,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM user_permissions WHERE user_id = $1 AND establishment_id = $2',
      [userId, estId]
    );
    if (permissions.length > 0) {
      await client.query(
        `INSERT INTO user_permissions (user_id, permission_id, establishment_id)
           SELECT $1, p.id, $3 FROM permissions p WHERE p.name = ANY($2::text[])`,
        [userId, permissions, estId]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
