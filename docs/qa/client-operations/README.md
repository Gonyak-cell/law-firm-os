# Client operations package evidence

`VC-CL-PKG-001` uses one manifest per run. The verifier reads only the
manifest and the explicitly referenced files; it does not scan the repository,
build, deploy, open a browser, or make network calls.

```bash
node scripts/verify-client-operations-package.mjs \
  --manifest docs/qa/client-operations/runs/<UTC-run-id>/manifest.json \
  --mode local
```

Local mode proves the current source identity and the local web/add-in
build/test receipts. With no external receipts its verdict is
`BLOCKED_EXTERNAL`, not `PASS`; it deliberately reports `exact_main`,
`logged_in_screen`, `deployed`, and `source_api_package_screen_sha_bound` as
false and rejects those claims if they are supplied.

Release mode is the only mode that can pass `VC-CL-PKG-001`. It requires the
source to be a clean `main` checkout (or a detached checkout at that exact
`main` SHA) whose source SHA equals `source.main_sha`, then requires all of the
following: web build, add-in build, migration,
API signed-session, package artifact, logged-in screen, and deploy receipts.
Every receipt and artifact is SHA-256 checked and bound back to the source and
to the package where applicable.
The result field `source_api_package_screen_sha_bound` is true only for that
release pass; local mode always returns false.

Release receipts must carry a detached attestation using
`law-firm-os.client-operations.receipt-attestation.v1`. The verifier checks an
Ed25519 signature against an externally managed trust anchor supplied through
the absolute `LAWOS_CLIENT_OPERATIONS_TRUST_ANCHOR_FILE` environment variable.
The trust-anchor JSON must use
`law-firm-os.client-operations.trust-anchor.v1`, contain only `key_id` and
`public_key_der_base64` alongside `schema_version`, and resolve to a regular
file outside the repository. The manifest and attestation packet cannot select
or replace this trust root. A missing anchor returns `BLOCKED_EXTERNAL`; an
invalid, repository-local, or non-matching anchor fails closed. Issuer strings
and `signed: true` are not trust. The signed payload binds the receipt, source
commit, run ID, artifact and artifact-manifest SHA/kind, and screen/API capture
bindings where applicable.

Focused tests generate an ephemeral Ed25519 key in memory and use an isolated
temporary external trust-anchor file; the production validation API and CLI
never accept an injected verifier object, and these fixtures are not
production release evidence.

Every release artifact also has an embedded artifact-manifest sidecar using
`law-firm-os.client-operations.artifact-manifest.v1`. Its commit SHA, artifact
SHA, run ID, canonical manifest digest, and the artifact's embedded
`LAWOS_ARTIFACT_*` marker must agree; the signed receipt attestation binds the
sidecar digest and artifact kind. This prevents an arbitrary string or
unrelated archive from becoming package evidence.

## Manifest shape

The complete no-secret template is in `manifest.template.json`. Paths are
repository-relative and may not escape the repository or be symbolic links.
Git SHAs use 40 lowercase hexadecimal characters. Artifact and receipt SHAs
use 64 lowercase hexadecimal characters.

Required source fields:

```json
{
  "schema_version": "law-firm-os.client-operations-package-evidence.v1",
  "verification": {
    "mode": "local",
    "scenario_id": "VC-CL-PKG-001",
    "run_id": "<UTC-run-id>"
  },
  "source": {
    "sha": "<40-char HEAD SHA>",
    "branch": "<branch or DETACHED>",
    "main_sha": "<40-char main SHA>",
    "worktree_dirty": false
  }
}
```

Build entries (`web_build` and `addin_build`) have receipt/attestation paths and
SHAs, artifact paths/SHAs, and embedded manifest paths/SHAs. Their JSON receipts
must use the corresponding schema name, `status: "PASS"`, the same
`source_sha`, the same `artifact_sha256`, the same embedded commit/manifest
SHA, and `tests_passed: true` (or an equivalent `test_status: "PASS"`).

The migration and API entries contain a receipt path/SHA and a binding SHA:

- migration: `migration_sha256`; receipt schema
  `law-firm-os.client-operations.migration-receipt.v1`;
- API: `api_artifact_sha256` plus an API artifact/embedded-manifest binding;
  receipt schema
  `law-firm-os.client-operations.api-signed-session-receipt.v1`,
  `signed_session_observed: true`, `session_principal_source:
  "api_signed_session"`, and a signed API response whose fixture-value digest
  is reused by the browser capture.

`package_artifact` has an artifact path/SHA and binds the web, add-in,
migration, and API SHAs, its embedded manifest, and its independently
attested package-build receipt. The logged-in screen entry additionally has
`screen_path`, `screen_sha256`, `runtime_metadata_path`, and
`runtime_metadata_sha256`, and an independently signed browser capture receipt;
the screen must be a real PNG of at least 320x180 with non-placeholder pixel
data. Metadata and capture must bind app/version/build, runtime route and
signed-session state, screenshot dimensions/markers, source, package, API,
API-response, and displayed fixture-value SHAs. The deploy entry binds the package SHA and must record
`deployed: true`, an environment, an HTTPS authoritative URL, matching request
and response URL/digest records, HTTP 200, and
`external_gate.status: "PASS"` with `authoritative: true`.

Do not put tokens, mailbox addresses, email addresses, raw MIME/body data, or
other personal data in receipts. The verifier rejects those fields and never
prints receipt bodies.

Generated evidence belongs under the ignored `runs/<UTC-run-id>/` root; every
receipt, artifact, response, screen, and metadata path must use that run
namespace. This keeps a clean source worktree compatible with release
verification and prevents receipt collisions across runs.

Directory artifacts are hashed deterministically as sorted forward-slash
relative paths followed by each file's SHA-256. A package archive is preferred
when one is available so the release binding is a single file SHA.
