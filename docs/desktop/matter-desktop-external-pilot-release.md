# matter desktop named macOS pilot release

Status: preparation path implemented; no bundle is approved or published by this document.

## Boundary

The external-pilot distribution channel is a named-firm macOS channel. It reuses the exact ZIP and DMG bytes from an approved `formal` candidate with app ID `com.amic.matter.desktop`. Reusing those bytes preserves the Developer ID signature, notarization result, staple, and Gatekeeper evidence recorded by the formal build.

The external-pilot channel is not a public release channel. It does not create an App Store or Microsoft Store claim, and the preparation script has no upload operation.

If a pilot needs a different bundle ID, stop. Changing the app ID changes the application bytes and requires a new Developer ID signed, notarized, stapled, and Gatekeeper-verified formal candidate. The preparation script rejects that substitution.

## Required inputs

Copy [the decision template](matter-desktop-external-pilot-decision.template.json) outside the release artifact directory and replace every placeholder. Preparation requires all of these bindings:

- one named `pilot_id`, `firm_id`, `lawos_tenant_id`, and UUID `entra_tenant_id`;
- distribution channel `external-pilot`;
- app-identity strategy `reuse-formal-notarized-candidate` and the formal app ID;
- exact formal version, source SHA, source tree, artifact-index digest, ZIP digest, DMG digest, package-lock digest, and desktop-package digest;
- exact tenant-configuration digest;
- an Ed25519 key ID and out-of-band public-key fingerprint;
- one signed verification closure binding the trusted launcher, canonical non-symlink Node path and binary digest, preparation CLI/generator, verifier, desktop trust resolver, shared trust helper, update verifier, release paths, and provenance module;
- an external v0.2 `macos_external_pilot_publication_approval` receipt signed by an authorized owner key, plus its detached signature;
- a governance-installed production trust root whose registry key scopes authorize the receipt source, type, pilot, both tenant namespaces, source, tree, version, role, operation, artifact, and binding digest; callers and bundles cannot select this root;
- an approved HTTPS or S3 destination with audience `named-pilot-only`.

The checked-in template uses zero digests, has no destination, and has no signed approval receipt. It must fail validation as committed.

## Per-firm runtime configuration

Copy [the tenant configuration template](matter-desktop-tenant-config.template.json), then record the named pilot, firm, distinct LawOS and Entra tenant IDs, approved HTTPS runtime endpoint, and validity window. Compute its exact digest with:

```bash
shasum -a 256 /path/to/tenant-config.json
```

Put that digest in the decision. The preparation script signs the exact configuration bytes with the approved Ed25519 release key and includes both `tenant-config.json` and `tenant-config.sig`.

The desktop binary stays generic. It does not assume that the AMIC runtime accepts another firm's tenant, and it does not consume the JSON automatically. An approved onboarding operator must verify the bundle, then apply the signed endpoint and both tenant IDs through the per-firm runtime bootstrap before the first launch. No matching bootstrap means no launch.

## Signing key

The private key must be an Ed25519 PEM file, mode `0600`, outside the worktree. The script derives its public key and requires the SHA-256 digest of the SPKI DER bytes to equal `signing.public_key_sha256` in the decision. Distribute that fingerprint separately from the bundle.

One way to create and inspect a new pilot key is:

```bash
openssl genpkey -algorithm ED25519 -out /private/path/matter-pilot-ed25519.pem
chmod 600 /private/path/matter-pilot-ed25519.pem
openssl pkey -in /private/path/matter-pilot-ed25519.pem -pubout -outform DER | shasum -a 256
```

Key creation and approval are separate owner actions. Do not store the private key in this repository or in the bundle.

## Verifier trust bootstrap

The release bundle never contains an executable verifier. `trusted-verifier-reference.json` is signed reference data, not a trust root and not an installation source.

Obtain `scripts/run-trusted-matter-desktop-external-pilot.sh` and its complete verification closure through a separate trusted channel or use separately installed copies. Before executing it, independently verify the launcher digest and every closure digest, including the canonical Node binary, resolver, helper, updater, and imported local release modules. Do not take those values only from `INSTALL.md`, the release manifest, or another file inside the bundle. Never invoke the Node verifier or preparation entrypoint directly.

The verifier accepts no trust-root, registry-path, registry-digest, or environment-variable override. Its production path uses only the versioned governance-installed trust-root policy. The current source policy is intentionally unconfigured, so production preparation and verification fail with `TRUST_ROOT_NOT_CONFIGURED` until the governance owner installs that root outside the bundle and caller inputs. `trust-registry-reference.json` is signed reference data only; it cannot make a caller-created key trusted. Tests may inject a synthetic registry only through the explicit JavaScript API while `NODE_ENV=test`; neither command-line tool exposes that API.

After that pre-execution check succeeds, invoke the launcher by its absolute canonical non-symlink path with the exact owner-approved closure. The launcher rehashes the full closure before Node imports any module, rejects a symlinked or digest-mismatched Node executable, removes `NODE_OPTIONS` and `NODE_PATH` under `env -i`, and executes the exact approved Node bytes without using `PATH`:

```bash
/absolute/trusted/path/run-trusted-matter-desktop-external-pilot.sh verify \
  --expected-launcher-sha256 <approved-launcher-sha256> \
  --node-executable /absolute/canonical/non-symlink/path/to/node \
  --expected-node-sha256 <approved-node-binary-sha256> \
  --expected-prepare-cli-sha256 <approved-prepare-cli-sha256> \
  --expected-generator-sha256 <approved-generator-sha256> \
  --expected-verifier-sha256 <approved-verifier-sha256> \
  --expected-trust-resolver-sha256 <approved-trust-resolver-sha256> \
  --expected-trust-helper-sha256 <approved-trust-helper-sha256> \
  --expected-updates-sha256 <approved-updates-sha256> \
  --expected-release-paths-sha256 <approved-release-paths-sha256> \
  --expected-provenance-sha256 <approved-provenance-sha256> \
  -- \
  --bundle /absolute/path/to/bundle \
  --expected-key-sha256 <out-of-band-public-key-fingerprint>
```

## Prepare locally

The formal release root is the SHA-scoped `apps/desktop/dist/releases/<version>/<source-sha>/formal` directory. Run from the exact candidate source checkout or pass `--package-lock` and `--desktop-package` paths from that checkout. Their bytes must match the approved decision before the SBOM is generated. The Electron distribution directory must contain the matching `version`, `LICENSE`, and `LICENSES.chromium.html` files; the unpdf license must match the locked package.

Use the same launcher and closure shown above with mode `prepare`, followed by `--` and these preparation inputs:

```bash
/absolute/trusted/path/run-trusted-matter-desktop-external-pilot.sh prepare <approved-closure-flags> -- \
  --formal-release-root /path/to/formal \
  --decision /path/to/approved-decision.json \
  --tenant-config /path/to/tenant-config.json \
  --approval-evidence-root /path/to/evidence-root \
  --private-key /private/path/matter-pilot-ed25519.pem \
  --output-dir /path/to/new-local-bundle
```

The output directory must not already exist. Preparation copies and re-hashes the formal ZIP, DMG, build manifest, and notarization receipt. It does not rebuild or modify those files.

## Bundle contents

The local bundle contains:

- unchanged macOS ZIP and DMG bytes plus formal provenance files;
- `release-manifest.json`;
- Ed25519-signed `checksums.sha256` and `update-metadata.json`;
- the exact v0.2 `macos-distribution-receipt.json`, its detached Ed25519 signature and receipt reference, plus signed `macos-artifact-checksums.sha256` for the repository-wide macOS technical gate;
- the signed owner-approval receipt and receipt reference; only a non-authoritative registry digest reference is recorded, while production trust comes from the separately installed governance root;
- signed tenant configuration and the public verification key;
- CycloneDX `sbom.cdx.json`;
- Electron, Chromium, and unpdf notices;
- exact `INSTALL.md` and `ROLLBACK.md` operator steps;
- `trusted-verifier-reference.json`, which records that no executable verifier is bundled;
- `WINDOWS-BLOCKER.json`.

A passing external verifier reports `publication_ready: true` and `publication_performed: false`. Publishing remains a separate manual action against the exact approved destination.

The macOS distribution receipt is only a portable technical artifact receipt. It binds the exact source SHA/tree, version, pilot, both tenant namespaces, validity window, signing key, role, operation, artifact digest, binding digest, and artifact references. Its claim policy explicitly leaves external-pilot go-live and global release readiness false. A consuming intake must verify its detached signature through the governance-installed production trust root, resolve artifact paths from the bundle root, and not edit the receipt or signed files. The other API deployment, tenant/runtime binding, Microsoft 365, operations, backup/restore, and legal-owner gates remain independent and mandatory.

`update-metadata.json` is a signed update contract, not an enabled update feed. It binds source SHA/tree, manifest digest, artifact digest and byte size, both tenant IDs, approval ID/expiry, and its own expiry. Admission stays blocked until the actual downloaded bytes are supplied and match the signed digest and size. The current desktop shell exposes no automatic external-pilot updater channel.

## Windows blocker

No Windows file is included. Windows external-pilot distribution remains `BLOCKED` with code `WINDOWS_AUTHENTICODE_AND_NATIVE_SMOKE_REQUIRED` until both conditions are backed by exact-artifact evidence:

- the installer and installed executable have valid Authenticode signatures and timestamps;
- a Windows host passes native install, launch, update, rollback, and uninstall smoke for those bytes.

Renderer parity, an unsigned ZIP, a detached HMAC receipt, or a Darwin build is not Windows release evidence.
