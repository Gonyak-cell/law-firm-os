# HRX 휴가·급여 완성 TUW 실행계획

작성일: 2026-07-14  
실행 기준 소스: `/private/tmp/lawos-forest-v016-release`  
기준 브랜치: `codex/forest-v0.1.16-release-20260713`  
상태: `REPO_IMPLEMENTATION_COMPLETE_EXTERNAL_BLOCKED`  
선행 계획: `workbook/leave-management-execution-plan-2026-07-13.md`

## 1. 목표

현재 Forest People 모듈의 휴가관리 내부 구현을 유지하면서 미구현 기능을 모두 닫고, 경계 화면만 존재하는 급여정산을 실제 계산·승인·명세서·지급·신고 준비가 가능한 런타임으로 확장한다.

완료는 기능 존재가 아니라 아래 조건으로 판정한다.

1. 이 문서의 모든 repo-side TUW가 `DONE`이고 각 행의 자동 검증이 통과한다.
2. 휴가 잔액, 유급·무급 시간, 급여 입력 스냅샷과 급여 결과가 같은 원천을 사용한다.
3. 휴가 원장과 급여 결과는 과거 값을 수정하지 않고 역분개·조정 기록으로만 변경한다.
4. 직원·관리자·HR·급여담당·승인자·권한 없음 역할 시나리오를 실제 브라우저와 패키지 앱에서 검증한다.
5. 1512, 1280, 1024, 820, 720px에서 Forest 44px 행 밀도, 단일 행 텍스트, 비중복 메뉴를 유지한다.
6. 실제 이메일·메시지·캘린더·은행·세무 공급자 작업은 공급자 영수증이 있을 때만 성공으로 기록한다.
7. 법무·노무·세무 검토, 실제 직원 데이터 승인, 외부 자격증명과 운영 승인이 없으면 `production_ready`, `public_release`, `go_live`는 `false`다.

## 2. 범위와 현재 경계

### 2.1 재사용하는 현재 구현

- 휴가 신청·승인·취소·일정 변경·추가정보 요청
- `hrx_leave_balance_entries` 정수 분 기반 불변 원장
- entitlement별 선소멸 차감과 잔액 계산
- 휴가 그룹·유형·정책 버전
- 입사일·회계연도·근속기간 기반 단일 기간 자동 발생
- 수동 발생, CSV 입력, 사용 내역 CSV/XLSX
- 사용 촉진 대상·문서 참조·내부 전달 증거
- 출퇴근, 초과근무, 보상정보 암호화 참조
- 현재 Forest People 히어로, 사이드바, 패널·표·컨트롤

### 2.2 이번 계획이 닫는 휴가 공백

- 유형별 사용 단위, 유급시간, 잔액 차감시간, 반올림, 유급·무급 급여 반영
- 예정·발생·만료·취소 lifecycle과 자동 만료
- 입사일·회계연도 규칙의 최대 10년 일괄 미리보기·실행·재시도
- 발생 건 통합 조회, 목록·월별·유형별 보기
- 표준 업로드 템플릿, 행별 오류, 배치 영수증
- 실제 사용 촉진 대량 발송과 전달·열람 영수증
- Matter 캘린더 및 선택형 Google·Outlook·Slack·Teams 연동

### 2.3 이번 계획이 닫는 급여 공백

- 월급·시급·일급·프리랜서 계산
- 기본급, 과세·비과세 수당, 연장·야간·휴일수당, 미사용 연차수당, 소급조정
- 소득세·지방소득세·국민연금·건강보험·장기요양·고용보험·사용자 공제
- 마감 스냅샷, 미리보기, 문제 검토, 이중 승인, 마감, 조정 실행
- 급여명세서·급여대장·리포트·일괄 전달·열람 상태
- 은행 대량이체 파일, 이중 승인, 지급 결과 대사
- 퇴직금·퇴직연금·중도퇴사·원천징수·사회보험·연말정산 준비

## 3. TUW 계약

각 TUW는 독립적으로 검증 가능한 하나의 관찰 가능한 결과다.

- 기본 크기: 프로덕션 파일 1~3개와 대상 테스트 1개. 마이그레이션과 패키지 QA는 예외다.
- 상태: `READY`, `IN_PROGRESS`, `DONE`, `BLOCKED`만 사용한다.
- 완료 증거: 테스트 명령, 기대 결과, 변경 파일, 필요 시 스크린샷 또는 영수증을 기록한다.
- 실패 처리: 기존 데이터를 덮어쓰지 않는다. 마이그레이션은 forward-only이며 기능은 설정 플래그 또는 미사용 경로로 되돌릴 수 있어야 한다.
- 권한: 모든 쓰기 TUW는 tenant, actor, scope, resource 검증과 감사 이벤트를 포함한다.
- 개인정보: 주민번호·계좌·세금 원문은 renderer, 로그, outbox payload에 두지 않는다.
- UI: 설명용 2줄 텍스트, 중복 제목, 통계 카드, pill 남발, 장식용 글로우, 새 디자인 키트를 금지한다.
- 급여: 금액은 정수 원, 비율은 정수 basis point, 시간은 정수 분이다.

## 4. 실행 순서

```text
GOV -> LV-TYPE -> LV-LIFE -> LV-BATCH -> LV-OCC -> LV-PROM/LV-INT -> LV-QA
                         \-> PY-DATA -> PY-IN -> PY-CALC -> PY-DED -> PY-RUN
                                                          -> PY-UI/PY-DOC
                                                          -> PY-BANK/PY-TAX
                                                          -> PY-QA -> GATE
```

급여의 휴가 입력 TUW는 `LV-TYPE-006`, `LV-LIFE-003`, `LV-OCC-002`가 끝나기 전 완료할 수 없다.

## 5. 공통 기반 TUW

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| GOV-001 | DONE | 최신 Forest 소스와 패키지 기준선 고정 | 브랜치·renderer hash·기존 QA 증거 기록 | source/package hash 동일 | 기존 package QA |
| GOV-002 | DONE | 회사 시간·급여 정책 결정 manifest | 480분 기준, 반올림, 소멸, 마감일, 지급일, 고용형태, 공급자 ID | schema validator가 누락·합성값 production 사용 차단 | GOV-001; 합성 기준과 owner 미결정을 분리 기록하고 production gate는 계속 차단 |
| GOV-003 | DONE | 휴가·급여 역할/스코프 행렬 | employee, manager, HR, payroll preparer, approver, auditor | route-policy 전체 행 allow/deny 테스트 | GOV-002; payroll approve/export 권한 분리 및 live LawOS 역할 연결 |
| GOV-004 | DONE | 마이그레이션 사전검증·백업·복구 절차 | HRX 마이그레이션 실행기와 시험 DB 복구 | 빈 DB·기존 DB·중간 실패 3개 시나리오 | GOV-001; targeted 14/14, HRX 전체 회귀 exit 0 |
| GOV-005 | DONE | 공통 golden fixture | 입사·퇴사·휴가·초과근무·부양가족 경계 직원을 비식별 합성 데이터로 정의 | fixture hash와 expected totals 고정 | GOV-002 |
| GOV-006 | DONE | 외부 공급자 receipt 계약 | delivery, calendar, bank, filing 공통 pending/succeeded/failed 계약 | receipt 없는 성공 기록을 거부 | GOV-003 |

## 6. 휴가관리 미구현분 TUW

### 6.1 휴가 유형 경제 규칙

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| LV-TYPE-001 | DONE | 정책 버전에 유형별 사용·유급·차감 규칙을 안전하게 저장 | `type_rules`, 허용 mode, paid/deduction bps, 시간 반올림 validator | 8h·4h·2h·시간제와 잘못된 비율·단위 테스트 | GOV-001 |
| LV-TYPE-002 | DONE | 정책 API가 경제 규칙을 생성·버전업·조회 | 기존 policy service/API 재사용, published version 불변 | create/update/publish/tenant 격리 API 테스트 | LV-TYPE-001, 기존 leave policy scope 계약 |
| LV-TYPE-003 | DONE | 신청 미리보기가 잔액 차감분과 유급분을 분리 계산 | schedule requested minutes를 서버 규칙에 입력 | full/half/quarter/hours 결과 및 rounding 경계 | LV-TYPE-002 |
| LV-TYPE-004 | DONE | 신청 시 경제 규칙 snapshot 보존 | 요청/segment에 정책 규칙 hash, paid/deduction minutes 저장 | 이후 정책 변경 후 과거 요청 결과 불변 | LV-TYPE-003, GOV-004 |
| LV-TYPE-005 | DONE | 예약·승인·취소 원장이 차감시간을 사용 | allocation·reserved·used·released를 deduction 기준으로 통일 | 신청→승인→취소 합계 0 회귀 | LV-TYPE-004 |
| LV-TYPE-006 | DONE | 급여 projection이 유급·무급 분을 분리 | integration outbox에 paid/unpaid minutes와 policy snapshot ref | privacy-safe payload와 합계 테스트 | LV-TYPE-004 |
| LV-TYPE-007 | DONE | 기존 휴가 유형 화면에서 규칙 편집 | 같은 탭에 단일 행 입력, 새 메뉴 없음 | 저장·재조회·published 불변·720px UI 테스트 | LV-TYPE-002; Lazyweb report `d45bf3a6-45ee-4a28-9f01-4b47d22d4191`, targeted 13/13, web typecheck/build, 현재 Forest 브라우저 저장·재조회 확인 |
| LV-TYPE-008 | DONE | 직원 신청 화면이 허용 mode만 노출 | 유형 변경 시 full/half/quarter/hours 선택 제한, 미리보기 수치 표시 | keyboard·aria·허용되지 않은 mode 차단 | LV-TYPE-003, LV-TYPE-007; 회사 로컬 날짜 기준 active policy 조회, 브라우저에서 quarter 차단·90분 차감·유급 45분·무급 45분 확인 |
| LV-TYPE-009 | DONE | 기존 정책의 안전한 기본 규칙 backfill | 기존 type/group별 1:1 유급·차감 draft 생성 후 승인 전 미적용 | dry-run count, 재실행 중복 0, rollback manifest | LV-TYPE-002, GOV-004; dry-run/approval hash/active 불변/재실행 0/기존 draft rollback 2/2, production execute는 owner manifest 전까지 차단 |

### 6.2 발생 건 lifecycle와 만료

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| LV-LIFE-001 | DONE | entitlement 상태를 예정·활성·만료·취소로 일관되게 파생 | `valid_from`, `expires_on`, cancellation/reversal 기반 read model | 경계일·timezone·취소 우선순위 테스트 | LV-TYPE-005 |
| LV-LIFE-002 | DONE | 만료 preview가 대상과 잔여분을 계산 | entitlement별 사용·예약분 제외, 음수 금지 | 선소멸·부분사용·예약 fixture | LV-LIFE-001 |
| LV-LIFE-003 | DONE | 만료 execute가 `expired` 원장을 한 번만 추가 | preview hash 확인, idempotency key, 감사 이벤트 | 재실행 중복 0, 원장 재계산 일치 | LV-LIFE-002 |
| LV-LIFE-004 | DONE | 정기 만료 job과 실패 재시도 | scheduler command/outbox, tenant별 cursor | 일부 tenant 실패 후 재개 테스트 | LV-LIFE-003 |
| LV-LIFE-005 | DONE | 예정 발생 수정·취소와 활성 발생 역분개 | 시작 전 patch, 시작 후 immutable + adjustment | 동시 버전 충돌과 감사 테스트 | LV-LIFE-001, GOV-003; targeted 10/10, HRX 453/453 |
| LV-LIFE-006 | DONE | lifecycle API와 상태 필터 | 목록/상세/preview/execute routes | tenant·scope·pagination 계약 테스트 | LV-LIFE-003, GOV-003; targeted 11/11, HRX·authz/API 전체 회귀 exit 0 |

### 6.3 최대 10년 자동 발생

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| LV-BATCH-001 | DONE | 다기간 부모 batch와 하위 run 저장 | batch, periods, status, source version, snapshot hash | migration·repository roundtrip | GOV-004; migration 013, targeted 12/12, HRX 460/460, durable driver 재개방·오류 경로 확인 |
| LV-BATCH-002 | DONE | 입사일·회계연도 기간 생성기 | 시작·종료·최대 10년·윤년·월말 계산 | 1개월, 1년, 10년, 초과 거부 fixture | LV-BATCH-001; targeted 8/8, HRX 465/465, 120개월·윤년 driver 확인 |
| LV-BATCH-003 | DONE | 다기간 preview | 기존 단일 period preview를 조합, 직원·기간별 결과 | total = child totals, stale source 감지 | LV-BATCH-002; targeted 27/27, HRX 474/474, 부분 실패·원천 변경 확인 |
| LV-BATCH-004 | DONE | 다기간 execute | matching preview만 실행, child idempotency 유지 | 전체 성공·부분 오류·중복 0 | LV-BATCH-003; preview 전체 검증 후 execute, step-up, 재실행 ledger 중복 0 |
| LV-BATCH-005 | DONE | 실패 child만 재시도·재개 | completed child 보존, 오류 행 receipt | kill/restart 후 같은 결과 | LV-BATCH-004; durable reopen 후 실패 child만 attempt 2, 완료 child attempt 1 보존 |
| LV-BATCH-006 | DONE | batch API와 권한 | create preview, execute, retry, detail routes | execute scope와 self 접근 차단 | LV-BATCH-005, GOV-003; API/authz targeted 40/40, HRX API 123/123, live curl 권한·MFA·멱등 확인 |
| LV-BATCH-007 | DONE | 기존 자동발생 화면에서 기간 batch 실행 | 규칙·시작·종료·10년 guard, 행별 결과 | 단일 행 상태, disabled rules, 720~1512px | LV-BATCH-006; Lazyweb report `e3d63282-8a82-434d-94bd-8ce0bbcb29b7`, targeted 25/25, typecheck·web build, 실제 Forest 브라우저 미리보기·10년 상한·CSV/XLSX·MFA 확인 |
| LV-BATCH-008 | DONE | batch export와 실행 영수증 | employee/period/result CSV·XLSX | 화면 수치·파일 수치·DB 수치 일치 | LV-BATCH-005; targeted 31/31, HRX 475/475, CSV·XLSX·원장 합계 대사 |

### 6.4 발생 관리·업로드·보기

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| LV-OCC-001 | DONE | 발생 건 통합 query service | 직원·조직·그룹·기간·상태 필터, 총/사용/잔여 | pagination, 합계, tenant 격리 | LV-LIFE-006; targeted 29/29, HRX 477/477, HRX API 97/97, live HTTP scope 확인 |
| LV-OCC-002 | DONE | 목록·월별·유형별 projection | 같은 원장에서 list/month/type pivot 생성 | 세 보기의 총합 동일 | LV-OCC-001; 동일 source version과 세 보기 합계 대사 |
| LV-OCC-003 | DONE | 수동 예정 발생 | future valid_from, expiry, memo, source document, second approver | 예정 상태와 시작 전 잔액 제외 | LV-LIFE-001; targeted 33/33, HRX 478/478, HRX API 99/99, live HTTP 예약 480분·시작 전 잔액 0분·private field 비노출 |
| LV-OCC-004A | DONE | 수동 발생 수정·취소 API | 시작 전 날짜 CAS edit, 시작 후 adjustment, 시작 전 cancel | optimistic conflict, audit, exact reversal | LV-OCC-003, LV-LIFE-005; live HTTP `scheduled v1→v2→cancelled`, 480분 역분개 |
| LV-OCC-004B | DONE | 기존 Forest 화면의 수동 발생 수정·취소 UI | 기존 발생 관리 표 안의 단일 행 action, 새 메뉴 없음 | 44px 행·무의미한 2줄 0·720~1512px | LV-OCC-004A; Lazyweb report `cc99990c-b337-40ad-92a8-9e22a7beb70b` 및 실제 Forest QA |
| LV-OCC-005 | DONE | 버전된 CSV 업로드 템플릿 | columns, enum, date, minute units, example-free production template | template parser roundtrip | GOV-002; targeted 32/32, live HTTP 2-line·0-row template, version roundtrip 확인 |
| LV-OCC-006 | DONE | 업로드 preview와 행별 오류 | 파일 hash, 중복 key, employee/policy lookup, 전행 검증 | 혼합 성공/오류 파일에서 write 0 | LV-OCC-005; targeted 32/32, live HTTP ready 1/error 2/duplicate 1, SHA-256와 저장소 hash 무변경 확인 |
| LV-OCC-007 | DONE | 승인된 업로드 batch execute | preview hash, idempotency, row receipt | 재실행 중복 0, 부분 실패 재개 | LV-OCC-006; migration 015, targeted 40/40, durable failed-row resume, live HTTP MFA·승인·replay 신규 원장 0 확인 |
| LV-OCC-008 | DONE | CSV/XLSX 내보내기 | 현재 필터·권한·보기 반영 | exported totals와 query totals 일치 | LV-OCC-002 |
| LV-OCC-009 | DONE | 기존 휴가 사용 화면을 발생 관리 workspace로 완성 | 필터·보기 토글·수동 발생·업로드·내보내기, 새 사이드바 없음 | 44px 행, 무의미한 2줄 0, responsive UI | LV-OCC-004B, LV-OCC-008; Lazyweb report `cc99990c-b337-40ad-92a8-9e22a7beb70b` 및 실제 Forest QA |

### 6.5 사용 촉진·전달·협업도구

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| LV-PROM-001 | DONE | 촉진 campaign과 수신자 batch | 1차·2차 대상 snapshot, 제외 사유, 상태 | 동일 기준일 재실행 중복 0 | LV-OCC-001 |
| LV-PROM-002 | DONE | 수신자별 문서 생성과 버전 고정 | 기존 HR 문서 참조, hash, 서면 단계 | 내용 hash·대상·기한 golden test | LV-PROM-001 |
| LV-PROM-003 | DONE | 이메일·메시지 delivery port | provider-neutral request, PII reference only | receipt 없이는 pending 유지 | GOV-006, LV-PROM-002 |
| LV-PROM-004 | DONE | 일괄 발송·실패 재시도·열람 기록 | per-recipient idempotency와 delivery/view receipt | 부분 실패·재전송·revocation | LV-PROM-003 |
| LV-PROM-005 | DONE | 기존 촉진 화면에 batch 운영 연결 | 대상 선택·발송·상태를 표 행으로 표시 | dead button 0, role별 UI | LV-PROM-004; current `matter.app` Forest 기준, Lazyweb report `81e21969-43e9-4b58-a5df-7a7f970e08fb`, 1512/1280/720 browser QA |
| LV-INT-001 | DONE | 캘린더 privacy projection | 공개 제목은 `휴가`, 기간만 전송, 유형·사유·첨부 제외 | payload PII deny-list 테스트 | LV-TYPE-006; schedule payload 공개 제목·기간·opaque owner ref 외 private field 0 |
| LV-INT-002 | DONE | Matter 내부 캘린더 adapter | 승인·변경·취소 upsert/delete와 receipt | 승인→변경→취소 E2E | LV-INT-001, GOV-006; deterministic event ID·receipt·duplicate 0 |
| LV-INT-003 | DONE | Google·Outlook calendar adapters | OAuth reference, idempotent event ID, retry | sandbox receipt와 token redaction | LV-INT-002; injected sandbox만 사용, OAuth credential 저장 0 |
| LV-INT-004 | DONE | Slack·Teams 알림 adapters | 신청·승인·변경 상태 알림, 공개 최소 정보 | sandbox receipt와 duplicate 0 | LV-INT-001; opaque connection ref·최소 상태 payload·duplicate 0 |
| LV-INT-005 | DONE | provider dead-letter와 운영 재처리 | fail count, last error code, retry action | poison message 격리 | LV-INT-003, LV-INT-004; migration 019, targeted 19/19, current Forest browser QA, Lazyweb report `3dd53495-039d-4be7-bdfc-52954fb26252` |

### 6.6 휴가 보안·마이그레이션·출시 검증

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| LV-SEC-001 | DONE | 휴가 row/count/attachment 비공개 | self/team/HR scope, download authorization | 존재 여부·건수 side-channel 차단 | GOV-003; 보안 묶음 39/39, live HTTP self·assigned·HR 200 및 unassigned existing/missing 동일 404 |
| LV-MIG-001 | DONE | 기존 entitlement·request rule snapshot backfill | dry-run, approval manifest, immutable source refs | count/hash/re-run 검증 | LV-TYPE-009, GOV-004; migration 020, dedicated 4/4·migration 묶음 13/13, synthetic approval만 실행 |
| LV-MIG-002 | DONE | 원장 재계산 대사 | 직원·그룹별 current vs recomputed variance | unexplained variance 0 | LV-LIFE-003, LV-MIG-001; 정상 synthetic driver unexplained 0, 의도적 60분 변조·baseline missing 탐지 |
| LV-QA-001 | DONE | 휴가 전체 domain/API 회귀 | 모든 leave test, migration, auth | 0 fail, 기존 skip만 문서화 | 모든 LV service TUW; leave·migration·auth·API·web 340/340, web typecheck·production build PASS |
| LV-QA-002 | DONE | 휴가 실제 브라우저 QA | 직원·관리자·HR·권한없음, 5 viewport | console error·overflow·dead action 0 | 모든 LV UI TUW; current Forest 1512·1280·1024·900·720px, role 4종, 핵심 동작·MFA 진입·서지원 프로필 연결 PASS |
| LV-QA-003 | DONE | macOS·Windows 패키지 휴가 QA | 재시작·데이터 지속·오프라인/온라인 경계 | package hash와 screenshot manifest | macOS exact `matter.app` 10/10 시나리오·11개 캡처·console 0·재시작 domain hash 동일; Windows PE/ZIP PASS·macOS renderer hash 일치, native Windows 실행은 Darwin에서 미실행; `leave-management-package-qa.json`, `macos-build.md`, `windows-build.md` |

## 7. 급여정산 전체 구현 TUW

### 7.1 데이터·보안 기반

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-DATA-001 | DONE | 급여 기간·실행 상태 저장 | period, run, status, cutoff, pay date, state version | migration/repository lifecycle | migration `021_hrx_payroll_runtime`; period/run lifecycle·CAS·재시작 PASS |
| PY-DATA-002 | DONE | 입력 snapshot·직원 결과·line item 저장 | source refs/hash, integer KRW/minutes, formula code | roundtrip·tenant 격리 | `payroll/repository.js`; immutable snapshot/result/line item·tenant isolation PASS |
| PY-DATA-003 | DONE | 세율·보험·공제 버전 저장 | effective dates, source document hash, approval state | overlap·gap·immutable publish 테스트 | 연속 기간·4-eyes·gap 차단·published history 불변 PASS |
| PY-DATA-004 | DONE | 명세서·전달 receipt 저장 | template/version/document ref/delivery/view | raw PII 저장 금지 테스트 | tokenized document/provider refs·receipt 전 success 차단 PASS |
| PY-DATA-005 | DONE | 이체 batch·지급 receipt·신고 job 저장 | tokenized account ref, checksum, provider receipt | secret redaction·state transition | raw account 차단·bank/filing receipt state machine PASS; 실제 provider write 없음 |
| PY-DATA-006 | DONE | 급여 repository와 감사 event | transaction boundary, optimistic version, immutable history | rollback·conflict·audit completeness | HRX 전체 506/506, migration 5/5, repository 6/6; audit append 실패 rollback·hash chain PASS |

### 7.2 마감 입력 snapshot

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-IN-001 | DONE | 구성원 급여 profile | monthly/hourly/daily/freelancer, pay group, currency KRW | missing/invalid profile issues | migration 022·`payroll/input-snapshot-service.js`; 4종 profile·tenant isolation PASS |
| PY-IN-002 | DONE | 보상정보 복호화 경계 | 기존 encrypted compensation ref를 server-only resolver로 연결 | renderer/log/outbox plaintext 0 | AES-GCM server resolver·compensation append-only·snapshot/audit plaintext 0 PASS |
| PY-IN-003 | DONE | 출근·퇴근 입력 snapshot | 고정 근로시간 정책과 기록된 출퇴근만 사용 | cutoff 이후 변경이 snapshot에 영향 0 | correction leaf·고정 480분 fallback·capture 후 hash/분 불변 PASS |
| PY-IN-004 | DONE | 승인된 연장·야간·휴일시간 snapshot | 승인 상태와 법정 구간 분리 | 미승인 시간 제외·중복 0 | approved/exported만 포함, overtime/night/holiday 120/60/30분·submitted 제외 PASS |
| PY-IN-005 | DONE | 유급·무급 휴가 snapshot | paid/unpaid minutes, unused balance, policy refs | 휴가 원장·snapshot 합계 일치 | paid 480·unpaid 120·unused 840분 대사, 부분기간 segment 누락 blocker PASS |
| PY-IN-006 | DONE | 입·퇴사·휴직·중도변경 snapshot | 기간 내 active dates와 proration inputs | 월초·월말·중도 경계 fixture | 2024-02 윤년 29일·중도 20/11일·상태/경계 입력 PASS |
| PY-IN-007 | DONE | 직원별 입력 검증과 전체 snapshot hash | 누락을 issue로 기록, silent exclusion 금지 | 한 명 오류 시 다른 직원 보존, hash deterministic | 유효 직원 보존·누락 issue durable·수정 후 resume/resolve·재실행 hash 동일 PASS; HRX 512/512·migration 5/5 |

### 7.3 지급 항목 계산

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-CALC-001 | DONE | 금액·비율·반올림 primitive | integer KRW, basis points, policy rounding | 음수·overflow·0.5 경계 golden test | BigInt 중간계산·safe integer 경계·4개 rounding mode 2/2 PASS |
| PY-CALC-002 | DONE | 월급제 기본급·일할 계산 | 고정 월급, 입퇴사/휴직 proration | 월 길이·윤년·중도 입퇴사 golden | 31일·윤년 29일·중도 17/31·명시적 무급휴가 divisor PASS |
| PY-CALC-003 | DONE | 시급제 계산 | 승인된 payable minutes × hourly rate | 분 단위·rounding golden | 근무 61분+유급 30분·분 단위 KRW 반올림 PASS |
| PY-CALC-004 | DONE | 일급제 계산 | payable day/minute normalization | 반일·결근·월경계 golden | 480분 근무+240분 유급 반일을 표준 480분 기준 정규화 PASS |
| PY-CALC-005 | DONE | 프리랜서 지급 계산 | contract amount/unit, withholding category input | 계약 단위·기간 fixture | contract/deliverable 수량 계산·withholding category 누락 fail-closed PASS |
| PY-CALC-006 | DONE | 과세·비과세·사용자 수당 | versioned earning catalog와 limits | taxable totals·limit 경계 | published rule만 허용, fixed/bps 수당·비과세 한도 초과분 과세 분리 PASS |
| PY-CALC-007 | DONE | 연장·야간·휴일수당 | 승인 시간, 중복 구간, 적용 배율 | 중첩 구간과 법정 휴일 golden | frozen 승인 segment만 사용·버전 규칙의 additive bps·누락 rule issue PASS |
| PY-CALC-008 | DONE | 미사용 휴가수당 | eligible balance, rate basis, cutoff snapshot | 소멸·예약·퇴사 fixture | 종료 경계·960분 cap·명시적 monthly divisor·비대상 미지급 PASS |
| PY-CALC-009 | DONE | 소급·조정 항목 | previous run ref, positive/negative adjustment, reason | 원본 run 불변·net 재계산 | tokenized prior run·양/음 delta·입력 불변·순서 무관 result hash PASS |

### 7.4 세금·보험·공제

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-DED-001 | DONE | 공식 표 import·검토·publish | versioned source document, effective dates, four-eye approval | malformed/overlap/gap 차단 | synthetic package import→review→publish·date resolve, gap/overlap·production fixture 차단 PASS |
| PY-DED-002 | DONE | 소득세·지방소득세 계산 | 부양가족·과세표준·지방세 연계 | 공식 표 golden·경계값 | 부양 0/3명·구간 경계·freelancer category·지방세 bps PASS |
| PY-DED-003 | DONE | 국민연금 계산 | 기준소득월액·상하한·가입 상태 | 상하한·입퇴사 fixture | synthetic published 상·하한 clamp·미가입 제외 PASS |
| PY-DED-004 | DONE | 건강보험·장기요양 계산 | 보수월액·보험료율·장기요양 연계 | rate version·rounding golden | 동일 published version의 health base·LTC-on-health bps PASS |
| PY-DED-005 | DONE | 고용보험 계산 | 근로자 구분·보수·가입 상태 | 제외 대상·rate boundary | 명시적 가입·기여 기준·미가입 제외 PASS |
| PY-DED-006 | DONE | 사용자 정의 공제 | fixed/rate/installment, floor at policy limit | 중복·잔여회차·음수 net issue | fixed/rate/잔여 installment·중복 차단·net floor clamp warning PASS |
| PY-DED-007 | DONE | 공단·세무 고지 대사 | calculated vs notice, variance reason/approval | unexplained variance가 close 차단 | match/explained/unexplained 3상태·승인 ref 없는 차이 blocker PASS |

### 7.5 급여 실행 lifecycle와 승인

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-RUN-001 | DONE | 급여 미리보기 실행 | frozen snapshot에서 earnings/deductions/net 생성 | 동일 snapshot 결과 hash 동일 | migration 024, payroll run targeted 3/3, payroll 전체 36/36 |
| PY-RUN-002 | DONE | 직원별 문제·전월 변동 검토 | missing input, negative net, threshold variance | unresolved blocker가 승인 차단 | notice·전월 threshold blocker 생성/명시적 resolve 후 승인 검증 |
| PY-RUN-003 | DONE | 작성자·승인자 분리와 step-up | preparer cannot self-approve, approval receipt | role matrix allow/deny·replay 차단 | 범위·만료·hash 검증, outbox idempotency로 receipt 재사용 차단 |
| PY-RUN-004 | DONE | 마감·재개 정책 | approved만 close, close 후 source mutation 차단 | invalid transition·optimistic conflict | approved→closed만 허용, closed run 불변, 원본 재개 없음 |
| PY-RUN-005 | DONE | 마감 후 adjustment run | original immutable, delta-only new run | prior + delta = adjusted total | 동일 source hash 강제, 조정 입력 append-only, delta 합계 검증 |
| PY-RUN-006 | DONE | 급여 outbox와 감사 추적 | preview/approve/close/export/pay events | event completeness·PII redaction | preview/approve/close outbox·audit 원자 저장; export/pay는 해당 TUW에서 추가 |

### 7.6 Forest 급여 UI

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-UI-001 | DONE | 기존 급여 경계 화면을 실제 workspace route로 전환 | 기존 People 메뉴 ID 재사용, 중복 사이드바 없음 | route·scope·deep link 테스트 | People `마감 및 급여` 메뉴 재사용; web UI 3/3·API 3/3·6-role browser QA PASS |
| PY-UI-002 | DONE | 급여 기간 목록과 실행 액션 | status, cutoff, pay date, totals, preview | dead action 0, loading/error states | 실제 Forest 앱에서 2026-07 preview→approve→close 및 재조회 PASS |
| PY-UI-003 | DONE | 직원별 44px 단일 행 표 | gross, deductions, net, variance, issue, status | 2줄 텍스트·overflow 0 | 10명 전 행 44px; 5 viewport root/main overflow 0 |
| PY-UI-004 | DONE | 직원 상세 drawer | source refs, earnings, deductions, formulas, adjustment history | keyboard/aria/close/focus trap | close 초기 focus·ESC close·opener focus return PASS |
| PY-UI-005 | DONE | 문제 검토·승인·마감 | bulk resolve 제한, step-up, confirmation | self-approval UI/API 동시 차단 | API self-approval 403, 별도 approver step-up 승인·마감 PASS |
| PY-UI-006 | DONE | Forest 반응형·문구 회귀 | 1512/1280/1024/820/720, 단일 행 우선 | visual regression·sloplint | Lazyweb report `06093de4-07f9-42f3-b78c-21bd85ef0142`; browser receipt PASS, UI 회귀 31/31, sloplint strong 0·weak 60 수동 검토 |

### 7.7 명세서·리포트·전달

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-DOC-001 | DONE | 버전된 급여명세서 template | 필수 항목, 회사 정보, 지급·공제·net, template hash | schema·version immutability | document service 3/3; published template와 동일-byte 재생성 PASS |
| PY-DOC-002 | DONE | 직원별 PDF 생성 | server-side document renderer, encrypted storage ref | PDF text golden·PII access | 암호화 저장 ref·재시작 후 `%PDF-1.4` 복원·저장본 평문 PII 0 PASS |
| PY-DOC-003 | DONE | 급여대장·리포트·CSV/XLSX | period/employee/line-item exports | UI/DB/export totals 동일 | CSV/XLSX 합계가 closed run과 일치, XLSX `PK` PASS |
| PY-DOC-004 | DONE | 이메일·메시지 일괄 전달 | delivery port, per-employee receipt, retry | provider sandbox·receipt 없는 success 0 | 합성 adapter에서 receipt 전 delivered 0; 패키지 10건 전달 receipt PASS |
| PY-DOC-005 | DONE | 직원 자기 명세서 조회 | self scope, read state, expiry/revocation | 다른 직원 접근·count leak 차단 | 다른 직원 404·본인 1행·관리 toolbar 미노출·열람 상태 기록 PASS |

### 7.8 은행 지급

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-BANK-001 | DONE | 은행별 대량이체 파일 adapter | tokenized account resolver, bank format, checksum | bank fixture golden·plaintext log 0 | payment service 3/3; deterministic 암호화 batch·tokenized account만 영속화 PASS |
| PY-BANK-002 | DONE | 이체 batch 이중 승인·export | payroll approver와 payment approver 분리 | self-approval·tamper·replay 차단 | 작성자·급여승인자와 지급승인자 분리, step-up·checksum 변조 차단 PASS |
| PY-BANK-003 | DONE | 지급 결과 receipt·대사 | provider/bank receipt import, paid/failed per employee | receipt 전 paid 표시 0, 합계 대사 | 합성 bank receipt 전 paid 0; 패키지 export→reconciled 및 합계 대사 PASS |

### 7.9 퇴직·신고·연말정산

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-TAX-001 | DONE | 퇴직금 계산 | 평균임금 입력 snapshot, 근속기간, 제외기간 | 법정 경계 golden·manual review flag | 365/364일 경계·review ref·금액 golden PASS; 합성 규칙으로 production claim 0 |
| PY-TAX-002 | DONE | 퇴직연금 DC·IRP 추납 항목 | plan config, contribution, transfer refs | plan별 totals·duplicate 0 | DC·IRP 합계 및 deterministic duplicate key PASS |
| PY-TAX-003 | DONE | 중도퇴사자 정산 | 마지막 급여, 미사용 휴가, 보험·세금 adjustment | 입퇴사일 경계 E2E | 마지막 급여·미사용 휴가·세금/보험 adjustment 합계와 잘못된 날짜 차단 PASS |
| PY-TAX-004 | DONE | 원천징수·지급명세서 package | official schema version, validation, export | schema validator·totals | fixture-only schema·totals validator PASS; 실제 공식 schema 미승인 시 fail-closed |
| PY-TAX-005 | DONE | 사회보험 신고 package | 취득·상실·보수월액 refs와 export | schema·employee totals | 사회보험 package schema·employee totals 검증 PASS |
| PY-TAX-006 | DONE | 연말정산 workspace와 결과 snapshot | 자료 수집 상태, 공제 입력, 계산, 검토 | annual golden fixture·four-eye | year-end 2/2; 미수집 계산 차단·self review 차단·immutable reviewed snapshot PASS |
| PY-TAX-007 | DONE | 신고 provider receipt·재처리 | submitted/accepted/rejected, correction package | receipt 전 filed 표시 0 | filing 3/3; pending retry·accepted/rejected/corrected PASS, 패키지 합성 신고 4종 accepted |

### 7.10 급여 마이그레이션·QA·경계 해제

| ID | 상태 | 결과 | 구현 범위 | 자동 검증 | 의존성·증거 |
|---|---|---|---|---|---|
| PY-MIG-001 | DONE | 실제 급여 profile·잔액 migration dry-run | private source, repo-safe count/hash, owner manifest | count/hash/re-run·rollback | migration 3/3; repo-safe preview·정확 manifest·재실행 0·leave 대사·backup rollback PASS; 실제 private execute는 미수행 |
| PY-QA-001 | DONE | 급여 domain/API golden suite | 고용형태·수당·세금·보험·퇴직 경계 | 0 fail, deterministic hashes | domain 54/54, API+role matrix 7/7, web 3/3, desktop 26/26, UI regression 31/31 PASS |
| PY-QA-002 | DONE | 두 급여기간 병행 계산 | 현행 결과와 직원별 비교, variance adjudication | unexplained employee variance 0 | parallel comparison 2/2; tokenized reviewed adjudication 후 unexplained 0·hash deterministic PASS |
| PY-QA-003 | DONE | 실제 브라우저와 macOS·Windows package QA | 6 roles, 5 viewport, restart persistence | console/dead action/overflow 0 | browser receipt PASS; 실제 macOS bundle E2E·재시작 PASS; Windows PE/ZIP/renderer parity PASS, native smoke는 Darwin에서 미수행 |
| GATE-001 | DONE | payroll boundary contract 단계적 해제 | calculation/runtime/production claim을 증거별 별도 변경 | 계약 validator가 선행 증거 누락 차단 | readiness 2/2; internal runtime와 package_verified까지만 true, production/go-live는 false 유지 |
| GATE-002 | BLOCKED | 외부 운영 전환 | 법무·노무·세무 signoff, provider·bank sandbox/production receipts | owner 승인과 운영 runbook drill | 외부 권한 필요 |

## 8. 테스트 명령과 증거 규칙

각 TUW의 대상 테스트 외에 phase 종료 시 아래 묶음을 실행한다.

```bash
node --test --test-concurrency=1 packages/hrx/test/leave-*.test.js
node --test --test-concurrency=1 apps/api/test/hrx/leave-*.test.js
node --test --test-concurrency=1 packages/hrx/test/payroll-*.test.js
node --test --test-concurrency=1 apps/api/test/hrx/payroll-*.test.js
node --test --test-concurrency=1 apps/web/test/leave-*.test.mjs
node --test --test-concurrency=1 apps/web/test/payroll-*.test.mjs
npm run build -w apps/web
node --test --test-concurrency=1 apps/desktop/test/renderer-runtime-ui.test.mjs
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

UI TUW는 자동 검사만으로 닫지 않는다. 현재 소스에서 번들을 생성하고 실제 앱에서 클릭·입력·재시작까지 수행한 스크린샷 manifest를 남긴다.

외부 작업의 증거는 다음을 구분한다.

- `internal_implementation`: 소스·테스트 완료
- `sandbox_receipt`: 공급자 sandbox가 요청을 수락하고 receipt 반환
- `package_verified`: 실제 macOS/Windows bundle 검증
- `production_approved`: owner·법무·노무·세무 승인
- `go_live`: 별도 운영 전환 승인과 실제 production receipt

앞 단계 증거를 다음 단계로 표현하지 않는다.

## 9. 이번 실행 진행 기록

| 시각 | TUW | 상태 | 증거 |
|---|---|---|---|
| 2026-07-14 | GOV-001 | DONE | 최신 Forest branch와 package renderer 기준선 재확인 |
| 2026-07-14 | LV-TYPE-001 | DONE | 휴가 domain 57/57, 휴가 API 20/20, library driver 정상·오류 경로 확인 |
| 2026-07-14 | LV-TYPE-002 | DONE | 정책 API create/update/read/publish/version/tenant 격리 3/3 통과, published 불변 및 잘못된 비율 차단 |
| 2026-07-14 | LV-TYPE-003 | DONE | 휴가 경제·durable 23/23, API targeted 6/6, HRX 전체 430/430, live HTTP preview 200 및 금지 mode 400 확인 |
| 2026-07-14 | LV-TYPE-004 | DONE | migration 011, 요청·segment 정책 hash/유급·무급·차감 snapshot, 정책 v2 생성 후 v1 신청 불변 검증 |
| 2026-07-14 | LV-TYPE-005 | DONE | 차감분 기준 예약→사용→승인후취소 원복 및 0차감 경로, targeted 31/31, HRX 433/433, HRX API 87/87, live curl 잔액 480→420→420→480 확인 |
| 2026-07-14 | LV-TYPE-006 | DONE | 신청 snapshot 기준 유급 60분·무급 180분·정책 버전/해시 payroll boundary, privacy deny-list, domain 4/4, API 3/3, HRX 433/433, HRX API 87/87, live curl 합계 240분·비공개 필드 0 확인 |
| 2026-07-14 | LV-TYPE-007 | BLOCKED | `lazyweb-design` 필수 report·image upload MCP가 현재 도구 목록과 설치 후보에 없음; 임의 UI 구현 금지, 커넥터 재연결·`lazyweb-update` 후 재개 |
| 2026-07-14 | LV-LIFE-001 | DONE | 예정·활성·만료·취소 파생 read model, 시작일·만료일 포함 및 Asia/Seoul 경계, 지급 원장 반전 우선순위; targeted 4/4, HRX 437/437, HRX API 87/87, library driver `active→expired→cancelled`·invalid timezone 차단 확인 |
| 2026-07-14 | LV-LIFE-002 | DONE | 만료 entitlement의 원장 잔액 기준 preview, 사용·예약 제외·released 원복·음수 0 clamp·선만료 정렬; targeted 6/6, HRX 439/439, library driver 후보 1건·300분 확인 |
| 2026-07-14 | LV-LIFE-003 | DONE | tenant-scoped preview receipt·source/snapshot hash 재검증·transactional expired 원장/execute receipt/audit, stale 원자 rollback·step-up·재실행 중복 0; targeted 9/9, HRX 442/442, service driver 360분 만료·후속 후보 0 확인 |
| 2026-07-14 | LV-LIFE-004 | DONE | migration 012 전용 job outbox, tenant 정렬 cursor·실패 직전 재개·retry schedule·system job assurance; targeted 16/16, HRX 444/444, HRX API 87/87, driver A 완료/B 실패→B 재개·attempt 2·tenant별 expired 1건 확인 |
| 2026-07-14 | GOV-002 | DONE | 회사 시간·급여 정책 manifest schema와 합성 fixture, 480분·1분 무반올림·12개월 소멸·4개 고용형태 구조 검증; 미확정 마감일·지급일·provider ID·owner source를 production에서 fail-closed, targeted 5/5, HRX 449/449, HRX API 87/87 |
| 2026-07-14 | GOV-003 | DONE | employee·manager·HR·payroll preparer·approver·auditor·admin scope matrix와 live role mapping, approve/export 분리; matrix 4/4, authz 2/2, route/runtime/session API 묶음 exit 0 |
| 2026-07-14 | LV-LIFE-005 | DONE | 예약 권리의 날짜만 CAS 수정, 시작 후 원본 불변·분 단위 adjustment, 예약 취소 시 원장 credit 정확 역분개, step-up·tenant·멱등 receipt·audit; targeted 10/10, HRX 전체 453/453, library driver `scheduled→cancelled`·480분 역분개·step-up 차단 확인 |
| 2026-07-14 | LV-LIFE-006 | DONE | 본인·직속팀·HR 행 범위, 상태/직원/그룹/정책 필터와 불투명 cursor 목록·상세, 무권한 상세 404, 만료 preview/execute API 및 execute step-up 연결; targeted 11/11, HRX·authz/API 전체 회귀 exit 0, live HTTP 목록 200·preview 120분·no-step-up 403·execute 200 확인 |
| 2026-07-14 | GOV-004 | DONE | migration ID/SQL/hash 사전검증, checksum backup, 원자 restoreSnapshot, 실패 시 자동 rollback; 빈 DB·기존 DB·중간 실패·변조 backup targeted 14/14, HRX 전체 회귀 exit 0, durable driver 재개방 후 snapshot·구성원 보존 확인 |
| 2026-07-14 | LV-BATCH-001 | DONE | migration 013 부모 batch·기간 행, 기존 단일 accrual run 참조, preview/execute 분리, tenant·멱등·CAS·상태/hash 영속화; targeted 12/12, HRX 460/460, durable driver 재개방 및 중첩 기간 차단 확인 |
| 2026-07-14 | LV-BATCH-002 | DONE | 월 개근·입사일·회계연도·고정일 기간 생성, 완결 기간 경계·윤년 2월 29일 anchor 복원·월말·최대 10년 guard; targeted 8/8, HRX 465/465, library driver 120개월·초과 거부 확인 |
| 2026-07-14 | LV-BATCH-003 | DONE | 기존 단일 기간 preview 조합, 부모·기간별 상태·합계·stale source 전체 검증, 기간 실패 명시; 배치 targeted 27/27, HRX 474/474 |
| 2026-07-14 | LV-BATCH-004 | DONE | 모든 preview child 현재성 확인 후 execute, fresh step-up, execute 부모 단일성·child 멱등성·행 오류 보존; manual driver 신규 2건·재실행 duplicate 2건·원장 총 2건 확인 |
| 2026-07-14 | LV-BATCH-005 | DONE | completed child를 건드리지 않고 pending/running/failed child만 재개, 기간 attempt 영속화; durable reopen manual driver `completed_with_errors→completed`, attempt `[1,2]`, 원장 중복 0 확인 |
| 2026-07-14 | LV-BATCH-006 | DONE | `POST batches/preview`, `GET batches/:id`, `POST batches/:id/execute`, `POST batches/:id/retry`와 route policy·audit 연결; self-service 선차단, execute/retry scope와 fresh MFA 강제, targeted 40/40·HRX API 123/123·live curl self 403/preview 200/no-MFA 403/execute 200/replay new_entries 0/detail 200 확인 |
| 2026-07-14 | LV-BATCH-007 | BLOCKED | `lazyweb-design` 필수 report·image upload MCP가 현재 도구 목록과 설치 후보에 없음; 현재 Forest UI를 임의 재설계하지 않고 API 완료 상태로 대기 |
| 2026-07-14 | LV-BATCH-008 | DONE | 현재 배치의 직원·기간·결과만 포함하는 권한 기반 CSV·XLSX 영수증, source hash 비노출, 화면용 합계·파일 합계·원장 합계 일치; targeted 31/31, HRX 475/475, manual driver CSV 1행·480분·원장 1건·XLSX `PK` 확인 |
| 2026-07-14 | LV-OCC-001 | DONE | 기존 entitlement·분 원장을 재사용한 직원·조직·그룹·기간·상태 통합 조회, 불투명 cursor, 총·사용·예약·만료·잔여 합계, source/reason/attachment 비노출; targeted service/API/authz 29/29, HRX 477/477, HRX API 97/97, live HTTP 관리자 1건·480분/다른 직원 self 0건 확인 |
| 2026-07-14 | LV-OCC-002 | DONE | 같은 필터 결과에서 목록·발생월·휴가유형 projection과 단일 source version 생성; 각 projection 합계가 목록 합계와 일치하고 live HTTP source version 일치 확인 |
| 2026-07-14 | LV-OCC-003 | DONE | 기존 manual adjustment 경로에 미래일·만료일·메모·검증 문서·다른 승인자를 연결하고 migration 014로 entitlement 메타데이터를 비파괴 추가; targeted 33/33, HRX 478/478, HRX API 99/99, live curl preview 1건·MFA 전 403·execute scheduled·480분 시작 전 잔액 0·private field 비노출 확인 |
| 2026-07-14 | LV-OCC-004A | DONE | 기존 entitlement command service를 API에 연결해 시작 전 날짜 CAS 수정, 예약 취소의 정확 역분개, 시작 후 immutable adjustment와 audit를 제공; live curl `scheduled v1→scheduled v2→cancelled`, 480분 역분개·잔액 0 확인 |
| 2026-07-14 | LV-OCC-004B | BLOCKED | 기존 Forest UI 변경에는 Lazyweb report가 필수이나 현재 도구 목록에 report/image upload MCP가 없어, API 완료와 UI 완료를 분리하고 임의 화면 구현을 금지 |
| 2026-07-14 | LV-OCC-005 | DONE | `hrx-leave-occurrence-v1` metadata와 고정 column schema를 가진 example-free CSV template 및 기존 parser 호환; targeted 32/32, live HTTP 200·0 data row·2 nonempty line·example employee 0 확인 |
| 2026-07-14 | LV-OCC-006 | DONE | UTF-8 file SHA-256, canonical row key, 동일 파일 중복행·대상/정책 전행 검증, private field 비노출; targeted 32/32, live curl ready 1/error 2/duplicate 1·duplicate row pointer·preview 전후 durable store hash 동일 확인 |
| 2026-07-14 | LV-OCC-007 | DONE | migration 015 부모 upload batch·행 receipt, preview hash 고정, fresh MFA·다른 HR 승인, 행 단위 command idempotency와 failed/running만 재개; targeted 40/40, durable reopen 후 attempt `[1,2]`·원장 2건 중복 없음, live HTTP no-MFA 403·execute 신규 1·동일 replay 신규 0·private field 0 확인 |
| 2026-07-14 | LV-OCC-008 | DONE | 현재 필터·권한·list/month/type projection을 그대로 사용한 CSV/XLSX export와 self-scope 차단; service/API targeted 10/10, GOV 묶음 포함 16/16, exported totals와 query totals 일치 확인 |
| 2026-07-14 | GOV-005 | DONE | 합성 경계 직원 6명, 중도 입사·퇴사·유급·무급·미사용 휴가·연장·야간·휴일·부양가족 totals 고정, fixture hash `sha256:9c8febce970f035242814aa4162a1ce99b38c5203d0de774a88d6d69c879a1b1`; targeted 및 library driver 통과 |
| 2026-07-14 | GOV-006 | DONE | delivery·calendar·bank·filing 공통 pending/succeeded/failed receipt 계약, receipt 없는 성공·error 없는 실패·raw secret field 차단; targeted 및 library driver 통과 |
| 2026-07-14 | LV-PROM-001 | DONE | migration 016으로 campaign 제외 사유·건수 영속화, 활성 대상·비활성·기준 미달 snapshot/source hash 고정; service/API/migration targeted 16/16, library driver 동일 기준일 재실행 campaign 1·recipient 1·중복 0 확인 |
| 2026-07-14 | LV-PROM-002 | DONE | migration 017로 1·2차 수신자 문서 content hash 영속화, HR 문서 reference에 대상 ref·단계·버전·기한·법적 근거 snapshot 고정, 본문 미저장; golden hash 2건, targeted 16/16, live HTTP issue 200·동일 버전 replay 동일 문서·다른 버전 409 확인 |
| 2026-07-15 | LV-PROM-003 | DONE | 기존 notification adapter를 provider-neutral 이메일·메시지 port로 확장해 employee/document/campaign reference·content hash·버전·기한만 전달하고 주소·이름·본문은 제외; provider receipt 없이는 `pending_sync`, receipt 확인 후에만 delivered 처리. targeted 24/24, syntax 3/3, library driver pending→delivered·동일 hash·PII reference only 확인 |
| 2026-07-15 | LV-PROM-004 | DONE | migration 018의 불변 delivery/view/failed receipt, 수신자별 batch 부분 실패·replay, provider receipt 자동 기록, 동일 key 충돌 차단, delivery 취소 시 종속 view·2차 evidence cascade revocation과 문서 unverified 복원. 확장 회귀 70/70, targeted 26/26, syntax 통과, library driver pending→delivered→viewed→revoked 및 외부 provider write 없음 확인 |
| 2026-07-15 | LV-PROM-005 | DONE | 현재 실행 중인 `matter.app`의 Forest sidebar·단일 panel·44px 행 밀도를 기준으로 기존 촉진 화면에 대상 선택, 1·2차 batch, 실패 대상만 재시도, recipient 상태, 전달·열람 receipt와 audited revocation을 한 표에 연결. Lazyweb report `81e21969-43e9-4b58-a5df-7a7f970e08fb`; typecheck·web build·UI 2/2·promotion/integration 12/12 통과; 실제 브라우저 1512/1280/720에서 행 44px, 문서 가로 overflow 0, 내부 표 scroll, console error 0, dead action 0 확인 |
| 2026-07-15 | LV-INT-001 | DONE | 승인 휴가 일정 projection을 `휴가`·기간·timezone·opaque owner ref로 고정하고 유형·사유·첨부·문서·private description을 명시적으로 제외; payload deny-list와 실제 API schedule payload 확인 |
| 2026-07-15 | LV-INT-002 | DONE | Matter calendar adapter가 승인·변경을 동일 deterministic event ID로 upsert하고 취소를 delete하며 GOV-006 receipt를 반환; 승인→변경→취소와 replay duplicate 0 테스트 통과 |
| 2026-07-15 | LV-INT-003 | DONE | Google·Outlook adapter를 opaque `OAuthConnection:*` 참조와 injected sandbox client 경계로 구현; token 저장·renderer 전달 0, provider별 deterministic ID와 retry dedup 테스트 통과 |
| 2026-07-15 | LV-INT-004 | DONE | Slack·Teams adapter가 신청·승인·변경·취소 상태와 opaque 수신자 token·route만 전달하고 날짜·사유 등 private field를 제외; provider별 sandbox receipt와 duplicate 0 테스트 통과 |
| 2026-07-15 | LV-INT-005 | DONE | migration 019 durable dead-letter, poison event 격리, 다른 provider 계속 처리, 운영 재시도·resolve와 관리자 API/UI를 기존 `업무 시스템 연동` 섹션에 연결. targeted 19/19·web typecheck 통과; live QA에서 schedule 실패 4회·격리 1·다른 전달 9·재시도 후 대기 전환·재실패 재격리 확인. 현재 Forest 720px 화면 기반 Lazyweb report `3dd53495-039d-4be7-bdfc-52954fb26252`, 외부 provider write 0 |
| 2026-07-15 | LV-TYPE-007 | DONE | 현재 Forest `휴가 유형` 표에 정책 선택·읽기 전용/편집 가능 상태·새 버전 이동·신청 방식·유급·차감·반올림 단일 행 편집을 연결. Lazyweb report `d45bf3a6-45ee-4a28-9f01-4b47d22d4191`; 브라우저에서 draft를 `종일·반일·시간 / 50% / 100% / 15분 반올림`으로 저장·재조회, active에는 편집 action 0 확인 |
| 2026-07-15 | LV-TYPE-008 | DONE | 선택한 active policy의 type rule만 신청 단위에 노출하고 회사 로컬 날짜로 활성 버전을 조회. 실제 브라우저에서 `1/4일` 미노출, 1.5시간 요청에 90분 차감·유급 45분·무급 45분·잔여 14시간 30분 preview 확인; 허용되지 않은 mode는 UI와 domain 모두 차단 |
| 2026-07-15 | LV-TYPE-009 | DONE | 기존 type rule 누락분을 1:1 유급·차감 inactive draft에만 추가하는 deterministic dry-run/execute/rollback manifest 구현. 일치하는 owner approval schema·tenant·preview hash 없이는 write 0, active policy 불변, 재실행 action 0, 기존 draft의 원래 rules 복원 가능; production execute는 미수행 |
| 2026-07-15 | LV-BATCH-007 | DONE | 현재 Forest 자동발생 화면 안에 `단일 기간/기간 배치` 실행 방식을 통합하고 새 메뉴·카드 없이 규칙·시작·종료·최대 10년·미리보기·실행·실패 기간 재시도·CSV/XLSX를 연결. Lazyweb report `e3d63282-8a82-434d-94bd-8ce0bbcb29b7`; targeted 25/25·typecheck·web build 통과; 실제 720px 브라우저에서 종료일 max `2036-07-14`, 기간 1·대상 0·오류 10·실패 0, 44px 단일 행과 실행 시 6자리 MFA challenge 확인. 외부 provider write 없음 |
| 2026-07-15 | LV-OCC-004B | DONE | 기존 `휴가 사용 내역` 표의 예정 발생 행에만 `관리` action을 두고 같은 표 아래에서 날짜 수정·취소를 수행하도록 연결. 시작일 이후에는 분 단위 adjustment를 사용하고 모든 write는 `leave_ledger_adjustment` 6자리 MFA를 fail-closed로 요구. Lazyweb report `cc99990c-b337-40ad-92a8-9e22a7beb70b`; targeted 34/34·typecheck·web build 통과; 실제 Forest에서 예정 행 수정 panel·MFA와 44px 행을 확인 |
| 2026-07-15 | LV-OCC-009 | DONE | 기존 `휴가 사용 내역`을 필터·목록/월별/유형별 projection·수동 미래 발생·CSV 업로드·현재 보기 CSV/XLSX 내보내기가 한 표를 공유하는 발생 workspace로 완성. 별도 `휴가 수동 발생` 메뉴를 숨기고 route는 호환용으로 유지. 실제 Forest 1512px·720px에서 문서 overflow 0, 내부 표 scroll, 44px 행, stage 전환 시 stale MFA 0, console 경고·오류 0 확인; 인앱 브라우저가 파일 업로드를 지원하지 않아 CSV 실행은 domain/API 22/22 및 전체 targeted 34/34로 검증 |
| 2026-07-15 | LV-SEC-001 | DONE | self·담당 승인자·HR만 첨부 download authorization을 받고 본문·source ref는 반환하지 않음. 미담당 approver의 기존/없는 첨부와 승인 command가 동일 `HRX_LEAVE_RESOURCE_NOT_FOUND` 404를 반환하고 team deny 응답에 행·건수 없음. 보안/API 묶음 39/39 및 live curl privacy boundary PASS |
| 2026-07-15 | LV-MIG-001 | DONE | migration 020과 deterministic entitlement·request·segment rule snapshot dry-run/execute 구현. tenant·preview hash·owner 승인 불일치 시 write 0, source ref hash만 receipt에 포함, 원본 ref 보존, durable reopen 후 재실행 action 0. dedicated 4/4·migration 묶음 13/13·library driver 통과; production execute 미수행 |
| 2026-07-15 | LV-QA-001 | DONE | 전체 leave domain·migration·authz·API·web 회귀 340/340, 연동·보고 UI 소스 계약 3/3, web typecheck와 Vite production build PASS. 기존 skip 0, 실패 0 |
| 2026-07-15 | LV-QA-002 | DONE | 현재 실행 중인 Forest 탭에서 직원·관리자·HR·권한없음 4종과 1512/1280/1024/900/720px 검수. root overflow·비수용 offscreen control·broken image·empty button·console error 0. 목록/월별/유형별, 수동 발생, CSV 업로드, 예정 발생 관리와 step-up 진입 PASS. desktop status보다 인증된 People 프로필 필드를 우선 병합하여 `user_amic_jwsuh`가 `서지원 · 대표변호사`로 표시됨 |
| 2026-07-15 | LV-MIG-002 | DONE | 직원·그룹별 append-only 원장 전량 재계산과 최신 snapshot+후속 entry를 대사해 reconciled·baseline_missing·unexplained_variance를 분리. 정상 driver unexplained 0, 자동 테스트에서 변조 snapshot 60분과 tenant 격리를 탐지 |
| 2026-07-15 | PY-CALC-001 | DONE | `payroll/money.js`가 BigInt 중간계산으로 integer KRW·basis points·분단위 비율을 처리하고 truncate/floor/ceil/nearest 및 음수 0.5·overflow를 fail-closed. targeted 2/2 PASS |
| 2026-07-15 | PY-CALC-002 | DONE | published version rule의 calendar-day proration과 명시적 monthly divisor로 월급 전액·31일 중 17일·윤년 29일·무급휴가 adjustment를 계산. 합성 법정값 하드코딩 0 |
| 2026-07-15 | PY-CALC-003 | DONE | 시급과 frozen attendance/paid leave 분을 합산하고 정책 반올림을 한 번 적용. 91분 18,200원 golden PASS |
| 2026-07-15 | PY-CALC-004 | DONE | 일급을 표준 근무분으로 정규화해 1.5일·반일 경계를 계산. 720분 180,000원 golden PASS |
| 2026-07-15 | PY-CALC-005 | DONE | freelancer contract/deliverable 수량 지급을 구현하고 withholding category가 없으면 `HRX_PAYROLL_WITHHOLDING_CATEGORY_REQUIRED`로 차단 |
| 2026-07-15 | PY-CALC-006 | DONE | published `payroll_earnings` rule만 허용하는 fixed/base-bps 수당 catalog와 과세·비과세 한도 split 구현. draft rule library driver 차단 확인 |
| 2026-07-15 | PY-CALC-007 | DONE | 입력 snapshot이 보존한 overtime/night/holiday 분에 버전 rule의 additive rate만 적용하고 rule 누락·지원하지 않는 고용형태를 blocker issue로 보존 |
| 2026-07-15 | PY-CALC-008 | DONE | frozen unused balance·퇴사/종료 eligibility·max minutes·rate basis로 미사용 휴가수당을 산출하고 비대상은 행을 만들지 않음 |
| 2026-07-15 | PY-CALC-009 | DONE | tokenized prior-run/adjustment ref와 reason code를 가진 양·음 delta line을 원본 snapshot 변경 없이 정렬·hash. 공유 6인 golden fixture 포함 targeted 10/10, HRX 전체 522/522, library driver gross 126,000원·draft rule 차단 PASS |
| 2026-07-15 | PY-DED-001 | DONE | statutory package schema, source document hash/ref, effective range, dependent table zero-to-infinity coverage와 네 가지 rounding을 검증하고 기존 payroll rule repository의 작성자 분리 review/publish를 재사용. 합성 규칙은 production gate에서 차단 |
| 2026-07-15 | PY-DED-002 | DONE | published income-tax lookup을 taxable gross·부양가족과 연결하고 freelancer withholding category 및 local tax bps를 동일 rule version에서 계산 |
| 2026-07-15 | PY-DED-003 | DONE | 가입 상태와 명시적/기본 contribution base를 버전된 상·하한으로 clamp한 pension employee line 생성 |
| 2026-07-15 | PY-DED-004 | DONE | health contribution과 그 결과를 기준으로 한 long-term-care line을 동일 source hash·rounding rule로 생성 |
| 2026-07-15 | PY-DED-005 | DONE | 명시적 employment-insurance 가입자만 버전 rate로 계산하고 미가입자는 행 자체를 만들지 않음 |
| 2026-07-15 | PY-DED-006 | DONE | tokenized schedule의 fixed/rate/installment와 잔여회차·잔여금액을 계산하고 custom 합계가 net floor를 넘으면 제한 warning을 남김; code 중복 fail-closed |
| 2026-07-15 | PY-DED-007 | DONE | 계산액과 고지액의 match/explained/unexplained 대사를 구현해 reason+approval ref 없는 차이를 blocker로 유지. targeted 8/8, HRX 전체 530/530, library driver gross 2,500,000·deduction 490,000·net 2,010,000·고지 match·production fixture 차단 PASS |
| 2026-07-15 | PY-UI-001~006 | DONE | 현재 실행 중인 Forest 앱 기준 급여 workspace·기간 액션·44px 직원 표·상세 drawer·승인/마감·5 viewport 반응형 완료. Lazyweb report `06093de4-07f9-42f3-b78c-21bd85ef0142`; browser 6 roles × 5 viewports, overflow·broken image·unlabeled control·unexpected error 0, drawer focus/ESC/return PASS |
| 2026-07-15 | PY-DOC-001~005 | DONE | 버전 template, 암호화 PDF, CSV/XLSX, receipt-gated 전달, self-scope 명세서 완료. domain 3/3, web 1/1, 실제 패키지 10건 delivered·본인 1건 PASS |
| 2026-07-15 | PY-BANK-001~003 | DONE | tokenized 계좌와 deterministic batch, 별도 지급승인자·step-up·checksum, provider receipt 대사 완료. domain 3/3, 실제 패키지 `reconciled` PASS; 합성 adapter만 사용 |
| 2026-07-15 | PY-TAX-001~007 | DONE | 퇴직·DC/IRP·중도퇴사·원천/지급명세·사회보험·연말정산·신고 상태/재처리 완료. filing 3/3·year-end 2/2, 실제 패키지 합성 신고 4종 accepted·self review 차단 PASS; 공식 schema/전문가 승인 없이는 production fail-closed |
| 2026-07-15 | PY-MIG-001 | DONE | repo-safe dry-run, 정확 owner manifest, leave 잔액 대사, rerun 0, backup rollback과 오류 차단 3/3 PASS. 실제 private source execute는 미수행하고 GATE-002에 유지 |
| 2026-07-15 | PY-QA-001~003 | DONE | domain 54/54, API+role matrix 7/7, web 3/3, desktop 26/26, UI regression 31/31, typecheck·build PASS. macOS bundle E2E·재시작 PASS; Windows renderer hash parity·PE·ZIP PASS, Windows native smoke는 Darwin에서 미수행 |
| 2026-07-15 | GATE-001 | DONE | readiness contract 2/2로 calculation/runtime/package 증거와 production/go-live를 분리. 최신 package renderer hash `ffd5dacef10d95ba000cf1b9c6937de6028a881eded91f79c642153757c27df4`가 macOS·Windows 동일 |
| 2026-07-15 | GATE-002 | BLOCKED | 실제 정책·법무·노무·세무 승인, 실제 직원/계좌 migration owner manifest, provider/bank sandbox·production receipt, Developer ID/공증, Windows Authenticode와 공개 릴리즈/go-live가 없음 |

## 10. 중단 조건

다음은 추정으로 진행하지 않고 해당 TUW를 `BLOCKED`로 남긴다.

- 실제 취업규칙·급여규정 값이 합성 기본값과 다르며 owner 결정을 찾을 수 없는 경우
- 실제 직원·계좌·세금 자료에 대한 승인 manifest가 없는 경우
- 이메일·메시지·캘린더·은행·세무 공급자 자격증명이나 sandbox가 없는 경우
- 세법·보험·퇴직 계산의 공식 표 버전 또는 전문가 검토가 없는 경우
- 현재 dirty worktree의 사용자 변경과 같은 줄을 수정해야 하고 안전하게 분리할 수 없는 경우
