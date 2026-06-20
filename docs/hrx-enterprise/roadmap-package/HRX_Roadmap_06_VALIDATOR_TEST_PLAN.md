# HRX Validator and Test Plan

| Script | Command | Purpose |
|---|---|---|
| hrx:persistence:validate | node scripts/validate-hrx-persistence.mjs | DB-backed repository and migrations required |
| hrx:authz:validate | node scripts/validate-hrx-route-authz.mjs | Every /api/hrx route has policy map and middleware |
| hrx:step-up:validate | node scripts/validate-hrx-step-up.mjs | Sensitive routes require fresh step-up |
| hrx:audit:validate | node scripts/validate-hrx-durable-audit.mjs | Durable hash-chain audit append |
| hrx:context:validate | node scripts/validate-hrx-context-hardening.mjs | No query tenant/actor fallback; no client hardcoded allow |
| hrx:core:validate | node scripts/validate-hrx-core-domain.mjs | Core HRIS schema/repository/route coverage |
| hrx:workflows:validate | node scripts/validate-hrx-workflows.mjs | Leave/recruiting/lifecycle/payroll workflows |
| hrx:ai:validate | node scripts/validate-hrx-ai-analytics.mjs | Source-grounded HR AI and analytics privacy |
| hrx:enterprise:validate | node scripts/validate-hrx-enterprise-readiness.mjs | All P0 enterprise gates required |
| hrx:release:validate | node scripts/validate-hrx-release-readiness.mjs | No go-live/R4 without owner decision |

## Required commands by PR

- PR-01/02: `npm run hrx:persistence:validate`, `npm test`
- PR-03: `npm run hrx:authz:validate`, `npm run hrx:security:validate`
- PR-04: `npm run hrx:step-up:validate`
- PR-05: `npm run hrx:context:validate`, `npm --workspace apps/web run test:ui`
- PR-10/11: `npm run web:e2e`
- PR-13/14/15: `npm run hrx:enterprise:validate`, `npm run hrx:release:validate`
