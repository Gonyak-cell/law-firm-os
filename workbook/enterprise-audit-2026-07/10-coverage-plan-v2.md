# Coverage Plan v2

작성일: 2026-07-05 Asia/Seoul.

이 문서는 2026-07-04 A~U enterprise audit 프레임워크를 현재 워크북 상태에 재적용한 실행 큐다. `scratchpad/enterprise-audit-coverage-plan-v2.md`는 현재 checkout에 없으므로, 정본은 이 파일이다.

## 1. 현재 기준

| 항목 | 값 |
|---|---|
| 기준 HEAD | `169484912 docs(audit): add enterprise audit workbook` |
| 워크북 | `workbook/enterprise-audit-2026-07/` |
| 기존 워크북 파일 | `00-charter.md`부터 `09-plan-306090.md`, `remediation-v3-spec.md`, `remediation-v3-executable/00-devplan-v3.md` |
| Codex 구현성 정본 | `remediation-v3-executable/03-codex-implementation-assessment.md` |
| 현재 dirty 파일 | 기존 `artifacts/manual-qa/*` 13건. 이 계획에서는 미접촉 |
| 쓰기 범위 | `workbook/enterprise-audit-2026-07/` 계획 문서 |
| 금지 | 이번 문서 업데이트 중 코드 수정, launch/go-live/production-ready claim, manual QA dirty 파일 정리 |

## 2. 판정 규칙

모든 새 표는 기존 헌장 판정 어휘만 사용한다.

| 판정 | 의미 |
|---|---|
| 확인됨 | 현재 스냅샷에서 정적/동적 증거가 직접 확인됨 |
| 부분 확인됨 | 일부 표본 또는 일부 계층만 확인됨 |
| 미확인 | 코드/증거를 찾지 못했거나 실행 증거 없음 |
| 구현 없음 | 요구 surface 자체가 없음 |
| 구현되어 있으나 작동 불명 | 코드가 있으나 현재 실패/미실행 게이트로 작동 판정 불가 |
| 구현되어 있으나 운영 부적합 | 데모/로컬 구현은 있으나 운영/enterprise 조건 미달 |

## 3. A~U 재분해

| 조항 | 기존 워크북 상태 | v2 처리 |
|---|---|---|
| A 현재 배포모델 판정 | 완료 | `17-reverification-decision-ledger.md`에서 재심 조건만 추적 |
| B Enterprise SaaS 목표 판정 | 완료 | `15-security-compliance-map.md`, `17-reverification-decision-ledger.md`로 운영 부적합 근거 유지 |
| C 병목 | 완료 | R Stage 1~8에 연결 |
| D 기능 실재성 | 부분 | `16-deferred-deep-dive-gates.md`에서 Stage 1~2 후 실행 큐 |
| E 버튼 전수 | 부분 | `16-deferred-deep-dive-gates.md`에서 Stage 7 후 실행 큐 |
| F 도메인 심도 | 부분 | `16-deferred-deep-dive-gates.md`에서 Stage 1~2 후 실행 큐 |
| G-3~G-5 운영/신뢰성/제품화 | 부분 | `15-security-compliance-map.md`, `17-reverification-decision-ledger.md` |
| H 엔티티 21종 | 미작성 | `11-structure-coverage-register.md` |
| I per-endpoint 기준 | 미작성 | `12-endpoint-criteria-register.md` |
| J route별 UX 24항 | 부분 | `16-deferred-deep-dive-gates.md` |
| K 테스트 20종 taxonomy | 미작성 | `13-test-taxonomy-register.md` |
| L ASVS/SSDF/SOC2/ISO 매핑 | 미작성 | `15-security-compliance-map.md` |
| M 연동 18종 | 부분 | `14-integration-register.md` |
| N 병목/상한 | 완료 | R Stage 우선순위로 유지 |
| O 보고서 | 완료 | 변경 없음 |
| P 60/90일 계획 | Epic 수준 | `17-reverification-decision-ledger.md`에서 v4 상세화 게이트 |
| Q 판정 어휘 | 완료 | 이 파일 상단 규칙으로 고정 |
| R 수리 지시 | 완료 | `remediation-v3-executable/00-devplan-v3.md` C0~C8을 실행 정본으로 사용. `03-codex-implementation-assessment.md`가 Codex 세션 분해와 구현성 판정 |
| S 15개 질문 | 완료 | `17-reverification-decision-ledger.md`에서 재답변 조건 |
| T T-1/T-2/T-6 표 | 부분 | `16-deferred-deep-dive-gates.md`에서 전수화 큐 |
| U governance | 완료 | 이 계획의 금지/쓰기 범위로 유지 |

## 4. 실행 트랙

| 트랙 | 산출물 | 상태 | 선행조건 |
|---|---|---|---|
| R | `remediation-v3-executable/00-devplan-v3.md` C0~C8 + `03-codex-implementation-assessment.md` | 실행 정본 고정 | 코드 수정 별도 세션 |
| CA-1 | H/I/K/M 구조 보완 감사 | 이 턴 산출 | 읽기 전용 가능 |
| CA-2 | L 보안·컴플라이언스 매핑 | 이 턴 산출 | 읽기 전용 가능 |
| CA-3 | D/F 기능·도메인 심화 | 수리 후 대기 | R Stage 1~2 완료 |
| CA-4 | E/J 버튼·UX 전수 | 수리 후 대기 | R Stage 7 완료 |
| V | 재검증·재판정 | 수리 후 대기 | 각 R Stage 완료 표본 |

## 5. R Track: 수리 큐

R Track의 실행 정본은 `remediation-v3-executable/00-devplan-v3.md`다. `remediation-v3-spec.md`는 이전 Stage 1~8 스캐폴드로 보존하고, 실제 Codex 투입 순서와 구현 가능성 판정은 `remediation-v3-executable/03-codex-implementation-assessment.md`를 따른다.

| 단위 | 목표 | 우선순위 | Codex 구현성 | v2 재검증 표본 |
|---|---|---:|---|---|
| C0 | 공유 runtime profile/store manifest | P0 선행 | repo-local 가능 | import smoke, 기존 동작 무변 |
| C1 | Matter opening 수직 플로우 복구 | P0 | repo-local 가능 | client -> clearance -> matter -> vault document -> restart readback |
| C2 | Root/API test contract drift + proof hygiene | P0 | repo-local 가능 | `npm test`, `npm run api:test`, no-token 업무 route 401, artifacts clean |
| C3 | vault-bridge 전용 헤더 이관 | P0 | repo-local 가능, 외부 `amic-vault`와 Lambda는 별도 | bridge tests 7/7, CORS header |
| C4 | Session secret hardening + STORE_PATH preflight | P0 | repo-local 가능 | 운영 모드 secret/path missing fail, fixed path restart proof |
| C5 | Portal G10 복구 | P1 | repo-local 가능, provider receipt는 별도 | invite/RFI/secure link/data room API + UI 표본 |
| C6 | HRX security/tenant/step-up 정렬 | P1 | repo-local 가능 | tenant deny, fresh step-up, HRX audit route |
| C7 | UI dead surface 처분과 preview labeling | P1 | repo-local 가능, 화면 QA 필요 | route/delete decision, UI regression, AI slop review |
| C8 | Env catalog + backup drill | P1 | repo-local 가능, 운영 schedule은 owner 확인 필요 | env matrix, backup/restore command, receipt |

권장 세션 순서는 `C0 -> C3 -> C1 -> C2 -> C4 -> C5/C6 -> C7 -> C8`이다. C3와 C2는 bridge 인증 계약을 공유하므로 C3를 먼저 닫고 C2가 결과를 흡수한다.

## 6. CA Track: 이번 산출물

| 파일 | 커버하는 조항 | 범위 |
|---|---|---|
| `11-structure-coverage-register.md` | H, I 일부 | 엔티티 21종, route family, runtime context 매핑 |
| `12-endpoint-criteria-register.md` | I | endpoint family별 기준표와 per-endpoint 전수화 방식 |
| `13-test-taxonomy-register.md` | K | 테스트 20종 taxonomy, 현재 test 분포 |
| `14-integration-register.md` | M | 18종 연동 구현/증거/receipt 상태 |
| `15-security-compliance-map.md` | L, G-3~G-5 | ASVS/SSDF/SOC2/ISO 매핑과 현 결함 |
| `16-deferred-deep-dive-gates.md` | D, E, F, J, T | 수리 후 실행해야 하는 전수 클릭·기능 심화 큐 |
| `17-reverification-decision-ledger.md` | A, B, P, S, V | Stage별 재판정 조건과 15질문 재답변 ledger |

## 7. 완료 정의

이 v2 계획 자체의 완료는 새 10번대 워크북 파일이 생성되고, 기존 dirty manual QA 파일을 건드리지 않으며, markdown 형식 검사가 통과하는 것이다.

제품 판정의 완료는 별도다. 축 A를 `내부 파일럿 가능`으로 올리려면 R Stage 1~4와 V Track 표본이 직접 재실행으로 닫혀야 한다. 축 B는 SSO/OIDC/SCIM/seat billing/SOC2/managed DB/external receipts가 닫히기 전까지 `구현되어 있으나 운영 부적합`을 유지한다.
