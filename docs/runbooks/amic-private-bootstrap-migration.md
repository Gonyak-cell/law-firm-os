# AMIC private bootstrap migration runbook

This runbook moves the existing registration, roster, and member-photo sources
into the server-authoritative PostgreSQL and private versioned S3 paths. It does
not delete source files, enable an external provider, publish an installer, or
make a production-readiness claim.

## Required gates

Do not execute the migration unless all of these are true:

- The legal-entity mapping has one approved `assign` or `quarantine`
  disposition for every opaque subject reference.
- The code is committed on the exact clean `origin/main` SHA used to create the
  execution packet.
- The packet input, packet, approval registry, approval receipt, signature, and
  output directories are outside the worktree and owned as private 0600/0700
  material.
- The production S3 bucket, KMS key, database secret, and tenant-context secret
  are resolved from authorized AWS readback. Never guess their names or create
  substitute resources during this procedure.
- The signed packet names the exact AWS account, region, Secrets Manager
  references, S3 bucket and owner, KMS key ARN, and object prefix.
- The human owner has signed the exact packet with an active non-revoked
  Ed25519 key and a non-expired approval.
- The operator can assume `matter-cutover-operator` through the documented SSO
  role chain and has an approved private-network route to the PostgreSQL
  endpoint. Never make the database public to make this command work.

## 1. Produce and approve the legal-entity mapping

Create the non-identifying template inside the ignored `.omo/evidence`
directory, then fill only the real legal-entity ID, disposition, quarantine
reason where applicable, and approval reference.

```bash
npm run amic:private-bootstrap:mapping-template > .omo/evidence/amic-private-bootstrap-legal-entity-mapping.json
chmod 600 .omo/evidence/amic-private-bootstrap-legal-entity-mapping.json
npm run amic:private-bootstrap:mapping-validate -- .omo/evidence/amic-private-bootstrap-legal-entity-mapping.json
npm run amic:private-bootstrap:dry-run -- .omo/evidence/amic-private-bootstrap-legal-entity-mapping.json
```

The commands may return counts and hashes only. Names, email addresses,
telephone numbers, employee IDs, tenant IDs, photo filenames, and photo bytes
must not appear in the receipts.

## 2. Authenticate and prove fail-closed production readiness

The human completes SSO or MFA, then verifies the final assumed role:

```bash
aws sso login --profile amic-vault-staging-admin
aws sts get-caller-identity --profile matter-cutover-operator --no-cli-pager
```

From an exact clean source commit, create a new private output directory and
run the fixed read-only inspection with the auditor role:

```bash
npm run amic:private-bootstrap:inspect-provider-readiness -- \
  --output-dir /private/path/provider-readiness-YYYYMMDD-001
```

The command performs exactly three AWS reads: STS caller identity,
`DescribeStacks`, and the original deployed CloudFormation template. It never
creates or executes a change set, reads a secret value, or deploys anything.
It compares resources, parameters, conditions, rules, outputs, and metadata
against the exact local candidate and writes a 0600 receipt.

**Expected result:** `READY_DISABLED` with `PASS`, an exact candidate-template
match, the provider parameter and output explicitly `false`, and the Outlook
worker parameter plus both Outlook secret placeholders explicitly disabled.

**If it returns `UPGRADE_REVIEW_REQUIRED`:** exit code 2 is an expected closed
state. Preserve the receipt and obtain separate approval for an exact-purpose
CloudFormation change-set review. Do not treat absent provider parameters as
equivalent to `false`, and do not continue to target discovery.

The existing W15 change-set paths are the prepared upgrade paths for this
state. If `EnableProjectionWorker=false`, the inventory-bootstrap path may be
used. If the worker is already enabled, the bootstrap path fails closed because
it cannot safely restore an active projection binding; use a fresh signed W15
relational-projection rebind and complete its worker re-enable gate instead.
Both paths send `EnableExternalReadProviders=false`, both disabled provider-pack
placeholders, `EnableOutlookConversationWorker=false`, and both disabled
Outlook secret placeholders explicitly. They reject missing values,
`UsePreviousValue`, any mismatch, and every provider or Outlook resource change
while those controls are disabled. Post-execution verification requires the
same parameters and `ExternalReadProvidersEnabled=false`. Creating or executing
a change set is an AWS write and still requires separate operator approval;
this read-only inspection does not authorize it.

**If it reports an enabled provider, enabled Outlook worker, or ambiguous
disabled binding:** stop and escalate. Do not run the migration or weaken the
inspection.

### Discover the exact production target

Use a new output directory outside the worktree. The approved negative tenant
must be a real isolation control that cannot resolve to the migration tenant.

```bash
npm run amic:private-bootstrap:discover-target -- \
  --packet-id amic-private-bootstrap-production-YYYYMMDD-001 \
  --negative-tenant-id approved-negative-tenant-id \
  --output-dir /private/path/target-YYYYMMDD-001
```

The command fixes the account, region, profile, and stack name. It performs
exactly 11 read attempts: STS identity, CloudFormation stack and resources, two
Secrets Manager descriptions, KMS description, and five S3 control reads. It
does not call `GetSecretValue` or any AWS write operation. It requires the
production stack and four logical resources to be complete, the external-read
provider activation output to be `false`, and the versioning, public-access,
ownership, encryption, bucket-key, and customer-managed KMS controls to match.

On success it creates a private `private-bootstrap-packet-input.json` and a
safe hashed readback receipt. The directory is 0700 and both files are 0600.
The packet input contains authorized resource references and is not a
repository artifact. The following is its schema reference; do not hand-copy
or guess resource values when discovery is available.

```json
{
  "schema_version": "law-firm-os.amic-private-bootstrap-packet-input.v1",
  "packet_id": "amic-private-bootstrap-production-YYYYMMDD-001",
  "environment": "lawos-production",
  "negative_tenant_id": "approved-negative-tenant-id",
  "production_target": {
    "aws_account": "000000000000",
    "aws_region": "ap-northeast-2",
    "database_secret_ref": "approved-database-secret-name-or-arn",
    "tenant_context_secret_ref": "approved-tenant-context-secret-name-or-arn",
    "photo_bucket_name": "approved-private-versioned-bucket",
    "photo_expected_bucket_owner": "000000000000",
    "photo_kms_key_arn": "arn:aws:kms:ap-northeast-2:000000000000:key/approved-key-id",
    "photo_prefix": "approved-real-migration/member-photos",
    "bucket_versioning_required": true,
    "bucket_owner_enforced": true,
    "public_access_block_required": true,
    "server_side_encryption": "aws:kms"
  }
}
```

The database and tenant-context references must be distinct. A Secrets Manager
ARN, when used, must match the signed account and `ap-northeast-2`. The S3 KMS
key ARN must match the same account and region.

## 3. Prepare the exact execution packet

From the repository root on a clean `origin/main`, create a new output
directory name that does not already exist:

```bash
npm run amic:private-bootstrap:prepare -- \
  --packet-input /private/path/packet-input.json \
  --mapping .omo/evidence/amic-private-bootstrap-legal-entity-mapping.json \
  --output-dir /private/path/prepared-YYYYMMDD-001
```

Preparation performs a fresh source inventory and dry-run. It writes a private
preflight receipt, execution packet, and preparation summary. It performs no
AWS call, PostgreSQL write, S3 write, source mutation, provider activation, or
release operation.

## 4. Seal the owner approval

Use the existing owner trust registry and matching Ed25519 private key. The
private key and base registry must be 0600 files outside the worktree. Choose a
short expiry that covers the controlled execution window.

```bash
npm run amic:private-bootstrap:approval:seal -- \
  --packet /private/path/prepared-YYYYMMDD-001/private-bootstrap-execution-packet.json \
  --signed-at 2026-09-04T00:00:00.000Z \
  --expires-at 2026-09-05T00:00:00.000Z \
  --key-id approved-owner-key-id \
  --approval-id approval.amic-private-bootstrap.YYYYMMDD.001 \
  --base-registry /private/path/base-owner-registry.json \
  --base-registry-sha256 exact-registry-file-sha256 \
  --private-key /private/path/owner-ed25519-private-key.pem \
  --output-dir /private/path/approval-YYYYMMDD-001
```

The signer binds the exact packet, source SHA/tree, environment, inventory,
mapping, migration manifest, record catalog, photo aggregate, and no contact
scope. It never stores the private key in an output.

## 5. Execute the approved packet

Recheck the final assumed role immediately before starting:

```bash
aws sts get-caller-identity --profile matter-cutover-operator --no-cli-pager
```

Then run the exact approved packet with a new output directory:

```bash
npm run amic:private-bootstrap:execute -- \
  --packet /private/path/prepared-YYYYMMDD-001/private-bootstrap-execution-packet.json \
  --packet-input /private/path/target-YYYYMMDD-001/private-bootstrap-packet-input.json \
  --registry /private/path/approval-YYYYMMDD-001/execution-approval-trust-registry.json \
  --registry-sha256 exact-generated-registry-file-sha256 \
  --approval /private/path/approval-YYYYMMDD-001/execution-approval-receipt.json \
  --mapping .omo/evidence/amic-private-bootstrap-legal-entity-mapping.json \
  --output-dir /private/path/execution-YYYYMMDD-001
```

Before its first write, the operator rechecks the exact clean SHA/tree and
approval, repeats the dry-run, verifies the AWS account/role, checks S3 region,
versioning, all four public-access blocks, bucket-owner enforcement, exact KMS
default encryption and bucket key, reads both Secrets Manager references,
connects with TLS `verify-full`, verifies the complete migration catalog and
authenticated tenant authority, and only then constructs the S3/PostgreSQL
targets.

The operator also reads the exact photo bucket's Object Lock configuration
before secret access or storage writes. An enabled lock and a valid positive
GOVERNANCE or COMPLIANCE default retention are required. The adapter preserves
retained staging versions through its existing deferred-cleanup path; it does
not bypass, shorten, or rewrite retention. The operator needs read-only
`s3:GetBucketObjectLockConfiguration` and `s3:GetObjectRetention` permissions
for the approved bucket and photo prefix. Retained staging is not permission
to delete either the staging version or the committed photo.

The commit order is versioned photo storage followed by the idempotent identity
and HRX migration. Success requires exact database and photo readback,
idempotency, audit and outbox evidence, and zero negative-tenant visibility.

## 6. Failure and replay

- A failure before `migration-execution` has no migration write claim. Correct
  the configuration, create a new empty output directory, and retry the same
  packet while its approval remains valid.
- A failure after a photo version was committed returns `repair_required=true`.
  Preserve every receipt. Do not delete the photo or source manually. Repair
  the failed boundary before replay; its packet hash is also the storage
  idempotency key. A nonempty HRX baseline conflict is not fixed by replay:
  use the separately approved enrichment path below.
- If the approval expired, issue a new approval for the unchanged packet. Do
  not edit the packet or receipt.
- Any source, mapping, target, SHA/tree, account, role, bucket, key, secret,
  schema, or authorization drift requires a fresh packet and approval.
- Source retirement remains prohibited until hosted count/hash and
  authorization readback, client cutover, rollback custody, and separate
  deletion approval are complete.

## 7. Completion evidence

Preserve the private start, AWS-control, database-readiness, checkpoint,
execution-result, and execution-summary receipts. A successful bootstrap alone
does not prove client cutover, installer privacy, Windows installation,
distribution publication, release, source retirement, or production readiness.

## 8. Existing-tenant forward repair

The generic snapshot importer deliberately requires a whole-domain match.
Do not remove existing payroll, employment, attendance, schema, audit, or
idempotency records to make a small roster snapshot match a populated tenant.
The original failed import receipt remains failed; a forward-repair receipt
records its resolution separately.

`scripts/lib/amic-private-bootstrap-enrichment.mjs` handles this case using
the existing authenticated PostgreSQL ledger and unit-of-work flusher:

1. Independently read the directory, existing HRX snapshot, and immutable photo
   versions. Recompile the approved mapping and bind the already committed
   photo versions without uploading them again.
2. Run `planAmicPrivateBootstrapEnrichment` in a read-only transaction. Its
   safe plan binds the complete current snapshot, executor SHA/tree, original
   import packet, mapping, committed corpus, and exact changed record hashes.
   Required roster records and user links must already exist and agree on
   identity. A missing or conflicting identity is not an implicit upsert.
3. Preserve every existing fact and all dates, statuses, source provenance,
   records, and audit entries. Fill only absent approved contact/photo fields
   and directory fields. The owner's legal-entity mapping covers every
   employment profile of an approved employee, including historical profiles;
   an existing different legal entity or photo value blocks the operation.
   Historical employment dates are not replaced by seed defaults.
4. Seal the exact plan through `seal-json-postgres-execution-approval.mjs` with
   a current owner approval for `lawos-amic-private-bootstrap-enrich`. Execute
   `executeAmicPrivateBootstrapEnrichment` only from the verified exact-main
   source with the approved application DB role, tenant context, and TLS.
   No master credential, directory write, photo write, or deletion is needed.
5. The existing serializable transaction/CAS path compares the signed
   baseline, adds one idempotency record and one audit/outbox pair, applies
   only planned changes, and verifies the complete record hash. Any failed
   outbox/audit write rolls the transaction back. A changed baseline requires
   a new read-only plan and approval; it must not be force-applied.
6. Run the same function with `readOnly: true` using a server-enforced
   read-only connection. Collect the exact record hash/count, untouched-record
   preservation, one audit/outbox pair, duplicate replay, negative-tenant
   checks, directory hash and credential-status aggregates, and five photo
   body/version/hash checks. Never output raw identities or password hashes.

S3 ranged reads use the owned bounded HTTP response plus full-object SHA-256
verification. SDK checksum-stream wrapping is omitted only for this ranged
command, because it replaces the transport identity used by the framing
guard. Other commands that explicitly request checksum validation retain it.
Tests must cover checksum-bearing responses, changed bytes, size/framing
violations, cleanup, timeouts, and forged clients; do not accept a generic
stream merely because it has a `read` method.
