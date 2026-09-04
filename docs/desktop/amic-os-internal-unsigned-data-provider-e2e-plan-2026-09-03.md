# AMIC OS internal-unsigned, server data, and provider E2E plan

Date: 2026-09-03
Status: active execution plan
Target: internal company-managed Windows PCs
Source baseline: `22ebd5d0bc761c8bae56d345f2265840646b95b6`
Last local verification: 2026-09-04

## 1. Outcome

AMIC OS must be installable from a private internal distribution channel without commercial Authenticode signing, while preserving an explicit Windows warning boundary. The installer contains no real contacts, photos, roster/registration seed, provider credentials, bank records, or company database. After an authorized user signs in, the client reads only tenant- and legal-entity-authorized server data.

For a supported API-key provider, the final operator flow is:

1. An administrator selects an already reviewed provider pack.
2. The administrator selects the legal entity and enters the provider API key.
3. The server validates the tenant, legal entity, role, pack identity, and idempotency request.
4. The key is written to AWS Secrets Manager; clients receive only an opaque connection state.
5. The registered read adapter calls the fixed HTTPS origin and read capability declared by the pack.
6. A validation probe and first synchronization run.
7. Normalized data, checkpoint, connection state, audit event, and outbox event commit under one tenant transaction.
8. The administrator receives a connection, provider, synchronization, and audit receipt. The API key and raw provider payload are never returned.
9. Authorized product surfaces read the normalized server snapshot.

This is “enter the key and connect” only after the provider pack has been reviewed, hash-bound, configured, and deployed. A key alone cannot describe an unknown API's URL, authentication scheme, pagination, schema, semantics, or consent requirements. No code path may imply that an arbitrary unknown API can be connected from a naked key.

## 2. Goal scope overlay

The active Goal was created before the latest provider instruction and its stored card cannot be edited while active. This plan is the authoritative execution overlay: the earlier phrase that actual provider code is out of scope is narrowed as follows.

- No real provider, real credential, real consent, or production-provider call is authorized today.
- A complete generic API-key onboarding and read E2E is in scope now.
- A future supported provider is admitted through a reviewed declarative pack whenever the generic engine covers it.
- Provider-specific code is permitted only when the reviewed API cannot be represented by that contract; it must implement the same port and gates.
- API-key providers must require no cross-cutting application change after their pack is admitted: operator input is provider, legal entity, and key.
- OAuth2/OIDC, mTLS, signed request, interactive bank consent, or provider app registration cannot truthfully be reduced to a single API-key field. Their human/provider prerequisite remains an explicit gate, while post-consent storage, synchronization, authorization, receipt, and revocation reuse the same lifecycle.

## 3. Non-negotiable boundaries

- Default approved provider count is zero.
- No synthetic provider may be represented as production-ready.
- All provider operations in this plan are read-only. Money movement, payment initiation, filing, message sending, or other external writes require a separate approval and receipt design.
- Provider base URLs and capabilities are server configuration, never user input.
- Credentials are never stored in PostgreSQL, logs, audit payloads, outbox payloads, client storage, build artifacts, screenshots, or GitHub artifacts.
- Connections are scoped to an authenticated tenant and an explicit legal entity.
- Denied and cross-scope requests must fail before secret access or provider calls.
- Real contacts, photos, registration seed, and roster records never enter the installer or public CI artifacts.
- Source data is not deleted until server count/hash/authorization/audit readback and rollback material are independently verified.
- Git history rewriting, credential/MFA entry, external consent, destructive removal, and public distribution remain human approval boundaries.
- A build, uploaded file, open RDP window, or green UI state is not a release or host-canary receipt.

## 4. Open-source decisions

The implementation borrows narrowly scoped concepts without adding a connector platform dependency.

| Source | Concept adopted | AMIC OS decision |
| --- | --- | --- |
| [OpenAPI 3.1.2](https://spec.openapis.org/oas/v3.1.2.html) | Explicit API-key, HTTP, OAuth2, OpenID Connect, and mTLS security schemes | Keep auth type explicit; never infer a provider from a key. Reject remote references and user-supplied servers. |
| [Airbyte low-code CDK](https://github.com/airbytehq/airbyte/blob/master/docs/platform/connector-development/config-based/low-code-cdk-overview.md) | Declarative request, selector, schema, pagination, cursor, and transformation components | Use a small closed provider-pack schema for read-only JSON APIs; do not embed Airbyte or its runtime. |
| [Nango authentication guide](https://nango.dev/docs/guides/auth/auth-guide) | Connection identity, credential lifecycle, validation, reconnect, and observability | Store only an opaque server-side reference and expose explicit ready/expired/revoked/repair states. |
| [Singer specification](https://github.com/singer-io/getting-started/blob/master/docs/SPEC.md) | Catalog selection and durable incremental state | Persist per-capability checkpoints and make re-sync idempotent. |

The minimum-code rule applies: reuse the existing provider registry, RepositoryPortV2/PostgreSQL transaction, permission gate, audit/outbox, AWS SDK, desktop update verifier, and installer builder. Add no Airbyte, Nango, Singer, or new orchestration dependency.

## 5. Execution order and acceptance gates

### Phase 0 — freeze truth and evidence vocabulary

Tasks:

- Record exact source commit, branch, dirty state, upstream, and existing Draft PR state.
- Keep PR #330 as the bounded internal-unsigned foundation; do not silently broaden its reviewed diff.
- Open a separate provider/data/distribution branch and PR.
- Define receipt names: source, provider-pack, secret, connection, provider call, sync, migration, authorization, audit, installer, distribution, install, update, rollback, uninstall, hosted-data preservation.
- Mark `source_complete`, `build_complete`, `uploaded`, `released`, `installed`, and `host_canary_passed` as distinct booleans.

Gate `G0`: exact source and intended diff are reproducible; no release or provider-production claim exists.

### Phase 1 — key-only provider onboarding E2E

#### P1. Provider-pack contract

- Closed schema and version.
- Stable provider ID, display name, semantic adapter version.
- Fixed origin-only HTTPS base URL on public DNS and port 443.
- Header API-key authentication only in v1; fixed header name and optional prefix.
- GET-only read capability IDs ending in `.read`.
- Fixed relative paths with no query, fragment, traversal, arbitrary URL, or redirect following.
- Closed JSON item selector and field mappings.
- Required mapped fields, scalar-only values, item and response-byte limits.
- No credential-like target field names.
- A designated validation/probe capability.

#### P2. Provider-pack admission and registration

- Bundle schema is closed and size/count bounded.
- Exact UTF-8 bundle bytes are SHA-256 pinned by separate configuration.
- In production, load at most 64 KiB of exact bundle bytes from one same-account Secrets Manager name; inline JSON is local-only, and ambiguous inline-plus-secret configuration fails before an AWS read.
- Partial configuration and hash drift fail startup.
- Server registers all admitted packs automatically on boot.
- Catalog sent to clients contains names, versions, auth type, fields, and capability IDs, but no endpoint or header details.
- No configured bundle produces an explicit zero-provider runtime.

Future hardening before the first real provider:

- Replace the configuration hash with an Ed25519-signed bundle whose trusted public key is deployed independently.
- Pin provider DNS/egress policy at the network layer as well as application validation.
- Record pack signer, approval, review, and rollback identity.

#### P3. Credential lifecycle

- Generate a deterministic secret ID from schema plus exact tenant, legal entity, connection, and provider binding.
- Require the production customer-managed KMS key ARN on every credential or tombstone secret creation; a missing or cross-region key fails runtime construction.
- Require the same exact KMS key again in the production `CreateSecret` IAM condition, together with the closed purpose tag.
- Create a new Secrets Manager generation; never overwrite a different key under the same onboarding generation.
- Reject arbitrary secret references and cross-scope resolution before an AWS read.
- Return only `aws-secrets-manager:` references to server internals; omit even that reference from public responses.
- On validation failure, write a credential-free tombstone before scheduling recoverable secret deletion.
- Permit tagged credential deletion only with a 7–30 day recovery window and explicitly deny force deletion, including authority inherited from another policy.
- If cleanup fails, expose `repair_required`; never report ready.
- Add rotation with a new credential generation, validation-before-activation, atomic connection pointer swap, and recoverable old-generation retirement.
- Add revoke/disable with tombstone, audit, and stopped synchronization.
- Add cleanup repair with an explicit admin permission and audit receipt.

#### P4. Connection and first synchronization transaction

- Resolve legal-entity choices from the authenticated tenant's server-side HRX employment-profile directory; never accept a browser-invented production entity.
- Reject an absent or unknown production legal entity before credential storage, secret resolution, or provider execution.
- Claim tenant-scoped idempotency before external effects.
- Persist provisioning lease and retry/resume state.
- Stage the expected credential reference before storing the key.
- Store key, run probe, normalize results, and verify returned scope/count/receipt.
- Commit connection, snapshot, checkpoint, audit, and outbox atomically.
- Replay the same idempotency key without another secret write or provider call.
- Reject reuse of an idempotency key with changed scope or credential material.
- Fence expired cleanup leases as `repair_required`.

#### P5. Ongoing synchronization

- Add an authenticated manual sync endpoint and a scheduled worker entrypoint.
- Use the last committed opaque checkpoint only; never accept cursor text from the browser.
- Extend the pack contract with bounded pagination, cursor extraction, request cursor placement, page limit, rate-limit policy, and retry ceiling.
- Dedupe by provider ID plus canonical external record ID.
- Commit a new immutable snapshot/version and checkpoint in one transaction.
- Preserve the last good snapshot on provider failure.
- Record provider, sync, audit, retry, and lag metrics without raw rows or credentials.
- Stop immediately when connection is disabled, revoked, expired, wrong-scope, or pack version is not admitted.

#### P6. Admin surface

- Show only admitted providers.
- Require explicit legal-entity scope selected from the server-authoritative tenant directory; disable credential entry and submission when that directory is empty.
- Mask API-key input, disable browser autocomplete, clear state immediately after submission.
- Use one action: `연결 확인 및 저장`.
- Show loading, zero-provider, denied, validating, ready, failed, and repair-required states.
- Show only safe connection/provider/sync/audit receipts and normalized counts.
- Never render the key, secret reference, endpoint, response headers, or raw provider payload.
- Provide re-sync, rotate, reconnect, disable, repair, and revoke controls with separate confirmation appropriate to effect.

#### P7. Authentication variants

| Variant | Operator flow | Required prerequisite |
| --- | --- | --- |
| Static API key | Select pack/entity, enter key; validation and first sync run automatically | Approved pack already deployed |
| OAuth2/OIDC authorization code + PKCE | Select pack/entity, complete provider redirect; server exchanges/stores tokens and starts first sync | Provider application registration and human consent |
| mTLS | Select pack/entity/certificate reference; server validates certificate binding and starts first sync | Certificate issuance and private-key custody |
| Signed/custom auth | Provider-specific adapter implementing the same read port | Separate security review |

#### P8. Provider acceptance test

Before claiming that a real provider is connected:

- Provider owner approves the exact pack bytes and adapter version.
- Egress/DNS policy admits only the exact origin.
- A non-production provider account/key is entered through the UI, not committed or pasted into evidence.
- Secret read/write CloudTrail evidence exists without key material.
- Probe and first-sync receipts match the legal entity and expected fixture count/hash.
- Wrong key, revoked key, oversized response, redirect, non-JSON, schema drift, timeout, pagination limit, and cross-tenant/entity negatives pass.
- Key rotation, manual/scheduled sync, disable, revoke, and rollback of a pack version pass.
- Only then may `real_provider_connected=true` be recorded.

Gate `G1`: an approved synthetic pack proves the full key-to-first-sync path; default provider count remains zero. The first real provider additionally passes P8.

### Phase 2 — private data inventory and canonical mapping

Tasks:

- Inventory contact source, roster source, registration seed, and every photo file without mutation.
- Record source path, byte size, SHA-256, record count, stable logical ID, tenant mapping, legal-entity mapping, and orphan/duplicate status.
- Classify personal information and access requirements.
- Define canonical server records for user registration, organization membership, contact channels, photo metadata, and photo object versions.
- Define conflict rules for duplicate emails, missing member IDs, stale photos, and multiple legal entities.
- Produce an encrypted/restricted mapping workbook or machine-readable manifest outside public artifacts.
- Keep the approval template non-identifying: source-row coordinates, stable hashes, source-presence flags, disposition, tenant/legal-entity target, and approval reference only. Never put names, email addresses, telephone numbers, or photo bytes in the approval template.

Gate `G2`: inventory count and aggregate hash are stable; every source row/object has a disposition and tenant/legal-entity target or an explicit quarantine reason.

### Phase 3 — server-side data and photo migration

Tasks:

- Create or reuse PostgreSQL record types under tenant RLS.
- Use S3 for photo bytes with SSE-KMS, versioning, object ownership, public-access block, and tenant/legal-entity prefixes derived server-side.
- Admit only bounded PNG inputs after signature and IHDR validation; reject malformed dimensions, either dimension above 4096, more than 16,000,000 pixels, or more than 5 MiB before storage.
- Store only object references and hashes in PostgreSQL.
- Add authenticated registration/contact/photo read endpoints and signed or streamed photo delivery.
- Import in dry-run mode, then execute only after scope review.
- Bind the exact AWS account/region, PostgreSQL and tenant-context Secrets
  Manager references, private versioned S3 bucket/owner/prefix, and KMS key ARN
  into the Ed25519-approved execution packet. Keep the raw packet and operator
  input outside the worktree as 0600 files.
- Recheck a clean exact `origin/main`, the owner approval, source/mapping
  digests, AWS caller role, S3/KMS controls, TLS `verify-full` PostgreSQL
  connectivity, the complete migration catalog, and authenticated tenant
  authority before the first write.
- Emit private start, AWS-control, database-readiness, checkpoint, result, and
  failure receipts. A partial photo commit must return `repair_required` and be
  replayable with the same packet/idempotency binding.
- Preserve source timestamps and provenance without retaining raw local paths in client responses.
- Write migration, authorization, audit, and rollback receipts.
- Compare exact source/destination counts, per-item hashes, aggregate hashes, and negative authorization results.

Gate `G3`: exact count/hash/readback succeeds for authorized users; cross-tenant, wrong-entity, unauthenticated, and unregistered-user tests reveal neither bytes nor existence.

### Phase 4 — server-authoritative client cutover

Tasks:

- Make login/session identity the only selector for company data.
- Remove every real tenant identifier fallback from browser source; an absent session may use only an explicit synthetic development scope that the operational server rejects.
- Replace bundled/local roster, contacts, registration seed, and photos with authenticated endpoints.
- Keep offline/error states honest; do not silently fall back to packaged real data.
- Confirm New Outlook, Outlook Web, macOS Outlook, Windows desktop, and Classic Outlook integration use the same server authority where applicable.
- Validate login, profile/contact/photo visibility, authorization changes, revocation, session expiry, and no-data state.
- Scan renderer, desktop resources, installer tree, archives, CI artifacts, logs, source maps, and caches for source bytes and forbidden names.

Gate `G4`: supported clients load server-authoritative data after login and the build remains useful with zero bundled real data.

### Phase 5 — source retirement, no history rewrite by default

Tasks:

- Freeze a rollback copy with restricted ownership.
- Re-run G2–G4 immediately before any source removal.
- Remove current-tree private source files only after explicit user approval.
- Prove build/tests still pass and server readback remains complete.
- Keep Git-history rewriting as a distinct destructive project requiring target refs, backup refs, collaborator coordination, force-push approval, and downstream clone invalidation.

Gate `G5`: current tree and installer contain no private source; hosted data and restricted rollback remain intact. History is unchanged unless separately approved.

### Phase 6 — private internal-unsigned distribution repository

Tasks:

- Provision a private S3 bucket with public-access block, versioning, SSE-KMS, object ownership, access logging, and least-privilege lifecycle policy.
- Use CloudFront Origin Access Control; no S3 public URL.
- Require authenticated/private download delivery suitable for managed internal users/devices.
- Separate immutable objects by channel, platform, architecture, version, source SHA, and content SHA-256.
- Store installer, build manifest, SBOM, provenance, release metadata, update metadata, raw Ed25519 signature, revocation metadata, and rollback metadata as independently hash-bound objects.
- Bind rollback to the complete, separately signed target update metadata and artifact rather than a version label alone.
- Before any successor upload, independently HEAD and GET the declared predecessor installer by exact object key and VersionId, verify its byte count, SHA-256, provider checksum, KMS boundary, metadata, and Object Lock through the rollback window, and abort with zero new writes if it is absent or differs.
- Resolve the active predecessor control before a successor write: use the verified baseline marker only when no channel exists, otherwise use the latest exact channel-pointer VersionId. Verify its embedded Ed25519 document and update metadata and require an exact match to the rollback target; an older retained but non-current installer cannot satisfy lineage.
- Commit baseline/channel control keys with S3 conditional writes: `If-None-Match` for the first control and `If-Match` against the just-verified current ETag for later channel moves. Reject unconditional control writes in the bucket policy.
- Permit an expired predecessor control only as signed immutable lineage. Require a newly active rollback-target metadata document with identical non-time fields and a re-read exact installer VersionId, so a long idle period cannot permanently deadlock later publication.
- For every channel successor, require a strictly increasing revocation revision and a superset of every previously revoked release and artifact; neither the current release nor its rollback target may be revoked.
- Treat the first artifact in an empty tenant/installation scope as a distinct baseline operation. Before any write, require zero version/delete-marker history at both its channel and baseline-marker keys. Publish exactly nine immutable versions with the signed, non-runtime-discoverable baseline marker last; do not publish a channel pointer, revocation document, or rollback authorization. Reject a second baseline before any new write. A normal successor starts only after an isolated reader has verified all nine exact VersionIds and may use only that baseline's signed update metadata and exact installer VersionId as its rollback target.
- Keep GitHub release assets free of the unsigned installer. A GitHub Draft Release may carry sanitized notes and receipts only, with private S3 object identities referenced safely.
- Define retention and legal/audit policy before deleting any immutable version.

Gate `G6`: for a new scope, an isolated reader can GET all nine baseline VersionIds, list only the exact control keys to prove one baseline-marker version and zero channel history, and prove the baseline is non-discoverable and has no rollback claim. For a successor, it can HEAD and GET all 17 current-release objects plus the exact predecessor installer VersionId, recompute hashes, verify metadata/signatures/expiry/revocation, and prove anonymous/public access fails. A competing control-key write must fail its conditional commit.

### Phase 7 — GitHub OIDC build and publish pipeline

Tasks:

- Use GitHub OIDC and a protected environment; no long-lived AWS keys.
- Create and protect both named GitHub environments before any workflow run; [GitHub may otherwise create a referenced missing environment](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) without the intended rules. Require protected `main`, an independent reviewer, and prevention of self-review before enabling any AWS role.
- Treat `id-token: write` as job-wide GitHub authority: protected-environment approval must cover the exact SHA and all code/dependencies run in the publish job. Do not describe the later credential-configuration step as step-scoped OIDC isolation.
- Treat every `workflow_dispatch` input as non-secret event data. Accept only bounded, exact-field release, predecessor, revocation, rollback, and distribution-binding documents; reject added fields before writing output, and never place credentials, personal data, private keys, or signed download capabilities in an input.
- Keep the top-level manual dispatcher free of its own runner steps and AWS role trust. Bind the publisher and reader roles to the immutable GitHub repository and owner IDs, exact repository/ref/environment, and their respective exact reusable workflow file and ref through `job_workflow_ref`; make both called jobs reject any alternate caller `workflow_ref`.
- Pin actions by commit SHA and install from lockfiles.
- Build on Windows from exact clean source SHA/tree.
- Force `internal-unsigned`; reject signing configuration and identity auto-discovery.
- Produce an inspectable unpacked tree; reject opaque ASAR, local API runtime, credentials, keys, contacts, photos, roster, and registration seed by path, exact content hash, and selected protected source-value bytes across every unpacked file.
- Generate SBOM and deterministic build/provenance receipts.
- Sign release/update metadata with a dedicated Ed25519 key whose private material is never in the installer or repository.
- Make `baseline` versus `successor` an explicit protected-workflow input. Default to `successor`; baseline rejects revocation/rollback inputs, while successor requires both during preflight.
- Upload immutable objects, read them back by VersionId, verify bytes, then update the signed channel index atomically.
- On any failure, do not move the channel pointer or publish a completion claim.

Gate `G7`: OIDC subject/repository/ref/environment, exact source, exact objects, hashes, signature, and private readback are recorded; no public installer artifact exists.

### Phase 8 — desktop updater, expiry, revocation, and rollback

Tasks:

- Embed only the pinned Ed25519 public key and private distribution endpoint policy.
- Because a first baseline deliberately has no channel pointer, bootstrap a fresh installation only from the first successor's separately signed rollback-target metadata. Require that target to match the installed build exactly and that the successor names it as the exact predecessor; verify both signatures, tenant/installation scope, artifact hash/size/VersionId, active expiry, rollback binding, and current revocation revision before writing encrypted local state. The same check must return the successor as available without a discoverable baseline request.
- Verify exact metadata bytes before parsing.
- Enforce schema, channel, platform, architecture, source lineage, size, SHA-256, signature, expiry, and revocation.
- Download to a new temporary file, hash before execution, and never replace the running installation implicitly.
- Preserve explicit user/admin update action for unsigned installers and the Windows warning boundary.
- Keep previous known-good version and signed rollback metadata.
- Reject downgrade except an explicitly authorized rollback target; persist consumed rollback IDs across restart so one-time authorization cannot be replayed.
- When the bounded consumed-rollback history is full, continue to permit forward updates but fail closed before downloading or opening another rollback installer; never create an over-capacity pending state.
- Project the authenticated HTTP broker response into the updater's exact closed authorization schema before verification, dropping server request/progress wrapper fields.
- Record update and rollback receipts without local paths or secrets.

Gate `G8`: tamper, expired metadata, revoked artifact, wrong channel/arch/version, replay, partial download, hash mismatch, signature mismatch, and unauthorized downgrade all fail closed.

### Phase 9 — JWS-GALAXYBOOK host canary 0 → 1 → 0

Use the NLA-free TLS/RDP method already established for this managed host, but count only durable receipts or captured output as evidence. Window state alone is not evidence.

Tasks:

1. Record exact host identity, OS, architecture, disk baseline, prior AMIC OS state, and source/install candidate hashes.
2. Prove `0`: product, service, scheduled task, update cache, and intended install path are absent without touching unrelated data.
3. Download the exact private artifact through the intended authenticated path and verify metadata/signature/hash/VersionId.
4. Install the unsigned candidate and capture the expected Windows warning plus operator acceptance.
5. Prove `1`: installed tree, executable identity, version, shortcuts, protocol handlers, and uninstall entry.
6. Sign in using the human-owned credential/MFA step.
7. Read back tenant contacts, member photos, registration/roster-derived membership, and hosted Vault data with exact expected authorization.
8. Run the explicit AMIC OS Outlook action in required Outlook hosts; do not count ordinary email selection.
9. If a supported provider is available, enter its non-production key and capture G1/P8 receipts; otherwise assert zero-provider UI and do not block the distribution canary on a nonexistent provider.
10. Install a newer internal version, verify update metadata, then execute a signed rollback scenario.
11. Uninstall the application and prove `0` again.
12. Reinstall or query independently to prove hosted data, document versions, audit, contacts/photos, and provider state were not deleted by uninstall.

Gate `G9`: independent receipts exist for preinstall, private download, install, installed tree, login, server data, Outlook action, update, rollback, uninstall, and hosted-data preservation.

### Phase 10 — review, Draft Release, and savepoint

Tasks:

- Run focused and affected regression suites, security scanners, `git diff --check`, UI build, AI slop lint, and rendered visual QA.
- Review the exact diff and verify no private bytes, API keys, secrets, endpoints, or generated evidence leaked.
- Push the source branch and open a Draft PR with exact test/evidence links.
- Wait for required checks and review; do not merge around failures.
- For unsigned builds, create or update a GitHub Draft Release containing sanitized notes/receipts and private distribution references, not the installer itself.
- A formal GitHub Release remains reserved for the separately approved signed release path.
- Apply the SAVE_POINT workflow only after the requested scope is actually complete: immutable local save, commit, source push, main integration, and remote readback. Worktree cleanup is excluded.

Gate `G10`: source SHA, PR, checks, private artifact identities, Draft Release state, Windows receipts, savepoint identity, main integration, and remote readback agree.

## 6. Current implementation ledger

| Item | Current state | Evidence required to advance |
| --- | --- | --- |
| Provider registry boundary | Implemented in PR #330 baseline | Existing tests/checks remain green |
| Closed API-key provider pack and generic read engine | Implemented and locally verified on follow-on branch | Review plus first real-provider P8 evidence |
| Hash-bound startup bundle and automatic registration | Implemented with zero-provider fail-closed default, local inline mode, production exact Secrets Manager source, 64 KiB ceiling, and ambiguity/drift negatives | Real deployment configuration only when a pack is approved |
| Secrets Manager exact-scope credential vault | Implemented with tenant/entity/connection/provider-bound references, required same-region customer-managed KMS key, exact-key and purpose-tag creation IAM, tagged-prefix use, 7–30 day recoverable deletion, and force-delete denial | Real AWS command evidence only when authorized |
| Durable tenant/legal-entity connection and first sync | Implemented with snapshot/checkpoint/audit/outbox transaction | Hosted PostgreSQL receipt only when import/deploy is authorized |
| Authenticated HTTP API | Implemented with signed-session `tenant.admin` gate, server-authoritative legal-entity catalog, exact entity on detail reads, and production unknown-entity rejection before secret/provider access | Hosted runtime readback |
| Admin UI key-to-first-sync flow | Implemented; legal entity is selected from the server catalog, all inputs close when that catalog or the provider catalog is empty, and zero-provider, zero-entity, and synthetic-success states were rendered | First real-provider P8 UI receipt |
| Rotate/revoke/repair/manual/scheduled sync | Implemented and locally verified, including last-good preservation and repair-required state | Hosted lifecycle canary after a real provider exists |
| Pagination/cursor/rate-limit pack v2 | Implemented and locally verified with bounded pages, opaque checkpoints, and retry ceiling | Provider-specific acceptance fixtures when a real pack exists |
| First real provider pack/account/key | Not available; zero remains correct | Human/provider prerequisite plus P8 |
| Contact/photo/registration/roster inventory | Safe source inventory implemented: 12 accounts, 10 roster members, 10 matched identities, 2 account-only identities, 5 matched photos, 5 members without a photo, no standalone contact seed, no explicit legal-entity assignment; the ignored non-identifying mapping template covers all 12 subjects and remains `import_authorized=false` | Fill the 12 dispositions with the real production legal-entity ID or an explicit quarantine reason and attach an approval reference before import |
| Server migration | Existing PostgreSQL identity/HRX ledgers and S3 photo port reused; fixed-account/role/region/stack read-only target discovery, signed execution packet, exact production-target binding, owner approval, local re-preflight, AWS caller/S3/KMS gates, Secrets Manager resolution, TLS PostgreSQL readiness, versioned photo commit, idempotent identity/HRX import, checkpoints, and safe repair receipt are implemented locally. Live readback now proves the deployed production stack predates the explicit provider-ready parameters/output, so discovery correctly remains closed instead of treating absence as `false` | Approved legal-entity mapping; separately authorized production-template update with `EnableExternalReadProviders=false`; then exact target discovery/private-network execution and hosted G3 receipt |
| Server-authoritative client cutover | Profile/photo endpoint and browser client foundation locally verified; real tenant fallbacks removed in favor of session authority or an explicit synthetic development scope; real seed source remains untouched | Hosted G3 readback, then G4 supported-client canaries |
| Current-tree source retirement | Approval-gated | G5 plus explicit approval |
| Private S3/CloudFront distribution | IaC policy, OAC/KMS/logging boundaries, decrypt-only CloudFront KMS authority, conditionally absent OIDC/runtime roles while disabled, one-time nine-object baseline, exact control-history readback, conditional control commits, monotonic revocations, idle-period metadata renewal, exact-version successor publisher, and isolated readback implemented locally; no stack provisioned | Protected GitHub environments first, then authorized disabled-stack inspection, enablement, and G6 baseline/successor anonymous-denial and exact-VersionId receipts |
| OIDC publish pipeline | One manual dispatcher with no runner steps or direct AWS role trust explicitly selects baseline or successor and invokes separate protected reusable publisher and reader workflows; actions are SHA-pinned, immutable repository/owner IDs, each exact `job_workflow_ref`, and the exact caller `workflow_ref` are pinned, job-wide OIDC authority and non-secret dispatch inputs are documented, input documents and nested predecessor/bindings reject extra fields, a second baseline is rejected before writes, the first successor is anchored to the baseline marker, later successors are anchored to the latest channel pointer, and the channel pointer moves conditionally only after the 17 current objects plus predecessor readback | Authorized protected-environment baseline run followed by first and repeated successors and G7 OIDC receipts |
| Updater/revocation/rollback | Main-process streaming verifier, exact HTTP response projection, encrypted state, preload bridge, explicit update/rollback UI, non-discoverable baseline bootstrap from the first successor's doubly signed lineage proof, no-state-write failure handling, signed target binding, restart promotion, and rollback-history capacity guard implemented locally | Packaged Windows tamper matrix and G8 host receipt |
| Windows 0→1→0 | Exact-host read-only state collector and cross-receipt validator implemented locally for immutable `preinstall → installed → postuninstall` evidence; it reuses the five-pass native NTFS scanner, matches only exact AMIC OS paths/registrations, creates one new receipt, and explicitly leaves all runtime/download claims false | Current-candidate G9 host receipts, including the independent download, warning, login, server-data, Outlook, update, rollback, uninstall, and hosted-preservation evidence listed in `docs/runbooks/amic-os-internal-unsigned-windows-canary.md` |
| Draft PR/release/savepoint | Pending | G10 remote readback |

### 6.1 Local verification snapshot

The following results prove source behavior only. They are not AWS deployment, GitHub publication, real-provider, private-data migration, or Windows host-canary receipts.

- Provider pack/onboarding/runtime/API/browser adapter: 51/51 focused tests passed, including production secret-source ambiguity, same-region KMS negatives, exact legal-entity detail reads, and wrong-entity rejection before credential/provider access.
- Production PostgreSQL infrastructure generator and validator: 13/13 focused tests passed with provider activation disabled by default, an exact provider-pack secret, exact-KMS and tagged credential-prefix IAM, VPC endpoint scope, bounded 7–30 day recoverable deletion, and force-delete denial.
- The production PostgreSQL template independently returned `PASS` with 86 resources, provider activation disabled by default, and canonical template SHA-256 `09fb43ad110d16f6a117481a24b9477853437c248d5245a80e02804b7bd5eba5`; this is local source evidence only and was not deployed.
- Private inventory/migration/photo/profile path: the established 47/47 focused batch remains green, and the latest affected photo/profile plus inventory/migration subset passed 22/22 after adding shared PNG signature/IHDR, 4096-pixel dimension, 16-million-pixel, and 5 MiB admission bounds. All 5 source photos passed the same validator without returning their bytes. No real import or source deletion ran.
- The production bootstrap operator boundary passed its focused tests after adding exact non-synthetic target binding, cross-account/region secret and KMS rejection, deterministic S3 adapter identity, clean `origin/main` enforcement, Ed25519 production-packet approval, exact cutover-role verification, S3/KMS governance readback, preflight replay binding, conservative repair handling for a lost photo-finalize response, and safe CLI fail-closed output. The latest 34/34 combined batch also covers a fixed-account/role/region/stack discovery command that performs only 11 metadata reads, rejects an enabled external-provider output, never calls `GetSecretValue` or an AWS mutation, suppresses raw infrastructure identifiers from its public receipt, and writes its private packet input with mode 0600. The discovery, preparation, approval, and execution commands are documented in `docs/runbooks/amic-private-bootstrap-migration.md`; none was run against real AWS or hosted PostgreSQL.
- The restricted mapping template at `.omo/evidence/amic-private-bootstrap-legal-entity-mapping-template-2026-09-04.json` was regenerated from the current source inventory and verified as 12 subjects, 12 pending dispositions, no raw identity values, and `import_authorized=false`. It is ignored by Git, has local mode `0600`, and cannot authorize import until the real production legal-entity ID, per-subject assign/quarantine disposition, and approval reference are supplied. Its current validation result is the safe code `AMIC_PRIVATE_BOOTSTRAP_MAPPING_APPROVAL_REQUIRED`; the CLI returns no stack, path, raw identity, or photo data.
- Value-based privacy gates: the production web bundle was rebuilt after removing three real-tenant fallbacks, then passed against 48 protected roster/registration/tenant values and 5 source-photo hashes; protected values were not printed. The internal-unsigned package audit now also streams every unpacked text or binary file and rejects selected protected source values even when they are repackaged under different bytes or split across a 64 KiB read boundary. Its current-source probe covered 7 private source files and 49 unique protected values with zero matches and no value disclosure. Windows package QA runs these gates before installer publication and watches both seed sources, photos, and the validators themselves.
- Distribution infrastructure/preflight/publication/readback/workflow/updater/UI: 58/58 focused tests passed, including the nine-version non-discoverable baseline, exact zero-channel history proof, duplicate-baseline zero-write refusal, conditional control-write race refusal, baseline-to-first-successor and current-channel-to-next-successor handoffs, idle-period rollback-metadata renewal, monotonic revocation enforcement, rejection of an existing but non-current predecessor with zero new writes, 17 current private successor object versions, the exact predecessor installer as the eighteenth read, zero-write refusal when it is missing, rollback target metadata, and the bounded rollback-history guard.
- The distribution template independently returned `PASS` for a 16-resource, default-disabled template with decrypt-only CloudFront KMS authority, no OIDC/runtime role creation while disabled, exact reusable publisher/reader `job_workflow_ref` bindings, and canonical template SHA-256 `c44d4b73b2ac84c8e58359b30eb1c21308fae92008569f643005a4d47b1c259b`; the temporary generated template was removed after inspection.
- Broker → desktop HTTP projection and update/rollback runtime regression: 72/72 focused tests passed after adding the exact response projection and rollback-history capacity guard.
- Provider/update settings UI: the latest provider/API/UI regression passed 39/39, TypeScript validation, and the Vite production build. Rendered provider QA showed two server-supplied entities in an accessible combobox, successful selection of a synthetic second entity, automatic key-field clearing after submission, safe connection/provider/sync/audit receipts only, and every input disabled when the entity catalog was empty.
- Rendered update QA: forward candidate, staged unsigned warning, restart recovery, one-time rollback offer, keyboard focus, and 700 px no-overflow state were observed with a local inert bridge. The temporary QA page was removed afterward.
- Full web test glob after expanding the sparse checkout to the tracked fixtures: 464 total, 463 passed, 0 failed, and 1 pre-existing explicit skip. The one deterministic consultation-detail focus regression was fixed by restoring focus through the stable consultation ID after URL-driven DOM replacement, and the same browser scenario passed in the complete rerun.
- Full desktop test glob after expanding the sparse checkout to the tracked contract fixture: 264/264 passed.
- The current full-repository run used the repository-required Node 22.22.3 and completed 6,602 tests with 6,601 passed, zero failed, and one explicit skip. This latest green run includes the production-target discovery coverage, package-wide protected-value streaming negative, and all four new Windows state-collector/validator tests; the focused private-bootstrap batch passed 34/34 and the latest affected internal-distribution/Windows batch passed 60/60 beforehand. A diagnostic run under Node 26 had six expected environment-gate failures; rerunning the same tree under Node 22 proved those were runtime-version mismatches rather than product regressions. A prior pass correctly detected that the four Client Operations drill receipts still bound the pre-change `apps/api/src/server.js` hash; the four synthetic drills were actually recaptured, their contract returned `PASS` while Graph/AWS stayed `BLOCKED_EXTERNAL`, the focused contract passed 10/10, and the complete suite then finished green. Test-generated changes to 11 tracked manual-QA receipts were restored byte-for-byte to the source baseline after the latest run. The earlier unrelated lock regression was traced to concurrent fixture registration before the lock scenario; fixture setup is now sequential while the sweep/revoke concurrency, required serialization retry, and deadlock rejection remain unchanged. The email-DMS package then passed 377/377 and the focused lock scenario passed ten consecutive runs before the full green rerun.
- The new current-candidate Windows host-state boundary passed 4/4 focused tests and the affected internal-distribution, updater, package-privacy, and native-Windows batch passed 60/60. It produces one create-new receipt per stage, emits a safe non-Windows `WINDOWS_REQUIRED` receipt, refuses overwrite, validates exact source/candidate/host binding, recomputes the complete native installed-tree digest, rejects host/lineage/boundary/tree drift, and only returns a bounded `0 → 1 → 0` result with `g9_complete_claim=false`. No current-candidate Windows action or G9 host claim was made.
- Live AWS readback on 2026-09-04 used the restored role chain without any mutation or `GetSecretValue`. `lawos-production` was `UPDATE_COMPLETE`, and `ApplicationDatabaseSecret`, `TenantContextSecret`, `DmsBucket`, and `ProductionKey` were all `CREATE_COMPLETE`. The deployed stack had no provider-related parameter or output, and `matter-lawos-api-prod` had neither provider-enabled nor provider-pack-secret environment key. This is fail-closed and not evidence of an enabled provider; it also means the strict target discovery cannot pass until a separately approved stack update explicitly emits `ExternalReadProvidersEnabled=false`. The internal-distribution stack search returned zero and both exact OIDC role names were absent, confirming that no private distribution infrastructure was provisioned by this work.
- A second read-only comparison bound the deployed `lawos-production` template to the current 86-resource candidate without creating a change set. The candidate adds 12 logical resources: `ExternalReadSecretsPolicy`, `MicrosoftEgressBrokerLambdaEndpoint`, and the ten Outlook conversation-worker function/schedule/log/DLQ/alarm resources. It changes four existing resources: `ApiExecutionRole`, `ApiFunction`, `PasswordResetWorkerSchedule`, and `SecretsManagerEndpoint`; it removes none and adds six parameters, including the three provider controls. The existing general UPDATE reviewer rejects every resource addition, and the W15 reviewer rejects `ExternalReadSecretsPolicy`, so neither can silently promote this mixed-scope delta. A production write must therefore use a separately reviewed, exact-purpose change set whose parameters explicitly keep providers disabled; absence of the parameters is not accepted as equivalent evidence.
- External-release readiness passed 46/46, including the explicit rule that a deterministic validation clock is accepted only with a test-only trust root. The local Client Operations runbook and four synthetic drill receipts passed all 10 fail-closed contract tests; the overall operations gate correctly remains `BLOCKED_EXTERNAL` because the independent Graph/AWS receipt does not exist.
- The latest bounded rerun also passed provider E2E 51/51, the affected private photo/profile/inventory/migration subset 22/22, internal distribution/updater 54/54, production infrastructure 13/13, web typecheck/build, add-in dual-profile build, and the value-based renderer privacy gate. The preceding package audit reported zero vulnerabilities; a fresh audit refresh on 2026-09-04 was not treated as a pass because the npm audit endpoint timed out after the bounded 15-second fetch window.
- AI slop review: the new provider and update components produced no finding and manual rendered QA passed. The final changed-file scan reports 89 strong keyword matches only in the pre-existing, non-user-facing `json-postgres-program-admin-lambda` test vocabulary in a file touched solely for migration-catalog expectations; changing those unrelated test identifiers is explicitly out of scope. The remaining 64 weak style or keyword findings are in the existing large CSS, preload, Clients surface, and this plan. There are no `no-verify` findings, and none of these findings is emitted by the two new panels or their integration component.
- GitHub read-only preflight on 2026-09-04 found zero configured Actions environments, repository variables, or repository secrets. Actions are enabled with `allowed_actions=all`, repository-level SHA pin enforcement is off, and the default workflow token is read-only; this workflow therefore pins every used action itself. `main` requires a current HRX check, conversation resolution, and admin enforcement, and forbids force-push/deletion, but requires zero approving reviews. Absence of environments is not a protection mechanism because a referenced environment can be created by a workflow without the intended rules. The AWS roles are now conditionally absent while the stack is disabled, and both protected environments must be created and verified before authorized enablement. Existing PR #330 and the unsigned 0.1.32 Draft Release were not changed.

## 7. Definition of “API key only” completion

The phrase may be used only when all of the following are true for the named provider and version:

- The provider pack is already approved and deployed.
- The UI asks the administrator only for provider selection, legal-entity selection, and API key.
- No endpoint, mapping, header, cursor, or code edit is required during onboarding.
- Secret storage, connection creation, validation, first sync, normalized readback, checkpoint, audit, and receipts complete automatically.
- Retry is idempotent and failure cleans or visibly quarantines credential state.
- Rotation, revoke, reconnect, and re-sync are operational.
- The required negative security cases pass.
- A real provider canary receipt exists.

Until the final two bullets are satisfied for a real provider, the accurate claim is: “the generic key-only onboarding E2E is implemented and proven with an approved synthetic pack; real provider activation remains pending.”
