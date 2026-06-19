# G3-A CRM Schema Report

Status: Proposed
Gate: `G3 Intake-to-Matter Gate`
Slice: `G3-A`
Branch: `codex/lawos-g3-crm-schema`
TUWs: `LFOS-G3-W03-T001` through `LFOS-G3-W03-T006`

## Scope

G3-A adds synthetic-only CRM schema evidence for Lead, Opportunity,
CRMActivity, Proposal, Referral, and Campaign. The slice binds CRM records to
Party Master references before any Matter can exist, keeps Opportunity conversion
limited to IntakeRequest, and preserves the no-direct-Matter shortcut boundary.
The slice scope is Lead, Opportunity, CRMActivity, Proposal, Referral, and Campaign.
Opportunity conversion limited to IntakeRequest remains the only
allowed conversion target in this slice.

This slice does not claim G3 runtime readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/crm/src/model.js` | Adds G3-A CRM model definitions, factories, direct Matter reference guards, consent checks, and record validation helpers. |
| `packages/crm/src/index.js` | Exports the G3-A model layer from the CRM package public entrypoint. |
| `packages/crm/test/client-matter-g3-schema.test.js` | Covers Party reference, Opportunity no-Matter shortcut, confidential activity, fee-estimate reference, referral Party source, and campaign opt-in/out tests. |
| `scripts/validate-client-matter-os-g3-a.mjs` | Validates TUW coverage, report boundary, source markers, exported helpers, model behavior, and open G3 readiness. |
| `docs/reorganization/client-matter-os/29-g3-a-crm-schema-report.md` | Records this slice as the first implementation step after the G3 entry plan. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G3-W03-T001` | `createCrmCoreLead()` creates tenant-scoped Lead records requiring `party_id`. | Proposed |
| `LFOS-G3-W03-T002` | `createCrmCoreOpportunity()` creates Opportunity records that can point to `intake_request_id` but reject direct Matter references. | Proposed |
| `LFOS-G3-W03-T003` | `createCrmCoreCRMActivity()` records confidential activity flags and permission-trim evidence. | Proposed |
| `LFOS-G3-W03-T004` | `createCrmCoreProposal()` requires `fee_estimate_ref` before a proposal descriptor is valid. | Proposed |
| `LFOS-G3-W03-T005` | `createCrmCoreReferral()` requires source and target Party references. | Proposed |
| `LFOS-G3-W03-T006` | `createCrmCoreCampaign()` requires opt-in or opt-out consent for every contact Party reference. | Proposed |

## Validation

Expected validation commands:

```sh
npm run client-matter:g3a:validate
npm run client-matter:g3:plan:validate
npm run rp09:crm-core:validate
npm --workspace @law-firm-os/crm run test
npm run validate
```

## Boundary

G3 remains open. G3-A proves CRM schema and test evidence only. It does not open
database writes, API handlers, Opportunity pipeline transitions, CRM summary UI,
Opportunity-to-Intake commands, Matter creation, conflict memo visibility,
runtime permission evaluation, audit writes, or G3 closeout readiness.
