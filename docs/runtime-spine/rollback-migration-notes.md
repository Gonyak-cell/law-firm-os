# Runtime Spine Rollback and Migration Notes

Status: G0 placeholder for future runtime migrations
Date: 2026-06-21

## G0

G0 adds planning, decision, ledger, evidence, and validator files only. It does not add product DB migrations, production credentials, external network calls, or real data writes.

Rollback for G0 is a normal Git revert of the Runtime Spine G0 PR. No runtime data rollback is required.

## Future Migration Rules

| Rule | Applies To |
| --- | --- |
| Every schema change must have a migration ID | RS-1, RS-4 |
| Every migration must state up/down or rollback plan | RS-1, RS-4, RS-6 |
| Synthetic tenant first | all runtime migrations |
| No production credentials in repo | all spines |
| Idempotent writes required | RS-1, RS-5 |
| Audit coverage required before mutation routes | RS-3, RS-5 |

## RS-1A Persistence Foundation

RS-1A adds a synthetic-only persistence adapter and migration runner:

- adapter: `lawos-synthetic://`
- tenant table: `runtime_tenants`
- migration table: `runtime_migration_history`
- migration ID: `001_runtime_spine_tenant_base`
- production DB configuration: blocked
- inline credentials: blocked
- rollback command path: `rollbackRuntimeSpineMigrations(connection)`

Rollback affects only synthetic migration history or the local synthetic store file. It does not touch production data, customer data, HR real data, or external systems.

## RS-1B Tenant Data Spine

RS-1B extends the synthetic persistence adapter with tenant data spine primitives:

- tenant-scoped repository: `runtime_records`
- stable ID service: `createStableRuntimeId`
- idempotency table: `runtime_idempotency_keys`
- outbox table: `runtime_outbox_events`
- transaction wrapper: `runPersistenceTransaction`
- lifecycle fields: `status`, `archived_at`, `deleted_at`, `retention_class`

Rollback remains synthetic-only. For local test stores, remove the synthetic store file or use `rollbackRuntimeSpineMigrations(connection)` to clear synthetic migration history. There is still no production DB, no production credential, and no real tenant/customer/HR data mutation.

## RS-1C Persistence Ready Candidate

RS-1C closes the remaining G1 persistence evidence:

- data residency metadata: `residency_region`, `data_residency_policy`, `data_classification`
- backup/restore: `createPersistenceBackup` and `restorePersistenceBackup`
- tenant isolation suite: repository, idempotency, outbox, and backup leakage negative tests
- G1 evidence packet: `docs/runtime-spine/evidence/g1-persistence-evidence.json`

Rollback remains synthetic-only. A local synthetic backup can be discarded, and the local synthetic store can be reset by deleting the test store file. This does not approve production DB vendor, hosting, RPO/RTO, credentials, real tenant data access, runtime-ready, or launch/go-live.

## RS-2 Trust Boundary Ready Candidate

RS-2 adds provider-neutral runtime auth and AuthZ context helpers:

- session schema rejects credential material
- OIDC/SAML adapters remain descriptor-only
- local dev provider is synthetic-only
- server-derived principal rejects caller-supplied tenant, role, user, and actor context
- authz context calls the existing evaluator only after server-derived principal construction
- break-glass remains locked before owner gate
- auth audit hook writes synthetic tenant-scoped outbox events

Rollback is a normal Git revert of the RS-2 PR. No production auth provider, SSO configuration, tenant membership source, credential store, or real tenant data is created by this gate.

## RS-3 Audit Ready Candidate

RS-3 adds Runtime Spine audit helpers on top of the existing audit package:

- append-only runtime audit writer
- hash-chain event persistence through the existing ledger/event contract
- read/write/permission/export audit middleware
- tenant-scoped metadata-only audit reader/export
- retention and verification checks
- immutability guard and route audit coverage scanner

Rollback is a normal Git revert of the RS-3 PR. It does not create a production audit pipeline, external SIEM export, immutable storage account, or real production audit archive.

## Future Evidence Required

Runtime migration PRs must record:

- migration command
- rollback or reset command
- synthetic fixture hash or record count
- tenant isolation negative test
- audit event verification when mutation routes are involved

## Launch Boundary

Migration evidence can support a repo-side runtime-ready candidate. It cannot prove actual production launch without external operator receipts.
