import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const email = 'elliot.vergne@gmail.com';
const password = 'Vergemolle22@';
const isAdmin = true;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'musebar',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function createAdminUser() {
  try {
    const hash = await bcrypt.hash(password, 12);
    // Insert user if not exists
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, is_admin)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET is_admin = EXCLUDED.is_admin
       RETURNING id`,
      [email, hash, isAdmin]
    );
    const userId = userRes.rows[0].id;
    console.log(`Admin user created/updated with id: ${userId}`);
    // Grant all permissions
    const permRes = await pool.query('SELECT id FROM permissions');
    for (const row of permRes.rows) {
      await pool.query(
        'INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, row.id]
      );
    }
    console.log('All permissions granted to admin user.');
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await pool.end();
  }
}

createAdminUser(); 