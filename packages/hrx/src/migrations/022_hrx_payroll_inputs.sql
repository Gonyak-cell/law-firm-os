ALTER TABLE hrx_payroll_input_snapshots ADD COLUMN input_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE hrx_overtime_requests ADD COLUMN payroll_segment_kind TEXT;

CREATE TABLE IF NOT EXISTS hrx_payroll_issues (
  tenant_id TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT,
  issue_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'open',
  resolved_by_actor_id TEXT,
  resolved_at TEXT,
  resolution_code TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, issue_id),
  UNIQUE (tenant_id, run_id, employee_id, issue_code),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_payroll_issues_severity_check CHECK (severity IN ('warning', 'blocker')),
  CONSTRAINT hrx_payroll_issues_state_check CHECK (state IN ('open', 'resolved', 'waived')),
  CONSTRAINT hrx_payroll_issues_version_check CHECK (state_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_issues_run
  ON hrx_payroll_issues (tenant_id, run_id, state, severity);

CREATE TRIGGER IF NOT EXISTS trg_hrx_compensation_records_immutable_update
BEFORE UPDATE ON hrx_compensation_records
BEGIN
  SELECT RAISE(ABORT, 'hrx_compensation_records is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_compensation_records_immutable_delete
BEFORE DELETE ON hrx_compensation_records
BEGIN
  SELECT RAISE(ABORT, 'hrx_compensation_records is append-only');
END;
