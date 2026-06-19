# External Leadtime Register

Status: blocked_pending_external_actions
Recorded at: 2026-06-18T10:12:26Z
Work package: LT-PRE-W06

## Register

| Dependency | TUW | Owner role | Start state | Expected lead time | Downstream blocker | Evidence document | Current status |
|---|---|---|---|---|---|---|---|
| EXT-M365-ADMIN | LT-PRE-W06-T01 | Launch owner / M365 tenant administrator | not_started_in_repo | pending_external_confirmation | L3-7 Entra app registration and Graph work | docs/launch/external-leadtime/m365-admin-access-confirmation.md | blocked_pending_external_confirmation |
| EXT-LEGAL-AI | LT-PRE-W06-T02 | Launch owner / legal privacy reviewer | scope_drafted_not_sent | pending_external_kickoff | L1-3 PIPA/retention/legal policy ratification | docs/launch/external-leadtime/ai-legal-review-scope.md | blocked_pending_external_kickoff |
| EXT-PENTEST | LT-PRE-W06-T03 | Launch owner / security test coordinator | scope_drafted_no_vendor_contact | pending_vendor_outreach | L5-4 external penetration test | docs/launch/external-leadtime/pentest-scope-draft.md | blocked_pending_vendor_outreach |

## Close Path

LT-PRE-W06 can close only after the register is updated with real external evidence:

1. M365 admin access confirmation or not-secured escalation with owner and lead time.
2. AI legal review kickoff record with reviewer role, request date, and response deadline.
3. Pentest outreach record with at least one candidate, contact evidence, and target contract timing before L5 entry.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
