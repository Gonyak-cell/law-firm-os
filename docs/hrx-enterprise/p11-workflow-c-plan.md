# HRX-P11 Workflow C Plan

Status: In progress
PR lane: PR-08
Depends on: HRX-P10 Workflow B exit gate

## Scope

HRX-P11 adds operational workflow modules for onboarding, offboarding, HR risk intake, legal-risk handling, and generic approval routing. It is the final workflow pack before UI/API portal work starts in HRX-P12.

## TUW Mapping

| TUW | Artifact | Exit Evidence |
| --- | --- | --- |
| HRX-ENT-L5-W01-T11 | `packages/hrx/src/onboarding.js` | Tasks, document refs, and access requests are tracked without document body storage |
| HRX-ENT-L5-W01-T12 | `packages/hrx/src/offboarding.js` | Close is blocked until access revokes, document returns, and legal hold checks are clear |
| HRX-ENT-L5-W01-T13 | `packages/hrx/src/risk-event.js` | HR risk event category, severity, and optional Matter reference are validated |
| HRX-ENT-L5-W01-T14 | `packages/hrx/src/legal-risk.js`; `packages/matter/src/hr-risk-link.js` | Privilege flags and Matter links require audit refs and omit client detail |
| HRX-ENT-L5-W01-T15 | `packages/hrx/src/approval.js` | Approval requests route to manager, HR, or legal approver policies |

## Non-Goals

- No UI for manager queues or audit viewer.
- No external IAM deprovisioning connector.
- No Matter case creation side effect; HR risk links reference existing Matter ids only.
- No privileged content body storage.

## Verification

Focused:

- `node --test packages/hrx/test/onboarding.test.js`
- `node --test packages/hrx/test/offboarding.test.js`
- `node --test packages/hrx/test/risk-event.test.js`
- `node --test packages/hrx/test/legal-risk.test.js`
- `node --test packages/hrx/test/approval.test.js`
- `node --test packages/matter/test/hr-risk-link.test.js`

Broad:

- `node --test packages/hrx/test/*.test.js`
- `node --test packages/matter/test/*.test.js`
- `npm run hrx:runtime:validate:expect-not-ready`
- `npm run rp30:hrx:validate`
- `npm run validate`
