/**
 * Settings Module - Clean Exports
 * Provides a modular settings system with focused components
 */

// Core components
export { SettingsTabs } from './SettingsTabs';
export { GeneralSettings } from './GeneralSettings';
export { BusinessSettings } from './BusinessSettings';
export { PaymentSettings } from './PaymentSettings';
export { ClosureSettings } from './ClosureSettings';
export { PrinterSettings } from './PrinterSettings';

// Hook
export { useSettings } from './useSettings';

// Types
export type {
  ClosureSettings as ClosureSettingsType,
  SchedulerStatus,
  SchedulerStatusResponse,
  GeneralSettings as GeneralSettingsType,
  BusinessInfo,
  PaymentSettings as PaymentSettingsType,
  PrinterSettings as PrinterSettingsType,
  SettingsState,
  SettingsProps,
  GeneralSettingsProps,
  BusinessSettingsProps,
  PaymentSettingsProps,
  ClosureSettingsProps,
  UseSettingsReturn,
  SettingsTab,
} from './types';

// Main container component
export { SettingsContainer } from './SettingsContainer';

// Default export for backward compatibility
export { SettingsContainer as default } from './SettingsContainer';

