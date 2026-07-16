CREATE TABLE IF NOT EXISTS hrx_leave_balance_snapshots (
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  as_of TEXT NOT NULL,
  available_minutes INTEGER NOT NULL,
  source_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, snapshot_id),
  UNIQUE (tenant_id, employee_id, group_id, as_of),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, group_id) REFERENCES hrx_leave_groups (tenant_id, group_id)
);

ALTER TABLE hrx_leave_termination_reconciliations ADD COLUMN mode TEXT NOT NULL DEFAULT 'preview';
ALTER TABLE hrx_leave_termination_reconciliations ADD COLUMN source_version TEXT;
ALTER TABLE hrx_leave_termination_reconciliations ADD COLUMN preview_reconciliation_id TEXT;
ALTER TABLE hrx_leave_termination_reconciliations ADD COLUMN approved_by_actor_id TEXT;
ALTER TABLE hrx_leave_termination_reconciliations ADD COLUMN executed_by_actor_id TEXT;
ALTER TABLE hrx_leave_termination_reconciliations ADD COLUMN completed_at TEXT;

ALTER TABLE hrx_offboarding_cases ADD COLUMN leave_reconciliation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE hrx_leave_sync_outbox ADD COLUMN provider_receipt_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_hrx_leave_balance_snapshots_lookup
  ON hrx_leave_balance_snapshots (tenant_id, employee_id, group_id, as_of);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_termination_employee
  ON hrx_leave_termination_reconciliations (tenant_id, employee_id, termination_date, created_at);
