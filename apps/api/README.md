# API App

Modular backend API for Law Firm OS. Zero new dependencies: `node:http` only, plus
read-only imports from `packages/*` (allowed workspace dependencies).

## Status

The first bounded context is live: **Master Data (read surface)**, the
recommended first wiring target from `docs/ui-reference/contract-screen-map.md`
(P5 `user-profiles-list`). The remaining bounded contexts are still planned:

- Core Platform
- Master Data ✅ (read surface, synthetic fixture data)
- Matter Core (currently only as synthetic enrichment on Master Data items)
- Legal Workspace / DMS
- Billing & Finance
- CRM / Intake
- Settlement
- AI Governance

## Endpoints

| Method | Path | Source descriptor |
| --- | --- | --- |
| GET | `/api/health` | service descriptor (no tenant data, ungated) |
| GET | `/master-data/records` | `records_search` in master-data-contract v0.21 |
| GET | `/master-data/relationships` | `relationship_lookup` |
| GET | `/master-data/client-groups/:client_group_id` | `client_group_resolution` |

Request fields (query params, per the contract): `tenant_id`, `actor_user_id`,
`permission_ref`, `audit_hint_ref`, `request_id`, `model_type`, `cursor`,
`limit`, `filters` (JSON-encoded object; unsupported keys return
`MASTER_DATA_API_UNSUPPORTED_FILTER`). `tenant_id`, `permission_ref`, and
`audit_hint_ref` are required on every data route.

Response shape (per the contract's `response_fields`): `request_id`, `outcome`
(`passed` / `review_required` / `approval_required` / `blocked`), `items`,
`page_info`, `safe_error_codes`, `omitted_fields`, `audit_hint_ref`, plus a
`ui_state` field bound to the contract's UI-state catalog (`empty`, `denied`,
`review_required`; `loading` and the interaction states are client-owned).
The full error-code taxonomy is served verbatim from
`MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy`.

## Permission gate (fail-closed)

Every data route is gated through `evaluatePermission` from `packages/authz`,
which implements the permission-kernel-contract v0.28 decision order
(`cross_tenant_deny -> deny_rule -> object_acl_deny -> review_required ->
approval_required -> object_acl_allow -> abac/rbac allow ->
fail_closed_no_match`). The evaluation context is supplied by the caller in the
`x-lawos-permission-context` header as JSON:

```json
{
  "principal": { "user_id": "user_rp04_owner", "tenant_id": "tenant_rp04_synthetic", "role_ids": ["master_data_reader"] },
  "rules": [{ "id": "rule_allow_read", "effect": "allow", "action": "*" }],
  "object_acl": []
}
```

Missing, malformed, or non-matching context all resolve to **deny** (HTTP 403,
items omitted, `MASTER_DATA_API_UNAUTHORIZED_OMISSION` only — no internal claim
names). `review_required` / `approval_required` decisions return badge-state
responses without dispatching any route. Per-item security trimming omits
unauthorized rows and reports a safe count only
(`page_info.omitted_item_count`). Hidden source fields
(`MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS`) are stripped at serialization.

## What is synthetic vs real

**Everything served is synthetic.** The master-data contract and
`packages/master-data` are descriptor-only: there is no persistence layer, no
runtime service, and no real client data anywhere upstream. Concretely:

- Items come from `createMasterDataSyntheticFixture()` in
  `packages/master-data` (8 frozen records, tenant `tenant_rp04_synthetic`).
- Matter-core enrichment comes from `createMatterCoreSyntheticFixture()` in
  `packages/matter` (tenant `tenant_rp05_synthetic`). Because the two packs use
  different synthetic tenants, the enrichment is attached as an explicitly
  flagged `synthetic_crosswalk` block on each item, not a real tenant join.
- The permission gate evaluates **real decision logic** (`packages/authz`
  evaluator) over **caller-supplied synthetic context**; no permission rules
  are persisted server-side.
- Endpoint paths, request/response fields, error taxonomy, and UI-state
  semantics are real contract artifacts served faithfully from the package
  registries (`MASTER_DATA_API_REFERENCE_SURFACE`,
  `MASTER_DATA_UI_SURFACE_STATES`).

## How to run

```sh
# tests (deterministic, in-process server on an ephemeral 127.0.0.1 port)
npm --workspace apps/api run test
# equivalent direct form (note: this Node build expands --test args as globs,
# so pass the file glob, not the bare directory):
node --test "apps/api/test/*.test.js"

# start the server (127.0.0.1, port from LAWOS_API_PORT, default 4180)
npm --workspace apps/api run start
curl http://127.0.0.1:4180/api/health
```

Root `npm test` / `npm run build` are unaffected: the root test glob does not
include `apps/api`, and the build only targets `apps/web`.

## CP coordination note

This app is part of the non-CP UI/API workstream
(`docs/ui-workstream-conventions.md`). Before wiring `apps/web` to this API, or
proposing any change under `packages/**` or `contracts/**` (both CP-owned,
read-only here), obtain CP-owner sign-off. Root `package.json` script aliases
for this app are registered separately to avoid shared-file collisions; do not
add them from this workstream. Imports from `packages/*` use relative paths
(not workspace name resolution) so that no `npm install` — and therefore no
shared `package-lock.json` churn — is required.
