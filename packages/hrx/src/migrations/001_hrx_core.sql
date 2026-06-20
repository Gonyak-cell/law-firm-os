CREATE TABLE IF NOT EXISTS hrx_employees (
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  legal_name TEXT,
  work_email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, employee_id),
  CONSTRAINT hrx_employees_status_check CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated'))
);

CREATE TABLE IF NOT EXISTS hrx_employment_profiles (
  tenant_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  title TEXT,
  org_unit_id TEXT,
  manager_employee_id TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, profile_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_employment_profiles_type_check CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'intern')),
  CONSTRAINT hrx_employment_profiles_status_check CHECK (status IN ('active', 'future', 'on_leave', 'terminated')),
  CONSTRAINT hrx_employment_profiles_dates_check CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS hrx_employee_user_links (
  tenant_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, link_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  UNIQUE (tenant_id, user_id, purpose),
  CONSTRAINT hrx_employee_user_links_purpose_check CHECK (purpose = 'login_mapping'),
  CONSTRAINT hrx_employee_user_links_identity_check CHECK (employee_id <> user_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_employees_tenant_status
  ON hrx_employees (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_hrx_employment_profiles_employee
  ON hrx_employment_profiles (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_hrx_employee_user_links_employee
  ON hrx_employee_user_links (tenant_id, employee_id);
