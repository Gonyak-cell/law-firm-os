# Hands-On Training Environment

Status: draft_blocked_pending_l4_w01_staging_e2e_role_accounts_seed_loader_and_reset_roundtrip
Work package: LT-L7-W04
TUW: LT-L7-W04-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a hands-on environment specification draft only. It does not create
staging accounts, does not log in as any user, does not load seed data, does
not scan for real data, does not execute reset or reseed, and does not claim
LT-L7-W04-T02 or LT-L7-W04 completion.

The executable environment depends on WP:LT-L4-W01 staging synthetic-seed E2E
and the prerequisite runtime routes for login, matter creation, document
filing, Work Queue processing, and audit read. Until those exist, this file is
the required setup contract and verification checklist, not completion proof.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| HANDS-SRC-01 | `../../../training/wave1/index.md` | Training source index |
| HANDS-SRC-02 | `../../../training/wave1/screen-flows.md` | Role and screen flow source |
| HANDS-SRC-03 | `../../../product-ui/glossary.md` | UI terminology and forbidden copy source |
| HANDS-SRC-04 | `lawyer-guide.md` | Lawyer training flow |
| HANDS-SRC-05 | `staff-guide.md` | Staff training flow |
| HANDS-SRC-06 | `admin-guide.md` | Admin training flow |
| HANDS-SRC-07 | `../../../launch/runbooks/permission-request-procedure.md` | Access-change route |
| HANDS-SRC-08 | `../../../launch/runbooks/incident-response-runbook.md` | Incident route |

## Environment Contract

| Contract ID | Requirement | Draft value | Evidence required before close |
| --- | --- | --- | --- |
| HANDS-ENV-01 | Environment | staging only | Approved staging URL and deployment/build identifier |
| HANDS-ENV-02 | Dataset boundary | synthetic-only | Automated or manual scan proving real-data count 0 |
| HANDS-ENV-03 | Authentication | role-based synthetic accounts | Login evidence for lawyer, staff, and admin accounts |
| HANDS-ENV-04 | Storage boundary | `file_ref` opaque; no raw links | MAT-DEC-03-compatible storage/link behavior or pending marker |
| HANDS-ENV-05 | AI boundary | Wave 1 AI off/dark | Screenshot or config dump showing no AI prompt/output controls |
| HANDS-ENV-06 | Audit boundary | training actions produce audit-readable references when runtime exists | Audit read proof for filing, task, permission, and reset actions |

## Role Account Templates

These rows are account templates, not created users and not credentials.

| Account ID | Role | Required access | Required login proof before close | Current state |
| --- | --- | --- | --- | --- |
| HANDS-ACCOUNT-01 | lawyer | Synthetic matters 001-003; Work Queue approval/review lanes; Issue Ledger legal fields | Login timestamp, session role, visible Matter Home and Work Queue screenshots with synthetic labels | not_created |
| HANDS-ACCOUNT-02 | staff | Synthetic matters 001-003; Document Workspace metadata; filing support lanes; no legal resolution fields | Login timestamp, session role, visible Document Workspace and Outlook Add-in Pane screenshots with synthetic labels | not_created |
| HANDS-ACCOUNT-03 | admin | Synthetic users, permission view, policy read, audit read; no policy mutation | Login timestamp, session role, visible Admin Console read surfaces with synthetic labels | not_created |

## Synthetic Seed Plan

The seed plan must meet or exceed the T02 minimum: 3 matters, 10 documents,
and 10 emails. Each record needs an explicit synthetic marker before use.

| Matter ID | Scenario | Target documents | Target emails | Required screens |
| --- | --- | --- | --- | --- |
| HANDS-MATTER-001 | Closing checklist and deadline review | 4 | 4 | Matter Home, Work Queue, Document Workspace |
| HANDS-MATTER-002 | Filing correction and issue triage | 3 | 3 | Outlook Add-in Pane, Issue Ledger, Support route |
| HANDS-MATTER-003 | Permission denied and audit read | 3 | 3 | Document Workspace, Admin Console, Audit Read |

| Seed Object ID | Required count | Synthetic marker | Current state |
| --- | --- | --- | --- |
| HANDS-SEED-MATTER | 3 | `synthetic_training=true` and `training_scenario_id` | not_loaded |
| HANDS-SEED-DOCUMENT | 10 | `synthetic_training=true`, `file_ref`, and no raw link | not_loaded |
| HANDS-SEED-EMAIL | 10 | `synthetic_training=true` and no message body copied into docs | not_loaded |
| HANDS-SEED-TASK | 6 or more | `synthetic_training=true` and role assignment | not_loaded |
| HANDS-SEED-ISSUE | 3 or more | `synthetic_training=true` and source-safe id | not_loaded |
| HANDS-SEED-AUDIT | runtime-generated | actor, target, before/after where applicable, reason | not_available_pending_runtime |

## Scenario Matrix

| Scenario ID | Primary role | Flow | Expected handoff |
| --- | --- | --- | --- |
| HANDS-SCENARIO-01 | lawyer | Matter Home review -> Work Queue approval/review -> Issue Ledger update | Completion check in `lawyer-guide.md` |
| HANDS-SCENARIO-02 | staff | Document Workspace metadata check -> filing support -> misfiling support route | Completion check in `staff-guide.md` |
| HANDS-SCENARIO-03 | admin | Admin Console read -> permission request route -> audit read check | Completion check in `admin-guide.md` |

## Reset And Reseed Procedure

This procedure is the required future reset contract. It has not been executed.

| Reset ID | Step | Required proof before close | Current state |
| --- | --- | --- | --- |
| HANDS-RESET-01 | Freeze training writes and record the environment/build identifier. | Timestamped freeze note | not_executed |
| HANDS-RESET-02 | Export or snapshot only the synthetic training namespace if runtime supports it. | Snapshot or export reference with synthetic marker scope | not_executed |
| HANDS-RESET-03 | Delete training namespace data through approved staging reset tooling only. | Reset command/log and affected synthetic counts | not_executed |
| HANDS-RESET-04 | Run real-data guard scan and require count 0 before reseed. | Scan output with non-synthetic count 0 | not_executed |
| HANDS-RESET-05 | Reseed the three matters, 10 documents, 10 emails, task, issue, and audit-ready metadata. | Seed count output and marker check | not_executed |
| HANDS-RESET-06 | Log in as each role and perform a smoke pass on assigned screens. | Lawyer, staff, and admin login and screen proof | not_executed |

## Verification Checklist

| Verification ID | T02 criterion | Required future evidence | Current state |
| --- | --- | --- | --- |
| HANDS-VERIFY-01 | Role accounts exist and login is confirmed for lawyer, staff, and admin. | 3 login proofs with timestamps and synthetic labels | pending_staging_accounts |
| HANDS-VERIFY-02 | Synthetic seed has 3 or more matters, 10 or more documents, and 10 or more emails. | Seed count output | pending_seed_loader |
| HANDS-VERIFY-03 | Training environment has real-data count 0. | Synthetic marker scan with non-synthetic count 0 | pending_real_data_guard_scan |
| HANDS-VERIFY-04 | Reset then reseed completes once. | Reset log, reseed log, and post-reseed smoke proof | pending_reset_roundtrip |

## Non-Weakening Rationale

The draft keeps the environment safer than a live pilot because it requires
staging-only execution, synthetic markers on every training object, no raw file
links, no real mailbox content, no AI prompt or generated output, no direct
permission mutation, and no completion claim until login, seed, real-data guard,
and reset round-trip evidence exists.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| WP:LT-L4-W01 | Wave 1 staging synthetic-seed E2E is not complete. |
| LT-L7-W04-T02 runtime execution | No role accounts, seed load, login proof, real-data guard scan, or reset round-trip evidence exists. |
| MAT-DEC-03 | Final storage/link policy remains pending; `file_ref` must stay opaque. |
| Pilot roster | Final training users and named attendees are not confirmed here. |
