# Wave-1 내부 OS 승격 TUW 백로그 — 9인 프로파일 (2026-07-02)

기반: `workbook/erp-crm-hrx-concept-depth-audit-2026-07-02.md`(깊이 감사)의 Phase A~E를 **로펌 내부용 OS(전 인력 9명)** 전제로 재설계하고 Testable Units of Work로 분해. 오너 지시(2026-07-02): "이해충돌 등 실 운영기능을 제외한 과한 방화벽 기능은 반드시 필요하지 않음. 소수 인력 감안하여 느슨하게 구성할 수 있는 부분은 느슨하게, 그 외는 엔터프라이즈급으로."

## §0 성격·규율

- 이 문서는 계획이며 구현·커밋은 Codex 소관. TUW ID(`UPL-X-NN`)는 Codex가 기존 TUW 레지스트리 체계로 재채번 가능.
- **비약화 원칙과의 관계:** 본 느슨화는 production_ready 게이트 약화가 아니라 **Wave-1 배포 프로파일 결정**이다. 닫힌 CP 팩·기존 게이트는 불수정, 느슨화는 §1 레지스터에 기록하고 각 항목에 재강화 경로(Wave-2)를 남긴다.
- 완료 기준은 전부 테스트/영수증으로 판정 가능해야 한다(실서버 기동 테스트 우선, UI 동선은 실브라우저 E2E 또는 수동 영수증 명시).

## §1 느슨화 결정 레지스터 (LX) — 오너 일괄 승인 대상

| ID | 영역 | 엔터프라이즈 원안 | 9인 내부 프로파일 | 재강화 경로(Wave-2) |
|---|---|---|---|---|
| LX-01 | 인증 | Entra OIDC SSO + SCIM | 자체 세션 인증(데스크톱 브리지 pbkdf2 인증을 웹 공용으로 승격, 서명 세션 토큰). **서버측 인증 자체는 타협 불가** — 느슨화 대상은 IdP 연동 여부뿐 | E-08: OIDC 어댑터 교체(세션 계층 유지) |
| LX-02 | 테넌시 | 멀티테넌트 격리 | 단일 실테넌트 고정(교차 테넌트 deny 로직은 유지, 프로비저닝만 생략) | 테넌트 프로비저닝 개방 |
| LX-03 | Ethical Wall | 사용자별 스크리닝·월 멤버십 모델 | matter 팀 기반 visibility(비팀원 은닉)로 대체. **이해충돌 '검사'는 유지(실 운영기능·변호사 윤리 의무)** | 월 멤버십 모델 추가 |
| LX-04 | DLP·Retention | 자동 스캐너·자동 파기 집행 | 경고 표시+수동 운영 절차 문서(보존연한 도래 목록 조회만 자동) | 집행 잡 활성화 |
| LX-05 | HR 결재 | Manager→HR 2단계 승인 | 1단계 승인(신청자≠승인자 강제) + HR 확인 옵션 플래그 | 승인라인 다단계 활성화 |
| LX-06 | 전자서명 | e-sign 벤더 통합 | 서명본 스캔 업로드 + signature_ref 검증 | 벤더 통합(모두싸인 등) |
| LX-07 | 외부 포털 인증 | Entra External ID/B2C | 초대 매직링크(만료·1회성·감사 기록) | External ID 교체 |
| LX-08 | 회계 연동 | 더존/위하고 API 자동화 | 분개·거래 CSV export(수기 반입). **세금계산서 발행 연동은 유지(법적)** | API 커넥터 |
| LX-09 | 범위 제외 | External Expert Portal, HR Data Room, LEDES/UTBMS, 다통화, KYC/AML 스크리닝, ATS 외부 지원 채널 | Wave-1 제외 | Wave-2 백로그 |
| LX-10 | 관측성·알림 | APM·중앙로그·SLO | 에러 로그 파일+헬스체크 알림 메일, 인앱+이메일 알림 최소 세트 | APM 도입 |
| LX-11 | 계정 회수 | IdP/SCIM 자동 디프로비저닝 | 오프보딩 수동 체크리스트(회수 확인 기록 필수) | SCIM 커넥터 |
| LX-12 | 성능·규모 | 수평 확장·다중 인스턴스 잠금 | 단일 인스턴스 전제(문서로 명시), 동시 쓰기는 DB 트랜잭션으로 해결 | 확장 설계 |

**타협 불가 목록(느슨화 금지):** 서버측 인증·자기주장 헤더 제거 / 내구 DB+백업·복원 / 감사 증적(변경+민감 read+거부 시도) / 문서 바이트 저장·회수 / **이해충돌 검사** / 신탁·선수금 분리 원장 / 전자세금계산서 / 근로기준법 정합(연차 산식·주52시간) / 급여 접근통제(step-up) / AI 가드레일(최종판단 금지·리뷰큐·citation).

**선행 오너 결정 4건:** ① DB 선택(UPL-A-06: SQLite/WAL 단일 인스턴스 vs RDS Postgres small, 9인 규모 권고: SQLite+일일 백업, Lambda 병행 시 RDS) ② 문서 스토리지(UPL-A-10: S3 선행 후 SharePoint는 C-트랙 Graph와 함께 vs SharePoint 즉시, MAT-DEC-03 복원 필요) ③ 세금계산서 벤더(UPL-B-13) ④ 본 LX 레지스터 일괄 승인.

---

## §2 Phase A — 횡단 4대 게이트 (전 트랙 전제) · 14 TUW

| ID | 작업 | 완료 기준(테스트) | 의존 |
|---|---|---|---|
| UPL-A-01 | 웹 공용 로그인: 브리지 pbkdf2 인증 승격 → `POST /api/auth/login`이 서명 세션 토큰(HMAC) 발급, 9인 로스터 기반 | 오답 자격증명 401 / 무세션 요청 401 / 만료 토큰 401 실서버 테스트 | — |
| UPL-A-02 | 자기주장 헤더 제거: `x-lawos-permission-context` 클라이언트 공급 차단, 세션→principal 서버 파생, 권한 규칙 서버 저장(`permission-context-store` 와이어링) | 위조 헤더 주입 시 무시·거부되는 부정 테스트를 전 도메인 라우트 대표 경로에 적용 | A-01 |
| UPL-A-03 | 역할 서버 정본: 9인 역할 매핑(파트너/변호사/스태프/HR/관리자) 테이블 + HRX 스코프 서버 파생(웹 hr_admin 하드코딩 제거) | 역할별 접근 매트릭스 테스트(일반 직원이 급여·감사 라우트 403) | A-02 |
| UPL-A-04 | step-up 서명화: 무서명 JSON 헤더 → HMAC 서명 토큰 + TOTP 간이 MFA(급여·감사·평가 액션 한정) | 무서명/위조 step-up 거부, TOTP 오답 거부 테스트 | A-01 |
| UPL-A-05 | 단일 실테넌트 신설·이관: synthetic 테넌트에서 실데이터 분리(rp04/rp05 통합은 C-06) | 실테넌트 readback PASS, synthetic 표식 잔존 0 | A-06 |
| UPL-A-06 | 내구 DB 투입: persistence 포트 뒤 DB 교체(오너 결정), 도메인 JSON 스토어 마이그레이션 스크립트 | 전 도메인 durable restart 테스트 PASS(현 matter/finance/portal 포함), 마이그레이션 왕복 대사 | 오너① |
| UPL-A-07 | HRX 인메모리 9도메인 내구 승격(승인·정책·채용·지원서·면접·offer·온보딩·오프보딩·payroll export) | 각 도메인 쓰기→재시작→조회 생존 테스트(기존 hrx-durable-runtime 확장) | A-06 |
| UPL-A-08 | 데스크톱 storePath 고정: `local-api.js` → userData 경로 + 기동 마이그레이션 | 앱 재시작 후 matter·휴가 데이터 생존(패키징 스모크 영수증) | A-06 |
| UPL-A-09 | 백업·복원: 일일 백업 잡 + 복원 리허설 1회(RPO/RTO 실측 영수증), synthetic-only 차단 해제 조건 정리 | 백업 파일 생성 검증 + 복원 후 대사 PASS 영수증 | A-06 |
| UPL-A-10 | 문서 바이트 저장: 스토리지 어댑터 1개 실구현(오너②) + 업로드(multipart)/다운로드(stream) 엔드포인트 | 업로드→서버 재기동→다운로드 sha256 일치 실서버 테스트 | A-06 |
| UPL-A-11 | 문서 UI 개방: 웹 `<input type=file>`+버전 등록 버튼 활성화, 데스크톱 fileBridge 등록 | UI 업로드→버전 목록→다운로드 완주(브라우저 E2E 또는 데스크톱 수동 영수증) | A-10 |
| UPL-A-12 | 실 LLM 연결: Anthropic SDK 도입, model-gateway 활성화, 기존 가드레일·리뷰큐·citation 레일 접속 | 실모델 왕복 1건+리뷰큐 기록 통합 테스트(API 키 env, CI는 목 게이트웨이로 계약 검증) | — |
| UPL-A-13 | 감사 보강: 감사 스토어 DB 승격 + 인가 거부 시도 감사(`appendHrxRouteAudit` 미들웨어 와이어링) + 민감 read 감사를 HRX 외 도메인(vault·finance)에 확장 | 403 발생 시 감사 이벤트 기록 테스트, 재시작 생존 | A-06 |
| UPL-A-14 | 로그인 보호: 시도 제한(5회 잠금)+잠금 해제 절차, 데스크톱 브리지 포함 | 6회째 시도 423/429 부정 테스트 | A-01 |

## §3 Phase B — ERP: 청구 사이클 완주·숫자 신뢰 · 17 TUW

와이어링 수확(함수 기존재): B-02~B-06, B-14. 부재 신규: B-07~B-12, B-16.

| ID | 작업 | 완료 기준(테스트) | 의존 |
|---|---|---|---|
| UPL-B-01 | 시간 입력 실폼: duration/일자/narrative/billable 입력+간이 타이머(고정 payload 데모 버튼 제거, matter당 1회 idempotency key 제거) | 임의 값 입력→저장→목록 반영 브라우저 E2E, 동일 matter 복수 entry 생성 가능 | A-02 |
| UPL-B-02 | 승인 라우트: `approveTimeEntryForWip` 와이어링 + 승인 UI(파트너 역할 한정) | draft→approved 전이 실서버 테스트, 비파트너 403 | A-03 |
| UPL-B-03 | WIP 잠금 라우트: `lockWipSnapshot` 와이어링 | 잠금 후 수정 거부 테스트 | B-02 |
| UPL-B-04 | pre-bill: `createPreBill` 라우트 + **무조정 승인 함수 신설**(현재 write-down 부수효과로만 승인되는 결함 해소) + prebill-review UI | 조정 없이 partner_approved 도달 테스트, 반려 경로 테스트 | B-03 |
| UPL-B-05 | 인보이스 발행: `createInvoiceFromPreBill` 라우트 + 법정 연번 체계 + 발행 UI | 연번 중복 0 보장 테스트, 발행본 불변 회귀 테스트 | B-04 |
| UPL-B-06 | 입금 매칭: `matchPaymentToInvoice` 라우트 + 부분입금·초과입금 처리 + 수납 UI(100,000 고정 제거) | 부분입금 partially_paid 전이, 초과입금 잔액 처리 테스트 | B-05 |
| UPL-B-07 | due_date 모델 + 실 AR aging: 인보이스 due_date 필수화, 날짜 연산 버킷(current/1-30/31-60/61-90/90+), 스냅샷 재생성 | 연령별 버킷 배치 단위 테스트 — **가짜 버킷 회귀 차단**(31일+ 항목이 0이 아님을 시드로 검증) | B-05 |
| UPL-B-08 | 대시보드 실집계: refresh의 상수(400000/87/32) 제거 → finance 스토어 실조회 파이프라인 | 시드 데이터 기대값 대조 테스트(상수 문자열 grep 회귀 차단 포함) | B-06 |
| UPL-B-09 | 클라이언트별 수익성 수정: MatterProfitability에 client_group_id 부여, 매핑 기반 집계 | 서로 다른 클라이언트가 상이한 값 반환 테스트 | C-06 |
| UPL-B-10 | finance→analytics 자동 파이프라인: 호출자 배열 공급 제거, 저장소 직접 집계 | body 없는 요청으로 실집계 산출 테스트 | B-08 |
| UPL-B-11 | 보수 유형: fee arrangement `type`(hourly/fixed/착수금+성공보수/retainer) + WIP·청구 계산 분기 | 유형별 청구액 산출 단위 테스트(성공보수 조건 충족/미충족) | B-04 |
| UPL-B-12 | 선수금·신탁 원장: 예치금 분리 원장(수령→drawdown→환불채무), 잔액 리포트 | 예치·차감·잔액 불변식 테스트(음수 차단), 인보이스 상계 테스트 | B-06 |
| UPL-B-13 | 전자세금계산서: 벤더 결정(오너③) + 발행 API 연동 + 원천징수(3.3%) 필드 | 샌드박스 발행 왕복 영수증(벤더 제공 테스트 환경), 세액 계산 단위 테스트 | B-05·외부 |
| UPL-B-14 | expense/disbursement 와이어링: 라우트+입력 UI, WIP 소스 포함 | 경비→WIP 집계 반영 테스트 | B-02 |
| UPL-B-15 | 재무 KPI 노출: realization/utilization(라이브러리 기존재) 라우트+대시보드 카드 | 시드 대조 값 검증 테스트 | B-08 |
| UPL-B-16 | 청구서 산출물: 템플릿 PDF 생성 + DMS 보관 + 이메일 발송(알림 인프라 E-06 연계, 선행 시 수동 다운로드) | 발행→PDF 저장→다운로드 해시 검증 | B-05, A-10 |
| UPL-B-17 | 회계 export CSV(LX-08): 분개·거래 내역 기간 지정 export | 기간 필터·차대변 균형 검증 테스트 | B-06 |

## §4 Phase C — CRM: 충돌검사·수임·Outlook filing · 13 TUW

| ID | 작업 | 완료 기준(테스트) | 의존 |
|---|---|---|---|
| UPL-C-01 | 상대방 모델: Matter에 adverse party 등록(과거 사건 포함 소급 입력 UI), Party 역할 확장 | 상대방 등록→matter 상세 표시, model_type 필터 조회 테스트 | A-02 |
| UPL-C-02 | 충돌검사 실검색: 한국어 정규화(법인격 접미사·공백·괄호) + 부분/유사 매칭으로 client·party·상대방 전수 대사, hit 자동 생성(hit_count 호출자 입력 제거) | 시나리오 테스트: "기존 의뢰인의 상대방을 신규 수임 시도 → hit 생성"; 허위 '히트 0' 기록 불가 회귀 테스트 | C-01 |
| UPL-C-03 | 충돌 결정 흐름: hit/decision/waiver 라우트 와이어링 + 검토 UI + 검사 이력 증빙 리포트 | hit→decision(승인자 기록)→clearance 연결 실서버 테스트 | C-02 |
| UPL-C-04 | clearance 서버 대사: 발급 원장 조회 필수화(형상 검사 폐지), UI의 token_state/engagement_id 즉석조작 제거 | 미발급·위조 토큰으로 개설 시도 → 4xx 부정 테스트 | C-03 |
| UPL-C-05 | engagement 와이어링: 승인 라우트 + 템플릿 문서 생성 + 서명본 업로드(LX-06) | 서명문서 없는 승인 거부, engagement 없는 clearance 거부 테스트 | A-10 |
| UPL-C-06 | 실클라이언트 정본 단일화: rp04(entity)↔rp05(client) 크로스워크 생성 → 단일 실테넌트 이관, CRM·인테이크 레인에 정본 연결 | 99건 전수 재대사 PASS, 충돌검사가 실클라이언트 명단 대상으로 동작 | A-05 |
| UPL-C-07 | contact 원값 저장 개방: 이메일·전화 원값 입력 허용(현 fingerprint-only 차단 해제 — 내부용), 접근은 권한 게이트 | 원값 저장→권한자 조회/비권한자 마스킹 테스트 | A-03 |
| UPL-C-08 | 인테이크 완주 UI: IntakeSurface 마운트 + 상담→인테이크→충돌→개설 파이프라인 화면(내부 식별자 수기 입력 10개 제거) | 브라우저 E2E: 신규 의뢰 접수→충돌 통과→matter 개설 | C-04 |
| UPL-C-09 | Outlook OUT-0/1: Entra 앱 등록(06-21 admin consent 기록 활용)+manifest+task pane shell+MSAL 로그인 | Outlook(웹/신규 데스크톱)에서 패널 로드+로그인 스모크 영수증 | 외부 |
| UPL-C-10 | Outlook OUT-2 이메일 filing: matter 검색·metadata 읽기·`fileEmailThreadToMatter` API 와이어링·Email object 18필드(graph_message_id/internet_message_id/conversation_id/from/to 등) 완성 | filing→matter 타임라인 표시 E2E, 동일 메일 재filing idempotent 테스트 | C-09, A-10 |
| UPL-C-11 | Outlook OUT-3 첨부 저장: 첨부 목록→선택 저장(A-10 스토리지)→Document object 매핑→hash 중복 감지, matter 폴더 구조(00_Email~99_Archive) 적용 | 첨부→저장→matter 문서 목록 표시, 중복 파일 감지 테스트 | C-10 |
| UPL-C-12 | Outlook OUT-4 축소판: 발송 후 filing + 이메일에서 수동 task/deadline 생성 | 발송 메일 filing E2E, task 생성→matter 반영 테스트 | C-10 |
| UPL-C-13 | Client Portal 최소 외부화: PortalSurface 마운트, 매직링크 초대(LX-07: 만료·1회성·감사), RFI 응답 UI, secure link 실토큰·만료 집행·회수 | 외부 브라우저 세션으로 초대→RFI 응답→만료 링크 접근 거부 E2E | A-01, E-06(초대 메일) |

## §5 Phase D — HRX: 데모 → HR 운영 시스템 · 16 TUW

| ID | 작업 | 완료 기준(테스트) | 의존 |
|---|---|---|---|
| UPL-D-01 | 결재 루프 연결: leave approve/reject 라우트 와이어링(현 테스트 전용) + 승인→요청 상태 전이→**원장 차감** 연동, 승인 큐와 요청 단일 진실화 | 신청→승인→잔여 감소 실서버 E2E, 반려 시 원장 불변 테스트 | A-07 |
| UPL-D-02 | 직무분리: 신청자≠승인자 강제(1단계+HR 확인 옵션, LX-05), 승인라인 로스터 기반 지정 | 본인 신청 본인 승인 시도 403 테스트 | A-03, D-01 |
| UPL-D-03 | 연차 rule engine 실가동: 계산기 3개(발생·이월·사용가능)를 승인·조회 경로에 연결, 근속 기반 자동 발생 잡, 촉진 대상 산정, **잔여 음수 차단** | 근기법 60조 산식 단위 테스트(1년 미만 월 1일/1년 15일/가산), 음수 승인 거부, 연말 이월 배치 테스트 | D-01 |
| UPL-D-04 | 근태 실체화: attendance 라우트+내구 테이블+입력 UI(출퇴근·재택·출장·정정 체인), 근무일정·공휴일 캘린더(휴가일수 자동 계산 포함) | 기록→월별 집계 E2E, 휴가 신청 시 영업일 자동 계산 테스트 | A-07 |
| UPL-D-05 | 연장근로·주52시간: overtime 와이어링(사전/사후 승인) + 근태 대조 미승인 초과 감지 + 주 단위 한도 경고 | 주52시간 초과 시 경고 이벤트 생성 테스트, 미승인 초과 감지 테스트 | D-04 |
| UPL-D-06 | HR UI 실데이터화: 잔여휴가 실수치·신청 내역 실값 표시(익명 라벨 '요청 1' 제거), 휴가유형·정책 하드코딩 제거 | 화면 값=API 값 대조 브라우저 E2E | D-01 |
| UPL-D-07 | 직원 정본화: 등록/수정 라우트 와이어링(하드코딩 로스터 JSON→DB 정본, 로스터는 시드로 강등) + Employee 상태기계(내부용 6상태: Onboarding/Probation/Active/Leave/Notice/Terminated, 전이 검증) | 신규 직원 등록→상태 전이 테스트, 무검증 임의 상태 패치 거부 | A-07 |
| UPL-D-08 | 조직·리포팅 라인 와이어링: org 디렉토리·reporting line 라우트+테이블+간단 트리 UI(9인 규모) | 조직 변경 이력 기록 테스트, 문자열 휴리스틱 제거 확인 | D-07 |
| UPL-D-09 | HR 문서 수명주기: 계약서 상태기계(기존재 라이브러리) 와이어링 + 문서 생성 라우트 + 서명본 업로드(A-10) + 만료 감시(만료 임박 목록) | draft→signed(서명 ref 필수)→expired 전이 테스트, 만료 30일 전 목록 조회 테스트 | A-10, D-07 |
| UPL-D-10 | Compensation Record 실경로: 암호화 ref 저장(KMS 또는 로컬 키) + 조회 라우트(본인+권한자, step-up 필수) + 연봉계약 연결, masked_compensation_ref null 하드코딩 제거 | 비권한자 403·본인 조회 성공·step-up 없는 조회 거부 테스트 | A-04, D-09 |
| UPL-D-11 | self-service: 본인 레코드 소유권 검사(EmployeeUserLink 기반) — 일반 직원 역할로 본인 휴가·문서·프로필 접근, 전원 hr_admin 하드코딩 제거 | 일반 직원이 본인 데이터 조회 성공/타인 데이터 403 테스트 | A-03 |
| UPL-D-12 | 채용 CRUD 와이어링: recruiting.js·lifecycle.js(기존재)를 서버에 연결 + 생성 폼 UI + convert-to-employee → D-07 정본에 반영 | 공고→지원자→면접→offer→직원 전환 실서버 파이프라인 테스트(시드 아닌 신규 데이터) | A-07, D-07 |
| UPL-D-13 | 온보딩 게이트: 보안교육·서약 완료 전 matter 배정 차단(staffing-service에 온보딩 상태 조회 연동) | 미완료 직원 배정 시도 차단 테스트 | D-07 |
| UPL-D-14 | 오프보딩 보강: 담당 matter 재배정·인수인계 항목 추가, 계정 회수 수동 체크리스트(LX-11: 회수 확인 기록 필수) | 재배정 미완 시 close 차단 테스트(기존 게이트 확장) | D-07 |
| UPL-D-15 | HR Risk 감지 엔진: 법적 5종 우선(근로계약 미체결·연차촉진 대상·법정교육 미이수·초과근로 위험·퇴사자 권한 미회수) — 일일 스캔 잡+리스크 대시보드+이벤트 상태기계 | 각 규칙별 시드 시나리오→리스크 이벤트 생성 테스트 5건 | D-03·04·09·14 |
| UPL-D-16 | HR Assistant 실 RAG: 사규·취업규칙 본문 인덱스(E-01 검색 기반 또는 선행 시 단순 청크) + 실권한 결속(synthetic stub 제거 — 액터의 조회 가능 범위로 검색 필터) + A-12 게이트웨이 | "AI 답변 범위 ≤ 사용자 조회 범위" 테스트(비권한 문서 인용 0), 하드코딩 템플릿 제거 확인 | A-12, D-11 |

## §6 Phase E — 차별화·완성(내부용 축소판) · 10 TUW

| ID | 작업 | 완료 기준(테스트) | 의존 |
|---|---|---|---|
| UPL-E-01 | 전문검색: 문서 본문 추출(docx/pdf 텍스트)+인덱스(9인 규모 권고: SQLite FTS5, 대안 OpenSearch)+권한 필터 검색 API+검색 UI | 본문 키워드 검색 hit, 비권한 문서 결과 제외 테스트 | A-10 |
| UPL-E-02 | OCR: 스캔 PDF 텍스트 추출 파이프라인(RP07 유보 해제 결정 포함) → E-01 인덱스 투입 | 스캔 문서 검색 가능 E2E | E-01 |
| UPL-E-03 | 이메일 AI(컨셉 OUT-5): filing된 스레드 요약+task/deadline 후보 추출→리뷰 큐→변호사 승인 시 생성 | 후보→승인→matter 반영 E2E, 승인 없는 자동 생성 0 회귀 테스트 | A-12, C-10 |
| UPL-E-04 | Smart Alerts 1단계(경고만): 외부 수신자+기밀 문서 첨부, 첨부 누락 감지, 발송 개방과 동시 적용 | OnMessageSend 경고 발화 시나리오 테스트(발송 차단은 안 함, LX 프로파일) | C-12 |
| UPL-E-05 | Matter×People 결합 실체화: workload를 실 time entry 집계로 교체(하드코딩 시드 2행 제거), capacity 대시보드, 담당자 휴가↔기한 충돌 경고 | 시간기록 변경→workload 반영 테스트, 휴가 기간 내 deadline 경고 테스트 | B-02, D-01 |
| UPL-E-06 | 알림 인프라(경량): SES 이메일+인앱, 승인 대기·기한 임박·계약 만료·리스크 발생 | 이벤트→발송 기록 테스트(실발화 1회 영수증) | A-06 |
| UPL-E-07 | 관계 그래프 계층(경량): matter-people-document 관계 테이블+탐색 API(향후 지식층 기반) | 관계 왕복 조회 테스트 | D-07 |
| UPL-E-08 | Wave-2 재강화 트랙 정의: LX-01~12 각각의 재강화 TUW 골격 문서화(SSO/SCIM/DLP/월 스크리닝/멀티테넌시/펜테스트), 외판 전환 결정 시 착수 | 레지스터-TUW 매핑 문서 완성(계획 산출물) | 없음 |
| UPL-E-09 | 실브라우저 E2E 도입: Playwright + 5대 동선(개설/시간→청구/휴가/문서/포털) 회귀 스위트, 기존 정규식 '판독 E2E' 명칭 정비 | CI에서 5대 동선 headless 통과 | B·C·D 각 동선 완성분 |
| UPL-E-10 | 위생 일괄: 고아 서피스 13개 정리(마운트 or 제거), 하드코딩 배지 카운트 제거, hrx 시드 불일치 테스트 1건 수정, 대시보드 상수 회귀 grep 게이트 | npm test 전건 green, 죽은 컴포넌트 0 | — |

## §7 실행 순서·의존 요약

```
[선행: 오너 결정 4건 + 기존 감사 Phase 0(실데이터 보호)]
Sprint 1  A-01~05 (인증·역할)  ∥  A-06~09 (DB·백업)        ← 전 트랙 차단 해제
Sprint 2  A-10~14 (문서·LLM·감사)  ∥  와이어링 수확 개시:
          B-01~06 (청구 체인) · D-01~03 (결재+연차엔진) · C-06~07
Sprint 3  B-07~10 (숫자 신뢰) · C-01~05 (충돌검사) · D-04~08 (근태·직원 정본)
Sprint 4  C-09~12 (Outlook — 외부 리드타임이라 Entra 등록은 Sprint 1에 발주)
          B-11~13 (보수·신탁·세금계산서) · D-09~12
Sprint 5  C-13 (포털) · D-13~16 (게이트·리스크·RAG) · B-14~17
Sprint 6  E-01~10
외부 리드타임 즉시 착수: Entra 앱 등록(C-09), 세금계산서 벤더(B-13), (Wave-2 대비) 펜테스트 견적
```

총 70 TUW (A 14 · B 17 · C 13 · D 16 · E 10). 이 중 **와이어링 수확형 18건**(B-02~06·14·15, C-03·05·10, D-01·07·08·09·12 일부 등)은 함수+테스트가 기존재해 상대 비용이 낮다.

## §8 검증 규율 (상시)

- 모든 TUW 완료 판정은 실서버 기동 테스트 또는 실브라우저 E2E, 외부 연동은 샌드박스 영수증. 파일 정규식 판독 테스트는 완료 근거로 불인정.
- "그럴듯한 오답" 회귀 게이트: 대시보드 상수·가짜 aging 버킷·허위 히트 0건·즉석 clearance 같은 확인된 결함은 재발 차단 테스트를 TUW 완료 기준에 포함(B-07·08, C-02·04에 명시).
- 완료 보고 시 [직접 재실행]/[에이전트 보고] 출처 구분 유지.

---

## §9 Codex 구현 완료현황 검증 (2026-07-03)

검증 방식: 11개 클러스터 병렬 재검증(코드 판독 + 개별 테스트 실행 + Codex proof 스크립트 연출 판정), 판 좌우 3건은 Claude 직접 코드 재확인. Codex 주장은 "외부 receipt 필요분 제외 전부 완료". **판정: 100% 아님.**

집계(80건 세분 판정): **DONE 44 · PARTIAL 27 · THEATER 4 · MISSING 2 · EXTERNAL_BLOCKED 3.**

### §9.1 실제로 완료된 것 (Codex의 진짜 성과)

- **인증 프리미티브 실체:** A-01 서명 세션 토큰(HMAC-SHA256·timing-safe·TTL), A-04 step-up HMAC+TOTP(30초 윈도우·±1 skew·5분 TTL·실강제), A-14 로그인 5회 잠금 — 전부 `session-auth-api.test.js` 실행 테스트 통과.
- **ERP 청구 트랙(가장 강함):** finance 라우트 7개→약 26개 실증설. B-01·03·05·06 청구 사이클, B-07 due_date+실 AR aging(가짜 버킷 제거), B-08 대시보드 실집계(상수 400000/87/32 제거), B-09 클라이언트별 수익성, B-11 보수유형, B-12 신탁·선수금 원장, B-14~17 전부 DONE. proof가 startApiServer+실 HTTP.
- **CRM 신뢰 사이클:** C-01 상대방 모델, C-02 충돌 실검색(허위 히트0 회귀 실차단, 상대방→실히트1), C-04 clearance 서버 원장 대사(위조 토큰 400 차단), C-06 실클라이언트 99건 단일화, C-07 contact 원값 — DONE.
- **HRX 백엔드:** D-01 결재 루프+원장 차감, D-02 직무분리, D-05 주52시간, D-07 직원 정본화, D-08 조직, D-09 문서 수명주기, D-13 온보딩 게이트, D-15 HR Risk 감지 5종 — DONE.
- **proof 체계 무결성:** run-upl-* proof는 대부분 실행형(Playwright ^1.60 실설치, 실 API 서버, 실 파일 왕복). "전부 연출" 최악 가설은 반증됨.

### §9.2 완료 아님 — 조치 필요 (심각도순)

**[치명·THEATER] UPL-A-02 자기주장 헤더 제거 실패** — 세션 인증은 붙였으나 **강제되지 않음.** `server.js:697-698`이 무토큰 요청 시 클라이언트 `x-lawos-permission-context`(임의 principal+effect:allow action:*)로 폴백한다. `requireSessionToken:true`는 `/api/auth/session`·`/api/auth/step-up` 두 엔드포인트에만 적용, 모든 업무 라우트는 폴백 개방. **직접 코드확인 + 에이전트 실재현:** 무토큰+위조컨텍스트 → `/api/profile/me` 200(actor='attacker'), 무세션+자가주장 role → `/api/hrx/employees` 200. **웹 UI 전체가 이 자가주장 경로 위에서 동작**(웹은 `/api/auth/login`을 호출하지 않음). 부정 테스트는 "세션 존재 시 위조 무시"만 검증하고 우회 경로(무토큰+위조헤더)를 테스트하지 않아 완료를 가장. A-13 감사 무결성·A-03·A-05·B-02/B-04 파트너게이트·D 전체 authz가 이 게이트에 의존하므로 **최우선 재작업.**

**[MISSING] UPL-A-11 문서 업로드 UI 부재** — 웹 `<input type=file>` 0건, VaultSurface가 '버전 등록 차단' 하드코딩. A-10도 PARTIAL(multipart 아닌 base64 JSON, 기본 어댑터 인메모리). **문서를 넣지도 못하는데 매트릭스는 PASS 기재**: 외부 receipt와 무관한 순수 내부 미완.

**[MISSING] UPL-E-04 Smart Alerts 구현·proof 전무** — Codex 자체 E-10 위생 아티팩트가 스스로 PARTIAL 자인. 스크립트 0건. 외부 의존 없는 순수 내부 기능이므로 "외부분 제외 전부 완료" 주장의 명백한 반례.

**[THEATER] UPL-E-02 OCR** — `ocr_runtime_executed=true`는 테스트가 넣은 텍스트를 그대로 저장하는 가짜 플래그. 이미지→텍스트 라이브러리 0건.

**[PARTIAL 다수 — 라벨이 실체를 과장]**
- A-06 "durable DB" = 실 DB 아닌 JSON 파일(atomic rename), 기본 경로 tmpdir. **오너 DB 결정 미확정(artifact가 `external_production_database_decision_claim:false` 자인).** 전 도메인 공통 기반 격차.
- A-12/D-16 "실 LLM" = 로컬 Ollama(gemma4:12b)이며 **기본 비활성**(`LAWOS_MODEL_GATEWAY_ENABLED` 미설정 시 HR Assistant가 하드코딩 템플릿 `localGroundedAnswer`로 폴백). Ollama 기동 시에만 실모델.
- D-12 채용·D-14 오프보딩 = `hrx-runtime-context.js`의 jobOpenings/candidates/applications/interviews/offers/onboardingPlans/offboardingCases가 **여전히 in-memory 시드 배열**(재시작 소실) — D-07 restart 생존 기준과 불일치.
- D-03 연차 accrual 계산기 = 여전히 테스트 전용 죽은 코드(승인 경로 미연결). D-04 근태·근무일정 UI 부재(백엔드만). D-10 "암호화 ref" = 실 KMS 아닌 `local-kms://` 문자열.
- E-01 검색 = FTS5 아닌 `String.includes`(라벨 `sqlite_fts5_ready`는 열망). E-03 이메일 "AI" = 규칙기반 템플릿(LLM 아님, 미배선). E-05 workload = 하드코딩 3행 시드. E-06 알림 = outbox 시뮬(실 SES 전송 0). E-07 그래프 = 하드코딩 7노드 픽스처.
- C-05 서명본 "업로드" = 실 바이트 저장 아닌 sha256 메타데이터 원장(caller 입력 신뢰). C-09 Outlook = manifest.xml만 실재, MSAL/Office.js/OnMessageSend 핸들러 0줄(browser proof는 Outlook 밖 순수 SPA).

**[EXTERNAL_BLOCKED — 코드는 완료, 외부만 잔여]** B-13 전자세금계산서(내부 3.3% 원천징수 DONE, 벤더 샌드박스 receipt만), A-12 로컬 모델(Ollama 기동 receipt), C-09 Outlook Entra 등록.

### §9.3 검증층 자체의 취약

- **validate-upl-* 32개 전부 판독형**(소스 `assert.match` + proof JSON `verdict:PASS` 재열람, 런타임 미재실행). proof JSON 손편집·문자열만 남은 리팩터에도 통과 → "이중 안전장치" 부재. 신뢰의 뿌리는 run-upl-* 개별 재실행뿐.
- **browser proof 5건(c02/c03/c04/c05/c08)이 `/api/**` 전량 mock** — 프런트 렌더만 검증, 서버 로직 미검증인데 'browser proof'로 라벨.
- **모든 proof가 allow-all 자가주장 컨텍스트를 심고 실행** → A-02 우회 경계를 어떤 proof도 반증하지 못함(우회는 증거 체계 밖).

### §9.4 권고 재작업 순서

1. **A-02 강제 모드**(최우선): 무세션 시 자가주장 폴백 제거 또는 fail-closed 세션 강제 플래그를 `server.js:692` 경로에 도입 + 웹을 `/api/auth/login`·세션 bearer로 전환 + 무토큰 우회 부정 테스트 추가. (A-03/A-05/A-13·B-02/B-04·D authz 동반 해소)
2. **A-11 문서 업로드 UI** + A-10 multipart·파일 백엔드 기본화.
3. **E-04 Smart Alerts** 구현 또는 Wave-1 범위에서 공식 제외 결정.
4. **D-12/D-14 durable 승격**(in-memory 시드 → 파일/DB 스토어).
5. 라벨 정직화: OCR/FTS5/AI/알림 firing의 실체 축소를 코드·문서에 반영(과장 표기 시정).
6. 오너 DB 결정(A-06) 확정 → JSON 파일에서 실 스토어로.
7. validate-* 검증층을 execution-form으로 전환(판독형 제거).
