# CMP-G5 Vault/DMS Runtime Report

Status: Implemented runtime evidence slice
Date: 2026-06-20

## Scope

CMP-G5-W05 is now represented as an executable Vault/DMS API slice in
`apps/api/src/vault-dms-runtime-context.js`. The slice uses the existing
`packages/dms` model and descriptor contracts while adding API-level runtime
evidence for workspace/folder creation, upload metadata, immutable versions,
metadata-only storage descriptors, lineage hashes, checkout locks, privilege
labels, redactions, secure links, email filing, Outlook placeholders,
permission-before-search, UI state, and audit coverage.

This is not a durable R4 claim. The runtime boundary remains
`runtime_api_evidence_only__durable_persistence_open`: the API exercises
metadata flows, permissions, and audit evidence in memory, but it does not claim
database durability, object-storage writes, document-byte retrieval, or
production search indexing.

## Dependency Order

| Dependency | Reason |
| --- | --- |
| `CMP-G1-W01` | Search, read, share, and audit operations require permission and audit evidence. |
| `CMP-G2-W02` | DMS records remain tenant/matter scoped and must not recreate party identity. |
| `CMP-G3-W03` | People/HRX records stay outside DMS document payloads and permission results. |
| `CMP-G4-W04` | Vault workspaces and documents require an already-open Matter reference. |

## Runtime Routes

| Route | Purpose |
| --- | --- |
| `/api/vault/runtime/evidence` | Emits CMP-G5 coverage, closeout descriptors, and no-premature-R4 boundary. |
| `/api/vault/workspaces` | Creates matter-scoped DMS workspace metadata with audit evidence. |
| `/api/vault/folders` | Creates permission-checked folder path metadata. |
| `/api/vault/documents/upload` | Creates document/version/file-object metadata while blocking raw storage path exposure. |
| `/api/vault/documents/:id/versions` | Adds immutable document versions and preserves lineage. |
| `/api/vault/file-objects/:id/storage` | Returns metadata-only storage descriptors; no document bytes are loaded. |
| `/api/vault/documents/:id/lineage` | Verifies version/file-object sha lineage. |
| `/api/vault/documents/:id/checkout-locks` | Blocks concurrent checkout lock drift. |
| `/api/vault/documents/:id/privilege-label` | Requires privileged labels to exclude AI/search use. |
| `/api/vault/documents/:id/redactions` | Requires redacted export metadata and blocks original-byte exposure. |
| `/api/vault/documents/:id/secure-links` | Requires expiry, MFA, watermarking, and share audit evidence. |
| `/api/vault/email/filings` | Files email metadata into the matter DMS boundary without running email runtime. |
| `/api/vault/outlook/placeholders` | Creates Outlook placeholders while blocking credential leakage. |
| `/api/vault/search` | Enforces permission-before-search and hides unauthorized result counts. |
| `/api/vault/documents/:id/ui-state` | Displays current version and privilege metadata without raw storage path or bytes. |
| `/api/vault/documents/:id/audit-coverage` | Requires view/download/share audit coverage. |
| `/api/vault/audit` | Returns tenant-scoped audit chain verification. |

## Guardrails

| Guardrail | Runtime evidence |
| --- | --- |
| Vault write/search/share audit evidence | Workspace, folder, upload, search, secure-link share, UI view, metadata-only download, and audit-coverage routes append tenant-scoped audit events. |
| permission-before-search | `/api/vault/search` blocks unless `permission_decision_id` and `permission_effect: "allow"` are present before query execution. |
| No raw storage path | Upload and storage descriptors reject unsafe pointers and only expose sanitized `dms-file-object:*` references. |
| No document bytes | Storage, redaction, UI, secure-link, and audit descriptors keep document bytes out of responses. |
| No extracted text leak | Runtime evidence and UI state keep extracted text absent. |
| No unauthorized count leak | Search descriptors expose `unauthorized_result_count_exposed: null`. |
| No Outlook credential leak | Outlook placeholder route rejects credential, access token, refresh token, and client secret fields. |
| No durable R4 claim | Report, runtime evidence, and validator use `runtime_api_evidence_only__durable_persistence_open`. |

## TUW Coverage

| CMP TUW | Runtime trace |
| --- | --- |
| `CMP-G5-W05-T001` | Matter-scoped DMS workspace metadata route. |
| `CMP-G5-W05-T002` | Folder path and path permission metadata route. |
| `CMP-G5-W05-T003` | Document upload metadata route. |
| `CMP-G5-W05-T004` | Immutable document version route. |
| `CMP-G5-W05-T005` | File-object storage descriptor route. |
| `CMP-G5-W05-T006` | Lineage/hash route. |
| `CMP-G5-W05-T007` | Checkout lock route. |
| `CMP-G5-W05-T008` | Privilege label and AI/search exclusion route. |
| `CMP-G5-W05-T009` | Redaction metadata route. |
| `CMP-G5-W05-T010` | Secure link policy route. |
| `CMP-G5-W05-T011` | Email filing metadata route. |
| `CMP-G5-W05-T012` | Outlook placeholder route. |
| `CMP-G5-W05-T013` | Search ACL route. |
| `CMP-G5-W05-T014` | Workspace/document UI state route. |
| `CMP-G5-W05-T015` | Audit coverage route. |
| `CMP-G5-W05-T016` | Workspace/folder audit evidence. |
| `CMP-G5-W05-T017` | Upload/version audit evidence. |
| `CMP-G5-W05-T018` | Lineage evidence. |
| `CMP-G5-W05-T019` | Checkout lock evidence. |
| `CMP-G5-W05-T020` | Privilege label evidence. |
| `CMP-G5-W05-T021` | Redaction evidence. |
| `CMP-G5-W05-T022` | Secure-link share audit evidence. |
| `CMP-G5-W05-T023` | Email filing evidence. |
| `CMP-G5-W05-T024` | Outlook placeholder credential guard evidence. |
| `CMP-G5-W05-T025` | Search permission decision evidence. |
| `CMP-G5-W05-T026` | UI raw-path/byte guard evidence. |
| `CMP-G5-W05-T027` | View/download/share audit coverage evidence. |
| `CMP-G5-W05-T028` | permission-before-search fail-closed evidence. |
| `CMP-G5-W05-T029` | Unauthorized search result count non-exposure evidence. |
| `CMP-G5-W05-T030` | Tenant-scoped audit chain evidence. |
| `CMP-G5-W05-T031` | Runtime evidence closeout descriptor. |
| `CMP-G5-W05-T032` | CMP-G5 validator and report coverage. |

## Validation

Passed commands:

```bash
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm run client-matter:cmp-g2:validate
npm run client-matter:cmp-g3:validate
npm run client-matter:cmp-g4:validate
npm run client-matter:cmp-g5:validate
npm --workspace apps/api run test
npm test
git diff --check
```

Observed result:

| Command | Result |
| --- | --- |
| `npm run client-matter:cmp-v1:validate` | Passed, `cmp_tuw_rows: 316/316`. |
| `npm run client-matter:cmp-g1:validate` | Passed, `cmp_g1_tuws: 24/24`. |
| `npm run client-matter:cmp-g2:validate` | Passed, `cmp_g2_tuws: 19/19`. |
| `npm run client-matter:cmp-g3:validate` | Passed, `cmp_g3_tuws: 24/24`. |
| `npm run client-matter:cmp-g4:validate` | Passed, `cmp_g4_tuws: 23/23`. |
| `npm run client-matter:cmp-g5:validate` | Passed, `cmp_g5_tuws: 32/32`. |
| `npm --workspace apps/api run test` | Passed, 90 tests. |
| `npm test` | Passed, 3,878 tests. |
| `git diff --check` | Passed. |
