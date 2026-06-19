# HRX-P13 Portal API B Plan

Status: In progress
PR lane: PR-09
Depends on: HRX-P12 Portal API A exit gate

## Scope

HRX-P13 completes the first People portal lane with manager approvals, candidate portal status, recruiting pipeline updates, HR policy administration, and audit viewing. Every surface must be API-backed and role-scoped; static acceptance data cannot satisfy the gate.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L6-W01-T06 | `apps/web/src/people/approvals/ManagerApprovalQueue.tsx` | Manager approves/rejects through `/api/hrx/approvals`, and audit evidence remains visible |
| HRX-ENT-L6-W01-T07 | `apps/web/src/candidate/CandidatePortal.tsx` | Candidate-scoped application, status, and document metadata are fetched from `/api/hrx/candidate/portal` |
| HRX-ENT-L6-W01-T08 | `apps/web/src/people/recruiting/RecruitingPipeline.tsx` | HR updates application stages through `/api/hrx/recruiting/applications/:id/stage` |
| HRX-ENT-L6-W01-T09 | `apps/web/src/admin/hrx/HRXPolicyConsole.tsx` | Admin reads and creates leave, approval, and retention policy versions through `/api/hrx/policies` |
| HRX-ENT-L6-W01-T10 | `apps/web/src/admin/hrx/HRXAuditViewer.tsx` | HR auditor views tenant-scoped audit events through `/api/hrx/audit` only |

## Non-Goals

- No HR AI assistant, analytics dashboard, or AI review queue; those begin in HRX-P14/P15.
- No standalone candidate identity account provisioning.
- No real external ATS, DMS, IAM, or payroll connector.
- No static fallback data in UI components.

## Verification

Focused:

- `npm run web:e2e -- manager-approval`
- `npm run web:e2e -- candidate-portal`
- `npm run web:e2e -- recruiting-pipeline`
- `npm run web:e2e -- hrx-policy-console`
- `npm run web:e2e -- hrx-audit-viewer`
- `node --test apps/api/test/hrx-runtime-api.test.js`

Broad:

- `npm run web:e2e`
- `npm --workspace apps/web run test:ui`
- `npm --workspace apps/web run build`
- `npm --workspace apps/api run test`
- `npm run hrx:runtime:validate`
- `npm run rp30:hrx:validate`
- `npm run validate`
