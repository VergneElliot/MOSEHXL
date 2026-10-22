/**
 * Settings Types and Interfaces
 * Centralized type definitions for the settings system
 */

import { Product, Category } from '../../../types';

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

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  taxIdentification: string;
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
  categories?: Category[];
  onDataUpdate?: () => void;
  /** Venue JWT — required for Gestion des utilisateurs. */
  token?: string;
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

