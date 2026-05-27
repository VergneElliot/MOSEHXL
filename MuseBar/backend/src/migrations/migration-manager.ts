import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/* eslint-disable no-console */

export interface Migration {
  id: string;
  name: string;
  up: string;
  down: string;
  up_checksum: string;
  executed_at?: Date;
}

interface ExecutedMigrationRow {
  id: string;
  name: string;
  up_checksum: string | null;
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
        up_checksum VARCHAR(64),
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const addChecksumColumnQuery = `
      ALTER TABLE migrations
      ADD COLUMN IF NOT EXISTS up_checksum VARCHAR(64);
    `;

    try {
      await this.pool.query(createTableQuery);
      await this.pool.query(addChecksumColumnQuery);
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

    const id = match[1];
    const name = match[2];
    if (!id || !name) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }
    
    // Split content into up and down migrations
    const sections = content.split('-- DOWN');
    if (sections.length !== 2) {
      throw new Error(`Migration ${filename} must contain -- UP and -- DOWN sections`);
    }

    const upSection = sections[0];
    const downSection = sections[1];
    if (!upSection || !downSection) {
      throw new Error(`Migration ${filename} must contain both -- UP and -- DOWN sections`);
    }
    const up = upSection.replace('-- UP', '').trim();
    const down = downSection.trim();
    const up_checksum = crypto.createHash('sha256').update(up, 'utf8').digest('hex');

    return {
      id,
      name: name.replace(/_/g, ' '),
      up,
      down,
      up_checksum
    };
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<ExecutedMigrationRow[]> {
    try {
      const result = await this.pool.query(
        'SELECT id, name, up_checksum, executed_at FROM migrations ORDER BY executed_at'
      );
      return result.rows as ExecutedMigrationRow[];
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
        'INSERT INTO migrations (id, name, up_checksum) VALUES ($1, $2, $3)',
        [migration.id, migration.name, migration.up_checksum]
      );
    } catch (error) {
      console.error('❌ Failed to mark migration as executed:', error);
      throw error;
    }
  }

  /**
   * Persist checksum for executed migrations missing checksum metadata (one-time baseline).
   */
  private async updateMigrationChecksum(migrationId: string, checksum: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE migrations SET up_checksum = $2 WHERE id = $1',
        [migrationId, checksum]
      );
    } catch (error) {
      console.error('❌ Failed to update migration checksum:', error);
      throw error;
    }
  }

  /**
   * Verify applied migrations still match current migration files.
   */
  private async verifyExecutedMigrationChecksums(
    allMigrations: Migration[],
    executedMigrations: ExecutedMigrationRow[]
  ): Promise<void> {
    const fileById = new Map(allMigrations.map(migration => [migration.id, migration]));
    for (const executed of executedMigrations) {
      const fileMigration = fileById.get(executed.id);
      if (!fileMigration) continue;

      if (!executed.up_checksum) {
        await this.updateMigrationChecksum(executed.id, fileMigration.up_checksum);
        console.log(
          `ℹ️  Baseline checksum stored for migration ${executed.id}`
        );
        continue;
      }

      if (executed.up_checksum !== fileMigration.up_checksum) {
        throw new Error(
          `Migration checksum mismatch for ${executed.id}. ` +
            `Applied checksum=${executed.up_checksum}, file checksum=${fileMigration.up_checksum}. ` +
            'Do not edit already-applied migration files.'
        );
      }
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
      const allMigrations = files.map(file => this.parseMigrationFile(file));
      const executedMigrations = await this.getExecutedMigrations();
      const executedIds = new Set(executedMigrations.map(migration => migration.id));

      await this.verifyExecutedMigrationChecksums(allMigrations, executedMigrations);
      
      const pendingMigrations = allMigrations
        .filter(migration => !executedIds.has(migration.id));

      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }

      console.log(`📦 Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        console.log(`🔄 Running migration: ${migration.name} (${migration.id})`);
        
        try {
          await this.pool.query('BEGIN');
          await this.pool.query("SELECT set_config('app.bypass_rls', 'on', true)");
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
      const executedIds = executedMigrations.map(migration => migration.id);
      
      if (executedIds.length === 0) {
        console.log('✅ No migrations to rollback');
        return;
      }

      const lastMigrationId = executedIds[executedIds.length - 1];
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
        await this.pool.query("SELECT set_config('app.bypass_rls', 'on', true)");
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
      const executedIds = new Set(executedMigrations.map(migration => migration.id));
      
      const allMigrations = files.map(file => this.parseMigrationFile(file));
      const byId = new Map(allMigrations.map(migration => [migration.id, migration]));
      
      for (const migration of allMigrations) {
        const isExecuted = executedIds.has(migration.id);
        const executed = executedMigrations.find(row => row.id === migration.id);
        const hasDrift = isExecuted && Boolean(executed?.up_checksum) && executed?.up_checksum !== migration.up_checksum;
        const status = hasDrift ? '⚠️  DRIFT' : isExecuted ? '✅ EXECUTED' : '⏳ PENDING';
        const checksumSummary = isExecuted ? ` (sha256:${migration.up_checksum.slice(0, 12)})` : '';
        console.log(`${status} ${migration.id} - ${migration.name}${checksumSummary}`);
      }

      const pendingCount = allMigrations.filter(m => !executedIds.has(m.id)).length;
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