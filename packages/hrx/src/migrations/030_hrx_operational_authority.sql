CREATE TABLE IF NOT EXISTS hrx_risk_events (
  tenant_id TEXT NOT NULL,
  risk_event_id TEXT NOT NULL,
  employee_id TEXT,
  candidate_id TEXT,
  category TEXT NOT NULL,
  risk_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  intake_source_ref TEXT NOT NULL,
  source_refs_json TEXT NOT NULL,
  matter_id TEXT,
  owner_role TEXT NOT NULL,
  detected_on TEXT NOT NULL,
  due_on TEXT,
  status TEXT NOT NULL,
  resolution_ref TEXT,
  state_history_json TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, risk_event_id),
  CHECK (category IN ('harassment', 'discrimination', 'security', 'privacy', 'payroll', 'performance', 'compliance', 'labor', 'training', 'lifecycle', 'other')),
  CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),
  CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_operational_approvals (
  tenant_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  route TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  state TEXT NOT NULL,
  decided_by TEXT,
  decision_reason TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, approval_id),
  UNIQUE (tenant_id, object_type, object_id),
  CHECK (route IN ('manager', 'hr', 'legal')),
  CHECK (state IN ('pending', 'approved', 'rejected')),
  CHECK (state_version >= 1),
  CHECK ((state = 'pending' AND decided_by IS NULL) OR (state IN ('approved', 'rejected') AND decided_by IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS hrx_operational_policies (
  tenant_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  policy_type TEXT,
  policy_version TEXT,
  effective_from TEXT,
  policy_payload_json TEXT NOT NULL,
  configured_by TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, policy_id),
  CHECK (state_version >= 1)
);

CREATE TABLE IF NOT EXISTS hrx_ai_source_registry (
  tenant_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  source_type TEXT NOT NULL,
  sensitivity TEXT NOT NULL,
  title TEXT,
  owner_ref TEXT,
  tags_json TEXT NOT NULL,
  indexed_by TEXT NOT NULL,
  raw_payload_present INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, source_ref),
  CHECK (source_type IN ('policy_document', 'hr_document', 'case_record')),
  CHECK (raw_payload_present = 0)
);

CREATE INDEX IF NOT EXISTS idx_hrx_risk_events_tenant_status
  ON hrx_risk_events (tenant_id, status, severity);

CREATE INDEX IF NOT EXISTS idx_hrx_operational_approvals_tenant_state
  ON hrx_operational_approvals (tenant_id, state, route);

CREATE INDEX IF NOT EXISTS idx_hrx_operational_policies_tenant_type
  ON hrx_operational_policies (tenant_id, policy_type, effective_from);

CREATE INDEX IF NOT EXISTS idx_hrx_ai_source_registry_tenant_type
  ON hrx_ai_source_registry (tenant_id, source_type, sensitivity);
