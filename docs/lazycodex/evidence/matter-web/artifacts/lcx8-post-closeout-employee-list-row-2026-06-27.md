# LCX8 Post-Closeout Employee List Row

Status: PASS
Generated: 2026-06-27T01:23:19.300Z

Summary: Post-closeout LCX8-ACTION-0197 verification: People employee list row read/fail-closed proof PASS (current-product route correction to people-certificates and people-leave; browser observed employee rows and documents/leave reads, denied/review People guard routes with no protected employee/document/leave requests, direct allow/denied/review API probes PASS for employees/documents/leave with empty guarded payloads after HRX documents/leave read guard fix); node --test apps/api/test/hrx/route-authz.test.js apps/api/test/hrx-runtime-api.test.js apps/api/test/hrx/legal-people-api.test.js PASS 32/32; npm --workspace apps/web run test:ui PASS 17/17; npm run build PASS (existing Vite chunk-size warning only); npm run ui:live:verify PASS 13/13; npm run ui:flows:verify PASS 9/9; sloplint PASS; JSON/count invariant PASS; git diff --check PASS. Status moved BLOCKED -> PASS for 1 row.

Proof: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0197-employee-list-row-proof.json

Counts after: PASS 62, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 77, FAIL 35, UNKNOWN 0.

Next row: LCX8-ACTION-0218.
