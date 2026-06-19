# G7-D Integrations Migration Foundation Report

TUWs: `LFOS-G7-W14-T001` through `LFOS-G7-W14-T005`

Branch: `codex/lawos-g7-integrations-migration-foundation`

Base: `codex/lawos-g7-hrx-people-guardrails`

This slice does not claim G7 runtime readiness. G7-D adds synthetic-only
descriptor evidence for connector registry, credential reference model, sync job model,
sync cursor model, and reconciliation run. It proves that connector
registry entries do not expose credentials, credential references return only
secret references, sync jobs require retry and idempotency evidence, sync
cursors require resumable sync evidence without exposing raw cursor values, and
reconciliation runs require mismatch report tests plus human review before any
state-changing action.

## Scope

G7-D depends on the G7-C HRX People guardrails handoff and the RP22/RP25
descriptor-only contracts. It covers External Integrations and Migration
foundation evidence while preserving closed external-provider, OAuth, sync,
migration, permission, audit, API, UI, and production runtime boundaries.

| File | Purpose |
| --- | --- |
| `packages/integrations-core/src/client-matter-g7.js` | Adds G7-D descriptor factories for connector registry, credential reference, sync job, sync cursor, reconciliation run, and integration/migration foundation closeout evidence. |
| `packages/integrations-core/src/index.js` | Exports the G7-D descriptor factories through the integrations-core package surface. |
| `packages/integrations-core/test/client-matter-g7-integrations-migration-foundation.test.js` | Covers credential exposure blocking, secret-not-returned evidence, sync retry/idempotency, cursor resumability, mismatch report review, and overclaim blocking. |
| `scripts/validate-client-matter-os-g7-d.mjs` | Validates the G7-D document, source, tests, package script, G7-C handoff dependency, RP22/RP25 contract boundaries, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G7-W14-T001` | `createIntegrationsG7ConnectorRegistryDescriptor()` requires tenant/matter scope and permission-scope review while blocking credential exposure and provider runtime calls. | Proposed |
| `LFOS-G7-W14-T002` | `createIntegrationsG7CredentialReferenceDescriptor()` requires secret-reference-only evidence and rotation review while blocking returned secret/token values. | Proposed |
| `LFOS-G7-W14-T003` | `createIntegrationsG7SyncJobDescriptor()` requires retry policy and idempotency evidence while blocking provider runtime and product-state writes. | Proposed |
| `LFOS-G7-W14-T004` | `createIntegrationsG7SyncCursorDescriptor()` requires resumable sync evidence while blocking raw cursor exposure and runtime cursor advancement. | Proposed |
| `LFOS-G7-W14-T005` | `createIntegrationsG7ReconciliationRunDescriptor()` requires mismatch report and human review evidence while blocking auto-resolve and product-state writes. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `calls_external_provider_api: false`
- `opens_oauth_browser_flow: false`
- `persists_access_token: false`
- `persists_refresh_token: false`
- `stores_secret_material: false`
- `executes_sync_runtime: false`
- `executes_migration_runtime: false`
- `evaluates_runtime_permission: false`
- `writes_permission_decision: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `executes_ui_runtime: false`
- `includes_raw_external_payload: false`
- `includes_credential_value: false`
- `includes_secret_value: false`
- `g7_runtime_readiness_claim: "open"`
- `production_readiness_claim: "open"`
- `enterprise_trust_claimed: false`
- `go_live_approval_claimed: false`

## Required Evidence

- `npm run client-matter:g7d:validate`
- `node --test packages/integrations-core/test/*.test.js`
- `npm run client-matter:g7c:validate`
- `npm run client-matter:g7:plan:validate`
- `npm run rp22:external-integrations-i:validate`
- `npm run rp25:migration-platform:validate`
- `npm run validate`
- `npm test`

## Non-Goals

- No IntegrationConnection, CredentialRef, SyncJob, SyncCursor, ReconciliationRun, migration batch, import, export, dashboard, or closeout runtime record is persisted.
- No external provider API, OAuth browser flow, sync runtime, migration runtime, permission runtime, audit runtime, API handler, UI runtime, or production runtime is executed.
- No access token, refresh token, secret value, raw cursor, raw external payload, credential, or production receipt is loaded.
- No mismatch is auto-resolved and no migration state is changed.
- No enterprise trust, UAT completion, runtime readiness, production readiness, customer launch readiness, or go-live approval is claimed.
- No draft PR is self-merged.
