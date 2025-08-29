/**
 * Settings Component
 * REFACTORED: This component has been modularized into smaller, focused modules.
 * The original 486-line monolithic component has been broken down into:
 * - SettingsTabs.tsx (Tab navigation)
 * - GeneralSettings.tsx (General settings)
 * - BusinessSettings.tsx (Business info)
 * - PaymentSettings.tsx (Payment methods)
 * - ClosureSettings.tsx (Closure configuration)
 * - PrinterSettings.tsx (Printer management)
 * - useSettings.ts (Settings state management)
 * - SettingsContainer.tsx (Main orchestrator)
 * - types.ts (Type definitions)
 */

// Re-export the modular settings system for backward compatibility
export {
  SettingsContainer as Settings,
  SettingsTabs,
  GeneralSettings,
  BusinessSettings,
  PaymentSettings,
  ClosureSettings,
  PrinterSettings,
  useSettings,
  // Types
  type SettingsProps,
  type GeneralSettingsType,
  type BusinessInfo,
  type PaymentSettingsType,
  type ClosureSettingsType,
} from './Settings/index';

// Default export for backward compatibility
export { default } from './Settings/index';