# HRX Production Readiness Evidence Pack

Status: PR-15 evidence index
Date: 2026-06-20

This pack indexes engineering evidence for owner review. It does not authorize go-live, R4, production-ready, or enterprise-ready claims.

| Evidence area | Artifact | Current evidence state |
| --- | --- | --- |
| Release contract | `contracts/hrx-release-readiness.json` | Gates listed; claim policy remains false pending owner sign-off |
| Runtime and persistence | `npm run hrx:runtime:validate`; `npm run hrx:persistence:validate` | Passing locally |
| Authz and security | `npm run hrx:authz:validate`; `npm run hrx:security:validate`; `npm --workspace apps/api run test` | Passing locally |
| Enterprise controls | `npm run hrx:enterprise:validate` | Passing locally with P0 enterprise gates required |
| Backup/restore | `node scripts/hrx-backup-restore-smoke.mjs --dry-run`; `docs/hrx-enterprise/dr-runbook.md` | Count and audit hash-chain smoke passing |
| UAT | `docs/hrx-enterprise/uat-scenarios.md`; `docs/hrx-enterprise/uat-results.md`; `npm run web:e2e` | 14 synthetic e2e scenarios passing |
| Compliance | `packages/hrx/src/compliance-report.js`; `packages/hrx/test/compliance-report.test.js` | Access/change/retention/export report covered |
| Launch blockers | `scripts/validate-hrx-launch-blockers.mjs` | Open P0 fails; feature flags must remain default disabled |

## Owner Boundary

Local validator pass is necessary evidence, but it is not sufficient release authority. The owner must provide an explicit signed receipt before any go-live, R4, production-ready, or enterprise-ready claim.
