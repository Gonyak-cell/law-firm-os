ALTER TABLE hrx_leave_promotion_campaigns ADD COLUMN excluded_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hrx_leave_promotion_campaigns ADD COLUMN exclusions_json TEXT NOT NULL DEFAULT '[]';
