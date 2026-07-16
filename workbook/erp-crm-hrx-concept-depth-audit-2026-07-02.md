# 최초 컨셉(로펌 Work OS SaaS PDF) 대비 ERP·CRM·HRX 구현 깊이 감사 및 최상위 도달 개선계획 (2026-07-02)

작성 방식: 최초 컨셉 PDF(51p) 전문 판독 → 10개 차원 병렬 전수 감사(38 에이전트, 도구호출 1,181회) → 갭 99건 중복제거 → critical/major 28건 적대적 검증 시도(12건 완료: CONFIRMED 8·ADJUSTED 4·REFUTED 0, 16건 세션한도 중단) → 중단분 중 판 전체를 좌우하는 8건 직접 재확인. 본 문서는 같은 날 작성된 `workbook/concept-implementation-gap-audit-and-improvement-plan-2026-07-02.md`(사양명세서 v2.0 기준 감사)를 **제품 축(ERP·CRM·HRX) 관점**으로 보완한다.

## §0 성격·출처 규율

- 이 문서는 감사 보고+계획이며 완료 권한이 없다. 리포 변경·커밋은 구현 측(Codex) 소관.
- 출처 표기: **[직접]** 이 세션에서 직접 실행/판독, **[검증]** 감사 보고를 별도 검증 에이전트가 코드 기준 재확인, **[보고]** 에이전트 보고·미재검증.
- 기준 트리: 로컬 브랜치 `codex/lcx-vltui-owner-approval-intake` (2026-07-02).
- 컨셉 정본: `/Users/jws/Downloads/로펌 Work OS SaaS.pdf` — ChatGPT 대화 내보내기 형식의 최초 컨셉 문서. [A] Outlook Add-in 트랙(6~22p), [B] People & HR Operations(P14) 트랙(23~51p), [C] 최종 제품 정의로 구성. 이 대화가 26문서 개발 패키지를 낳았고 그것이 `workbook/matter_master_specification_combined.md`로 승계됨.

## §1 최초 컨셉의 실체와 승계 상태

**[A] Outlook Add-in = 제품의 핵심 진입점.** "변호사가 실제로 가장 많이 보는 화면이 Outlook이므로, matter 웹앱을 따로 열게 만들기보다 Outlook 안에서 이메일·첨부·기한·업무·쟁점을 바로 matter로 전환하게 해야 한다." Office.js Web Add-in + MSAL/Entra + Graph API + SharePoint/OneDrive 저장 + matter backend. MVP 12기능, 2차(auto-suggestion·AI summary·Smart Alerts·compose mode), Email object 18필드, Document object 17필드, matter 폴더구조(00_Email~99_Archive), 단계 OUT-0~6, TUW MAT-OUT-* 17종.

**[B] P14 People & HR Operations = 독립 필러.** People Graph 객체 22종(User≠Employee 분리), 상태기계 5종(Employee/HR Document/Leave/Candidate/HR Risk), HR 권한모델 13영역(급여=Payroll권한자·제한된HR·본인), **HR Rule Engine 9영역(계산은 rule engine, 설명은 LLM)**, HR Risk 자동감지 8종, HR Assistant(RAG, "AI 답변 범위 ≤ 사용자 직접 조회 범위"), 포털 4종(Client/People/Candidate/External Expert), Payroll 컷라인(기록 O·계산 X), Release R0~R14.

**[C] 최종 정의:** `matter = Law Firm Work OS + Legal Knowledge OS + People Operations OS`. Matter Graph × People Graph 결합(workload/capacity/staffing/conflict). 착수순서 15단계: Development OS → **Core Identity(User/Employee 분리)** → Matter Core → **Security** → **Microsoft DMS** → **Outlook MVP** → Workflow Base → … → People & HR Ops.

**승계 판정 [검증]:** 컨셉→스펙 계보는 거의 완전 승계(마스터 스펙 2,543줄에 MAT-OUT 17종·MAT-HRO·P14·포털4종·Email 18필드·폴더구조·R0~R14 전량 수록, 요구 원장 227앵커, 계약 53건, 커버리지 감사 209/209 covered). **유실된 것은 컨셉이 아니라 컨셉의 실행이다** — covered는 계획 문서 매핑이지 런타임 매핑이 아니다.

## §2 종합 판정: 깊이 스코어보드

깊이 척도: 0=부재 / 1=문서·계약만 / 2=골격·스텁(미와이어링 포함) / 3=실행 가능하나 운영 불가 / 4=운영 가능.

**전 축·전 모듈(약 90개 판정)에서 4점(운영 가능) 0개.** 최고 등급은 3점이며, 실사용자가 UI로 완주 가능한 업무 동선은 5개 중 1개(휴가신청→승인, 그나마 직무분리·원장차감 결함 보유)다.

| 축 | 대표 모듈 판정 | 축 요약 |
|---|---|---|
| ERP① 시간·과금 | TimeEntry 3 · WIP 3 · Payments수납 3 / PreBill 2 · Invoice 2 · AR aging 2 · 세금계산서 2 · Settlement 2 / 신탁·선수금 0 · LEDES 0 · 이메일→TE후보 0 | 사이클 중간(승인→잠금→prebill→발행→매칭)이 전부 패키지 함수로만 존재, 라우트·UI 0 |
| ERP② 재무·수익성 | Matter원가 3 · Matter수익성 3 · ClientProfitability 3(구조결함) / Workload 2 · 월간리포트 2 · Expense 2 · 대시보드 2 / FixedFee수익성 1 · 회계연동 1 · PG capacity 1 / 예산 0 · 재무마감 0(원장 요구만) · 매출인식 0 | 경영 숫자가 실데이터와 무관(하드코딩 상수·가짜 버킷) |
| CRM① 마스터·인테이크 | Client마스터 3 · Contact 3 · Intake 3 · 중복감지 3 · 그룹계층 3 · 관계이력 3 / Party 2 · ConflictCheck 2 · Engagement 2 · BD 2 · 리퍼럴 2 / KYC 0 | 골격은 가장 넓으나 로펌 CRM의 존재 이유(충돌검사)가 비어 있음 |
| CRM② 포털·이메일 | ClientPortal(백엔드) 3 · PeoplePortal 3 · 타임라인 3 · 문서빌더 3 / EmailFiling 2 · CandidatePortal 2 · SecureLink 2 · 포털인증 2 / **OutlookAddin 1** · SharePoint저장 1 · SmartAlerts 1 / ExpertPortal 0 | 컨셉의 절반(입력 레이어)이 결정기록만 존재. 외부인이 쓸 수 있는 포털 0종 |
| HRX① People Core | User≠Employee 3 · 민감권한모델 3 · HR감사 3 / EmployeeRegistry 2 · Org 2 · HRDocument 2 · HRPolicy 2 · Compensation 2 | 3개 축 중 최심이나 급여 데이터·문서 수명주기·조직관리 실체 부재 |
| HRX② 근태·결재 | Leave(제출) 3 · Payroll컷라인 3 / Attendance 2(라우트 0 [직접]) · Overtime 2 · Approval 2 · RuleEngine 2(9영역 중 1, 그마저 미호출 [직접]) / 근로기준법 정합 0 | 결재 루프 단절: 승인 라우트가 테스트 전용 [직접] |
| HRX③ 채용·리스크·AI | PeopleAnalytics 3 / 채용 전 모듈 2(생성 라우트 미와이어링 [직접]) · Onboarding 2 · Offboarding 2 · HRAssistant 2(하드코딩 템플릿 [직접]) / HRRisk 1(감지 엔진 0 [직접]) · HRDataRoom 0 | 상태기계·가드는 실재하나 시드 1건짜리 인메모리 세계 |
| 플랫폼 게이트 | Audit 3 · AI리뷰큐 3 / Identity 2 · 권한커널 2 · EthicalWall 2 · 영속성 2 · 검색 2 · Workflow엔진 2 / MS DMS 1 · SSO/SCIM 1 · DLP 1 / IssueLedger 0 | 4대 게이트(실인증·내구DB·문서바이트·실LLM)가 전 축의 상한을 2~3으로 고정 |
| UI/데스크톱 동선 | MatterHome 3 · 휴가동선 3 · 개설위저드 3 · 데스크톱 3 / 로그인 2 · 관리자콘솔 2 · 시간→청구 2 · 문서동선 2 / OutlookPanel 1 · 근태/계약/사규QA 화면 1 / IssueLedger 0 | 13개 서피스가 라우팅 미연결 고아, 쓰기 대부분이 고정 payload 데모 버튼 |

## §3 횡단 4대 게이트 — 모든 축의 "운영 가능"을 막는 공통 상한

**G-A. 실인증 부재 (자기주장 신뢰경계) [검증·직접]**: 전 라우트의 principal·rules·object_acl을 호출자가 `x-lawos-permission-context` 헤더로 공급, 웹은 allow-* 자가발급, HRX는 전 사용자 hr_admin+2099년 만료 가짜 MFA 하드코딩. fail-closed 결정엔진·step-up 게이트·라우트 정책맵 등 **집행 기구는 우수**하나 입력이 위조 자유라 보안통제로 성립하지 않음. Ethical Wall도 클라이언트 자율신고제(서버측 월 저장소 미와이어링). 유일한 실인증은 데스크톱 브리지(pbkdf2+Secrets Manager, timingSafeEqual)뿐.

**G-B. 내구 영속성 부재 [검증·직접]**: DB 드라이버 0(root dependencies={}), 11개 도메인 스토어 전부 단일 JSON 파일 재직렬화, 기본 경로 mkdtemp 임시 디렉토리. 데스크톱 앱도 `local-api.js:40`이 storePath 없이 기동해 **앱 재시작마다 전 데이터 소실 [직접]**. HRX는 durable 모드에서도 승인·정책·채용·온보딩/오프보딩 9개 도메인이 인메모리 배열 [검증 CONFIRMED]. 감사 증적도 같은 휘발 저장 위, 법적 증적 불가.

**G-C. 문서 바이트 경로 부재 [검증 ADJUSTED]** — SharePoint/S3 어댑터 전 메서드 throw placeholder, 업로드는 content_text 문자열만, 다운로드 엔드포인트 0, 웹 전체 `<input type=file>` 0건, 데스크톱 파일브리지 미등록(fileBridgeExposed:false). 로펌의 1차 업무 객체(문서·이메일 원본)를 넣지도 꺼내지도 못함.

**G-D. 실 LLM 부재 [직접]** — LLM SDK 의존성 0(package.json 전수 [직접]), model-gateway는 'dispatched' 레코드 생성만, HR Assistant 답변은 `routes/hrx/ai.js:15`의 템플릿 문자열 [직접]. 가드레일(최종판단 금지·리뷰큐·citation 강제)은 실와이어링되어 있으나 지킬 AI가 없음. RAG는 본문 인덱스 없는 제목 매치.

## §4 ERP 미비점 (검증 통과분 중심)

1. **청구 사이클 완주 불가 [검증 ADJUSTED, critical]** — finance 라우트 7개뿐. 시간 승인(approveTimeEntryForWip)·WIP 잠금(lockWipSnapshot)·pre-bill(createPreBill)·발행(createInvoiceFromPreBill)·입금매칭(matchPaymentToInvoice)이 전부 **패키지 함수로 존재하나 라우트·UI 미와이어링**. API로 만든 time entry는 영원히 draft → 실사용자 시간이 청구에 도달할 경로 0.
2. **AR aging이 가짜 계산 [검증 CONFIRMED, critical]** — bucket_current=항상 0, 1-30 버킷=연령 무관 전액, 31일+=리터럴 0 (`packages/payments/src/ar-service.js:59-63`). 인보이스에 due_date 필드 자체가 없어 연령 산출 원천 불가.
3. **경영 대시보드가 하드코딩 상수 [검증 CONFIRMED, critical]** — refresh가 AR 400000·ClientHealth 87·PracticeP&L 32를 상수 기록, finance 저장소 무조회. 이 숫자가 Home·Analytics UI에 표시됨.
4. **Client profitability 구조 결함 [검증 CONFIRMED, critical]** — client_group_id 무관 테넌트 전체 합산, MatterProfitability에 client 필드 부재 → 어떤 클라이언트를 조회해도 동일 값.
5. **회계연동 전면 descriptor-only [검증 CONFIRMED, critical]** — finance-integrations 4,451줄 전부 CP 서술자, 더존·위하고·뱅킹·카드·세무·DART 런타임 전부 false 선언, 외부 HTTP 호출 0건.
6. **한국 세무 미달 [보고, major]** — 세금계산서는 ×10% 곱셈 레코드(미와이어링), 전자세금계산서 발행 채널·원천징수 0.
7. **신탁·선수금 0줄 [보고, critical]** — 의뢰인 예치금 분리·retainer drawdown·착수금+성공보수(한국 지배적 보수형태) 계산 전무. hourly 단일 과금.
8. **예산·매출인식 0줄, 재무마감은 요구 등재+부분 조각만 [검증 ADJUSTED, major]**, 정산(settlement)은 배분 계산 없이 즉시 closed 레코드.

## §5 CRM 미비점

1. **이해충돌 '검사'가 존재하지 않음 [검증 CONFIRMED, critical]**: 스냅샷 해시 저장뿐, executeConflictSearch는 hit_count를 호출자 입력(기본 0)으로 기록 → "검색 완료·히트 0건" 허위 기록이 구조적으로 가능. hit/decision/waiver 미와이어링. **상대방(적대 당사자) 모델 자체가 리포에 없어** 충돌검사의 핵심 질문(신규 의뢰인이 기존 의뢰인의 상대방인가) 원천 불가 [보고, major].
2. **Matter 개설 clearance 게이트가 자기신고제 [검증 CONFIRMED, critical]** — validateClearance는 토큰 필드 형상만 검사(발급 원장 대조 없음), 공식 UI가 token_state:'valid'를 즉석 조작. 위임계약(engagement) 없이 Matter 개설 가능, engagement_id는 `'engagement:${clearanceId}'` 문자열 조작.
3. **실클라이언트 99건 이중 상주 + CRM 레인은 실데이터 0건 [검증 ADJUSTED, critical]**: master-data(tenant_rp04)와 matter 런타임(tenant_rp05, Lambda upsert 완료)에 상호 ID 매핑 없이 2중 존재, CRM·인테이크·충돌검사는 합성 테넌트에서 실클라이언트 0건으로 동작. 충돌검사를 붙여도 대사할 실데이터가 그 레인에 없음.
4. **Outlook Add-in 0줄 [검증 CONFIRMED + 직접, critical]** — manifest·Office.js·MSAL·Graph 호출 전무, 계약 스스로 implementation_allowed:false. email filing 커널(22줄)은 API 미와이어링 [직접], Email 모델에 컨셉 18필드 중 graph_message_id/from/to 등 결여. Smart Alerts 0줄.
5. **포털 4종 중 외부인 사용 가능 0종 [보고, major]** — ClientPortal 백엔드 13종 라우트는 실행되나 PortalSurface는 App.jsx 미마운트 고아 컴포넌트, 외부 사용자 인증·초대·세션 전무, ExpertPortal 0줄, CandidatePortal은 내부 열람 패널. secure link는 토큰/URL 미생성·만료 미집행·회수 부재.

## §6 HRX 미비점

1. **결재 루프 단절 [직접, critical]** — `routes/hrx/leave.js`의 approve/reject는 테스트만 import [직접]. 와이어링된 승인 큐(/api/hrx/approvals)는 인메모리 시드 배열 변이일 뿐 휴가요청 상태 전이·연차 차감 미발생, durable 모드에서도 재시작 소실 [검증 CONFIRMED]. "승인했다는 감사기록은 있는데 승인 상태는 없는" 불일치 가능.
2. **근태 전면 부재 [직접, critical]** — apps/api/src에 attendance 참조 1건(라우트 0) [직접], 영속 테이블 0, UI는 setup_required 안내 패널. 근태가 없어 연장근로·주52시간·미승인 초과근로 통제의 입력 자체가 없음. **근로기준법 정합 코드 0줄.**
3. **HR Rule Engine 9영역 중 1영역, 그마저 미호출 [직접·보고, critical]** — 연차 계산기 3개가 테스트 외 호출 0건인 죽은 코드. 승인 시 evaluateLeaveUsage를 안 거쳐 잔여 음수 무제한. 연차촉진은 단어조차 없음 [직접].
4. **HR Risk 자동감지 8종 0줄 [직접, critical]** — 감지 엔진·라우트·UI·테이블 전무(근로계약 미체결·연차촉진·법정교육·초과근로·퇴사자 권한 미회수 등 법적 컴플라이언스 직결 항목).
5. **채용 생성 불가 [직접, critical]** — routes/hrx/recruiting.js import처 0 [직접]. 라이브는 시드 지원자 1명의 단계 전진만 가능. 채용·온보딩·오프보딩 데이터 전부 내구 저장 제외 [검증 CONFIRMED].
6. **급여 데이터 부재 [보고, major]** — masked_compensation_ref는 null 하드코딩, 저장·조회 라우트/테이블 0 → step-up 가드가 보호할 대상이 없음. 연봉계약 상태기계는 미와이어 라이브러리.
7. **Self-service 부재 [보고, major]** — 허용 역할이 HR 계열 5개뿐, 본인 레코드 소유권 검사 없음 → 일반 직원은 자기 휴가·문서·프로필도 접근 불가. 실계정 9명을 쓰려면 전원 hr_admin이어야 하고 실제 웹이 그렇게 하드코딩.
8. **HR AI 가짜 [직접, critical]** — §3 G-D 참조. HR Data Room 0줄(기존 data-room은 legal VDR 전용).

## §7 5대 운영 동선 완주 판정 [보고·표본]

| 동선 | 판정 | 절단 지점 |
|---|---|---|
| ① 신규 matter 개설 | △ 실체인 있으나 무결성 없음 | 사용자가 내부 식별자 10개 수기 입력, clearance 클라이언트 조작 |
| ② 시간기록→청구 | ✗ 양끝 절단 | 시간 입력 폼 없음(30분 고정 데모), POST /invoices 부재 |
| ③ 휴가신청→승인 | ○ 유일 완주 | 단 신청자=승인자 동일 계정, 원장 차감·잔여 표시 없음 |
| ④ 문서 업로드→버전→공유 | ✗ 0단계 절단 | 파일 입력 0건, 버전 등록 의도적 차단, 다운로드 불가 |
| ⑤ 포털 자료요청 응답 | ✗ 시작 불가 | API만 존재, 호출 UI 0, 포털 화면 미마운트 |

보조 판정: 13개 서피스 고아 컴포넌트, 쓰기 대부분 고정 payload 데모 버튼, 목록 화면 익명 라벨('요청 1'·'기록 1') 표기로 데이터가 있어도 업무 판단 불가, 웹 'E2E' 16개 전부 소스 정규식 판독(브라우저 0).

## §8 컨셉에도 없지만 최상위 엔터프라이즈 로펌 SaaS가 요구하는 부재 기능 (beyond-concept)

- **ERP:** timekeeper별 원가율, 신탁회계(IOLTA성), 다통화, LEDES/UTBMS e-billing, 은행 대사, realization/utilization KPI(라이브러리만 존재·미노출), credit note/환불, matter 예산 소진 경고, 월마감 체크리스트, 인보이스 법정 연번, 청구서 PDF·발송·온라인 결제.
- **CRM:** 제재·PEP/AML 스크리닝, 한국어 음차·법인격 접미사 fuzzy 매칭, lateral hire 충돌검사, 충돌검사 증빙 리포트, 외부 인테이크 폼, relationship intelligence(이메일/캘린더 자동 캡처), e-sign 제공자 통합.
- **HRX:** 근무일정/공휴일 캘린더 엔진(휴가일수 자동 계산), 알림 체계(승인 대기·기한), 급여명세서 전자교부(근기법 48조), 외부 payroll 커넥터, 전자서명(글로싸인/모두싸인), 백그라운드 체크, 다법인(AMIC/PETRA) 취업규칙 분리, 조직개편 effective-dating.
- **플랫폼:** at-rest 암호화/KMS(민감문서 평문 JSON), rate limiting/brute-force 방어(로그인 포함 0), 다중 인스턴스 동시성 제어, 세션 수명주기(회수·강제 로그아웃), DR 체계(RTO/RPO 실측), APM·중앙 로그, 이메일/푸시 알림 인프라, 모바일 접근, 웹소켓 실시간 협업, 법원 기일·전자소송 연동.

## §9 개선 계획 (TUW 수준 — 구현·커밋은 Codex)

원칙: ① 비약화(닫힌 CP 팩·게이트 불수정, 위에 적층) ② 기존 감사 문서 Phase 0(실데이터 보호·오너 결정)이 선행 전제 ③ **"미와이어링" 갭과 "부재" 갭을 구분해 전자를 먼저 수확**(패키지 함수+테스트가 이미 있으므로 라우트·UI 연결만으로 깊이 2→3 승격 가능) ④ 산출물은 goal-closeout/LCX 영수증 규격.

### Phase A — 횡단 4대 게이트 해소 (전 축의 상한 해제; 기존 계획 Phase 1·3과 정합)

| # | 작업 | 완료 기준 |
|---|---|---|
| A-1 | 서버측 identity: 세션·서명 토큰 발급/검증(장기 Entra OIDC), 자기주장 헤더 제거, 권한 규칙 서버 저장(`permission-context-store` 와이어링), Ethical Wall 월 저장소 라우트 연결, step-up 토큰 HMAC 서명 | 위조 헤더 부정 테스트 전 라우트 통과, 직무분리 성립 |
| A-2 | 관리형 DB 투입(persistence 포트 뒤 RDS/DynamoDB): HRX 인메모리 9도메인(승인·정책·채용·온보딩 등) 내구 테이블 승격 포함, 데스크톱 `local-api.js` storePath=userData 지정, 백업·복원 리허설 RPO/RTO 실측 | durable restart 전 도메인 PASS, 데스크톱 재시작 데이터 생존 |
| A-3 | 문서 바이트 실저장: MAT-DEC-03 스토리지 결정 재확정(06-19 롤백 복원) → SharePoint 또는 S3 어댑터 실구현, 업로드(multipart)/다운로드 엔드포인트, 웹 파일 입력 UI, 데스크톱 fileBridge 등록 | 업로드→저장→재기동→다운로드 E2E |
| A-4 | 실 LLM 게이트웨이 1개 관통(기존 가드레일·리뷰큐·citation 레일에 접속) | HR 사규 Q&A 1건이 실모델+실권한필터+리뷰큐로 완주 |

### Phase B — ERP: 청구 사이클 완주와 숫자 신뢰 회복

| # | 작업 | 유형 |
|---|---|---|
| B-1 | 승인→WIP잠금→prebill→발행→매칭 라우트·UI 와이어링(함수 기존재: approveTimeEntryForWip·lockWipSnapshot·createPreBill·createInvoiceFromPreBill·matchPaymentToInvoice) + 무조정 승인 경로 신설 + 시간 입력 실폼(타이머 포함) | **와이어링** |
| B-2 | 인보이스 due_date 모델 + AR aging 실버킷(날짜 연산) + 스냅샷 재생성 | 부재 보수 |
| B-3 | 대시보드 refresh를 finance 저장소 실집계로 교체(상수 제거), MatterProfitability에 client_group_id 부여+매핑 집계, finance↔analytics 파이프라인(호출자 배열 공급 제거) | 부재 보수 |
| B-4 | 보수 유형 확장: fixed fee·착수금+성공보수·retainer drawdown 계산, rate card CRUD 노출 | 부재 |
| B-5 | 신탁·선수금 모델(예치금 분리 원장·차감·환불채무) — 법적 필수 | 부재 |
| B-6 | 전자세금계산서 발행 채널(외부 리드타임 — 홈택스/위하고 벤더 결정 지금 착수) + 원천징수 | 외부연동 |
| B-7 | expense/disbursement/fee-arrangement/리퍼럴 라우트 와이어링, realization/utilization KPI 노출 | **와이어링** |

### Phase C — CRM: 신뢰 사이클(충돌검사→수임→filing) 실체화

| # | 작업 | 유형 |
|---|---|---|
| C-1 | **상대방(adverse party) 모델 신설** + conflict search 실검색 엔진(이름·별칭·과거 matter·상대방 대사, 한국어 정규화 fuzzy) + hit/decision/waiver 라우트 와이어링 + 검사 증빙 리포트 | 부재(핵심) |
| C-2 | clearance 서버 대사(발급 원장 조회 필수화), engagement 라우트·문서 생성·전자서명 연동, UI 즉석조작 제거 | 와이어링+보수 |
| C-3 | 실클라이언트 정본 단일화: rp04/rp05 크로스워크 → 단일 실테넌트(기존 계획 0-4와 정합), CRM 레인에 정본 연결 | 데이터 |
| C-4 | Outlook Add-in MVP 착수(컨셉 OUT-0~3: shell→MS로그인→matter검색→email filing→첨부 저장) — Entra admin consent(06-21 확보 기록) 활용, email filing 커널 API 와이어링, Email object 18필드 완성 | 부재(컨셉 1순위) |
| C-5 | Client Portal 외부화: PortalSurface 마운트, 외부 사용자 인증(Entra External ID급)·초대 메일, secure link 실토큰·만료 집행·회수, RFI 응답 UI | 와이어링+부재 |

### Phase D — HRX: 데모 워크스페이스 → HR 운영 시스템

| # | 작업 | 유형 |
|---|---|---|
| D-1 | 결재 루프 연결: leave approve/reject 라우트 와이어링 + 승인→상태전이→원장차감 연동 + 2단계 승인(Manager→HR) + 승인 큐 내구화 | **와이어링** |
| D-2 | 근태 실체화: attendance 라우트·테이블·입력 UI(출퇴근·재택·출장), 근무일정 캘린더, 주52시간·미승인 초과근로 통제, overtime 와이어링 | 부재(컨셉 1순위) |
| D-3 | HR Rule Engine 실가동: 연차 계산기 3개를 승인·조회 경로에 연결(잔여 음수 차단), 연차촉진·이월 자동화, 근태·결재 라우팅 규칙 — 근로기준법 산식 정합 | 와이어링+부재 |
| D-4 | 채용 CRUD 와이어링(recruiting.js·lifecycle.js — 코드 기존재) + 내구 테이블 + 생성 폼 UI + convert-to-employee | **와이어링** |
| D-5 | Employee 상태기계(컨셉 8상태)·직원 등록/수정 라우트·조직단위/리포팅라인 와이어링, self-service 역할(본인 레코드 소유권 검사) | 와이어링+보수 |
| D-6 | Compensation Record 실데이터 경로(암호화 ref+KMS)·연봉계약 상태기계 와이어링·HR 문서 수명주기(서명·만료 감시) | 부재 |
| D-7 | HR Risk 감지 엔진 8종(원료 검증자 기존재: contracts/overtime/attendance) + 리스크 라우트·UI | 부재 |
| D-8 | HR Assistant 실 RAG(사규 본문 인덱스, 실권한 필터를 액터에 결속) — A-4 위에 적층 | 부재 |

### Phase E — 최상위 차별화 (Wave 2 진입)

전문검색(OpenSearch류)+OCR → People/Matter Graph 실그래프 자료구조 → workload 실연동 capacity 대시보드 → Smart Alerts(발송 개방 전 필수) → SSO/SCIM/DLP 실행체 → beyond-concept 목록(§8) 우선순위화(신탁회계·알림 인프라·전자서명·rate limiting·at-rest 암호화가 선순위).

### 우선순위·의존

```
[기존 계획 Phase 0: 실데이터 보호·오너 결정] ──► Phase A (4대 게이트)
Phase A ──► B·C·D 병행 가능 (와이어링 항목은 A-1·A-2만으로 착수 가능)
와이어링 수확 우선: B-1·B-7·C-2·D-1·D-4·D-5 (함수+테스트 기존재 → 최소 비용 깊이 승격)
외부 리드타임 즉시 발주: B-6(세금계산서 벤더), C-4(Entra/Graph), 전자서명 벤더, 펜테스트(기존 계획 Phase 4)
컨셉 정합 최우선 2건: C-4(Outlook = 컨셉 [A] 전체), D-2·D-3(근태+Rule Engine = 컨셉 [B] 1순위)
```

### 검증 규율 (상시)

웹 E2E를 실브라우저(Playwright)로 교체, 'persistence/security/e2e' 명칭 인플레이션 테스트 정비, 대시보드 상수·가짜 버킷 같은 **"그럴듯한 오답" 회귀 차단 테스트**(실데이터 집계 대조) 신설, hrx-runtime-api 시드 불일치 1건 수정.

## §10 미검증 잔여

적대적 검증 28건 중 16건이 세션 한도로 중단(이 중 8건 본 세션 직접 재확인 완료), cap 초과 71건은 [보고] 상태로 잔존. 검증 완료 12건 중 REFUTED 0건 — 감사 보고의 방향성은 코드가 자기선언(implementation_allowed:false, descriptor_only, provider_blocked 등)으로 뒷받침하는 만큼 신뢰도가 높으나, [보고] 항목을 근거로 개별 완료 판정을 내릴 때는 재검증을 선행할 것.
