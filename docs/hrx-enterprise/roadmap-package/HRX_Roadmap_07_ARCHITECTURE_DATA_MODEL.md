# HRX Target Architecture and Data Model

## Target architecture

```text
apps/web
  people/*, candidate/*, admin/hrx/*
    -> apps/api /api/hrx/*
       -> tenant/actor/session context
       -> hrx route authz policy
       -> step-up for sensitive actions
       -> packages/hrx service layer
       -> DB-backed repository
       -> durable audit event store
```

## Required persistent entities

| Entity | Table / module | Notes |
|---|---|---|
| Employee | hrx_employees / packages/hrx/src/schema.js | Employee master, not IAM User |
| EmployeeUserLink | hrx_employee_user_links / identity-link.js | login_mapping only |
| EmploymentProfile | hrx_employment_profiles | effective-dated employment data |
| HRDocument | hrx_documents / documents.js | metadata/source_ref only |
| LeaveBalanceEntry | hrx_leave_balance_entries | ledger-based balance |
| LeaveRequest | hrx_leave_requests | workflow state |
| ApprovalRequest | hrx_approval_requests | manager/HR/legal approval |
| Candidate | hrx_candidates | separate from Party/CRM |
| Application | hrx_applications | recruiting lifecycle |
| Offer | hrx_offers | masked compensation ref |
| PayrollExport | hrx_payroll_exports | preview/review/export, no calculation |
| HRAuditEvent | hrx_audit_events | append-only hash-chain |
| HRAIReviewItem | hrx_ai_review_items | durable human review queue |
| HRRetentionPolicy | hrx_retention_policies | purge/legal hold policy |
| LegalHold | hrx_legal_holds | blocks purge/delete |

## Sensitive route rules

| Sensitivity | Required scope | Step-up |
|---|---|---|
| employee | hrx.employee.read/write | conditional |
| document | hrx.document.read/write | conditional |
| compensation | hrx.compensation.read/write | required |
| evaluation | hrx.evaluation.read/review/write | required |
| candidate | hrx.candidate.read/write | conditional |
| payroll | hrx.payroll.preview/export | required |
| audit | hrx.audit.read/append | required |
