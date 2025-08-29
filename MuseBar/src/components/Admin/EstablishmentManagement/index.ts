/**
 * Establishment Management Module Exports
 * Clean exports for all establishment management components and utilities
 */

// Main container component
export { default as EstablishmentManagementContainer } from './EstablishmentManagementContainer';

// Individual components
export { default as EstablishmentStats } from './EstablishmentStats';
export { default as EstablishmentTable } from './EstablishmentTable';
export { default as CreateEstablishmentDialog } from './CreateEstablishmentDialog';
export { default as InviteEstablishmentDialog } from './InviteEstablishmentDialog';

// Custom hook
export { useEstablishmentManagement } from './useEstablishmentManagement';

// Types
export type {
  Establishment,
  CreateEstablishmentData,
  InviteEstablishmentData,
  SnackbarState
} from './types';

// Default export for backward compatibility
export { default } from './EstablishmentManagementContainer';

