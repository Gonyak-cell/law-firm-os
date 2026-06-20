# HRX Sequential PR Board

Status: PR-00 governance baseline
Date: 2026-06-20
Canonical source: `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_04_PR_SEQUENCE.md`
Backlog source: `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv`

## Sequence Rules

- Implement PR-00 through PR-15 in order.
- Do not start a later PR implementation until the prior PR gate has current repo evidence or an owner decision changes the sequence.
- PR-15 prepares a decision package; it does not self-authorize go-live.

| PR | Branch | Layer | TUWs | P0 | P1 | Scope | Exit criteria |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| PR-00 | `codex/hrx-roadmap-governance` | L0 | 8 | 4 | 4 | Boundary, source-of-truth, no-premature-claim validators | Roadmap docs + release gate baseline |
| PR-01 | `codex/hrx-db-repository-foundation` | L1 | 0 | 0 | 0 | DB adapter, SQL repository, migration runner | Employee/Employment/UserLink durable |
| PR-02 | `codex/hrx-doc-leave-audit-persistence` | L1/L2 | 0 | 0 | 0 | Document, Leave, Audit tables and stores | Restart durable HR docs/leave/audit |
| PR-03 | `codex/hrx-route-authz-enforcement` | L2 | 0 | 0 | 0 | Route policy map and HRX authz middleware | All /api/hrx routes deny-by-default |
| PR-04 | `codex/hrx-step-up-sensitive-routes` | L2 | 0 | 0 | 0 | MFA/step-up enforcement | Comp/eval/payroll/audit protected |
| PR-05 | `codex/hrx-context-hardening` | L2/L5 | 0 | 0 | 0 | Tenant/actor context and UI client cleanup | No hardcoded tenant/scopes |
| PR-06 | `codex/hrx-document-source-boundary` | L3 | 0 | 0 | 0 | Document source adapter and source verification | Metadata-only with source status |
| PR-07 | `codex/hrx-core-domain-expansion` | L3 | 0 | 0 | 0 | Org/assignment/compensation/retention/legal hold/people graph | Core HRIS domain complete enough for workflows |
| PR-08 | `codex/hrx-workflow-leave-payroll` | L4 | 0 | 0 | 0 | Leave, attendance, overtime, payroll export workflow | Workflow durable + audited |
| PR-09 | `codex/hrx-recruiting-lifecycle` | L4 | 0 | 0 | 0 | ATS, candidate consent, offer, conversion, lifecycle | Candidate privacy preserved |
| PR-10 | `codex/hrx-portal-ui-hardening` | L5 | 0 | 0 | 0 | People/Candidate/Admin UI production states | API-backed UI e2e |
| PR-11 | `codex/hrx-lifecycle-ui` | L5 | 0 | 0 | 0 | Onboarding/offboarding/lifecycle UI | HR ops board e2e |
| PR-12 | `codex/hrx-ai-analytics-hardening` | L6 | 14 | 5 | 9 | AI source ingestion, citations, review queue, analytics snapshots | No-final-judgment + source-grounded |
| PR-13 | `codex/hrx-enterprise-controls` | L7 | 0 | 0 | 0 | SSO/SCIM/MFA, tenant isolation, observability, compliance | Enterprise control evidence operational |
| PR-14 | `codex/hrx-dr-uat-readiness` | L7 | 0 | 0 | 0 | Backup/restore, UAT execution, security/perf smoke | Readiness validators pass |
| PR-15 | `codex/hrx-release-go-no-go` | L8 | 10 | 5 | 5 | Cutover, go/no-go, release evidence pack | Owner decision-ready, no self-approval |
