# LCX-VLTUI Production Smoke

Generated at: 2026-07-08T02:27:25.124Z

Verdict: PASS

Base URL: https://d2mthcc8vp3cr2.cloudfront.net

Deployment commit: 51fd7f14fd0d5d28f12897c2a99f29486bb5ecc8-dirty-current-20260708T022442Z

Bridge token source: lambda_environment

| Check | Passed | Detail |
| --- | --- | --- |
| cloudfront-root-new-assets | true | root=200, assets=index-D0_pUF9C.js/index-BOiUIWl9.css |
| health-context-profile | true | profile present |
| health-context-matter-core | true | matter-core present |
| health-context-vault-dms | true | vault-dms present |
| health-context-crm-intake | true | crm-intake present |
| public-synthetic-login-disabled | true | status=403, reason=auth_synthetic_login_disabled |
| public-business-routes-require-session | true | status=401, reason=auth_session_required |
| direct-authenticated-production-probe | true | invoke=200, response=200, status=PASS |
| direct-authenticated-probe-no-secret-material | true | direct probe returned hash/count evidence only |
| direct-authenticated-probe-no-release-claim | true | direct probe preserved non-go-live boundary |
| vault-bridge-disabled-boundary | true | status=403, safe_error_codes=MATTER_VAULT_BRIDGE_BLOCKED |

## Boundary

- CloudFront web, Lambda API, Client CRM, Matter runtime, Vault DMS, and Vault bridge routes were checked.
- Bridge writes are synthetic idempotent Client/Matter upserts only.
- Upload preflight remains permission-check-only and does not write document bytes.
- No public release, owner final approval, real-client-data import, or company-wide go-live is claimed by this smoke.
