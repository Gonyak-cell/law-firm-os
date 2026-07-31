CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_attendance_single_correction
  ON hrx_attendance_records (tenant_id, correction_of_attendance_id)
  WHERE correction_of_attendance_id IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_hrx_attendance_records_immutable_update
BEFORE UPDATE ON hrx_attendance_records
BEGIN
  SELECT RAISE(ABORT, 'hrx_attendance_records is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_attendance_records_immutable_delete
BEFORE DELETE ON hrx_attendance_records
BEGIN
  SELECT RAISE(ABORT, 'hrx_attendance_records is append-only');
END;
