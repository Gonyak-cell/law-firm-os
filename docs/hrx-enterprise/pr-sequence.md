# HRX PR Sequence

Status: release-package-ready
Date: 2026-06-19

## Sequence

| PR Lane | Packs | Gate Before Merge | Exit Evidence |
| --- | --- | --- | --- |
| PR-01 | HRX-P01 Boundary, HRX-P02 Governance | Plan intake accepted | Boundary docs and runtime readiness validator fail-closed behavior |
| PR-02 | HRX-P03 Runtime Core A | PR-01 merged | Schema, repository, migration, Employee/User separation tests |
| PR-03 | HRX-P04 Runtime Core B | PR-02 merged | Service shell, tenant/actor context, validators, fixture seed dry-run |
| PR-04 | HRX-P05 Trust Boundary A, HRX-P06 Trust Boundary B | PR-03 merged | HRX scopes, ABAC, compensation/evaluation/candidate policies, audit append, masking, break-glass |
| PR-05 | HRX-P07 Core HRIS A, HRX-P08 Core HRIS B | PR-04 merged | Employee/profile/org/assignment/docs/contracts/comp/payroll boundary/retention/people graph |
| PR-06 | HRX-P09 Workflow A | PR-05 merged | Leave, attendance, overtime workflow state and audit evidence |
| PR-07 | HRX-P10 Workflow B | PR-06 merged | Recruiting, candidate, application, interview, offer boundaries |
| PR-08 | HRX-P11 Workflow C | PR-07 merged | Onboarding, offboarding, risk, legal, approval, Matter HR risk link |
| PR-09 | HRX-P12 Portal API A, HRX-P13 Portal API B | PR-08 merged | API-backed People portal, approvals, candidate, recruiting, policy, audit viewer |
| PR-10 | HRX-P14 AI Analytics A, HRX-P15 AI Analytics B | PR-09 merged | Source-grounded AI, human review queue, analytics, workload projection |
| PR-11 | HRX-P16 Hardening A, HRX-P17 Hardening B | PR-10 merged | SSO, step-up, SCIM, tenant isolation, observability, compliance, UAT, enterprise readiness |
| PR-12 | HRX-P18 Release Adoption | PR-11 merged | Cutover, rollback, feature flags, no-go checklist, developer handoff receipt |

## Dependency Rule

Each PR lane must merge only after its gate command set passes on current repo state. Later PR lanes must not reopen payroll calculation, final HR AI decisions, raw HR document body storage, Employee/User conflation, or static UI fallback paths.

## Release Authority

PR-12 prepares the release decision package. Human release authority signs go-live separately after reviewing `docs/hrx-enterprise/go-live-checklist.md`.
