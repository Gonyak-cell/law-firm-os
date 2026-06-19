# G3-B CRM Service UI Closeout Report

Status: Proposed
Gate: `G3 Intake-to-Matter Gate`
Slice: `G3-B`
Branch: `codex/lawos-g3-crm-service-ui-closeout`
TUWs: `LFOS-G3-W03-T007` through `LFOS-G3-W03-T012`

## Scope

G3-B adds descriptor-only CRM service, UI, command, and partial closeout evidence
after the G3-A schema layer. It proves that Opportunity pipeline transitions,
confidential activity trimming, CRM summary UI state, Opportunity-to-Intake
commands, and KeyClientPlan masking can be described without opening runtime writes,
executing API handlers, rendering UI, appending audit events, or creating a Matter.

This slice does not claim G3 runtime readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/crm/src/client-matter-g3.js` | Adds G3-B CRM pipeline, confidential activity trim, summary UI, Opportunity-to-Intake command, KeyClientPlan UI, and partial closeout descriptors. |
| `packages/crm/src/index.js` | Exports the G3-B descriptor layer from the CRM package public entrypoint. |
| `packages/crm/test/client-matter-g3-service-ui.test.js` | Tests stage transitions, confidential activity denial, no conflict memo/billing detail leak, Matter creation blocking, AR/detail masking, and partial closeout evidence. |
| `scripts/validate-client-matter-os-g3-b.mjs` | Validates TUW coverage, report boundary, exported helpers, descriptor behavior, no-write/no-runtime boundaries, and open G3 readiness. |
| `docs/reorganization/client-matter-os/30-g3-b-crm-service-ui-closeout-report.md` | Records G3-B as the second CRM implementation slice after G3-A. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G3-W03-T007` | `createCrmOpportunityPipelineDescriptor()` models `/crm/opportunities` stage transition descriptors and blocks invalid transitions. | Proposed |
| `LFOS-G3-W03-T008` | `createCrmActivityPermissionTrimDescriptor()` hides confidential CRMActivity content for denied actors. | Proposed |
| `LFOS-G3-W03-T009` | `createCrmSummaryUiStateDescriptor()` exposes safe client/opportunity summary state without conflict memo or billing detail fields. | Proposed |
| `LFOS-G3-W03-T010` | `createCrmOpportunityToIntakeCommandDescriptor()` allows Opportunity-to-Intake evidence while blocking Matter creation. | Proposed |
| `LFOS-G3-W03-T011` | `createCrmKeyClientPlanUiStateDescriptor()` masks AR, invoice, billing, and collection details in KeyClientPlan state. | Proposed |
| `LFOS-G3-W03-T012` | `createCrmG3PartialCloseoutDescriptor()` records CRM G3 partial closeout evidence, draft PR state, G1/G2 evidence disposition, and human review disposition. | Proposed |

## Validation

Expected validation commands:

```sh
npm run client-matter:g3b:validate
npm run client-matter:g3a:validate
npm run client-matter:g3:plan:validate
npm run rp09:crm-core:validate
npm --workspace @law-firm-os/crm run test
npm run validate
```

## Boundary

G3 remains open. G3-B proves CRM service, UI-state, command, and partial closeout
descriptor evidence only. It does not execute API handlers, mutate Opportunity
state, render UI, expose conflict memo or billing detail, evaluate live
permissions, append audit events, create IntakeRequest runtime rows, create
Matter records, close G3 runtime readiness, or merge the draft PR stack.
