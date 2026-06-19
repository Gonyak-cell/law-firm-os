# Document Workspace IA

Status: draft_blocked_pending_mat_dec_03_storage_decision
Work package: LT-L4-W01
TUW: LT-L4-W01-T09
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This IA document defines the Document Workspace display contract for later UI
work. It does not implement `apps/web`, does not open a document route, does
not create file upload/download behavior, and does not claim LT-L4-W01 or
LT-L4-W01-T09 completion.

The file reference and original-link rules below are provisional because
`MAT-DEC-03` remains `blocked_pending_storage_decision` in
`docs/launch/mat-dec-03-storage-decision-brief.md`. Codex cannot choose
SharePoint/OneDrive original storage, object storage, or a hybrid storage model
on behalf of the launch owner.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` section 1 | Source row: Document Workspace shows SharePoint/OneDrive documents, versions, status, QC, and related issue. |
| `workbook/matter-post-cp-launch-plan.md` section 4-3 and section 5 L4-1 | MAT-DEC-03 critical-path dependency and Wave 1 screen scope. |
| `docs/launch/mat-dec-03-storage-decision-brief.md` | Current decision state: `blocked_pending_storage_decision`; no owner decision has selected a storage model. |
| `contracts/dms-core-contract.json` `model_definitions` | Descriptor sources for `DmsDocument`, `DmsDocumentVersion`, `DmsFileObject`, `DmsDocumentRelation`, extracted text, OCR, rendition, and email-thread metadata. |
| `docs/launch/runtime-gap-report.md` | Runtime evidence that document, Outlook filing, permission, and audit routes remain partial or absent. |
| `contracts/permission-kernel-contract.json` | Permission state vocabulary and fail-closed handling. |

## Document List Columns

| ID | Column | Data source contract/API field | Display rule | Empty state copy | Permission state handling | Backend WP dependency |
| --- | --- | --- | --- | --- | --- | --- |
| DW-COL-01 | Status | `DmsDocument.status`; future `GET /matters/{id}/documents[].status` | Show the document lifecycle label: draft, active, superseded, archived, held, or deleted pending retention. | No document status is available. | allow: show status; denied: suppress row; review_required: show review-required row state without status details. | LT-L2-W04 document read model; LT-L2-W02 permission context |
| DW-COL-02 | Version | `DmsDocument.current_version_id`; `DmsDocumentVersion.version_number`; future `GET /documents/{id}/versions` | Show current version number and open a version-history panel only after permission is allowed. | No version history is available. | allow: show current version and history count; denied: suppress version count; review_required: show review-required state and no history rows. | LT-L2-W04 DMS version read model; LT-L2-W03 audit-backed metadata writes |
| DW-COL-03 | Source | `DmsFileObject.storage_pointer_ref`; provisional `file_ref`; future provider/source label | Show a provider label such as M365, object store, or hybrid only after MAT-DEC-03 decides the storage model. Until then, display `file_ref` as an opaque original-reference placeholder. | No original source reference is available. | allow: show provider label and opaque reference; denied: suppress source and raw reference; review_required: show review-required source state. | LT-PRE-W03 MAT-DEC-03; LT-L3-W07 Graph scopes; LT-L3-W08 SharePoint provisioning |
| DW-COL-04 | QC Result | Future QC gate result linked to `DmsDocumentVersion` and risk controls; no raw extracted text in Wave 1 IA | Show pass, needs review, blocked, or not reviewed. Never expose extracted text or OCR details in the list row. | No QC result is available. | allow: show safe QC status; denied: suppress QC status; review_required: show review-required state and no extracted-content preview. | LT-L2-W05 QC gate; LT-L5 security acceptance |
| DW-COL-05 | Related Issue | `DmsDocumentRelation`; future issue links from Issue Ledger | Show related issue count and safe issue identifiers; open issue detail only through the Issue Ledger permission gate. | No related issues are linked. | allow: show safe issue references; denied: suppress count and identifiers; review_required: show review-required state without issue text. | LT-L4-W01-T15 Issue Ledger IA; LT-L2-W04 issue runtime; LT-L2-W02 permission context |

## File Reference and Original-Link Rules

These rules cite the current MAT-DEC-03 record:
`docs/launch/mat-dec-03-storage-decision-brief.md`, status
`blocked_pending_storage_decision`.

| Rule | Required behavior while MAT-DEC-03 is pending |
| --- | --- |
| Opaque reference only | Display `file_ref` as an opaque original-reference value, never as a raw object key, drive item token, signed URL, local path, or permission-bearing identifier. |
| No direct URL | Do not render a direct original link until the backend has an approved signed-link or Graph-link rule derived from the MAT-DEC-03 owner decision. |
| Provider label is provisional | Show provider/source as "pending storage decision" unless the approved decision record selects SharePoint/OneDrive, object storage, or hybrid pointer-plus-copy. |
| Link control disabled | Original-link controls are disabled or replaced with a pending-decision state until L3 Graph/scoped-link provisioning or object-store signed URL policy exists. |
| Audit required later | When original links are later enabled, every open/download action must create non-bypassable audit evidence and must not expose document bytes to unauthorized users. |

## Storage Option Matrix

| Option | UI effect | Permission impact | Decision state |
| --- | --- | --- | --- |
| SharePoint/OneDrive original storage | Source column can show M365 site/drive labels and Graph-backed version hints after admin consent and provisioning. | Must reconcile M365 sharing state with matter ACL and fail closed on mismatch. | owner_decision_required |
| Object storage original storage | Source column can show Law Firm OS object-store labels and signed-link readiness after policy is approved. | Law Firm OS owns object-level authorization, signed-link expiry, retention, and legal hold. | owner_decision_required |
| Hybrid pointer plus controlled copy | Source column may show both M365 origin and controlled-copy status. | Must define which source is authoritative for retention, QC, audit, and rollback. | owner_decision_required |

## Version and QC Panels

| Panel | Required behavior |
| --- | --- |
| Version history | Shows version_number, status, created/updated timestamp, safe author label, and source reference state. It must not expose document bytes. |
| QC result | Shows status only in list view. Detailed QC findings require permission allow and the later QC gate runtime. |
| Related issue drawer | Shows safe issue references and state. It opens Issue Ledger detail only through the Issue Ledger permission gate. |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No approved storage model | MAT-DEC-03 is still `blocked_pending_storage_decision`. |
| No direct original-link rule | No owner decision has chosen Graph links, signed object URLs, or a hybrid rule. |
| No document runtime route | Runtime gap evidence still treats document runtime as partial or absent for launch purposes. |
| No permission-backed file action | Server-side permission enforcement for document open/download is not proven for this screen. |
| No audit-backed file action | Non-bypassable audit for open/download/version action is not implemented by this IA. |

## Permission States

| State | Screen rule |
| --- | --- |
| allow | Render authorized rows, safe metadata, version counts, QC status, and related issue references. Original links remain disabled until the storage decision and link policy are approved. |
| denied | Hide inaccessible document rows and do not leak row counts, source references, version counts, QC status, issue counts, or raw file identifiers. |
| review_required | Render a distinct review-required row state and suppress document metadata that could reveal restricted content. |
