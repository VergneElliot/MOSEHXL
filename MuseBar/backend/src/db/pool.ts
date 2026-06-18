import dotenv from 'dotenv';
import { Pool } from 'pg';
import { initializeEnvironment } from '../config/environment';
import { DEFAULT_APP_TIMEZONE } from '../config/timezone';
import { getCurrentEstablishmentId } from '../rls/tenantContext';

dotenv.config();

const config = initializeEnvironment();

export const pool = new Pool({
  user: config.database.user,
  host: config.database.host,
  database: config.database.database,
  password: config.database.password,
  port: config.database.port,
  ssl: config.database.ssl ? { rejectUnauthorized: config.database.sslRejectUnauthorized } : false,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  options: `--timezone=${DEFAULT_APP_TIMEZONE}`,
});

const basePoolQuery = pool.query.bind(pool);
type PoolQueryArgs = Parameters<typeof basePoolQuery>;

/**
 * Enforce tenant DB context for authenticated request chains.
 *
 * For requests with an establishment context, each pool.query runs inside a short
 * transaction with SET LOCAL app.establishment_id so RLS policies can enforce isolation.
 * Non-tenant contexts (health checks, setup, migrations CLI pool) keep default behavior.
 */
async function queryWithTenantContext(...args: PoolQueryArgs): Promise<unknown> {
  const establishmentId = getCurrentEstablishmentId();
  if (!establishmentId) {
    return basePoolQuery(...args);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.establishment_id', $1, true)", [establishmentId]);

    let result: unknown;
    if (typeof args[0] === 'string') {
      result = await client.query(args[0], (args[1] as PoolQueryArgs[1]) ?? undefined);
    } else {
      result = await client.query(args[0]);
    }

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

(pool as unknown as { query: (...args: PoolQueryArgs) => Promise<unknown> }).query = queryWithTenantContext;
