import { pool } from '../../../db/pool';
import { Role } from '../types';
import { DEFAULT_ROLES } from './rolePermissions';

export async function fetchCustomRoles(establishmentId: string): Promise<Role[]> {
  const customRolesResult = await pool.query(`
    SELECT 
      id,
      name,
      description,
      permissions,
      is_active,
      created_at,
      updated_at
    FROM establishment_roles 
    WHERE establishment_id = $1 AND is_active = true
    ORDER BY name
  `, [establishmentId]);

  return customRolesResult.rows.map((row) => {
    const r = row as { id: string; name: string; description: string; permissions: unknown };
    return ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions as Role['permissions'],
      isSystemRole: false,
      establishmentId
    });
  });
}

export async function fetchCustomRoleById(roleId: string, establishmentId: string): Promise<(Role & { establishment_id: string; is_active: boolean }) | null> {
  const roleResult = await pool.query(`
    SELECT 
      id,
      name,
      description,
      permissions,
      is_active,
      created_at,
      updated_at,
      establishment_id
    FROM establishment_roles 
    WHERE id = $1 AND establishment_id = $2
  `, [roleId, establishmentId]);

  const row = roleResult.rows[0] as (Role & { establishment_id: string; is_active: boolean; permissions: unknown }) | undefined;
  if (!row) return null;
  return {
    ...(row as unknown as Role & { establishment_id: string; is_active: boolean }),
    permissions: row.permissions as Role['permissions'],
  };
}

export async function checkRoleNameExists(name: string, establishmentId: string): Promise<boolean> {
  const existingRole = await pool.query(
    'SELECT id FROM establishment_roles WHERE name = $1 AND establishment_id = $2',
    [name, establishmentId]
  );
  return existingRole.rows.length > 0;
}

export async function insertCustomRole(params: {
  establishmentId: string;
  name: string;
  description: string;
  permissions: unknown;
  createdBy: number;
}): Promise<string> {
  const result = await pool.query(`
    INSERT INTO establishment_roles (
      establishment_id,
      name,
      description,
      permissions,
      is_active,
      created_by,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, true, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id
  `, [
    params.establishmentId,
    params.name,
    params.description,
    JSON.stringify(params.permissions),
    params.createdBy
  ]);

  return result.rows[0].id as string;
}

export async function updateCustomRole(
  roleId: string,
  updates: { name?: string; description?: string; permissions?: unknown; }
): Promise<(Role & { establishment_id: string; is_active: boolean }) | null> {
  const updateFragments: string[] = [];
  const values: Array<string | Date> = [];
  let paramCount = 0;

  if (updates.name !== undefined) {
    paramCount++;
    updateFragments.push(`name = $${paramCount}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    paramCount++;
    updateFragments.push(`description = $${paramCount}`);
    values.push(updates.description);
  }
  if (updates.permissions !== undefined) {
    paramCount++;
    updateFragments.push(`permissions = $${paramCount}`);
    values.push(JSON.stringify(updates.permissions));
  }

  if (updateFragments.length === 0) {
    return null;
  }

  // updated_at
  paramCount++;
  updateFragments.push(`updated_at = $${paramCount}`);
  values.push(new Date());

  // WHERE id
  paramCount++;
  values.push(roleId);

  const updateQuery = `
    UPDATE establishment_roles 
    SET ${updateFragments.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(updateQuery, values);
  const row = result.rows[0] as (Role & { establishment_id: string; is_active: boolean; permissions: unknown }) | undefined;
  if (!row) return null;
  return {
    ...(row as unknown as Role & { establishment_id: string; is_active: boolean }),
    permissions: row.permissions as Role['permissions'],
  };
}

export async function deactivateCustomRole(roleId: string): Promise<void> {
  await pool.query(
    'UPDATE establishment_roles SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [roleId]
  );
}

export async function countUsersWithRole(roleId: string, establishmentId: string): Promise<number> {
  const usersWithRole = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE role = $1 AND establishment_id = $2',
    [roleId, establishmentId]
  );
  return parseInt(usersWithRole.rows[0].count);
}

/**
 * Check if a role ID is a system role
 */
export function isSystemRoleId(roleId: string): boolean {
  return roleId in DEFAULT_ROLES;
}


