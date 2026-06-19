# Matter-Pack Gap Adjudication (A-6)

Status: planning-only. Implementation Admission: blocked. units_currently_added: 0.

## Five-Axis Conflict Adjudication

| axis | conflict | decision_ref | current_state | adjudication | blocking_target |
| --- | --- | --- | --- | --- | --- |
| 1 | internal-only Plan A vs multi-tenant-capable Plan B | MAT-DEC-01 | decided_2026-06-11_first_tenant | Treat AMIC as first tenant; preserve SaaS-capable core | strategy declaration and portal/M365 deployment wording |
| 2 | User and Employee identity conflation | MAT-DEC-02 | decided_2026-06-11_employee_user_id | Adopt separation and Employee.user_id reverse link | RP11 and HRX |
| 3 | Plan A completion gates imply runtime evidence beyond descriptor production_ready | MAT-DEC-07 | decided_2026-06-11_runtime_gate_layer | Add runtime_ready/RTG layer without changing production_ready | runtime gate layer track |
| 4 | SharePoint/OneDrive source-of-truth vs storage abstraction | MAT-DEC-03 | deferred | Seal storage-dependent M365/Vault rows until future runtime pack | RP06/RP08/RP22/RP23 |
| 5 | Product AI Gateway vs development AIControlRule | none | resolved by terminology map | AIGW rows cannot reuse dev_ai_control; RP17/RP18 own product runtime AI | AIGW family |

## Governance Equivalence Mapping

| Plan A item | Plan B equivalent | equivalence evidence | non-equivalent residual | MAT-REQ feedback |
| --- | --- | --- | --- | --- |
| TUW | weighted implementation subphase / closeout pack | weighted ledger + CP manifest + command evidence | TUW IDs are non-executable boilerplate | MAT-REQ-GOV-901 |
| L0-L13 | RP/P/M/S + CP plan | full-spec microphase ledger and pack plan | no direct L-level namespace import | MAT-REQ-GOV-902 |
| R0-R14 | RP00-RP29 plus RP30 HRX | rp detailed plan catalog and HRX extension | R labels rejected as execution authority | MAT-REQ-GOV-903 |
| VC/CG | validators + contracts + read-only review | npm validators and Claude evidence model | runtime CG semantics require RTG layer | MAT-REQ-GOV-904 |
| Planner/Executor/Verifier/Governor | generator/Codex/Claude+validators/human owner | current closeout protocol | Decision/Learning Ledger residual | MAT-REQ-GOV-909/910 |

## Decision Registry Integrity

Known refs: MAT-DEC-01, MAT-DEC-02, MAT-DEC-03, MAT-DEC-04, MAT-DEC-05, MAT-DEC-06, MAT-DEC-07, MAT-DEC-08, MAT-DEC-09. P0 silent reject count: 0.
