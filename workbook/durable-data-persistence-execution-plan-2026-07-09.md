# 영구 데이터 보존 실행 지시서 (Durable Data Persistence) — 2026-07-09

상태: 오너 결정 D1~D16 전부 확정(질문 잔여 없음), Stage 0 레스큐 원본 대피 완료 + 복구 가능성 검증 완료, Codex 실행 대기
작성: Claude (계획), 실행: Codex
관련: workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md, docs/runbooks/backup-dr-runbook.md, docs/runbooks/store-env-catalog.md

## 1. 확정 원인 (직접 재실행으로 검증)

문제: UI 코드 수정 후 앱을 재기동하면 오너가 입력한 client 목록·matter code가 사라짐.

근거 (모두 2026-07-09 직접 확인):

1. `apps/api/src/server.js:178-226` — `LAWOS_RUNTIME_PROFILE` 미지정 시 기본 프로필이 `local-dev`이고, 이때 17개 스토어 경로가 **매 기동마다 `mkdtempSync(tmpdir())`로 새로 생성**된다. 즉 서버 재시작 = 새 빈 스토어 + 합성 시드. 이전 기동에서 쓴 데이터는 `/var/folders/.../T/lawos-*-runtime-XXXX/`에 고아로 남고 macOS가 주기적으로 삭제한다. **이것이 데이터 소실의 주 원인.**
2. `apps/api/src/store-path-manifest.js` — `operational` 프로필은 절대경로·비(非)tmpdir 스토어 경로를 preflight로 강제(exit 78). 내구성 장치는 이미 있으나 로컬 실행이 이를 사용하지 않음.
3. 데스크톱(Electron dev)은 `apps/desktop/src/main/local-api.js:58`에 의해 `~/Library/Application Support/Electron/runtime-stores/`에 durable하게 기록 중. 단 이 스토어의 idempotency/audit_events가 0 → 사용자 쓰기 흔적 없음(시드 추정).
4. `packages/matter/src/repository.js:112` — matter 스토어는 `writeFileSync` 직접 쓰기(비원자적). 크래시 시 파일 훼손 가능. master-data는 tmp+rename 원자적 쓰기(`packages/master-data/src/repository.js:83-85`).
5. AWS 자산 존재: `apps/api/src/lambda.js` — amic-vault prod Lambda + Postgres(Secrets Manager `/amic-vault/prod/api/database-url`), `docs/runbooks/aws-sso-role-chain.md`, S3는 vault 마이그레이션 스테이징에서 사용 이력.

## 2. 오너 결정 (2026-07-09 답변, 확정)

| ID | 질문 | 결정 |
| --- | --- | --- |
| D1 | 데이터 입력 환경 | 혼합/불명 → 전 위치 스캔·병합 방식으로 복구 |
| D2 | AWS 구조 | **S3 버전닝 백업 먼저 → 기존 amic-vault Postgres 승격** (2단계) |
| D3 | RPO | **쓰기마다 즉시(RPO≈0)** — backup-dr-runbook의 `pending_owner_approval` RPO 항목에 대한 오너 승인으로 기록할 것 (RTO는 Q-06 대기) |
| D4 | 실데이터 정책 | **G0(production-data-policy-contract) 재가 진행, AWS에 실데이터 저장** — 암호화(KMS)·접근통제 전제 |

## 2b. 오너 결정 2차 (2026-07-09 답변, Q-01~Q-12 전부 확정)

| ID | 항목 | 결정 |
| --- | --- | --- |
| D5 (Q-01) | durable 홈 | `~/Library/Application Support/LawFirmOS/runtime-stores/` 확정 |
| D6 (Q-02) | 병합 충돌 규칙 | **최신 우선(updated_at/mtime) 자동 병합**. 복구 검증 기준: client "그래비티랩스", "오윤록 외 2명" / matter code "새빗켐", "DEAL", "Project Tempus" |
| D7 (Q-03) | 데스크톱 입력 | 없음 → 데스크톱 스토어는 시드로 취급 |
| D8 (Q-04) | AWS 계정 | **matter 계정 사용** — `matter-prod-deploy-admin` 프로필(소스 `amic-vault-staging-admin` SSO role-chain, docs/runbooks/aws-sso-role-chain.md) 확인됨 |
| D9 (Q-05) | 백업 보존 | **무기한** — S3 버전 무기한 보존(lifecycle 만료 없음) + 삭제 거부 버킷 정책 |
| D10 (Q-06) | RTO | **30분** — 복원은 단일 명령 스크립트로, 리허설에서 30분 내 완료 증빙 |
| D11 (Q-07) | 기기 | **여러 기기** — 멀티 디바이스 동기화 요구 (Stage 5 확장 참조) |
| D12 (Q-08) | 오프라인 | **필수** — 오프라인 입력 지속, 온라인 복귀 시 비동기 반영 |
| D13 (Q-09) | 암호화 | AWS 관리 KMS 키(SSE-KMS, aws/s3·aws/rds) |
| D14 (Q-10) | 예산 | 월 $100 이상 가능 → 소형 RDS 상시 가동 허용 |
| D15 (Q-11) | 우선순위 | **Stage 0~2 즉시 최우선 승인** (CP 큐·UI 트랙보다 선행) |
| D16 (Q-12) | Postgres 범위 | **17개 스토어 일괄 승격** (컷오버 윈도우는 canonical 계획과 통합) |

## 3. Stage 0 — 레스큐 (Claude가 원본 대피 완료, Codex는 병합)

완료된 것: `/var/folders/ty/.../T/lawos-*` 고아 스토어 194개 파일 + 데스크톱 `Electron/runtime-stores` 13개 파일을 `~/lawos-backups/data-rescue-2026-07-09/`로 복사 완료(원본 보존, 읽기만 수행).

사용자 쓰기 흔적(idempotency·audit_events > 0)이 확인된 복구 후보:

| 파일 | 크기 | mtime | 내용 |
| --- | --- | --- | --- |
| `temp-stores/lawos-crm-runtime-r4xcVn/crm-store.json` | 25,607B | 07-01 17:52 | records 7, 쓰기 5건 — **client 목록 후보** |
| `temp-stores/lawos-matter-runtime-SgqYNJ/matter-store.json` | 436,081B | 07-02 14:01 | records 255, 쓰기 2건 — **matter code 후보** |
| `temp-stores/lawos-intake-runtime-i7diZV/intake-store.json` | 48,377B | 07-02 19:35 | records 11, 쓰기 8건 |

복구 가능성 검증 결과 (2026-07-09 직접 확인):
- 오너가 기억한 5개 이름(그래비티랩스, 오윤록, 새빗켐, DEAL, Project Tempus)이 레스큐 사본에 모두 존재.
- 단, 이 이름들은 **코드 시드에도 포함**됨: `packages/matter/src/amic-matter-code-candidates.js`, `packages/master-data/src/amic-client-candidates.js` (canonical 실데이터 주입 산출물). 즉 canonical 목록 자체는 코드가 원본이라 소실되지 않음.
- 따라서 실제 복구 대상 = **시드(candidates) 외 추가 입력 레코드 + 시드 레코드에 대한 수정분**. 판별 기준: 스토어의 idempotency/audit_events 이력, candidates 파일과의 대조.

Codex 작업:
- S0-1 병합 도구 작성(`scripts/rescue-merge-stores.mjs`): 레스큐 사본 전체를 스캔해 (a) candidates 시드와 일치하지 않는 추가 레코드, (b) audit 이력이 있는 시드 레코드 수정분을 추출, durable 홈으로 병합. 충돌은 **최신 우선(updated_at, 없으면 파일 mtime) 자동 병합** (D6).
- S0-2 병합 결과 증빙: 복구된 client/matter 건수, 제외(시드 동일) 건수, 충돌 자동해소 목록을 `artifacts/manual-qa/`에 기록. 검증 기준 5개 이름이 병합 후 API 응답에 나타나는지 확인.

## 4. Stage 1 — 단일 durable 홈 강제 (모든 실행 모드)

- S1-1 durable 홈: `~/Library/Application Support/LawFirmOS/runtime-stores/` (D5 확정). 웹 dev·데스크톱 dev·패키지 데스크톱 모두 같은 디렉터리를 바라보게 한다.
- S1-2 웹 dev 기동 경로 수정: 오너가 쓰는 dev 실행 스크립트가 `LAWOS_RUNTIME_PROFILE=operational` + `LAWOS_*_STORE_PATH`(17종 전부, store-env-catalog 기준) + `LAWOS_API_SESSION_SECRET`를 주입하도록. tmpdir fallback은 테스트 전용으로만 남긴다(테스트 회귀 금지).
- S1-3 시드 가드 검증: 비어있지 않은 스토어에 시드가 절대 덮어쓰지 않음을 테스트로 고정.
- S1-4 데스크톱: dev Electron(`Electron/runtime-stores`)과 패키지 앱(`AMIC Vault/…`)의 userData 분기를 S1-1 홈으로 통일하거나, 최소한 문서화 + 기동 로그에 스토어 경로 출력.

게이트 G1: "UI 코드 수정 → 서버/앱 재시작 → client·matter 데이터 보존" 왕복 증빙(웹 dev·데스크톱 dev 각각).

## 5. Stage 2 — 쓰기 내구성

- S2-1 모든 저장 경로를 tmp 쓰기 + fsync + rename 원자 패턴으로 통일(우선순위: `packages/matter/src/repository.js`).
- S2-2 저장 시 세대 스냅샷: 쓰기 직전 상태를 `~/lawos-backups/data/<store>/<ts>.json`으로 로테이션 보관. 무기한 보존(D9)은 S3가 담당하고, 로컬은 디스크 보호를 위해 스토어당 최근 200세대 유지.
- S2-3 수축 가드: 직전 대비 레코드 수가 급감(예: >30%)하는 쓰기는 명시 플래그 없이 차단 + 로그.

게이트 G2: 쓰기 도중 프로세스 kill 반복 후에도 스토어 파싱 가능 + 직전 세대 복원 가능 증빙.

## 6. Stage 3 — AWS S3 백업 (D2 1단계, D3 RPO≈0, D8~D13)

- S3-1 버킷: **matter 계정**(`matter-prod-deploy-admin` role-chain, D8), ap-northeast-2, 버전닝 ON + **버전 무기한 보존**(lifecycle 만료 없음) + 삭제 거부 버킷 정책(D9), SSE-KMS(AWS 관리 키, D13), 퍼블릭 차단.
- S3-2 업로더: 스토어 쓰기 성공 시마다 debounce(수 초) 후 변경 스토어를 업로드. **기기별 프리픽스**(`devices/<device-id>/…`)로 업로드해 멀티 디바이스 간 백업 상호 덮어쓰기 금지(D11). 오프라인이면 로컬 큐잉 후 온라인 복귀 시 재시도(D12).
- S3-3 복원: 단일 명령 스크립트(`scripts/restore-from-s3.mjs`) + 리허설 1회 실행, **30분 내 완료 증빙(D10)** → backup-dr-runbook의 `pending_rehearsal` 해소.
- S3-4 자격: 기존 aws-sso-role-chain 재사용, 키 커밋 금지(.env 규칙 준수).

게이트 G3: 로컬 스토어 삭제 → S3에서 전체 복원(≤30분) → 앱에서 검증 기준 5개 이름 확인 왕복 증빙.

주의(멀티 디바이스 과도기): Stage 5 완료 전까지 파일 스토어는 기기 간 자동 동기화되지 않는다. **과도기에는 데이터 입력을 주 사용 기기 1대로 한정**하는 것을 운영 규칙으로 명시(D11의 완전한 해소는 Stage 5).

## 7. Stage 4 — 정책·거버넌스 (D4)

- S4-1 production-data-policy-contract 재가 기록(canonical-tenant-data-injection 계획의 G0 충족으로 인정, 해당 문서와 상호참조).
- S4-2 backup-dr-runbook에 D3(RPO≈0)·D10(RTO 30분) 오너 승인 기입, `pending_owner_approval` 항목 해소.

## 8. Stage 5 — Postgres 승격 (D2 2단계, D11·D12·D16, SaaS 트랙 정합)

- S5-1 **17개 스토어 일괄 승격(D16)**: 기존 Postgres(secret `/amic-vault/prod/api/database-url`, matter 계정 role-chain으로 접근)를 원본으로 하는 repository 구현을 persistence 계층에 추가. 파일 스토어는 로컬 캐시/export로 강등. 월 $100+ 예산 내 소형 RDS 상시 가동(D14).
- S5-2 canonical-tenant-data-injection 실행 지시서 v2.1의 컷오버 윈도우·verifyToken 재작성 항목과 일정 통합(중복 작업 금지).
- S5-3 **멀티 디바이스 + 오프라인(D11·D12)**: Postgres가 단일 원본. 각 기기는 로컬 durable 캐시에 먼저 쓰고(오프라인 지속), 온라인 시 idempotency key 기반 쓰기 큐를 재생. 충돌은 **최신 우선(updated_at) 자동 해소(D6)** + 자동해소 내역을 audit_events에 기록.

게이트 G5: 두 기기에서 같은 client를 오프라인 수정 → 온라인 복귀 → 최신 우선으로 수렴 + 감사 기록 존재 증빙.

## 8b. 핫픽스 H1~H5 — 2026-07-09 오전 "여전히 안 보임" 원인 (최우선, Stage 0~1에 선행)

2026-07-09 01:30~01:39 Codex가 Stage 0/1 상당 부분을 이미 착수함(미커밋): durable 홈 생성+복원(`runtime-stores-restored/`), `local-durable-store-paths.js` 신설(durable 홈=operational 프로필 강제), 4181 durable API 기동, vite 프록시 4181 지향. 그러나 아래 3개 갭 때문에 오너에게 데이터가 보이지 않음 (모두 2026-07-09 직접 재현·확인):

1. **로그인 벽**: durable 홈은 operational 프로필 → 합성 로그인 거부(`AUTH_SYNTHETIC_LOGIN_DISABLED` 재현됨). 그런데 durable `auth/`에는 `api-session-secret`만 있고 **credential-store.json이 없어** 비밀번호 로그인도 불가. 또 01:30에 세션 시크릿이 새로 생성돼 데스크톱의 저장된 세션(3a0520a49)도 전부 무효 → UI는 조용히 빈 목록.
2. **테넌트 불일치**: 복원된 client 9건은 `tenant_cmp_g6_synthetic`, master-data 305건은 `tenant_rp04_synthetic`인데 오너 세션 홈 테넌트는 `tenant_amic_matter_vault` → 로그인해도 client 목록은 빈 화면.
3. **브리지 스토어 미병합**: 6/29부터 vite 기본 프록시(4180)가 가리키던 브리지 서버의 `/tmp/lawos-matter-vault-bridge-store-20260629033519.json`(5MB, records 217, **쓰기 1,392·감사 622**, 그래비티랩스 184회)이 병합 소스에서 빠짐. → 레스큐 사본 `~/lawos-backups/data-rescue-2026-07-09/tmp-bridge-stores/` 확보 완료(/tmp의 lawos-* 46개 파일).

Codex 핫픽스:
- **H1 자격 부트스트랩**: durable 홈에 credential store 생성 경로 확보. 기존 `run-cti-password-reset-jwsuh-*` 재설정 플로우(승인 게이트 유지)를 4181/durable 홈에 연결해 오너 비밀번호 1회 설정. 등록 시드 사용자에 대한 최초 기동 `must_change_password` 초기화도 허용.
- **H2 조용한 빈 화면 금지**: 데스크톱/웹 UI가 세션 401(`AUTH_SESSION_REQUIRED`/`AUTH_SESSION_INVALID`)을 받으면 빈 목록이 아니라 재로그인 화면으로 전환. 저장 세션은 폐기.
- **H3 테넌트 정합**: 복원 레코드 중 오너 실데이터를 D6(최신 우선) 규칙으로 `tenant_amic_matter_vault`로 재테넌트/병합. synthetic 테넌트 레코드는 시드로 분류.
- **H4 브리지 스토어 병합·회수**: 레스큐 사본의 브리지 스토어를 Stage 0 병합 소스에 추가. 4180 브리지 프로세스(6/29 screen 세션)는 durable 홈 기반으로 재기동하고 /tmp 스토어 의존 제거.
- **H5 가시성 게이트**: G1 증빙에 "오너 로그인 → Clients에 그래비티랩스 표시, Matters에 새빗켐·DEAL·Project Tempus 표시" 추가.

## 9. 실행 순서 요약 (D15: Stage 0~2 즉시 최우선)

1. Stage 1 (durable 홈) → 2. Stage 0 (레스큐 병합, durable 홈이 병합 대상이므로 1 이후) → 3. Stage 2 (쓰기 내구성) → 4. Stage 3 (S3 백업+리허설) → 5. Stage 4 (정책 기록) → 6. Stage 5 (Postgres 일괄 승격).

## 10. 검증 원칙

- 각 게이트 증빙은 [직접 재실행] 기준으로 기록(에이전트 보고만으로 통과 처리 금지).
- production_ready 게이트 약화 금지(standing goal 준수).
