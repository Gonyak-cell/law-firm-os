# LCX-FULL-04 Provider Receipt

Generated at: 2026-06-30T10:44:35.348Z

Verdict: PASS

| Case | Allowed | Reason |
| --- | --- | --- |
| missing | no | provider_receipt_missing |
| sandbox | no | production_provider_receipt_required |
| wrong-scope | no | provider_receipt_scope_missing |
| valid-production | yes | provider_receipt_valid |

## Boundary

- Missing, sandbox, expired, wrong-scope, or revoked receipts stay provider-blocked.
- Valid production receipt recognition is a model result only; no provider connection or production write is claimed.
