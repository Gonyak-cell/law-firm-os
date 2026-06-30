# LCX-FULL-01 State Model Receipt

Generated at: 2026-06-30T10:44:29.869Z

Verdict: PASS

| From | To | Allowed | Reason |
| --- | --- | --- | --- |
| not_configured | configured | yes | ordered_transition |
| configured | approval_requested | no | state_skip_blocked |
| preflight_passed | owner_approved | no | state_skip_blocked |
| owner_approved | provider_receipt_recorded | yes | ordered_transition |
| owner_approved | execution_requested | no | state_skip_blocked |

## Boundary

- Shared model only; no writes are enabled.
- Owner approval, provider production write, production go-live, and public release claims remain false.
