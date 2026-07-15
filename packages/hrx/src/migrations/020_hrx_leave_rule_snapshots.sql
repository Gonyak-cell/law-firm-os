ALTER TABLE hrx_leave_entitlements ADD COLUMN policy_rules_snapshot_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_hrx_leave_entitlement_rule_snapshot
  ON hrx_leave_entitlements (tenant_id, policy_version_id, policy_rules_snapshot_hash);
