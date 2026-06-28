# LCX8-ACTION-0197 Employee List Row Proof

Status: PASS
Generated: 2026-06-27T01:21:56.665Z

## Scope
- Target: LCX8-ACTION-0197 Employee list row
- Batch: LCX8-ALL-10 Cross-Surface Read Refresh And Selection Proof
- Current-product route correction: people-certificates handles employee-scoped HR documents; people-leave handles leave state. people-documents is company policy only.

## Source Fix
- apps/api/src/hrx-runtime-context.js: GET /api/hrx/documents and GET /api/hrx/leave now honor denied/review permission-context decisions with empty guarded read payloads.

## Browser Proof
- certificates: rows=9; employees_read=true; documents_read=true; api_5xx=0; screenshot=docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0197-people-certificates-allow-proof.png
- leave: rows=9; employees_read=true; leave_read=true; api_5xx=0; screenshot=docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0197-people-leave-allow-proof.png

## Guarded Browser Proof
- people-certificates denied: guard_visible=true; employee_rows=0; protected_requests=0; api_5xx=0; screenshot=docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0197-people-certificates-denied-guard-proof.png
- people-certificates review: guard_visible=true; employee_rows=0; protected_requests=0; api_5xx=0; screenshot=docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0197-people-certificates-review-guard-proof.png
- people-leave denied: guard_visible=true; employee_rows=0; protected_requests=0; api_5xx=0; screenshot=docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0197-people-leave-denied-guard-proof.png
- people-leave review: guard_visible=true; employee_rows=0; protected_requests=0; api_5xx=0; screenshot=docs/lazycodex/evidence/matter-web/artifacts/lcx8-action-screenshots/lcx8-action-0197-people-leave-review-guard-proof.png

## Direct API Probes
- allow /api/hrx/employees: status=200; ui_state=null; no_payload_leak=null
- allow /api/hrx/documents?employee_id=emp_001: status=200; ui_state=null; no_payload_leak=null
- allow /api/hrx/leave?employee_id=emp_001&policy_id=pto-us: status=200; ui_state=null; no_payload_leak=null
- denied /api/hrx/employees: status=403; ui_state=denied; no_payload_leak=true
- denied /api/hrx/documents?employee_id=emp_001: status=403; ui_state=denied; no_payload_leak=true
- denied /api/hrx/leave?employee_id=emp_001&policy_id=pto-us: status=403; ui_state=denied; no_payload_leak=true
- review /api/hrx/employees: status=200; ui_state=review_required; no_payload_leak=true
- review /api/hrx/documents?employee_id=emp_001: status=200; ui_state=review_required; no_payload_leak=true
- review /api/hrx/leave?employee_id=emp_001&policy_id=pto-us: status=200; ui_state=review_required; no_payload_leak=true

## Assertions
- PASS certificates_route_has_employee_rows
- PASS leave_route_has_employee_rows
- PASS certificates_click_observed_documents_read
- PASS leave_click_observed_leave_read
- PASS employee_read_observed_in_both_modes
- PASS no_browser_5xx
- PASS no_browser_console_errors
- PASS guarded_routes_show_guard
- PASS guarded_routes_hide_employee_rows
- PASS guarded_routes_make_no_protected_requests
- PASS direct_allow_probes_ok
- PASS direct_denied_probes_fail_closed
- PASS direct_review_probes_review_required_no_leak

## Non-Claims
- This is read-only employee selection proof; no HRX document or leave write persistence is claimed.
- LCX8-ACTION-0197 is not proof for leave submission or document generation actions.
