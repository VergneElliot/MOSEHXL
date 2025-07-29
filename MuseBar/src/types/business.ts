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
  createdAt: Date;
  updatedAt: Date;
}

export interface HappyHourSettings {
  isEnabled: boolean;
  startTime: string; // Format "HH:mm"
  endTime: string; // Format "HH:mm"
  isManuallyActivated: boolean; // Pour activation/désactivation manuelle
  discountPercentage?: number; // Ancien champ, pour rétrocompatibilité
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

// Utility types for business logic
export type DiscountType = 'percentage' | 'fixed';
export type ProductStatus = 'active' | 'inactive' | 'archived'; 