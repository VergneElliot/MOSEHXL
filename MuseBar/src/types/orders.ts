// Order and payment related types

export type PaymentMethod = 'cash' | 'card' | 'split';

export interface OrderItem {
  id: string;
  productId: string | null; // Allow null for Divers items
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number; // Add missing tax amount field
  isHappyHourApplied: boolean;
  isManualHappyHour?: boolean; // For manually applied happy hour discounts
  isOffert?: boolean; // For complimentary items (price = 0)
  isPerso?: boolean; // For employee complimentary items (price = 0)
  originalPrice?: number; // Store original price for reverting discounts
  description?: string; // Description for special items like Divers
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
  paymentMethod: PaymentMethod;
  subBills?: SubBill[];
  notes?: string;
  tips?: number;
  change?: number;
}

export interface Payment {
  amount: number;
  method: PaymentMethod;
}

export interface SubBill {
  id: string;
  orderId: string;
  paymentMethod: 'cash' | 'card';
  amount: number;
  status: 'pending' | 'paid';
  createdAt: Date;
}

// Local interface for managing split bills in POS component
export interface LocalSubBill {
  id: string;
  items: OrderItem[];
  total: number;
  payments: Payment[];
  tip?: string; // Optional tip value for this part
}

// Order status and utility types
export type OrderStatus = 'pending' | 'completed' | 'cancelled';
export type SubBillStatus = 'pending' | 'paid'; 