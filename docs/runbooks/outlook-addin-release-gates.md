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
5. validates the two fixed ProductIds, `ReadItem`, assignments, host/event separation, and independent immutable rollback references;
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

Generate an additive `/addin` object plan from the passing candidate receipt:

```bash
node scripts/plan-outlook-static-deploy.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --bucket-ref OUTLOOK_ADDIN_STATIC_BUCKET > <protected-static-plan.json>
```

`--bucket-ref` is a symbolic configuration reference, not a bucket name or credential. The planner invokes no AWS command. It emits zero mutations, never uses delete, limits target keys and invalidation to `addin/` and `/addin/*`, rejects XML/manifest objects, and preserves `addin/manifests/**`.

The plan also compares production SourceLocations to its allowed prefix. The current inquiry-only SourceLocation is under `/outlook-addin`, so a `/addin`-only plan reports `source_location_coverage.inquiry-only: false`. That is intentional: this dry-run cannot be used to claim that the inquiry bundle was hosted. A separately reviewed plan and authorization for its exact existing prefix is required before central update of that profile.

## 4. Microsoft 365 receipt, readback, propagation, and real Outlook QA

Validate a sanitized packet with:

```bash
node scripts/validate-outlook-m365-release-receipt.mjs \
  --source-sha <exact-40-character-HEAD> \
  --release-receipt <protected-release-receipt.json> \
  --receipt <protected-m365-receipt.json>
```

Before authorization the only valid status is `awaiting_authorized_deployment`. It requires null authorization, zero mutations, no operations/readbacks/observations/host evidence, and all completion claims false. API, static hosting, additive migrations, Graph endpoint/secret reference, DocuSign endpoint/secret reference, approved-template runtime, and precedent-index runtime are each recorded as `pending` or as a hash-bound protected `verified` receipt. That packet is structurally valid, not deployed.

An executed central-update receipt is invalid while any prerequisite remains pending. After separately authorized API/migration/static work and a pilot central update, the receipt must contain exact task-pane HTML and entry-bundle hash/HTTP readbacks for both SourceLocations, two independent central-update operation references, and two central readbacks. Each central readback must match the exact ProductId, candidate manifest SHA-256, version, fixed deployment mode, SourceLocations, enabled state, assignment count, and sanitized assignment fingerprint. Deleting/re-registering either app or reusing one app's rollback for the other is invalid.

Propagation is a separate claim. It becomes true only when both ProductIds have exact readback observations at T+0, T+24, T+48, and T+72. The 72-hour window is an observation schedule, not an SLA or automatic pass.

Real Outlook is another separate claim. For each ProductId, each recorded host must be an actually exercised `real_outlook_host`, not a browser harness or screenshot-only assertion. Complete host proof requires:

- OWA;
- new Outlook for Windows;
- classic Outlook for Windows where supported; and
- Outlook for macOS.

Matter/full evidence covers read, compose, and `OnMessageSend`; inquiry-only covers its exported read matrix. Both cover auth/reconnect, item switching, and offline recovery. Every host row binds the exact manifest and task-pane bundle hashes, scenarios, result, host version, UTC, accessibility check, no-host-DOM-manipulation result, and protected evidence reference. Unavailable Windows/tenant authority stays `blocked_external`; it is not converted to a pass.

`deployment_verified` requires both propagation and real Outlook evidence. `go_live_approved` additionally requires its own approval reference. Graph/DocuSign endpoints, secret references, provider sandbox proof, API/static deployment, central operations, assignment readback, propagation, and go-live remain separate receipts.

## Rollback

The two `1.0.1.1` rollback records in `contracts/outlook-addin-rollback.json` are independent and identity/hash-bound. A rollback operation must use the matching ProductId's protected manifest and immutable URL, then repeat version, enabled-state, permission/event, assignment, and SourceLocation readback. Rolling back one app does not authorize or imply rollback of the other.
