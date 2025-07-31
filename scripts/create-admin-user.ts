#!/usr/bin/env ts-node

/**
 * Create Admin User Script
 * Creates a system administrator user with proper password hashing
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mosehxl_development',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function createAdminUser() {
  try {
    console.log('🔧 Creating system administrator user...');
    
    const email = 'admin@musebar.com';
    const password = 'admin123';
    const firstName = 'System';
    const lastName = 'Administrator';
    const role = 'system_admin';
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user
    const result = await pool.query(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        is_admin, 
        email_verified, 
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, first_name, last_name, role
    `, [
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      true, // is_admin
      true, // email_verified
      true  // is_active
    ]);
    
    const user = result.rows[0];
    
    console.log('✅ System administrator created successfully!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${user.first_name} ${user.last_name}`);
    console.log(`🎭 Role: ${user.role}`);
    console.log('');
    console.log('⚠️  Please change the default password after first login');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser().catch(console.error); 