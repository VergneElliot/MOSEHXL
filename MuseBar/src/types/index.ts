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

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  createdAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  isHappyHourApplied: boolean;
  isManualHappyHour?: boolean; // For manually applied happy hour discounts
  isOffert?: boolean; // For complimentary items (price = 0)
  isPerso?: boolean; // For employee complimentary items (price = 0)
  originalPrice?: number; // Store original price for reverting discounts
}

export type PaymentMethod = 'cash' | 'card' | 'split';

export interface Payment {
  amount: number;
  method: PaymentMethod;
}

export interface SubBill {
  id: string;
  items: OrderItem[];
  total: number;
  payments: Payment[];
} 