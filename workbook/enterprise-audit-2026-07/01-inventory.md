# W1 인벤토리 + 빌드·실행 매트릭스

## 1. 모노레포 인벤토리

| 항목 | 재확인 결과 | 판정 |
|---|---:|---|
| 루트 package | `law-firm-os` `0.1.8` | 확인됨 [직접 재실행] |
| workspaces | `apps/*`, `packages/*` | 확인됨 [직접 재실행] |
| 루트 scripts | 367 | 확인됨 [직접 재실행] |
| lint script | 없음 | 확인됨 [직접 재실행] |
| typecheck script | 없음 | 확인됨 [직접 재실행] |
| `apps/web/tsconfig.json` | 없음 | 확인됨 [직접 재실행] |
| workspace apps | `addin`, `api`, `desktop`, `web` | 확인됨 [직접 재실행] |
| app 폴더이나 workspace package 아님 | `ops-kpi` | 확인됨 [직접 재실행] |
| packages | 40 | 확인됨 [직접 재실행] |
| packages test 디렉터리 | 36 | 확인됨 [직접 재실행] |
| test 디렉터리 없는 packages | `data-cloud`, `import-data`, `record-actions`, `reports` | 확인됨 [직접 재실행] |
| `scripts/*.mjs` | 484 | 확인됨 [직접 재실행] |
| `.env.example` | 없음. `.env.matter-vault-r4.local.example` 1개만 확인 | 확인됨 [직접 재실행] |
| DB 엔진 의존성 | 관리형 DB 드라이버 확인 못함, JSON 파일스토어 중심 | 부분 확인됨 [직접 재실행] |

스펙 선등록값 중 `packages 41`, `manual-qa 148`, `upl 77`은 이 스냅샷의 직접 재확인값과 달랐다. 이 감사는 스냅샷 재확인값을 기준으로 삼는다.

## 2. API health 인벤토리

| 항목 | 결과 | 판정 |
|---|---:|---|
| health 서비스 | `@law-firm-os/api` | 확인됨 [직접 재실행] |
| bounded contexts | 18 | 확인됨 [직접 재실행] |
| matter-core endpoints | 45 | 확인됨 [직접 재실행] |
| vault-dms endpoints | 5 | 확인됨 [직접 재실행] |
| crm-intake endpoints | 32 | 확인됨 [직접 재실행] |
| finance endpoints | 26 | 확인됨 [직접 재실행] |
| client-portal-data-room endpoints | 20 | 확인됨 [직접 재실행] |
| all health contexts production_ready_claim | `false` | 확인됨 [직접 재실행] |

## 3. W1 명령 매트릭스

실행 위치: `/Users/jws/lawos-audit-wt`. `4180`은 기존 본 워크트리 서버가 점유해 감사 API는 `LAWOS_API_PORT=4187`로 격리 실행했다. 원 포트 점유 프로세스는 `/Users/jws/Documents/Codex/Law Firm OS/apps/api`의 `node src/server.js`였으며 감사에서는 중단하지 않았다.

| # | 명령 | 결과 | 로그 요약 | 판정 |
|---:|---|---|---|---|
| 1 | `npm install` | exit 0 | 172 packages added, 0 vulnerabilities | 확인됨 [직접 재실행] |
| 2 | `npm test` | exit 1 | 4152 tests, 4149 pass, 3 fail. 실패: UPL-B-13 Popbill sandbox approval, Wave-1 external receipt readiness, Wave-1 strict verification | 구현되어 있으나 작동 불명 [직접 재실행] |
| 3 | `node --test 'packages/notifications/test/*.test.js'` | exit 0 | 2 tests pass. 루트 글롭 누락 보완 | 확인됨 [직접 재실행] |
| 4 | `npm run api:test` | exit 1 | 262 tests, 198 pass, 64 fail. 주로 새 session auth gate 이후 기존 테스트 기대값 200/201이 401로 바뀐 계약 불일치 | 구현되어 있으나 작동 불명 [직접 재실행] |
| 5 | `npm --workspace apps/web run build` | exit 0 | 1701 modules transformed, chunk size warning only | 확인됨 [직접 재실행] |
| 6 | `npm --workspace apps/web run test:ui` | exit 0 | 42 tests pass | 확인됨 [직접 재실행] |
| 7 | `npm --workspace apps/desktop run test:smoke && ...test:session && ...test:file-bridge` | exit 0 | smoke/session/file bridge tests and validators pass | 확인됨 [직접 재실행] |
| 8 | `npm run db:migrate:test` | exit 0 | 5 HRX migration tests pass | 확인됨 [직접 재실행] |
| 9 | `npm run validate` | exit 0 | modules 9/9, principles 9/9, invariants 7/7 | 확인됨 [직접 재실행] |
| 10 | `LAWOS_API_PORT=4187 ... npm --workspace apps/api start` | server up | `/api/health` 200, `/api/profile/me` no token 401 | 확인됨 [직접 재실행] |
| 11 | `npm --workspace apps/web run dev -- --host 127.0.0.1 --port 5179` | server up | login with `jwsuh@amic.kr` synthetic token, 6 views accessed | 부분 확인됨 [직접 재실행] |
| 12 | `npm run web:e2e` | exit 0 | 16 tests pass | 확인됨 [직접 재실행] |

## 4. 웹 로그인과 6 view 접근

| 화면 | 결과 | 비고 |
|---|---|---|
| Login | 확인됨 [직접 재실행] | synthetic token password 입력 → `view=home` 이동 |
| Home | 확인됨 [직접 재실행] | 텍스트 렌더 확인 |
| Client | 확인됨 [직접 재실행] | 텍스트 렌더 확인 |
| Matter | 확인됨 [직접 재실행] | 텍스트 렌더 확인 |
| Vault | 확인됨 [직접 재실행] | 텍스트 렌더 확인 |
| Portal | 확인됨 [직접 재실행] | 텍스트 렌더 확인 |
| People | 확인됨 [직접 재실행] | 텍스트 렌더 확인 |

Playwright console에는 보조 API 503 두 건이 기록되었다. 화면 접근 자체는 확인됐으나 전체 보조 데이터가 모두 green이라는 판정은 하지 않는다.

## 5. 예비 판정

축 A 기준 예비 판정은 `데모 가능`이다. 서버·웹·desktop·Vault 영속 표본은 확인됐지만, 루트/API 테스트가 green이 아니고 신규 matter 생성 표본이 validation block으로 중단되어 내부 파일럿 가능 조건을 충족하지 못했다.
