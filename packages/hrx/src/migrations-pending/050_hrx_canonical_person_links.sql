-- Pending operational catalog review. Local synthetic onboarding is production-disabled.
ALTER TABLE hrx_employees
  ADD COLUMN person_id TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN person_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_employees_person
  ON hrx_employees (tenant_id, person_id);

CREATE INDEX IF NOT EXISTS idx_hrx_employment_profiles_person
  ON hrx_employment_profiles (tenant_id, person_id, effective_from);
