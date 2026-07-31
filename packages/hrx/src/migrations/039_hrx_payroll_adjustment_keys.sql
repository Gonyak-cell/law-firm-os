ALTER TABLE hrx_payroll_runs ADD COLUMN correction_key TEXT;
ALTER TABLE hrx_payroll_runs ADD COLUMN correction_request_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_payroll_runs_correction_key
  ON hrx_payroll_runs (tenant_id, correction_key)
  WHERE correction_key IS NOT NULL;
