-- PEO-TUW-014: explicit MatterTask User assignment and time fields expansion.

CREATE TABLE IF NOT EXISTS matter_people_task_migration_receipts (
  tenant_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  assigned_to_user_id TEXT,
  assignment_resolution_state TEXT NOT NULL,
  source_record_hash TEXT NOT NULL,
  migrated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, task_id)
);
