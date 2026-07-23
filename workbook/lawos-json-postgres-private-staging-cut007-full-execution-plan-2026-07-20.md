# LawOS JSON Authority to PostgreSQL RepositoryPortV2, Real-Data Migration, Production CUT-008~012, Release, and Relational Projection Full Execution Plan

- Plan ID: `LAWOS-JSON-POSTGRES-PRIVATE-STAGING-CUT007-20260720`
- Plan version: `v2.0`
- Prepared on: `2026-07-20 KST`
- Updated on: `2026-07-23 KST`
- Repository: `/Users/jws/Documents/Codex/Law Firm OS`
- Protected root worktree: read-only; never reset, stash, clean, commit, or modify
- Current `origin/main`: `b08b25dbd913196c7475794db0b91193d2cfd337`
- Current `origin/main` tree: `140e552cac6867a6f4e9de55aaf7657faa7498ae`
- Completed private-staging source checkpoint: `213d02ea54c6235ca042b45ff29c8b0b1193461a`
- Completed private-staging source tree: `140e552cac6867a6f4e9de55aaf7657faa7498ae`
- Completed implementation branch: `codex/json-postgres-private-staging-cut007-20260720`
- Completed implementation PR: `#173`, merged to `origin/main`
- AWS account: `770880870480`
- AWS region: `ap-northeast-2`
- Monthly LawOS AWS cost ceiling: `KRW 300,000`; no security, durability, or availability control may be weakened to meet it

## 1. Objective

Complete the remaining real-data and production phases of the original JSON-to-PostgreSQL program while preserving the already completed private-staging checkpoints. The program must prove that:

1. the operational authority is PostgreSQL RepositoryPortV2, not a legacy JSON file, fallback adapter, dual writer, offline writer, or memory fallback;
2. the Phase-1 PostgreSQL authority is explicitly understood as a generic record ledger, `lawos_runtime.records(tenant_id, record_type, record_id, state_version, data jsonb)`, with idempotency, append-only audit, outbox, and forced tenant RLS rather than a complete domain-normalized relational redesign;
3. all eleven product domains, HRX, and the PostgreSQL identity ledger participate in the same fail-closed authority and transaction model;
4. employee accounts retain registered email addresses and use individual-request first-use password setup without requiring Microsoft Entra or importing legacy passwords or password hashes;
5. DMS stores metadata in PostgreSQL and bytes in tenant-namespaced, versioned, encrypted S3 with digest readback and mandatory Object Lock;
6. the completed private-staging deployment, CUT-005, CUT-006, CUT-007, final strict suite, and sixteen signed receipts remain valid checkpoints and are not replayed unless an upstream contract change invalidates them;
7. W12 adjudicates every real source, imports only the signed real-data inventory into an isolated private rehearsal target, and proves full reconciliation, replay no-op, tenant isolation, performance, and restore;
8. W13 executes CUT-008~012 against an exact-main production candidate, migrates only approved data, switches authority to PostgreSQL, proves DR, retires operational JSON, and closes the runtime-safety cutover ladder;
9. W14 signs and publishes exact-main artifacts and conditionally enables production traffic only after every predecessor gate passes;
10. W15 treats HRX relational normalization and other read-optimized relational projections as a separately gated post-go-live program that never creates a second write authority;
11. every execution claim is bound to exact source SHA, tree, artifact, schema and migration checksums, stack/template digest, data-inventory digest, and independently signed receipt.

W12, W13, and W14 are mandatory parts of the overall operational goal but are not authorized merely by appearing in this plan. W12 requires signed real-data inventory and rehearsal authorization. W13 and W14 require an exact-main conditional production, cutover, signing, release, and go-live authorization created after W12 passes. W15 is documented here so that PostgreSQL authority migration is not misrepresented as completed relational normalization; it is not a blocker for W14.

## 2. Terminal completion states

### 2.1 Private-staging terminal — achieved checkpoint

The private-staging terminal is preserved as achieved because the sealed evidence proves:

- `lawos-private-staging` reached `UPDATE_COMPLETE`;
- RDS is private and `PubliclyAccessible=false`;
- both Lambda functions are VPC attached and `Active/Successful`;
- only staging-specific IAM roles are attached;
- temporary Lambda ENI bootstrap Allow count is zero and the `lambda:SourceFunctionArn` explicit Deny remains;
- protected AMIC staging and production resource mutation count is zero;
- forecast cost is `KRW 147,630`, below the `KRW 300,000` ceiling;
- database bootstrap and eleven migrations passed with no checksum drift;
- CUT-005, CUT-006, and CUT-007 have independently signed and verified PASS receipts;
- final strict local suite passed `5,518` checks with zero failures;
- all sixteen closeout receipts passed signature validation;
- PR #173 was merged and the completed source tree equals the current `origin/main` tree.

These are reusable checkpoints, not proof of real-data rehearsal, production migration, release readiness, or go-live.

### 2.2 Overall operational PostgreSQL terminal

The original JSON-authority retirement objective is complete only when:

- every approved real source is covered by the signed source inventory;
- every source and field has an explicit migrate, transform, derived-rebuild, archive-only, secret-excluded, synthetic-excluded, or rejected-with-reason disposition;
- real account, employee, career/history, matter-code, client, relationship, DMS, finance, audit, idempotency, and outbox records reconcile with zero unexplained variance;
- production authority is the generic PostgreSQL RepositoryPortV2 ledger plus the specialized identity and DMS provider contracts;
- operational JSON writers, fallback, dual-write, file-current authority, offline mutation, and memory fallback are disabled;
- missing-JSON production smoke, tenant isolation, audit/outbox, DMS retention, and independent restore pass;
- first-use password setup works only for an approved active user after an individual request;
- recovery after the first production write uses PITR, forward repair, or an approved post-write runbook, never JSON authority.

### 2.3 Release and go-live terminal

Release and go-live complete only when:

- CUT-012 has a signed and verified PASS terminal receipt;
- the release target is the exact final `origin/main` SHA/tree used for production;
- macOS Developer ID signing, notarization, and stapling pass;
- Windows Authenticode signing passes;
- SBOM, checksums, and provenance are published for the same artifact set;
- formal tag and release artifacts are published without reusing an ad-hoc or older-SHA package;
- production smoke, tenant isolation, DMS, audit/outbox, backup/restore, and critical user flows pass;
- a separate final go-live receipt verifies all predecessor receipt digests before production traffic activation.

### 2.4 Relational modernization terminal — separate follow-on

The Phase-1 migration does not claim that `data jsonb` has been normalized into domain-specific relational tables. HRX and other relational projections complete separately only after one-way outbox/CDC projection, shadow reconciliation, performance evidence, and an independently approved authority decision prove that no dual writer or split authority is introduced.

## 3. Fixed scope and exclusions

### 3.1 Included source domains

- registered staff accounts, user IDs, email addresses, account status, tenant memberships, roles, groups, and scopes;
- HRX employees, employment profiles, employee-user links, professional profiles, career, education, qualifications, practice areas, documents, compensation, leave, attendance, payroll, onboarding, offboarding, recruiting, and audit history;
- master-data persons, organizations, parties, entities, client groups, contact points, relationships, billing profiles, and identifiers;
- CRM accounts, contacts, leads, opportunities, activities, and proposals;
- intake requests, conflict checks, hits, decisions, waivers, and clearance tokens;
- matters, matter codes, matter numbers, client relationships, members, assignments, tasks, profiles, status history, and audit events;
- DMS metadata, documents, versions, objects, tenant namespace, digest, legal hold, retention, and delete controls;
- finance, analytics, client portal, AI governance, UI readiness, and enterprise readiness data when operational and not synthetic;
- domain audit, idempotency, outbox, import, shadow, and reconciliation evidence.

Each domain and record type must be classified as migrate, transform, derived-rebuild, archive-only, or reject. Derived analytics, AI, UI, and readiness state must not be copied merely because it exists in a legacy JSON source.

### 3.2 Explicit secret exclusions

The following are never imported as active account data and never appear in receipts or logs:

- plaintext passwords;
- legacy password hashes;
- TOTP or MFA secrets;
- API, session, bearer, or bridge tokens;
- cookies and authorization headers;
- password-reset tokens or URLs;
- private keys, recovery keys, or database credentials;
- raw DMS bytes or raw PII in evidence.

### 3.3 Included but separately authorized execution boundaries

- real roster/client/document reads and rehearsal writes are W12 work but require the signed W12 inventory/rehearsal authorization;
- production infrastructure mutation, database writes, source-writer freeze, authority switch, DR, and JSON retirement are W13 work but require signed exact-main conditional authorization;
- real employee password-setup email is allowed only after W13 migration and only on an individual user request;
- release, tag, signing, publication, production traffic activation, and go-live are W14 work and remain conditional on CUT-012 and exact-main binding;
- bank transfers, payroll payments, tax-invoice issuance, customer-facing external messages, data outside the approved source manifest, and unrelated AWS resources remain excluded;
- Microsoft Entra is not a dependency or readiness gate for this plan.

## 4. Truth boundaries

The following claims must never be collapsed:

1. source implemented;
2. local tests passed;
3. exact-head CI passed;
4. exact-head artifact reproduced;
5. private staging deployed;
6. database bootstrap passed;
7. CUT-005 passed;
8. CUT-006 passed;
9. CUT-007 passed;
10. private-staging receipts sealed and source merged;
11. real-data source inventory adjudicated;
12. W12 real-data rehearsal passed;
13. CUT-008 production readiness passed;
14. CUT-009 production authority switched;
15. CUT-010 DR restore passed;
16. CUT-011 JSON authority retired;
17. CUT-012 terminal closed;
18. release and signing passed;
19. go-live complete;
20. relational normalization or projection complete.

### 4.1 Architecture authority boundary

- Phase-1 runtime authority uses the generic `lawos_runtime.records` ledger and not a full domain-normalized schema.
- `lawos_runtime.records`, `idempotency_keys`, `audit_events`, and `outbox_events` all require tenant context and use `ENABLE ROW LEVEL SECURITY` plus `FORCE ROW LEVEL SECURITY`.
- append-only audit mutation is rejected by a database trigger rather than an application convention alone;
- request transactions use selectable isolation, a `15s` statement timeout, up to three attempts, HMAC-authenticated tenant context with a secret of at least 32 bytes, and `transactionMany` for atomic multi-domain flush;
- the current HRX runtime materializes and flushes generic ledger records with baseline conflict detection and retry; the repository also contains relational HRX migration tooling, currently covering 32 source migrations and 77 store tables, but those tables are not the operational HRX write authority;
- DMS bytes are not stored in `data jsonb`: PostgreSQL remains metadata authority and S3 Object Lock storage remains byte authority.

### 4.2 Test and evidence boundary

- a PostgreSQL test skipped because local `initdb` or `pg_ctl` is unavailable is not a PASS;
- exact-head CI must prove required real-PostgreSQL security tests executed with required-skip count zero;
- source-controlled historical status files remain historical evidence and must not be rewritten to manufacture current PASS;
- sealed external receipts are registered as current execution evidence by digest;
- a source, receipt, CI, staging, production, release, and go-live result each retains its own receipt and execution state.

## 5. Current-state facts to preserve

- current `origin/main` is `b08b25dbd913196c7475794db0b91193d2cfd337` with tree `140e552cac6867a6f4e9de55aaf7657faa7498ae`;
- PR #173 merged the completed private-staging source; source checkpoint `213d02ea54c6235ca042b45ff29c8b0b1193461a` has the same tree as current `origin/main`;
- the private-staging stack exists and is `UPDATE_COMPLETE`; the earlier statement that only the artifact bucket existed is obsolete;
- database bootstrap, CUT-005, CUT-006, and CUT-007 executed against synthetic-only private staging and passed;
- CUT-005 imported 21 synthetic source records, accepted 14, produced seven expected rejects, zero unexpected rejects, zero shadow differences, zero wrong-tenant visibility, and zero replay or rollback residual;
- CUT-006 wrote and read back 14 PostgreSQL records and proved JSON fallback, JSON writer, dual-write, file-current authority, offline mutation, and memory fallback counters all equal zero;
- CUT-007 passed the browser flow, approved synthetic mailbox delivery, PostgreSQL cold-restart readback, seven critical browser flows, 108 browser API requests, zero wrong-tenant visibility, and all legacy counters equal zero;
- the final strict suite passed 5,518 checks with zero failures, and sixteen of sixteen required receipts passed signature verification;
- private-staging forecast cost is `KRW 147,630`; the `KRW 300,000` ceiling remains unchanged;
- the generic PostgreSQL ledger, the eleven product domains, HRX materialization, identity ledger, transaction layer, and DMS S3 v3 contract are implemented in source;
- operational real data has not been migrated to rehearsal or production, and production has not been contacted by this program;
- the safe inventory contains 287 candidate files, 84 duplicate candidates, 203 manual-review candidates, 857 discovered field paths, two roster gaps, two lower-case email collisions, and zero selected authoritative sources;
- W12 real-data rehearsal, W13 CUT-008~012, W14 signing/release/go-live, and W15 relational projection have not executed;
- the central-ledger cutover runner still refuses production `execute` mode and therefore requires an approval-gated production executor or equivalent exact-main implementation before W13;
- Entra is not required; production uses the registered-email, internal-password, first-use setup contract;
- operational JSON remains the authority for real production data until W13 passes, even though source defaults, synthetic staging, and fail-closed authority checks are PostgreSQL-complete.

### 5.1 Current evidence and code anchors

- generic ledger, append-only audit, and forced RLS: `packages/persistence/src/postgres/migrations/001_repository_port_v2.sql`;
- tenant transaction, HMAC context, timeout, and retries: `packages/persistence/src/postgres/transaction.js`;
- eleven product-domain and HRX transaction participation: `apps/api/src/postgres-api-runtime-authority.js`;
- HRX generic-ledger materialization: `packages/hrx/src/postgres-store-v2.js`;
- HRX relational migration tooling: `packages/hrx/src/postgres-migrations.js`;
- production execute-mode gap: `scripts/run-central-ledger-cutover.mjs`;
- safe inventory baseline: `workbook/lawos-json-postgres-source-inventory-summary-2026-07-20.md`;
- sealed private-staging receipt summary: `/Users/jws/.codex/recovery/law-firm-os/json-postgres-production-release-full-program-20260721/source-213d02ea/receipt-validation-summary.json`;
- sealed AWS rebind summary: `/Users/jws/.codex/recovery/law-firm-os/json-postgres-production-release-full-program-20260721/source-213d02ea/aws-rebind-execution/213d02ea-direct-rebind-summary.json`.

## 6. Work breakdown and dependency graph

```text
COMPLETED CHECKPOINTS
W0 Baseline/governance checkpoint
 ├─ W1 Safe source inventory and field discovery: PARTIAL, adjudication pending
 ├─ W2 Internal email authentication source/staging: COMPLETE
 ├─ W3 Synthetic migration engine: COMPLETE, real-data/production executor pending
 └─ W4 Private-staging IaC: COMPLETE
       ↓
W5 Local/disposable-PostgreSQL validation: COMPLETE CHECKPOINT
       ↓
W6 Exact-head artifact, CI, security, authorization: COMPLETE CHECKPOINT
       ↓
W7 Private-staging AWS creation/bootstrap: PASS
       ↓
W8 CUT-005: PASS
       ↓
W9 CUT-006: PASS
       ↓
W10 CUT-007: PASS
       ↓
W11 Receipt sealing and PR #173 merge: PASS

REMAINING PROGRAM
       ↓ signed W12 inventory/rehearsal approval
W12 Real-data inventory adjudication and isolated rehearsal
       ↓ exact-main conditional production authorization
W13 CUT-008~012 production migration, DR, and JSON retirement
       ↓ all production gates PASS
W14 Exact-main signing, formal release, conditional go-live
       ↓ separate non-blocking program
W15 HRX/domain relational read projections without dual authority
```

## 7. W0 — Baseline and governance

Status: `PRIVATE_STAGING_CHECKPOINT_COMPLETE`; rebaseline is required when W12 implementation work starts.

### W0.1 Worktree controls

- fetch `origin/main`;
- confirm the baseline SHA/tree;
- confirm the baseline is clean;
- create a new clean worktree and `codex/...` branch from the then-current `origin/main` for W12/W13 source work;
- exclude `refs/codex/turn-diffs/**` and resulting packed-refs metadata from source F4 evaluation;
- record root worktree source path as protected and do not mutate it.

### W0.2 Completed source integration checkpoint

- PR #173 completed the reviewed private-staging integration and was merged using a merge commit;
- preserve source checkpoint `213d02ea54c6235ca042b45ff29c8b0b1193461a`, tree `140e552cac6867a6f4e9de55aaf7657faa7498ae`, and its sealed receipt set;
- treat PR #172 and earlier staging branches only as historical inputs, never as current execution authority;
- reuse a completed CUT checkpoint only through the invalidation rules in W11.4;
- rebuild exact artifacts and packets after source changes even when a functional checkpoint remains derivable.

### W0.3 Approval authority

Before W12 or W13 external mutation, validate the existing signed owner registry and a new action-specific authorization for:

- exact real-data inventory roots and allowed domains;
- isolated rehearsal target, operators, retention, mail sink, and cleanup disposition;
- exact-main production infrastructure, provider, backup, migration, cutover, signing, release, and conditional go-live;
- any narrowly scoped IAM or KMS exception still required by the reviewed change set.

Approval binds exact SHA/tree/artifact and the signed inventory rule. A content delta inside an approved source root may use the preauthorized deterministic delta procedure only when record schema, transform, entity class, target, operator, and security boundary remain unchanged. A new source root, schema, authority, target, operator, cost boundary, or security exception requires new approval.

### W0 completion evidence

- baseline receipt;
- worktree status;
- protected-root no-change check;
- completed private-staging checkpoint registry;
- source-controlled historical state vs sealed external receipt reconciliation;
- approval-gap report.

## 8. W1 — Source inventory and field contract

Status: `SAFE_INVENTORY_COMPLETE_REAL_AUTHORITY_ADJUDICATION_REQUIRED`.

The safe inventory is not an import authorization. It reports 287 candidate files, 84 duplicate candidates, 203 manual-review candidates, 857 field paths, two roster gaps, two lower-case email collisions, and zero authoritative selections. W12 must close every unresolved item before rehearsal.

### W1.1 Candidate sources

Inventory without emitting raw values:

- `~/Library/Application Support/LawFirmOS/runtime-stores`;
- `~/Library/Application Support/@law-firm-os/desktop/runtime-stores`;
- `~/Library/Application Support/Electron/runtime-stores`;
- `~/lawos-backups` generations;
- packaged application user-data roots;
- legacy `/mnt/lawos` production EFS and related S3 backup manifests when later approved;
- account, role, roster, contact, and professional-profile registries;
- DMS object manifests and metadata stores.

For each candidate record only pseudonymous source reference, SHA-256, size, mtime, mode, schema version, tenant count, record-type count, generation, and classification.

### W1.2 Source classifications

Every candidate must be one of:

- `authoritative`;
- `superseded`;
- `duplicate`;
- `synthetic`;
- `corrupt`;
- `manual-review`.

Do not select authority solely by modification time. Use generation lineage, record identity, state version, audit chronology, and owner-approved source manifest.

### W1.3 Field dispositions

Every discovered field must be one of:

- `postgres-live`;
- `postgres-json-payload`;
- `postgres-specialized-identity`;
- `s3-dms-byte-object`;
- `derived-recompute`;
- `encrypted-archive-only`;
- `secret-excluded`;
- `synthetic-excluded`;
- `rejected-with-reason`.

No silent drop is allowed.

Every live generic-ledger record type must also define:

- canonical `record_type` and deterministic `record_id`;
- tenant derivation and tenant-required rule;
- JSON schema and allowed additional-field behavior;
- state-version source and optimistic concurrency rule;
- logical unique keys and reference keys;
- secret/raw-byte deny fields;
- idempotency, audit, and outbox expectations;
- whether high-volume lookup requires a measured expression or partial index.

### W1.4 Required reconciliations

- registered account vs roster count and identity mapping;
- employee vs employee-user-link coverage;
- professional profile, career, education, and qualification coverage;
- email uniqueness per tenant using lower-case comparison;
- matter-code uniqueness and non-empty constraint;
- matter-to-client, client-to-party/entity, matter-to-employee, and DMS/finance/portal reference integrity;
- tenant presence for every live record;
- synthetic marker and approved real-tenant classification.

Because the generic ledger does not provide domain foreign keys for JSON payloads, W1 must produce a logical-reference validator for employee/account, client/matter, matter-code, DMS/matter, finance/matter, portal/client, and ordered professional-history relationships. Database RLS is necessary but does not replace this cross-record reconciliation.

## 9. W2 — Internal email authentication authority

Status: `SOURCE_AND_SYNTHETIC_STAGING_COMPLETE`; real account import and production delivery remain W12/W13 work.

### W2.1 Authority selector

- add an explicit staff-auth authority selector;
- make `internal-password` the selected operational mode for this plan;
- load Entra only when `entra-oidc` is explicitly selected;
- do not request or require Entra secret references in internal-password mode;
- update runtime capability and health output to report the selected authority safely;
- fail production readiness if any Entra tenant, client, Conditional Access, FIDO2, or break-glass evidence is still required for the selected internal-password mode.

### W2.2 PostgreSQL account discovery

- add tenant-scoped and email-normalized PostgreSQL account lookup;
- remove operational dependency on the static account registry;
- persist tenant membership, roles, groups, and scopes in PostgreSQL;
- keep all account, membership, and credential operations under tenant RLS and transaction boundaries;
- retain static fixtures only for local tests and synthetic packaging.

### W2.3 First-use password setup

Migrated accounts are created with:

- the source-approved `account_status`, never an unconditional active status;
- `credential_provider=lawos-internal-password-v1`;
- `credential_status=reset_required` only for approved active accounts;
- disabled, departed, suspended, and duplicate-adjudication accounts remain unable to authenticate;
- `password_hash={}`.

The flow must:

1. accept the registered email address;
2. return an enumeration-safe generic response;
3. create a tenant-bound hash-only single-use challenge;
4. send the setup link through the environment-specific approved delivery adapter;
5. validate expiry, tenant binding, one-time use, and password policy;
6. write only a scrypt password hash;
7. activate the credential and increment credential revision;
8. revoke prior sessions and open reset challenges;
9. append immutable audit evidence without secret material.

Production migration does not bulk-create or bulk-send reset links. It imports account state only. An active user receives a reset link after an individual request to the registered address; a disabled or unknown account receives no delivery while the public response remains enumeration-safe.

### W2.4 Authentication tests

- known and unknown email response equivalence;
- first-use reset-required login rejection;
- setup email send to approved synthetic mailbox;
- valid confirmation and login;
- expired, replayed, and tampered link rejection;
- failed-login lockout;
- disabled-account rejection;
- tenant and role negatives;
- cold restart and session-revocation behavior.

## 10. W3 — Lossless migration engine

Status: `SYNTHETIC_ENGINE_COMPLETE_REAL_DATA_AND_PRODUCTION_EXECUTOR_PENDING`.

### W3.1 Supported modes

- `inventory`;
- `validate-only`;
- `dry-run`;
- `import`;
- `readback`;
- `reconcile`;
- `resume`.

All modes must use the same transformation code.

The current central-ledger cutover runner intentionally refuses production `execute` mode. Before W13, implement or designate one approval-gated executor that:

- accepts only a signed exact inventory and exact-main packet;
- separates `dry-run`, `stage`, `commit`, and `readback`;
- writes a signed first-production-write boundary;
- supports deterministic checkpoint/resume without changing transform semantics;
- refuses execution when source, schema, migration, target, operator, or artifact binding drifts.

### W3.2 Import outputs

For every tenant/domain/record type, output safe counts and hashes only:

- source count;
- accepted count;
- rejected count;
- rejected reason-code counts;
- source hash;
- snapshot hash;
- invariant hash;
- target readback hash;
- state-version distribution;
- replayed/no-op count;
- orphan count;
- tenant-negative visible count.

### W3.3 Domain mapping order

1. tenant, account, membership, role, and permission foundation;
2. HRX employees, employment profiles, employee-user links, and professional history;
3. master-data party, person, organization, entity, client group, and billing profile;
4. CRM and intake;
5. matter, matter code, members, assignments, tasks, and history;
6. DMS metadata and S3 objects;
7. finance and client portal;
8. audit, idempotency, and outbox;
9. analytics and derived projections.

For generic-ledger imports, each row maps to canonical `(tenant_id, record_type, record_id, state_version, data)` plus idempotency, audit, and outbox expectations. Identity rows use the specialized PostgreSQL identity schema. DMS bytes use the S3 provider and never enter `data jsonb`.

### W3.4 Rejected-row contract

- stable machine-readable reason code;
- pseudonymous record reference;
- domain and record type;
- source-manifest digest;
- no raw value or PII;
- explicit retryable/non-retryable classification;
- import transaction never partially commits a rejected dependency set.

### W3.5 Replay and recovery

- immediate identical replay is a no-op;
- no state-version increment on replay;
- no duplicate audit or outbox event;
- interruption checkpoints are source-hash bound;
- resume produces the same final invariant hash as uninterrupted execution;
- baseline conflict returns a safe 409 and never overwrites newer state.

### W3.6 Transaction and capacity contract

- preserve HMAC-authenticated tenant context with a secret of at least 32 bytes;
- preserve selectable isolation, the `15s` statement timeout, and the bounded three-attempt retry policy;
- use `transactionMany` when a request commits multiple participating domains;
- measure records materialized per tenant/request, batch sizes, p50/p95/p99 latency, retry/conflict rate, connection-pool saturation, and outbox lag during W12;
- derive production batch and concurrency limits from W12 measurements rather than inventing thresholds;
- stop if the approved production acceptance threshold cannot be met without weakening tenant, transaction, durability, or DMS controls.

### W3.7 HRX relational boundary

- import HRX operational state through the current generic-ledger materialization contract for Phase 1;
- validate the current 32 source migrations, 77 store tables, 11 append-only tables, 26 directly compatible migrations, and six translated-trigger migrations as source capabilities, not as proof that `lawos_hrx` is the runtime authority;
- do not block W13 merely to replace the already validated HRX generic-ledger authority;
- do not dual-write generic records and `lawos_hrx` tables;
- defer one-way relational read projection and any later authority promotion to W15.

## 11. W4 — Private-staging IaC conversion

Status: `COMPLETE_AND_DEPLOYED`; retain as the rehearsal design reference, not as production infrastructure.

### W4.1 Network

- dedicated VPC;
- at least two availability zones;
- private database subnets;
- private Lambda subnets;
- RDS subnet route tables with no internet default route;
- `PubliclyAccessible=false`;
- RDS security group accepts only the staging Lambda security group;
- API Gateway is the only public application ingress;
- S3 gateway endpoint;
- tightly scoped outbound path for SES and Secrets Manager;
- no connection to the existing AMIC staging VPC.

### W4.2 RDS

- PostgreSQL staging instance;
- encrypted gp3 storage;
- TLS verify-full;
- deletion protection;
- PITR and backup retention;
- least-privilege application role;
- authenticated tenant-context authority;
- migration checksum verification;
- RLS and FORCE RLS for every tenant table.

### W4.3 Lambda and IAM

- `lawos-private-staging-api-role` only for the API Lambda;
- `lawos-private-staging-admin-role` only for direct-invoke bootstrap/CUT operations;
- no production role reuse;
- temporary ENI bootstrap Allow limited to the six approved EC2 actions;
- explicit `lambda:SourceFunctionArn` Deny retained;
- automatic post-create update removes the temporary Allow;
- admin Lambda has no public route;
- API Lambda has no migration/bootstrap permission.

### W4.4 Secrets

Keep only staging-specific references for:

- database master/application credential;
- tenant-context secret;
- session HMAC secret;
- payroll artifact key;
- DMS provider reference;
- synthetic manifest.

Remove the Entra configuration secret and every Entra-specific environment variable, output, validator, and runbook dependency.

### W4.5 S3/DMS

- dedicated bucket;
- public access block;
- versioning;
- SSE-KMS;
- tenant namespace;
- Object Lock enabled at bucket creation and required by the deployment validator;
- digest readback;
- legal hold precedence;
- no unapproved permanent delete.

### W4.6 Cost

- preserve the verified private-staging forecast of `KRW 147,630`;
- maintain the owner ceiling of KRW 300,000/month across the approved LawOS AWS scope defined by the production packet;
- create cost alarms;
- stop if a CloudFormation change set adds an unmodeled persistent service or exceeds the cap;
- never remove Multi-AZ, encryption, PITR, Object Lock, private networking, or deletion protection merely to fit the cap; request an explicit cost/availability decision instead.

## 12. W5 — Local and disposable-PostgreSQL validation

Status: `PRIVATE_STAGING_CHECKPOINT_PASS`; run targeted tests during consolidated W12/W13 source work, then one final full source suite after the batch is complete.

Required checks:

- formatting and syntax;
- focused unit tests for changed modules;
- migration and checksum tests;
- disposable PostgreSQL foundation and HRX migrations;
- tenant RLS positive and negative tests;
- account/membership/email lookup tests;
- password reset and SES adapter tests;
- full synthetic migration-corpus tests;
- rejected-row tests;
- replay/no-op tests;
- failure/resume tests;
- DMS namespace/digest/hold/retention/delete tests;
- IaC contract tests;
- CloudFormation template validation;
- IAM wildcard validator;
- secret/PII evidence scan;
- JSON writer/fallback/dual-write static validator;
- missing-JSON operational smoke.

Completion requires all applicable checks PASS, no critical/high security finding, and no unexplained test skip. Local absence of `initdb` or `pg_ctl` may explain a developer-machine skip but cannot satisfy the gate. Exact-head CI must provision PostgreSQL and prove the required PostgreSQL test set ran with required-skip count zero.

## 13. W6 — Exact-head artifact, CI, security, and authorization

Status: `PRIVATE_STAGING_CHECKPOINT_PASS`; a new exact-head artifact and packet are required after W12/W13 source changes.

### W6.1 Artifact

- build from a clean exact head;
- bind source SHA/tree, lockfile digest, artifact SHA-256, and RDS CA digest;
- exclude real roster/account/contact/professional-profile content from source artifacts and CI artifacts;
- bind real-data execution separately through a private signed inventory digest;
- upload to the existing versioned artifact bucket with digest metadata;
- never reuse a private-staging artifact after source changes.

### W6.2 Exact-head verification

- push implementation branch;
- create or update a PR;
- require exact-head CI;
- require security review;
- confirm the PR head did not change after approval;
- freeze the deployment artifact digest.

### W6.3 Required new authorization

For W12, stop before real-data read or rehearsal write unless an owner-approved signed receipt authorizes the exact:

- source SHA;
- source tree;
- artifact SHA-256;
- source inventory root and deterministic delta rule;
- field crosswalk and transform digest;
- isolated rehearsal target;
- approved domains, operators, retention, mail sink, and cleanup disposition.

For W13/W14, stop before production mutation unless a later exact-main conditional approval additionally binds production infrastructure, provider, backup, cutover, DR, signing, release, and conditional go-live.

## 14. W7 — AWS private-staging creation and bootstrap

Status: `PASS_CHECKPOINT`; do not rebuild merely to begin W12.

Execution order:

1. AWS SSO login through the documented Matter role chain;
2. caller identity check using the staging role;
3. read-only protected-resource inventory and fingerprints;
4. artifact-store verification;
5. CloudFormation validation;
6. main-stack change-set creation with temporary ENI bootstrap enabled;
7. change-set inspection for protected changes, public networking, IAM roles, wildcard actions, and cost;
8. change-set execution;
9. wait for complete success;
10. confirm both Lambda functions `Active/Successful`;
11. update stack with temporary ENI bootstrap disabled;
12. confirm temporary IAM policy removal;
13. direct-invoke database bootstrap;
14. run foundation and application migrations;
15. configure least-privilege application role and two synthetic tenant authorities;
16. verify TLS, PITR, deletion protection, RLS, S3/KMS/versioning/Object Lock, and log encryption;
17. compare protected-resource fingerprints;
18. sign the infrastructure and bootstrap receipts.

Any rollback or partial stack failure is a stop. Before the first DB write the new stack may be deleted or isolated. After DB writes, recovery uses the staging DB backup/forward-repair path and never JSON dual-write.

## 15. W8 — CUT-005 migration accuracy

Status: `SIGNED_PASS_CHECKPOINT`.

### W8.1 Corpus

Generate a fully synthetic corpus derived from every approved legacy JSON schema, including:

- accounts and memberships;
- HRX professional history;
- client/master-data/CRM/intake;
- matter codes and matter relationships;
- DMS metadata;
- finance, portal, audit, idempotency, and outbox;
- deliberately invalid tenant, FK, version, duplicate, and malformed rows.

Use at least two approved synthetic tenants. No real value may enter the corpus.

### W8.2 Assertions

- source count equals accepted plus rejected;
- accepted count equals PostgreSQL readback count;
- source, snapshot, target, and invariant hashes agree;
- expected state versions agree;
- every rejected row has a stable reason code;
- unexpected rejection count is zero;
- immediate replay adds zero records, versions, audits, or outbox events;
- wrong-tenant visibility is zero;
- mid-import failure rolls back;
- resume equals uninterrupted execution.

### W8.3 Receipt

Create an independently signed CUT-005 receipt bound to exact source/tree/artifact/stack/template and containing commands, exit codes, timestamps, profile, safe counts, hashes, and no secret/PII.

## 16. W9 — CUT-006 PostgreSQL-only authority

Status: `SIGNED_PASS_CHECKPOINT`.

### W9.1 Deployed configuration

Require:

- `LAWOS_RUNTIME_PROFILE=operational`;
- `LAWOS_PERSISTENCE_AUTHORITY=postgres-v2`;
- `LAWOS_STAFF_AUTHORITY=internal-password`;
- zero JSON store-path environment variables;
- zero real JSON stores in the artifact;
- no file-current initialization.

### W9.2 Write matrix

Execute a new synthetic write and readback for identity, HRX, master-data, CRM, intake, matter, DMS, finance, portal, analytics, audit, and outbox. For each:

- PostgreSQL row/version changes exactly once;
- idempotency replay is a no-op;
- audit and outbox evidence exists;
- wrong-tenant read is denied;
- no JSON file is created or modified.

### W9.3 Required zero counters

- `json_fallback_count=0`;
- `json_writer_count=0`;
- `dual_write_count=0`;
- `file_current_authority_count=0`;
- `offline_mutation_count=0`;
- `memory_fallback_count=0`.

### W9.4 Missing-JSON proof

- deploy without runtime-store files;
- install a test sentinel that fails if a legacy file adapter is invoked;
- cold start the Lambda;
- repeat representative writes and reads;
- verify the same PostgreSQL-only counters and readback.

### W9.5 Receipt

Create and verify an independently signed CUT-006 receipt. CUT-006 cannot pass from source inspection alone; it requires observations from the deployed stack.

## 17. W10 — CUT-007 complete synthetic user journeys

Status: `SIGNED_PASS_CHECKPOINT`, including browser flow and cold-restart PostgreSQL readback.

### W10.1 Authentication

- approved synthetic user enters registered email;
- setup email reaches the approved synthetic mailbox;
- link opens the staging reset flow;
- password is set;
- login, session read, logout, and re-login pass;
- reused, expired, and tampered links fail;
- unknown email returns an enumeration-safe response;
- failed-login lockout works;
- disabled account fails;
- role and tenant negatives pass.

### W10.2 Employee and professional history

- employee list and detail;
- self profile;
- employment history;
- career, education, qualifications, and practice areas;
- employee-user linkage;
- role-scoped HR data exposure;
- compensation denial for an unauthorized role;
- synthetic HRX mutation and PostgreSQL readback.

### W10.3 Client and matter

- client search and detail;
- party/entity/client-group relationships;
- CRM opportunity;
- intake and conflict check;
- clearance decision;
- matter creation with matter code;
- staff assignment and member linkage;
- matter list, search, detail, and update;
- idempotency replay;
- role and tenant negatives.

### W10.4 DMS

- tenant-namespaced upload;
- stage and finalize;
- digest readback;
- document/version/matter linkage;
- legal hold and retention;
- held-object delete denial;
- mismatched document/object delete denial;
- permanent-delete denial without approval;
- wrong-tenant object visibility zero.

### W10.5 Full critical path

```text
first-use email setup
→ staff login
→ employee profile/history
→ client lookup
→ intake/conflict
→ matter creation
→ staff assignment
→ DMS upload
→ finance/portal projection
→ audit/outbox verification
→ cold restart
→ state readback
```

Run API integration proof plus a real browser/desktop Forest critical-flow smoke pointed at the staging API.

### W10.6 Receipt

Create and verify an independently signed CUT-007 receipt. No real staff, client, or document data is used.

## 18. W11 — Sealing, commit, PR, merge readiness, and gated continuation

Status: `SIGNED_PASS_AND_MERGED_CHECKPOINT`.

### W11.1 Independent receipts

The completed private-staging closeout produced and validated sixteen of sixteen required receipts covering:

- source baseline;
- PR #172 reuse/adjudication, as named by the historical sealed receipt;
- source/field contract;
- internal-password authority;
- migration engine;
- local/disposable-PostgreSQL validation;
- artifact reproduction;
- exact-head CI;
- security review;
- infrastructure deployment;
- database bootstrap;
- cost verification;
- protected-resource non-interference;
- CUT-005;
- CUT-006;
- CUT-007.

Every receipt must contain `started_at`, `finished_at`, `command`, `exit_code`, `profile`, `safe_counts`, exact source/tree/artifact binding, and only allowed execution states.

Future W12~W14 receipts must satisfy the same contract. Existing private-staging receipts are preserved by digest and are not regenerated merely to change this plan.

### W11.2 Source commit discipline

- commit cohesive implementation units;
- do not stage unrelated files;
- preserve the protected root;
- run validators after the final source commit;
- push only after local gates pass;
- require exact-head CI after the final push;
- do not amend or force-push after the deployment approval without obtaining a new approval.

PR #173 has already passed this discipline and is merged. New W12/W13 source changes use a new branch and PR from current `origin/main`; they must not reopen or rewrite PR #173.

### W11.3 Final classification

The final report must state separately:

- source implementation status;
- private-staging deployment status;
- CUT-005 status;
- CUT-006 status;
- CUT-007 status;
- merge readiness;
- exact W12 authorization and source-inventory adjudication status;
- exact W13 authorization and production-migration readiness;
- remaining release, signing, production-traffic, and go-live blockers.

The current classification is:

- source implementation: PASS for generic-ledger authority and synthetic staging;
- private-staging deployment: PASS;
- CUT-005/006/007: signed PASS;
- private-staging merge: COMPLETE;
- real-data inventory authority: INCOMPLETE;
- W12 rehearsal: NOT EXECUTED;
- CUT-008~012 and production migration: NOT EXECUTED;
- signing, release, production traffic, and go-live: NOT EXECUTED.

### W11.4 Checkpoint invalidation and targeted resume

Do not restart the entire ladder after every bounded fix. Resume from the first invalidated gate:

| Change class | Resume point |
|---|---|
| receipt projection, safe-count rename, or evidence formatting only | regenerate and validate affected receipts only |
| evidence collector or packet generator only | collector, exact binding, artifact/packet sealing |
| production IaC only | production infrastructure preflight and CUT-008 |
| internal-auth or mail path only | authentication slice and affected W12/W13 user-flow gate |
| one domain transform or record schema | affected domain rehearsal plus aggregate reconciliation |
| inventory content delta under unchanged approved roots/schema/transform | delta dry-run and delta rehearsal |
| DMS provider, namespace, digest, hold, or retention contract | DMS rehearsal and later gates |
| generic ledger schema, RLS, tenant HMAC, transaction, or cross-domain flush | full W12 rehearsal |
| runtime dependency change | exact-head CI plus all functionally affected acceptance gates |
| exact source SHA change with proven receipt/evidence-only delta | CI/artifact/packet rebind; derive unaffected functional checkpoints by digest |
| first production write already recorded | PITR or forward repair; never restart through JSON authority |

During source development, run focused tests for the changed contracts. After the complete source-local remediation batch is fixed, run the final full source suite exactly once. Cloud and CUT gates run only when their predecessor contract changed or their checkpoint was invalidated.

## 19. W12 — Signed-inventory real-data rehearsal

Status: `NOT_EXECUTED_NEXT_PROGRAM_GATE`.

### W12.1 Entry gates

W12 starts only after a signed authorization binds the exact source SHA/tree, migration artifact, canonical source-inventory root digest, deterministic delta rule, record-type schema catalog, field-crosswalk digest, isolated rehearsal target, reset-email sink, allowed data domains, retention rules, operators, and deletion/cleanup disposition. The authorization must prohibit production writes, external email delivery, raw PII in evidence, and any source mutation. No arbitrary calendar migration window is required; the authorization uses an owner-triggered start receipt, operator identity, and exact first-write boundary.

### W12.2 Inventory adjudication

- freeze the candidate inventory without changing source content;
- resolve every duplicate generation by lineage, stable record identity, state version, audit chronology, and owner decision rather than modification time alone;
- resolve all roster gaps and duplicate-email collisions explicitly;
- classify every discovered field as `live`, `derived`, `archive-only`, `secret-excluded`, `synthetic-excluded`, or `rejected-with-reason`;
- require every real account, employee, professional-history, client, matter-code, matter, DMS metadata, finance, portal, audit, idempotency, and outbox source to map to an approved destination or explicit exclusion;
- generate canonical per-source and per-record hashes, safe counts, relationship counts, and a signed immutable inventory manifest without placing raw PII in receipts.
- assign every operational item to generic ledger, specialized identity, S3 DMS byte object, derived-rebuild, archive-only, or reject;
- validate canonical record IDs, state versions, logical unique keys, reference keys, and tenant derivation before any rehearsal write;
- treat lower-case email and matter-code collisions as blocking owner decisions, never automatic last-write-wins.

The current inventory baseline has 287 candidate files, 84 duplicate candidates, 203 manual-review candidates, 857 discovered fields, two roster gaps, and two duplicate-email collisions. None of those exceptions may be silently resolved or counted as migrated.

### W12.3 Isolated rehearsal execution

1. create or designate a private rehearsal database isolated from production and from the synthetic CUT database;
2. verify TLS `verify-full`, least-privilege roles, RLS, PITR/snapshot recovery, audit, outbox, and zero public reachability;
3. route every password-reset notification to an approved non-delivery sink and prove external send count is zero;
4. run migration `dry-run`, validate the deterministic plan digest, then run `apply` with checkpoint/resume enabled;
5. import only rows named by the signed inventory in dependency order: tenants and specialized identity, HRX generic-ledger records, master-data/CRM/intake, clients and matters, DMS metadata and tenant-namespaced S3 objects, finance/portal, audit/idempotency/outbox;
6. repeat the same migration and prove a complete no-op with stable hashes and no duplicate audit/outbox effects;
7. run wrong-tenant and wrong-role negative reads, relationship-integrity checks, and cold-restart readback;
8. retain no active password or legacy password hash and emit no raw PII, document bytes, token, or credential into evidence;
9. inject baseline conflicts, transaction retries, timeouts, interruption/resume, DMS provider failure, and outbox failure without permitting partial cross-domain commit;
10. measure tenant/request materialization size, batch size, p50/p95/p99, retry/conflict rate, connection-pool saturation, outbox lag, DMS throughput, and restore duration;
11. derive and sign production concurrency, batch, capacity, and timeout acceptance values from the measured dataset.

### W12.4 Reconciliation and exception closure

- reconcile source/destination counts and canonical hashes by tenant, entity, domain, relationship, and version;
- reconcile employee-user links, career/education/qualification history ordering, client-matter relationships, matter codes, DMS versions, legal holds, retention, audit, idempotency, and outbox;
- run the generic-ledger logical-reference validator because JSON payloads do not gain relational foreign keys merely by moving into PostgreSQL;
- require zero unexplained variance and zero unexpected rejected rows;
- manually adjudicate every expected rejection and bind each decision to a pseudonymous row reference and reason code;
- run owner-selected read-only user-visible samples without exposing raw evidence;
- restore the rehearsal database independently and repeat the reconciliation before PASS.

### W12.5 Terminal evidence

W12 completes only with independently signed and verified PASS receipts for inventory freeze/adjudication, record-type schema and logical-reference validation, rehearsal infrastructure, sink enforcement, migration, idempotent replay, tenant/RLS negatives, transaction/failure injection, capacity/performance acceptance, DMS Object Lock/digest/hold/retention, reconciliation, isolated restore, and owner sampling. The consolidated W12 receipt binds all component receipt digests and proves production write count and external email send count are both zero.

## 20. W13 — Exact-main production migration, CUT-008~012, and JSON retirement

Status: `NOT_EXECUTED_REQUIRES_W12_PASS_AND_EXACT_MAIN_AUTHORIZATION`.

### W13.1 Entry gates and conditional authorization

W13 starts only after W12 PASS and a signed authorization binds:

- the exact final `origin/main` SHA/tree and production artifact;
- schema, migration, lockfile, SBOM, checksum, and provenance digests;
- approved base inventory, deterministic delta rule, field crosswalk, record-type schema, and transform digests;
- production RDS, DMS S3 provider, backup, retention, logging, and secret-reference targets;
- `matter-prod-deploy-admin`, `matter-cutover-operator`, and `matter-readonly-auditor` operator boundaries;
- approved safe counts, performance/capacity acceptance, RPO/RTO objectives, first-write boundary, and post-write runbook;
- internal-email notification policy and explicit prohibition on bulk reset delivery;
- W13 infrastructure, CUT-008~012, W14 signing/release, and conditional go-live actions.

No arbitrary fixed migration time window is required. The authorization uses an owner-triggered start receipt, exact operator session, source-writer freeze marker, and first-production-write marker. SHA/tree, schema, migration, source root, entity class, transform, target, operator, IAM, cost, or security-boundary drift invalidates the authorization.

### W13.2 Production provisioning and CUT-008 readiness

1. provision or validate private production RDS PostgreSQL with `PubliclyAccessible=false`, private subnets, TLS `verify-full`, Multi-AZ, deletion protection, encrypted storage, PITR, and audited secret rotation;
2. provision or validate production Lambda/VPC, least-privilege roles, KMS, logging, alarms, and private service endpoints without reusing staging roles;
3. provision or validate DMS S3 with public access blocked, SSE-KMS, versioning, tenant namespace, Object Lock, legal-hold precedence, digest readback, and no unapproved permanent delete;
4. verify `lawos_runtime` RLS and forced RLS, HMAC tenant-context authority, specialized identity schema, audit trigger, outbox, and application grants;
5. fingerprint protected AMIC and existing production resources and prove unrelated mutation count zero;
6. verify monthly forecast against the `KRW 300,000` ceiling without weakening required controls;
7. run exact-main CI/security evidence collection and require mandatory PostgreSQL tests executed with required-skip count zero;
8. have the readonly auditor validate infrastructure, IAM, schema, migration checksums, provider, backup, retention, performance acceptance, and all predecessor receipts;
9. issue an independently signed CUT-008 PASS receipt before any production data write.

### W13.3 Pre-first-write controls

1. make immutable backups of every approved operational JSON source without modifying or deleting source content;
2. upload the approved off-device backup and prove an isolated restore;
3. freeze operational JSON writers and competing import jobs;
4. generate the final base-plus-delta inventory and validate it under the approved deterministic delta rule;
5. run a final read-only dry-run and require expected counts, rejections, relationships, migration checksums, target compatibility, and capacity to match W12 acceptance;
6. verify no unexpected source, PII exposure, raw DMS byte evidence, secret, or external email action;
7. issue `FIRST_PRODUCTION_WRITE_NOT_STARTED` and source-freeze receipts.

Before the first production PostgreSQL write, code/config rollback and target teardown are permitted. Once the first write receipt is recorded, JSON authority rollback and dual-write are forbidden.

### W13.4 CUT-009 production migration and authority switch

1. import only the signed manifest in the rehearsed dependency order with checkpoints and idempotency keys;
2. import accounts into the specialized identity ledger with approved status, registered email, and `reset_required` only for active accounts; import no password or password hash;
3. import HRX and the eleven product domains into the generic RepositoryPortV2 ledger according to canonical record-type contracts;
4. move DMS bytes only to approved tenant-namespaced Object Lock objects and commit metadata only after digest/version/retention verification;
5. stop on any unexpected rejection, duplicate, collision, version conflict, tenant/RLS failure, logical-reference failure, audit/outbox mismatch, source drift, timeout, or partial transaction signal;
6. run complete readback, logical-reference validation, and cross-domain reconciliation before authority activation;
7. switch operational authority to PostgreSQL RepositoryPortV2;
8. prove the six forbidden counters remain zero across warm and cold starts;
9. allow first-use password-setup delivery only after an individual active user requests it; never bulk-send reset links during migration;
10. issue an independently signed CUT-009 PASS receipt.

### W13.5 CUT-010 isolated DR restore

1. restore the production PostgreSQL backup or PITR point into an isolated target;
2. restore and verify DMS object/version/digest references without weakening Object Lock or legal hold;
3. reconcile tenant/domain/record-type counts, hashes, state versions, identities, logical relationships, audit, idempotency, and outbox;
4. run missing-JSON startup and representative read-only flows in the isolated environment;
5. measure actual RPO and RTO;
6. require independent readonly-auditor verification;
7. issue an independently signed CUT-010 PASS receipt.

CUT-011 cannot begin if restore, RPO, RTO, DMS, identity, or reconciliation acceptance fails.

### W13.6 CUT-011 operational JSON retirement

Disable and remove from production authority:

- JSON fallback;
- JSON writer;
- dual-write;
- file-current authority;
- offline mutation;
- memory fallback;
- operational JSON store-path configuration.

Then:

1. make the absence of runtime JSON files the production test condition;
2. run warm start, cold start, representative writes/reads, critical background jobs, audit, and outbox smoke;
3. prove each forbidden counter equals zero;
4. retain legacy JSON only as immutable encrypted migration evidence or backup under the approved retention decision;
5. issue an independently signed CUT-011 PASS receipt.

Development and test fixtures may remain only when their paths and profiles cannot become production authority.

### W13.7 CUT-012 terminal closeout

Close CUT-012 only after all of the following pass:

- complete real-data count, hash, version, rejection, collision, orphan, and logical-reference reconciliation;
- tenant RLS, HMAC context, role authorization, transaction atomicity, audit, idempotency, and outbox;
- registered-email first-use setup for an individually requested approved account and disabled-account denial;
- DMS namespace, digest, version, Object Lock, legal hold, retention, and delete controls;
- isolated restore and measured RPO/RTO;
- missing-JSON operation and all six forbidden counters equal zero;
- production critical flows;
- every CUT-008~011 component receipt and signature.

Issue a signed CUT-012 terminal receipt bound to the exact production source/tree/artifact, inventory, migration, infrastructure, backup, and predecessor receipt digests. W13 completes only when CUT-012 passes.

## 21. W14 — Exact-main signing, formal release, and conditional go-live

Status: `NOT_EXECUTED_REQUIRES_CUT_012_PASS`.

### W14.1 Release candidate

- rebuild from clean exact-main; do not reuse ad-hoc `matter.app` or an older-SHA package;
- reproduce artifacts deterministically where supported;
- verify SBOM, checksums, provenance, dependency inventory, and secret scan;
- bind every package to the production SHA/tree used by CUT-012.

### W14.2 Signing and publication

- macOS Developer ID sign, notarize, staple, and verify;
- Windows Authenticode sign and verify;
- create the formal tag only after signing gates pass;
- publish artifacts, SBOM, checksums, and provenance together;
- issue independent macOS signing, Windows signing, and formal-release receipts.

### W14.3 Production smoke and go-live

- install or deploy only the signed exact-main artifacts;
- run production smoke, tenant isolation, internal-email authentication, critical domain flows, DMS, audit/outbox, backup visibility, and CUT-012 receipt verification;
- activate production traffic only if every gate is PASS and no stop condition is active;
- issue a separate final go-live receipt; a broad conditional approval is not itself the go-live receipt;
- monitor through event-based acceptance covering critical scheduled jobs, background workers, and representative authorized operations rather than inventing an arbitrary migration window.

### W14.4 Release rollback

- before production data writes, code/config rollback follows the pre-write boundary;
- after production data writes, database recovery remains PITR or forward repair;
- a signed application artifact may roll back only when schema compatibility is proven and it does not restore JSON authority or dual-write.

## 22. W15 — Post-go-live HRX and domain relational projections

Status: `SEPARATE_NON_BLOCKING_FOLLOW_ON`.

The generic JSONB ledger is the Phase-1 production authority. W15 improves relational queryability without rewriting the completed authority migration:

1. measure production record types, JSON paths, query frequency, cardinality, and latency;
2. use existing HRX relational migration tooling and selected domain tables only for demonstrably valuable read projections;
3. populate projections one-way from outbox/CDC, never by dual-writing an operational request;
4. keep projection consumers read-only until shadow counts, hashes, ordering, references, and performance pass;
5. ensure projection failure cannot partially commit or overwrite generic-ledger authority;
6. introduce expression or partial JSONB indexes only from measured lookup needs;
7. require a separate authority-decision packet before any projection becomes a write authority;
8. report Phase-1 operational migration and W15 relational modernization as separate completion claims.

## 23. Stop conditions

Stop immediately on any of:

- source SHA/tree/artifact mismatch;
- source inventory root, deterministic delta rule, record-type schema, field crosswalk, transform, migration, stack, provider, operator, or receipt digest mismatch;
- exact-head CI or security failure;
- a required real-PostgreSQL test being skipped;
- protected AMIC or production resource mutation;
- public RDS or S3;
- staging/production IAM reuse or excessive IAM;
- Lambda VPC attachment failure;
- temporary ENI Allow not removed;
- unapproved wildcard Allow;
- monthly forecast above KRW 300,000;
- migration checksum drift;
- TLS verify-full failure;
- tenant/RLS or HMAC tenant-context failure;
- cross-domain partial commit or `transactionMany` atomicity failure;
- approved performance, pool, timeout, capacity, RPO, or RTO acceptance failure;
- unexpected rejected row or unresolved source conflict;
- unresolved account/email, matter-code, record-ID, state-version, or logical-reference collision;
- JSON fallback, writer, dual-write, file-current, offline mutation, or memory fallback activity;
- DMS digest, version, namespace, Object Lock, legal-hold, retention, or delete-control failure;
- backup upload, isolated restore, or reconciliation failure;
- reset-link replay, tampering, enumeration, or unauthorized delivery;
- bulk password-reset delivery or delivery to a disabled/unknown account;
- secret or PII exposure;
- critical user-flow failure;
- signing, notarization, stapling, Authenticode, SBOM, checksum, or provenance failure;
- missing approval for the next external mutation.

After `FIRST_PRODUCTION_WRITE_NOT_STARTED`, rollback may remove or replace uncommitted code/config. After the signed first-production-write marker, recovery is restricted to PITR, forward repair, or the approved post-write runbook and must never reactivate JSON authority.

## 24. Evidence locations

Source-controlled evidence and validators belong under the existing workbook/runtime-safety conventions. Sensitive execution artifacts belong outside the repository under:

`/Users/jws/.codex/recovery/law-firm-os/json-postgres-production-program-runs-20260723/`

Recommended subdirectories:

- `baseline/`
- `source-inventory/`
- `field-crosswalk/`
- `artifact/`
- `aws-change-sets/`
- `infrastructure/`
- `database-bootstrap/`
- `cut-005/`
- `cut-006/`
- `cut-007/`
- `checkpoint-registry/`
- `record-type-schemas/`
- `logical-reference-validation/`
- `performance-capacity/`
- `real-data-rehearsal/`
- `cut-008/`
- `cut-009/`
- `cut-010-dr/`
- `cut-011-json-retirement/`
- `cut-012-terminal/`
- `production-migration/`
- `macos-signing/`
- `windows-signing/`
- `formal-release/`
- `go-live/`
- `relational-projections/`
- `receipts/`
- `final-readiness/`

Directories must be mode `0700`; sensitive files must be mode `0600`. Receipts store safe counts, hashes, pseudonymous references, and signatures only.

The completed private-staging checkpoint remains under the existing sealed external evidence root and is referenced by digest; do not copy secrets or regenerate historical evidence merely to place it under the new directory.

## 25. Definition of done

The operational program is complete only when every W0~W14 item is either:

- implemented and verified with cited evidence; or
- explicitly marked blocked by a named external approval that was not granted.

The success terminal additionally requires:

- all 287 currently known source candidates and any approved delta candidates have final dispositions;
- zero authoritative-selection gaps, unresolved manual-review items, roster gaps, lower-case email collisions, matter-code collisions, unexpected rejections, unexplained orphans, and unexplained count/hash/version/reference variance;
- all approved real accounts, employee IDs, professional history, client information, matter codes, matter relationships, DMS metadata/bytes, and supporting domains are present under the approved PostgreSQL/S3 authority;
- all eleven product domains, HRX, and identity operate under PostgreSQL authority;
- Entra readiness dependencies are zero for internal-password mode;
- all six JSON/file/offline/memory counters equal zero and missing-JSON production smoke passes;
- CUT-008~012, isolated DR, signing, formal release, and final go-live each have independent signed PASS receipts.

No item may be silently omitted, summarized into a blanket PASS, or counted complete from a schema-valid but unexecuted receipt. W12, W13, and W14 remain independently authorized terminals and must not be represented as completed by CUT-005~007, source implementation, an unsigned inventory, or a passing CI badge.

W15 is a documented non-blocking follow-on. Operational JSON-to-PostgreSQL authority migration may complete at W14 while the system still uses generic JSONB records. Therefore final reporting must say `POSTGRESQL_OPERATIONAL_AUTHORITY_COMPLETE` rather than `FULL_RELATIONAL_NORMALIZATION_COMPLETE` unless W15 later proves the latter under a separate authority decision.
