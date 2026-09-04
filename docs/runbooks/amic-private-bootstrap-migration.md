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

## 2. Authenticate and discover the exact production target

The human completes SSO or MFA, then verifies the final assumed role:

```bash
aws sso login --profile amic-vault-staging-admin
aws sts get-caller-identity --profile matter-cutover-operator --no-cli-pager
```

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

The commit order is versioned photo storage followed by the idempotent identity
and HRX migration. Success requires exact database and photo readback,
idempotency, audit and outbox evidence, and zero negative-tenant visibility.

## 6. Failure and replay

- A failure before `migration-execution` has no migration write claim. Correct
  the configuration, create a new empty output directory, and retry the same
  packet while its approval remains valid.
- A failure after a photo version was committed returns `repair_required=true`.
  Preserve every receipt. Do not delete the photo or source manually. Repair
  the failed boundary and replay the same packet; its packet hash is also the
  storage idempotency key.
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
