CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_leave_accrual_rules_logical_version
  ON hrx_leave_accrual_rules (tenant_id, logical_rule_code, version)
  WHERE logical_rule_code IS NOT NULL;
