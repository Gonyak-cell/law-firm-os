# HRX UAT Results

Status: PR-14 executed synthetic UAT evidence
Date: 2026-06-20

These results record local synthetic UAT execution against the embedded HRX runtime. They do not authorize go-live, R4, production-ready, or enterprise-ready claims.

| Scenario | Evidence command | Result | Notes |
| --- | --- | --- | --- |
| Employee overview | `npm run web:e2e -- people-home employee-list` | Pass | API-backed People home and employee list routes exercised by HRX web e2e pack |
| Leave request | `npm run web:e2e -- leave-request` | Pass | Leave request workflow uses `/api/hrx/leave` |
| HR document metadata | `npm run web:e2e -- hr-documents` | Pass | Metadata only; no document body rendered |
| Candidate status | `npm run web:e2e -- candidate-portal` | Pass | Candidate portal uses HRX candidate API, not CRM Party scope |
| Audit visibility | `npm run web:e2e -- hrx-audit-viewer` | Pass | Audit view requires scoped HRX API path |
| Analytics and AI review | `npm run web:e2e -- hrx-analytics hrx-ai-assistant` | Pass | Aggregate analytics and source-grounded AI surfaces exercised |
| Backup/restore | `node scripts/hrx-backup-restore-smoke.mjs --dry-run` | Pass | Count and audit hash-chain smoke validates restored store |
| API security smoke | `node --test apps/api/test/hrx/security-regression.test.js apps/api/test/hrx/secret-exposure.test.js` | Pass | Authz, step-up, fail-closed, and secret exposure checks passed |
| API performance smoke | `node --test apps/api/test/hrx/performance-smoke.test.js` | Pass | Local p95 baseline below 500 ms |

## No-Go Findings

- No cross-tenant API exposure observed in synthetic tests.
- No raw HR document body, prompt, answer, salary, payroll secret, or API key value observed in tested API responses.
- No AI final hire, fire, pay, or evaluation decision is authorized by this UAT result.
