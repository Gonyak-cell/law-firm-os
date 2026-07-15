CREATE TABLE IF NOT EXISTS hrx_payroll_year_end_cases (
  tenant_id TEXT NOT NULL,
  year_end_case_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  collection_state TEXT NOT NULL DEFAULT 'collecting',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  inputs_json TEXT NOT NULL DEFAULT '{}',
  input_hash TEXT NOT NULL,
  result_json TEXT,
  result_hash TEXT,
  state TEXT NOT NULL DEFAULT 'draft',
  prepared_by_actor_id TEXT NOT NULL,
  reviewed_by_actor_id TEXT,
  review_receipt_ref TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  calculated_at TEXT,
  reviewed_at TEXT,
  PRIMARY KEY (tenant_id, year_end_case_id),
  UNIQUE (tenant_id, run_id, employee_id, tax_year),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_payroll_year_end_tax_year_check CHECK (tax_year BETWEEN 2000 AND 2200),
  CONSTRAINT hrx_payroll_year_end_collection_check CHECK (collection_state IN ('collecting', 'complete')),
  CONSTRAINT hrx_payroll_year_end_state_check CHECK (state IN ('draft', 'calculated', 'reviewed')),
  CONSTRAINT hrx_payroll_year_end_version_check CHECK (state_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_year_end_run
  ON hrx_payroll_year_end_cases (tenant_id, run_id, state, employee_id);
