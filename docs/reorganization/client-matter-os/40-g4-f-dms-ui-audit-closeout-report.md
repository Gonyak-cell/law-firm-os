# G4-F DMS UI Audit Closeout Report

TUWs: `LFOS-G4-W06-T014` through `LFOS-G4-W06-T016`

Branch: `codex/lawos-g4-dms-ui-audit-closeout`

Base: `codex/lawos-g4-dms-security-email-search`

This slice does not claim G4 runtime readiness. G4-F adds synthetic-only
descriptor evidence for DMS workspace UI version and privilege display, DMS
view/download/share audit coverage, and G4 DMS closeout evidence without opening runtime writes, audit appends, UI routes, file download, object storage read/write, search querying, email runtime, document byte exposure, extracted text exposure, raw storage path exposure, or DMS runtime services.

## Scope

G4-F depends on G4-D DMS workspace/document foundation evidence and G4-E DMS
security/email/search evidence. It proves that DMS UI and audit closeout
controls are represented before any later Matter/DMS runtime readiness claim.

| File | Purpose |
| --- | --- |
| `packages/dms/src/client-matter-g4.js` | Adds G4-F descriptor factories for workspace UI state, audit coverage, and DMS closeout evidence. |
| `packages/dms/test/client-matter-g4-dms-ui-audit-closeout.test.js` | Covers version/privilege display, UI leak blocking, view/download/share audit coverage, sensitive audit payload blocking, and G4-F closeout evidence. |
| `scripts/validate-client-matter-os-g4-f.mjs` | Validates the G4-F document, source, tests, package script, G4-D/G4-E dependencies, RP06 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G4-W06-T014` | `createDmsG4WorkspaceUiDescriptor()` requires current version and privilege display while blocking raw path, document byte, extracted text, and unauthorized count leaks. | Proposed |
| `LFOS-G4-W06-T015` | `createDmsG4AuditCoverageDescriptor()` requires view, download, and share audit event descriptors while blocking sensitive audit payload leaks. | Proposed |
| `LFOS-G4-W06-T016` | `createDmsG4FDmsCloseoutDescriptor()` summarizes DMS UI and audit evidence while keeping runtime readiness open. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `executes_file_download: false`
- `executes_object_storage_write: false`
- `executes_object_storage_read: false`
- `executes_search_indexing: false`
- `executes_email_runtime: false`
- `exposes_document_bytes: false`
- `exposes_extracted_text: false`
- `exposes_raw_storage_path: false`
- `g4_runtime_readiness_claim: "open"`
- `dms_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g4f:validate`
- `npm --workspace @law-firm-os/dms run test`
- `npm run client-matter:g4e:validate`
- `npm run client-matter:g4d:validate`
- `npm run client-matter:g4:plan:validate`
- `npm run rp06:dms-core:validate`
- `npm test`

## Non-Goals

- No UI route is executed or rendered.
- No audit event is appended or persisted.
- No document bytes, extracted text, or storage path is exposed.
- No search, email, Outlook, or DMS runtime service is called.
- No draft PR is self-merged.
