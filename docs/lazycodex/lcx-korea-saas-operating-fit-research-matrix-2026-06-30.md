# LCX Korea SaaS Operating-Fit Research Matrix

Status: validated research basis
Date: 2026-06-30
Scope: currently repo-openable or repo-implementable UI surfaces from `lcx-full-00-current-gap-inventory` and the `LCX-OPEN-*` / `NU-*` implementation plans.
Lazyweb report: https://www.lazyweb.com/report/lazyweb/d70ec9a6-6d01-4dec-8fc2-2b8a233f162d/?source=create

## Research Position

`구현 가능한 UI`의 완료 조건을 `화면이 열림`이나 `버튼이 보임`에서 `한국 SaaS에서 실제 운영에 쓰이는 기능을 repo 안에서 안전하게 수행하거나 요청할 수 있음`으로 상향한다.

이 문서의 기준은 공식 제품 페이지, 공식 도움말, Lazyweb 화면 기반 리포트를 우선한다. 외부 provider, 세금계산서 발행, 결제 승인, 전자서명 발송, 급여 계산/이체, 실제 Vault 쓰기, production go-live는 별도 승인과 credential receipt 없이는 완료 claim으로 올리지 않는다.

## Dual-Axis Completion Rule

Implementation is recognized only when both axes pass.

Axis A - original app concept:
- The UI must preserve the `Client CRM/intake -> Matter ERP/legal operations -> People HRX responsibility` model.
- Client, Matter, and People cannot be implemented as disconnected SaaS modules.

Axis B - Korean SaaS operating guarantee:
- The UI must provide the operating functions that Korean SaaS products normally guarantee for the job category.
- Required functions must be listed in the UI research matrix and tied to official source ids or explicit repo-local requirements.

Failure handling:
- Axis A failure means `concept_spine_missing`.
- Axis B failure means `korea_saas_fit_missing`.
- Any failure means the UI is not implemented, even if it opens, renders data, or runs a local action.

## Common Operating-Fit Gates

모든 UI는 적용 가능한 항목을 만족해야 `repo_implemented`로 본다.

1. Data/read model: reload 후에도 상태를 다시 읽을 수 있는 repo-backed model 또는 deterministic read model이 있다.
2. Workflow/request: 업무, 법무, 재무, 인사 효과가 있는 action은 승인선, 요청서, 만료/반려/취소 상태를 가진다.
3. Bulk/import safety: 엑셀/CSV/import 계열은 staging, field mapping, duplicate check, dry-run, row error report, rollback note를 가진다.
4. Permission/audit: role/permission, event history, activity log, redaction-safe receipt가 남는다.
5. Provider preflight: 외부 발송/발행/승인/이체는 sandbox/configured/missing/expired/revoked state와 request packet까지만 구현한다.
6. Korean business nouns: customer-facing labels use natural Korean SaaS nouns, while stable route/domain ids remain unchanged.
7. Evidence: route proof, validator output, artifact path, residual external gate가 traceability row에 연결된다.
8. Law-firm triad: Matter UI must always preserve the `Client - Matter - People` link: who the customer/client is, what matter or engagement scope the work belongs to, which 구성원 owns/reviews/approves it, and which document, billing, communication, and audit events were produced from that relationship.

## Original Product Concept Map

This app is not a generic CRM, generic ERP, and generic HR product placed side by side. The operating concept is:

`Client CRM/intake -> Matter ERP/legal operations -> People HRX responsibility`

| Concept Pillar | Product Meaning | Must Be True In UI | Must Not Happen |
| --- | --- | --- | --- |
| Client as CRM | customer master, contact, lead, opportunity, inquiry, conflict, proposal, consent, handoff | pre-Matter records show whether they can become a Matter, who owns the relationship, and what review/clearance is pending | Client UI closes as a standalone CRM with no Matter handoff path |
| Matter as ERP/legal operations | engagement scope, documents, team, time, expense, billing, payment, tax, AR, profitability, settlement, risk, audit | every operational record is Matter-scoped and can read back Client, responsible People, permission, and audit context | ERP-like billing/payment/tax/analytics actions run from detached finance rows |
| People as HRX | employee/user separation, role, employment profile, workload, availability, leave, approval, HR document, payroll boundary, conflict, ethical wall | Matter team, reviewer, approver, workload, leave/capacity, conflict, and ethical-wall state resolve to People/HRX identity | People is treated as optional HR appendix or free-form assignee labels |
| Matter as join point | the law-firm operating record | joined readback shows Client, Matter, People, document, billing, communication, and audit state together | a Matter-linked action completes with only one pillar proven |

## Official Source Map

| Id | Source | Observed Korean SaaS capabilities | Plan use |
| --- | --- | --- | --- |
| S01 | Shiftee core: https://shiftee.io/ko | 근무일정, 출퇴근기록, 휴가관리, 전자결재, 메시지, 전자계약, 근태집계, 급여정산 | People setup/integration baseline |
| S02 | Shiftee workflow: https://shiftee.io/ko/workflow | 근태 전자결재, 맞춤형 결재, 메시지, 전자계약, 근태정산, 연동 | People requests/governance baseline |
| S03 | Shiftee report/payroll: https://shiftee.io/ko/report | 근태기록부터 급여정산까지 자동화, 리포트/정산 중심 | People close/payroll non-claim boundary |
| S04 | NAVER WORKS Drive version: https://help.worksmobile.com/ko/use-guides/drive/manage-file-folder/revision/ | 파일 버전 이력 확인, 미리보기, 복원 | Vault version/restore baseline |
| S05 | NAVER WORKS Drive settings: https://help.worksmobile.com/ko/admin-guides/manage-service/drive/general-settings/ | 링크 공유 허용, 링크 유효 기간, 링크 접근 권한, 휴지통 보관 기간, 버전 저장 기간 | Vault sharing, retention, policy baseline |
| S06 | NAVER WORKS Drive activity: https://help.worksmobile.com/ko/use-guides/drive/manage-file-folder/file-activity/ | 파일/폴더 활동 내역, 문서 뷰어 이동 | Vault audit/activity baseline |
| S07 | NAVER WORKS approval: https://naver.worksmobile.com/products/works-support/approval/ | 결재선, 기안 유형별 결재자, 맞춤 서식, API 연동 | Approval kernel and global decision baseline |
| S08 | NAVER WORKS approval forms: https://help.worksmobile.com/ko/admin-guides/manage-service/manage-approval/manage-forms/ | 서식별 결재선 설정, 관리자 결재선, 결재선 변경 허용 여부 | Request form governance baseline |
| S09 | Ecount Excel upload: https://www.ecount.com/kr/ecount/product/erp_migration | 엑셀 자료올리기, 품목/거래처/전표 대량 업로드, 실패 사유 즉시 확인, 기존 자료 수정 | Matter/Client import baseline |
| S10 | Ecount e-approval: https://www.ecount.com/kr/ecount/product/groupware_e-approval | ERP 전표 기반 전자결재, 완료 후 ERP 자동 반영, 공통서식, 문서별 결재라인 | Finance/global approval baseline |
| S11 | Ecount accounting/tax: https://www.ecount.com/kr/ecount/product/accounting_overview | 은행/카드/PG/국세청 자료 연동, 회계 장부 반영, 전자세금계산서 발행 | Billing/tax boundary and reconciliation baseline |
| S12 | Ecount Hometax linkage: https://www.ecount.com/kr/ecount/product/accounting_hometax-linkage | 국세청 전자세금계산서 자동 수집, ERP 자료 비교, 누락 내역 등록 | Tax invoice reconciliation baseline |
| S13 | Relate model: https://www.relate.kr/docs/learn-the-model | Organization, People, Deal, Process, List, multi-workspace/user CRM model | Client data model baseline |
| S14 | Relate pipelines: https://relate.kr/docs/features/pipelines | 파이프라인, Deal stages, Closed Won/Lost, failed Deal recycle | Client opportunity lifecycle baseline |
| S15 | Relate deal assignee: https://relate.kr/docs/features/how-to-manage-deal-assignee | Deal Assignee filtering, Data View save | Client ownership and work queue baseline |
| S16 | Modusign features: https://modusign.co.kr/features | 문서 업로드, 서명 방식 지정, 계약 진행 상황 확인, 계약 관리 | Contract/e-sign baseline |
| S17 | Modusign start guide: https://support.modusign.co.kr/ko/articles/%EB%AA%A8%EB%91%90%EC%8B%B8%EC%9D%B8-%EC%A0%84%EC%9E%90%EC%84%9C%EB%AA%85-%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0-09d67061 | 템플릿, 대량전송, 링크서명, 공용 워크스페이스, 감사 추적 인증서 | Template, signer, bulk-send boundary |
| S18 | Modusign document status: https://support.modusign.co.kr/ko/articles/%EB%AC%B8%EC%84%9C-%EC%A7%84%ED%96%89-%EC%83%81%ED%99%A9-%ED%99%95%EC%9D%B8-0033905a | 문서함, 서명 진행 상태, 서명 알림 재전송, 완료 문서/감사 추적 인증서 전달 | E-sign status/readback baseline |
| S19 | Popbill tax invoice API: https://developers.popbill.com/reference/taxinvoice/dotnet/api/info | 세금계산서 상태 확인, 다수건 상태, 상세정보, 문서번호 중복 확인, 검색, 상태 변경이력, 문서함 URL | Tax request/status/audit baseline |
| S20 | Toss Payments flow: https://docs.tosspayments.com/guides/v2/get-started/payment-flow | 결제 요청, 인증, 승인, orderId/amount 저장, 승인 전 검증, paymentKey, sandbox | Payment request/preflight boundary |
| S21 | Channel Talk guide: https://docs.channel.io/help/ko | 고객 연락처, 마케팅 메시지, 팀 메신저, 워크플로우 | Matter/client messaging and CRM comms baseline |
| S22 | Channel Talk segments: https://channel.io/ko/blog/articles/crm-segment-400475a0 | 세그먼트 고객에게 마케팅 메시지, 세그먼트별 서포트봇 | Client segment activation baseline |

## UI Research Matrix

| Law Firm OS UI | Korean SaaS baseline | Required operating-grade capability | Exit state |
| --- | --- | --- | --- |
| `?view=home` | Korean SaaS home surfaces expose work queues, approvals, notices, recent documents, and admin decision prompts rather than static navigation. S07, S08, S21 | Show pending request packets, approval tasks, blocked provider preflights, recent audit receipts, and user-scoped quick actions. | `repo_implemented_home_queue`; no global action is decorative. |
| Client-Matter-People operating spine | Generic SaaS sources cover CRM ownership, document activity, HR workflow, approval lines, and billing/tax status separately. A law-firm matter app must join them around one engagement record. S07, S08, S13, S14, S15, S19, S20 | Every Matter-centered surface must show or resolve client/customer identity, engaged matter scope, responsible partner/attorney/staff roles, conflict/duplicate review state where applicable, permission boundary, latest document/comms/billing events, and audit trail. | `repo_implemented_law_firm_spine`; no Matter action is completed from a detached Client or People context. |
| `?view=matters#matter-vault` | Document/workspace SaaS provides folder/document management, version history, restore, activity, approval lines, and guarded sharing. S04, S05, S06, S07 | Matter document workspace must support draft package, version upload request, metadata change request, approval request, legal hold/retention request, activity receipt, and safe preview/readback. | `repo_implemented_document_workspace`; external Vault write remains `external_dependency_required`. |
| `?view=vault#vault-documents` | Drive/document SaaS exposes version history, link policy, access policy, trash/restore, retention period, and file activity. S04, S05, S06 | Vault document rows need version history panel, metadata allowlist, retention/hold request, link/access policy state, activity log, and exportable receipt. | `repo_implemented_vault_documents`; storage mutation remains gated. |
| `?view=matters#matter-import` | Korean ERP import supports Excel upload, bulk upload, failure reason, and updating existing records. S09 | Matter import must have XLSX/CSV staging, mapping allowlist, duplicate detection, validation summary, row error report, dry-run result, execute approval request, rollback report, and redacted raw-row handling. | `repo_implemented_matter_import`; production migration remains blocked without approved runtime target. |
| `?view=clients#client-import` | ERP/CRM import patterns require bulk upload, failure reason, update/append distinction, and downloadable results. S09, S13 | Client import must separate account/company/contact/opportunity mapping, conflict candidates, consent basis, duplicate merge queue, dry-run, approval request, rollback/error report. | `repo_implemented_client_import`; real migration remains `external_dependency_required`. |
| `?view=clients#client-data` | CRM surfaces model Organizations, People, Deals, processes, pipelines, owners, saved views, customer segments, and messaging activation. S13, S14, S15, S22 | Client data UI must show customer/company/contact/opportunity hierarchy, owner/assignee, lifecycle stage, activity timeline, merge candidates, consent basis, segment preview, activation request, and rollback plan. | `repo_implemented_client_data`; enrichment/provider activation remains gated. |
| `client-contracts` | E-sign SaaS supports upload, signer/requester roles, signing methods, templates, bulk send, document status, reminders, and audit certificate. S16, S17, S18 | Contract UI must create draft package, signer role table, required field validation, template selection, send preflight, reminder request, status read model, audit certificate placeholder, and Vault link request. | `repo_implemented_contract_request`; e-sign envelope send remains provider-gated. |
| `?view=clients#client-billing` | Korean ERP/payment/tax tools separate invoice/tax/payment request, status lookup, reconciliation, and source data validation. S10, S11, S12, S19, S20 | Billing UI must support estimate/invoice request, tax invoice request with `mgtKey`/duplicate/status/log model, payment request with `orderId`/amount validation, cancel/refund request state, AR aging, and reconciliation preview. | `repo_implemented_billing_request`; money movement and tax issue remain provider-gated. |
| `matter-comms` | CRM/messaging tools manage customer profiles, segments, message targeting, templates, and send automation. S21, S22 | Matter comms must support recipient source, channel selection, template, attachment policy, consent/permission check, send request, queued/failed/sent-readback states, and audit receipt. | `repo_implemented_comms_request`; external message send remains provider-gated. |
| People setup rows: role, work profile, work schedule, work type, company org/settings | Korean HR SaaS includes employee master, org, work schedule, attendance, leave, workflow, notifications, and company settings. S01, S02 | Setup rows must become configuration records with owner, effective date, policy scope, validation, preview, audit receipt, and rollback note. | `configured_or_config_request`; not static `setup_required`. |
| People attendance rows: current status, records, upload, breaks, missing alerts, verification | HR SaaS provides attendance capture, GPS/WiFi/PC verification, schedule matching, missing alerts, upload/import, and reporting. S01, S02, S03 | Attendance UI must show read model, manual/import dry-run, exception queue, verification method config, break rules, missing-alert rules, and close/readback state. | `repo_implemented_attendance_ops`; live device feed/payroll close remain gated. |
| People leave rows: leave types, accrual auto/manual, usage, annual leave notices | HR SaaS provides leave generation/use/balance, approval, annual leave promotion notices, and payroll linkage. S01, S02, S03 | Leave UI must expose leave type setup, accrual simulation, manual accrual request, usage ledger, notice generation request, employee-facing readback, and audit receipt. | `repo_implemented_leave_ops`; legal/payroll finality remains blocked. |
| People request/governance rows: custom requests, schedule requests, attendance requests, locks, force approval, close | Korean SaaS HR workflows center on electronic approval, custom request types, status visibility, and close/review controls. S02, S03, S07, S08 | Request/governance UI must have form type, approver line, requester/target, due date, status, escalation, lock review, force-decision audit, close preview, and denial path. | `repo_implemented_people_governance`; final approval/close remains owner-gated. |
| People reports/pay rows: report snapshots/items, pay work profile, pay statement, pay rules, payroll provider | HR/payroll SaaS connects attendance summaries to pay statements and payroll reports while preserving close boundaries. S03, S11 | Report/pay UI must show report item config, snapshot creation, pay basis preview, statement provider request, rule review package, and payroll preflight. | `repo_implemented_payroll_request`; payroll calculation/disbursement remains false. |
| People messages/notices | HR SaaS sends notices/messages from HR data and supports bulk/automated delivery. S01, S02 | Message UI must support template, audience, substitution preview, schedule, consent/channel check, send request, failure report, and audit receipt. | `repo_implemented_people_message_request`; external send remains gated. |
| People e-contract/employment contracts | HR SaaS uses e-contract templates and provider status for employment documents. S01, S02, S16, S17, S18 | People e-contract UI must support template registry, signer role, employee data merge preview, send preflight, status read model, reminder/cancel request, and audit certificate placeholder. | `repo_implemented_employment_contract_request`; envelope send remains provider-gated. |
| Global decisions: `calendar`, `finance`, `data-import`, `policies` | Groupware/ERP SaaS treats cross-domain changes as approval forms with defined approval lines and ERP/data impact. S07, S08, S10 | Each global item must have decision packet, impact matrix, approver line, effective date, rollback note, and post-decision audit receipt. | `repo_implemented_global_decision`; permanent top-level promotion remains owner-gated. |
| `?view=settings#settings-advanced` | Admin SaaS exposes security and integration controls with explicit policy, permission, and audit trails. S05, S07, S08 | Advanced settings must show risky option review, required approver, current value, requested value, blast-radius note, receipt, and denial path. | `repo_implemented_advanced_request`; risky option execution remains gated. |
| Audit ledger/reconciliation | Document, tax, payment, and approval products expose status/history/activity logs and searchable receipts. S06, S18, S19, S20 | Audit UI must reconcile request, run, provider, approval, and document receipts; support filtered export with redaction and blocked raw-payload export. | `repo_implemented_audit_reconciliation`; compliance certification remains separate. |
| Desktop/release proof | Korean SaaS release-readiness should not overclaim external effects; screen QA and preflight receipts must match UI claims. S19, S20 | Desktop packet must include screenshot proof, route proof, validator list, provider-preflight blockers, and public/go-live/signing non-claims. | `implemented_openable_truth_pack`; public release/go-live remains false. |

## Research Gaps To Keep Open

- Legal-industry-specific Korean DMS/e-discovery SaaS benchmarks were not used as primary sources in this pass. The current condition is Korean SaaS operating-grade, not legal-only feature parity.
- The law-firm triad condition is a product operating-fit overlay, not a legal opinion. If implementation turns conflict checks, confidentiality walls, retention, or engagement-letter logic into enforceable policy, those rules need a separate legal/compliance source review before production claims.
- Provider APIs must be rechecked immediately before implementation if schemas, product names, or limits are used in code.
- Any production provider connection needs a credential receipt and owner approval before a UI state can move from `external_dependency_required` to `provider_connected`.

## Validation Receipt

Validated on 2026-06-30 with `npm run lcx:full:korea-saas-fit:validate`.

- Official source rows checked: 22 (`S01` through `S22`)
- UI research matrix rows checked: 21
- Evidence: `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-korea-saas-fit-validation.json`
- Non-claims preserved: provider schema freshness, production provider connection, external send, payment movement, tax invoice issue, payroll disbursement, production go-live, and public release.
