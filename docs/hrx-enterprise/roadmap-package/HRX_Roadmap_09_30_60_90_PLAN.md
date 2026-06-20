# HRX 30/60/90 Day Execution Plan

## 30 days: P0 runtime foundation

| Week | Work | Exit criteria |
|---|---|---|
| W1 | DB adapter, SQL repository, migration runner | Employee/Employment/UserLink durable CRUD |
| W2 | Document/Leave/Audit durable stores | Document body blocked, leave/audit restart durability |
| W3 | Route-level authz | all HRX routes have action/scope/sensitivity map |
| W4 | Step-up and context hardening | sensitive route 403 without MFA; no query tenant/actor |

## 60 days: People Operations runtime

| Area | Deliverables |
|---|---|
| HR Documents | source adapter, version/signature/source verification |
| Payroll | preview -> human review -> export artifact; no calculation/disbursement |
| Recruiting | candidate consent, ATS state machine, offer, conversion gate |
| Lifecycle | onboarding/offboarding/legal hold |
| AI/RAG | source ingestion, citation validation, review queue persistence |
| UI | session context, step-up challenge, e2e tests |

## 90 days: Enterprise readiness

| Area | Deliverables |
|---|---|
| Compliance | access/change/retention report |
| Resilience | backup/restore smoke, DR runbook |
| Observability | metrics/SLO/security regression |
| UAT | executed scenario pack |
| Release | go/no-go checklist and owner decision template |
