# CMP R4 G10 Closeout - Portal/Data Room

Status: implemented for R4 runtime-write-ready evidence.

Implemented scope:
- File-backed portal/data-room repository for external users, external ACLs, portal projections, RFI requests, RFI responses, client approvals, secure links, dashboard projections, data rooms, and data room projections.
- External access controls requiring inherited DMS ACL, external ACL application, watermark, malware scan pass, expiry, and share-boundary checks.
- Portal/Data Room API surface for reads, writes, projections, and audit.
- API-backed Portal UI route with dashboard, RFI queue, data room projection, and secure-link boundary panels.

Evidence:
- `packages/client-portal/test/runtime-services.test.js`
- `apps/api/test/cmp-r4-g10-portal.test.js`
- `apps/web/test/ui-regression.test.mjs`
- `scripts/validate-cmp-r4-g10.mjs`
- `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g10-001.md` through `cmp-g10-017.md`

Trust boundary:
- `runtime_write_ready: true`
- `r5_r6_owner_decision_ready: true`
- `production_ready_claim: false`

No go-live, production-ready, external portal availability, public secure-link availability, or penetration-test certification claim is made by this closeout.
