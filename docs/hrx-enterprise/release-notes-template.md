# HRX Release Notes Template

Status: PR-15 template
Date: 2026-06-20

These release notes are a template for owner review. They are not go-live authorization and do not claim production-ready, R4, or enterprise-ready status.

## Scope

- Embedded HRX People runtime inside Law Firm OS.
- Durable HRX store, route authz, audit, step-up, AI advisory guardrails, enterprise controls, DR smoke, and synthetic UAT evidence.

## Known Limitations

- HRX feature flags default disabled until explicit owner approval.
- Payroll execution remains disabled; payroll surfaces are preview/export review only.
- AI is advisory and source-grounded; final hire, fire, pay, evaluation, discipline, or termination decisions remain blocked.
- Local synthetic tests do not replace production deployment receipts or owner sign-off.
- Go-live, R4, production-ready, and enterprise-ready claims remain blocked until owner sign-off.

## Evidence Links

- Release contract: `contracts/hrx-release-readiness.json`
- Production evidence pack: `docs/hrx-enterprise/production-readiness-evidence.md`
- UAT results: `docs/hrx-enterprise/uat-results.md`
- DR runbook: `docs/hrx-enterprise/dr-runbook.md`
- Go/no-go checklist: `docs/hrx-enterprise/go-live-checklist.md`
