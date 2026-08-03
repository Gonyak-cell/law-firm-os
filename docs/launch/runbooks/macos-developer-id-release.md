# macOS Developer ID release boundary

This runbook closes only `RFD-TUW-012`. It does not authorize a public release, production go-live, App Store distribution, or owner approval.

## Required predecessor and authority

Start only after `RFD-TUW-011` has produced a clean, exact-SHA formal app bundle and DMG. An internal build, a dirty build, a Markdown receipt, or files from a different source SHA are not valid inputs.

Developer ID signing, notarization submission, and authenticated `notarytool info` queries require a current approved intake. The intake contains no credential values and records only:

- one full source SHA and source tree;
- the formal app ID `com.amic.matter.desktop`;
- the approved certificate fingerprint algorithm/value and Team ID;
- an approval ID and canonical approval/expiry timestamps;
- explicit approval for signing, notarization submission, and status query.

Certificate subjects, Apple IDs, passwords, API keys, keychain paths, and keychain-profile names must never be copied into the receipt, release manifest, stdout, or evidence logs.

## 1. Non-mutating readiness plan

This command does not run `codesign`, `spctl`, `stapler`, `hdiutil`, or `notarytool`. It does not use credentials or inspect an internal artifact as release evidence.

```bash
node scripts/validate-matter-desktop-macos-release-boundary.mjs \
  --plan \
  --output .omo/evidence/rfd-tuw-012-current-readiness.json
```

The expected state before a clean formal package and approved intake exist is `BLOCKED_BY_ARTIFACT` or `BLOCKED_BY_AUTHORITY`, exit code `2`. It is not a failed implementation and must not be rewritten as PASS.

## 2. Approved intake contract

An approving authority supplies a `0600` JSON file outside distributable artifacts. Placeholder values below are not approval.

```json
{
  "schema_version": "law-firm-os.matter-desktop-macos-release-approval.v1",
  "checkpoint_id": "RFD-TUW-012",
  "approval_id": "replace-with-authoritative-id",
  "decision": "APPROVED",
  "approved_at": "2026-01-01T00:00:00.000Z",
  "expires_at": "2026-01-02T00:00:00.000Z",
  "source_sha": "0000000000000000000000000000000000000000",
  "source_tree": "0000000000000000000000000000000000000000",
  "channel": "formal",
  "app_id": "com.amic.matter.desktop",
  "signing_identity": {
    "fingerprint_algorithm": "sha256",
    "certificate_fingerprint": "0000000000000000000000000000000000000000000000000000000000000000",
    "team_id": "AAAAAAAAAA"
  },
  "operations": {
    "developer_id_signing": true,
    "notarization_submission": true,
    "notary_status_query": true
  },
  "public_release_approved": false,
  "owner_approval_claim": false
}
```

The approving system or operator must verify the real values. The validator only consumes the resulting authoritative intake; it does not mint approval.

## 3. Authority-gated build and submission

The existing formal macOS builder remains the signing/notarization executor. Do not invoke its Developer ID/notary mode until approval is current and the clean source SHA matches the intake.

The builder integration must make both Apple notary request IDs available after accepted submissions—one for the app and one for the DMG. A generic success string from `@electron/notarize`, a prior request ID, or a request ID for another artifact is insufficient.

No RFD-TUW-012 validator contains a signing command, a `notarytool submit` command, or a `stapler staple` command.

## 4. Read-only exact-artifact collection

After the approved builder has signed, submitted, and stapled the exact formal artifacts, run the collector. The notary profile stays in the process environment and is never recorded.

```bash
MATTER_NOTARY_KEYCHAIN_PROFILE='<approved-local-reference>' \
node scripts/validate-matter-desktop-macos-release-boundary.mjs \
  --collect \
  --approval-intake '<approved-intake.json>' \
  --app-notary-request-id '<app-request-uuid>' \
  --dmg-notary-request-id '<dmg-request-uuid>' \
  --source-sha '<full-source-sha>' \
  --source-tree '<full-source-tree>'
```

The collector runs these independent checks and records only command ID, exit code, PASS status, and canonical observation time:

- app: `codesign --verify --deep --strict`, `spctl --assess --type execute`, and `xcrun stapler validate`;
- DMG: `codesign --verify --strict`, `spctl --assess --type install`, `xcrun stapler validate`, and `hdiutil verify`;
- app and DMG: Developer ID certificate fingerprint plus Team ID extraction, with both identities required to match the approved intake;
- app and DMG: authenticated `notarytool info` for separate request IDs, each required to report `Accepted`.

The current Gatekeeper contract requires DMG `spctl` PASS; it is not treated as optional or inferred from notarization.

Every check record also contains its one-based execution sequence, strictly monotonic start/completion timestamps, and a SHA-256 of the raw command transcript. The receipt-level `execution` object records the nonzero exact command count, first/last timestamps, and the canonical sequence hash. Raw stdout/stderr, certificate subjects, profile names, and credentials are never stored.

An injected runner is supported only for local contract tests. Such a collection is permanently marked `verdict=TEST_ONLY` and `execution.mode=test_only_injected_runner`; changing those strings or rebuilding self-consistent hashes does not create release authority or an RF13-DIST sidecar.

The default receipt path is:

```text
apps/desktop/dist/mac/matter-<version>-macos-release-boundary.json
```

The receipt binds the build manifest, app bundle, and DMG by repository-relative path, SHA-256, and bytes. The app SHA-256 is a deterministic digest over sorted entry type, mode, byte length, content/link hash, and bundle-relative path. The receipt expires for gate purposes after 24 hours and must be regenerated against unchanged artifacts.

## 5. Staging and release-manifest integration

The release pipeline must supply all of the following before the boundary can authorize PASS. These are integration requirements for the builder/stager owners; the current legacy Markdown path is not authority:

1. Before any signing or submission, consume an active approved intake bound to the exact clean source SHA/tree and approved fingerprint plus Team ID.
2. At submission time, capture separate app and DMG notary request IDs together with the submitted artifact SHA-256/bytes and canonical submission time. A caller-supplied historical UUID is not artifact binding.
3. Store only `fingerprint_algorithm`, `certificate_fingerprint`, and `team_id`; remove certificate subjects from builder stdout, Markdown receipts, release manifests, and evidence.
4. Stage the JSON unchanged as artifact ID `macos_release_boundary_receipt`, path `mac/matter-<version>-macos-release-boundary.json`, kind `receipt`, and record its raw file SHA-256 in the artifact index/checksum file. The staged signed app representation and DMG must also agree with the receipt's exact digest/byte descriptors.
5. Emit schema `law-firm-os.matter-desktop-formal-release-candidate.v1` with a canonical SHA-scoped `artifact_root`, then replace the prose-derived `macos_signing` object with `macos_release_boundary` from `createMacosReleaseManifestBinding(receipt, receiptFileSha256)`.
6. Preserve the receipt verdict, native probe mode, nonzero command count, sequence hash, fingerprint/Team ID, artifact-bound app/DMG request IDs, every app/DMG command result, and observation timestamp.
7. Preserve `public_release_claim=false`, `production_go_live_claim=false`, and `owner_approval_claim=false`.

The compatibility entrypoint additionally requires the supplied receipt and release manifest to be the exact SHA-scoped staged files, then compares the receipt's DMG and build-manifest SHA-256/byte counts to the staged artifact-index records before semantic validation.

The final local gate requires the staged structured receipt, the same approved intake, and the formal release manifest. Only the compatibility entrypoint has SHA-scoped authority; invoking the lower-level validator directly cannot authorize PASS or write an RF13 sidecar.

```bash
node scripts/validate-matter-desktop-release-boundary.mjs \
  --receipt '<staged-macos-release-boundary.json>' \
  --approval-intake '<approved-intake.json>' \
  --release-manifest '<formal-release-manifest.json>' \
  --manifest '<exact-formal-macos-build-manifest.json>' \
  --app '<exact-formal-matter.app>' \
  --dmg '<exact-formal-matter.dmg>' \
  --source-sha '<full-source-sha>' \
  --source-tree '<full-source-tree>'
```

Legacy Markdown is rejected before any PASS decision. A missing app staple, unsigned/ad-hoc artifact, rejected Gatekeeper/notary result, reused notary request ID, stale receipt, path/hash/byte/source mismatch, identity outside the approved intake, or manifest/receipt mismatch exits `1`.

After structural receipt validation, the SHA-scoped final gate re-runs the entire read-only native command set against the current exact app and DMG, re-hashes both artifacts after the probes, and compares the live identity/artifact/request-ID evidence with the staged receipt. Structural PASS booleans or self-authored hashes alone return no authority.

## 6. RF13-DIST sidecar

Only the same-process live strict validation capability may call `createRf13DistMacosReleaseSidecar`. The sidecar schema is `law-firm-os.rf13-dist.macos-release-receipt.v1`; it carries the exact validated DMG SHA-256 as a sorted array and keeps the independently validated app digest in the raw RFD-TUW-012 receipt. A structural, test-only, blocked, or readiness result can never produce this PASS sidecar.

Serialization does not preserve that capability. RF13-DIST and rollback consumers must call `validateRf13DistMacosReleaseSidecar(sidecar, { liveValidation, expectedSourceSha, expectedSourceTree, expectedArtifactSha256, expectedReceiptSha256 })` in the same process. `liveValidation` must be the exact object returned by `validateMacosReleaseBoundaryLive` after it re-runs the native probes against the staged app and DMG. The consumer check re-reads both artifacts from the module-private live binding and rejects post-validation byte drift. The other arguments come from the canonical source, staged DMG descriptor, and raw staged RFD-TUW-012 receipt hash. A hand-written or cloned object is rejected even when every JSON field and hash is self-consistent. File-only consumers without the live capability must remain blocked.
