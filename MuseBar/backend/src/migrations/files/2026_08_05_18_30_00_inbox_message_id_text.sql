-- UP
-- Inbound Parse: Gmail Message-IDs / header folds can exceed VARCHAR(255).

ALTER TABLE inbox_messages
  ALTER COLUMN message_id TYPE TEXT;

-- DOWN
ALTER TABLE inbox_messages
  ALTER COLUMN message_id TYPE VARCHAR(255)
  USING LEFT(message_id, 255);
