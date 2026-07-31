# 청구서 없는 수납과 매출 반영 ADR

- 상태: 채택 · 구현 및 검증 완료(배포 전)
- 기준일: 2026-07-30
- 대상 브랜치: `codex/direct-receipt-revenue-implementation-20260730`
- 기준 커밋: `140f1ad10af310fe54637a9058c786b115917beb`
- 운영 전제: 약 10명이 사용하는 단일 소규모 로펌
- 결정자: 제품 오너

## 1. 결론

`Invoice`와 `Payment`를 서로 독립된 사실로 유지한다. 입금은 청구서가 없어도 먼저 기록할 수 있고, 입금 후 별도의 `PaymentAllocation`으로 용도를 확정한다.

`PaymentAllocation`은 다음 두 정상 매출 경로를 함께 지원한다.

1. `Invoice → Payment → invoice_payment 배정`
2. `Payment → direct_fee 배정` — 청구서 없이 받은 사건 보수

원시 은행 입금이나 고객명 일치만으로는 매출을 확정하지 않는다. `client_advance`, `trust_deposit`, `other_non_revenue`, 미배정 잔액은 현금 유입에는 포함하지만 매출에서는 제외한다.

별도의 거대한 `Revenue` 서브시스템은 만들지 않는다. 기존 `Payment`, `PaymentMatch`, `BankTransactionClassification`, Finance read model을 재사용하고, 배정 원장만 최소한으로 일반화한다.

## 2. 현재 구조에서 확인된 사실

| 현재 계약 | 확인 위치 | 영향 |
|---|---|---|
| `Payment` 저장 자체는 `Invoice`를 요구하지 않는다. | `packages/payments/src/payment-service.js` | 백엔드 수납 원장은 이미 독립 가능하다. |
| `PaymentMatch`는 `invoice_id`를 필수로 요구한다. | `packages/payments/src/matching-service.js` | 수납 후 처리가 청구서 배정 한 종류로만 제한된다. |
| Home의 입금 기록 버튼은 활성 청구서가 없으면 비활성화된다. | `apps/web/src/components/HomeFinanceOperations.jsx`, `apps/web/src/components/MattersSurface.jsx` | 실제 사용자는 청구서 없는 입금을 기록할 수 없다. |
| 은행 입금은 등록 고객과 일치하면 청구서 없이 `client_receipt`/`sales`로 분류된다. | `packages/billing/src/bank-classification-service.js` | 청구서 없는 매출 개념은 이미 있으나 Payment 원장과 분리되어 있다. |
| Finance 집계는 `PaymentMatch`가 하나라도 존재하면 `Payment` 원본 수납을 읽지 않는다. | `packages/analytics/src/finance-read-model.js` | 일부 청구서 배정이 생긴 뒤 청구서 없는 수납이 집계에서 사라질 수 있다. |
| Home 대시보드 매출은 은행 분류의 `sales_amount`, Finance 집계는 Invoice/Payment 계열을 사용한다. | `apps/web/src/components/HomeDashboardModel.js`, `packages/analytics/src/finance-read-model.js` | 화면별 매출 원천과 숫자가 달라질 수 있다. |

현재 구조는 이미 필요한 원천 객체를 대부분 갖고 있다. 문제는 새로운 청구 시스템이 없어서가 아니라, 입금의 용도를 표현하는 공통 배정 원장이 없고 화면·집계가 청구서 중심으로 고정된 데 있다.

## 3. 목표와 비목표

### 목표

- 청구서를 발행한 뒤 받는 입금과 청구서 없이 받는 입금을 같은 수납 원장에서 관리한다.
- 입금액을 청구서, 직접 사건 보수, 선수금, 예치금, 기타 비매출로 나눌 수 있다.
- 같은 입금을 둘 이상의 경로에서 중복 매출로 계산하지 않는다.
- 청구서를 나중에 발행해도 기존 입금 이력을 잃거나 현금을 다시 인식하지 않는다.
- 전체·월별·고객별·Matter별 숫자가 동일한 원장과 동일한 기준으로 대사된다.
- 10인 로펌에서 재무 담당자 한 명이 예외만 확인할 수 있는 단순한 운영 흐름을 제공한다.

### 비목표

- 외부 회계 시스템 전체를 대체하는 복식부기 ERP 구축
- 세법상 매출 귀속 시기나 부가가치세 신고 시기의 자동 판정
- 원시 은행 입금의 무검토 자동 매출 확정
- 기존 Trust Ledger를 일반 수납 원장으로 합치기
- 새로운 최상위 Finance 메뉴 또는 다단계 기업형 결재 조직 추가
- 이번 계획 단계에서 실제 운영 데이터 마이그레이션, 배포 또는 go-live 수행

## 4. 용어 계약

| 용어 | 의미 | 매출 효과 |
|---|---|---:|
| 은행 입금 | 계좌에 실제 들어온 `BankTransaction` | 없음. 현금 흐름만 증명한다. |
| 수납 | 은행 입금 또는 수기 증빙으로 생성한 `Payment` | 없음. 아직 용도가 미확정일 수 있다. |
| 청구 | 발행된 `Invoice` | `청구 기준` 지표에 포함한다. |
| 수납 배정 | `PaymentAllocation`으로 입금의 용도를 확정한 기록 | 배정 유형에 따라 다르다. |
| 청구 수납 | `invoice_payment` 배정 | `수납 기준 매출`에 포함하고 해당 Invoice의 미수금을 줄인다. |
| 직접 사건 보수 | `direct_fee` 배정 | 청구서 없이 `수납 기준 매출`에 포함한다. |
| 선수금 | `client_advance` 배정 | 매출 제외. 향후 재배정 대상이다. |
| 예치금 | `trust_deposit` 배정 | 매출 제외. 기존 Trust Ledger에 연결한다. |
| 미배정 입금 | Payment 금액 중 활성 배정 합계를 뺀 잔액 | 매출 제외. 검토 큐에 남긴다. |

화면에서 단독으로 `매출`이라고 표시해야 하는 경우에는 현재 선택한 기준을 함께 표시한다.

- 청구 기준: `billed_amount`
- 수납 기준: `collected_revenue_amount`

은행 입금 총액은 `cash_inflow_amount`로 별도 표시하며 매출과 같은 숫자로 취급하지 않는다.

## 5. 목표 데이터 모델

### 5.1 Payment

기존 `Payment`를 수납 헤더로 유지한다.

필수 또는 권장 필드는 다음과 같다.

| 필드 | 규칙 |
|---|---|
| `payment_id` | tenant 내 고유 |
| `tenant_id` | 필수 |
| `amount`, `currency` | 양수, 원천 통화 보존 |
| `received_at` | 실제 수납일 |
| `bank_transaction_id` | 은행 가져오기 수납이면 필수, tenant 내 1:1 고유 |
| `bank_reference` | 기존 호환 필드, 외부 응답에서는 계속 마스킹 |
| `client_group_id` | 확인 가능한 경우 연결 |
| `matter_id` | 수납 시점에는 선택 가능 |
| `status` | `unallocated`, `partially_allocated`, `allocated`, `reversed` 중 파생 |
| `allocated_amount`, `unallocated_amount` | 활성 배정 원장에서 계산한 projection |

`Payment`의 상태와 배정 금액은 입력값을 신뢰하지 않고 활성 `PaymentAllocation` 합계에서 계산한다.

### 5.2 PaymentAllocation

`PaymentMatch`의 부분 배정·초과 배정 차단 원칙을 일반화한 append-only 원장이다.

| 필드 | 규칙 |
|---|---|
| `payment_allocation_id` | 필수, tenant 내 고유 |
| `tenant_id`, `payment_id` | 필수 |
| `allocation_type` | 아래 허용 유형 중 하나 |
| `amount`, `currency` | Payment와 동일 통화, 양수 |
| `invoice_id` | `invoice_payment`에서만 필수 |
| `client_group_id` | `direct_fee`, `client_advance`, `trust_deposit`에서 필수 |
| `matter_id` | `invoice_payment`는 Invoice에서 상속, `direct_fee`와 `trust_deposit`은 필수 |
| `allocated_at` | 수납 기준일 |
| `status` | `posted` 또는 `reversed` |
| `reverses_payment_allocation_id` | 정정 시 원본 참조 |
| `source_payment_match_id` | 기존 PaymentMatch 호환·이관 추적 |
| `actor_id`, `reason_code` | 감사용 |

허용 유형은 다음과 같다.

| 유형 | Invoice | Client | Matter | 수납 기준 매출 | AR 감소 |
|---|---:|---:|---:|---:|---:|
| `invoice_payment` | 필수 | Invoice에서 상속 | Invoice에서 상속 | 포함 | 포함 |
| `direct_fee` | 금지 | 필수 | 필수 | 포함 | 없음 |
| `client_advance` | 금지 | 필수 | 선택 | 제외 | 없음 |
| `trust_deposit` | 금지 | 필수 | 필수 | 제외 | 없음 |
| `other_non_revenue` | 금지 | 선택 | 선택 | 제외 | 없음 |

### 5.3 불변식

1. 같은 Payment의 활성 배정 합계는 Payment 금액을 초과할 수 없다.
2. Payment와 Allocation의 tenant 및 currency는 같아야 한다.
3. `invoice_payment`는 같은 tenant·currency의 존재하는 Invoice만 참조한다.
4. `direct_fee`는 Client와 Matter가 모두 있어야 매출로 확정된다.
5. 원시 BankTransaction, 자동 분류 제안 또는 미배정 Payment만으로 매출을 만들지 않는다.
6. 배정 정정은 원본 update/delete가 아니라 reversal과 대체 배정을 한 트랜잭션에서 기록한다.
7. 한 BankTransaction은 최대 한 Payment만 생성한다.
8. Invoice를 나중에 발행한 경우 기존 `direct_fee`를 reversal하고 같은 금액의 `invoice_payment`를 원자적으로 생성한다. 수납 합계는 변하지 않고 Invoice의 AR만 줄어든다.
9. Trust 입금은 기존 `TrustLedgerEntry`와 대사되어야 하며 일반 매출에 포함되지 않는다.
10. 모든 생성·재배정·취소는 idempotency key와 Finance 감사 이벤트를 남긴다.

## 6. 사용자 흐름

### 6.1 청구서 발행 후 입금

```text
Invoice 발행 → 입금 수납 → invoice_payment 배정 → Invoice 미수금 감소
```

현재 흐름을 유지하되, 입금 기록과 청구서 배정을 서로 다른 단계로 명확히 한다.

### 6.2 청구서 없는 입금

```text
입금 수납 → 고객·Matter 선택 → direct_fee 확정 → 수납 기준 매출 반영
```

Invoice, PreBill, WIP를 만들지 않아도 된다. 청구 기준 금액은 0이고 수납 기준 금액만 증가한다.

### 6.3 용도가 아직 불명확한 입금

```text
입금 수납 → 미배정 유지 → 검토 큐 → direct_fee / advance / trust / other 중 확정
```

고객명 자동 일치는 제안만 한다. 확정 전에는 매출에 포함하지 않는다.

### 6.4 입금 후 나중에 청구서 발행

```text
direct_fee 수납 → Invoice 발행 → 기존 배정 reversal + invoice_payment 재배정
```

청구 기준 금액은 Invoice 발행 시 증가한다. 수납 기준 금액은 재배정 전후 동일하고 현금은 다시 계산하지 않는다.

## 7. 10인 로펌용 운영 단순화

- 기존 Home `청구/수납`과 `자금현황`을 재사용하고 새 최상위 메뉴를 만들지 않는다.
- 기본 운영자는 `finance.payment.write`를 가진 재무 담당자 또는 파트너 한 명으로 둔다.
- 일반 `direct_fee`는 이 사용자의 1회 확인과 감사 기록으로 확정한다. 다단계 maker-checker는 기본값으로 만들지 않는다.
- Trust/선수금과 고액 예외만 기존 승인 정책으로 올릴 수 있게 한다.
- 정상 흐름은 완료 항목을 숨기고 `미배정`, `중복 의심`, `통화 불일치`, `고객·Matter 미연결`만 업무 큐에 남긴다.
- 자동 분류는 반복 거래의 입력을 줄이는 제안 기능으로만 사용한다. 저장된 규칙도 원장 효과를 자동 확정하지 않는다.
- `direct_fee`에는 Matter를 필수로 하여 소규모 조직에서도 사건별 책임과 수익 추적을 잃지 않는다.

## 8. 지표와 read model 계약

| 지표 | 계산 |
|---|---|
| `billed_amount` | 유효 Invoice와 정정 합계 |
| `invoice_collected_amount` | 활성 `invoice_payment` 배정 합계 |
| `direct_fee_amount` | 활성 `direct_fee` 배정 합계 |
| `collected_revenue_amount` | `invoice_collected_amount + direct_fee_amount` |
| `unallocated_receipt_amount` | Payment 합계 - 활성 Allocation 합계 |
| `advance_trust_amount` | `client_advance + trust_deposit` 배정 합계 |
| `cash_inflow_amount` | 대사된 BankTransaction inflow 합계 |
| `ar_balance` | Invoice 잔액. 직접 사건 보수는 AR을 만들지 않는다. |
| `contribution_amount` | 선택한 인식 기준 금액 - Matter 비용 |

`recognition_basis=billed|collected`는 메타데이터에만 남기지 않고 실제 대표 금액과 기여액 계산에 적용한다.

- `billed`: 대표 매출 = `billed_amount`
- `collected`: 대표 매출 = `collected_revenue_amount`

overview, monthly, clients, Home dashboard는 같은 집계 함수군을 사용한다. Bank classification의 `primary_type=sales`를 Home 매출의 독립 원천으로 사용하지 않는다. 자금현황에서는 해당 값을 `고객 입금 제안/확정` 상태로 보여줄 수 있지만 Finance 매출 원장은 PaymentAllocation을 기준으로 한다.

현재 `PaymentMatch`가 하나라도 있으면 나머지 Payment를 전부 무시하는 분기는 제거한다. 각 Payment별로 활성 Allocation을 합산하고 미배정 잔액을 별도 보존한다.

## 9. 대안 검토

| 대안 | 복잡도 | 장점 | 단점 | 판정 |
|---|---:|---|---|---|
| A. 모든 매출에 Invoice 강제 | 낮음 | 현재 흐름 유지 | 실제 소규모 로펌 수납을 막고 불필요한 가짜 Invoice를 만든다. | 제외 |
| B. 고객명과 일치한 BankTransaction을 곧바로 매출로 계산 | 낮음 | 현재 자금현황 로직을 거의 그대로 사용 | 선수금·예치금 오분류, Payment 중복, 화면별 숫자 불일치 위험이 크다. | 제외 |
| C. Payment 독립 + 범용 PaymentAllocation | 중간 | 두 정상 경로와 선수금·Trust를 한 원장에서 대사하고 중복을 차단한다. | 배정 서비스와 이관 작업이 필요하다. | 채택 |
| D. 청구서 없는 입금 전용 `DirectReceipt` 객체 추가 | 중간 | 기능 이름이 직관적이다. | Payment와 현금 원장을 이중화하고 추후 Invoice 연결이 복잡해진다. | 제외 |

## 10. 구현 계획

### 단계 0 — 계약 고정

목표: 구현 전에 용어와 불변식을 테스트 이름으로 고정한다.

- 이 ADR 승인
- `direct_fee`의 Matter 필수, 일반 수납 1회 확인 기본값 확정
- 다음 골든 케이스를 먼저 테스트로 작성
  - Invoice 발행 후 전액 수납
  - Invoice 없이 direct fee 수납
  - direct fee 수납 후 Invoice 발행
  - 한 Payment의 일부 Invoice 배정 + 일부 선수금
  - Trust 입금의 매출 제외

완료 기준: 기존 Invoice 경로와 신규 direct fee 경로의 기대 숫자가 명시되고, 현금·청구·수납 매출·AR이 서로 구분된다.

### 단계 1 — 배정 원장 코어

주요 변경 후보:

- `packages/payments/src/payment-allocation-service.js` 신규
- `packages/payments/src/payment-service.js`
- `packages/payments/src/matching-service.js`
- `packages/payments/src/index.js`
- `packages/billing/src/finance-repository.js`
- `packages/billing/src/central-ledger.js`

작업:

1. `PaymentAllocation` primary ID, 금액 필드, 참조, append-only 규칙을 Finance domain descriptor에 추가한다.
2. 생성, reversal, direct fee의 Invoice 재배정 함수를 구현한다.
3. 기존 `matchPaymentToInvoice()`는 새 allocation 서비스를 호출하는 호환 wrapper로 유지한다.
4. Payment 상태와 `allocated_amount`/`unallocated_amount` projection을 allocation 합계로 갱신한다.
5. 초과 배정, tenant/currency 불일치, 중복 bank source, reversal 재사용을 차단한다.

완료 기준: 기존 PaymentMatch 테스트가 통과하고 신규 다중 배정·direct fee·reversal 테스트가 추가된다.

### 단계 2 — API와 권한

주요 변경 후보:

- `apps/api/src/finance-runtime-context.js`
- `apps/api/test/cmp-r4-g7-finance.test.js`
- `apps/web/src/data/apiClient.js`

작업:

1. `GET/POST /api/finance/payment-allocations`를 추가한다.
2. 기존 `POST /api/finance/payment-matches`는 호환 route로 유지하고 `invoice_payment`를 생성한다.
3. `POST /api/finance/payments`는 Invoice 없이 `received_at`, Client, Matter, bank source를 받을 수 있게 한다.
4. 기존 `finance.payment.write`를 재사용한다. 새 광범위 scope는 만들지 않는다.
5. denied/review 응답에서 금액·건수·고객명 누출을 계속 차단한다.

완료 기준: Invoice 없는 Payment 생성과 direct fee 배정이 API에서 성공하고, 무권한·교차 tenant·통화 불일치가 차단된다.

### 단계 3 — 은행 거래와 Payment 연결

주요 변경 후보:

- `packages/billing/src/bank-classification-service.js`
- `packages/billing/src/bank-transaction-service.js`
- `apps/api/src/finance-runtime-context.js`

작업:

1. `client_receipt`를 현금의 고객 후보 분류로 취급하고 자동 매출 효과를 제거한다.
2. 사용자가 고객 입금을 확인하면 동일 BankTransaction을 원천으로 하는 Payment를 idempotent하게 생성한다.
3. 같은 거래가 수기 Payment와 은행 Payment 양쪽에 존재하면 자동 합치지 않고 중복 의심 큐에 둔다.
4. 저장된 분류 규칙은 제안값을 채우되 PaymentAllocation을 자동 게시하지 않는다.
5. UI 표기 변경은 별도 화면 설계 단계에서 `고객 매출`과 `고객 입금`의 의미를 명확히 검토한다.

완료 기준: BankTransaction 1건당 Payment 최대 1건이며, 분류만으로는 수납 기준 매출이 증가하지 않는다.

### 단계 4 — 집계와 대시보드 통일

주요 변경 후보:

- `packages/analytics/src/finance-read-model.js`
- `packages/analytics/test/runtime-services.test.js`
- `apps/api/src/analytics-runtime-context.js`
- `apps/web/src/components/HomeDashboardModel.js`
- `apps/web/src/components/ClientsSurface.jsx`

작업:

1. Payment 전체와 PaymentAllocation 전체를 Payment별로 집계한다.
2. 기존 전역 `PaymentMatch 존재 여부` fallback을 제거한다.
3. `invoice_collected_amount`, `direct_fee_amount`, `collected_revenue_amount`, `unallocated_receipt_amount`, `advance_trust_amount`를 overview/monthly/clients에 추가한다.
4. `recognition_basis`가 대표 매출과 기여액 계산을 실제로 바꾸게 한다.
5. Home dashboard와 Client 매출 순위도 동일 read model을 사용한다.
6. Cashflow의 총입금과 Finance의 수납 기준 매출 차이를 대사 필드로 노출한다.

완료 기준:

- `cash_inflow = allocated revenue + advance/trust + other + unallocated ± 조정` 대사가 성립한다.
- overview 합계 = monthly 합계 = clients 합계 + 미연결 합계가 성립한다.
- Invoice 없는 direct fee가 수납 기준에는 포함되고 청구 기준·AR에는 포함되지 않는다.

### 단계 5 — 소규모 로펌용 수납 화면

주요 변경 후보:

- `apps/web/src/components/HomeFinanceOperations.jsx`
- `apps/web/src/components/MattersSurface.jsx`
- `apps/web/src/components/FinanceSurface.jsx`
- `apps/web/test/ui-regression.test.mjs`

구현 전 기존 `청구/수납` 화면을 캡처해 Lazyweb 설계 보고서와 AI slop taxonomy 검토를 수행한다.

작업 방향:

1. 활성 Invoice가 없어도 `입금 기록`을 사용할 수 있게 한다.
2. 입금 기록 후 처리 선택을 제공한다.
   - 청구서에 배정
   - 청구서 없이 사건 보수로 처리
   - 선수금/예치금
   - 기타 입금
3. direct fee에서는 고객, Matter, 금액, 수납일만 필수로 한다.
4. 정상 처리 항목은 축약하고 미배정·중복·불일치 예외를 우선 표시한다.
5. 청구 기준/수납 기준을 바꾸면 대표 숫자의 라벨과 근거가 함께 바뀌게 한다.

완료 기준: Invoice 없는 실제 렌더 흐름, 키보드 접근성, 권한 거부, 모바일 너비, 한국어 문구를 수동 QA한다.

### 단계 6 — 호환 이관과 단계적 전환

1. 읽기 전용 dry-run으로 기존 데이터를 네 그룹으로 분류한다.
   - `PaymentMatch`가 있는 Payment
   - Match 없이 남은 Payment
   - `client_receipt` Bank classification만 있는 거래
   - BankTransaction과 수기 Payment가 중복 의심되는 거래
2. 기존 PaymentMatch는 `source_payment_match_id`를 가진 `invoice_payment` Allocation으로 결정론적으로 backfill한다.
3. Match 없는 Payment와 기존 `client_receipt`는 자동 매출 변환하지 않고 검토 목록으로 만든다.
4. 구 read model과 신 read model을 같은 필터로 비교해 차이를 영수증으로 남긴다.
5. 합계와 예외가 승인된 뒤 신 read model을 기본으로 전환한다.
6. 기존 PaymentMatch API와 읽기 호환은 한 릴리스 이상 유지한 뒤 별도 결정으로 제거한다.

완료 기준: 실제 운영 write 전 백업/복원 계획, dry-run 합계, 중복 후보, 미배정 금액, 사용자 승인 기록이 모두 존재한다.

## 11. Testable Units of Work

각 단위는 독립된 실패 조건과 실행 가능한 검증 명령을 가진다. 앞 단위가 통과하지 않으면 뒤 단위의 완료로 계산하지 않는다.

### TUW-00 — 기준선과 실행환경

- 입력: `origin/main@140f1ad10af310fe54637a9058c786b115917beb`
- 변경: Node 22와 lockfile 의존성으로 테스트 환경을 고정한다.
- 검증:
  - `node --version`이 `v22.*`
  - Payments, Billing, Analytics, Finance API, Home Finance 관련 기존 테스트 통과
- 완료 증거: 변경 전 통과 건수와 환경 결손을 분리한 기준선 기록

### TUW-01 — 배정 계약의 실패 테스트

- 입력: 기존 `Payment`, `Invoice`, `PaymentMatch`
- 변경: `PaymentAllocation`의 유형, 필수 참조, 금액·통화·tenant 불변식을 테스트로 먼저 고정한다.
- 검증:
  - `invoice_payment`는 Invoice 필수
  - `direct_fee`는 Client와 Matter 필수, Invoice 금지
  - 초과 배정, 교차 tenant, 통화 불일치 차단
  - 미배정 Payment 자체는 매출 효과 없음
- 완료 증거: 구현 전 실패하고 구현 후 통과하는 payments 집중 테스트

### TUW-02 — append-only 배정 원장

- 입력: Finance record-domain descriptor
- 변경: `PaymentAllocation` primary key, money fields, references, append-only 규칙을 추가한다.
- 검증:
  - 파일 저장소와 PostgreSQL roundtrip
  - 기존 배정 update/delete 차단
  - Payment·Invoice·Matter 참조 검증
- 완료 증거: central-ledger 집중 테스트와 기존 원장 회귀 통과

### TUW-03 — 배정 서비스와 기존 Match 호환

- 입력: 미배정 또는 부분 배정 Payment
- 변경:
  - `invoice_payment`, `direct_fee`, `client_advance`, `trust_deposit`, `other_non_revenue` 게시
  - reversal과 direct fee→Invoice 재배정
  - 기존 `matchPaymentToInvoice()`를 호환 wrapper로 유지
- 검증:
  - 한 Payment를 여러 유형으로 부분 배정
  - 활성 배정 합계로 `allocated_amount`, `unallocated_amount`, 상태 계산
  - idempotent replay가 원장·Invoice·감사 이벤트를 중복 생성하지 않음
  - 재배정 전후 현금·수납 기준 매출 불변
- 완료 증거: 서비스 골든 케이스 6종과 기존 PaymentMatch 테스트 통과

### TUW-04 — canonical Finance read model

- 입력: Invoice, Payment, PaymentAllocation, 호환 PaymentMatch
- 변경: Payment별 활성 배정을 합산하고 전역 PaymentMatch fallback을 제거한다.
- 검증:
  - `billed_amount`
  - `invoice_collected_amount`
  - `direct_fee_amount`
  - `collected_revenue_amount`
  - `unallocated_receipt_amount`
  - `advance_trust_amount`
  - `other_non_revenue_amount`
- 완료 증거: overview = monthly 합계, clients + 미연결 = overview 대사 테스트

### TUW-05 — 실제 인식 기준 전환

- 입력: 동일 기간의 billed와 collected 데이터
- 변경: `recognition_basis=billed|collected`가 대표 매출과 기여액 계산을 전환한다.
- 검증:
  - billed 선택 시 대표 매출 = Invoice 청구액
  - collected 선택 시 대표 매출 = invoice payment + direct fee
  - 직접 보수는 AR을 만들지 않음
- 완료 증거: 같은 fixture에서 기준만 바꿔 결과가 달라지는 Analytics 테스트

### TUW-06 — API와 권한 경계

- 입력: `finance.payment.write` 세션
- 변경:
  - `GET/POST /api/finance/payment-allocations`
  - Invoice 없는 `POST /api/finance/payments`
  - 기존 `POST /api/finance/payment-matches` 호환
- 검증:
  - 허용 사용자의 direct fee 성공
  - 무권한, 교차 tenant, 잘못된 통화·유형 거부
  - denied/review 응답의 금액·고객명·건수 비노출
  - bank reference 마스킹과 감사 이벤트 유지
- 완료 증거: Finance API 집중 테스트 통과

### TUW-07 — 은행 거래 후보와 원장 효과 분리

- 입력: `client_receipt` 분류와 BankTransaction
- 변경: 분류는 고객 입금 후보만 만들고 확인 시 Payment를 idempotent하게 생성한다.
- 검증:
  - 분류만으로 `collected_revenue_amount`가 증가하지 않음
  - BankTransaction 하나당 Payment 최대 하나
  - 수기 Payment와 중복 의심 시 자동 병합하지 않음
- 완료 증거: bank classification/import 재실행 테스트 통과

### TUW-08 — UI 설계 근거

- 입력: 변경 전 Home/Matter `청구/수납` 실제 화면
- 변경: 없음. 구현 전에 시각적 기준과 필요한 상태만 확정한다.
- 검증:
  - 변경 전 화면 캡처
  - Lazyweb hosted report 생성
  - AI slop taxonomy의 strong/no-verify 신호 점검
- 완료 증거: 캡처 파일, Lazyweb 보고서 URL, 적용할 변경 목록

### TUW-09 — 소규모 로펌 수납 UI

- 입력: Payment 생성과 Allocation API
- 변경:
  - Invoice가 없어도 입금 기록 가능
  - `청구서에 배정`과 `청구서 없이 사건 보수`를 명시적으로 선택
  - 선수금·예치금·기타·미배정 상태 지원
  - 미배정·중복·불일치 예외를 정상 완료 건보다 우선 표시
- 검증:
  - Invoice 있음/없음, 부분 배정, validation error, denied, empty 상태
  - 키보드 조작, focus, 라벨, 1440/1024/768/390 너비
  - 한국어 번역투와 죽은 버튼 없음
- 완료 증거: UI 계약 테스트, 실제 브라우저 캡처, 수동 접근성 체크

### TUW-10 — 호환 이관 dry-run

- 입력: 기존 PaymentMatch, unmatched Payment, client_receipt classification
- 변경:
  - PaymentMatch→`invoice_payment` 결정론적 투영
  - 미배정·중복 의심은 자동 매출 전환 없이 보고
- 검증:
  - dry-run은 저장소를 변경하지 않음
  - 같은 입력의 재실행 결과 동일
  - backfill 재실행은 중복 Allocation 0건
  - 구/신 read model 차이와 예외 합계가 설명 가능
- 완료 증거: fixture 기반 dry-run 및 idempotency 테스트

### TUW-11 — 종합 회귀와 완료 판정

- 입력: TUW-01~10 전체 변경
- 변경: 결함 수정 외 기능 추가 없음
- 검증:
  - Payments, Billing, Analytics, API, Web 관련 전체 테스트
  - Web build와 typecheck
  - `sloplint.py --changed`
  - 실제 렌더 화면에서 제출·오류 복구·권한 거부 확인
- 완료 증거: 통과 명령과 건수, 남은 비차단 한계, 미수행 배포 범위를 명시한 handoff

## 12. 필수 골든 케이스

| 케이스 | 청구액 | 수납 기준 매출 | 현금 유입 | AR |
|---|---:|---:|---:|---:|
| Invoice 100, 전액 입금·배정 | 100 | 100 | 100 | 0 |
| Invoice 없이 direct fee 100 | 0 | 100 | 100 | 0 |
| direct fee 100 후 Invoice 100 발행·재배정 | 100 | 100 | 100 | 0 |
| 입금 100 중 Invoice 60, 선수금 40 | Invoice 금액 기준 | 60 | 100 | Invoice 잔액 기준 |
| 입금 100, 미배정 | 0 | 0 | 100 | 0 |
| Trust 입금 100 | 0 | 0 | 100 | 0 |
| 같은 은행 거래를 두 번 가져오기 | 변화 없음 | 변화 없음 | 1회 | 변화 없음 |
| direct fee reversal 후 환급 | 원 Invoice 없음 | 순액 반영 | 실제 흐름 반영 | 0 |

## 13. 검증 범위

- 서비스 단위 테스트: Payment, Allocation, reversal, 재배정, 초과 배정
- Finance domain reconciliation: 참조, 금액, append-only, idempotency
- API 테스트: allow/deny/review, tenant 경계, 민감 필드 마스킹
- Analytics 테스트: overview/monthly/clients/Home/Client 동일 합계
- Bank import 테스트: 원천 1:1, 분류와 원장 효과 분리, 중복 의심
- 기존 회귀: Invoice 발행, PaymentMatch, AR aging, Trust drawdown, 회계 export
- 저장소 회귀: file store와 PostgreSQL record-domain roundtrip
- 렌더 QA: Invoice 있음/없음, 부분 배정, 미배정, denied, empty, error
- AI slop 검토: 구현 단계에서 `sloplint --changed`와 실제 화면 확인

## 14. 위험과 대응

| 위험 | 대응 |
|---|---|
| 입금과 매출을 같은 뜻으로 오해 | cash inflow, collected revenue, billed amount를 별도 필드·라벨로 유지 |
| 기존 Bank classification과 Payment의 중복 | BankTransaction→Payment 1:1 키와 migration duplicate queue |
| 선수금·Trust를 매출로 잘못 포함 | allocation type별 명시적 효과와 무검토 자동 게시 금지 |
| direct fee 후 Invoice 발행 시 이중 계산 | reversal + invoice_payment 재배정 원자 처리 |
| 기존 PaymentMatch 소비자 파손 | 호환 API/wrapper와 결정론적 backfill 유지 |
| 10인 조직에 과도한 절차 | 일반 direct fee는 1회 확인, 예외만 큐, 새 상위 메뉴·새 승인 조직 없음 |
| 회계·세무 확정으로 오해 | 관리용 청구/수납 지표와 외부 회계 확정을 명시적으로 분리 |

## 15. 적용한 구현 기본값

다음 기본값으로 구현했다.

1. `direct_fee`는 Client와 Matter를 모두 필수로 한다.
2. 일반 direct fee는 `finance.payment.write` 보유자의 1회 확인으로 게시한다.
3. 은행 고객명 자동 일치는 제안만 하고 매출을 자동 확정하지 않는다.
4. Home 대표 매출은 선택한 청구/수납 기준을 명시하고, 현금 유입은 별도 숫자로 유지한다.
5. 기존 PaymentMatch는 즉시 삭제하지 않고 PaymentAllocation 호환 경로로 유지한다.

## 16. 구현 완료 증거

| TUW | 결과 | 핵심 증거 |
|---|---|---|
| TUW-00~03 | 완료 | `PaymentAllocation` append-only 원장, 다중 배정, reversal, direct fee→Invoice 재배정, 기존 `PaymentMatch` 호환 |
| TUW-04~05 | 완료 | 청구/수납 기준별 대표 매출, 직접 보수, 선수·예치, 기타 비매출, 미배정 금액을 같은 read model에서 대사 |
| TUW-06~07 | 완료 | 기존 `finance.payment.write` 경계에서 직접 수납 API 제공, 고객 입금 확인 시 BankTransaction당 Payment 1건 생성, 분류만으로 매출 효과 없음 |
| TUW-08~09 | 완료 | Lazyweb 근거를 반영한 기존 청구/수납 화면 확장, Invoice 없는 직접 보수 흐름과 390px 무가로스크롤 검증 |
| TUW-10 | 완료 | 기존 Match의 결정론적 dry-run/backfill, 취소 Match 제외, 미배정 현금 자동 매출 승격 없음 |
| TUW-11 | 완료 | 루트 테스트, 패키지/API/Web 집중 테스트, 타입 검사, 프로덕션 빌드, 실제 브라우저 흐름, AI slop 검사 통과 |

배포와 실제 운영 데이터 migration write는 이 ADR의 구현 완료에 포함하지 않는다. `trust_deposit` 배정은 이 Finance 원장에서 매출 제외 분류를 담당하며, 법적 예치금 원장의 입출금 자체는 기존 Trust Ledger 절차를 계속 사용한다.

## 17. 운영 이관 절차

운영 이관은 `scripts/run-direct-receipt-production-migration.mjs`와 Lambda 직접 호출 전용 `direct_receipt_allocation_migration` maintenance action을 사용한다.

1. clean exact `origin/main`과 배포 Lambda의 `LAWOS_DEPLOYMENT_COMMIT`·`LAWOS_DEPLOYMENT_TREE`가 일치하는지 확인한다.
2. 기본 dry-run으로 pending backfill, matched Payment, unallocated Payment, 기존 Allocation 건수를 확인한다.
3. `--execute`, 고유 idempotency key, `MIGRATE_PAYMENT_MATCHES_TO_ALLOCATIONS` 확인 문자열이 모두 있을 때만 write를 수행한다.
4. 기존 `PaymentMatch`만 `invoice_payment`로 backfill하고, unmatched Payment는 매출로 승격하지 않는다.
5. 실행 직후 post-check에서 pending backfill 0건과 자동 매출 승격 0건을 확인한다.
6. 결과에는 Payment·Invoice ID, 고객 값 또는 원시 거래 값을 기록하지 않는다.
