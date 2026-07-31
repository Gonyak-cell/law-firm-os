CREATE TABLE IF NOT EXISTS hrx_lifecycle_templates (
  tenant_id TEXT NOT NULL,
  template_version_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  version TEXT NOT NULL,
  lifecycle_kind TEXT NOT NULL,
  role_key TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  tasks_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, template_version_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_lifecycle_template_version
  ON hrx_lifecycle_templates (tenant_id, template_id, version);

ALTER TABLE hrx_onboarding_plans
  ADD COLUMN template_ref_json TEXT;

ALTER TABLE hrx_onboarding_plans
  ADD COLUMN template_snapshot_json TEXT;

ALTER TABLE hrx_offboarding_cases
  ADD COLUMN template_ref_json TEXT;

ALTER TABLE hrx_offboarding_cases
  ADD COLUMN template_snapshot_json TEXT;

ALTER TABLE hrx_offboarding_cases
  ADD COLUMN tasks_json TEXT;
