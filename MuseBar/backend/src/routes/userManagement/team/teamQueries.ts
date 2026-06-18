import { pool } from '../../../db/pool';

export async function countUsers(establishmentId: string) {
  const totalMembersResult = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE establishment_id = $1',
    [establishmentId]
  );
  return parseInt(totalMembersResult.rows[0].count);
}

export async function countActiveUsers(establishmentId: string) {
  const activeMembersResult = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE establishment_id = $1 AND is_active = true',
    [establishmentId]
  );
  return parseInt(activeMembersResult.rows[0].count);
}

export async function getRoleDistribution(establishmentId: string): Promise<Record<string, number>> {
  const roleDistributionResult = await pool.query(`
    SELECT role, COUNT(*) as count 
    FROM users 
    WHERE establishment_id = $1 AND is_active = true
    GROUP BY role
  `, [establishmentId]);

  const roleDistribution: Record<string, number> = {};
  roleDistributionResult.rows.forEach((row) => {
    const r = row as { role?: string; count?: string };
    if (typeof r.role === 'string') {
      roleDistribution[r.role] = parseInt(r.count ?? '0');
    }
  });
  return roleDistribution;
}

export async function fetchTeamMembers(establishmentId: string, includeInactive: boolean) {
  let query = `
    SELECT 
      u.id,
      u.email,
      u.first_name as "firstName",
      u.last_name as "lastName",
      u.role,
      u.is_active as "status",
      u.last_login_at as "lastLogin",
      u.created_at as "createdAt"
    FROM users u
    WHERE u.establishment_id = $1
  `;

  const queryParams: string[] = [establishmentId];

  if (!includeInactive) {
    query += ' AND u.is_active = true';
  }

  query += ' ORDER BY u.created_at DESC';

  const result = await pool.query(query, queryParams);
  return result.rows;
}


