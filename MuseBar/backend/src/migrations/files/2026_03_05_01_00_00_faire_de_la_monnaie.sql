-- UP
-- Migration: Faire de la monnaie (change operation)
-- 1. Orders: operation_type ('sale' | 'change'), change_amount for card→cash tracking
-- 2. Legal journal: allow transaction_type 'CHANGE'

-- Orders: support change operations (always card → cash)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50) NOT NULL DEFAULT 'sale',
  ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) NULL;

COMMENT ON COLUMN orders.operation_type IS 'sale = normal order; change = faire de la monnaie (card→cash)';
COMMENT ON COLUMN orders.change_amount IS 'Amount in € for change operations; NULL for sales';

-- Legal journal: add CHANGE transaction type
ALTER TABLE legal_journal
  DROP CONSTRAINT IF EXISTS legal_journal_transaction_type_check;

ALTER TABLE legal_journal
  ADD CONSTRAINT legal_journal_transaction_type_check
  CHECK (transaction_type IN ('SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE', 'CHANGE'));

-- DOWN
ALTER TABLE legal_journal
  DROP CONSTRAINT IF EXISTS legal_journal_transaction_type_check;

ALTER TABLE legal_journal
  ADD CONSTRAINT legal_journal_transaction_type_check
  CHECK (transaction_type IN ('SALE', 'REFUND', 'CORRECTION', 'CLOSURE', 'ARCHIVE'));

ALTER TABLE orders
  DROP COLUMN IF EXISTS change_amount,
  DROP COLUMN IF EXISTS operation_type;
