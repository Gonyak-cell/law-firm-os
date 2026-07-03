CREATE TABLE IF NOT EXISTS hrx_job_openings (
  tenant_id TEXT NOT NULL,
  job_opening_id TEXT NOT NULL,
  title TEXT NOT NULL,
  department_ref TEXT NOT NULL,
  hiring_manager_employee_id TEXT NOT NULL,
  position_count INTEGER NOT NULL,
  state TEXT NOT NULL,
  approval_ref TEXT,
  opened_at TEXT,
  closed_at TEXT,
  PRIMARY KEY (tenant_id, job_opening_id)
);

CREATE TABLE IF NOT EXISTS hrx_candidates (
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source_ref TEXT NOT NULL,
  resume_ref TEXT,
  retention_policy_id TEXT NOT NULL,
  retention_basis TEXT NOT NULL,
  data_subject_type TEXT NOT NULL,
  crm_party_linked INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS hrx_candidate_consents (
  tenant_id TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  evidence_ref TEXT NOT NULL,
  PRIMARY KEY (tenant_id, consent_id)
);

CREATE TABLE IF NOT EXISTS hrx_applications (
  tenant_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  job_opening_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  stage_reason TEXT,
  PRIMARY KEY (tenant_id, application_id)
);

CREATE TABLE IF NOT EXISTS hrx_interviews (
  tenant_id TEXT NOT NULL,
  interview_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  schedule_source_ref TEXT NOT NULL,
  interviewer_employee_ids_json TEXT NOT NULL,
  state TEXT NOT NULL,
  feedback_source_ref TEXT,
  restricted_access INTEGER NOT NULL,
  sensitivity TEXT NOT NULL,
  PRIMARY KEY (tenant_id, interview_id)
);

CREATE TABLE IF NOT EXISTS hrx_offers (
  tenant_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  compensation_ref TEXT NOT NULL,
  document_ref TEXT NOT NULL,
  state TEXT NOT NULL,
  approval_ref TEXT,
  compensation_restricted INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, offer_id)
);

CREATE TABLE IF NOT EXISTS hrx_onboarding_plans (
  tenant_id TEXT NOT NULL,
  onboarding_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  tasks_json TEXT NOT NULL,
  document_refs_json TEXT NOT NULL,
  access_requests_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, onboarding_id)
);

CREATE TABLE IF NOT EXISTS hrx_offboarding_cases (
  tenant_id TEXT NOT NULL,
  offboarding_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  separation_date TEXT NOT NULL,
  state TEXT NOT NULL,
  access_revocations_json TEXT NOT NULL,
  document_returns_json TEXT NOT NULL,
  legal_hold_checks_json TEXT NOT NULL,
  matter_reassignments_json TEXT NOT NULL,
  handover_items_json TEXT NOT NULL,
  PRIMARY KEY (tenant_id, offboarding_id)
);
