/**
 * Database Module Entry Point
 * Exports all database components and maintains backward compatibility
 */

export { DatabaseManager } from './DatabaseManager';
export { DatabasePool } from './DatabasePool';
export { DatabaseStatsManager } from './DatabaseStats';
export { DatabaseHealthMonitor } from './DatabaseHealthMonitor';
export * from './types';

// Backward compatibility - export the main manager as default
export { DatabaseManager as default } from './DatabaseManager';

// Helper function for health checks (backward compatibility)
export const getDatabaseHealth = (db: DatabaseManager) => {
  return db.getHealthStatus();
};
