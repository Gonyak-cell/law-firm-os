# Wave-1 Remediation Strict Verification - 2026-07-03

Verdict: PARTIAL. This receipt does not claim Wave-1 70/70 PASS and does not replace `artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md`.

Scope of this execution:

- Close `FIX-A02` from `workbook/wave1-remediation-plan-2026-07-03.md`.
- Close `FIX-A11/A10` bounded document upload UI, multipart, DMS bytes, download hash, and restart proof.
- Close bounded local `FIX-E04` Smart Alerts MVP while preserving the C09 external Outlook runtime blocker.
- Close local/code-side `FIX-C09` Outlook add-in readiness: manifest `OnMessageSend`, noninteractive MSAL bridge initialization, `Office.actions.associate("onMessageSendHandler", ...)`, local handler probe, and `allowEvent:true` completion proof while preserving the external Outlook runtime blocker.
- Close `FIX-D12/D14` recruiting, onboarding, and offboarding durable storage under the HRX file-backed store.
- Close `FIX-D03` Korean leave accrual/rule-engine and approval-path policy usage.
- Close `FIX-D04/D06` HRX attendance and work-schedule UI against the real signed-session attendance APIs.
- Close `FIX-D10` HRX compensation local-key AES-GCM encryption boundary and signed-session step-up decrypt path.
- Close `FIX-D11` HRX self-service ownership proof under signed sessions.
- Close `FIX-D13` HRX default onboarding matter-assignment gate.
- Close `FIX-C05` engagement signed document byte storage and server-side hash proof.
- Close `FIX-E01/FIX-E02` label-honesty slice: DMS search no longer claims FTS5, OCR sidecar search no longer claims OCR runtime execution, and the E02 validator now reruns the signed-session API/Vite/browser proof.
- Close `FIX-E05/FIX-E07` internal E-track data slices: workload now proves real time-entry aggregation through signed-session analytics, and matter-people-document graph traversal now includes runtime repository-derived relationships plus restricted redaction proof.
- Close `FIX-E03/FIX-E06` label-honesty slices: filed-email review is explicitly `rule_based_triage` with no external model claim, and notifications are explicitly `notification_simulated_local_recorder` with no external SES network call claim.
- Close local `FIX-A06` boundary: validator now reruns the all-domain durable roundtrip proof and preserves the non-claim that no external production DB decision has been made.
- Repair the `UPL-A-08` packaged desktop restart proof after auth hardening.
- Repair the `UPL-B-16` invoice PDF to DMS hash proof after auth hardening.
- Close the targeted `FIX-V` proof debt: C02/C03/C04/C05/C08 historical browser proofs now execute against `startApiServer` + Vite + signed browser login instead of Playwright API mocks.
- Preserve all other open remediation items as open unless separately proven.

## Closed In This Execution

| Item | Status | Evidence |
|---|---|---|
| `FIX-A02` self-asserted permission/HRX actor header bypass | DONE | API now requires signed session for business routes, web uses `/api/auth/login` and `Authorization: Bearer`, unsigned permission/tenant/actor/role/scope headers are stripped or ignored, and no-token forged-header requests return 401. |
| `FIX-A11/A10` document upload UI and multipart DMS bytes path | DONE | Browser proof logs in, uses a real `<input type="file">`, sends `POST /api/vault/documents/upload` as multipart with signed session, shows UI receipt, downloads hash-identical bytes, restarts API on the same DMS store, and downloads the same hash again. |
| `FIX-E04` bounded local Smart Alerts | DONE | Outlook taskpane proof uses signed session Authorization, sends no legacy `x-lawos-permission-context`, evaluates confidential-external and missing-attachment warning-only rules, verifies clean-message no-warning, blocks forged legacy-header calls with 401, and records no raw message body or attachment bytes in the receipt. |
| `FIX-C09` Outlook add-in code-side readiness | LOCAL DONE | Manifest declares `OnMessageSend` with SoftBlock, `apps/addin/src/main.jsx` initializes a noninteractive MSAL bridge and registers `onMessageSendHandler` through `Office.actions.associate`, browser proof observes MSAL initialized without token/Graph/provider runtime, invokes the associated handler, observes `completed({ allowEvent:true })`, and keeps external Outlook receipts false. |
| `FIX-D12/D14` HRX recruiting/lifecycle durability | DONE | HRX file store now has recruiting/lifecycle tables, runtime loads them from store, API create/update/close writes persist to store, and signed-session server restart proof reads back job/candidate/application/interview/offer/onboarding/offboarding state. |
| `FIX-D03` HRX leave accrual and approval policy path | DONE | Leave request approval now resolves the policy registry and calls `evaluateLeaveUsage`; tests and proof cover Korean statutory entitlement, earned/carryover ledger entries, bounded negative-balance approval, and strict-policy pre-debit rejection. |
| `FIX-D04/D06` HRX attendance/work-schedule UI | DONE | People attendance, work-schedule, and current-work-status sections now render an API-backed attendance workspace with month filter, attendance form, monthly summary, real record table, calendar view, overtime risk panel, and browser proof of signed-session create/read. |
| `FIX-D10` HRX compensation encryption boundary | DONE | Compensation refs are now `lawos-comp-v1` AES-256-GCM envelopes at rest, visible responses expose only `compensation_ref_hash:<digest>`, `/api/hrx/compensation/:id/decrypt` requires signed session + `hrx.compensation.read` + HRX step-up + ownership guard, and the proof records no raw amount, token, or envelope leakage. |
| `FIX-D11` HRX self-service ownership | DONE | Staff signed session reads only linked employee data, forged HRX actor/role/scope headers cannot expand access, ungranted sensitive scopes are denied, and browser HRX requests carry Authorization without legacy self-assertion headers. |
| `FIX-D13` HRX default onboarding gate | DONE | Onboarding plans now inject security-training and confidentiality-pledge gate tasks by default, HRX matter assignment and Matter staffing both read the same `matter_assignment_gate.required_task_ids`, missing/incomplete plans deny assignment, completed gates allow assignment, and explicit waiver remains auditable without bypassing the default path silently. |
| `FIX-C05` engagement signed document bytes | DONE | Intake engagement approval now stores signed PDF bytes through Vault DMS, uses server-recomputed sha256/byte_size as the ledger truth, blocks forged caller hashes before approval, reconciles clearance against the engagement document ledger, and records no raw bytes, storage pointer, or token material in the proof. |
| `FIX-E01/FIX-E02` DMS search/OCR label honesty | DONE | `search_backend` is now `json_substring_search` instead of `sqlite_fts5_ready`; OCR sidecar search preserves `ocr_text_indexed` but reports `ocr_runtime_executed:false` and `caller_supplied_ocr_sidecar`; the E02 proof blocks unsigned forged-header upload and records signed-session browser search without permission-context headers. |
| `FIX-E05` workload time-entry aggregation | DONE | `/api/hrx/analytics` proof now uses signed session, blocks unsigned forged HRX headers with 401, returns workload rows sourced from `time_entry_aggregation`, proves a new time entry increases count/hours, and returns leave-deadline conflict warning data without client/matter detail leakage. |
| `FIX-E07` matter-people-document graph | DONE | Runtime graph table is now populated from HRX matter assignments, employee repository rows, and HR document metadata, while preserving restricted LCX fixture redaction. Signed-session proof traverses `matter-001`, verifies `runtime_repository_plus_fixture`, `mpd_rt_*` source refs, matter/person/document paths, and no raw document body. |
| `FIX-E03` filed-email review queue honesty | DONE | Filed email review keeps the existing approval-gated workflow but now records `analysis_mode: rule_based_triage` and `external_model_claim:false`; validator reruns the proof showing zero auto-create before lawyer approval and matter/task/deadline creation only after approval. |
| `FIX-E06` notification firing honesty | DONE | Notification firing records in-app deliveries and local SES-shaped send records for the required event classes while explicitly declaring `notification_simulated_local_recorder`, `local-ses-send-recorder`, and `external_aws_ses_network_call_made:false`. |
| `FIX-A06` local durable roundtrip boundary | LOCAL DONE | `scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs` now reruns the proof and verifies 13 local file-backed stores/migration roundtrips. This closes the locally possible branch only; `external_production_database_decision_claim:false` and `production_ready_claim:false` remain explicit. |
| `UPL-A-08` packaged desktop restart proof regression | PASS | `artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.json` generated at `2026-07-03T09:21:27.980Z`, with matter and leave data surviving restart on the same runtime store paths. |
| `UPL-B-16` invoice PDF DMS hash proof regression | PASS | `artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json` regenerated at `2026-07-03T09:20:26.247Z`, with rendered PDF, DMS upload, download, and restart hashes matching. |
| `FIX-V` execution-form validator expansion | LOCAL DONE | `scripts/lib/upl-proof-runner.mjs` plus upgraded validators for A05/A08/B10-B17 local/C01-C08/C09 local/C13/E01-E10 now run proof scripts before artifact assertions. C02/C03/C04/C05/C08 browser proofs now use real API/Vite/browser login. External receipts and full 70-row re-adjudication remain separate. |

## Key Artifacts

- `artifacts/manual-qa/upl-a02-signed-session-browser-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-a02-signed-session-browser-proof-2026-07-03.md`
- `artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.json`
- `artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.md`
- `artifacts/manual-qa/upl-a11-vault-upload-browser-proof.json`
- `artifacts/manual-qa/upl-a11-vault-upload-browser-proof.md`
- `artifacts/manual-qa/screenshots/upl-a11-vault-upload-browser-proof.png`
- `artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.md`
- `artifacts/manual-qa/screenshots/upl-e04-smart-alerts-local-proof-2026-07-03.png`
- `docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.md`
- `artifacts/manual-qa/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.md`
- `artifacts/manual-qa/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.md`
- `artifacts/manual-qa/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.md`
- `artifacts/manual-qa/screenshots/upl-d04-d06-hrx-attendance-browser-proof.png`
- `artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.md`
- `artifacts/manual-qa/upl-d11-hrx-self-service-session-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-d11-hrx-self-service-session-proof-2026-07-03.md`
- `artifacts/manual-qa/screenshots/upl-d11-hrx-self-service-session-proof.png`
- `artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.json`
- `artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.md`
- `artifacts/manual-qa/upl-c05-engagement-documents-proof.json`
- `artifacts/manual-qa/upl-c05-engagement-documents-proof.md`
- `artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json`
- `artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.md`
- `artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json`
- `artifacts/manual-qa/upl-b13-popbill-sandbox-proof.md`
- `artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json`
- `artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.md`
- `artifacts/manual-qa/upl-c09-outlook-external-receipt.template.json`
- `artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json`
- `artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.json`
- `workbook/wave1-remediation-plan-2026-07-03.md`

## A02 Browser Receipt

`artifacts/manual-qa/upl-a02-signed-session-browser-proof-2026-07-03.json` generated at `2026-07-03T07:17:59.886Z` records:

- login form submitted through the real web surface
- profile API state populated
- `Authorization` header observed on `/api/profile/me`
- `x-lawos-permission-context` not observed on `/api/profile/me`
- session token stored for the client
- token material not rendered in the DOM

## A11 Browser Receipt

`artifacts/manual-qa/upl-a11-vault-upload-browser-proof.json` generated at `2026-07-03T07:35:03.350Z` records:

- browser login through the real auth surface
- file selected through a real `<input type="file">`
- multipart upload request to `POST /api/vault/documents/upload`
- `Authorization` header observed and `x-lawos-permission-context` not observed on the upload request
- UI receipt showing document title and sha256
- DMS download hash matching the uploaded file
- API restart readback preserving the same download hash
- raw path and storage pointer not exposed

## E04 Local Smart Alerts Receipt

`artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json` records:

- taskpane Smart Alert check visible in the browser
- signed session `Authorization` header observed on `/api/outlook/smart-alerts/evaluate`
- legacy `x-lawos-permission-context` not sent by the add-in
- external recipient plus confidential attachment warning-only result
- missing attachment warning-only result
- clean internal message no-warning result
- forged legacy permission-context request blocked with 401 `AUTH_SESSION_REQUIRED`
- raw body, attachment bytes, and credential material not included in the receipt

Boundary: this is a local signed-session taskpane/API proof. It does not claim Entra admin consent, Outlook web runtime, new Outlook desktop runtime, Graph provider execution, or production writes.

## D12/D14 Durability Receipt

`artifacts/manual-qa/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.json` records:

- signed-session API writes for job opening, candidate consent/profile, application, interview, and offer
- application stage update and offer state update
- onboarding task update and offboarding close
- API server shutdown and restart on the same `hrx-store.json`
- readback survival for job opening, candidate, application stage, interview, offer state, onboarding task state, and offboarding state
- durable table counts for all eight recruiting/lifecycle tables
- no raw resume body, interview feedback, or compensation body included

## D03 Leave Accrual Approval Receipt

`artifacts/manual-qa/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.json` records:

- Korean statutory entitlement cases for under-one-year monthly accrual, one-year 80% attendance, seniority addition, and 25-day cap
- earned accrual ledger entry with `KR_LSA_ARTICLE_60` basis
- carryover ledger entry capped by policy
- approval path allowing bounded negative balance through policy evaluation and appending the used ledger debit
- strict policy blocking approval before any ledger debit
- no raw salary body, document body, or client secret included

## D04/D06 Attendance Browser Receipt

`artifacts/manual-qa/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.json` records:

- real browser login through the web auth surface
- `?view=people#people-attendance-records` rendering the API-backed attendance workspace
- attendance record creation through `POST /api/hrx/attendance`
- `Authorization` header present and legacy permission/actor/role self-assertion headers absent on the attendance request
- signed-session readback from `GET /api/hrx/attendance` with monthly summary reflecting the created record
- work-schedule calendar rendering the created real record
- `GET /api/hrx/overtime/risks` called with signed session for the selected employee
- no session token material rendered in the browser

## D10 Compensation Encryption Receipt

`artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.json` records:

- signed-session login through `/api/auth/login`
- compensation read without HRX step-up denied with 403 `HRX_STEP_UP_REQUIRED`
- compensation read with HRX step-up returning `compensation_ref_hash:<digest>` only
- visible compensation records excluding `encrypted_amount_ref`, raw amount, encryption envelope, and legacy `local-kms://` refs
- compensation decrypt without HRX step-up denied with 403 `HRX_STEP_UP_REQUIRED`
- compensation decrypt with HRX step-up returning the authorized amount payload while the receipt stores only `decrypted_amount_hash`
- `hrx.compensation.decrypt` audit event including no raw amount and no encrypted ref
- no Authorization header, session token, step-up token, raw compensation amount, or encryption envelope written to the artifact

## D11 Self-Service Session Receipt

`artifacts/manual-qa/upl-d11-hrx-self-service-session-proof-2026-07-03.json` records:

- staff signed-session login for `lawos_staff`
- `/api/hrx/employees` returning only the staff-linked employee
- own employee/documents/leave reads succeeding
- other employee/documents/leave reads denied with 403 `HRX_SELF_SERVICE_SCOPE_DENIED`
- forged `x-lawos-actor-id`, `x-lawos-actor-role`, and `x-lawos-hrx-scopes` headers failing to expand the staff session
- ungranted attendance, compensation, and audit scopes denied before runtime access
- browser People screen HRX requests carrying Authorization and no legacy permission/actor/role/scope self-assertion headers
- browser roster rendering staff data while not rendering the other employee display name
- no Authorization value, session token, or password written to the artifact

## D13 Onboarding Gate Receipt

`artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.json` records:

- every new onboarding plan receiving `default-security-training` and `default-confidentiality-pledge` as required matter-assignment gate tasks
- missing onboarding plan denied with `HRX_ONBOARDING_GATE_PLAN_REQUIRED`
- empty onboarding plan denied with `HRX_ONBOARDING_GATE_INCOMPLETE` and zero assignment created
- partial onboarding plan denied until the confidentiality pledge is complete
- Matter staffing gate reading `default-confidentiality-pledge` from the HRX gate contract instead of the old keyword-derived `security-pledge`
- completed onboarding gate allowing matter assignment creation
- explicit waiver allowing matter assignment while recording only waiver hash in proof
- no raw document body, Authorization header, session token, or client secret written to the artifact

## C05 Engagement Document Receipt

`artifacts/manual-qa/upl-c05-engagement-documents-proof.json` records:

- signed-session API execution for `POST /api/intake/engagements`
- unsigned/no-upload engagement approval paths blocked
- forged caller `content_sha256` with real signed bytes blocked before approval
- signed PDF bytes stored through Vault DMS repository/storage
- server-computed sha256 and byte size stored on `EngagementSignedDocumentUpload`
- DMS file object sha256 and downloaded object sha256 matching the engagement ledger
- clearance token reconcile against the engagement template and signed-upload ledger
- no raw PDF bytes, base64 payload, storage pointer, Authorization header, or session token written to the artifact

`docs/lazycodex/evidence/matter-web/artifacts/upl-c05-engagement-documents-browser-proof.json` additionally records a real browser login, real `POST /api/intake/engagements`, DMS repository/storage readback, downloaded sha256 match, and redacted request bytes.

## FIX-V Real-Server Browser Receipts

The following historical browser proofs now run without Playwright API route mocks:

- `docs/lazycodex/evidence/matter-web/artifacts/upl-c02-conflict-search-browser-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/upl-c03-conflict-review-browser-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/upl-c04-clearance-ledger-browser-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/upl-c05-engagement-documents-browser-proof.json`
- `docs/lazycodex/evidence/matter-web/artifacts/upl-c08-intake-completion-browser-proof.json`

Each receipt records signed browser Authorization, absence of legacy `x-lawos-permission-context`, real API writes, and no session token/raw document byte leakage. C08 also records `new -> intake_requested` handoff through the real CRM stage machine and Matter opening only after clearance.

## Verification Commands

- `node --test apps/api/test/hrx/route-authz.test.js apps/api/test/session-auth-api.test.js apps/api/test/profile-api.test.js apps/api/test/master-data-api.test.js` -> PASS 48/48
- `node --test apps/api/test/cmp-r4-g5-vault.test.js` -> PASS 9/9
- `node scripts/run-upl-a11-vault-upload-browser-proof.mjs` -> PASS
- `node scripts/run-upl-b16-invoice-pdf-dms-hash-proof.mjs` -> PASS
- `node --test apps/api/test/outlook-addin-api.test.js` -> PASS 1/1
- `npm --workspace apps/addin run build` -> PASS
- `node scripts/run-upl-c09-c12-outlook-addin-browser-proof.mjs` -> PASS
- `node scripts/validate-upl-c09-c12-outlook-addin.mjs` -> PASS
- `node --test packages/hrx/test/migration.test.js packages/hrx/test/repository-sql.test.js apps/api/test/hrx/durability.test.js` -> PASS 9/9
- `node scripts/validate-hrx-persistence.mjs` -> PASS
- `node scripts/run-upl-d12-d14-hrx-recruiting-lifecycle-durability-proof.mjs` -> PASS
- `node --test packages/hrx/test/leave-policy.test.js apps/api/test/hrx/leave.test.js` -> PASS 9/9
- `node scripts/validate-hrx-workflows.mjs` -> PASS
- `node scripts/run-upl-d03-hrx-leave-accrual-approval-proof.mjs` -> PASS
- `node --test packages/hrx/test/attendance-sql.test.js apps/api/test/hrx/durability.test.js` -> PASS 4/4
- `npm --workspace apps/web run build` -> PASS, Vite chunk-size warning only
- `node scripts/run-upl-d04-d06-hrx-attendance-browser-proof.mjs` -> PASS
- `node --test packages/hrx/test/compensation.test.js apps/api/test/hrx/compensation-encryption.test.js apps/api/test/hrx/route-authz.test.js` -> PASS 23/23
- `node scripts/validate-hrx-core-domain.mjs` -> PASS
- `node scripts/validate-hrx-persistence.mjs` -> PASS
- `node scripts/validate-hrx-route-authz.mjs` -> PASS
- `node scripts/run-upl-d10-hrx-compensation-encryption-proof.mjs` -> PASS
- `node --test apps/api/test/session-auth-api.test.js` -> PASS 9/9
- `node scripts/run-upl-d11-hrx-self-service-session-proof.mjs` -> PASS
- `node --test packages/hrx/test/onboarding.test.js packages/hrx/test/assignment.test.js` -> PASS 9/9
- `node scripts/run-upl-d13-hrx-onboarding-gate-proof.mjs` -> PASS
- `node --test packages/hrx/test/onboarding.test.js packages/hrx/test/assignment.test.js packages/matter/test/runtime-services.test.js apps/api/test/cmp-r4-g4-matter.test.js` -> PASS 33/33
- `node scripts/validate-hrx-core-domain.mjs` -> PASS after D13
- `node scripts/validate-hrx-workflows.mjs` -> PASS after D13
- `node scripts/validate-hrx-runtime-readiness.mjs` -> PASS after D13
- `node --test packages/intake/test/runtime-services.test.js apps/api/test/cmp-r4-g6-crm-intake.test.js` -> PASS 16/16
- `node scripts/run-upl-c05-engagement-documents-proof.mjs` -> PASS
- `node scripts/validate-upl-c02-conflict-search.mjs` -> PASS, reruns real-server browser proof
- `node scripts/validate-upl-c03-conflict-review.mjs` -> PASS, reruns real-server browser proof
- `node scripts/validate-upl-c04-clearance-ledger.mjs` -> PASS, reruns real-server browser proof
- `node scripts/validate-upl-c05-engagement-documents.mjs` -> PASS, reruns API proof and real-server browser proof
- `node scripts/validate-upl-c08-intake-completion-ui.mjs` -> PASS, reruns real-server browser proof
- `node --test packages/dms/test/runtime-services.test.js apps/api/test/cmp-r4-g5-vault.test.js` -> PASS 16/16
- `node scripts/validate-upl-e01-vault-fulltext-search.mjs` -> PASS
- `node scripts/validate-upl-e02-vault-ocr-search.mjs` -> PASS, reruns signed-session API/Vite/browser proof and writes `artifacts/manual-qa/upl-e02-vault-ocr-search-browser-proof.json`
- `node --test packages/matter/test/hrx-workload-projection.test.js` -> PASS 4/4
- `node scripts/validate-upl-e05-workload-time-entry.mjs` -> PASS, reruns signed-session analytics proof and writes `artifacts/manual-qa/upl-e05-workload-time-entry-proof.json`
- `node --test packages/hrx/test/matter-people-document-graph.test.js apps/api/test/hrx/legal-people-api.test.js` -> PASS 15/15
- `node scripts/validate-upl-e07-matter-people-document-graph.mjs` -> PASS, reruns signed-session traversal proof and writes `artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json`
- `node --test packages/matter/test/email-ai-matter-review-service.test.js packages/notifications/test/service.test.js` -> PASS 6/6
- `node scripts/validate-upl-e03-filed-email-ai-review.mjs` -> PASS, reruns rule-based filed-email review proof and writes `artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json`
- `node scripts/validate-upl-e06-notification-firing.mjs` -> PASS, reruns local notification recorder proof and writes `artifacts/manual-qa/upl-e06-notification-firing-proof.json`
- `node scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs` -> PASS, reruns all-domain local durable roundtrip proof and writes `artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.json`
- `node scripts/validate-upl-a05-real-tenant-synthetic-residue.mjs` -> PASS
- `node scripts/validate-upl-a08-packaged-desktop-restart.mjs` -> PASS
- `node scripts/validate-upl-a12-local-model-gateway.mjs` -> PASS
- `node scripts/validate-upl-b01-time-entry.mjs` -> PASS
- `node scripts/validate-upl-b10-analytics-finance-pipeline.mjs` through `node scripts/validate-upl-b17-accounting-export.mjs` -> PASS for local/code-side validators
- `node scripts/validate-upl-b13-tax-invoice-sandbox.mjs` -> PASS with `READY_NEEDS_SANDBOX_ISSUE_APPROVAL` and hash-only Popbill provider probe/body/error boundary
- `node scripts/validate-upl-c01-matter-party.mjs` through `node scripts/validate-upl-c13-client-portal.mjs` -> PASS for local/code-side validators
- `node scripts/validate-upl-c09-outlook-external-receipt.mjs` -> PASS with `READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT`; no Outlook/Entra external runtime is claimed without a sanitized operator receipt at `artifacts/manual-qa/upl-c09-outlook-external-receipt.json`
- `node scripts/validate-upl-e08-wave2-lx-skeleton.mjs`, `node scripts/validate-upl-e09-wave1-five-flow-playwright.mjs`, and `node scripts/validate-upl-e10-wave1-hygiene.mjs` -> PASS
- `node --test apps/web/test/ui-regression.test.mjs` -> PASS 16/16
- `node --test apps/api/test/cmp-r4-g7-finance.test.js apps/api/test/cmp-r4-g8-analytics.test.js` -> PASS 19/19 after signed-session test-header correction
- `node --test packages/dms/test/runtime-services.test.js packages/matter/test/runtime-services.test.js packages/intake/test/runtime-services.test.js packages/hrx/test/matter-people-document-graph.test.js apps/api/test/hrx/legal-people-api.test.js` -> PASS 39/39
- `node scripts/run-wave1-external-receipt-readiness.mjs` -> PASS, writes `artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json`
- `node scripts/validate-wave1-external-receipt-readiness.mjs` -> PASS
- `node scripts/run-wave1-remediation-strict-verification-proof.mjs` -> PASS, writes `artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.json`
- `node scripts/validate-wave1-remediation-strict-verification.mjs` -> PASS; validates this remediation receipt, the workbook, the preserved 70-row matrix, and the C09/B13 external blocker/non-claim boundary
- `npm test` -> PASS 4152/4152
- `npm run build` -> PASS, Vite chunk-size warning only
- `git diff --check` -> PASS
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` -> 35 weak findings, no strong/no-verify findings. Remaining weak findings are existing `apps/web/src/styles.css` glow/motion/dark-theme/background patterns.

## Still Open

These remain open under the remediation goal and must not be counted as complete from this receipt:

- `FIX-C09` external Entra/Outlook receipts; local taskpane/browser proof, code-side MSAL bridge proof, code-side OnMessageSend handler proof, and sanitized external-receipt intake validator exist, but strict external runtime remains blocked until a real operator receipt validates
- Popbill sandbox issue receipt: local 3.3% withholding model passes and Popbill LinkID/SecretKey/corpNum are staged in gitignored `.env.popbill.local`. `artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json` now includes a prepared request hash, mgt key hash, 3.3% withholding 33,000 KRW / net payable 967,000 KRW, and Popbill `remark3` mapping without raw payload/corp number/secret leakage. The runner/validator also prevent raw Popbill provider probe/body/error storage if sandbox issue is attempted. `POPBILL_ALLOW_SANDBOX_ISSUE=0`, so no production or sandbox tax invoice issue receipt was generated in this run.
- External/operator receipts for Outlook/Entra runtime and real model gateway where strict matrix rows require them

## Non-Claims

- No production tax invoice was issued.
- No Outlook/Entra tenant admin consent, Outlook web runtime, Graph provider runtime, or new Outlook desktop runtime receipt was generated.
- No Popbill sandbox tax invoice was issued; the current state is readiness only with issue approval disabled locally, with prepared Popbill payload mapping hash-proved before external issuance.
- A12 local model gateway validation passed, but this receipt does not claim an Anthropic/external model-gateway receipt where strict matrix rows require one.
- No public release, go-live, or 70/70 strict PASS claim is made by this receipt.
