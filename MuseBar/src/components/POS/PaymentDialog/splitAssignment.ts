/**
 * Public surface for assigning / splitting order lines across payment carts.
 * Implementation lives in splitBillCore / splitBillTotals / splitBillItems /
 * splitShares / splitBreakdown; this module only re-exports.
 */

export {
  billTotalFromItems,
  cents,
  fromCents,
  isBillAmountFixed,
  sourceItemId,
  unassignedItems,
} from './splitBillCore';

export {
  billManualDisplay,
  createEmptyBills,
  equalAmountBills,
  recomputeBillTotals,
  residualBillIndex,
  setBillManualAmount,
} from './splitBillTotals';

export { clearItemsFromBills, moveItemsToBill } from './splitBillItems';

export {
  dialogResidualIndex,
  distributeCentsByWeights,
  resolveSplitShareCents,
  splitItemsAcrossBills,
  splitItemsByShareCents,
} from './splitShares';

export { normalizeTaxRate, paymentMethodBreakdown, taxBreakdownByRate } from './splitBreakdown';
