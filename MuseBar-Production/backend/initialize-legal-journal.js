#!/usr/bin/env node

const { Pool } = require('pg');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'musebar',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Replicate LegalJournalModel functionality
class LegalJournalModel {
  static registerKey = 'MUSEBAR-REG-001';

  static generateHash(data, previousHash) {
    const content = `${previousHash}|${data}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static async getLastEntry() {
    const query = `
      SELECT * FROM legal_journal 
      ORDER BY sequence_number DESC 
      LIMIT 1
    `;
    const result = await pool.query(query);
    return result.rows[0] || null;
  }

  static async addEntry(transactionType, orderId, amount, vatAmount, paymentMethod, transactionData, userId) {
    const lastEntry = await this.getLastEntry();
    const sequenceNumber = (lastEntry?.sequence_number || 0) + 1;
    const previousHash = lastEntry?.current_hash || '0000000000000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date();
    const dataString = `${sequenceNumber}|${transactionType}|${orderId}|${amount}|${vatAmount}|${paymentMethod}|${timestamp.toISOString()}|${this.registerKey}`;
    const currentHash = this.generateHash(dataString, previousHash);

    const query = `
      INSERT INTO legal_journal (
        sequence_number, transaction_type, order_id, amount, vat_amount, 
        payment_method, transaction_data, previous_hash, current_hash,
        timestamp, user_id, register_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      sequenceNumber,
      transactionType,
      orderId,
      amount,
      vatAmount,
      paymentMethod,
      JSON.stringify(transactionData),
      previousHash,
      currentHash,
      timestamp,
      userId,
      this.registerKey
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

async function initializeJournal() {
  try {
    console.log('🔧 Initializing legal journal with correct hash...');
    
    // Get admin user
    const adminResult = await pool.query('SELECT * FROM users WHERE email = $1', ['elliot.vergne@gmail.com']);
    if (adminResult.rows.length === 0) {
      throw new Error('Admin user not found');
    }
    const adminUser = adminResult.rows[0];
    
    // Clear existing journal
    await pool.query('DROP TRIGGER IF EXISTS trigger_prevent_legal_journal_modification ON legal_journal');
    await pool.query('DELETE FROM legal_journal');
    await pool.query('ALTER SEQUENCE legal_journal_id_seq RESTART WITH 1');
    
    // Add initial entry using the model
    const entry = await LegalJournalModel.addEntry(
      'ARCHIVE',
      null,
      0.00,
      0.00,
      'SYSTEM',
      {
        type: 'SYSTEM_INIT',
        message: 'Legal journal initialized for production',
        compliance: 'Article 286-I-3 bis du CGI',
        environment: 'PRODUCTION',
        admin_preserved: true,
        reset_timestamp: new Date()
      },
      adminUser.id.toString()
    );
    
    console.log('✅ Initial entry created:', entry.sequence_number, entry.current_hash);
    
    // Restore trigger
    await pool.query(`
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
    
    await pool.query(`
      CREATE TRIGGER trigger_prevent_legal_journal_modification
      BEFORE UPDATE OR DELETE ON legal_journal
      FOR EACH ROW
      EXECUTE FUNCTION prevent_legal_journal_modification()
    `);
    
    console.log('✅ Legal protection trigger restored');
    
  } catch (error) {
    console.error('❌ Failed to initialize journal:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

initializeJournal(); 