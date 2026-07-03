# Wave-1 70 TUW Strict Verification

Generated: 2026-07-03

Strict rule: `workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md` §8. A TUW is strict PASS only when its own completion test is proven by a real server test, real browser E2E/manual receipt, or external sandbox/provider receipt where required. Regex/static validators alone are not counted as completion.

## Summary

| Status | Count |
|---|---:|
| PASS | 64 |
| PARTIAL | 5 |
| BLOCKED | 1 |
| FAIL | 0 |
| Total | 70 |

## Direct Verification Run

- `npm test`: PASS, 4141/4141.
- `npm run build`: PASS, Vite chunk-size warning only.
- `git diff --check`: PASS.
- `node scripts/run-web-e2e.mjs matter-vault`: PASS, 1/1.
- `node scripts/run-web-e2e.mjs hrx`: initially FAIL 15/16 on `hrx-payroll-boundary`; closure addendum now PASS 16/16 after Shell payroll shortcut/action marker fix.
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed --format json`: exit 0 with 35 weak CSS-only findings, strong 0, no-verify 0; remaining weak findings are documented in `artifacts/manual-qa/upl-e10-wave1-hygiene-proof.json`.
- A05/B01/B16/C13/E03/E05/E07/E08/E09 closure addendum: `node --test packages/client-portal/test/runtime-services.test.js apps/api/test/cmp-r4-g10-portal.test.js` PASS 8/8; `npm --workspace apps/web run build` PASS with Vite chunk-size warning only; `node scripts/run-upl-c13-client-portal-browser-proof.mjs` PASS 10/10; `node scripts/validate-upl-c13-client-portal.mjs` PASS; `node --test apps/web/e2e/hrx/hrx-payroll-boundary.spec.ts` PASS 1/1; `node scripts/run-web-e2e.mjs hrx` PASS 16/16; `node scripts/run-upl-b01-time-entry-browser-proof.mjs` PASS 8/8; `node scripts/validate-upl-b01-time-entry.mjs` PASS; `node scripts/run-upl-a05-real-tenant-synthetic-residue-proof.mjs` PASS; `node scripts/validate-upl-a05-real-tenant-synthetic-residue.mjs` PASS; `node --test packages/billing/test/invoice-pdf-service.test.js apps/api/test/cmp-r4-g5-vault.test.js` PASS 9/9; `node scripts/run-upl-b16-invoice-pdf-dms-hash-proof.mjs` PASS; `node scripts/validate-upl-b16-invoice-pdf-dms-hash.mjs` PASS; `node --test packages/matter/test/email-ai-matter-review-service.test.js` PASS 4/4; `node scripts/run-upl-e03-filed-email-ai-review-proof.mjs` PASS; `node scripts/validate-upl-e03-filed-email-ai-review.mjs` PASS; `node --test packages/matter/test/hrx-workload-projection.test.js apps/api/test/hrx-runtime-api.test.js apps/api/test/hrx/ai.test.js apps/api/test/hrx/tenant-isolation.test.js` PASS 36/36; `node scripts/run-upl-e05-workload-time-entry-proof.mjs` PASS; `node scripts/validate-upl-e05-workload-time-entry.mjs` PASS; `node --test packages/hrx/test/matter-people-document-graph.test.js apps/api/test/hrx/legal-people-api.test.js apps/api/test/hrx/route-authz.test.js` PASS 31/31; `node scripts/run-upl-e07-matter-people-document-graph-proof.mjs` PASS; `node scripts/validate-upl-e07-matter-people-document-graph.mjs` PASS; `node scripts/validate-upl-e08-wave2-lx-skeleton.mjs` PASS; `node scripts/run-web-e2e.mjs wave1-five-flow` PASS 1/1; `node scripts/validate-upl-e09-wave1-five-flow-playwright.mjs` PASS.
- A06/A08/B13/E06/E10 closure addendum: `node scripts/run-upl-a06-all-domain-durable-roundtrip-proof.mjs`, `node scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs`, and `node --test scripts/test/upl-a06-all-domain-durable-roundtrip.test.mjs` PASS; `node scripts/run-upl-a08-packaged-desktop-restart-proof.mjs`, `node scripts/validate-upl-a08-packaged-desktop-restart.mjs`, and `node --test scripts/test/upl-a08-packaged-desktop-restart.test.mjs` PASS; `node scripts/run-upl-b13-withholding-proof.mjs`, `node scripts/validate-upl-b13-withholding.mjs`, and `node --test scripts/test/upl-b13-withholding.test.mjs` PASS with external vendor/sandbox still unclaimed; `node scripts/run-upl-e06-notification-firing-proof.mjs`, `node scripts/validate-upl-e06-notification-firing.mjs`, and `node --test scripts/test/upl-e06-notification-firing.test.mjs` PASS; `node scripts/run-upl-e10-wave1-hygiene-proof.mjs`, `node scripts/validate-upl-e10-wave1-hygiene.mjs`, `node --test scripts/test/upl-e10-wave1-hygiene.test.mjs`, and `node --test apps/web/test/ui-regression.test.mjs` PASS.
- A12/D16 local model closure addendum: `node --test packages/hrx/test/ai-model-gateway.test.js`, `node --test apps/api/test/hrx/ai.test.js`, `node scripts/run-upl-a12-local-model-gateway-proof.mjs`, `node scripts/validate-upl-a12-local-model-gateway.mjs`, and `node --test scripts/test/upl-a12-local-model-gateway.test.mjs` PASS. The receipt uses approved local Ollama `gemma4:12b` through the extensible HRX model-gateway provider registry, stores provider/model plus request/response hashes only, creates HRX review queue and audit receipts, and proves blocked raw fields are rejected before any provider call.
- External receipt readiness addendum: `node scripts/run-wave1-external-receipt-readiness.mjs`, `node scripts/validate-wave1-external-receipt-readiness.mjs`, and `node --test scripts/test/wave1-external-receipt-readiness.test.mjs` PASS. This readiness ledger documents the exact C09/B13 external receipts still missing, keeps inherited C10-C12/E04 non-PASS, and makes no 70/70 completion claim.

## TUW Matrix

| TUW | Strict status | Evidence / gap |
|---|---|---|
| UPL-A-01 | PASS | Signed login/session negative tests pass through API server tests. |
| UPL-A-02 | PASS | Forged client permission context is rejected/ignored by signed session and route authz tests. |
| UPL-A-03 | PASS | Server-derived role/scope matrix and HRX route authz tests cover restricted payroll/audit reads. |
| UPL-A-04 | PASS | Signed step-up and TOTP negative tests pass. |
| UPL-A-05 | PASS | Real-tenant `/master-data/records` readback for `tenant_amic_matter_vault` returns 99 current ClientGroup rows with wrong-tenant 0, `synthetic_only` true 0, display/canonical/source-lane residue 0, removed project-seller names 0, and C06 crosswalk still PASS in `artifacts/manual-qa/upl-a05-real-tenant-synthetic-residue-proof.json`; `validate-upl-a05-real-tenant-synthetic-residue` passes. |
| UPL-A-06 | PASS | All-domain durable migration roundtrip proof covers 13 local Wave-1 stores: HRX, master-data, matter, DMS, CRM, intake, CRM-master-data, finance, analytics, AI-governance, client-portal, UI-readiness, and enterprise-readiness. `scripts/run-upl-a06-all-domain-durable-roundtrip-proof.mjs` writes one representative normalized row per domain, runs HRX migrations, reopens every store path, verifies stable hashes after reopen, and records the local owner boundary without claiming an external production DB decision in `artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.json`; `scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs` and `scripts/test/upl-a06-all-domain-durable-roundtrip.test.mjs` cover the receipt. |
| UPL-A-07 | PASS | HRX durable runtime tests cover write-restart-read survival across HRX domains. |
| UPL-A-08 | PASS | Packaged desktop local API restart receipt proves matter and leave readback survives restart from the same Electron `userData/runtime-stores` paths: `scripts/run-upl-a08-packaged-desktop-restart-proof.mjs` starts the packaged-entry local API twice, creates Matter plus HRX leave only through API routes, confirms identical matter hash after restart, confirms leave request readback after restart, and writes `artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.json`; `scripts/validate-upl-a08-packaged-desktop-restart.mjs` and `scripts/test/upl-a08-packaged-desktop-restart.test.mjs` cover the receipt. |
| UPL-A-09 | PASS | Backup/restore drill artifacts and reconciliation receipts exist. |
| UPL-A-10 | PASS | DMS byte storage adapter, upload/download, hash-preserving proof, and storage tests are green. |
| UPL-A-11 | PASS | Browser/file bridge document upload/download proof exists via matter-vault/document receipts. |
| UPL-A-12 | PASS | Approved local model-gateway proof passes with Ollama `gemma4:12b`: `packages/hrx/src/ai/model-provider-registry.js` provides switchable `ollama`/`remote` providers, HRX runtime wires the gateway from env or injection, `artifacts/manual-qa/upl-a12-local-model-gateway-proof.json` records provider/model, request_hash, response_hash, HRX review queue item, audit event, metadata-only payload policy, and blocked `employee_salary`/`document_body`/`client_secret` checks without storing prompt/response text; `validate-upl-a12-local-model-gateway` passes. |
| UPL-A-13 | PASS | Deny audit plus sensitive read audit for HRX, vault, and finance pass. |
| UPL-A-14 | PASS | Login lockout/protection artifact and session-auth tests pass. |
| UPL-B-01 | PASS | Matter time-entry browser proof submits two arbitrary form entries on the same matter with different date/duration/narrative/role/billable values, distinct runtime IDs/idempotency keys, UI render, and API readback in `artifacts/manual-qa/upl-b01-time-entry-browser-proof.json`; `validate-upl-b01-time-entry` passes. |
| UPL-B-02 | PASS | Time approval route is wired and covered in finance API/runtime tests. |
| UPL-B-03 | PASS | WIP lock route and post-lock rejection are covered in billing runtime tests. |
| UPL-B-04 | PASS | Pre-bill creation, no-adjustment approval, and rejection paths are covered. |
| UPL-B-05 | PASS | Invoice creation, sequencing, and immutability regression are covered. |
| UPL-B-06 | PASS | Payment matching covers partial and overpayment handling. |
| UPL-B-07 | PASS | AR aging due-date artifact and tests cover real buckets and nonzero aged items. |
| UPL-B-08 | PASS | Finance-to-analytics real aggregation and constant-regression checks pass through B10/B15 proof and analytics tests. |
| UPL-B-09 | PASS | Client profitability mapping is covered by analytics/profitability tests. |
| UPL-B-10 | PASS | `upl-b10` validator/artifact passes body-less finance aggregation. |
| UPL-B-11 | PASS | Fee-arrangement type proof passes. |
| UPL-B-12 | PASS | Trust ledger proof passes deposit/drawdown/refund invariants. |
| UPL-B-13 | PARTIAL | Local 3.3% Korean business-income withholding model and TaxInvoice proof now pass: `calculateKoreanBusinessIncomeWithholding` computes 3% income tax plus 0.3% local income tax, carries withholding/net payable on `TaxInvoice`, and proof `artifacts/manual-qa/upl-b13-withholding-proof.json` verifies KRW 1,000,000 -> KRW 33,000 withholding -> KRW 967,000 net. `artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json` keeps the strict boundary explicit: PASS still requires owner vendor choice and external tax-invoice sandbox roundtrip; neither is claimed. |
| UPL-B-14 | PASS | Expense/disbursement to WIP proof passes. |
| UPL-B-15 | PASS | KPI dashboard proof passes. |
| UPL-B-16 | PASS | Invoice PDF renderer emits PDF bytes and sha256; Vault/DMS upload stores the rendered PDF via `content_base64`; download and same-store restart readback return hash-identical PDF bytes with raw path/storage pointer hidden in `artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json`; `validate-upl-b16-invoice-pdf-dms-hash` passes. Email linkage is explicitly not claimed and remains tied to E06. |
| UPL-B-17 | PASS | Accounting CSV export proof passes period filtering and debit/credit balance. |
| UPL-C-01 | PASS | Adverse-party model/API proof passes. |
| UPL-C-02 | PASS | Conflict search proof and browser proof pass, including false zero-hit regression. |
| UPL-C-03 | PASS | Hit-decision-waiver browser/API proof passes. |
| UPL-C-04 | PASS | Clearance ledger proof rejects forged/unissued token. |
| UPL-C-05 | PASS | Engagement document proof rejects missing signed document/engagement. |
| UPL-C-06 | PASS | Canonical client crosswalk proof passes. |
| UPL-C-07 | PASS | Raw contact value storage/masking proof passes. |
| UPL-C-08 | PASS | Intake completion browser proof passes. |
| UPL-C-09 | BLOCKED | Local taskpane proof exists, and `artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json` links it to the inherited Outlook rows, but artifact state remains Outlook web/new desktop smoke false, Entra consent false, and provider runtime false. |
| UPL-C-10 | PARTIAL | Filing API/local taskpane proof passes, but Outlook runtime proof is inherited-blocked by C09. |
| UPL-C-11 | PARTIAL | Attachment save/local DMS proof passes, but Outlook runtime proof is inherited-blocked by C09. |
| UPL-C-12 | PARTIAL | Sent-mail filing/task proof passes locally, but Outlook runtime proof is inherited-blocked by C09. |
| UPL-C-13 | PASS | Client Portal now has PortalSurface mount, one-time magic-link consume/reuse denial, metadata-only RFI response UI, expired secure-link denial, token non-rendering, and audit evidence in `artifacts/manual-qa/upl-c13-client-portal-browser-proof.json`; API/service tests and `validate-upl-c13-client-portal` pass. |
| UPL-D-01 | PASS | Leave approval/reject route transitions and ledger proof pass. |
| UPL-D-02 | PASS | Self-approval is rejected with HRX authz proof. |
| UPL-D-03 | PASS | Korean leave rule engine proof passes Labor Standards Act Article 60 cases and negative-balance guard. |
| UPL-D-04 | PASS | Attendance route, durable table, and UI/API proof pass. |
| UPL-D-05 | PASS | Overtime/week-52h risk proof passes. |
| UPL-D-06 | PASS | Leave UI real-data proof passes API-to-screen value checks. |
| UPL-D-07 | PASS | Employee lifecycle route/status-machine proof passes. |
| UPL-D-08 | PASS | Org/reporting-line proof passes. |
| UPL-D-09 | PASS | HR document lifecycle proof passes signed/expired states. |
| UPL-D-10 | PASS | Compensation record artifact covers masked ref, contract link, self/elevated access, and step-up denial. |
| UPL-D-11 | PASS | Self-service ownership/session proof passes own-data/other-data boundaries. |
| UPL-D-12 | PASS | Recruiting pipeline proof passes posting-candidate-interview-offer-convert flow. |
| UPL-D-13 | PASS | Onboarding gate browser proof passes staffing block. |
| UPL-D-14 | PASS | Offboarding close gate browser proof passes reassignment/checklist block. |
| UPL-D-15 | PASS | HR risk dashboard browser proof covers the legal five. |
| UPL-D-16 | PASS | RAG/authz/browser proof passes, and the inherited real-model blocker is closed by `artifacts/manual-qa/upl-a12-local-model-gateway-proof.json`: the same HRX AI route now produces a real local model response through model-gateway, routes it to review, writes audit metadata, and preserves metadata-only citations. |
| UPL-E-01 | PASS | Full-text search browser proof passes body keyword hit and permission-safe result rendering. |
| UPL-E-02 | PASS | OCR search browser proof passes OCR keyword hit and raw OCR text non-leak. |
| UPL-E-03 | PASS | Filed email AI review service queues summary, task candidate, and deadline candidate with `pending_lawyer_approval`; proof shows no approval creates zero matters/tasks/deadlines and lawyer approval materializes one Matter, one MatterTask, and one MatterCalendarEvent in `artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json`; `validate-upl-e03-filed-email-ai-review` passes. |
| UPL-E-04 | PARTIAL | Warning-only Smart Alerts local proof passes, but actual Outlook runtime proof is blocked by C09. |
| UPL-E-05 | PASS | Workload projection now aggregates real `time_entries` before assignment fallback, `/api/hrx/analytics` emits `workload_source: time_entry_aggregation`, People analytics UI labels the time-entry source and leave-deadline conflict count, and proof covers time-entry change increasing workload plus `leave_deadline_overlap` warning in `artifacts/manual-qa/upl-e05-workload-time-entry-proof.json`; `validate-upl-e05-workload-time-entry` passes. |
| UPL-E-06 | PASS | Notification firing service records both in-app delivery and SES-shaped send records for `approval_pending`, `deadline_approaching`, `contract_expiring`, and `risk_detected`. `packages/notifications/src/service.js` rejects unsupported event classes, stores no body/credential material, and `scripts/run-upl-e06-notification-firing-proof.mjs` proves one event fire creates both channel receipts for all four classes in `artifacts/manual-qa/upl-e06-notification-firing-proof.json`; `packages/notifications/test/service.test.js`, `scripts/validate-upl-e06-notification-firing.mjs`, and `scripts/test/upl-e06-notification-firing.test.mjs` pass. External AWS SES network call is not claimed. |
| UPL-E-07 | PASS | Matter-People-Document relationship table and traversal API are implemented in `packages/hrx/src/matter-people-document-graph.js` and `/api/hrx/legal-people/matter-graph/traverse`, with package/API/route-authz tests and server proof covering matter/person/document nodes, `matter_person`/`matter_document`/`person_document` relationships, privileged traversal path to `document_lcx_expert_report_001`, restricted redaction, and no raw document body in `artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json`; `validate-upl-e07-matter-people-document-graph` passes. |
| UPL-E-08 | PASS | Wave-2 LX skeleton mapping artifact covers exactly LX-01..LX-12 with TUW skeletons, owner/external gates, required SSO/SCIM/DLP/monthly screening/multi-tenancy/pentest coverage, and explicit no-production-ready boundary in `artifacts/manual-qa/upl-e08-wave2-lx-skeleton-mapping.json`; `validate-upl-e08-wave2-lx-skeleton` passes. |
| UPL-E-09 | PASS | Required 5-flow Playwright suite is registered as `node scripts/run-web-e2e.mjs wave1-five-flow` and passes opening, time-to-billing, leave, document, and portal flows with aggregate artifact `artifacts/manual-qa/upl-e09-wave1-five-flow-playwright-suite.json`; `validate-upl-e09-wave1-five-flow-playwright` passes. |
| UPL-E-10 | PASS | Whole-wave hygiene proof passes UI regression 16/16, C13 Portal preservation, sloplint strong 0/no-verify 0, static hardcoded badge/count scan 0, and row-level documentation of remaining weak CSS-only sloplint findings in `artifacts/manual-qa/upl-e10-wave1-hygiene-proof.json`; `scripts/validate-upl-e10-wave1-hygiene.mjs` and `scripts/test/upl-e10-wave1-hygiene.test.mjs` cover the receipt. This row does not claim 70/70 completion because C09/B13 external receipts and inherited C10-C12/E04 partial rows remain. |
