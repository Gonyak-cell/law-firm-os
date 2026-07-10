# Home 매출·비용·정산 통합 실행 지시서 — 2026-07-10

- 문서 ID: `HOME-FIN-SETTLEMENT-2026-07-10`
- 상태: 구현 계획 확정, 실행 대기
- 적용 저장소: `/Users/jws/Documents/Codex/Law Firm OS`
- 기준 화면: Home 및 Matter 사이드바, Home 대시보드, Matter 정산 실행 화면
- 실행 원칙: 작업 패키지별 독립 커밋, 테스트·브라우저·패키지 증거 확인 후 다음 패키지 진행
- 릴리스 진실선: 구현 PASS, 로컬 웹 PASS, 패키지 QA PASS, 서명/공증, 공개 릴리스, go-live를 서로 대체하지 않는다.

## 1. 목적

Home을 전사 운영 축으로 유지하면서 다음 기능을 Home 사이드바의 `매출·비용` 영역으로 통합한다.

1. 권한 범위 내 전체 Matter의 매출·비용 현황
2. 월별 매출·비용
3. 고객별 매출·비용
4. Matter에 흩어져 있는 시간 기록, 비용 처리, 청구, 수납, 미수금 및 회계 내보내기
5. 재무 승인과 Home `승인 대기`의 중복 제거

완료 후 Matter는 개별 사건의 실행·문서·업무 맥락을 담당하고, Home은 전사 집계와 재무 운영 진입점을 담당한다. Matter 화면에는 선택 사건을 유지한 Home 재무 화면 바로가기만 남긴다.

## 2. 현재 상태와 직접 확인한 코드 앵커

### 2.1 내비게이션

- `apps/web/src/components/Shell.jsx:473-490`: Home 사이드바는 현재 대시보드, 승인 대기, To Do, 피드, 캘린더, 메시지, 전자 계약, 회사 현황으로 구성되어 있다.
- `apps/web/src/components/Shell.jsx:673-683`: Matter 사이드바의 `정산` 그룹에는 결재, 시간 기록, 비용 처리, 청구 내역, 미수금이 있다.
- `apps/web/src/App.jsx:24-33`: Home 허용 섹션은 `homeSectionIds`로 제한되며 신규 재무 섹션은 아직 등록되어 있지 않다.
- `apps/web/src/data/globalUtilities.js:365-409`: `finance`는 아직 `decision-required` 조건부 전역 항목이며 Matter/Profile 라우트로 흩어져 있다.
- `apps/web/src/data/globalUtilities.js:498-510`: 과거 Finance 딥링크가 Matter, People, Profile로 직접 연결된다.

### 2.2 UI와 실행 기능

- `apps/web/src/components/FinanceSurface.jsx`: 시간 기록, 청구서, 미수금 읽기 화면이 존재하지만 현재 App에 마운트되지 않는다.
- `apps/web/test/ui-regression.test.mjs:1473-1488`: 현재 테스트는 `FinanceSurface`가 App에 직접 노출되지 않는 것을 계약으로 고정한다. 통합 구현 시 의도적으로 갱신해야 한다.
- `apps/web/src/components/MattersSurface.jsx:1986-2283`: `ChargeActionPanel`에 시간 입력, 경비, 대납, WIP 생성, 사전검토, 청구서 발행, 입금 기록·배정, 회계 CSV 생성이 모여 있다.
- `apps/web/src/components/MattersSurface.jsx:2285-2451`: `ChargePanel`이 시간·청구·미수금 읽기, 실행 액션, 재무 감사 이력을 함께 렌더한다.
- `apps/web/src/components/MattersSurface.jsx:3719-3773`: Matter `비용 처리` 화면이 동일 ChargePanel을 사용한다.
- `apps/web/src/components/MattersSurface.jsx:3984-4025`: Matter 시간 기록, 청구 내역, 미수금 메뉴도 동일 ChargePanel을 사용한다.

### 2.3 Finance 및 Analytics 런타임

- `apps/api/src/finance-runtime-context.js:22-60`: Finance bounded context는 파일 기반 저장소, 권한 평가, 감사 기록을 사용하며 `production_ready_claim:false`다.
- `apps/api/src/finance-runtime-context.js:27-52`: 시간, 비용, 대납, WIP, 사전검토, 청구, 입금 배정, 미수금, 회계 내보내기 API가 존재한다.
- `packages/billing/src/finance-repository.js:4-29`: Finance 저장소는 Invoice, Expense, Disbursement, Payment, AR, Settlement 등 기존 모델을 이미 갖고 있다.
- `apps/api/src/analytics-runtime-context.js:16-40`: Analytics bounded context 역시 파일 기반이며 `production_ready_claim:false`다.
- `packages/analytics/src/metrics-service.js`: MatterProfitability와 ClientProfitability 계산은 존재하지만 전사·월별·고객별 재무 집계 API는 없다.
- `packages/analytics/src/dashboard-service.js`: `practice_pnl`, `ar_aging`, `realization` 대시보드 타입의 기반은 있으나 Home용 재무 read model로 연결되지 않았다.

## 3. 확정 IA 결정

### 3.1 축 경계

| 축 | 책임 |
|---|---|
| Home | 전사 집계, 기간·고객 비교, 재무 운영 진입, 승인 대기 |
| Matter | 선택 사건의 업무·문서·팀·소통·리포트, 사건 맥락 바로가기 |
| Client | 고객 관계·수임 전 업무·고객 운영 |
| People | 인사·근태·급여 경계. Finance 비용 원장을 대체하지 않음 |

별도의 최상위 Finance 축은 만들지 않는다. 상단 Home/Client/Matter/People/Vault/Portal 축은 유지한다.

### 3.2 Home 사이드바 최종 구조

```text
Home
├─ 대시보드                    # home-dashboard
├─ 매출·비용
│  ├─ 전체 현황                # home-finance-overview
│  ├─ 월별 매출·비용           # home-finance-monthly
│  ├─ 고객별 매출·비용         # home-finance-clients
│  ├─ 시간 기록                # home-finance-time
│  ├─ 비용 처리                # home-finance-expenses
│  ├─ 청구·수납                # home-finance-billing
│  └─ 미수금                   # home-finance-ar
├─ 승인 대기                  # home-requests
├─ To Do                     # home-todo
├─ 피드                       # home-feed
├─ 캘린더                     # home-calendar
├─ 메시지                     # home-messages
├─ 전자 계약                  # home-esign
└─ 회사 현황 [권한]           # home-company
```

`회계 내보내기`는 저빈도·고권한 기능이므로 별도 사이드바 항목으로 만들지 않고 `home-finance-billing`의 제한 액션으로 둔다.

### 3.3 Matter 사이드바 최종 구조

Matter의 `정산` 그룹은 제거한다. 다음 기능은 Matter 대시보드 또는 선택 사건 패널의 컨텍스트 액션으로만 남긴다.

- 시간 기록 → Home `home-finance-time` + 선택 `matter_id`
- 비용 추가 → Home `home-finance-expenses` + 선택 `matter_id`
- 청구 보기 → Home `home-finance-billing` + 선택 `matter_id`
- 미수금 보기 → Home `home-finance-ar` + 선택 `matter_id`

컨텍스트 액션은 원 기능을 복제하지 않으며 Home의 동일 화면으로 이동한다.

## 4. 라우트 이전 계약

### 4.1 신규 Home 라우트

| 라우트 | 목적 |
|---|---|
| `view=home#home-finance-overview` | 전체 현황 기본 랜딩 |
| `view=home#home-finance-monthly` | 월별 집계 및 월 드릴다운 |
| `view=home#home-finance-clients` | 고객별 집계 및 고객 드릴다운 |
| `view=home#home-finance-time` | Matter 선택형 시간 기록 |
| `view=home#home-finance-expenses` | 경비·대납·증빙 처리 |
| `view=home#home-finance-billing` | WIP·사전검토·청구·수납·회계 내보내기 |
| `view=home#home-finance-ar` | 미수금 현황과 상세 |

선택 Matter가 있는 경우 `?matter_id=<canonical-matter-id>`를 사용한다. 고객·기간·통화 필터는 URL에 직렬화하여 새로고침과 딥링크에서 보존한다.

### 4.2 레거시 라우트 매핑

| 기존 라우트 | 신규 목적지 | 추가 컨텍스트 |
|---|---|---|
| `matters#matter-approvals` | `home#home-requests` | `filter=finance`, `matter_id` 보존 |
| `matters#matter-time` | `home#home-finance-time` | `matter_id` 보존 |
| `matters#matter-expenses` | `home#home-finance-expenses` | `matter_id` 보존 |
| `matters#matter-billing` | `home#home-finance-billing` | `matter_id` 보존 |
| `matters#matter-ar` | `home#home-finance-ar` | `matter_id` 보존 |
| `finance#finance-matter-billing` | `home#home-finance-billing` | redirect 근거 기록 |
| `finance#finance-expenses` | `home#home-finance-expenses` | redirect 근거 기록 |

레거시 URL은 최소 한 릴리스 주기 동안 redirect-only 계약으로 유지한다. redirect는 `redirectedFrom`을 남겨 오작동과 구 북마크 사용량을 측정한다.

### 4.3 사이드바 상태

- Home의 `매출·비용`은 기존 아코디언 구현을 재사용한다.
- 열림 상태는 `axis:view` 키 규칙을 유지한다.
- 실제 활성 자식만 그룹 active 상태를 만든다.
- 다른 그룹이 열려 있다는 이유만으로 이전 그룹이 active로 남지 않는다.

## 5. 지표 계약

### 5.1 v1 지표 정의

| 지표 | 원천 | 기준일 | 계산 |
|---|---|---|---|
| 청구액 | `Invoice` | `issued_at` | 취소·정정 반영 후 청구 총액 |
| 수납액 | `PaymentMatch` 우선, 필요 시 `Payment` | `matched_at` 또는 `received_at` | 청구서에 배정된 수납액 |
| 사건비용 | `Expense` + `Disbursement` | `expense_date`, `disbursed_at` | 직접 경비와 대납을 분리 표시 후 합계 |
| 회수 가능 비용 | `Expense.approved_for_wip`, `Disbursement.recoverable` | 비용 기준일 | 고객 청구 가능 비용 |
| 미수금 | `ARBalance`/`ARAgingSnapshot` | 기준일 | 미수 잔액 및 aging bucket |
| 기여액 | 청구액 - 사건비용 | 동일 기간 | `영업이익` 또는 `순이익`으로 표현 금지 |

### 5.2 현재 범위 제한

v1의 `전체 현황`은 권한 범위 내 모든 Matter의 청구·수납·사건비용을 뜻한다. 다음 항목은 현재 Finance 원장에 완전하게 들어오지 않으므로 전사 손익에 포함되었다고 주장하지 않는다.

- 급여와 상여
- 임차료와 일반 관리비
- 비-Matter 공급업체 비용
- 세무 조정과 감가상각
- 외부 회계 시스템의 확정 분개

따라서 v1 화면에는 `Matter 기반 집계` 범위 설명을 표시한다. 위 원천을 연결하고 대사가 완료된 후에만 `전사 손익` 또는 `전체 비용`이라는 더 넓은 회계 표현으로 승격한다.

### 5.3 날짜와 시간대

- 월 경계는 `Asia/Seoul` 기준이다.
- `Expense`에 `expense_date`, `Disbursement`에 `disbursed_at`을 추가한다.
- 기존 데이터에서 필수일이 없으면 `created_at`을 임시 사용하되 `date_inferred:true`를 read model에 남긴다.
- 추론 날짜 금액은 화면과 증거에서 별도 건수로 표시한다.

### 5.4 통화

- KRW와 USD를 환율 근거 없이 합산하지 않는다.
- v1은 통화별 합계를 분리한다.
- 환산 합계는 환율 원천, 적용일, 반올림 규칙, 환율 감사 근거가 마련된 후 별도 작업으로 추가한다.

### 5.5 고객 식별

- 고객별 집계 키는 canonical `ClientGroup`이다.
- `Invoice.billing_client_party_id`와 Matter의 billing client 참조를 기존 `BillingProfile`/Matter/ClientGroup 관계로 해석한다.
- UI가 임의로 party id를 고객으로 만들지 않는다.
- 매핑이 없는 금액은 `미연결 고객` 행에 보존하고 원금액·건수와 정비 링크를 제공한다.
- 미연결 금액을 다른 고객이나 `기타`로 흡수하지 않는다.

## 6. 화면 명세

### 6.1 공통 필터

- 기간: 이번 달, 지난달, 분기, 연도, 사용자 지정
- 통화: KRW, USD, 기타 원천 통화
- 고객: ClientGroup
- Matter: canonical Matter
- 인식 기준: 청구 기준 / 수납 기준

필터는 URL과 화면 상태가 일치해야 하며 권한 밖 옵션의 건수나 이름을 노출하지 않는다.

### 6.2 전체 현황

1. 청구액, 수납액, 사건비용, 미수금 요약
2. 각 숫자의 기간, 통화, 원천, 갱신시각
3. 월별 청구·수납·비용 추이
4. 주요 고객 표
5. 장기 미수금, 미승인 비용, 미연결 고객 액션 큐
6. 추론 날짜와 부분 집계 경고

동일한 크기의 장식용 KPI 카드 도배를 피하고, 수치와 대사 가능한 표·추이·업무 큐의 위계를 명확히 한다.

### 6.3 월별 매출·비용

| 열 | 내용 |
|---|---|
| 월 | 서울 시간대 월 |
| 청구액 | 발행 기준 |
| 수납액 | 배정 기준 |
| 사건비용 | 직접 경비 + 대납 |
| 회수 가능 비용 | 고객 청구 가능 |
| 미수금 증감 | 월말 잔액 변화 |
| 미연결 금액 | 고객 매핑 실패 |

월을 선택하면 해당 기간의 고객 및 Matter 상세로 드릴다운한다. 월별 합계의 합은 같은 필터의 전체 현황과 일치해야 한다.

### 6.4 고객별 매출·비용

| 열 | 내용 |
|---|---|
| 고객 | ClientGroup display name |
| Matter | 권한 내 Matter 수 |
| 청구액 | 기간 내 발행액 |
| 수납액 | 기간 내 수납 배정액 |
| 사건비용 | 기간 내 직접비용 |
| 미수금 | 기준일 잔액 |
| 기여액 | 청구액 - 사건비용 |

고객 선택 시 Matter별 구성 내역을 보여주고 원장 합계와 대사할 수 있어야 한다.

### 6.5 시간 기록

- Matter 필수 선택
- 일자, 분, 업무 내용, 역할, 청구/비청구
- 타이머와 수동 입력 유지
- 본인 입력과 승인된 기록을 권한에 따라 구분
- 기존 `POST /api/finance/time-entries`와 idempotency 계약 재사용

### 6.6 비용 처리

- 경비: 금액, 비용일, 통화, 증빙 문서, 청구 가능 여부
- 대납: 금액, 지급일, 통화, 거래처, 회수 가능 여부
- 승인/반려 상태 및 감사 이력
- 외부 지급 실행은 승인 근거 확인 후에만 가능

### 6.7 청구·수납

단일 흐름으로 구성한다.

```text
승인 시간·비용 → WIP 생성 → 사전검토 → 파트너 승인
→ 청구서 발행 → 입금 기록 → 청구서 배정 → 회계 내보내기
```

각 단계는 현재 결과, 차단 사유, 다음 가능한 액션을 표시한다. 발행된 청구서 직접 수정 금지와 정정 기록 원칙을 유지한다.

### 6.8 미수금

- 고객별, Matter별, 청구서별 잔액
- 1–30일, 31–60일, 61–90일, 90일 이상 aging
- 장기 미수금에서 선택 고객·Matter의 청구·수납 화면으로 이동
- 미권한 사용자의 금액·건수 누출 금지

## 7. API 및 read model 계획

### 7.1 신규 집계 API

```text
GET /api/analytics/finance/overview
GET /api/analytics/finance/monthly
GET /api/analytics/finance/clients
```

공통 query:

```text
tenant_id
permission_ref
audit_hint_ref
from
to
currency?
client_group_id?
matter_id?
recognition_basis=billed|collected
```

### 7.2 집계 위치

- 전체 원장을 브라우저로 내려 보내고 UI에서 합산하지 않는다.
- 서버에서 tenant, route permission, object ACL을 평가한 후 집계한다.
- 집계 응답에는 raw Matter 상세, 계좌 참조, credential material, journal lines를 포함하지 않는다.
- read model은 Finance 원천을 수정하지 않는다.
- 동일 필터의 overview/monthly/clients 결과가 서로 대사되도록 하나의 집계 함수군을 사용한다.

### 7.3 필요한 읽기 보완

현재 Payment와 PaymentMatch는 쓰기 API 중심이다. 상세 화면과 대사를 위해 다음 read 경로를 추가하거나 집계 서비스 내부에서 동일 저장소 원천을 읽도록 한다.

```text
GET /api/finance/payments
GET /api/finance/payment-matches
```

신규 API가 불필요하게 민감 원장을 넓히지 않도록, UI 상세에 필요한 최소 필드만 sanitize한다.

### 7.4 오류·경계 응답

- tenant 누락: 400
- permission/audit ref 누락: 400
- denied: 403 + `count_leak_prevented:true`
- review/approval required: 200 + `ui_state:review_required`
- 빈 결과: 200 + `ui_state:empty`
- 일부 원천 실패: 성공 원천과 누락 원천을 분리하고 완전 집계처럼 표시하지 않음
- 모든 응답: `production_ready_claim:false` 유지, 실제 승격 게이트 전 변경 금지

## 8. 권한 매트릭스

### 8.1 신규 scope

| scope | 권한 |
|---|---|
| `analytics.finance.read` | 전체·월별·고객별 집계 조회 |
| `finance.time.write` | 시간 기록 |
| `finance.expense.write` | 경비·대납 기록 |
| `finance.billing.write` | WIP·사전검토·청구 실행 |
| `finance.approve` | 파트너/재무 승인 |
| `finance.payment.write` | 입금 기록·배정 |
| `finance.export` | 회계 내보내기 |
| `finance.audit.read` | 재무 감사 이력 조회 |

### 8.2 사용자군 기본 계약

| 사용자군 | 전사 집계 | 시간·비용 | 청구·수납 | 승인 | 내보내기 |
|---|---:|---:|---:|---:|---:|
| 경영/파트너 | 허용 | 허용 | 허용 | 허용 | 정책에 따라 |
| 재무 운영 | 허용 | 허용 | 허용 | 지정 범위 | 허용 |
| 일반 변호사 | 기본 차단 | 본인/허용 Matter | 기본 차단 | 요청 범위 | 차단 |
| 일반 직원 | 차단 | 본인/허용 Matter | 차단 | 차단 | 차단 |
| 외부/포털 | 차단 | 차단 | 차단 | 차단 | 차단 |

실제 사용자 배정은 `lawos_staff` 전체를 재무 운영으로 추론하지 않는다. 오너가 승인한 사용자 또는 그룹에 scope를 명시적으로 부여한다.

### 8.3 메뉴 노출

- 집계 권한이 없는 사용자는 전체·월별·고객별 항목을 보지 못한다.
- 시간 또는 비용 쓰기 권한만 있는 사용자는 허용된 실행 항목만 본다.
- URL 직접 접근도 API에서 다시 평가한다.
- 메뉴 숨김만으로 권한을 구현한 것으로 간주하지 않는다.

## 9. 구현 작업 패키지

각 WP는 독립 커밋 단위다. 이전 WP 게이트가 PASS하기 전 다음 WP의 완료를 선언하지 않는다.

### WP-FIN-1 — 계약·라우트·사이드바

목표:

- 신규 Home section ID와 레거시 redirect 고정
- Home `매출·비용` 아코디언 추가
- `axis:view` 열림/active 계약 유지

주요 파일:

- `apps/web/src/App.jsx`
- `apps/web/src/components/Shell.jsx`
- `apps/web/src/data/globalUtilities.js`
- `apps/web/src/i18n.js`
- `apps/web/test/ui-regression.test.mjs`
- `apps/web/test/home-dashboard-r1.test.mjs`

게이트:

- 신규 7개 Home 라우트가 새로고침 후 유지
- 구 Matter/Finance URL이 정확한 Home 라우트로 해소
- Home 축과 사이드바 active가 정확히 하나
- 선택 Matter와 필터 URL 보존

### WP-FIN-2 — 지표 집계와 고객 식별

목표:

- overview/monthly/clients가 같은 원천과 계산 함수를 사용
- ClientGroup canonical 매핑과 미연결 고객 보존
- 날짜 추론 및 통화 분리

주요 파일:

- `packages/analytics/src/refresh-job-service.js`
- `packages/analytics/src/dashboard-service.js`
- 필요 시 최소 신규 집계 파일 1개
- `packages/analytics/src/runtime-repository.js`
- `apps/api/src/analytics-runtime-context.js`
- `apps/api/src/server.js`
- `apps/api/test/cmp-r4-g8-analytics.test.js`
- `packages/analytics/test/runtime-services.test.js`

게이트:

- 전체 = 월별 합계 = 고객별 합계 + 미연결 고객
- KRW/USD 분리
- 취소·정정·부분수납 fixture 대사
- raw source payload 미포함
- denied count leak 없음

### WP-FIN-3 — Home 재무 현황 UI

목표:

- `FinanceSurface.jsx`를 Home 통합 재무 화면으로 승격
- 전체·월별·고객별 화면과 필터 구현

주요 파일:

- `apps/web/src/components/FinanceSurface.jsx`
- `apps/web/src/components/HomeSurface.jsx`
- `apps/web/src/data/apiClient.js`
- `apps/web/src/styles.css`
- `apps/web/test/home-dashboard-r1.test.mjs`
- `apps/web/test/ui-regression.test.mjs`

게이트:

- allow/denied/review/empty/error 상태 렌더
- 기간·통화·고객 필터와 URL 일치
- 화면 합계가 API fixture와 대사
- 좁은 창에서 표·필터 오버플로 없음
- 내부 ID와 합성 데이터 문자열 노출 없음

### WP-FIN-4 — Matter 정산 실행 기능 이전

목표:

- Matter의 `ChargeActionPanel`/`ChargePanel` 실행 기능을 Home Finance surface에서 재사용
- Matter에는 컨텍스트 딥링크만 유지

주요 파일:

- `apps/web/src/components/FinanceSurface.jsx`
- `apps/web/src/components/MattersSurface.jsx`
- `apps/web/src/data/apiClient.js`
- `apps/web/test/ui-regression.test.mjs`
- 관련 Matter finance 브라우저 proof script

게이트:

- 시간 기록, 경비, 대납, WIP, 사전검토, 청구서, 입금, 배정, CSV 전 흐름 PASS
- 기존 idempotency와 감사 이벤트 유지
- Matter 컨텍스트에서 이동 시 `matter_id` 유지
- 동일 기능 중복 구현 없음

### WP-FIN-5 — 권한·승인·감사

목표:

- scope 기반 메뉴·API 계약
- Home 승인 대기에서 재무 승인 필터 통합
- 회계 내보내기 고권한 분리

주요 파일:

- `apps/api/src/lawos-role-registry.js`
- `apps/api/src/permission-gate.js` 또는 기존 정책 원천
- `apps/api/src/finance-runtime-context.js`
- `apps/api/src/analytics-runtime-context.js`
- `apps/web/src/data/homeAccess.js`와 별도 finance access helper
- API/웹 권한 테스트

게이트:

- 역할군별 허용·차단 매트릭스 fixture PASS
- URL 직접 접근 재검증
- denied/review audit 기록
- 권한 밖 금액·건수·고객명 누출 없음

### WP-FIN-6 — Matter 메뉴 제거·하위 호환

목표:

- Matter 사이드바 `정산` 그룹 제거
- 기존 딥링크·북마크·테스트를 Home으로 이동
- `globalUtilities.js`의 finance decision을 Home 통합 결정으로 정리

주요 파일:

- `apps/web/src/components/Shell.jsx`
- `apps/web/src/components/MattersSurface.jsx`
- `apps/web/src/data/globalUtilities.js`
- `apps/web/test/ui-regression.test.mjs`
- `scripts/validate-lcx-global-ia.mjs`

게이트:

- Matter 사이드바에 정산 메뉴 0개
- Home에 기능 누락 0개
- 레거시 route redirect 전수 PASS
- active/open 상태 브라우저 QA PASS

### WP-FIN-7 — 웹·패키지 검증과 증거 패키지

목표:

- 웹 소스, 브라우저 렌더, 데스크톱 renderer, 실제 `matter.app`를 단계별 검증
- 구현과 릴리스 진실선을 분리한 closeout 작성

검증 명령:

```bash
node --test apps/api/test/cmp-r4-g7-finance.test.js
node --test apps/api/test/cmp-r4-g8-analytics.test.js
node --test packages/analytics/test/runtime-services.test.js
node --test apps/web/test/home-dashboard-r1.test.mjs
node --test apps/web/test/ui-regression.test.mjs
node scripts/validate-lcx-global-ia.mjs
npm --workspace apps/web run build
npm --workspace apps/desktop run prepare:web-renderer
npm --workspace apps/desktop run test:smoke
npm --workspace apps/desktop run build:mac
npm run matter-desktop:screen-qa
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

필수 화면 증거:

1. Home `매출·비용` 아코디언과 전체 현황
2. 월별 매출·비용
3. 고객별 매출·비용 및 미연결 고객
4. 시간 기록과 비용 처리
5. 청구·수납 전 단계
6. 미수금 aging
7. Matter 컨텍스트 딥링크
8. 권한 denied/review 상태
9. 실제 패키지 `matter.app`의 신규 Home 사이드바

권장 산출물 경로:

```text
artifacts/manual-qa/home-finance-settlement-2026-07-10/
docs/lazycodex/evidence/home-finance-settlement/
```

게이트:

- 모든 명시 validator PASS
- 9개 화면 증거 존재
- 웹 build 결과가 desktop renderer에 복사됨
- 실제 패키지 재빌드·종료·재실행 후 화면 확인
- `production_ready_claim:false`, `public_release_claim:false` 유지

## 10. 테스트 fixture 최소 세트

최소 5개 fixture를 사용한다.

1. 단일 고객·단일 Matter·단일 통화의 완전수납
2. 단일 고객·복수 Matter·부분수납
3. 복수 고객·복수 월·미수금 aging
4. 비용과 대납이 있으며 일부만 회수 가능한 경우
5. 고객 매핑 실패, 날짜 추론, 다중 통화가 동시에 있는 경우

각 fixture는 overview, monthly, clients 결과의 대사를 검증한다. 권한 fixture는 allow, denied, review_required를 각각 포함한다.

## 11. 완료 정의

다음 조건이 모두 충족될 때만 이 실행 지시서의 구현 완료로 판정한다.

1. Home 사이드바에 `매출·비용` 그룹과 7개 하위 항목이 존재한다.
2. 전체·월별·고객별 집계가 서버 read model을 사용하고 상호 대사된다.
3. 고객별 집계는 canonical ClientGroup을 사용하며 미연결 금액을 보존한다.
4. 통화별 합계가 분리되고 근거 없는 환산 합계가 없다.
5. Matter 정산의 기존 실행 기능이 Home에서 동작한다.
6. Matter 사이드바의 `정산` 그룹이 제거되고 컨텍스트 딥링크가 남는다.
7. Home 승인 대기와 재무 결재가 중복되지 않는다.
8. 역할·scope·객체 권한이 UI와 API에서 모두 적용된다.
9. 명시된 API/웹/IA/build/desktop/sloplint 검증이 모두 PASS한다.
10. 실제 `matter.app`에서 9개 필수 화면 증거가 확보된다.
11. closeout 문서가 구현 PASS와 공개 릴리스/go-live를 분리한다.

## 12. 중단·확인 조건

다음 상황에서는 임의로 범위를 넓히지 않고 오너에게 확인한다.

- `전체 비용`에 급여·임차료·일반 관리비까지 포함하라는 요구가 생기는 경우
- 환율 환산 합계를 요구하지만 승인된 환율 원천이 없는 경우
- ClientGroup과 billing client 관계가 복수 후보로 충돌하는 경우
- finance scope를 부여할 실제 사용자·그룹이 확정되지 않은 경우
- 외부 지급, 청구서 전송, 회계 시스템 전송 등 외부 상태 변경이 필요한 경우
- 공개 릴리스, go-live, production-ready 승격이 필요한 경우

## 13. AI Slop 방지 계약

- `Finance Hub`, `인사이트 센터`, `스마트 재무` 같은 추상 명칭을 사용하지 않는다.
- 근거 없는 KPI·성장률·전사 손익을 표시하지 않는다.
- 같은 크기의 요약 카드만 반복하지 않고 대사 가능한 표와 액션 큐를 우선한다.
- 한국어 번역투와 capability buzzword를 피한다.
- 구현 후 실제 렌더 화면에서 위계, 대비, 오버플로, 죽은 링크를 수동 확인한다.
- 자동 sloplint PASS만으로 시각 QA를 대체하지 않는다.

## 14. 실행 순서

```text
WP-FIN-1 계약·라우트
→ WP-FIN-2 집계 read model
→ WP-FIN-3 현황 UI
→ WP-FIN-4 실행 기능 이전
→ WP-FIN-5 권한·승인·감사
→ WP-FIN-6 Matter 메뉴 제거·하위 호환
→ WP-FIN-7 웹·패키지 검증·closeout
```

각 WP는 명시 pathspec만 포함하는 독립 커밋으로 만든다. 현재 worktree의 사용자 변경과 다른 작업 패키지를 섞지 않는다.

## 15. 현재 진실 상태

- 계획 문서: 작성 완료
- 코드 구현: WP-FIN-1~2 완료, WP-FIN-3~7 대기
- 테스트 PASS: WP-FIN-1 및 WP-FIN-2 집계·API·결제 읽기 계약 PASS
- 브라우저 QA: WP-FIN-1 라우트·Matter 컨텍스트·사이드바 상태 PASS
- 패키지 `matter.app` 반영: 미실행
- 서명/공증: 범위 밖
- 공개 릴리스: 승인 없음
- go-live: 승인 없음
