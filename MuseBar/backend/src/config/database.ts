/**
 * Database Connection Manager
 * Re-exports modular database components for backward compatibility
 */

// Re-export all components from the modular database package
export { 
  DatabaseManager,
  DatabasePool,
  DatabaseStatsManager,
  DatabaseHealthMonitor,
  getDatabaseHealth
} from './database';

// Re-export types for backward compatibility
export type {
  DatabaseStats,
  TransactionCallback,
  DatabaseHealthCheck,
  DatabaseInfo
} from './database/types';

// Default export for backward compatibility
export { DatabaseManager as default } from './database'; 