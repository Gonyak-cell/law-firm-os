# Runtime Spine Boundary Map

Status: G0 baseline map
Date: 2026-06-21
Baseline: PR #73 merge commit `41268c4becac7d06948d10c173d30635e108c5e1`

## Layer Categories

| Category | Meaning |
| --- | --- |
| descriptor | planning, contract, fixture, or no-write evidence |
| runtime | executable runtime path with persistence/auth/audit tests |
| mixed | contains runtime-like utilities but is not sufficient for a full runtime_ready claim |
| locked | deliberately unavailable until a later owner decision or gate |

## Existing Repo Surface

| Area | Current Classification | Runtime Spine Treatment |
| --- | --- | --- |
| `contracts/runtime-readiness-contract.json` | descriptor governance contract | source for RTG semantics; do not weaken |
| `docs/closeout-pack-plan/implementation-layer-ledger.json` | descriptor/runtime boundary ledger | preserved as upstream boundary |
| `packages/domain` | descriptor/mixed domain primitives | reuse only through canonical RS-4 mapping |
| `packages/authz` | mixed fail-closed evaluator | RS-2 must derive trusted context server-side before invoking it |
| `packages/audit` | mixed audit utilities and HRX audit support | RS-3 adds non-bypassable durable route coverage |
| `packages/master-data` | descriptor/synthetic fixture surface | RS-4/RS-5 must add durable tenant-scoped repositories before real writes |
| `packages/matter` | descriptor/mixed matter primitives | RS-4 canonical model and RS-5 APIs decide runtime opening |
| `packages/dms` and Matter-Vault R4 | mixed runtime lane with launch receipts absent | keep export/sync boundaries explicit |
| `packages/hrx` | mixed HRX runtime lane with no premature claim guards | HR real data remains blocked by HR owner gate |
| `packages/client-portal` | mixed projection services | Portal stays locked until external ACL/redaction gate |
| `apps/api` | mixed API route surface | RS-5 requires route policy, auth, audit, safe errors |
| `apps/web` | mixed/static and API-backed surfaces | RS-5 must prove core flow uses runtime API |

## Current API Route Inventory

Current route files under `apps/api/src/routes`:

| Route File | Boundary Note |
| --- | --- |
| `audit.js` | audit read/export surface; must remain security-trimmed |
| `crm.js` | CRM runtime context surface; subject to tenant/auth/audit gates |
| `matters.js` | Matter route surface; subject to RS-4/RS-5 canonical model |
| `permission-simulator.js` | read-only simulator; must not write product state |
| `vault.js` | Matter-Vault route surface; launch receipts remain separate |
| `hrx/ai.js` | HRX AI route; locked/sandbox unless HR/AI gates pass |
| `hrx/documents.js` | HR document route; HR-sensitive policy required |
| `hrx/employees.js` | employee route; User/Employee separation required |
| `hrx/leave.js` | HR workflow route; HR real data boundary applies |
| `hrx/lifecycle.js` | HR lifecycle route; step-up/authz/audit required |
| `hrx/payroll.js` | payroll route; production payroll remains separately gated |
| `hrx/recruiting.js` | candidate route; candidate/employee separation required |
| `hrx/route-policy-map.js` | policy map support; must stay aligned with route scanner |

## Locked Future Domains

| Domain | G0 State | Unlock Requirement |
| --- | --- | --- |
| Portal | locked | external user ACL, redaction, secure link evidence |
| Outlook/M365 | locked/sandbox-only | Graph scope and admin consent decision |
| HR real data | locked | HR owner decision and identity separation evidence |
| AI | off/synthetic-only | external AI policy and lawyer-in-control evidence |
| Vault import/sync | locked | export-only proof, source-of-truth decision, migration receipt |

## Baseline Rule

This map is a starting point for RS-PRE. If later implementation discovers a more precise classification, update this file and `runtime-spine-ledger.json` together, then rerun `runtime-spine:plan:validate`.
