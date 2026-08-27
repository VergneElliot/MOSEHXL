-- UP
-- Table labels must be unique per establishment (across all floor plans),
-- so POS / tickets never confuse "Table 5" from two different rooms.

ALTER TABLE dining_tables
  DROP CONSTRAINT IF EXISTS dining_tables_label_unique_per_plan;

ALTER TABLE dining_tables
  DROP CONSTRAINT IF EXISTS dining_tables_label_unique_per_establishment;

ALTER TABLE dining_tables
  ADD CONSTRAINT dining_tables_label_unique_per_establishment
  UNIQUE (establishment_id, label);

-- DOWN
ALTER TABLE dining_tables
  DROP CONSTRAINT IF EXISTS dining_tables_label_unique_per_establishment;

ALTER TABLE dining_tables
  DROP CONSTRAINT IF EXISTS dining_tables_label_unique_per_plan;

ALTER TABLE dining_tables
  ADD CONSTRAINT dining_tables_label_unique_per_plan
  UNIQUE (floor_plan_id, label);
