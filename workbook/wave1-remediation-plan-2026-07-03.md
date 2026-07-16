# Wave-1 완료 마무리(Remediation) 계획 — 2026-07-03

기반: `workbook/wave1-internal-uplift-tuw-backlog-2026-07-02.md` §9 검증(DONE 44·PARTIAL 27·THEATER 4·MISSING 2·EXTERNAL_BLOCKED 3). 이 문서는 "완료 아님"으로 판정된 36건을 **테스트 가능한 수정 TUW(FIX-*)**로 재분해한다. 구현·커밋은 Codex.

## §0 규율

- 완료 기준은 전부 `run-*` **실행형 proof**(startApiServer+fetch, 실 파일 왕복, 실 브라우저) 또는 실행 테스트로만 인정. `validate-*` 판독형·proof JSON 재열람은 완료 근거 불인정(§검증 부채 FIX-V가 이를 교정).
- 각 FIX는 원인(현 상태 file:line) → 조치 → 완료 기준(테스트) → 의존 순.
- 라벨 정직성: 실체가 축소된 기능은 코드·아티팩트의 과장 라벨(`durable`/`fts5`/`ocr_runtime_executed`/`AI`/`firing`)을 실체에 맞게 시정하는 것을 완료 기준에 포함.
- 9인 내부 프로파일 유지: LX 레지스터 느슨화는 그대로. 단 §1 P0은 프로파일과 무관한 "타협 불가·순수 미완"이라 우회 불가.

## §1 P0 — 블로커 (다른 트랙 신뢰가 여기 의존)

### FIX-A02 — 자기주장 헤더 폴백 제거·세션 강제 (THEATER → DONE)
- **원인:** `apps/api/src/server.js:697-698`이 무토큰 요청을 `parsePermissionContext(x-lawos-permission-context)`로 폴백. `requireSessionToken:true`는 auth 2개 엔드포인트에만(`session-auth.js:335,357`). HRX도 무세션 시 `x-lawos-actor-id/role/hrx-scopes` 자가주장 헤더 통과(`hrx-authz.js`). 웹 전체가 세션 대신 자가주장 헤더로 동작(`apiClient.js:140-216` 하드코딩 role 번들 41개 호출부).
- **조치:**
  1. `server.js:692` 요청 경로에 fail-closed 세션 강제: health·auth 외 전 라우트는 유효 세션 principal이 있을 때만 인가, 없으면 401. `parsePermissionContext` 폴백 경로 삭제(또는 `LAWOS_SESSION_REQUIRED=1` 기본 on, 로컬 개발용 opt-out만 허용하되 프로덕션/데스크톱 번들에선 강제).
  2. `requestHeaders()`(`server.js:699-714`)에서 무세션 시 actor/role/scope 헤더도 제거(현재 session-bound만 삭제).
  3. 웹 전환: `apiClient.js`가 `/api/auth/login`으로 세션 토큰 취득 후 `Authorization: Bearer` 전송, 하드코딩 role 번들·PERMISSION_CONTEXT_HEADER 직렬화 제거.
- **완료 기준(실행 테스트):**
  - 신설 부정 테스트: 무토큰+위조 `x-lawos-permission-context` → `/api/profile/me` **401**(현재 200), 무세션+`x-lawos-actor-role:*` → `/api/hrx/employees` **401**(현재 200).
  - 웹 E2E: 로그인 없이 `?view=` 직행 시 데이터 라우트 401, 로그인 후 세션 bearer로 정상.
  - 기존 5대 동선 proof가 세션 경로로 재통과(자가주장 컨텍스트 제거 후에도 green).
- **의존:** 없음(최우선). 해소 시 A-03·A-05·A-13·B-02·B-04·D 전체 authz 신뢰 회복.

#### 2026-07-03 구현 상태
- **상태:** DONE for FIX-A02 trust-boundary slice. Wave-1 전체 완료 주장은 아님.
- **서버 경계:** `apps/api/src/server.js`에서 health/auth 외 업무 라우트는 signed session 없으면 401 fail-closed. `x-lawos-permission-context` 폴백 제거. client-supplied HRX actor/role/scope 헤더는 signed session 경로로만 의미를 갖는다.
- **세션 권한:** `apps/api/src/session-auth.js`, `packages/authz/src/trust-context.js`, `apps/api/src/lawos-role-registry.js`에서 등록 계정 tenant alias와 HRX 운영 scope를 signed principal 기반으로 정리.
- **웹 경로:** `apps/web/src/data/apiClient.js`, `apps/web/src/people/hrxApiClient.ts`, `apps/web/src/App.jsx`, `apps/web/src/components/AuthSurface.jsx`가 `/api/auth/login` 세션 토큰을 받아 `Authorization: Bearer`로 전송하고, unsigned permission/tenant/actor/role/scope 헤더를 제거한다.
- **부정 테스트:** `apps/api/test/session-auth-api.test.js`에 무토큰+위조 `x-lawos-permission-context` 및 무세션+위조 HRX actor/role/scope 요청이 401 `AUTH_SESSION_REQUIRED`로 막히는 회귀 테스트 추가.
- **증거:** `artifacts/manual-qa/upl-a02-signed-session-browser-proof-2026-07-03.json` / `.md`가 실제 브라우저 로그인 후 `/api/profile/me` 요청에서 Authorization header 존재, `x-lawos-permission-context` 부재, token non-rendering을 PASS로 기록.

### FIX-A11 — 문서 업로드 UI·경로 (MISSING → DONE) + A-10 multipart
- **원인:** 웹 `<input type=file>` 0건, VaultSurface '버전 등록 차단' 하드코딩. A-10은 base64 JSON(멀티파트 아님), 기본 어댑터 인메모리(재시작 비생존).
- **조치:** 웹 VaultSurface에 실 파일 입력+버전 등록 활성화 / A-10에 multipart 파서 도입, 기본 스토리지 어댑터를 파일 백엔드로 승격(인메모리 Map은 테스트 전용).
- **완료 기준:** 브라우저 E2E — UI 파일 선택→업로드→버전 목록 표시→다운로드 sha256 일치. 서버 재기동 후 다운로드 생존(실행 테스트).
- **의존:** A-06 스토리지 결정(오너②)과 정합.

#### 2026-07-03 구현 상태
- **상태:** DONE for FIX-A11/A10 bounded upload slice. A-06 장기 DB 결정과 별개로 현재 runtime은 file-backed DMS repository와 file object store를 사용한다.
- **서버 경계:** `apps/api/src/server.js`가 `multipart/form-data`를 읽고 파일 파트를 base64 payload로 정규화한다. `apps/api/src/vault-dms-runtime-context.js`는 `POST /api/vault/documents/upload` alias를 기존 DMS `uploadDocument` 경로에 연결한다.
- **웹 경로:** `apps/web/src/components/VaultSurface.jsx`에 실제 `<input type="file">` 기반 `VaultDocumentUploadPanel` 추가. `apps/web/src/data/apiClient.js#uploadVaultDocumentFile`은 `FormData`를 보내고 signed session `Authorization` 경로를 유지한다.
- **증거:** `artifacts/manual-qa/upl-a11-vault-upload-browser-proof.json` / `.md` 및 `artifacts/manual-qa/screenshots/upl-a11-vault-upload-browser-proof.png`가 실제 브라우저 로그인→파일 선택→업로드→UI receipt→다운로드 sha256 일치→API 재시작 후 다운로드 sha256 일치를 PASS로 기록.
- **회귀 복구:** 같은 DMS upload/download 경로를 쓰는 `scripts/run-upl-b16-invoice-pdf-dms-hash-proof.mjs`도 signed-session 경로로 이관했고 `artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json` PASS를 재생성했다.

### FIX-E04 — Smart Alerts 구현 (MISSING → DONE)
- **원인:** 구현·proof 0건. Codex E-10 아티팩트가 PARTIAL 자인. 외부 의존 없는 순수 내부 기능.
- **조치:** 결정 필요 — (a) 구현: 발송 전 경고(외부 수신자+기밀 문서, 첨부 누락) 룰 + `run-upl-e04-*` 실행형 proof, 또는 (b) Wave-1 범위에서 공식 제외를 LX 레지스터에 등재(외판 시 재개).
- **완료 기준:** (a) 경고 발화 시나리오 실행 테스트, 또는 (b) 레지스터 제외 결정 기록.
- **의존:** C-09/C-12 on-send 트리거(발송 이벤트)와 연계 — Outlook 없으면 taskpane 수동 트리거로 범위 축소.

#### 2026-07-03 구현 상태
- **상태:** DONE for bounded local FIX-E04. C09 외부 Outlook web/new desktop/Entra runtime receipt는 여전히 별도 external blocker다.
- **서버 경계:** `apps/api/src/outlook-addin-runtime-context.js`의 `POST /api/outlook/smart-alerts/evaluate`가 외부 수신자+기밀 첨부, 첨부 언급 후 첨부 없음 룰을 warning-only로 평가한다. 응답은 `send_blocked:false`, `provider_runtime_executed:false`, 본문/첨부 바이트/credential 미포함, request/response hash 기반 receipt에 맞춘 안전 메타데이터만 포함한다.
- **taskpane 경계:** `apps/addin/src/main.jsx`는 더 이상 `x-lawos-permission-context`를 보내지 않고 `lawos_addin_session_token` sessionStorage/OfficeRuntime storage 값을 `Authorization: Bearer`로 사용한다.
- **증거:** `artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json` / `.md` 및 `artifacts/manual-qa/screenshots/upl-e04-smart-alerts-local-proof-2026-07-03.png`가 실제 브라우저 taskpane에서 signed session Authorization header 관찰, legacy permission-context 미전송, 기밀 첨부 경고, 첨부 누락 경고, 정상 메일 no-warning, forged legacy header 401, 원문/첨부 바이트 미포함을 PASS로 기록한다.
- **validator:** `scripts/validate-upl-c09-c12-outlook-addin.mjs`가 C09-C12 local browser proof와 E04 전용 receipt를 함께 검증하되, external Outlook runtime PASS는 주장하지 않는다.

## §2 P1 — 순수 내부 미완 (프로파일 무관, durability/강제 미달)

### FIX-D12/14 — 채용·오프보딩 durable 승격 (PARTIAL → DONE)
- **원인:** `hrx-runtime-context.js:1718-1728`의 jobOpenings/candidates/applications/interviews/offers/onboardingPlans/offboardingCases가 in-memory 시드 배열 → 재시작 소실. D-07 restart 생존 기준과 불일치.
- **조치:** 9개 도메인을 파일/DB 스토어(A-07 패턴)로 승격, 마이그레이션 테이블 추가.
- **완료 기준:** 각 도메인 쓰기→재시작→조회 생존 실행 테스트(hrx-durable-runtime 확장).

#### 2026-07-03 구현 상태
- **상태:** DONE for D12/D14 durable slice.
- **스토어 경계:** `packages/hrx/src/store/port.js`, `packages/hrx/src/store/file-store.js`, `packages/hrx/src/migrations/006_hrx_recruiting_lifecycle.sql`에 recruiting/lifecycle durable tables 추가. `scripts/validate-hrx-persistence.mjs` 출력도 새 workflow tables를 포함하도록 갱신.
- **runtime 결선:** `apps/api/src/hrx-runtime-context.js`가 `hrx_job_openings`, `hrx_candidates`, `hrx_candidate_consents`, `hrx_applications`, `hrx_interviews`, `hrx_offers`, `hrx_onboarding_plans`, `hrx_offboarding_cases`를 시작 시 file store에서 로드하고 API create/update/close 경로에서 insert/update한다.
- **증거:** `apps/api/test/hrx/durability.test.js`의 `HRX recruiting and lifecycle writes survive runtime reopen`이 `handleHrxApiRequest` write→store reopen→pipeline/onboarding/offboarding readback을 PASS로 검증한다. `artifacts/manual-qa/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.json` / `.md`는 실제 signed-session API 서버 write→서버 종료→동일 `hrx-store.json` 재시작→readback 생존을 PASS로 기록한다.

### FIX-D03 — 연차 accrual 계산기 승인경로 연결 (PARTIAL → DONE)
- **원인:** `packages/hrx/src/rules/leave-policy.js:69-82`의 calculateLeaveAccrual·근속 자동가산·evaluateLeaveUsage·carryover가 비테스트 코드에서 호출 0건(죽은 코드).
- **조치:** leave request-service 승인 경로에 evaluateLeaveUsage(잔여 음수 차단) 결선, 근속 기반 자동 발생 배치 잡, 연말 이월 처리.
- **완료 기준:** 근기법 60조 산식 단위 테스트(1년미만 월1일/1년 15일/근속가산), 잔여 초과 신청 거부, 이월 배치 실행 테스트.

#### 2026-07-03 구현 상태
- **상태:** DONE for D03 rule-engine and approval-path slice.
- **승인 결선:** `packages/hrx/src/leave/request-service.js`의 approval path가 `policyResolver`로 leave policy를 해석하고 `evaluateLeaveUsage`를 호출한다. 정책 resolver가 없는 기존 호출자는 기존 잔여 차감 guard를 유지한다.
- **runtime 결선:** `apps/api/src/hrx-runtime-context.js`가 seed policy registry를 `createLeaveRequestService`에 주입하므로 `/api/hrx/...approve` 경로도 동일한 policy 판정을 사용한다.
- **증거:** `apps/api/test/hrx/leave.test.js`가 bounded negative balance 허용 정책과 strict policy 차단을 모두 검증한다. `artifacts/manual-qa/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.json` / `.md`는 근기법 60조 산식, earned/carryover 원장 엔트리, flexible approval ledger debit, strict policy pre-debit block을 PASS로 기록한다.

### FIX-D04/06 — 근태·근무일정 프런트엔드 (PARTIAL → DONE)
- **원인:** 백엔드(라우트+테이블)만 존재, `apps/web/src`에 attendance/overtime/schedule/calendar 컴포넌트 0건, hrxApiClient 근태 fetch 함수 없음. peopleFeatureCatalog는 메뉴 텍스트뿐.
- **조치:** 근태 조회·근무일정 캘린더 UI + hrxApiClient 근태 함수. D-06 실데이터 표시(익명 라벨 제거).
- **완료 기준:** 브라우저 E2E — 출퇴근 기록→월별 집계 표시, 휴가 신청 시 영업일 자동 계산 표시.

#### 2026-07-03 구현 상태
- **상태:** DONE for D04/D06 attendance/work-schedule UI slice.
- **웹 경계:** `apps/web/src/people/attendance/AttendanceWorkspace.tsx`가 월 필터, 구성원 ID, 실제 attendance POST form, 월별 summary strip, 기록 table, 근무표 calendar, 초과근로 risk panel을 제공한다. `people-attendance-records`, `people-work-schedule`, `people-current-work-status` 섹션은 placeholder 대신 이 실제 화면으로 연결된다.
- **API client:** `apps/web/src/people/hrxApiClient.ts`에 `fetchHrxAttendance`, `createHrxAttendanceRecord`, `correctHrxAttendanceRecord`, `fetchHrxOvertimeRisk` 추가. 기존 signed-session `requestJson` 경로를 사용하며 unsigned permission/actor/role header를 보내지 않는다.
- **증거:** `artifacts/manual-qa/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.json` / `.md` 및 `artifacts/manual-qa/screenshots/upl-d04-d06-hrx-attendance-browser-proof.png`가 실제 브라우저 로그인→근태 화면→record 생성→월별 summary 반영→calendar 표시→overtime risk signed-session API 호출을 PASS로 기록한다.

### FIX-D10 — Compensation 실 암호화 (PARTIAL → DONE)
- **원인:** `masked_compensation_ref` null은 제거됐으나 "암호화 ref"가 `local-kms://` 문자열(실 crypto/KMS 미구현).
- **조치:** 실 암호화(로컬 키 또는 KMS) + 복호 경로. 9인 프로파일에선 로컬 대칭키 허용(Wave-2 KMS 재강화 경로 LX에 기록).
- **완료 기준:** 저장→암호문 확인→step-up 권한자만 복호 조회 실행 테스트, 비권한자 403.

#### 2026-07-03 구현 상태
- **상태:** DONE for local-key AES-256-GCM compensation encryption boundary.
- **도메인 경계:** `packages/hrx/src/compensation.js`가 `lawos-comp-v1` AES-256-GCM envelope를 생성/검증/복호하며, `encrypted_amount_ref`에는 더 이상 `local-kms://` 문자열 fixture를 허용하지 않는다. visible record는 `compensation_ref_hash:<digest>`만 노출하고 암호문 envelope는 반환하지 않는다.
- **API 경계:** `GET /api/hrx/compensation`는 signed session + compensation step-up에서 masked hash만 반환한다. `GET /api/hrx/compensation/:compensation_id/decrypt`는 동일한 signed session, `hrx.compensation.read` scope, HRX step-up, self-service ownership guard 뒤에서만 authorized amount payload를 반환한다.
- **감사 경계:** 복호 성공은 `hrx.compensation.decrypt` audit event로 남지만 audit metadata에는 key ref hashable identifier만 있고 원문 금액/암호문 ref는 포함하지 않는다.
- **증거:** `artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.json` / `.md`가 실제 API 로그인→step-up 없는 read/decrypt 403→step-up read masked hash→step-up decrypt→audit 검증을 PASS로 기록한다. artifact에는 Authorization header, session/step-up token, raw amount, encryption envelope, legacy `local-kms://` ref를 쓰지 않는다.
- **한계:** 이는 Wave-1 9인 내부 프로파일용 로컬 키 경계이다. 외부 KMS/HSM 키 관리, key rotation, production payroll export는 별도 Wave-2/LX 재강화 항목으로 둔다.

### FIX-D11 — self-service 소유권 강제 (PARTIAL → DONE)
- **원인:** FIX-A02에 종속 — 무세션 자가주장으로 소유권 검사 우회 가능. 본인 레코드 검사가 세션 principal에 결속돼야 유효.
- **조치:** FIX-A02 완료 후 EmployeeUserLink 기반 소유권 검사를 세션 principal로 결속.
- **완료 기준:** 일반 직원 세션이 본인 데이터 200/타인 403 실행 테스트.
- **의존:** FIX-A02.

#### 2026-07-03 구현 상태
- **상태:** DONE for signed-session self-service ownership proof.
- **API 경계:** staff signed session(`lawos_staff`)은 `/api/hrx/employees`에서 본인 `emp_amic_yjlee`만 받고, 본인 employee/documents/leave는 200, 타인 employee/documents/leave는 403 `HRX_SELF_SERVICE_SCOPE_DENIED`가 된다. staff에게 미부여된 attendance/compensation/audit scope는 route-authz에서 403으로 차단된다.
- **우회 방지:** 같은 staff Bearer session에 `x-lawos-actor-id`, `x-lawos-actor-role`, `x-lawos-hrx-scopes`를 위조해도 서버가 signed principal을 우선하여 타인 employee 조회를 403으로 차단한다.
- **웹 경계:** 브라우저 로그인 후 People 화면의 HRX requests는 `Authorization`을 보내고 legacy `x-lawos-permission-context`/actor/role/scope self-assertion headers를 보내지 않는다. 화면에는 staff 본인 데이터만 보이고 타인 이름은 렌더링되지 않는다.
- **증거:** `artifacts/manual-qa/upl-d11-hrx-self-service-session-proof-2026-07-03.json` / `.md` 및 `artifacts/manual-qa/screenshots/upl-d11-hrx-self-service-session-proof.png`가 API + browser signed-session proof를 PASS로 기록한다. artifact는 Authorization 값, session token, password를 저장하지 않는다.

### FIX-D13 — 온보딩 게이트 보편 강제 (PARTIAL → DONE)
- **원인:** plan별 opt-in(보안교육/서약 키워드 또는 matter_assignment_gate=true 필요). 태스크 없는 legacy plan은 통과.
- **조치:** 전 신규 입사자에 교육·서약 완료 게이트 기본 적용(예외는 명시 waiver).
- **완료 기준:** 게이트 미완 직원 matter 배정 시도 차단 실행 테스트(예외 없는 기본 경로).

#### 2026-07-03 구현 상태
- **상태:** DONE for default onboarding matter-assignment gate.
- **도메인 경계:** `packages/hrx/src/onboarding.js`가 모든 onboarding plan에 `default-security-training` 및 `default-confidentiality-pledge` 태스크와 `matter_assignment_gate`를 기본 주입한다. 게이트는 명시 waiver ref가 없는 한 두 태스크 완료 전까지 `HRX_ONBOARDING_GATE_INCOMPLETE`로 matter assignment를 차단한다.
- **배정 경계:** `packages/hrx/src/assignment.js`의 `createHrxMatterAssignment`는 `evaluateOnboardingMatterAssignmentGate` / `assertOnboardingMatterAssignmentAllowed`를 통과한 경우에만 matter assignment를 생성한다. 온보딩 계획 자체가 없으면 `HRX_ONBOARDING_GATE_PLAN_REQUIRED`로 차단한다.
- **Matter staffing 경계:** `packages/matter/src/staffing-service.js`가 HRX plan의 `matter_assignment_gate.required_task_ids`를 우선 읽고, 더 이상 텍스트 키워드에서 만든 옛 `security-pledge` id를 새 plan에 적용하지 않는다.
- **예외 경계:** waiver는 `matter_assignment_gate_waiver_ref` 또는 호출 시 `waiver_ref`로만 명시 가능하며, proof에서는 waiver ref 원문 대신 hash를 남긴다.
- **증거:** `artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.json` / `.md`가 missing-plan, empty-plan, partial-plan 차단과 completed-plan, waiver 허용을 PASS로 기록한다.

### FIX-C05 — engagement 서명본 실 바이트 저장 (PARTIAL → DONE)
- **원인:** `packages/intake/src/engagement-service.js:36-60`이 sha256·byte_size를 caller 입력으로 신뢰, 실 파일 저장 없음.
- **조치:** A-10/A-11 문서 바이트 경로에 서명본 실저장, 서버측 해시 재계산 검증.
- **완료 기준:** 서명 PDF 업로드→저장→해시 서버 재계산 일치→engagement 승인 실행 테스트.
- **의존:** FIX-A11.

#### 2026-07-03 구현 상태
- **상태:** DONE for signed engagement document byte storage and server hash verification.
- **서비스 경계:** `packages/intake/src/engagement-service.js`가 `signed_document_upload.bytes_base64` 또는 top-level `signed_document_bytes_base64`를 받으면 DMS `uploadDocument`를 호출하고, 서버가 bytes에서 계산한 sha256/byte_size를 `EngagementSignedDocumentUpload` 및 `Engagement.signed_document_sha256`의 source of truth로 저장한다.
- **DMS 경계:** `apps/api/src/crm-intake-runtime-context.js`와 `apps/api/src/server.js`가 CRM Intake runtime에 Vault DMS repository/storage를 주입한다. API `POST /api/intake/engagements`는 signed session 뒤에서 DMS file object를 생성하고, storage readback hash가 engagement ledger hash와 일치해야 PASS다.
- **위조 차단:** caller가 `content_sha256`을 제출하더라도 signed bytes의 서버 sha256과 다르면 approval 전에 400 blocked가 된다. raw/base64 bytes, storage pointer, Authorization/session token은 proof artifact에 기록하지 않는다.
- **증거:** `artifacts/manual-qa/upl-c05-engagement-documents-proof.json` / `.md`가 unsigned/no-upload/forged-hash/no-engagement clearance 차단, signed PDF bytes DMS 저장, downloaded DMS object hash 일치, clearance ledger reconcile을 PASS로 기록한다.

## §3 P2 — 라벨 정직화·차별화 실체 (E 트랙, 9인 프로파일에선 단계적)

각 항목은 "실체 구현" 또는 "라벨 시정" 중 오너 선택. 9인 내부용에서 즉시 실체가 과하면 라벨만 정직화하고 실체는 Wave-1.5로 이연 가능(단 아티팩트의 거짓 플래그는 반드시 시정).

| ID | 현 실체 | 완료 옵션 A(실체) | 완료 옵션 B(라벨 시정, 최소) |
|---|---|---|---|
| FIX-E01 검색 | DONE: `String.includes` + JSON 실체를 `json_substring_search`로 정직화 | 실 FTS5 색인 도입은 Wave-1.5 후보 | DONE: `sqlite_fts5_ready` 과장 라벨 제거 |
| FIX-E02 OCR (THEATER) | DONE: caller-supplied sidecar text만 색인하고 `ocr_runtime_executed=false`로 정직화 | tesseract/사이드카 실 OCR runtime은 Wave-1.5 후보 | DONE: 가짜 실행 플래그 제거, signed-session browser/API proof 생성 |
| FIX-E03 이메일 AI | DONE: filed email -> rule-based summary/task/deadline candidates -> lawyer approval -> matter/task/deadline materialization | 로컬/외부 LLM 연동은 Wave-1.5 후보 | DONE: `rule_based_triage`, `external_model_claim:false`로 정직화 |
| FIX-E05 workload | DONE: signed-session `/api/hrx/analytics`가 `time_entry_aggregation` workload와 leave-deadline conflict를 반환 | DONE: proof가 time-entry 추가 시 total/time-entry count 증가를 검증 | — |
| FIX-E06 알림 | DONE: required event classes가 in-app delivery + local SES-shaped record를 모두 생성 | 실 SES network send는 외부/provider receipt 후보 | DONE: `notification_simulated_local_recorder`, `external_aws_ses_network_call_made:false`로 정직화 |
| FIX-E07 그래프 | DONE: HRX assignments/employees/documents에서 runtime relationship table 생성 + 기존 restricted fixture 병행 | DONE: signed-session traversal API proof가 runtime source refs와 restricted redaction 검증 | — |
| FIX-C09 Outlook | LOCAL DONE: manifest/taskpane/API proof, signed-session filing/attachment/task/Smart Alerts, noninteractive MSAL bridge initialization, `Office.actions.associate("onMessageSendHandler", ...)`, and local handler probe completing `allowEvent:true` | external Outlook web/new desktop/Graph runtime receipt는 C09 external blocker로 유지 | DONE: 코드부 완료, Entra/Outlook 외부 receipt 전 strict external PASS 금지 |

**우선 권고(9인 내부):** E01/E02/E03/E06 라벨 정직화, E05 workload 실연동, E07 relationship table/traversal proof는 완료. C09는 컨셉 [A] 핵심이나 리드타임 큼 — Entra 등록(오너) 병행하며 코드부 착수.

## §4 P3 — 기반·검증 부채

### FIX-A06 — 저장 실체 결정·이전 (LOCAL DONE / EXTERNAL DB DECISION NOT CLAIMED)
- **원인:** "durable DB"가 JSON 파일(atomic rename), 기본 tmpdir, artifact가 `external_production_database_decision_claim:false` 자인. 전 도메인 공통 기반.
- **조치:** 오너 DB 결정 확정(권고: 9인이면 SQLite/WAL+일일 백업, Lambda 병행 시 RDS small) → persistence 포트 뒤 실 스토어 교체 → 도메인 마이그레이션.
- **완료 기준:** 전 도메인 durable restart + 동시 쓰기 정합 실행 테스트, `durable` 라벨이 실 스토어 지칭.
- **2026-07-03 상태:** 로컬 Wave-1 owner boundary는 `scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs`가 proof runner를 재실행하며 13개 도메인 file-backed durable store/migration roundtrip을 PASS로 검증한다. 단 `external_production_database_decision_claim:false`, `production_ready_claim:false`라서 SQLite/RDS 운영 DB 선정·이전 완료 주장은 하지 않는다.
- **주의:** B-cluster 인보이스 연번·부분입금 정합이 단일 프로세스 트랜잭션 가정에 의존 — DB 이전 시 연번 충돌·중복 매칭 재검증.

### FIX-V — 검증층 실행형 전환 (검증 부채)
- **원인:** `validate-upl-*` 32개 전부 판독형(소스 assert.match + proof JSON verdict 재열람). browser proof 5건(c02/c03/c04/c05/c08)이 `/api/**` 전량 mock(서버 로직 미검증). 모든 proof가 allow-all 자가주장 컨텍스트로 실행 → A-02 우회 미반증.
- **조치:**
  1. validate-*를 run-* proof를 실제 재실행해 exit code로 판정하는 execution-form으로 전환(문자열 판독 제거).
  2. c02/c03/c04/c05/c08 browser proof의 API mock 제거 → 실 서버 대상 UI E2E.
  3. **전 proof에 무세션/위조헤더 부정 케이스 추가**(FIX-A02 회귀 차단) — allow-all 컨텍스트 전제 제거.
- **완료 기준:** validate-* 실행 시 실제 런타임 재검증, 5건 browser proof가 실 서버 통과, 부정 케이스 포함.

#### 2026-07-03 구현 상태
- **상태:** LOCAL DONE for targeted remediation proof debt. 70-row authoritative matrix 전체 재판정이나 외부 receipt PASS 주장은 아니다.
- **실행형 validator:** `scripts/lib/upl-proof-runner.mjs`를 추가하고 A05/A08/B10-B17 local/C01-C08/C09 local/C13/E01-E10 및 외부 readiness validator가 해당 run/proof를 재실행하도록 확장했다.
- **브라우저 de-mock:** `scripts/run-upl-c02-conflict-search-browser-proof.mjs`, `run-upl-c03-conflict-review-browser-proof.mjs`, `run-upl-c04-clearance-ledger-browser-proof.mjs`, `run-upl-c05-engagement-documents-browser-proof.mjs`, `run-upl-c08-intake-completion-browser-proof.mjs`가 더 이상 `page.route("**/api/**")` mock으로 성공하지 않고 `startApiServer` + Vite + signed browser login + real repository readback으로 PASS한다.
- **C08 서비스 경계:** 실제 서버 proof에서 드러난 `new -> intake_requested` handoff 불일치를 `packages/crm/src/opportunity-service.js` stage machine에 반영했고, `packages/intake/test/runtime-services.test.js`에 new inquiry handoff regression을 추가했다. Matter 직접 개설 금지는 계속 유지된다.

## §5 외부 receipt 잔여 (코드 완료, EXTERNAL_BLOCKED — 오너 액션)

| ID | 코드 상태 | 외부 잔여 |
|---|---|---|
| B-13 세금계산서 | 3.3% 원천징수·TaxInvoice 배선 완료, Popbill 선택 및 local sandbox credential/corpNum staging 완료. `artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json`은 발행 전에도 prepared request hash, mgt key hash, 3.3% 원천징수 33,000원/순지급 967,000원, Popbill `remark3` 매핑을 원문 payload 없이 기록한다. 발행 실행/실패 시에도 provider probe 원문은 저장하지 않고 code/hash summary만 검증한다. | Popbill 테스트 인증서 준비 확인 후 `.env.popbill.local`에서 `POPBILL_ALLOW_SANDBOX_ISSUE=1`로 sandbox 발행 왕복 receipt 생성 |
| A-12 로컬 모델 | model-gateway·가드레일 배선 완료 | 로컬 Ollama(gemma4:12b) 기동 receipt + 기본 활성화 결정 |
| C-09 Outlook Entra | 코드부는 FIX-C09 local done: taskpane + noninteractive MSAL bridge initialization + `OnMessageSend` handler association/completion proof. | Entra 앱 등록·admin consent receipt, Outlook web taskpane smoke, new Outlook desktop smoke, Graph/M365 provider runtime receipt |

## §6 실행 순서·스프린트

```
S1 (블로커):  FIX-A02  →  FIX-D11·FIX-A13 신뢰 회복(A02 종속)
              ∥ FIX-A11(+A10 multipart)  ∥ FIX-E04 결정
S2 (내부완결): FIX-D12/14 durable · FIX-D03 accrual · FIX-D04/06 근태UI
              · FIX-D10 암호화 · FIX-D13 게이트 · FIX-C05 서명본
S3 (기반):    FIX-A06 DB 결정·이전(오너①)  →  B-cluster 연번/매칭 재검증
S4 (검증부채): FIX-V 실행형 전환 + browser proof de-mock + A02 부정케이스
S5 (차별화):  FIX-E02 플래그 제거(즉시) · E05·E07 실연동 · E01/E03/E06 라벨시정
              · FIX-C09 Outlook 코드부
외부 병행(지금 발주): B-13 벤더, C-09 Entra, A-12 Ollama 기동 결정
```

**핵심 판단:** S1의 FIX-A02가 keystone이다 — 이것 없이는 A-13 감사·B-02 파트너게이트·D 전체 authz·모든 proof의 신뢰가 성립하지 않는다. 9인 내부 프로파일에서도 "타협 불가"로 등재한 항목이므로 우회 불가. 나머지 MISSING 2건(A-11·E-04)은 프로파일과 무관한 순수 기능 공백이라 "완료" 선언 전 반드시 해소하거나 명시적으로 범위에서 제외 결정해야 한다.

## §7 오너 결정 필요 3건

1. **E-04 Smart Alerts:** 구현(FIX-E04a) vs Wave-1 범위 제외(FIX-E04b). 권고: on-send는 Outlook 종속이므로 taskpane 수동 경고로 범위 축소 구현.
2. **E 트랙 라벨 정직화 vs 실체:** E01/E02/E03/E05/E06/E07은 완료. 실 LLM 이메일 triage와 실 SES network send는 Wave-1.5 또는 외부 receipt 범위로 남김.
3. **A-06 DB:** SQLite/WAL(권고, 9인) vs RDS(Lambda 병행 시). 미결 시 전 도메인이 tmpdir JSON에 머묾.

## §8 2026-07-03 실행 로그

이번 실행은 `FIX-A02`, `FIX-A11/A10`, bounded local `FIX-E04`, `FIX-D12/D14`, `FIX-D03`, `FIX-D04/D06`, `FIX-D10`, `FIX-D11`, `FIX-D13`, `FIX-C05`, `FIX-E01/E02/E03/E05/E06/E07`, local `FIX-A06`, A08/B16 proof 회귀 복구, 그리고 `FIX-V`의 execution-form validator 확장 및 C02/C03/C04/C05/C08 real-server browser proof 전환을 닫았다. 단 Wave-1 70/70 PASS, public release/go-live, production DB 선정, Outlook/Entra external runtime, production tax invoice, 실 SES network send는 주장하지 않는다.

| 항목 | 상태 | 증거 |
|---|---|---|
| FIX-A02 자기주장 헤더 폴백 제거·세션 강제 | DONE | `apps/api/src/server.js`, `apps/api/test/session-auth-api.test.js`, `artifacts/manual-qa/upl-a02-signed-session-browser-proof-2026-07-03.json` |
| FIX-A11/A10 문서 업로드 UI·multipart·DMS bytes | DONE | `apps/web/src/components/VaultSurface.jsx`, `apps/api/src/server.js`, `apps/api/src/vault-dms-runtime-context.js`, `artifacts/manual-qa/upl-a11-vault-upload-browser-proof.json` |
| FIX-E04 Smart Alerts bounded local MVP | DONE | `apps/api/src/outlook-addin-runtime-context.js`, `apps/addin/src/main.jsx`, `apps/api/test/outlook-addin-api.test.js`, `artifacts/manual-qa/upl-e04-smart-alerts-local-proof-2026-07-03.json` |
| FIX-D12/D14 채용·온보딩·오프보딩 durable 승격 | DONE | `apps/api/src/hrx-runtime-context.js`, `packages/hrx/src/store/file-store.js`, `packages/hrx/src/migrations/006_hrx_recruiting_lifecycle.sql`, `artifacts/manual-qa/upl-d12-d14-hrx-recruiting-lifecycle-durability-proof-2026-07-03.json` |
| FIX-D03 연차 accrual 계산기 승인경로 연결 | DONE | `packages/hrx/src/leave/request-service.js`, `apps/api/src/hrx-runtime-context.js`, `apps/api/test/hrx/leave.test.js`, `artifacts/manual-qa/upl-d03-hrx-leave-accrual-approval-proof-2026-07-03.json` |
| FIX-D04/D06 근태·근무일정 UI | DONE | `apps/web/src/people/attendance/AttendanceWorkspace.tsx`, `apps/web/src/people/hrxApiClient.ts`, `apps/web/src/people/PeopleHome.tsx`, `artifacts/manual-qa/upl-d04-d06-hrx-attendance-browser-proof-2026-07-03.json` |
| FIX-D10 Compensation 암호화 | DONE | `packages/hrx/src/compensation.js`, `apps/api/test/hrx/compensation-encryption.test.js`, `artifacts/manual-qa/upl-d10-hrx-compensation-encryption-proof-2026-07-03.json` |
| FIX-D11 self-service 소유권 | DONE | `apps/api/test/hrx/route-authz.test.js`, `artifacts/manual-qa/upl-d11-hrx-self-service-session-proof-2026-07-03.json` |
| FIX-D13 기본 온보딩 게이트 | DONE | `packages/hrx/src/onboarding.js`, `packages/hrx/src/assignment.js`, `artifacts/manual-qa/upl-d13-hrx-onboarding-gate-proof-2026-07-03.json` |
| FIX-C05 engagement 서명본 실 바이트 저장 | DONE | `packages/intake/src/engagement-service.js`, `apps/api/src/crm-intake-runtime-context.js`, `artifacts/manual-qa/upl-c05-engagement-documents-proof.json`, `docs/lazycodex/evidence/matter-web/artifacts/upl-c05-engagement-documents-browser-proof.json` |
| FIX-E01/FIX-E02 검색·OCR 라벨 정직화 | DONE | `packages/dms/src/search/indexer.js`, `scripts/validate-upl-e01-vault-fulltext-search.mjs`, `scripts/validate-upl-e02-vault-ocr-search.mjs`, `artifacts/manual-qa/upl-e02-vault-ocr-search-browser-proof.json` |
| FIX-E03 filed-email review queue | DONE | `packages/matter/src/email-ai-matter-review-service.js`, `scripts/validate-upl-e03-filed-email-ai-review.mjs`, `artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json` |
| FIX-E05 workload time-entry aggregation | DONE | `packages/matter/src/hrx-workload-projection.js`, `scripts/validate-upl-e05-workload-time-entry.mjs`, `artifacts/manual-qa/upl-e05-workload-time-entry-proof.json` |
| FIX-E06 notification firing label honesty | DONE | `packages/notifications/src/service.js`, `scripts/validate-upl-e06-notification-firing.mjs`, `artifacts/manual-qa/upl-e06-notification-firing-proof.json` |
| FIX-E07 matter-people-document graph | DONE | `packages/hrx/src/matter-people-document-graph.js`, `apps/api/src/hrx-runtime-context.js`, `scripts/validate-upl-e07-matter-people-document-graph.mjs`, `artifacts/manual-qa/upl-e07-matter-people-document-graph-proof.json` |
| FIX-C09 Outlook code-side add-in + external receipt intake | LOCAL DONE / EXTERNAL BLOCKED | `apps/addin/src/main.jsx`, `apps/addin/manifest.xml`, `apps/addin/package.json`, `scripts/validate-upl-c09-c12-outlook-addin.mjs`, `scripts/validate-upl-c09-outlook-external-receipt.mjs`, `docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json`, `artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json` |
| FIX-A06 local durable roundtrip boundary | LOCAL DONE | `scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs`, `artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.json` |
| UPL-A08 packaged desktop restart proof | PASS | `scripts/validate-upl-a08-packaged-desktop-restart.mjs`, `artifacts/manual-qa/upl-a08-packaged-desktop-restart-proof.json` |
| UPL-B16 invoice PDF → DMS → download hash proof | PASS | `scripts/validate-upl-b16-invoice-pdf-dms-hash.mjs`, `artifacts/manual-qa/upl-b16-invoice-pdf-dms-hash-proof.json` |
| FIX-V execution-form validators + browser de-mock | LOCAL DONE | `scripts/lib/upl-proof-runner.mjs`, `scripts/validate-upl-c02-conflict-search.mjs` through `scripts/validate-upl-c08-intake-completion-ui.mjs`, and real-server browser proofs under `docs/lazycodex/evidence/matter-web/artifacts/upl-c02*` through `upl-c08*`. External receipts and full 70-row re-adjudication remain separate. |

최신 검증 명령:

- `node scripts/validate-upl-a05-real-tenant-synthetic-residue.mjs` → PASS
- `node scripts/validate-upl-a06-all-domain-durable-roundtrip.mjs` → PASS
- `node scripts/validate-upl-a08-packaged-desktop-restart.mjs` → PASS
- `node scripts/validate-upl-a12-local-model-gateway.mjs` → PASS
- `node scripts/validate-upl-b01-time-entry.mjs` → PASS
- `node scripts/validate-upl-b10-analytics-finance-pipeline.mjs` → PASS
- `node scripts/validate-upl-b11-fee-arrangement-types.mjs` → PASS
- `node scripts/validate-upl-b12-trust-ledger.mjs` → PASS
- `node scripts/validate-upl-b13-withholding.mjs` → PASS, vendor sandbox remains explicit
- `node scripts/validate-upl-b13-tax-invoice-sandbox.mjs` → PASS with `READY_NEEDS_SANDBOX_ISSUE_APPROVAL`; `.env.popbill.local` has Popbill LinkID/SecretKey/corpNum staged, test mode on, sandbox issue disabled, prepared Popbill request/withholding mapping hashes present, and validator guards against raw provider probe/body/error leakage
- `node scripts/validate-upl-b14-expense-disbursement-wip.mjs` → PASS
- `node scripts/validate-upl-b15-finance-kpi-dashboard.mjs` → PASS
- `node scripts/validate-upl-b16-invoice-pdf-dms-hash.mjs` → PASS
- `node scripts/validate-upl-b17-accounting-export.mjs` → PASS
- `node scripts/validate-upl-c01-matter-party.mjs` through `node scripts/validate-upl-c13-client-portal.mjs` → PASS for local/code-side validators
- `node scripts/validate-upl-c09-c12-outlook-addin.mjs` → PASS with noninteractive MSAL bridge initialization, local `Office.actions.associate("onMessageSendHandler", ...)`, and handler `allowEvent:true` proof; external Outlook runtime remains unclaimed
- `node scripts/validate-upl-c09-outlook-external-receipt.mjs` → PASS with `READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT`; writes `artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json` and template `artifacts/manual-qa/upl-c09-outlook-external-receipt.template.json`
- `node scripts/validate-upl-c02-conflict-search.mjs`, `c03`, `c04`, `c05`, `c08` → PASS and rerun real-server Vite/browser proof without API route mocks
- `node scripts/validate-upl-e01-vault-fulltext-search.mjs`, `e02`, `e03`, `e05`, `e06`, `e07`, `e08`, `e09`, `e10` → PASS
- `node --test apps/web/test/ui-regression.test.mjs` → PASS 16/16
- `node --test apps/api/test/cmp-r4-g7-finance.test.js apps/api/test/cmp-r4-g8-analytics.test.js` → PASS 19/19 after signed-session test-header correction
- `node --test packages/dms/test/runtime-services.test.js packages/matter/test/runtime-services.test.js packages/intake/test/runtime-services.test.js packages/hrx/test/matter-people-document-graph.test.js apps/api/test/hrx/legal-people-api.test.js` → PASS 39/39
- `node scripts/run-wave1-external-receipt-readiness.mjs` → PASS, writes `artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json`
- `node scripts/validate-wave1-external-receipt-readiness.mjs` → PASS
- `node scripts/run-wave1-remediation-strict-verification-proof.mjs` → PASS, writes `artifacts/manual-qa/wave1-remediation-strict-verification-2026-07-03.json`
- `node scripts/validate-wave1-remediation-strict-verification.mjs` → PASS; validates the remediation workbook, strict verification addendum, preserved 70-row matrix, C09/B13 external blockers, and non-claim boundaries
- `npm test` → PASS 4152/4152
- `npm run build` → PASS, Vite chunk-size warning only
- `git diff --check` → PASS
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` → 35 weak findings, no strong/no-verify findings. Remaining weak findings are existing `apps/web/src/styles.css` glow/motion/dark-theme/background patterns.

비주장(non-claims):

- Wave-1 70/70 PASS 또는 전체 remediation 완료로 주장하지 않는다.
- Outlook/Entra external runtime, Popbill sandbox issue roundtrip, public release/go-live receipt는 이 실행에서 생성하지 않았다.
- E04/C09는 local signed-session taskpane/API/code-side proof와 external receipt intake validator까지만 닫았고, Outlook web/new desktop on-send runtime strict PASS는 `artifacts/manual-qa/upl-c09-outlook-external-receipt.json`에 sanitized operator receipt가 들어와 validator를 통과하기 전까지 주장하지 않는다.
- A12는 local model gateway/Gemma installed path 검증은 PASS지만, strict matrix가 요구하는 외부 Anthropic/model-gateway receipt가 필요한 경우에는 별도 외부 receipt 없이는 승격하지 않는다.
- B13은 3.3% 원천징수 local model과 Popbill sandbox readiness만 닫았다. Popbill credential/corpNum은 local `.env.popbill.local`에 준비됐지만 `POPBILL_ALLOW_SANDBOX_ISSUE=0`이므로 sandbox/production 세금계산서는 발행하지 않았다.
