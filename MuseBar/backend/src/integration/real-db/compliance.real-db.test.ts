import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { Pool, PoolClient } from 'pg';
import { runWithTenantContext } from '../../rls/tenantContext';
import { pool as appPool } from '../../db/pool';
import { JournalQueries } from '../../models/legalJournal/journalQueries';
import { OrderModel } from '../../models/database/orderModel';

function resolveDbSsl(): false | { rejectUnauthorized: boolean } {
  const sslEnabled = process.env.DB_SSL === 'true';
  if (!sslEnabled) return false;
  return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' };
}

function createAdminPool(): Pool {
  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
    ssl: resolveDbSsl(),
  });
}

async function withBypassRls<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const describeRealDb = process.env.RUN_REAL_DB_TESTS === 'true' ? describe : describe.skip;

describeRealDb('real-db compliance assertions', () => {
  const adminPool = createAdminPool();
  const createdEstablishmentIds = new Set<string>();
  const createdOrderIds = new Set<number>();

  async function createEstablishment(): Promise<string> {
    const establishmentId = randomUUID();
    const shortId = establishmentId.replace(/-/g, '').slice(0, 12);
    await withBypassRls(adminPool, async (client) => {
      await client.query(
        `
          INSERT INTO establishments (
            id, name, email, schema_name, subscription_plan, subscription_status
          ) VALUES ($1, $2, $3, $4, 'basic', 'active')
        `,
        [
          establishmentId,
          `RLS Test ${shortId}`,
          `rls-test-${shortId}@example.com`,
          `est_${shortId}`,
        ]
      );
    });
    createdEstablishmentIds.add(establishmentId);
    return establishmentId;
  }

  afterAll(async () => {
    for (const establishmentId of createdEstablishmentIds) {
      await JournalQueries.resetJournalDevOnly(establishmentId).catch(() => {});
    }

    if (createdOrderIds.size > 0) {
      await withBypassRls(adminPool, async (client) => {
        await client.query(
          'DELETE FROM orders WHERE id = ANY($1::int[])',
          [Array.from(createdOrderIds)]
        );
      }).catch(() => {});
    }

    if (createdEstablishmentIds.size > 0) {
      await withBypassRls(adminPool, async (client) => {
        await client.query(
          'DELETE FROM establishments WHERE id = ANY($1::uuid[])',
          [Array.from(createdEstablishmentIds)]
        );
      }).catch(() => {});
    }

    await adminPool.end();
  });

  async function currentRoleBypassesRls(): Promise<boolean> {
    const result = await adminPool.query(
      `
        SELECT r.rolsuper, r.rolbypassrls
        FROM pg_roles r
        WHERE r.rolname = current_user
      `
    );
    const row = result.rows[0] as { rolsuper?: boolean; rolbypassrls?: boolean } | undefined;
    return Boolean(row?.rolsuper || row?.rolbypassrls);
  }

  it('blocks UPDATE and DELETE on legal_journal rows via immutability trigger', async () => {
    const establishmentId = await createEstablishment();

    const entry = await runWithTenantContext({ establishmentId }, async () => {
      return await JournalQueries.appendEntryTransactional(
        establishmentId,
        'CORRECTION',
        null,
        0,
        0,
        'system',
        { source: 'real-db-trigger-test' },
        'system',
        `CR-${establishmentId}`
      );
    });

    await expect(
      runWithTenantContext({ establishmentId }, async () => {
        await appPool.query('UPDATE legal_journal SET amount = amount + 1 WHERE id = $1', [entry.id]);
      })
    ).rejects.toThrow(/legal_journal|immutable|forbidden|compliance|inalterabilite/i);

    await expect(
      runWithTenantContext({ establishmentId }, async () => {
        await appPool.query('DELETE FROM legal_journal WHERE id = $1', [entry.id]);
      })
    ).rejects.toThrow(/legal_journal|immutable|forbidden|compliance|inalterabilite/i);
  });

  it('enforces tenant isolation so one establishment cannot read another establishment orders', async () => {
    if (await currentRoleBypassesRls()) {
      // Superusers / BYPASSRLS roles bypass policy evaluation and cannot validate RLS behavior.
      return;
    }

    const establishmentA = await createEstablishment();
    const establishmentB = await createEstablishment();

    const orderA = await runWithTenantContext({ establishmentId: establishmentA }, async () => {
      return await OrderModel.create(
        {
          total_amount: 12.5,
          total_tax: 2.08,
          payment_method: 'cash',
          status: 'completed',
          notes: 'RLS visibility test',
          tips: 0,
          change: 0,
          operation_type: 'sale',
          change_amount: null,
          establishment_id: establishmentA,
        },
        establishmentA
      );
    });
    createdOrderIds.add(orderA.id);

    const visibleFromOwner = await runWithTenantContext({ establishmentId: establishmentA }, async () => {
      return await appPool.query('SELECT id FROM orders WHERE id = $1', [orderA.id]);
    });
    expect(visibleFromOwner.rows).toHaveLength(1);

    const visibleFromOtherTenant = await runWithTenantContext({ establishmentId: establishmentB }, async () => {
      return await appPool.query('SELECT id FROM orders WHERE id = $1', [orderA.id]);
    });
    expect(visibleFromOtherTenant.rows).toHaveLength(0);
  });

  it('does not expose tenant rows when request context has no establishment_id', async () => {
    if (await currentRoleBypassesRls()) {
      // Superusers / BYPASSRLS roles bypass policy evaluation and cannot validate RLS behavior.
      return;
    }

    const establishmentId = await createEstablishment();
    const order = await runWithTenantContext({ establishmentId }, async () => {
      return await OrderModel.create(
        {
          total_amount: 18.4,
          total_tax: 3.07,
          payment_method: 'card',
          status: 'completed',
          notes: 'null-context-read-test',
          tips: 0,
          change: 0,
          operation_type: 'sale',
          change_amount: null,
          establishment_id: establishmentId,
        },
        establishmentId
      );
    });
    createdOrderIds.add(order.id);

    const visibleWithNullContext = await runWithTenantContext({ establishmentId: null }, async () => {
      return await appPool.query('SELECT id FROM orders WHERE id = $1', [order.id]);
    });
    expect(visibleWithNullContext.rows).toHaveLength(0);
  });

  it('blocks tenant writes when request context has no establishment_id', async () => {
    if (await currentRoleBypassesRls()) {
      // Superusers / BYPASSRLS roles bypass policy evaluation and cannot validate RLS behavior.
      return;
    }

    const establishmentId = await createEstablishment();

    await expect(
      runWithTenantContext({ establishmentId: null }, async () => {
        await appPool.query(
          `
            INSERT INTO orders (
              establishment_id, total_amount, total_tax, payment_method, status
            ) VALUES ($1, 9.9, 1.65, 'cash', 'completed')
          `,
          [establishmentId]
        );
      })
    ).rejects.toThrow(/row-level security|policy|permission|rls/i);
  });
});
