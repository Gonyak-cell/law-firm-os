# LazyCodex HRX Full Shiftee-Style Adoption Plan

Date: 2026-06-28
Status: planning_ready
Branch observed: `codex/lcx8-ui-action-operational-audit-closeout`
HEAD observed: `454edc313`
Scope: Law Firm OS `People` axis
Roster baseline: `hrx-member-roster-source-of-truth`

## Goal

Adopt the full Shiftee-style HR SaaS function set into the Law Firm OS `People` axis, while preserving the Law Firm OS product boundary and adding the law-firm-specific external schedule model under `People > 근무일정 > 외부일정`.

The plan treats all listed functions as adopted product scope. It does not mean every function is immediately executable. Each function must move through explicit states:

| State | Meaning | UI behavior |
| --- | --- | --- |
| `active` | Runtime path, permissions, audit, and QA exist. | Show as normal working menu. |
| `setup_required` | Product-owned feature exists but needs configuration before use. | Show menu with setup empty state. |
| `integration_required` | Feature depends on external provider, contract, or account setup. | Show menu with provider/setup boundary and disabled execution. |
| `permission_required` | Feature exists but current user lacks permission. | Show fail-closed permission state. |
| `audit_required` | Write path exists but needs receipt/read-back/audit proof before release claim. | Keep behind guard or admin-only preview. |

## Product Boundary

- `People` owns 구성원, 조직, 직무/역할, 근무일정, 외부일정, 근무기록, 휴가관리, 요청/결재, 리포트/마감, 메시지, 문서/계약, 회사 설정.
- `Matter` is a reference target for external schedules, not the owner of external schedules.
- `Vault` owns submitted/received document storage and version/audit behavior.
- `People` may link to Vault documents and Matter records, but does not become a Matter child.
- The member roster source of truth is `docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json`.
- The API registry source is `apps/api/src/hrx-member-roster-registry.js`; People UI must consume affiliation, department, organization group, title, and email through API payloads, not hardcoded UI values.
- HRX remains embedded inside Law Firm OS. Do not split it into a separate HR product.
- No payroll, employment, termination, evaluation, discipline, access-control, or AI-sensitive decision can be final without a human receipt and audit trail.
- No external-provider feature can claim completion without provider receipt or an explicit `integration_required` state.

## Existing Roster Source Of Truth To Preserve

This plan starts after the roster source-of-truth work. Do not redo it, replace it with UI literals, or degrade it into fixture-only fallback behavior.

| Artifact | Path | Required preservation |
| --- | --- | --- |
| Member roster SoT | `docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json` | Canonical source for 구성원 display name, title, email, affiliation, department, and organization group. |
| API roster registry | `apps/api/src/hrx-member-roster-registry.js` | API reads the roster file and normalizes member roster fields. |
| HRX runtime context | `apps/api/src/hrx-runtime-context.js` | Employee list/detail payloads prefer roster-backed `affiliation`, `department`, and `organization_group`. |
| API regression tests | `apps/api/test/hrx-runtime-api.test.js` | Preserve AMIC/PETRA/Staff roster assertions and employee API payload assertions. |
| Web roster table | `apps/web/src/people/employees/PeopleWorkforceDirectory.tsx` | Table must prefer API affiliation/department/organization group, not local hardcoding. |
| Web profile panel | `apps/web/src/people/employees/EmployeeProfile.tsx` | Detail panel must display API-backed 소속, 부서, 조직. |

Known roster QA baseline:

- 김양태 renders as `대표이사 / PETRA BRIDGE PARTNERS / Finance`.
- Organization view groups render as `AMIC 4명`, `PETRA BRIDGE 3명`, `Staff 2명`.
- 소속, 부서, 조직, 직위, 이메일 are sourced from roster/API payloads, not visible web hardcoding.

## Source Baseline

The adopted Shiftee-style function groups are:

- 출퇴근기록
- 휴가
- 요청 / 전자결재
- 리포트
- 마감 및 급여
- 메시지
- 전자계약
- 회사 설정

Law-firm-specific addition:

- `People > 근무일정 > 외부일정` for 법원, 검찰, 우체국, 세무서, 관청, and other 기관 방문/제출/수령 work.

## Final People IA

```text
People
├─ 관리
│  ├─ 구성원
│  ├─ 조직
│  ├─ 직무/역할
│  └─ 근로정보
│
├─ 근무일정
│  ├─ 근무표
│  ├─ 외부일정
│  ├─ 근무유형
│  ├─ 현재 근무 현황
│  ├─ 근무일정 확정
│  └─ 엑셀 업로드/다운로드
│
├─ 근무기록
│  ├─ 근무 시작/종료 기록
│  ├─ 일정 없는 근무
│  ├─ 휴게시간 기록
│  ├─ 근무기록 관리
│  ├─ 누락 알림
│  ├─ 근무기록 확정
│  └─ 인증 방식
│
├─ 휴가관리
│  ├─ 휴가 그룹/유형
│  ├─ 자동 발생
│  ├─ 수동 발생
│  ├─ 휴가 추가
│  ├─ 보상휴가
│  ├─ 휴가 일자 자동 지정
│  └─ 사용 내역
│
├─ 요청·결재
│  ├─ 요청 관리
│  ├─ 승인 규칙
│  ├─ 자동승인
│  ├─ 커스텀 요청
│  ├─ 근무일정 요청
│  ├─ 근무기록 요청
│  ├─ 휴가 요청
│  ├─ 증명서 발급 요청
│  ├─ 비용 처리 요청
│  └─ 파일 첨부 설정
│
├─ 리포트·마감
│  ├─ 실시간 리포트
│  ├─ 리포트 스냅샷
│  ├─ 커스텀 리포트 항목
│  ├─ 주의 필요 항목
│  ├─ 마감 관리
│  ├─ 급여정산
│  └─ 급여명세서
│
├─ 메시지
│  ├─ 메시지 전송
│  ├─ 메시지 자동화
│  ├─ 메시지 템플릿
│  ├─ 공지사항
│  ├─ 근태 알림
│  └─ 미승인 요청 알림
│
├─ 문서·계약
│  ├─ 회사방침
│  ├─ 전자계약
│  ├─ 전자계약 템플릿
│  ├─ 근로계약서
│  └─ 연차휴가 사용 촉진 문서
│
└─ 회사 설정
   ├─ 일반
   ├─ 알림
   ├─ 권한
   ├─ 조직
   ├─ 구성원
   ├─ 근무일정
   ├─ 외부일정
   ├─ 근무기록
   ├─ 휴게시간
   ├─ 휴가
   ├─ 요청
   ├─ 메시지
   ├─ 전자계약
   ├─ 리포트
   ├─ 급여
   ├─ 보안
   ├─ 고급 옵션
   ├─ 지원
   ├─ 결제
   └─ 연동
```

## Terminology Map

| Source term | Law Firm OS People term | Notes |
| --- | --- | --- |
| 직원 | 구성원 | User override. Keep accepted Korean HR terms otherwise. |
| 출퇴근기록 | 근무기록 | Use as primary menu. Still include start/end semantics inside. |
| 출근/퇴근 기록 | 근무 시작/종료 기록 | Less factory-like for law firm users. |
| 무일정 근무 | 일정 없는 근무 | Plain Korean. |
| 조직/지점 | 조직 | No branch-office assumption. `지점` can be represented later as `근무장소` if needed. |
| 요청 / 전자결재 | 요청·결재 | Product menu label. |
| 마감 및 급여 | 리포트·마감 | Keeps payroll execution from sounding complete too early. |
| 사내 공지사항 | 공지사항 | Short UI label. |
| 조직관리자 | 관리자 / 팀 관리자 | Choose per permission surface. |
| 전자계약 | 전자계약 | Keep term. |
| 회사 설정 | 회사 설정 | Keep term. |

## Feature Catalog Baseline

### 관리

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-001` | 구성원 | active | People | Extend current employee/people list without route-ID churn. |
| `HRX-FCAT-002` | 조직 | active | People | No `지점` label in default law-firm UI. |
| `HRX-FCAT-003` | 직무/역할 | setup_required | People settings | Partner, associate, paralegal, admin, staff roles. |
| `HRX-FCAT-004` | 근로정보 | audit_required | People profile | Sensitive. Requires permissions and audit. |

### 근무일정

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-010` | 근무표 | active | People | Schedule calendar/list. |
| `HRX-FCAT-011` | 외부일정 | active | People | Law-firm-specific institution schedule. |
| `HRX-FCAT-012` | 근무유형 | setup_required | Company settings | Office, remote, external, court, prosecution, post office, tax office, agency. |
| `HRX-FCAT-013` | 현재 근무 현황 | active | People | Shows office/remote/external/current state. |
| `HRX-FCAT-014` | 근무일정 확정 | audit_required | People | Write path needs receipt/read-back/audit. |
| `HRX-FCAT-015` | 엑셀 업로드/다운로드 | setup_required | People | Upload guarded; download can be read-only first. |

### 외부일정

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-020` | 법원 일정 | active | People schedule | 판결선고 청취, 변론기일, 조정기일, 서류 제출. |
| `HRX-FCAT-021` | 검찰 일정 | active | People schedule | 기록복사, 조사 입회, 의견서 제출. |
| `HRX-FCAT-022` | 우체국 일정 | active | People schedule | 내용증명 발송, 등기 발송, 반송 확인. |
| `HRX-FCAT-023` | 세무서 일정 | active | People schedule | 신고, 자료 제출, 사실증명 발급. |
| `HRX-FCAT-024` | 관청 일정 | active | People schedule | 인허가, 정보공개청구, 민원 접수, 공문 제출. |
| `HRX-FCAT-025` | 기타 기관 일정 | setup_required | People schedule | 경찰, 등기소, 공정위, 금감원, other agencies. |
| `HRX-FCAT-026` | Matter 연결 | active | People schedule | Required relation field, not ownership transfer. |
| `HRX-FCAT-027` | Vault 문서 연결 | active | People schedule | Submitted/received document references. |
| `HRX-FCAT-028` | 비용 처리 연결 | setup_required | Requests | Taxi, postage, filing fee, copy fee, etc. |

### 근무기록

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-030` | 근무 시작/종료 기록 | active | People | Do not confuse with Matter billable time. |
| `HRX-FCAT-031` | 일정 없는 근무 | active | People | Useful for unscheduled outside work. |
| `HRX-FCAT-032` | 휴게시간 기록 | setup_required | People | Needs policy settings. |
| `HRX-FCAT-033` | 근무기록 관리 | active | People | Admin correction and audit. |
| `HRX-FCAT-034` | 누락 알림 | setup_required | Messages | Notification rules. |
| `HRX-FCAT-035` | 근무기록 확정 | audit_required | People | Closing boundary. |
| `HRX-FCAT-036` | 인증 방식 | setup_required | Company settings | Keep QR/biometric/mobile automation integration-gated. |

### 휴가관리

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-040` | 휴가 그룹/유형 | active | Company settings | Annual leave, half day, sick, compensatory. |
| `HRX-FCAT-041` | 자동 발생 | setup_required | Leave | Policy-driven. |
| `HRX-FCAT-042` | 수동 발생 | audit_required | Leave | Human admin receipt. |
| `HRX-FCAT-043` | 휴가 추가 | active | Leave | Request-backed. |
| `HRX-FCAT-044` | 보상휴가 | setup_required | Leave | Depends on overtime/closing policy. |
| `HRX-FCAT-045` | 휴가 일자 자동 지정 | setup_required | Leave | Policy configuration required. |
| `HRX-FCAT-046` | 사용 내역 | active | Leave/report | List, type, monthly views. |
| `HRX-FCAT-047` | 휴가 엑셀 다운로드 | setup_required | Leave/report | Read/export receipt. |

### 요청·결재

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-050` | 요청 관리 | active | People | Existing approval queue expansion. |
| `HRX-FCAT-051` | 요청 승인권자 | setup_required | Company settings | Org/role-based. |
| `HRX-FCAT-052` | 승인 규칙 | active | Company settings | Current policy console evolves here. |
| `HRX-FCAT-053` | 자동승인 | setup_required | Approval rules | Must be explicit and auditable. |
| `HRX-FCAT-054` | 커스텀 요청 유형 | setup_required | Company settings | Request type builder. |
| `HRX-FCAT-055` | 기기 변경 요청 | setup_required | Requests | Low priority but adopted. |
| `HRX-FCAT-056` | 근무지 외 근무 요청 | active | Requests | Links to external schedule and work records. |
| `HRX-FCAT-057` | 근무일정 생성/수정/삭제 요청 | active | Requests | Schedule writes. |
| `HRX-FCAT-058` | 근무기록 생성/수정/삭제 요청 | active | Requests | Work-record writes. |
| `HRX-FCAT-059` | 휴가 생성/수정/삭제 요청 | active | Requests | Leave writes. |
| `HRX-FCAT-060` | 증명서 발급 요청 | active | Documents | Existing certificate route continues. |
| `HRX-FCAT-061` | 비용 처리 요청 | setup_required | Requests | Links to external schedule and accounting boundary. |
| `HRX-FCAT-062` | 최고관리자 강제 승인/거절 | audit_required | Requests | Must require elevated permission and audit. |
| `HRX-FCAT-063` | 단일/순차/상황별 승인 | setup_required | Approval rules | Rule engine. |
| `HRX-FCAT-064` | 파일 첨부 설정 | setup_required | Company settings | Vault/security boundary. |

### 리포트·마감

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-070` | 리포트 항목 이해 | active | Report help/config | Explain fields without developer copy. |
| `HRX-FCAT-071` | 실시간 리포트 | active | Reports | Existing analytics expands. |
| `HRX-FCAT-072` | 리포트 스냅샷 | setup_required | Reports | Snapshot receipt. |
| `HRX-FCAT-073` | 표준화 규칙 | setup_required | Reports/settings | Work-hour normalization. |
| `HRX-FCAT-074` | 커스텀 리포트 항목 | setup_required | Reports/settings | Admin-defined measures. |
| `HRX-FCAT-075` | 리포트 엑셀 다운로드 | setup_required | Reports | Export receipt. |
| `HRX-FCAT-076` | 주의 필요 항목 | active | Reports | Missing records, overtime, unapproved requests. |
| `HRX-FCAT-077` | 조직 필터 | active | Reports | No branch assumption. |
| `HRX-FCAT-078` | 조회 기간별 근무 데이터 | active | Reports | Date range summaries. |
| `HRX-FCAT-079` | 외부일정 리포트 | active | Reports | Agency type, Matter, responsible person, cost status. |

### 마감 및 급여

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-080` | 마감 관리 | active | Reports/closing | Lock periods and produce receipts. |
| `HRX-FCAT-081` | 급여정산 | integration_required | Payroll | Preview/export first; no payment execution. |
| `HRX-FCAT-082` | 연장근로수당 | setup_required | Payroll settings | Policy/rule dependent. |
| `HRX-FCAT-083` | 야간근로수당 | setup_required | Payroll settings | Policy/rule dependent. |
| `HRX-FCAT-084` | 휴일근로수당 | setup_required | Payroll settings | Policy/rule dependent. |
| `HRX-FCAT-085` | 주휴수당 | setup_required | Payroll settings | Policy/rule dependent. |
| `HRX-FCAT-086` | 최저임금 | setup_required | Payroll settings | Needs current legal-rate source. |
| `HRX-FCAT-087` | 근로자의 날 | setup_required | Payroll settings | Calendar/rule mapping. |
| `HRX-FCAT-088` | 시급 적용시점 | setup_required | Payroll settings | Effective-dated ledger. |
| `HRX-FCAT-089` | 소정근로요일 | setup_required | Payroll settings | Employment info link. |
| `HRX-FCAT-090` | 주휴요일 | setup_required | Payroll settings | Employment info link. |
| `HRX-FCAT-091` | 근로정보 기반 정산 | audit_required | Payroll | Sensitive read/write and export proof. |
| `HRX-FCAT-092` | 급여명세서 | integration_required | Payroll/messages | Do not claim external delivery until provider/owner receipt. |

### 메시지

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-100` | 메시지 전송 | setup_required | Messages | Internal send queue first. |
| `HRX-FCAT-101` | 메시지 자동화 규칙 | setup_required | Messages/settings | Event-triggered. |
| `HRX-FCAT-102` | 메시지 템플릿 | active | Messages/settings | Admin-configured. |
| `HRX-FCAT-103` | 공지사항 | setup_required | Messages | Announcement surface. |
| `HRX-FCAT-104` | 근태 알림 | setup_required | Messages | Missing record, external schedule reminder. |
| `HRX-FCAT-105` | 미승인 요청 알림 | setup_required | Messages | Queue reminder. |
| `HRX-FCAT-106` | 관리자 안내 | setup_required | Messages | Team/admin notices. |
| `HRX-FCAT-107` | 급여명세서 메시지 | integration_required | Messages/payroll | Sensitive, provider/owner gated. |
| `HRX-FCAT-108` | 변수 기반 메시지 | setup_required | Messages | Use approved variables only. |

### 문서·계약

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-110` | 회사방침 | active | Documents/settings | Existing company-policy surface. |
| `HRX-FCAT-111` | 전자계약 | integration_required | Contracts | Glosign/Modusign-style provider gate. |
| `HRX-FCAT-112` | 전자계약 템플릿 | setup_required | Contracts/settings | Template builder/read model. |
| `HRX-FCAT-113` | 전자계약 요청 | integration_required | Requests/contracts | Provider send gate. |
| `HRX-FCAT-114` | 서명 요청 구성원 선택 | setup_required | Contracts | Use 구성원 term, not 직원. |
| `HRX-FCAT-115` | 서명 차수 | setup_required | Contracts | Ordered signing. |
| `HRX-FCAT-116` | 서명 유효기간 | setup_required | Contracts | Expiry handling. |
| `HRX-FCAT-117` | 문서 내용 연결 | setup_required | Contracts/Vault | Vault document reference. |
| `HRX-FCAT-118` | 데이터 보정 | audit_required | Contracts | Human correction receipt. |
| `HRX-FCAT-119` | 문서 진행 상태 | active | Contracts | Read status; provider state may be synthetic until receipt. |
| `HRX-FCAT-120` | 연차휴가 사용 촉진 문서 | setup_required | Contracts/documents | Policy/rule generated. |
| `HRX-FCAT-121` | 근로계약서 | setup_required | Contracts/documents | Sensitive document boundary. |

### 회사 설정

| Feature ID | Label | State target | Owner surface | Implementation note |
| --- | --- | --- | --- | --- |
| `HRX-FCAT-130` | 일반 | active | Company settings | Company name, country, logo, management unit, week start, company policy. |
| `HRX-FCAT-131` | 알림 | setup_required | Company settings | Work/leave/request/message reminders. |
| `HRX-FCAT-132` | 권한 | active | Company settings | Admin/member permissions. |
| `HRX-FCAT-133` | 조직 | active | Company settings | No default branch label. |
| `HRX-FCAT-134` | 구성원 | active | Company settings | Member code/employee number. |
| `HRX-FCAT-135` | 근무일정 | setup_required | Company settings | Schedule behavior. |
| `HRX-FCAT-136` | 외부일정 | active | Company settings | Agency types, task types, default duration, Matter-required flag. |
| `HRX-FCAT-137` | 근무기록 | setup_required | Company settings | Record behavior. |
| `HRX-FCAT-138` | 휴게시간 | setup_required | Company settings | Break rules. |
| `HRX-FCAT-139` | 휴가 | setup_required | Company settings | Leave rules. |
| `HRX-FCAT-140` | 요청 | setup_required | Company settings | Request types and approvals. |
| `HRX-FCAT-141` | 메시지 | setup_required | Company settings | Templates and automation. |
| `HRX-FCAT-142` | 전자계약 | integration_required | Company settings | Provider credentials. |
| `HRX-FCAT-143` | 리포트 | setup_required | Company settings | Fields, snapshots, exports. |
| `HRX-FCAT-144` | 급여 | integration_required | Company settings | Payroll settings and provider boundary. |
| `HRX-FCAT-145` | 보안 | active | Company settings | MFA/IP/session/security controls. |
| `HRX-FCAT-146` | 고급 옵션 | setup_required | Company settings | Admin-only toggles. |
| `HRX-FCAT-147` | 지원 | setup_required | Company settings | Support/help links. |
| `HRX-FCAT-148` | 결제 | integration_required | Company settings | Billing provider boundary. |
| `HRX-FCAT-149` | 연동 | integration_required | Company settings | Slack/Teams/Calendar/API/contract/payroll integrations. |

## External Schedule Model

External schedule is a People work-schedule event type.

### Required fields

| Field | Required | Notes |
| --- | --- | --- |
| 기관 유형 | yes | 법원, 검찰, 우체국, 세무서, 관청, 기타. |
| 기관명 | yes | Free text or configured registry. |
| 업무 유형 | yes | e.g. 판결선고 청취, 기록복사, 내용증명 발송. |
| 담당 구성원 | yes | Primary responsible person. |
| 동행자 | no | Multiple members. |
| Matter 연결 | yes by default | Can be disabled only in company settings. |
| 일시 | yes | Start/end or start/duration. |
| 예상 소요시간 | yes | Default from agency task type. |
| 장소 | yes | Address/court room/office. |
| 준비물 | no | Checklist. |
| 제출/수령 문서 | no | Vault reference. |
| 알림 | no | Message automation. |
| 상태 | yes | 예정, 진행중, 완료, 취소. |
| 결과 메모 | no | Required when completing if configured. |
| 근무기록 반영 여부 | yes | Converts schedule into work record candidate. |
| 비용 처리 요청 연결 여부 | no | Links to request/cost flow. |

### Default agency task types

| Agency | Task types |
| --- | --- |
| 법원 | 판결선고 청취, 변론기일, 조정기일, 서류 제출, 기록 열람 |
| 검찰 | 기록복사, 조사 입회, 의견서 제출, 접수 확인 |
| 우체국 | 내용증명 발송, 등기 발송, 반송 확인 |
| 세무서 | 신고, 자료 제출, 사실증명 발급 |
| 관청 | 인허가, 정보공개청구, 민원 접수, 공문 제출 |
| 기타 | 경찰, 등기소, 공정위, 금감원, 노동청, 사용자 정의 |

## LazyCodex TUW Plan

### LCX-HRX-SFT-00 - Control, Boundary, And Catalog Freeze

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-00.01` | Current Baseline Freeze | Capture branch, HEAD, dirty tree, existing People routes, validators, and current HRX API behavior before edits. | Baseline note and command receipt. | Current state is recorded without modifying unrelated dirty files. |
| `LCX-HRX-SFT-00.02` | Feature Catalog Freeze | Register all adopted feature IDs and menu labels. | `peopleFeatureCatalog` contract or JSON/TS module. | Every feature in this plan maps to a route or gated placeholder state. |
| `LCX-HRX-SFT-00.03` | Claim Boundary Register | Prevent false product/production claims. | Boundary doc/update. | `active`, `setup_required`, `integration_required`, `audit_required`, and `permission_required` are enforced in UI copy. |
| `LCX-HRX-SFT-00.04` | Visual Research Gate | Satisfy product UI research requirement before visual redesign. | Lazyweb upgrade/report receipt or explicit blocked note. | No visual redesign PR starts without the gate state recorded. |
| `LCX-HRX-SFT-00.05` | Roster Source Of Truth Freeze | Preserve the already-registered 구성원 roster source of truth before adding new People modules. | Roster baseline receipt naming SoT JSON, registry, API runtime context, API tests, web roster table, and profile panel. | 김양태/PETRA/AMIC/Staff assertions pass and no UI hardcoded roster literals are introduced. |

### LCX-HRX-SFT-01 - Navigation And Feature-State Shell

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-01.01` | People IA Renderer | Render People sidebar from feature catalog. | Catalog-driven sidebar. | Menu labels match final IA and route IDs remain stable where already used. |
| `LCX-HRX-SFT-01.02` | Feature State Badges | Show setup/integration/permission/audit states without fake availability. | State badge/empty-state primitives. | Gated features cannot perform mutation and explain why. |
| `LCX-HRX-SFT-01.03` | Section Route Map | Map all People menu entries to section routes. | Route map in PeopleHome or feature router. | Every menu item opens a purposeful surface, even if setup-gated. |
| `LCX-HRX-SFT-01.04` | Korean Copy Guard | Prevent `직원` and old awkward labels from returning. | Validator updates. | `구성원` remains canonical; `법률 People`, `관계망`, `충돌·윤리벽`, `활동 기록`, `인사 현황` do not reappear in People IA. |

### LCX-HRX-SFT-02 - Core People, Organization, Role, Employment Info

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-02.00` | Roster Source-of-Truth Validator | Keep the roster SoT as the authoritative source while expanding People. | Validator/API test coverage for roster-backed fields and group counts. | API and browser QA prove 김양태/PETRA/AMIC/Staff values still come from roster/API payloads. |
| `LCX-HRX-SFT-02.01` | 구성원 Profile Expansion | Expand current profile fields for work/leave/schedule context. | Profile sections and permission shaping. | Sensitive fields are hidden without permission and tested. |
| `LCX-HRX-SFT-02.02` | 조직 Settings | Implement law-firm organization model without branch default. | Organization list/settings. | UI uses `조직`; no `지점` unless user config enables a location-style label. |
| `LCX-HRX-SFT-02.03` | 직무/역할 Settings | Add role/job setup. | Role registry and assignment UI. | Partner/associate/staff/admin patterns work with permission checks. |
| `LCX-HRX-SFT-02.04` | 근로정보 Ledger | Add employment info with audit boundary. | Employment info read/write contract. | Writes require audit receipt and denied/review fail-closed tests. |

### LCX-HRX-SFT-03 - Work Schedule Foundation

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-03.01` | 근무표 Surface | Add calendar/list schedule surface. | Schedule table/calendar. | Current member schedules render from API-backed data. |
| `LCX-HRX-SFT-03.02` | 근무유형 Settings | Configure office/remote/external schedule types. | Schedule type settings. | Types drive badges/colors and validation. |
| `LCX-HRX-SFT-03.03` | 현재 근무 현황 | Show who is office/remote/external/out. | Current status panel. | Status is derived from schedule/work records, not hardcoded cards. |
| `LCX-HRX-SFT-03.04` | 근무일정 확정 | Add schedule confirmation boundary. | Confirm action and audit event. | Confirmation has write/read-back/audit proof or remains audit-gated. |
| `LCX-HRX-SFT-03.05` | Schedule Import/Export | Add Excel upload/download shells. | Download first, upload gated. | Download has proof; upload cannot pretend mutation without validation pipeline. |

### LCX-HRX-SFT-04 - Law-Firm External Schedule

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-04.01` | 외부일정 Data Contract | Model agency schedule events. | External schedule schema/API contract. | Required fields and agency task types are validated. |
| `LCX-HRX-SFT-04.02` | 외부일정 List And Calendar | Add list/calendar UI under `People > 근무일정`. | External schedule surface. | 법원/검찰/우체국/세무서/관청 filters work. |
| `LCX-HRX-SFT-04.03` | External Schedule Detail | Add detail drawer/panel. | Detail UI with Matter/Vault/request/cost links. | All links are visible and permission-aware. |
| `LCX-HRX-SFT-04.04` | Matter Reference Link | Connect external schedules to Matter. | Matter lookup/reference field. | Matter is required by default but remains a reference, not owner. |
| `LCX-HRX-SFT-04.05` | Vault Document Link | Connect submitted/received documents. | Vault reference picker/display. | No document body leakage; only permitted metadata. |
| `LCX-HRX-SFT-04.06` | Completion And Result Memo | Complete/cancel external schedule with result memo. | Completion action and audit event. | Completion has write/read-back/audit or stays audit-gated. |
| `LCX-HRX-SFT-04.07` | Work Record Conversion | Convert completed external schedule into work record candidate. | Conversion workflow. | User can choose whether to reflect schedule into work record. |
| `LCX-HRX-SFT-04.08` | Cost Request Link | Create/attach cost processing request. | Request link. | Cost flow is request-backed and audit-visible. |

### LCX-HRX-SFT-05 - Work Records

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-05.01` | 근무 시작/종료 Records | Add work start/end record surface. | Work record list/detail. | Records are separate from Matter billable time. |
| `LCX-HRX-SFT-05.02` | 일정 없는 근무 | Add unscheduled work flow. | Unscheduled work form. | Can create request or guarded write path. |
| `LCX-HRX-SFT-05.03` | 휴게시간 기록 | Add break-time record support. | Break record UI and settings dependency. | Break display respects configured rules. |
| `LCX-HRX-SFT-05.04` | 근무기록 관리 | Admin correction and review. | Management surface. | Corrections require audit/read-back. |
| `LCX-HRX-SFT-05.05` | 누락 알림 | Missing work-record reminder. | Message automation hook or setup-gated panel. | Missing cases appear in reports/messages without sending unsupported external mail. |
| `LCX-HRX-SFT-05.06` | 근무기록 확정 | Closing/confirm state. | Confirm action. | Locked period behavior is tested. |
| `LCX-HRX-SFT-05.07` | 인증 방식 | Configure mobile/QR/biometric-style modes. | Settings panel. | Unsupported methods stay setup/integration-gated. |

### LCX-HRX-SFT-06 - Leave Management

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-06.01` | 휴가 그룹/유형 | Add leave type/group configuration. | Settings and list. | Types drive request form and balances. |
| `LCX-HRX-SFT-06.02` | 자동 발생 | Policy-based accrual. | Accrual rule engine or setup-gated rule UI. | Rule preview works before write execution. |
| `LCX-HRX-SFT-06.03` | 수동 발생 | Admin manual grant. | Manual grant flow. | Requires elevated permission and audit receipt. |
| `LCX-HRX-SFT-06.04` | 휴가 추가 | Add leave request/create flow. | Request-backed leave form. | Writes/read-back/audit or gated state. |
| `LCX-HRX-SFT-06.05` | 보상휴가 | Compensatory leave support. | Comp leave rule and balance. | Links to overtime/closing source. |
| `LCX-HRX-SFT-06.06` | 사용 내역 | Usage list/type/month views. | Leave history views. | Filtered read views pass browser QA. |
| `LCX-HRX-SFT-06.07` | 휴가 엑셀 다운로드 | Export leave records. | Export action. | Bounded export metadata and receipt. |

### LCX-HRX-SFT-07 - Requests And Approval

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-07.01` | 요청 관리 Expansion | Extend manager queue to all request types. | Unified request list/detail. | Schedule, work record, leave, certificate, cost requests appear. |
| `LCX-HRX-SFT-07.02` | 승인권자 Settings | Configure approvers. | Approver settings. | Role/org-based assignment works. |
| `LCX-HRX-SFT-07.03` | 승인 규칙 Engine | Implement single/sequential/contextual rules. | Rule read model and write flow. | Rule changes are audited. |
| `LCX-HRX-SFT-07.04` | 자동승인 | Add explicit automatic approval conditions. | Auto-approval settings. | Auto decisions are transparent and reversible. |
| `LCX-HRX-SFT-07.05` | 커스텀 요청 | Add configurable request types. | Type builder and request form. | Unsupported fields are blocked, not ignored. |
| `LCX-HRX-SFT-07.06` | 증명서 발급 요청 | Preserve/extend certificate request route. | Certificate request workflow. | 재직/경력 certificate flows are visible. |
| `LCX-HRX-SFT-07.07` | 비용 처리 요청 | Add cost request surface. | Cost request form/list. | Links to external schedule and matter, with audit. |
| `LCX-HRX-SFT-07.08` | 최고관리자 강제 승인/거절 | Add elevated override. | Override action and receipt. | Requires permission, reason, and audit. |
| `LCX-HRX-SFT-07.09` | 파일 첨부 설정 | Configure request attachments. | Attachment setting. | Vault/security boundary respected. |

### LCX-HRX-SFT-08 - Reports, Closing, Payroll Preview

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-08.01` | 실시간 리포트 | Expand reports for schedules, work records, leave, requests. | Report dashboard. | API-backed, no static KPI cards. |
| `LCX-HRX-SFT-08.02` | 외부일정 리포트 | Add agency/Matter/member external schedule reporting. | Report section. | Filters by agency, Matter, member, status, date. |
| `LCX-HRX-SFT-08.03` | 주의 필요 항목 | Highlight missing/unapproved/outlier records. | Attention panel. | Items link back to source route. |
| `LCX-HRX-SFT-08.04` | 리포트 스냅샷 | Snapshot current report state. | Snapshot metadata. | Snapshot proof is stored/read-back. |
| `LCX-HRX-SFT-08.05` | 커스텀 리포트 항목 | Admin-defined report fields. | Settings surface. | Field definitions are validated. |
| `LCX-HRX-SFT-08.06` | 마감 관리 | Close work/leave/payroll period. | Closing period surface. | Lock behavior and audit proof. |
| `LCX-HRX-SFT-08.07` | 급여정산 Preview | Payroll preview/export only. | Payroll preview panel. | No payment execution; integration boundary explicit. |
| `LCX-HRX-SFT-08.08` | 급여명세서 Boundary | Add payroll statement gated state. | Setup/integration-required surface. | No send/delivery claim without provider receipt. |

### LCX-HRX-SFT-09 - Messages And Notifications

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-09.01` | 메시지 템플릿 | Add template manager. | Template CRUD or gated write. | Approved variables only. |
| `LCX-HRX-SFT-09.02` | 메시지 전송 | Add internal send queue boundary. | Send surface. | External provider sends remain integration-gated. |
| `LCX-HRX-SFT-09.03` | 자동화 규칙 | Trigger messages from HR events. | Automation settings. | Rules preview before execution. |
| `LCX-HRX-SFT-09.04` | 공지사항 | Announcement surface. | Notice list/create. | Audience scoping works. |
| `LCX-HRX-SFT-09.05` | 근태 알림 | Schedule/work-record reminders. | Reminder rules. | Missing record and external schedule reminders visible. |
| `LCX-HRX-SFT-09.06` | 미승인 요청 알림 | Approval queue reminders. | Reminder panel. | No duplicate/unsafe sends. |

### LCX-HRX-SFT-10 - Documents And E-Contracts

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-10.01` | 회사방침 | Preserve company policy surface. | Policy read/update. | Korean labels and permissions pass. |
| `LCX-HRX-SFT-10.02` | 전자계약 Templates | Add template setup. | Template surface. | Templates are distinct from sent contracts. |
| `LCX-HRX-SFT-10.03` | 전자계약 Request | Add contract request flow. | Request surface. | Provider send remains integration-gated. |
| `LCX-HRX-SFT-10.04` | 서명 차수/유효기간 | Add signing order/expiry settings. | Settings fields. | Validated and shown in preview. |
| `LCX-HRX-SFT-10.05` | 문서 내용 연결 | Link Vault documents. | Vault reference. | No unauthorized document body display. |
| `LCX-HRX-SFT-10.06` | 문서 진행 상태 | Read contract status. | Status panel. | Provider status is clearly synthetic/gated until receipt. |
| `LCX-HRX-SFT-10.07` | 근로계약서 | Add employment contract document type. | Document type and template. | Sensitive document permissions enforced. |
| `LCX-HRX-SFT-10.08` | 연차휴가 사용 촉진 문서 | Add leave-promotion document type. | Document type/template. | Generated only from approved leave policy data. |

### LCX-HRX-SFT-11 - Company Settings Expansion

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-11.01` | Settings IA | Add all settings categories. | Company settings navigation. | Every adopted feature has a setting home or explicit no-config note. |
| `LCX-HRX-SFT-11.02` | 외부일정 Settings | Add agency/task/default duration settings. | External schedule settings. | Matter-required and cost-link defaults work. |
| `LCX-HRX-SFT-11.03` | 근무일정/근무기록 Settings | Add schedule/record/break settings. | Settings sections. | Rules affect schedule/record surfaces. |
| `LCX-HRX-SFT-11.04` | 휴가/요청 Settings | Add leave/request settings. | Settings sections. | Types/rules affect forms. |
| `LCX-HRX-SFT-11.05` | 메시지/전자계약 Settings | Add message/contract settings. | Settings sections. | Integration-required states visible. |
| `LCX-HRX-SFT-11.06` | 리포트/급여 Settings | Add report/payroll settings. | Settings sections. | Payroll remains preview/export gated. |
| `LCX-HRX-SFT-11.07` | 보안/고급/지원/결제/연동 | Add admin support settings. | Settings sections. | Integration/billing features are not falsely executable. |

### LCX-HRX-SFT-12 - API, Permissions, Audit, And Validation

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-12.01` | API Route Register | Register read/write route families for all active features. | API route matrix. | Every UI action maps to API/read-only/gated state. |
| `LCX-HRX-SFT-12.02` | Permission Matrix | Define permissions by feature and role. | Permission matrix. | Denied/review/step-up states fail closed. |
| `LCX-HRX-SFT-12.03` | Audit Taxonomy | Define audit events for writes and sensitive reads. | Audit event map. | Every mutation has event type, actor, target, reason, receipt. |
| `LCX-HRX-SFT-12.04` | Validator Updates | Extend `hrx:ui:validate` and People validators. | Validator assertions. | Menu, route, copy, gate states, and forbidden labels are checked. |
| `LCX-HRX-SFT-12.05` | Browser QA Matrix | Create route/action manual QA plan. | Browser QA script/receipt plan. | Each active route is driven through its matching surface. |
| `LCX-HRX-SFT-12.06` | AI Slop And Korean Copy Review | Keep UI copy natural and non-generic. | Sloplint plus rendered Korean copy review. | AI slop review passes or intentional exceptions are documented. |

### LCX-HRX-SFT-90 - Closeout And Release Boundary

| TUW | Name | Purpose | Deliverables | Done criteria |
| --- | --- | --- | --- | --- |
| `LCX-HRX-SFT-90.01` | Evidence Bundle | Gather local implementation evidence. | Evidence index with commands/screenshots/receipts. | Each activated feature has matching evidence. |
| `LCX-HRX-SFT-90.02` | Remaining Gated Backlog | List setup/integration/audit-required leftovers. | Backlog ledger. | No adopted feature is unclassified. |
| `LCX-HRX-SFT-90.03` | Production Claim Review | Prevent overclaiming. | Final claim boundary note. | Production/go-live/external-provider claims remain false unless separate receipts exist. |

## PR Slicing

| PR | Scope | Main TUWs |
| --- | --- | --- |
| PR 1 | Roster SoT preservation, feature catalog, People IA, state badges | `00`, `01` |
| PR 2 | Core 구성원/조직/직무/근로정보 without roster regression | `02` |
| PR 3 | 근무일정 foundation | `03` |
| PR 4 | 외부일정 law-firm schedule | `04` |
| PR 5 | 근무기록 | `05` |
| PR 6 | 휴가관리 | `06` |
| PR 7 | 요청·결재 | `07` |
| PR 8 | 리포트·마감·급여 preview | `08` |
| PR 9 | 메시지 | `09` |
| PR 10 | 문서·계약 | `10` |
| PR 11 | 회사 설정 expansion | `11` |
| PR 12 | API/permission/audit/validation closeout | `12`, `90` |

## Verification Ladder

Run from narrow to broad for each PR:

1. `git diff --check`
2. Focused unit/API tests for touched route family
3. Roster SoT regression: `apps/api/test/hrx-runtime-api.test.js` must keep 김양태/PETRA/AMIC/Staff assertions green
4. `npm run hrx:ui:validate`
5. `npm run lcx:ppl:ui:validate`
6. `npm --workspace apps/web run test:ui`
7. `npm run web:e2e`
8. `npm --workspace apps/web run build`
9. `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`
10. Browser QA for each new visible People route
11. Evidence note with screenshot path, route list, denied/review/permission behavior, roster SoT preservation, and remaining gated states

## Manual QA Gate

The implementation is not done until the visible product is driven through these routes:

| Route family | Required QA |
| --- | --- |
| 관리 | 구성원 list/detail, 조직 view, role/settings access, roster-backed 소속/부서/조직/직위/이메일. |
| 근무일정 | 근무표, 외부일정 list/calendar/detail, current work status. |
| 외부일정 | Create/edit/complete/cancel or gated write proof; agency filters; Matter/Vault/cost links. |
| 근무기록 | Start/end record, unscheduled work, break, missing-alert state, confirmation. |
| 휴가관리 | Leave type, request, accrual/balance/history, export state. |
| 요청·결재 | Request list/detail, approve/reject, approval rules, custom/certificate/cost requests. |
| 리포트·마감 | Real-time report, attention items, external schedule report, close period, payroll preview. |
| 메시지 | Template, notification rule, announcement, reminder states. |
| 문서·계약 | Company policy, e-contract template/request/status, employment contract, annual-leave document. |
| 회사 설정 | All settings tabs open, show configured/gated state, and do not expose unsupported execution. |

## Non-Negotiable Invariants

- Keep `구성원` as the People person noun unless the user explicitly changes it again.
- Preserve `hrx-member-roster-source-of-truth.json` as the 구성원 roster source of truth.
- Preserve `hrx-member-roster-registry.js` as the API read path for roster values.
- Do not hardcode 소속, 부서, 조직, 직위, or 이메일 in People web surfaces when the roster/API payload provides those fields.
- Preserve the known roster QA baseline: 김양태 is `대표이사 / PETRA BRIDGE PARTNERS / Finance`; organization view groups are `AMIC 4명`, `PETRA BRIDGE 3명`, `Staff 2명`.
- Do not reintroduce `법률 People`, `관계망`, `충돌·윤리벽`, `활동 기록`, `인사 현황`, or `직원` in user-facing People copy.
- External schedules live in `People > 근무일정 > 외부일정`.
- Matter is only a linked reference for external schedules.
- Payroll is preview/export/gated until owner/provider/legal receipts exist.
- E-contract provider actions are integration-gated until provider receipt exists.
- Sensitive HR writes require permission, reason where appropriate, audit event, read-back, and denied/review failure proof.
- AI output remains untrusted until reviewed.
- Adopted but not executable features must be visibly `setup_required`, `integration_required`, `permission_required`, or `audit_required`, not silent dead buttons.

## Suggested First Batch

Start with `LCX-HRX-SFT-00` and `LCX-HRX-SFT-01`.

Do not begin deep feature implementation before:

1. Roster Source of Truth freeze is recorded and regression-guarded.
2. Feature catalog exists.
3. Sidebar/route IA is catalog-driven.
4. Feature-state badges/empty states exist.
5. Forbidden Korean copy guard is updated.
6. External schedule is registered under `근무일정`, not Matter.

## Closeout Phrase

Use this exact claim shape until production receipts exist:

`LCX-HRX-SFT local implementation candidate complete for adopted People HRX feature scope; production, go-live, payroll execution, e-contract provider execution, and external integration claims remain false unless separately evidenced.`
