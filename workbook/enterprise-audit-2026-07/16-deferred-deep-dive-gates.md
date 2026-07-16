# Deferred Deep-Dive Gates

이 파일은 A~U 프레임워크 D, E, F, J, T의 미완 전수 작업을 수리 stage에 연결한다. 현재 직접 클릭/동적 실행을 강행하면 W7의 동일 장애를 반복하므로, 각 deep-dive는 명시 gate 이후 실행한다.

## 1. Static UI census snapshot

| 항목 | 값 |
|---|---:|
| `<button>` count | 369 |
| `onClick=` count | 216 |
| `data-testid=` count | 14 |
| input/select/textarea count | 116 |
| largest button file | `apps/web/src/components/ExperimentsSurface.jsx` 46 |
| primary product file | `apps/web/src/components/MattersSurface.jsx` 39 |

## 2. CA-3 기능·도메인 심화 gate

| 범위 | 보류 이유 | 다시 실행하는 조건 | 산출 표 |
|---|---|---|---|
| Finance 22 endpoint family | W7 root/API failures can mask feature behavior | R Stage 1~2 complete | fee/time/expense/prebill/invoice/payment/trust/accounting flow table |
| CRM/Intake 34 endpoint family | Matter clearance/opening blocked | R Stage 1 complete | lead/opportunity/intake/conflict/engagement/clearance table |
| 업무/기한/calendar/channel | needs Matter target record | R Stage 1 complete | activity/calendar/deadline/channel action table |
| Reports/analytics | currently route-present but not all user journeys replayed | R Stage 2 complete | report create/run/share/profitability table |
| AI retrieval/output | provider/model boundary separate | R Stage 2 + model/provider receipt decision | 15항 AI checklist |
| Conflict waiver/memo | tied to CRM/Intake and Matter opening | R Stage 1 complete | conflict -> waiver -> engagement -> matter evidence table |

## 3. CA-4 버튼 전수·UX gate

| Surface | Static buttons | Gate | Notes |
|---|---:|---|---|
| ExperimentsSurface | 46 | R Stage 7 | likely dead/orphan; do not click-table before disposition |
| modal-states | 40 | R Stage 7 | modal helpers need owning routes |
| MattersSurface | 39 | R Stage 1~2 | core route after Matter opening green |
| ClientsSurface | 25 | R Stage 1 | CRM/intake and clearance path |
| AnalyticsSurface | 23 | R Stage 7 | dead surface or route decision first |
| Shell | 22 | R Stage 7 | global navigation/utility interactions |
| AuthSurface | 16 | R Stage 3 | session secret/login hardening |
| PermissionAdminPanel | 13 | R Stage 6 | HRX/security alignment |
| MatterVaultPanel | 10 | R Stage 1~4 | durable store path |
| ThemeSurface | 9 | R Stage 7 | product route decision |

## 4. Button flow 20-field schema

Every button row in the eventual E/J table must include:

| Field group | Fields |
|---|---|
| Identity | route, component, line, visible label, data-testid |
| State | enabled/disabled, required selection, empty state, loading state |
| Handler | handler name, API helper, endpoint, mutation class |
| Trust | auth/session, tenant, permission, step-up/dual-control |
| Data | input dependencies, output state, audit/provenance, redaction |
| QA | click result, expected status, screenshot/receipt, final 판정 |

## 5. Route UX 24항 seed

| Category | Checks |
|---|---|
| Navigation | visible entrypoint, stable route id, back/close behavior |
| Layout | no overlap, responsive fit, scroll ownership |
| Interaction | focus, disabled state, loading, error, empty state |
| Data truth | no dummy rows, API-backed, no stale sample values |
| Trust boundary | visible provider/owner block, no fake success |
| Accessibility | label, keyboard, contrast, target size |
| Korean copy | natural business noun, no implementation jargon |
| Evidence | screenshot, route URL, test/receipt link |

## 6. T table update rules

| T table | Existing file | v2 update condition |
|---|---|---|
| T-1 feature reality | `02-feature-reality.md` | CA-3 after R Stage 1~2 |
| T-2 button flows | `03-button-flows.md` | CA-4 after R Stage 7 |
| T-6 operational decision | `07-bottlenecks-verdict.md`, `08-report.md` | V Track after each R Stage |

## 7. Deferred 판정

D/F/E/J/T are not complete in this turn by design. Their execution is now gated, scoped, and measurable, which prevents redundant click tables over surfaces that Stage 7 may delete or routes that Stage 1~2 still block.
