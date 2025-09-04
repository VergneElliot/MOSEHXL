/**
 * Database Utilities - Clean Exports
 * Provides shared database operations to eliminate query duplication
 */

// Shared query utilities
export {
  UserQueries,
  EstablishmentQueries,
  InvitationQueries
} from './sharedQueries';

// Default export for convenience
export { UserQueries as default } from './sharedQueries';
