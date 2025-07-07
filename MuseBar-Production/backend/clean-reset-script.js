#!/usr/bin/env node

const { Pool } = require('pg');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'musebar',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Generate hash exactly like LegalJournalModel
function generateHash(data, previousHash) {
  const content = `${previousHash}|${data}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function cleanReset() {
  const client = await pool.connect();
  
  try {
    console.log('🚨 STARTING PRODUCTION CLEAN RESET');
    
    // Step 1: Preserve admin user
    console.log('📋 Step 1: Preserving admin user...');
    const adminBackup = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['elliot.vergne@gmail.com']
    );
    
    if (adminBackup.rows.length === 0) {
      throw new Error('Admin user not found - cannot proceed with reset');
    }
    
    const adminUser = adminBackup.rows[0];
    console.log(`✅ Admin user found: ${adminUser.email}`);
    
    // Step 2: Temporarily disable triggers
    console.log('📋 Step 2: Disabling legal protection triggers...');
    await client.query('DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal');
    await client.query('DROP TRIGGER IF EXISTS trigger_prevent_closed_bulletin_modification ON closure_bulletins');
    console.log('✅ Triggers disabled');
    
    // Step 3: Clean all transactional data
    console.log('📋 Step 3: Cleaning transactional data...');
    
    await client.query('DELETE FROM audit_trail');
    await client.query('ALTER SEQUENCE audit_trail_id_seq RESTART WITH 1');
    console.log('  - Audit trail cleared');
    
    await client.query('DELETE FROM legal_journal');
    await client.query('ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1');
    console.log('  - Legal journal cleared');
    
    await client.query('DELETE FROM closure_bulletins');
    await client.query('ALTER SEQUENCE closure_bulletins_id_seq RESTART WITH 1');
    console.log('  - Closure bulletins cleared');
    
    try {
      await client.query('DELETE FROM archive_exports');
      await client.query('ALTER SEQUENCE archive_exports_id_seq RESTART WITH 1');
      console.log('  - Archive exports cleared');
    } catch (e) {
      console.log('  - Archive exports table not found (ok)');
    }
    
    await client.query('DELETE FROM sub_bills');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('ALTER SEQUENCE orders_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE order_items_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE sub_bills_id_seq RESTART WITH 1');
    console.log('  - Orders and related data cleared');
    
    // Clear all users except admin
    await client.query('DELETE FROM users WHERE email != $1', ['elliot.vergne@gmail.com']);
    console.log('  - All users except admin cleared');
    
    // Step 4: Initialize clean legal journal
    console.log('📋 Step 4: Initializing clean legal journal...');
    const initTimestamp = new Date();
    const registerKey = 'MUSEBAR-REG-001';
    const sequenceNumber = 1;
    const transactionType = 'ARCHIVE';
    const orderId = null;
    const amount = 0.00;
    const vatAmount = 0.00;
    const paymentMethod = 'SYSTEM';
    const previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    
    // Create data string exactly like LegalJournalModel - handle null properly
    const dataString = `${sequenceNumber}|${transactionType}|${orderId}|${amount}|${vatAmount}|${paymentMethod}|${initTimestamp.toISOString()}|${registerKey}`;
    const currentHash = generateHash(dataString, previousHash);
    
    console.log(`  - Data string: ${dataString}`);
    console.log(`  - Previous hash: ${previousHash}`);
    console.log(`  - Current hash: ${currentHash}`);
    
    await client.query(`
      INSERT INTO legal_journal (
        sequence_number, transaction_type, order_id, amount, vat_amount, 
        payment_method, transaction_data, previous_hash, current_hash,
        timestamp, user_id, register_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      sequenceNumber, transactionType, orderId, amount, vatAmount, paymentMethod,
      JSON.stringify({
        type: 'SYSTEM_INIT',
        message: 'Legal journal initialized for production',
        compliance: 'Article 286-I-3 bis du CGI',
        environment: 'PRODUCTION',
        admin_preserved: true,
        reset_timestamp: initTimestamp
      }),
      previousHash, currentHash, initTimestamp, adminUser.id.toString(), registerKey
    ]);
    console.log('✅ Legal journal initialized with clean entry');
    
    // Step 5: Restore legal protection triggers
    console.log('📋 Step 5: Restoring legal protection triggers...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_legal_journal_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_prevent_legal_journal_modification
      BEFORE UPDATE OR DELETE ON legal_journal
      FOR EACH ROW
      EXECUTE FUNCTION prevent_legal_journal_modification()
    `);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_closed_bulletin_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND OLD.is_closed = TRUE THEN
          RAISE EXCEPTION 'Modification of closed closure bulletin is forbidden for legal compliance';
        END IF;
        IF TG_OP = 'DELETE' AND OLD.is_closed = TRUE THEN
          RAISE EXCEPTION 'Deletion of closed closure bulletin is forbidden for legal compliance';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_prevent_closed_bulletin_modification
      BEFORE UPDATE OR DELETE ON closure_bulletins
      FOR EACH ROW
      EXECUTE FUNCTION prevent_closed_bulletin_modification()
    `);
    console.log('✅ Legal protection triggers restored');
    
    // Step 6: Create closure settings table
    console.log('📋 Step 6: Setting up closure configuration...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS closure_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_by VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default settings
    const defaultSettings = [
      ['daily_closure_time', '02:00', 'Time when daily closure is automatically triggered (HH:MM format)', 'SYSTEM'],
      ['auto_closure_enabled', 'true', 'Whether automatic daily closure is enabled', 'SYSTEM'],
      ['timezone', 'Europe/Paris', 'Timezone for closure calculations', 'SYSTEM'],
      ['closure_grace_period_minutes', '30', 'Grace period in minutes before auto-closure', 'SYSTEM']
    ];
    
    for (const [key, value, description, updatedBy] of defaultSettings) {
      await client.query(`
        INSERT INTO closure_settings (setting_key, setting_value, description, updated_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (setting_key) DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP
      `, [key, value, description, updatedBy]);
    }
    console.log('✅ Closure settings configured');
    
    // Final verification
    console.log('📋 Final verification...');
    const finalStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM legal_journal) as legal_journal_entries,
        (SELECT COUNT(*) FROM closure_bulletins) as closure_bulletins,
        (SELECT COUNT(*) FROM audit_trail) as audit_entries,
        (SELECT email FROM users WHERE email = 'elliot.vergne@gmail.com') as admin_preserved
    `);
    
    const stats = finalStats.rows[0];
    
    console.log('\n🎉 PRODUCTION CLEAN RESET COMPLETED SUCCESSFULLY!');
    console.log('==========================================');
    console.log(`📊 Final Statistics:`);
    console.log(`   Users: ${stats.total_users}`);
    console.log(`   Orders: ${stats.total_orders}`);
    console.log(`   Legal Journal Entries: ${stats.legal_journal_entries}`);
    console.log(`   Closure Bulletins: ${stats.closure_bulletins}`);
    console.log(`   Audit Trail Entries: ${stats.audit_entries}`);
    console.log(`   Admin Preserved: ${stats.admin_preserved}`);
    console.log('==========================================');
    console.log('🔒 Legal compliance restored per Article 286-I-3 bis du CGI');
    console.log('✨ System is ready for production use!');
    
  } catch (error) {
    console.error('❌ PRODUCTION CLEAN RESET FAILED:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the clean reset
cleanReset()
  .then(() => {
    console.log('\n✅ Clean reset completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Clean reset failed:', error);
    process.exit(1);
  }); 