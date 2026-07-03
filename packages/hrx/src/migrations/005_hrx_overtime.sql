CREATE TABLE IF NOT EXISTS hrx_overtime_requests (
  tenant_id TEXT NOT NULL,
  overtime_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  work_date TEXT NOT NULL,
  hours REAL NOT NULL,
  reason TEXT NOT NULL,
  state TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  approver_id TEXT,
  decided_at TEXT,
  export_ref TEXT,
  source_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, overtime_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_overtime_state_check CHECK (state IN ('submitted', 'approved', 'rejected', 'cancelled', 'exported')),
  CONSTRAINT hrx_overtime_hours_check CHECK (hours > 0),
  CONSTRAINT hrx_overtime_approved_check CHECK (state <> 'approved' OR approver_id IS NOT NULL),
  CONSTRAINT hrx_overtime_exported_check CHECK (state <> 'exported' OR export_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_hrx_overtime_employee_month
  ON hrx_overtime_requests (tenant_id, employee_id, work_date, state);
