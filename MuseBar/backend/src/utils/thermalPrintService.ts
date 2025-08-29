/**
 * Thermal Print Service
 * REFACTORED: This service has been modularized into smaller, focused modules.
 * The original 611-line monolithic service has been broken down into:
 * - printCommands.ts (ESC/POS commands)
 * - printFormatters.ts (Format helpers)  
 * - printTemplates.ts (Receipt templates)
 * - printQueue.ts (Queue management)
 * - ThermalPrintService.ts (Main orchestrator)
 * - types.ts (Type definitions)
 */

// Re-export the modular thermal printing system for backward compatibility
export {
  ThermalPrintService,
  PrintCommands,
  PrintFormatters,
  PrintTemplates,
  PrintQueue,
  // Types
  type ReceiptData,
  type ClosureBulletinData,
  type PrintJob,
  type PrinterConfig,
  type PrinterStatus,
  type PrintQueueStats,
} from './thermalPrint/index';

// Default export for backward compatibility
export { default } from './thermalPrint/index';