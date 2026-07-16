# Law Firm OS PostgreSQL production authority decision packet

- Prepared: 2026-07-16 KST
- Scope: `RS-DBF-012`, production structured-data authority boundary
- External dependency: `EXT-PG-PROD`
- Current external decision state: `PENDING_HUMAN_APPROVAL`
- Production DB selected: `false`
- Production connection or migration authorized: `false`
- Release, deployment, cutover, and go-live authorized: `false`

## What the source foundation establishes

The source work may establish `POSTGRES_SOURCE_FOUNDATION_VERIFIED` only after its exact-SHA evidence passes. That claim is limited to:

1. a Promise-based, tenant-scoped `RepositoryPortV2` contract;
2. a Matter file reference adapter and a PostgreSQL adapter passing the same domain-neutral contract;
3. transaction-scoped tenant context, RLS denial, optimistic conflict, idempotency collision, append-only audit, and atomic outbox behavior in a disposable local PostgreSQL instance;
4. checksum-bound, forward-only migration history;
5. verified TLS as the default, with plaintext permitted only by an explicit local-loopback disposable setting; and
6. explicit persistence authority selection that fails startup without falling back to JSON when PostgreSQL is selected but unavailable or incomplete.

It does not establish that any domain has been migrated to PostgreSQL or that a production PostgreSQL service exists.

## Current runtime boundary

| Surface | Current authority state | Permitted claim |
| --- | --- | --- |
| Existing API domain repositories | `file-current` | Existing generation-CAS/durable-file authority remains active |
| Matter v2 file adapter | Reference implementation only | Contract compatibility, not runtime cutover |
| PostgreSQL v2 adapter | Disposable local test foundation only | Source and local contract verification |
| API `postgres-v2` selection | Fail-closed until domain adapters are complete | No silent JSON fallback |
| Production database | Not selected or provisioned | None |
| Real tenant/client/HR data | Not authorized | None |

## Decisions required before provisioning

| Decision | Required owner | Required receipt content | Current state |
| --- | --- | --- | --- |
| Service and operating model | product/infrastructure owner | vendor, managed or self-hosted model, PostgreSQL major version, support tier | pending |
| Region and residency | legal/data/infrastructure owners | region, availability-zone model, residency basis, cross-region limits | pending |
| Network boundary | security/infrastructure owner | VPC/subnet path, ingress source, security group/firewall policy, public-access denial | pending |
| Authentication and secrets | security/infrastructure owner | IAM or database-role model, least-privilege roles, secret authority, rotation and break-glass procedure | pending |
| TLS trust | security owner | CA authority, hostname verification, certificate rotation, approved `verify-full` connection shape | pending |
| Capacity | product/infrastructure owner | instance class, storage, IOPS, autoscaling limits, connection ceiling, pool budget | pending |
| Availability and maintenance | operations owner | multi-AZ/failover policy, maintenance window, upgrade owner, supported outage budget | pending |
| Backup and recovery | legal/operations/infrastructure owners | PITR window, retention, encryption key, isolated restore rehearsal, approved RPO/RTO | pending |
| Monitoring | security/operations owner | availability, saturation, replication, backup, auth, and migration alerts with owners | pending |
| Migration and rollback | product/data/operations owners | staging rehearsal receipt, operator, window, write freeze, rollback cutoff, readback and abort thresholds | pending |
| Commercial and privacy terms | legal/procurement owner | DPA, subprocessor, retention/deletion, incident-notice and exit/export terms | pending |

## Required approval receipt

`EXT-PG-PROD` is complete only when one immutable receipt identifies all of the following:

- approved decision values for every row above;
- approver identities and approval time;
- provider/account/project and region references without embedding secrets;
- the secret or IAM authority reference, never the credential value;
- the exact source SHA approved for the next bounded provisioning or staging step;
- the allowed environment and execution window;
- named operator, observer, rollback owner, and incident channel;
- explicit first-write and rollback cutoffs; and
- an explicit statement of whether the receipt authorizes provisioning only, staging migration only, or a later production cutover.

## Execution sequence after a future approval

1. Validate the receipt and exact source SHA without connecting to production.
2. Provision or identify the approved instance under a separate execution record.
3. Prove TLS hostname verification and least-privilege connectivity with no schema mutation.
4. Run migrations first against an approved staging instance and preserve checksums and history.
5. Run synthetic contract, RLS, backup, restore, monitoring, and failure tests in staging.
6. Complete every domain adapter/import/shadow-read workstream and `RS-CUT-001` through `RS-CUT-007` before requesting production cutover authority.
7. Treat production provisioning, production migration, and production authority switch as separate approvals and receipts.

## Stop rules

Stop without fallback or mutation if the receipt is incomplete, the source SHA differs, TLS is not `verify-full`, the target is publicly reachable contrary to the decision, the role exceeds approved privileges, migration history diverges, backup/restore proof is absent, tenant isolation fails, real data is encountered without `EXT-REAL-DATA`, or rollback ownership/window is unclear.

No failure permits a hidden return to JSON dual-write. Before the first production database write, rollback is configuration/code rollback. After the first write, only the separately approved `RS-CUT` rollback procedure may be used.

## Relationship to earlier material

`docs/launch/production-persistence-decision-packet.md` records a historical launch-level receipt and explicitly leaves the concrete production database, hosting, region, backup, and staging evidence unresolved. It is useful background but is not, by itself, an `EXT-PG-PROD` execution authorization for this plan.

## Approval slots

| Receipt field | Value |
| --- | --- |
| `EXT-PG-PROD` receipt reference | `PENDING` |
| Approved source SHA | `PENDING` |
| Authorized environment/action | `PENDING` |
| Provider/account/region reference | `PENDING` |
| Secret/IAM authority reference | `PENDING` |
| Migration and rollback runbook reference | `PENDING` |
| Operator / observer / rollback owner | `PENDING` |
| Approved by | `PENDING` |
| Approved at | `PENDING` |

Until every required field and linked decision is complete, only local source implementation and disposable synthetic PostgreSQL verification are authorized.
