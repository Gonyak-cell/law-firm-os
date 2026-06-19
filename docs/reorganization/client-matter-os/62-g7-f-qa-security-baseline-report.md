# G7-F QA Security Baseline Report

TUWs: `LFOS-G7-W15-T001` through `LFOS-G7-W15-T006`

Branch: `codex/lawos-g7-qa-security-baseline`

Base: `codex/lawos-g7-migration-cutover-closeout`

This slice does not claim G7 runtime readiness. G7-F adds synthetic-only
descriptor evidence for test strategy, unit test baseline, integration test
baseline, permission negative tests, audit completeness tests, and idempotency
tests. It proves that QA/security baseline evidence has PM/QA review markers,
coverage threshold references, key workflow pass evidence, unauthorized-access
blocking evidence, every-write audit event mapping, and duplicate-command
safety requirements while keeping security approval and go-live approval open.

## Scope

G7-F depends on the G7-E Migration Cutover Closeout handoff and the RP26
Enterprise SaaS descriptor-only contract. It opens the W15 QA/Security/Release
Engineering evidence lane without executing live test suites, opening security
scanner runtime, persisting idempotency keys, reading customer payloads, or
claiming UAT, security approval, enterprise trust, production readiness, or
go-live approval.

The validator explicitly checks `integration test baseline` and
`idempotency tests` evidence phrases before accepting this report.

| File | Purpose |
| --- | --- |
| `packages/enterprise/src/client-matter-g7.js` | Adds G7-F descriptor factories for test strategy, unit/integration baseline, permission negative, audit completeness, idempotency, and QA/security baseline closeout evidence. |
| `packages/enterprise/src/index.js` | Exports the G7-F descriptor factories through the enterprise package surface. |
| `packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js` | Covers PM/QA review markers, coverage threshold evidence, key workflow evidence, unauthorized blocking, every-write audit mapping, idempotency, and overclaim blocking. |
| `scripts/validate-client-matter-os-g7-f.mjs` | Validates the G7-F document, source, tests, package script, G7-E handoff dependency, RP26 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G7-W15-T001` | `createEnterpriseG7TestStrategyDescriptor()` requires strategy doc, PM/QA review marker, risk matrix, and workflow coverage matrix while blocking final approval claims. | Proposed |
| `LFOS-G7-W15-T002` | `createEnterpriseG7UnitBaselineDescriptor()` requires unit suite inventory, coverage threshold review, and failure budget evidence while blocking local coverage pass overclaims. | Proposed |
| `LFOS-G7-W15-T003` | `createEnterpriseG7IntegrationBaselineDescriptor()` requires key workflow pass evidence and isolated environment evidence while blocking external-provider runtime. | Proposed |
| `LFOS-G7-W15-T004` | `createEnterpriseG7PermissionNegativeDescriptor()` requires unauthorized access blocked and deny-over-allow evidence while blocking permission bypass claims. | Proposed |
| `LFOS-G7-W15-T005` | `createEnterpriseG7AuditCompletenessDescriptor()` requires every write mapped to an audit event and audit schema review while blocking unaudited writes. | Proposed |
| `LFOS-G7-W15-T006` | `createEnterpriseG7IdempotencyBaselineDescriptor()` requires duplicate-command safety and replay protection while blocking duplicate side effects and idempotency-key persistence. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `executes_live_test_suite: false`
- `executes_security_scanner_runtime: false`
- `executes_permission_runtime: false`
- `executes_audit_runtime: false`
- `persists_idempotency_key: false`
- `calls_external_provider_api: false`
- `reads_customer_payload: false`
- `includes_customer_data_payload: false`
- `includes_secret_value: false`
- `includes_security_finding_payload: false`
- `emits_runtime_audit_event: false`
- `claims_coverage_threshold_met: false`
- `claims_pm_qa_final_approval: false`
- `claims_security_approval: false`
- `claims_uat_completion: false`
- `g7_runtime_readiness_claim: "open"`
- `production_readiness_claim: "open"`
- `enterprise_trust_claimed: false`
- `go_live_approval_claimed: false`

## Required Evidence

- `npm run client-matter:g7f:validate`
- `node --test packages/enterprise/test/client-matter-g7-qa-security-baseline.test.js`
- `node --test packages/enterprise/test/*.test.js`
- `npm run client-matter:g7e:validate`
- `npm run client-matter:g7:plan:validate`
- `npm run rp26:enterprise-saas:validate`
- `npm run validate`
- `npm test`

## Non-Goals

- No live test runner, security scanner, permission runtime, audit runtime, API handler, UI runtime, customer environment, or production runtime is executed.
- No customer payload, security finding payload, secret value, idempotency key, runtime audit event, production receipt, or live security approval receipt is loaded.
- No PM/QA final approval, security approval, UAT completion, enterprise trust, runtime readiness, production readiness, customer launch readiness, or go-live approval is claimed.
- No draft PR is self-merged.
