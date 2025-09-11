/**
 * Create Test Admin User Script
 * Creates a test admin user with known credentials for testing
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';

async function createTestAdmin() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mosehxl_development',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    const client = await pool.connect();
    
    // Check if test admin already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['testadmin@mosehxl.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Test admin user already exists');
      return;
    }

    // Create test admin user
    const password = 'testadmin123';
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, role`,
      [
        'testadmin@mosehxl.com',
        passwordHash,
        'system_admin',
        'Test',
        'Admin',
        true
      ]
    );

    console.log('✅ Test admin user created successfully:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log(`   Password: ${password}`);

    client.release();
  } catch (error) {
    console.error('❌ Error creating test admin:', error);
  } finally {
    await pool.end();
  }
}

createTestAdmin();
