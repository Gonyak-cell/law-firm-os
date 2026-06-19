# G4-D DMS Workspace Document Foundation Report

TUWs: `LFOS-G4-W06-T001` through `LFOS-G4-W06-T006`

Branch: `codex/lawos-g4-dms-workspace-document-foundation`

Base: `codex/lawos-g4-matter-closeout-ui`

This slice does not claim G4 runtime readiness. G4-D adds synthetic-only
descriptor evidence for DMS workspace matter requirements, folder path permission checks, document upload audit requirements, immutable document versioning, file-object storage abstraction, and document hash lineage without opening runtime writes, database rows, audit appends, file upload/download, object storage read/write, document byte exposure, extracted text exposure, or DMS runtime services.

## Scope

G4-D depends on G4-A through G4-C Matter evidence and the RP06 DMS Core
descriptor contract. It begins the DMS half of G4 by proving the workspace,
folder, document, version, file-object, and hash-lineage controls that must be
accepted before DMS runtime readiness can be claimed.

| File | Purpose |
| --- | --- |
| `packages/dms/src/client-matter-g4.js` | Adds G4-D descriptor factories for workspace, folder path, document upload, document version, file object storage, document lineage/hash, and closeout evidence. |
| `packages/dms/test/client-matter-g4-dms-foundation.test.js` | Covers matter-required workspace evidence, path traversal blocking, upload audit, immutable versions, raw storage pointer blocking, hash mismatch detection, and G4-D closeout evidence. |
| `scripts/validate-client-matter-os-g4-d.mjs` | Validates the G4-D document, source, tests, exports, package script, contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G4-W06-T001` | `createDmsG4WorkspaceDescriptor()` requires matter-scoped DMS workspace evidence. | Proposed |
| `LFOS-G4-W06-T002` | `createDmsG4FolderPathDescriptor()` requires folder path permission evidence and blocks path traversal. | Proposed |
| `LFOS-G4-W06-T003` | `createDmsG4DocumentUploadDescriptor()` requires upload audit evidence while avoiding object storage writes. | Proposed |
| `LFOS-G4-W06-T004` | `createDmsG4DocumentVersionDescriptor()` blocks mutation of historical document versions. | Proposed |
| `LFOS-G4-W06-T005` | `createDmsG4FileObjectStorageDescriptor()` exposes only sanitized file object refs and blocks raw storage paths. | Proposed |
| `LFOS-G4-W06-T006` | `createDmsG4DocumentLineageHashDescriptor()` records version-to-file-object lineage and detects hash mismatch. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `executes_file_upload: false`
- `executes_file_download: false`
- `executes_object_storage_write: false`
- `executes_object_storage_read: false`
- `exposes_document_bytes: false`
- `exposes_extracted_text: false`
- `exposes_raw_storage_path: false`
- `g4_runtime_readiness_claim: "open"`
- `dms_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g4d:validate`
- `npm --workspace @law-firm-os/dms run test`
- `npm run client-matter:g4c:validate`
- `npm run client-matter:g4:plan:validate`
- `npm run rp06:dms-core:validate`
- `npm test`

## Non-Goals

- No DMS workspace, folder, document, version, or file object is persisted.
- No file upload or download is executed.
- No object storage is read or written.
- No document bytes or extracted text are exposed.
- No runtime permission engine is evaluated.
- No draft PR is self-merged.
