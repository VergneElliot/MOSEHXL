import { pool } from '../db/pool';
import { establishmentLogger } from './establishmentLog';
import { assertValidSchemaName, type Establishment } from './establishmentTypes';

export async function getEstablishmentById(id: string): Promise<Establishment | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM establishments WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  } catch (error) {
    establishmentLogger()?.error(
      'Failed to get establishment by ID',
      {
        error: error as Error,
        establishmentId: id
      },
      'ESTABLISHMENT_MODEL'
    );
    throw error;
  }
}

export async function getEstablishmentByEmail(email: string): Promise<Establishment | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM establishments WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  } catch (error) {
    establishmentLogger()?.error(
      'Failed to get establishment by email',
      {
        error: error as Error,
        email
      },
      'ESTABLISHMENT_MODEL'
    );
    throw error;
  }
}

export async function getAllEstablishments(): Promise<Establishment[]> {
  try {
    const result = await pool.query(
      'SELECT * FROM establishments ORDER BY created_at DESC'
    );

    return result.rows;
  } catch (error) {
    establishmentLogger()?.error(
      'Failed to get all establishments',
      { error: error as Error },
      'ESTABLISHMENT_MODEL'
    );
    throw error;
  }
}

/**
 * Resolve establishment schema name for use in schema-qualified queries (e.g. "schema".orders).
 * Use this whenever a route or model must query establishment-specific tables (orders, products, etc.).
 * @throws Error if establishment not found or schema_name format is invalid for SQL safety
 */
export async function getSchemaNameForEstablishment(establishmentId: string): Promise<string> {
  const establishment = await getEstablishmentById(establishmentId);
  if (!establishment) {
    throw new Error('Establishment not found');
  }
  assertValidSchemaName(establishment.schema_name);
  return establishment.schema_name;
}

export async function getEstablishmentStats(id: string): Promise<{
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  subscriptionStatus: string;
}> {
  try {
    const establishment = await getEstablishmentById(id);
    if (!establishment) {
      throw new Error('Establishment not found');
    }

    const ordersResult = await pool.query(`
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders
        WHERE establishment_id = $1 AND status = 'completed'
      `, [id]);

    const usersResult = await pool.query(`
        SELECT COUNT(*) as active_users
        FROM users
        WHERE establishment_id = $1 AND is_active = TRUE
      `, [id]);

    return {
      totalOrders: parseInt(ordersResult.rows[0].total_orders) || 0,
      totalRevenue: parseFloat(ordersResult.rows[0].total_revenue) || 0,
      activeUsers: parseInt(usersResult.rows[0].active_users) || 0,
      subscriptionStatus: establishment.subscription_status
    };
  } catch (error) {
    establishmentLogger()?.error(
      'Failed to get establishment stats',
      {
        error: error as Error,
        establishmentId: id
      },
      'ESTABLISHMENT_MODEL'
    );
    throw error;
  }
}
