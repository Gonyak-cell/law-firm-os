ALTER TABLE hrx_leave_accrual_rules ADD COLUMN logical_rule_code TEXT;
ALTER TABLE hrx_leave_accrual_rules ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hrx_leave_accrual_rules ADD COLUMN supersedes_rule_id TEXT;
ALTER TABLE hrx_leave_accrual_runs ADD COLUMN as_of_date TEXT;
