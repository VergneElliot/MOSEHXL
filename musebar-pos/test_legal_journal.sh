#!/bin/bash
# Test Legal Journal Hash Chain
# Inserts test transactions and verifies integrity

set -e

DB_NAME="restaurant_pos_development"
SCHEMA="establishment_test_001"

echo "🧪 Testing Legal Journal Hash Chain..."

# Insert test transactions
echo "📝 Inserting test transactions..."
psql -d $DB_NAME << SQL
SET search_path TO $SCHEMA;

-- Insert first transaction (genesis)
INSERT INTO legal_journal (
    sequence_number, transaction_type, amount, vat_amount,
    payment_method, transaction_data, previous_hash, current_hash,
    timestamp, register_id
) VALUES (
    0,
    'SALE',
    10.00,
    1.67,
    'CASH',
    '{"order_id": 1, "items": [{"name": "Coffee", "price": 10.00}]}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    NOW(),
    'MUSEBAR-REG-001'
);

-- Insert second transaction (should chain to first)
INSERT INTO legal_journal (
    sequence_number, transaction_type, amount, vat_amount,
    payment_method, transaction_data, previous_hash, current_hash,
    timestamp, register_id
) VALUES (
    1,
    'SALE',
    15.50,
    2.58,
    'CARD',
    '{"order_id": 2, "items": [{"name": "Sandwich", "price": 15.50}]}',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    NOW(),
    'MUSEBAR-REG-001'
);

-- Insert third transaction (refund)
INSERT INTO legal_journal (
    sequence_number, transaction_type, amount, vat_amount,
    payment_method, transaction_data, previous_hash, current_hash,
    timestamp, register_id
) VALUES (
    2,
    'REFUND',
    -10.00,
    -1.67,
    'CASH',
    '{"order_id": 1, "reason": "Customer request"}',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    NOW(),
    'MUSEBAR-REG-001'
);

RESET search_path;
SQL

echo "✅ Test transactions inserted"
echo ""

# Verify via SQL
echo "📊 Journal entries (via SQL):"
psql -d $DB_NAME -c "SELECT sequence_number, transaction_type, amount, LEFT(current_hash, 16) as hash FROM $SCHEMA.legal_journal ORDER BY sequence_number;"

echo ""
echo "🔍 Verifying hash chain via API..."
curl -s http://localhost:3002/api/legal/journal/verify | jq '.'

echo ""
echo "📋 Journal entries via API:"
curl -s http://localhost:3002/api/legal/journal/entries | jq '.entries | length'

echo ""
echo "📊 Journal stats via API:"
curl -s http://localhost:3002/api/legal/journal/stats | jq '.statistics'

echo ""
echo "✅ Legal journal test complete!"
SQL
