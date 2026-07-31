ALTER TABLE hrx_payroll_rule_versions
  ADD COLUMN legal_reviewed_by_actor_id TEXT;

ALTER TABLE hrx_payroll_rule_versions
  ADD COLUMN legal_review_ref TEXT;

ALTER TABLE hrx_payroll_rule_versions
  ADD COLUMN legal_reviewed_at TEXT;
