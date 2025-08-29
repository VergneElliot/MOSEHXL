/**
 * User Invitation Service
 * Professional invitation system for establishments and users
 * 
 * REFACTORED: This file has been modularized into smaller, focused modules.
 * The original 612-line monolithic service has been broken down into:
 * - types.ts (Type definitions)
 * - invitationValidator.ts (Validation logic)
 * - invitationCreator.ts (Creation and database operations)
 * - invitationEmail.ts (Email sending functionality)
 * - invitationAcceptance.ts (Acceptance flow logic)
 * - index.ts (Main orchestrator and legacy compatibility)
 */

// Export everything from the modular structure
export * from './userInvitation';

// Default export for backward compatibility
export { default } from './userInvitation';