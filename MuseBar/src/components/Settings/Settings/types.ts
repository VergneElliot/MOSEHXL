/**
 * Settings Types and Interfaces
 * Centralized type definitions for the settings system
 */

import { Product } from '../../../types';

export interface ClosureSettings {
  auto_closure_enabled: boolean;
  daily_closure_time: string;
  timezone: string;
  grace_period_minutes: number;
  accounting_emails: string[];
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

/** @deprecated Unused in Settings UI; currency is EUR app-wide and language uses i18n switcher. */
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

/** @deprecated Legacy stub type; live printer config is PrinterSetup. */
export interface PrinterSettings {
  enabled: boolean;
  printerName: string;
  printReceipts: boolean;
  printReports: boolean;
}

export interface SettingsState {
  businessInfo: BusinessInfo;
  closureSettings: ClosureSettings;
  schedulerStatus: SchedulerStatus;
}

export interface SettingsProps {
  isHappyHourActive?: boolean;
  timeUntilHappyHour?: string;
  onHappyHourStatusUpdate?: () => void;
  products?: Product[];
}

/** @deprecated General settings form removed; business identity is BusinessSettingsProps. */
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
  updateBusinessInfo: (info: BusinessInfo) => void;
  updateClosureSettings: (settings: ClosureSettings) => void;
  saveBusinessInfo: () => Promise<void>;
  saveClosureSettings: () => Promise<void>;
  triggerManualCheck: () => Promise<void>;
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

