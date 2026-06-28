# LazyCodex LCX8 All Remaining UI Action Operational Plan

Date: 2026-06-27
Status: in_progress
Branch: `codex/matter-vault-approved-upserts`
HEAD: `649041320`
Source ledger: `docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-ledger.json`
Scope: every LCX8 row that was not `PASS` at the LCX8-ALL-00 control freeze, plus current execution progress for rows resolved after the freeze.

## Goal

Close the entire remaining LCX8 UI action ledger from the LCX8-ALL-00 control-freeze baseline. “Remaining” means every visible action row that was not already `PASS` when the goal started. As rows are resolved, this document tracks both the baseline assignment and the current remaining count. The plan keeps three different kinds of work separate: operational remediation, final classification closure for honest UI-only behavior, and guarded/external-boundary revalidation.

## Current Snapshot

- Inventory rows: 324
- PASS: 167
- GUARDED: 20
- UI_ONLY: 115
- DESCRIPTOR_ONLY: 2
- BLOCKED: 20
- FAIL: 0
- UNKNOWN: 0
- Latest batch: LCX8-ALL-34 final blocker/descriptor classification
- Latest proof: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0062-0281-0318-0322-final-blocker-descriptor-proof.json

| Work category | Count |
| --- | ---: |
| active remediation | 22 |
| classification closure | 115 |
| guarded revalidation | 20 |

| Remediation lane | Count |
| --- | ---: |
| (none) | 120 |
| Lane B | 4 |
| Lane C | 1 |
| Lane C/Lane D | 1 |
| Lane D | 16 |
| Lane E | 15 |

| Trace depth | Count |
| --- | ---: |
| api_read | 1 |
| api_write | 11 |
| external_receipt_required | 1 |
| native_bridge | 19 |
| route_navigation | 60 |
| ui_state_only | 65 |

## Execution Progress

- 2026-06-27: `LCX8-ACTION-0074` moved from `BLOCKED` to `PASS` with `LCX8-ALL-11` Matter activity patch proof. Current counts after this row: PASS 23, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 109, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0075`.
- 2026-06-27: `LCX8-ACTION-0075` moved from `BLOCKED` to `PASS` with `LCX8-ALL-11` Matter calendar create proof. Current counts after this row: PASS 24, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 108, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0076`.
- 2026-06-27: `LCX8-ACTION-0076` moved from `BLOCKED` to `PASS` with `LCX8-ALL-11` Matter calendar approval-required patch proof. Current counts after this row: PASS 25, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 107, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0077`.
- 2026-06-27: `LCX8-ACTION-0077` moved from `BLOCKED` to `PASS` with `LCX8-ALL-11` Matter deadline confirm proof. Current counts after this row: PASS 26, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 106, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0078`.
- 2026-06-27: `LCX8-ACTION-0078` moved from `BLOCKED` to `PASS` with `LCX8-ALL-11` Matter channel message proof. Current counts after this row: PASS 27, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 105, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0079`.
- 2026-06-27: `LCX8-ACTION-0079` remains `BLOCKED` / Lane D with `LCX8-ALL-11` Matter channel provider-sync blocker proof. Current product returns `provider_blocked` and audit reason `provider_receipt_required`; no external provider receipt captured. Counts unchanged: PASS 27, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 105, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0080`.
- 2026-06-27: `LCX8-ACTION-0080` remains `UI_ONLY` with `LCX8-ALL-12` Matter opening Matter 등록번호 field proof. Browser input accepted local value; no mutation network or `/api/matters/openings` POST fired. Counts unchanged: PASS 27, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 105, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0081`.
- 2026-06-27: `LCX8-ACTION-0081..0089` remain `UI_ONLY` with `LCX8-ALL-12` Matter opening adjacent field proof. Browser inputs accepted local values; no mutation network or `/api/matters/openings` POST fired. Counts unchanged: PASS 27, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 105, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0090`.
- 2026-06-27: `LCX8-ACTION-0090` moved from `BLOCKED` to `PASS` with `LCX8-ALL-12` Matter opening submit proof. Current counts after this row: PASS 28, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 104, FAIL 42, UNKNOWN 0. Next row: `LCX8-ACTION-0092`.
- 2026-06-27: `LCX8-ACTION-0050/0092/0094/0115/0182/0320/0321` moved from `FAIL` to `PASS` with `LCX8-ALL-02` panel overflow removal proof. Current counts after these rows: PASS 35, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 104, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0093`.
- 2026-06-27: `LCX8-ACTION-0093` moved from `BLOCKED` to `PASS` with `LCX8-ALL-10` People refresh API-read/fail-closed proof. Current counts after this row: PASS 36, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 103, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0095`.
- 2026-06-27: `LCX8-ACTION-0095..0102` moved from `BLOCKED` to `PASS` with `LCX8-ALL-10` Legal People search/filter/row API-read/fail-closed proof. Current counts after these rows: PASS 44, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 95, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0114`.
- 2026-06-27: `LCX8-ACTION-0114` moved from `BLOCKED` to `PASS` with `LCX8-ALL-10` Client refresh API-read/fail-closed proof. Current counts after this row: PASS 45, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 94, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0166`.
- 2026-06-27: `LCX8-ACTION-0166..0181` moved from `BLOCKED` to `PASS` with `LCX8-ALL-10` People relationships/conflicts Legal People search/filter/row API-read/fail-closed proof. Current counts after these rows: PASS 61, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 78, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0197`.
- 2026-06-27: `LCX8-ACTION-0197` moved from `BLOCKED` to `PASS` with `LCX8-ALL-10` People employee list row read/fail-closed proof. Current-product route correction uses `people-certificates` for employee-scoped HR documents and `people-leave` for leave state; `people-documents` is company-policy only. Current counts after this row: PASS 62, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 77, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0218`.
- 2026-06-28: `LCX8-ACTION-0218/0219` moved from `BLOCKED` to `PASS` with `LCX8-ALL-10` People admin object-manager Client/Matter tab read/fail-closed proof. Browser observed Client/Matter tab activation plus admin collection/object-field/HRX ethics reads; denied/review guard and direct API probes showed empty guarded payloads. Current counts after these rows: PASS 64, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 75, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0220`.
- 2026-06-28: `LCX8-ACTION-0220..0226` moved from `BLOCKED` to `PASS` with `LCX8-ALL-16` People admin write request proof. Browser clicked 7 current-product admin buttons; direct API probes covered safe fixture write/read-back/audit/idempotency/guard behavior. Current product label correction: `LCX8-ACTION-0224` `정책 변경` -> `표시 방식 수정`. Current counts after these rows: PASS 71, GUARDED 20, UI_ONLY 128, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0227`.
- 2026-06-28: `LCX8-ACTION-0227/0230/0231` remain `UI_ONLY` final route/history navigation, and `LCX8-ACTION-0228/0229/0232` moved from `UI_ONLY` to `PASS` with `LCX8-ALL-17` profile-sidebar Matter recently-viewed write proof. Current product route mount writes viewer-scoped recently-viewed state and direct API proof covers write/read-back/audit/denied-review guard. Verification PASS: proof 33/33, Matter API 11/11, web UI 17/17, build PASS with existing Vite chunk-size warning only, ui:flows 9/9, ui:live 13/13, sloplint PASS, diff check PASS. Current counts after these rows: PASS 74, GUARDED 20, UI_ONLY 125, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row: `LCX8-ACTION-0233`.
- 2026-06-28: `LCX8-ACTION-0001/0002/0003/0006/0007/0008/0010/0011/0012/0014/0015/0016/0018/0019/0020/0021/0022/0024/0025/0026/0029/0030/0031` remain `UI_ONLY` final with `LCX8-ALL-40` auth/home browser proof, and `LCX8-ACTION-0009/0013/0023` moved from `UI_ONLY` to `PASS` because Matter route mount writes viewer-scoped recently-viewed state with write/read-back/audit/denied-review guard proof. Current product copy correction: `LCX8-ACTION-0014` `구성원 초대` -> `합류코드 전송`. Existing Lane E copy backlog for `LCX8-ACTION-0009` is preserved. Current counts after these rows: PASS 77, GUARDED 20, UI_ONLY 122, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233`.
- 2026-06-28: `LCX8-ACTION-0035/0038/0039/0040/0042/0043` remain `UI_ONLY` final with `LCX8-ALL-40` Home command-link browser proof, and `LCX8-ACTION-0037/0041` moved from `UI_ONLY` to `PASS` because Matter route mount writes viewer-scoped recently-viewed state with write/read-back/audit/denied-review guard proof. Current counts after these rows: PASS 79, GUARDED 20, UI_ONLY 120, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233`.
- 2026-06-28: `LCX8-ACTION-0045..0049/0051..0053/0056..0058` remain `UI_ONLY` final with `LCX8-ALL-41` Matter tabs/list/selection browser proof. Section tabs update route/history only; saved list views, bulk select, row checkbox, and record-row selection update local Matter UI state only. Proof PASS 34/34; no mutation requests, no non-recent Matter mutation, and no console errors observed. Verification PASS: Matter API 11/11, web UI 17/17, build PASS with existing Vite chunk-size warning only, ui:flows PASS 9/9, ui:live PASS 13/13, sloplint PASS, git diff --check PASS, JSON/CSV invariant PASS, ports 4180/5173 clear. `LCX8-ACTION-0045` Lane E visual/focus backlog remains separate. Current counts unchanged: PASS 79, GUARDED 20, UI_ONLY 120, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233`.
- 2026-06-28: `LCX8-ACTION-0103..0108` remain `UI_ONLY` final with `LCX8-ALL-41` Client sidebar browser proof, and `LCX8-ACTION-0109/0110/0111` moved from `UI_ONLY` to `PASS` because Client data/report/import panels mount successful read-only API calls after route navigation. Proof PASS 37/37; no mutation requests, no API 4xx/5xx, and no console errors observed after fixing `GET /api/reports/audit` route ordering. Verification PASS: focused API 17/17, web UI 17/17, build PASS with existing Vite chunk-size warning only, ui:flows PASS 9/9, ui:live PASS 13/13, sloplint PASS, git diff --check PASS, JSON/CSV invariant PASS, ports 4180/5173 clear. Current counts after these rows: PASS 82, GUARDED 20, UI_ONLY 117, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233`.
- 2026-06-28: `LCX8-ACTION-0282/0283/0284/0285/0286/0288/0289/0290/0291/0292/0293/0294/0298/0299/0300/0303/0304/0305/0306` remain `UI_ONLY` final with `LCX8-ALL-41` Matter/Vault sidebar and Matter team-form browser proof, and `LCX8-ACTION-0287/0295` moved from `UI_ONLY` to `PASS` because Matter document/import panels mount successful read-only API calls after route navigation. Proof PASS 78/78; no mutation requests, no API 4xx/5xx, and no console errors observed. Verification PASS: focused API 20/20, web UI 17/17, build PASS with existing Vite chunk-size warning only, ui:flows PASS 9/9, ui:live PASS 13/13, sloplint PASS, git diff --check PASS, JSON/CSV invariant PASS, ports 4180/5173 clear. Lane E visual/focus backlog for `LCX8-ACTION-0282/0284/0292/0300` remains separate. Current counts after these rows: PASS 84, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 68, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233`.

- 2026-06-28: `LCX8-ACTION-0314/0315/0316/0317/0319` moved from `BLOCKED` to `PASS` with `LCX8-ALL-13` Matter import safe write proof. Browser/API proof covered job creation, source manifest, allowlisted mapping, dry-run preview, rollback/error-report, audit events, read-back, denied/review fail-closed probes, blocked target rejection, no raw-row leakage, and no browser API 4xx/5xx or console errors. `LCX8-ACTION-0318` execute remains Lane D/out of batch; no production import execution claim is made. Current counts after these rows: PASS 89, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 63, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233` pending Lazyweb upgrade for UI remediation, with non-design Lane B work continuing around that gate.
- 2026-06-28: `LCX8-ACTION-0140..0145` moved from `BLOCKED` to `PASS` with `LCX8-ALL-15` Client import safe write proof. Browser/API proof covered job creation, source manifest, allowlisted mapping, dry-run preview, execute owner-blocked state, rollback/error-report, audit events, read-back, denied/review fail-closed probes, blocked target rejection, no raw-row leakage, and no browser API 4xx/5xx or console errors. `LCX8-ACTION-0135..0139` report writes remain outside this batch; no production import execution claim is made. Current counts after these rows: PASS 95, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 57, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233` pending Lazyweb upgrade for UI remediation, with non-design Lane B work continuing around that gate.
- 2026-06-28: `LCX8-ACTION-0135..0139` moved from `BLOCKED` to `PASS` with `LCX8-ALL-15` Client report safe write proof. Browser/API proof covered report create, report patch, Client profitability aggregate refresh, bounded report run, owner-blocked share, audit read-back, denied/review fail-closed probes, raw SQL/query/source suppression, and no browser API 4xx/5xx or console errors. No arbitrary SQL execution, production share approval, external provider receipt, or production readiness claim is made. Current counts after these rows: PASS 100, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 52, FAIL 35, UNKNOWN 0. Next row remains `LCX8-ACTION-0233` pending Lazyweb upgrade for UI remediation, with non-design Lane B work continuing around that gate.
- 2026-06-28: `LCX8-ACTION-0116/0117` moved from `BLOCKED` to `PASS` with `LCX8-ALL-14` Client right-panel record actions proof. Browser/API proof covered Client field update, owner approval-check owner_blocked state, write/read-back/audit/idempotency, invalid owner_user_id block, denied/review fail-closed probes, safe audit redaction, and no browser API 4xx/5xx or console errors. No owner change was applied; no production approval, external receipt, or raw owner/user id exposure claim is made. Current counts after these rows: PASS 102, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 50, FAIL 35, UNKNOWN 0. Next `LCX8-ALL-14` rows: `LCX8-ACTION-0118..0128`.
- 2026-06-28: `LCX8-ACTION-0118/0119/0120` moved from `BLOCKED` to `PASS` with `LCX8-ALL-14` Client intake flow proof. Browser/API proof covered CRM opportunity handoff, intake conflict snapshot, clearance token issuance, safe fixture write/read-back/audit/idempotency, missing snapshot block, denied/review fail-closed probes, and clean browser network/console. No direct Matter creation, production approval, external receipt, or raw conflict memo exposure claim is made. Current counts after these rows: PASS 105, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 47, FAIL 35, UNKNOWN 0. Next `LCX8-ALL-14` rows: `LCX8-ACTION-0121..0128`.
- 2026-06-28: `LCX8-ACTION-0121..0128` moved from `BLOCKED` to `PASS` with `LCX8-ALL-14` Client account/contact/merge proof. Browser/API proof covered account/contact create, patch, record-action, merge review, synthetic-approved merge execute, safe fixture write/read-back/audit/idempotency, validation blocks, denied/review fail-closed probes, rollback metadata, and clean browser network/console. No direct Matter creation, real owner approval, production merge approval, external receipt, or raw registration/contact/email/fingerprint exposure claim is made. Current counts after these rows: PASS 113, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 39, FAIL 35, UNKNOWN 0. Next `LCX8-ALL-14` rows are complete; next unresolved Lane B client write area starts after Client CRM block.

- 2026-06-28: `LCX8-ACTION-0129..0134` remain `BLOCKED` / Lane D with `LCX8-ALL-21` Client Data Cloud guarded provider/owner proof. Browser/API proof PASS 13/13 captured provider request, consent confirmation, enrichment preview, execute confirmation, identity candidates, and segment activation controls; responses included write audit events/read-back, denied/review fail-closed guards, no data-cloud 4xx/5xx, no console errors, and no provider payload/raw identifier/production-ready claim. Counts unchanged: PASS 113, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 39, FAIL 35, UNKNOWN 0. No external provider/owner receipt is claimed.

- 2026-06-28: `LCX8-ACTION-0201/0202/0203/0204/0208/0209/0210/0215/0216/0217` promoted from `BLOCKED` / Lane B to `PASS` / resolved with `LCX8-ALL-26` People HRX write proof. Browser/API proof PASS 13/13 captured safe synthetic writes, read-back/response-bound proof, HRX audit events, denied scope guards, no page errors, and no unexpected console errors. Counts: PASS 161, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 26, FAIL 0, UNKNOWN 0. No external provider, payroll/tax calculation, payment, final people decision, production-ready, or go-live claim.

- 2026-06-28: `LCX8-ACTION-0307/0308/0309/0311/0312/0313` promoted from `BLOCKED` / Lane B to `PASS` / resolved with `LCX8-ALL-27` Matter team/finance/analytics proof. Browser/API proof PASS 11/11 captured safe synthetic writes, read-back/response-bound proof, audit events, denied guards, no page errors, and no unexpected console errors. `LCX8-ACTION-0310` remains `BLOCKED` / Lane D as a local payment prerequisite without external banking receipt. Counts: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0. No external provider, banking receipt, payment execution, production-ready, or go-live claim.

- 2026-06-28: `LCX8-ACTION-0247/0256/0257/0261` remain `BLOCKED` / Lane B with `LCX8-ALL-28` desktop native bridge blocker proof. File bridge suite PASS 17/17 plus validators PASS; desktop smoke PASS 59/59. Source proof confirms active shell loads `session.cjs` and exposes `matterSession` only; `fileBridge.js`/`materFileBridge` and temp preview manager are implemented/tested but not loaded or registered by the active product shell. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

- 2026-06-28: `LCX8-ACTION-0272..0280/0323` remain `GUARDED` with `LCX8-ALL-29` web guarded final-state proof. Browser/API proof PASS 12/12 captured Client/Matter/Vault/People denied/review guard copy, mutation affordance enabled count 0, protected token leak 0, API 5xx count 0, and HRX audit step-up direct API plus retry challenge UI. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

- 2026-06-28: `LCX8-ACTION-0148/0152..0163` remain `UI_ONLY` with `LCX8-ALL-30` People sidebar current-UI final classification proof. Browser proof captured current visible People sidebar group/routes, hash routing into PeopleHome, active sidebar state, no API writes, no API 5xx, and product-label reconciliation. Deferred separate current-product reconciliation rows: LCX8-ACTION-0146, LCX8-ACTION-0147, LCX8-ACTION-0149, LCX8-ACTION-0150, LCX8-ACTION-0151. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

- 2026-06-28: `LCX8-ACTION-0184/0187..0193/0198..0200/0205..0207/0211..0214` remain `UI_ONLY` with `LCX8-ALL-31` People HRX local-fields final classification proof. Browser proof captured workforce org/status/search local state and leave/policy/payroll form state without submit/API write; current-product label reconciliations captured. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

- 2026-06-28: `LCX8-ACTION-0248/0249` remain `UI_ONLY` with `LCX8-ALL-32` desktop renderer login-fields final classification proof. Browser proof captured email/password field local state without submit/API write/native bridge call; password raw value was not recorded. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

- 2026-06-28: `LCX8-ACTION-0245/0246/0258..0271` retain `GUARDED`/`BLOCKED` with `LCX8-ALL-33` desktop native residual final classification proof. Source/test proof captured origin guards, file bridge guards, temp preview cleanup, deep-link guards, notification route-intent guard, update signature/public channel guard; packaged OS/runtime receipts remain missing for blocked rows. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

- 2026-06-28: `LCX8-ACTION-0062/0281/0318/0322` retain `BLOCKED`/`DESCRIPTOR_ONLY` with `LCX8-ALL-34` final blocker/descriptor classification proof. API tests PASS 191/191. Matter write rows remain BLOCKED pending owner/approval write/read-back/audit receipts; Profile/Vault unavailable states remain DESCRIPTOR_ONLY pending runtime/provider integration. Counts unchanged: PASS 167, GUARDED 20, UI_ONLY 115, DESCRIPTOR_ONLY 2, BLOCKED 20, FAIL 0, UNKNOWN 0.

## LazyCodex Execution Rules

1. Run batches by row ID, not by vague feature area. A row can move status only when its evidence bundle names that row.
2. `PASS` requires runtime proof at the row trace depth: UI click, route/API/native bridge call, success response, read-back or reload proof when persistent, and audit proof when the action writes or touches trust state.
3. `UI_ONLY` can be a final state, but only after click/focus/route proof shows it is honestly local and does not imply a write/provider/API operation.
4. `GUARDED` can be a final state, but only after denied/review/step-up/provider-unavailable behavior fails closed in UI and API/native surfaces.
5. Lane D rows do not become `PASS` from local tests alone. They need external, owner, provider, payment, signed update, OS route, or approved execution receipts.
6. Lane C rows remain `DESCRIPTOR_ONLY` unless a real runtime path is implemented and proven. Copy must not imply availability before that.
7. Keep `unknown = 0`. If a new visible action appears while editing, add it to the ledger before closing the batch.
8. After UI or copy changes, run AI slop review and rendered/browser QA; sloplint does not replace visual inspection.

## Recommended Run Order

Run the operational remediation batches first because they can reduce `BLOCKED` and `FAIL`. Then close `UI_ONLY` and `GUARDED` classification batches so the final ledger is fully reconciled.

| Order | Batch | Lane | Rows | Purpose |
| ---: | --- | --- | ---: | --- |
| 1 | LCX8-ALL-00 | Control | 0 | Ledger Freeze And Non-PASS Coverage Gate |
| 2 | LCX8-ALL-11 | Lane B | 5 | Matter Timeline Calendar Channel Writes |
| 3 | LCX8-ALL-12 | Lane B | 7 | Matter Opening Team Billing Analytics Writes |
| 4 | LCX8-ALL-13 | Lane B | 5 | Matter Import Safe Write Proof |
| 5 | LCX8-ALL-14 | Lane B | 13 | Client Record CRM Intake Writes |
| 6 | LCX8-ALL-15 | Lane B | 11 | Client Reports And Import Safe Writes |
| 7 | LCX8-ALL-16 | Lane B | 17 | People HRX Transaction Writes |
| 8 | LCX8-ALL-10 | Lane B | 32 | Cross-Surface Read Refresh And Selection Proof |
| 9 | LCX8-ALL-01 | Lane A | 19 | Shell Utility And Placeholder Button Cleanup |
| 10 | LCX8-ALL-02 | Lane A | 7 | Panel Overflow Menu Cleanup |
| 11 | LCX8-ALL-03 | Lane A | 8 | People Workforce Dead-Control Cleanup |
| 12 | LCX8-ALL-04 | Lane A | 8 | Profile Route And Action Card Cleanup |
| 13 | LCX8-ALL-17 | Lane B | 4 | Desktop Runtime And File Bridge Proof |
| 14 | LCX8-ALL-20 | Lane D | 5 | Matter External Owner Provider Receipts |
| 15 | LCX8-ALL-21 | Lane D | 6 | Client Data Cloud External Receipts |
| 16 | LCX8-ALL-22 | Lane D | 5 | Desktop Deep Link Notification Update Receipts |
| 17 | LCX8-ALL-30 | Lane C | 2 | Descriptor-Only Runtime Decisions |
| 18 | LCX8-ALL-40 | Classification Closure | 34 | Auth And Home UI-Only Finalization |
| 19 | LCX8-ALL-41 | Classification Closure | 51 | Client Matter Vault UI-Only Finalization |
| 20 | LCX8-ALL-42 | Classification Closure | 41 | People Profile UI-Only Finalization |
| 21 | LCX8-ALL-43 | Classification Closure | 2 | Desktop Renderer UI-Only Finalization |
| 22 | LCX8-ALL-50 | Guarded Closure | 10 | Desktop Guarded Invariant Revalidation |
| 23 | LCX8-ALL-51 | Guarded Closure | 10 | Product Guarded State Revalidation |
| 24 | LCX8-ALL-90 | Closeout | 0 | All Remaining Reconciliation Gate |

## Batch Details

### LCX8-ALL-00 - Ledger Freeze And Non-PASS Coverage Gate

- Lane: Control
- Rows: control rows only
- Objective: Start every LazyCodex run from the complete non-PASS snapshot, not only the remediation subset.
- Acceptance:
  - Record branch, HEAD, dirty tree, API/web server ports, and safe fixture IDs before edits.
  - Confirm `unknown` remains `0` and this plan assigns every non-PASS row exactly once.
  - Do not stage or modify unrelated files, including the existing untracked prototype under `docs/ui-reference/prototypes/`.
- Evidence:
  - git status
  - non-PASS ledger coverage check
  - changed-file list

### LCX8-ALL-11 - Matter Timeline Calendar Channel Writes

- Lane: Lane B
- Rows: LCX8-ACTION-0074, LCX8-ACTION-0075, LCX8-ACTION-0076, LCX8-ACTION-0077, LCX8-ACTION-0078
- Row labels: LCX8-ACTION-0074 상태 저장; LCX8-ACTION-0075 일정 추가; LCX8-ACTION-0076 변경 요청; LCX8-ACTION-0077 확인; LCX8-ACTION-0078 메시지 기록
- Objective: Continue the Matter write proof sequence after `LCX8-ACTION-0073` by proving activity update, calendar/deadline mutations, and channel message creation.
- Acceptance:
  - Each write has API route coverage, focused API test coverage, browser-click proof, read-back/reload proof, and audit event proof.
  - Denied/review/step-up paths fail closed where the route touches guarded Matter state.
  - Ledger rows promote only after evidence file names are attached and counts are regenerated.
- Evidence:
  - new `lcx8-action-0074-*` through `lcx8-action-0078-*` proof artifacts
  - `npm run api:test` focused subset when available
  - `npm run ui:live:verify`

### LCX8-ALL-12 - Matter Opening Team Billing Analytics Writes

- Lane: Lane B
- Rows: LCX8-ACTION-0090, LCX8-ACTION-0307, LCX8-ACTION-0308, LCX8-ACTION-0309, LCX8-ACTION-0311, LCX8-ACTION-0312, LCX8-ACTION-0313
- Row labels: LCX8-ACTION-0090 개시; LCX8-ACTION-0307 추가 / 책임자 지정; LCX8-ACTION-0308 시간 기록; LCX8-ACTION-0309 청구 준비; LCX8-ACTION-0311 새로고침; LCX8-ACTION-0312 내보내기; LCX8-ACTION-0313 손익 갱신
- Objective: Prove safe Matter opening, team assignment, time/WIP, and analytics refresh/export/profitability writes.
- Acceptance:
  - Use synthetic safe fixtures and avoid real payment/provider execution.
  - For analytics exports, prove job/envelope creation and downloadable artifact metadata, not external delivery.
  - For billing/WIP, prove write preconditions and audit taxonomy before promotion.
- Evidence:
  - Matter opening/team/billing/analytics proof artifacts
  - API tests for each route family
  - audit event query result

### LCX8-ALL-13 - Matter Import Safe Write Proof

- Lane: Lane B
- Rows: LCX8-ACTION-0314, LCX8-ACTION-0315, LCX8-ACTION-0316, LCX8-ACTION-0317, LCX8-ACTION-0319
- Row labels: LCX8-ACTION-0314 작업 생성; LCX8-ACTION-0315 원본 준비; LCX8-ACTION-0316 매핑 저장; LCX8-ACTION-0317 검증 실행; LCX8-ACTION-0319 확인
- Objective: Prove the non-destructive Matter import lifecycle: job, source, mapping, dry-run/preview, rollback/report.
- Acceptance:
  - `execute` remains out of this batch because `LCX8-ACTION-0318` is Lane D.
  - Dry-run and preview use sanitized source fixtures and leave production-like records untouched.
  - Rollback/error-report proof is read-back/audit backed.
- Evidence:
  - import safe fixture definition
  - dry-run preview proof
  - rollback/error-report proof

### LCX8-ALL-14 - Client Record CRM Intake Writes

- Lane: Lane B
- Rows: LCX8-ACTION-0116, LCX8-ACTION-0117, LCX8-ACTION-0118, LCX8-ACTION-0119, LCX8-ACTION-0120, LCX8-ACTION-0121, LCX8-ACTION-0122, LCX8-ACTION-0123, LCX8-ACTION-0124, LCX8-ACTION-0125, LCX8-ACTION-0126, LCX8-ACTION-0127, LCX8-ACTION-0128
- Row labels: LCX8-ACTION-0116 필드 업데이트; LCX8-ACTION-0117 승인 확인; LCX8-ACTION-0118 전환; LCX8-ACTION-0119 충돌 검토; LCX8-ACTION-0120 통과 처리; LCX8-ACTION-0121 계정 생성; LCX8-ACTION-0122 계정 검토 표시; LCX8-ACTION-0123 계정 레코드 작업; LCX8-ACTION-0124 연락처 생성; LCX8-ACTION-0125 연락처 검토 표시; LCX8-ACTION-0126 연락처 레코드 작업; LCX8-ACTION-0127 검토 생성; LCX8-ACTION-0128 병합 실행
- Objective: Prove Client record actions, CRM account/contact mutations, opportunity handoff, intake conflict/clearance, and duplicate merge flow.
- Acceptance:
  - Every mutation includes safe fixture setup, precondition failure, success write, read-back/reload, and audit proof.
  - Merge execution must prove reversible/synthetic scope or remain blocked if it can mutate shared identity state unsafely.
  - Guarded Client denied/review affordance from prior work must remain intact.
- Evidence:
  - Client record/CRM/intake proof artifacts
  - permission denied receipts
  - browser QA screenshots/logs

### LCX8-ALL-15 - Client Reports And Import Safe Writes

- Lane: Lane B
- Rows: LCX8-ACTION-0135, LCX8-ACTION-0136, LCX8-ACTION-0137, LCX8-ACTION-0138, LCX8-ACTION-0139, LCX8-ACTION-0140, LCX8-ACTION-0141, LCX8-ACTION-0142, LCX8-ACTION-0143, LCX8-ACTION-0144, LCX8-ACTION-0145
- Row labels: LCX8-ACTION-0135 보고서 생성; LCX8-ACTION-0136 보고서 조정; LCX8-ACTION-0137 Client 손익 새로고침; LCX8-ACTION-0138 보고서 실행; LCX8-ACTION-0139 공유 요청; LCX8-ACTION-0140 작업 생성; LCX8-ACTION-0141 원본 준비; LCX8-ACTION-0142 매핑 저장; LCX8-ACTION-0143 검증 실행; LCX8-ACTION-0144 실행 요청; LCX8-ACTION-0145 확인
- Objective: Prove report definition/run/share and Client import lifecycle including execute only when fixture isolation is demonstrated.
- Acceptance:
  - Report run/share produces internal receipt only; do not imply external delivery unless a provider receipt exists.
  - Import execute must be scoped to sanitized fixtures and prove rollback/error-report boundaries.
  - Rows stay `BLOCKED` where destructive import execution cannot be safely isolated.
- Evidence:
  - report proof artifacts
  - client import proof artifacts
  - safe fixture and rollback receipts

### LCX8-ALL-16 - People HRX Transaction Writes

- Lane: Lane B
- Rows: LCX8-ACTION-0201, LCX8-ACTION-0202, LCX8-ACTION-0203, LCX8-ACTION-0204, LCX8-ACTION-0208, LCX8-ACTION-0209, LCX8-ACTION-0210, LCX8-ACTION-0215, LCX8-ACTION-0216, LCX8-ACTION-0217, LCX8-ACTION-0220, LCX8-ACTION-0221, LCX8-ACTION-0222, LCX8-ACTION-0223, LCX8-ACTION-0224, LCX8-ACTION-0225, LCX8-ACTION-0226
- Row labels: LCX8-ACTION-0201 신청; LCX8-ACTION-0202 반려; LCX8-ACTION-0203 승인; LCX8-ACTION-0204 다음 단계; LCX8-ACTION-0208 정책 버전 생성; LCX8-ACTION-0209 문의; LCX8-ACTION-0210 검토; LCX8-ACTION-0215 미리보기 생성; LCX8-ACTION-0216 검토 승인 기록; LCX8-ACTION-0217 내보내기 파일 생성; LCX8-ACTION-0220 세트 요청; LCX8-ACTION-0221 변경 요청; LCX8-ACTION-0222 배정 요청; LCX8-ACTION-0223 회수 요청; LCX8-ACTION-0224 정책 변경; LCX8-ACTION-0225 연결 요청; LCX8-ACTION-0226 중지 요청
- Objective: Prove HRX leave, approvals, recruiting, policy, AI assistant/review, payroll, permission/admin, object-manager, and connected-app mutations.
- Acceptance:
  - HRX header, step-up, permission, and audit expectations are checked before success writes.
  - Payroll export proves internal artifact creation only; external payroll transmission remains out of scope unless a receipt exists.
  - AI assistant/review proof must preserve fail-closed review queue behavior and error taxonomy.
- Evidence:
  - HRX focused API tests
  - HRX audit receipts
  - browser QA for each HRX surface

### LCX8-ALL-10 - Cross-Surface Read Refresh And Selection Proof

- Lane: Lane B
- Rows: LCX8-ACTION-0036, LCX8-ACTION-0044, LCX8-ACTION-0064, LCX8-ACTION-0093, LCX8-ACTION-0095, LCX8-ACTION-0096, LCX8-ACTION-0097, LCX8-ACTION-0098, LCX8-ACTION-0099, LCX8-ACTION-0100, LCX8-ACTION-0101, LCX8-ACTION-0102, LCX8-ACTION-0114, LCX8-ACTION-0166, LCX8-ACTION-0167, LCX8-ACTION-0168, LCX8-ACTION-0169, LCX8-ACTION-0170, LCX8-ACTION-0171, LCX8-ACTION-0172, LCX8-ACTION-0173, LCX8-ACTION-0174, LCX8-ACTION-0175, LCX8-ACTION-0176, LCX8-ACTION-0177, LCX8-ACTION-0178, LCX8-ACTION-0179, LCX8-ACTION-0180, LCX8-ACTION-0181, LCX8-ACTION-0197, LCX8-ACTION-0218, LCX8-ACTION-0219
- Row labels: LCX8-ACTION-0036 새로고침; LCX8-ACTION-0044 새로고침; LCX8-ACTION-0064 새로고침; LCX8-ACTION-0093 새로고침; LCX8-ACTION-0095 이름, 역할, 조직 검색; LCX8-ACTION-0096 전체; LCX8-ACTION-0097 내부 변호사; LCX8-ACTION-0098 Client; LCX8-ACTION-0099 상대 대리인; LCX8-ACTION-0100 전문가; LCX8-ACTION-0101 규제기관; LCX8-ACTION-0102 Legal person row; LCX8-ACTION-0114 새로고침; LCX8-ACTION-0166 이름, 역할, 조직 검색; LCX8-ACTION-0167 전체; LCX8-ACTION-0168 내부 변호사; LCX8-ACTION-0169 Client; LCX8-ACTION-0170 상대 대리인; LCX8-ACTION-0171 전문가; LCX8-ACTION-0172 규제기관; LCX8-ACTION-0173 Legal person row; LCX8-ACTION-0174 이름, 역할, 조직 검색; LCX8-ACTION-0175 전체; LCX8-ACTION-0176 내부 변호사; LCX8-ACTION-0177 Client; LCX8-ACTION-0178 상대 대리인; LCX8-ACTION-0179 전문가; LCX8-ACTION-0180 규제기관; LCX8-ACTION-0181 Legal person row; LCX8-ACTION-0197 Employee list row; LCX8-ACTION-0218 Client; LCX8-ACTION-0219 Matter
- Objective: Prove API-backed read refresh, search/filter tabs, row selection, and admin read panels across Home, Matter, Client, People, and HRX admin.
- Acceptance:
  - Each row has browser action proof plus network evidence that expected GET routes refire or detail panels update.
  - Read-only rows can promote with API response proof, browser state proof, and no write/audit requirement unless the API writes telemetry.
  - Refresh rows must prove stale-to-fresh behavior or repeated request issuance with response reconciliation.
- Evidence:
  - console/network ledger
  - `npm run ui:live:verify`
  - browser click QA artifacts

### LCX8-ALL-01 - Shell Utility And Placeholder Button Cleanup

- Lane: Lane A
- Rows: LCX8-ACTION-0004, LCX8-ACTION-0005, LCX8-ACTION-0017, LCX8-ACTION-0027, LCX8-ACTION-0028, LCX8-ACTION-0032, LCX8-ACTION-0033, LCX8-ACTION-0112, LCX8-ACTION-0113, LCX8-ACTION-0164, LCX8-ACTION-0165, LCX8-ACTION-0237, LCX8-ACTION-0238, LCX8-ACTION-0239, LCX8-ACTION-0240, LCX8-ACTION-0296, LCX8-ACTION-0297, LCX8-ACTION-0301, LCX8-ACTION-0302
- Row labels: LCX8-ACTION-0004 Remember me; LCX8-ACTION-0005 Forgot password?; LCX8-ACTION-0017 도움말; LCX8-ACTION-0027 모두 읽음 처리; LCX8-ACTION-0028 알림 설정; LCX8-ACTION-0032 작업공간 설정; LCX8-ACTION-0033 태그 관리; LCX8-ACTION-0112 Client 설정; LCX8-ACTION-0113 태그 관리; LCX8-ACTION-0164 People 설정; LCX8-ACTION-0165 권한 정책; LCX8-ACTION-0237 초대 관리; LCX8-ACTION-0238 커뮤니티; LCX8-ACTION-0239 도움말 및 피드백; LCX8-ACTION-0240 계약 생성; LCX8-ACTION-0296 Matter 설정; LCX8-ACTION-0297 태그 관리; LCX8-ACTION-0301 Vault 설정; LCX8-ACTION-0302 문서 태그
- Objective: Remove false affordance from visible shell utilities and placeholder actions, or wire them to real route/modal behavior.
- Acceptance:
  - Every visible control either performs a real action, opens a real guarded destination, or is rendered disabled/hidden with honest affordance.
  - Keyboard/focus behavior remains stable; no unlabeled icon buttons are introduced.
  - Rows become `PASS`, `GUARDED`, or `UI_ONLY`; no `FAIL` remains for no-op controls.
- Evidence:
  - source trace
  - browser click proof
  - mobile overflow/focus smoke

### LCX8-ALL-02 - Panel Overflow Menu Cleanup

- Lane: Lane A
- Rows: LCX8-ACTION-0050, LCX8-ACTION-0092, LCX8-ACTION-0094, LCX8-ACTION-0115, LCX8-ACTION-0182, LCX8-ACTION-0320, LCX8-ACTION-0321
- Row labels: LCX8-ACTION-0050 Matter panel overflow menu; LCX8-ACTION-0092 Vault panel overflow menu; LCX8-ACTION-0094 Legal People panel overflow menu; LCX8-ACTION-0115 Client panel overflow menu; LCX8-ACTION-0182 HRX panel overflow menu; LCX8-ACTION-0320 Vault detail panel overflow menus; LCX8-ACTION-0321 Vault email panel overflow menu
- Objective: Resolve unlabeled/unwired overflow icons in Matter, Vault, Client, Legal People, and HRX panels.
- Acceptance:
  - Overflow icons have an accessible name and a real menu, or the icon is removed/disabled until the menu exists.
  - Menus use existing local menu patterns rather than inventing a new menu system.
  - Browser QA confirms click, keyboard focus, escape/close, and no layout overlap.
- Evidence:
  - P7 visual/focus artifact
  - browser screenshots/logs
  - sloplint result if copy changes
  - docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0050-0092-0094-0115-0182-0320-0321-panel-overflow-removal-proof.json
  - docs/lazycodex/evidence/matter-web/artifacts/lcx8-post-closeout-panel-overflow-removal-2026-06-27.json

### LCX8-ALL-03 - People Workforce Dead-Control Cleanup

- Lane: Lane A
- Rows: LCX8-ACTION-0183, LCX8-ACTION-0185, LCX8-ACTION-0186, LCX8-ACTION-0192, LCX8-ACTION-0194, LCX8-ACTION-0195, LCX8-ACTION-0196, LCX8-ACTION-0324
- Row labels: LCX8-ACTION-0183 더보기; LCX8-ACTION-0185 구성원 추가; LCX8-ACTION-0186 추가 메뉴; LCX8-ACTION-0192 표 보기 옵션; LCX8-ACTION-0194 속성 조정; LCX8-ACTION-0195 Workforce employee row; LCX8-ACTION-0196 Lifecycle onboarding row; LCX8-ACTION-0324 People header refresh on standalone HRX panels
- Objective: Fix Workforce roster controls, row selection, lifecycle row behavior, and standalone HRX panel refresh propagation.
- Acceptance:
  - Roster controls either open real views/menus or are removed/disabled.
  - Row selection shows a real selected employee/detail state or stops presenting as selectable.
  - People header refresh reaches active HRX panel data source, or the UI makes the limitation explicit.
- Evidence:
  - source trace
  - People browser QA
  - network refresh proof

### LCX8-ALL-04 - Profile Route And Action Card Cleanup

- Lane: Lane A
- Rows: LCX8-ACTION-0034, LCX8-ACTION-0233, LCX8-ACTION-0234, LCX8-ACTION-0235, LCX8-ACTION-0236, LCX8-ACTION-0241, LCX8-ACTION-0242, LCX8-ACTION-0243
- Row labels: LCX8-ACTION-0034 Home workspace menu; LCX8-ACTION-0233 비용 관리; LCX8-ACTION-0234 정산 내역; LCX8-ACTION-0235 지급 설정; LCX8-ACTION-0236 입금 계좌; LCX8-ACTION-0241 비용·정산 내역; LCX8-ACTION-0242 개인정보 관리; LCX8-ACTION-0243 부재 일정
- Objective: Resolve profile/sidebar/card actions that route nowhere or imply unavailable profile subsystems.
- Acceptance:
  - Unavailable profile sections are hidden, disabled, or routed to an honest unavailable state.
  - Action cards no longer imply operational expense/privacy/absence workflows unless those screens exist.
  - Ledger classification distinguishes route-only UI behavior from runtime-backed operations.
- Evidence:
  - route navigation proof
  - copy review
  - mobile screenshot

### LCX8-ALL-17 - Desktop Runtime And File Bridge Proof

- Lane: Lane B
- Rows: LCX8-ACTION-0247, LCX8-ACTION-0256, LCX8-ACTION-0257, LCX8-ACTION-0261
- Row labels: LCX8-ACTION-0247 materRuntime.context; LCX8-ACTION-0256 Choose file for upload; LCX8-ACTION-0257 Save document as; LCX8-ACTION-0261 Open temp preview
- Objective: Prove or explicitly reclassify active desktop runtime context and file bridge actions.
- Acceptance:
  - `materRuntime.context` is exposed by the active preload path or remains blocked with exact runtime boundary evidence.
  - Upload picker, save-as, and temp preview run through active shell IPC/preload registration, not inactive source files.
  - Desktop smoke and file bridge tests pass before promotion.
- Evidence:
  - `npm --workspace apps/desktop run test:smoke`
  - `npm --workspace apps/desktop run test:file-bridge`
  - desktop screen QA

### LCX8-ALL-20 - Matter External Owner Provider Receipts

- Lane: Lane D
- Rows: LCX8-ACTION-0062, LCX8-ACTION-0072, LCX8-ACTION-0079, LCX8-ACTION-0310, LCX8-ACTION-0318
- Row labels: LCX8-ACTION-0062 승인 확인; LCX8-ACTION-0072 발송 요청; LCX8-ACTION-0079 상태 확인; LCX8-ACTION-0310 수납 기록; LCX8-ACTION-0318 실행 요청
- Objective: Collect or preserve external/owner/provider boundaries for Matter owner approval, email send, channel provider sync, payment import, and import execute.
- Acceptance:
  - Rows do not promote to `PASS` without external/owner/provider receipts and safe execution authorization.
  - If local UI correctly blocks the action, classify as `GUARDED` with clear copy and evidence.
  - If execution remains outside repo authority, keep `BLOCKED/Lane D` and attach the missing receipt list.
- Evidence:
  - external receipt ledger
  - owner approval receipt
  - provider callback/payment/import receipt or blocker note

### LCX8-ALL-21 - Client Data Cloud External Receipts

- Lane: Lane D
- Rows: LCX8-ACTION-0129, LCX8-ACTION-0130, LCX8-ACTION-0131, LCX8-ACTION-0132, LCX8-ACTION-0133, LCX8-ACTION-0134
- Row labels: LCX8-ACTION-0129 연동 요청; LCX8-ACTION-0130 승인 확인; LCX8-ACTION-0131 미리보기; LCX8-ACTION-0132 실행 확인; LCX8-ACTION-0133 후보 생성; LCX8-ACTION-0134 활성화 확인
- Objective: Resolve Data Cloud provider, consent, enrichment, identity resolution, and segment activation rows against external-receipt boundaries.
- Acceptance:
  - Provider/consent/enrichment/activation actions have external receipt proof before `PASS`.
  - Preview-only behavior can be classified separately from execute/activation behavior.
  - External provider unavailable states must not present as completed operations.
- Evidence:
  - provider receipt ledger
  - consent/audit receipt
  - preview vs execute proof split

### LCX8-ALL-22 - Desktop Deep Link Notification Update Receipts

- Lane: Lane D
- Rows: LCX8-ACTION-0263, LCX8-ACTION-0264, LCX8-ACTION-0267, LCX8-ACTION-0269, LCX8-ACTION-0270
- Row labels: LCX8-ACTION-0263 Route-only matter/document/task deep links; LCX8-ACTION-0264 Auth callback deep link; LCX8-ACTION-0267 Notification click route intent; LCX8-ACTION-0269 Signed internal update apply; LCX8-ACTION-0270 Signed internal rollback
- Objective: Prove route-only deep links, auth callbacks, notification route intents, and signed update/rollback with real active desktop runtime receipts.
- Acceptance:
  - Deep link and notification rows prove active OS/app routing, not only parser unit tests.
  - Signed update/rollback rows require signed internal update channel evidence or remain blocked.
  - No public release/update claim is made from local parser tests alone.
- Evidence:
  - desktop route receipt
  - notification click receipt
  - signed update/rollback receipt or blocker

### LCX8-ALL-30 - Descriptor-Only Runtime Decisions

- Lane: Lane C
- Rows: LCX8-ACTION-0281, LCX8-ACTION-0322
- Row labels: LCX8-ACTION-0281 Profile data unavailable state; LCX8-ACTION-0322 Vault email filing unavailable state
- Objective: Decide whether descriptor-only profile unavailable and Vault email filing unavailable states become runtime work, guarded copy, or permanent descriptors.
- Acceptance:
  - `LCX8-ACTION-0281` remains descriptor-only unless a profile runtime/data source is implemented and proven.
  - `LCX8-ACTION-0322` remains descriptor/external unless provider-backed email filing submit path and receipt exist.
  - Visible copy must not imply operational availability when only descriptor evidence exists.
- Evidence:
  - product decision note
  - copy/guarded-state proof
  - provider/runtime proof if implemented

### LCX8-ALL-40 - Auth And Home UI-Only Finalization

- Lane: Classification Closure
- Rows: LCX8-ACTION-0001, LCX8-ACTION-0002, LCX8-ACTION-0003, LCX8-ACTION-0006, LCX8-ACTION-0007, LCX8-ACTION-0008, LCX8-ACTION-0009, LCX8-ACTION-0010, LCX8-ACTION-0011, LCX8-ACTION-0012, LCX8-ACTION-0013, LCX8-ACTION-0014, LCX8-ACTION-0015, LCX8-ACTION-0016, LCX8-ACTION-0018, LCX8-ACTION-0019, LCX8-ACTION-0020, LCX8-ACTION-0021, LCX8-ACTION-0022, LCX8-ACTION-0023, LCX8-ACTION-0024, LCX8-ACTION-0025, LCX8-ACTION-0026, LCX8-ACTION-0029, LCX8-ACTION-0030, LCX8-ACTION-0031, LCX8-ACTION-0035, LCX8-ACTION-0037, LCX8-ACTION-0038, LCX8-ACTION-0039, LCX8-ACTION-0040, LCX8-ACTION-0041, LCX8-ACTION-0042, LCX8-ACTION-0043
- Row labels: LCX8-ACTION-0001 Sign up now; LCX8-ACTION-0002 Email; LCX8-ACTION-0003 Password; LCX8-ACTION-0006 Log in; LCX8-ACTION-0007 Home; LCX8-ACTION-0008 Client; LCX8-ACTION-0009 Matter; LCX8-ACTION-0010 People; LCX8-ACTION-0011 Vault; LCX8-ACTION-0012 검색; LCX8-ACTION-0013 새로 만들기; LCX8-ACTION-0014 합류코드 전송; LCX8-ACTION-0015 내 프로필; LCX8-ACTION-0016 알림; LCX8-ACTION-0018 테마; LCX8-ACTION-0019 한국어; LCX8-ACTION-0020 검색 닫기; LCX8-ACTION-0021 홈에서 검색; LCX8-ACTION-0022 Client에서 검색; LCX8-ACTION-0023 Matter에서 검색; LCX8-ACTION-0024 People에서 검색; LCX8-ACTION-0025 Vault에서 검색; LCX8-ACTION-0026 알림 닫기; LCX8-ACTION-0029 최근 작업; LCX8-ACTION-0030 대시보드; LCX8-ACTION-0031 검토함; LCX8-ACTION-0035 Escape closes notification drawer; LCX8-ACTION-0037 Matter 목록; LCX8-ACTION-0038 승인·구성원 확인; LCX8-ACTION-0039 최근 문서 확인; LCX8-ACTION-0040 Client 열기; LCX8-ACTION-0041 Matter 열기; LCX8-ACTION-0042 People 열기; LCX8-ACTION-0043 Vault 열기
- Objective: Finalize local auth/home controls and navigation as honest UI-only behavior, or promote only where runtime proof is added.
- Acceptance:
  - Each row has browser click/focus proof and clear `UI_ONLY` rationale.
  - Navigation rows land on the expected route/state without claiming API/write behavior.
  - Search, drawer, theme, language, notification, and modal controls do not overlap or trap focus incorrectly.
- Evidence:
  - P3 browser QA
  - P7 screenshot/focus notes
  - full row assignment table

### LCX8-ALL-41 - Client Matter Vault UI-Only Finalization

- Lane: Classification Closure
- Rows: LCX8-ACTION-0045, LCX8-ACTION-0046, LCX8-ACTION-0047, LCX8-ACTION-0048, LCX8-ACTION-0049, LCX8-ACTION-0051, LCX8-ACTION-0052, LCX8-ACTION-0053, LCX8-ACTION-0056, LCX8-ACTION-0057, LCX8-ACTION-0058, LCX8-ACTION-0080, LCX8-ACTION-0081, LCX8-ACTION-0082, LCX8-ACTION-0083, LCX8-ACTION-0084, LCX8-ACTION-0085, LCX8-ACTION-0086, LCX8-ACTION-0087, LCX8-ACTION-0088, LCX8-ACTION-0089, LCX8-ACTION-0103, LCX8-ACTION-0104, LCX8-ACTION-0105, LCX8-ACTION-0106, LCX8-ACTION-0107, LCX8-ACTION-0108, LCX8-ACTION-0109, LCX8-ACTION-0110, LCX8-ACTION-0111, LCX8-ACTION-0282, LCX8-ACTION-0283, LCX8-ACTION-0284, LCX8-ACTION-0285, LCX8-ACTION-0286, LCX8-ACTION-0287, LCX8-ACTION-0288, LCX8-ACTION-0289, LCX8-ACTION-0290, LCX8-ACTION-0291, LCX8-ACTION-0292, LCX8-ACTION-0293, LCX8-ACTION-0294, LCX8-ACTION-0295, LCX8-ACTION-0298, LCX8-ACTION-0299, LCX8-ACTION-0300, LCX8-ACTION-0303, LCX8-ACTION-0304, LCX8-ACTION-0305, LCX8-ACTION-0306
- Row labels: LCX8-ACTION-0045 현황; LCX8-ACTION-0046 문서; LCX8-ACTION-0047 활동; LCX8-ACTION-0048 일정; LCX8-ACTION-0049 대화; LCX8-ACTION-0051 전체 Matter; LCX8-ACTION-0052 개시 중; LCX8-ACTION-0053 종료; LCX8-ACTION-0056 표시된 Matter 전체 선택; LCX8-ACTION-0057 Matter row 선택 체크박스; LCX8-ACTION-0058 Matter record row; LCX8-ACTION-0080 Matter 등록번호; LCX8-ACTION-0081 제목; LCX8-ACTION-0082 Matter 번호; LCX8-ACTION-0083 법률 Client; LCX8-ACTION-0084 청구 Client; LCX8-ACTION-0085 이해상충 확인 번호; LCX8-ACTION-0086 접수 번호; LCX8-ACTION-0087 검토 번호; LCX8-ACTION-0088 위임 계약 번호; LCX8-ACTION-0089 확인 번호; LCX8-ACTION-0103 Client 목록; LCX8-ACTION-0104 잠재 고객; LCX8-ACTION-0105 영업 기회; LCX8-ACTION-0106 상담 접수; LCX8-ACTION-0107 계정; LCX8-ACTION-0108 연락처; LCX8-ACTION-0109 데이터 관리; LCX8-ACTION-0110 보고서; LCX8-ACTION-0111 가져오기; LCX8-ACTION-0282 Matter 운영; LCX8-ACTION-0283 Matter 목록; LCX8-ACTION-0284 진행 현황; LCX8-ACTION-0285 Matter 개시; LCX8-ACTION-0286 업무 진행; LCX8-ACTION-0287 문서; LCX8-ACTION-0288 활동; LCX8-ACTION-0289 일정; LCX8-ACTION-0290 대화; LCX8-ACTION-0291 구성원; LCX8-ACTION-0292 청구·분석; LCX8-ACTION-0293 청구; LCX8-ACTION-0294 분석; LCX8-ACTION-0295 자료 가져오기; LCX8-ACTION-0298 문서함; LCX8-ACTION-0299 문서 상세; LCX8-ACTION-0300 메일 보관함; LCX8-ACTION-0303 팀원 번호; LCX8-ACTION-0304 구성원 계정; LCX8-ACTION-0305 로그인 계정; LCX8-ACTION-0306 역할
- Objective: Finalize Client, Matter, and Vault local tabs, panel toggles, filters, route-only controls, and local affordances.
- Acceptance:
  - Every row is re-clicked or covered by a representative grouped browser proof.
  - Local UI state is visibly changed, route-only navigation is explicit, and no API/write claim is made.
  - Rows that should be operational instead of local-only are moved to the matching Lane B/D batch before closeout.
- Evidence:
  - P3 Client/Matter/Vault click QA
  - mobile overflow smoke
  - ledger classification note

### LCX8-ALL-42 - People Profile UI-Only Finalization

- Lane: Classification Closure
- Rows: LCX8-ACTION-0146, LCX8-ACTION-0147, LCX8-ACTION-0148, LCX8-ACTION-0149, LCX8-ACTION-0150, LCX8-ACTION-0151, LCX8-ACTION-0152, LCX8-ACTION-0153, LCX8-ACTION-0154, LCX8-ACTION-0155, LCX8-ACTION-0156, LCX8-ACTION-0157, LCX8-ACTION-0158, LCX8-ACTION-0159, LCX8-ACTION-0160, LCX8-ACTION-0161, LCX8-ACTION-0162, LCX8-ACTION-0163, LCX8-ACTION-0184, LCX8-ACTION-0187, LCX8-ACTION-0188, LCX8-ACTION-0189, LCX8-ACTION-0190, LCX8-ACTION-0191, LCX8-ACTION-0193, LCX8-ACTION-0198, LCX8-ACTION-0199, LCX8-ACTION-0200, LCX8-ACTION-0205, LCX8-ACTION-0206, LCX8-ACTION-0207, LCX8-ACTION-0211, LCX8-ACTION-0212, LCX8-ACTION-0213, LCX8-ACTION-0214, LCX8-ACTION-0227, LCX8-ACTION-0228, LCX8-ACTION-0229, LCX8-ACTION-0230, LCX8-ACTION-0231, LCX8-ACTION-0232
- Row labels: LCX8-ACTION-0146 법률 People; LCX8-ACTION-0147 구성원 운영; LCX8-ACTION-0148 관리; LCX8-ACTION-0149 디렉터리; LCX8-ACTION-0150 관계망; LCX8-ACTION-0151 충돌·윤리벽; LCX8-ACTION-0152 구성원; LCX8-ACTION-0153 조직도; LCX8-ACTION-0154 휴가; LCX8-ACTION-0155 승인; LCX8-ACTION-0156 입사·퇴사; LCX8-ACTION-0157 채용; LCX8-ACTION-0158 인사 문서; LCX8-ACTION-0159 인사 정책; LCX8-ACTION-0160 활동 기록; LCX8-ACTION-0161 권한 관리; LCX8-ACTION-0162 급여 정산; LCX8-ACTION-0163 인사 현황; LCX8-ACTION-0184 조직도; LCX8-ACTION-0187 재직; LCX8-ACTION-0188 입사 예정; LCX8-ACTION-0189 퇴사 예정; LCX8-ACTION-0190 종료; LCX8-ACTION-0191 외부 협업; LCX8-ACTION-0193 구성원 검색; LCX8-ACTION-0198 시간; LCX8-ACTION-0199 시작일; LCX8-ACTION-0200 종료일; LCX8-ACTION-0205 정책 이름; LCX8-ACTION-0206 유형; LCX8-ACTION-0207 버전; LCX8-ACTION-0211 기간; LCX8-ACTION-0212 구성원; LCX8-ACTION-0213 외부 급여 서비스; LCX8-ACTION-0214 문서 참조; LCX8-ACTION-0227 홈; LCX8-ACTION-0228 새 계약 만들기; LCX8-ACTION-0229 계약 관리; LCX8-ACTION-0230 내 프로필; LCX8-ACTION-0231 문서; LCX8-ACTION-0232 청구 관리
- Objective: Finalize People, HRX local forms/tabs, profile/sidebar route-only controls, and non-write UI-only states.
- Acceptance:
  - Every retained UI-only control has visible local state, route, or form-state behavior.
  - Controls that look like writes but only change local form state are either documented as UI-only or moved to a write proof batch.
  - Korean copy remains concrete and avoids implying unavailable HR/profile operations.
- Evidence:
  - People/Profile browser QA
  - copy/focus review
  - sloplint if copy changes

### LCX8-ALL-43 - Desktop Renderer UI-Only Finalization

- Lane: Classification Closure
- Rows: LCX8-ACTION-0248, LCX8-ACTION-0249
- Row labels: LCX8-ACTION-0248 Desktop login email; LCX8-ACTION-0249 Desktop login password
- Objective: Finalize desktop renderer UI-only rows separately from native bridge proof rows.
- Acceptance:
  - Renderer-only rows are proven in the desktop/web renderer surface.
  - No native bridge capability is claimed from renderer-only evidence.
  - Rows stay separate from file bridge/runtime Lane B rows.
- Evidence:
  - desktop screen QA
  - renderer proof note

### LCX8-ALL-50 - Desktop Guarded Invariant Revalidation

- Lane: Guarded Closure
- Rows: LCX8-ACTION-0245, LCX8-ACTION-0246, LCX8-ACTION-0258, LCX8-ACTION-0259, LCX8-ACTION-0260, LCX8-ACTION-0262, LCX8-ACTION-0265, LCX8-ACTION-0266, LCX8-ACTION-0268, LCX8-ACTION-0271
- Row labels: LCX8-ACTION-0245 Approved local dev renderer target; LCX8-ACTION-0246 Unapproved renderer/navigation/window-open; LCX8-ACTION-0258 File picker without trusted gesture; LCX8-ACTION-0259 Renderer-supplied file/document bytes; LCX8-ACTION-0260 File bridge denied permission; LCX8-ACTION-0262 Temp preview cache cleanup; LCX8-ACTION-0265 Forbidden action deep links; LCX8-ACTION-0266 Invalid deep link route/query/id; LCX8-ACTION-0268 Notification action/sensitive payload guard; LCX8-ACTION-0271 Public update channel
- Objective: Revalidate desktop guard rows that are already intended final guarded behavior.
- Acceptance:
  - Approved renderer, navigation/window-open, file gesture, byte guard, permission deny, cleanup, deep-link, notification, and public update guards fail closed.
  - Guarded rows remain `GUARDED` unless active runtime proof changes the product boundary.
  - Evidence distinguishes parser/unit proof from active desktop shell proof.
- Evidence:
  - desktop smoke/file-bridge tests
  - deep link/update tests
  - guard receipt ledger

### LCX8-ALL-51 - Product Guarded State Revalidation

- Lane: Guarded Closure
- Rows: LCX8-ACTION-0272, LCX8-ACTION-0273, LCX8-ACTION-0274, LCX8-ACTION-0275, LCX8-ACTION-0276, LCX8-ACTION-0277, LCX8-ACTION-0278, LCX8-ACTION-0279, LCX8-ACTION-0280, LCX8-ACTION-0323
- Row labels: LCX8-ACTION-0272 Client list denied state; LCX8-ACTION-0273 Client list review-required state; LCX8-ACTION-0274 Matter list denied state; LCX8-ACTION-0275 Matter list review-required state; LCX8-ACTION-0276 Vault documents denied state; LCX8-ACTION-0277 Vault documents review-required state; LCX8-ACTION-0278 Matter record action strip disabled under denied/review; LCX8-ACTION-0279 Matter Vault action strip disabled under denied/review; LCX8-ACTION-0280 People directory denied/review state; LCX8-ACTION-0323 HRX audit step-up retry
- Objective: Revalidate product denied/review/step-up guarded states across Client, Matter, Vault, People, and HRX audit.
- Acceptance:
  - Denied/review states hide or disable mutation affordances consistently.
  - Step-up retry and permission trimming fail closed with current product copy.
  - Guarded rows stay guarded unless the user explicitly wants a runtime PASS proof for a permitted actor path.
- Evidence:
  - guarded-state browser QA
  - API denied/review tests
  - P7 copy/focus notes

### LCX8-ALL-90 - All Remaining Reconciliation Gate

- Lane: Closeout
- Rows: control rows only
- Objective: Close the entire non-PASS ledger, not just the remediation subset.
- Acceptance:
  - `unknown` remains `0`; every non-PASS row has a final action: prove, guard, keep UI-only, keep descriptor-only, or block with receipt gap.
  - No stale issue text remains in the remediation backlog or final status artifacts.
  - P9 is closed as all-green only if validators pass; otherwise it is closed with named blockers and current-product verifier expectations.
- Evidence:
  - `npm run ui:flows:verify`
  - `npm run ui:live:verify`
  - `npm run api:test`
  - `npm run build`
  - `npm run web:e2e`
  - `npm --workspace apps/desktop run test:smoke`
  - `npm --workspace apps/desktop run test:file-bridge`
  - HRX/runtime/launch boundary validators as touched

## Verification Ladder

Use the relevant subset while iterating, then run the broader gate before closing a batch that changes shared UI/API behavior.

| Layer | Commands or proof |
| --- | --- |
| Source/ledger | Coverage check against `lcx8-action-ledger.json`; regenerate CSV/backlog/status artifacts when row status changes |
| UI-only closure | Browser click/focus proof, route-state proof, mobile overflow smoke, no false API/write claim |
| Guarded closure | Denied/review/step-up/provider-unavailable UI proof plus API/native fail-closed proof where applicable |
| API | `npm run api:test` or focused route tests in `apps/api`; include denied/review fail-closed tests for guarded writes |
| Web UI | `npm --workspace apps/web run test:ui`, `npm run ui:flows:verify`, `npm run ui:live:verify`, targeted browser click QA |
| Build/e2e | `npm run build`, `npm run web:e2e` |
| Desktop | `npm --workspace apps/desktop run test:smoke`, `npm --workspace apps/desktop run test:file-bridge`, `npm run matter-desktop:screen-qa` when desktop rows are touched |
| Boundary validators | HRX/runtime/launch validators only for touched trust surfaces; never use them to imply external go-live approval |

## Full Remaining Row Assignment

| Batch | Row | Status | Work category | Lane | Surface | Section | Label | Trace | API route |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LCX8-ALL-40 | LCX8-ACTION-0001 | UI_ONLY | completed final classification |  | auth | login-heading | Sign up now | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0002 | UI_ONLY | completed final classification |  | auth | login-form | Email | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0003 | UI_ONLY | completed final classification |  | auth | login-form | Password | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0004 | PASS | completed after control freeze |  | auth | login-form | Remember me | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0005 | PASS | completed after control freeze |  | auth | login-form | Forgot password? | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0006 | UI_ONLY | completed final classification |  | auth | login-form | Log in | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0007 | UI_ONLY | completed final classification |  | home | product-axis-nav | Home | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0008 | UI_ONLY | completed final classification | Lane E | home | product-axis-nav | Client | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0009 | PASS | completed after control freeze | Lane E | home | product-axis-nav | Matter | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-40 | LCX8-ACTION-0010 | UI_ONLY | completed final classification | Lane E | home | product-axis-nav | People | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0011 | UI_ONLY | completed final classification | Lane E | home | product-axis-nav | Vault | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0012 | UI_ONLY | completed final classification | Lane E | home | topbar | 검색 | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0013 | PASS | completed after control freeze |  | home | topbar | 새로 만들기 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-40 | LCX8-ACTION-0014 | UI_ONLY | completed final classification |  | home | topbar | 합류코드 전송 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0015 | UI_ONLY | completed final classification |  | home | topbar | 내 프로필 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0016 | UI_ONLY | completed final classification | Lane E | home | topbar | 알림 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0017 | PASS | completed after control freeze |  | home | topbar | 도움말 | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0018 | UI_ONLY | completed final classification |  | home | topbar | 테마 | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0019 | UI_ONLY | completed final classification |  | home | topbar | 한국어 | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0020 | UI_ONLY | completed final classification |  | home | global-search | 검색 닫기 | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0021 | UI_ONLY | completed final classification |  | home | global-search | 홈에서 검색 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0022 | UI_ONLY | completed final classification |  | home | global-search | Client에서 검색 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0023 | PASS | completed after control freeze |  | home | global-search | Matter에서 검색 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-40 | LCX8-ACTION-0024 | UI_ONLY | completed final classification |  | home | global-search | People에서 검색 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0025 | UI_ONLY | completed final classification |  | home | global-search | Vault에서 검색 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0026 | UI_ONLY | completed final classification |  | home | notification-drawer | 알림 닫기 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0027 | PASS | completed after control freeze |  | home | notification-drawer | 모두 읽음 처리 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0028 | PASS | completed after control freeze |  | home | notification-drawer | 알림 설정 | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0029 | UI_ONLY | completed final classification |  | home | sidebar | 최근 작업 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0030 | UI_ONLY | completed final classification |  | home | sidebar | 대시보드 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0031 | UI_ONLY | completed final classification |  | home | sidebar | 검토함 | route_navigation |  |
| LCX8-ALL-01 | LCX8-ACTION-0032 | PASS | completed after control freeze |  | home | sidebar-utilities | 작업공간 설정 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0033 | PASS | completed after control freeze |  | home | sidebar-utilities | 태그 관리 | ui_state_only |  |
| LCX8-ALL-04 | LCX8-ACTION-0034 | PASS | completed after control freeze |  | home | workspace-card | Home workspace menu | ui_state_only |  |
| LCX8-ALL-40 | LCX8-ACTION-0035 | UI_ONLY | completed final classification |  | home | notification-drawer | Escape closes notification drawer | ui_state_only |  |
| LCX8-ALL-10 | LCX8-ACTION-0036 | PASS | completed after control freeze |  | home | command-center-header | 새로고침 | api_read | GET /master-data/records; GET /api/crm/opportunities; GET /api/intake/requests; GET /api/portal/dashboard; GET /api/portal/rfi; GET /api/matters; GET /api/finance/time-entries; GET /api/finance/invoices; GET /api/finance/ar-aging; GET /api/analytics/dashboards; GET /api/ai/review-queue; GET /api/hrx/employees; GET /api/vault/documents; GET /api/data-room/projections |
| LCX8-ALL-40 | LCX8-ACTION-0037 | PASS | completed after control freeze |  | home | home-ops-queue | Matter 목록 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-40 | LCX8-ACTION-0038 | UI_ONLY | completed final classification |  | home | home-ops-queue | 승인·구성원 확인 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0039 | UI_ONLY | completed final classification |  | home | home-ops-queue | 최근 문서 확인 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0040 | UI_ONLY | completed final classification |  | home | home-quick-links | Client 열기 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0041 | PASS | completed after control freeze |  | home | home-quick-links | Matter 열기 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-40 | LCX8-ACTION-0042 | UI_ONLY | completed final classification |  | home | home-quick-links | People 열기 | route_navigation |  |
| LCX8-ALL-40 | LCX8-ACTION-0043 | UI_ONLY | completed final classification |  | home | home-quick-links | Vault 열기 | route_navigation |  |
| LCX8-ALL-10 | LCX8-ACTION-0044 | PASS | completed after control freeze |  | matter | matters-header | 새로고침 | api_read | GET /api/matters; GET /api/matters/list-views; GET /api/record-actions/matter/fields; GET /api/record-actions/matter/:record_id/audit; GET /api/hrx/legal-people/search?matter_id=:matter_id; GET /api/matters/:matter_id/command-center; GET /api/matters/:matter_id/timeline; GET /api/matters/audit; GET /api/matters/recently-viewed; GET /api/finance/time-entries; GET /api/finance/invoices; GET /api/finance/ar-aging; GET /api/finance/audit; GET /api/analytics/dashboards; GET /api/analytics/matter-profitability |
| LCX8-ALL-41 | LCX8-ACTION-0045 | UI_ONLY | completed final classification | Lane E | matter | matter-section-tabs | 현황 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0046 | UI_ONLY | completed final classification |  | matter | matter-section-tabs | 문서 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0047 | UI_ONLY | completed final classification |  | matter | matter-section-tabs | 활동 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0048 | UI_ONLY | completed final classification |  | matter | matter-section-tabs | 일정 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0049 | UI_ONLY | completed final classification |  | matter | matter-section-tabs | 대화 | route_navigation |  |
| LCX8-ALL-02 | LCX8-ACTION-0050 | PASS | completed after control freeze |  | matter | panel-header | Matter panel overflow menu | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0051 | UI_ONLY | completed final classification |  | matter | saved-list-views | 전체 Matter | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0052 | UI_ONLY | completed final classification |  | matter | saved-list-views | 개시 중 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0053 | UI_ONLY | completed final classification |  | matter | saved-list-views | 종료 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0056 | UI_ONLY | completed final classification |  | matter | matter-record-list | 표시된 Matter 전체 선택 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0057 | UI_ONLY | completed final classification |  | matter | matter-record-list | Matter row 선택 체크박스 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0058 | UI_ONLY | completed final classification |  | matter | matter-record-list | Matter record row | ui_state_only |  |
| LCX8-ALL-20 | LCX8-ACTION-0062 | BLOCKED | active remediation | Lane D | matter | matter-right-panel-actions | 승인 확인 | api_write | POST /api/record-actions/matter/bulk-updates |
| LCX8-ALL-10 | LCX8-ACTION-0064 | PASS | completed after control freeze |  | matter | matter-vault | 새로고침 | api_read | GET /api/matters/:matter_id/vault-summary; GET /api/matters/:matter_id/timeline; GET /api/vault/documents; GET /api/vault/search; GET /api/vault/audit; GET /api/matters/:matter_id/document-templates; GET /api/matters/:matter_id/builder-approval-requests |
| LCX8-ALL-20 | LCX8-ACTION-0072 | BLOCKED | active remediation | Lane D | matter | matter-vault | 발송 요청 | api_write | POST /api/matters/:matter_id/email-drafts/:draft_id/send |
| LCX8-ALL-11 | LCX8-ACTION-0074 | PASS | completed after control freeze |  | matter | matter-timeline | 상태 저장 | api_write | PATCH /api/matters/:matter_id/activities/:activity_id |
| LCX8-ALL-11 | LCX8-ACTION-0075 | BLOCKED | active remediation | Lane B | matter | matter-calendar | 일정 추가 | api_write | POST /api/matters/:matter_id/calendar-events |
| LCX8-ALL-11 | LCX8-ACTION-0076 | BLOCKED | active remediation | Lane B | matter | matter-calendar | 변경 요청 | api_write | PATCH /api/matters/:matter_id/calendar-events/:event_id |
| LCX8-ALL-11 | LCX8-ACTION-0077 | BLOCKED | active remediation | Lane B | matter | matter-calendar | 확인 | api_write | POST /api/matters/:matter_id/deadlines/:deadline_id/confirm-change |
| LCX8-ALL-11 | LCX8-ACTION-0078 | BLOCKED | active remediation | Lane B | matter | matter-channel | 메시지 기록 | api_write | POST /api/matters/:matter_id/channel/messages |
| LCX8-ALL-20 | LCX8-ACTION-0079 | BLOCKED | active remediation | Lane D | matter | matter-channel | 상태 확인 | api_write | POST /api/matters/:matter_id/channel/provider-sync |
| LCX8-ALL-41 | LCX8-ACTION-0080 | UI_ONLY | classification closure |  | matter | matter-opening-form | Matter 등록번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0081 | UI_ONLY | classification closure |  | matter | matter-opening-form | 제목 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0082 | UI_ONLY | classification closure |  | matter | matter-opening-form | Matter 번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0083 | UI_ONLY | classification closure |  | matter | matter-opening-form | 법률 Client | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0084 | UI_ONLY | classification closure |  | matter | matter-opening-form | 청구 Client | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0085 | UI_ONLY | classification closure |  | matter | matter-opening-form | 이해상충 확인 번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0086 | UI_ONLY | classification closure |  | matter | matter-opening-form | 접수 번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0087 | UI_ONLY | classification closure |  | matter | matter-opening-form | 검토 번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0088 | UI_ONLY | classification closure |  | matter | matter-opening-form | 위임 계약 번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0089 | UI_ONLY | classification closure |  | matter | matter-opening-form | 확인 번호 | ui_state_only |  |
| LCX8-ALL-12 | LCX8-ACTION-0090 | BLOCKED | active remediation | Lane B | matter | matter-opening-form | 개시 | api_write | POST /api/matters/openings |
| LCX8-ALL-02 | LCX8-ACTION-0092 | PASS | completed after control freeze |  | vault | vault-documents-panel | Vault panel overflow menu | ui_state_only |  |
| LCX8-ALL-10 | LCX8-ACTION-0093 | PASS | completed after control freeze |  | people-directory | people-header | 새로고침 | api_read | GET /api/hrx/employees; wired active sections also re-run GET /api/hrx/legal-people/search, GET /api/hrx/legal-people/:personId, GET /api/hrx/legal-people/relationships, GET /api/hrx/legal-people/ethics, GET /api/hrx/lifecycle/onboarding, GET /api/hrx/lifecycle/offboarding, GET /api/hrx/documents?employee_id=:employee_id, GET /api/hrx/leave?employee_id=:employee_id&policy_id=pto-us |
| LCX8-ALL-02 | LCX8-ACTION-0094 | PASS | completed after control freeze |  | people-directory | legal-people-panels | Legal People panel overflow menu | ui_state_only |  |
| LCX8-ALL-10 | LCX8-ACTION-0095 | PASS | completed after control freeze |  | people-directory | legal-people-search | 이름, 역할, 조직 검색 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0096 | PASS | completed after control freeze |  | people-directory | legal-people-type-tabs | 전체 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0097 | PASS | completed after control freeze |  | people-directory | legal-people-type-tabs | 내부 변호사 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0098 | PASS | completed after control freeze |  | people-directory | legal-people-type-tabs | Client | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0099 | PASS | completed after control freeze |  | people-directory | legal-people-type-tabs | 상대 대리인 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0100 | PASS | completed after control freeze |  | people-directory | legal-people-type-tabs | 전문가 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0101 | PASS | completed after control freeze |  | people-directory | legal-people-type-tabs | 규제기관 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0102 | PASS | completed after control freeze |  | people-directory | legal-people-row-list | Legal person row | api_read | GET /api/hrx/legal-people/:personId; GET /api/hrx/legal-people/relationships?person_id=:personId; GET /api/hrx/legal-people/ethics?person_id=:personId |
| LCX8-ALL-41 | LCX8-ACTION-0103 | UI_ONLY | completed final classification |  | client | client-sidebar | Client 목록 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0104 | UI_ONLY | completed final classification |  | client | client-sidebar | 잠재 고객 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0105 | UI_ONLY | completed final classification |  | client | client-sidebar | 영업 기회 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0106 | UI_ONLY | completed final classification |  | client | client-sidebar | 상담 접수 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0107 | UI_ONLY | completed final classification |  | client | client-sidebar | 계정 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0108 | UI_ONLY | completed final classification |  | client | client-sidebar | 연락처 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0109 | PASS | completed after control freeze |  | client | client-sidebar | 데이터 관리 | api_read | GET /api/data-cloud/providers; GET /api/data-cloud/unified-profiles/unified_profile_client_seed; GET /api/data-cloud/enrichment-results; GET /api/data-cloud/audit |
| LCX8-ALL-41 | LCX8-ACTION-0110 | PASS | completed after control freeze |  | client | client-sidebar | 보고서 | api_read | GET /api/reports; GET /api/analytics/client-profitability; GET /api/reports/audit |
| LCX8-ALL-41 | LCX8-ACTION-0111 | PASS | completed after control freeze |  | client | client-sidebar | 가져오기 | api_read | GET /api/import-targets; GET /api/import-jobs |
| LCX8-ALL-01 | LCX8-ACTION-0112 | PASS | completed after control freeze |  | client | client-sidebar-utilities | Client 설정 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0113 | PASS | completed after control freeze |  | client | client-sidebar-utilities | 태그 관리 | ui_state_only |  |
| LCX8-ALL-10 | LCX8-ACTION-0114 | PASS | completed after control freeze |  | client | clients-header | 새로고침 | api_read | GET /master-data/records; GET /api/hrx/legal-people/search?client_id=client_lcx_001; GET /api/crm/leads; GET /api/crm/opportunities; GET /api/intake/requests; GET /api/intake/audit; GET /api/crm/accounts; GET /api/crm/contacts; GET /api/crm/duplicate-merge-proposals; GET /api/crm/accounts/:account_id/contacts; GET /api/record-actions/client/fields; GET /api/record-actions/client/:record_id/audit |
| LCX8-ALL-02 | LCX8-ACTION-0115 | PASS | completed after control freeze |  | client | client-panels | Client panel overflow menu | ui_state_only |  |
| LCX8-ALL-14 | LCX8-ACTION-0116 | PASS | completed after control freeze |  | client | client-right-panel-actions | 필드 업데이트 | api_write | POST /api/record-actions/client/:record_id/field-update |
| LCX8-ALL-14 | LCX8-ACTION-0117 | PASS | completed after control freeze |  | client | client-right-panel-actions | 승인 확인 | api_write | POST /api/record-actions/client/bulk-updates |
| LCX8-ALL-14 | LCX8-ACTION-0118 | PASS | completed after control freeze |  | client | client-opportunities | 전환 | api_write | POST /api/crm/opportunities/:opportunity_id/handoff |
| LCX8-ALL-14 | LCX8-ACTION-0119 | PASS | completed after control freeze |  | client | client-intake | 충돌 검토 | api_write | POST /api/intake/conflict-checks |
| LCX8-ALL-14 | LCX8-ACTION-0120 | PASS | completed after control freeze |  | client | client-intake | 통과 처리 | api_write | POST /api/intake/clearance-tokens |
| LCX8-ALL-14 | LCX8-ACTION-0121 | PASS | completed after control freeze |  | client | client-accounts | 계정 생성 | api_write | POST /api/crm/accounts |
| LCX8-ALL-14 | LCX8-ACTION-0122 | PASS | completed after control freeze |  | client | client-accounts | 계정 검토 표시 | api_write | PATCH /api/crm/accounts/:account_id |
| LCX8-ALL-14 | LCX8-ACTION-0123 | PASS | completed after control freeze |  | client | client-accounts | 계정 레코드 작업 | api_write | POST /api/record-actions/account/:record_id/field-update |
| LCX8-ALL-14 | LCX8-ACTION-0124 | PASS | completed after control freeze |  | client | client-contacts | 연락처 생성 | api_write | POST /api/crm/contacts |
| LCX8-ALL-14 | LCX8-ACTION-0125 | PASS | completed after control freeze |  | client | client-contacts | 연락처 검토 표시 | api_write | PATCH /api/crm/contacts/:contact_id |
| LCX8-ALL-14 | LCX8-ACTION-0126 | PASS | completed after control freeze |  | client | client-contacts | 연락처 레코드 작업 | api_write | POST /api/record-actions/contact/:record_id/field-update |
| LCX8-ALL-14 | LCX8-ACTION-0127 | PASS | completed after control freeze |  | client | client-contacts | 검토 생성 | api_write | POST /api/crm/duplicate-merge-proposals |
| LCX8-ALL-14 | LCX8-ACTION-0128 | PASS | completed after control freeze |  | client | client-contacts | 병합 실행 | api_write | POST /api/crm/duplicate-merge-proposals/:proposal_id/execute |
| LCX8-ALL-21 | LCX8-ACTION-0129 | BLOCKED | active remediation | Lane D | client | client-data | 연동 요청 | api_write | POST /api/data-cloud/providers |
| LCX8-ALL-21 | LCX8-ACTION-0130 | BLOCKED | active remediation | Lane D | client | client-data | 승인 확인 | api_write | POST /api/data-cloud/consent-records |
| LCX8-ALL-21 | LCX8-ACTION-0131 | BLOCKED | active remediation | Lane D | client | client-data | 미리보기 | api_write | POST /api/data-cloud/enrichment-jobs; GET /api/data-cloud/enrichment-jobs/:job_id/preview |
| LCX8-ALL-21 | LCX8-ACTION-0132 | BLOCKED | active remediation | Lane D | client | client-data | 실행 확인 | api_write | POST /api/data-cloud/enrichment-jobs/:job_id/execute; GET /api/data-cloud/enrichment-results |
| LCX8-ALL-21 | LCX8-ACTION-0133 | BLOCKED | active remediation | Lane D | client | client-data | 후보 생성 | api_write | POST /api/data-cloud/identity-resolution |
| LCX8-ALL-21 | LCX8-ACTION-0134 | BLOCKED | active remediation | Lane D | client | client-data | 활성화 확인 | api_write | POST /api/data-cloud/segment-activations |
| LCX8-ALL-15 | LCX8-ACTION-0135 | PASS | completed after control freeze |  | client | client-reports | 보고서 생성 | api_write | POST /api/reports |
| LCX8-ALL-15 | LCX8-ACTION-0136 | PASS | completed after control freeze |  | client | client-reports | 보고서 조정 | api_write | PATCH /api/reports/:report_id |
| LCX8-ALL-15 | LCX8-ACTION-0137 | PASS | completed after control freeze |  | client | client-reports | Client 손익 새로고침 | api_write | POST /api/analytics/client-profitability |
| LCX8-ALL-15 | LCX8-ACTION-0138 | PASS | completed after control freeze |  | client | client-reports | 보고서 실행 | api_write | POST /api/reports/:report_id/run |
| LCX8-ALL-15 | LCX8-ACTION-0139 | PASS | completed after control freeze |  | client | client-reports | 공유 요청 | api_write | POST /api/reports/:report_id/share |
| LCX8-ALL-15 | LCX8-ACTION-0140 | PASS | completed after control freeze |  | client | client-import | 작업 생성 | api_write | POST /api/import-jobs |
| LCX8-ALL-15 | LCX8-ACTION-0141 | PASS | completed after control freeze |  | client | client-import | 원본 준비 | api_write | POST /api/import-jobs/:job_id/source-files |
| LCX8-ALL-15 | LCX8-ACTION-0142 | PASS | completed after control freeze |  | client | client-import | 매핑 저장 | api_write | POST /api/import-jobs/:job_id/field-mappings |
| LCX8-ALL-15 | LCX8-ACTION-0143 | PASS | completed after control freeze |  | client | client-import | 검증 실행 | api_write | POST /api/import-jobs/:job_id/dry-run; GET /api/import-jobs/:job_id/preview |
| LCX8-ALL-15 | LCX8-ACTION-0144 | PASS | completed after control freeze |  | client | client-import | 실행 요청 | api_write | POST /api/import-jobs/:job_id/execute |
| LCX8-ALL-15 | LCX8-ACTION-0145 | PASS | completed after control freeze |  | client | client-import | 확인 | api_write | POST /api/import-jobs/:job_id/rollback; GET /api/import-jobs/:job_id/error-report |
| LCX8-ALL-42 | LCX8-ACTION-0146 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 법률 People | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0147 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 구성원 운영 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0148 | UI_ONLY | classification closure | Lane E | people-sidebar | people-sidebar | 관리 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0149 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 디렉터리 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0150 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 관계망 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0151 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 충돌·윤리벽 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0152 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 구성원 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0153 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 조직도 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0154 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 휴가 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0155 | UI_ONLY | classification closure | Lane E | people-sidebar | people-sidebar | 승인 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0156 | UI_ONLY | classification closure | Lane E | people-sidebar | people-sidebar | 입사·퇴사 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0157 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 채용 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0158 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 인사 문서 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0159 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 인사 정책 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0160 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 활동 기록 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0161 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 권한 관리 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0162 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 급여 정산 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0163 | UI_ONLY | classification closure |  | people-sidebar | people-sidebar | 인사 현황 | route_navigation |  |
| LCX8-ALL-01 | LCX8-ACTION-0164 | PASS | completed after control freeze |  | people-sidebar | people-sidebar-utilities | People 설정 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0165 | PASS | completed after control freeze |  | people-sidebar | people-sidebar-utilities | 권한 정책 | ui_state_only |  |
| LCX8-ALL-10 | LCX8-ACTION-0166 | PASS | completed after control freeze |  | people-relationships | people-relationships-search | 이름, 역할, 조직 검색 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0167 | PASS | completed after control freeze |  | people-relationships | people-relationships-type-tabs | 전체 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0168 | PASS | completed after control freeze |  | people-relationships | people-relationships-type-tabs | 내부 변호사 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0169 | PASS | completed after control freeze |  | people-relationships | people-relationships-type-tabs | Client | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0170 | PASS | completed after control freeze |  | people-relationships | people-relationships-type-tabs | 상대 대리인 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0171 | PASS | completed after control freeze |  | people-relationships | people-relationships-type-tabs | 전문가 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0172 | PASS | completed after control freeze |  | people-relationships | people-relationships-type-tabs | 규제기관 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0173 | PASS | completed after control freeze |  | people-relationships | people-relationships-person-row | Legal person row | api_read | GET /api/hrx/legal-people/:personId; GET /api/hrx/legal-people/relationships?person_id=:personId; GET /api/hrx/legal-people/ethics?person_id=:personId |
| LCX8-ALL-10 | LCX8-ACTION-0174 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-search | 이름, 역할, 조직 검색 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0175 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-type-tabs | 전체 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0176 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-type-tabs | 내부 변호사 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0177 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-type-tabs | Client | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0178 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-type-tabs | 상대 대리인 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0179 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-type-tabs | 전문가 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0180 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-type-tabs | 규제기관 | api_read | GET /api/hrx/legal-people/search?query=:query&type_id=:type_id |
| LCX8-ALL-10 | LCX8-ACTION-0181 | PASS | completed after control freeze |  | people-conflicts | people-conflicts-person-row | Legal person row | api_read | GET /api/hrx/legal-people/:personId; GET /api/hrx/legal-people/relationships?person_id=:personId; GET /api/hrx/legal-people/ethics?person_id=:personId |
| LCX8-ALL-02 | LCX8-ACTION-0182 | PASS | completed after control freeze |  | people-hrx | people-hrx-panels | HRX panel overflow menu | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0183 | PASS | completed after control freeze |  | people-workforce | people-members-roster-actions | 더보기 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0184 | UI_ONLY | classification closure |  | people-workforce | people-members-roster-actions | 조직도 | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0185 | PASS | completed after control freeze |  | people-workforce | people-members-roster-actions | 구성원 추가 | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0186 | PASS | completed after control freeze |  | people-workforce | people-members-roster-actions | 추가 메뉴 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0187 | UI_ONLY | classification closure |  | people-workforce | people-members-status-tabs | 재직 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0188 | UI_ONLY | classification closure |  | people-workforce | people-members-status-tabs | 입사 예정 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0189 | UI_ONLY | classification closure |  | people-workforce | people-members-status-tabs | 퇴사 예정 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0190 | UI_ONLY | classification closure |  | people-workforce | people-members-status-tabs | 종료 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0191 | UI_ONLY | classification closure |  | people-workforce | people-members-status-tabs | 외부 협업 | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0192 | PASS | completed after control freeze |  | people-workforce | people-members-roster-tools | 표 보기 옵션 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0193 | UI_ONLY | classification closure |  | people-workforce | people-members-roster-tools | 구성원 검색 | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0194 | PASS | completed after control freeze |  | people-workforce | people-members-roster-tools | 속성 조정 | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0195 | PASS | completed after control freeze |  | people-workforce | people-members-roster-tools | Workforce employee row | ui_state_only |  |
| LCX8-ALL-03 | LCX8-ACTION-0196 | PASS | completed after control freeze |  | people-workforce | people-lifecycle | Lifecycle onboarding row | ui_state_only |  |
| LCX8-ALL-10 | LCX8-ACTION-0197 | PASS | completed after control freeze |  | people-documents-leave | people-employee-list | Employee list row | api_read | GET /api/hrx/employees; GET /api/hrx/documents?employee_id=:employee_id; GET /api/hrx/leave?employee_id=:employee_id&policy_id=pto-us |
| LCX8-ALL-42 | LCX8-ACTION-0198 | UI_ONLY | classification closure |  | people-leave | people-leave-form | 시간 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0199 | UI_ONLY | classification closure |  | people-leave | people-leave-form | 시작일 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0200 | UI_ONLY | classification closure |  | people-leave | people-leave-form | 종료일 | ui_state_only |  |
| LCX8-ALL-16 | LCX8-ACTION-0201 | BLOCKED | active remediation | Lane B | people-leave | people-leave-form | 신청 | api_write | POST /api/hrx/leave; follow-up GET /api/hrx/employees and GET /api/hrx/leave?employee_id=:employee_id&policy_id=pto-us via refreshKey |
| LCX8-ALL-16 | LCX8-ACTION-0202 | BLOCKED | active remediation | Lane B | people-approvals | people-approvals | 반려 | api_write | POST /api/hrx/approvals/:approvalId/reject; follow-up GET /api/hrx/approvals and GET /api/hrx/audit |
| LCX8-ALL-16 | LCX8-ACTION-0203 | BLOCKED | active remediation | Lane B | people-approvals | people-approvals | 승인 | api_write | POST /api/hrx/approvals/:approvalId/approve; follow-up GET /api/hrx/approvals and GET /api/hrx/audit |
| LCX8-ALL-16 | LCX8-ACTION-0204 | BLOCKED | active remediation | Lane B | people-recruiting | people-recruiting | 다음 단계 | api_write | POST /api/hrx/recruiting/applications/:applicationId/stage; follow-up GET /api/hrx/recruiting/pipeline |
| LCX8-ALL-42 | LCX8-ACTION-0205 | UI_ONLY | classification closure |  | people-policy | people-policy-form | 정책 이름 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0206 | UI_ONLY | classification closure |  | people-policy | people-policy-form | 유형 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0207 | UI_ONLY | classification closure |  | people-policy | people-policy-form | 버전 | ui_state_only |  |
| LCX8-ALL-16 | LCX8-ACTION-0208 | BLOCKED | active remediation | Lane B | people-policy | people-policy-form | 정책 버전 생성 | api_write | POST /api/hrx/policies; follow-up GET /api/hrx/policies |
| LCX8-ALL-16 | LCX8-ACTION-0209 | BLOCKED | active remediation | Lane B | people-ai | people-ai | 문의 | api_write | POST /api/hrx/ai/assistant; background GET /api/hrx/ai/reviews after result changes |
| LCX8-ALL-16 | LCX8-ACTION-0210 | BLOCKED | active remediation | Lane B | people-ai | people-ai | 검토 | api_write | POST /api/hrx/ai/assistant; background GET /api/hrx/ai/reviews after result changes |
| LCX8-ALL-42 | LCX8-ACTION-0211 | UI_ONLY | classification closure |  | people-payroll | people-payroll-form | 기간 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0212 | UI_ONLY | classification closure |  | people-payroll | people-payroll-form | 구성원 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0213 | UI_ONLY | classification closure |  | people-payroll | people-payroll-form | 외부 급여 서비스 | ui_state_only |  |
| LCX8-ALL-42 | LCX8-ACTION-0214 | UI_ONLY | classification closure |  | people-payroll | people-payroll-form | 문서 참조 | ui_state_only |  |
| LCX8-ALL-16 | LCX8-ACTION-0215 | BLOCKED | active remediation | Lane B | people-payroll | people-payroll-actions | 미리보기 생성 | api_write | POST /api/hrx/payroll/preview |
| LCX8-ALL-16 | LCX8-ACTION-0216 | BLOCKED | active remediation | Lane B | people-payroll | people-payroll-actions | 검토 승인 기록 | api_write | POST /api/hrx/payroll/approve |
| LCX8-ALL-16 | LCX8-ACTION-0217 | BLOCKED | active remediation | Lane B | people-payroll | people-payroll-actions | 내보내기 파일 생성 | api_write | POST /api/hrx/payroll/export |
| LCX8-ALL-10 | LCX8-ACTION-0218 | PASS | completed after control freeze |  | people-admin | people-admin-object-manager | Client | api_read | GET /api/admin/permission-sets; GET /api/admin/permission-assignments; GET /api/admin/object-manager/objects; GET /api/admin/connected-apps; GET /api/admin/audit; GET /api/admin/object-manager/objects/:objectName/fields; GET /api/hrx/legal-people/ethics |
| LCX8-ALL-10 | LCX8-ACTION-0219 | PASS | completed after control freeze |  | people-admin | people-admin-object-manager | Matter | api_read | GET /api/admin/permission-sets; GET /api/admin/permission-assignments; GET /api/admin/object-manager/objects; GET /api/admin/connected-apps; GET /api/admin/audit; GET /api/admin/object-manager/objects/:objectName/fields; GET /api/hrx/legal-people/ethics |
| LCX8-ALL-16 | LCX8-ACTION-0220 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 세트 요청 | api_write | POST /api/admin/permission-sets |
| LCX8-ALL-16 | LCX8-ACTION-0221 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 변경 요청 | api_write | PATCH /api/admin/permission-sets/:permissionSetId |
| LCX8-ALL-16 | LCX8-ACTION-0222 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 배정 요청 | api_write | POST /api/admin/permission-assignments |
| LCX8-ALL-16 | LCX8-ACTION-0223 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 회수 요청 | api_write | DELETE /api/admin/permission-assignments/:assignmentId |
| LCX8-ALL-16 | LCX8-ACTION-0224 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 표시 방식 수정 | api_write | PATCH /api/admin/object-manager/objects/:objectName/fields/:fieldName |
| LCX8-ALL-16 | LCX8-ACTION-0225 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 연결 요청 | api_write | POST /api/admin/connected-apps |
| LCX8-ALL-16 | LCX8-ACTION-0226 | PASS | completed after control freeze |  | people-admin | people-admin-actions | 중지 요청 | api_write | POST /api/admin/connected-apps/:appId/disable |
| LCX8-ALL-42 | LCX8-ACTION-0227 | UI_ONLY | completed final classification |  | profile-sidebar | profile-sidebar | 홈 | route_navigation |  |
| LCX8-ALL-17 | LCX8-ACTION-0228 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar | 새 계약 만들기 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-17 | LCX8-ACTION-0229 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar | 계약 관리 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-42 | LCX8-ACTION-0230 | UI_ONLY | completed final classification |  | profile-sidebar | profile-sidebar | 내 프로필 | route_navigation |  |
| LCX8-ALL-42 | LCX8-ACTION-0231 | UI_ONLY | completed final classification |  | profile-sidebar | profile-sidebar | 문서 | route_navigation |  |
| LCX8-ALL-17 | LCX8-ACTION-0232 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar | 청구 관리 | api_write | POST /api/matters/:matter_id/recently-viewed; GET /api/matters/recently-viewed; GET /api/matters/audit |
| LCX8-ALL-04 | LCX8-ACTION-0233 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar-unavailable-sections | 비용 관리 | route_navigation |  |
| LCX8-ALL-04 | LCX8-ACTION-0234 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar-unavailable-sections | 정산 내역 | route_navigation |  |
| LCX8-ALL-04 | LCX8-ACTION-0235 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar-unavailable-sections | 지급 설정 | route_navigation |  |
| LCX8-ALL-04 | LCX8-ACTION-0236 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar-unavailable-sections | 입금 계좌 | route_navigation |  |
| LCX8-ALL-01 | LCX8-ACTION-0237 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar-utilities | 초대 관리 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0238 | PASS | completed after control freeze |  | profile-sidebar | profile-sidebar-utilities | 커뮤니티 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0239 | PASS | completed after control freeze |  | profile-surface | profile-top-actions | 도움말 및 피드백 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0240 | PASS | completed after control freeze |  | profile-surface | profile-top-actions | 계약 생성 | ui_state_only |  |
| LCX8-ALL-04 | LCX8-ACTION-0241 | PASS | completed after control freeze |  | profile-surface | profile-action-cards | 비용·정산 내역 | ui_state_only |  |
| LCX8-ALL-04 | LCX8-ACTION-0242 | PASS | completed after control freeze |  | profile-surface | profile-action-cards | 개인정보 관리 | ui_state_only |  |
| LCX8-ALL-04 | LCX8-ACTION-0243 | PASS | completed after control freeze |  | profile-surface | profile-action-cards | 부재 일정 | ui_state_only |  |
| LCX8-ALL-50 | LCX8-ACTION-0245 | GUARDED | guarded revalidation |  | desktop-shell | renderer-target | Approved local dev renderer target | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0246 | GUARDED | guarded revalidation |  | desktop-shell | navigation-guard | Unapproved renderer/navigation/window-open | native_bridge |  |
| LCX8-ALL-17 | LCX8-ACTION-0247 | BLOCKED | active remediation | Lane B | desktop-runtime | runtime-context | materRuntime.context | native_bridge |  |
| LCX8-ALL-43 | LCX8-ACTION-0248 | UI_ONLY | classification closure |  | desktop-renderer | login-form | Desktop login email | ui_state_only |  |
| LCX8-ALL-43 | LCX8-ACTION-0249 | UI_ONLY | classification closure |  | desktop-renderer | login-form | Desktop login password | ui_state_only |  |
| LCX8-ALL-17 | LCX8-ACTION-0256 | BLOCKED | active remediation | Lane B | desktop-file-bridge | upload-picker | Choose file for upload | native_bridge |  |
| LCX8-ALL-17 | LCX8-ACTION-0257 | BLOCKED | active remediation | Lane B | desktop-file-bridge | save-as | Save document as | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0258 | GUARDED | guarded revalidation |  | desktop-file-bridge | gesture-guard | File picker without trusted gesture | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0259 | GUARDED | guarded revalidation |  | desktop-file-bridge | renderer-byte-guard | Renderer-supplied file/document bytes | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0260 | GUARDED | guarded revalidation |  | desktop-file-bridge | permission-deny | File bridge denied permission | native_bridge |  |
| LCX8-ALL-17 | LCX8-ACTION-0261 | BLOCKED | active remediation | Lane B | desktop-file-bridge | temp-preview | Open temp preview | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0262 | GUARDED | guarded revalidation |  | desktop-file-bridge | temp-preview-cleanup | Temp preview cache cleanup | native_bridge |  |
| LCX8-ALL-22 | LCX8-ACTION-0263 | BLOCKED | active remediation | Lane D | desktop-deep-links | route-intent-open | Route-only matter/document/task deep links | native_bridge |  |
| LCX8-ALL-22 | LCX8-ACTION-0264 | BLOCKED | active remediation | Lane D | desktop-deep-links | auth-callback | Auth callback deep link | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0265 | GUARDED | guarded revalidation |  | desktop-deep-links | forbidden-actions | Forbidden action deep links | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0266 | GUARDED | guarded revalidation |  | desktop-deep-links | invalid-route-guard | Invalid deep link route/query/id | native_bridge |  |
| LCX8-ALL-22 | LCX8-ACTION-0267 | BLOCKED | active remediation | Lane D | desktop-notifications | notification-route-intent | Notification click route intent | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0268 | GUARDED | guarded revalidation |  | desktop-notifications | notification-guard | Notification action/sensitive payload guard | native_bridge |  |
| LCX8-ALL-22 | LCX8-ACTION-0269 | BLOCKED | active remediation | Lane D | desktop-updates | signed-update | Signed internal update apply | native_bridge |  |
| LCX8-ALL-22 | LCX8-ACTION-0270 | BLOCKED | active remediation | Lane D | desktop-updates | signed-rollback | Signed internal rollback | native_bridge |  |
| LCX8-ALL-50 | LCX8-ACTION-0271 | GUARDED | guarded revalidation |  | desktop-updates | public-update-deny | Public update channel | native_bridge |  |
| LCX8-ALL-51 | LCX8-ACTION-0272 | GUARDED | guarded revalidation | Lane E | client-guarded-state | client-list-denied-state | Client list denied state | ui_state_only | GET /master-data/records |
| LCX8-ALL-51 | LCX8-ACTION-0273 | GUARDED | guarded revalidation | Lane E | client-guarded-state | client-list-review-state | Client list review-required state | ui_state_only | GET /master-data/records |
| LCX8-ALL-51 | LCX8-ACTION-0274 | GUARDED | guarded revalidation |  | matter-guarded-state | matter-list-denied-state | Matter list denied state | ui_state_only |  |
| LCX8-ALL-51 | LCX8-ACTION-0275 | GUARDED | guarded revalidation |  | matter-guarded-state | matter-list-review-state | Matter list review-required state | ui_state_only |  |
| LCX8-ALL-51 | LCX8-ACTION-0276 | GUARDED | guarded revalidation |  | vault-guarded-state | vault-documents-denied-state | Vault documents denied state | ui_state_only |  |
| LCX8-ALL-51 | LCX8-ACTION-0277 | GUARDED | guarded revalidation |  | vault-guarded-state | vault-documents-review-state | Vault documents review-required state | ui_state_only |  |
| LCX8-ALL-51 | LCX8-ACTION-0278 | GUARDED | guarded revalidation |  | matter-guarded-state | matter-record-action-strip-disabled | Matter record action strip disabled under denied/review | ui_state_only |  |
| LCX8-ALL-51 | LCX8-ACTION-0279 | GUARDED | guarded revalidation |  | matter-guarded-state | matter-vault-action-strip-disabled | Matter Vault action strip disabled under denied/review | ui_state_only |  |
| LCX8-ALL-51 | LCX8-ACTION-0280 | GUARDED | guarded revalidation |  | people-guarded-state | people-directory-guard-state-remediated | People directory denied/review state | ui_state_only | GET /api/hrx/legal-people/search; GET /api/hrx/legal-people/:person_id; GET /api/hrx/legal-people/relationships; GET /api/hrx/legal-people/ethics |
| LCX8-ALL-30 | LCX8-ACTION-0281 | DESCRIPTOR_ONLY | active remediation | Lane C | profile-unavailable-state | profile-data-unavailable | Profile data unavailable state | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0282 | UI_ONLY | completed final classification | Lane E | matter | matter-sidebar | Matter 운영 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0283 | UI_ONLY | completed final classification |  | matter | matter-sidebar | Matter 목록 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0284 | UI_ONLY | completed final classification | Lane E | matter | matter-sidebar | 진행 현황 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0285 | UI_ONLY | completed final classification |  | matter | matter-sidebar | Matter 개시 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0286 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 업무 진행 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0287 | PASS | completed after control freeze |  | matter | matter-sidebar | 문서 | api_read | GET /api/matters/matter_rp05_synthetic_opening/vault-summary; GET /api/matters/matter_rp05_synthetic_opening/timeline; GET /api/vault/documents; GET /api/vault/search; GET /api/vault/audit; GET /api/matters/matter_rp05_synthetic_opening/document-templates; GET /api/matters/matter_rp05_synthetic_opening/builder-approval-requests |
| LCX8-ALL-41 | LCX8-ACTION-0288 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 활동 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0289 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 일정 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0290 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 대화 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0291 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 구성원 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0292 | UI_ONLY | completed final classification | Lane E | matter | matter-sidebar | 청구·분석 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0293 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 청구 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0294 | UI_ONLY | completed final classification |  | matter | matter-sidebar | 분석 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0295 | PASS | completed after control freeze |  | matter | matter-sidebar | 자료 가져오기 | api_read | GET /api/import-targets; GET /api/import-jobs |
| LCX8-ALL-01 | LCX8-ACTION-0296 | PASS | completed after control freeze |  | matter | matter-sidebar-utilities | Matter 설정 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0297 | PASS | completed after control freeze |  | matter | matter-sidebar-utilities | 태그 관리 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0298 | UI_ONLY | completed final classification |  | vault | vault-sidebar | 문서함 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0299 | UI_ONLY | completed final classification |  | vault | vault-sidebar | 문서 상세 | route_navigation |  |
| LCX8-ALL-41 | LCX8-ACTION-0300 | UI_ONLY | completed final classification | Lane E | vault | vault-sidebar | 메일 보관함 | route_navigation |  |
| LCX8-ALL-01 | LCX8-ACTION-0301 | PASS | completed after control freeze |  | vault | vault-sidebar-utilities | Vault 설정 | ui_state_only |  |
| LCX8-ALL-01 | LCX8-ACTION-0302 | PASS | completed after control freeze |  | vault | vault-sidebar-utilities | 문서 태그 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0303 | UI_ONLY | completed final classification |  | matter | matter-team-form | 팀원 번호 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0304 | UI_ONLY | completed final classification |  | matter | matter-team-form | 구성원 계정 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0305 | UI_ONLY | completed final classification |  | matter | matter-team-form | 로그인 계정 | ui_state_only |  |
| LCX8-ALL-41 | LCX8-ACTION-0306 | UI_ONLY | completed final classification |  | matter | matter-team-form | 역할 | ui_state_only |  |
| LCX8-ALL-12 | LCX8-ACTION-0307 | BLOCKED | active remediation | Lane B | matter | matter-team-form | 추가 / 책임자 지정 | api_write | POST /api/matters/:matter_id/team-members |
| LCX8-ALL-12 | LCX8-ACTION-0308 | BLOCKED | active remediation | Lane B | matter | matter-billing | 시간 기록 | api_write | POST /api/finance/time-entries |
| LCX8-ALL-12 | LCX8-ACTION-0309 | BLOCKED | active remediation | Lane B | matter | matter-billing | 청구 준비 | api_write | POST /api/finance/wip |
| LCX8-ALL-20 | LCX8-ACTION-0310 | BLOCKED | active remediation | Lane D | matter | matter-billing | 수납 기록 | api_write | POST /api/finance/payments |
| LCX8-ALL-12 | LCX8-ACTION-0311 | BLOCKED | active remediation | Lane B | matter | matter-analytics | 새로고침 | api_write | POST /api/analytics/refresh |
| LCX8-ALL-12 | LCX8-ACTION-0312 | BLOCKED | active remediation | Lane B | matter | matter-analytics | 내보내기 | api_write | POST /api/analytics/exports |
| LCX8-ALL-12 | LCX8-ACTION-0313 | BLOCKED | active remediation | Lane B | matter | matter-analytics | 손익 갱신 | api_write | POST /api/analytics/matter-profitability |
| LCX8-ALL-13 | LCX8-ACTION-0314 | PASS | completed after control freeze |  | matter | matter-import | 작업 생성 | api_write | POST /api/import-jobs |
| LCX8-ALL-13 | LCX8-ACTION-0315 | PASS | completed after control freeze |  | matter | matter-import | 원본 준비 | api_write | POST /api/import-jobs/:job_id/source-files |
| LCX8-ALL-13 | LCX8-ACTION-0316 | PASS | completed after control freeze |  | matter | matter-import | 매핑 저장 | api_write | POST /api/import-jobs/:job_id/field-mappings |
| LCX8-ALL-13 | LCX8-ACTION-0317 | PASS | completed after control freeze |  | matter | matter-import | 검증 실행 | api_write | POST /api/import-jobs/:job_id/dry-run; GET /api/import-jobs/:job_id/preview |
| LCX8-ALL-20 | LCX8-ACTION-0318 | BLOCKED | active remediation | Lane D | matter | matter-import | 실행 요청 | api_write | POST /api/import-jobs/:job_id/execute |
| LCX8-ALL-13 | LCX8-ACTION-0319 | PASS | completed after control freeze |  | matter | matter-import | 확인 | api_write | POST /api/import-jobs/:job_id/rollback; GET /api/import-jobs/:job_id/error-report |
| LCX8-ALL-02 | LCX8-ACTION-0320 | PASS | completed after control freeze |  | vault | vault-detail-panel | Vault detail panel overflow menus | ui_state_only |  |
| LCX8-ALL-02 | LCX8-ACTION-0321 | PASS | completed after control freeze |  | vault | vault-email-panel | Vault email panel overflow menu | ui_state_only |  |
| LCX8-ALL-30 | LCX8-ACTION-0322 | DESCRIPTOR_ONLY | active remediation | Lane C/Lane D | vault | vault-email-unavailable-state | Vault email filing unavailable state | external_receipt_required |  |
| LCX8-ALL-51 | LCX8-ACTION-0323 | GUARDED | guarded revalidation |  | people-audit | people-audit-step-up | HRX audit step-up retry | api_read | GET /api/hrx/audit with HRX step-up headers; conditional response body { step_up_required: true } renders retry state |
| LCX8-ALL-03 | LCX8-ACTION-0324 | PASS | completed after control freeze |  | people-hrx | people-header-refresh-unwired-hrx-panels | People header refresh on standalone HRX panels | ui_state_only | GET /api/hrx/employees only; missing refresh propagation to GET /api/hrx/approvals, GET /api/hrx/recruiting/pipeline, GET /api/hrx/policies, GET /api/hrx/audit, GET /api/hrx/analytics, GET /api/hrx/ai/reviews, POST/read payroll sequence state, and admin collection reads |

## Closeout Definition

This plan is complete when all 302 non-PASS rows are either promoted with proof or deliberately retained as `UI_ONLY`, `GUARDED`, `DESCRIPTOR_ONLY`, or `BLOCKED` with current evidence and no stale blocker language. The acceptable final state is not automatically all-green; it is a reconciled LCX8 ledger where every visible action truthfully states what the current product can do.
