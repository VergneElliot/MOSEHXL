import type { OrderItem, Product } from '../../types';
import type { DiversFormData } from './DiversDialog';
import type { PourboireFormData } from './PourboireDialog';
import type { ProductOptionSelection } from './ProductOptionDialog';

export function buildOrderItemFromProduct(
  product: Product,
  selections: ProductOptionSelection[],
  isHappyHourActive: boolean,
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number
): OrderItem {
  const currentPrice = calculateProductPrice(product, isHappyHourActive);
  const taxAmount = currentPrice * (product.taxRate / (1 + product.taxRate));
  return {
    id: `${Date.now()}-${Math.random()}`,
    productId: product.id,
    productName: product.name,
    quantity: 1,
    unitPrice: currentPrice,
    totalPrice: currentPrice,
    taxRate: product.taxRate,
    taxAmount,
    isHappyHourApplied: isHappyHourActive && product.isHappyHourEligible,
    isOffert: false,
    isPerso: false,
    originalPrice: product.price,
    options: selections.map((selection) => ({
      groupId: selection.groupId,
      groupName: selection.groupName,
      choiceId: selection.choiceId ?? null,
      choiceLabel: selection.choiceLabel ?? null,
      freeText: selection.freeText ?? null,
      displayOrder: selection.displayOrder,
    })),
  };
}

export function orderItemFromDivers(data: DiversFormData): OrderItem | null {
  const price = parseFloat(data.price.replace(',', '.'));
  if (Number.isNaN(price) || price < 0) return null;
  const taxAmount = price * (data.taxRate / (1 + data.taxRate));
  return {
    id: `divers-${Date.now()}`,
    productId: null,
    productName: data.description.trim(),
    quantity: 1,
    unitPrice: price,
    totalPrice: price,
    taxRate: data.taxRate,
    taxAmount,
    isHappyHourApplied: false,
    isOffert: false,
    isPerso: false,
    description: data.description.trim(),
  };
}

export function orderItemFromPourboire(data: PourboireFormData): OrderItem | null {
  const amount = parseFloat(data.amount.replace(',', '.'));
  if (Number.isNaN(amount) || amount <= 0) return null;
  return {
    id: `tip-${Date.now()}`,
    productId: null,
    productName: 'Pourboire (carte)',
    quantity: 1,
    unitPrice: amount,
    totalPrice: amount,
    taxRate: 0,
    taxAmount: 0,
    isHappyHourApplied: false,
    isOffert: false,
    isPerso: false,
    isTip: true,
    description: 'Pourboire carte',
  };
}
