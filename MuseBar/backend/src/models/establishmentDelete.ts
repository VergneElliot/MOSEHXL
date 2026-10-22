import { pool } from '../db/pool';
import type { PoolClient } from 'pg';
import { establishmentLogger } from './establishmentLog';
import { assertValidSchemaName } from './establishmentTypes';

const MEMBERSHIP_TABLES = [
  'user_permissions',
  'user_establishment_memberships',
] as const;

const ADMIN_SPACE_TABLES = [
  'staff_planning_ics_tokens',
  'staff_shifts',
  'reservations',
  'inbox_attachments',
  'inbox_messages',
  'admin_document_expiry_reminders',
  'admin_documents',
] as const;

const PRINTING_TABLES = [
  'printing_jobs',
  'product_kitchen_printers',
  'kitchen_printers',
  'kitchen_ticket_day_counters',
] as const;

const CATALOG_TABLES = [
  'product_option_group_products',
  'product_option_choices',
  'product_option_groups',
  'order_item_options',
] as const;

const FISCAL_TABLES = [
  'archive_exports',
  'closure_bulletins',
  'legal_invoice_counters',
  'legal_invoices',
  'order_items',
  'orders',
  'legal_journal',
  'audit_trail',
] as const;

const SETTINGS_TABLES = [
  'business_settings',
  'establishment_settings',
  'closure_settings',
  'user_invitations',
  'establishment_setup_progress',
  'establishment_setup_steps',
  'establishment_status_transitions',
  'products',
  'categories',
] as const;

async function deleteIfExists(client: PoolClient, table: string, establishmentId: string): Promise<void> {
  const check = await client.query<{ ok: boolean }>(
    `SELECT EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = $1
               AND column_name = 'establishment_id'
           ) AS ok`,
    [table]
  );
  if (!check.rows[0]?.ok) return;
  // Whitelisted identifiers only (never interpolate user input).
  await client.query(`DELETE FROM ${table} WHERE establishment_id = $1`, [establishmentId]);
}

async function deleteTables(
  client: PoolClient,
  tables: readonly string[],
  establishmentId: string
): Promise<void> {
  for (const table of tables) {
    await deleteIfExists(client, table, establishmentId);
  }
}

/**
 * Delete establishment.
 *
 * Phase B1: no schema-per-tenant cleanup. Tenant data lives in shared tables and is removed
 * by deleting (or detaching) establishment-scoped rows via FK cleanup / cascades.
 * RESTRICT FKs (legal_journal, orders, audit_trail, …) must be cleared explicitly.
 */
export async function deleteEstablishment(id: string): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const establishmentResult = await client.query(
      'SELECT * FROM establishments WHERE id = $1',
      [id]
    );

    const establishment = establishmentResult.rows[0];
    if (!establishment) {
      throw new Error('Establishment not found');
    }
    // Keep legacy schema_name only as metadata; no per-tenant schema is dropped.
    if (establishment.schema_name) {
      assertValidSchemaName(establishment.schema_name);
    }

    await deleteTables(client, MEMBERSHIP_TABLES, id);
    await deleteTables(client, ADMIN_SPACE_TABLES, id);
    await deleteTables(client, PRINTING_TABLES, id);
    await deleteTables(client, CATALOG_TABLES, id);

    // Fiscal / operational RESTRICT + immutable tables — disable user triggers for teardown.
    await client.query(`SET LOCAL session_replication_role = 'replica'`);
    await deleteTables(client, FISCAL_TABLES, id);
    await client.query(`SET LOCAL session_replication_role = 'origin'`);

    await deleteTables(client, SETTINGS_TABLES, id);

    await client.query(
      'UPDATE users SET establishment_id = NULL WHERE establishment_id = $1',
      [id]
    );

    await client.query('DELETE FROM establishments WHERE id = $1', [id]);

    await client.query('COMMIT');

    establishmentLogger()?.info(
      'Establishment deleted successfully',
      { establishmentId: id, schemaName: establishment.schema_name },
      'ESTABLISHMENT_MODEL'
    );
  } catch (error) {
    await client.query('ROLLBACK');

    establishmentLogger()?.error(
      'Failed to delete establishment',
      {
        error: error as Error,
        message: error instanceof Error ? error.message : String(error),
        establishmentId: id
      },
      'ESTABLISHMENT_MODEL'
    );

    throw error;
  } finally {
    client.release();
  }
}
