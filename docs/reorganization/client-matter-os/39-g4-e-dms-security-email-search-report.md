# G4-E DMS Security Email Search Report

TUWs: `LFOS-G4-W06-T007` through `LFOS-G4-W06-T013`

Branch: `codex/lawos-g4-dms-security-email-search`

Base: `codex/lawos-g4-dms-workspace-document-foundation`

This slice does not claim G4 runtime readiness. G4-E adds synthetic-only
descriptor evidence for DMS check-in/check-out locks, privilege labels, redaction metadata, secure link sharing, email filing, Outlook filing placeholders, and search index ACL controls without opening runtime writes, audit appends, file upload/download, object storage read/write, email runtime, Outlook API calls, secure link creation, search indexing, search querying, document byte exposure, extracted text exposure, or DMS runtime services.

## Scope

G4-E depends on G4-D DMS workspace/document foundation evidence and the RP06/RP08
descriptor contracts. It proves the DMS security, email filing, Outlook
placeholder, and search ACL controls that must be accepted before DMS runtime
readiness can be claimed.

| File | Purpose |
| --- | --- |
| `packages/dms/src/client-matter-g4.js` | Adds G4-E descriptor factories for checkout locks, privilege labels, redaction metadata, secure links, email filing, Outlook placeholders, search ACL, and closeout evidence. |
| `packages/dms/test/client-matter-g4-dms-security-email-search.test.js` | Covers concurrent edit blocking, AI/search exclusion, redacted export, secure-link expiry/MFA/watermark, Matter email filing, no Outlook credential leak, unauthorized search result absence, and G4-E closeout evidence. |
| `scripts/validate-client-matter-os-g4-e.mjs` | Validates the G4-E document, source, tests, package script, RP06/RP08 contract boundaries, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G4-W06-T007` | `createDmsG4CheckoutLockDescriptor()` blocks concurrent edits when another actor holds the active lock. | Proposed |
| `LFOS-G4-W06-T008` | `createDmsG4PrivilegeLabelDescriptor()` requires AI/search exclusion for privileged labels. | Proposed |
| `LFOS-G4-W06-T009` | `createDmsG4RedactionMetadataDescriptor()` requires redacted export metadata and keeps original bytes hidden. | Proposed |
| `LFOS-G4-W06-T010` | `createDmsG4SecureLinkDescriptor()` requires expiry, MFA, and watermark evidence. | Proposed |
| `LFOS-G4-W06-T011` | `createDmsG4EmailFilingDescriptor()` requires Matter trace and filing audit refs. | Proposed |
| `LFOS-G4-W06-T012` | `createDmsG4OutlookPlaceholderDescriptor()` blocks credential-bearing Outlook placeholder requests. | Proposed |
| `LFOS-G4-W06-T013` | `createDmsG4SearchAclDescriptor()` omits unauthorized search results and hides denied counts. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_file_upload: false`
- `executes_file_download: false`
- `executes_object_storage_write: false`
- `executes_object_storage_read: false`
- `executes_search_indexing: false`
- `executes_email_runtime: false`
- `creates_secure_link: false`
- `exposes_document_bytes: false`
- `exposes_extracted_text: false`
- `exposes_email_credentials: false`
- `g4_runtime_readiness_claim: "open"`
- `dms_runtime_readiness_claim: "open"`

## Required Evidence

- `npm run client-matter:g4e:validate`
- `npm --workspace @law-firm-os/dms run test`
- `npm run client-matter:g4d:validate`
- `npm run client-matter:g4:plan:validate`
- `npm run rp06:dms-core:validate`
- `npm run rp08:email-dms-core:validate`
- `npm test`

## Non-Goals

- No checkout lock is acquired or persisted.
- No privilege label, redaction, secure link, email filing, Outlook placeholder, or search result is persisted.
- No email or Outlook runtime is called.
- No search index is queried or updated.
- No document bytes, extracted text, storage path, or email credential is exposed.
- No draft PR is self-merged.
