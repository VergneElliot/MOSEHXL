/**
 * Legal Journal Model
 * French legal compliance system for POS transactions
 * 
 * REFACTORED: This file has been modularized into smaller, focused modules.
 * The original 785-line monolithic file has been broken down into:
 * - types.ts (Type definitions)
 * - journalSigning.ts (Cryptographic functions and integrity verification)
 * - journalQueries.ts (Database operations)
 * - journalOperations.ts (Core CRUD operations)
 * - closureOperations.ts (Closure bulletin generation)
 * - index.ts (Main orchestrator and legacy compatibility)
 */

// Export everything from the modular structure
export * from './legalJournal/index';

// Default export for backward compatibility
export { default } from './legalJournal/index';