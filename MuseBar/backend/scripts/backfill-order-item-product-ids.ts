#!/usr/bin/env ts-node
/**
 * Backfill order_items.product_id for historical lines that only have product_name.
 * Matches catalog products by name within the same establishment (prefers active, then lowest id).
 *
 * Usage:
 *   npm run script:backfill-order-item-product-ids
 *   npm run script:backfill-order-item-product-ids -- --dry-run
 *   npm run script:backfill-order-item-product-ids -- --establishment-id=<uuid>
 */

import { pool } from '../src/db/pool';

function parseArgs(argv: string[]): { dryRun: boolean; establishmentId: string | null } {
  let dryRun = false;
  let establishmentId: string | null = null;
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--establishment-id=')) {
      establishmentId = arg.slice('--establishment-id='.length).trim() || null;
    }
  }
  return { dryRun, establishmentId };
}

async function countUnresolved(establishmentId: string | null): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id IS NULL
       AND o.status IN ('completed', 'paid')
       AND ($1::uuid IS NULL OR o.establishment_id = $1::uuid)`,
    [establishmentId]
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

async function countMatchable(establishmentId: string | null): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id IS NULL
       AND o.status IN ('completed', 'paid')
       AND ($1::uuid IS NULL OR o.establishment_id = $1::uuid)
       AND EXISTS (
         SELECT 1 FROM products p
         WHERE p.establishment_id = o.establishment_id
           AND LOWER(TRIM(p.name)) = LOWER(TRIM(oi.product_name))
       )`,
    [establishmentId]
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

async function backfill(establishmentId: string | null, dryRun: boolean): Promise<number> {
  if (dryRun) {
    return countMatchable(establishmentId);
  }

  const result = await pool.query(
    `UPDATE order_items oi
     SET product_id = match.resolved_id
     FROM (
       SELECT
         oi2.id AS order_item_id,
         (
           SELECT p.id
           FROM products p
           WHERE p.establishment_id = o.establishment_id
             AND LOWER(TRIM(p.name)) = LOWER(TRIM(oi2.product_name))
           ORDER BY p.is_active DESC, p.id ASC
           LIMIT 1
         ) AS resolved_id
       FROM order_items oi2
       INNER JOIN orders o ON o.id = oi2.order_id
       WHERE oi2.product_id IS NULL
         AND o.status IN ('completed', 'paid')
         AND ($1::uuid IS NULL OR o.establishment_id = $1::uuid)
     ) match
     WHERE oi.id = match.order_item_id
       AND match.resolved_id IS NOT NULL`,
    [establishmentId]
  );
  return result.rowCount ?? 0;
}

async function main(): Promise<void> {
  const { dryRun, establishmentId } = parseArgs(process.argv.slice(2));

  const unresolved = await countUnresolved(establishmentId);
  const matchable = await countMatchable(establishmentId);

  console.log('Order item product_id backfill');
  console.log(`  establishment: ${establishmentId ?? 'all'}`);
  console.log(`  mode: ${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`  completed/paid lines without product_id: ${unresolved}`);
  console.log(`  matchable by product name: ${matchable}`);

  if (matchable === 0) {
    console.log('Nothing to backfill.');
    await pool.end();
    return;
  }

  const updated = await backfill(establishmentId, dryRun);
  if (dryRun) {
    console.log(`Would update ${updated} order_items row(s).`);
  } else {
    console.log(`Updated ${updated} order_items row(s).`);
    const remaining = await countUnresolved(establishmentId);
    console.log(`Remaining without product_id: ${remaining}`);
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
