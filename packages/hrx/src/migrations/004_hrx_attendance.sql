CREATE TABLE IF NOT EXISTS hrx_attendance_records (
  tenant_id TEXT NOT NULL,
  attendance_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  work_date TEXT NOT NULL,
  status TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  import_batch_id TEXT,
  recorded_hours REAL,
  clock_in_at TEXT,
  clock_out_at TEXT,
  correction_of_attendance_id TEXT,
  correction_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, attendance_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, correction_of_attendance_id) REFERENCES hrx_attendance_records (tenant_id, attendance_id),
  CONSTRAINT hrx_attendance_status_check CHECK (status IN ('present', 'absent', 'remote', 'leave', 'holiday')),
  CONSTRAINT hrx_attendance_source_kind_check CHECK (source_kind IN ('manual', 'import')),
  CONSTRAINT hrx_attendance_import_batch_check CHECK (source_kind <> 'import' OR import_batch_id IS NOT NULL),
  CONSTRAINT hrx_attendance_hours_check CHECK (recorded_hours IS NULL OR recorded_hours >= 0)
);

CREATE INDEX IF NOT EXISTS idx_hrx_attendance_employee_month
  ON hrx_attendance_records (tenant_id, employee_id, work_date);

CREATE INDEX IF NOT EXISTS idx_hrx_attendance_correction_chain
  ON hrx_attendance_records (tenant_id, correction_of_attendance_id);
