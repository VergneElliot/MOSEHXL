// Business domain types for the restaurant/bar system

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number; // Prix TTC en euros
  taxRate: number; // Taux de taxe (0.20 pour 20%, 0.10 pour 10%)
  categoryId: string;
  isHappyHourEligible: boolean; // Si le produit peut bénéficier de l'Happy Hour
  happyHourDiscountType: 'percentage' | 'fixed'; // Type de réduction Happy Hour
  happyHourDiscountValue: number; // Valeur de la réduction (pourcentage ex: 0.20 ou montant fixe ex: 1.00)
  isActive: boolean;
  optionGroupIds?: string[];
  optionGroups?: ProductOptionGroup[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductOptionChoice {
  id: string;
  groupId: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  allowFreeText: boolean;
  freeTextLabel?: string | null;
  freeTextMaxLength: number;
  displayOrder: number;
  isActive: boolean;
  choices: ProductOptionChoice[];
}

export interface HappyHourSettings {
  isEnabled: boolean;
  startTime: string; // Format "HH:mm"
  endTime: string; // Format "HH:mm"
  /**
   * Manual override for the automatic schedule.
   * 'on'   – force active regardless of schedule or isEnabled
   * 'off'  – force inactive regardless of schedule or isEnabled
   * 'auto' – follow the automatic schedule (default)
   *
   * Legacy field kept for backward-compat when reading old DB values:
   * isManuallyActivated: true  →  treated as manualOverride: 'on'
   */
  manualOverride?: 'auto' | 'on' | 'off';
  /** @deprecated use manualOverride instead */
  isManuallyActivated?: boolean;
  discountPercentage?: number; // Ancien champ, pour rétrocompatibilité
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

// Utility types for business logic
export type DiscountType = 'percentage' | 'fixed';
export type ProductStatus = 'active' | 'inactive' | 'archived';
