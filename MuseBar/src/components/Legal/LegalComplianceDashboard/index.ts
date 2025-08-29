/**
 * Legal Compliance Dashboard Module - Clean Exports
 * Provides a modular legal compliance system
 */

// Core components
export { ComplianceOverview } from './ComplianceOverview';
export { ComplianceAlerts } from './ComplianceAlerts';
export { ComplianceReports } from './ComplianceReports';

// Hook
export { useCompliance } from './useCompliance';

// Types
export type {
  ComplianceStatus,
  JournalEntry,
  ClosureBulletin,
  ComplianceState,
  ComplianceOverviewProps,
  ComplianceAlertsProps,
  ComplianceReportsProps,
  UseComplianceReturn,
  ComplianceMetrics,
  CompliancePillar,
} from './types';

// Main container component
export { LegalComplianceDashboardContainer } from './LegalComplianceDashboardContainer';

// Default export for backward compatibility
export { LegalComplianceDashboardContainer as default } from './LegalComplianceDashboardContainer';

