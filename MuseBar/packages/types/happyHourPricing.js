"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHappyHourPrice = calculateHappyHourPrice;
exports.calculateHappyHourPriceWithLabel = calculateHappyHourPriceWithLabel;
function parseNumeric(value) {
    if (typeof value === 'number' && !Number.isNaN(value))
        return value;
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
}
/**
 * Canonical happy-hour price calculation shared by POS catalog and admin preview.
 */
function calculateHappyHourPrice(product, isHappyHourActive, baseSettings = {}) {
    if (!isHappyHourActive || !product.isHappyHourEligible) {
        return product.price;
    }
    const productValNum = parseNumeric(product.happyHourDiscountValue);
    const hasIndividualDiscount = productValNum > 0;
    const type = hasIndividualDiscount
        ? (product.happyHourDiscountType ?? 'percentage')
        : (baseSettings.discountType ?? 'percentage');
    let value;
    if (hasIndividualDiscount) {
        value = productValNum;
    }
    else {
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
function calculateHappyHourPriceWithLabel(product, defaultDiscountValue = 0.2) {
    const discountType = product.happyHourDiscountType || 'percentage';
    let discountValue = parseNumeric(product.happyHourDiscountValue);
    if (discountValue <= 0) {
        discountValue = defaultDiscountValue;
    }
    let normalized = discountValue;
    if (discountType === 'percentage' && normalized > 1) {
        normalized = normalized / 100;
    }
    let price;
    let label;
    if (discountType === 'percentage') {
        price = product.price * (1 - normalized);
        label = `-${(normalized * 100).toFixed(0)}%`;
    }
    else {
        price = Math.max(0, product.price - normalized);
        label = `-${normalized.toFixed(2)}€`;
    }
    return { price, discountType, discountValue: normalized, label };
}
