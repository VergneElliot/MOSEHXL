import { request } from './core';
import { Product, ProductOptionGroup } from '../../types';
import type { ProductRecord, ProductOptionGroupRecord } from '@mosehxl/types';

type ProductWriteResponse = ProductRecord;
type ProductReadResponse = ProductRecord[];

function toNumber(value: number | string | null | undefined, fallback: number = 0): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseFloat(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapProductDiscount(prod: ProductRecord): { happyHourDiscountType: 'percentage' | 'fixed'; happyHourDiscountValue: number } {
  const hasPercent = prod.happy_hour_discount_percent != null && prod.happy_hour_discount_percent !== '';
  const hasFixed = prod.happy_hour_discount_fixed != null && prod.happy_hour_discount_fixed !== '';
  if (hasPercent) {
    return {
      happyHourDiscountType: 'percentage',
      happyHourDiscountValue: toNumber(prod.happy_hour_discount_percent) / 100,
    };
  }
  if (hasFixed) {
    return {
      happyHourDiscountType: 'fixed',
      happyHourDiscountValue: toNumber(prod.happy_hour_discount_fixed),
    };
  }
  return { happyHourDiscountType: 'fixed', happyHourDiscountValue: 0 };
}

function mapOptionGroup(group: ProductOptionGroupRecord): ProductOptionGroup {
  return {
    id: String(group.id),
    name: group.name,
    isRequired: group.is_required === true,
    allowFreeText: group.allow_free_text === true,
    freeTextLabel: group.free_text_label ?? null,
    freeTextMaxLength: group.free_text_max_length ?? 120,
    displayOrder: group.display_order ?? 0,
    isActive: group.is_active !== false,
    choices: (group.choices ?? []).map((choice) => ({
      id: String(choice.id),
      groupId: String(choice.group_id),
      label: choice.label,
      displayOrder: choice.display_order ?? 0,
      isActive: choice.is_active !== false,
    })),
  };
}

function mapProduct(prod: ProductRecord): Product {
  const discount = mapProductDiscount(prod);
  return {
    id: String(prod.id),
    name: prod.name,
    description: prod.description || '',
    price: toNumber(prod.price),
    taxRate: toNumber(prod.tax_rate) / 100,
    categoryId: String(prod.category_id),
    isHappyHourEligible: prod.is_happy_hour_eligible,
    happyHourDiscountType: discount.happyHourDiscountType,
    happyHourDiscountValue: discount.happyHourDiscountValue,
    isActive: prod.is_active !== false,
    optionGroupIds: (prod.option_group_ids ?? []).map(String),
    optionGroups: (prod.option_groups ?? []).map(mapOptionGroup),
    createdAt: new Date(prod.created_at),
    updatedAt: new Date(prod.updated_at),
  };
}

export async function getProducts(): Promise<Product[]> {
  const products = await request<ProductReadResponse>('/products');
  return products.map(mapProduct);
}

export async function getArchivedProducts(): Promise<Product[]> {
  const products = await request<ProductReadResponse>('/products/archived');
  return products.map((prod) => ({ ...mapProduct(prod), isActive: false }));
}

export async function getAllProductsIncludingArchived(): Promise<Product[]> {
  const products = await request<ProductReadResponse>('/products/all');
  return products.map(mapProduct);
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { optionGroupIds?: string[] }
): Promise<Product> {
  const result = await request<ProductWriteResponse>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: product.name,
      price: product.price,
      tax_rate: product.taxRate * 100,
      category_id: parseInt(product.categoryId),
      happy_hour_discount_percent: product.happyHourDiscountType === 'percentage' ? product.happyHourDiscountValue * 100 : null,
      happy_hour_discount_fixed: product.happyHourDiscountType === 'fixed' ? product.happyHourDiscountValue : null,
      is_happy_hour_eligible: product.isHappyHourEligible,
      option_group_ids: (product.optionGroupIds ?? []).map((id) => parseInt(id, 10)),
    }),
  });
  return mapProduct(result);
}

export async function updateProduct(
  id: string,
  product: Partial<Product> & { optionGroupIds?: string[] }
): Promise<Product> {
  const updateData: Record<string, string | number | boolean | null | number[]> = {};
  if (product.name !== undefined) updateData.name = product.name;
  if (product.price !== undefined) updateData.price = product.price;
  if (product.taxRate !== undefined) updateData.tax_rate = product.taxRate * 100;
  if (product.categoryId !== undefined) updateData.category_id = parseInt(product.categoryId);
  if (product.isHappyHourEligible !== undefined) updateData.is_happy_hour_eligible = product.isHappyHourEligible;
  if (product.happyHourDiscountType === 'percentage' && product.happyHourDiscountValue !== undefined) {
    updateData.happy_hour_discount_percent = product.happyHourDiscountValue * 100;
    updateData.happy_hour_discount_fixed = null;
  } else if (product.happyHourDiscountType === 'fixed' && product.happyHourDiscountValue !== undefined) {
    updateData.happy_hour_discount_fixed = product.happyHourDiscountValue;
    updateData.happy_hour_discount_percent = null;
  }
  if (product.isActive !== undefined) updateData.is_active = product.isActive;
  if (product.optionGroupIds !== undefined) {
    updateData.option_group_ids = product.optionGroupIds.map((groupId) => parseInt(groupId, 10));
  }

  const result = await request<ProductWriteResponse>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
  return mapProduct(result);
}

export async function deleteProduct(id: string): Promise<{ message?: string; action?: string }> {
  return request(`/products/${id}`, { method: 'DELETE' });
}
export async function restoreProduct(id: string): Promise<void> { await request(`/products/${id}/restore`, { method: 'PUT' }); }



