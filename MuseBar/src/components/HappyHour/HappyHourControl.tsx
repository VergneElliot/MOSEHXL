/**
 * Happy Hour Control Component
 * REFACTORED: This component has been modularized into smaller, focused modules.
 * The original 470-line monolithic component has been broken down into:
 * - HappyHourStatus.tsx (Current status display)
 * - HappyHourForm.tsx (Configuration form)
 * - HappyHourSchedule.tsx (Schedule display)
 * - useHappyHour.ts (State and logic)
 * - HappyHourControlContainer.tsx (Main orchestrator)
 * - types.ts (Type definitions)
 */

// Re-export the modular happy hour system for backward compatibility
export {
  HappyHourControlContainer as HappyHourControl,
  HappyHourStatus,
  HappyHourForm,
  HappyHourSchedule,
  useHappyHour,
  // Types
  type HappyHourControlProps,
  type HappyHourSettings,
  type HappyHourState,
} from './HappyHourControl/index';

// Default export for backward compatibility
export { default } from './HappyHourControl/index';