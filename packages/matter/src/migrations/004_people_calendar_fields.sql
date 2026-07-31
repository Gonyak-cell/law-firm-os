-- PEO-TUW-011: explicit MatterCalendarEvent type and provider identity expansion.

CREATE TABLE IF NOT EXISTS matter_people_calendar_migration_receipts (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  provider TEXT,
  provider_event_id TEXT,
  resolution_state TEXT NOT NULL,
  migrated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_id),
  UNIQUE (tenant_id, provider, provider_event_id)
);
