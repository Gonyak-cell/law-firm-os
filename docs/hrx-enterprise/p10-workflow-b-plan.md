# HRX-P10 Workflow B Plan

Status: In progress
PR lane: PR-07
Depends on: HRX-P09 Workflow A exit gate

## Scope

HRX-P10 adds recruiting workflow runtime modules for job openings, candidates, applications, interviews, and offers. The pack preserves the HRX candidate privacy boundary: a Candidate is not a CRM Party, and CRM party scopes cannot satisfy candidate access.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L5-W01-T06 | `packages/hrx/src/recruiting/job-opening.js` | Job opening approve, open, and close transitions are validated |
| HRX-ENT-L5-W01-T07 | `packages/hrx/src/recruiting/candidate.js` | Candidate profile rejects CRM Party identifiers and carries retention scope |
| HRX-ENT-L5-W01-T08 | `packages/hrx/src/recruiting/application.js` | Application pipeline stage transitions are explicit and fail closed |
| HRX-ENT-L5-W01-T09 | `packages/hrx/src/recruiting/interview.js` | Scheduling and feedback require source refs and restrict raw feedback storage |
| HRX-ENT-L5-W01-T10 | `packages/hrx/src/recruiting/offer.js` | Offer approval is required before sent/accepted states and compensation refs are restricted |

## Non-Goals

- No candidate portal UI; that remains HRX-P13 scope.
- No CRM Party merge or customer/person master-data reuse.
- No raw compensation amount, resume body, or interview feedback body storage.
- No background check, onboarding, or offboarding workflows; those start in HRX-P11.

## Verification

Focused:

- `node --test packages/hrx/test/job-opening.test.js`
- `node --test packages/hrx/test/candidate.test.js`
- `node --test packages/hrx/test/application.test.js`
- `node --test packages/hrx/test/interview.test.js`
- `node --test packages/hrx/test/offer.test.js`

Broad:

- `node --test packages/hrx/test/*.test.js`
- `npm run hrx:runtime:validate:expect-not-ready`
- `npm run rp30:hrx:validate`
- `npm run validate`
