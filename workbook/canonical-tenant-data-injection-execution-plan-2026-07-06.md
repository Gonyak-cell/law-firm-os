# 실사용자·실데이터 전수 주입 — 실행 지시서 v2.1 (결정 확정 + 적대 검증 반영)

작성일: 2026-07-06 (v2 초안 → 3렌즈 적대 검증(순서·의존 / 리포 컨벤션 / 보안·데이터 안전) 22건 반영한 v2.1)
지위: `workbook/canonical-tenant-data-injection-plan-2026-07-05.md`(분석판)를 대체. 상세 실측 근거는 v1 참조.
결정 근거: 2026-07-06 소유자 지시 — "D-01~D-10 전부 권고안대로 확정".

검증 출처: [직접] = 본 세션 재실행·재독해, [보고] = 정찰/검증 에이전트 보고. 게이트 판정용 [보고] 항목은 S0에서 재확인.
v2→v2.1 주요 정정: ① 기존 `contracts/production-data-policy-contract.json` 발견([직접] status=draft_pending_human_ratification, 미재가 시 실데이터 접촉·프로덕션 크리덴셜·상태 쓰기 전면 금지) — "신설"이 아니라 **재가가 전체 선행 게이트**로 승격 ② S2∥S3 병렬 철회 → **컷오버 윈도우** 재설계 ③ S0 병렬 철회(T04→T03 순서 강제) ④ verifyToken 재작성 명시 ⑤ TUW risk/work_type을 마스터 스키마 실제 규칙([직접] auto-A 키워드·12종 단일 enum)에 정합 ⑥ real_client_data_used 하드코딩 사이트 전수 인벤토리·적층 전환 신설 ⑦ 브리지 백도어 통제 신설 ⑧ 데스크톱 클라이언트 갱신을 범위 내로 이동. 전체 반영 대장은 §10.

---

## §0 권한 한계

이 문서는 실행 지시서이며 어떤 완료 권한도 없다. 소스오브트루스 위계(라이브 git+manifests > plan JSON > queue > ledger > 증거 > 문서) 준수, 충돌 시 라이브 리포 우선. production_ready/go-live 클레임을 승인하지 않는다. 리포 변경·커밋·프로덕션 쓰기는 Codex 소관이며, 프로덕션 쓰기는 §1 approval_ref 아래에서만 실행한다. 기존 게이트·닫힌 팩은 수정하지 않는다(마스터 §C-1) — 신규 검증은 적층(additive)으로만 추가하고, 불가피한 기존 산출물 확장은 신규 스키마 버전 + 비약화 논증 + approval_ref로만 한다.

---

## §1 결정 레지스터 — 확정본 (2026-07-06)

**총괄 approval_ref: `canonical-tenant-injection-decisions-2026-07-06`.** Codex는 착수 시 D-08 규약에 따라 정식 결정 레지스터 아티팩트(서명자=소유자)로 전사한다.

| ID | 확정 내용 | 상태 |
|---|---|---|
| D-01 | canonical tenant = `tenant_amic_matter_vault`. rp05_synthetic는 합성 전용 반납, client/matter는 canonical로 마이그레이션 | ✅ |
| D-02 | 인증 2단계. A단계: 사용자별 랜덤 초기 비밀번호 → argon2id(불가 시 scrypt) 해시 저장, out-of-band 배부, 최초 로그인 변경 강제, synthetic token 프로덕션 차단, **verifyToken 재작성 포함**(§5 S2-T02), operational 전환은 컷오버 윈도우 내. B단계(병행 설계·비차단): M365 Entra ID OIDC + MFA | ✅ |
| D-03 | PII 분리. 등록시드 no-phone 경계 유지. 전화번호는 **기존 `contracts/production-data-policy-contract.json` 재가·발효 후** CRM contact store에만. ~~신설~~ → 기존 계약 재가로 정정(v2.1) | ✅ 방식 확정 / 재가(I4) 대기 |
| D-04 | QA 2계정 프로덕션 비활성. 표현 방식: 시드 스키마 **적층 확장**(production_status=disabled, qa_tenant_scope=synthetic_only) + 시드 검증기 적층 갱신(§5 S4-T04a — 기존 status='active' 단언을 깨지 않는 신규 필드) | ✅ |
| D-05 | affiliation 이원화(AMIC / PETRA BRIDGE PARTNERS). 김양태 접근 범위 잠정 보수 기본값(M&A·자문 matter + 재무 대시보드, 송무 기록 제외), I2 회신 시 갱신 | ✅ 방식 확정 / I2 대기 |
| D-06 | 블랭킷 그랜트 축소: 실사용자 tenant_ids=[canonical] 단일. 합성 테넌트 접근 검증은 **local-dev 프로필에서** 수행(프로덕션에서는 QA 전 경로 403만 확인 — §5 S4-T04b) | ✅ |
| D-07 | 149번째 잔여 row: S0-T04 채록·판정 후 처분(삭제 또는 편입), approval_ref 기록. **S0-T04(채록)는 S0-T03(콜드스타트 시험) 이전에 완료 — 순서 강제** | ✅ 방식 확정 / 프로브 대기 |
| D-08 | 거버넌스 = goal-closeout goal 신설 + launch-TUW 원장 등록. 등록은 마스터 스키마 실규칙 준수(§3). 2026-07-01 ad-hoc 업서트 소급 등재 | ✅ |
| D-09 | 담당변호사 매핑: 초안 워크북 생성 → 소유자 확정. **초안의 담당 후보 열은 원천에 담당 정보가 없으므로 산출 가능 범위만 채우고 나머지 공란**(소유자 기입) — v2.1 정정 | ✅ 방식 확정 / I1 대기 |
| D-10 | 스토리지 = 단기 EFS(프로브 조건 분기), 후속 DB 전환 RS-1 트랙. 백업·복원 드릴 필수 | ✅ |

### §1-I 잔여 소유자 입력

| ID | 입력 | 시한 | 기본값(미회신 시) |
|---|---|---|---|
| I1 | D-09 매핑표 확정(초안 워크북 검수: 담당 기입 + 상태 확인) | ENRICH(S5) 착수 전 | 없음 — 필수 입력 |
| I2 | 김양태 접근 범위 확정 | CUTOVER 전 | 보수 기본값 유지 |
| I3 | 초기 비밀번호 배부 채널(이메일 금지) | CUTOVER 전 | **대면 배부** |
| I4 | **`contracts/production-data-policy-contract.json` 재가** + CTI 범위 한정 발효 결정(효력 조건이 L7 진입을 요구하므로, CTI goal에 대한 범위 한정 발효를 소유자 결정으로 처리 — S0-T08 패킷으로 상정) | **모든 risk-A TUW 착수 전 (G0 게이트)** | 없음 — 필수 재가. 미재가 시 실데이터 접촉 TUW 전부 착수 불가 |

---

## §2 확정 파라미터

| 항목 | 값 |
|---|---|
| CANONICAL_TENANT | `tenant_amic_matter_vault` |
| 실사용자 | 등록시드 9인(역할·스코프 시드 그대로, D-05 잠정 조정 제외) |
| 마스터데이터 | client 99 + matter code 148(±D-07), source_revision=amic_current_onedrive_matter_code_inventory_2026_07_01 |
| 프로덕션 | Lambda `matter-lawos-api-prod`, ap-northeast-2, CloudFront d2mthcc8vp3cr2, SSO 롤체인(AGENTS.md) |
| 증거 경로 | `docs/lazycodex/evidence/matter-web/artifacts/cti-*` / `docs/goal-closeout/<goal_id>/` |
| **증거 PII 규약(v2.1 신설)** | git 커밋 증거에 전화번호·개인 식별 PII 평문 금지 — 카운트 + 솔트 해시만. 전량 스냅샷·export는 비git 보안 위치(EFS/S3, 접근 통제). CI에 전화번호 패턴 검사 추가(S6-T03) |
| TUW ID | `CTI-S<stage>-T<nn>`(본 문서 참조용). 원장 등록 시 LT-* 인스턴스화 + crosswalk 병기 |
| **risk_class(v2.1 정정)** | 마스터 스키마의 sensitivity-first 규칙을 따른다. [직접] 원장 meta.auto_risk_a_keywords(migration/마이그레이션·cutover/컷오버·backfill/백필·credential/크리덴셜·실데이터·tenant_provisioning·backup/백업·restore/복원·break-glass·admin_consent 등)에 걸리는 TUW는 **자동 A** — 본 문서의 risk 표기는 잠정이며 원장 검증기가 상향하면 A 의무(permission_audit_impact 필드, 상위 모델 read-only 교차 리뷰, VC ≥2 바인딩)를 따른다 |
| **work_type(v2.1 정정)** | [직접] 12종 단일 enum: decision / runtime_write / runtime_read / schema / infra / m365_integration / ui / security_acceptance / migration / ops_runbook / training_docs / gate_assembly. 복합 표기 금지 — 복합 작업은 TUW 분리 |
| approval_ref | 프로덕션 쓰기 1배치 = 1 approval_ref(`cti-<대상>-<날짜>`), 배치 간 공유 금지. **예외 클래스(v2.1)**: 합성 마커/프로브 쓰기(전용 키 프리픽스, 자동 정리)는 상설 approval_ref `cti-probe-markers` 1건으로 갈음하고 backfill-evidence-manifest 등재 의무에서 제외 |
| **금지 순서(v2.1 강화)** | ① G0(계약 재가) 전 실데이터 접촉 TUW 착수 금지 ② S1-G(영속)·S2 코드(synthetic 차단+verifyToken 재작성) 배포 전, 실데이터를 실사용자 홈 테넌트로 **통합 이동하는 것도 금지**(신규 주입만이 아니라) ③ 마이그레이션·계정 주입·비밀번호 배부는 **컷오버 윈도우(동결) 내에서만** |

---

## §3 거버넌스 골격 (D-08, v2.1 정정)

1. **G0 게이트(신설·최우선)**: ① §1 결정 레지스터 정식화 ② S0-T08 재가 패킷 → 소유자 I4 재가로 `production-data-policy-contract` CTI 범위 발효. [직접] 미재가 상태의 계약은 실데이터 접촉·프로덕션 크리덴셜·상태 쓰기를 금지하므로, **G0 없이는 risk-A TUW 전부 착수 불가.** 원장 마스터 §C-2(실데이터 접촉 전 계약 발효)·§F-7(기본 synthetic-only)과 이로써 정합.
2. goal 신설 + launch-TUW 원장 등록: §5의 TUW를 마스터 스키마 그대로(단일 work_type, auto-A 상향 수용, 14 필수 필드) 인스턴스화. 등록 직후 `workbook/launch-tuw/validate-launch-tuw-ledger.mjs` PASS가 등록 완료 기준.
3. 검증 체인: Stage 게이트는 `scripts/validate-cti-s<stage>-gate.mjs`(신설) 기계 판정 + package.json 와이어링. **기존 게이트 스크립트·package.json 기존 항목은 무수정** — 최종 편입은 신규 컴포지트 스크립트로 적층(§5 S6-T02).
4. 소급 편입: 2026-07-01 업서트를 backfill-evidence-manifest 최초 항목으로 등재(S6-T04).
5. 보고 규약: Stage 완료 시 게이트 JSON+MD + [직접 재실행] 재현 커맨드. **브리지 경유 쓰기는 actor_id가 호출자 자기주장이므로([보고] matter-runtime-context.js:742-826), 실행자 외부 증빙(누가 어떤 크리덴셜로 invoke했는지 — CLI 캡처+SSO 세션 기록)을 manifest에 병기**(v2.1).

---

## §4 실행 시퀀스 (v2.1 재설계 — S2∥S3 병렬 철회)

```
PREP      S0 프로브 (순서: T04 채록 → T03 콜드스타트. T01·T02·T05·T06·T07 병렬, T08 패킷)
GOV       G0: 결정 레지스터 정식화 + I4 계약 재가  ←— 이후에만 risk-A 착수 가능
FOUND     S1 영속 (EFS 분기, 감사 스토어, 시크릿, 재시드 가드, 백업 드릴)
BUILD     코드·클라이언트만, 데이터 무접촉:
            S2-T01·T02·T04 (크리덴셜 스토어, provider+verifyToken 재작성, 재설정·잠금)
            S2-T06 데스크톱 v0.1.10 (비밀번호 플로우 + 최신 시드)
            S3-T01 탈테넌트화+DEFAULT_TENANT 제거, S3-T05 그랜트 축소, S3-T06 표면 스왑 (코드 완성·스테이징 검증)
            S4-T04a 시드 스키마·검증기 적층(QA production_status)
          BUILD-G: 스테이징에서 operational 프로필 전체 사이클(로그인→세션검증→보호 라우트) PASS
CUTOVER   단일 동결 윈도우(공지 후):
            ① 동결 개시(로그인·브리지 차단) → ② 검증된 스냅샷(복원 리허설 포함)
            → ③ 통합 배포: operational 전환(S2-T05) + S3-T05/T06 발효 + 신규 코드
            → ④ S3-T02 rp05→canonical 마이그레이션 + S3-T03 fixture 격리 + S3-T04 D-07 처분
            → ⑤ S4-T01 계정 병합 주입(크리덴셜 필드 불가침 merge) + S4-T03 김양태 범위 + S4-T04b QA 비활성
            → ⑥ S3-T08 브리지 토큰 회전·통제 → ⑦ S2-T03 비밀번호 발급·배부(I3)
            → ⑧ 최초 로그인 검증(CUT-G) → ⑨ 동결 해제 → ⑩ 사후 콜드스타트 재검증
ENRICH    S5 관계 주입 (I1 매핑, party, 연락처(발효 계약 하), 충돌 색인, 상태, 재무 참조)
SEAL      S6 표면 프루프 + 상설 게이트 + real_client_data_used 적층 전환 + 준공
```

- **크리티컬 패스**: G0 → S1 → BUILD → CUTOVER → S5 → S6. S0-T03 소실 판정 시 S1 최우선.
- **동결 규칙(v2.1)**: CUTOVER 중 실·합성 불문 로그인/쓰기 트래픽 차단(API 세션 표면 + 브리지 라우트 모두). 스냅샷~원본 제거 사이 쓰기 유입 시 배치 실패 처리. 동결 증빙을 배치 영수증에 포함.
- **중단 규칙**: 게이트 FAIL 시 다음 단계 금지. risk-A 실패 시 무음 스킵 금지, 즉시 중단·보고. CUTOVER는 롤백 계획(스냅샷 복원 + 프로필 원복 + 구버전 재배포) 사전 문서화 후 개시.

---

## §5 Stage별 TUW 분해

work_type은 12종 단일값, risk는 잠정(auto-A 상향 수용 — §2).

### Stage 0 — PREP 프로브 〔G0 불요. **T04 → T03 순서 강제**, 나머지 병렬〕

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S0-T01 | Lambda 실환경 실사(get-function-configuration): PROFILE/전체 STORE_PATH/SESSION_SECRET 유무/FileSystemConfigs/DEPLOYMENT_COMMIT | runtime_read | C | deployed-config receipt(시크릿 유무만, 마스킹) |
| S0-T02 | 라이브 영속 계층 확정: packages/persistence vs matter/repository.js 임포트 전수 grep 판정 | runtime_read | C | 판정문 + 파일:라인 |
| S0-T04 | **(T03보다 선행)** 프로덕션 스토어 전량 채록: readback 전체 export → **비git 보안 위치 스냅샷**, 149번째 row 식별 diff + 처분 권고. 증거에는 카운트·해시만(PII 규약) | runtime_read | A(실데이터) | 스냅샷 존재 + diff 결과 + D-07 권고안 |
| S0-T03 | 콜드스타트 유실 실측: 합성 마커 기록(approval_ref `cti-probe-markers`) → no-op env 갱신으로 강제 콜드스타트(**Lambda 설정 변경 부작용을 permission_audit_impact에 기록**) → readback | runtime_write | B | 보존/소실 판정. 소실 시 R2 확정·S1 최우선 |
| S0-T05 | 데스크톱 시드 drift diff(repo ↔ v0.1.9 패키지) | runtime_read | C | diff 결과 |
| S0-T06 | 담당 매핑 초안 워크북: 148행 × (matter_code, lane, 상태 추정(source_kinds 근거), 근거 열). **주담당·부담당 열은 산출 가능한 것만 채우고 나머지 공란**(원천에 담당 정보 없음 — 소유자 기입용). 보조 소스(representative_path 하위 문서 작성자 스캔) 시도는 선택적·불확실 표기 | runtime_read | B | 148행 전건 + 상태·근거 열 + 공란 정책 명기 → I1 전달 |
| S0-T07 | **real_client_data_used 사이트 전수 인벤토리(신설)**: 값 생산·하드코딩·단언(assert) 지점 전수 grep — [보고] 최소: run-lcx-vltui-production-smoke.mjs:257·414, smoke-matter-desktop-aws-runtime.mjs:105, drill-matter-vault-backup-restore.mjs 4개소, run-lcx-full-release-preflight-proof.mjs:231, validate-matter-vault-r4-external-receipts.mjs:70(package.json:215 와이어링), validate-matter-vault-r4-aws-env-plan.mjs:171, validate-lcx-full-final-release-packet.mjs:70 | runtime_read | C | 전수 목록 + 각 사이트의 적층 전환 방식 초안 → S6-T06 입력 |
| S0-T08 | **계약 재가 패킷(신설)**: production-data-policy-contract 현황 + CTI 범위 한정 발효안 + 비약화 논증 + 서명란 → I4 소유자 재가 | decision | A(실데이터 거버넌스) | 패킷 전달. 재가 완료 = G0 충족 |

**게이트 S0-G**: 8건 아티팩트 + 판정 필드 완비, T04가 T03보다 선행했음이 타임스탬프로 증빙.

### Stage 1 — FOUNDATION 영속 〔선행: S0-T01·T03, G0〕

분기: (a) EFS 기마운트+보존 판정 → T01a 생략, T01b는 STORE_PATH가 EFS 외를 가리키는 한 실행. (b) EFS 부재 또는 소실 판정 → 전체, 최우선.

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S1-T01a | EFS 프로비저닝 + Lambda 마운트(액세스 포인트) | infra | A(tenant_provisioning 유사·상향 수용) | 마운트 확인 |
| S1-T01b | 13개 STORE_PATH EFS 이관 + **이관 전 스냅샷(복원 리허설로 검증된)** | migration | A | 이관 후 readback 100% 일치 |
| S1-T02 | LAWOS_AUDIT_STORE_PATH 신설 + securityAuditEvents durable 교체(append-only) + **STORE_PATH_MANIFEST 등록**(프리플라이트·백업 드릴이 감사 스토어를 포함하도록 — v2.1) | runtime_write | B | 콜드스타트 후 감사 이벤트 보존 + manifest 포함 확인 |
| S1-T03 | LAWOS_API_SESSION_SECRET 고정(≥32자, Secrets Manager/SSM) + 회전 runbook | infra | A(크리덴셜) | 콜드스타트 2회 세션 유효 |
| S1-T04 | 재시드 가드: 스토어 부재 시에만 시드 주입 + **approval_ref 보유 병합 백필은 예외 허용(carve-out)** — S4-T01과의 데드락 방지(v2.1) | schema | B | 가드·carve-out 시나리오 테스트 |
| S1-T05 | 백업·복원 드릴 확장(EFS 스토어, SHA256 manifest, 주기) + **드릴 영수증 boundary 정직화: 실데이터 백업 시점부터 real_client_data_used를 거짓 기재하지 않도록 신규 영수증 스키마 버전 적용**(S0-T07 참조, v2.1) | ops_runbook | A(백업·복원) | 복원 리허설 PASS + 신규 스키마 영수증 |

**게이트 S1-G**: ① 마커 콜드스타트 생존 ② 감사 이벤트 생존 ③ 시크릿 고정 ④ tmpdir 프리플라이트(감사 스토어 포함) 통과.

### Stage 2 — 인증 A단계 〔코드=BUILD, 배부·전환=CUTOVER〕

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S2-T01 | 크리덴셜 스토어: argon2id(불가 시 scrypt)+salt+상태(must_change/active), 영속 스토어 저장, 평문·복호형 금지 | runtime_write | A(크리덴셜) | 스키마 검증기+단위 테스트 |
| S2-T02 | 로그인 provider + **verifyToken 재작성(v2.1 핵심)**: [보고] session-auth.js:334-352가 요청마다 `user.local_dev.synthetic_token`으로 principal 재파생하고 provider=null이면 전면 401 — 서명 세션 페이로드(또는 크리덴셜 provider)로 principal을 재구성하도록 교체, synthetic 의존·provider-null 거부 제거. synthetic token은 프로덕션 프로필에서 인증 거부(local-dev 프로필 QA 흐름은 유지) | runtime_write | A(크리덴셜) | 스테이징 operational에서 로그인→검증→보호 라우트 전체 사이클 PASS |
| S2-T04 | 비밀번호 재설정·실패 잠금·세션 회수(AuthSurface 연결 포함) | runtime_write | B | 시나리오 테스트 |
| S2-T06 | **데스크톱 v0.1.10(v2.1 신설·범위 내)**: 비밀번호/must_change/재설정 플로우 + 최신 시드 동봉 + drift diff=0. CUTOVER 전 빌드·스테이징 검증 완료 — [보고] v0.1.9는 synthetic 시드 내장이라 operational 전환 순간 전 클라이언트 로그인 불능(R12) | ui | B | 스테이징 로그인 검증 + 배포 준비 |
| S2-T03 | **(CUTOVER ⑦)** 초기 비밀번호 발급(CSPRNG ≥16자)·해시만 저장·I3 채널 배부(기본 대면)·평문 즉시 폐기·최초 로그인 변경 강제 | ops_runbook | A(크리덴셜) | 배부 receipt(9/9 수령, 평문 미보관) |
| S2-T05 | **(CUTOVER ③)** LAWOS_RUNTIME_PROFILE=operational 전환 + 롤백 절차 | infra | A(컷오버) | 전환 receipt |
| S2-TP1 | (병행·비차단) Entra ID OIDC + MFA 설계 문서 | m365_integration | C | 설계 문서 |

**게이트 BUILD-G**(구 S2-G 전반부): 스테이징 operational 전체 사이클 PASS + synthetic 거부 + 데스크톱 v0.1.10 검증. **프로덕션 로그인 판정은 CUT-G로 이관.**

### Stage 3 — 테넌트 통일 〔T01·T05·T06·T07=BUILD 코드, T02~T04·T08=CUTOVER 데이터〕

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S3-T01 | 탈테넌트화: candidates 모듈 tenant_id 제거 + `schema_version: lawos.amic_matter_codes.v1` + **DEFAULT_TENANT(matter-runtime-context.js:122) 하드코딩 제거·베이크 시드 파라미터화 — T02 이전 배포·스모크 필수**(콜드스타트가 rp05를 재물질화하는 경로 차단, v2.1) | schema | B | 배포 후 콜드스타트 스모크: rp05 재생성 없음 |
| S3-T05 | 블랭킷 그랜트 축소 코드: 실사용자 tenant_ids=[canonical] (발효는 CUTOVER 배포) | security_acceptance | B | 스테이징 테스트 |
| S3-T06 | 표면 테넌트 상수 12개(웹 apiClient + 데스크톱 렌더러, Finance/Analytics 포함) → 세션 envelope tenant_refs 전환. 합성 상수는 QA/데모 프로필 주입 | ui | B | 스테이징 네트워크 캡처 |
| S3-T07 | 역방향 잔재 검사 신설(합성 테넌트 내 실데이터 0) + UPL-A05 유지 | gate_assembly | C | 검사 스크립트 |
| S3-T02 | **(CUTOVER ④, 동결 하)** rp05→canonical 마이그레이션(client 99 + matter 148±D-07 + master-data client group). 멱등 hash + 단일 approval_ref + readback 100%. 원본 제거는 **복원 검증된 스냅샷 receipt 확인 후에만**. 완료 판정에 **사후 콜드스타트 재-readback(rp05 실데이터 0 유지) 포함**(v2.1) | migration | A | canonical readback 100% + rp05 0(콜드스타트 후 재확인) |
| S3-T03 | (CUTOVER) 합성 fixture matter 2건 실테넌트 밖 격리 | migration | A | canonical 내 합성 fixture 0 |
| S3-T04 | (CUTOVER) 149번째 row 처분(S0-T04 권고 반영) + approval_ref | migration | A | 처분 receipt + 카운트 기준 확정 |
| S3-T08 | **브리지 통제(v2.1 신설)**: [보고] 브리지 라우트는 세션 게이트 앞 정적 토큰 인증 + 호출자 지정 tenant/actor — ① 마이그레이션 사용 직후 LAWOS_VAULT_BRIDGE_TOKEN 회전(receipt) ② 쓰기 대상 테넌트 allow-list ③ actor_id 자기주장 대신 토큰 결속 서비스 신원 ④ 승인 윈도우 밖 브리지 비활성/차단을 상설 통제로 | security_acceptance | A(크리덴셜 회전) | 회전 receipt + 통제 테스트 |

**게이트 S3-G(데이터 기준만 — v2.1 축소)**: ① 양방향 잔재 0 ② canonical readback 카운트·해시 ③ 콜드스타트 후 rp05 실데이터 0 재확인. (세션·표면 기준은 CUT-G로 이관)

### Stage 4 — 사람·권한 〔T04a=BUILD, 나머지=CUTOVER〕

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S4-T04a | (BUILD) 시드 스키마 적층 확장 + 시드 검증기 적층 갱신: production_status(disabled)·qa_tenant_scope 신규 필드 — [보고] 기존 검증기가 전원 status='active'와 matter.desktop.qa의 canonical 소속을 단언하므로 **기존 단언 유지 + 신규 필드 검증 추가**(비약화) | schema | B | 갱신된 검증기 PASS |
| S4-T01 | (CUTOVER ⑤) 등록시드 → 계정 스토어 **keyed idempotent merge**: 시드는 신원·역할·스코프 필드만 공급, **크리덴셜·상태 필드 불가침**(S2 기록 보존). S1-T04 carve-out 경유(approval_ref `cti-user-injection-<날짜>`) | runtime_write | A | 9인+QA2 readback: 신원·역할 시드 일치, 크리덴셜 필드 무변경 |
| S4-T02 | 3원장 크로스워크 검증기(등록시드↔role-registry↔hrx roster, email 조인 9/9) | gate_assembly | C | PASS + 와이어링 |
| S4-T03 | (CUTOVER) 김양태 affiliation=PETRA + 잠정 접근범위, I2 갱신 경로 | security_acceptance | B | 범위 테스트(송무 거부/자문·재무 허용) |
| S4-T04b | (CUTOVER) QA 비활성 적용 + 테스트: **프로덕션 기준=QA 전 경로 403 거부만. 테넌트 격리 positive 테스트는 local-dev 프로필에서**(v2.1 — operational에서는 synthetic 차단·disabled가 선행해 격리를 증명 불가) | security_acceptance | B | 프로필별 명시된 테스트 매트릭스 PASS |
| S4-T05 | 데스크톱 릴리스 drift 게이트(빌드 파이프라인 diff=0) | gate_assembly | C | 빌드 검사 동작 |

**게이트 CUT-G(컷오버 종료 판정 — 구 S2-G 후반부+S3-G 세션 기준+S4-G 통합)**: ① 9인 신규 크리덴셜 로그인 + envelope role/scopes 시드 일치 ② `local-dev-only:*` 전건 거부 ③ 전 표면 요청 tenant=canonical(네트워크 캡처) ④ QA 403 ⑤ 감사 이벤트 durable 기록 ⑥ 데스크톱 v0.1.10 로그인 ⑦ 사후 콜드스타트 재검증(데이터·세션 유지) ⑧ 동결 중 유입 쓰기 0 증빙.

### Stage 5 — ENRICH 관계 주입 〔선행: CUT-G, I1, I4 발효 확인〕

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S5-T01 | 담당 스태핑: I1 워크북 스키마 검증(email∈9인, matter_code∈canonical) → MatterMember 148±D-07 주입('emp-001' 대체). approval_ref | runtime_write | A | 148/148 readback, 주담당 전건 ≥1 |
| S5-T02 | party 정합: 99 client Person/Org/Party 생성 + matter legal/billing party 실참조(미존재 'party_rp04_amic' 해소) | runtime_write | A | 미존재 참조 0 |
| S5-T03 | 연락처 주입(발효 계약 하): 9인 전화 + 보유 client 연락처 → CRM contact store. **증거는 카운트+솔트 해시만, 평문 금지. 주입 스크립트는 계약 발효 확인 없으면 fail-fast** | runtime_write | A | readback + 무평문 증거 검사 |
| S5-T04 | 이해충돌 최소 색인(client 99 + source_ref 상대방) | runtime_write | A(실데이터) | 실명 검색 적중 |
| S5-T05 | matter 상태 반영(I1 상태 열, 종결→closed) | runtime_write | A | 상태 분포 = 워크북 |
| S5-T06 | Finance/Analytics 참조 정합화(스켈레톤) | runtime_write | B | 참조 무결성 0 오류 |

**게이트 S5-G**: ① 배치별 readback 100% ② 스태핑 전건 ③ 무결성 0 ④ PII 무평문 증거 ⑤ manifest 전 배치 등재(+실행자 외부 증빙).

### Stage 6 — SEAL 상설화·준공

| TUW | 내용 | type | risk | 완료 기준 |
|---|---|---|---|---|
| S6-T01 | 표면 프루프 9종(Matters/Vault/Clients/CRM/People/Finance/Analytics/Intake/Admin): 실사용자 세션 + canonical 렌더 + 합성 fallback 미발동 | gate_assembly | C | 9/9 PASS |
| S6-T02 | 상설 검증기 `validate-canonical-tenant-production-ready.mjs`: **(a) provenance 기준으로 한정(v2.1)** — source_revision 보유 레코드 카운트, **불변 신원 필드(matter_code·client_id·source_ref)만 해시**, 가변 업무 필드(status·staffing·party) 제외, 시드 기원 레코드의 무승인 삭제 0 (b) canonical 내 synthetic_only=0 + 역방향 잔재 0 (c) 감사 영속 (d) 시크릿 고정·operational (e) 결정 레지스터 approved (f) 계약 발효. **와이어링: 기존 package.json 항목·기존 검증기 무수정, 신규 컴포지트 스크립트(`canonical-tenant:production-ready` → 기존 final gate 선행 호출) 적층 + §C-1 적합 판정문 1줄**(v2.1) | gate_assembly | C | 검증기 PASS + 적층 diff |
| S6-T03 | fixture 불변 계약(해시 drift·무approval 변경 CI FAIL) + **증거 PII 패턴 검사(전화번호 등) CI 추가**(v2.1) | gate_assembly | C | 위반 시나리오 FAIL 확인 |
| S6-T04 | backfill-evidence-manifest(append-only) + 7-01 소급 + **실행자 외부 증빙 필드**(v2.1) | ops_runbook | A(백필) | 스키마 검증기 + 소급 1건 |
| S6-T05 | 콜드스타트 내성 스모크 주기 편입(마커 클래스 상설 approval_ref) | gate_assembly | C | 2회 연속 PASS |
| S6-T06 | **real_client_data_used 적층 전환(v2.1 신설)**: S0-T07 인벤토리 기반 — 기존 영수증·닫힌 증거 불변, 신규 영수증 스키마 버전에 true 기재, 단언 검증기(external-receipts:70, aws-env-plan:171, final-release-packet:70 등)는 **버전 분기 additive 갱신**(구버전 false 단언 유지 + 신버전 true 허용), 각 갱신에 비약화 논증 + approval_ref | gate_assembly | B | 사이트 전수 처리 + 스모크 정상 |

**게이트 S6-G = 준공검사**: C1~C6 전 항목 + 프루프 9/9 + **S6-T06 완료 후에만** boundary 전환 유효(그 전 전환 금지 — [보고] 상설 검증기들이 false를 hard-assert하므로 T06 없이 전환하면 기존 게이트가 깨진다).

---

## §6 리스크 → 완화 바인딩

| ID | 리스크 | 완화 |
|---|---|---|
| R1 | 유도 가능 토큰 뒤 실데이터 | S2-T02(차단+verifyToken 재작성)·CUT-G ②. **통합 이동도 컷오버 내로 제한**(§2 금지 순서) |
| R2 | 콜드스타트 소실+재시드 은폐 | S0-T03(실측, T04 채록 후)→S1→S3-T01(재물질화 차단)→S6-T05 |
| R3 | 블랭킷 그랜트 데모 오염 | S3-T05·T07, 컷오버 통합 배포 |
| R4 | 감사 인메모리 | S1-T02(+manifest 등록) |
| R5 | PIPA/PII | **G0 계약 재가 선행** + S5-T03 fail-fast + 증거 PII 규약 + S6-T03 CI |
| R6 | matter_code 충돌 | S3-T03 |
| R7 | 이해충돌 미와이어링 | S5-T04 최소 색인(완전 워크플로 §9 제외) |
| R8 | 데스크톱 시드 drift | S0-T05→S4-T05 |
| R9 | 세션 시크릿 재생성 | S1-T03 |
| R10 | ad-hoc 백필 재발 | G0·S6-T03·T04 |
| R11 | **브리지 상설 백도어**(정적 토큰, 호출자 지정 tenant/actor, 세션 게이트 우회) | S3-T08(회전+allow-list+서비스 신원+윈도우 밖 차단), §3-5 외부 증빙 |
| R12 | **데스크톱 v0.1.9 고립**(operational 전환 시 전 클라이언트 로그인 불능) | S2-T06 v0.1.10 선행 배포 + 컷오버 공지 + 롤백 계획 |
| R13 | **마이그레이션 중 동시 쓰기 손실** | 컷오버 동결 규칙(API+브리지) + 검증된 스냅샷 + 유입 쓰기 0 증빙(CUT-G ⑧) |

---

## §7 Codex 착수 지시 (첫 작업 묶음)

1. §1 결정 레지스터 정식화 + **S0-T08 재가 패킷 생성 → 소유자 I4 전달**(G0의 절반).
2. S0 실행 — **T04(채록·스냅샷) 완료 후 T03(콜드스타트)**, 나머지 병렬. 결과 보고: S1 분기 / D-07 권고 / I1 워크북 전달 / T07 인벤토리.
3. goal 신설 + TUW 원장 등록: 마스터 스키마 그대로(단일 work_type, auto-A 상향, 14필드), 등록 후 validate-launch-tuw-ledger PASS 확인.
4. G0 충족(I4 재가) 후 S1 착수. BUILD는 S1과 부분 병행 가능(코드 작업은 데이터 무접촉이므로), 단 배포·컷오버는 S1-G 이후.
5. 컷오버 일정은 소유자와 사전 합의(공지·동결 시간대), 롤백 계획 문서화 후 개시.

**소유자 대기 항목**: I4(계약 재가 — 최우선, G0 차단), I1(매핑표 — S0-T06 전달 후), I2(김양태 범위 — 미회신 시 보수 기본값), I3(배부 채널 — 미회신 시 대면).

---

## §8 범위 제외 (v2.1 조정)

- Entra ID OIDC/MFA 완전 구현(설계 문서까지만) / 완전한 이해충돌 워크플로(최소 색인만) / 시간·청구 실데이터(참조 정합화까지만) / DB 전환(RS-1 후속) / 외부 테넌트 상용화(Wave 4)
- ~~데스크톱 클라이언트 갱신~~ → **범위 내로 이동**(S2-T06, v2.1 — 컷오버 전제조건)

---

## §9 남는 한계 (정직 고지)

1. A단계 인증은 비밀번호 단일 요소다(MFA는 B단계). 시드의 mfa_required=true는 B단계 전까지 미충족 상태로 남으며, 이 기간의 위험 수용은 I4 재가 패킷에 명시해 소유자가 인지·승인한다.
2. 역할 변경은 여전히 코드 배포를 요구한다(role registry 코드 상주) — 운영상 불편이나 보안상 안전. DB화는 후속.
3. matter code 148건의 client_case_role 등 일부 필드는 원천 신뢰도(confidence) 표기가 남아 있어, 운영 중 정정은 §5-S6-T03의 approval_ref 경로로 수행한다.

---

## §10 적대 검증 반영 대장 (v2 → v2.1, 22건)

| # | 렌즈 | 심각도 | 요지 | 반영 위치 |
|---|---|---|---|---|
| 1 | 순서 | blocker | S0 전건 병렬 시 T03 콜드스타트가 149번째 row·런타임 데이터 파괴 | S0 순서 강제(T04→T03), D-07 |
| 2 | 순서 | blocker | S2∥S3 병렬 양방향 모순(그랜트·표면 미전환 노출 / 세션 증거 부재) + 동결 부재 | §4 컷오버 재설계, R13 |
| 3 | 순서 | major | S1-T04 가드 vs S4-T01 주입 데드락/크리덴셜 덮어쓰기 | S1-T04 carve-out + S4-T01 merge 시맨틱 |
| 4 | 순서 | major | QA 테스트가 프로덕션에서 증명 불능 | S4-T04b 프로필별 매트릭스, D-06 |
| 5 | 순서 | major | S0-T06 담당 후보가 원천에 없어 완료 기준 미충족 | S0-T06·D-09 산출물 재정의 |
| 6 | 순서 | major | S6-T02(a) 전량 해시가 정상 운영 변경에 영구 FAIL | S6-T02 provenance 한정 |
| 7 | 순서 | minor | 존재하지 않는 T01a 참조 | S1-T01a/T01b 분리 |
| 8 | 순서 | minor | 마커 쓰기 vs approval_ref 규칙 충돌 | §2 마커 면제 클래스 |
| 9 | 순서 | minor | I3 기본값 부재로 크리티컬 패스 무한 대기 | I3 기본값=대면 |
| 10 | 컨벤션 | blocker | production-data-policy-contract **기존재**(미재가=실데이터 접촉 금지)를 신설로 오인 | D-03 정정, G0·I4·S0-T08 신설 |
| 11 | 컨벤션 | blocker | 원장 §C-2·§F-7 위반(계약 발효 전 risk-A 실행 배치) | G0을 전 risk-A 선행 게이트로 |
| 12 | 컨벤션 | blocker | real_client_data_used 전환이 기존 검증기 hard-assert와 충돌 | S0-T07 인벤토리 + S6-T06 적층 전환 |
| 13 | 컨벤션 | major | risk_class 자체 재정의가 auto-A 키워드 검증기와 충돌 | §2 sensitivity-first 채택, 전 TUW 재분류 |
| 14 | 컨벤션 | major | work_type 12종 단일 enum 위반(복합 표기) | §2 정정 + 복합 TUW 분리 |
| 15 | 컨벤션 | major | 시드 검증기 status='active'·QA canonical 단언과 D-04/06 충돌 | S4-T04a 적층 확장 |
| 16 | 컨벤션 | major | S0-T03 risk C/runtime_read 오분류(설정 변경 부작용) | S0-T03 B/runtime_write + 부작용 기록 |
| 17 | 컨벤션 | minor | 감사 스토어 manifest 미등록 시 프리플라이트·백업 누락 | S1-T02에 등록 포함 |
| 18 | 컨벤션 | minor | final gate 앞단 편입 메커니즘 불명(§C-1 기존 게이트 수정 금지) | S6-T02 컴포지트 적층 명시 |
| 19 | 보안 | major | verifyToken이 synthetic에 결합 — provider 추가만으론 operational 전면 401 | S2-T02 재작성 명시 |
| 20 | 보안 | major | S3-T02 파괴적 마이그레이션 안전장치 부족(검증 스냅샷·동결·T01 선행·사후 재확인) | S3-T01/T02 강화, 동결 규칙 |
| 21 | 보안 | major | 브리지 = 상설 세션리스 백도어(토큰·tenant·actor 자기주장) | S3-T08, R11, §3-5 |
| 22 | 보안 | major+minor | 데스크톱 v0.1.9 고립 / 증거 PII 평문 유출 | S2-T06·R12 / §2 PII 규약·S6-T03 |
