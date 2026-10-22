/**
 * Settings Module - Clean Exports
 * Provides a modular settings system with focused components
 */

// Core components
export { SettingsTabs } from './SettingsTabs';
export { ClosureSettings } from './ClosureSettings';

// Hook
export { useSettings } from './useSettings';

// Types
export type {
  ClosureSettings as ClosureSettingsType,
  SchedulerStatus,
  SchedulerStatusResponse,
  BusinessInfo,
  SettingsState,
  SettingsProps,
  BusinessSettingsProps,
  ClosureSettingsProps,
  UseSettingsReturn,
  SettingsTab,
} from './types';

// Main container component
export { SettingsContainer } from './SettingsContainer';

// Default export for backward compatibility
export { SettingsContainer as default } from './SettingsContainer';

