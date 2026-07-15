ALTER TABLE hrx_leave_entitlements ADD COLUMN memo TEXT;

ALTER TABLE hrx_leave_entitlements ADD COLUMN source_document_id TEXT;

ALTER TABLE hrx_leave_entitlements ADD COLUMN approved_by_actor_id TEXT;

CREATE INDEX IF NOT EXISTS idx_hrx_leave_entitlements_source_document
  ON hrx_leave_entitlements (tenant_id, source_document_id);
