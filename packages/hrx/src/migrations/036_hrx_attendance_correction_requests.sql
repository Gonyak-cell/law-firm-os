CREATE TABLE IF NOT EXISTS hrx_attendance_correction_requests (
  tenant_id TEXT NOT NULL,
  correction_request_id TEXT NOT NULL,
  attendance_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  proposed_attendance_id TEXT NOT NULL,
  requested_changes_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_ref TEXT,
  state TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 1,
  requested_by_actor_id TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  reviewed_by_actor_id TEXT,
  reviewed_at TEXT,
  review_reason TEXT,
  approved_attendance_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, correction_request_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, attendance_id) REFERENCES hrx_attendance_records (tenant_id, attendance_id),
  FOREIGN KEY (tenant_id, approved_attendance_id) REFERENCES hrx_attendance_records (tenant_id, attendance_id),
  CONSTRAINT hrx_attendance_correction_state_check CHECK (state IN ('pending', 'approved', 'rejected')),
  CONSTRAINT hrx_attendance_correction_version_check CHECK (state_version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_attendance_correction_pending
  ON hrx_attendance_correction_requests (tenant_id, attendance_id)
  WHERE state = 'pending';

CREATE INDEX IF NOT EXISTS idx_hrx_attendance_correction_employee
  ON hrx_attendance_correction_requests (tenant_id, employee_id, requested_at);
