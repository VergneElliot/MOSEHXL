#!/usr/bin/env node

/* eslint-disable no-console */

import { Pool } from 'pg';
import { MigrationManager } from './migration-manager';
import dotenv from 'dotenv';
import { getEnvironmentConfig } from '../config/environment';

// Load environment variables
dotenv.config();

const config = getEnvironmentConfig();

const pool = new Pool({
  user: config.database.user,
  host: config.database.host,
  database: config.database.database,
  password: config.database.password,
  port: config.database.port,
  ssl: config.database.ssl ? { rejectUnauthorized: config.database.sslRejectUnauthorized } : false,
});

const migrationManager = new MigrationManager(pool);

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'migrate':
        await migrationManager.migrate();
        break;

      case 'rollback':
        await migrationManager.rollback();
        break;

      case 'status':
        await migrationManager.status();
        break;

      case 'create':
        if (args.length === 0) {
          console.error('❌ Migration name is required');
          console.log('Usage: npm run migration:create <migration-name>');
          process.exit(1);
        }
        migrationManager.createMigration(args[0]);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error('❌ Unknown command:', command);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration command failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function showHelp() {
  console.log(`
🔄 MuseBar Database Migration CLI

Usage: npm run migration:<command> [options]

Commands:
  migrate              Run all pending migrations
  rollback             Rollback the last migration
  status               Show migration status
  create <name>        Create a new migration file
  help                 Show this help message

Examples:
  npm run migration:migrate
  npm run migration:rollback
  npm run migration:status
  npm run migration:create add_user_table

Environment Variables:
  DB_USER              Database user (default: postgres)
  DB_HOST              Database host (default: localhost)
  DB_NAME              Database name (default: mosehxl_production)
  DB_PASSWORD          Database password (default: password)
  DB_PORT              Database port (default: 5432)
`);
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration process interrupted');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Migration process terminated');
  await pool.end();
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI failed:', error);
    process.exit(1);
  });
} 