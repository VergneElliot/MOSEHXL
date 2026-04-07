import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/* eslint-disable no-console */

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  executed_at?: Date;
}

export class MigrationManager {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath: string = path.join(__dirname, 'files')) {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize the migrations table
   */
  async initialize(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log('✅ Migrations table initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migrations table:', error);
      throw error;
    }
  }

  /**
   * Get all migration files from the migrations directory
   */
  private getMigrationFiles(): string[] {
    try {
      const files = fs.readdirSync(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Natural sort for proper order
    } catch (error) {
      console.error('❌ Failed to read migration files:', error);
      return [];
    }
  }

  /**
   * Parse migration file and extract metadata
   */
  private parseMigrationFile(filename: string): Migration {
    const filePath = path.join(this.migrationsPath, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract migration ID and name from filename
    const match = filename.match(/^(\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2})_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }

    const [, id, name] = match;
    
    // Split content into up and down migrations
    const sections = content.split('-- DOWN');
    if (sections.length !== 2) {
      throw new Error(`Migration ${filename} must contain -- UP and -- DOWN sections`);
    }

    const up = sections[0].replace('-- UP', '').trim();
    const down = sections[1].trim();

    return {
      id,
      name: name.replace(/_/g, ' '),
      up,
      down
    };
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query('SELECT id FROM migrations ORDER BY executed_at');
      return result.rows.map(row => row.id);
    } catch (error) {
      console.error('❌ Failed to get executed migrations:', error);
      return [];
    }
  }

  /**
   * Mark migration as executed
   */
  private async markMigrationExecuted(migration: Migration): Promise<void> {
    try {
      await this.pool.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      );
    } catch (error) {
      console.error('❌ Failed to mark migration as executed:', error);
      throw error;
    }
  }

  /**
   * Mark migration as not executed (for rollback)
   */
  private async markMigrationNotExecuted(migrationId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
    } catch (error) {
      console.error('❌ Failed to mark migration as not executed:', error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    console.log('🔄 Starting database migration...');

    try {
      await this.initialize();

      const files = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const pendingMigrations = files
        .map(file => this.parseMigrationFile(file))
        .filter(migration => !executedMigrations.includes(migration.id));

      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }

      console.log(`📦 Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        console.log(`🔄 Running migration: ${migration.name} (${migration.id})`);
        
        try {
          await this.pool.query('BEGIN');
          await this.pool.query(migration.up);
          await this.markMigrationExecuted(migration);
          await this.pool.query('COMMIT');
          
          console.log(`✅ Migration completed: ${migration.name}`);
        } catch (error) {
          await this.pool.query('ROLLBACK');
          console.error(`❌ Migration failed: ${migration.name}`, error);
          throw error;
        }
      }

      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    console.log('🔄 Starting database rollback...');

    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        console.log('✅ No migrations to rollback');
        return;
      }

      const lastMigrationId = executedMigrations[executedMigrations.length - 1];
      const files = this.getMigrationFiles();
      const migration = files
        .map(file => this.parseMigrationFile(file))
        .find(m => m.id === lastMigrationId);

      if (!migration) {
        console.log('⚠️  Migration file not found, skipping rollback');
        return;
      }

      console.log(`🔄 Rolling back migration: ${migration.name} (${migration.id})`);

      try {
        await this.pool.query('BEGIN');
        await this.pool.query(migration.down);
        await this.markMigrationNotExecuted(migration.id);
        await this.pool.query('COMMIT');
        
        console.log(`✅ Rollback completed: ${migration.name}`);
      } catch (error) {
        await this.pool.query('ROLLBACK');
        console.error(`❌ Rollback failed: ${migration.name}`, error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Rollback process failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async status(): Promise<void> {
    console.log('📊 Migration Status:');
    console.log('==================');

    try {
      const files = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const allMigrations = files.map(file => this.parseMigrationFile(file));
      
      for (const migration of allMigrations) {
        const isExecuted = executedMigrations.includes(migration.id);
        const status = isExecuted ? '✅ EXECUTED' : '⏳ PENDING';
        console.log(`${status} ${migration.id} - ${migration.name}`);
      }

      const pendingCount = allMigrations.filter(m => !executedMigrations.includes(m.id)).length;
      const executedCount = executedMigrations.length;

      console.log('\n📈 Summary:');
      console.log(`   Total migrations: ${allMigrations.length}`);
      console.log(`   Executed: ${executedCount}`);
      console.log(`   Pending: ${pendingCount}`);
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
    }
  }

  /**
   * Create a new migration file.
   * Filename must match parseMigrationFile regex: YYYY_MM_DD_HH_MM_SS_name.sql (audit #45).
   */
  createMigration(name: string): void {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${d.getUTCFullYear()}_${pad(d.getUTCMonth() + 1)}_${pad(d.getUTCDate())}_${pad(d.getUTCHours())}_${pad(d.getUTCMinutes())}_${pad(d.getUTCSeconds())}`;
    const filename = `${timestamp}_${name.replace(/\s+/g, '_')}.sql`;
    const filePath = path.join(this.migrationsPath, filename);

    const template = `-- UP
-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- DOWN
-- Add your rollback SQL here
-- Example:
-- DROP TABLE example;
`;

    try {
      if (!fs.existsSync(this.migrationsPath)) {
        fs.mkdirSync(this.migrationsPath, { recursive: true });
      }

      fs.writeFileSync(filePath, template);
      console.log(`✅ Created migration file: ${filename}`);
      console.log(`📝 Edit the file at: ${filePath}`);
    } catch (error) {
      console.error('❌ Failed to create migration file:', error);
      throw error;
    }
  }
} 