# CMP-G10 Client Collaboration Runtime Report

## Scope

CMP-G10-W10 implements the client portal and data-room collaboration runtime slice for the new CMP v1.0 TUW baseline. It promotes the LFOS G6-W11 descriptor set into executable API evidence while keeping external access projection-only.

Runtime readiness remains `runtime_api_evidence_only__durable_persistence_open`.

## TUW Trace

- CMP-G10-W10-T001: ExternalUser identity separation.
- CMP-G10-W10-T002: PortalMatterProjection shared-only view.
- CMP-G10-W10-T003: ExternalACL shared-only access.
- CMP-G10-W10-T004: RFIRequest due-date/status workflow.
- CMP-G10-W10-T005: RFIResponseUpload security placeholder.
- CMP-G10-W10-T006: Portal RFI foundation closeout.
- CMP-G10-W10-T007: ClientApproval audit evidence.
- CMP-G10-W10-T008: SecureLink expiry, watermark, and MFA.
- CMP-G10-W10-T009: DataRoom room-level ACL.
- CMP-G10-W10-T010: PortalAudit external view/upload audit.
- CMP-G10-W10-T011: Portal data-room closeout.
- CMP-G10-W10-T012: Client dashboard projection.
- CMP-G10-W10-T013: Shared document viewer projection.
- CMP-G10-W10-T014: External message thread projection.
- CMP-G10-W10-T015: Upload security negative route.
- CMP-G10-W10-T016: External ACL negative route.
- CMP-G10-W10-T017: Runtime evidence aggregate route.

## Runtime Routes

| Route | Evidence |
| --- | --- |
| `/api/client-collaboration/runtime/evidence` | Aggregates all G10 descriptors and projection-only boundary flags. |
| `/api/client-collaboration/external-users` | Keeps external users separate from internal User/Employee identities. |
| `/api/client-collaboration/matter-projections` | Exposes only shared Matter projection sections and shared documents. |
| `/api/client-collaboration/external-acls` | Requires shared-only external ACL grants. |
| `/api/client-collaboration/rfi-requests` | Requires RFI due date and status evidence. |
| `/api/client-collaboration/rfi-response-uploads` | Requires security placeholder and permission check before upload preview. |
| `/api/client-collaboration/portal-rfi-closeout` | Closes external user/projection/ACL/RFI/upload evidence. |
| `/api/client-collaboration/client-approvals` | Requires external approval audit evidence. |
| `/api/client-collaboration/secure-links` | Requires expiry, watermark, and MFA evidence. |
| `/api/client-collaboration/data-rooms` | Requires room-level data-room ACL. |
| `/api/client-collaboration/portal-audit` | Requires external view and upload audit events. |
| `/api/client-collaboration/portal-data-room-closeout` | Closes approval/link/data-room/audit/no-internal-data exposure evidence. |
| `/api/client-collaboration/ui/client-dashboard` | Projects client dashboard without internal or privileged data. |
| `/api/client-collaboration/shared-documents` | Lists shared document projections without raw path or internal metadata. |
| `/api/client-collaboration/message-threads` | Projects external message thread state without internal notes or persistence. |
| `/api/client-collaboration/upload-security-test` | Negative route for object-storage write and missing security placeholders. |
| `/api/client-collaboration/external-acl-test` | Negative route for external ACL bypass attempts. |

## Guardrails

- Client portal/data-room routes are projection-only.
- External identities cannot link to internal User or Employee identities.
- Internal memo, conflict memo, privileged material, hidden Matter details, raw paths, and internal metadata are blocked.
- External ACLs must be shared-only and room-level for data rooms.
- RFI uploads do not write object storage; security and permission placeholders are required.
- Secure links require expiry, watermark, and MFA.
- Portal audit proves external view/upload events without internal payload exposure.

## Validation

- `npm run client-matter:cmp-g10:validate`
- `npm --workspace apps/api run test -- cmp-g10-client-collaboration-api.test.js`
- Full cumulative validation remains required before merge.
