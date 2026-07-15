ALTER TABLE hrx_payroll_profiles ADD COLUMN compensation_unit TEXT;
ALTER TABLE hrx_payroll_profiles ADD COLUMN compensation_quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE hrx_payroll_profiles ADD COLUMN withholding_category TEXT;
