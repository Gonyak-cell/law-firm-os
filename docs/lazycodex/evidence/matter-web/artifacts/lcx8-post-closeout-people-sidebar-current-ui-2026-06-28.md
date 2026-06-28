# LCX8 People Sidebar Current UI Closeout

- Status before: UI_ONLY
- Status after: UI_ONLY
- Decision: UI_ONLY final classification
- Reason: current_product_sidebar_route_navigation_local_state_only
- Proof: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0148-0152-0163-people-sidebar-current-ui-proof.json
- Proof markdown: docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-0148-0152-0163-people-sidebar-current-ui-proof.md

Verification: Post-closeout LCX8-ACTION-0148/0152..0163 People sidebar current-UI proof PASS. Browser proof clicked the current People sidebar group and route items, confirmed hash routing into PeopleHome sections, active sidebar state, no API writes, no API 5xx, and product-label reconciliation for labels that changed in the current UI. Status remains UI_ONLY as final local route/navigation classification. LCX8-ACTION-0146/0147/0149/0150/0151 are deferred because their legacy Legal People/sidebar labels are no longer current visible sidebar actions.

## Rows
- LCX8-ACTION-0148: 관리; group-toggle
- LCX8-ACTION-0152: 구성원; people-members
- LCX8-ACTION-0153: 조직; people-org-chart; current label for ledger label 조직도
- LCX8-ACTION-0154: 휴가관리; people-leave; current label for ledger label 휴가
- LCX8-ACTION-0155: 요청 관리; people-approvals; current label for ledger label 승인
- LCX8-ACTION-0156: 입퇴사 관리; people-lifecycle; current label for ledger label 입사·퇴사
- LCX8-ACTION-0157: 구성원 등록; people-recruiting; current label for ledger label 채용
- LCX8-ACTION-0158: 회사방침; people-documents; current label for ledger label 인사 문서
- LCX8-ACTION-0159: 승인 규칙; people-policy; current label for ledger label 인사 정책
- LCX8-ACTION-0160: 인사기록; people-audit; current label for ledger label 활동 기록
- LCX8-ACTION-0161: 권한; people-admin; current label for ledger label 권한 관리
- LCX8-ACTION-0162: 급여정산; people-payroll; current label for ledger label 급여 정산
- LCX8-ACTION-0163: 리포트; people-analytics; current label for ledger label 인사 현황

## Deferred Legacy Rows
- LCX8-ACTION-0146: separate current-product route-only/superseded classification required
- LCX8-ACTION-0147: separate current-product route-only/superseded classification required
- LCX8-ACTION-0149: separate current-product route-only/superseded classification required
- LCX8-ACTION-0150: separate current-product route-only/superseded classification required
- LCX8-ACTION-0151: separate current-product route-only/superseded classification required

## Non-Claims
- current product UI route/navigation proof only
- no API write or persistence claim
- no external provider, production-ready, or go-live claim
- LCX8-ACTION-0146/0147/0149/0150/0151 are excluded because their legacy Legal People/sidebar labels are not current visible sidebar actions
