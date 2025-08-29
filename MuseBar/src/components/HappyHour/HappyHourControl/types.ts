/**
 * Happy Hour Types and Interfaces
 * Centralized type definitions for the happy hour system
 */

import { Product } from '../../../types';

export interface HappyHourControlProps {
  isActive: boolean;
  timeUntil: string;
  onStatusUpdate: () => void;
}

export interface HappyHourSettings {
  startTime: string;
  endTime: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isEnabled: boolean;
}

export interface EditForm {
  type: 'percentage' | 'fixed';
  value: string;
}

export interface HappyHourState {
  settings: HappyHourSettings;
  eligibleProducts: Product[];
  editingProductId: string | null;
  editForm: EditForm;
  loading: boolean;
}

export interface HappyHourStatusProps {
  isActive: boolean;
  timeUntil: string;
  settings: HappyHourSettings;
  onManualToggle: () => void;
  loading?: boolean;
}

export interface HappyHourFormProps {
  settings: HappyHourSettings;
  onSettingsChange: (settings: HappyHourSettings) => void;
  onSave: () => void;
  loading?: boolean;
}

export interface HappyHourScheduleProps {
  eligibleProducts: Product[];
  editingProductId: string | null;
  editForm: EditForm;
  onEditProduct: (productId: string) => void;
  onEditFormChange: (form: EditForm) => void;
  onSaveProduct: (productId: string) => void;
  onCancelEdit: () => void;
  loading?: boolean;
}

export interface UseHappyHourReturn {
  state: HappyHourState;
  // Settings management
  updateSettings: (settings: HappyHourSettings) => void;
  saveSettings: () => Promise<void>;
  // Product management
  startEditingProduct: (productId: string) => void;
  updateEditForm: (form: EditForm) => void;
  saveProductDiscount: (productId: string) => Promise<void>;
  cancelEditing: () => void;
  // Manual control
  toggleManualActive: () => Promise<void>;
  // Utility
  getCurrentTime: () => string;
  formatCurrency: (amount: number) => string;
  calculateHappyHourPrice: (product: Product) => { price: number; value: number; type: 'percentage' | 'fixed' };
  getDiscountLabel: (product: Product) => string;
}

export interface HappyHourDiscountInfo {
  type: 'percentage' | 'fixed';
  value: number;
  label: string;
  discountedPrice: number;
}

