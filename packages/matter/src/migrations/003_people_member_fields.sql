-- PEO-TUW-008: MatterMember People identity and effective-period expansion.
-- Matter Core stores typed records in matter_records.payload_json, so the
-- expand migration records verification receipts without rewriting old rows.

CREATE TABLE IF NOT EXISTS matter_people_member_migration_receipts (
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  source_record_hash TEXT NOT NULL,
  identity_resolution_state TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  migrated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, member_id)
);
