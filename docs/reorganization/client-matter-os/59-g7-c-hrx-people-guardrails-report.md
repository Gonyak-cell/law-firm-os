# G7-C HRX People Guardrails Report

TUWs: `LFOS-G7-W13-T001` through `LFOS-G7-W13-T008`

Branch: `codex/lawos-g7-hrx-people-guardrails`

Base: `codex/lawos-g7-ops-commercial-closeout`

This slice does not claim G7 runtime readiness. G7-C adds synthetic-only
descriptor evidence for User/Employee separation spec, Employee schema,
capacity profile, workload read model, HR document guardrail, evaluation access control,
candidate data separation, and HRX closeout. It proves that Employee
does not authorize User sessions, optional User references stay controlled,
capacity utilization uses an explicit denominator, workload views use aggregate
Matter/time evidence, HR documents deny non-HR access, evaluation reads produce
audit-on-read evidence, candidate records do not contaminate CRM/Party data, and
HRX guardrail evidence remains open without claiming enterprise trust,
production readiness, customer launch readiness, or go-live approval.

## Scope

G7-C depends on the G7-B Ops/Commercial closeout handoff and the RP30 HRX People
contract. It covers HRX descriptor evidence while preserving the embedded HRX
boundary: no separate HRX product, no payroll runtime, no HR AI final judgment,
no permission/audit write, no real employee/candidate/client data, and no
runtime receipt.

| File | Purpose |
| --- | --- |
| `packages/hrx/src/client-matter-g7.js` | Adds G7-C descriptor factories for HRX People guardrails and closeout evidence. |
| `packages/hrx/src/index.js` | Exports the G7-C descriptor factories through the HRX package surface. |
| `packages/hrx/test/client-matter-g7-people-guardrails.test.js` | Covers no-conflation, controlled User ref, utilization denominator, workload aggregation, HR ACL, audit-on-read, candidate separation, and overclaim blocking. |
| `scripts/validate-client-matter-os-g7-c.mjs` | Validates the G7-C document, source, tests, package script, G7-B handoff dependency, RP30 contract boundary, and descriptor behavior. |

## TUW Coverage

| TUW | Implementation Evidence | Status |
| --- | --- | --- |
| `LFOS-G7-W13-T001` | `createHrxG7UserEmployeeSeparationDescriptor()` requires no-conflation review for IAM User and HRX Employee identity sources. | Proposed |
| `LFOS-G7-W13-T002` | `createHrxG7EmployeeSchemaDescriptor()` allows only optional controlled User references and blocks Employee session authority. | Proposed |
| `LFOS-G7-W13-T003` | `createHrxG7CapacityProfileDescriptor()` requires utilization denominator evidence without payroll runtime. | Proposed |
| `LFOS-G7-W13-T004` | `createHrxG7WorkloadReadModelDescriptor()` requires aggregate Matter/time evidence and blocks client detail leakage. | Proposed |
| `LFOS-G7-W13-T005` | `createHrxG7HrDocumentGuardrailDescriptor()` requires HR ACL evidence and non-HR denial. | Proposed |
| `LFOS-G7-W13-T006` | `createHrxG7EvaluationAccessDescriptor()` requires authorized reviewer and audit-on-read evidence while blocking score finalization. | Proposed |
| `LFOS-G7-W13-T007` | `createHrxG7CandidateSeparationDescriptor()` blocks CRM/Party contamination for candidate data. | Proposed |
| `LFOS-G7-W13-T008` | `createHrxG7CPeopleGuardrailsCloseoutDescriptor()` summarizes HRX guardrail evidence while keeping runtime readiness and go-live approval open. | Proposed |

## Runtime Boundary

- `writes_product_state: false`
- `creates_database_rows: false`
- `updates_database_rows: false`
- `deletes_database_rows: false`
- `evaluates_runtime_permission: false`
- `writes_permission_decision: false`
- `writes_audit_event: false`
- `appends_audit_event: false`
- `executes_api_handler: false`
- `executes_ui_runtime: false`
- `dispatches_hrx_runtime: false`
- `payroll_calculation_runtime_executed: false`
- `hr_ai_final_judgment_executed: false`
- `real_employee_data_included: false`
- `real_candidate_data_included: false`
- `real_client_data_included: false`
- `g7_runtime_readiness_claim: "open"`
- `production_readiness_claim: "open"`
- `enterprise_trust_claimed: false`
- `go_live_approval_claimed: false`

## Required Evidence

- `npm run client-matter:g7c:validate`
- `node --test packages/hrx/test/*.test.js`
- `npm run client-matter:g7b:validate`
- `npm run client-matter:g7:plan:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`
- `npm test`

## Non-Goals

- No Employee, CapacityProfile, Workload, HRDocument, EvaluationRecord, Candidate, or HRX closeout record is persisted.
- No HRX, payroll, HR AI, permission, audit, API, UI, document, evaluation, candidate, CRM, Party, or production runtime is executed.
- No Employee identity is promoted to User session authority.
- No HR document body, evaluation score, candidate payload, client payload, credential, secret, or production receipt is loaded.
- No separate HRX product, enterprise trust, UAT completion, production readiness, customer launch readiness, or go-live approval is claimed.
- No draft PR is self-merged.
