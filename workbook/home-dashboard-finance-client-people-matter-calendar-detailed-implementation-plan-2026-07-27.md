# Law Firm OS Home Dashboard Finance·Client·People·Matter·Calendar Detailed Implementation Plan

- 작성일: 2026-07-27 KST
- 기준 저장소: `/Users/jws/Documents/Codex/Law Firm OS`
- 전용 worktree: `/Users/jws/.codex/worktrees/law-firm-os-home-dashboard-20260727`
- 작업 브랜치: `codex/home-dashboard-rebuild-20260727`
- 기준 `origin/main` SHA: `5af443f18c11897a8d0fd731e54c5fae383a24d5`
- 기준 tree: `d0174a3853ac80a1ff754b4f72965ed8b4030172`
- 디자인 근거: [Lazyweb Home dashboard report](https://www.lazyweb.com/report/lazyweb/a79c4796-860a-4c3f-bb78-1f11187c80ef/?source=create)
- 실행 범위: source-local 구현, 테스트, 실제 렌더 QA, 로컬 커밋
- 제외 범위: push, PR, main 병합, release, signing, AWS mutation, production traffic, go-live

## 1. 목표

현재 Home 기본 대시보드를 부분 보완하지 않고 다음 항목으로 전면 교체한다.

1. Finance
   - 이번달 매출
   - 이번달 급여 총액
   - 이번달 비용처리
   - 월별 매출 줄그래프
   - 급여 구분 원그래프: 파트너, 고문, 직원
2. Client
   - 신규 고객
   - 잠재고객
3. People
   - 휴가 신청
4. Matter
   - 신규 매터
   - 종결된 매터
5. 캘린더

완료 시 Home 기본 화면에는 실제 권한과 데이터 상태를 반영한 위 항목만 표시되며, 기존 다섯 위젯과 그룹 헤더·hero는 표시되지 않는다.

## 2. 절대 삭제·보존 계약

### 2.1 Home 기본 화면에서 제거

- `오늘 할 일`
- `승인 대기`
- `신규 수임`
- 기존 목록형 `월별 매출`
- `최근 작업`
- `home-dashboard-hero`
- `재무 현황`
- `운영 현황`
- 위 두 그룹을 위한 탭·구분선·빈 자리

### 2.2 기능은 보존

- `home-todo`, `home-requests`, `home-requests-leave`, `matter-intake`,
  `home-finance-monthly`, `matters-list` 등 원본 상세 경로는 삭제하지 않는다.
- 알림 badge 계산, 요청 승인, 할 일 처리, Matter 수임, Finance 상세 화면은
  기존 네비게이션과 상세 화면에서 계속 동작해야 한다.
- 삭제된 위젯에서만 사용하던 렌더 코드·CSS·중복 fetch만 제거한다.

## 3. 최종 레이아웃 계약

Home 기본 화면은 별도 페이지·섹션 제목 없이 다음 세 줄로 시작한다.

```text
[ 이번달 매출 4 ] [ 이번달 급여 총액 4 ] [ 이번달 비용처리 4 ]

[ 월별 매출 줄그래프 8................ ] [ 급여 구분 원그래프 4 ]

[ Client 3 ] [ People 3 ] [ Matter 3 ] [ 캘린더 3 ]
```

### 3.1 최상단 KPI 카드

- 세 카드는 같은 정보 위계를 가지므로 같은 높이와 너비를 사용한다.
- 카드마다 제목, 실제 금액, 기준 설명, 전월 동일 기간 또는 직전 월 대비값을 표시한다.
- 장식용 대형 원 아이콘, rainbow palette, gradient, glass effect를 사용하지 않는다.
- 값이 없거나 권한이 없을 때 `0`으로 위장하지 않고 `empty`, `denied`,
  `review_required`, `partial`, `error` 상태를 표시한다.

### 3.2 Finance 차트

- 월별 매출은 최근 12개월 KRW 청구액을 줄그래프로 표시한다.
- 급여 구분은 선택된 월의 총지급액을 파트너·고문·직원 원그래프로 표시한다.
- 원그래프 중앙에는 전체 급여 총액, 범례에는 분류별 금액과 비율을 표시한다.
- 직급 판정 근거가 없는 금액은 `미분류`로 별도 표시하며 직원으로 자동 편입하지 않는다.

### 3.3 도메인 카드

- Client: 이번 달 신규 고객 수, 현재 잠재고객 수, 최근 항목 최대 3건
- People: 승인 대기 휴가 신청 수, 최근 신청 최대 3건
- Matter: 이번 달 신규 매터 수, 이번 달 종결 매터 수, 최근 항목 최대 3건
- Calendar: 기존 월간 달력, 선택일 일정, 임박 기한, 전체 캘린더 딥링크

## 4. 지표 계약

### 4.1 시간과 통화

- 월 경계는 `Asia/Seoul` 기준이다.
- Finance 기본 통화는 KRW다.
- 서로 다른 통화를 환산 없이 합산하지 않는다.
- 현재 월 증감은 가능하면 직전 월 동일 경과일과 비교하고, 비교 기반이 없으면
  증감 표시를 생략한다.

### 4.2 이번달 매출

- `analytics finance monthly`의 `billed_amount`를 사용한다.
- UI에는 `청구 기준`을 명시한다.
- 월별 매출 줄그래프와 최상단 매출 카드는 같은 원천·정의를 사용한다.

### 4.3 이번달 비용처리

- 기존 `matter_cost` 호환성은 유지한다.
- 신규 `processed_cost`를 추가해 다음만 포함한다.
  - `status`가 `approved`, `posted`, `paid`, `reimbursed`, `settled`
  - 또는 기존 계약상 `approved_for_wip === true`
- `submitted`, `draft`, `rejected`, `cancelled`, `void`, `deleted`는 처리비용에서 제외한다.

### 4.4 이번달 급여 총액·구분

- HRX payroll의 선택 월 `approved` 또는 `closed` run만 집계한다.
- 최종 선택 우선순위는 `closed > approved`, 동률이면 최신 run이다.
- 브라우저에는 직원별 급여 결과를 전달하지 않는다.
- 서버가 `gross_krw`, `employee_count`, `categories` aggregate만 반환한다.
- 분류 근거는 해당 급여기간에 유효한 `hrx_employment_profiles.title`이다.
  - 파트너: `partner`, `파트너`, `대표변호사`, `구성원변호사`
  - 고문: `advisor`, `adviser`, `counsel`, `고문`, `자문위원`, `자문역`
  - 직원: 유효한 프로필이 있으나 위 두 분류가 아닌 구성원
  - 미분류: 유효한 프로필이 없거나 판정 근거가 없는 구성원

### 4.5 Client

- 신규 고객: 현재 월에 생성된 CRM Account 중 client 계정
- 잠재고객: 종료·실패·취소 상태가 아닌 Lead와 Opportunity
- `party_id`, `account_id`, 명시적 연계 ID를 우선해 중복 제거한다.
- Contact를 별도 잠재고객으로 중복 집계하지 않는다.

### 4.6 People

- 기존 Home action inbox 중 `subtype === "leave"`인 approval만 사용한다.
- 카드에는 승인 대기 건수와 due date 우선 최근 3건을 표시한다.
- 기존 action inbox의 role·tenant·count leak 방지 계약을 유지한다.

### 4.7 Matter

- 신규 매터: 현재 월 `opened_at` 또는 `created_at`이고 status가 `opening` 또는 `active`
- 종결된 매터: 현재 월 `closed_at`이고 status가 `closed`
- 카드 클릭은 기존 `matters-list` 또는 해당 Matter 상세로 이동한다.

## 5. 구현 설계

### 5.1 기존 계약 재사용

- Finance: `/api/analytics/finance/monthly`
- Client: CRM accounts, leads, opportunities
- Matter: `/api/matters`
- People: Home action inbox
- Calendar: 기존 agenda 및 calendar widget
- UI 상태: 기존 `DashboardReadState`
- 카드·행: 기존 `DashboardCard`, `DashboardListCard`, `DashboardRecordRow`

### 5.2 최소 신규 구현

1. `packages/analytics/src/finance-read-model.js`
   - `processed_cost` additive metric
2. `apps/api/src/routes/hrx/payroll-runtime.js`
   - 개인값을 노출하지 않는 dashboard summary aggregate
3. `apps/api/src/hrx-runtime-context.js`
   - `GET /api/hrx/payroll/dashboard-summary`
4. `apps/api/src/routes/hrx/route-policy-map.js`
   - `hrx.payroll.preview` 및 payroll step-up 계약
5. `apps/web/src/people/hrxApiClient.ts`
   - summary client
6. `apps/web/src/components/HomeDashboardModel.js`
   - 순수 데이터 정규화·월 경계·dedupe·차트용 model
7. `apps/web/src/components/HomeDashboardCharts.jsx`
   - dependency 없는 accessible SVG line/donut chart
8. `apps/web/src/components/HomeSurface.jsx`
   - 새 데이터 wiring, 기존 위젯 제거, 새 layout render
9. `apps/web/src/styles.css`
   - 12-column desktop, responsive, focus, reduced motion

### 5.3 차트 접근성

- SVG에 `role="img"`, `title`, `desc`를 제공한다.
- 차트 바로 아래 screen-reader용 데이터 표 또는 리스트를 제공한다.
- line point와 donut legend는 keyboard focus 가능해야 한다.
- 색상만으로 series를 구분하지 않고 label·금액·비율을 함께 제공한다.
- `prefers-reduced-motion`에서는 transition을 제거한다.

## 6. 작업 단위

### HD-001 — Baseline·plan·goal

- clean worktree와 exact main 고정
- 본 계획 문서 저장
- 문서명을 포함한 goal 생성

완료 기준: worktree clean, plan 파일 존재, goal active.

### HD-002 — Finance processed-cost 계약

- `processed_cost` 계산 추가
- 월·전체·고객 집계 보존
- submitted expense 제외와 approved expense 포함 테스트
- 기존 `matter_cost` 결과 불변 테스트

### HD-003 — Payroll dashboard aggregate

- month validation
- approved/closed run 선택
- 유효 employment profile 선택
- partner/advisor/staff/unclassified 집계
- 개인 employee row, 이름, 이메일, credential 미포함 증명
- route policy, scope, step-up, tenant 격리 테스트

### HD-004 — Home view model

- 서울 월 경계
- Finance current month 및 12개월 series
- 신규 고객·잠재고객 dedupe
- 신규·종결 Matter
- leave approval filtering
- partial·denied·error 상태 보존

### HD-005 — 차트

- native SVG line chart
- native SVG donut chart
- 빈 데이터, 단일 값, 0 합계, 큰 금액, 미분류 처리
- keyboard·screen-reader fallback

### HD-006 — Home 전면 교체

- 기존 다섯 위젯과 hero 제거
- 그룹 헤더 0건
- 최상단 KPI 3개
- Finance 차트 2개
- Client·People·Matter·Calendar 4개
- 기존 상세 route 유지

### HD-007 — 반응형·Forest UI

- 1366×900: 3 KPI / 8+4 차트 / 3+3+3+3 도메인
- 1024×768: KPI 3열, 차트 stack, 도메인 2×2
- 821×768 이하: 단일 열
- 1200×800에서 KPI와 Finance 차트가 첫 화면에 보이도록 높이 조정
- 기존 Forest border, radius, typography, focus token 재사용

### HD-008 — 타깃 검증

- Analytics target test
- HRX payroll route·auth target test
- Home dashboard Playwright target test
- UI regression source contract
- typecheck, build
- AI slop lint

### HD-009 — 최종 검증·화면 QA

- 전체 `apps/web` UI suite는 변경 완료 후 정확히 1회 실행
- 1200×800 및 1440×900 실제 렌더 screenshot 점검
- 잘림, overflow, 색상 대비, dead click, 한국어 문구, 권한 상태 확인

### HD-010 — closeout

- `git diff --check`
- 변경 파일과 테스트 증거 검토
- 사용자 루트 미수정 확인
- source-local 커밋
- push·PR·병합은 별도 요청 전 미실행

## 7. 검증 명령

타깃:

```bash
node --test packages/analytics/test/runtime-services.test.js
node --test apps/api/test/hrx/payroll-runtime.test.js apps/api/test/hrx/route-authz.test.js
node --test apps/web/test/home-dashboard-r1.test.mjs
node --test apps/web/test/ui-regression.test.mjs
npm --workspace apps/web run typecheck
npm --workspace apps/web run build
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

최종 1회:

```bash
npm --workspace apps/web run test:ui
```

## 8. 완료 판정

다음 14개 조건을 모두 만족해야 goal을 완료 처리한다.

1. Home 기본 화면에 기존 다섯 위젯이 0개다.
2. Home 기본 화면에 hero가 0개다.
3. `재무 현황`, `운영 현황` 그룹 헤더가 0개다.
4. 이번달 KPI 카드가 정확히 3개다.
5. 월별 매출은 줄그래프다.
6. 급여 구분은 원그래프이며 파트너·고문·직원 값을 표시한다.
7. 개인별 급여·이름·이메일이 Home payload에 포함되지 않는다.
8. Client 카드가 신규 고객·잠재고객을 표시한다.
9. People 카드가 휴가 신청을 표시한다.
10. Matter 카드가 신규·종결 매터를 표시한다.
11. Calendar 기존 동작과 딥링크가 유지된다.
12. denied·partial·error가 가짜 0으로 표시되지 않는다.
13. 타깃 검증과 최종 UI suite가 모두 PASS한다.
14. 1200×800 실제 화면 QA가 PASS하고 변경이 로컬 커밋된다.

## 9. 중단 조건

- payroll summary가 개인별 급여 또는 PII를 노출하는 경우
- tenant·scope·step-up 계약을 보존할 수 없는 경우
- 기존 상세 route 삭제가 필요한 경우
- 반복되는 동일 차단으로 안전한 source-local 진전이 불가능한 경우
- push, merge, AWS, release, signing, production 변경이 필요해지는 경우

## 10. 실행 결과

- HD-001~HD-010의 source-local 구현과 검증을 완료했다.
- Analytics `processed_cost` 및 기존 Finance 회귀: 8 PASS, 0 FAIL.
- HRX payroll aggregate와 route auth 회귀: 25 PASS, 0 FAIL.
- Home view model 및 UI source regression: 36 PASS, 0 FAIL.
- 최종 `apps/web` UI suite: 152개 중 151 PASS, 기존 1 SKIP, 0 FAIL.
- `apps/web` typecheck 및 production build: PASS.
- 1440×1000, 1200×900, 821×1100 실제 렌더를 확인했다.
  - 1440px: KPI 3열, 차트 8+4, 도메인 4열
  - 1200px: KPI 3열, 차트 stack, 도메인 2×2
  - 821px: 단일 열
  - 세 화면 모두 Home grid 수평 overflow 0
- 차트는 native SVG, 명시적 title/description, 키보드 포커스, screen-reader
  데이터 표를 제공한다.
- Payroll Home 응답은 aggregate만 포함하며 individual value·identifier·credential
  포함 플래그가 모두 false다.
- AI slop review는 새 Home 변경 블록에서 PASS했다. lint가 보고한 weak 항목은
  이번 변경 밖의 기존 `styles.css` 규칙이며 새 대시보드에는 gradient, glass,
  glow, rainbow palette, 무의미한 장식 motion을 추가하지 않았다.
- 기존 루트 작업트리는 수정하지 않았다.
- push, PR, main 병합, AWS, release, signing, production 변경은 실행하지 않았다.
