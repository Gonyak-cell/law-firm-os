CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_command_receipts_immutable_update
BEFORE UPDATE ON hrx_leave_command_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_leave_command_receipts rows are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_command_receipts_immutable_delete
BEFORE DELETE ON hrx_leave_command_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_leave_command_receipts rows are append-only');
END;
