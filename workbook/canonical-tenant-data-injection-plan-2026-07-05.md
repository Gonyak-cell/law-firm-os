# 실사용자·실데이터 전수 주입 계획 — Canonical Tenant Data Injection

> **[대체됨]** 이 문서는 분석·결정요청판(v1)이다. 실행 지시서는 `workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md`(v2.1, 결정 확정 + 적대 검증 22건 반영)를 따른다. 본 문서는 실측 근거·리스크 상세의 참조용으로 보존한다.

작성일: 2026-07-05
작성 방식: 5축 병렬 정밀 조사(identity-authz / client-matter master data / production runtime-persistence / feature consumption map / seed governance) → 완전성 비판·교차 검증(파일:라인 근거) → 종합. 비판 단계에서 적발된 축간 모순(테넌트 분열, operational 프로필 자기모순, 인원수 9 vs 10, 페트라 소속 미모델링)은 본문에 정정 반영함.

검증 출처 구분: 본 문서에서 [직접]은 계획 작성 세션에서 직접 재실행·재독해한 사실, [보고]는 정찰 에이전트 보고(비판 에이전트가 파일 재독해로 재검증한 항목 포함이나 본 세션에서 미재실행)를 뜻한다. 구현 착수 시 [보고] 항목 중 게이트 판정에 쓰이는 것은 Stage 0에서 재확인한다.

---

## §0 권한 한계

이 문서는 계획이며 어떤 완료 권한도 없다. 소스오브트루스 위계(라이브 git+manifests > plan JSON > queue > ledger > 증거 > 문서)를 준수하며, 충돌 시 라이브 리포 상태가 우선한다. 이 문서는 구현·원장 변경·계약 변경·production_ready/go-live 클레임을 승인하지 않는다. 리포 변경·커밋은 구현 측(Codex) 소관이다. 기존 게이트(production_ready, runtime_ready, UPL-A05 잔재 검사, 등록시드 경계 계약)는 약화하지 않고 적층만 한다.

---

## §1 목표의 조작적 정의

소유자 지시(2026-07-05): "연락처 엑셀의 사용자·권한 전부 반영 + 기구축 client/matter/matter code DB 일체를 프로덕션 반영 + 명시하지 않은 부분까지 유기적 운영 가능 + 코드 개발이 계속되어도 변함없이 유지."

이를 검증 가능한 6개 완료 조건으로 변환한다:

| # | 완료 조건 | 판정 기준 |
|---|---|---|
| C1 | **단일 canonical tenant** | 사람·client·matter·code·관계 레코드가 동일 tenant_id 아래 공존. 실테넌트 내 합성 레코드 0, 합성 테넌트 내 실데이터 0 (양방향 잔재 검사) |
| C2 | **실사용자 인증** | 엑셀의 9인만 프로덕션 로그인 가능. 크리덴셜이 이메일로부터 유도 불가. 역할·스코프는 등록시드 위계 그대로 |
| C3 | **마스터데이터 전수** | client 99 + matter code 148 + 관계(담당변호사 스태핑, client↔contact↔party) 프로덕션 존재. 카운트·해시 readback 100% 일치 |
| C4 | **기능 유기 연결** | 모든 기능 표면(Matters/Vault/Clients/CRM/Finance/Analytics/HRX/Intake/Admin)이 canonical tenant를 읽고 실데이터를 렌더. 합성 테넌트 상수를 기본 경로에서 제거 |
| C5 | **영속성** | Lambda 콜드스타트·재배포 후에도 런타임 생성 데이터·감사로그가 보존됨을 실측으로 증명 |
| C6 | **회귀 차단** | C1~C5를 검증하는 게이트가 npm run validate 체인에 상시 편입. 데이터 변경은 approval_ref 없이 불가 |

**핵심 순서 규칙: C5(영속)·C2(인증) 확보 전에 실데이터 추가 주입(특히 PII)을 실행하지 않는다.** 현재 인증은 이메일에서 유도 가능한 토큰이고 스토어는 휘발 가능성이 미확정이므로, 순서를 어기면 실데이터 노출과 소실을 동시에 초래한다(§6 R1·R2).

---

## §2 현재 상태 실측

### 2.1 이미 구축된 자산 (재사용 대상)

1. [직접] **사용자 등록 시드** `docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json` — 엑셀과 동일한 9인 + QA 2계정, 역할 위계(role_rank 9단계), 사용자별 role_ids/group_ids/scopes/tenant_memberships, jwsuh@amic.kr=system_super_admin(1000), 전원 mfa_required. 소스 워크북 sha256까지 기록됨. 엑셀(연락처_아믹_페트라_2026.06.xlsx)과 대조 결과 9인 명단·이메일·직급 완전 일치 — **사용자·권한의 canonical 원천으로 그대로 승격 가능**.
2. [직접] **client/matter code 정식 모듈** `packages/matter/src/amic-matter-code-candidates.js` (4,769줄, 생성물) — client 99, matter code 148(민사 65 / 형사 28 / 행정 15 / 기업자문 10 / M&A 30), 필드에 matter_axis·source_lane·source_ref·confidence 포함. 단 **tenant_id가 `tenant_rp05_synthetic`으로 하드코딩**.
3. [직접] **프로덕션 브리지 업서트 패턴** `scripts/run-current-matter-codes-production-bridge-upsert.mjs` — idempotency hash, approval_ref, readback 검증, 증거 아티팩트 규약을 갖춘 유일한 실전 업서트. 2026-07-01 실행 완료(client 99 / matter 148 upsert PASS).
4. [보고] **역할 레지스트리** `apps/api/src/lawos-role-registry.js` — user_id→role_profile/scopes/hrx_scopes 매핑(lawos_admin/partner/attorney/hr/staff/desktop_qa/qa_tenant_b).
5. [보고] **HRX 로스터** `docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json` — 9인 인사 원장(affiliation·department·org_unit 포함).
6. [보고] **잔재 검사 패턴** `scripts/run-upl-a05-real-tenant-synthetic-residue-proof.mjs` + `validate-upl-a05-*` — 실테넌트 내 합성 잔재 0 검증(2026-07-03 PASS). 역방향(합성 테넌트 내 실데이터) 검사는 부재.
7. [보고] **인증 커널** — 서버 파생 principal(위조 헤더 거부), fail-closed 권한 평가, HMAC 세션 토큰, /api/admin/security/* (disable/reactivate/break-glass/audit). 구조는 건전하며 크리덴셜·영속만 교체하면 됨.

### 2.2 목표 달성을 막는 실측 상태

1. **3-테넌트 분열** — 사람은 `tenant_amic_matter_vault`(시드:5 [직접]), client/matter는 `tenant_rp05_synthetic`(apps/api/src/matter-runtime-context.js:122 DEFAULT_TENANT, :236-281에서 99+148을 rp05로 베이크 [보고]; 업서트 영수증 tenant_id도 rp05 [보고]), CRM 연락처는 amic 바인딩 [보고]. 즉 현재 "회사 사람들"과 "회사 사건들"이 서로 다른 테넌트에 산다.
2. **웹 표면의 합성 테넌트 상수 12개** — apps/web/src/data/apiClient.js:4-15에 rp04/rp05/cmp_g6~g10 하드코딩, Finance=cmp_g7, Analytics=cmp_g8 [보고]. 주입만 해서는 UI가 실데이터를 읽지 않는 표면이 남는다.
3. **인증이 사실상 부재** — 크리덴셜이 `local-dev-only:{email}` 형식이라 이메일만 알면 누구나 로그인 가능(system_super_admin 포함) [보고]. 한편 `LAWOS_RUNTIME_PROFILE=operational`로 전환하면 provider=null이 되어 **전원 로그인 불가**(session-auth.js:195-198, 344-345, 378-382 [보고, 비판 에이전트 재검증]) — "operational로 올리면 된다"는 접근은 자기모순.
4. **영속성 미확정** — 13개 JSON 파일 스토어(store-path-manifest.js [보고]), Lambda 쓰기 가능 경로는 휘발성 /tmp뿐인데 operational 프리플라이트는 tmpdir 스토어를 거부(exit 78 [보고]). EFS 마운트 여부 문서 근거 없음. **콜드스타트 시 스토어가 초기화되어도 베이크된 99+148이 재시드되어 화면상 정상으로 보이므로 런타임 생성 데이터 소실이 은폐됨** [보고].
5. **크로스테넌트 블랭킷 그랜트** — amic 테넌트 사용자에게 15개 테넌트 전부의 tenant_ids가 부여됨(session-auth.js:126-128 [보고]). 실사용자가 합성/데모 데이터 14개 테넌트를 그대로 보게 되는 구조이며, 현재 테넌트 분열이 "작동해 보이는" 이유가 바로 이 그랜트다.
6. **감사로그 인메모리** — securityAuditEvents가 프로세스 배열(session-auth.js:202 [보고]), LAWOS_AUDIT_STORE_PATH 부재. 실계정 disable/break-glass 기록이 리사이클 시 소실.
7. **세션 시크릿 비고정** — local-dev 프로필에서 콜드스타트마다 랜덤 재생성 → 기존 세션 전원 무효화가 불규칙 발생 [보고].
8. **기타 정합 결함** — ① 프로덕션 readback 149건(148 + 정체불명 잔여 1) [보고] ② 합성 fixture matter 2건('AMIC/LIT/CIV/합성개시', 'Silent/LIT/CIV/윤리장벽')이 실 matter와 동일 rp05 네임스페이스 공존, matter_code 유일성 충돌 시 hard-throw [보고] ③ 시드 account_count=10은 QA 포함 수치, 실제 인원은 9명 [직접] ④ 김양태 대표는 로스터상 PETRA BRIDGE PARTNERS 소속 — 단일 "AMIC" 가정 불성립 [보고] ⑤ 데스크톱 v0.1.9 패키지에 시드 사본 내장 → drift 가능 [보고].
9. **거버넌스 공백** — 2026-07-01 업서트는 CP/goal 거버넌스 밖 ad-hoc 실행 [보고]. contracts/production-data-policy.json 부재 [보고]. matter별 담당변호사 매핑 데이터는 어디에도 없음 [보고].
10. [직접] **최신 프로덕션 스모크 경계**(lcx-vltui-production-smoke, 2026-07-05 재생성, PASS): real_client_data_used=false, synthetic_session_login_used=true, owner_final_approval_claim=false — 프로덕션은 아직 실데이터·실인증 위에서 돌고 있지 않다는 것이 공식 상태.

---

## §3 소유자 결정 레지스터 (D-01 ~ D-10)

구현 착수 전 소유자 결정이 필요한 항목. 각 항목에 권고안을 제시한다. 결정은 docs/launch 결정 레지스터 규약(approval_ref, 서명자, 일자)으로 기록한다.

| ID | 결정 사항 | 권고안 | 차단하는 Stage |
|---|---|---|---|
| D-01 | canonical tenant 확정 | `tenant_amic_matter_vault`로 통일. rp05는 합성 전용으로 반납하고 client/matter를 마이그레이션. 근거: 사용자·CRM·HRX가 이미 amic 테넌트, UPL-A05 잔재 계약도 amic 기준 | S3 이후 전부 |
| D-02 | 인증 모델 | 2단계: **(즉시)** 서버측 비유도 크리덴셜 — 사용자별 랜덤 초기 비밀번호를 해시 저장, out-of-band 배부, synthetic token은 프로덕션 경로에서 차단. **(중기)** M365 Entra ID OIDC(데스크톱 PKCE 스텁 활용) + MFA. operational 프로필은 실 provider 구현과 동시에만 전환 | S2, S4~S5의 PII |
| D-03 | 전화번호·PII 주입 범위 | 등록시드의 no-phone 경계 계약은 유지(비약화). 전화번호는 CRM contact store에만, `contracts/production-data-policy.json`(PIPA 근거·보존기간·암호화 요건) 신설·서명 후 주입 | S5 연락처 |
| D-04 | QA 계정 처분 | 프로덕션 시드에서 두 QA 계정 status=disabled (제거 대신 비활성 — 기존 검증 스크립트들이 11계정 구조를 기대). qa.tenant-b의 tenant_b_qa_synthetic 접근은 유지하되 실테넌트 접근 불가 확인 | S4 |
| D-05 | 페트라 소속 모델링 | affiliation 필드 이원화(AMIC / PETRA BRIDGE PARTNERS). 김양태의 사건 접근 범위(전체 vs 자문 한정)를 소유자가 지정 | S4 |
| D-06 | 크로스테넌트 그랜트 축소 | 실사용자 tenant_ids = [tenant_amic_matter_vault] 단일화. 합성 테넌트 접근은 QA 계정 전용으로 격리 | S3 |
| D-07 | 잔여 149번째 matter 처분 | Stage 0 프로브로 정체 확인 후 삭제 또는 정식 편입 결정 | S3 |
| D-08 | 거버넌스 트랙 | goal-closeout goal 1개 신설 + launch-TUW(LT-*) 등록으로 정규화. 2026-07-01 ad-hoc 업서트도 소급 편입 | 전체 |
| D-09 | **matter별 담당변호사 매핑** | 리포에 존재하지 않는 유일한 신규 데이터. 소유자가 148건 × 담당(주담당/부담당) 매핑표 제공 필요 — 엑셀 1장이면 충분(matter_code, 주담당 email, 부담당 email). OneDrive 폴더 구조에서 초안 자동 생성 후 소유자 확정 방식 권고 | S5 스태핑 |
| D-10 | 스토리지 방식 | Stage 0 프로브 결과에 따라: EFS 마운트(최소 변경) vs DynamoDB+S3(엔터프라이즈 목표 정합). 권고: 단기 EFS로 C5 확보 → RS-1(persistence) 트랙에서 DB 전환. 어느 쪽이든 백업·복원 드릴 필수 | S1 |

---

## §4 실행 단계 (Stage 0 ~ 6)

각 Stage는 goal-closeout/launch-TUW 규약으로 분해한다(LP4 TUW, VC 바인딩, 증거 경로 docs/lazycodex/evidence/ 또는 docs/goal-closeout/). Stage 게이트는 기존 게이트에 적층하며 약화하지 않는다.

### Stage 0 — 사실 확정 프로브 (결정 불요, 즉시 착수 가능)

목적: [보고] 상태의 게이트 관련 사실을 재확인하고 §3 결정에 필요한 근거를 공급.

| # | 프로브 | 방법 | 판정 대상 |
|---|---|---|---|
| P1 | Lambda 실환경 | `aws lambda get-function-configuration --function-name matter-lawos-api-prod --region ap-northeast-2` → LAWOS_RUNTIME_PROFILE / LAWOS_*_STORE_PATH / LAWOS_API_SESSION_SECRET 유무 / FileSystemConfigs(EFS) | D-10, R2 실재 여부 |
| P2 | 라이브 영속 계층 확정 | `grep -rn "packages/persistence" apps/api/src packages/*/src` — 프로덕션 차단 계약이 있는 packages/persistence가 라이브 경로에 있는지, 아니면 matter/repository.js(무가드)인지 | S1 설계 |
| P3 | 콜드스타트 유실 실측 | 마커 레코드 기록 → Lambda 강제 콜드스타트(환경변수 no-op 갱신) → readback. 마커 소실 여부로 휘발성 확정 | C5 기준선 |
| P4 | 149번째 잔여 row 식별 | 프로덕션 readback ↔ AMIC_CURRENT_MATTER_CODE_CANDIDATES 148개 id diff | D-07 |
| P5 | 데스크톱 시드 drift | repo 시드 ↔ apps/desktop/dist 내장 시드 diff | S4, 릴리스 게이트 |
| P6 | 담당변호사 매핑 초안 | OneDrive 사건폴더 구조에서 lane별 초안 자동 생성(스크립트) → D-09 결정용 워크북 산출 | D-09 |

산출: `docs/lazycodex/evidence/matter-web/artifacts/canonical-injection-stage0-probe-2026-07-*.json/md`

### Stage 1 — 영속 기반 확보 (C5) 〔선행: P1~P3, D-10〕

1. 스토어 영속화: D-10 결정에 따라 EFS 마운트 + LAWOS_*_STORE_PATH 이관 또는 DB 스토어. 13개 스토어 전부 + **LAWOS_AUDIT_STORE_PATH 신설**(감사 이벤트 영속화 — 실계정 운영의 전제).
2. `LAWOS_API_SESSION_SECRET` 고정(≥32자, SSM/Secrets Manager) — 콜드스타트 세션 무효화 제거.
3. 재시드 가드: 스토어가 비어 있을 때만 시드 주입 허용, 기존 스토어 덮어쓰기 금지를 코드 계약으로 명시(현행 repository.js 동작 유지 + 명시적 가드/로그).
4. 백업·복원: drill-matter-vault-backup-restore.mjs를 프로덕션 스토어 대상으로 확장, 주기 드릴.
5. **게이트 S1-G**: P3 재실행 — 콜드스타트 후 마커 보존 + 감사 이벤트 보존 PASS.

### Stage 2 — 인증 신뢰화 (C2) 〔선행: D-02〕

1. 크리덴셜 스토어: 사용자별 해시 크리덴셜(scrypt/argon2), 초기 비밀번호 out-of-band 배부, 최초 로그인 시 변경 강제. synthetic token 경로는 프로덕션 프로필에서 차단.
2. operational 프로필 정합: 실 provider 구현과 함께 LAWOS_RUNTIME_PROFILE=operational 전환(로그인 차단 모순 해소). 전환 전 store-path-manifest tmpdir 프리플라이트 통과 필요(S1 완료가 전제).
3. 토큰 회수/재발급 절차 + 비밀번호 재설정 플로우(AuthSurface의 미구현 버튼 연결).
4. 중기: Entra ID OIDC + MFA (별도 TUW, 이 계획의 차단 요소 아님 — 단 PII 전량 주입은 MFA 이전 금지 여부를 D-03에서 함께 결정).
5. **게이트 S2-G**: 9인 로그인 성공 + 유도 토큰(local-dev-only:*)로 로그인 실패 + QA 계정 disabled 확인.

### Stage 3 — 테넌트 통일 (C1) 〔선행: D-01, D-06, D-07, S1〕

1. canonical 모듈 탈테넌트화: amic-matter-code-candidates.js에서 tenant_id 하드코딩 제거 — 데이터는 테넌트 중립, 주입 시점에 파라미터로 스탬프(schema_version 도입: `lawos.amic_matter_codes.v1`).
2. rp05 → amic 마이그레이션: 기존 브리지 업서트 패턴 재사용(idempotency hash + approval_ref + readback 100%). 149번째 잔여 row는 D-07 결정대로 처분.
3. 합성 fixture 분리: '합성개시'·'윤리장벽' matter를 실테넌트 밖(합성 테넌트)으로 이전 — matter_code 네임스페이스 충돌 제거.
4. 블랭킷 그랜트 축소(D-06): session-auth의 전체-테넌트 부여 로직을 실사용자=단일 테넌트로 교체.
5. 웹 표면 테넌트 상수 교체: apiClient.js의 12개 합성 상수를 세션 envelope tenant_refs 기반으로 전환(Finance/Analytics 포함). 합성 상수는 QA/데모 프로필에서만 주입.
6. **게이트 S3-G**: 양방향 잔재 검사 — (a) UPL-A05 기존 검사 PASS 유지, (b) 신설 역방향 검사: 합성 테넌트에 실 client/matter 0건, (c) canonical tenant에서 client 99·matter 148(+D-07 결과) readback 일치.

### Stage 4 — 사람·권한 주입 (C2 완성) 〔선행: S2, D-04, D-05〕

1. 등록시드 → 프로덕션 계정 스토어 주입(영속 스토어 기반). 시드 JSON은 "초기 주입+검증 기준"으로 유지하되 런타임 원본은 스토어.
2. user_id ↔ employee_id 크로스워크: lawos-role-registry, hrx-member-roster, 등록시드 3원장 정합 검증기 신설(이메일 기준 조인, 9인 전원 일치).
3. 김양태 affiliation=PETRA 모델링(D-05) 및 접근 범위 반영.
4. QA 계정 disabled(D-04). 데스크톱 패키지 시드 drift 게이트: 릴리스 빌드 시 repo 시드와 diff=0 검증을 빌드 파이프라인에 추가(P5 후속).
5. 역할 변경 운영 절차: 초기에는 코드 내 role registry 유지 + 변경 시 approval_ref 필수. (DB화는 후속 트랙 — 지금 범위 아님을 명시)
6. **게이트 S4-G**: 9인 각자 로그인 → 세션 envelope의 role_ids/scopes가 등록시드와 일치 + 3원장 크로스워크 PASS + 감사 이벤트 영속 확인.

### Stage 5 — 관계 데이터 전수 주입 (C3) 〔선행: S3, S4, D-03, D-09〕

1. 담당변호사 스태핑: D-09 매핑표 → MatterMember 레코드(주담당/부담당, employee_id·user_id 실값 — 현행 'emp-001' 하드코딩 대체). 148건 전수.
2. client ↔ contact ↔ party 연결: master-data Person/Organization/PartyAlias 모델로 99 client의 party 레코드 생성, matter의 legal/billing party id 실값 연결(현행 존재하지 않는 'party_rp04_amic' 참조 해소).
3. CRM 연락처: 엑셀의 전화번호 포함 여부는 D-03 결정에 종속. production-data-policy 계약 서명 후 contact store 주입.
4. 이해충돌 기준선: 99 client + 상대방(source_ref의 상대 당사자) 최소 색인으로 conflict search가 실데이터를 조회하도록 연결. (완전한 conflict 워크플로는 후속 트랙 — 최소 기준선만 이 계획 범위)
5. matter 상태 초기화: 종결 사건은 closed로 — 소유자 제공 상태표(D-09 워크북에 열 추가) 반영. 전건 'opening' 고정 상태 해소.
6. Finance/Analytics 연결: 시간·청구 레코드는 이 계획 범위 밖이나, billing_profile 스켈레톤과 matter↔client 참조가 실 id를 가리키도록 정합화.
7. **게이트 S5-G**: 브리지 업서트 영수증(카운트·해시 readback 100%) + 스태핑 148/148 + party 참조 무결성(존재하지 않는 party id 0건).

### Stage 6 — 유기 연결 전수 검증 + 회귀 게이트 상설화 (C4, C6)

1. 표면별 브라우저 프루프(기존 run-lcx-* 패턴 재사용): Matters/Vault/Clients/CRM/People(HRX)/Finance/Analytics/Intake/Admin 각각 — canonical tenant 데이터 렌더 + 실사용자 세션 + 합성 fallback 미발동을 스크린샷·JSON으로 증빙.
2. **`scripts/validate-canonical-tenant-production-ready.mjs` 신설** (상설 게이트): (a) 시드↔프로덕션 카운트·해시 일치(사람 9, client 99, matter 148±D-07) (b) 실테넌트 synthetic_only=0 + 역방향 잔재 0 (c) 감사 스토어 영속 (d) 세션 시크릿 고정 (e) 결정 레지스터 D-01~D-10 status=approved (f) production-data-policy 계약 존재. package.json `canonical-tenant:production-ready`로 와이어링, final-product-completion-gate 앞단에 편입.
3. 데이터 불변 계약: canonical fixture(시드 JSON, matter-code 모듈)의 변경은 source_revision 갱신 + approval_ref + 검증기 통과를 요구하는 계약 문서화. CI에서 fixture 해시 drift 검출 시 approval_ref 부재면 FAIL.
4. append-only 증거 원장: 모든 주입/백필 실행을 `docs/backfill-evidence-manifest.json`(run_id, approval_ref, 카운트, readback, 아티팩트 경로)에 누적.
5. **게이트 S6-G = 이 계획의 준공검사**: C1~C6 전 항목 PASS + 표면별 프루프 전건 PASS. 이때에만 스모크 boundary의 real_client_data_used를 true로 전환할 수 있다(클레임 정책 준수).

---

## §5 "개발해도 변하지 않게" — 영속 거버넌스 규약

Stage 6의 게이트가 상설화하는 원칙을 명문화한다:

1. **데이터 위계**: 프로덕션 스토어(런타임 진실) ≥ canonical fixture(git, 초기 주입+검증 기준). fixture는 빈 스토어 초기화에만 쓰이고, 기존 스토어를 덮어쓰지 않는다. 코드 배포는 데이터를 건드리지 않는다 — 데이터 변경은 오직 (a) 앱 내 사용자 행위 (b) approval_ref 있는 백필 스크립트 두 경로뿐.
2. **스키마 버저닝**: 모든 canonical 산출물에 schema_version(lawos.amic_matter_codes.v1, lawos.user-registration-seed.v0.1 유지, lawos.backfill.*.v1). 메이저 불일치 시 검증기 FAIL.
3. **멱등 계약**: 모든 백필은 idempotency hash(`hash-${source_revision}-${entity_type}-${id}` 기존 패턴) + 단일 approval_ref + readback 100% + 실패 시 중단(무음 스킵 금지).
4. **양방향 잔재 게이트 상시화**: 실테넌트↔합성 테넌트 오염을 npm run validate 체인에서 매 실행 검사.
5. **콜드스타트 내성 스모크**: 주기 스모크에 마커 보존 검사(P3 방식)를 포함해 영속 회귀를 조기 검출.
6. **비약화**: 등록시드의 registration_boundary(전화번호 미포함, 실크리덴셜 미포함)는 계약이며, 완화가 필요하면 D-03처럼 결정 레지스터를 통해서만.

---

## §6 리스크 등록부

| ID | 리스크 | 심각도 | 완화 |
|---|---|---|---|
| R1 | 유도 가능 토큰(local-dev-only:{email}) 뒤에 실데이터 — 이메일만 알면 super admin 포함 전 계정 로그인 가능 | **Critical** | S2 완료 전 PII·신규 실데이터 주입 금지(§1 순서 규칙). 기주입분(99/148)은 사건명 수준이므로 노출 표면 평가 후 필요시 브리지 토큰 회전 |
| R2 | 콜드스타트/재배포 시 스토어 소실 + 베이크 재시드가 소실을 은폐 | **Critical** | S0-P3 실측 → S1 영속화 → S5 전 게이트. 재시드 가드로 은폐 제거 |
| R3 | 블랭킷 그랜트로 실사용자에게 합성 14개 테넌트 노출(데모 오염) | High | S3-4 그랜트 축소 + 양방향 잔재 게이트 |
| R4 | 감사로그 인메모리 — 실계정 보안 이벤트 무기록 | High | S1 감사 스토어. 법률 SaaS 컴플라이언스 전제 |
| R5 | PIPA/PII(전화번호, 형사사건명 등) 정책 부재 | High | D-03 + production-data-policy 계약 신설 후 주입 |
| R6 | matter_code 네임스페이스 충돌 hard-throw(합성 fixture 공존) | Medium | S3-3 분리 |
| R7 | 이해충돌 검사 미와이어링 상태의 실사건 스태핑 | Medium | S5-4 최소 기준선, 완전 워크플로는 후속 트랙으로 명시 |
| R8 | 데스크톱 패키지 시드 drift | Medium | S0-P5 + S4-4 릴리스 diff 게이트 |
| R9 | 세션 시크릿 재생성으로 불규칙 강제 로그아웃 | Medium | S1-2 시크릿 고정 |
| R10 | ad-hoc 백필 재발(거버넌스 우회) | Medium | D-08 + §5-3 멱등 계약 + 증거 원장 |

---

## §7 순서 요약과 즉시 착수 항목

```
S0 프로브 ──┬─→ D-01~D-10 결정 ─┬─→ S1 영속 ─→ S2 인증 ─┬─→ S4 사람 ─┐
            │                    │                        │            ├─→ S5 관계 ─→ S6 준공+상설 게이트
            └────────────────────┴─→ S3 테넌트 통일 ──────┘            │
                                     (S1 이후)             D-09 매핑표 ┘
```

- **즉시 착수 가능(결정 불요)**: Stage 0 전체(P1~P6). 특히 P1(Lambda 환경)·P3(콜드스타트 실측)은 D-10과 R2 판정의 전제.
- **소유자 즉시 결정 요청**: D-01(테넌트), D-02(인증 모델), D-09(담당 매핑표 제공 방식), D-10(스토리지). 나머지는 해당 Stage 착수 전까지.
- **금지 순서**: S1·S2 완료 전 신규 실데이터(특히 전화번호 등 PII) 프로덕션 주입 금지.
- 거버넌스: D-08에 따라 goal-closeout goal 1개 + launch-TUW 등록으로 실행. 각 Stage 게이트는 기존 게이트 위 적층(비약화).

## §8 이 계획이 범위에서 제외하는 것 (명시)

- Entra ID OIDC/MFA 완전 구현(중기 트랙 — S2는 비유도 크리덴셜까지만)
- 완전한 이해충돌 워크플로·윤리장벽 운영(최소 색인만 포함)
- 시간·청구 실데이터(타임엔트리, 인보이스) 주입 — 구조 정합화까지만
- DB 전환(DynamoDB 등) 자체 — D-10에서 EFS 선택 시 후속 RS-1 트랙
- 상용(외부 테넌트) 멀티테넌시 — MAT-DEC-01 Wave 4 경로 유지
