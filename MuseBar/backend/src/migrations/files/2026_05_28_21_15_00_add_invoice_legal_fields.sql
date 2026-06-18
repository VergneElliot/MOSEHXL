-- UP
ALTER TABLE legal_invoices
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS late_penalty_terms TEXT,
  ADD COLUMN IF NOT EXISTS recovery_fee_note TEXT,
  ADD COLUMN IF NOT EXISTS seller_legal_form TEXT,
  ADD COLUMN IF NOT EXISTS seller_share_capital_eur DECIMAL(12,2);

UPDATE legal_invoices
SET
  payment_due_date = COALESCE(payment_due_date, issued_at::date),
  payment_terms = COALESCE(NULLIF(payment_terms, ''), 'Paiement comptant'),
  late_penalty_terms = COALESCE(NULLIF(late_penalty_terms, ''), 'Pénalités de retard exigibles selon la loi'),
  recovery_fee_note = COALESCE(
    NULLIF(recovery_fee_note, ''),
    'Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)'
  )
WHERE
  payment_due_date IS NULL
  OR payment_terms IS NULL
  OR payment_terms = ''
  OR late_penalty_terms IS NULL
  OR late_penalty_terms = ''
  OR recovery_fee_note IS NULL
  OR recovery_fee_note = '';

ALTER TABLE legal_invoices
  ALTER COLUMN payment_due_date SET NOT NULL,
  ALTER COLUMN payment_terms SET NOT NULL,
  ALTER COLUMN late_penalty_terms SET NOT NULL,
  ALTER COLUMN recovery_fee_note SET NOT NULL;

ALTER TABLE legal_invoices
  ADD CONSTRAINT legal_invoices_seller_share_capital_non_negative
  CHECK (seller_share_capital_eur IS NULL OR seller_share_capital_eur >= 0);

-- DOWN
ALTER TABLE legal_invoices
  DROP CONSTRAINT IF EXISTS legal_invoices_seller_share_capital_non_negative;

ALTER TABLE legal_invoices
  DROP COLUMN IF EXISTS seller_share_capital_eur,
  DROP COLUMN IF EXISTS seller_legal_form,
  DROP COLUMN IF EXISTS recovery_fee_note,
  DROP COLUMN IF EXISTS late_penalty_terms,
  DROP COLUMN IF EXISTS payment_terms,
  DROP COLUMN IF EXISTS payment_due_date;
