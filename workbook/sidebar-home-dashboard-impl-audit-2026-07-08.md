# 사이드바 IA·Home 대시보드 구현 검수 보고서 (2026-07-08)

- 대상: 커밋 `5cdbd4485`(구현) + `9a6091dec`(Stage 7 마감), 기준 스펙 [sidebar-home-dashboard-execution-plan-2026-07-07.md](sidebar-home-dashboard-execution-plan-2026-07-07.md)
- 방법: 6개 스펙 영역 병렬 코드 대조(검수 에이전트 6 + 종합 1, 판정 86건) + 게이트 직접 재실행. Codex의 Stage 문서 주장은 근거로 사용하지 않고 코드를 근거로 판정.

## 검증 출처

| 항목 | 출처 |
|---|---|
| `node --test apps/web/test/ui-regression.test.mjs` → exit 0 | [직접 재실행] |
| `node --test apps/api/test/home-dashboard-api.test.js` → exit 0 | [직접 재실행] |
| `npm test` → exit 0 (4157/4157 pass) | [직접 재실행] |
| `npm run build` → exit 0 | [직접 재실행] |
| 뉴스 커넥터 4소스 RSS·모드 복귀 앵커·`/home/*` 서버 연결 | [직접 확인] (grep/열람) |
| 아래 영역별 판정 86건 (파일:라인 evidence) | [에이전트 보고·미재검증] |
| 데스크톱 스모크 (Stage 7 receipts) | [Codex 보고·미재검증] |

주의: 테스트는 커밋이 아닌 현재 작업 트리(무관 수정 파일 포함) 기준으로 실행됨.

---

# 사이드바 IA·Home 대시보드 구현 검수 종합 보고

## 1. 영역별 판정 요약

| 영역 | pass | partial | missing | violation | 핵심 이슈 |
|---|---|---|---|---|---|
| nav-invariants | 5 | 3 | 0 | 0 | 알림 dot 미구현·위젯 '전체 보기' 부재·profile 사이드바 교체 예외 잔존 |
| route-remap | 7 | 5 | 0 | 0 | redirect 레이어는 완전하나 구 화면 맥락(탭·필터·전용 페이지) 복원이 전무 |
| sidebar-badges | 5 | 4 | 3 | 0 | 회사 현황 권한 게이트(O-03) 부재, 메시지 소스가 하드코딩 빈 배열, i18n 미정비 |
| dashboard-widgets | 8 | 11 | 7 | 0 | 그리드·배치 골격은 스펙대로나 위젯 내부 규칙 다수 공백, 실행 취소 실질 무효 |
| data-contracts | 12 | 2 | 1 | 0 | 계약·뉴스 커넥터는 충실, 실소스 집계 wiring 전무(프로덕션 빈 데이터) |
| gates-stages | 7 | 5 | 1 | 0 | 게이트 산출물 실재·테스트 그린이나 정적 정규식 검증 위주, '오너 확인' 미기록 |
| **합계** | **44** | **30** | **12** | **0** | — |

## 2. 불일치 전체 목록 (심각도순)

중복 보고된 동일 이슈는 spec_id를 병기해 1행으로 묶음. violation은 0건.

### 상 — 기능이 실질 미동작이거나 권한·거버넌스 공백

| # | spec_id (영역) | 무엇이 다른가 | evidence | 권고 조치 |
|---|---|---|---|---|
| 1 | §6-aggregation-sources (missing, data-contracts) + W-01/W-02-data (partial, dashboard-widgets) | 승인·태스크·아젠다·공지의 실소스(HRX·matter-approvals·matter-tasks·matter-calendar·people-notices) 집계 wiring이 전무. 프로덕션 기본 런타임은 seed 없는 빈 배열이라 뉴스 외 전 위젯이 항상 0건. assignee=me 필터도 없음 | home-dashboard-runtime-context.js:103-121(seed 전용), server.js:1514(빈 런타임), hrx/matter 연동 grep 0건 | 스펙 §6의 예외 경로("계약 고정 → 빈 상태 릴리스, 오너 보고 후 결정")에 해당 — 오너 보고를 명시적으로 수행하고 wiring 착수/보류를 결정받을 것 |
| 2 | O-03-company-gate (missing, sidebar-badges) + §4.2-R6 게이트 부분 (route-remap) | '회사 현황' 권한 게이트가 사이드바·라우트·콘텐츠 어느 층에도 없어 전 role에 노출. 기본값(관리자만)조차 미적용 | Shell.jsx:524 무조건 포함, Sidebar props에 role 입력 없음, home-company grep 2곳뿐 | 최소 사이드바 노출 필터+라우트 게이트를 기본값(관리자 role)으로 구현 후 오너 확인 |
| 3 | NAV-04-single-source-message (missing) + NAV-04-decrease-message (partial) + §4.1-sidebar-items 메시지 카운트 (partial, sidebar-badges) | 메시지 배지의 데이터 소스가 `Object.freeze([])` 하드코딩 빈 배열 — 배지 항상 0, 드로어 항상 빈 상태, '스레드 열람 시 감소' 트리거 부재(스레드 뷰 자체 미구현), 사이드바 '메시지 (n)' 카운트 미표시 | Shell.jsx:214, App.jsx:21,82,93, Shell.jsx:617-625(home-requests에만 count) | 메시지 실데이터 소스 연동 + 스레드 뷰 구현, 또는 미구현 상태를 오너에게 명시 보고 |
| 4 | §4.2-R3/R4/R5 (partial x3, route-remap) | messages/requests/esign redirect는 되나 redirectedFrom(구 섹션 정보)이 생산만 되고 소비처 0건 — 탭(전송/받은·보낸)·유형 필터 매핑 전부 누락, home-messages/requests/esign 전용 페이지 없이 전 섹션이 동일 대시보드를 렌더 | globalUtilities.js:526-530, HomeSurface.jsx:659(activeSection 분기 없음) | redirectedFrom 소비 로직 + 섹션별 전용 뷰(최소 탭·필터) 구현. 구 URL 사용자의 맥락 소실 해소 |
| 5 | §4.2-R6 하위 탭 (partial, route-remap) | reports→home-company redirect 목적지는 맞으나 home-company 페이지·하위 탭이 없어 대시보드가 그대로 렌더 | home-company grep: Shell.jsx:524, globalUtilities.js:529 2곳뿐 | 회사 현황 전용 화면 구현(#6과 함께) |
| 6 | §5.3-absorption (partial, dashboard-widgets) | 권한·감사 요약(home-audit-panel)이 '회사 현황으로 이동'이 아니라 제거만 되어 제품에서 소실. buildApprovalRows/buildTodoRows 데드 코드 잔존 | 구 audit-panel grep 0건, HomeSurface.jsx:369-393 미사용 | 회사 현황 화면에 권한·감사 요약 복원, 데드 코드 제거 |
| 7 | W-01-undo (partial) + W-02-complete-deeplink undo 부분 (dashboard-widgets) | 실행 취소가 실질 무효: 5초 만료 타이머 없음(setTimeout grep 0건), 서버 undo 엔드포인트가 없어 취소해도 runtime.decisions에 결정이 잔존 → 다음 fetch에서 항목이 다시 사라짐 | HomeSurface.jsx:612-656, home-dashboard-runtime-context.js:226-231,500 | 서버 undo 엔드포인트(5초 창 내 결정 철회) 추가 + 클라이언트 타이머 구현 |
| 8 | W-03-dots (missing, dashboard-widgets) | 달력 셀에 일정 점 표시(일반 녹색/기한 적색)·일요일 적색이 전혀 없어 달력에서 일정 유무 식별 불가 | HomeSurface.jsx:782-799(숫자만 렌더), styles.css:2185-2207(dot 클래스 없음) | 일자별 이벤트 집계 + dot 마크업·색상 규칙 구현 |
| 9 | §7-S7-gate (partial, gates-stages) | Stage 7 게이트 3요소(전체 그린/데스크톱 스모크/오너 확인) 중 '오너 확인'이 어떤 산출물에도 완료 기록 없음(O-02~O-04 기본값 상태). 데스크톱 스모크는 [에이전트 보고·미재검증] | 오너 확인 기록 부재, sidebar-stage7-desktop-smoke JSON은 미재검증 | 오너 확인(O-01~O-04 기본값 재가 포함)을 받고 기록을 남긴 뒤 게이트 종결 |

### 중 — 스펙 명시 기능 누락이나 우회 가능 또는 범위 한정

| # | spec_id (영역) | 무엇이 다른가 | evidence | 권고 조치 |
|---|---|---|---|---|
| 10 | W-01-tabs (missing) | 승인 위젯의 받은/보낸 요청 탭 자체가 없음 — 보낸 요청 진행 상태 조회 불가 | HomeSurface.jsx:694-708, apiClient.js:948(파라미터 없음) | 탭 UI + API 파라미터 추가 |
| 11 | W-01-gating (missing) | 승인 권한 없는 역할에 '보낸 요청'만 노출하는 탭 게이팅 미구현(탭 부재로 불가) | HomeSurface.jsx:694-708 분기 없음 | #10 탭 구현 후 역할 분기 추가 |
| 12 | W-02-order-late (missing) | To Do의 지연(D+n 적색)→오늘(주황)→임박 정렬·강조 전부 없음 — risk_tier 배지로 대체되어 스펙 의미와 다름 | HomeSurface.jsx:305-309,327,593, styles.css:2035-2055 | 마감 기반 정렬·색상·D+n 라벨 구현 |
| 13 | W-04-readpanel (missing) | 피드 항목 읽기 패널(오버레이) 없음 — 목록 항목은 클릭 핸들러 자체가 없어 열람 불가 | HomeSurface.jsx:756-762 | 사내 공지·뉴스레터용 읽기 패널 구현 |
| 14 | NAV-06 + §5.1-anchor (partial x2) | 위젯 카드 우상단 '전체 보기' 앵커가 5개 위젯 전부에 없음 — 전용 뷰 진입 명시 경로가 개별 행 클릭뿐(드로어 '전체 보기'는 구현) | HomeSurface.jsx:395-413, '전체 보기' grep은 Shell.jsx만 | 카드 헤더 우상단에 Home 축 내 라우트 앵커 추가 |
| 15 | NAV-04 + NAV-04-topbar-badges (partial x2) | 알림 배지가 정보성 dot이 아닌 숫자 pill로 렌더 — '행동 필요=숫자/정보성=점' 배지 문법 미적용. 알림 소스도 정적 mock 3건 | Shell.jsx:324, styles.css:920-936, Shell.jsx:179-212 | 알림 배지를 dot으로 변경, 알림 실데이터 소스 연동 |
| 16 | §6-inbox-role (partial, data-contracts) | 계약의 role 파라미터를 서버가 무시 — '내가 결재할 차례'(D-09) 서버 필터 없음. 웹은 role을 보내고 있음 | home-dashboard-runtime-context.js:324-336, apiClient.js:948-960 | 실집계 연동 시점에 결재선/담당자 필터를 계약대로 구현 |
| 17 | §7-S7-i18n + §7-Stage7-i18n-labels (missing x2) | Stage 7.1 i18n(ko/en) 라벨 정비 미이행 — 신규 사이드바·드로어·위젯 라벨 전부 하드코딩 한국어, i18n.js에 키 0건 | i18n.js:1-126, Shell.jsx:520-528 | 신규 라벨 i18n 사전 등재 + en 번역 |
| 18 | §7-S1-gate-invariants + §7-S4-gate (partial x2, gates-stages) | 불변식·카운트 게이트 테스트가 소스 문자열 정규식 정적 검증 — '임의 내비 시퀀스 후' 런타임 검증과 '전용 뷰 건수' 포함 4자 일치 검증이 없음 | ui-regression.test.mjs:87,261-263,315-349 | 렌더 기반 동등성 테스트(런타임 DOM/상태 비교)로 보강 |
| 19 | §7-S1-gate-redirects (partial, gates-stages) | 리다이렉트 테스트가 대표 12케이스 표본 — legacyGlobalRoutes 전수 루프 assert 부재(calendar/finance/policies·people-* 다수 미커버) | ui-regression.test.mjs:157-176 | legacy 라우트 전수 루프 assert 추가 |
| 20 | §8-S3-events (partial, gates-stages) | 이벤트 로깅이 서버측 위젯 view/action까지만 — Time-to-first-action, 내비 미스클릭율, 클라이언트 딥링크 클릭 로깅 부재로 §8 지표 5개 중 2개 측정 불가 | home-dashboard-runtime-context.js:296-313,851-866 | 클라이언트측 이벤트 2종 추가 또는 지표 축소를 오너 합의 |
| 21 | Stage5-utility-drawer (partial, sidebar-badges) | 드로어 구조는 스펙대로나 콘텐츠가 플레이스홀더 — 승인 드로어는 개별 항목 없이 집계 카드 1장, 메시지 드로어는 빈 배열 필터라 항상 빈 상태(triage 불가) | Shell.jsx:214,244-258 | 드로어에 실제 항목 목록 연동(#1·#3과 연계) |
| 22 | NAV-02 (partial, nav-invariants) | profile 뷰가 축 전환도 모드 예외도 아닌 사이드바 전면 교체 경로로 잔존(복귀 앵커 없음) — 기존 코드 유래이나 불변식 기준 미봉합 | Shell.jsx:553-559,748, globalUtilities.js:486 | profile을 모드 예외 목록에 편입(3조건 적용)하거나 스펙에 처리 규정 추가 |
| 23 | W-01-preview-sort (missing) | 승인 위젯 요청일 오래된 순 정렬·미리보기 4건 상한 없음 — 전부 렌더 | HomeSurface.jsx:592, runtime-context.js:324-336 | 정렬+slice(4) 적용 |
| 24 | W-02-summary (partial) | 헤더가 오늘 건수만 표기(서버가 주는 task_late 미사용), 미리보기 5건 상한 없음 | HomeSurface.jsx:709,593 | "지연 n · 오늘 n" 표기 + slice(5) |
| 25 | W-03-monthnav (missing) | 월 전환 ‹ › 버튼 없음 — 인접 월 셀 클릭 부수효과로만 이동 가능 | HomeSurface.jsx:775-816 | 월 전환 버튼 추가 |
| 26 | §5.3-hero (partial) | 히어로에 "오늘 처리할 항목 n건"(액션 인박스 합계) 미표기 — 데이터는 이미 존재 | 해당 문자열 grep 0건, HomeSurface.jsx:660-665 | counts 합계 표기 추가(저비용) |

### 하 — 문구·표시·경계 케이스 수준

| # | spec_id (영역) | 무엇이 다른가 | evidence | 권고 조치 |
|---|---|---|---|---|
| 27 | W-03-agenda-detail (partial) | 기한 라벨이 적색 스타일 없이 텍스트만, '임박 기한 1건'·'캘린더 열기' 미구현, 딥링크가 특정 사건 아닌 섹션 단위 | HomeSurface.jsx:801-815, styles.css:2241-2248 | 기한 적색 클래스·캘린더 열기 버튼 추가 |
| 28 | W-04-tabs (partial) | 탭 라벨 "공지"(스펙 "사내 공지"), "다시 시도"가 텍스트뿐 재시도 동작 없음, 뉴스레터 탭 O-02 Vault 컬렉션 미연결(seed 의존) | HomeSurface.jsx:50-54,345-347 | 라벨 수정·재시도 핸들러·O-02 연결(오너 결정 후) |
| 29 | W-02-complete-deeplink (partial, undo 제외분) | 완료가 체크박스 아닌 텍스트 버튼, 딥링크가 특정 태스크 포커스 없이 matter-tasks 섹션 단위 | HomeSurface.jsx:316-319,712-719 | 체크 UI·태스크 포커스 파라미터 추가 |
| 30 | W-01-empty (partial) | 빈 상태 문구에서 "— 모두 완료했습니다" 누락 | HomeSurface.jsx:706 | 문구 스펙 일치 |
| 31 | W-02-empty (partial) | 온보딩 상태의 "첫 할 일 만들기 →" CTA 분기 없음 | grep 0건 | 온보딩 분기 추가 |
| 32 | §4.2-R9x (partial, route-remap) | 섹션 미지정 유틸리티 진입 시 home#home-dashboard가 아닌 빈 섹션 home으로 착지 — 기본 랜딩 원칙과 비일관 | App.jsx:98 | resolveRoute 폴백을 section:'home-dashboard'로 |
| 33 | Stage4-count-test (partial, data-contracts) | 카운트 일치 테스트가 소스 정규식 검사 — 런타임 동등성 검증 아님(#18과 동일 계열) | ui-regression.test.mjs:315-348 | #18과 함께 렌더 기반 테스트 보강 |

## 3. 종합 판정

계획의 골격 — 축 계약과 내비 불변식(NAV-01·03·05), 리다이렉트 레이어 전체, §6 API 계약(스키마·권한 fail-closed·감사·멱등), 뉴스 커넥터(4소스·캐시·장애 격리·본문 미저장), 승인 카운트 단일 소스·동시 감소, Stage 게이트 산출물과 production_ready 비약화 — 는 코드와 직접 재실행 테스트(웹 21건·API 6건 그린)로 확인되는 수준에서 충실히 구현됐다. 그러나 86개 판정 중 partial 30건·missing 12건이 남았고, 그중 실소스 집계 미연결(프로덕션에서 뉴스 외 전 위젯 빈 데이터), O-03 권한 게이트 전무, 메시지 기능 전체가 빈 스텁, redirect 후 전용 뷰·탭 미구현으로 인한 맥락 소실, 실행 취소 실질 무효는 "URL과 껍데기는 옮겨졌으나 그 안의 업무가 아직 돌지 않는" 성격의 공백이다. 특히 Stage 7 게이트의 '오너 확인'이 미기록인 채 커밋되어 있어, 현 상태는 계획이 명시한 게이트 기준으로도 미종결이다.

**권고: 현 상태 그대로의 승인은 부적절하며, 보완 후 승인이 타당하다.** 최소 선행 조건은 (1) O-03 권한 게이트 기본값 구현, (2) 실소스 집계·메시지 스텁·O-02에 대한 오너 보고와 wiring 착수/보류 결정(스펙이 이 예외 경로를 오너 보고 조건부로 허용), (3) O-01~O-04 기본값 재가를 포함한 오너 확인 기록으로 Stage 7 게이트 종결 — 이 3건이며, 나머지 위젯 내부 규칙(탭·정렬·dot·전체 보기·undo 서버 되돌림)은 우선순위를 매겨 후속 스테이지로 배치할 수 있다.