# AMIC OS Outlook release gates

This runbook keeps source/CI, API, static hosting, Microsoft 365 central deployment, propagation, real Outlook behavior, and go-live as separate proof classes. None authorizes the next.

## Invariants

- Matter/full ProductId: `8f3cc90d-56dd-4c1c-b9c2-0a1100500101`.
- Inquiry-only ProductId: `952431be-51b8-42a2-9bf6-769a15934e85`.
- Both ProductIds remain source-, build-, static-namespace-, and rollback-artifact identities. Only Matter/full is assigned to production users; inquiry-only remains registered with zero assignments.
- The production cohort has ten eligible users from the approved roster and no excluded users. Tenant-wide assignment, nested groups, `AssignToEveryone`, and overlapping ProductId assignments are forbidden.
- Matter/full candidate version: `1.3.0.3`; retained inquiry-only version: `1.1.0.0`; independent emergency rollback version: `1.0.1.1`; forward canary rollback version: `1.3.0.4`.
- Every active local, production, canary, and forward-rollback manifest has zero `LaunchEvent` entries and no event runtime. Delegated Graph scopes remain profile-bound. Assignment state follows the reviewed single-visible distribution contract rather than the historical two-assignment baseline.
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
5. validates the two fixed source ProductIds, exactly one production-visible ProductId, `ReadItem`, host/event separation, and independent immutable rollback manifest/task-pane/bundle/inventory references;
6. builds twice and compares every output path, byte count, and SHA-256;
7. rejects source maps, private-key formats, local source paths, secret-like values, and raw MIME in the static output;
8. runs the official `office-addin-manifest@2.1.6` validator against all four local/production manifests; and
9. records both task-pane entry bundle hashes, an exact `event_runtime: null` assertion, and the complete static inventory.

A passing candidate receipt proves only those local/CI facts. It does not prove API deployment, static upload, central deployment, propagation, a real Outlook host, Graph delivery, a DocuSign sandbox flow, or go-live.

Composite SPDX values are exact raw-expression exceptions only: `(MIT OR GPL-3.0-or-later)` for the reviewed JSZip MIT option and `(MIT AND Zlib)` for pako's declared terms. The sole missing-metadata exception maps `node_modules/passport-strategy` version `1.0.0` to MIT only when its exact registry URL and lock integrity match the contract and the lock descriptor has no `license` property. Its use is recorded; any malformed own license, identity drift, or stale/unknown override fails closed. These are technical inventory controls, not legal conclusions; policy-owner/legal approval remains a separate release gate.

## 2. API artifact and environment preservation

The candidate API ZIP and its outer manifest must satisfy the existing `law-firm-os.json-postgres-production-artifact.v1` contract. The ZIP contains exactly one safe, non-traversing `deployment-manifest.json` entry; the embedded and outer manifests bind the exact source SHA/tree, package-lock SHA-256, Node 22 runtime, RDS CA digest/size/certificate count, PostgreSQL authority boundary, and complete archive inventory. Before an authorized deployment, store a protected `aws lambda get-function-configuration` response outside Git and prepare a sanitized receipt with:

- `schema_version: "amic-os.outlook-api-release.v1"`;
- `mode: "dry-run"`;
- `authorization_ref: null` before a separately approved change;
- `status: "artifact_verified_awaiting_authorized_deployment"`;
- exact artifact SHA-256 and Lambda base64 code SHA-256;
- target account `770880870480`, region `ap-northeast-2`, function `matter-lawos-api-prod`, and its exact Lambda ARN in the protected before/after configurations;
- the environment key count, sorted-key SHA-256, and complete value-map SHA-256, but no keys' values; and
- `mutation_count: 0`, `preservation_status: "planned"`, and no deployed code digest; and
- `producer_build_count: 2` plus the exact reproducibility-result SHA-256 returned by the existing production artifact builder comparison.

Validate it without deploying:

```bash
node scripts/verify-outlook-api-release-artifact.mjs \
  --source-sha <exact-40-character-HEAD> \
  --artifact <protected-api.zip> \
  --artifact-manifest <protected-api-outer-manifest.json> \
  --rds-ca-bundle <protected-rds-global-ca-bundle.pem> \
  --receipt <protected-api-dry-run-receipt.json> \
  --before-config <protected-before-function-configuration.json>
```

The verifier requires Node 22 and an exact clean `HEAD`, then invokes the existing production artifact builder twice with the same trusted SHA/tree and protected RDS CA bytes. It derives both output paths itself, compares the two builds with the candidate ZIP and outer/embedded manifests, and does not accept caller-supplied producer builds, output paths, or a reproducibility result. Dry-run verification performs no AWS/provider command or external mutation; it proves only the local artifact and protected pre-deploy fingerprint.

After a separately authorized code-only deployment, use `mode: "post-deploy-readback"`, record the non-secret authorization reference, and add `--after-config`. The verifier then requires the AWS `CodeSha256` to equal the local ZIP digest and the complete before/after environment fingerprints to be identical. A changed or unreadable environment fails closed; the tool never prints environment values.

## 3. AWS static dry-run

Generate one create-only, exact-inventory plan for both production namespaces from the passing candidate receipt:

```bash
node scripts/plan-outlook-static-deploy.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --bucket-ref OUTLOOK_ADDIN_STATIC_BUCKET > <protected-static-plan.json>
```

`--bucket-ref` is a symbolic configuration reference, not a bucket name or credential. The planner invokes no AWS command. It emits zero mutations, never uses delete, and stages candidate bytes only below content-addressed object paths:

- Matter/full: `addin/_objects/sha256/<object-sha256>/<relative-path>`;
- inquiry-only: `outlook-addin/_objects/sha256/<object-sha256>/<relative-path>`.

The candidate build inventory is partitioned exactly once: `outlook-addin/**` belongs only to inquiry, and the remaining build output belongs only to Matter. Each operation also records its eventual unversioned alias, but `alias_mutation_count=0`, `overwrite_existing=false`, `If-None-Match=*`, and the staging invalidation list is empty. Alias copying and `/addin/*` or `/outlook-addin/*` invalidation belong to a later, separately authorized cutover. Each profile records its complete inventory hash, task-pane HTML hash, bundle hash, production manifest raw and semantic hashes, SourceLocations, and a true prefix-coverage result. A missing/false coverage result, cross-profile fallback, path traversal, root object, delete, XML operation, or write below protected `addin/manifests/**` fails closed. Production manifests remain Microsoft 365 central-deployment inputs (`m365_central_deployment_only`); this dry-run neither overwrites nor publishes them.

Before any static authorization, seal the candidate plan together with the read-only recovery SAVE:

```bash
node scripts/validate-outlook-release-static-files.mjs \
  --source-sha <exact-40-character-HEAD> \
  --prior-snapshot-root <OUTLOOK-INFRA-CONNECTIONS-SAVE-20260824-01-root> \
  --bucket-ref OUTLOOK_ADDIN_STATIC_BUCKET > <protected-static-files-release-receipt.json>
```

This validator builds the exact source twice with the source SHA embedded in both Matter/full and inquiry-only bundles, validates the four active production/canary/forward-rollback manifests against the one exact CloudFront origin, records each raw and semantic manifest hash, and proves that the candidate inventory contains no event runtime. It also reads every prior task-pane, JS/CSS, OAuth, icon, and legacy event-runtime byte named by the protected recovery SAVE; those legacy bytes are recovery evidence, not candidate output or activation authority. The SAVE inventory and each relevant body must match their sealed hashes and must be non-symlink regular files. Candidate immutable targets and currently served prior aliases must coexist with zero target collision. The `1.3.0.4` manifest remains bound to `/addin/index.html`; rollback order is therefore exact prior-alias restoration and hash readback first, followed by the Microsoft 365 update to `1.3.0.4` and a zero-launch-event readback. The receipt performs no S3 upload, alias copy, invalidation, Microsoft 365 update, or data mutation.

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

Before authorization the only valid status is `awaiting_authorized_deployment`. It requires null authorization, null `static_release`, zero mutations, no operations/readbacks/observations/host evidence, all completion claims false, and all prerequisites `pending` with null identity/artifact/evidence fields. Its exact `execution_control` contains null authorization, central deployment, pilot assignment, assignment-safety, operator, owner, change-window, monitoring, rollback-rehearsal, rollback-readback-owner, and go-live evidence; monitoring and abort criteria are empty. Unknown top-level or nested fields are rejected, including standalone deployment/provider/go-live booleans. That packet is structurally valid, not deployed.

An executed receipt uses the same command. It does not accept an untrusted plan object or a separate `--static-plan` bypass. Every verified prerequisite is a protected-root file with an exact proof-class schema:

- `api_release`: deployed artifact readback plus equal before/after environment fingerprints, exact Lambda target, one authorized code mutation, and environment preservation;
- `static_release`: an authorized two-prefix deployment/readback proof which itself references the protected exact dry-run plan bytes;
- `additive_migrations`: applied migration IDs/inventory, transaction readback, no destructive migration, and rollback compatibility;
- `graph_endpoint_and_secret_reference`: exact Microsoft Graph origin, reviewed delegated scopes, opaque secret reference, and provider readback;
- `docusign_endpoint_and_secret_reference`: reviewed DocuSign REST origin, opaque secret reference, integration-key fingerprint, and provider readback;
- `approved_template_runtime`: protected template inventory and runtime-readback hashes; and
- `precedent_index_runtime`: protected index inventory and runtime-readback hashes.

The executed `execution_control` must also be complete and evidence-bound:

- a protected v3 authorization proof with the exact `authorization_ref`, `operator_ref`, `owner_ref`, UTC change-window start/end, authorized roster-file and normalized-email fingerprints, authorized pilot-group fingerprint, authorized `10/0` eligible/excluded principal fingerprints, and all six executed actions: API/Lambda code deployment, additive migrations, Graph endpoint/secret configuration, DocuSign endpoint/secret configuration, dual-namespace static publication, and the Microsoft 365 single-visible transition;
- a protected v4 pilot-assignment proof with the approved roster-file and normalized-email fingerprints, opaque group references, and exact opaque principal-reference sets for the ten eligible Entra object identities with an empty excluded set; every assigned group must include an exact Microsoft Entra `direct_members_only` provider readback, a recomputed direct-member fingerprint, and `nested_group_count: 0`; the union must equal the eligible set and match the assigned groups; the validator recomputes the `10/0` fingerprints/counts and keeps principal references out of the Git-safe receipt and command output; the observation must fall inside the authorized change window and not predate protected approval;
- a protected assignment-safety proof, also observed inside the authorized change window after approval, that binds the pilot evidence SHA-256 to a provider pre-deployment assignment readback, recomputes the exact correction actions for tenant-wide assignment, an assigned inquiry ProductId, or an incorrect Matter cohort, forbids unsafe-state preservation, and sets rollback policy to `reconcile_to_validated_single_visible_distribution`; a safe current state has an empty correction list, while an unsafe current state is valid only with the complete computed correction list and final exact safe readback;
- non-empty monitoring criteria and abort criteria copied exactly from a protected monitoring-plan proof owned by `owner_ref`;
- a protected v2 rollback rehearsal for both ProductIds and the exact `rollback_readback_owner_ref`, observed after and hash-bound to the assignment-safety prerequisite; and
- a protected v3 central-deployment proof whose recorded operations and static/M365 readbacks match the packet byte-for-byte, whose observation falls within the authorized change window, and whose hashes bind both the v4 pilot provider proof and the assignment-safety prerequisite. Its strictly increasing protected transition is fixed to: disable inquiry `AssignToEveryone`; remove all inquiry assignments; read back inquiry as exactly zero-assigned; only then replace/assign Matter; finally read back Matter against the authorized exact-roster principal fingerprint. Receipt operations and readbacks must be inquiry-first and Matter-last.

For example:

```bash
node scripts/validate-outlook-m365-release-receipt.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --protected-root <trusted-protected-evidence-directory> \
  --receipt <protected-m365-receipt.json>
```

It is invalid while any prerequisite remains pending. Each mutating prerequisite copies the protected authorization ref/hash, operator, owner, and exact start/end window and must record its observation inside that window. A central/static-only authorization cannot validate an API, migration, Graph, or DocuSign configuration mutation. `static_release` binds the protected plan SHA-256 and both profile inventory/manifest/task-pane/bundle hashes, exact target prefixes, and true SourceLocation coverage; its prerequisite binds the same plan and complete candidate inventory. After separately authorized API/migration/static work and a pilot central update, the receipt contains exact task-pane HTML, entry-bundle, per-prefix inventory, and HTTP readbacks for both SourceLocations, two independent central operation references, and two central readbacks. Matter/full must read back as assigned and production-visible. Inquiry-only must read back as retained, enabled, unassigned, not production-visible, `AssignToEveryone=false`, assignment count `0`, and the canonical empty-assignment fingerprint. Deleting/re-registering either app, assigning both IDs to the same cohort, omitting a computed correction action, preserving an unsafe assignment during rollback, or reusing one app's rollback for the other is invalid.

The production CLI captures one trusted UTC validation cutoff once at validator start; the receipt cannot supply or extend it. Every control, prerequisite, central-deployment, propagation, host, deployment-verification, monitoring, rollback, and go-live completion timestamp must be on or before that cutoff. Central deployment is the lower chronology anchor: each profile's T+0 and every host completion must be on or after central completion, while T+24, T+48, and T+72 remain relative to that profile's T+0. Deployment verification follows complete propagation and host evidence, and go-live completion is on or after the latest central, propagation, host, monitoring, and rollback completion. Boundary equality is accepted; a timestamp one millisecond outside an upper or lower bound is rejected, as are normalized invalid calendar dates.

Propagation is a separate claim. Every row has its own protected proof file and byte SHA-256. It becomes true only when both ProductIds have exact protected readback observations at T+0, T+24, T+48, and T+72, including the zero-assignment inquiry-only state. The 72-hour window is an observation schedule, not an SLA or automatic pass.

Real Outlook is another separate claim. Only the production-visible Matter/full ProductId may supply real-host evidence; a host row for retained inquiry-only is rejected. Each recorded host must be an actually exercised `real_outlook_host`, not a browser-only execution or screenshot-only assertion. Complete host proof requires:

- OWA;
- new Outlook for Windows;
- classic Outlook for Windows where supported; and
- Outlook for macOS.

Matter/full evidence covers read, compose, the explicit send-review action, auth/reconnect, item switching, offline recovery, and proof that ordinary message selection or Send does not trigger AMIC OS authentication, processing, or an automatic handler. Inquiry-only remains build-tested but is deliberately absent from production-host proof because it is unassigned. Every host row binds the actual protected proof bytes and their SHA-256 to the exact source identity, ProductId, manifest and task-pane bundle hashes, scenarios, result, concrete host version, UTC, accessibility check, and no-host-DOM-manipulation result. Screenshot-only, browser-only, nonexistent, placeholder, or hash-only rows fail. Unavailable Windows/tenant authority stays `blocked_external`; it is not converted to a pass.

`deployment_verified` requires both propagation and real Outlook evidence. `go_live_approved` additionally requires a protected approval proof bound to the central-deployment, monitoring, rollback-rehearsal, complete propagation set, and complete host-evidence set hashes. Graph/DocuSign endpoints, secret references, provider runtime proof, API/static deployment, central operations, assignment readback, propagation, and go-live remain separate receipts.

## Rollback

The two `1.0.1.1` records in `contracts/outlook-addin-rollback.json` are immutable historical recovery evidence. Each record binds the historical source SHA, ProductId, version, SourceLocations, protected manifest, task-pane HTML, entry bundle, complete protected static-inventory proof, and (Matter only) legacy event runtime. The validator may verify those bytes, but `automatic_send_policy.legacy_eventful_rollback_activation_allowed=false` forbids activating that eventful Matter manifest. Active recovery uses the eventless monotonic forward rollback below. Historical assignment counts or fingerprints are never restored, an unsafe current assignment is never preserved, and inquiry-only cannot be reassigned or used to authorize rollback of the other ProductId.

For the `1.3.0.2` → `1.3.0.3` item-scoped write-permission canary ladder, `contracts/outlook-addin-forward-static-rollback.json` adds a monotonic `1.3.0.4` forward rollback. It hash-binds the `OUTLOOK-INFRA-CONNECTIONS-SAVE-20260824-01` inventory and the complete active closure for both static namespaces. It is not permission to mutate anything: restore the exact prior alias bytes and read them back before the central manifest update, stop on the first failed readback, and never delete the content-addressed candidate or protected SAVE during rollback.

Before any candidate mutation, seal the complete local cross-surface dry-run:

```bash
node scripts/validate-outlook-release-forward-rollback-packet.mjs \
  --source-sha <exact-clean-HEAD> \
  --prior-snapshot-root <OUTLOOK-INFRA-CONNECTIONS-SAVE-20260824-01-root> \
  --desktop-package-root <sealed-0.1.29-package-root> \
  > <protected-forward-rollback-receipt.json>
```

The packet fixes the dependency-safe order to prior static alias restoration and byte readback, the same ProductId's monotonic Microsoft 365 update to `1.3.0.4`, the exact CloudFront distribution/config restoration, and the exact Lambda published version `11` code/configuration projection before final readback. Lambda version `11` is identity-bound by its qualified ARN, `CodeSha256`, selected-version snapshot hash, and redacted environment fingerprints. The later checkpoint `$LATEST` package remains a separate SAVE artifact and is never mislabeled as version `11`.

This dry-run re-reads the protected static bodies, Lambda versions/configuration, and CloudFront config, then verifies the sealed macOS `0.1.29` DMG/ZIP hashes and zero `apps/desktop` source diff. The Windows `0.1.29` hashes remain contract-bound under the separately reviewed unsigned internal-canary boundary; installed-host byte/readiness evidence still belongs to Todo 20A. Desktop action count is always zero.

Historical Lambda `RevisionId` and CloudFront `ETag` values are reference-only. An execution window must first take a fresh snapshot, use fresh write guards, preserve migration `008` as forward-only if already applied, and limit rollback to surfaces already mutated by that one attempt. It must stop on the first failure without a speculative second deployment. The packet never deletes candidate immutable objects, database/Vault/mail/audit rows, desktop software, secrets, or tokens, and its successful local verdict is not deployment or real-Outlook evidence.
