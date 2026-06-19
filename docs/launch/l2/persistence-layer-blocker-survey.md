# L2 Persistence Layer Blocker Survey

Status: blocked_pending_l1_w06_hosting_decision_and_persistence_implementation

Work package: LT-L2-W01

Terminal TUW: LT-L2-W01-T11

Gate binding: G2, L2-EXIT

Review policy: review_waived_by_user

Valid review evidence: false

Recorded at: 2026-06-18T13:00:55Z

## Boundary

This survey records why LT-L2-W01 cannot close from current repo evidence. It
does not create a persistence package, does not select a DB or WORM store, does
not run a real persistence test suite, and does not satisfy G2 or L2-EXIT.

The L2 plan marks W01 as provisional and dependent on the L0 runtime gap report
and the L1 hosting/stack decision. Current L1-W06 evidence still says the
hosting, DB, index, WORM, and monitoring choices are owner-decision blocked.

## Current Repo Survey

| Check | Result | Evidence |
| --- | --- | --- |
| `packages/persistence` package | absent | `find packages -maxdepth 1 -type d -name persistence \| wc -l` returned `0` |
| `persistence:test` script | absent | `jq -r '.scripts \| keys[]' package.json \| rg '^persistence:test$' \| wc -l` returned `0` |
| Audit ledger implementation | in-memory | `packages/audit/src/append-only-ledger.js` contains `const events = []` and in-memory maps |
| Hosting/DB/WORM owner decision | blocked | `docs/goal-closeout/lt-l1-w06/command-evidence.json` status is `decision_brief_blocked_pending_owner_hosting_decision` |

## TUW Blocker Matrix

| TUW | Required outcome | Current blocker | Closeout state |
| --- | --- | --- | --- |
| LT-L2-W01-T01 | Persistent audit event store with hash-chain equivalence tests | `packages/persistence` and DB/WORM choice absent | blocked |
| LT-L2-W01-T02 | Restart durability and concurrent append serialization | T01 persistent store absent | blocked |
| LT-L2-W01-T03 | Persistent chain verification CLI | T01 persistent store absent | blocked |
| LT-L2-W01-T04 | Wave 1 DB schema baseline | L1-W06 DB decision absent | blocked |
| LT-L2-W01-T05 | Migration runner and migration history | T04 schema baseline absent | blocked |
| LT-L2-W01-T06 | Tenant-scoped repository layer | T04/T05 persistence baseline absent | blocked |
| LT-L2-W01-T07 | Unit-of-work with atomic domain write + audit append | T01/T06 persistence foundation absent | blocked |
| LT-L2-W01-T08 | Persistent idempotency store | T07 unit-of-work absent | blocked |
| LT-L2-W01-T09 | Synthetic seed and fixture loader | T06 repository layer absent | blocked |
| LT-L2-W01-T10 | Single-command persistence regression suite | T02/T05/T06/T07/T08/T09 absent | blocked |
| LT-L2-W01-T11 | W01 gate evidence and closeout handoff | T01-T10 runtime evidence absent | blocked |

## Next Required Actions

1. Obtain the L1-W06 owner decision for relational DB, WORM-equivalent audit
   storage, hosting topology, and monitoring.
2. Rebaseline L2 W01 after LT-L0-W02 and L1-W06 are no longer blocked.
3. Implement `packages/persistence` and only then run the W01 verification
   commands from `workbook/launch-tuw/13_L2.md`.
4. Rebuild command evidence with real exit codes for T01-T10 before attempting
   terminal TUW LT-L2-W01-T11.
