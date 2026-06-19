# G2-D UI Closeout Report

Status: Proposed
Gate: `G2 Master Data Gate`
Slice: `G2-D`
Branch: `codex/lawos-g2-ui-closeout`
TUWs: `LFOS-G2-W02-T013` through `LFOS-G2-W02-T014`

## Scope

G2-D adds descriptor-only evidence for denied and review-required Party
search/profile states plus the G2 closeout handoff record. It keeps Party
Master UI behavior safe for review without rendering UI, executing API handlers,
evaluating runtime permissions, appending audit events, or writing product
state.

This slice does not claim G2 runtime write readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/master-data/src/service.js` | Adds Party search UI state, Party profile UI state, and G2 closeout descriptors. |
| `packages/master-data/test/model.test.js` | Tests denied and review-required Party search/profile states, hidden-field protection, closeout references, PR state, and open readiness. |
| `packages/master-data/src/registry.js` | Adds G2-D risk vocabulary for denied search leakage, hidden profile fields, and closeout evidence gaps. |
| `contracts/master-data-contract.json` | Updates live Master Data contract risks and exported symbol list for G2-D descriptors. |
| `scripts/validate-client-matter-os-g2-d.mjs` | Validates TUW coverage, report boundary, exported helpers, contract risks, safe UI states, closeout evidence, and open G2 readiness. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G2-W02-T013` | `createMasterDataPartySearchUiStateDescriptor()` and `createMasterDataPartyProfileUiStateDescriptor()` model denied and review-required Party search/profile states without exposing unauthorized counts, hidden fields, permission rules, or audit payloads. | Proposed |
| `LFOS-G2-W02-T014` | `createMasterDataG2CloseoutDescriptor()` records CRM, Matter, and Billing reference evidence, command evidence, PR state, G1 evidence disposition, and human review disposition while keeping runtime write readiness open. | Proposed |

## Reference Evidence

| Module | Reference evidence |
| --- | --- |
| CRM | G3 CRM/Intake must consume Party Master identity (`Party.party_id`) before lead-to-matter conversion. |
| Matter | G4 Matter/DMS runtime must reference Party Master identity instead of minting duplicate client or contact identity. |
| Billing | G5 Billing/Finance must treat `BillingProfile` canonical identity as Party Master owned while Billing owns downstream workflow state. |

## Validation

Expected validation commands:

```sh
npm run client-matter:g2d:validate
npm run client-matter:g2c:validate
npm run client-matter:g2b:validate
npm run client-matter:g2a:validate
npm run client-matter:g2:plan:validate
npm run rp04:master-data:validate
npm --workspace @law-firm-os/master-data run test
npm run validate
```

## Handoff State

`createMasterDataG2CloseoutDescriptor()` records command output, draft PR state,
G1 evidence disposition, and human review disposition as evidence fields. Until
the stacked G1/G2 PRs receive human review acceptance, the descriptor outcome is
`review_required` and `g2_runtime_write_readiness_claim` remains `open`.

## Boundary

G2 remains open. G2-D proves UI-state and closeout descriptor evidence only. It
does not render UI, expose unauthorized Party counts, expose hidden profile
fields, execute API handlers, evaluate live permissions, append audit events,
write Party records, close G2 runtime readiness, or merge the draft PR stack.
