# HRX-P12 Portal API A Plan

Status: In progress
PR lane: PR-09
Depends on: HRX-P11 Workflow C exit gate

## Scope

HRX-P12 introduces the first People portal surfaces in `apps/web`. These surfaces must be API-backed and must not satisfy runtime readiness with static acceptance data.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L6-W01-T01 | `apps/web/src/people/PeopleHome.tsx` | People navigation loads an API-backed overview state |
| HRX-ENT-L6-W01-T02 | `apps/web/src/people/employees/EmployeeList.tsx` | Employee list fetches `/api/hrx/employees` and has no mock fallback |
| HRX-ENT-L6-W01-T03 | `apps/web/src/people/employees/EmployeeProfile.tsx` | Employee profile renders scoped fields and keeps sensitive compensation references masked by default |
| HRX-ENT-L6-W01-T04 | `apps/web/src/people/documents/HRDocumentWorkspace.tsx` | HR document workspace displays metadata and `source_ref`, never document bodies |
| HRX-ENT-L6-W01-T05 | `apps/web/src/people/leave/LeaveRequestPage.tsx` | Leave request UI submits PTO through `/api/hrx/leave` and refreshes balance/request state |

## Non-Goals

- No candidate portal, recruiting pipeline, policy console, or audit viewer; those are HRX-P13.
- No payroll calculation or HR AI final-decision UI.
- No local static fallback dataset for People readiness.

## Verification

Focused:

- `npm run web:e2e -- people-home`
- `npm run web:e2e -- employee-list`
- `npm run web:e2e -- employee-profile`
- `npm run web:e2e -- hr-documents`
- `npm run web:e2e -- leave-request`

Broad:

- `npm --workspace apps/web run test:ui`
- `npm --workspace apps/web run build`
- `npm run hrx:runtime:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`
