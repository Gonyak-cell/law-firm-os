# G2-A Party Schema Report

Status: Proposed
Gate: `G2 Master Data Gate`
Slice: `G2-A`
Branch: `codex/lawos-g2-party-schema`
TUWs: `LFOS-G2-W02-T001` through `LFOS-G2-W02-T005`

## Scope

G2-A adds the Party, Person, Organization, PartyAlias, and PartyIdentifier
schema evidence needed to start the Party & Relationship Master runtime lane.
The slice keeps all records tenant-scoped, frozen, descriptor-only, and
pre-Matter-safe while exposing tenant-scoped identity keys for later duplicate,
relationship, and merge workflows.

This slice does not claim G2 runtime write readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/master-data/src/registry.js` | Adds Party, PartyAlias, and PartyIdentifier model definitions, allowed types, owner boundaries, and model scope. |
| `packages/master-data/src/model.js` | Adds Party, PartyAlias, and PartyIdentifier factories and bridges Person/Organization records through optional `party_id`. |
| `packages/master-data/src/validators.js` | Validates Party type, alias type, identifier type, and duplicate alias/identifier review claims. |
| `packages/master-data/test/model.test.js` | Adds G2-A tests for party/person/org bridge records, Korean and English aliases, business number, LEI, and registration identifiers. |
| `contracts/master-data-contract.json` | Updates live Master Data contract scope and model count for the G2-A schema models. |
| `scripts/validate-client-matter-os-g2-a.mjs` | Validates TUW coverage, report boundary, exported factories, contract scope, tenant identity keys, duplicate review claims, and open G2 readiness. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G2-W02-T001` | `createMasterDataParty()` creates tenant-scoped canonical Party records with `party_type`, display name, canonical entity bridge, and deterministic identity key. | Proposed |
| `LFOS-G2-W02-T002` | `createMasterDataPerson()` preserves the Person schema and can bind to a canonical `party_id` without making `party_id` mandatory for legacy descriptors. | Proposed |
| `LFOS-G2-W02-T003` | `createMasterDataOrganization()` preserves the Organization schema and can bind to a canonical `party_id`, registration number, and tenant identity key. | Proposed |
| `LFOS-G2-W02-T004` | `createMasterDataPartyAlias()` creates Korean, English, and former-name alias records with tenant-scoped alias search keys and duplicate review claims. | Proposed |
| `LFOS-G2-W02-T005` | `createMasterDataPartyIdentifier()` creates business number, LEI, and registration ID records with tenant-scoped identifier keys and duplicate review claims. | Proposed |

## Validation

Expected validation commands:

```sh
npm run client-matter:g2a:validate
npm run client-matter:g2:plan:validate
npm run rp04:master-data:validate
npm --workspace @law-firm-os/master-data run test
npm run validate
```

## Boundary

G2 remains open. G2-A proves schema and test evidence for the first Party Master
slice only. It does not open database writes, API handlers, CRM/Matter/Billing
references, duplicate merge execution, relationship search, UI state rendering,
or G2 closeout readiness.
