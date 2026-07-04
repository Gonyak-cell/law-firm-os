# W6 병목 종합·이중 판정

## 1. 병목 15종

| # | 병목명 | 증상 | 발생 지점 | 영향 | 해결방안 | 우선순위 |
|---:|---|---|---|---|---|---|
| 1 | 기본 스토어 tmpdir 휘발 | env 미설정 시 재시작마다 데이터 소실 | `server.js` STORE_PATH 기본값 | 데이터 내구성 | 운영 프로필 STORE_PATH 필수화 | P0 |
| 2 | 신규 Matter 생성 validation block | `/api/matters/openings` 400 | matter opening + clearance ledger | 핵심 플로우 절단 | clearance 발급→opening 수직 테스트 복구 | P0 |
| 3 | API test contract drift | 262 중 64 fail, 다수 401 | `apps/api/test/*` | 회귀 신뢰 저하 | session auth 이후 기대값 갱신 또는 route helper 수정 | P0 |
| 4 | root test external gates fail | 4152 중 3 fail | Popbill, Wave-1 receipts | release confidence 저하 | approval/receipt 상태 정리 | P0 |
| 5 | 하드코드 세션 시크릿 | env 없으면 기본값 사용 | `session-auth.js` | 세션 위조 위험 | default 제거, startup fail | P0 |
| 6 | synthetic token 로그인 | local-dev-only token으로 signed session | roster/session-auth | 운영 인증 부적합 | OIDC/SSO 전환, dev mode 격리 | P0 |
| 7 | Popbill/Outlook provider 미완주 | sandbox/provider 승인 대기 | scripts/runtime contexts | 청구·메일 플로우 단절 | 외부 approval receipt와 sandbox roundtrip | P1 |
| 8 | lint/typecheck 부재 | root script 없음, web tsconfig 없음 | package config | 정적 품질 상한 | lint/typecheck gate 추가 | P1 |
| 9 | `.env.example` 문서화 부족 | 1개 example만 존재 | repo root/env | 운영 재현성 저하 | env catalog 작성 | P1 |
| 10 | 고아 서피스 12종 | route 미연결 UI | `apps/web/src/components` | 유지보수·QA 혼선 | 삭제 또는 IA 연결 결정 | P1 |
| 11 | 상태 어휘 난립 | normalizeStatus, readinessModel, GuardedState 등 | web/data/components | UX·QA 일관성 저하 | 상태 taxonomy 통합 | P2 |
| 12 | HRX cross import | Matter/Client/Home이 people API 직접 import | web components | 모듈 경계 혼선 | API facade 정리 | P2 |
| 13 | test 성격 혼재 | source scan UI tests와 runtime tests 혼재 | scripts/apps/web | green 의미 불명확 | test taxonomy 분리 | P2 |
| 14 | notifications root test 누락 | 별도 실행해야 2 tests 확인 | root npm test glob | coverage 누락 | root test glob 보완 | P2 |
| 15 | production_ready_claim false 다수 | 2236 grep hits, health false | app/packages/artifacts | 프로덕션 판정 상한 | DEC-RS-001 해제 조건 별도 track | P1 |

## 2. 축 A 판정

현재 코드베이스는 축 A 기준 `데모 가능`으로 판단된다.

근거 5개:

1. [직접 재실행] API server health 200, no-token 업무 route 401, login 200.
2. [직접 재실행] Web login 후 Home/Client/Matter/People/Vault/Portal 6 view 렌더.
3. [직접 재실행] Vault document create/download/restart readback 성공.
4. [직접 재실행] Desktop smoke/session/file-bridge gate 통과.
5. [직접 재실행] Backup/restore drill 2 tests pass.

반대 근거 2개:

1. [직접 재실행] 신규 Matter 생성 표본이 400 validation block으로 중단되어 W6의 client→matter→document 수직 플로우를 만족하지 못함.
2. [직접 재실행] `npm test`와 `npm run api:test`가 green이 아니므로 내부 파일럿 전 회귀 기준이 불안정함.

따라서 내부 파일럿 가능 조건 중 서버·웹·권한·Vault·backup은 부분 충족했지만, 핵심 client/matter 생성과 전체 test green 조건이 충족되지 않았다. 베타 제공 가능 이상은 synthetic_only와 production_ready_claim false 경계상 부여 금지다.

## 3. 축 B 판정

축 B 엔터프라이즈 SaaS 목표 기준은 `구현되어 있으나 운영 부적합`으로 판단된다.

근거 5개:

1. SSO/SAML/OIDC/SCIM이 일반 운영 로그인 경로로 확인되지 않았다.
2. 멀티테넌시 모델과 deny 표본은 있으나 단일 로펌 local runtime 중심이다.
3. seat billing, SOC 2/ISO evidence pack, 중앙 observability가 미확인이다.
4. production_ready_claim false와 synthetic_only 선언이 광범위하다.
5. 외부 provider Popbill/Outlook이 승인·provider gate에 막혀 있다.

반대 근거 2개:

1. API 폭과 bounded context는 넓고 auth gate는 이전 자기주장 헤더 상태보다 전진했다.
2. Vault 문서 영속, desktop file bridge, backup/restore 같은 내부 운영 후보 요소는 확인됐다.
