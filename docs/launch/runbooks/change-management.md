# Change Management Procedure

Status: draft_blocked_pending_l3_w02_cicd_and_deployment_pipeline
Work package: LT-L6-W05
TUW: LT-L6-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This procedure is an operating draft. It does not create CI/CD, does not deploy
to staging or production, does not process a real change, and does not claim
LT-L6-W05 or LT-L6-W05-T01 completion.

Actual change demonstration depends on `LT-L3-W02` CI/CD and deployment
pipeline evidence plus `LT-L6-W05-T02` tabletop/change-processing evidence.

## Policy Change Principle

Contracts and policy descriptors are not currently runtime-loaded policy state.
Therefore a permission, audit, AI, retention, or routing policy change is
treated as a code/deployment change unless an approved future runtime policy
store changes that model.

| Rule | Required behavior |
| --- | --- |
| Policy change equals code deploy | Policy-affecting changes require approval, CI, deployment, and regression evidence. |
| No document-only mutation | Editing docs, IA files, or contract JSON does not by itself change live runtime policy. |
| No bypass path | Direct production edits, unreviewed scripts, and local-only fixture edits are not approved operating paths. |
| Evidence before closure | A change is not closed until verification evidence and rollback readiness are attached. |

## Change Procedure

| ID | Step | Required inputs | Required outputs | Blocked without |
| --- | --- | --- | --- | --- |
| CM-STEP-01 | Approval | change request, risk class, owner, affected modules, rollback plan, data/permission/audit impact | approved/rejected decision with reason and approver role | LT-L1-W05 approval governance |
| CM-STEP-02 | CI | approved branch/commit, deterministic gate list, secret-scan expectation where applicable | CI/log evidence for required gates and failed-gate disposition | LT-L3-W02 PR gate pipeline |
| CM-STEP-03 | Deploy | approved artifact, target environment, migration notes, rollback version | deployment log, version identifier, health check result | LT-L3-W02 staging/production pipeline |
| CM-STEP-04 | Regression | affected regression map, smoke/E2E checks, audit/permission checks, rollback readiness | regression checklist, pass/fail record, release note, closure decision | runtime environment and test evidence |

## CP-Era Gate Succession

| ID | Gate | Command or evidence | Required use |
| --- | --- | --- | --- |
| CP-GATE-01 | Root tests | `npm test` | Required before merge or release candidate unless explicitly waived by owner-approved emergency process. |
| CP-GATE-02 | Product contract validation | `npm run validate` | Required for contract/schema changes. |
| CP-GATE-03 | Weighted ledger validation | `npm run weighted:validate` | Required when implementation ledger, scope, or production-ready claims are touched. |
| CP-GATE-04 | Closeout pack validation | `npm run closeout-pack:validate` | Required when closeout/goal evidence or pack-derived gates are touched. |
| CP-GATE-05 | Web build | `npm run build` | Required for UI/web changes and release candidate promotion. |
| CP-GATE-06 | Path sign-off | owner-approved path/scope note | Required when a change crosses module, runtime, security, data, or launch-gate boundaries. |
| CP-GATE-07 | Backup/rollback readiness | backup and rollback reference | Required before staging/production deployment. |

## Permission Policy Regression Map

| ID | Area | Required regression check |
| --- | --- | --- |
| REG-CHANGE-01 | UI | Denied/review_required states still render fail-closed and do not expose protected content. |
| REG-CHANGE-02 | API | Direct unauthorized API calls deny without leaking object detail or restricted counts. |
| REG-CHANGE-03 | Search | Restricted objects remain absent from search results and AI source pickers. |
| REG-CHANGE-04 | Portal | Internal notes, email, AI output, HR, and restricted matter data remain hidden from portal users. |
| REG-CHANGE-05 | AI | Wave 1 AI remains off; later AI source scope cannot exceed actor permissions. |
| REG-CHANGE-06 | Vault | Export/import excludes unauthorized or wall-restricted content and preserves source-of-truth boundaries. |
| REG-CHANGE-07 | HR | Salary, evaluation, candidate, payroll, and HR sensitive data stay under separate gate. |

## Change Record Template

| Field | Required |
| --- | --- |
| Change ID | yes |
| Owner | yes |
| Risk class | yes |
| Affected modules | yes |
| Approval reference | yes |
| Commit/artifact reference | yes |
| CI evidence | yes |
| Deployment evidence | yes when deployment exists |
| Regression evidence | yes |
| Rollback reference | yes |
| Closure decision | yes |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No CI/CD pipeline evidence | LT-L3-W02 is not complete. |
| No deployment environment evidence | Staging/production deployment and health checks are not available from this draft. |
| No real change demonstration | LT-L6-W05-T02 remains pending. |
| No owner approval synthesized | This draft does not create a launch-decision-register approval row. |
