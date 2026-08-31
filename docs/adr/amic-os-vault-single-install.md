# ADR: AMIC OS single-install Vault integration

Status: Accepted for implementation
Date: 2026-08-28
Goal thread: `01a0475e-7c6c-7332-8021-37f33cfcd319`
Regression baseline: `LAWOS-SP-20260828-1787901890994922`

## Context

AMIC OS already contains a shared desktop/web shell, Vault read and write
routes, Outlook filing flows, and a protected desktop file-bridge design. The
remaining product requirement is that an end user installs AMIC OS once and
does not install or operate a separate Vault product. The same product must
store documents in the Vault authority and attach an exact Vault document
version to Outlook mail without turning mail selection into an implicit
processing trigger.

Outlook hosts do not share one extension model. Classic Outlook for Windows
can use a native VSTO/COM adapter. New Outlook, Outlook on the web, and Outlook
for Mac require Office.js for the current compose item. Microsoft 365
assignment is therefore an administrative deployment surface, not a component
that the local AMIC OS installer can install.

## Decision

### One user-visible product

- The user installs, launches, updates, and removes `AMIC OS`.
- There is no Vault-branded desktop application, installer, launcher, tray,
  login flow, or update channel.
- The Windows AMIC OS package may contain a native Outlook adapter, click-time
  broker, and required runtime as internal components. They do not create a
  second user-facing product or credential boundary.
- The macOS package contains the AMIC OS desktop and secure file bridge. It
  does not contain a Windows native adapter.
- Uninstall removes local AMIC OS components and local temporary material. It
  never deletes Vault documents, immutable versions, audit records, legal-hold
  or retention material, Outlook drafts, sent mail, or recipient copies.

### Host cohorts

The deployment cohorts are mutually exclusive:

| Cohort | Hosts | Outlook surface | Required deployment state |
| --- | --- | --- | --- |
| `classic_native` | Windows Classic Outlook | AMIC OS package's native compose command | Effective Office.js assignment is zero |
| `officejs_new_web_mac` | New Outlook, Outlook on the web, Outlook for Mac | M365-admin-assigned Office.js compose command | Native adapter is absent or inactive |

The intersection of the two cohorts is empty. The installer never adds or
removes Microsoft 365 assignments. A user-level Office.js assignment cannot
prove device-level zero visibility, so strict zero-surface is claimed only for
the managed `classic_native` cohort after live assignment and host readback.

### Source-only package gate

`contracts/amic-os-vault-single-install-source.json` makes the installation
topology and current gaps executable. The validator requires one desktop
product root, zero separate Vault product roots, NSIS for Windows, DMG for
macOS, no installer-owned M365 assignment mutation, and an uninstall
preservation set that excludes every Vault and mailbox authority record.
The temporary and formal desktop release flows execute this source gate first,
so a violating source tree cannot proceed into their test, build, or signing
sequence. The macOS build, Windows package build, and Windows NSIS build also
carry npm `prebuild:*` hooks, so the current direct QA and Authenticode
workflow calls cannot bypass the same boundary.

The current source passes that inventory gate and now reuses the previously
signed `0.1.29` identity split: internal macOS/Windows product display,
application bundle, main-window title, renderer document title, and DMG volume
are `AMIC OS`, while the executable, URL scheme, technical manifest product,
and internal app ID remain in the existing `matter` lineage. The Classic
adapter and click-time broker are absent, and integrated packaging, signing,
lifecycle, real-host, and production readiness are still false. Version,
upgrade, repair, uninstall, and rollback compatibility remain release gates;
display-name alignment is not evidence that those gates passed.

An unsigned internal macOS topology probe additionally produced one
`AMIC OS.app` in both ZIP and DMG and no separate Vault package. Its embedded
and external provenance manifests match; direct readback confirms display name
`AMIC OS`, executable and URL scheme `matter`, and the unchanged internal app
ID. Fixture-only packaged rendering also returns document title `AMIC OS` with
no horizontal overflow. That historical probe was built from dirty version
`0.1.27`, below the unchanged installed/signed `0.1.29`; whole-bundle code-sign
and Gatekeeper checks therefore failed and the probe must not be installed or
distributed. The historical internal package also retained its local runtime fixture. The shared
staging helper removes the complete local `runtime/` tree for formal packages;
Mac and Windows formal artifact QA reject any residual runtime directory, and
the single-install validator run by all three direct build entrypoints pins all
three guards. A clean signed version-forward artifact must still prove that
absence and cannot be replaced by this probe.

The version-forward source gate reuses the sealed `0.1.29` desktop profiles in
the Outlook forward/rollback contract rather than creating a second baseline.
It preserves the macOS notarized Developer ID boundary and the separate
Windows unsigned-internal-canary boundary. All direct package entrypoints and
both root release flows reject release intent unless the numeric desktop
version is strictly greater than `0.1.29` and that exact version is recorded
in the lineage contract. Version `0.1.31` is now selected as the successor;
this permits an internal unsigned candidate build but does not itself prove an
upgrade, repair, rollback, public signing, or production readiness.

Every direct macOS, Windows package, and Windows NSIS prebuild then validates
the active desktop file-bridge v0.4 contract and the reviewed 21-file
main/preload/shared source manifest. These checks cover exact-version preview,
download, upload, protected temporary storage, and renderer non-disclosure;
they run after the one-product and version-forward gates and before platform
packaging. Both validators resolve repository evidence from their module
location rather than `process.cwd()`, because npm workspace lifecycle commands
execute inside `apps/desktop`. Passing this source gate does not prove that a
hosted Web asset or Vault provider has been deployed, nor that any artifact was
built or signed.

### Explicit actions only

- `ItemChanged` updates the selected-item projection only.
- Mail selection performs zero login, readiness, Vault, filing, or attachment
  work and shows no AMIC OS processing state.
- Saving an email or attachment to Vault requires an explicit AMIC OS action.
- Selecting a Vault document and attaching it to a compose item requires an
  explicit AMIC OS action.
- Interactive authentication appears only when silent reuse returns an
  authoritative interaction-required outcome.
- A networked `ItemSend` hook is not part of the initial implementation.

### Data and authorization authority

Vault remains the single writer and authority for document families,
immutable versions, file objects, object bytes, hashes, search, preview/OCR,
document permission, Ethical Wall, Records, DLP, and append-only audit.

AMIC OS owns the shared product shell, client projection, opaque cross-system
references, correlation IDs, and explicit action orchestration. The renderer
never receives a raw local path, storage locator, unrestricted provider URL,
long-lived attachment bearer, or Vault credential.

Formal production builds never fall back to the local synthetic or file-backed
DMS as the Vault authority. If the hosted capability is unavailable, the
product fails closed and reports Vault unavailable.

### Desktop exact-version preview

The shared Vault document detail has one explicit `Preview` action next to
`Save to this computer`. It does not introduce a separate Vault application,
login, provider endpoint, or renderer download path. The desktop main process
reuses the existing exact-version export preflight, download, and delivery
acknowledgement:

- the request is bound to Matter, document, version, file object, SHA-256,
  byte size, and MIME type;
- the main process rechecks the returned binding and computes SHA-256 over the
  downloaded bytes before writing anything;
- only an allowlisted preview MIME type can be written to the fixed
  application-owned OS-temp root;
- the root is a non-symlink directory with POSIX mode `0700`, files use
  exclusive creation and mode `0600`, and no native path or bytes cross to
  the renderer;
- each preview is bound to the invoking renderer owner and expires after at
  most five minutes;
- startup, explicit login/account replacement, logout, tenant switch, expiry,
  and app quit clear the cache. Temporary native-app file locks retain the
  cleanup obligation and trigger retry; startup retries any quit residue.

This is a source, local filesystem, synthetic-provider, and browser-rendered
decision. It does not prove the hosted Vault export provider, a signed package,
or a real macOS/Windows default-document application.

### Required end-to-end bindings

Document storage completes only after Vault readback proves the exact
`document_id`, `version_id`, `file_object_id`, SHA-256, byte size, and audit
correlation. An HTTP success alone is not completion.

Attachment export binds one request to the exact tenant, actor, installation,
document, version, file object, SHA-256, target host, and short-lived grant.
The client never silently substitutes the latest version. Retry is idempotent
and cannot create a duplicate version or duplicate attachment.

### Cross-surface trust boundary

The executable boundary contract is
`contracts/amic-os-vault-operation-boundary.json`. It covers the desktop
renderer and main process, API BFF, Vault authority, Office.js, Classic native
adapter, local broker, and protected temporary storage.

- Tenant and actor authority comes only from a verified server principal.
  Matter, document, and version values received from a client are selectors to
  re-resolve and reauthorize, never identity authority.
- A raw source path is held only by the desktop main process. For Classic
  attachment, the native adapter creates its own protected temporary path after
  receiving and verifying a bounded stream. No raw path crosses IPC or HTTP or
  enters UI state, receipts, audit metadata, or logs.
- Bytes cross only bounded binary content channels. Desktop main streams a
  selected file into the LawOS API; the current API may materialize that body
  only inside its hard byte cap before constructing fixed-origin multipart for
  Vault. This is not an end-to-end streaming claim. JSON, renderer state,
  receipts, audit metadata, and logs reject binary containers and byte fields.
- Desktop session material remains in the desktop main process or local
  broker. Vault provider credentials remain in the API server. Neither is
  returned to a renderer, Office.js, or the native adapter.
- Storage locators, provider object keys, unrestricted URLs, long-lived signed
  URLs, and raw policy bodies are never client-visible.
- Subjects, bodies, recipients, mailbox addresses, Outlook/Graph item IDs, and
  compose IDs do not enter the common receipt. A compose target is represented
  only by a server-verified SHA-256 binding.

### Common operation receipt

All storage, export, attachment, and temporary-cleanup implementations use the
contract in `packages/dms/src/vault-operation-receipt.js`. One explicit intent
gets a server nonce, deterministic operation and correlation IDs, a derived
idempotency key held only by the server, and a request fingerprint over its
immutable binding. The client-safe receipt exposes only the idempotency-key
hash and hashed tenant, actor, installation, compose-target, and authority
references.

Successful commit, readback, download, delivery, and attachment stages carry
the exact `document_id`, `version_id`, `file_object_id`, SHA-256, byte size, and
MIME type. Stages are append-only and flow-ordered. An exact replay returns the
existing receipt with execution disabled; reusing an idempotency scope with a
changed fingerprint fails with a conflict. Once an exact version appears it
cannot change or disappear. A failed, blocked, or cancelled operation can only
append cleanup, and a cleaned operation is immutable.

The LawOS audit record retains its native server-derived tenant and actor IDs
inside the audit authority. Its metadata and the client receipt share the same
correlation ID and native LawOS/Vault event references, so either ledger can
locate the other without copying mail PII, credentials, paths, bytes, storage
locators, or raw idempotency material.

### Current default-off upload transport

The LawOS API has a fixed-contract HTTP adapter for Vault upload preflight,
commit and readback. It is enabled only when
`LAWOS_AMIC_VAULT_UPLOAD_PROVIDER_ENABLED=true`, obtains its fixed origin and
server-held workload credential from sealed server configuration, requires
HTTPS outside loopback development, rejects redirects, and bounds request
bytes, time and response size. Commit metadata is strict JSON in multipart;
the file part alone carries exact bytes. The API currently materializes the
bounded body and constructs a `Blob`, so production evidence must describe the
transport as bounded multipart rather than end-to-end streaming.

This adapter is only the LawOS client boundary. The hosted Vault counterpart
for a delegated workload principal, Records/DLP decisions, quarantine
continuation and exact readback does not exist in the inspected Vault source.
The production Lambda also has no concrete `vaultCapabilityResolver`.
Configuration alone must therefore remain all-deny and cannot establish
production readiness.

Security scan `0d1a5889-8e76-4a29-a269-8b90f82ab256` additionally found that
legacy direct-DMS and primary Outlook filing routes can violate this ADR when
enabled. They are source-level release blockers pending explicit remediation
approval; no security fix or production activation is implied by this ADR.

## Schema decision

The default implementation changes no database schema. A crosswalk must first
show whether the current tenant, Matter, document, version, file-object, and
audit identities are losslessly representable. Any demonstrated gap opens a
separate, human-approved migration gate; all dependent writes remain disabled
until migration dry-run, backup, rollback, and readback pass.

## Evidence boundary

Source, tests, built artifacts, deployed providers, Outlook host behavior,
canary results, and go-live approval are independent gates. The savepoint is a
local source baseline only. It is not a package, provider snapshot, signed
release, Microsoft 365 assignment, or live-host result.
