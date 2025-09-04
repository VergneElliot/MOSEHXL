/**
 * Database Connection Manager
 * Re-exports modular database components for backward compatibility
 */

// Re-export all components from the modular database package
export { DatabaseManager } from './database/DatabaseManager';
export { DatabasePool } from './database/DatabasePool';
export { DatabaseStatsManager } from './database/DatabaseStats';
export { DatabaseHealthMonitor } from './database/DatabaseHealthMonitor';

// Re-export types for backward compatibility
export type {
  DatabaseStats,
  TransactionCallback,
  DatabaseHealthCheck,
  DatabaseInfo
} from './database/types';

// Import the type for the function
import { DatabaseManager } from './database/DatabaseManager';

// Helper function for health checks (backward compatibility)
export const getDatabaseHealth = (db: DatabaseManager) => {
  return db.getHealthStatus();
};

// Default export for backward compatibility
export { DatabaseManager as default } from './database/DatabaseManager'; 