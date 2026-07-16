# 엔터프라이즈 SaaS 사이드바 IA·홈 대시보드 리서치 보고서

- 작성: 2026-07-07, Claude (멀티에이전트 워크플로 `sidebar-dashboard-ux-research`)
- 목적: matter 웹앱의 사이드바 하이재킹 문제(대시보드·메시지·승인 요청 클릭 시 사이드바 전면 교체) 해결과 Home 대시보드(뉴스레터·캘린더·승인 대기·오늘 To Do) 설계의 근거 확보
- 실행 지시서: [sidebar-home-dashboard-execution-plan-2026-07-07.md](sidebar-home-dashboard-execution-plan-2026-07-07.md)
- HTML 목업: `docs/ui-reference/prototypes/home-dashboard-ia-mockup-2026-07-07.html`

## 검증 출처 표기

이 보고서의 리서치 내용은 **[에이전트 보고·미재검증]** 이다. 리서치 에이전트 7개가 웹 조사를 수행하고, 별도 팩트체커 에이전트 7개가 핵심 주장(차원당 최대 8건)을 원문 대조로 판정했다(confirmed/plausible/refuted). 오너/Claude가 원문을 직접 재열람하지는 않았다. 판정 분포는 부록 A에 주장 단위로 남긴다. **refuted 판정 5건은 본문 근거에서 배제**했다: Teams 좌측 앱 바 구조 기술, NN/g "You Are Here" 아티클 귀속, Stephen Few 단일 화면 정의 출처, NN/g 폴드 57% 수치, Dooray 전자결재 추가 보도.

- 방법: 7차원 병렬 리서치 → 차원별 회의적 검증 → 종합·완결성 비평 (에이전트 16개, 도구 호출 302회)
- 조사 대상: 엔터프라이즈 SaaS 10종(Slack, Teams, Notion, Linear, Salesforce, HubSpot, Monday, ClickUp, Asana, Jira) + 디자인 시스템·NN/g 규범 + 크로스컷 허브 7종 + 리걸테크 7종(Clio, MyCase, PracticePanther, Smokeball, Filevine, Actionstep, Lawcus) + 한국 그룹웨어 7종(Dooray, 하이웍스, WEHAGO, 다우오피스, 카카오워크, 네이버웍스, flex/Shiftee) + 엔터프라이즈 포털 5종(Workday, Viva Connections, ServiceNow, SAP Fiori, Atlassian Home) + 대시보드 설계 원칙

---

## 1. 사이드바/내비게이션 구조 패턴 비교 매트릭스

> 근거 표기: confirmed 근거를 우선 인용, plausible/unverified 근거는 `*` 표시.

| 패턴 | 채택 제품 | 장점 | 단점 | matter 적합도 |
|---|---|---|---|---|
| **A. 고정 상단 축 + 컨텍스트 사이드바 (2층 셸)** — 상단 바가 전역 좌표(제품 축·검색·알림·계정)를 어떤 화면에서도 유지, 사이드바는 현재 축의 로컬 내비만 담음 | Salesforce Lightning\*, IBM Carbon UI Shell\*, SAP Fiori 쉘 바\*, Clio Manage(고정 사이드바+상단 유틸리티, confirmed) | 컨텍스트가 깊어져도 전역 좌표 상실이 구조적으로 불가능; NN/g 글로벌/로컬 이원 모델과 정확히 정합(confirmed); matter 현행 헤더 구조를 그대로 살림 | 상단 바가 수직 공간 상시 점유; 가로 폭이 축 개수를 제한(HubSpot·Atlassian이 top→left로 이전한 사유, confirmed); 글로벌/로컬 시각 위계 설계 필요 | **매우 높음** — 현행 구조의 최소 수정 경로. 문제는 패턴이 아니라 '유틸리티 뷰가 계약을 깨는 것'뿐 |
| **B. 고정 아이콘 레일 + 가변 L2 패널 (2단)** — 절대 불변의 얇은 L1 레일 + L1 선택에 따라 통째로 교체되는 L2 패널 | Slack 2023 재설계(탭 레일+2차 사이드바, confirmed), ClickUp Spaces 패널\* | L2를 모듈 전용으로 완전 재구성 가능(모듈별 IA 자유도 최고); 알림·메시지를 L1 탭으로 승격하기 쉬움(Slack Activity, confirmed); 업계 수렴 방향(Atlassian·HubSpot의 좌측 이전, confirmed) | 가로 2열 소비로 콘텐츠 영역 축소; L1 항목 증가 시 More 뒤로 강등 관리 필요(Slack, confirmed); 전면 개편 비용 | **중간~높음** — 장기 진화 방향으로 유력하나 단기 마이그레이션 비용 큼 |
| **C. 단일 영속 사이드바 + 제자리 확장** — 사이드바 하나가 결코 교체되지 않고, 컨텍스트는 트리 확장 + 콘텐츠 영역 탭으로 표현 | Jira 신규 내비(스페이스 진입 시 사이드바 내 확장+콘텐츠 탭, confirmed), Notion\*, Linear\*, Asana\*, MyCase·Smokeball(리걸테크 평면 사이드바, confirmed) | 좌표가 항상 동일해 학습 비용 최소; Starred/Recent 개인화와 자연 결합(Jira, confirmed); 리걸테크 업계 표준(Clio·MyCase·Smokeball 모두 이 구조, confirmed) | 다축 스위트(ERP+CRM+HR급)의 깊은 계층을 한 트리에 수용하기 어려움; 항목 비대화 시 별도 패널 분리 필요(ClickUp 사례\*) | **중간** — 단일 실무관리 제품엔 최적이나, matter의 6축 스위트 구조와는 긴장 관계 |
| **D. 사이드바 전환형(drill-in / nested views)** — 특정 컨텍스트 진입 시 사이드바 내용이 하위 메뉴로 교체 | Atlassian side nav nested views\*, Salesforce Setup·Jira 설정(모드 전환 예외, confirmed 계열) | 방대한 자체 IA(설정·사건 워크스페이스)를 좁은 폭에 수용 | **성립 조건이 엄격**: (1) 상단 글로벌 바 고정 (2) 사이드바 최상단 '← 뒤로' 앵커+컨텍스트 제목 (3) '더 깊은 계층 진입'일 때만 허용. 조건 없이 쓰면 즉시 좌표 상실 — matter의 현재 증상이 정확히 이 남용 사례 | **조건부 낮음** — Settings/Admin과 사건(matter) 워크스페이스 진입에만 제한적 허용 |
| **E. Hub-and-spoke (허브 대시보드 왕복)** | 모바일 OS 홈, SAP Fiori Launchpad\*(하이브리드) | 홈이 자연스러운 작업 시작점; 신규 사용자에게 단순 | 이동마다 허브 왕복 비용; 멀티태스킹 워크플로와 충돌(NN/g\*) | **낮음(단독)** — 단, '허브 위젯 + 상설 글로벌 내비' 하이브리드는 Home 대시보드 설계의 표준 |

**교차 검증된 핵심 사실**: 조사한 20여 개 제품 **어디에서도 '글로벌 유틸리티 뷰(메시지·승인·리포트)가 사이드바 전체를 자기 하위 메뉴로 교체'하는 패턴은 관찰되지 않았다.** 사이드바 전면 교체가 관행적으로 허용되는 유일한 영역은 Settings/Admin 모드 전환이며, 그때도 상단 바와 복귀 앵커가 유지된다 (Slack·Jira·Clio·MyCase·Smokeball 등 confirmed 다수).

---

## 2. matter 앱 IA 권고안 3개

### 안 1 — "축 계약 고정 + 유틸리티 승격" (★ 최우선 권고 → **2026-07-07 오너 채택**)

**구조**: 현행 상단 제품 축(Home / Client / Matter / People / Vault / Portal)을 유일한 L1 글로벌 좌표로 확정하고, 다음 **내비게이션 불변식**을 명문화한다:

> "좌측 사이드바 = 현재 선택된 축의 로컬 내비게이션. 어떤 클릭도 상단 축의 선택 하이라이트를 잃게 하지 않으며, 사이드바 교체 트리거는 축 전환뿐이다."

- **대시보드**: Home 축 사이드바의 첫 항목이자 로그인 기본 랜딩. 클릭 시 해당 항목이 선택 상태가 되고 **콘텐츠 영역만 전환** (Clio Personal Dashboard가 로그인 첫 화면\*, Smokeball Global Dashboard = 사이드바 첫 항목+기본 랜딩, confirmed).
- **메시지·승인 요청**: 2계층 배치 —
  - (a) Home 축 사이드바의 형제 항목으로 유지, 클릭 시 콘텐츠만 교체. 내부 분류(승인 유형 필터 등)는 사이드바 2단 확장 또는 페이지 내 탭으로 처리 (Fluent 2 Nav 1단 중첩 원칙\*, 하이웍스 행위별 문서함\*).
  - (b) 상단 헤더 우측에 배지 카운트가 붙는 유틸리티 아이콘 추가, 클릭 시 **사이드바를 건드리지 않는 오버레이 드로어**로 트리아지, '전체 보기'는 Home 축 해당 뷰로 딥링크 (Atlassian 알림 벨+드로어 confirmed, NN/g 유틸리티 내비게이션 우상단 관례 confirmed, Workday 우상단 My Tasks 아이콘\*).
- **보고서(reports)**: 경영 지표는 개인 홈과 분리해 Home 축 사이드바의 권한 기반 항목('회사 현황')으로 배치 (Clio Firm Dashboard의 권한 분리\*, Few 유형론상 운영형/분석형 분리\*).

**마이그레이션 난이도**: 낮음~중간 — (1) reports/messages/requests 라우트를 Home 축 내부 라우트로 재매핑, (2) 사이드바 교체 로직 제거, (3) 헤더 유틸리티 아이콘+드로어 신규 구현.

**트레이드오프**: 상단 가로 축은 축 개수가 늘면 물리적 한계에 부딪힌다(HubSpot·Atlassian의 이전 사유, confirmed). 축 전환 로직을 레이아웃 컴포넌트와 분리 설계해 두면 향후 안 2로의 진화가 열린다.

### 안 2 — "좌측 아이콘 레일 + 컨텍스트 패널 2단" (장기 진화안 → **진화 경로 예약**)

상단 축을 좌측 고정 아이콘+라벨 레일(L1)로 이전하고, 그 옆 L2 패널이 축별 컨텍스트 메뉴를 담는다 (Slack 탭 레일+2차 사이드바, confirmed). 상단 바는 검색·생성·알림 전용으로 단순화 (Atlassian 신규 내비의 역할 분리, confirmed). 메시지·승인은 L1 레일의 전용 탭으로 승격(Slack Activity 위치 규약, confirmed). 마이그레이션 난이도 높음(전 화면 개편+재학습). 업계 멘탈 모델이 좌측으로 수렴 중이고(Atlassian·HubSpot 공식 이전, confirmed) NN/g도 성장하는 B2B IA에 수직 내비를 권고(confirmed). 문서 중심 로펌 업무에서는 L2 접기 기능이 필수.

### 안 3 — "단일 영속 평면 사이드바" (리걸테크 정통파 → **비채택**)

축 개념을 해체하고 Clio·MyCase·Smokeball처럼 단일 평면 사이드바로 통합. 단일 실무관리 제품으로서의 단순성은 최고이나, People(HR)·Vault·Portal 같은 이질적 도메인을 평면 목록 10~12개 슬롯에 수용하기 어렵고 matter의 6축 스위트 전략과 정면 충돌.

**종합 권고: 안 1을 즉시 실행하고, 축 전환 로직을 레이아웃과 분리해 안 2로의 진화 경로를 예약하라.** (오너 결정 2026-07-07: 채택)

---

## 3. Home 대시보드 블루프린트

### 3.1 성격 규정
Home 대시보드는 **운영형(operational) triage 화면**이다: 최소한의 상호작용과 인지 처리로 '오늘 무엇을 해야 하는가'에 답해야 한다 (NN/g 운영형 대시보드 정의, confirmed). 홈은 판단(triage)과 각 축으로의 라우팅 허브이고, 처리는 전용 뷰에서 한다 (SAP Fiori Overview Page 공식 모델, confirmed; Workday 홈=미리보기 3건 / My Tasks=처리 공간, confirmed+\*).

### 3.2 레이아웃: 2존 그리드
본문 넓은 컬럼(작업 콘텐츠) + 우측 좁은 레일(보조·정적 콘텐츠)의 2존 구조 (Workday 홈: 본문 Awaiting Your Action → 우측 레일 Quick Tasks·Announcements, confirmed). 균일한 12컬럼 그리드 고정 슬롯으로 배치하고, 모든 카드의 내부 앵커를 통일한다: 제목·건수 배지=좌상단, '전체 보기'=우상단, 항목 리스트=본문, 인라인 액션=행 우측 (Pencil & Paper 카드 앵커 일관성\*, NN/g 카드 스캔성 경고\*).

### 3.3 위젯 우선순위·배열 (필수 4종 + α)

| 순위 | 위젯 | 위치 | 스펙 | 근거 |
|---|---|---|---|---|
| **1** | **승인 대기** | 본문 좌상단 (첫 시선 위치) | 건수 배지 + 상위 3~5건 + 행별 인라인 승인/반려(저위험 유형부터) + '전체 보기→Home>승인 요청 뷰'. '내가 승인할 차례'와 '내가 올린 요청 진행 상태' 탭 분리 | 네이버웍스 홈 위젯 사용률 1위 78.8%가 결재 문서(confirmed). Workday 'Awaiting Your Action'이 헤더 바로 아래 본문 1열(confirmed). Tableau: 가장 중요한 뷰는 좌상단(confirmed). 역할 분리는 Shiftee 대기중/내 요청/완료\* |
| **2** | **오늘 To Do** (미완료 업무 태스크) | 본문 승인 대기 오른쪽 | 오늘 마감·연체 태스크 카운트 + 상위 5건 + 완료 체크 인라인 액션 + '전체 보기→Matter 축 내 업무 필터 뷰'. 오늘 일정과 묶은 '오늘의 아젠다' 다이제스트형 권장 | Clio Agenda·Smokeball Daily Digest(오늘 일정+태스크+전화메모 단일 위젯, confirmed)·PracticePanther Your Agenda(confirmed)가 공유하는 리걸테크 검증 패턴. SAP My Home To-Dos 첫 섹션(confirmed) |
| **3** | **캘린더** | 본문 둘째 행 | 오늘/이번 주 일정 리스트 또는 미니 달력(일정 있는 날 표시, 클릭 시 해당 날짜 캘린더 뷰로 이동). 로펌에서는 재판기일·제출기한이 곧 액션이므로 액션 존에 포함 | Actionstep Home 미니 캘린더\*, MyCase Home Events 위젯(confirmed), Viva Events 카드(confirmed) |
| **4** | **뉴스레터/공지** | **우측 레일** (또는 본문 하단) | 카드 1슬롯 제한: 최신 1건 강조 + 카루셀/더보기. 발행 시 대상 타게팅·게시 기간 지정. 클릭 시 사이드바 유지한 채 읽기 패널로 | Workday Announcements가 우측 레일 카루셀(confirmed), Viva News 카드의 boost 기간+audience targeting(confirmed) — 공지는 액션 위젯을 밀어내지 않는 보조 슬롯이 5개 제품 공통 문법 |

### 3.4 보조 규칙
- **위젯 게이트**: "이 숫자가 움직이면 사용자가 오늘 무엇을 하는가?"에 답하지 못하는 지표(누적 사건 수 등)는 홈에 올리지 않고 보고서로 보낸다 (Eric Ries actionable metrics\*, F-패턴 방치 시 우측·하단 콘텐츠 스킵, NN/g confirmed).
- **위젯 총량**: 초기 6~8개 상한 (Viva 카드 ~20개 이하 권고 confirmed + Tableau 2~3뷰 권고 confirmed의 절충).
- **빈 상태**: 위젯별로 (1) 상태 명시 (2) 학습 단서 (3) 직행 CTA를 설계하고, '0건=정상'("처리할 승인이 없습니다")과 '미설정=시작 필요'("태스크 만들기") 문구를 구분 (NN/g 빈 상태 3원칙, confirmed).
- **개인화는 2단계만**: 1단계 역할 기반 기본 세트(변호사/스태프/승인권자별 — 승인 대기 위젯은 승인 권한자에게만), 2단계 재배열·숨김·라이브러리 내 추가. 자유 배치 캔버스는 만들지 않는다 (Viva primary audience 기본 세트+개인 재배열, confirmed; 다우오피스 전사/개인 영역 이원화 confirmed).
- **데이터 정합성**: 승인 대기·오늘 To Do 위젯은 단일 액션 인박스 데이터 소스의 필터된 미리보기(type=approval / type=task&due=today)로 구현해 위젯·전용 뷰 간 카운트 불일치를 원천 차단 (Workday My Tasks 통합 인박스\*, ServiceNow My Active Items confirmed).
- **시각 표현**: 큰 숫자(count)+텍스트 리스트 중심, 게이지·파이·도넛·3D 금지 (NN/g preattentive 원칙 계열\*).
- **딥링크 규약**: 위젯의 '전체 보기'는 Home 축 내 라우트(사이드바 보존), 개별 항목 클릭은 해당 제품 축으로 딥링크하며 이동 시 헤더 축 활성 상태가 목적지 축으로 갱신 — 위젯은 내비게이션의 대체재가 아니라 지름길 (Fiori OVP 카드=상세 앱 진입점, confirmed).

---

## 4. 안티패턴 목록 (피해야 할 설계 실수)

1. **사이드바 하이재킹**: 계층 관계가 아닌 이동(유틸리티 진입)에 사이드바 전면 교체를 사용하는 것. 조사한 전 제품군에서 관찰되지 않은 동작이며 matter의 현재 증상 그 자체. drill-in은 '글로벌 바 고정 + 뒤로 앵커 + 더 깊은 계층 진입'의 3조건 하에서만 허용 (Slack·Jira·Clio·MyCase confirmed).
2. **로컬 내비게이션이 글로벌보다 시각적으로 우세해지는 것** (NN/g Local Navigation, confirmed).
3. **글로벌 내비게이션 숨김/제거** (NN/g Killing Global Navigation, confirmed).
4. **같은 메뉴의 수직·수평 중복 배치, 아이콘 단독 라벨** (NN/g 좌측 수직 내비 지침, confirmed).
5. **모드 전환 예외의 남용**: 사이드바 전면 교체는 Settings/Admin에만 허용, 그때도 상단 바 유지 + '← 업무로 돌아가기' 앵커 필수.
6. **일관성 없는 클릭 문법**: 같은 사이드바 클릭이 어떤 때는 콘텐츠 전환, 어떤 때는 사이드바 교체를 일으키는 것 — '1클릭=콘텐츠 전환, 셰브론=제자리 확장' 문법 표준화 (NN/g 휴리스틱 #4, confirmed).
7. **Vanity Metrics Wall**: 운영형 홈 자리에 누적 건수 등 '기분 좋은 숫자' 타일 나열. 분석·경영 지표는 권한 기반 보고서 영역으로 분리.
8. **빈 상태 방치**: 0건 위젯을 공백으로 두면 '로딩 중인가? 오류인가?'라는 시스템 신뢰 문제를 만든다 (NN/g Empty States, confirmed).
9. **불규칙(masonry) 카드 배열과 카드 내부 앵커 불일치** — 균일 그리드+고정 앵커가 전제 (NN/g Cards\*).
10. **개인화 기능을 믿고 기본 배치를 부실하게 만드는 것**: 대다수 사용자는 기본 구성을 그대로 쓴다 (Viva 관리자 큐레이션 우선 모델 confirmed, NN/g 인트라넷 개인화 연구\*).
11. **배지 인플레이션과 불명확한 감소 규칙**: 행동 필요=숫자 카운트, 정보성=점(dot)의 이원 규약을 사전에 확정하고 '무엇을 하면 배지가 줄어드는가'를 명세 (Teams 카운트 배지 confirmed, Asana 점 배지 confirmed).
12. **승인 요청의 도메인별 분산**: 승인자 기준 단일 인박스로 통합하고 유형 필터+원 도메인 딥링크+완료 이력 보존. 대량 승인자에게는 위젯만으로 부족 — 상태별 목록·일괄 승인·연속 처리가 별도 필요 (ServiceNow Approvals Hub\*, Workday Bulk Approve\*, 하이웍스 상태별 일괄 결재\*).
13. **순수 hub-and-spoke**: 위젯은 지름길, 좌표계는 상설 글로벌 내비가 담당 (NN/g\*).

---

## 5. 리서치 한계 (완결성 비평 요약)

후속 트랙으로 넘길 공백 — 실행 지시서 §9에 반영:

- **미조사 관점**: 모바일/반응형 축소 규칙, 역할 기반 IA 분기 상세, 검색·커맨드 팔레트(Cmd+K), 대량 객체 스케일(최근 항목·핀), 멀티 컨텍스트 스위처, 접근성·키보드 내비, 한국 리걸테크 IA(공백), 내비 개편 실패·롤백 사례(확증편향 위험), 개편 성과 측정 방법론.
- **검증 주의 영역**: 차원마다 패턴 5건 균일(할당량 과잉 일반화 신호), 제품 구조 조사의 시점·출처 유형(마케팅 자료 vs 직접 사용), NN/g 인트라넷 연구의 연식, 위젯 개수·above-the-fold 원칙의 실증성(통념 가능성), 디자인 시스템 규범 vs 실제 제품 구조 상충 시 조정 규칙 부재, 표본 선정의 대형 US 제품 편향.
- **결정에 추가로 필요한 정보**: AMIC 구성원 역할별 최빈 과업 데이터(내부 리서치 0), 현행 IA 인벤토리 gap 매핑, 패턴 선택 임계값, 구현 스펙 수치(폭·브레이크포인트·상태 유지), 역할별 기본 홈 구성 거버넌스, 마이그레이션 비용·전환기 완화책, 출시 후 판정 기준.

---

## 부록 A. 주장·출처·판정 목록

각 차원의 판정 분포와 개별 주장(90자 절단)·출처 URL·판정. 전체 원문은 워크플로 저널(`journal.jsonl`)에 보존.

### 2단 내비게이션(글로벌 레일 + 컨텍스트 사이드바) 패턴 — 엔터프라이즈 SaaS 10종 실구조 조사
- 판정 분포: confirmed 6 / plausible 1 / refuted 1 / unverified 7
- [confirmed] Slack 데스크톱은 2023 재설계에서 절대 변하지 않는 최좌측 탭 레일(Home·DMs·Activity·Later·More·Create)을 도입 — https://uit.stanford.edu/service/slack/redesign2023/sidebar
- [confirmed] Slack은 탭 레일 자체를 사용자가 커스터마이즈(표시/숨김)하게 하고, 저빈도 기능(Later·Tools)은 More 탭 뒤로 밀어 L1의 항목 수를 통제 — https://slack.com/help/articles/16764236868755-An-overview-of-Slacks-new-design
- [refuted] Teams 좌측 수직 앱 바 구조 기술(인용 소스가 주장을 직접 뒷받침하지 않음) — https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/design/tabs
- [confirmed] Atlassian은 2024–25 신규 내비게이션에서 제품 내비게이션을 상단 바에서 좌측 사이드바로 이전 — https://www.atlassian.com/blog/design/designing-atlassians-new-navigation
- [confirmed] Jira 신규 내비게이션에서 프로젝트(스페이스) 진입 시 사이드바는 교체되지 않고 글로벌 앵커 유지+제자리 확장 — https://support.atlassian.com/jira-software-cloud/docs/what-is-the-new-navigation-in-jira/
- [plausible] Salesforce Lightning은 상단 가로 내비게이션 바를 유지하는 대표 사례 — https://help.salesforce.com/s/articleView?id=sf.customize_lex_nav_menus_create.htm&language=en_US&type=5
- [confirmed] Salesforce는 깊은 작업 컨텍스트를 사이드바 교체가 아니라 콘솔 앱의 워크스페이스 탭/서브탭으로 해결 — https://help.salesforce.com/s/articleView?id=service.console_lex_intro.htm&language=en_US&type=5
- [confirmed] HubSpot은 2024-05-14 상단 가로 내비게이션을 좌측 수직 내비게이션으로 전면 교체(12개 이상의 사용성 연구 기반) — https://product.hubspot.com/blog/new-hubspot-nav
- [unverified] Notion 단일 영속 사이드바 모델 — https://www.notion.com/help/navigate-with-the-sidebar
- [unverified] Linear 사이드바 상단 개인 앵커(Inbox·My Issues) 고정 — https://linear.app/changelog/2024-12-18-personalized-sidebar
- [unverified] ClickUp 메인 사이드바와 Spaces 계층 패널 분리 — https://help.clickup.com/hc/en-us/articles/32490148963479-What-is-the-Spaces-Sidebar
- [unverified] Asana 사이드바 'My Views' 고정 블록 구조 — https://help.asana.com/s/article/how-to-navigate-through-the-sidebar-in-asana?language=en_US
- [unverified] monday.com 좌측 패널 개인 앵커+워크스페이스 스위처 구조 — https://support.monday.com/hc/en-us/articles/35276662798098-Navigating-monday-s-AI-work-platform
- [unverified] NN/g 로컬 내비게이션 연구: orientation+wayfinding — https://www.nngroup.com/articles/local-navigation/
- [unverified] NN/g 좌측 수직 내비 연구: 시선 80% 좌반부 — https://www.nngroup.com/articles/vertical-nav/

### 내비게이션 일관성에 대한 UX 연구·디자인 시스템 가이드라인
- 판정 분포: confirmed 7 / plausible 0 / refuted 1 / unverified 7
- [confirmed] NN/g 규범: 글로벌 내비게이션은 사이트 어디서나 동일하게 유지, 로컬 내비게이션만 현재 위치에 따라 달라진다 — https://www.nngroup.com/articles/local-navigation/
- [confirmed] NN/g 규범: 글로벌 내비게이션을 숨기거나 제거하면 방향감을 잃는다 — https://www.nngroup.com/articles/killing-global-navigation-one-trend-avoid/
- [confirmed] NN/g 복잡한 애플리케이션 8대 가이드라인: '여러 도구·워크스페이스 간 전환을 조율하라' — https://www.nngroup.com/articles/complex-application-design/
- [confirmed] NN/g 휴리스틱 #4(일관성과 표준) + Jakob's Law — https://www.nngroup.com/articles/consistency-and-standards/
- [confirmed] NN/g 규범: 유틸리티 내비게이션은 우상단 등 관례적 위치에 분리 배치 — https://www.nngroup.com/articles/utility-navigation/
- [refuted] NN/g "You Are Here" 아티클 귀속(해당 아티클 존재/내용 불일치) — https://www.nngroup.com/articles/navigation-you-are-here/
- [confirmed] NN/g 규범: 좌측 수직 내비는 넓고 성장하는 IA(B2B·엔터프라이즈)에 적합, 수직·수평 중복 금지 — https://www.nngroup.com/articles/vertical-nav/
- [unverified] Atlassian '제품 내비=사이드바, 톱바=전역 공통 액션' 역할 분리 — https://www.atlassian.com/blog/design/designing-atlassians-new-navigation
- [unverified] Atlassian Design System navigation system 슬롯 구조 — https://atlassian.design/components/navigation-system/
- [unverified] Material 3: rail에는 3~7개 주요 목적지만 — https://m3.material.io/components/navigation-rail/guidelines
- [unverified] Fluent 2: 좌측 Nav는 1단계 중첩(최대 2계층)만 — https://fluent2.microsoft.design/components/web/react/core/nav/usage
- [unverified] Carbon UI shell: 헤더=글로벌, 좌측 패널=2차(로컬) — https://carbondesignsystem.com/components/UI-shell-left-panel/usage/
- [unverified] SAP Fiori 쉘 바 = 전역 앵커, 사이드 내비 최대 3단계 — https://www.sap.com/design-system/fiori-design-web/v1-136/ui-elements/side-navigation/usage
- [unverified] NN/g hub-and-spoke 이동 비용 — https://www.nngroup.com/articles/mobile-navigation-patterns/

### 크로스컷 허브(메시지·승인·알림·내 작업)의 배치 패턴
- 판정 분포: confirmed 8 / plausible 0 / refuted 0 / unverified 5
- [confirmed] Atlassian 2025 신규 내비: 개인 허브('For you') 사이드바 최상단 + 전역 유틸리티는 상단바 우측 — https://support.atlassian.com/platform-experiences/docs/what-is-the-new-navigation-in-atlassian-home/
- [confirmed] Jira 'For you' = 최근 작업·할당 작업·별표 집계 개인 허브 — https://support.atlassian.com/jira-software-cloud/docs/navigate-to-your-work/
- [confirmed] Atlassian 알림 = 상단바 벨 아이콘 → 드로어(컨텍스트 유지) — https://support.atlassian.com/confluence-cloud/docs/view-your-notifications/
- [confirmed] Asana Inbox = 사이드바 최상위 고정 + 주황 점(dot) — https://help.asana.com/s/article/inbox?language=en_US
- [confirmed] monday.com 'My Work' = 좌측 패널 전용 아이콘, 나에게 할당된 항목 날짜 기준 집계 — https://support.monday.com/hc/en-us/articles/360019300579-My-Work
- [confirmed] Teams 'Activity' = 좌측 레일 첫 항목 + 빨간 원형 배지 — https://support.microsoft.com/en-gb/office/filter-your-activity-feed-02b9ece4-6086-4daa-b4c0-627beeacbf08
- [confirmed] Slack 2026-01 Activity 뷰 = 알림 확인+메시지 관리+즉시 액션 단일 장소 — https://slack.com/help/articles/46751260742035-Introducing-the-new-Activity-view-in-Slack
- [confirmed] Slack 데스크톱 탭 통합(Home/DMs/Activity/Files + More) — https://slack.com/help/articles/44134792609555-A-consolidated-set-of-tabs-for-Slack-on-desktop
- [unverified] Workday 승인 인박스 이중 배치(홈 카드 + 우상단 My Tasks) — https://www.dallascollege.edu/resources/online-services/tutorials/workday/workday-action-items/
- [unverified] Workday 'My Tasks' 통합 인박스 + Bulk Approve — https://commitconsulting.com/blog/workday-my-tasks-inbox
- [unverified] ServiceNow Approvals Hub: 외부 시스템 승인까지 My Tasks에 통합 — https://www.servicenow.com/community/employee-center-articles/approvals-hub/ta-p/2642822
- [unverified] SAP Fiori 런치패드 벨 아이콘 → 알림 패널 → My Inbox 딥링크 — https://experience.sap.com/fiori-design-web/v1-60/launchpad/
- [unverified] NN/g 인디케이터: 수동적 알림(badge)과 행동 필요 알림 구분 — https://www.nngroup.com/articles/indicators-validations-notifications/

### 리걸테크(로펌 실무관리) SaaS의 IA와 대시보드
- 판정 분포: confirmed 6 / plausible 2 / refuted 0 / unverified 4
- [confirmed] Clio Manage 좌측 메인 메뉴 = 단일 평면 목록, 모든 페이지 유지 — https://help.clio.com/hc/en-us/articles/9290390462875-Navigate-Clio-Manage
- [plausible] Clio 로그인 첫 화면 = Personal Dashboard (Agenda·Billable Hours Target 등) — https://support.clio.com/hc/en-us/articles/204410037-Personal-Matter-Dashboards
- [plausible] Clio 개인 대시보드/Firm Dashboard(권한 기반) 분리 — https://support.clio.com/hc/en-us/sections/201779957-Firm-Dashboard
- [confirmed] MyCase: 상단 드롭다운 → 고정 좌측 사이드바 전환을 개편 핵심 가치로 — https://supportcenter.mycase.com/en/articles/10684705-new-mycase-user-interface
- [confirmed] MyCase Home 대시보드 = Quick Actions·My Timesheet·My Tasks·Events·Financial Overview — https://supportcenter.mycase.com/en/articles/9369856-dashboard-navigation-overview
- [confirmed] PracticePanther 대시보드 = 재무 버블 + Your Agenda(연체·이번 주 태스크) + Your Hours — https://support.practicepanther.com/en/articles/629220-dashboard-tutorial
- [confirmed] Smokeball Global Dashboard = 앱 기본 뷰, 기본 위젯 4개 — https://support.smokeball.com/hc/en-us/articles/5911375550743-Navigate-the-Smokeball-Dashboard
- [confirmed] Smokeball Daily Digest = 오늘의 캘린더+태스크+전화 메모 단일 위젯 — https://support.smokeball.com/hc/en-us/articles/5860206209047-Daily-Digest
- [unverified] Smokeball 웹앱 사이드바 구성 — https://support.smokeball.com/hc/en-us/articles/5862888953495-How-to-navigate-the-Smokeball-Web-App
- [unverified] Actionstep Home = 로그인 랜딩 + 미니 캘린더 + 오늘 Appointments — https://support.actionstep.com/support/solutions/articles/150000019995-actionstep-home-page-overview
- [unverified] Lawcus 로그인 첫 화면 = 대시보드(Today's Agenda 등 11종) — https://support.lawcus.com/en/articles/5010095-overview-of-the-lawcus-dashboard
- [unverified] Filevine 구성 가능한 메인 메뉴 — https://support.filevine.com/hc/en-us/articles/4410504845595-Getting-Started-with-Filevine

### 한국 그룹웨어·업무 SaaS의 홈(전자결재·공지·일정·할일) 패턴
- 판정 분포: confirmed 3 / plausible 4 / refuted 1 / unverified 4
- [confirmed] 네이버웍스 홈 PC웹 사용자 84.9% 주 1회 이상 사용, 위젯 사용률 1위(78.8%) 결재 문서 — https://naver.worksmobile.com/blog/naverworks_home_widget/
- [plausible] NHN Dooray 포탈 = 서비스 위젯 + 미니 위젯 2계층 — https://www.techview.best/software/155
- [refuted] NHN Dooray 전자결재 추가 보도(2022) 해석 — https://zdnet.co.kr/view/?no=20220106103336
- [plausible] 더존 WEHAGO 전자결재 대시보드 — https://www.douzone.com/product/wehago.jsp
- [confirmed] 다우오피스 대시보드 = 홈화면 개념, 20여 개 가젯 — https://blog.daouoffice.com/entry/%EB%8B%A4%EC%9A%B0%EC%98%A4%ED%94%BC%EC%8A%A4-%ED%99%88-%ED%99%94%EB%A9%B4-%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- [plausible] 다우오피스 차세대: 임직원/경영업무 포털 분리 + 대시보드 운영자 거버넌스 — https://helpdesk.daouoffice.co.kr/hc/ko/articles/43731971190681
- [plausible] 하이웍스 전자결재: 행위 기준 문서함 + 상태별 일괄 결재 — https://www.hiworks.com/hiworks_beta/
- [unverified] 카카오워크 PC 메인 탭 구조 — https://kakaowork.gitbook.io/kakao-work/basic/user/get-started
- [unverified] flex: 내 승인 필요 건을 '할 일'로 통합 — https://flex.team/landing/service/workflow
- [unverified] Shiftee 요청함 3분할(대기중/내 요청/완료) + '내 승인 차례만 보기' — https://shiftee.io/ko/help/article/manageRequests
- [unverified] 국내 대기업 그룹웨어 RFP의 포털·포틀릿 요건 — https://www.lotteins.co.kr/upload/C/board/2025/07/7/LOTTEINS%20Groupware%20System%20RFP.pdf

### 엔터프라이즈 홈/대시보드 위젯 구성 사례
- 판정 분포: confirmed 5 / plausible 3 / refuted 0 / unverified 5
- [confirmed] Workday 홈: 본문 최상단 'Awaiting Your Action'(미리보기 최대 3건) — https://apps.hr.cornell.edu/workdayCommunications/Announcements/New%20Workday%20Homepage%20Quick%20Reference.pdf
- [plausible] Workday 홈 카드 역할 기반 자동 표시 — https://modernization.wsu.edu/2023/02/14/workday-tips-tricks-review-timely-suggestions/
- [plausible] Workday My Tasks 단일 액션 인박스, 홈 카드는 그 미리보기 — https://kb.lynn.edu/display/WDAYDOCS/My+Tasks+and+Notifications
- [confirmed] Viva Connections 대시보드 카드: Approvals·Assigned tasks·News·Events — https://learn.microsoft.com/en-us/viva/connections/available-dashboard-cards
- [confirmed] Viva Connections: primary audience 기본 카드 세트 + 카드 ~20개 이하 권고 — https://learn.microsoft.com/en-us/viva/connections/create-dashboard
- [confirmed] SAP Fiori 'My Home' = To-Dos/Pages/Apps/Insights 4섹션 + 재배열 — https://learning.sap.com/courses/learning-the-basics-of-sap-fiori/personalizing-sap-fiori_decea017-0eda-41c1-bea9-c83627443035
- [plausible] SAP My Home To-Dos 카드 = My Inbox/My Situations 연동 — https://help.sap.com/docs/ABAP_PLATFORM_NEW/a7b390faab1140c087b8926571e942b7/8a60279e8d2041b5ad8d3455fab0f3ef.html
- [confirmed] ServiceNow Employee Center 랜딩 = My Active Items 등 — https://www.guidevision.eu/insights/employee-center-servicenow's-new-unified-employee-portal
- [unverified] ServiceNow Employee Slate: 관리자 큐레이션 기본 홈 + My Canvas 분리 — https://www.servicenow.com/community/employee-slate-and-employee/servicenow-employeeworks-introducing-employee-slate/ba-p/3537890
- [unverified] Atlassian Home 'For you' 구조 — https://support.atlassian.com/platform-experiences/docs/what-is-atlassian-home/
- [unverified] NN/g: 역할 기반 personalization > 개인 customization — https://www.nngroup.com/articles/intranet-portals-personalization/
- [unverified] NN/g 인트라넷 어워드: 최고 인트라넷 = 개인화 대시보드형 홈 — https://www.businesswire.com/news/home/20170109005356/en/Nielsen-Norman-Group-Names-World%E2%80%99s-10-Intranets

### 대시보드 설계 원칙 (행동 유도형 홈 대시보드)
- 판정 분포: confirmed 5 / plausible 1 / refuted 2 / unverified 6
- [confirmed] NN/g 운영형 대시보드 정의: 시간 민감 과업 사용자에게 핵심 정보를 빠르게 — https://www.nngroup.com/articles/dashboards-preattentive/
- [refuted] Stephen Few 단일 화면 정의 출처 귀속 — https://www.perceptualedge.com/files/Dashboard_Design_Course.pdf
- [refuted] NN/g 폴드 57%/84% 수치 — https://www.nngroup.com/articles/scrolling-and-attention/
- [confirmed] F-패턴 = 강한 시각 단서 없을 때의 기본 스캔, 우측·하단 스킵 — https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- [confirmed] Tableau: 대시보드당 뷰 2~3개 권고, 최중요 뷰 좌상단 — https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm
- [plausible] Salesforce 대시보드 위젯 하드 리밋(최대 25개) — https://help.salesforce.com/s/articleView?language=en_US&id=analytics.rd_reports_dashboards_limits.htm&type=5
- [confirmed] NN/g 빈 상태 3원칙 — https://www.nngroup.com/articles/empty-state-interface-design/
- [confirmed] SAP Fiori Overview Page = 역할 기준 카드 집계 + 주의 필요 이슈 식별 — https://www.sap.com/design-system/fiori-design-web/page-types/floorplans/overview-page-ovp/overview-page-card/
- [unverified] NN/g: 카드 레이아웃 스캔성 저하, masonry 배열 준무작위 스캔 — https://www.nngroup.com/articles/cards-component/
- [unverified] Eric Ries vanity metrics 비판 — https://tim.blog/2009/05/19/vanity-metrics-vs-actionable-metrics/
- [unverified] Pencil & Paper 대시보드 정보 위계 — https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards
- [unverified] NN/g 복잡 애플리케이션: 예측 가능한 위치·시각 위계·점진적 공개 — https://www.nngroup.com/articles/complex-application-design/
- [unverified] Few 3분류(전략/분석/운영)와 유형 혼동 경고 — https://www.dataplusscience.com/DashboardDefinition.html
