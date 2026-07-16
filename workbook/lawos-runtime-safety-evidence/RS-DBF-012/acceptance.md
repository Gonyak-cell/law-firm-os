# RS-DBF terminal acceptance

- Terminal: `RS-DBF-012`
- Gate: `G6-DBF`
- Source SHA: `86f4566eac262f82b10220f78bc9e2b4721135eb`
- Verdict: `PASS`
- Allowed claim: `POSTGRES_SOURCE_FOUNDATION_VERIFIED`

## Accepted source-foundation behavior

1. `RepositoryPortV2` fixes a Promise-based, tenant-scoped read/write/transaction/idempotency/audit contract and a canonical request hash.
2. The Matter file reference adapter implements that contract while preserving existing synchronous reads, real Matter primary keys, optimistic versions, audit and idempotency behavior.
3. The API dispatcher handles synchronous and Promise handlers uniformly and maps typed failures to customer-safe envelopes without leaking database details.
4. The PostgreSQL pool defaults to verified TLS and bounded timeouts. Insecure TLS is accepted only for an explicitly enabled loopback disposable database.
5. Transactions establish the tenant context locally, commit or roll back as one unit, destroy an unusable connection when rollback fails, and retry only bounded serialization or deadlock failures.
6. The SQL migration runner is advisory-lock protected, forward-only and checksum-bound. It refuses checksum drift and any applied history that is not a prefix of the current catalog.
7. Forced RLS blocks cross-tenant visibility and writes. Idempotency rejects the same key with another request hash. Record, immutable audit and outbox writes commit atomically.
8. File v2 and PostgreSQL v2 pass the same domain-neutral harness. Stale writes preserve the winner and map to a typed HTTP 409 conflict.
9. Persistence authority is explicit. If `postgres-v2` initialization fails, API startup is refused without creating or falling back to JSON authority. A successful PostgreSQL foundation connection is also closed and startup remains refused until the domain adapters are implemented.
10. Exact-SHA validation passed PostgreSQL 10/10, persistence 66/66, Matter 191/191, API authority 8/8, writer coverage, 147-TUW governance, HRX security negatives, isolated store-path preflight, syntax checks, web build and a real disposable-PostgreSQL manual driver.

## Broad regression classification

The same source tree passed the complete API suite 407/407 before the source commit. The repository-wide suite passed 4509/4512. Its primary failure was the pre-existing clean-worktree Popbill external-receipt requirement (`.env.popbill.local` missing), reproduced at the prior evidence SHA `66c7a948a887838a777c9d5fe4be7a8da0b98d0d`; two additional failures were concurrent receipt cascades. No RS-DBF source change was made to hide or bypass that external blocker.

## Boundary retained

This acceptance verifies only a local source foundation against disposable PostgreSQL. `EXT-PG-PROD` remains pending. No production database has been selected, provisioned or contacted, and the API deliberately does not activate PostgreSQL as the operational domain authority because the domain adapters are not yet complete.

No provider or AWS mutation, real-client-data transfer, staging or production migration, release, tag, package distribution, cutover or go-live action was executed. `production_database_selected`, `postgres_api_authority_active`, `production_ready` and `go_live` remain false.
