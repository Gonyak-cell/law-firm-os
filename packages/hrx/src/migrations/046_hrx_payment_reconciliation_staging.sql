ALTER TABLE hrx_payroll_provider_operations
  ADD COLUMN result_payload_json TEXT;

ALTER TABLE hrx_payroll_provider_operations
  ADD COLUMN result_payload_hash TEXT;

ALTER TABLE hrx_payroll_provider_operations
  ADD COLUMN provider_response_hash TEXT;
