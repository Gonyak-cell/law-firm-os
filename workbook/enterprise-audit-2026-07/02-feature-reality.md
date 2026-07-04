# W2 기능 실재성 감사

## 1. 확정 아키텍처

| 링크 | 근거 | 판정 |
|---|---|---|
| UI | `apps/web/src/components/*`, `apps/web/src/people/*` | 확인됨 [직접 재실행] |
| API client | `apps/web/src/data/apiClient.js` 4988줄. `authorization: Bearer` 주입, `x-lawos-*` 자기주장 헤더 삭제 | 확인됨 [직접 재실행] |
| API server | `apps/api/src/server.js` node:http, prefix routing | 확인됨 [직접 재실행] |
| auth gate | `/api/health`, `/api/auth/*` 외 `resolvePermissionContextFromHeaders(... requireSessionToken: true)` | 확인됨 [직접 재실행] |
| domain runtime | `*-runtime-context.js` → packages 커널 → JSON store | 확인됨 [직접 재실행] |
| 기본 STORE_PATH | 미설정 시 `mkdtempSync(tmpdir())` 13개 이상 | 확인됨 [직접 재실행] |
| 프로덕션 선언 | `production_ready_claim` grep 2236회, health context 전부 false | 확인됨 [직접 재실행] |

## 2. T-1 기능 실재성 표

| 기능 | UI | 핸들러 | API | 서버·권한 | 커널 | 영속 | 실패 처리 | 성공 피드백 | 테스트 | 등급 | 결함 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 로그인·세션 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 미확인 | 확인됨 | 확인됨 | 확인됨 | Beta-usable 상한 | synthetic token 기반. `DEFAULT_SESSION_SECRET` 기본값 위험 |
| Home dashboard | 확인됨 | 확인됨 | 부분 확인됨 | 확인됨 | 부분 확인됨 | 미확인 | 부분 확인됨 | 확인됨 | 확인됨 | Demo-only | Playwright 6 view 중 Home 확인. 콘솔 503 보조 API 존재 |
| Client surface | 확인됨 | 확인됨 | 부분 확인됨 | 확인됨 | 부분 확인됨 | 미확인 | 부분 확인됨 | 확인됨 | 확인됨 | Demo-only | Client 생성→Matter까지 직접 완주 미확인 |
| Matter list/read | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 부분 확인됨 | 확인됨 | 확인됨 | 부분 확인됨 | Beta-usable 상한 | 목록 read는 확인, 신규 opening은 400 validation block |
| Vault document create/download | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | Beta-usable 상한 | 고정 STORE_PATH 재기동 후 `doc_enterprise_audit_amic_001` readback 확인 |
| Portal | 확인됨 | 확인됨 | 부분 확인됨 | 확인됨 | 부분 확인됨 | 미확인 | 부분 확인됨 | 확인됨 | 구현되어 있으나 작동 불명 | Demo-only | `api:test` G10 portal 4건 fail |
| People home | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 확인됨 | 부분 확인됨 | 확인됨 | 확인됨 | 확인됨 | Beta-usable 상한 | HRX 일부 test fail, web e2e 16건 pass |
| Global utility | 확인됨 | 확인됨 | 미확인 | 미확인 | 미확인 | 미확인 | 부분 확인됨 | 확인됨 | 부분 확인됨 | Stub/Demo-only | 10 view를 단일 컴포넌트가 처리, fetch 없음 |
| Desktop file bridge | 확인됨 | 확인됨 | 해당 없음 | 확인됨 | 확인됨 | 미확인 | 확인됨 | 확인됨 | 확인됨 | Beta-usable 상한 | file bridge validator pass, 서명 빌드는 env 없어 미실행 |

## 3. 영속성 직접 표본

| 표본 | 절차 | 결과 | 판정 |
|---|---|---|---|
| Vault document | 고정 `LAWOS_DMS_STORE_PATH`, `LAWOS_DMS_OBJECT_STORE_PATH` 지정 → API start → `/api/vault/documents` POST → download → API 재기동 → list/download | 재기동 후 list count 2, 대상 문서 포함, sha `658cd738dba5b66f03baf57f73cd9784990696e93c7197bf3f72e64ccc9dd66b`, content 일치 | 확인됨 [직접 재실행] |
| Matter opening | 세션 tenant 기준 신규 opening POST | 400 `MATTER_API_VALIDATION_ERROR` | 구현되어 있으나 작동 불명 [직접 재실행] |
| Cross-tenant matter | signed session으로 다른 tenant matter list | 403 `MATTER_UNAUTHORIZED_OMISSION` | 확인됨 [직접 재실행] |
| Cross-tenant vault | signed session으로 다른 tenant vault list | 400 `VAULT_DMS_API_VALIDATION_ERROR` | 부분 확인됨 [직접 재실행] |

## 4. 상태 모델 결함

| 항목 | 근거 | 판정 |
|---|---|---|
| Home `normalizeStatus` | `apps/web/src/components/HomeSurface.jsx` | 부분 확인됨 [직접 재실행] |
| readinessModel | `apps/web/src/data/readinessModel.js` 다수 import | 부분 확인됨 [직접 재실행] |
| GuardedState | `apps/web/src/components/GuardedState.js`, GlobalUtility 전용 | 부분 확인됨 [직접 재실행] |
| PEOPLE_FEATURE_STATES | `apps/web/src/people/peopleFeatureCatalog.js` | 부분 확인됨 [직접 재실행] |
| Clients allow-denied-review 가드 | `ClientsSurface.jsx` 내부 로컬 guard | 부분 확인됨 [직접 재실행] |
| HRX cross import | Home, Clients, Matters가 `../people/hrxApiClient.ts` 직접 import | 확인됨 [직접 재실행] |

상태 어휘와 권한 표현이 단일 모델로 수렴하지 않았다. 기능 자체가 없다는 뜻은 아니지만, 운영·QA·디자인 체계에서는 유지보수 병목이다.
