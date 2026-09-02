#!/usr/bin/env ts-node
/**
 * Print top-selling products per establishment from order history (POS Favoris source data).
 *
 * Usage:
 *   npm run script:diagnose-top-sellers
 *   npm run script:diagnose-top-sellers -- --establishment-id=<uuid> --limit=10
 */

import { pool } from '../src/db/pool';
import { BusinessDayStatsRepository } from '../src/models/legalJournal/businessDayStatsRepository';

function parseArgs(argv: string[]): { establishmentId: string | null; limit: number } {
  let establishmentId: string | null = null;
  let limit = 10;
  for (const arg of argv) {
    if (arg.startsWith('--establishment-id=')) {
      establishmentId = arg.slice('--establishment-id='.length).trim() || null;
    } else if (arg.startsWith('--limit=')) {
      const parsed = parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
    }
  }
  return { establishmentId, limit };
}

async function main(): Promise<void> {
  const { establishmentId, limit } = parseArgs(process.argv.slice(2));

  const establishments = establishmentId
    ? [{ id: establishmentId }]
    : (
        await pool.query<{ id: string; name: string }>(
          `SELECT id, name FROM establishments ORDER BY name ASC`
        )
      ).rows;

  if (establishments.length === 0) {
    console.log('No establishments found.');
    await pool.end();
    return;
  }

  for (const est of establishments) {
    const stats = await pool.query<{
      completed_orders: string;
      order_items: string;
      with_product_id: string;
      without_product_id: string;
    }>(
      `SELECT
         COUNT(DISTINCT o.id)::text AS completed_orders,
         COUNT(oi.id)::text AS order_items,
         COUNT(oi.id) FILTER (WHERE oi.product_id IS NOT NULL)::text AS with_product_id,
         COUNT(oi.id) FILTER (WHERE oi.product_id IS NULL)::text AS without_product_id
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.establishment_id = $1
         AND o.status IN ('completed', 'paid')`,
      [est.id]
    );

    const row = stats.rows[0];
    const label = 'name' in est ? `${(est as { name: string }).name} (${est.id})` : est.id;
    console.log(`\n=== ${label} ===`);
    console.log(`  completed/paid orders: ${row?.completed_orders ?? 0}`);
    console.log(`  order lines: ${row?.order_items ?? 0} (${row?.with_product_id ?? 0} with product_id, ${row?.without_product_id ?? 0} without)`);

    const top = await BusinessDayStatsRepository.getTopProductsForEstablishment(est.id, limit);
    if (top.length === 0) {
      console.log('  top sellers: (none — check order history or run backfill script)');
      continue;
    }

    console.log(`  top ${top.length} sellers:`);
    top.forEach((entry, index) => {
      console.log(`    ${index + 1}. [${entry.product_id}] ${entry.name} — qty ${entry.qty}`);
    });
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
