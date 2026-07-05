# [개발 실행계획 v3 — 확정판] 축 A "데모 가능 → 내부 파일럿 가능"

실행 주체: Codex(유일). 계획·진단·앵커: Claude. 이 문서 하나가 완전한 실행 사양이며 v2(진단본)·v1을 대체한다.
기준 스냅샷: 169484912 (docs(audit): add enterprise audit workbook). 앵커는 이 스냅샷에서 확정(diagnosis-digest.md + anchors-digest.md 정본).
오너 결정: 권고 8건(A~H) 전부 채택 확정 → 조건 분기 없음. 진단·앵커 근거는 각각 스크래치패드 diagnosis-digest.md, anchors-digest.md.
검증 이력: 결함 진단 28-에이전트(반박 21/21 confirmed), 앵커 6-에이전트(설계중대 2/2 confirmed).
Codex 구현성 점검: `03-codex-implementation-assessment.md`를 C0~C8 세션/커밋 분해, 구현 가능 범위, 외부 권한 필요 범위, 검증 게이트의 정본으로 추가한다. 이 문서는 실행 사양이고, `03`은 실제 Codex 투입 순서와 stop 조건을 보강한다.

═══════════════════════════════════════════
## 0. 실행 체제 (전 커밋 공통 — 엄수)
═══════════════════════════════════════════
0-1. **작업 방식**: 본 워크트리에서 직접 수정·커밋. 커밋 전 앵커 line을 grep으로 재확인(스냅샷 이후 drift 가능). 각 커밋은 명시 pathspec만 stage.
0-2. **커밋 게이트(각 커밋 완료 조건)**: 해당 커밋의 수용 기준 + 회귀 기준선 유지. 회귀 기준선(진단 확보):
     - `npm run api:test` 스냅샷 262/198/64 → 목표는 커밋별로 향상(감소한 fail만 허용, 신규 fail 0).
     - HRX 슬라이스(`node --test apps/api/test/hrx/*.test.js apps/api/test/hrx-*.test.js`) 101/85/16 → C6에서 101/101.
     - root `npm test` 스냅샷 실제 4152/4151/1(감사 "3 fail"은 미재현 — C2에서 정정).
0-3. **보안 불변식(모든 커밋 — 위반 시 그 커밋 실패)**:
     - no-token 업무 라우트 401 유지(테스트를 일괄 완화해 authz 회귀 은폐 금지). vault-bridge·portal 외부 3종만 자체-인증 서피스로 예외(C3·C7, 정확히 열거된 경로만).
     - `production_ready_claim:false` 유지(true 전환·우회 금지).
     - cross-tenant 차단 시맨틱 보존(표준화·코드 통일은 허용, deny 자체 제거 금지).
     - step-up·compensation 마스킹 게이트 약화 금지. hash-only redaction·raw payload repo 밖 유지.
     - 위조 x-lawos-* 헤더 무력화 유지(서버가 principal로 재주입).
     - clearance ledger 게이트(packages/matter/src/opening-service.js validateClearance, intake-dependency-guard.js) **바이트 동일** 유지.
0-4. **PASS/FAIL 판정 위생**: 판정 명령에 파이프 금지(`| head`가 exit code 마스킹). zsh는 `${pipestatus[1]}`. dirty 트리 판정은 `git status --porcelain -- artifacts/`로 스코프(lockfile 노이즈 배제; 필요 시 `git checkout -- package-lock.json` 후 측정).
0-5. **진행 순서와 병렬성**:
     - C0(공유 모듈) → C1‖C2‖C3‖C4(병렬 가능; C3·C4는 C0 선행, C2는 C3의 bridge 서버수정을 흡수하므로 C3와 조율) → [완료 게이트 1] → C5‖C6 → C7 → C8.
     - 정확히는 C2의 vault-bridge 6건은 C3(bridge 헤더)의 서버·웹 수정에 의존하므로 **C3를 먼저 착수하고 C2가 그 결과를 참조**. 나머지 58 auth-drift는 C3와 무관하게 병렬.
0-6. **커밋 메시지**: `feat(api|web|test|desktop|docs)` / `fix(...)` / `chore(...)`. 각 메시지 말미에 진단·앵커 근거 파일 1줄 참조. Co-Authored-By 규약 준수.
0-7. **첫 작업**: 스크래치패드 3파일(diagnosis-digest.md, anchors-digest.md, 본 문서)을 `workbook/enterprise-audit-2026-07/`로 복사 커밋(세션 소멸 대비). 이후 이 문서를 정본으로 실행.

═══════════════════════════════════════════
## C0 — 공유 프로필/스토어 모듈 (C3·C4 선행, ~0.5 세션)
═══════════════════════════════════════════
리포에 운영/개발 프로필 관례가 전무(NODE_ENV·LAWOS_MODE·LAWOS_RUNTIME_PROFILE grep 0건 — 3개 진단 트랙 공통 확인). 한 모듈로 통일하지 않으면 C3·C4가 스위치를 각자 발명한다.
pathspec: `apps/api/src/runtime-profile.js`(신규), `apps/api/src/store-path-manifest.js`(신규).
- runtime-profile.js: `resolveRuntimeProfile(env=process.env)` → {operational, local-dev(기본)}; 미인식 값 throw(오탈자 fail-closed). `resolveSessionSecret({env, profile, explicitSecret})`: explicit 우선 → operational이면 env 필수·32자↑ 아니면 throw → local-dev이면 crypto.randomBytes(32) 인스턴스별 랜덤. desktop/test는 프로필 파라미터 주입으로 흡수(enum은 2값 유지).
- store-path-manifest.js: 13 필수 스토어 {param key(startApiServer 파라미터명), env명, 파일명, bounded_context} + 파생 1종 {dmsObjectStorePath, env:LAWOS_DMS_OBJECT_STORE_PATH, derived_from:dmsStorePath, suffix:'.objects', type:directory}. 소비자 3곳(server.js preflight, desktop local-api.js, 백업 드릴)이 공유. **파일명은 desktop local-api.js의 기존 이름을 바이트 동일 승계**(기존 userData 설치 데이터 보전).
- 13종 env·라인(server.js): HRX 184, MASTER_DATA 197, MATTER 210, DMS 226(+OBJECT 228/241 파생), CRM 252, INTAKE 253, CRM_MASTER_DATA 254, FINANCE 285, ANALYTICS 298, AI 312, PORTAL 325, UI_READINESS 338, ENTERPRISE_READINESS 351.
수용: 두 모듈 export 됨, 기존 동작 무변(아직 미배선). 단위 테스트 선택.

═══════════════════════════════════════════
## C1 — Matter opening 복구 (웹 2 + 서버 에러 가시화 1)  [결정 없음, P0]
═══════════════════════════════════════════
확정 원인(재현·검증): 서버는 정상(clearance 체인→201, replay 200 라이브 재현). 400은 웹 버그.
pathspec: `apps/web/src/data/apiClient.js`, `apps/web/src/components/MatterOpeningWizard.jsx`, `apps/web/src/components/MattersSurface.jsx`, `apps/api/src/matter-runtime-context.js`, 신규 UI/통합 테스트.
1. apiClient.js `normalizeMatterOpeningPayload`(~1975-1997): clearance_token.tenant_id 강제 덮어쓰기 삭제 → `clearance_token.tenant_id ?? MATTER_TENANT_ID`(부재 시에만 기본). owner_module==='intake' 교차테넌트 허용(opening-service.js:44-46)에 의존 — 그 체크 제거 금지.
2. MatterOpeningWizard.jsx(:44-53): 5개 수기 입력(clearance_token_id/intake_request_id/conflict_check_id/engagement_id/snapshot_hash)을 **발급 clearance 토큰 선택기**로 교체. ClientsSurface의 openMatterFromIntakeClearance(apiClient.js:1999-2043)가 발급 토큰 객체를 무변형 전달하는 방식을 재사용. 발급 토큰 목록 소스가 없으면 intake 토큰 목록 GET 신설(metadata-only). 클라 위조 필드 token_state/outcome(:51-52) 제거.
3. matter-runtime-context.js handleMatterOpening catch(:1402-1408): 커널 에러를 allowlist 매핑해 safe_message + 구분 코드(MATTER_CLEARANCE_TOKEN_NOT_ISSUED / MATTER_CLEARANCE_TOKEN_ID_REQUIRED / MATTER_CLEARANCE_LEDGER_MISMATCH) 방출. errorResponse(:396)가 extra.safe_message만 방출하는 문제 해소. 판정 결과 불변, 보고만 개선.
수용: UI Clients intake 플로우 201 / 위저드에서 발급 토큰 선택→201, 미발급 토큰은 명명된 400 / `scripts/run-upl-c04-clearance-ledger-proof.mjs` 전부 pass / cmp-r4-g4-matter·matter-vault-integration green / opening-service.js·intake-dependency-guard.js diff 없음.

═══════════════════════════════════════════
## C2 — 테스트 계약 복구 (58 auth-drift 기계수정 + 1 popbill skip)  [C3의 bridge 6건은 C3에서]
═══════════════════════════════════════════
확정: api:test 64 = 58 auth-drift(로그인 없이 구헤더만) + 6 vault-bridge 회귀(→C3). root는 1 fail(UPL-B-13 자격부재시만; Wave-1 2종 PASS — 감사 3-fail 미재현). npm test가 tracked artifacts/manual-qa 13파일 재작성(→C2 hygiene).
pathspec: `apps/api/test/helpers/session.js`, `apps/api/test/**`(19 auth-drift 파일, hrx/·g10-portal 제외), `scripts/test/*.test.mjs`, `scripts/lib/upl-proof-runner.mjs`, `scripts/lib/proof-regen-guard.mjs`(신규), `scripts/validate-upl-a06-*.mjs`, `scripts/validate-upl-e06-*.mjs`, `package.json`(proofs:regen 스크립트).
### C2a 세션 헬퍼 + auth-drift 19파일
1. helpers/session.js 확장: baseUrl 키 캐시 `signedHeaders(baseUrl, account?)` / `authedJson(baseUrl,path,opts)`(noAuth 지원, undefined 헤더 삭제) / 역할 계정 3종(jwsuh admin·yjlee support·matter.desktop.qa minimal). 패턴 출처 cmp-r4-g5-vault.test.js:42-65(이미 green).
2. auth-drift 19파일 기계 수정: json() 헬퍼에 세션 병합. **의미 보존 재작성 2종 필수**: (a) 'unauthenticated→403' 단정 → 'noAuth→401 AUTH_SESSION_REQUIRED'(더 강한 게이트, 삭제 금지); (b) deny-context 헤더 단정(세션 하 무시됨: deny헤더+세션→200 재현)은 저권한 계정 세션 또는 런타임 직접 호출로 재작성. 일괄 완화 금지, 완화 기대값마다 근거 주석.
### C2b 아티팩트 오염 차단 (결정 D — 전 proof-regenerator 적용)
tri-state 스위치 `LAWOS_REGEN_PROOFS`(unset=strict 유지, "0"=검증만, "1"=재생성). 이름 충돌 없음 확인.
3. upl-proof-runner.mjs assertNodeProofPass(:28-34): 첫 문장 `if (process.env.LAWOS_REGEN_PROOFS === "0") return {status:0,...}`. **오직 "0"에만 발동**(unset이면 16개 closeout-pack 검증기 strict 유지 — direction 실수 시 게이트 무력화).
4. proof-regen-guard.mjs(신규): `proofRegenEnabled = env==="1"`, `REGEN_SKIP_REASON`, `validatorEnv()`(미재생성 시 LAWOS_REGEN_PROOFS:"0" 주입).
5. 8개 proof 테스트: 러너 호출을 `if (proofRegenEnabled)`로 감싸고 else skip-with-reason, 검증기는 항상 실행(env: validatorEnv()). 파일·라인은 anchors-digest.md artifact-hygiene §CHANGE 3~13. 특기: upl-b13 test2는 재생성+자격증명(POPBILL_LINK_ID/SECRET_KEY) 둘 다 있을 때만 러너 실행(현 cred-less 하드 실패 해소). upl-a12는 기존 Ollama 가드에 regen 게이트 AND. wave1-external test1은 c09 검증기를 mkdtemp로 리다이렉트(기존 UPL_C09_* env 재사용, receipt-path는 기본 유지).
6. validate-upl-a06·e06: 무조건 inline spawn(:20-21)을 guarded assertNodeProofPass로 교체.
7. package.json: `proofs:regen` 스크립트(LAWOS_REGEN_PROOFS=1 + --test-concurrency=1; b13이 wave1 읽는 파일 재작성하므로 직렬 필수).
수용: `npm run api:test` 262/262(단 bridge 6건은 C3 후) / `npm test` exit 0 / **npm test 2회 연속 후 `git status --porcelain -- artifacts/` 공백** / cred/sloplint/Ollama 없는 머신에서도 exit 0+clean(현재 UPL-B-13 실패 해소) / 각 파일 no-token 401 단정 존치 / unset env로 수동 검증기 실행 시 strict 재실행 유지(예: validate-upl-b12 여전히 재생성).

═══════════════════════════════════════════
## C3 — vault-bridge 전용 헤더 이관 (결정 A, 자체-인증 서피스)  [confirmed]
═══════════════════════════════════════════
확정: 세션 게이트가 bridge 머신 토큰과 authorization 헤더 충돌 → bridge 테스트 0/6(전부 401), 웹 Vault UI 경로도 파손(apiClient가 session Authorization로 bridgeToken 덮어씀). 목표 계약: 미구성→503 MATTER_VAULT_BRIDGE_REQUIRED / 헤더 없거나 오류(세션토큰만 있어도)→403 MATTER_VAULT_BRIDGE_BLOCKED / 유효→200·201.
pathspec: `apps/api/src/matter-runtime-context.js`, `apps/api/src/server.js`, `apps/web/src/data/apiClient.js`, `apps/api/test/matter-vault-bridge-api.test.js`, `scripts/run-current-matter-codes-production-bridge-upsert.mjs`, `scripts/run-lcx-vltui-production-smoke.mjs`, `apps/api/src/routes/matters.js`(주석), `docs/lazycodex/lcx-vault-app-current-ui-source-register-2026-06-29.json`, `docs/lazycodex/lcx-vltui-01-vault-bridge-contract-2026-06-29.json`, 신규 ADR.
1. matter-runtime-context.js: `export const VAULT_BRIDGE_TOKEN_HEADER="x-lawos-vault-bridge-token"` + `export const MATTER_VAULT_BRIDGE_ROUTES`(5개 "METHOD /path", :3225-3239·routes/matters.js:9-16과 일치). `vaultBridgeHeaderToken(headers)` 추가(대소문자 폴백). validateVaultBridgeAuth(:451-460)의 bearerToken(:456)을 새 함수로 교체 — 503/403 분기·timingSafeEqual(:137-146) 유지. orphan bearerToken(:130-135) 삭제(단일 소비자 확인).
2. server.js: import에 parsePermissionContext(pre-gate 6c83a2d5c^에 존재) + MATTER_VAULT_BRIDGE_ROUTES 추가. isAuthPath 블록(:772-777) 뒤·세션게이트(:779) 앞에 **정확한 `${method} ${pathname}` 멤버십**으로만 예외 처리 후 handleMatterApiRequest 디스패치(startsWith 금지 — 미지 subpath·오메서드는 세션게이트로 낙하). CORS allow-headers(:417-425)에 x-lawos-vault-bridge-token 추가. isMatterPath 디스패치(:858-873) 불변.
3. apiClient.js(:2864,2916,2979): `if (bridgeToken) headers.Authorization = Bearer...`를 `headers["x-lawos-vault-bridge-token"]=bridgeToken`로. bridgeToken 파라미터명 유지(ui-regression:889가 리터럴 요구). sessionAuthorizedHeaders/apiFetch 불변(세션 Authorization 계속 흐름). VaultSurface.jsx·MatterVaultPanel.jsx 편집 0.
4. bridge 테스트: authHeaders(:35-37)→bridgeHeaders, 16개 호출 갱신. test2 제목 유지(validate-lcx-vltui-bridge-contract.mjs:127가 grep) 또는 검증기 lockstep. **신규 케이스 추가**: 세션 토큰만(bridge 헤더 없이) GET status → 403 BLOCKED. 0/6→7/7.
5. production 스크립트 2종: authHeaders/bridgeAuthHeaders를 새 헤더로. **배포 순서 주의 주석**: 현 Lambda(matter-lawos-api-prod, pre-gate 3d7d9da36)는 Bearer-only라 재배포 전 실행 금지. 서버+스크립트+테스트를 한 커밋으로 → Lambda 재배포 → 그 커밋으로 smoke.
6. docs 2종: 계약 문언을 헤더 기반으로(fixture에 'Bearer ' 리터럴 금지 — validate-lcx-vltui-bridge-contract.mjs:122). 날짜 receipt/evidence는 불변, 헤더 컷 ADR 1건 신규.
7. **외부 리포 조율(별도)**: /Users/jws/Projects/amic-vault/tools/migration/* 5파일이 authorization Bearer 사용 — 운영자 실행 도구(배포 서비스 아님), 다음 실행 전 헤더 스왑 필요. 본 커밋 ADR에서 참조만.
수용: bridge 테스트 7/7 / session-auth-api 무회귀 / ui-regression(:861 VaultSurface no bridgeToken, :889 apiClient has bridgeToken) green / validate-lcx-vltui-bridge-contract green / 웹 Vault UI status 호출 401 사라짐.
주의: bridge lookup/preflight의 권한 컨텍스트가 클라 제공 x-lawos-permission-context로 회귀(pre-gate 신뢰모델) — 머신 서피스 의도적 결정, ADR 1줄. POST bridge는 인증 전 body 판독(pre-gate 동일 노출, 토큰 게이트 머신 서피스라 수용).

═══════════════════════════════════════════
## C4 — STORE_PATH preflight + 백업 드릴 결함 (결정 F 일부, C0 선행)  [P0]
═══════════════════════════════════════════
확정: 13종 tmpdir 폴백 재현(bare 기동 시 소실). **desktop은 env 아니라 startApiServer 파라미터로 스토어 전달**(local-api.js:98) — env만 검사하는 preflight는 패키지 앱 파손. param||env로 해석. 신규 결함: 백업 드릴이 DMS object bytes(.objects/*.bin) 누락, env 무연결.
pathspec: `apps/api/src/server.js`, `apps/desktop/src/main/local-api.js`, `scripts/drill-matter-vault-backup-restore.mjs`, `scripts/test/matter-vault-backup-restore.test.mjs`, `scripts/validate-store-path-preflight.mjs`(신규), `docs/runbooks/store-env-catalog.md`(신규).
1. server.js: startApiServer 최선두(runtime 생성·listen 전)에 preflight. manifest에서 store 해석 `functionParam || env || null`. operational이고 필수 항목이 null/tmpdir하위/비절대면 **전부 나열해 한 메시지로 throw, exit 78**(listen 금지). dmsObjectStorePath는 dmsStorePath 충족 시 면제(파생). local-dev는 폴백 유지+경고 1줄(유효 맵 로깅). CLI .catch(exit).
2. desktop local-api.js: 하드코드 스토어 맵을 manifest import로 교체. startApiServer에 runtimeProfile:'local-dev' 명시 주입(호스트 env의 operational 오염으로부터 데스크톱 보호). 파일명 바이트 동일.
3. 드릴: manifest import. DMS object-root 디렉토리 백업(.bin/.json recursive + per-file sha256, 복원 시 검증). 실제 resolved env path 백업 모드 + env→path 맵을 백업 manifest에 기록. matter-vault-backup-restore.test.mjs에 object-bytes 왕복 케이스 추가.
4. validate-store-path-preflight.mjs(신규): spawn 4시나리오(operational 무env→exit78 + 13종 나열 / operational 전 env→listen+write·restart·readback / bare local-dev→listen / desktop 경로→boot).
5. store-env-catalog.md(신규): env 전수 그룹핑(스토어 13+파생, 세션/스텝업, 포트/CORS, 모델게이트웨이, desktop 런타임/빌드서명, cloud-lambda 전용, dev/proof 전용) — 전체 목록은 diagnosis-digest.md store-preflight §FIX 7. required-for-operational 플래그. validator가 카탈로그-매니페스트 일치를 문자열 검증.
수용: operational 무env→exit 78·tmpdir 미생성 / 13종 지정→write·재기동·readback(Vault·Matter·HRX) / bare(local-dev) 여전히 부팅(proof ~40개 보전) / a08 desktop restart proof green / 드릴이 .bin 체크섬 동일 복원 / matter-vault-persistence·upl-a06 durable roundtrip 기준선 green 유지.

═══════════════════════════════════════════
## [완료 게이트 1] 축 A 승격 1차 확인 (C1~C4 후)
═══════════════════════════════════════════
0-1 (a) 수직 플로우 client→clearance→matter opening(201)→vault document→고정 STORE_PATH 재기동 readback을 [직접 재실행]으로 증빙 + (b) npm test·api:test green 재현을 산출물 기록. 통과 = "데모 가능→내부 파일럿 가능" 핵심 조건 충족(단 C5·C6의 잔여 도메인 fail이 없어야 api:test 완전 green).

═══════════════════════════════════════════
## C5 — Portal G10 (테스트 4 + 제품결함 2, 결정 B 자체-인증 면제)  [선행 C2]
═══════════════════════════════════════════
확정: 4건 전부 auth-drift(세션 주입 시 dashboard 200·writes 201·boundary 400·C13 15단계 전체 라이브 재현). 토큰 raw 미저장 확인. 제품결함 2: 외부 매직링크 3종이 staff 세션게이트에 갇힘, ingress raw bytes 저장.
pathspec: `apps/api/test/cmp-r4-g10-portal.test.js`, `apps/api/src/server.js`, `apps/api/src/portal-runtime-context.js`.
1. g10 테스트: cmp-r4-g5-vault 패턴으로 세션 마이그레이션 + stripped-header 단정 1건을 noAuth→401 AUTH_SESSION_REQUIRED로 재작성(count_leak_prevented 단정 제거 — 401 본문에 없음). deny-effect 403이 여전히 필요하면 handlePortalApiRequest 직접 호출 핸들러 테스트.
2. server.js(결정 B): 외부 3종 경로(/api/portal/invites/consume, /api/portal/external/rfi-responses, /api/portal/external/secure-links/:id/access) 정확 매칭으로 세션게이트 면제 → handlePortalApiRequest(context:null). 핸들러(:422-483)는 context 미사용·자체 인증(해시 일회성·active session). C3의 bridge 예외와 같은 정책·같은 위치.
3. portal-runtime-context.js: ingress 하드닝 — writeResponse(:299-320)·외부 write 경로에서 egress denylist 동일 필드(document_bytes, storage_pointer, token, token_hash, credential_material, raw_payload, source_payload) 저장 전 제거.
수용: g10 5/5 / 밀반입 sentinel 스토어 부재 / 무헤더 consume 200→재사용 409, staff 라우트는 여전히 401 / 전체 스위트 무회귀.

═══════════════════════════════════════════
## C6 — HRX 정합 + cross-tenant deny 표준화 (결정 G 시드 추가)  [선행 C2, confirmed]
═══════════════════════════════════════════
확정: 16건 auth-drift + 구조 3종(step-up 토큰을 세션주체로 재발행·emp-001→emp_amic_* 픽스처·단일테넌트라 tenant-b HTTP 불가). deny 분기: Vault만 validateCommonQuery 하드코드 400(vault-dms-runtime-context.js:139-143)으로 게이트 전 단락 → audit_hint_ref 소실·denied 감사 미기록. **표준화는 이 한 곳 삭제로 완결**(그러면 :170의 403 + :176 감사 경로 부활). 참조처 전수: VAULT_DMS_API_VALIDATION_ERROR를 참조하는 테스트·웹·스크립트 0건(blast 최소).
### C6a HRX 테스트 재작성 (7파일)
pathspec: `apps/api/test/hrx/security-regression.test.js`·`step-up-route.test.js`·`tenant-isolation.test.js`·`ai.test.js`·`performance-smoke.test.js`·`secret-exposure.test.js`, `apps/api/test/hrx-durable-runtime.test.js`. 세부 재작성은 diagnosis-digest.md hrx-security §FIX 1~7(계정별 스코프·step-up 재발행·2계층 분리·픽스처 교체·deny 단정 재작성). middleware 레벨로 격하되는 단정(missing-tenant-context 400, tenant-b 격리)은 authorizeHrxApiRequest 직접 호출.
### C6b 2번째 테넌트 QA 계정 (결정 G — 원자 커밋)
확정 설계(anchors-digest.md tenant-b-seed §CHANGE 1~9): seed-only로는 tenant-b principal 생성 불가(session-auth 3곳에서 seed.tenant_id에 핀). 신규 전용 테넌트 tenant_b_qa_synthetic(**LAWOS_RUNTIME_TENANT_IDS에 넣지 않음** — 넣으면 모든 계정이 alias로 tenant_b 접근+QA가 15테넌트 접근, 격리 무효화).
pathspec(한 커밋): `docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json`(qa.tenant-b@amic.kr 계정 추가, 정확 JSON은 anchors §CHANGE 1), `apps/api/src/lawos-role-registry.js`(TENANT_B_QA_ASSIGNMENT, DESKTOP_QA 패턴, lawos_hr 미러 — LAWOS_INTERNAL_ROLE_ASSIGNMENTS 배열엔 미추가로 session-auth-api:177의 9 유지), `apps/api/src/session-auth.js`(homeTenantIdForUser 헬퍼 + subjectsFromSeed/login/verifyToken을 home tenant 기준으로 + permissionContextFromPrincipal의 tenant_ids를 amic이면 전체·아니면 [자기] — **핵심 격리 로직**), `scripts/validate-matter-vault-user-registration-seed.mjs`(email·count 11·membership 예외·receipt 문구), `docs/.../matter-vault-user-registration-receipt.md`(count 11), `packages/runtime-auth/test/matter-vault-user-registration-seed.test.js`(per-user home tenant), `apps/api/test/matter-temp-desktop-runtime-lambda.test.js`(count 11), `apps/api/test/tenant-isolation-api.test.js`(신규).
**금지(guard rail)**: hrx-member-roster-source-of-truth.json·validate-lcx-hrx-sft-roster-source.mjs(9)·hrx-runtime-api.test.js:115/143/185(9)·LAWOS_INTERNAL_ROLE_ASSIGNMENTS·LAWOS_RUNTIME_TENANT_IDS 불변. QA 계정을 HRX 멤버 로스터에 넣으면 9-count 3개 깨지고 empty-tenant 증명 무효.
신규 테스트: QA 로그인 200(tenant_b_qa_synthetic, lawos_hr) / GET hrx/employees 0행 / matters?tenant_id=tenant_rp05_synthetic(25건 픽스처 위치)→403 MATTER_UNAUTHORIZED_OMISSION / 역방향 jwsuh→tenant_b→403 / amic 회귀가드 200.
### C6c Vault deny 표준화 (서버 1곳)
vault-dms-runtime-context.js:139-143의 tenant 하드코드 400 분기 삭제 → 외국테넌트가 gate로 흘러 403 VAULT_DMS_UNAUTHORIZED_OMISSION(:170) + appendVaultRouteAudit(:176) 부활. SF-B 5도메인의 *_PERMISSION_REQUIRED rename은 선택(상태 이미 403 — 이번 커밋 제외).
수용: HRX 슬라이스 101/101(skip 없이) / no-token 401·step-up 403·query-context 400·compensation 마스킹 존치 / vault 외국테넌트 403+audit_hint_ref 에코+denied 감사 / matter X1/X3/X4 불변 / 신규 tenant-isolation 테스트 green.

═══════════════════════════════════════════
## C7 — UI 위생 (결정 C·E·H)  [선행 C2 헬퍼 무관, 독립]
═══════════════════════════════════════════
확정: 고아 12종 중 7종은 CP 검증기 필수+라우팅 금지(삭제·라우팅 불가). 자유 삭제 4종만, AdminSurface는 검증기 4줄 동반. HRXPolicyConsole 오탐(작업 없음).
pathspec: `apps/web/src/components/{ContentSurface,DashboardsSurface,ExperimentsSurface,ThemeSurface,AdminSurface}.jsx`(삭제), `scripts/validate-sf-client-matter-parity-crosswalk.mjs`(:1430-1433 삭제, AdminSurface와 원자), `apps/web/src/components/ClientsSurface.jsx`(내부 IntakeSurface→ClientIntakePipelineSurface rename), `apps/web/src/i18n.js`(죽은 키 13×2 + signupPreviewNotice 추가), `apps/web/src/components/AuthSurface.jsx`(:91 preview 라벨), `apps/web/src/components/GlobalUtilitySurface.jsx`(preview 마커), `apps/web/tsconfig.json`(신규), `apps/web/package.json`·`package.json`(typecheck·notifications glob).
1. IntakeSurface 충돌: ClientsSurface.jsx:1373 내부 export를 ClientIntakePipelineSurface로 rename + JSX 사용처(:2294) — 게이트 안전(검증기 요구는 컴포넌트명 아님, 외부 importer 0). orphan components/IntakeSurface.jsx는 검증기 필수라 유지.
2. 삭제 4+1: Content/Dashboards/Experiments/Theme(zero importer) + AdminSurface(크로스워크 검증기 :1430-1433 4줄과 원자 커밋). i18n 죽은 키 13개×2로케일(라인은 anchors misc §CHANGE 8; 마지막 항목 콤마 위생). KEEP: project·invite·saveChart 및 out-of-scope orphan 키.
3. 결정 H: i18n에 signupPreviewNotice 추가(미리보기 문구, ui-regression forbid 리스트 회피) + AuthSurface.jsx:91 'Sign up now' 뒤 preview 라벨(GuardedStateNotice 재사용). GlobalUtilitySurface UtilityDetail(:102-161)에 messages/notifications/esign/calendar 대상 preview 마커 1개(GuardedStateNotice, data-global-audit/decision-required 문자열 보존).
4. 결정 C: apps/web/tsconfig.json 신규(정확 knob은 anchors misc §CHANGE 12 — strict:false·allowImportingTsExtensions·types:[]·skipLibCheck, 초기 오류 정확히 7개 재현됨). web `typecheck`·root `typecheck:web` 스크립트(report-only, test/build/gate에 미포함). notifications glob을 root test에 packages/hrx 뒤 삽입(+2 tests). eslint 도입 안 함.
수용: web build·test:ui green / cmp-r4-g6~12·ui-regression·guarded-ui·hrx-ui-api-backed 검증기 green / 삭제 4+1 grep 0 / rename 후 IntakeSurface export는 orphan 1곳만 / typecheck:web 초기 7 오류(report-only) / root npm test +2.

═══════════════════════════════════════════
## C8 — Env 카탈로그 + 백업 드릴 formalize (C3·C4 산출 통합)
═══════════════════════════════════════════
C4의 runbook·validator·드릴 확장을 승계 완성: env 전수 그룹핑(진단 완료), 드릴 receipt + RPO/RTO 기록, validator가 카탈로그-매니페스트 일치 검증. 백업 스케줄 계약(UPL-A-09)은 오너 확인 후. pathspec: `docs/**`, `scripts/drill-*`, `scripts/validate-*`, `workbook/**`.
수용: env matrix 완비(누락 시 validator fail), backup/restore drill receipt + RPO/RTO 문서화.

═══════════════════════════════════════════
## 완료 보고 + 감사 정정 (30일 트랙 종료 시 1회)
═══════════════════════════════════════════
- 축 A 승격 판정: 0-1 (a)(b)(c) [직접 재실행] 증빙 → "내부 파일럿 가능" 충족 여부. production_ready_claim 불변.
- V트랙 감사 정정(workbook 기록): ① 08-report §4 "npm test 3 fail"→1 fail(Wave-1 2종 스냅샷 PASS, 감사환경 미상), ② Matter 400 원인=웹 페이로드(서버 아님; 02-feature-reality Broken-for-create 갱신), ③ 상시 dirty 13파일 원인=npm test proof-regenerator 부작용(C2에서 해소).
- 후속 분리(이번 30일 제외): hrx-step-up-token.js:7-8 기본 시크릿(테스트 헬퍼 프로세스밖 서명이라 조율 주입 필요) / SF-B 5도메인 deny 코드 rename / AskSurface·AnalyticsSurface·ProfilesSurface(추가 고아 3종) 처분 / eslint 도입 / notifications 커널 apps/api 배선.
- 축 B 60/90: v2 §Ⅲ 유지. P3-01 OIDC는 C3의 "operational=synthetic 로그인 차단→로그인 불가" 상태를 해소하는 필수 후속임을 명시.

═══════════════════════════════════════════
## 오너 결정 반영 요약 (A~H 전부 채택)
═══════════════════════════════════════════
A vault-bridge 전용 헤더 → C3. B 포털 외부 3종 면제 → C5. C package.json(notifications glob+typecheck report-only) → C7. D artifacts 재작성 차단(전 proof-regenerator, LAWOS_REGEN_PROOFS tri-state) → C2b. E 고아 4+Admin 삭제·7종 유지 → C7. F health에 runtime_profile/synthetic_login_enabled + fail-open 기본 local-dev → C4/C7(health 필드는 C7 misc, profile 모듈은 C0). G 2번째 테넌트 시드 → C6b. H 'Sign up now' preview 라벨 → C7.

═══════════════════════════════════════════
## 예상 작업량
═══════════════════════════════════════════
C0 0.5 / C1 1~1.5(위저드 UI) / C2 2~2.5(19파일+hygiene 8테스트) / C3 1.5 / C4 1~1.5 / C5 0.5~1 / C6 2(HRX 7파일+시드 원자+deny) / C7 1~1.5 / C8 0.5~1 — 합계 약 10~13 Codex 세션. 크리티컬 패스: C0→C3→C2(bridge분)→게이트1, C6b(시드 원자성).
