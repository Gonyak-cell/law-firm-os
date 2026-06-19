# G6-G Portal Data Room Closeout Report

TUWs: `LFOS-G6-W11-T006` through `LFOS-G6-W11-T010`

Branch: `codex/lawos-g6-portal-data-room-closeout`

Status: Proposed

## Summary

This slice does not claim G6 runtime readiness. G6-G adds synthetic-only
descriptor evidence for client approval audit, secure-link viewer controls,
DataRoom room-level ACLs, portal external view/upload audit coverage, and the
G6 Portal/Data Room closeout.

No approval, secure link, data room, portal audit event, database row, object
storage access, UI runtime, or product state is persisted by this slice.

## Scope

G6-G depends on the G6 Analytics AI Portal entry plan and G6-F Portal RFI
foundation evidence. It closes the proposed G6 portal/data-room descriptor
coverage while preserving Client Portal and Data Room descriptor-only
boundaries.

Client Portal and Data Room descriptor-only boundaries remain closed.

## Changed Files

| File | Purpose |
| --- | --- |
| `packages/client-portal/src/client-matter-g6.js` | Adds G6-G descriptor factories for client approval, secure link viewer, portal audit, and portal/data-room closeout evidence. |
| `packages/client-portal/test/client-matter-g6-portal-data-room-closeout.test.js` | Covers approval audit, expiry/watermark/MFA, portal view/upload audit, and closeout evidence. |
| `packages/data-room/src/client-matter-g6.js` | Adds G6-G DataRoom room-level ACL descriptor evidence. |
| `packages/data-room/src/index.js` | Exports the G6-G Data Room descriptor helper. |
| `packages/data-room/test/client-matter-g6-data-room-closeout.test.js` | Covers room-level ACL and unauthorized-access blocking evidence. |
| `scripts/validate-client-matter-os-g6-g.mjs` | Validates the G6-G document, source, tests, package script, G6-F dependency, RP19/RP20 contract boundaries, and descriptor behavior. |
| `docs/reorganization/client-matter-os/README.md` | Registers the G6-G report and validation command. |
| `package.json` | Exposes `client-matter:g6g:validate`. |

## TUW Evidence Map

| TUW | Evidence added | Runtime status |
| --- | --- | --- |
| `LFOS-G6-W11-T006` | `createClientPortalG6ClientApprovalDescriptor()` requires approval audit receipt evidence. | Proposed |
| `LFOS-G6-W11-T007` | `createClientPortalG6SecureLinkViewerDescriptor()` requires expiry, watermark, and MFA evidence. | Proposed |
| `LFOS-G6-W11-T008` | `createDataRoomG6DataRoomAclDescriptor()` requires room-level ACL and unauthorized-access blocking evidence. | Proposed |
| `LFOS-G6-W11-T009` | `createClientPortalG6PortalAuditDescriptor()` requires external view/upload audit evidence without internal payload exposure. | Proposed |
| `LFOS-G6-W11-T010` | `createClientPortalG6GPortalDataRoomCloseoutDescriptor()` summarizes G6-G evidence and keeps no internal data exposure explicit. | Proposed |

## Required Negative Evidence

- Client approval evidence is blocked when approval audit receipt evidence is
  missing.
- Secure-link evidence is blocked when expiry, watermark, or MFA evidence is
  missing.
- DataRoom evidence is blocked when room-level ACL evidence is missing or
  unauthorized access is requested.
- Portal audit evidence is blocked when external view/upload events are missing
  or internal payloads are exposed.
- G6-G closeout evidence is blocked when G6-F handoff is missing, any descriptor
  is blocked, or any runtime dispatch/write path is opened.

## Validation Commands

```sh
npm run client-matter:g6g:validate
npm --workspace @law-firm-os/client-portal run test
npm --workspace @law-firm-os/data-room run test
npm run client-matter:g6f:validate
npm run client-matter:g6:plan:validate
npm run rp19:client-portal-core:validate
npm run rp20:data-room-vdr-core:validate
npm run validate
npm test
```

## Boundary

- No approval, secure link, DataRoom, portal audit, audit event, or closeout
  record is persisted.
- No Client Portal, secure link, watermark, client review, Data Room, VDR,
  permission, audit, UI, object storage, or product runtime service is executed.
- Portal/Data Room surfaces expose no internal data.
- G6 runtime readiness remains open until stacked PRs are reviewed and G1
  through G5 evidence is accepted or explicitly stubbed behind fail-closed
  tests.
