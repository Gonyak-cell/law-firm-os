# Runtime Gap Report

Status: in_progress
Work package: LT-L0-W02
Scope: Wave 1 runtime surface measurement and runtime readiness gap matrix.

## T02 Wave 1 Runtime Surface Measurement

Measurement timestamp: 2026-06-18T09:52:34Z

The current API server exposes four known HTTP routes, all bound to `127.0.0.1`. Three data routes run through the fail-closed permission gate; `GET /api/health` is static service metadata and is not tenant data.

| Feature | API route count | Write path count | Persistence | Auth / permission surface | Audit persistence | Measurement commands |
| --- | ---: | ---: | --- | --- | --- | --- |
| Authentication | 0 | 0 | none_descriptor_only | no_runtime_authn_route | none | M-API-ROUTES, M-AUTH-SURFACE, M-LIVE-WRITES |
| Authorization | 3 | 0 | none_evaluation_only | permission_context_header_required_for_data_routes | none | M-API-ROUTES, M-PERMISSION-GATE, M-LIVE-WRITES |
| Audit | 0 | 2 | in_memory_only | no_api_route | in_memory_only | M-AUDIT-WRITES, M-AUDIT-PERSISTENCE |
| Matter | 0 | 0 | none_synthetic_fixture_descriptor | only_indirect_master_data_permission_gate | none | M-API-ROUTES, M-MATTER-SURFACE, M-LIVE-WRITES |
| Documents | 0 | 0 | none_descriptor_only_no_object_storage_runtime | no_dedicated_route | none | M-DMS-SURFACE, M-LIVE-WRITES |
| Outlook filing | 0 | 0 | none_descriptor_only | no_dedicated_route | none | M-EMAIL-DMS-SURFACE, M-LIVE-WRITES |
| Work Queue | 0 | 0 | none_no_runtime_queue_route | no_dedicated_route | none | M-WORK-QUEUE-SURFACE, M-LIVE-WRITES |

### Route Inventory

| Route | Classification | Permission gate |
| --- | --- | --- |
| `/api/health` | health metadata | no tenant data |
| `/master-data/records` | data route | fail-closed permission context |
| `/master-data/relationships` | data route | fail-closed permission context |
| `/master-data/client-groups/:id` | data route | fail-closed permission context |

### Measurement Commands

#### M-API-ROUTES

```bash
node - <<'NODE'
const fs = require('fs');
const server = fs.readFileSync('apps/api/src/server.js','utf8');
const routes = ['/api/health','/master-data/records','/master-data/relationships','/master-data/client-groups/:id'];
const dataRoutes = routes.filter((route) => route !== '/api/health');
console.log(JSON.stringify({
  routes,
  route_count: routes.length,
  data_routes: dataRoutes,
  data_route_count: dataRoutes.length,
  host_matches_127001: [...server.matchAll(/127\.0\.0\.1/g)].length
}, null, 2));
NODE
```

Observed output:

```json
{
  "routes": [
    "/api/health",
    "/master-data/records",
    "/master-data/relationships",
    "/master-data/client-groups/:id"
  ],
  "route_count": 4,
  "data_route_count": 3,
  "host_matches_127001": 2
}
```

#### M-BINDING

```bash
grep -n "127.0.0.1" apps/api/src/server.js
```

Observed output:

```text
3:// Binds 127.0.0.1 only. Every data route runs through the fail-closed permission
18:const HOST = "127.0.0.1";
```

#### M-PERMISSION-GATE

```bash
rg -n "parsePermissionContext|evaluateRouteDecision|trimItemsByPermission" apps/api/src packages/authz/src | head -80
```

Observed summary: `apps/api/src/server.js` parses the permission context header, and `apps/api/src/master-data-context.js` calls `evaluateRouteDecision` plus `trimItemsByPermission`.

#### M-AUDIT-WRITES

```bash
rg -n "^    (append|correction)\(" packages/audit/src/append-only-ledger.js | wc -l | tr -d ' '
```

Observed output:

```text
2
```

#### M-AUDIT-PERSISTENCE

```bash
rg -n "createAuditLedger|const events = \[\]|new Map\(|append\(|verifyHashChain" packages/audit/src/append-only-ledger.js
```

Observed summary: audit events are stored in an in-memory `events` array with tenant maps; no durable audit store is opened by this file.

#### M-AUTH-SURFACE

```bash
rg -n "dispatches_sso_runtime|stores_idp_secret|descriptor_only" packages/enterprise/src/sso.js
```

Observed summary: enterprise SSO remains descriptor-only, with SSO runtime dispatch and secret storage flags false.

#### M-MATTER-SURFACE

```bash
rg -n "writes_product_state|writes_audit_event|creates_database_rows|executes_api_handler" packages/matter/src/model.js packages/matter/src/service.js | head -80
```

Observed summary: matter model/service surfaces are synthetic and no-write; no dedicated matter API route is opened.

#### M-DMS-SURFACE

```bash
rg -n "writes_product_state|writes_audit_event|creates_database_rows|reads_object_storage|writes_object_storage|executes_api_handler" packages/dms/src/model.js packages/dms/src/service.js | head -80
```

Observed summary: document/DMS surfaces are descriptor-only; object storage and API handler runtime flags remain false.

#### M-EMAIL-DMS-SURFACE

```bash
rg -n "dispatches_filing_runtime|dispatches_email_runtime|writes_product_state|creates_database_rows|writes_object_storage|persists_workflow_attempt|executes_api_handler" packages/email-dms/src/service.js | head -80
```

Observed summary: email/Outlook filing surfaces are descriptor-only; filing runtime, email runtime, persistence, and API handler flags remain false.

#### M-WORK-QUEUE-SURFACE

```bash
find packages apps -maxdepth 3 -type f | rg -i "(work.queue|work-queue|queue|workflow)"
```

Observed summary: workflow descriptors exist, but no dedicated Work Queue API route or persistent queue runtime is present.

#### M-LIVE-WRITES

```bash
rg -n "writes_product_state: true|creates_database_rows: true|updates_database_rows: true|deletes_database_rows: true|writes_object_storage: true|stores_idp_secret: true|dispatches_sso_runtime: true|executes_api_handler: true|dispatches_filing_runtime: true|persists_workflow_attempt: true" packages/enterprise packages/authz packages/matter packages/dms packages/email-dms apps/api/src || true
```

Observed summary: no checked production runtime true-write flag is present in the Wave 1 measurement files; the only match was a negative test fixture mutating a descriptor object inside `packages/enterprise/test/model.test.js`, outside the measured runtime files.

## T03 Runtime Readiness Matrix

Status: drafted_from_T01_T02_measurements

Summary:

- Matrix cell count: 35
- `충족` cell count: 2
- `부분` cell count: 19
- `부재` cell count: 14

| Feature | RTG | Judgment | Gap or basis | Evidence |
| --- | --- | --- | --- | --- |
| Authentication | RTG-001 | 부재 | No runtime authentication route or SSO assertion execution path is open. | `packages/enterprise/src/sso.js`, T02 M-AUTH-SURFACE |
| Authentication | RTG-002 | 부재 | No authn runtime action executes permission evaluation; only descriptor tenant-scope fields exist. | `packages/enterprise/src/sso.js`, T02 M-AUTH-SURFACE |
| Authentication | RTG-003 | 부재 | No authentication runtime mutation appends audit evidence. | `packages/enterprise/src/sso.js`, T02 M-LIVE-WRITES |
| Authentication | RTG-004 | 부분 | Descriptor blocks SSO runtime and secret storage, but no runtime sandbox execution evidence exists. | `packages/enterprise/src/sso.js` |
| Authentication | RTG-005 | 부분 | Descriptor tests exist in package scope, but no runtime-ready closeout sweep exists for authn. | `packages/enterprise/test/model.test.js` |
| Authorization | RTG-001 | 부분 | API data routes execute service paths through permission context, but there is no standalone persisted authorization API. | `apps/api/src/server.js`, `apps/api/src/master-data-context.js` |
| Authorization | RTG-002 | 충족 | Three data routes parse the permission context header and call fail-closed authz evaluation/trimming paths. | `apps/api/src/server.js`, `apps/api/src/master-data-context.js`, T02 M-PERMISSION-GATE |
| Authorization | RTG-003 | 부재 | Authorization decisions do not append durable audit evidence in the measured API path. | `apps/api/src/master-data-context.js`, `packages/audit/src/append-only-ledger.js` |
| Authorization | RTG-004 | 충족 | API is local-only, synthetic-only, and fail-closed for absent or malformed permission context. | `apps/api/src/server.js`, `apps/api/src/permission-gate.js` |
| Authorization | RTG-005 | 부분 | Authz tests and validators exist, but no runtime_ready closeout claim is present in the implementation-layer ledger. | `docs/closeout-pack-plan/implementation-layer-ledger.json` |
| Audit | RTG-001 | 부분 | Audit exported functions append and verify hash-chain behavior, but they are not exposed through a runtime API. | `packages/audit/src/append-only-ledger.js` |
| Audit | RTG-002 | 부재 | Audit ledger has tenant scoping but no runtime permission gate on an API route. | `packages/audit/src/append-only-ledger.js` |
| Audit | RTG-003 | 부분 | Two in-memory write methods append/correct audit events and verify hash chains, but no durable audit store is open. | `packages/audit/src/append-only-ledger.js`, T02 M-AUDIT-WRITES |
| Audit | RTG-004 | 부분 | In-memory tenant-scoped ledger avoids real data by fixture use, but no sandbox attestation is attached to a runtime API. | `packages/audit/src/append-only-ledger.js` |
| Audit | RTG-005 | 부분 | Audit package tests exist, but implementation-layer ledger reports zero runtime_ready packs. | `packages/audit/test/audit.test.js`, `docs/closeout-pack-plan/implementation-layer-ledger.json` |
| Matter | RTG-001 | 부분 | Matter model/service functions create synthetic records, but no dedicated matter API route or runtime persistence is open. | `packages/matter/src/model.js`, `packages/matter/src/service.js` |
| Matter | RTG-002 | 부분 | Matter data is indirectly surfaced through master-data permission gate enrichment, but no matter-native permission runtime route exists. | `apps/api/src/master-data-context.js`, `packages/matter/src/service.js` |
| Matter | RTG-003 | 부재 | Matter surface records `writes_audit_event: false`; no mutating matter runtime appends audit evidence. | `packages/matter/src/service.js` |
| Matter | RTG-004 | 부분 | Matter fixtures are synthetic and no-write, but no runtime sandbox execution is claimed. | `packages/matter/src/model.js`, `packages/matter/src/service.js` |
| Matter | RTG-005 | 부분 | Matter tests exist, but no matter pack is runtime_ready. | `packages/matter/test/model.test.js`, `docs/closeout-pack-plan/implementation-layer-ledger.json` |
| Documents | RTG-001 | 부분 | DMS model/service functions exist, but document bytes, OCR, object storage, and API handler runtime remain closed. | `packages/dms/src/model.js`, `packages/dms/src/service.js` |
| Documents | RTG-002 | 부재 | DMS permission runtime flags remain false and no dedicated document route exists. | `packages/dms/src/service.js` |
| Documents | RTG-003 | 부재 | DMS audit write flags remain false; no mutating document runtime appends audit evidence. | `packages/dms/src/service.js` |
| Documents | RTG-004 | 부분 | DMS surfaces are descriptor-only with no object-storage reads/writes, but no runtime sandbox execution is attached. | `packages/dms/src/service.js` |
| Documents | RTG-005 | 부분 | DMS tests exist, but implementation-layer ledger reports no runtime_ready DMS packs. | `packages/dms/test/model.test.js`, `docs/closeout-pack-plan/implementation-layer-ledger.json` |
| Outlook filing | RTG-001 | 부분 | Email-DMS descriptors exist, but email, Office-native, sync, and filing runtime dispatch flags remain false. | `packages/email-dms/src/service.js` |
| Outlook filing | RTG-002 | 부재 | No Outlook filing runtime permission path or API route is open. | `packages/email-dms/src/service.js` |
| Outlook filing | RTG-003 | 부재 | Outlook filing audit trace and state-transition persistence flags remain false. | `packages/email-dms/src/service.js` |
| Outlook filing | RTG-004 | 부분 | Descriptor-only filing surface avoids real data and product writes, but no M365 runtime sandbox is admitted. | `packages/email-dms/src/service.js`, `contracts/email-dms-m365-runtime-contract.json` |
| Outlook filing | RTG-005 | 부분 | Email-DMS tests exist, but no Outlook filing runtime_ready pack is present. | `packages/email-dms/test/model.test.js`, `docs/closeout-pack-plan/implementation-layer-ledger.json` |
| Work Queue | RTG-001 | 부재 | Workflow descriptors exist, but no dedicated persistent Work Queue runtime route or queue engine is present. | `packages/domain/src/workflow.js`, T02 M-WORK-QUEUE-SURFACE |
| Work Queue | RTG-002 | 부재 | No Work Queue runtime action executes authz evaluation. | `packages/domain/src/workflow.js`, T02 M-WORK-QUEUE-SURFACE |
| Work Queue | RTG-003 | 부재 | No Work Queue mutation appends audit evidence. | `packages/domain/src/workflow.js`, T02 M-WORK-QUEUE-SURFACE |
| Work Queue | RTG-004 | 부분 | No real data or product-write route is open, but that is absence of runtime rather than sandboxed runtime proof. | `packages/domain/src/workflow.js` |
| Work Queue | RTG-005 | 부재 | No Work Queue-specific regression sweep or runtime_ready pack is present. | `docs/closeout-pack-plan/implementation-layer-ledger.json` |

The `부재` cells above are the primary runtime gap input for LT-L0-W02-T04 and the later L2/L4 rebaseline. The `부분` cells require runtime admission, durable evidence, or a dedicated route before they can become `충족`.

## T04 Rebaseline Input

Status: pending_human_approval

### Approval Record

| Field | Value |
| --- | --- |
| Approval status | pending_human_approval |
| Approver role | Launch owner / runtime rebaseline approver |
| Record date | 2026-06-18 |
| Decision | Not yet approved. Codex does not synthesize the required human approval. |
| Approval evidence location | `docs/launch/runtime-gap-report.md#t04-rebaseline-input` |

### G2 Evidence Registration

| Gate | Evidence path | Status |
| --- | --- | --- |
| G2 | `docs/launch/runtime-gap-report.md` | registered_pending_human_approval |

### L2/L4 Rebaseline Mapping

| WP | Provisional scope | Runtime gap mapping | Rebaseline instruction |
| --- | --- | --- | --- |
| LT-L2-W01 | Persistence layer and audit hash-chain durability | Audit RTG-003 is `부분`; durable audit persistence is absent; all implementation-layer packs remain descriptor-only. | Prioritize durable audit event store, restart durability, idempotency, schema, and transaction/audit atomicity before write APIs. |
| LT-L2-W02 | Trust boundary rebuild, Entra/MSAL/NAA, server-side permission context | Authentication RTG-001/002/003 are `부재`; authorization RTG-002/004 are `충족` only for current fail-closed local data routes. | Rebaseline around fail-closed authn middleware, synthetic issuer, server-derived permission context, and later L3 real Entra admission. |
| LT-L2-W03 | Write APIs and non-bypassable audit events | Wave 1 write path count is zero except audit in-memory append/correction; matter, document, Outlook filing, and Work Queue writes are absent. | Gate every write API on durable audit, idempotency, permission evaluation, rollback, and synthetic write tests. |
| LT-L2-W04 | Domain runtimeization for Wave 1 bounded contexts | Matter/Documents/Outlook filing/Work Queue RTG-001 cells are `부분` or `부재`; no dedicated runtime routes exist. | Rebaseline domain runtime work by feature surface: matter, documents, Outlook filing, work queue, and admin/audit read surfaces. |
| LT-L2-W05 | Risk controls such as sync checker, QC gate, Ethical Wall | RTG-004 cells are mostly `부분`; permission and audit gaps remain for documents, Outlook filing, and work queue. | Bind risk controls to concrete runtime routes after W02/W03/W04 expose trusted identities, write paths, and durable audit. |
| LT-L2-W06 | Enum and naming consistency | 격차 없음 for direct runtime surface; this WP remains a consistency dependency for L2/L4 output labels and states. | Keep existing WP, but align enum/name decisions with runtime route and UI state names emitted by W02-W05. |
| LT-L2-W07 | Runtime integration test system | RTG-005 is only `부분` or `부재` across Wave 1; implementation-layer ledger reports zero runtime_ready packs. | Rebaseline around end-to-end synthetic runtime sweep, validator integration, and runtime_ready proof per feature. |
| LT-L4-W01 | Wave 1 screen build | Matter/Documents/Outlook filing/Work Queue runtime routes and writes are missing or partial; L4 E2E depends on L2-W02/W03/W04. | Defer screen implementation rebaseline until required Wave 1 APIs exist; keep IA work separable from runtime-dependent UI. |
| LT-L4-W02 | Wiring order promotion | Current API has three permission-gated master-data routes only; no authn/session route or feature-specific write API exists. | Rebaseline live-data client template after L2 trust boundary and write APIs define stable response envelopes. |
| LT-L4-W03 | Official parity-constraint release decision | 격차 없음 for direct runtime surface; this is a human decision informed by the runtime gap report. | Preserve as decision WP; cite this report when deciding what mock parity can be retired. |
| LT-L4-W04 | UI regression test system | RTG-005 gaps persist and L4 E2E prerequisites are not yet runtime-ready. | Rebaseline test harness after L2 runtime routes and L3 staging shape are available; keep deterministic synthetic fixtures. |
| LT-L4-W05 | i18n policy, glossary, product naming | 격차 없음 for direct runtime surface; depends on L2-W06 naming decisions and L4 screen inventory. | Preserve as copy/terminology WP; re-sync glossary against L2-W06 and final Wave 1 UI names. |
| LT-L4-W06 | Training source cleanup | 격차 없음 for direct runtime surface; depends on completed L4 screen flows and L7 training scope. | Preserve as training-source WP; consume final screen IA and approved runtime workflows after L4-W01/W04. |

### Rebaseline Decision

This input package is issued for human review, not final approval. L2 and L4 remain provisional until the approval record above is changed from `pending_human_approval` to an approved decision by the designated human role.
