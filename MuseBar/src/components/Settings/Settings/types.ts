/**
 * Settings Types and Interfaces
 * Centralized type definitions for the settings system
 */

export interface ClosureSettings {
  auto_closure_enabled: boolean;
  daily_closure_time: string;
  timezone: string;
  grace_period_minutes: number;
}

export interface SchedulerStatus {
  is_running: boolean;
  has_interval: boolean;
  next_check: string;
}

export interface SchedulerStatusResponse {
  settings: ClosureSettings;
  scheduler: SchedulerStatus;
}

export interface GeneralSettings {
  barName: string;
  address: string;
  phone: string;
  email: string;
  taxIdentification: string;
  currency: string;
  language: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  taxIdentification: string;
}

export interface PaymentSettings {
  acceptCash: boolean;
  acceptCard: boolean;
  acceptChecks: boolean;
  taxRate: number;
  discountEnabled: boolean;
  maxDiscountPercent: number;
}

export interface PrinterSettings {
  enabled: boolean;
  printerName: string;
  printReceipts: boolean;
  printReports: boolean;
}

export interface SettingsState {
  generalSettings: GeneralSettings;
  businessInfo: BusinessInfo;
  closureSettings: ClosureSettings;
  paymentSettings: PaymentSettings;
  printerSettings: PrinterSettings;
  schedulerStatus: SchedulerStatus;
}

export interface SettingsProps {
  // Add any props if needed
}

export interface GeneralSettingsProps {
  settings: GeneralSettings;
  onUpdate: (settings: GeneralSettings) => void;
  loading?: boolean;
  onSave: () => Promise<void>;
}

export interface BusinessSettingsProps {
  businessInfo: BusinessInfo;
  onUpdate: (info: BusinessInfo) => void;
  loading?: boolean;
  onSave: () => Promise<void>;
  message?: string | null;
}

export interface PaymentSettingsProps {
  paymentSettings: PaymentSettings;
  onUpdate: (settings: PaymentSettings) => void;
  loading?: boolean;
  onSave: () => Promise<void>;
}

export interface ClosureSettingsProps {
  closureSettings: ClosureSettings;
  schedulerStatus: SchedulerStatus;
  onUpdate: (settings: ClosureSettings) => void;
  onSave: () => Promise<void>;
  onTriggerManualCheck: () => Promise<void>;
  loading?: boolean;
}

export interface UseSettingsReturn {
  state: SettingsState;
  loading: boolean;
  saving: boolean;
  infoSaving: boolean;
  infoMessage: string | null;
  updateGeneralSettings: (settings: GeneralSettings) => void;
  updateBusinessInfo: (info: BusinessInfo) => void;
  updateClosureSettings: (settings: ClosureSettings) => void;
  updatePaymentSettings: (settings: PaymentSettings) => void;
  saveGeneralSettings: () => Promise<void>;
  saveBusinessInfo: () => Promise<void>;
  saveClosureSettings: () => Promise<void>;
  savePaymentSettings: () => Promise<void>;
  triggerManualCheck: () => Promise<void>;
  testPrinter: () => Promise<void>;
  checkPrinterStatus: () => Promise<void>;
}

/**
 * Tab configuration
 */
export interface SettingsTab {
  id: string;
  label: string;
  icon: React.ReactElement;
  component: React.ReactNode;
}

