CREATE TABLE IF NOT EXISTS hrx_payroll_periods (
  tenant_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  period_code TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  cutoff_at TEXT NOT NULL,
  pay_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  PRIMARY KEY (tenant_id, period_id),
  UNIQUE (tenant_id, period_code),
  CONSTRAINT hrx_payroll_periods_range_check CHECK (period_start <= period_end),
  CONSTRAINT hrx_payroll_periods_status_check CHECK (status IN ('draft', 'open', 'closed')),
  CONSTRAINT hrx_payroll_periods_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_runs (
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  period_id TEXT NOT NULL,
  run_type TEXT NOT NULL DEFAULT 'regular',
  previous_run_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  snapshot_hash TEXT,
  result_hash TEXT,
  prepared_by_actor_id TEXT NOT NULL,
  approved_by_actor_id TEXT,
  approved_at TEXT,
  closed_at TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, run_id),
  UNIQUE (tenant_id, period_id, run_type, previous_run_id),
  FOREIGN KEY (tenant_id, period_id) REFERENCES hrx_payroll_periods (tenant_id, period_id),
  FOREIGN KEY (tenant_id, previous_run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  CONSTRAINT hrx_payroll_runs_type_check CHECK (run_type IN ('regular', 'adjustment')),
  CONSTRAINT hrx_payroll_runs_status_check CHECK (status IN ('draft', 'snapshot_ready', 'previewed', 'approved', 'closed', 'cancelled')),
  CONSTRAINT hrx_payroll_runs_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_profiles (
  tenant_id TEXT NOT NULL,
  payroll_profile_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employment_type TEXT NOT NULL,
  pay_group_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KRW',
  compensation_ref TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, payroll_profile_id),
  UNIQUE (tenant_id, employee_id, effective_from),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_payroll_profiles_type_check CHECK (employment_type IN ('monthly', 'hourly', 'daily', 'freelancer')),
  CONSTRAINT hrx_payroll_profiles_currency_check CHECK (currency = 'KRW'),
  CONSTRAINT hrx_payroll_profiles_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT hrx_payroll_profiles_range_check CHECK (effective_to IS NULL OR effective_from <= effective_to),
  CONSTRAINT hrx_payroll_profiles_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_input_snapshots (
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  source_hash TEXT NOT NULL,
  payable_minutes INTEGER NOT NULL DEFAULT 0,
  paid_leave_minutes INTEGER NOT NULL DEFAULT 0,
  unpaid_leave_minutes INTEGER NOT NULL DEFAULT 0,
  captured_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, snapshot_id),
  UNIQUE (tenant_id, run_id, employee_id),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_payroll_input_snapshot_minutes_check CHECK (
    payable_minutes >= 0 AND paid_leave_minutes >= 0 AND unpaid_leave_minutes >= 0
  )
);

CREATE TABLE IF NOT EXISTS hrx_payroll_employee_results (
  tenant_id TEXT NOT NULL,
  result_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  input_snapshot_id TEXT NOT NULL,
  gross_krw INTEGER NOT NULL,
  deduction_krw INTEGER NOT NULL,
  net_krw INTEGER NOT NULL,
  issue_count INTEGER NOT NULL DEFAULT 0,
  result_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, result_id),
  UNIQUE (tenant_id, run_id, employee_id),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, input_snapshot_id) REFERENCES hrx_payroll_input_snapshots (tenant_id, snapshot_id),
  CONSTRAINT hrx_payroll_employee_result_math_check CHECK (gross_krw - deduction_krw = net_krw),
  CONSTRAINT hrx_payroll_employee_result_issue_check CHECK (issue_count >= 0)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_line_items (
  tenant_id TEXT NOT NULL,
  line_item_id TEXT NOT NULL,
  result_id TEXT NOT NULL,
  item_kind TEXT NOT NULL,
  item_code TEXT NOT NULL,
  formula_code TEXT NOT NULL,
  rule_version_id TEXT,
  amount_krw INTEGER NOT NULL,
  quantity_minutes INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, line_item_id),
  UNIQUE (tenant_id, result_id, item_code),
  FOREIGN KEY (tenant_id, result_id) REFERENCES hrx_payroll_employee_results (tenant_id, result_id),
  CONSTRAINT hrx_payroll_line_items_kind_check CHECK (item_kind IN ('earning', 'deduction', 'employer_contribution', 'adjustment')),
  CONSTRAINT hrx_payroll_line_items_minutes_check CHECK (quantity_minutes IS NULL OR quantity_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_rule_versions (
  tenant_id TEXT NOT NULL,
  rule_version_id TEXT NOT NULL,
  rule_kind TEXT NOT NULL,
  version_code TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  source_document_hash TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  approval_state TEXT NOT NULL DEFAULT 'draft',
  created_by_actor_id TEXT NOT NULL,
  reviewed_by_actor_id TEXT,
  published_by_actor_id TEXT,
  published_at TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, rule_version_id),
  UNIQUE (tenant_id, rule_kind, version_code),
  CONSTRAINT hrx_payroll_rule_versions_range_check CHECK (effective_to IS NULL OR effective_from <= effective_to),
  CONSTRAINT hrx_payroll_rule_versions_state_check CHECK (approval_state IN ('draft', 'reviewed', 'published', 'retired')),
  CONSTRAINT hrx_payroll_rule_versions_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_statement_templates (
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  version_code TEXT NOT NULL,
  template_hash TEXT NOT NULL,
  schema_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_actor_id TEXT NOT NULL,
  published_by_actor_id TEXT,
  published_at TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, template_id),
  UNIQUE (tenant_id, version_code),
  CONSTRAINT hrx_payroll_statement_templates_status_check CHECK (status IN ('draft', 'published', 'retired')),
  CONSTRAINT hrx_payroll_statement_templates_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_statements (
  tenant_id TEXT NOT NULL,
  statement_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  document_ref TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'generated',
  state_version INTEGER NOT NULL DEFAULT 1,
  generated_at TEXT NOT NULL,
  delivered_at TEXT,
  viewed_at TEXT,
  revoked_at TEXT,
  PRIMARY KEY (tenant_id, statement_id),
  UNIQUE (tenant_id, run_id, employee_id),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, template_id) REFERENCES hrx_payroll_statement_templates (tenant_id, template_id),
  CONSTRAINT hrx_payroll_statements_state_check CHECK (state IN ('generated', 'delivered', 'viewed', 'revoked')),
  CONSTRAINT hrx_payroll_statements_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_delivery_receipts (
  tenant_id TEXT NOT NULL,
  delivery_receipt_id TEXT NOT NULL,
  statement_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider_receipt_ref TEXT,
  receipt_hash TEXT,
  state TEXT NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT,
  viewed_at TEXT,
  failed_at TEXT,
  PRIMARY KEY (tenant_id, delivery_receipt_id),
  UNIQUE (tenant_id, statement_id, channel),
  FOREIGN KEY (tenant_id, statement_id) REFERENCES hrx_payroll_statements (tenant_id, statement_id),
  CONSTRAINT hrx_payroll_delivery_receipts_channel_check CHECK (channel IN ('email', 'message', 'self_service')),
  CONSTRAINT hrx_payroll_delivery_receipts_state_check CHECK (state IN ('queued', 'delivered', 'viewed', 'failed', 'revoked')),
  CONSTRAINT hrx_payroll_delivery_receipts_attempt_check CHECK (attempt_count >= 0),
  CONSTRAINT hrx_payroll_delivery_receipts_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_payment_batches (
  tenant_id TEXT NOT NULL,
  payment_batch_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  bank_format_code TEXT NOT NULL,
  artifact_ref TEXT,
  checksum TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft',
  prepared_by_actor_id TEXT NOT NULL,
  approved_by_actor_id TEXT,
  provider_receipt_ref TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, payment_batch_id),
  UNIQUE (tenant_id, run_id, bank_format_code),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  CONSTRAINT hrx_payroll_payment_batches_state_check CHECK (state IN ('draft', 'approved', 'exported', 'reconciled', 'failed')),
  CONSTRAINT hrx_payroll_payment_batches_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_payment_items (
  tenant_id TEXT NOT NULL,
  payment_item_id TEXT NOT NULL,
  payment_batch_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  tokenized_account_ref TEXT NOT NULL,
  amount_krw INTEGER NOT NULL,
  provider_receipt_ref TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  PRIMARY KEY (tenant_id, payment_item_id),
  UNIQUE (tenant_id, payment_batch_id, employee_id),
  FOREIGN KEY (tenant_id, payment_batch_id) REFERENCES hrx_payroll_payment_batches (tenant_id, payment_batch_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_payroll_payment_items_amount_check CHECK (amount_krw >= 0),
  CONSTRAINT hrx_payroll_payment_items_state_check CHECK (state IN ('pending', 'exported', 'paid', 'failed')),
  CONSTRAINT hrx_payroll_payment_items_version_check CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_payroll_filing_jobs (
  tenant_id TEXT NOT NULL,
  filing_job_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  filing_kind TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  package_ref TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  provider_receipt_ref TEXT,
  state TEXT NOT NULL DEFAULT 'draft',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, filing_job_id),
  UNIQUE (tenant_id, run_id, filing_kind, schema_version),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  CONSTRAINT hrx_payroll_filing_jobs_kind_check CHECK (filing_kind IN ('withholding', 'payment_statement', 'social_insurance', 'year_end')),
  CONSTRAINT hrx_payroll_filing_jobs_state_check CHECK (state IN ('draft', 'validated', 'submitted', 'accepted', 'rejected', 'corrected')),
  CONSTRAINT hrx_payroll_filing_jobs_version_check CHECK (state_version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_periods_status
  ON hrx_payroll_periods (tenant_id, status, pay_date);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_runs_period
  ON hrx_payroll_runs (tenant_id, period_id, status);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_profiles_employee
  ON hrx_payroll_profiles (tenant_id, employee_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_snapshots_run
  ON hrx_payroll_input_snapshots (tenant_id, run_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_results_run
  ON hrx_payroll_employee_results (tenant_id, run_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_line_items_result
  ON hrx_payroll_line_items (tenant_id, result_id, item_kind);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_rules_effective
  ON hrx_payroll_rule_versions (tenant_id, rule_kind, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_statements_employee
  ON hrx_payroll_statements (tenant_id, employee_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_delivery_state
  ON hrx_payroll_delivery_receipts (tenant_id, state, updated_at);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_payment_batch_state
  ON hrx_payroll_payment_batches (tenant_id, state, updated_at);
CREATE INDEX IF NOT EXISTS idx_hrx_payroll_filing_state
  ON hrx_payroll_filing_jobs (tenant_id, state, updated_at);
