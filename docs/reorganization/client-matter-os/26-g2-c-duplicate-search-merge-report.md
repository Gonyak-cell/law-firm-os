# G2-C Duplicate Search and Merge Report

Status: Proposed
Gate: `G2 Master Data Gate`
Slice: `G2-C`
Branch: `codex/lawos-g2-duplicate-search-merge`
TUWs: `LFOS-G2-W02-T010` through `LFOS-G2-W02-T012`

## Scope

G2-C adds descriptor-only service evidence for duplicate detection, related-party
search, and Party merge/split review. It keeps every operation review-bound and
no-write while preserving tenant scope, hidden unauthorized relationship counts,
audit-event descriptors, and rollback descriptors.

This slice does not claim G2 runtime write readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/master-data/src/service.js` | Adds duplicate candidate queue, related-party search descriptor, and Party merge/split workflow descriptor. |
| `packages/master-data/test/model.test.js` | Adds G2-C tests for similar-name duplicate review, related-party lookup, merge audit descriptor, and rollback plan. |
| `packages/master-data/src/registry.js` | Adds G2-C risk vocabulary for duplicate candidate, relationship search, and merge/split audit rollback evidence. |
| `contracts/master-data-contract.json` | Updates live Master Data contract risks and exported symbol list for G2-C service descriptors. |
| `scripts/validate-client-matter-os-g2-c.mjs` | Validates TUW coverage, report boundary, exported service helpers, contract risks, no-write behavior, and open G2 readiness. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G2-W02-T010` | `createMasterDataDuplicateCandidateQueue()` returns review-required duplicate candidates for similar names and filters cross-tenant candidates. | Proposed |
| `LFOS-G2-W02-T011` | `createMasterDataRelatedPartySearchDescriptor()` returns tenant-scoped related-party lookup results while hiding unauthorized candidate counts. | Proposed |
| `LFOS-G2-W02-T012` | `createMasterDataPartyMergeSplitWorkflowDescriptor()` returns review-required merge/split descriptors with audit-event and rollback evidence, or blocks when either descriptor is missing. | Proposed |

## Validation

Expected validation commands:

```sh
npm run client-matter:g2c:validate
npm run client-matter:g2b:validate
npm run client-matter:g2a:validate
npm run client-matter:g2:plan:validate
npm run rp04:master-data:validate
npm --workspace @law-firm-os/master-data run test
npm run validate
```

## Boundary

G2 remains open. G2-C proves duplicate/search/merge descriptor evidence only. It
does not open database writes, execute API handlers, run live search, mutate
Party records, append audit events, execute rollback, render UI, or close G2.
