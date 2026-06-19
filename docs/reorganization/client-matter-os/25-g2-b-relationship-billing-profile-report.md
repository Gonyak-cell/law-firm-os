# G2-B Relationship and Billing Profile Report

Status: Proposed
Gate: `G2 Master Data Gate`
Slice: `G2-B`
Branch: `codex/lawos-g2-relationship-billing-profile`
TUWs: `LFOS-G2-W02-T006` through `LFOS-G2-W02-T009`

## Scope

G2-B extends the Party Master schema evidence from G2-A into relationship and
billing-profile references. The slice keeps ClientGroup, Relationship,
ContactPoint, and BillingProfile descriptor-only while adding Party-level
membership, Party endpoint, primary/verified contact, and legal-client versus
billing-client references.

This slice does not claim G2 runtime write readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/master-data/src/registry.js` | Adds G2-B optional fields and contact point types for ClientGroup, Relationship, ContactPoint, and BillingProfile. |
| `packages/master-data/src/model.js` | Adds frozen Party membership, Party relationship endpoint, primary/verified contact, and legal/billing client fields. |
| `packages/master-data/src/validators.js` | Validates group primary-party membership, relationship Party endpoint direction, ContactPoint type, and BillingProfile legal/billing references. |
| `packages/master-data/test/model.test.js` | Adds G2-B tests for group membership, direction validation, primary verified contact, and legal-client versus billing-client references. |
| `contracts/master-data-contract.json` | Updates live Master Data contract risk vocabulary and exported symbol list for G2-B schema controls. |
| `scripts/validate-client-matter-os-g2-b.mjs` | Validates TUW coverage, report boundary, source markers, contract risks, model behavior, and open G2 readiness. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G2-W02-T006` | `createMasterDataClientGroup()` stores Party membership and requires the `primary_party_id` to exist in `member_party_ids`. | Proposed |
| `LFOS-G2-W02-T007` | `createMasterDataRelationship()` stores Party endpoints and validates endpoint Party types against relationship direction. | Proposed |
| `LFOS-G2-W02-T008` | `createMasterDataContactPoint()` stores `owner_party_id`, `is_primary`, `verified`, and verification status for primary verified contact evidence. | Proposed |
| `LFOS-G2-W02-T009` | `createMasterDataBillingProfile()` stores separate `legal_client_party_id` and `billing_client_party_id` plus billing contact reference. | Proposed |

## Validation

Expected validation commands:

```sh
npm run client-matter:g2b:validate
npm run client-matter:g2a:validate
npm run client-matter:g2:plan:validate
npm run rp04:master-data:validate
npm --workspace @law-firm-os/master-data run test
npm run validate
```

## Boundary

G2 remains open. G2-B proves relationship and billing-profile reference schema
evidence only. It does not open duplicate search, relationship search APIs,
merge/split workflows, UI rendering, database writes, Billing workflow state,
or G2 closeout readiness.
