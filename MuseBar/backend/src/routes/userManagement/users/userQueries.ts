import { pool } from '../../../app';
import { UserFilterParams, UserUpdateData } from '../types';

export async function fetchEstablishmentUsers(establishmentId: string, params: UserFilterParams) {
  const {
    page = 1,
    limit = 50,
    role,
    status,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = params;

  let query = `
    SELECT 
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.role,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at
    FROM users u
    WHERE u.establishment_id = $1
  `;
  const queryParams: Array<string | number | boolean> = [establishmentId];
  let paramCount = 1;

  if (role) {
    paramCount++;
    query += ` AND u.role = $${paramCount}`;
    queryParams.push(role);
  }

  if (status) {
    paramCount++;
    query += ` AND u.is_active = $${paramCount}`;
    queryParams.push(status === 'active');
  }

  if (search) {
    paramCount++;
    query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
  }

  const validSortFields = ['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login_at'];
  const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY u.${sortField} ${order}`;

  const offset = (Number(page) - 1) * Number(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  queryParams.push(Number(limit));
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  queryParams.push(offset);

  const result = await pool.query(query, queryParams);

  // Count query
  let countQuery = 'SELECT COUNT(*) FROM users u WHERE u.establishment_id = $1';
  const countParams: Array<string | number | boolean> = [establishmentId];
  let countParamIndex = 1;

  if (role) {
    countParamIndex++;
    countQuery += ` AND u.role = $${countParamIndex}`;
    countParams.push(role);
  }

  if (status) {
    countParamIndex++;
    countQuery += ` AND u.is_active = $${countParamIndex}`;
    countParams.push(status === 'active');
  }

  if (search) {
    countParamIndex++;
    countQuery += ` AND (u.first_name ILIKE $${countParamIndex} OR u.last_name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
    countParams.push(`%${search}%`);
  }

  const countResult = await pool.query(countQuery, countParams);
  const totalCount = parseInt(countResult.rows[0].count);

  return { rows: result.rows, totalCount };
}

export async function fetchUserById(userId: string) {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.role,
      u.is_active,
      u.establishment_id,
      u.last_login_at,
      u.created_at,
      u.updated_at,
      e.name as establishment_name
    FROM users u
    LEFT JOIN establishments e ON u.establishment_id = e.id
    WHERE u.id = $1
  `, [userId]);

  return result.rows[0] || null;
}

export async function fetchUserRowById(userId: string) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
}

export async function updateUserById(userId: string, updates: UserUpdateData) {
  const fragments: string[] = [];
  const values: Array<string | boolean | Date> = [];
  let paramCount = 0;

  if (updates.firstName !== undefined) {
    paramCount++;
    fragments.push(`first_name = $${paramCount}`);
    values.push(updates.firstName);
  }

  if (updates.lastName !== undefined) {
    paramCount++;
    fragments.push(`last_name = $${paramCount}`);
    values.push(updates.lastName);
  }

  if (updates.email !== undefined) {
    paramCount++;
    fragments.push(`email = $${paramCount}`);
    values.push(updates.email);
  }

  if (updates.role !== undefined) {
    paramCount++;
    fragments.push(`role = $${paramCount}`);
    values.push(updates.role);
  }

  if (updates.isActive !== undefined) {
    paramCount++;
    fragments.push(`is_active = $${paramCount}`);
    values.push(updates.isActive);
  }

  if (fragments.length === 0) {
    return null;
  }

  paramCount++;
  fragments.push(`updated_at = $${paramCount}`);
  values.push(new Date());

  paramCount++;
  values.push(userId);

  const updateQuery = `
    UPDATE users 
    SET ${fragments.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(updateQuery, values);
  return result.rows[0];
}

export async function deleteOrDeactivateUser(userId: string, permanent: boolean) {
  if (permanent) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    return { success: result.rows.length > 0 };
  }
  const result = await pool.query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
    [userId]
  );
  return { success: result.rows.length > 0 };
}

export async function reactivateUser(userId: string) {
  const result = await pool.query(
    'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = false RETURNING *',
    [userId]
  );
  return result.rows[0] || null;
}


