ALTER TABLE hrx_employees
  ADD COLUMN mobile_phone TEXT;

ALTER TABLE hrx_employees
  ADD COLUMN photo_object_id TEXT;

ALTER TABLE hrx_employees
  ADD COLUMN photo_sha256 TEXT;

ALTER TABLE hrx_employees
  ADD COLUMN photo_byte_size INTEGER;

ALTER TABLE hrx_employees
  ADD COLUMN photo_content_type TEXT;

ALTER TABLE hrx_employees
  ADD COLUMN photo_version_id TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN legal_entity_id TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN affiliation TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN department TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN organization_group TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN country TEXT;

ALTER TABLE hrx_employment_profiles
  ADD COLUMN start_date TEXT;

CREATE INDEX IF NOT EXISTS idx_hrx_employment_profiles_legal_entity
  ON hrx_employment_profiles (tenant_id, legal_entity_id, employee_id);
