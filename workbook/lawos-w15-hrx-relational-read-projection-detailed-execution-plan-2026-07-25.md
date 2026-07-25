# LawOS W15 HRX Relational Read Projection Detailed Execution Plan

Date: 2026-07-25 KST
Plan version: 1.0
Repository: `Gonyak-cell/law-firm-os`
Baseline source SHA: `8d5620aa1c4414a3eeda5b1903a2e4ae55bc3c02`
Baseline source tree: `11163b55dfd4412f9fd4a4408108f924d4789c03`
Implementation branch: `codex/w15-hrx-relational-projection-20260725`
Implementation worktree: `/Users/jws/.codex/recovery/law-firm-os/w15-hrx-relational-projection-20260725`

## 1. Goal

Complete the production-grade W15 HRX relational read projection while preserving
the PostgreSQL generic ledger as the only operational write authority.

Completion requires:

1. all 77 HRX relational table contracts to be schema-validated;
2. every populated approved HRX record type to be projected without silent field
   loss;
3. empty approved record types to be explicitly recorded as schema-only;
4. backfill, bounded resume, incremental outbox consumption, replay no-op,
   tenant RLS, rollback, append-only, logical-reference, and performance gates to
   pass;
5. projection consumers to remain read-only;
6. all W15 zero-authority counters to equal zero;
7. a signed and verified `w15-relational-projection` terminal receipt to be
   created for an exact main SHA/tree/artifact/packet;
8. no claim that the projection is a write authority or that all LawOS domains
   are fully relationally normalized.

The final allowed completion claim is:

`W15_HRX_RELATIONAL_READ_PROJECTION_COMPLETE`

The following claim remains prohibited:

`FULL_RELATIONAL_NORMALIZATION_COMPLETE`

unless a later separately approved program covers every intended LawOS domain
and an explicit authority decision.

## 2. Fixed architecture decision

### 2.1 Authority

- `lawos_domain.records` remains the only operational HRX write authority.
- `lawos_hrx.*` is a derived relational read model.
- The projection is populated only from the generic ledger and its outbox.
- An operational request must never write both the generic ledger and the
  projection.
- The projection may be rebuilt from the ledger.
- Projection failure must not roll back, overwrite, or mutate the generic
  ledger.

### 2.2 Scope

Included:

- the current 77-table `HRX_STORE_TABLES` catalog;
- HRX schema migrations, RLS, append-only guards, projection state, and outbox
  cursor;
- exact production tenants bound in a signed W15 packet;
- one-way backfill and incremental projection;
- selected query consumers operating read-only after shadow acceptance;
- independent validation and signed evidence.

Excluded:

- relational decomposition of matter, client, CRM, intake, finance, DMS, portal,
  AI, analytics, or other non-HRX domain ledgers;
- promotion of `lawos_hrx` to operational write authority;
- deletion or retirement of the generic ledger;
- physical deletion of projection records without a separate retention action;
- payroll disbursement, bank transfer, tax filing, customer communication, and
  document-byte movement;
- rerunning completed W12, CUT-008 through CUT-012, release, or go-live stages
  solely because W15 begins.

## 3. Existing source implementation to reuse

The implementation must reuse and harden these existing components:

- `packages/hrx/src/postgres-migrations.js`
- `packages/hrx/src/postgres-projection-role.js`
- `packages/hrx/src/relational-read-projection.js`
- `apps/api/src/json-postgres-program-admin-lambda.js`
- `apps/api/src/json-postgres-program-inputs.js`
- `packages/persistence/src/postgres/execution-contract.js`
- `packages/persistence/src/postgres/program-stage-gates.js`
- `packages/persistence/src/postgres/program-stage-observation.js`
- `scripts/collect-json-postgres-relational-projection-probe.mjs`
- `scripts/lib/json-postgres-relational-projection-closeout.mjs`

New abstractions are permitted only where an existing shared component cannot
express a required trust boundary or resume contract.

## 4. Non-negotiable invariants

1. `source_authority_write_count = 0`
2. `dual_write_count = 0`
3. `partial_commit_count = 0`
4. `shadow_difference_count = 0`
5. `tenant_negative_visible_count = 0`
6. `projection_authority_promotion_count = 0`
7. `receipt_verification_failure_count = 0`
8. `consumer_write_grant_count = 0`
9. JSON fallback, JSON writer, file-current authority, offline mutation, and
   memory fallback remain zero.
10. Raw PII, document bytes, passwords, hashes, tokens, credentials, secrets,
    private keys, and recovery material must not appear in evidence.
11. Monthly forecast and actual cost remain at or below KRW 300,000.
12. Production RDS remains private with TLS verify-full and forced RLS.
13. Temporary Lambda VPC ENI Allow must be zero after activation.
14. `refs/codex/turn-diffs/**` and host-managed packed-ref changes are treated as
    Codex host metadata and excluded from source-clean/F4 judgments.

## 5. Execution strategy

Use one consolidated source-hardening tranche, focused tests while editing, and
one final full source suite after the complete change set is stable.

Do not restart completed stages after a later failure. Resume from the latest
verified W15 batch, wave, or validation checkpoint unless source, schema,
mapping, target, or packet authority has changed.

## 6. W15 work packages

### W15-00 — Exact baseline and predecessor verification

Tasks:

1. query remote main without mutating the existing root worktree;
2. verify the W15 worktree is clean and based on current `origin/main`;
3. locate the private canonical receipts for:
   - `w12-terminal`;
   - `cut-012`;
   - `go-live`;
4. verify each receipt signature, canonical digest, predecessor chain,
   source/tree/artifact binding, and PASS outcome;
5. verify the W15 execution contract binds all three terminal receipt digests;
6. verify production target identity, AWS account, region, RDS identifier,
   database name, approved tenant list, and cost ceiling;
7. emit only PII-safe predecessor and baseline locators.

Outputs:

- `w15-baseline-manifest.json`
- `w15-predecessor-verification.json`
- three private receipt locators

Gate:

- No production W15 mutation if any required receipt is missing, invalid, or
  digest-drifted.
- A missing W15 predecessor does not authorize rerunning other completed
  stages; close only the missing terminal under its own authority.

### W15-01 — Read-only production inventory

Tasks:

1. read approved production tenant IDs only;
2. collect record-type counts, state-version ranges, payload-size distribution,
   soft-delete counts, append-only counts, outbox volume, outbox lag, and
   reference counts;
3. collect JSON-path presence and null ratios without returning values;
4. measure existing generic-ledger query frequency and latency using safe
   aggregate telemetry;
5. classify every HRX record type as:
   - `populated`;
   - `schema_only`;
   - `blocked_mapping`;
6. hash the normalized inventory.

Outputs:

- private 0600 `w15-production-inventory.json`
- PII-safe `w15-production-inventory-summary.json`
- inventory canonical SHA-256

Gate:

- Unknown tenant, source drift, raw-value exposure, or unapproved source access
  stops the work.

### W15-02 — Immutable 77-table mapping contract

For each table record:

- table name;
- source record type;
- primary key;
- foreign-key dependencies;
- payload-to-column mapping;
- required and nullable columns;
- append-only status;
- soft-delete/tombstone policy;
- unknown-field policy;
- expected source count and safe hash;
- rollout wave;
- performance budget;
- schema and migration checksum.

Tasks:

1. compare actual payload keys with relational columns;
2. identify non-null unmapped fields;
3. classify intentionally excluded derived fields;
4. detect missing or duplicate primary keys;
5. validate all foreign-key targets;
6. derive a deterministic topological table order;
7. record empty tables as `schema_only` instead of silently skipping them;
8. bind the manifest digest into the execution packet.

Outputs:

- `w15-hrx-relational-mapping-manifest.json`
- `w15-hrx-table-dependency-order.json`
- `w15-hrx-mapping-gap-report.json`

Gate:

- Unmapped live field count, unresolved primary-key conflict count, and
  unresolved foreign-key conflict count must all equal zero before production
  backfill.

### W15-03 — Mapping and dependency hardening

Tasks:

1. require an exact approved mapping manifest;
2. limit production projection to the manifest table set;
3. reject unapproved record types;
4. reject non-null unmapped fields;
5. project parent rows before dependent child rows;
6. validate deferred/cyclic references after the tenant batch;
7. include the table-set and mapping digests in execution evidence;
8. add an all-catalog fixture covering all 77 table contracts.

Tests:

- exact manifest accepted;
- digest drift rejected;
- unknown record type rejected;
- unknown non-null field rejected;
- schema-only table accepted;
- missing primary key rejected;
- FK parent ordering preserved;
- circular/deferred references validated.

### W15-04 — Bounded backfill and resume

Tasks:

1. capture a source high-watermark before backfill;
2. order rows by approved table dependency order and stable record ID;
3. divide work into bounded batches derived from the signed performance
   acceptance;
4. commit projection rows, projection state, and batch checkpoint atomically;
5. prevent cursor/checkpoint advancement before successful readback;
6. enforce one active projection lease per tenant;
7. resume after the last committed checkpoint;
8. limit automatic retry to safe serialization/transient classes;
9. make immediate batch replay a no-op;
10. record counts and hashes without values.

Tests:

- mid-batch failure rolls the batch back;
- post-commit failure resumes at the next batch;
- replay performs zero insert/update;
- concurrent worker loses the lease and performs no writes;
- checkpoint cannot advance on partial failure;
- configured statement and connection timeouts are preserved.

### W15-05 — Incremental outbox projection

Tasks:

1. bind outbox events to approved aggregate type and ID;
2. process only affected records where the event contract permits;
3. preserve `(created_at, event_id)` ordering;
4. fail closed on unknown event shape;
5. consume backfill-era events only after the high-watermark;
6. advance the outbox cursor only after target readback;
7. make event replay a no-op;
8. expose PII-safe lag and throughput counters;
9. stop on target drift after a previously verified projection.

Tests:

- one event updates one intended record;
- unknown event is rejected;
- equal timestamps remain deterministic;
- out-of-order event does not regress state;
- cursor failure leaves the event replayable;
- source version/hash regression is rejected.

### W15-06 — Deletion, archive, and append-only semantics

Tasks:

1. project source `status=deleted` and `deleted_at` as soft-deleted state;
2. prohibit unapproved physical DELETE from projection tables;
3. retain archive-only lineage;
4. require an explicit tombstone for a physically absent source;
5. keep append-only target rows immutable;
6. stop on append-only source/target disagreement;
7. keep retention-driven physical deletion outside W15.

Tests:

- soft delete is projected;
- physical source disappearance without tombstone blocks;
- append-only update/delete fails;
- archive lineage remains queryable by the auditor.

### W15-07 — Database and AWS least privilege

Tasks:

1. retain `lawos_hrx_projection_writer` as the only projection writer;
2. verify it has source SELECT but no generic-ledger write authority;
3. verify it has only required projection INSERT/UPDATE authority;
4. keep `lawos_app` read-only on `lawos_hrx`;
5. add or validate a separate read-only projection auditor path;
6. prevent the incremental runtime worker from requiring master credentials;
7. use admin authority only for one-time schema/role bootstrap;
8. ensure all projection connections use tenant-context HMAC and TLS
   verify-full;
9. keep projection connection limit 4 and runtime pool maximum 2;
10. keep schedules disabled by default until backfill acceptance.

Tests:

- writer generic-ledger INSERT/UPDATE/DELETE denied;
- consumer projection write denied;
- auditor write denied;
- BYPASSRLS/superuser/role-creation denied;
- wildcard tenant authority denied;
- short tenant-context secret denied;
- secret values never appear in results or evidence.

### W15-08 — Independent validation collector

Tasks:

1. collect validation from a read-only auditor identity;
2. independently calculate table counts and canonical mapped-row hashes;
3. validate primary and foreign-key references;
4. validate ordering and outbox cursor position;
5. validate RLS negative visibility;
6. validate append-only guards;
7. validate consumer grants;
8. validate rollback evidence;
9. validate performance against a pre-signed budget;
10. generate validation evidence from observations, not caller-provided PASS
    booleans.

Outputs:

- `w15-relational-projection-execution.json`
- `w15-relational-projection-validation.json`
- `w15-relational-projection-closeout.json`
- `w15-relational-projection-probe.json`

### W15-09 — Source tests and exact-head gates

During implementation run only focused suites:

```text
packages/hrx/test/postgres-migrations.test.js
packages/hrx/test/postgres-projection-role.test.js
packages/hrx/test/relational-read-projection.test.js
apps/api/test/json-postgres-program-admin-lambda.test.js
scripts/test/json-postgres-relational-projection-closeout.test.mjs
```

After the complete source tranche is stable, run exactly one consolidated
source terminal cycle:

1. all W15 focused tests;
2. `npm run hrx:persistence:validate`;
3. `npm run hrx:security:validate`;
4. JSON/PostgreSQL program security workflow;
5. exact-head CodeQL;
6. the repository full test suite once;
7. deterministic Node 22 artifact build twice;
8. artifact and manifest digest comparison;
9. exact-head CI and security evidence sealing.

Gate:

- Fix a failure at its affected boundary.
- Do not restart the full suite until all focused regressions pass.

### W15-10 — Exact-head execution packet

Bind:

- final source SHA and tree;
- artifact, artifact-manifest, and lockfile digests;
- migration catalog digest;
- mapping manifest digest;
- production target and exact tenant IDs;
- W12 terminal receipt digest;
- CUT-012 receipt digest;
- go-live receipt digest;
- CloudFormation change-set ID;
- monthly cost forecast;
- performance acceptance digest;
- rollback action;
- operator roles and expiry.

The packet must permit only:

- W15 schema/role bootstrap;
- projection backfill;
- bounded resume;
- incremental catch-up;
- independent validation;
- read-only consumer rollout;
- W15 closeout.

Authority promotion remains explicitly false.

### W15-11 — Production infrastructure and schema bootstrap

Tasks:

1. inspect the complete unexecuted change set;
2. require replacement count zero unless an independently reviewed resource
   addition is explicitly bound;
3. reject public routes, public database access, or production IAM reuse outside
   the approved W15 resources;
4. dry-run migration checksums;
5. create/verify `lawos_hrx` and `lawos_projection`;
6. enforce RLS ENABLE and FORCE on every approved table;
7. configure writer, consumer, and auditor roles;
8. activate Lambda functions;
9. remove temporary ENI bootstrap permissions immediately;
10. verify final ENI Allow count zero;
11. keep the recurring schedule disabled.

Receipts:

- infrastructure change-set receipt;
- schema migration receipt;
- database-role receipt;
- ENI-removal receipt.

### W15-12 — Backfill waves

Wave 1 — core identity and employment:

- employees;
- employment profiles;
- employee-user links;
- HRX document metadata;
- direct employment/compensation references.

Wave 2 — recruiting and lifecycle:

- job openings;
- candidates and consents;
- applications, interviews, and offers;
- onboarding and offboarding.

Wave 3 — leave, attendance, overtime, and approval:

- leave catalog and policies;
- balances, entitlements, requests, and segments;
- attendance and overtime;
- approval requests, steps, assignments, delegations, and escalations;
- accrual, rescheduling, integration, and reconciliation tables.

Wave 4 — payroll and compensation:

- payroll periods, runs, profiles, and items;
- input snapshots, employee results, and line items;
- statements and delivery metadata;
- payment and filing metadata;
- issues, adjustments, and year-end cases.

Wave 5 — governance, AI, analytics, and outbox:

- audit and risk records;
- operational policy and approvals;
- AI review/source metadata;
- analytics snapshots;
- integration and job outbox records.

Each wave must prove:

- approved source count equals projected count plus explicitly classified
  archive-only count;
- mapped-row hash equality;
- unresolved reference count zero;
- tenant-negative visibility zero;
- partial commit zero;
- source-authority writes zero;
- dual writes zero;
- immediate replay insert/update zero;
- evidence raw-value count zero.

### W15-13 — Incremental catch-up and event-based observation

Tasks:

1. process outbox events after the backfill high-watermark;
2. reduce the approved backlog to zero;
3. enable the worker schedule;
4. observe at least one approved event for every populated rollout wave;
5. require two consecutive event-based windows with:
   - shadow difference zero;
   - cursor regression zero;
   - tenant leak zero;
   - lag within the signed budget;
6. stop and resume at the failed event/batch boundary.

Elapsed idle time alone is not PASS evidence.

### W15-14 — Shadow reconciliation

The independent auditor verifies:

- per-table counts;
- canonical mapped-row hashes;
- deterministic ordering;
- primary and foreign-key references;
- soft-delete state;
- append-only integrity;
- outbox cursor and lag;
- tenant-negative queries;
- unknown-field count;
- writer and consumer grants;
- query latency and resource impact.

All W15 zero counters must be exactly zero.

### W15-15 — Read-only consumer rollout

Roll out by query family:

1. shadow-only comparison while generic ledger remains the response source;
2. core employee and roster reads;
3. recruiting/lifecycle reads;
4. leave/attendance reads;
5. payroll/compensation reads last.

Rules:

- all writes remain on the generic ledger;
- a stale or mismatched projection routes reads back to the generic ledger;
- fallback is PostgreSQL-ledger read fallback, never JSON/file fallback;
- rollback disables the projection reader and worker but preserves projection
  tables for evidence;
- no projection table is physically deleted by rollback.

### W15-16 — Final receipts and closeout

Required independent receipts:

1. predecessor verification;
2. production inventory;
3. 77-table mapping contract;
4. schema migration;
5. database role and privilege;
6. five backfill-wave receipts;
7. incremental catch-up;
8. shadow reconciliation;
9. tenant/RLS;
10. performance acceptance;
11. rollback drill;
12. consumer read-only rollout;
13. final W15 terminal receipt.

Final required checks:

- `one_way_outbox_projection_verified`
- `selected_table_contract_verified`
- `shadow_count_hash_ordering_passed`
- `logical_reference_readback_passed`
- `projection_performance_accepted`
- `tenant_rls_passed`
- `transaction_rollback_passed`
- `append_only_conflict_guard_passed`
- `generic_ledger_authority_preserved`
- `projection_consumers_read_only`
- `authority_promotion_not_granted`
- `projection_receipt_set_verified`

Final required zero counters:

- `source_authority_write_count`
- `dual_write_count`
- `partial_commit_count`
- `shadow_difference_count`
- `tenant_negative_visible_count`
- `projection_authority_promotion_count`
- `receipt_verification_failure_count`

## 7. Stop conditions

Stop immediately on:

1. source SHA/tree, artifact, packet, mapping, migration, target, or receipt
   drift;
2. missing or invalid W12/CUT-012/go-live predecessor;
3. unapproved tenant or production target;
4. non-null unmapped payload field;
5. unresolved primary-key, foreign-key, email identity, or source-authority
   conflict;
6. any generic-ledger write from the projection role;
7. any consumer projection write grant;
8. partial commit, cursor advancement without readback, or replay side effect;
9. RLS or tenant-isolation failure;
10. append-only mutation;
11. performance-budget or KRW 300,000 cost-ceiling violation;
12. public RDS/S3/network exposure or excessive IAM authority;
13. temporary ENI permission remaining after Lambda activation;
14. raw PII, document bytes, password, token, credential, secret, or key material
    in logs, receipts, or CI artifacts;
15. full-suite, exact-head CI, CodeQL, or security failure.

## 8. Resume and rollback

Resume rules:

- preserve all verified W15 checkpoints;
- retry only the failed batch, event, wave, or validation boundary;
- rerun an upstream W15 stage only when its source, schema, mapping, packet, or
  target contract changed;
- never rerun W12 through W14 solely because W15 failed.

Rollback rules:

1. disable the projection worker schedule;
2. disable projection read routing;
3. route reads to the PostgreSQL generic ledger;
4. preserve projection tables and evidence;
5. do not mutate generic-ledger authority;
6. do not introduce JSON/file fallback or dual-write.

## 9. Approval model

Source implementation and local validation may proceed on the dedicated branch.

Production work requires one exact-head W15 conditional execution approval that
binds the final source/tree/artifact/packet, three predecessor receipts, mapping
manifest, production target, approved tenants, change set, performance budget,
cost ceiling, and rollback.

The same approval may cover bounded retry/resume on an unchanged exact binding.
A new approval is required only for:

- source/tree/artifact/packet/mapping drift;
- approved-tenant or target changes;
- an expanded CloudFormation resource or replacement scope;
- cost above KRW 300,000;
- projection write-authority promotion.

## 10. Final handoff

The final report must separate:

1. source implementation and local verification;
2. production schema/role deployment;
3. backfill and incremental projection;
4. independent shadow validation;
5. read-only consumer rollout;
6. signed W15 closeout;
7. excluded future relational authority work.

No stage may be inferred complete from source code, an unsigned fixture, a CI
badge, or an approval packet alone.
