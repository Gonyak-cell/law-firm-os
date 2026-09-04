# AMIC OS managed first-install package

This lane resolves first-package publication for a company-managed PC that has
never installed AMIC OS. It is **not** installation enrollment, a self-service
download endpoint, an update channel, or a completed Windows canary.

## Authority and boundaries

- Use `managed-bootstrap` in the existing protected internal-unsigned dispatcher.
  The same exact-main Windows build, locked dependencies, package privacy gate,
  owner approval, publisher OIDC role, metadata signer, and isolated readback role
  apply. No installer is uploaded to GitHub.
- The release input has the existing closed fields except `installationId` and
  `predecessor`. Both fields are forbidden, not optional empty placeholders.
  The authenticated owner's approved tenant remains explicit.
- Build/provenance/SBOM and the executable contain no registration, roster,
  contacts, photos, credentials, or company database. Receiving the executable
  grants no access to company data.
- Only the signed managed-bootstrap manifest schema is accepted. The desktop
  update broker/verifier continues to require its existing installation-scoped
  update schema and trusted current server-issued installation. It does not
  discover or consume managed-bootstrap packages.
- This first-install delivery is owner-mediated using the owner's AWS SSO role
  and exact-version private S3 API access. It is not a public S3 URL or a claim
  that a tenant-member web download service exists. Do not set `GITHUB_ACTIONS`
  locally to impersonate the protected publication/readback job.

## Publication and independent readback

1. Freeze a clean merged-main SHA/tree. Choose a unique release ID, the actual
   package version, the approved tenant, and an active metadata lifetime of at
   most 31 days. Inputs are non-secret GitHub event data; never include keys,
   personal information, signed download URLs, or local private file paths.
2. Dispatch `amic-os-internal-unsigned-publish.yml` with
   `publication_mode=managed-bootstrap`, the owner decision reference, and the
   closed Base64 release document. Revocation and rollback inputs must be empty.
   The ordinary successor mode remains the default.
3. Approve the exact SHA in the protected publisher environment. The job builds
   on Windows and uses the existing NotSigned and value-based no-seed checks.
4. The publisher writes and HEAD/GET-verifies four source artifacts, a signed
   managed-bootstrap manifest and its detached Ed25519 signature, then one
   immutable completion marker: **seven exact versions**. The marker is written
   last with `If-None-Match: *`. Existing marker/delete history, partial history,
   failed object readback, or a competing marker writer cannot report success.
5. Approve the separate readback environment. Its read-only role checks all seven
   exact versions, signature, public-key fingerprint, approved tenant/release/
   source/version, expiry, one-marker history, and anonymous S3/CloudFront denial
   for both the marker and executable. Public receipts contain hashes/counts,
   not private locators or signing material.

The marker namespace is
`internal-unsigned/baseline/managed-bootstrap/<tenant-hash>/<release-hash>/win32/x64/prepared.json`.
It reuses the existing baseline-prefix control-list permission; neither IAM
authority nor an end-user API route is expanded. This namespace cannot equal
the two 32-hex-segment installation baseline key. The manifest itself contains
neither an installation ID nor predecessor/update/rollback metadata.

The marker has no mutable latest pointer. A new package needs a new release ID
and a new owner decision. Seven retained objects alone are not a download grant.
Expired or no-longer-approved packages must not be handed off. This lane does
not claim automated revocation of an already delivered executable; do not
mistake its lack of update discovery for an active revocation service.

## Owner-mediated private handoff

After both protected jobs pass:

1. Recheck the exact run, source SHA/tree, public receipt hashes, and the current
   owner decision. Use the repository's documented AWS SSO role chain. Read back
   the AWS caller account/role and the live bucket/KMS controls; do not rely on
   an empty/default AWS profile.
2. Resolve only the marker key derived from the approved tenant and release ID.
   Require a complete single-version history and no delete marker. Verify the
   marker and detached manifest with the independently pinned metadata public
   key, not a key supplied by the package itself. Reuse
   `verifyAmicInternalManagedBootstrapReadback` for the exact-version checks.
3. Fetch the executable with authenticated `s3api get-object`, explicitly binding
   bucket, object key, `VersionId`, expected owner, region, and checksum mode.
   The target must be a new restricted file outside the worktree. Verify the
   returned VersionId, KMS key, provider SHA256, size, Object Lock/retention and
   full local SHA256 against the signed manifest before any handoff.
4. Transfer only this verified executable and non-secret verification material
   to the intended managed PC. Record the transfer hash on Windows too. Do not
   transfer AWS credentials, private approval packets, seeds, photos, signing
   keys, or GitHub tokens. Keep the expected unsigned Windows warning visible;
   do not disable Windows security or globally trust unsigned executables.
5. Record formal candidate-bound preinstall absence before installation. Install,
   capture warning/acceptance and the installed-tree receipt, then let the human
   complete login/MFA. The ordinary desktop registration service, not this
   package lane, must issue the real installation ID.

Owner-mediated copy is the selected managed-PC delivery path. An authenticated
tenant-member self-service portal would be separate work, not a silent weakening
of the existing trusted-installation update broker.

## Remaining gates after the first package

- Preserve the first package's exact artifact hash and S3 VersionId. A later
  installation-scoped baseline must adopt or otherwise prove those same bytes;
  rebuilding the same semantic version does not prove byte identity. The
  protected baseline-adoption path is a separate remaining implementation gate.
- Do not mark update/rollback ready until the real server-issued installation
  is trusted and the exact installed artifact is bound to its verified baseline.
- Production API routing/broker activation, server company-data import and
  authorization readback, Outlook action, update/rollback, uninstall and hosted
  data preservation retain their separate gates. See
  `amic-os-internal-unsigned-windows-canary.md`.
- Publish only sanitized source/release notes as a GitHub Draft Release. This
  lane does not authorize public unsigned installer assets, source-seed deletion,
  worktree cleanup or a whole-goal completion claim.
