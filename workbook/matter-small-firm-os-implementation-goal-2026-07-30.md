# 10인 로펌용 Matter 업무 OS — 구현 Goal

## 1. Goal

승인된 설계·리서치 문서
`.lazyweb/design-research/matter-small-firm-os-2026-07-30/report.html`의
`TUW-01`부터 `TUW-42`까지를 실제 저장·API·UI 흐름으로 구현한다.

완료는 화면이나 descriptor가 존재하는 상태가 아니라 다음 증거가 모두 있는 상태다.

1. 42개 TUW가 모두 `COMPLETE`다.
2. 각 TUW에 결정적 fixture, 집중 자동 테스트, 오류 경로 검증이 있다.
3. 같은 업무가 목록·보드·워크트리에서 하나의 `MatterTask` ID로 보이며 중복 원장이 0건이다.
4. 업무 생성·상태 변경·후속 전환·시간 입력·청구 변경은 재시도해도 중복되지 않는다.
5. Matter 관련 집중 테스트와 저장소 전체 회귀가 통과한다.
6. 390px 및 1440px 실제 렌더에서 happy/loading/empty/error 상태와 keyboard 동작을 확인한다.
7. TUW-42 성능 fixture에서 p95 ≤ 250ms, p99 ≤ 500ms, 오류 0건을 충족하고 JSON 증거를 보존한다.

## 2. 실행 기준

- 구현 브랜치: `codex/matter-small-firm-os-implementation-20260730`
- 기준 SHA: `34d16954f54a188f93b087e3bc4ad1bce99c049f`
- 설계 권위: `.lazyweb/design-research/matter-small-firm-os-2026-07-30/report.html`
- 범위: Matter 운영 원장, 사건 상세, 업무·기한, 연락·후속, 시간·WIP·청구·수금, 종결·보고, 관련 API/UI/테스트
- 제외: production 배포, 데이터 cutover, 외부 provider 자격증명 사용, commit/push/PR
- 보존 원칙: 루트 dirty worktree와 다른 worktree의 변경을 수정·reset·stash·clean하지 않는다.
- 구현 원칙: 기존 `MatterTask`, `MatterCalendarEvent`, activity timeline, time/WIP/PreBill/Invoice/Payment 서비스를 우선 재사용한다.
- UI 원칙: 6개 일일 목적 메뉴만 노출하고 legacy URL은 동일 원장 화면/필터로 결정적으로 연결한다.
- 오류 원칙: 실패를 empty나 성공처럼 표시하지 않는다. validation, permission, repository, network 오류를 구분한다.

## 3. 상태 정의

| 상태 | 의미 |
|---|---|
| `PENDING` | 선행 TUW 또는 구현 시작 전 |
| `IN_PROGRESS` | 코드 또는 테스트를 작성 중 |
| `BLOCKED` | 사용자 권한이나 외부 상태가 없으면 진행 불가 |
| `COMPLETE` | 집중 테스트와 정의된 증거가 모두 통과 |

상태를 `COMPLETE`로 바꿀 때 반드시 변경 파일, 실행 명령, 결과, 증거 경로를 아래 실행 기록에 추가한다.

## 4. TUW 실행원장

| ID | 작업 단위 | 주 소유 영역 | 선행 | 상태 |
|---|---|---|---|---|
| TUW-01 | 10인 운영 fixture | `packages/matter/test/fixtures` | — | COMPLETE |
| TUW-02 | 6개 메뉴 계약 | `apps/web/src/components/Shell.jsx` | 01 | COMPLETE |
| TUW-03 | 기존 route 정리 | `apps/web/src/components/MattersSurface.jsx` | 02 | COMPLETE |
| TUW-04 | 공통 운영 행 계약 | `packages/matter/src` | 01 | COMPLETE |
| TUW-05 | 화면 상태 매트릭스 | `apps/web/src/components` | 02 | COMPLETE |
| TUW-06 | MatterTask 스키마 확장 | `packages/matter/src/model.js` | 04 | COMPLETE |
| TUW-07 | 업무 상태 전이 보강 | `packages/matter/src/task-service.js` | 06 | COMPLETE |
| TUW-08 | idempotent 빠른 업무 생성 | Matter command/API | 06 | COMPLETE |
| TUW-09 | 오늘·초과 query | Matter operations read model | 04,07 | COMPLETE |
| TUW-10 | 4개 업무 저장 보기 | Matter operations read model | 09 | COMPLETE |
| TUW-11 | 업무 목록 UI | Matter web surface | 05,10 | COMPLETE |
| TUW-12 | 보드 parity | Matter web surface/task API | 07,11 | COMPLETE |
| TUW-13 | 기한 생성 | Matter calendar service/API | 04 | COMPLETE |
| TUW-14 | 기한 변경 이력 | Matter calendar history | 13 | COMPLETE |
| TUW-15 | 주간 일정 | Matter deadline projection/UI | 09,13 | COMPLETE |
| TUW-16 | 사건 핵심 운영 요약 | Matter detail read model | 01,09,15 | COMPLETE |
| TUW-17 | 사건별 next action | Matter detail read model | 09,15 | COMPLETE |
| TUW-18 | 담당·백업·부재 coverage | Matter/People projection | 16 | COMPLETE |
| TUW-19 | 인수인계 명령 | Matter command/audit | 18 | COMPLETE |
| TUW-20 | 사건 상세 5탭 shell | Matter web surface | 16 | COMPLETE |
| TUW-21 | 통합 타임라인 | Matter activity projection | 04,20 | COMPLETE |
| TUW-22 | 회의 기록 | Matter activity command/UI | 21 | COMPLETE |
| TUW-23 | 후속조치 계약 | Matter follow-up model | 04 | COMPLETE |
| TUW-24 | 후속 CRUD | Matter follow-up service/API | 23 | COMPLETE |
| TUW-25 | 내부 메모/외부 연락 구분 | Matter timeline/follow-up | 21,24 | COMPLETE |
| TUW-26 | 마지막 연락 projection | Matter follow-up read model | 25 | COMPLETE |
| TUW-27 | 3개 연락 저장 보기 | Matter follow-up read model/UI | 26 | COMPLETE |
| TUW-28 | 요청→업무 전환 | Follow-up/MatterTask command | 08,24 | COMPLETE |
| TUW-29 | 후속 인수인계 | Follow-up command/audit | 19,24 | COMPLETE |
| TUW-30 | 빠른 시간 입력 | time-expense service/API/UI | 20 | COMPLETE |
| TUW-31 | 주간 입력 완결성 | time-expense read model/UI | 30 | COMPLETE |
| TUW-32 | 새 주간 제출·잠금 계약 | time-expense service | 31 | COMPLETE |
| TUW-33 | 청구 대기 WIP query | billing read model | 32 | COMPLETE |
| TUW-34 | WIP snapshot·PreBill | billing service/UI | 33 | COMPLETE |
| TUW-35 | 청구서 lifecycle | billing invoice service/UI | 34 | COMPLETE |
| TUW-36 | Matter 수금 반영·AR 큐 | payments/AR service/UI | 35 | COMPLETE |
| TUW-37 | 오늘 운영 read model | Matter cross-domain projection | 17,18,27,31,33,36 | COMPLETE |
| TUW-38 | 종결 blocker | Matter closeout service/UI | 33,36,37 | COMPLETE |
| TUW-39 | 보관 저장 보기 | Matter list query/UI | 38 | COMPLETE |
| TUW-40 | 주간 운영 점검 | Matter operations report/CSV | 37 | COMPLETE |
| TUW-41 | 10인 E2E | web/API/domain integration | 37–40 | COMPLETE |
| TUW-42 | 회귀·성능·접근성 게이트 | repository-wide QA | 41 | COMPLETE |

## 5. 집중 테스트

```text
packages/matter/test/small-firm-foundation.test.js
apps/web/test/matter-small-firm-ia.test.mjs
packages/matter/test/small-firm-work-queue.test.js
apps/web/test/matter-small-firm-work-ui.test.mjs
packages/matter/test/small-firm-detail-handoff.test.js
apps/web/test/matter-small-firm-detail-ui.test.mjs
packages/matter/test/small-firm-followup.test.js
apps/web/test/matter-small-firm-followup-ui.test.mjs
packages/time-expense/test/small-firm-weekly-time.test.js
packages/billing/test/small-firm-billing-flow.test.js
packages/payments/test/small-firm-ar.test.js
apps/web/test/matter-small-firm-finance-ui.test.mjs
packages/matter/test/small-firm-closeout-report.test.js
packages/matter/test/small-firm-ops-performance.test.js
apps/web/test/matter-small-firm-e2e.test.mjs
```

각 테스트 제목은 `[TUW-XX]`로 시작하여 다음처럼 독립 실행 가능해야 한다.

```bash
node --test --test-name-pattern="TUW-08" packages/matter/test/small-firm-work-queue.test.js
```

## 6. 공통 오류·복구 규약

1. 기존 테스트가 먼저 실패하면 source defect, dependency 문제, generated-file contention을 분리한다.
2. write command는 입력 검증 후 저장하며, audit와 idempotency 결과가 원장과 일치해야 한다.
3. partial write가 생길 수 있는 흐름은 기존 transaction/repository save 패턴을 사용한다.
4. 날짜 계산은 주입된 clock과 명시적 timezone으로 수행한다.
5. UI read 실패는 stale 성공 데이터나 0건으로 바꾸지 않고 오류 상태와 재시도 행동을 노출한다.
6. legacy route는 dead end를 만들지 않으며 canonical route와 filter를 보존한다.
7. 성능 실패는 샘플 수·warm-up·동시성·측정 환경을 증거에 함께 기록한다.
8. 전체 회귀에서 생성 파일 하나만 깨지면 해당 생성물만 복구하고 집중 테스트와 전체 회귀를 다시 실행한다.

## 7. 게이트

| 게이트 | 완료 조건 |
|---|---|
| G0 Foundation | TUW-01~05 집중 테스트 통과 |
| G1 Daily Work | TUW-06~15 집중 테스트 통과, 업무 중복 0 |
| G2 Matter Flow | TUW-16~29 집중 테스트 통과, 인수인계/후속 audit 확인 |
| G3 Billing Flow | TUW-30~36 집중 테스트 통과, WIP→수금 reconciliation |
| G4 Operations | TUW-37~40 집중 테스트와 CSV 합계 일치 |
| G5 Final | TUW-41~42, 전체 회귀, 렌더 QA, 성능 JSON 통과 |

## 8. 2026-07-31 재검증 보완 작업

독립 코드 감사가 기존 집중 테스트의 사각지대를 직접 재현했다. 아래
`RF-*`는 새 기능 범위를 넓히는 항목이 아니라, 원래 TUW의 완료 조건을
실제 운영·저장·화면 경계에서 충족시키기 위한 testable remediation
unit이다. 각 항목은 실패 재현 테스트가 먼저 존재하고, 성공·오류·재시도
경로가 모두 통과한 뒤에만 `COMPLETE`로 바꾼다.

| ID | 영향 TUW | 구현 단위 | 결정적 통과 조건 | 선행 | 상태 |
|---|---|---|---|---|---|
| RF-01 | 04,07,08,09,12,13,15 | 업무·기한 원장 경계 | 없는/다른 tenant Matter와 unknown/inactive 담당·백업·책임자 write 0건; repository/audit/idempotency byte-equivalent; unrelated cross-type ID 보존과 명시적으로 연결된 projection만 collapse; `Z`/offset/date-only epoch 정렬; terminal board query | — | COMPLETE |
| RF-02 | 07,08,11,12 | 업무 실행 UI | 새 업무 폼이 stable retry key로 정확히 한 번 POST·재조회; double-submit 중복 0; canonical 전이만 표시; 완료·취소 열이 실제 원장 행을 표시; 같은 task ID와 timeline 수가 list·board·worktree에서 일치 | RF-01 | COMPLETE |
| RF-03 | 19,20,21,22,25 | 상세·타임라인·회의 경계 | 5탭의 data/loading/empty/error/blocked/denied가 stale 성공 action을 노출하지 않음; visible owner·backup·reason handoff 후 detail/task queue 재조회; namespaced timeline ID와 빈 결정 zero-write; exact-Matter internal grant·row별 필터; modern key presence와 explicit null 우선 | — | COMPLETE |
| RF-04 | 23,24,28 | 후속 참조 무결성 | canonical `Matter.client_id`; missing/cross-tenant Matter·membership; 없는/비활성 담당·백업; omitted 유지와 explicit null 해제; cross-Matter prelinked task 거부; 실패 시 byte-equivalent 저장소 | — | COMPLETE |
| RF-05 | 24 | 후속 단건 API | create→GET→update→GET roundtrip; exact-Matter authorization; unknown/cross-tenant/internal-scope 404; route-scope 403; repository 503; PATCH/DELETE precedence 보존 | RF-04 | COMPLETE |
| RF-06 | 24,27 | 연락 실행·저장 보기 UI | visible follow-up create·GET-by-ID·update와 오류 상태; 세 저장 보기를 실제 렌더·URL·행 membership으로 검증하고 source-regex 단독 증거 제거 | RF-04,RF-05 | COMPLETE |
| RF-07 | 30,32 | 주간 시간 운영 UI | role·billable 입력; submit별 stable retry key; owner/manager 권한; submit·lock·사유 있는 grace unlock; expired/consumed/conflict는 success/audit 증가 0; 각 성공 후 GET-backed 상태 재조회 | — | COMPLETE |
| RF-08 | 33,34,35 | 반복 청구 주기 | 동일 sorted source-set은 replay되고 신규 set은 별도 WIP·snapshot·PreBill·Invoice ID를 만들며 두 lineage가 reload 후 모두 불변·조회 가능 | — | COMPLETE |
| RF-09 | 34 | PreBill 검토·조정 | 누적 조정이 잔액 초과 시 write 0건; 생성·조정 승인·무조정 승인·반려 action 분리; RF-08 두 번째 cycle UI proof | RF-08 | COMPLETE |
| RF-10 | 36 | 수금 reversal·AR 동기화 | fixture A: forged reversal 금융 필드는 원본에서만 파생되고 replay-safe reversal 후 AR이 원금만큼 재개; fixture B: 부분→최종 수금 후 Invoice·Payment·AR aging·Matter time/billing·closeout GET을 재조회해 visible bucket/잔액이 0 | — | COMPLETE |
| RF-11 | 39 | 보관 실행 UI | open/active archive는 write 0; closed→archived stable-key replay; 403/repository error에 optimistic 이동 0; archived 저장 보기와 restore 후 closed 목록 왕복 | — | COMPLETE |
| RF-14 | 03,14,15 | canonical route·기한 deep link | legacy alias 단일 권위; 실제 redirect URL; 기한 행이 정확한 ledger를 선택; reschedule/history를 화면에서 실행·재조회 | RF-01 | COMPLETE |
| RF-12 | 41 | 실제 화면 10인 E2E | 실제 HTTP와 visible product controls만 사용해 handoff→follow-up→time→billing→partial/final payment→AR→closeout를 실행하고 durable reload 후 중복 업무 0 | RF-02,RF-03,RF-04,RF-05,RF-06,RF-07,RF-08,RF-09,RF-10,RF-11,RF-14 | COMPLETE |
| RF-13 | 42 | 최종 게이트 재봉인 | 현재 source에서 새 internal unsigned local desktop artifact를 빌드하고 artifact SHA를 dirty working-tree 지문에 결속; 390/1440·keyboard·CSV failure/no-download·API/web/root/PostgreSQL·성능 red gate를 검증하며 formal release·production launch는 주장하지 않음 | RF-12,RF-14 | COMPLETE |

재감사 원문:

- `.omo/evidence/matter-small-firm-os-code-review.md`
- `.omo/evidence/matter-small-firm-os-implementation-tuw-16-29-reaudit-code-review.md`
- TUW-30~42 독립 재감사 결과(현재 task mailbox)

## 9. 실행 기록

| 시각 | TUW | 변경 | 검증 | 결과/증거 |
|---|---|---|---|---|
| 2026-07-30 | Goal | 새 구현 브랜치와 42개 TUW 원장 생성 | branch/status 확인 | 실행 시작 |
| 2026-07-30 | Goal | 원장 구조 검증기와 회귀 테스트 추가 | `node scripts/validate-matter-small-firm-os-goal.mjs`; `node --test scripts/test/matter-small-firm-os-goal.test.mjs` | 42/42, 2 tests passed |
| 2026-07-30 | TUW-01~02 | 결정적 10인 fixture와 6개 canonical Matter 메뉴 | `node --test apps/web/test/matter-small-firm-ia.test.mjs`; 관련 web 회귀 | 4/4 집중, 47/47 회귀 passed |
| 2026-07-31 | TUW-01 | 10인·12사건·업무·기한·후속 결정적 seed와 안정 ID를 추가 | `node --test apps/web/test/matter-small-firm-ia.test.mjs` | fixture 수·ID·운영 lane 일치; `.omo/evidence/matter-foundation-routes-20260730.md` |
| 2026-07-31 | TUW-02 | Matter 내비게이션을 오늘·사건·업무·일정·연락·시간의 6개 목적 메뉴로 고정 | `node --test apps/web/test/matter-small-firm-ia.test.mjs` | 중복·빈 메뉴 0; canonical route 6개 |
| 2026-07-31 | TUW-03 | legacy Matter URL을 canonical route/filter로 연결하고 dead route를 제거 | `node --test apps/web/test/matter-small-firm-ia.test.mjs apps/web/test/matter-small-firm-ia-ui.test.mjs` | 알려진 legacy URL 전부 결정적 해석, unknown route 안전 fallback |
| 2026-07-31 | TUW-04 | Task·Activity·Calendar를 동일 운영 행 계약으로 정규화 | `node --test --test-name-pattern="TUW-04" packages/matter/test/small-firm-work-queue.test.js` | 동일 source 중복 제거, MatterTask 우선권 확인 |
| 2026-07-31 | TUW-05 | 6개 화면의 loading·empty·error·blocked·denied 상태를 공통화 | `node --test apps/web/test/matter-small-firm-ia.test.mjs apps/web/test/matter-small-firm-ia-ui.test.mjs` | 오류를 0건으로 오인하지 않음; retry/alert/denied 상태 확인 |
| 2026-07-31 | TUW-06 | MatterTask에 우선순위·기한·대기·완료·보관 필드를 호환 확장 | `node --test --test-name-pattern="TUW-06" packages/matter/test/small-firm-work-queue.test.js` | 잘못된 status/priority/date 거부 및 round-trip 확인 |
| 2026-07-31 | TUW-07 | 완료·차단·보관 상태 전이와 사유·시각 기록을 보강 | `node --test --test-name-pattern="TUW-07" packages/matter/test/small-firm-work-queue.test.js` | 사유 없는 차단 거부, 고정 clock timestamp 확인 |
| 2026-07-31 | TUW-08 | 빠른 업무 생성을 durable idempotent command로 구현 | `node --test --test-name-pattern="TUW-08" packages/matter/test/small-firm-work-queue.test.js` | reopen/replay 후 task·audit·timeline 각 1건, payload 충돌 거부 |
| 2026-07-31 | TUW-09 | 오늘·초과·향후 업무 query와 terminal/archive 제외 규칙 구현 | `node --test --test-name-pattern="TUW-09" packages/matter/test/small-firm-work-queue.test.js` | 초과→오늘→향후 정렬과 제외 규칙 확인 |
| 2026-07-31 | TUW-10 | 내 업무·전체·초과·차단 4개 저장 보기를 동일 원장에서 계산 | `node --test --test-name-pattern="TUW-10" packages/matter/test/small-firm-work-queue.test.js` | view count와 row 수 일치, 중복 ID 0 |
| 2026-07-31 | TUW-11 | 담당·사건·기한·상태·상세 identity가 있는 업무 목록 UI 구현 | `node --test apps/web/test/matter-small-firm-work-ui.test.mjs` | keyboard tab, empty/error 상태 및 canonical deep link 확인 |
| 2026-07-31 | TUW-12 | 목록·보드·타임라인이 하나의 MatterTask ID를 공유하도록 연결 | `node --test --test-name-pattern="TUW-12" packages/matter/test/small-firm-work-queue.test.js` | 상태 변경 replay 후 원장·보드·목록 중복 0 |
| 2026-07-31 | TUW-13 | timezone-qualified Matter 기한 생성과 provider-independent 저장 구현 | `node --test --test-name-pattern="TUW-13" packages/matter/test/small-firm-work-queue.test.js` | timezone 없는 입력 거부, reopen/replay audit 1건 |
| 2026-07-31 | TUW-14 | 기한 변경 사유와 before/after 이력을 append-only로 기록 | `node --test --test-name-pattern="TUW-14" packages/matter/test/small-firm-work-queue.test.js` | 동일 키 replay 1회, 변경 payload 충돌 거부 |
| 2026-07-31 | TUW-15 | 업무 기한과 calendar event를 한 번씩 합친 주간 일정 구현 | `node --test --test-name-pattern="TUW-15" packages/matter/test/small-firm-work-queue.test.js`; `node --test apps/web/test/matter-small-firm-work-ui.test.mjs` | 정렬·unique ID·keyboard-openable week view 확인 |
| 2026-07-31 | TUW-16 | 12개 사건의 담당·백업·다음 기한·다음 행동 운영 요약 구현 | `node --test packages/matter/test/small-firm-detail-handoff.test.js` | tenant/Matter 경계와 12개 summary reconciliation 확인 |
| 2026-07-31 | TUW-17 | 초과 업무·오늘 기한·향후 업무 순 next action 결정 구현 | `node --test --test-name-pattern="TUW-17" packages/matter/test/small-firm-detail-handoff.test.js` | overdue→today→future→empty 우선순위 확인 |
| 2026-07-31 | TUW-18 | 담당 없음·담당만·백업 있음·담당 부재 coverage 상태 구현 | `node --test --test-name-pattern="TUW-18" packages/matter/test/small-firm-detail-handoff.test.js` | 4개 coverage 상태와 tenant 경계 확인 |
| 2026-07-31 | TUW-19 | 사건 담당·백업과 미완료 업무를 함께 넘기는 인수인계 command 구현 | `node --test --test-name-pattern="TUW-19" packages/matter/test/small-firm-detail-handoff.test.js` | replay 1회, changed request 409, bundled audit/timeline 확인 |
| 2026-07-31 | TUW-20 | 사건 상세를 개요·업무·일정·연락·시간/청구 5탭으로 구성 | `node --test apps/web/test/matter-small-firm-detail-ui.test.mjs` | 같은 Matter만 표시, roving keyboard focus와 tabpanel 확인 |
| 2026-07-31 | TUW-21 | 활동 source를 중복 제거해 newest-first 통합 타임라인으로 투영 | `node --test --test-name-pattern="TUW-21" packages/matter/test/small-firm-detail-handoff.test.js` | type·tenant·Matter 경계와 dedupe 확인 |
| 2026-07-31 | TUW-22 | 결정·참석자·연결 후속업무가 있는 회의 기록 구현 | `node --test --test-name-pattern="TUW-22" packages/matter/test/small-firm-detail-handoff.test.js`; `node --test apps/web/test/matter-small-firm-detail-ui.test.mjs` | cross-Matter task 연결·필수값 누락 거부 |
| 2026-07-31 | TUW-23 | waiting owner/action·snooze·done 규칙을 가진 후속조치 계약 구현 | `node --test --test-name-pattern="TUW-23" packages/matter/test/small-firm-followup.test.js` | invalid status/timezone/owner/action 거부, done timestamp 확인 |
| 2026-07-31 | TUW-24 | 후속 create/update/delete API와 durable replay를 구현 | `node --test --test-name-pattern="TUW-24" packages/matter/test/small-firm-followup.test.js apps/api/test/matter-small-firm-api.test.js` | DELETE route 도달, CRUD replay와 payload conflict 확인 |
| 2026-07-31 | TUW-25 | 내부 메모와 외부 연락·전송 실패를 별도 projection으로 분리 | `node --test --test-name-pattern="TUW-25" packages/matter/test/small-firm-followup.test.js` | 내부 메모 client 제외, 실패 outbound가 성공으로 승격되지 않음 |
| 2026-07-31 | TUW-26 | 성공한 외부 연락만 Matter/client 마지막 연락을 단조 증가 | `node --test --test-name-pattern="TUW-26" packages/matter/test/small-firm-followup.test.js` | internal/failed/old/replay 입력이 projection을 이동시키지 않음 |
| 2026-07-31 | TUW-27 | 오늘 할 일·고객 회신 대기·오래된 연락 3개 저장 보기 구현 | `node --test --test-name-pattern="TUW-27" packages/matter/test/small-firm-followup.test.js`; `node --test apps/web/test/matter-small-firm-detail-ui.test.mjs` | exact 3 views와 안정 deep link 확인 |
| 2026-07-31 | TUW-28 | 고객 요청을 source-linked MatterTask 한 건으로 전환 | `node --test --test-name-pattern="TUW-28" packages/matter/test/small-firm-followup.test.js` | replay 중복 0, callback 실패 시 task/link/receipt rollback |
| 2026-07-31 | TUW-29 | 후속 queue owner와 bundled audit을 함께 넘기는 인수인계 구현 | `node --test --test-name-pattern="TUW-29" packages/matter/test/small-firm-followup.test.js` | old queue 제거·new queue 추가·audit 1건 확인 |
| 2026-07-31 | TUW-30 | Matter-linked 빠른 시간 입력과 편집 allowlist 구현 | `node --test --test-name-pattern="TUW-30" packages/time-expense/test/small-firm-weekly-time.test.js` | 양수 분 검증, privileged field 주입 제거, replay conflict 거부 |
| 2026-07-31 | TUW-31 | 사람별 주간 시간 합계·누락 평일 완결성 projection 구현 | `node --test --test-name-pattern="TUW-31" packages/time-expense/test/small-firm-weekly-time.test.js` | missing_days와 complete=false 상태 확인 |
| 2026-07-31 | TUW-32 | 주간 제출·잠금·사유 있는 grace unlock lifecycle 구현 | `node --test --test-name-pattern="TUW-32" packages/time-expense/test/small-firm-weekly-time.test.js` | locked edit·expired grace·changed replay 거부, audit 1건 |
| 2026-07-31 | TUW-33 | billable/locked 시간만 canonical WIP 후보로 계산 | `node --test --test-name-pattern="TUW-33\|H3" packages/time-expense/test/small-firm-weekly-time.test.js packages/billing/test/small-firm-billing-flow.test.js` | unlocked·missing rate/fee 명시 오류, modern implicit terms 거부 |
| 2026-07-31 | TUW-34 | WIP source identity·immutable snapshot·PreBill write-down 구현 | `node --test --test-name-pattern="TUW-34\|H2\|H-WIP" packages/billing/test/small-firm-billing-flow.test.js packages/billing/test/billing-provenance-adversarial.test.js` | forged projection·duplicate PreBill·snapshot mutation 거부 |
| 2026-07-31 | TUW-35 | PreBill review와 Invoice sent/partial/paid/overdue/void lifecycle 구현 | `node --test --test-name-pattern="TUW-35\|H4" packages/billing/test/*.test.js` | terminal 전이·rejected 재승인·Invoice-linked mutation 거부 |
| 2026-07-31 | TUW-36 | Matter 수금 배분·AR aging·void/reversal 원장 연결 구현 | `node --test --test-name-pattern="TUW-36\|H5" packages/payments/test/*.test.js` | cross-Matter/client·draft invoice·active allocation void 거부, replay 중복 0 |
| 2026-07-31 | TUW-37 | 오늘 운영 8개 lane을 Matter·업무·후속·시간·WIP·AR 원장에서 계산 | `node --test --test-name-pattern="TUW-37" packages/matter/test/small-firm-closeout-report.test.js` | 모델별 finance 권한 trim과 tenant 경계 후 count 재계산 |
| 2026-07-31 | TUW-38 | 열린 업무·기한·미청구 시간·미수금 기반 종결 blocker 구현 | `node --test --test-name-pattern="TUW-38\|paid closeout" packages/matter/test/small-firm-closeout-report.test.js apps/api/test/matter-small-firm-api.test.js` | 실제 Time→WIP→Invoice→Payment lineage가 모두 소진될 때만 종결 |
| 2026-07-31 | TUW-39 | archived 저장 보기·archive·restore command/API/audit 구현 | `node --test --test-name-pattern="TUW-39\|archive" packages/matter/test/small-firm-closeout-report.test.js apps/api/test/matter-small-firm-api.test.js` | invalid/non-durable/timezone 오류와 replay를 확인 |
| 2026-07-31 | TUW-40 | 오늘 read model을 재사용한 주간 6개 질문·CSV 합계 구현 | `node --test --test-name-pattern="TUW-40\|CSV" packages/matter/test/small-firm-closeout-report.test.js apps/api/test/matter-small-firm-api.test.js` | 화면 lane과 CSV count/amount parity, repository 503 확인 |
| 2026-07-31 | TUW-41 | 10인 Matter→시간→WIP→청구→수금→종결 E2E 구현 | `node --test apps/web/test/matter-small-firm-e2e.test.mjs` | 실제 billing lineage를 포함해 2/2 통과, duplicate MatterTask 0 |
| 2026-07-31 | TUW-42 | 390/1440 렌더·키보드·중복·전체 회귀·성능 게이트 구현 | `node scripts/run-matter-small-firm-performance.mjs --output .omo/evidence/smallfirm-e2e-performance-20260730/performance.json`; 전체 root/API/web 게이트 | 성능 JSON·브라우저 QA·전체 회귀 최종 결과는 아래 Final Gate 기록에 고정 |
| 2026-07-31 | RF-01 | 업무·기한 원장 경계와 원자적 실패·시간 정렬을 보강 | Node 22 Matter 도메인·API 집중 실행과 독립 검토 | `.omo/evidence/reverify-work-domain-rf01-20260731/manifest.md`; `.omo/evidence/reverify-matter-domain-remediation-code-review.md` |
| 2026-07-31 | RF-02 | 새 업무·전이·목록·보드·워크트리 canonical 실행을 연결 | API·렌더 UI·double-submit 재검증 | `.omo/evidence/reverify-matter-api-review-code-review.md`; `.omo/evidence/reverify-matter-ops-ui-20260731/evidence-manifest.md` |
| 2026-07-31 | RF-03 | 상세 5탭·타임라인·회의·인수인계의 상태와 scope 경계를 보강 | 도메인·API·상태 매트릭스 재검증 | `.omo/evidence/reverify-matter-domain-remediation-code-review.md`; `.omo/evidence/reverify-matter-ops-ui-20260731/evidence-manifest.md` |
| 2026-07-31 | RF-04 | canonical client와 담당·백업·연결 업무 참조 무결성을 보강 | 위조·누락·비활성·cross-Matter byte-equivalent 실패 검증 | `.omo/evidence/canonical-client-provenance-fix-20260731.md`; `.omo/evidence/reverify-matter-domain-remediation-code-review.md` |
| 2026-07-31 | RF-05 | 후속 단건 GET·PATCH·DELETE의 exact-Matter 권한과 오류 우선순위를 연결 | API 전체 파일·독립 검토 | `.omo/evidence/reverify-matter-api-review-code-review.md`; `.omo/evidence/matter-followup-get-board-api-fix-20260731.md` |
| 2026-07-31 | RF-06 | 연락 실행과 세 저장 보기를 실제 URL·행 membership으로 검증 | reachable actions·브라우저 상태·오류 렌더 | `.omo/evidence/reverify-matter-ops-ui-20260731/evidence-manifest.md` |
| 2026-07-31 | RF-07 | 주간 시간 입력·제출·잠금·사유 있는 해제와 재조회를 연결 | Time-expense 78/78·오류/재시도 검증 | `.omo/evidence/final-domain-package-gates-post-midnight-20260731/time-expense.tap`; `.omo/evidence/reverify-matter-ops-ui-20260731/evidence-manifest.md` |
| 2026-07-31 | RF-08 | source-set 기반 반복 청구 주기와 durable lineage를 보강 | Billing 136/136·두 주기 재수화 검증 | `.omo/evidence/rf08-billing-cycle-domain-20260731/README.md`; `.omo/evidence/final-domain-package-gates-post-midnight-20260731/billing.tap` |
| 2026-07-31 | RF-09 | PreBill 생성·조정 승인·무조정 승인·반려를 분리 | 초과 조정 zero-write·공개 lifecycle 검증 | `.omo/evidence/reverify-prebill-adjustment-fix-20260731/summary.md`; `.omo/evidence/reverify-prebill-api-remediation-code-review.md` |
| 2026-07-31 | RF-10 | 결제 배분 취소·AR 재계산·자정 경계 재시도를 연결 | Payments 132/132·API 593/593·브라우저 1/1·독립 검토 | `.omo/evidence/payment-reversal-product-flow-fix-20260731/manifest.md`; `.omo/evidence/rf-10-payment-allocation-reversal-code-review.md` |
| 2026-07-31 | RF-11 | closed→archived→restore 실행과 실패 시 no optimistic move를 연결 | 도메인·API·렌더 왕복 검증 | `.omo/evidence/rf-11-archive-api-integration-20260731/README.md`; `.omo/evidence/reverify-matter-api-review-code-review.md` |
| 2026-07-31 | RF-12 | 실제 HTTP·visible controls 기반 10인 E2E를 현재 소스에서 재실행 | 1/1, 사람 10, 업무 중복 0, AR 0, closed, 예상 밖 오류 0 | `.omo/evidence/rf12-live-http-e2e-20260731-post-midnight-01/rf12-evidence-manifest.json`; `.omo/evidence/RF-12-code-review.md` |
| 2026-07-31 | RF-13 | 현재 dirty source에 결속한 internal unsigned 패키지와 최종 게이트를 봉인 | 패키지 재시작·working-tree 지문·성능·루트 회귀 | `.omo/evidence/rf13-final-gate-20260731/rf13-evidence-manifest.json`; `.omo/evidence/root-final-current-regression-20260731/root-test.tap` |
| 2026-07-31 | RF-14 | legacy alias·기한 deep link·변경 이력을 canonical route로 연결 | 실제 URL·ledger 선택·재조회 독립 검토 | `.omo/evidence/rf-14-tuw-03-route-alias-followup-code-review.md`; `.omo/evidence/reverify-matter-ops-ui-20260731/evidence-manifest.md` |

## 9. 최종 보강 기록

| 시각 | 범위 | 보강 내용 | 현재 증거 |
|---|---|---|---|
| 2026-07-31 | 업무 상태 변경 | UI 기본 사유를 제거하고 막힘·재개·해제에 사용자가 입력한 정확한 사유만 저장; 취소·공백은 write 0 | `.omo/evidence/matter-explicit-task-reason-ui-20260731/summary.md`; `.omo/evidence/matter-task-reason-policy-fix-20260731.md` |
| 2026-07-31 | 의뢰인·담당·백업 무결성 | canonical `Matter.client_id` provenance와 실제 활성 Person/MatterMember, 생략된 기존 백업까지 fail-closed 검증 | `.omo/evidence/canonical-client-provenance-fix-20260731.md`; `.omo/evidence/matter-api-retained-backup-validation-fix-20260731.md` |
| 2026-07-31 | 운영 워크트리 권위 | 운영 기본 시작과 재시작은 MatterMember·responsible attorney·MatterWorktree를 자동 생성하지 않고 404·count 0·원장 byte-equivalent를 유지; canonical projection은 명시적 테스트 fixture에서만 strict opt-in | `.omo/evidence/operational-worktree-bootstrap-fix-20260731/evidence-summary.md`; `.omo/evidence/selected-matter-worktree-parity-code-review.md` |
| 2026-07-31 | Today 중복 투영 | 동일 task가 여러 운영 lane에 속해도 canonical identity 한 행으로 병합하고 모든 lane 라벨·route 보존 | `.omo/evidence/matter-today-canonical-queue-fix-20260731/summary.md`; `.omo/evidence/matter-today-canonical-queue-fix-code-review.md` |
| 2026-07-31 | 수금 취소 복구 | 원본 Allocation·Payment·Invoice만 권위로 사용하고 사유를 필수화; Finance transaction 한 건에서 Invoice·Payment·AR·audit·receipt를 원자 갱신하며 implicit 날짜는 자정 재시도 replay, explicit 날짜 변경은 409/no-write | `.omo/evidence/payment-reversal-product-flow-fix-20260731/manifest.md`; `.omo/evidence/matter-small-firm-os-final-preseal-code-review.md` |
| 2026-07-31 | 실제 화면 | 1440×900·390×844의 6개 메뉴, 상태, retry, CSV, 키보드, overflow, 사유 입력, list/board/worktree identity, console과 수금 취소 실패·persisted reload 실패·성공 화면 검증 | `.omo/evidence/matter-final-manual-qa-rf12-20260731-122111/manifest.json` — 23/23 PASS; `.omo/evidence/payment-reversal-product-flow-fix-20260731/payment-reversal-browser-observables.json` |

## 10. Final Gate 증거

| 게이트 | 상태 | 검증 결과와 증거 |
|---|---|---|
| G0 | PASS | 10인 fixture·6개 canonical 목적 메뉴·상태 매트릭스와 Matter 263/263 통과; `.omo/evidence/final-domain-package-gates-post-midnight-20260731/final-domain-package-gates-post-midnight-20260731.md` |
| G1 | PASS | 업무·기한 원장, stable retry, 목록·보드·워크트리 identity와 중복 0 통과; `.omo/evidence/reverify-work-domain-rf01-20260731/manifest.md`; API 593/593 |
| G2 | PASS | 상세·타임라인·인수인계·후속 CRUD·scope와 실제 저장 보기 통과; `.omo/evidence/reverify-matter-domain-remediation-code-review.md`; `.omo/evidence/reverify-matter-ops-ui-20260731/evidence-manifest.md` |
| G3 | PASS | Time 78/78, Billing 136/136, Payments 132/132, Matter API 22/22, Finance API 22/22와 reversal/AR 동기화 통과; `.omo/evidence/final-domain-package-gates-post-midnight-20260731/` |
| G4 | PASS | 오늘 운영·종결 blocker·archive/restore·주간 CSV와 실패 시 no-download 통과; `.omo/evidence/rf-11-archive-api-integration-20260731/README.md`; 수동 QA 23/23 |
| G5 | PASS | API 593/593, 도메인 653/653, 웹 205 pass·1 명시적 skip, PostgreSQL/H1 22/22, 실제 HTTP E2E 1/1, internal 패키지·성능·루트 회귀의 terminal 증거를 최종 경로에 결속 |

최종 성능 증거는
`.omo/evidence/smallfirm-e2e-performance-20260730/performance.json`에 저장하며,
`duplicate_matter_task_count = 0`, 오류 0, p95 ≤ 250ms, p99 ≤ 500ms,
`source_dirty = true`와 `diff/status/manifest/working_tree` SHA-256을 모두 요구한다.
전체 저장소 회귀 증거는
`.omo/evidence/root-final-current-regression-20260731/root-test.tap`에 저장한다.
