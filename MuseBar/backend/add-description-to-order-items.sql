-- Add description column to order_items table for Divers items and other special cases
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to explain the purpose
COMMENT ON COLUMN order_items.description IS 'Description for special items like Divers, used for traceability and legal compliance'; 