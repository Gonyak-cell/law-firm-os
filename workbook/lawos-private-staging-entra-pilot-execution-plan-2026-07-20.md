# LawOS private staging + Entra pilot execution plan

## 0. Decision and truth boundary

- Owner approval: `LAWOS-PRIVATE-STAGING-ENTRA-PILOT-CONDITIONAL-EXECUTION-APPROVAL-20260720`
- Approved source baseline: commit `27a1ddf95845dc1e71e2598af423e8bcf50dfbef`, tree `5d2c152cebdddfe29035b78d34bf7f7072cb40ec`
- Working branch: `codex/lawos-private-staging-entra-pilot-20260720`
- AWS scope: account `770880870480`, region `ap-northeast-2`
- Data scope: synthetic tenants, users, records, and documents only
- Owner cost amendment: KRW 300,000/month maximum
- Effective AWS execution limit: existing account budget of USD 100/month, because it is stricter than the KRW ceiling
- This plan can prove only private-staging and Entra-pilot readiness through CUT-007. It cannot prove production readiness, release readiness, production cutover, or go-live.

The existing dirty root worktree and every existing AMIC Vault staging resource are protected. The latter are read-only inventory inputs and are not dependencies, rollback targets, shared roles, shared secrets, or shared network resources.

## 1. Fixed target architecture

### 1.1 Network

| Surface | Target | Gate |
|---|---|---|
| VPC | new `10.96.0.0/16` LawOS-only VPC | must not overlap the observed `10.42.0.0/16` and `10.84.0.0/16` VPCs |
| application subnets | private subnets in two AZs | no public IP assignment; Lambda attached to both |
| database subnets | isolated subnets in two AZs | no `0.0.0.0/0`, `::/0`, IGW, or NAT route |
| egress | one staging NAT gateway | HTTPS-only Lambda egress; single-AZ staging cost exception, never production-parity evidence |
| AWS private access | S3 gateway endpoint | no hourly interface-endpoint charge for S3 |
| PostgreSQL ingress | Lambda security group only | TCP 5432; no CIDR-based database ingress |
| public API | API Gateway HTTP API | no Lambda Function URL; application authentication remains authoritative |

### 1.2 Data and cryptography

- RDS PostgreSQL 16, `db.t4g.micro`, 20 GiB gp3, Single-AZ, `PubliclyAccessible=false`.
- Dedicated DB subnet group across two AZs, storage encryption, a LawOS staging KMS key, deletion protection, seven-day PITR, and PostgreSQL logs exported to CloudWatch.
- `rds.force_ssl=1` and client `verify-full`; the official RDS CA bundle is included in the exact-head Lambda artifact and referenced through `NODE_EXTRA_CA_CERTS`.
- The database begins empty. A private direct-invoke administration Lambda applies the exact migration catalog, creates a least-privilege application role, and installs only the signed synthetic tenant authorities.
- Runtime secrets are read by ARN from Secrets Manager. Values never enter CloudFormation parameters, Lambda environment values, source, logs, receipts, CI artifacts, or chat.
- The DMS bucket has versioning, Block Public Access, bucket-owner-enforced ownership, SSE-KMS, Object Lock, tenant-prefixed opaque keys, digest readback, and legal-hold/retention APIs.

### 1.3 Application authority

- `LAWOS_RUNTIME_PROFILE=operational`
- `LAWOS_PERSISTENCE_AUTHORITY=postgres-v2`
- `LAWOS_POSTGRES_SSL_MODE=verify-full`
- JSON fallback, JSON writers, file-current authority, dual-write, offline mutation, local authority, and latest-wins resolution remain disabled.
- An initialization failure is a failed invocation/startup, not a fallback.
- API and administration Lambdas use different dedicated roles. Neither reuses production or AMIC Vault staging IAM.

### 1.4 Entra pilot

- A new LawOS staging application registration, service principal, pilot group, staging redirect URI, and Conditional Access authentication context are created.
- The runtime client uses authorization-code flow with PKCE. No client secret is required for the public desktop redirect.
- The pilot Conditional Access policy begins in report-only mode, is limited to the LawOS pilot group and LawOS staging application, and requires phishing-resistant authentication strength.
- Report-only observation lasts at least seven complete days. Pilot success/failure, What If, sign-in logs, emergency access, and non-pilot impact zero must pass before pilot-only enablement.
- Two Entra tenant emergency accounts are separate cloud-only identities. They are distinct from the time-limited, multi-approval LawOS application break-glass capability.

## 2. Cost gate before creation

The committed cost model is `infra/lawos-private-staging/cost-estimate.json`. The creation gate fails unless:

1. estimated monthly total is at most USD 100;
2. estimated monthly total remains below KRW 300,000 using the recorded planning exchange-rate assumption;
3. the existing AWS account budget remains active;
4. no unpriced NAT, interface endpoint, RDS class, or persistent compute resource appears in the change set; and
5. any material price or architecture drift is re-estimated before execution.

The initial target is USD 90/month including contingency. Interface endpoints other than the free S3 gateway endpoint are omitted at this stage because a two-AZ Secrets Manager endpoint would materially consume the staging budget. Secrets Manager and Entra calls therefore use TLS through the dedicated NAT.

## 3. Execution work breakdown

### Phase A — authority registration and protected inventory

Inputs:

- exact baseline SHA/tree;
- owner attachment bytes and SHA-256;
- existing Ed25519 private key outside the repository;
- read-only AWS/Entra sessions.

Actions:

1. verify `origin/main`, ancestor relationship, branch, worktree HEAD, tree, and clean state;
2. inventory existing AMIC resources by ARN, VPC, subnet, role, secret, and log group without mutation;
3. register seven independent approval receipts: infrastructure, AWS staging, Entra pilot, migration, CUT-005, CUT-006, CUT-007;
4. bind each approval to baseline SHA/tree, instruction hash, cost cap, action, environment, data scope, expiry, and owner key;
5. write private artifacts with directory mode 0700 and file mode 0600.

Completion:

- approval signatures validate 7/7;
- no execution PASS is claimed;
- private key is neither copied nor committed;
- existing-resource mutation count is zero.

Stop:

- source drift, invalid signature, missing protected-resource fingerprint, or evidence permission failure.

### Phase B — source and IaC implementation

Actions:

1. add native CloudFormation for the isolated network, RDS, KMS, Secrets Manager, DMS S3, API Gateway, Lambdas, logs, and alarms;
2. add an exact-head artifact builder with dependency-lock verification, RDS CA bundle hashing, a required private manifest of provisioned synthetic pilot identities, generated synthetic runtime seed files, and a safe artifact manifest; never package the real account or HRX roster sources;
3. add a direct-invoke administration handler for migrations, least-privilege grants, synthetic tenant registration, and staging rehearsal;
4. accept structured RDS Secrets Manager values without ever constructing or logging a credential-bearing URL outside process memory;
5. add template, cost, source-drift, protected-resource, secret-safety, and receipt validators;
6. add unit and disposable-PostgreSQL tests;
7. add an operator runbook whose commands default to read-only/preflight and require explicit approval references for mutations.

Completion:

- local tests and validators pass;
- IaC has no public RDS, DB default route, Lambda Function URL, role reuse, administrator policy, cross-environment assume-role, or plaintext secret;
- the cost model is within both caps;
- source changes are committed on the dedicated branch.

Stop:

- any validator finding above, test failure, secret-like material in tracked files, or target SHA/tree drift.

### Phase C — infrastructure change set and provisioning

Preconditions:

- exact implementation-head commit is fixed;
- artifact SHA-256 is fixed;
- local and AWS template validation pass;
- cost gate passes;
- the infrastructure change set contains only `lawos-private-staging` resources;
- the Lambda VPC ENI bootstrap permission exception described in section 7 is explicitly approved.

Actions:

1. create but do not execute the change set;
2. independently review adds/modifies/deletes, IAM capabilities, names, tags, routes, public access, and predicted monthly resources;
3. execute the reviewed change set;
4. wait for a complete stack; never continue through rollback-complete or partial failure;
5. invoke the administration Lambda to apply migrations, create the application role, and populate the structured application DB secret;
6. update the stack to remove the temporary ENI bootstrap Allow policy after both Lambdas reach `Active` and `Successful`;
7. verify the function-code explicit Deny, VPC attachments, subnet routes, RDS private state, security-group sources, KMS, backups, deletion protection, S3 Object Lock, and no changes to protected AMIC resources.

Rollback before the first database write:

- delete only the new LawOS stack after preserving safe logs and receipts, or return the new API alias to no target.

Rollback after the first database write:

- do not enable JSON authority or dual-write;
- isolate the new endpoint and use forward repair or restore the new staging database only;
- never use existing AMIC staging as a rollback target.

### Phase D — Entra setup and report-only observation

Actions:

1. verify the interactive target tenant and Microsoft Entra ID P1/P2 licensing; the 2026-07-20 read-only CLI context returned zero subscribed SKUs and is not sufficient authority;
2. create LawOS staging app registration/service principal with only OIDC sign-in scopes;
3. have a human tenant administrator create at least two cloud-only synthetic pilot identities, then create the pilot group and add only those approved identities;
4. create the LawOS authentication context and phishing-resistant Conditional Access policy in report-only;
5. have a human tenant administrator establish two emergency access accounts, role assignments, physical FIDO2/passkey enrollment, alerts, credential custody, and test evidence outside the Graph automation session;
6. populate the Entra configuration secret by reference;
7. run What If and pilot success/failure tests without recording tokens, UPNs, raw sign-in records, or credentials;
8. observe at least seven complete days and prove non-pilot impact count zero;
9. enable only for the pilot group if every condition passes; otherwise keep report-only or disable.

Completion:

- report-only duration at least seven days;
- pilot FIDO2 success and non-FIDO failure proven;
- emergency access proven without routine use;
- non-pilot impact zero;
- no tenant-wide or all-cloud-app enforcement.

### Phase E — exact-head deployment and synthetic CUT gates

#### CUT-005

1. verify the signed synthetic manifest and empty-new-authority condition;
2. freeze the synthetic source snapshot;
3. import final delta for every RepositoryPortV2 domain;
4. compare counts, canonical hashes, state versions, and rejected-row reason counts;
5. rerun the same import and require no-op/idempotent replay;
6. sign the CUT-005 execution receipt.

#### CUT-006

1. deploy the exact implementation artifact to the private Lambda;
2. verify operational/postgres-v2 startup and migration checksum equality;
3. execute a new write in every operational domain;
4. prove PostgreSQL transaction, authenticated tenant RLS, optimistic version, idempotency, audit, and outbox behavior;
5. search runtime configuration, process paths, and filesystem outputs for file-current, JSON fallback, JSON writer, and dual-write activity;
6. require all such counts to be zero and sign the CUT-006 receipt.

#### CUT-007

1. Entra pilot login with FIDO2 and required authentication context;
2. role allow/deny tests and wrong-tenant RLS negative test;
3. Lambda cold restart and repeated authenticated request;
4. Forest critical-flow smoke against the staging API;
5. synthetic DMS upload, provider digest readback, legal hold, retention, delete-block, and tenant namespace test;
6. audit/outbox readback and secret/PII scan;
7. sign the CUT-007 receipt only if all checks pass.

Completion:

- CUT-005, CUT-006, and CUT-007 are independently PASS;
- exact deployed source SHA/tree and artifact digest match the receipt;
- real data, production contacts, production resources, release, signing, and go-live counts remain zero.

### Phase F — PR and merge gate

1. run exact-head CI and security review;
2. review the final infrastructure change set and all independent receipts;
3. push the branch and open a PR;
4. reverify PR head, target branch, merge base, CI, and protected-resource drift;
5. declare mergeable only if CUT-007 is PASS and every clause-17 gate is closed.

Main merge is not automatic. Any changed target SHA/tree, unrelated main change, failed exact-head check, or incomplete seven-day observation requires a new decision rather than inheriting an earlier PASS.

## 4. Evidence contract

Every execution receipt must include:

- target source SHA and tree;
- artifact and toolchain SHA-256;
- action, environment, approval ID, instruction SHA-256, operator role, profile;
- started/finished timestamps, command/operation identity, exit/result code;
- safe aggregate counts and redacted resource references;
- explicit claims for AWS/Entra/staging/production/real-data/release/signing/go-live contact;
- stop-condition evaluation and blockers;
- output path and output SHA-256;
- owner signature and registry verification result.

Receipts must not include private keys, access tokens, ID tokens, passwords, connection URLs, raw PII, document bytes, raw sign-in logs, or credential-bearing error messages.

## 5. Rollback triggers

Immediately stop and isolate the new environment on any of:

- protected AMIC resource mutation;
- public RDS or database default route;
- Lambda without both private application subnets;
- production or AMIC role/secret/VPC reuse;
- unexpected IAM wildcard, administrator permission, or cross-environment assume-role;
- TLS verify-full failure;
- secret or PII exposure;
- migration checksum drift;
- tenant/RLS, DMS digest, legal hold, retention, audit, or outbox failure;
- any JSON authority/fallback/writer/dual-write activity;
- emergency access failure or non-pilot user impact;
- cost forecast over USD 100 or KRW 300,000;
- exact-head CI or security review failure.

## 6. Explicit exclusions

- production DB or provider mutation;
- real-client, employee, matter, or document migration;
- CUT-008 or later;
- production deploy/cutover;
- tags, releases, macOS/Windows signing, publication;
- production traffic or company go-live;
- bank transfer, payroll payment, tax invoice issuance, or external client communications.

## 7. Known external approval delta

AWS requires a Lambda execution role to hold six EC2 network-interface actions while a VPC-connected function is created or updated. Those EC2 APIs do not support resource-level scoping, so the official minimum policy uses `Resource: "*"`. That conflicts with clause 7's absolute wildcard-resource prohibition.

The implementation therefore separates a temporary `LambdaVpcEniBootstrap` policy from the steady-state roles, adds a `lambda:SourceFunctionArn` explicit Deny so function code cannot call the EC2 network APIs, and removes the temporary Allow as soon as both functions are active. No AWS resource or change set containing that exception may be executed until the owner approves this exact narrow delta.

The dedicated KMS key policy also requires `Resource: "*"`; in AWS KMS key-policy semantics this refers only to the current key. The template allows exactly the same-account IAM delegation statement and a regional CloudWatch Logs statement constrained by the LawOS private-staging log-group encryption context. Because clause 7 literally prohibits wildcard resources, this KMS syntax requires its own narrow owner delta before creation. No other wildcard Allow is permitted.

The Entra session currently lacks the Conditional Access policy scope. Entra mutation must wait until a least-privilege interactive administrator grants only the three temporary Graph permissions in the contract and the physical emergency-account FIDO2 steps can be completed by a human operator. Automation must not request user-write or directory-role-write authority.

The approval also requires an exact-main staging artifact while making main merge conditional on CUT-007. The new private administration handler cannot be both absent from main before CUT-007 and present in an exact-main artifact used to run CUT-007. External staging deployment therefore additionally requires either an exact-PR-head staging-only artifact exception or a preliminary non-production tooling merge. The runbook recommends the narrower exact-PR-head exception and keeps production/release authority excluded.
