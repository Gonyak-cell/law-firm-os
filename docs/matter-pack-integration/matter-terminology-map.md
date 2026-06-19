# Matter-Pack Terminology Map (A-0)

Status: planning-only — 본 문서는 구현·ledger·contract·validator·production_ready 선언을 승인하지 않는다.
Track: matter-pack absorption (`docs/matter-pack-integration/`)
Baseline at authoring: live pack CP00-326, next unit RP10.P04.M04.S18 (snapshot only — always re-read live queue)
Source package: `workbook/matter_dev_docs/` (25 docs, SHA256 frozen in `matter-pack-source-index.md`)
Purpose: Plan A(matter 문서 패키지)와 Plan B(리포 체계)의 동명이의 용어를 추출 전에 고정한다. 이 표 없이 요구 추출 시 의미 오염이 발생한다.

## 1. 충돌 용어표

| # | term | Plan A 의미 (문서·위치) | Plan B 의미 (코드 경로) | canonical 표기 결정 | 추출 시 변환 규칙 |
|---|---|---|---|---|---|
| 1 | Activity | time-capture용 행위 신호 — 문서편집·이메일·회의·AI job 등에서 time entry 후보 생성 (14_Billing §3 "Activity Signal") | CRM 영업활동 객체 (call/email/meeting/task) — `contracts/crm-core-contract.json`, RP09 | Plan A 측 → `activity_signal` / Plan B 측 → `crm_activity` | MAT-REQ-BILL 계열에서 "Activity" 단독 표기 금지, 항상 `activity_signal`로 치환 |
| 2 | Lead | Matter 상태기계의 첫 단계값 (05_도메인 §Matter State: Lead→Conflict Check→…) | CRM 1급 객체 — client-growth-crm 모듈 owns, RP09 | 상태값 → `matter_stage_lead` / 객체 → `crm_lead` | 문서 05 상태 enum 추출 시 CRM Lead 객체와 동일시 금지 — adjudication에서 경계 판정 |
| 3 | Contact | 사람 + 사건 내 역할(role_in_matter)을 가진 단일 객체 (05_도메인) | `Person`(사람) + `ContactPoint`(연락수단 값 객체) 분해 — `packages/master-data/src/model.js:112` | Plan A Contact → `matter_participant_role` 개념으로 재명명 | 추출 시 "Contact 객체 신설" 요구가 아니라 "Person↔Matter 역할 연결" 요구로 변환 |
| 4 | Loop | 개발방법론 루프 5종 — Exploration/Convergence/Orchestrated Integration/Learning/Governance (02_제품헌장 §9) | AI worker/verifier DAG 오케스트레이션 하니스 — `docs/loop-system-integration/` (RP17/18 연계, planning-only) | Plan A 측 → `methodology_loop` / Plan B 측 → `loop_system` | governance family 등가성 매핑에서만 사용, 요구로 추출하지 않음 (비흡수 결정) |
| 5 | P-기호 | Product Pillar P0~P14 (01_PRD §5, 03_피라미드 L2) | ① contract `priority`("P0"/"P1"/"P2") ② 구현계획 단계 P0.x ③ unit ID phase 세그먼트(`RP09.P08...`) — 3중 기존 사용 | Plan A 필러 → `PILLAR-P00`~`PILLAR-P14` 표기 | MAT-REQ family가 필러를 대체 표기하므로 본문에서 P-단독 표기 금지 |
| 6 | AI control | 제품 런타임 AI Gateway — 모델 라우팅·guardrail·Review Queue (07_AI 전체) | 개발 거버넌스 AI 통제 — AIControlRule(allowed: draft_code, forbidden: bypass_claude_review) `packages/control-plane/src/states.js` | Plan A 측 → **`AIGW`** (family명) / Plan B 측 → `dev_ai_control` | AIGW 요구는 control-plane AIControlRule 재사용 금지 — 별도 계약·패키지 전제로 추출 |
| 7 | Risk | 제품 리스크 severity — RISK-001~012 (23_Risk_Register) | 팩 risk_class A/B/C — 사이징·검토강도 (`docs/closeout-pack-plan/risk-classification-rules.md`) | 제품 측 → `product_risk` (UPR-### severity) / 팩 측 → `pack_risk_class` | 치환·합산 금지 — `docs/unified-product-risk-register.md` §1 어휘 분리 선언과 일치 |
| 8 | Matter 상태 | 11단계: Lead→Conflict Check→Proposal→Engagement→Open→Active→Pending→Signing→Closing→Post-closing→Archived (05_도메인) | registry 7단계(intake/opening/open/paused/closing/closed/archived — `packages/matter/src/registry.js:2633`) vs entities 5단계(`packages/domain/src/entities.js:3`) — 코드 내부도 불일치 | 미정 — adjudication 항목 (MAT-REQ-CORE 불변식 후보) | 추출 시 양쪽 enum을 병기하고 통합 enum 결정은 adjudication으로 위임 |

## 2. 명명 현황 기술 (결정 아님 — MAT-DEC-04로 위임)

- `Law Firm OS` = 계약·패키지 코드명 (`contracts/law-firm-os.product-contract.json`, 루트 package.json)
- `matter by AMIC` = UI 브랜드 (non-CP UI 트랙, `docs/ui-workstream-conventions.md`)
- `matter` = Plan A의 통일 제품명 (00_문서목록 §1 확정 전제 표)
- 결정 권고: "matter = 제품 브랜드, Law Firm OS = 플랫폼 코드명" 공식화 — MAT-DEC-04 (비차단, 전략 선언문 §8 확정 전)
