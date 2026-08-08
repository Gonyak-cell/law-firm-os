# AMIC OS Outlook release gates

This runbook keeps source/CI, API, static hosting, Microsoft 365 central deployment, propagation, real Outlook behavior, and go-live as separate proof classes. None authorizes the next.

## Invariants

- Matter/full ProductId: `8f3cc90d-56dd-4c1c-b9c2-0a1100500101`.
- Inquiry-only ProductId: `952431be-51b8-42a2-9bf6-769a15934e85`.
- Candidate version: `1.1.0.0`; independent rollback version: `1.0.1.1`.
- Manifest permission, events, host matrix, assignment counts/fingerprints, and delegated Graph scope have a diff of `none` unless a new review explicitly changes the release contract.
- Raw tenant assignments, mail/MIME, documents, environment values, OAuth/DocuSign values, and webhook signatures stay outside Git and command output.
- All commands below are read-only or dry-run unless a separately authorized operator performs the documented external operation.

## 1. Exact-SHA source and deterministic Add-in candidate

Run after every OUTM-01 through OUTM-34 source and test path has landed on one clean commit:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node --test scripts/test/outlook-release-gates.test.mjs
node scripts/validate-outlook-release-candidate.mjs \
  --source-sha <exact-40-character-HEAD> > <protected-release-receipt.json>
```

The candidate validator:

1. requires a clean worktree and exact `HEAD`;
2. binds `package-lock.json` and the Git tree;
3. requires the named correction, task, time, Graph, precedent, DOCX, and DocuSign source/test paths;
4. checks every non-link lockfile dependency against the license allowlist and requires `docx` and `docusign-esign` under their reviewed MIT licenses;
5. validates the two fixed ProductIds, `ReadItem`, assignments, host/event separation, and independent immutable rollback manifest/task-pane/bundle/inventory references;
6. builds twice and compares every output path, byte count, and SHA-256;
7. rejects source maps, private-key formats, local source paths, secret-like values, and raw MIME in the static output;
8. runs the official `office-addin-manifest@2.1.6` validator against all four local/production manifests; and
9. records both task-pane entry bundle hashes, the event runtime hash, and the complete static inventory.

A passing candidate receipt proves only those local/CI facts. It does not prove API deployment, static upload, central deployment, propagation, a real Outlook host, Graph delivery, a DocuSign sandbox flow, or go-live.

## 2. API artifact and environment preservation

The API ZIP must contain exactly one safe, non-traversing `deployment-manifest.json` entry with `schema_version: "amic-os.api-deployment-manifest.v1"`, the exact source SHA, source tree, package-lock SHA-256, and `artifact_kind: "matter-lawos-api-prod"`. Before an authorized deployment, store a protected `aws lambda get-function-configuration` response outside Git and prepare a sanitized receipt with:

- `schema_version: "amic-os.outlook-api-release.v1"`;
- `mode: "dry-run"`;
- `authorization_ref: null` before a separately approved change;
- `status: "artifact_verified_awaiting_authorized_deployment"`;
- exact artifact SHA-256 and Lambda base64 code SHA-256;
- target account `770880870480`, region `ap-northeast-2`, function `matter-lawos-api-prod`, and its exact Lambda ARN in the protected before/after configurations;
- the environment key count, sorted-key SHA-256, and complete value-map SHA-256, but no keys' values; and
- `mutation_count: 0`, `preservation_status: "planned"`, and no deployed code digest.

Validate it without deploying:

```bash
node scripts/verify-outlook-api-release-artifact.mjs \
  --source-sha <exact-40-character-HEAD> \
  --artifact <protected-api.zip> \
  --receipt <protected-api-dry-run-receipt.json> \
  --before-config <protected-before-function-configuration.json>
```

After a separately authorized code-only deployment, use `mode: "post-deploy-readback"`, record the non-secret authorization reference, and add `--after-config`. The verifier then requires the AWS `CodeSha256` to equal the local ZIP digest and the complete before/after environment fingerprints to be identical. A changed or unreadable environment fails closed; the tool never prints environment values.

## 3. AWS static dry-run

Generate one additive, exact-inventory plan for both production namespaces from the passing candidate receipt:

```bash
node scripts/plan-outlook-static-deploy.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --bucket-ref OUTLOOK_ADDIN_STATIC_BUCKET > <protected-static-plan.json>
```

`--bucket-ref` is a symbolic configuration reference, not a bucket name or credential. The planner invokes no AWS command. It emits zero mutations, never uses delete, and permits objects only below the two exact targets:

- Matter/full: `addin/`, invalidation `/addin/*`;
- inquiry-only: `outlook-addin/`, invalidation `/outlook-addin/*`.

The candidate build inventory is partitioned exactly once: `outlook-addin/**` belongs only to inquiry, and the remaining build output belongs only to Matter. Each profile records its complete inventory hash, task-pane HTML hash, bundle hash, production manifest hash/reference, SourceLocations, and a true prefix-coverage result. A missing/false coverage result, cross-profile fallback, path traversal, root object, delete, XML operation, or write below protected `addin/manifests/**` fails closed. Production manifests remain Microsoft 365 central-deployment inputs (`m365_central_deployment_only`); this AWS dry-run neither overwrites nor publishes them.

## 4. Microsoft 365 receipt, readback, propagation, and real Outlook QA

Validate a sanitized packet with:

```bash
node scripts/validate-outlook-m365-release-receipt.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --protected-root <trusted-protected-evidence-directory> \
  --receipt <protected-m365-receipt.json>
```

The protected root is a local release-controller trust boundary outside the packet. The validator resolves it before reading evidence, rejects a symlinked or group/world-writable root, rejects symlinks and traversal below it, opens only regular non-writable files, reads their actual bytes, and compares each receipt SHA-256 to those bytes before parsing JSON. A missing file, arbitrary digest, placeholder reference/value, wrong proof class, stale source SHA/tree/lock, extra field, or malformed schema fails closed. The tool does not call AWS, Microsoft 365, Graph, DocuSign, or any other provider.

Before authorization the only valid status is `awaiting_authorized_deployment`. It requires null authorization, null `static_release`, zero mutations, no operations/readbacks/observations/host evidence, all completion claims false, and all prerequisites `pending` with null identity/artifact/evidence fields. Its exact `execution_control` contains null authorization, central deployment, pilot assignment, operator, owner, change-window, monitoring, rollback-rehearsal, rollback-readback-owner, and go-live evidence; monitoring and abort criteria are empty. Unknown top-level or nested fields are rejected, including standalone deployment/provider/go-live booleans. That packet is structurally valid, not deployed.

An executed receipt uses the same command. It does not accept an untrusted plan object or a separate `--static-plan` bypass. Every verified prerequisite is a protected-root file with an exact proof-class schema:

- `api_release`: deployed artifact readback plus equal before/after environment fingerprints, exact Lambda target, one authorized code mutation, and environment preservation;
- `static_release`: an authorized two-prefix deployment/readback proof which itself references the protected exact dry-run plan bytes;
- `additive_migrations`: applied migration IDs/inventory, transaction readback, no destructive migration, and rollback compatibility;
- `graph_endpoint_and_secret_reference`: exact Microsoft Graph origin, reviewed delegated scopes, opaque secret reference, and provider readback;
- `docusign_endpoint_and_secret_reference`: reviewed DocuSign REST origin, opaque secret reference, integration-key fingerprint, and provider readback;
- `approved_template_runtime`: protected template inventory and runtime-readback hashes; and
- `precedent_index_runtime`: protected index inventory and runtime-readback hashes.

The executed `execution_control` must also be complete and evidence-bound:

- a protected authorization proof with the exact `authorization_ref`, `operator_ref`, `owner_ref`, UTC change-window start/end, and all six executed actions: API/Lambda code deployment, additive migrations, Graph endpoint/secret configuration, DocuSign endpoint/secret configuration, dual-namespace static publication, and Microsoft 365 central manifest update;
- a protected pilot-assignment proof with opaque group references, both ProductIds, per-product assignment counts/fingerprints, and an aggregate assignment fingerprint;
- non-empty monitoring criteria and abort criteria copied exactly from a protected monitoring-plan proof owned by `owner_ref`;
- a protected rollback rehearsal for both ProductIds and the exact `rollback_readback_owner_ref`; and
- a protected central-deployment proof whose recorded operations and static/M365 readbacks match the packet byte-for-byte and whose observation falls within the authorized change window.

For example:

```bash
node scripts/validate-outlook-m365-release-receipt.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --protected-root <trusted-protected-evidence-directory> \
  --receipt <protected-m365-receipt.json>
```

It is invalid while any prerequisite remains pending. Each mutating prerequisite copies the protected authorization ref/hash, operator, owner, and exact start/end window and must record its observation inside that window. A central/static-only authorization cannot validate an API, migration, Graph, or DocuSign configuration mutation. `static_release` binds the protected plan SHA-256 and both profile inventory/manifest/task-pane/bundle hashes, exact target prefixes, and true SourceLocation coverage; its prerequisite binds the same plan and complete candidate inventory. After separately authorized API/migration/static work and a pilot central update, the receipt contains exact task-pane HTML, entry-bundle, per-prefix inventory, and HTTP readbacks for both SourceLocations, two independent central-update operation references, and two central readbacks. Each central readback matches the exact ProductId, candidate manifest SHA-256, version, fixed deployment mode, SourceLocations, enabled state, assignment count, and sanitized assignment fingerprint. Deleting/re-registering either app or reusing one app's rollback for the other is invalid.

Propagation is a separate claim. Every row has its own protected proof file and byte SHA-256. It becomes true only when both ProductIds have exact protected readback observations at T+0, T+24, T+48, and T+72. The 72-hour window is an observation schedule, not an SLA or automatic pass.

Real Outlook is another separate claim. For each ProductId, each recorded host must be an actually exercised `real_outlook_host`, not a browser-only execution or screenshot-only assertion. Complete host proof requires:

- OWA;
- new Outlook for Windows;
- classic Outlook for Windows where supported; and
- Outlook for macOS.

Matter/full evidence covers read, compose, and `OnMessageSend`; inquiry-only covers its exported read matrix. Both cover auth/reconnect, item switching, and offline recovery. Every host row binds the actual protected proof bytes and their SHA-256 to the exact source identity, ProductId, manifest and task-pane bundle hashes, scenarios, result, concrete host version, UTC, accessibility check, and no-host-DOM-manipulation result. Screenshot-only, browser-only, nonexistent, placeholder, or hash-only rows fail. Unavailable Windows/tenant authority stays `blocked_external`; it is not converted to a pass.

`deployment_verified` requires both propagation and real Outlook evidence. `go_live_approved` additionally requires a protected approval proof bound to the central-deployment, monitoring, rollback-rehearsal, complete propagation set, and complete host-evidence set hashes. Graph/DocuSign endpoints, secret references, provider runtime proof, API/static deployment, central operations, assignment readback, propagation, and go-live remain separate receipts.

## Rollback

The two `1.0.1.1` rollback records in `contracts/outlook-addin-rollback.json` are independent and identity/hash-bound. Each record binds the historical source SHA, ProductId, version, SourceLocations, protected manifest, task-pane HTML, entry bundle, complete protected static-inventory proof, and (Matter only) event runtime. The validator reads every referenced regular-file byte from the trusted root, verifies each SHA-256 and byte count, requires all profile static paths, and rejects missing, shared, swapped, stale, or hash-mismatched artifacts. A rollback rehearsal must read back the exact manifest, task pane, entry, complete inventory, event runtime, permission/events, assignments, and SourceLocations and bind their canonical readback hash. Rolling back one app does not authorize or imply rollback of the other.
