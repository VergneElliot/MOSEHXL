# Unified Cancellation System Documentation

## Overview

The MOSEHXL system now features a unified cancellation system that handles all cancellation scenarios through a single, comprehensive endpoint. This replaces the previous two separate functions (`retour-from-history` and `cancel-order`) with one robust solution that handles all cancellation needs while maintaining legal compliance.

## Key Features

### 1. Single Endpoint for All Cancellations
- **Endpoint**: `POST /api/orders/cancel-unified`
- Handles partial cancellations, full cancellations, and all payment methods
- Properly handles tips and change reversals
- Works seamlessly in both local and server deployments

### 2. Legal Compliance
- Supports negative amounts in the legal journal for proper refund handling
- Uses appropriate transaction types (`REFUND` for partial, `CORRECTION` for full)
- Maintains audit trail for all cancellation activities
- Follows French fiscal requirements for transaction immutability

### 3. Payment Method Support
- **Cash payments**: Full reversal support
- **Card payments**: Full reversal support
- **Split payments**: Proportional reversal based on original payment distribution
- **Tips handling**: Card→Cash reversal (tips always go to cash drawer)
- **Change handling**: Proper reversal back to original payment method

## API Usage

### Request Parameters

```typescript
{
  orderId: number,              // ID of the order to cancel
  reason: string,              // Reason for cancellation (required)
  cancellationType?: string,   // 'full', 'partial', or 'items-only' (default: 'full')
  itemsToCancel?: Array<{      // Required for partial cancellations
    item_id: number
  }>
}
```

### Cancellation Types

#### 1. Full Cancellation (`cancellationType: 'full'`)
- Cancels the entire order including all items
- Reverses tips and change amounts
- Creates negative entries for all payments
- Most comprehensive cancellation option

#### 2. Partial Cancellation (`cancellationType: 'partial'`)
- Cancels only specified items from the order
- Proportionally reverses payments based on cancelled items
- Does not handle tips/change (order remains active)
- Requires `itemsToCancel` parameter

#### 3. Items Only (`cancellationType: 'items-only'`)
- Similar to partial but specifically for item returns only
- Does not affect tips or change amounts
- Useful for product returns while keeping service charges

### Response Structure

```typescript
{
  message: string,
  cancellation_order: Order,
  cancellation_items: OrderItem[],
  additional_orders: Array<{    // Tip/change reversal orders
    type: 'tip_reversal' | 'change_reversal',
    order: Order
  }>,
  original_order_id: number,
  cancellation_type: string,
  payment_method: string,
  totals: {
    cancelled_amount: number,
    cancelled_tax: number,
    tips_cancelled: number,
    change_cancelled: number
  }
}
```

## Database Changes

### Removed Constraints
The following database constraints have been removed to support negative amounts:

```sql
-- Removed from legal_journal table
-- CONSTRAINT amount_positive CHECK (amount >= 0)
-- CONSTRAINT vat_amount_positive CHECK (vat_amount >= 0)

-- Removed from closure_bulletins table  
-- CONSTRAINT totals_positive CHECK (total_amount >= 0 AND total_vat >= 0)
```

### Migration Applied
- File: `scripts/remove-amount-constraints-migration.sql`
- Applied to both production and development databases
- Includes proper comments explaining the legal compliance reasoning

## Frontend Integration

### History Dashboard
The History Dashboard now uses the unified cancellation endpoint for both:
- **Return Orders**: Partial or full item returns
- **Cancel Orders**: Complete order cancellations with tip/change handling

### Usage Examples

```typescript
// Full cancellation
await apiService.post('/orders/cancel-unified', {
  orderId: 123,
  reason: 'Customer request',
  cancellationType: 'full'
});

// Partial return
await apiService.post('/orders/cancel-unified', {
  orderId: 123,
  reason: 'Defective item',
  cancellationType: 'partial',
  itemsToCancel: [{ item_id: 456 }, { item_id: 789 }]
});
```

## Local vs Server Deployment

### Local Deployment
- System works entirely offline
- All cancellation logic runs locally
- Legal journal maintained locally
- Perfect for single-terminal setups

### Server Deployment
- Multiple devices can access the system
- Shared legal journal across all terminals
- Real-time synchronization of cancellations
- Suitable for multi-terminal environments (phones, tablets, PCs)

## Error Handling

### Common Errors
- **400**: Missing required parameters
- **404**: Order not found
- **400**: Order not in 'completed' status
- **400**: Invalid cancellation type
- **500**: Database or system errors

### Error Recovery
- All database operations are transactional
- Failed cancellations don't create partial records
- Detailed error logging for troubleshooting
- Audit trail maintains record of all attempts

## Legal Compliance Notes

### French Fiscal Requirements
- ✅ Immutable transaction records (append-only legal journal)
- ✅ Sequential numbering maintained
- ✅ Hash chain integrity preserved
- ✅ Proper negative amount handling for refunds
- ✅ Complete audit trail
- ✅ VAT handling for cancellations

### Transaction Types
- **REFUND**: Used for partial cancellations
- **CORRECTION**: Used for full order cancellations
- **ARCHIVE**: Used for end-of-period consolidation

## Backward Compatibility

### Deprecated Endpoints
The following endpoints are still available but deprecated:
- `POST /orders/retour-from-history` ← Use `cancel-unified` with `cancellationType: 'partial'`
- `POST /orders/cancel-order` ← Use `cancel-unified` with `cancellationType: 'full'`

### Migration Path
- Existing code will continue to work
- New implementations should use `cancel-unified`
- Deprecated endpoints may be removed in future versions

## Testing

### Test Scenarios
1. **Full Cash Order Cancellation**
   - Create cash order with tips and change
   - Cancel using unified endpoint
   - Verify all amounts properly reversed

2. **Partial Card Order Return**
   - Create card order with multiple items
   - Return specific items using partial cancellation
   - Verify proportional payment reversal

3. **Split Payment Cancellation**
   - Create order with mixed payment methods
   - Cancel entire order
   - Verify proper handling of each payment method

## Monitoring and Maintenance

### Legal Journal Verification
```sql
-- Check for proper negative amounts in cancellations
SELECT transaction_type, amount, vat_amount, payment_method 
FROM legal_journal 
WHERE amount < 0 OR vat_amount < 0
ORDER BY created_at DESC;
```

### Audit Trail Analysis
```sql
-- Monitor cancellation activity
SELECT action_type, COUNT(*), AVG((action_details->>'total_cancel_amount')::numeric)
FROM audit_trail 
WHERE action_type IN ('UNIFIED_CANCELLATION', 'CANCEL_ORDER', 'RETOUR_FROM_HISTORY')
GROUP BY action_type
ORDER BY COUNT(*) DESC;
```

## Support and Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Constraint Errors**: Verify migration was applied successfully
3. **Payment Reversals**: Check sub_bills table for proper negative amounts
4. **Legal Journal**: Verify negative amounts are properly logged

### Contact
For technical support or questions about the unified cancellation system, refer to the development team or check the audit trail for detailed transaction logs.
