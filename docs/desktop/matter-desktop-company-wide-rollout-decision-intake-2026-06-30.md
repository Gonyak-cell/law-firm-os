# matter Desktop Company-Wide Rollout Decision Intake

Status: company-wide-rollout-decision-pending

## Scope

This gate asks whether the LCX VLTUI desktop named-lane production go-live may expand to company-wide internal users and operational workflows.

## Evidence Ready

- Named-lane production go-live receipt: recorded
- Non-Windows approved-scope execution closeout: PASS
- Vault document write execution count: 1
- Real client data migration row count: 1
- HRX production smoke: PASS
- LCX VLTUI production bridge smoke: PASS
- Rollback target identification: possible

## Required Owner Response

Allowed decisions:

- approve_company_wide_rollout
- reject_company_wide_rollout
- request_changes

Required fields:

- decision_maker
- decision
- rollout_scope
- user_population
- operational_workflows
- support_owner
- communications_owner
- rollback_plan_ref
- start_window
- decision_at
- approval_signature_ref
- recorded_by_human

## Boundary

- Company-wide rollout approved: false
- Company-wide rollout executed: false
- Public release: false
- External pilot distribution: false
- Windows Authenticode signing: false
- Vault document writes outside named scope: false
- Real client data migration outside named scope: false
- Unbounded or bulk client data migration: false
