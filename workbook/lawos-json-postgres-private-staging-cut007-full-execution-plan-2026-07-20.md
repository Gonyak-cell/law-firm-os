# LawOS JSON to PostgreSQL, Internal Email Authentication, Private Staging, and CUT-005~007 Full Execution Plan

- Plan ID: `LAWOS-JSON-POSTGRES-PRIVATE-STAGING-CUT007-20260720`
- Plan version: `v1.0`
- Prepared on: `2026-07-20 KST`
- Repository: `/Users/jws/Documents/Codex/Law Firm OS`
- Protected root worktree: read-only; never reset, stash, clean, commit, or modify
- Execution worktree: `/Users/jws/.codex/recovery/law-firm-os/json-postgres-private-staging-cut007-20260720`
- Execution branch: `codex/json-postgres-private-staging-cut007-20260720`
- Baseline `origin/main`: `27a1ddf95845dc1e71e2598af423e8bcf50dfbef`
- Baseline tree: `5d2c152cebdddfe29035b78d34bf7f7072cb40ec`
- AWS account: `770880870480`
- AWS region: `ap-northeast-2`
- Monthly staging cost ceiling: `KRW 300,000`

## 1. Objective

Complete the source implementation, isolated LawOS private staging deployment, and execution evidence required to prove that:

1. legacy JSON data can be migrated losslessly into PostgreSQL RepositoryPortV2 authority;
2. employee accounts use registered email addresses with first-use password setup by a single-use email link, without requiring Microsoft Entra;
3. a dedicated LawOS private VPC/RDS/Lambda/Secrets/S3 environment exists without reusing the public staging RDS or production IAM roles;
4. CUT-005 proves migration accuracy, rejected-row accounting, replay no-op, and tenant isolation;
5. CUT-006 proves all deployed writes are PostgreSQL-only with JSON fallback, JSON writer, dual-write, file-current authority, offline mutation, and memory fallback all equal to zero;
6. CUT-007 proves the complete synthetic user journey, including authentication, HRX professional history, client/matter workflows, DMS controls, role/tenant negatives, cold restart, audit, and outbox;
7. every execution claim is bound to the exact source SHA, tree, artifact digest, stack/template digest, and independently signed receipt.

This plan does not by itself authorize production data writes, production cutover, release, signing, publication, production traffic, or go-live.

## 2. Terminal completion states

### 2.1 Private-staging terminal

The private-staging portion is complete only when all of the following are true:

- `PRIVATE_STAGING_STACK=CREATE_COMPLETE` or `UPDATE_COMPLETE`;
- RDS is private and `PubliclyAccessible=false`;
- both Lambda functions are VPC attached and `Active/Successful`;
- only staging-specific IAM roles are attached;
- temporary Lambda ENI bootstrap Allow is removed;
- protected AMIC staging and production resource fingerprints are unchanged;
- cost estimate and measured forecast remain below KRW 300,000 per month;
- database bootstrap and migrations pass with no checksum drift;
- CUT-005, CUT-006, and CUT-007 each have an independently signed and verified PASS receipt;
- exact-head CI and security review pass;
- source worktree is clean and the branch is a valid merge candidate.

### 2.2 Overall JSON retirement terminal

The original JSON-to-PostgreSQL objective is complete only after a later, separately approved real-data phase also proves:

- every approved real source is covered by the signed source inventory;
- every source field has a live, derived, archive-only, secret-excluded, or synthetic-excluded disposition;
- real employee, career/history, matter-code, and client records reconcile with zero unexplained variance;
- production authority is PostgreSQL-only;
- operational JSON writers, fallback, and dual-write remain disabled;
- a missing-JSON production smoke passes;
- first-use password setup email works for approved real staff accounts;
- production rollback uses PITR or forward repair, never JSON authority.

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

### 3.3 Deployment exclusions before separate approval

- production database write;
- real roster/client/document migration;
- real employee password-reset email send;
- production cutover;
- release, tag, signing, publication, AWS production deploy, or go-live.

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
10. merge ready;
11. real-data rehearsal passed;
12. production ready;
13. release ready;
14. go-live complete.

## 5. Current-state facts to preserve

- `origin/main` contains the RepositoryPortV2 source completion merged through PR #171.
- The artifact-store S3 stack exists; the main `lawos-private-staging` stack does not.
- PR #172 exact head `e2e17a9532f572595480f6bb9aa3e23f6cc485b3` contains staging preparation but is not the new execution authority.
- PR #172 is input material only; its exact diff may be reused after review because its merge base is current `origin/main`.
- The current staging admin handler implements database bootstrap and CUT-005 only.
- The current CUT-005 implementation uses one synthetic probe record per domain and does not exercise the complete legacy JSON shape or rejected-row contract.
- CUT-006 and CUT-007 execution handlers and signed receipt materializers are not yet implemented.
- the current operational startup still auto-loads Entra when no staff OIDC provider is supplied;
- session authorization still relies on static account and role registries in material paths;
- the three discovered local runtime-store roots and backup generations must be treated as candidates until source adjudication.

## 6. Work breakdown and dependency graph

```text
W0 Baseline and governance
 ├─ W1 Source inventory and field contract
 ├─ W2 Internal email authentication authority
 ├─ W3 Lossless migration engine
 └─ W4 Private-staging IaC conversion
       ↓
W5 Local/disposable-PostgreSQL validation
       ↓
W6 Exact-head artifact, CI, security, and deploy authorization
       ↓
W7 Private-staging AWS creation and bootstrap
       ↓
W8 CUT-005
       ↓
W9 CUT-006
       ↓
W10 CUT-007
       ↓
W11 Receipt sealing, merge readiness, and handoff
       ↓ separate approval
W12 Real-data rehearsal
       ↓ separate approval
W13 Production migration and JSON retirement
```

## 7. W0 — Baseline and governance

### W0.1 Worktree controls

- fetch `origin/main`;
- confirm the baseline SHA/tree;
- confirm the baseline is clean;
- work only in the dedicated execution worktree;
- exclude `refs/codex/turn-diffs/**` and resulting packed-refs metadata from source F4 evaluation;
- record root worktree source path as protected and do not mutate it.

### W0.2 Reuse decision for PR #172

- inspect the exact `origin/main..e2e17a...` diff;
- cherry-pick or reapply only reviewed private-staging source/IaC changes;
- remove Entra-specific contract, secret, runtime requirement, and runbook sections;
- retain artifact-store, staging IAM, private-network, RDS, DMS, and admin-handler work that remains valid;
- do not reuse the prior artifact after any source change.

### W0.3 Approval authority

Before AWS creation, validate the existing signed owner registry and applicable exception receipts for:

- Lambda VPC ENI bootstrap actions;
- KMS current-key `Resource:*` semantics;
- staging-only exact-head artifact deployment.

Because the source head will change, generate a new exact-head approval packet and stop before AWS mutation unless the new SHA/tree/artifact digest is explicitly authorized.

### W0 completion evidence

- baseline receipt;
- worktree status;
- protected-root no-change check;
- reuse/adjudication manifest for PR #172;
- approval-gap report.

## 8. W1 — Source inventory and field contract

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
- `derived-recompute`;
- `encrypted-archive-only`;
- `secret-excluded`;
- `synthetic-excluded`.

No silent drop is allowed.

### W1.4 Required reconciliations

- registered account vs roster count and identity mapping;
- employee vs employee-user-link coverage;
- professional profile, career, education, and qualification coverage;
- email uniqueness per tenant using lower-case comparison;
- matter-code uniqueness and non-empty constraint;
- matter-to-client, client-to-party/entity, matter-to-employee, and DMS/finance/portal reference integrity;
- tenant presence for every live record;
- synthetic marker and approved real-tenant classification.

## 9. W2 — Internal email authentication authority

### W2.1 Authority selector

- add an explicit staff-auth authority selector;
- make `internal-password` the selected operational mode for this plan;
- load Entra only when `entra-oidc` is explicitly selected;
- do not request or require Entra secret references in internal-password mode;
- update runtime capability and health output to report the selected authority safely.

### W2.2 PostgreSQL account discovery

- add tenant-scoped and email-normalized PostgreSQL account lookup;
- remove operational dependency on the static account registry;
- persist tenant membership, roles, groups, and scopes in PostgreSQL;
- keep all account, membership, and credential operations under tenant RLS and transaction boundaries;
- retain static fixtures only for local tests and synthetic packaging.

### W2.3 First-use password setup

Migrated accounts are created with:

- `account_status=active`;
- `credential_provider=lawos-internal-password-v1`;
- `credential_status=reset_required`;
- `password_hash={}`.

The flow must:

1. accept the registered email address;
2. return an enumeration-safe generic response;
3. create a tenant-bound hash-only single-use challenge;
4. send the setup link through configured staging SES delivery;
5. validate expiry, tenant binding, one-time use, and password policy;
6. write only a scrypt password hash;
7. activate the credential and increment credential revision;
8. revoke prior sessions and open reset challenges;
9. append immutable audit evidence without secret material.

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

### W3.1 Supported modes

- `inventory`;
- `validate-only`;
- `dry-run`;
- `import`;
- `readback`;
- `reconcile`;
- `resume`.

All modes must use the same transformation code.

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

## 11. W4 — Private-staging IaC conversion

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
- Object Lock or equivalent retention guard;
- digest readback;
- legal hold precedence;
- no unapproved permanent delete.

### W4.6 Cost

- refresh the cost model after Entra removal;
- maintain the owner ceiling of KRW 300,000/month;
- create cost alarms;
- stop if the CloudFormation change set adds an unmodeled persistent service or exceeds the cap.

## 12. W5 — Local and disposable-PostgreSQL validation

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

Completion requires all applicable checks PASS, no critical/high security finding, and no unexplained test skip.

## 13. W6 — Exact-head artifact, CI, security, and authorization

### W6.1 Artifact

- build from a clean exact head;
- bind source SHA/tree, lockfile digest, artifact SHA-256, and RDS CA digest;
- exclude real roster/account/contact/professional-profile sources;
- include only the approved synthetic manifest;
- upload to the existing versioned artifact bucket with digest metadata;
- never reuse the prior `e2e17a...` artifact after source changes.

### W6.2 Exact-head verification

- push implementation branch;
- create or update a PR;
- require exact-head CI;
- require security review;
- confirm the PR head did not change after approval;
- freeze the deployment artifact digest.

### W6.3 Required new authorization

Stop before AWS stack mutation unless an owner-approved signed receipt authorizes the exact new:

- source SHA;
- source tree;
- artifact SHA-256;
- synthetic-only private-staging deployment;
- database bootstrap;
- CUT-005, CUT-006, and CUT-007 execution;
- controlled SES delivery to approved synthetic mailboxes.

## 14. W7 — AWS private-staging creation and bootstrap

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

## 18. W11 — Sealing, commit, PR, and merge readiness

### W11.1 Independent receipts

Produce signed receipts for:

- source baseline;
- PR #172 reuse/adjudication;
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

### W11.2 Source commit discipline

- commit cohesive implementation units;
- do not stage unrelated files;
- preserve the protected root;
- run validators after the final source commit;
- push only after local gates pass;
- require exact-head CI after the final push;
- do not amend or force-push after the deployment approval without obtaining a new approval.

### W11.3 Final classification

The final report must state separately:

- source implementation status;
- private-staging deployment status;
- CUT-005 status;
- CUT-006 status;
- CUT-007 status;
- merge readiness;
- remaining real-data, production, release, signing, and go-live blockers.

## 19. W12 — Separately approved real-data rehearsal

After CUT-007 and a new real-data approval:

- freeze and sign the authoritative source inventory;
- import the approved real employee/account/history/matter/client data into an isolated private database;
- route all password-reset delivery to a sink during rehearsal;
- reconcile counts, hashes, versions, histories, relationships, audit, and rejected rows;
- manually adjudicate every exception;
- run read-only user-visible sampling without exposing raw evidence;
- produce a signed real-data rehearsal receipt.

## 20. W13 — Separately approved production migration

After an exact-main production authorization:

- freeze JSON writers;
- create immutable source and RDS backups;
- import only the approved manifest;
- run complete readback and cross-domain reconciliation;
- switch authority to PostgreSQL;
- remove JSON fallback, writers, and dual-write;
- run missing-JSON production smoke;
- allow first-use setup emails only on individual user request;
- observe stability;
- use PITR or forward repair for failure, never JSON rollback.

## 21. Stop conditions

Stop immediately on any of:

- source SHA/tree/artifact mismatch;
- exact-head CI or security failure;
- protected AMIC or production resource mutation;
- public RDS or S3;
- production IAM reuse;
- Lambda VPC attachment failure;
- temporary ENI Allow not removed;
- unapproved wildcard Allow;
- monthly forecast above KRW 300,000;
- migration checksum drift;
- TLS verify-full failure;
- tenant/RLS failure;
- unexpected rejected row or unresolved source conflict;
- JSON fallback, writer, dual-write, file-current, offline mutation, or memory fallback activity;
- DMS digest, namespace, legal-hold, retention, or delete-control failure;
- reset-link replay, tampering, enumeration, or unauthorized delivery;
- secret or PII exposure;
- critical user-flow failure;
- missing approval for the next external mutation.

## 22. Evidence locations

Source-controlled evidence and validators belong under the existing workbook/runtime-safety conventions. Sensitive execution artifacts belong outside the repository under:

`/Users/jws/.codex/recovery/law-firm-os/json-postgres-private-staging-cut007-runs-20260720/`

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
- `receipts/`
- `final-readiness/`

Directories must be mode `0700`; sensitive files must be mode `0600`. Receipts store safe counts, hashes, pseudonymous references, and signatures only.

## 23. Definition of done

This plan is complete only when every W0~W11 item is either:

- implemented and verified with cited evidence; or
- explicitly marked blocked by a named external approval that was not granted.

No item may be silently omitted, summarized into a blanket PASS, or counted complete from a schema-valid but unexecuted receipt. W12~W13 remain separate approval-gated terminals and must not be represented as completed by CUT-005~007.
