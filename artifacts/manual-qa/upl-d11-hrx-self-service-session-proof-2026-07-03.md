# UPL-D-11 HRX Self-Service Session Proof

- Verdict: PASS
- Generated at: 2026-07-03T08:22:03.012Z
- Screenshot: `artifacts/manual-qa/screenshots/upl-d11-hrx-self-service-session-proof.png`
- Staff employee: `emp_amic_yjlee`

The receipt stores only header-presence booleans and hashes. It does not store Authorization values, session tokens, or passwords.

## Checks

- PASS api_signed_staff_employee_list_self_only
- PASS api_signed_staff_own_profile_success
- PASS api_signed_staff_other_profile_403
- PASS api_forged_actor_headers_do_not_expand_staff_scope
- PASS api_signed_staff_own_documents_leave_success
- PASS api_signed_staff_other_documents_leave_403
- PASS api_signed_staff_ungranted_attendance_compensation_audit_scopes_denied
- PASS web_hrx_request_uses_authorization_only
- PASS web_hrx_visible_roster_self_only
- PASS web_token_material_not_rendered
- PASS web_no_page_errors
