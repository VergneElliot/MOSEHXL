/**
 * Legal Compliance Dashboard Component
 * REFACTORED: This component has been modularized into smaller, focused modules.
 * The original 451-line monolithic component has been broken down into:
 * - ComplianceOverview.tsx (Overview cards)
 * - ComplianceAlerts.tsx (Alert system)
 * - ComplianceReports.tsx (Report generation)
 * - useCompliance.ts (Compliance logic)
 * - LegalComplianceDashboardContainer.tsx (Main orchestrator)
 * - types.ts (Type definitions)
 */

// Re-export the modular compliance system for backward compatibility
export {
  LegalComplianceDashboardContainer as LegalComplianceDashboard,
  ComplianceOverview,
  ComplianceAlerts,
  ComplianceReports,
  useCompliance,
  // Types
  type ComplianceStatus,
  type JournalEntry,
  type ClosureBulletin,
  type ComplianceState,
} from './LegalComplianceDashboard/index';

// Default export for backward compatibility
export { default } from './LegalComplianceDashboard/index';