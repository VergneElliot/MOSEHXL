export type HappyHourDiscountType = 'percentage' | 'fixed';

export interface HappyHourBaseSettings {
  discountType?: HappyHourDiscountType;
  discountValue?: number | string;
}

export interface HappyHourProductDiscount {
  price: number;
  happyHourDiscountType?: HappyHourDiscountType | null;
  happyHourDiscountValue?: number | string | null;
  isHappyHourEligible?: boolean;
}

export interface HappyHourPriceResult {
  price: number;
  discountType: HappyHourDiscountType;
  discountValue: number;
  /** UI label e.g. "-20%" or "-2.00€" */
  label: string;
}

function parseNumeric(value: number | string | null | undefined): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Canonical happy-hour price calculation shared by POS catalog and admin preview.
 */
export function calculateHappyHourPrice(
  product: HappyHourProductDiscount,
  isHappyHourActive: boolean,
  baseSettings: HappyHourBaseSettings = {}
): number {
  if (!isHappyHourActive || !product.isHappyHourEligible) {
    return product.price;
  }

  const productValNum = parseNumeric(product.happyHourDiscountValue);
  const hasIndividualDiscount = productValNum > 0;
  const type: HappyHourDiscountType = hasIndividualDiscount
    ? (product.happyHourDiscountType ?? 'percentage')
    : (baseSettings.discountType ?? 'percentage');

  let value: number;
  if (hasIndividualDiscount) {
    value = productValNum;
  } else {
    value = parseNumeric(baseSettings.discountValue);
  }

  if (type === 'percentage' && value > 1) {
    value = value / 100;
  }

  if (type === 'percentage') {
    return product.price * (1 - value);
  }
  return Math.max(0, product.price - value);
}

/** Admin schedule preview with display label. */
export function calculateHappyHourPriceWithLabel(
  product: HappyHourProductDiscount,
  defaultDiscountValue = 0.2
): HappyHourPriceResult {
  const discountType = product.happyHourDiscountType || 'percentage';
  let discountValue = parseNumeric(product.happyHourDiscountValue);
  if (discountValue <= 0) {
    discountValue = defaultDiscountValue;
  }

  let normalized = discountValue;
  if (discountType === 'percentage' && normalized > 1) {
    normalized = normalized / 100;
  }

  let price: number;
  let label: string;
  if (discountType === 'percentage') {
    price = product.price * (1 - normalized);
    label = `-${(normalized * 100).toFixed(0)}%`;
  } else {
    price = Math.max(0, product.price - normalized);
    label = `-${normalized.toFixed(2)}€`;
  }

  return { price, discountType, discountValue: normalized, label };
}
