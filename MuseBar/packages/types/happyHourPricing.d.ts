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
/**
 * Canonical happy-hour price calculation shared by POS catalog and admin preview.
 */
export declare function calculateHappyHourPrice(product: HappyHourProductDiscount, isHappyHourActive: boolean, baseSettings?: HappyHourBaseSettings): number;
/** Admin schedule preview with display label. */
export declare function calculateHappyHourPriceWithLabel(product: HappyHourProductDiscount, defaultDiscountValue?: number): HappyHourPriceResult;
