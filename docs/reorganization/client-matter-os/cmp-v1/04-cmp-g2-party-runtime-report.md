# CMP-G2 Party Master Runtime Report

Status: Implemented runtime API evidence; durable production persistence remains open
Date: 2026-06-20

## Scope

This report records the executable CMP v1.0 runtime slice for
`CMP-G2-W02 Party Master`. It builds on the `CMP-G1-W01` trust foundation API
evidence by requiring G1-style permission decisions for Party Master writes,
reads, duplicate search, merge/split review, and audit export.

The implementation reuses the repo-native `packages/master-data` model and
validator layer, then exposes it through `apps/api` as tenant-scoped
`/party-master/*` runtime routes. This is not an R4 completion claim. State is
kept in the API process; durable production persistence remains open.

## TUWs Covered

`CMP-G2-W02-T001`, `CMP-G2-W02-T002`, `CMP-G2-W02-T003`,
`CMP-G2-W02-T004`, `CMP-G2-W02-T005`, `CMP-G2-W02-T006`,
`CMP-G2-W02-T007`, `CMP-G2-W02-T008`, `CMP-G2-W02-T009`,
`CMP-G2-W02-T010`, `CMP-G2-W02-T011`, `CMP-G2-W02-T012`,
`CMP-G2-W02-T013`, `CMP-G2-W02-T014`, `CMP-G2-W02-T015`,
`CMP-G2-W02-T016`, `CMP-G2-W02-T017`, `CMP-G2-W02-T018`,
`CMP-G2-W02-T019`

## Implemented Files

| File | Runtime role |
| --- | --- |
| `apps/api/src/party-runtime-context.js` | CMP-G2 Party Master API runtime, tenant-scoped state, G1 permission evaluation, audit append, duplicate search, merge/split review. |
| `apps/api/src/server.js` | Routes `/party-master/*` through the API server and exposes the party-master bounded context in `/api/health`. |
| `apps/api/test/cmp-g2-party-master-api.test.js` | In-process API coverage for create/list/read/update, aliases, identifiers, client groups, relationships, contacts, billing profiles, duplicate review, merge/split review, audit export, and audit verification. |
| `scripts/validate-client-matter-os-cmp-g2-runtime.mjs` | Static validator guarding TUW traceability, route coverage, test coverage, G1 dependency, and no premature R4 claim. |

## Runtime Routes

| Route | Methods | Evidence intent |
| --- | --- | --- |
| `/party-master/records` | `GET` | Tenant-scoped Party Master record list. |
| `/party-master/parties` | `GET`, `POST` | Party create/list plus item `GET`/`PATCH`. |
| `/party-master/entities` | `GET`, `POST` | Entity runtime records. |
| `/party-master/people` | `GET`, `POST` | Person runtime records. |
| `/party-master/organizations` | `GET`, `POST` | Organization runtime records. |
| `/party-master/aliases` | `GET`, `POST` | Party alias runtime records. |
| `/party-master/identifiers` | `GET`, `POST` | Party identifier runtime records. |
| `/party-master/client-groups` | `GET`, `POST` | Client group runtime records and leakage validation. |
| `/party-master/relationships` | `GET`, `POST` | Relationship runtime records and related-party search descriptor. |
| `/party-master/contact-points` | `GET`, `POST` | Contact point runtime records. |
| `/party-master/billing-profiles` | `GET`, `POST` | Billing profile runtime records. |
| `/party-master/duplicates/search` | `POST` | Duplicate candidate queue, review-required outcome, tenant filtering. |
| `/party-master/merge-split` | `POST` | Merge/split review workflow with audit and rollback refs. |
| `/party-master/audit/events` | `GET` | Permission-gated tenant-scoped audit event export. |
| `/party-master/audit/verify` | `GET` | Permission-gated tenant-scoped audit hash-chain verification. |

## Guardrails

- Every runtime read/write route requires a G1 permission decision.
- Cross-tenant Party records are not listed, searched, or exported.
- Duplicate search is tenant scoped and routes likely matches to review.
- Client group member leakage, relationship endpoint errors, and billing client
  reference errors remain validator-blocked.
- Merge/split cannot proceed without audit and rollback references.
- Audit export and verification are permission gated.
- The exposed readiness string is
  `runtime_api_evidence_only__durable_persistence_open`; this intentionally
  avoids an R4 claim until durable persistence evidence exists.

## Verification

Required commands:

```bash
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm run client-matter:cmp-g2:validate
npm --workspace apps/api run test
npm test
```
