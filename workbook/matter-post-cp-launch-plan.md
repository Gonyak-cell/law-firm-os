# matter 출시 계획 — CP 전량 완료 이후 → AMIC 내부 go-live

작성일: 2026-06-12
작성 방식: 8개 영역 병렬 정밀 조사(파일:라인 근거) → 3개 관점(거버넌스 연속성 / 제품 도달 / 리스크·운영) 독립 설계 → 완전성 비판·사실 검증 → 종합. 비판 단계에서 적발된 사실 오류(MAT-DEC-04 상태, 팩 수 고정 인용, RP11 데드라인 경과 등)와 순서 오류(보안 게이트 전 실데이터 투입 등)는 본문에 정정 반영함.

## §0 권한 한계

이 문서는 계획이며 어떤 완료 권한도 없다. 소스오브트루스 위계(라이브 git+manifests > plan JSON > queue > ledger > 증거 > 문서)를 준수하며, 충돌 시 라이브 리포 상태가 우선한다. 이 문서는 구현·원장 변경·계약 변경·production_ready 클레임을 승인하지 않는다. 리포 변경·커밋은 구현 측(Codex) 소관이다.

---

## §1 결정 기록 — 제품명 matter 고정

**결정(2026-06-12, 소유자 지시): 제품명은 `matter`로 고정한다. 이로써 MAT-DEC-04(product naming)는 pending → decided.**

확정 네이밍 컨벤션(product-strategy-declaration §8 권고를 확정으로 승격):

| 층위 | 표기 | 비고 |
|---|---|---|
| 제품 브랜드 | **matter** (항상 소문자) | 사용자 노출 문구·문서·교육 자료의 표준 표기 |
| UI 브랜드 | **matter by AMIC** | apps/web 등 사용자 노출 표면 |
| 플랫폼/리포 코드명 | Law Firm OS | 기존 유지 — 변경 금지 |
| 기계 식별자 | `law-firm-os` (package.json, contracts/law-firm-os.product-contract.json 등) | **리네이밍 금지** |

기계 식별자·코드명을 리네이밍하지 않는 근거: 닫힌 480+팩의 manifest·계약 참조·리뷰 영수증이 기존 식별자를 가리키고 있어, 대량 리네임은 닫힌 증거의 참조 무결성을 깨뜨린다(비약화 원칙 위반). 제품명 고정은 "사용자 노출 층위의 표기 통일 + 결정 레지스터 갱신"으로 구현한다.

**네이밍 전파 체크리스트(구현 측 작업, 대부분 Risk C — CP 흐름과 병행 가능):**

1. `docs/product-strategy-declaration.md` §7·§8 — MAT-DEC-04 decided 반영, §8 "Recommended" → 확정 컨벤션으로 갱신
2. `workbook/absorption-package/06_오픈_결정_레지스터.md` — MAT-DEC-04 pending → ✅ 결정(2026-06-12, 소유자)
3. 사용자 노출 표면 일관화 — apps/web의 브랜드 문구(`matter by AMIC` — 현재 MatterLogo aria-label은 'matter by AMIC Law'로 표기 불일치) 및 향후 제품 UI 타이틀/문구
4. 출시 준비 단계의 용어집·enum 정합화 작업(§5 L2-6)에 제품명 표기 규칙 항목 포함
5. 신규 산출물 규칙: 사용자 노출 산출물은 matter, 거버넌스·기계 산출물은 기존 코드명 유지

---

## §2 전제 — "CP 전량 완료"가 의미하는 것과 의미하지 않는 것

1. **CP 전량 완료의 공식 종착점은 go-live가 아니다.** latest-total-closeout-execution-plan.md:51은 최종 성공 상태를 'final **internal SaaS-grade product candidate** state'로 명명하고, goal-closeout-protocol.md:23의 준공검사도 'goal-ready, not whole-product SaaS completion'이다. 출시는 그 위에 별도 게이트 체인을 적층해야 한다.
2. **production_ready ≠ 실행되는 제품.** implementation-layer-ledger 스냅샷(330팩 시점) 기준 닫힌 팩 전부가 descriptor 레이어이고 runtime_ready 팩은 0개다. 현재 실행 표면의 실측: API는 127.0.0.1 전용 GET 4라우트(synthetic-only, 쓰기 0), 영속성 0(전 패키지 인메모리·DB 의존성 0), 인증 0(권한 컨텍스트를 클라이언트 헤더로 자기주장), UI는 Amplitude 패리티 데모 셸(50개 flow group 중 1개만 합성 데이터로 연결). **출시 계획의 최장 구간은 '연결 작업'이 아니라 사실상 신규 백엔드+제품 UI 구축이다.**
3. **출시 트리거를 팩 번호로 정의하지 않는다.** 플랜 테일은 재생성마다 재번호된다(CP00-1253 → CP00-980 관측, 같은 날 두 차례 재생성으로 잔여 팩 수도 494→492로 변동). 완료 판정은 다음 2조건으로만 정의한다:
   - (a) **라이브 원장 합산 유닛 전부 production_ready** — 검증기는 55,256을 하드코딩하지 않고 `docs/weighted-implementation-ledger.json` + `docs/hrx-weighted-implementation-ledger.json` 합산과 승인된 scope revision 기록을 읽는다(스코프는 user-approved revision·overlay admission·MAT-DEC-03 해소로 변동 가능).
   - (b) latest-total-closeout-execution-plan.md Section 8 'Final Product Completion Gate' (a)~(h) 충족.
   - 마일스톤 앵커는 RP 경계(RP25 마이그레이션 → RP26 하드닝 → RP29 상업 준비 → RP30 HRX).
4. **"실제 출시"의 정의: AMIC 1호 테넌트 내부 go-live(Wave 1).** MAT-DEC-01(SaaS 코어 유지, AMIC=1호 테넌트)에 따라 멀티테넌트 가능 경계는 보존하고, 상용(2호+ 외부 테넌트) 전환은 Wave 4 후속 경로로 분리한다(§7).

---

## §3 거버넌스 계승 — Launch 트랙과 게이트 적층

**트랙 결정: 출시 작업은 CP ledger를 연장하지 않고, goal-closeout 프로토콜 기반의 별도 Launch 트랙(goal 단위)으로 운영한다.**
근거: ① goal-closeout-protocol.md:3 "applies to every future Law Firm OS goal"이 공인 적용 근거, ② CP 테일 재번호 간섭 회피, ③ 55,256 유닛 스코프 동결 보존, ④ UI 비-CP 트랙 선례. 단 UI 트랙의 경량 규칙은 승계하지 않고 **CP와 동일 강도의 게이트 체인을 의무 적용**한다.

**예외 — 제품 유닛 등재는 기존 공식 경로로만:** 갭 영역(§4-4)에서 미커버 제품 기능이 발견되면 Launch 트랙이 임의 등재하지 않고, `docs/matter-pack-integration/matter-pack-full-integration-plan.md`의 overlay admission 절차(C-MPACK 게이트 PASS + 사용자 승인 ledger 확장)로만 등재한다. 등재 절차의 이중화를 금지한다.

**게이트 적층 구조(비약화 원칙의 구현 — 닫힌 팩·기존 게이트는 일절 수정하지 않고 위에만 쌓는다):**

```
production_ready  (기존 CP 게이트 — 불변)
  ⊂ runtime_ready  (기존 RTG-001~005, 합성 샌드박스 한정 — 불변)
    ⊂ ops_ready    (신설: 프로덕션 인프라·운영환경 검증 — 실데이터 없음)
      ⊂ go_live_approved (신설: 전제품 go/no-go + 인간 승인 — 실데이터 전환 포함)
```

신설 게이트 2종은 각각 계약+검증기(`contracts/ops-readiness-contract.json`, `contracts/go-live-gate-contract.json` + `scripts/validate-*.mjs`)로 기계화하고, runtime-gate-layer.md 양식의 **비약화 논증 문서를 의무 동봉**한다(닫힌 팩 미수정, 소급 클레임 차단, 하위 게이트 함의·대체 금지).

**CP 자산 계승 매핑:**

| CP 자산 | Launch 트랙 계승 방식 |
|---|---|
| goal-closeout 프로토콜+계약+`validate-goal-closeout-protocol.mjs` | 모든 Phase의 작업 묶음을 goal로 실행. `docs/goal-closeout/{goal_id}/` 5종 증거 + 'commit is the last step' 유지 |
| 9단계 게이트 체인 | 전 goal 동일 적용: implementation → tests → Hermes 증거 → 유효 Claude 리뷰 정확히 1회 → adjudication → 준공검사 → (해당 시) ready 클레임 → 최종 검증 → 커밋 |
| Claude 리뷰 영수증 파이프라인 | claude-opus-4-8 / effort=max / read-only / Read,Grep,Glob 고정, exactly-one valid receipt, waiver는 `not_counted_as_valid_review=true`·`future_precedent=false` 형식만. P0/P1은 goal 종결 차단 |
| sensitivity-first 리스크 분류 | 그대로 + 출시 키워드 확장: migration / cutover / backfill / credential / real_data / external_binding / tenant_provisioning / backup_restore / break_glass / admin_consent → 자동 Risk A |
| Hermes 증거 게이트 | 합성 검증까지 동일 유지. **실데이터·프로덕션 검증은 Hermes 금지 조항을 약화하지 않고 신설 production-data-policy 계약(§5 L1-4)으로 분리** |
| runtime-readiness 계약·implementation-layer ledger | L0 격차 감사의 기준 장부 + L2 런타임 구축의 게이트 |
| 소스오브트루스 위계·live_state_overrides 큐 정책 | launch-readiness-ledger.json(신설 라이브 장부)에 동일 적용 |
| P0/P1 차단·P2 명시 deferral 규칙 | 전 goal 동일 적용 |
| 의존성 그래프 edge 9종 | Blocking→go-live 차단 조건, Verification→기능 단계 개방 순서, Regression Map→출시 회귀 체크리스트, Escalation→AI Governor 검토, Feedback/Loop→하이퍼케어 피드백 루프 |

---

## §4 CP 실행 중 선행 조치 (역산 마일스톤 — 지금 결정하지 않으면 출시가 늦어지는 것들)

본 계획은 "CP 완료 이후"를 다루지만, 다음 항목들은 효력 시점이 잔여 CP 실행 중이므로 출시 단계로 미룰 수 없다. 비판 검증에서 "CP 완료 후 처리"로 두면 순서 모순이 생긴다고 적발된 항목들이다.

1. **critical-rp-saas-hardening-plan 비준(즉시).** 라이브 큐가 이미 하드닝 대상 RP16 팩을 닫는 중인데 플랜 status가 Proposed다. 대상 RP가 전부 닫힌 뒤 비준하는 것은 역순 — 즉시 Proposed → Adopted 절차 필요.
2. **runtime/mixed 팩 인터리브 결정(즉시).** 지금까지 선언된 manifest 전부 descriptor. 잔여 큐 소화 중 런타임 레이어 팩을 끼워 넣을지, CP 후 일괄 트랙으로 갈지는 **CP 완료 후에는 내릴 수 없는 결정**이며 go-live 시점을 수개월 단위로 좌우한다. **권고: 최소한 RP25(마이그레이션)·RP26(하드닝)·RP29(상업 준비) 구간은 runtime/mixed 선언 + RTG-001~005 통과를 의무화** — 이 RP들이 descriptor로 닫히면 출시 게이트와의 매핑이 공중에 뜬다.
3. **MAT-DEC-03(문서 원본 소재/M365 스토리지) 해소 — RP22/23 착수 전.** 결정 레지스터의 데드라인 앵커가 'RP06/08 런타임 계약 신설 전, RP22/23 착수 전'이고 RP22/23은 잔여 큐 내부다. Outlook filing이 Wave 1 핵심인 이상 출시 크리티컬 패스. 해소로 유닛이 추가되면 user-approved scope revision으로 처리(완료 판정 정의 (a)가 라이브 원장 기준이므로 정합).
4. **갭 5영역 커버리지 대조 — CP 완료 전.** R5 Core Workflow, R6 Issue/Practice Core, R8 Obsidian, R10 Drafting, R14 HR 화면군이 잔여 큐 산출물로 실제 커버되는지 대조. Work Queue·Issue Ledger는 Wave 1 핵심 기능이므로 CP 완료 후 발견하면 '전량 완료' 판정과 충돌하거나 무원장 작업이 된다. 미커버분은 overlay admission 등재 또는 명시적 출시 제외(deferred) 판정.
5. **privilege·HR-sensitive 기밀분류 enum 확장 — 관련 RP 런타임 전.** 현 코드 기밀분류 4값에 privilege 없음 — 소급 비용이 큰 스키마 결정. (참고: User/Employee 분리는 MAT-DEC-02로 **이미 결정됨**(Employee.user_id 역참조) — 남은 것은 런타임 구현이지 결정이 아니다.)
6. **외부 리드타임 항목 즉시 착수:** AMIC M365 테넌트 관리자 권한 확보 확인(리포에 기록 없음), 외부 AI provider의 PIPA 처리위탁·국외이전·변호사 비밀유지 법적 검토, 외부 침투테스트 업체 섭외. 전부 코드와 무관한 조직·외부 소요.
7. **제품명 전파(§1 체크리스트)** — Risk C, CP 흐름과 병행.

---

## §5 단계 계획 (L0~L9)

전체 흐름:

```
[CP 실행 중] §4 선행 조치
CP 전량 완료(라이브 원장 기준)
 → L0 완료판정·격차감사 → L1 출시 결정 패키지
    → [트랙 A] L2 런타임 코어 구축 (최장 구간)   ┐
    → [트랙 B] L3 인프라·M365 테넌트 (병렬)       ┼ 병렬
    → [트랙 C] L4 제품 UI (L2 부분 가동 후 착수)  ┘
 → L5 보안·컴플라이언스·성능 수락  ∥ L6 운영 체계 수립 (부분 병렬)
 → L7 데이터 마이그레이션·파일럿·UAT·교육
 → L8 go/no-go 게이트·컷오버
 → L9 하이퍼케어·안정화 → Wave 2/3 단계 개방 → (Wave 4 상용 전환 경로, §7)
```

각 Phase는 1개 이상의 goal-closeout goal로 실행한다(증거 5종 + 유효 Claude 리뷰 1회 + 인간 준공검사). 아래 작업 묶음은 TUW 분해 가능한 수준으로 기술한다.

### L0 — 완료 판정 및 격차 감사

- **목표:** "CP 전량 완료"를 기계 판정 가능하게 확정하고, candidate 상태와 실행 가능한 제품 사이의 격차를 정량화한다.
- **진입조건:** 라이브 큐 소진(라이브 manifests 기준) + 미해결 P0/P1 zero.
- **작업 묶음:**
  1. `scripts/validate-final-product-completion-gate.mjs` + 계약 신설 (Risk A): Section 8 (a)~(h) 기계 판정 — **라이브 원장 합산** 유닛 전수 production_ready(수치 하드코딩 금지, scope revision 기록 반영), LDIP 100% 분류, P0/P1 zero, 핵심 불변식(matter-first/permission-first/audit-first), 9게이트 체인 증거 전수. 기계 판정 불가 항목은 수동 체크리스트로 분리해 준공검사에 귀속. 현재 이 검증기는 부재(131개 npm 스크립트 중 0건)가 확인된 최우선 공백.
  2. implementation-layer ledger 재생성 + **런타임 격차 보고서** (Risk A): Wave 1 후보 기능(인증·권한·감사·matter·문서·Outlook filing·Work Queue)별 runtime_ready 실재 매트릭스 — L2 규모 산정의 1차 입력.
  3. 이연 항목 전수 재심 (Risk B): P2 deferral + LDIP/HRX defer_with_revisit_gate + MAT-DEC 계열 전수에 대해 owner/target/rationale 재검토 및 go-live 차단성 재판정(blocking / non-blocking / wave-2+ 명시).
  4. 리스크 통제 실재성 점검 (Risk A): Critical 리스크 7건(RISK-001~003/005~007/010)의 통제장치(permission sync checker, portal projection, HR guardrail, non-bypassable audit middleware 등)가 코드로 실재하는지 감사 — '기능 존재' 기준의 1차 점검(우회 불가 검증은 L5).
  5. 하드닝 충족 집계 (Risk C): 16개 critical RP × 17 universal control 충족표를 닫힌 팩 증거에서 집계(자동으로 모이지 않음 — §4-1 비준의 후속).
- **완료 게이트:** final-gate 검증기 green + 격차 보고서 승인 + 이연 전수 판정 + goal-closeout 증거.
- **산출물:** 검증기+계약, 런타임 격차 보고서, deferral 재심 대장, 하드닝 커버리지 매트릭스.

### L1 — 출시 결정 패키지

- **목표:** 코드가 아닌 조직 의사결정을 일괄 확정한다. 이들이 전 후속 Phase의 차단 의존성이다.
- **진입조건:** L0 완료.
- **작업 묶음** (결정 우선순위는 23번 문서의 8단계 순서를 골격으로):
  1. **go-live 범위 컷라인 선언** (Risk A): RISK-012 통제방안('DB/security/workflow first, AI/drafting/portal phased') 근거 —
     - **Wave 1(내부 go-live):** Matter Core + 권한/Ethical Wall + 감사 + DMS(file_ref) + Outlook filing + Core Workflow(Work Queue/Review Queue) + Issue Ledger + Admin Console (≈ R1~R6 상당). 화면: Matter Home(11영역)·Work Queue·Document Workspace·Outlook Add-in Pane·Issue Ledger·Admin Console. **AI는 dark launch(off)** — AI Release Gate가 disable switch를 요구하므로 정합.
     - **Wave 2(go-live 후):** AI 활성화(AI Review Queue·기능별 사인오프), Drafting, Smart Alerts hard block.
     - **Wave 3:** Client/Employee/Candidate Portal, Obsidian(export-only부터), Billing automation, Enterprise DLP, HR Operations 화면·실데이터. 후행 Node 8개(16_EDG:36-47)가 공식 제외 근거.
     - **HR 분리 트랙:** HR 민감 실데이터(급여·평가·채용)는 HR sensitivity 검증 + deterministic rule engine 확인 전 투입 금지. HRX 901유닛 production_ready가 HR 런타임 가동을 뜻하지 않음을 명시.
  2. **Critical OQ 6건 + PRD §8 6건 결정 라운드** (Risk A): SharePoint 토폴로지(OQ-001), Graph scope 목록·admin consent(OQ-002), 외부 AI API 기밀정책(OQ-003), HR payroll 범위(OQ-006), role hierarchy/partner override(OQ-010), AI prompt/output 보존·마스킹(OQ-014), Outlook Add-in 배포방식·manifest 형식. 각 결정에 소유자(AMIC 실명 역할)와 시한 지정.
  3. **PIPA·보존정책 비준** (Risk A): 06 문서 8절 '제안' 상태의 retention/legal hold/candidate data 파기/AI prompt·output 보존을 AMIC 확정 정책으로 비준 + 개인정보 처리방침 갱신 + §4-6 법적 검토 결과 반영.
  4. **production-data-policy 계약 신설** (Risk A): RTG-004·Hermes의 '실데이터 금지'를 약화하지 않고, live 단계 goal에 한해 실데이터 작업을 별도 게이트로 승인하는 가산 구조(비약화 논증 동봉). 발효 시점은 L7 진입 — 신설(L1)과 발효(L7)를 명확히 구분.
  5. **승인 거버넌스 확정** (Risk B): go-live 최종 인간 승인자(권고: Managing Partner + System Admin 공동 사인오프) + 아티팩트 형식 정의 — construction_inspection의 human_acceptance 요건 충족 장치. Claude는 read-only 리뷰어로 승인 권한 없음 재확인.
  6. **호스팅·스택 결정** (Risk B): 사내 서버 vs 클라우드(Entra/Graph 인접성상 Azure가 자연 후보), Relational DB·검색/벡터 인덱스 제품, WORM 감사 스토리지 방식. RP26 enterprise 항목 스코핑(내부 go-live 필수 = SSO/MFA·incident response·rollback·backup, 유예 = SCIM·dedicated resources — 적용/유예 판정 기록).
  7. **예산 수립** (Risk C, 신설 — 비판 반영): 호스팅/DB/WORM 스토리지/모니터링, M365 라이선스, 외부 AI API, 외부 침투테스트, 원격 저장소, 교육, goal 단위 Claude 리뷰 운영비(기존 CP ~$3/pack 선례 기준 추정) 집계·승인.
  8. **인력·역할 계획** (Risk B, 신설 — 비판 반영): 현 실행 모델은 단일 소유자 + 에이전트 분담인데 L2가 사실상 신규 백엔드 구축 규모다. 테넌트 관리자, 온콜/지원, DBA·보안 담당, AI 리뷰어(실명), 파일럿 챔피언의 충원 방식(겸임/채용/외주) 판정 — '개발팀' 전제(24번 문서)의 실재 여부 확인 포함.
  9. **로드맵 권위 문서 지정** (Risk C): matter R0~R14 vs docs/roadmap.md Phase 0~6 충돌 해소. 리포 측 고유 항목 판정 — 특히 **이해충돌 검사(Conflict check)·Engagement approval은 로펌 컴플라이언스 관점에서 1차 포함 여부를 명시 판정**(권고: Wave 1 또는 Wave 2 초입).
  10. **파일럿 그룹 지명** (Risk C): 1개 practice 팀(OQ-015 반영, M&A 우선 검토) — 변호사 3~5인 + 스태프 2~3인 + 관리자 1인, 파일럿 오너(파트너급) 지정.
- **완료 게이트:** 결정 레지스터에 전건 owner·결정·근거·일자 기록, 미결정 zero 또는 시한부 deferral, 인간 승인자 서명.
- **산출물:** launch-decision-register, go-live 범위 결정서(Wave 컷라인), 비준된 보존정책, production-data-policy 계약, 승인 거버넌스 문서, 예산서, 인력 계획, 파일럿 명단.

### L2 — 런타임 코어 구축 (트랙 A, 최장 구간)

- **목표:** descriptor 자산을 Wave 1 범위의 실행 가능한 제품으로 전환한다. **사실상 신규 백엔드 구축 규모로 계상한다.** §4-2 인터리브가 실행됐다면 L0 격차 보고서만큼 단축된다.
- **진입조건:** L1 컷라인·스택 결정 + L0 격차 보고서.
- **작업 묶음** (전부 runtime/mixed goal — 규칙상 자동 Risk A, RTG-001~005 의무):
  1. **영속성 계층:** DB 스키마·마이그레이션 체계. 최우선은 **audit 해시체인 원장의 영속 이식**(현재 인메모리 배열 — append-only·sha256 체인 무결성 verify 보존이 수용 기준). 'Audit Event Schema는 소급구현 불가' 원칙상 모든 쓰기 경로보다 선행.
  2. **신뢰 경계 재구축:** Entra ID+MSAL(NAA) 인증·세션 + **서버측 권한 컨텍스트 소스**(클라이언트 `x-lawos-permission-context` 헤더 주입 방식 전면 폐지) + 테넌트 부트스트랩. 기존 authz evaluate 커널(fail-closed 결정 순서)을 시드로 Permission Evaluation 10단계(06:44-53) 서버 구현. 가장 긴 선행 의존 — L2 첫 goal.
  3. **쓰기 경로 구축:** 문서 요구 write API 16종 + 이벤트 15종 중 Wave 1 분 — matter/document/email filing/task/issue mutation + review/approval 디스패치(현재 전부 false 플래그). 모든 write path에 non-bypassable audit append(RTG-003), partial state 방지·rollback.
  4. **도메인 런타임화:** 13개 도메인 패키지의 descriptor 모델·contracts/를 **사양·수용 기준**으로 사용해 Wave 1 필요 bounded context 기동(현재 1/8). 계약→런타임 정책 로딩 체계 결정(contracts JSON은 현재 런타임 미로딩 — 정책 변경 = 코드 배포임을 운영 모델에 반영).
  5. **리스크 통제 실재화:** permission sync checker(RISK-003), QC gate(RISK-009), 오filing suggestion+confirmation+history(RISK-004), Ethical Wall 5경로 차단, HR guardrail 스키마·차단 선반영(RISK-007).
  6. **enum·명명 정합화:** Matter 상태 3중 불일치(문서 11 vs registry 7 vs entities 5단계), ID 체계, 기밀분류(privilege 추가 — §4-5), 제품명 표기(§1) — UAT 전 완료 필수.
  7. **런타임 통합 테스트 체계 신설**(RTG-005 정렬): 실 DB·실 권한 평가·실 audit append 대상. 현행 2,211개/6초 테스트는 descriptor 검증 위주로 런타임 회귀를 잡지 못한다.
- **완료 게이트:** Wave 1 기능 전부 runtime_ready(RTG-001~005, 합성 샌드박스 attestation 유지 — 실데이터 금지) + implementation-layer ledger 기록 + 기존 closeout-pack 스윕 green(비약화 증명) + 금지사항 5건·PRD 비목표 8건이 테스트로 강제됨을 증명.
- **산출물:** 가동되는 Wave 1 백엔드(인증·영속·쓰기·감사), runtime_ready 커버리지(목표: Wave 1의 100%), 런타임 통합 테스트 스위트, 정합화된 enum/용어집.

### L3 — 프로덕션 인프라·M365 테넌트 (트랙 B, L2와 병렬)

- **목표:** 현재 0%인 배포·영속·관측 인프라와 AMIC M365 테넌트 연동을 구축한다(CI/CD·컨테이너·IaC·git remote 전무 실측).
- **진입조건:** L1 호스팅·토폴로지 결정. M365 테넌트 작업은 코드와 독립적인 관리자 소요이므로 최조기 착수.
- **작업 묶음:**
  - **인프라 트랙** (Risk B, 비밀·권한 경계 접촉분 Risk A):
    1. 원격 저장소 + 백업 체계 — **push 전 라이선스 감사 선행**(Mobbin 파생 docs/ui-reference 이미지는 private 전용, 폰트 OFL 확인 — ui-workstream-conventions.md:52-56 명시 요구).
    2. CI/CD: 기존 npm 게이트(test+validate+weighted:validate+closeout-pack:validate) PR 게이트화 — 전부 결정적 스크립트라 이식 비용 낮음. 컨테이너화 + staging/production 2환경 파이프라인.
    3. 네트워크·신뢰 경계: 127.0.0.1 바인딩 해제 → 리버스 프록시+TLS+도메인(사내망 여부는 L1 결정), CORS, 비밀관리(Entra 앱 자격증명·API 키 vault).
    4. **불변 Audit Log Store(WORM):** RP03 게이트(tamper-evident chain, legal hold purge block, in-place mutation 금지)를 운영 스토리지에서 충족. Ledger Store, Search/Vector Index, Cache.
    5. 백업/DR: RPO/RTO 수치 신규 합의(R13 게이트에 수치 부재 — 예: RPO≤24h/RTO≤4h에서 출발해 승인), DB+Audit store 백업 주기·암호화·복원 절차, 문서 원본은 SharePoint 보존정책 위임(책임 분계), 인덱스 재동기화 runbook.
    6. 모니터링/SLO: 로그·메트릭·알림 스택 선정. 초기 SLO — API 가용성(업무시간 99.5%↑)·p95 지연·에러율·**감사 체인 무결성 일일 검증 job**·Graph 연동 상태·백업 성공률. progress-control-room은 개발 현황판으로 존치, 운영 대시보드 별도 신설.
  - **M365 테넌트 트랙** (Risk A):
    7. 테넌트 관리자 권한 확보 확인(§4-6) → Entra 앱 등록(MSAL+NAA) → **Graph scope 목록 확정·열거**(현재 어느 문서에도 미열거 — 최소권한, '광범위 권한 무검토 요청 금지') → admin consent 증적.
    8. SharePoint/OneDrive matter 폴더 프로비저닝 + file_ref 규약(L1 OQ-001 결정 반영), 테스트 mailbox/site의 local/staging/production 분리.
    9. Outlook Add-in 배포 파이프라인: manifest admin center 조직 배포, 파일럿 그룹 한정 → 전사 2단계. Smart Alerts는 Wave 2.
    10. SSO/MFA: Entra 조건부 액세스로 R13 게이트 충족(별도 IdP 불필요), 사용자↔Employee 매핑 부트스트랩(MAT-DEC-02 구조 준수).
- **완료 게이트:** staging 전체 스택 기동 + CI green + Entra 로그인 E2E + Add-in 파일럿 mailbox에서 read mode filing E2E(Release Gate 6항목 사전 점검) + 백업 생성·복원 리허설 1회(RPO/RTO 실측) + 배포→롤백 왕복 시연 + 알림 실발화 테스트 + 통합 장애 시나리오(Graph 호출 실패·업로드 중단 시 partial state 방지) 리허설.
- **산출물:** CI 파이프라인, 배포 토폴로지, WORM 구성, backup-dr-runbook(RPO/RTO 수치), SLO 정의서+대시보드, Graph scope 결정서+consent 증적, SharePoint 프로비저닝 기록, Add-in 배포 runbook, 라이선스 감사 보고.

### L4 — 제품 UI 구축 (트랙 C)

- **목표:** Amplitude 패리티 데모 셸을 실제 법률 제품 화면군으로 전환한다. '연결 작업'이 아니라 '제품 빌드' 규모(50개 flow group 중 1개만 라이브, 자동 테스트 0).
- **진입조건:** L2의 인증·서버측 권한·Wave 1 write API 일부 가동(화면 단위 incremental 착수). **staging 가동(L3)이 완료 게이트의 전제임을 명시.**
- **작업 묶음:**
  1. Wave 1 화면군: Matter Home(11영역 — 단일 핵심 화면), Work Queue, Document Workspace, Outlook Add-in Pane, Issue Ledger, Admin Console. Portal류는 Wave 3.
  2. wiring 순서: `docs/ui-reference/contract-screen-map.md`의 0→5 순서를 화면 전환 로드맵으로 승격. P5 live-data 패턴(권한 3상태 + gated 응답 shape)을 확장 템플릿으로.
  3. 패리티 제약(byte-identical mock render path) 공식 해제 결정 기록.
  4. UI 회귀 테스트 체계 신설(결정적·코퍼스/서버 독립).
  5. i18n 정책 확정(한국어 단일 vs 이중) + 용어집·제품명 표기 반영.
  6. 교육 자료 원천 정리(화면별 사용자 흐름 → L7 교재).
- **완료 게이트:** Wave 1 화면 전부 staging에서 합성 시드로 E2E(로그인→matter 생성→문서 filing→work queue→audit 조회) + UI 회귀 green + npm test+build green.
- **산출물:** Wave 1 제품 UI, UI 회귀 스위트, 교육 원천 문서.

### L5 — 보안·컴플라이언스·성능 수락

- **목표:** 문서에 이미 존재하는 출시 게이트 골격을 staging(프로덕션 동형)에서 실행 가능한 수락 테스트로 변환·통과시킨다. **실데이터 투입(L7)보다 반드시 선행.**
- **진입조건:** L2·L3·L4 완료(전체 스택 staging 가동).
- **작업 묶음** (Risk A):
  1. 보안 Verification Gate 7항목(06:103-111) 수락 테스트화: 무권한 직접 URL 차단 / 검색 제한객체 제외 / AI context 제한객체 제외 / SharePoint 공유상태↔matter ACL 불일치 탐지 / Portal 비노출 / HR 접근제어 / audit 무누락 — staging 실행, go-live 직전 프로덕션 재실행.
  2. Ethical Wall 5경로(API/UI/search/AI/export) 차단 + emergency override 별도 승인+audit 동작 확인.
  3. 금지사항 5건(24:58-65)·PRD 비목표 8건의 **'우회 불가' 검증**(기능 존재가 아니라 우회 불가가 기준): 발송 전 QC gate, 승인 큐 경유 write-back, deterministic HR rule engine, Obsidian export-only.
  4. **외부 침투테스트 1회**(권한 우회·tenant isolation·인증 세션·prompt injection 중심) + PIPA 관점 점검 — 현 체계는 전부 내부 검증(Hermes+Claude+human)이므로 외부 검증을 게이트에 추가. P0/P1 finding은 go-live 차단으로 adjudication.
  5. 감사 체인 운영 검증: WORM 저장소에서 hash-chain verification, legal hold purge block, in-place mutation 시도 차단.
  6. **성능·부하 테스트** (신설 — 비판 반영): 실규모 합성 데이터(AMIC 예상 규모의 사건·문서·이메일 볼륨)로 검색/인덱스·문서 업로드·동시 사용자 부하 테스트, **정량 수락 기준 합의**(R13 '성능 기준'의 수치화 — SLO 초기값과 정렬).
  7. 장애 시나리오 리허설: DB 장애 복구, 백업 복원, 인덱스 재동기화 runbook 실행.
- **완료 게이트:** 수락 테스트 전건 green(증거 보존) + 침투테스트 P0/P1 zero(또는 수정 후 재검증) + 성능 기준 충족 + 인간 승인자 보안 사인오프.
- **산출물:** security-acceptance-suite(재실행 가능), 침투테스트 보고+adjudication, 성능 테스트 보고+수락 기준, DR 리허설 증거, PIPA 점검 보고.

### L6 — 운영 체계 수립 (L4/L5와 부분 병렬)

- **목표:** '기능이 도는 것'과 별개로 '사람이 운영할 수 있는 체계'를 만든다.
- **진입조건:** L3 모니터링 스택 가동.
- **작업 묶음:**
  1. 장애 대응: 심각도 분류(S1~S4)+SLA, 온콜/에스컬레이션(내부 1테넌트 규모로 경량화), incident response runbook, 사후 리뷰 양식.
  2. 지원 체계: 문의 채널, FAQ/온보딩, 권한 요청·변경 절차(승인+audit).
  3. break-glass/emergency override 런북: 승인자·시간제한(RP16 break-glass time limit)·사후 감사 리뷰 의무.
  4. AI 인간검토 운영 준비(Wave 2 대비): AI Review Queue 운영 인력, high-risk output reviewer 실명 명단, 승인/반려 SLA, rollback·disable switch 권한자, AI Release Gate 7조건 사인오프 양식.
  5. 변경관리: 정책 변경 = 코드 배포(contracts는 런타임 미로딩) — 변경 승인→CI→배포→회귀(Regression Map: 권한 정책 변경 시 UI/API/Search/Portal/AI/Vault/HR 전부 회귀)의 운영 절차 명문화. CP 시대 게이트(npm test+build green, 경로 sign-off, 백업 게이트)를 운영 절차로 승계.
  6. KPI 측정 인프라: PRD §7 성공 기준 7종(filing 사용률, QC 수정율, 권한위반 차단, audit completeness 등) 수집 구현 + 목표치 설정.
- **완료 게이트:** 전 runbook 탁상연습 1회 + 모의 장애 1회 처리 기록 + AI 리뷰어 명단·권한 부여 + 변경관리 절차로 실제 변경 1건 처리 시연.
- **산출물:** 런북 3종(incident/break-glass/rollback), 지원 절차, AI-review-operations 문서+명단, 변경관리 절차, KPI 대시보드.

### L7 — 데이터 마이그레이션·파일럿·UAT·교육

- **목표:** 실데이터를 통제된 절차로 투입하고, 파일럿 그룹이 실업무로 제품을 수락한다.
- **진입조건:** **L5 보안 수락 + L6 운영 체계 완료**(보안 게이트 통과 전 실데이터 투입 금지) + production-data-policy 계약 발효(L1 신설분) + **실데이터 투입 전 audit 경로·ID 체계·권한 모델의 실환경 작동 선확인**('Audit Event Schema 소급구현 불가' 원칙).
- **작업 묶음** (마이그레이션·백필은 규칙상 자동 Risk A):
  1. **GL-MIG-01 인벤토리·매핑:** 소스 인벤토리(기존 파일서버/SharePoint/Outlook mailbox/사건 대장), Matter ID·파일명 규칙 확정(OQ-012), matter↔클라이언트↔담당자 매핑표, 기존 접근권→matter ACL 매핑(permission sync checker 가동), 제외 데이터 판정(HR 민감 데이터 제외 — HR 분리 트랙).
  2. **GL-MIG-02 시범 마이그레이션(파일럿 팀 분량):** staging dry-run → 검증(건수 대사·해시 무결성·중복/버전 재구성·권한 샘플 감사·audit 이벤트 생성) → 파일럿 팀 검수 → rollback 리허설 1회. RP25 산출물(소스 임포트·백필·해시/중복/버전 재구성)을 실행 엔진으로 사용.
  3. **GL-MIG-03 전체 백필 + 델타 전략:** production 백필 + 검증 보고서 + **컷오버까지의 델타 동기화 절차**(파일럿 기간 레거시 채널에서 계속 생성되는 사건·문서·이메일 추적) + **컷오버 시 변경 freeze→최종 델타 적용 설계**. 마이그레이션 자체를 audit event로 전량 기록.
  4. **교육(파일럿 시작 전):** 역할별 — 변호사(Matter Home·Work Queue·filing·Issue Ledger), 스태프(Document Workspace·filing), 관리자(Admin Console·권한·감사). 금지사항·오filing 정정 절차·에스컬레이션 포함. 핸즈온 + 퀵 레퍼런스.
  5. **파일럿 운영(2~4주):** 파일럿 팀이 production에서 실제 신건·진행 사건 일부 수행. Add-in 파일럿 배포, AI off 유지, 주간 피드백 세션, P0/P1 즉시 수정 트랙, 운영 지표 수집(SLO 준수율·감사 체인 일일 검증·filing 성공률·권한 차단 이벤트).
  6. **UAT:** 시나리오 수락 테스트 — 14개 화면 흐름 + 핵심 업무 시나리오(신건 등록→문서 filing→이메일 filing→task/deadline→issue→검토 승인→audit 조회) + Regression Map 회귀 체크리스트 + 금지사항 우회 시도(파일럿 사용자 직접) + KPI 수집 동작 확인.
- **완료 게이트:** dry-run·rollback 리허설 성공 + 백필 검증 보고서(건수 대사 100%, 차이 전건 사유 기록, 민감 matter 권한 전수 감사) + 델타 절차 문서화 + UAT 통과율 100%(실패분은 수정 재실행 또는 인간 승인자 명시 수용) + 파일럿 기간 S1/S2 zero(발견분 전건 해소) + 파일럿 오너 서면 수락 + 교육 이수 100%.
- **산출물:** 마이그레이션 매핑표·실행 로그·검증 보고서, rollback 리허설 기록, 델타 동기화 runbook, UAT 결과, 파일럿 보고서, 교육 이수 대장, KPI 베이스라인 정의서.

### L8 — Go/No-Go 게이트·컷오버

- **목표:** 전제품 출시 승인을 단일 게이트로 판정하고 전사 개방한다.
- **진입조건:** L7 완료 + `scripts/validate-go-live-readiness.mjs` + `contracts/go-live-gate-contract.json` 구현.
- **Go/No-Go 게이트(기계화 가능한 항목은 기계화, 나머지는 서명 체크리스트):**

  | # | 차원 | 판정 기준(전부 충족 = go) | 증거 |
  |---|---|---|---|
  | G1 | 완료성 | Final Product Completion Gate green + 이연 전수 재판정 | L0 검증기 출력 |
  | G2 | 런타임 | Wave 1 기능 100% runtime_ready + 런타임 통합 테스트 green | implementation-layer ledger |
  | G3 | 보안 | Verification Gate 7항목 + Ethical Wall 5경로 프로덕션 green, 침투테스트 P0/P1 zero, 우회 불가 증명 | L5 수락 스위트 |
  | G4 | 인프라/DR | 백업 복원 리허설(RPO/RTO 실측 충족), WORM 체인 운영 검증, 배포→롤백 왕복, 성능 기준 충족 | L3/L5 기록 |
  | G5 | M365 | admin consent 증적, Add-in Release Gate 6항목 프로덕션 통과, permission sync checker 가동 | L3 증적 |
  | G6 | 운영 | SLO 대시보드+알림 실발화, 런북 탁상연습, break-glass 발효, 지원 채널 개통 | L6 기록 |
  | G7 | 컴플라이언스 | PIPA retention 비준·반영, AI off 확인(또는 Wave 2 게이트 충족), HR 실데이터 미투입 확인 | L1/L5/L6 문서 |
  | G8 | 데이터 | 백필 대사 100% + 델타 절차 가동 + rollback 가능 상태 유지 | L7 리포트 |
  | G9 | 거버넌스 | 본 게이트 자체가 goal-closeout 9단계 통과(Hermes+Claude 리뷰+adjudication) | docs/goal-closeout/go-live/ |
  | G10 | 인간 승인 | 지정 승인자(L1-5) 공동 사인오프 아티팩트 | 서명 문서 |

  **No-Go 처리:** 한 차원이라도 미충족 시 보류 — 미충족 항목을 P0/P1 finding으로 adjudication 후 게이트 전체 재판정(부분 통과 이월 금지).
- **컷오버 런북:** 변경 freeze → 최종 델타 마이그레이션 → 무결성 검증(건수/해시/권한 샘플) → 시스템 헬스 체크 → go/no-go 회의 → 전사 개방(Entra 계정 프로비저닝, Add-in 전사 배포, 공지·지원 채널) → 48시간 집중 감시. **롤백 조건·시한 사전 합의**(전사 개방 후 48시간 내 S1 발생 시 파일럿 범위로 축소 복귀 절차 문서화).
- **단계별 기능 개방:** Verification Edge 순서 — 코어 read → Outlook filing → write 워크플로 전체. Blocking Edge 준수: ACL/audit 검증 미통과 기능은 비활성 상태로 출시. AI off 유지.
- **완료 게이트:** G1~G10 전부 충족 + 컷오버 런북 전 단계 실행 기록(타임스탬프·검증값) + 개방 후 48시간 S1 zero.
- **산출물:** go-live 판정 기록(서명), 컷오버 실행 기록, 전사 배포 기록. **이 시점이 "실제 출시"다.**

### L9 — 하이퍼케어·안정화·단계 개방

- **목표:** go-live 직후 집중 지원으로 안정 상태 도달, 보류 기능의 게이트 순차 개방, 레거시 정리.
- **진입조건:** L8 go 판정·컷오버 완료.
- **작업 묶음:**
  1. **하이퍼케어(4주 기준):** 일일 triage(결함·문의·오filing)·SLO/감사 체인/KPI 리뷰, 주간 인시던트 리뷰·경영 보고, 파일럿 팀원의 팀별 챔피언 전환, Feedback/Loop edge 운영(피드백→분류→개선).
  2. **KPI 베이스라인 실측:** PRD §7 7종 4주 실측 → 목표치 대비 리포트.
  3. **레거시 소스 처분** (신설 — 비판 반영): 마이그레이션 소스(기존 파일서버·사건 대장·메일함)의 read-only 동결 → 병행 참조 기간 설정 → 보존 의무 연계 폐기/아카이브 정책 실행(L1 비준 보존정책과 정합).
  4. **Wave 2 개방 — AI 활성화:** 별도 게이트(외부 provider DPA + 민감데이터 라우팅 차단 + regression set 통과 + 리뷰어 명단 + rollback/disable 확인 + output 상태 표시 UI)를 기능 단위 사인오프로. Smart Alerts·Drafting 순차. 파일럿 기간 Escalation Edge(Governor 검토) 운영.
  5. **Wave 3 개방:** Client Portal(외부 신원 체계 + link expiry/revocation/watermark 인프라 선행), HR Operations(HR sensitivity 검증 + rule engine 확인 후 직원 실데이터 — payroll 범위 OQ-006 선행), Obsidian export-only, Billing automation, Enterprise DLP. 각 wave마다 G3/G6/G7 차원 재판정 + goal-closeout.
- **완료 게이트(안정화 종료 선언):** 연속 2주 P0/P1 zero + 4주 연속 SLO 충족 + audit completeness green + KPI 베이스라인 리포트 발행 + 인시던트 전건 사후 분석 + 정상 운영 이관 승인(인간 승인자).
- **산출물:** KPI 리포트, 인시던트·피드백 대장, 레거시 처분 기록, wave별 게이트 통과 기록, 정상 운영 이관 문서.

---

## §6 크리티컬 패스와 일정 지배 요인

```
[CP 중] §4 선행조치(하드닝 비준·인터리브 결정·MAT-DEC-03·갭 대조·외부 리드타임)
L0 → L1 → ┬ L2 런타임 구축(최장 구간) ──┬→ L5 보안·성능 수락 ─┬→ L7 마이그레이션·파일럿 → L8 컷오버 → L9 안정화
           ├ L3 인프라·M365(병렬)      ─┤   L6 운영 체계(병렬) ┘
           └ L4 제품 UI(L2 부분 후)    ─┘
```

- **일정 지배 변수 1순위: L2 런타임 구축 규모** — §4-2 인터리브 결정과 L0 격차 보고서가 규모를 확정한다. runtime_ready 0인 채 CP가 완료되면 L2는 신규 백엔드+제품 UI 구축 전체가 된다.
- **외부 리드타임은 병렬 선행:** M365 admin consent·테넌트 작업(L3), PIPA/DPA 법적 검토·침투테스트 섭외(§4-6)는 코드와 무관한 소요이므로 가장 일찍 출발.
- **일정 추정 방식:** 본 계획은 기간을 단정하지 않는다. L0 격차 보고서 산출 후 launch 트랙 goal 백로그를 생성해 잔여 goal 수·리스크 분포로 기계 추정한다(CP의 pack_count_estimate_policy 방식 승계).

## §7 Wave 4 — 상용 멀티테넌트 전환 경로 (go-live 이후, 별도 계획)

standing goal이 enterprise SaaS-grade 완성이고 MAT-DEC-01이 'SaaS 코어 유지 + AMIC=1호 테넌트'이므로, 내부 go-live는 종착이 아니라 1호 테넌트 가동이다. 안정화 종료 후 별도 계획 수립 goal로 다음을 다룬다:

1. RP26 유예 항목 재개(SCIM, dedicated resources 등 — L1-6 스코핑 기록이 백로그)
2. 2호+ 외부 테넌트 온보딩 절차(테넌트 프로비저닝·격리 검증의 테넌트별 재실행)
3. 구독·과금 런타임(RP12/RP29 산출물의 런타임화)
4. 상용 release approval·계약·SLA 체계, 침투테스트 정례화
5. 상용 시점의 별도 브랜드/법적 검토(상표·약관·DPA 표준화)

## §8 통합 리스크 (상위 10)

1. **런타임 격차** — 닫힌 팩 전부 descriptor·runtime_ready 0. CP 완료 시점 실행 제품이 현재 수준(GET 4라우트+mock UI)일 가능성. §4-2 인터리브 결정이 최대 완화책.
2. **신뢰 경계 부재** — 인증 0 + 권한 컨텍스트 클라이언트 자기주장. 실사용자 1명도 수용 불가 → L2 첫 goal.
3. **감사 원장 영속화** — 인메모리 해시체인 + '소급구현 불가' 원칙. 실데이터 1건이라도 audit 미가동 투입 시 복구 불가 결손 → L7 진입조건으로 강제.
4. **실데이터 정책 충돌** — Hermes/RTG-004의 실데이터 금지 vs go-live. production-data-policy 가산 계약 없이는 게이트 비공식 약화 위험 → L1-4.
5. **M365 외부 의존** — MAT-DEC-03 차단, Graph scope 미열거, 토폴로지·배포방식·admin consent 미결, 소유자·시한 미지정 → §4-3, §4-6, L1-2, L3.
6. **범위 공백 5영역** — Work Queue·Issue Ledger가 미산출이면 Wave 1 컷라인 자체가 불성립 → §4-4 (CP 중 대조, overlay admission 경로).
7. **컴플라이언스 미비준** — retention/파기/AI 보존 전부 '제안' 상태, 외부 AI 법적 검토 미수행 → L1-3 (완화: Wave 1 AI off).
8. **배포 인프라 0% + git remote 부재** — 단일 로컬 리포 자체가 사업 연속성 리스크. push 전 라이선스 감사 선행 → L3-1.
9. **단일 실행 주체** — L2가 팀 규모 작업인데 인력 계획 부재 → L1-8.
10. **출시 트리거 오정의** — 팩 번호 고정 인용은 재생성마다 깨짐(495→494→492 실관측) → §2-3 정의 준수.

---

부록: 본 계획의 조사 근거(8개 영역 사실 대장, 3개 관점 초안, 비판·검증 전문)는 세션 워크플로 산출물에 보존됨. 주요 정정 — MAT-DEC-04는 조사 시점 pending이었고 본 계획 §1의 소유자 지시로 확정됨; MAT-DEC-02(User/Employee 분리)는 기결정이므로 '미결 결정'으로 재등재하지 않음; RP11 앵커 데드라인은 이미 경과(라이브 큐 RP16 진행 중)하여 제외함.
