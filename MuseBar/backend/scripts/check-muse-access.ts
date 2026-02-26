#!/usr/bin/env node
/**
 * Diagnose and fix user–establishment links for Muse POS access.
 *
 * Run from backend directory:
 *   npx ts-node scripts/check-muse-access.ts           # diagnose only
 *   npx ts-node scripts/check-muse-access.ts --fix      # apply fix for Muse
 *
 * Requires .env with DB_* variables (same as the API).
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEFAULT_DB = NODE_ENV === 'development' ? 'mosehxl_development' : 'mosehxl_production';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || DEFAULT_DB,
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function main() {
  const doFix = process.argv.includes('--fix');

  console.log('\n=== MUSE POS ACCESS CHECK ===\n');
  console.log('Database:', process.env.DB_NAME || DEFAULT_DB);
  console.log('');

  try {
    // 1. Establishments
    const establishments = await pool.query(`
      SELECT id, name, email, subscription_status, created_at
      FROM establishments
      ORDER BY name
    `);
    console.log('--- ESTABLISHMENTS ---');
    if (establishments.rows.length === 0) {
      console.log('No establishments found. Create one (e.g. Muse) first.\n');
      await pool.end();
      return;
    }
    for (const row of establishments.rows) {
      console.log(`  ${row.id}  ${row.name}  (${row.email})  ${row.subscription_status || '-'}`);
    }

    const muse = establishments.rows.find(
      (r: any) => r.name && r.name.toLowerCase().includes('muse')
    );
    const museId = muse?.id as string | undefined;
    if (!museId) {
      console.log('\nNo establishment named "Muse" found. Cannot fix.\n');
      await pool.end();
      return;
    }
    console.log(`\n→ Muse establishment_id for fixes: ${museId}\n`);

    // 2. Users
    const users = await pool.query(`
      SELECT id, email, is_admin, role, establishment_id, first_name, last_name
      FROM users
      ORDER BY email, id
    `);
    console.log('--- USERS ---');
    for (const row of users.rows) {
      const role = row.role || '(null)';
      const est = row.establishment_id ? row.establishment_id : '(none)';
      const admin = row.is_admin ? ' [SYSTEM_ADMIN]' : '';
      console.log(`  ${row.id}  ${row.email}  role=${role}  establishment_id=${est}${admin}`);
    }

    // 3. Who can access Muse POS?
    console.log('\n--- MUSE POS ACCESS (need establishment_id = Muse and role = establishment_admin for full access) ---');
    const museUsers = users.rows.filter((r: any) => r.establishment_id === museId);
    if (museUsers.length === 0) {
      console.log('  No user has establishment_id pointing to Muse.');
    } else {
      museUsers.forEach((r: any) => {
        const canAdmin = r.role === 'establishment_admin' ? 'YES (admin)' : 'cashier';
        console.log(`  ${r.email}  → ${canAdmin}`);
      });
    }

    // 4. Emails of interest
    const targetEmails = [
      'elliotpokerpro@gmail.com',
      'hugo.martins.76000@gmail.com',
      'muse.rouen@gmail.com',
    ];
    const toFix: { email: string; id: number; current_establishment_id: string | null; current_role: string }[] = [];
    for (const email of targetEmails) {
      const u = users.rows.find((r: any) => r.email === email);
      if (!u) {
        console.log(`\n  User "${email}" not found in users table.`);
        continue;
      }
      // Only suggest fix if not linked to Muse at all (wrong or null establishment_id)
      if (u.establishment_id !== museId) {
        toFix.push({
          email: u.email,
          id: u.id,
          current_establishment_id: u.establishment_id,
          current_role: u.role || '',
        });
      }
    }

    if (toFix.length === 0 && museUsers.length > 0) {
      console.log('\n  At least one user is already linked to Muse. No change needed.');
      const admin = museUsers.find((r: any) => r.role === 'establishment_admin');
      if (admin) {
        console.log(`  → Log in with ${admin.email} to access Muse POS.`);
      }
      await pool.end();
      return;
    }

    if (toFix.length > 0) {
      console.log('\n--- SUGGESTED FIX ---');
      console.log('The following users are not linked to Muse (establishment_id is wrong or null). Linking them so you can access Muse POS:');
      toFix.forEach((u) => {
        console.log(`  - ${u.email} (id=${u.id})  current: establishment_id=${u.current_establishment_id}, role=${u.current_role}`);
      });
      const fixSql = `
-- Attach Muse admin (run in psql or run this script with --fix)
UPDATE users
SET establishment_id = '${museId}', role = 'establishment_admin', is_admin = false, updated_at = CURRENT_TIMESTAMP
WHERE email = 'elliotpokerpro@gmail.com';

-- Attach Hugo as cashier for Muse (optional; grant permissions via POS User Management after login)
UPDATE users
SET establishment_id = '${museId}', role = 'cashier', is_admin = false, updated_at = CURRENT_TIMESTAMP
WHERE email = 'hugo.martins.76000@gmail.com';
`;
      console.log(fixSql);

      if (doFix) {
        console.log('Applying fix (elliotpokerpro + hugo only)...');
        await pool.query(`
          UPDATE users
          SET establishment_id = $1, role = 'establishment_admin', is_admin = false, updated_at = CURRENT_TIMESTAMP
          WHERE email = 'elliotpokerpro@gmail.com'
        `, [museId]);
        await pool.query(`
          UPDATE users
          SET establishment_id = $1, role = 'cashier', is_admin = false, updated_at = CURRENT_TIMESTAMP
          WHERE email = 'hugo.martins.76000@gmail.com'
        `, [museId]);
        console.log('Done. Log in with elliotpokerpro@gmail.com to access Muse POS.');
      } else {
        console.log('Run with --fix to apply the updates above.');
      }
    }

    console.log('');
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
