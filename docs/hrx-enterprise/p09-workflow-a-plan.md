# HRX-P09 Workflow A Plan

Status: In progress
PR lane: PR-06
Depends on: HRX-P08 Core HRIS B exit gate

## Scope

HRX-P09 turns the first HR operations workflows into runtime-backed domain modules while keeping portal UI and production readiness gates out of scope. The pack covers leave policy, leave balance, leave request approval, attendance source traceability, and overtime approval/export gating.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L5-W01-T01 | `packages/hrx/src/rules/leave-policy.js` | Versioned accrual, carryover, and negative-balance rules pass unit tests |
| HRX-ENT-L5-W01-T02 | `packages/hrx/src/leave/balance.js` | Earned, used, and available leave balances compute from auditable ledger entries |
| HRX-ENT-L5-W01-T03 | `packages/hrx/src/leave/request-service.js`; `apps/api/src/routes/hrx/leave.js` | Submit, approve, reject, and cancel transitions are audited |
| HRX-ENT-L5-W01-T04 | `packages/hrx/src/attendance.js` | Manual and imported attendance records require source traceability |
| HRX-ENT-L5-W01-T05 | `packages/hrx/src/overtime.js` | Overtime export is blocked until an approval state exists |

## Non-Goals

- No People portal UI or web e2e receipt; those remain HRX-P12 scope.
- No payroll calculation runtime or disbursement logic.
- No final production readiness claim; runtime validator must still fail until UI and e2e receipts exist.
- No standalone HR SaaS boundary expansion.

## Implementation Order

1. Add leave policy rules and negative-balance guard.
2. Add leave balance ledger and balance computation.
3. Add leave request service and API route with audit events.
4. Add attendance record/import source traceability.
5. Add overtime approval-before-export guard.
6. Export P09 modules from `packages/hrx/src/index.js`.

## Verification

Focused:

- `node --test packages/hrx/test/leave-policy.test.js`
- `node --test packages/hrx/test/leave-balance.test.js`
- `node --test apps/api/test/hrx/leave.test.js`
- `node --test packages/hrx/test/attendance.test.js`
- `node --test packages/hrx/test/overtime.test.js`

Broad:

- `node --test packages/hrx/test/*.test.js`
- `npm --workspace apps/api run test`
- `npm run hrx:runtime:validate:expect-not-ready`
- `npm run rp30:hrx:validate`
- `npm run validate`
