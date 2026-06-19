# L2 Trust Boundary Blocker Survey

Status: blocked_pending_l0_l1_decisions_persistence_and_auth_runtime

Work package: LT-L2-W02

Terminal TUW: LT-L2-W02-T14

Gate binding: G2, L2-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:03:06Z

## Boundary

This survey records why LT-L2-W02 cannot close from current repo evidence. It
does not implement Entra/MSAL/NAA auth, does not remove the current
`x-lawos-permission-context` header path, does not create server-side principal
resolution, and does not satisfy G2 or L2-EXIT.

## Dependency State

| Dependency | Current audit status | Impact on W02 |
| --- | --- | --- |
| LT-L0-W02 | `in_progress` / `command_evidence_only_recorded` | W02 is provisional and must be rebaselined after the runtime gap report. |
| LT-L1-W02 | `decision_round_brief_blocked_pending_owner_decisions` | Critical OQ/PRD8 owner decisions, including role hierarchy and Graph scope, are not approved. |
| LT-L1-W06 | `decision_brief_blocked_pending_owner_hosting_decision` | DB, WORM, hosting, and monitoring decisions are not owner-approved. |
| LT-L2-W01 | `blocked_pending_l1_w06_hosting_decision_and_persistence_implementation` | Persistent audit store, tenant repositories, and unit-of-work foundations are absent. |

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| Auth source directory | absent | `find apps/api/src -maxdepth 2 -type d -name auth \| wc -l` returned `0` |
| Auth/session/MSAL/token tests | absent | `find apps/api/test ... '*auth*'/'*session*'/'*token*'/'*msal*'/'*naa*' \| wc -l` returned `0` |
| Header-injected permission context | present | `apps/api/src/server.js` imports `PERMISSION_CONTEXT_HEADER` and calls `parsePermissionContext(req.headers[PERMISSION_CONTEXT_HEADER])` |
| Current permission gate | client-supplied context | `apps/api/src/permission-gate.js` documents `x-lawos-permission-context` as caller-supplied JSON |

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L2-W02-T01 | Trust boundary architecture decision and design note | L0/L1 owner decisions and register entries absent | blocked |
| LT-L2-W02-T02 | Fail-closed token middleware and synthetic issuer | T01 decision absent; `apps/api/src/auth` absent | blocked |
| LT-L2-W02-T03 | Session lifecycle and Login audit | T02 and persistent audit store absent | blocked |
| LT-L2-W02-T04 | MSAL/NAA token acquisition adapter | T02 synthetic issuer absent | blocked |
| LT-L2-W02-T05 | Tenant bootstrap and tenant-context resolution | T02 and L2-W01 tenant repositories absent | blocked |
| LT-L2-W02-T06 | Server-side principal and role resolver | T03/T05 absent | blocked |
| LT-L2-W02-T07 | Server-side permission context builder | T06 and persistence policy/ACL repositories absent | blocked |
| LT-L2-W02-T08 | Remove `x-lawos-permission-context` injection path | T07 replacement path absent; current header path still present | blocked |
| LT-L2-W02-T09 | 10-step permission evaluation pipeline | T07 absent | blocked |
| LT-L2-W02-T10 | Classification and action-type evaluation | T09 plus PRE-W05 decided enum absent | blocked |
| LT-L2-W02-T11 | Permission-evaluation audit writer | T09 and L2-W01 persistent audit store absent | blocked |
| LT-L2-W02-T12 | Permission golden-case regression suite | T10/T11 absent | blocked |
| LT-L2-W02-T13 | Route-wide fail-closed integration | T08/T11 absent | blocked |
| LT-L2-W02-T14 | W02 gate evidence assembly | T01-T13 runtime evidence absent | blocked |

## Next Required Actions

1. Obtain or record owner-backed decisions for LT-L0-W02, LT-L1-W02, and
   LT-L1-W06 before finalizing the W02 trust-boundary architecture.
2. Complete LT-L2-W01 persistence foundations, especially persistent audit,
   tenant repositories, and unit-of-work support.
3. Implement auth middleware, synthetic issuer, session/audit wiring, and
   server-side permission context before removing the current header path.
4. Re-run W02 verification commands only after T01-T13 have real code and
   tests.
