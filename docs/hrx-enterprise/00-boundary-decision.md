# HRX Boundary Decision

Status: accepted
Date: 2026-06-20
TUWs: HRX-L0-001, HRX-L0-002, HRX-L0-003, HRX-L0-004

## Decision

HRX remains an embedded People Operations runtime inside Law Firm OS. The current approved claim boundary is:

`runtime_api_evidence_only__durable_persistence_open`

The target engineering state for this roadmap is:

`runtime_write_ready__durable_persistence_guarded`

The target state is not the current state. It becomes claimable only after the 127 TUWs in the HRX Enterprise Roadmap Dev Package are implemented, validated, and traced through PR-00 to PR-15.

## Accepted Direction

- Preserve HRX as part of Law Firm OS.
- Treat the newly imported roadmap package as the canonical execution backlog for this HRX tranche.
- Move from API evidence toward durable DB-backed runtime with tenant, actor, permission, audit, step-up, and e2e gates.
- Keep Employee separate from IAM User; any relationship must be a controlled `EmployeeUserLink`.
- Treat audit as a product surface and compliance control, not only backend storage.
- Require permission decision plus audit evidence for sensitive HR read/write.

## Source-Of-Truth Hierarchy

| Source | Authority | Use |
| --- | --- | --- |
| Git repository implementation and tests | Current runtime truth | Determines what is actually implemented |
| `docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv` | Roadmap backlog truth | Defines the 127 TUWs to close |
| `docs/hrx-enterprise/roadmap-package/05_ACCEPTANCE_GATES.md` | Roadmap gate truth | Defines global P0 gates |
| External Drive or meeting documents | Planning reference | Must be reconciled into repo before it can affect implementation |

If sources conflict, current repo evidence wins for implementation status, and the roadmap package wins for intended backlog scope until an owner decision supersedes it.

## Non Goals

This boundary explicitly blocks:

- Production HRIS readiness claims from API evidence alone.
- R4, go-live, or enterprise-ready claims before L8 owner sign-off.
- Payroll calculation or disbursement runtime.
- Raw HR document body storage in HRX DB/API.
- AI final decisions for hiring, firing, pay, evaluation, discipline, or termination.
- Sensitive HR mutation without trusted tenant/actor context, permission decision, audit receipt, and step-up when required.

## Evidence Rule

Descriptor-only, synthetic fixture, local unit-only, static UI, in-memory-only, no permission write, and no durable audit evidence cannot close runtime readiness. These forms of evidence remain useful planning or guardrail evidence, but they do not prove `runtime_write_ready__durable_persistence_guarded`.

## PR-00 Exit Dependency

PR-01 may proceed only after this boundary remains intact in:

- `docs/hrx-enterprise/01-terminology.md`
- `docs/hrx-enterprise/03-release-gates.md`
- `docs/hrx-enterprise/tuw-traceability-matrix.md`
- `scripts/validate-hrx-no-premature-claim.mjs`
