-- up
CREATE TABLE IF NOT EXISTS legal_invoice_counters (
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  invoice_year INTEGER NOT NULL,
  next_sequence INTEGER NOT NULL DEFAULT 1 CHECK (next_sequence > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (establishment_id, invoice_year)
);

CREATE TABLE IF NOT EXISTS legal_invoices (
  id BIGSERIAL PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(40) NOT NULL,
  invoice_year INTEGER NOT NULL,
  invoice_sequence INTEGER NOT NULL CHECK (invoice_sequence > 0),
  invoice_mode VARCHAR(16) NOT NULL CHECK (invoice_mode IN ('detailed', 'summary')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_email TEXT,
  customer_tax_identification TEXT,
  business_info JSONB NOT NULL,
  line_items JSONB NOT NULL,
  vat_breakdown JSONB NOT NULL,
  subtotal_ht DECIMAL(12,2) NOT NULL CHECK (subtotal_ht >= 0),
  total_vat DECIMAL(12,2) NOT NULL CHECK (total_vat >= 0),
  total_ttc DECIMAL(12,2) NOT NULL CHECK (total_ttc >= 0),
  source_receipt_sequence INTEGER,
  source_receipt_hash TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (establishment_id, invoice_number),
  UNIQUE (establishment_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_invoices_establishment_created
  ON legal_invoices (establishment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_invoices_order_id
  ON legal_invoices (order_id);

-- down
DROP INDEX IF EXISTS idx_legal_invoices_order_id;
DROP INDEX IF EXISTS idx_legal_invoices_establishment_created;
DROP TABLE IF EXISTS legal_invoices;
DROP TABLE IF EXISTS legal_invoice_counters;
