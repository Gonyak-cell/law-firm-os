# LCX-HRO-07 Blocked Backlog Contract

Program: `LCX-PPL Full Reflection`
Status: `local_blocked_contract_backlog_ready`
Scope: `LCX-HRO-07.01` through `LCX-HRO-07.04`

This contract separates HRX/HRO backlog domains from the legal People
relationship expansion. It does not implement those HRO domains. It prevents
backend-missing or owner-gated domains from appearing as working product UI.

## Scope

| TUW | Name | Claim |
| --- | --- | --- |
| `LCX-HRO-07.01` | Blocked HRO Surface Registry | Complete |
| `LCX-HRO-07.02` | Workforce/Bulk Contract Stub | Complete |
| `LCX-HRO-07.03` | Performance/Learning Contract Stub | Complete |
| `LCX-HRO-07.04` | External Owner Gate Pack | Complete |

## No-Fake-Working-UI

The following People sections remain blocked from live menu/router/API-client
exposure until their route contracts, audit receipts, owner gates, and
verification cases exist:

- `people-workforce-planning`
- `people-bulk-operations`
- `people-job-requests`
- `people-referrals`
- `people-benefits`
- `people-equity`
- `people-immigration`
- `people-background-checks`
- `people-engagement`
- `people-learning`
- `people-performance`
- `people-surveys`
- `people-it-assets`
- `people-apps`
- `people-notification-admin`

## Claim Boundary

Allowed current claim:

`LCX-HRO-07` blocked backlog contracts and owner gates are recorded and
validator-backed.

Still false:

- Runtime implementation complete
- Working UI exposure allowed
- Production readiness
- Go-live approval
- Enterprise trust approval

## Validator

```json
"lcx:hro:blocked:validate": "node scripts/validate-lcx-hro-blocked-backlog.mjs"
```
