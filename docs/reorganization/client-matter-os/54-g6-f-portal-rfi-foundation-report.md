# G6-F Portal RFI Foundation Report

TUWs: `LFOS-G6-W11-T001` through `LFOS-G6-W11-T005`

Branch: `codex/lawos-g6-portal-rfi-foundation`

Status: Proposed

## Summary

This slice does not claim G6 runtime readiness. G6-F adds synthetic-only
descriptor evidence for ExternalUser identity separation, PortalMatterProjection
safe projection, ExternalACL shared-only access, RFIRequest due date/status, and
RFIResponse upload security placeholders.

No external user, portal projection, external ACL, RFI request, RFI response,
upload object, database row, audit event, object storage write, UI runtime, or
product state is persisted by this slice.

## Scope

G6-F depends on the G6 Analytics AI Portal entry plan and G6-E AI legal
workflows closeout evidence. It covers client portal and RFI foundation controls
while preserving Client Portal descriptor-only boundaries.

## Changed Files

| File | Purpose |
| --- | --- |
| `packages/client-portal/src/client-matter-g6.js` | Adds G6-F descriptor factories for ExternalUser, PortalMatterProjection, ExternalACL, RFIRequest, RFIResponse upload, and closeout evidence. |
| `packages/client-portal/src/index.js` | Exports the G6-F Client-Matter descriptor helpers. |
| `packages/client-portal/test/client-matter-g6-portal-rfi-foundation.test.js` | Covers external identity separation, internal memo exclusion, shared-only ACLs, RFI due/status evidence, upload security placeholders, and closeout evidence. |
| `scripts/validate-client-matter-os-g6-f.mjs` | Validates the G6-F document, source, tests, package script, G6-E dependency, RP19 contract boundary, and descriptor behavior. |
| `docs/reorganization/client-matter-os/README.md` | Registers the G6-F report and validation command. |
| `package.json` | Exposes `client-matter:g6f:validate`. |

## TUW Evidence Map

| TUW | Evidence added | Runtime status |
| --- | --- | --- |
| `LFOS-G6-W11-T001` | `createClientPortalG6ExternalUserDescriptor()` requires ExternalUser separation from internal User and Employee identities. | Proposed |
| `LFOS-G6-W11-T002` | `createClientPortalG6PortalMatterProjectionDescriptor()` excludes internal memo, conflict memo, privileged material, hidden Matter details, and non-shared documents. | Proposed |
| `LFOS-G6-W11-T003` | `createClientPortalG6ExternalACLDescriptor()` requires shared-only external access and blocks ACL bypass evidence. | Proposed |
| `LFOS-G6-W11-T004` | `createClientPortalG6RFIRequestDescriptor()` requires due date and valid status evidence. | Proposed |
| `LFOS-G6-W11-T005` | `createClientPortalG6RFIResponseUploadDescriptor()` requires virus-scan and permission-check placeholders while blocking object-storage writes. | Proposed |

## Required Negative Evidence

- ExternalUser evidence is blocked when an external identity links to internal
  User or Employee records.
- Portal projection evidence is blocked when internal memos, conflict memos,
  privileged material, hidden Matter details, or non-shared documents appear.
- ExternalACL evidence is blocked when grants are not shared-only or ACL bypass
  is requested.
- RFIRequest evidence is blocked when due date or valid status is missing.
- RFIResponse upload evidence is blocked when virus-scan or permission-check
  placeholders are missing or object storage writes are attempted.
- Any Client Portal runtime dispatch, secure-link runtime dispatch, watermark
  runtime dispatch, client-review runtime dispatch, object-storage write, audit
  write, UI runtime, or product-state write blocks G6-F evidence.

## Validation Commands

```sh
npm run client-matter:g6f:validate
npm --workspace @law-firm-os/client-portal run test
npm run client-matter:g6e:validate
npm run client-matter:g6:plan:validate
npm run rp19:client-portal-core:validate
npm run validate
npm test
```

## Boundary

- No ExternalUser, PortalMatterProjection, ExternalACL, RFIRequest,
  RFIResponse, upload, audit event, or closeout record is persisted.
- No Client Portal, secure link, watermark, client review, permission, audit,
  UI, object storage, or product runtime service is executed.
- Portal surfaces expose only client-safe projections and shared-only documents.
- G6 runtime readiness remains open until stacked PRs are reviewed and G1
  through G5 evidence is accepted or explicitly stubbed behind fail-closed
  tests.
