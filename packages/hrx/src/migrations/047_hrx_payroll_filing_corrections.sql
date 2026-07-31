ALTER TABLE hrx_payroll_runs
  ADD COLUMN filing_source_hash TEXT;

ALTER TABLE hrx_payroll_filing_jobs
  ADD COLUMN previous_job_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_filing_previous_job
  ON hrx_payroll_filing_jobs (tenant_id, previous_job_ref)
  WHERE previous_job_ref IS NOT NULL;
