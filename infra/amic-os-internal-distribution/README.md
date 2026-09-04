# AMIC OS private internal-unsigned distribution

This stack is the isolated distribution lane for managed, unsigned Windows
installers. It does not deploy an installer by itself and is disabled by
default.

The generated CloudFormation template provides:

- one versioned, SSE-KMS, Object Lock protected private artifact bucket;
- decrypt-only KMS authority for the GET/HEAD-only CloudFront origin path;
- a separate versioned S3 server-access-log bucket;
- CloudFront Origin Access Control with SigV4 signing on every origin request;
- a CloudFront trusted key group, so unsigned installers require short-lived
  signed viewer URLs issued only after application authentication;
- separate GitHub OIDC publisher and exact-VersionId readback roles; and
- one read-only managed policy attached to an explicitly named API runtime
  role for authenticated download-capability issuance; and
- no S3 delete permission, no public artifact ACL/policy, and no long-lived AWS
  access key requirement.

Both GitHub roles bind the immutable repository and owner IDs, exact repository,
`main` ref, distinct protected environments, and the exact reusable workflow
file and ref through `job_workflow_ref`. The top-level manual dispatcher has no
AWS authority of its own: it calls the reusable publisher and then the separate
reusable readback workflow, and both called jobs reject any alternate caller
`workflow_ref`. GitHub grants `id-token: write` to the whole protected publisher
job, not to one step. The protected-environment reviewer must therefore approve
the exact source SHA and every script/dependency executed in that job; the later
credential-configuration step is ordering, not step-scoped OIDC isolation.

Each reusable job also uses its short-lived repository `GITHUB_TOKEN` with only
`actions: read` to fetch its own environment definition before dependencies or
AWS credential configuration. The guard requires at least one reviewer,
prevents self-review and administrator bypass, permits protected branches only,
and returns neither reviewer identities nor the token. A missing environment or
an automatically created environment without those rules therefore cannot
reach either AWS role.

`workflow_dispatch` inputs are event data, not a secret store. Release,
predecessor, revocation, rollback, and distribution-binding documents use
bounded exact-field schemas and reject added fields before producing output.
They must never contain credentials, personal data, private keys, or signed
download capabilities. Content-addressed S3 keys and VersionIds are object
identifiers rather than authorization; every read still requires the isolated
AWS role or a short-lived signed CloudFront URL. Sanitized public receipts omit
the raw locators as an additional data-minimization measure.

Generate a new template outside the repository:

```bash
npm run amic-os:internal-distribution:template -- --output /private/new/template.json
```

Deployment remains an external write. Before enabling the distribution, supply
an existing GitHub OIDC provider ARN, an Ed25519 metadata-signing secret and its
KMS key ARN, and the public half of a separately controlled CloudFront signed
URL key pair. Supply the matching CloudFront private-key Secrets Manager ARN,
its KMS key ARN, and the existing API execution role name through the dedicated
parameters. The stack attaches only `s3:GetObject`, `s3:GetObjectVersion`,
artifact-key `kms:Decrypt`, signer-secret read, and signer-secret-key
`kms:Decrypt` to that role. The two private keys must never be committed,
embedded in the installer, or exposed to a browser renderer.

Activation order is part of the security boundary:

1. Create both named GitHub environments before any workflow run. Restrict them
   to protected `main`, require an independent reviewer, and prevent self-review.
   [GitHub can otherwise create a referenced missing environment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
   without the intended protection rules.
2. Deploy and inspect the stack with `EnableDistribution=false`. Storage and the
   disabled CloudFront distribution may exist, but the publisher role, readback
   role, runtime broker policy, and their outputs are conditionally absent.
3. Verify the exact template hash, OIDC repository/owner/ref/workflow claims,
   bucket/KMS policy, and the two GitHub environment protection rules.
4. Update the stack to `EnableDistribution=true`, then place only the returned
   non-secret identifiers and public key in the protected environment variables.
   Keep both private keys exclusively in their dedicated AWS Secrets Manager
   secrets.
5. Run the one-time baseline and isolated readback, followed by the first
   successor and denial/tamper canaries. If a gate fails, disable the stack again
   and do not publish a completion claim.

The API runtime is fail-closed unless all of the following are set:

```text
LAWOS_AMIC_INTERNAL_UPDATE_ENABLED=true
AWS_REGION=<stack region>
LAWOS_AMIC_INTERNAL_UPDATE_AWS_ACCOUNT_ID=<12 digit account>
LAWOS_AMIC_INTERNAL_UPDATE_BUCKET=<ArtifactBucketName output>
LAWOS_AMIC_INTERNAL_UPDATE_KMS_KEY_ARN=<ArtifactKeyArn output>
LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_DOMAIN=<CloudFrontDomainName output>
LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_KEY_PAIR_ID=<CloudFrontPublicKeyId output>
LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_PRIVATE_KEY_SECRET_ARN=<dedicated signer secret ARN>
LAWOS_AMIC_INTERNAL_UPDATE_ED25519_PUBLIC_KEY_SPKI_BASE64=<pinned metadata public key>
```

Only the API process receives those values. It rechecks the authenticated
tenant's current trusted installation before reading the tenant/install-scoped
channel pointer and issuing five-minute CloudFront capabilities. The desktop
renderer receives only sanitized status and verification receipts.

CloudFront does not forward viewer-signature query parameters to S3. Immutable
downloads therefore use content-addressed object keys, and the desktop verifies
the exact signed byte length and SHA-256 after streaming. The mutable channel
pointer is never downloaded through CloudFront; the API broker reads it
directly from versioned S3 and verifies its Ed25519 envelope first.

The `EnableDistribution` parameter defaults to `false`. In that state, no GitHub
OIDC role or runtime download policy is created. It should become `true` only
after the protected GitHub environments and static infrastructure checks pass;
exact-VersionId readback, anonymous denial, expiry, and revocation then remain
mandatory live canaries before the channel is accepted for internal use.

A successor publication also requires its declared rollback installer to
already exist in this exact bucket and KMS boundary. Before uploading any new
release object, the publisher performs HEAD and GET against that exact object
key and VersionId, checks byte count, SHA-256, provider checksum, metadata,
COMPLIANCE Object Lock, and retention through the rollback window. The
independent reader repeats the check as the eighteenth exact-version read.
An empty new tenant/installation scope therefore cannot truthfully publish a
successor. The same protected workflow has an explicit one-time `baseline`
mode. It first proves that the exact channel and baseline-marker keys have no
version or delete-marker history, then writes exactly nine private immutable
versions: the installer, three build-evidence objects, the signed release and
update metadata pairs, and a signed baseline marker written last. The marker
is outside the runtime channel and cryptographically states that no channel
pointer or rollback authorization was published and that the baseline is not
runtime-discoverable. The isolated read-only workflow re-reads all nine exact
VersionIds, lists only the exact baseline/channel control keys to prove that the
marker is the sole baseline version and channel history is empty, and proves
anonymous S3 and unsigned CloudFront denial. A second
baseline in the same scope fails before any new write. Only this independently
verified update metadata and installer VersionId may become the rollback target
of the first normal `successor` publication. Every later successor resolves the
latest exact channel-pointer VersionId and verifies its embedded Ed25519 channel
document and update metadata before writing anything. An older but otherwise
valid retained installer is rejected if it is not the active predecessor. The
baseline marker and channel pointer use S3 conditional writes: the first write
requires no current key, and a later pointer update requires the ETag that was
just verified. The bucket policy rejects unconditional control-key writes, so a
competing publication cannot silently replace the verified predecessor.

An expired predecessor control remains usable only as signed immutable lineage;
it is never returned to a client as active metadata. The successor must carry a
freshly issued, currently active rollback-target metadata document whose every
non-time field exactly matches that signed predecessor and whose installer
VersionId is re-read. Revocation revision must strictly increase after the first
successor, and every previously revoked release and artifact remains in the new
set. The current release and rollback target cannot be listed as revoked. This
allows publication to resume safely after a long idle period without silently
undoing a revocation.

The manual workflow defaults to `successor`. Select `baseline` only for a new
scope; leave the revocation and rollback inputs empty. In `successor` mode,
both inputs are mandatory at preflight even though the GitHub form leaves them
syntactically optional so the baseline form can omit them. Neither mode uploads
the installer as a GitHub artifact or Release asset.
