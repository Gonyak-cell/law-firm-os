ALTER TABLE hrx_leave_requests ADD COLUMN leave_type_id TEXT;
ALTER TABLE hrx_leave_requests ADD COLUMN policy_version_id TEXT;
ALTER TABLE hrx_leave_requests ADD COLUMN requested_minutes INTEGER;
ALTER TABLE hrx_leave_requests ADD COLUMN timezone TEXT;
ALTER TABLE hrx_leave_requests ADD COLUMN schedule_snapshot_hash TEXT;
ALTER TABLE hrx_leave_requests ADD COLUMN state_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE hrx_leave_balance_entries ADD COLUMN group_id TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN entitlement_id TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN allocation_id TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN reverses_entry_id TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN policy_version_id TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN idempotency_key TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN adjustment_direction TEXT;
ALTER TABLE hrx_leave_balance_entries ADD COLUMN amount_minutes INTEGER;

CREATE TABLE IF NOT EXISTS hrx_leave_groups (
  tenant_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, group_id),
  UNIQUE (tenant_id, code),
  CONSTRAINT hrx_leave_groups_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS hrx_leave_types (
  tenant_id TEXT NOT NULL,
  leave_type_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  request_unit TEXT NOT NULL,
  evidence_rule_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, leave_type_id),
  UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, group_id) REFERENCES hrx_leave_groups (tenant_id, group_id),
  CONSTRAINT hrx_leave_types_unit_check CHECK (request_unit IN ('minutes', 'half_day', 'day')),
  CONSTRAINT hrx_leave_types_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS hrx_leave_policy_versions (
  tenant_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  policy_code TEXT NOT NULL,
  version INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  rules_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, policy_version_id),
  UNIQUE (tenant_id, policy_code, version),
  FOREIGN KEY (tenant_id, group_id) REFERENCES hrx_leave_groups (tenant_id, group_id),
  CONSTRAINT hrx_leave_policy_versions_status_check CHECK (status IN ('draft', 'active', 'retired'))
);

CREATE TABLE IF NOT EXISTS hrx_leave_policy_assignments (
  tenant_id TEXT NOT NULL,
  policy_assignment_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  employee_id TEXT,
  organization_id TEXT,
  employment_type TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, policy_assignment_id),
  FOREIGN KEY (tenant_id, policy_version_id) REFERENCES hrx_leave_policy_versions (tenant_id, policy_version_id),
  CONSTRAINT hrx_leave_policy_assignment_target_check CHECK (
    employee_id IS NOT NULL OR organization_id IS NOT NULL OR employment_type IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS hrx_work_schedule_profiles (
  tenant_id TEXT NOT NULL,
  schedule_profile_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  weekly_schedule_json TEXT NOT NULL,
  holiday_calendar_ref TEXT,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, schedule_profile_id)
);

CREATE TABLE IF NOT EXISTS hrx_work_schedule_assignments (
  tenant_id TEXT NOT NULL,
  schedule_assignment_id TEXT NOT NULL,
  schedule_profile_id TEXT NOT NULL,
  employee_id TEXT,
  organization_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, schedule_assignment_id),
  FOREIGN KEY (tenant_id, schedule_profile_id) REFERENCES hrx_work_schedule_profiles (tenant_id, schedule_profile_id),
  CONSTRAINT hrx_work_schedule_assignment_target_check CHECK (employee_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS hrx_leave_entitlements (
  tenant_id TEXT NOT NULL,
  entitlement_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  granted_minutes INTEGER NOT NULL,
  valid_from TEXT NOT NULL,
  expires_on TEXT,
  source_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, entitlement_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id),
  FOREIGN KEY (tenant_id, group_id) REFERENCES hrx_leave_groups (tenant_id, group_id),
  FOREIGN KEY (tenant_id, policy_version_id) REFERENCES hrx_leave_policy_versions (tenant_id, policy_version_id),
  CONSTRAINT hrx_leave_entitlements_minutes_check CHECK (granted_minutes > 0)
);

CREATE TABLE IF NOT EXISTS hrx_leave_accrual_rules (
  tenant_id TEXT NOT NULL,
  accrual_rule_id TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  rule_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, accrual_rule_id),
  UNIQUE (tenant_id, rule_code),
  FOREIGN KEY (tenant_id, policy_version_id) REFERENCES hrx_leave_policy_versions (tenant_id, policy_version_id),
  CONSTRAINT hrx_leave_accrual_rules_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS hrx_leave_accrual_runs (
  tenant_id TEXT NOT NULL,
  accrual_run_id TEXT NOT NULL,
  accrual_rule_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  period_key TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  source_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  preview_run_id TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  result_json TEXT NOT NULL DEFAULT '{}',
  executed_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, accrual_run_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, accrual_rule_id) REFERENCES hrx_leave_accrual_rules (tenant_id, accrual_rule_id),
  CONSTRAINT hrx_leave_accrual_runs_mode_check CHECK (mode IN ('preview', 'execute'))
);

CREATE TABLE IF NOT EXISTS hrx_approval_requests (
  tenant_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  applicant_employee_id TEXT NOT NULL,
  state TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, approval_id),
  UNIQUE (tenant_id, object_type, object_id),
  CONSTRAINT hrx_approval_requests_leave_only_check CHECK (object_type = 'LeaveRequest')
);

CREATE TABLE IF NOT EXISTS hrx_approval_steps (
  tenant_id TEXT NOT NULL,
  approval_step_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  state TEXT NOT NULL,
  decision_actor_id TEXT,
  decision_reason TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, approval_step_id),
  UNIQUE (tenant_id, approval_id, step_order),
  FOREIGN KEY (tenant_id, approval_id) REFERENCES hrx_approval_requests (tenant_id, approval_id)
);

CREATE TABLE IF NOT EXISTS hrx_approval_assignments (
  tenant_id TEXT NOT NULL,
  approval_assignment_id TEXT NOT NULL,
  approval_step_id TEXT NOT NULL,
  approver_actor_id TEXT NOT NULL,
  organization_scope_id TEXT,
  source_assignment_version TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, approval_assignment_id),
  FOREIGN KEY (tenant_id, approval_step_id) REFERENCES hrx_approval_steps (tenant_id, approval_step_id)
);

CREATE TABLE IF NOT EXISTS hrx_approval_delegations (
  tenant_id TEXT NOT NULL,
  delegation_id TEXT NOT NULL,
  delegator_actor_id TEXT NOT NULL,
  delegate_actor_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  organization_scope_id TEXT,
  valid_from TEXT NOT NULL,
  valid_to TEXT NOT NULL,
  revoked_at TEXT,
  expired_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, delegation_id),
  CONSTRAINT hrx_approval_delegation_identity_check CHECK (delegator_actor_id <> delegate_actor_id),
  CONSTRAINT hrx_approval_delegation_leave_only_check CHECK (object_type = 'LeaveRequest')
);

CREATE TABLE IF NOT EXISTS hrx_approval_escalations (
  tenant_id TEXT NOT NULL,
  escalation_id TEXT NOT NULL,
  approval_step_id TEXT NOT NULL,
  substitute_actor_id TEXT NOT NULL,
  due_at TEXT NOT NULL,
  state TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, escalation_id),
  FOREIGN KEY (tenant_id, approval_step_id) REFERENCES hrx_approval_steps (tenant_id, approval_step_id)
);

CREATE TABLE IF NOT EXISTS hrx_leave_request_segments (
  tenant_id TEXT NOT NULL,
  segment_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  segment_date TEXT NOT NULL,
  scheduled_minutes INTEGER NOT NULL,
  requested_minutes INTEGER NOT NULL,
  timezone TEXT NOT NULL,
  schedule_profile_id TEXT NOT NULL,
  schedule_snapshot_hash TEXT NOT NULL,
  work_periods_json TEXT NOT NULL DEFAULT '[]',
  leave_periods_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, segment_id),
  UNIQUE (tenant_id, request_id, segment_date),
  FOREIGN KEY (tenant_id, request_id) REFERENCES hrx_leave_requests (tenant_id, request_id),
  FOREIGN KEY (tenant_id, schedule_profile_id) REFERENCES hrx_work_schedule_profiles (tenant_id, schedule_profile_id),
  CONSTRAINT hrx_leave_request_segments_minutes_check CHECK (
    requested_minutes > 0 AND requested_minutes <= scheduled_minutes
  )
);

CREATE TABLE IF NOT EXISTS hrx_leave_request_allocations (
  tenant_id TEXT NOT NULL,
  allocation_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  entitlement_id TEXT NOT NULL,
  allocation_phase TEXT NOT NULL,
  allocation_round INTEGER NOT NULL DEFAULT 1,
  amount_minutes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, allocation_id),
  UNIQUE (tenant_id, request_id, entitlement_id, allocation_phase, allocation_round),
  FOREIGN KEY (tenant_id, request_id) REFERENCES hrx_leave_requests (tenant_id, request_id),
  FOREIGN KEY (tenant_id, entitlement_id) REFERENCES hrx_leave_entitlements (tenant_id, entitlement_id),
  CONSTRAINT hrx_leave_request_allocations_phase_check CHECK (allocation_phase IN ('reserved', 'used', 'released')),
  CONSTRAINT hrx_leave_request_allocations_round_check CHECK (allocation_round > 0),
  CONSTRAINT hrx_leave_request_allocations_minutes_check CHECK (amount_minutes > 0)
);

CREATE TABLE IF NOT EXISTS hrx_leave_reschedule_proposals (
  tenant_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  proposed_start_date TEXT NOT NULL,
  proposed_end_date TEXT NOT NULL,
  legal_reason TEXT NOT NULL,
  state TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  responded_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, proposal_id),
  FOREIGN KEY (tenant_id, request_id) REFERENCES hrx_leave_requests (tenant_id, request_id)
);

CREATE TABLE IF NOT EXISTS hrx_leave_command_receipts (
  tenant_id TEXT NOT NULL,
  command_receipt_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  command_type TEXT NOT NULL,
  request_id TEXT,
  input_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, command_receipt_id),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS hrx_leave_request_attachments (
  tenant_id TEXT NOT NULL,
  attachment_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  access_level TEXT NOT NULL,
  verification_state TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, attachment_id),
  UNIQUE (tenant_id, request_id, document_id),
  FOREIGN KEY (tenant_id, request_id) REFERENCES hrx_leave_requests (tenant_id, request_id),
  FOREIGN KEY (tenant_id, document_id) REFERENCES hrx_documents (tenant_id, document_id)
);

CREATE TABLE IF NOT EXISTS hrx_leave_termination_reconciliations (
  tenant_id TEXT NOT NULL,
  reconciliation_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  termination_date TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  result_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TEXT,
  PRIMARY KEY (tenant_id, reconciliation_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id)
);

CREATE TABLE IF NOT EXISTS hrx_leave_promotion_campaigns (
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL,
  reference_date TEXT NOT NULL,
  state TEXT NOT NULL,
  legal_schedule_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, campaign_id),
  FOREIGN KEY (tenant_id, policy_version_id) REFERENCES hrx_leave_policy_versions (tenant_id, policy_version_id)
);

CREATE TABLE IF NOT EXISTS hrx_leave_promotion_recipients (
  tenant_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  document_id TEXT,
  delivery_evidence_hash TEXT,
  response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, recipient_id),
  UNIQUE (tenant_id, campaign_id, employee_id),
  FOREIGN KEY (tenant_id, campaign_id) REFERENCES hrx_leave_promotion_campaigns (tenant_id, campaign_id),
  FOREIGN KEY (tenant_id, employee_id) REFERENCES hrx_employees (tenant_id, employee_id)
);

CREATE TABLE IF NOT EXISTS hrx_leave_sync_outbox (
  tenant_id TEXT NOT NULL,
  outbox_event_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, outbox_event_id),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_leave_ledger_idempotency
  ON hrx_leave_balance_entries (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_leave_ledger_reversal
  ON hrx_leave_balance_entries (tenant_id, reverses_entry_id)
  WHERE reverses_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hrx_leave_entitlements_expiry
  ON hrx_leave_entitlements (tenant_id, employee_id, group_id, expires_on, valid_from);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_requests_state
  ON hrx_leave_requests (tenant_id, state, start_date);

CREATE INDEX IF NOT EXISTS idx_hrx_approval_steps_pending
  ON hrx_approval_steps (tenant_id, state, approval_id, step_order);

CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_balance_entries_immutable_update
BEFORE UPDATE ON hrx_leave_balance_entries
BEGIN
  SELECT RAISE(ABORT, 'hrx_leave_balance_entries is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_balance_entries_immutable_delete
BEFORE DELETE ON hrx_leave_balance_entries
BEGIN
  SELECT RAISE(ABORT, 'hrx_leave_balance_entries is append-only');
END;
