CREATE TABLE IF NOT EXISTS hrx_attendance_approval_receipts (
  tenant_id TEXT NOT NULL,
  approval_receipt_id TEXT NOT NULL,
  attendance_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  approved_by_actor_id TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  attendance_source_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, approval_receipt_id),
  UNIQUE (tenant_id, attendance_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, attendance_id) REFERENCES hrx_attendance_records (tenant_id, attendance_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_attendance_approval_receipts_attendance
  ON hrx_attendance_approval_receipts (tenant_id, attendance_id);

CREATE TRIGGER IF NOT EXISTS trg_hrx_attendance_approval_receipts_immutable_update
BEFORE UPDATE ON hrx_attendance_approval_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_attendance_approval_receipts is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_attendance_approval_receipts_immutable_delete
BEFORE DELETE ON hrx_attendance_approval_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_attendance_approval_receipts is append-only');
END;
