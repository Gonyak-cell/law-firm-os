ALTER TABLE hrx_payroll_profiles ADD COLUMN deduction_input_json TEXT;
ALTER TABLE hrx_payroll_profiles ADD COLUMN custom_deductions_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE hrx_payroll_profiles ADD COLUMN notice_assessments_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS hrx_payroll_adjustments (
  tenant_id TEXT NOT NULL,
  adjustment_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  previous_run_ref TEXT NOT NULL,
  adjustment_ref TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  amount_krw INTEGER NOT NULL,
  taxable INTEGER NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, adjustment_id),
  UNIQUE (tenant_id, run_id, employee_id, adjustment_ref),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  CONSTRAINT hrx_payroll_adjustments_amount_check CHECK (amount_krw <> 0),
  CONSTRAINT hrx_payroll_adjustments_taxable_check CHECK (taxable IN (0, 1))
);

CREATE TABLE IF NOT EXISTS hrx_payroll_outbox (
  tenant_id TEXT NOT NULL,
  outbox_event_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, outbox_event_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, run_id) REFERENCES hrx_payroll_runs (tenant_id, run_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_adjustments_run
  ON hrx_payroll_adjustments (tenant_id, run_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_outbox_run
  ON hrx_payroll_outbox (tenant_id, run_id, created_at);

CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_adjustments_immutable_update
BEFORE UPDATE ON hrx_payroll_adjustments
BEGIN
  SELECT RAISE(ABORT, 'hrx_payroll_adjustments is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_adjustments_immutable_delete
BEFORE DELETE ON hrx_payroll_adjustments
BEGIN
  SELECT RAISE(ABORT, 'hrx_payroll_adjustments is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_outbox_immutable_update
BEFORE UPDATE ON hrx_payroll_outbox
BEGIN
  SELECT RAISE(ABORT, 'hrx_payroll_outbox is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_outbox_immutable_delete
BEFORE DELETE ON hrx_payroll_outbox
BEGIN
  SELECT RAISE(ABORT, 'hrx_payroll_outbox is append-only');
END;
