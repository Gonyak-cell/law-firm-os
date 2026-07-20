# LawOS private staging: PostgreSQL and internal email-password authority

This runbook creates and exercises only the isolated, synthetic LawOS private-staging environment. It does not modify or reuse AMIC Vault staging, production resources, or real employee, client, matter, or document data.

## Fixed authority

- Persistence: `postgres-v2` only.
- Staff authentication: PostgreSQL account directory plus internal password credentials.
- First use: a registered account requests a single-use setup link, sets a password, then logs in with the same registered email.
- Mail delivery: AWS SES v2 through the private SES API VPC endpoint, only to separately approved synthetic mailboxes.
- Offline mutation, JSON fallback, JSON writer, file-current authority, and dual-write: disabled.
- Evidence: counts, hashes, reason codes, and pseudonymous references only. Never record addresses, passwords, reset tokens, session secrets, raw PII, or document bytes.

## Source and approval gate

1. Work only in a clean dedicated worktree based on current `origin/main`.
2. Record exact commit, tree, lockfile digest, RDS CA digest, artifact digest, template digest, and cost-model digest.
3. Require exact-head CI and security review after the final source commit.
4. Obtain an independently signed owner receipt for that exact commit, tree, and artifact before any stack change set, artifact upload, database bootstrap, CUT operation, or SES delivery.
5. A changed commit, tree, artifact, template, synthetic manifest, sender identity, or mailbox set invalidates the approval and is a stop.

The earlier PR-head artifact approval does not transfer to a later source revision.

## Local preflight

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm ci
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run private-staging:validate
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run private-staging:auth:validate
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test
```

The infrastructure validator must report all of the following:

- public RDS, public subnet, internet gateway, NAT gateway, and default route counts are zero;
- two interface endpoints exist: Secrets Manager and SES API;
- the S3 gateway endpoint is scoped to the staging DMS bucket namespace;
- Lambda egress is only PostgreSQL 5432 to the database security group and TLS 443 to the service-endpoint security group;
- `LAWOS_RUNTIME_PROFILE=operational`;
- `LAWOS_PERSISTENCE_AUTHORITY=postgres-v2`;
- `LAWOS_STAFF_AUTHORITY=internal-password`;
- no legacy store-path environment variable exists;
- the USD 100 tag-scoped budget and alerts are present;
- the modeled monthly amount is at or below KRW 300,000.

The two previously approved AWS syntax exceptions remain narrow:

- temporary Lambda VPC ENI bootstrap Allow: exactly the approved six EC2 actions, both dedicated staging roles only, `Resource: "*"`, default off;
- current-key KMS policy: same-account IAM delegation and regional staging Lambda log encryption only.

Any other wildcard Allow is a stop.

## Artifact build

Build only from a clean exact head and write the result to a private directory outside the repository:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run private-staging:artifact:build -- \
  --source-sha <exact-40-char-sha> \
  --source-tree <exact-40-char-tree> \
  --synthetic-identity-manifest <private-0600-file-outside-repo> \
  --output-dir <private-0700-directory-outside-repo>
```

The manifest must prove that real roster, account, contact, and professional-profile source files are absent. The synthetic manifest contains identifiers and safe counts only. Do not upload until the exact-head deployment receipt is signed.

## AWS read-only checks

```bash
aws sso login --profile amic-vault-staging-admin
aws sts get-caller-identity --profile matter-staging-admin --no-cli-pager
```

Before mutation:

1. fingerprint protected AMIC and production resources read-only;
2. validate both CloudFormation templates;
3. verify the versioned artifact bucket and USD 100 budget;
4. verify the selected SES identity in `ap-northeast-2` without recording its value in evidence;
5. verify every approved synthetic mailbox is usable without sending mail;
6. verify the change set contains no protected-resource modification, public networking, production role, unmodeled persistent service, or cost-cap breach.

## Private stack creation

1. Upload the approved exact-head archive with checksum metadata.
2. Create the main change set with `EnableLambdaEniBootstrap=true`, exact source/tree/artifact/instruction digests, hidden sender parameter, verified SES identity ARN, synthetic reset URLs, tags, and no secret values.
3. Inspect every add, modify, and delete. Any protected modification or unmodeled service is a stop.
4. Execute once and wait for complete success. A rollback or partial failure is a stop.
5. Confirm both functions are `Active` and `LastUpdateStatus=Successful`.
6. Immediately update with `EnableLambdaEniBootstrap=false` and verify the temporary policy is absent.
7. Confirm there is no internet gateway, NAT gateway, public subnet, default route, public database, Lambda Function URL, or production role reuse.
8. Confirm Secrets Manager and SES resolve through their interface endpoints and S3 through its gateway endpoint.

## Database bootstrap

Direct-invoke only the admin Lambda. Bind the request to the approved source, tree, artifact, instruction, template, and synthetic-manifest digests.

1. Run migration checksums.
2. Create the least-privilege application role.
3. Create two explicit synthetic tenant authorities; never create a wildcard tenant.
4. Apply RLS and FORCE RLS to every tenant table.
5. Verify TLS `verify-full`, PITR, deletion protection, encryption, and audit logs.
6. Provision synthetic directory accounts with normalized registered emails and `require_password_reset`; do not import any password material.
7. Re-fingerprint protected resources and require a zero-change result.

After the first database write, never recover by enabling JSON or dual-write. Isolate the staging endpoint and use database restore or forward repair.

## CUT-005: migration accuracy

- Import the full two-tenant synthetic corpus covering identity and every operational domain.
- Require source equals accepted plus rejected, exact readback counts and hashes, state-version preservation, stable rejected reasons, zero unexpected rejection, wrong-tenant visibility zero, immediate replay no-op, rollback on injected failure, and resume equivalence.
- Sign an independent receipt containing commands, exit codes, timestamps, profile, safe counts, and exact digests.

## CUT-006: PostgreSQL-only authority

- Cold start without runtime-store files.
- Install the legacy-adapter sentinel.
- Exercise one new idempotent write and readback in identity, HRX, master-data, CRM, intake, matter, DMS, finance, portal, analytics, audit, and outbox.
- Require PostgreSQL row and version change exactly once, audit and outbox evidence, wrong-tenant denial, and no file creation.
- Require all authority counters to be zero: JSON fallback, JSON writer, dual-write, file-current, offline mutation, and memory fallback.
- Sign an independent deployed-stack receipt. Source inspection alone cannot pass CUT-006.

## CUT-007: synthetic critical journeys

1. Request setup for a registered synthetic email and verify an enumeration-safe response.
2. Send only to the approved synthetic mailbox, open the single-use link, set the password, log in, read the session, log out, and log in again.
3. Verify reused, expired, and tampered links fail; unknown email is indistinguishable; lockout, disabled-account, role, and tenant negatives pass.
4. Exercise employee/profile/history, client/intake/conflict/matter code/staff assignment, DMS upload/digest/hold/retention/delete denials, finance/portal projection, audit/outbox, cold restart, and readback.
5. Run API integration proof and the Forest browser/desktop critical-flow smoke against the staging API.
6. Sign an independent receipt with no email address, secret, PII, or document bytes.

## Stop and rollback

Stop on source drift, exact-head CI or security failure, protected-resource mutation, public networking, role reuse, wildcard drift, cost overrun, TLS failure, migration checksum drift, RLS failure, JSON authority activity, DMS digest or hold failure, secret/PII exposure, SES delivery outside the approved synthetic set, or a critical flow failure.

Before the first database write, delete or isolate only the new LawOS stack. After a database write, restore or forward-repair only the new staging database. Existing AMIC Vault staging is never a rollback target.

## Exclusions

This runbook does not authorize real-data rehearsal, production migration, release, signing, publication, production traffic, or company go-live.
