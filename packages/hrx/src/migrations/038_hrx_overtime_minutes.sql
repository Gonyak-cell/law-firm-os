ALTER TABLE hrx_overtime_requests ADD COLUMN calculated_minutes INTEGER;
ALTER TABLE hrx_overtime_requests ADD COLUMN requested_minutes INTEGER;
ALTER TABLE hrx_overtime_requests ADD COLUMN approved_minutes INTEGER;
ALTER TABLE hrx_overtime_requests ADD COLUMN decision_reason TEXT;
ALTER TABLE hrx_overtime_requests ADD COLUMN calculation_basis_ref TEXT;
ALTER TABLE hrx_overtime_requests ADD COLUMN warning_codes_json TEXT;
