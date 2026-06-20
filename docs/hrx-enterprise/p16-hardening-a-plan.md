# HRX-P16 Hardening A Plan

Status: In progress
PR lane: PR-11
Depends on: HRX-P15 AI Analytics B exit gate

## Scope

HRX-P16 adds the first enterprise hardening layer around the embedded People runtime: SSO subject mapping, MFA step-up checks, SCIM provisioning boundaries, tenant isolation regression tests, and sanitized observability metrics.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L8-W01-T01 | `packages/authz/src/sso-subject-map.js` | External IAM subjects map to IAM User identifiers only, never Employee identifiers |
| HRX-ENT-L8-W01-T02 | `apps/api/src/middleware/hrx-step-up.js` | Compensation, evaluation, payroll, audit, and final AI actions require bounded MFA step-up token |
| HRX-ENT-L8-W01-T03 | `packages/hrx/src/scim-boundary.js` | SCIM provisions User records only; Employee creation remains an HRX workflow |
| HRX-ENT-L8-W01-T04 | `apps/api/test/hrx/tenant-isolation.test.js` | Cross-tenant employee, document, candidate, analytics, and AI requests fail closed |
| HRX-ENT-L8-W01-T05 | `packages/hrx/src/observability.js`; `apps/api/src/middleware/metrics.js` | Route/service/audit latency and error metrics are emitted without sensitive payload fields |

## Non-Goals

- No production SSO provider integration.
- No real MFA challenge delivery.
- No SCIM write-through to HR Employee/Profile tables.
- No external metrics backend or distributed tracing collector.
- No enterprise readiness pass claim; P17 owns the final enterprise validator.

## Verification

Focused:

- `node --test packages/authz/test/sso-subject-map.test.js`
- `node --test apps/api/test/hrx-step-up.test.js`
- `node --test packages/hrx/test/scim-boundary.test.js`
- `node --test apps/api/test/hrx/tenant-isolation.test.js`
- `node --test apps/api/test/hrx-observability.test.js`

Broad:

- `npm --workspace apps/api run test`
- `node --test packages/authz/test/*.test.js`
- `node --test packages/hrx/test/*.test.js`
- `npm run hrx:runtime:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`
