/**
 * Thermal Print Module - Clean Exports
 * UPDATED: Provides a modular thermal printing system with specialized queue modules
 * Maintains backward compatibility while providing access to focused modules
 */

// Core classes
export { PrintCommands, PrintCommandBuilder } from './printCommands';
export { PrintFormatters } from './printFormatters';
export { PrintTemplates } from './printTemplates';
export { PrintQueue } from './printQueue';

// Specialized queue modules
export { QueueStorage } from './queueStorage';
export { QueueProcessor } from './queueProcessor';
export { PrintOperations } from './printOperations';

// Types
export type {
  ReceiptData,
  ClosureBulletinData,
  PrintJob,
  PrinterConfig,
  PrinterStatus,
  PrintQueueStats,
  FormattedContent,
  PaymentMethod,
  ClosureType,
  ReceiptType,
} from './types';

// Main service class
export { ThermalPrintService } from './ThermalPrintService';

// Default export for backward compatibility
export { ThermalPrintService as default } from './ThermalPrintService';

