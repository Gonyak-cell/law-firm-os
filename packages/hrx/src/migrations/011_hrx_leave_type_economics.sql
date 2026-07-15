ALTER TABLE hrx_leave_requests ADD COLUMN duration_mode TEXT;
ALTER TABLE hrx_leave_requests ADD COLUMN rounded_requested_minutes INTEGER;
ALTER TABLE hrx_leave_requests ADD COLUMN paid_minutes INTEGER;
ALTER TABLE hrx_leave_requests ADD COLUMN unpaid_minutes INTEGER;
ALTER TABLE hrx_leave_requests ADD COLUMN deduction_minutes INTEGER;
ALTER TABLE hrx_leave_requests ADD COLUMN policy_rules_snapshot_hash TEXT;

ALTER TABLE hrx_leave_request_segments ADD COLUMN paid_minutes INTEGER;
ALTER TABLE hrx_leave_request_segments ADD COLUMN deduction_minutes INTEGER;
ALTER TABLE hrx_leave_request_segments ADD COLUMN policy_rules_snapshot_hash TEXT;
