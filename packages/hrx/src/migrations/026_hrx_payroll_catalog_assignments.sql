CREATE TABLE IF NOT EXISTS hrx_payroll_items (
  tenant_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  tax_treatment TEXT NOT NULL,
  value_mode TEXT NOT NULL,
  calculation_order INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, item_id),
  UNIQUE (tenant_id, code),
  CONSTRAINT hrx_payroll_items_kind_check CHECK (kind IN ('earning', 'deduction')),
  CONSTRAINT hrx_payroll_items_tax_check CHECK (tax_treatment IN ('taxable', 'non_taxable')),
  CONSTRAINT hrx_payroll_items_value_mode_check CHECK (value_mode IN ('fixed', 'variable')),
  CONSTRAINT hrx_payroll_items_order_check CHECK (calculation_order >= 0),
  CONSTRAINT hrx_payroll_items_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS hrx_payroll_item_assignments (
  tenant_id TEXT NOT NULL,
  assignment_id TEXT NOT NULL,
  payroll_profile_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  encrypted_amount_ref TEXT NOT NULL,
  currency_ref TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_ref TEXT NOT NULL,
  raw_amount_included INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, assignment_id),
  UNIQUE (tenant_id, employee_id, item_id, version),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, payroll_profile_id) REFERENCES hrx_payroll_profiles (tenant_id, payroll_profile_id),
  FOREIGN KEY (tenant_id, item_id) REFERENCES hrx_payroll_items (tenant_id, item_id),
  CONSTRAINT hrx_payroll_item_assignments_version_check CHECK (version >= 1),
  CONSTRAINT hrx_payroll_item_assignments_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT hrx_payroll_item_assignments_dates_check CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT hrx_payroll_item_assignments_raw_amount_blocked_check CHECK (raw_amount_included = 0)
);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_item_assignments_employee_item
  ON hrx_payroll_item_assignments (tenant_id, employee_id, item_id, effective_from);

CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_item_assignments_immutable_update
BEFORE UPDATE ON hrx_payroll_item_assignments
BEGIN
  SELECT RAISE(ABORT, 'hrx_payroll_item_assignments is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_item_assignments_immutable_delete
BEFORE DELETE ON hrx_payroll_item_assignments
BEGIN
  SELECT RAISE(ABORT, 'hrx_payroll_item_assignments is append-only');
END;
