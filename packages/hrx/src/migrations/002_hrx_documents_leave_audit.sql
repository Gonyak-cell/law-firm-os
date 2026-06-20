CREATE TABLE IF NOT EXISTS hrx_documents (
  tenant_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  title TEXT,
  document_body_included INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, document_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_documents_body_blocked_check CHECK (document_body_included = 0)
);

CREATE TABLE IF NOT EXISTS hrx_leave_balance_entries (
  tenant_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  amount REAL NOT NULL,
  occurred_on TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  audit_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, entry_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_leave_balance_entry_type_check CHECK (entry_type IN ('earned', 'used', 'adjustment', 'carryover', 'reserved', 'released')),
  CONSTRAINT hrx_leave_balance_entry_amount_check CHECK (amount <> 0)
);

CREATE TABLE IF NOT EXISTS hrx_leave_requests (
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  amount REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  state TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  approver_id TEXT,
  decided_at TEXT,
  decision_reason TEXT,
  source_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, request_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_leave_requests_state_check CHECK (state IN ('submitted', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT hrx_leave_requests_amount_check CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS hrx_audit_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  previous_hash TEXT,
  event_hash TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_documents_employee
  ON hrx_documents (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_balance_entries_employee
  ON hrx_leave_balance_entries (tenant_id, employee_id, policy_id);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_requests_employee
  ON hrx_leave_requests (tenant_id, employee_id, state);

CREATE INDEX IF NOT EXISTS idx_hrx_audit_events_object
  ON hrx_audit_events (tenant_id, object_type, object_id);
