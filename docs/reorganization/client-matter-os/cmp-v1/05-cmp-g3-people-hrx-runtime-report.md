# CMP-G3 People/HRX Runtime Report

Status: Implemented runtime API evidence; durable production persistence remains open
Date: 2026-06-20

## Scope

This report records the executable CMP v1.0 runtime slice for
`CMP-G3-W03 People/HRX Boundary`. It depends on `CMP-G1-W01` trust foundation
and `CMP-G2-W02` Party Master because People records must stay permission
guarded and must not be conflated with Party, CRM, candidate, or Matter records.

The implementation reuses the repo-native `packages/hrx` contracts and exposes
them through `apps/api` as tenant-scoped `/api/hrx/*` runtime routes backed by
the existing People UI at `apps/web/src/people`. This is not an R4 completion
claim. State is kept in the API process; durable production persistence remains
open.

## TUWs Covered

`CMP-G3-W03-T001`, `CMP-G3-W03-T002`, `CMP-G3-W03-T003`,
`CMP-G3-W03-T004`, `CMP-G3-W03-T005`, `CMP-G3-W03-T006`,
`CMP-G3-W03-T007`, `CMP-G3-W03-T008`, `CMP-G3-W03-T009`,
`CMP-G3-W03-T010`, `CMP-G3-W03-T011`, `CMP-G3-W03-T012`,
`CMP-G3-W03-T013`, `CMP-G3-W03-T014`, `CMP-G3-W03-T015`,
`CMP-G3-W03-T016`, `CMP-G3-W03-T017`, `CMP-G3-W03-T018`,
`CMP-G3-W03-T019`, `CMP-G3-W03-T020`, `CMP-G3-W03-T021`,
`CMP-G3-W03-T022`, `CMP-G3-W03-T023`, `CMP-G3-W03-T024`

## Implemented Files

| File | Runtime role |
| --- | --- |
| `apps/api/src/hrx-runtime-context.js` | CMP-G3 People/HRX API runtime, tenant-scoped HRX state, Employee and EmploymentProfile writes, HR document metadata guardrails, workload, analytics, compensation masking, evaluation access, payroll export preview, candidate separation, and runtime evidence. |
| `apps/api/src/server.js` | Routes `/api/hrx/*` through the API server and exposes the `people-hrx` bounded context in `/api/health`. |
| `apps/api/test/cmp-g3-people-hrx-api.test.js` | In-process API coverage for health descriptor, Employee/User separation, EmploymentProfile linkage, HR document metadata-only storage, aggregate workload/analytics, compensation masking, evaluation audit-on-read, payroll preview boundaries, candidate separation, runtime evidence, and tenant-scoped audit. |
| `apps/web/src/people/hrxApiClient.ts` | People UI API client using the HRX runtime routes. |
| `apps/web/src/people/PeopleHome.tsx` | People UI surface wired to live HRX API-backed panels. |
| `scripts/validate-client-matter-os-cmp-g3-runtime.mjs` | Static validator guarding TUW traceability, route coverage, UI refs, tests, G1/G2 dependency, and no premature R4 claim. |

## Runtime Routes

| Route | Methods | Evidence intent |
| --- | --- | --- |
| `/api/hrx/runtime/evidence` | `GET` | CMP-G3 evidence bundle with dependencies, 24 TUW IDs, guardrail descriptors, People UI ref, and readiness boundary. |
| `/api/hrx/employees` | `GET`, `POST` | Employee list/create without User identity conflation. |
| `/api/hrx/employees/:id` | `GET`, `PATCH` | Employee profile read/update with tenant scope and audit. |
| `/api/hrx/employment-profiles` | `GET`, `POST` | EmploymentProfile rows linked to Employee records only. |
| `/api/hrx/documents` | `GET`, `POST` | HR document metadata references only; document bodies are blocked. |
| `/api/hrx/workload` | `GET` | Aggregate workload projection without row-level Matter details. |
| `/api/hrx/compensation/preview` | `GET` | Masked compensation preview; no unmasked payroll amount exposure. |
| `/api/hrx/evaluations/access` | `POST` | Audit-on-read evaluation access descriptor; final score claims remain blocked. |
| `/api/hrx/payroll/export-preview` | `POST` | Payroll export preview requiring human review; no calculation or disbursement runtime. |
| `/api/hrx/candidate/portal` | `GET` | Candidate-scoped portal metadata separated from CRM Party. |
| `/api/hrx/recruiting/pipeline` | `GET` | Recruiting pipeline metadata and stage state. |
| `/api/hrx/analytics` | `GET` | Tenant aggregate People metrics without row-level sensitive details. |
| `/api/hrx/ai/assistant` | `POST` | HRX advisory AI path using permission-aware source retrieval. |
| `/api/hrx/audit` | `GET` | Tenant-scoped HRX audit export. |

## Guardrails

- `Employee` is not `User`; `user_id` is a reserved field and is blocked on
  employee writes.
- Employment profile records must reference Employee identity, not IAM User or
  Party identity.
- HR documents store metadata and `source_ref` only; document body content is
  blocked from the HRX runtime route.
- Workload and analytics responses expose aggregate People capacity only and do
  not include row-level Matter details.
- Compensation preview uses HRX field masking and does not expose unmasked
  amount or currency without scope.
- Evaluation access requires audit-on-read evidence and blocks final score
  claims in this runtime slice.
- Payroll export is preview-only and explicitly excludes payroll calculation
  and disbursement instructions.
- Candidate portal data remains separated from CRM Party identity.
- The exposed readiness string is
  `runtime_api_evidence_only__durable_persistence_open`; this intentionally
  avoids an R4 claim until durable persistence evidence exists.

## Verification

Required commands:

```bash
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm run client-matter:cmp-g2:validate
npm run client-matter:cmp-g3:validate
npm --workspace apps/api run test
npm test
```
