# G2 Party Master Entry Plan

Status: Proposed
Gate: `G2 Master Data Gate`
Depends on: `ADR-G0-001`, `ADR-G0-004`, G1 implementation evidence review
TUW range: `LFOS-G2-W02-T001` through `LFOS-G2-W02-T014`

## Purpose

G2 turns Party and Relationship Master from descriptor-heavy RP04 evidence into
the runtime lane that will own Party, Person, Organization, ClientGroup,
Relationship, ContactPoint, and BillingProfile canonical identity.

This plan opens G2 planning and schema work only. It does not claim G2 runtime
write readiness while the stacked G1 PRs are still in draft review.

This plan does not claim G2 runtime write readiness.

## Existing Evidence

| Surface | Current evidence | G2 treatment |
| --- | --- | --- |
| `contracts/master-data-contract.json` | Master Data contract for entity identity, people, organizations, client groups, contact points, billing profiles, relationships, lifecycle, permissions, and audit references | Reuse as source contract; convert required identity controls into runtime tests. |
| `packages/master-data/src/model.js` | Descriptor factories for `Entity`, `Person`, `Organization`, `ClientGroup`, `Relationship`, `ContactPoint`, and `BillingProfile` | Treat as schema evidence; add PartyAlias and PartyIdentifier runtime-safe models before G2 readiness. |
| `packages/master-data/src/service.js` | Descriptor service workflows for entity creation, client grouping, relationship mapping, contact normalization, and duplicate review | Treat as service-shape evidence; add G1 permission/audit-bound runtime wrappers before write readiness. |
| `packages/master-data/README.md` | RP04 generated pack evidence and no-write boundaries through CP00-176 | Treat as descriptor evidence; do not use pack catalog status as runtime readiness proof. |
| `docs/reorganization/client-matter-os/14-billing-profile-ownership-adr.md` | Party Master owns canonical BillingProfile identity while Billing owns downstream workflow state | Use as the G2 BillingProfile ownership rule. |
| `docs/reorganization/client-matter-os/17-g1-g2-sequencing-adr.md` | G2 may open as planning/schema work while G1 is under review, but cannot claim runtime write readiness before G1 evidence is accepted or fail-closed stubbed | Use as the G2 runtime gate boundary. |

## Runtime Evidence Still Required

G2 cannot close until the following evidence exists in implementation PRs:

1. Party, Person, Organization, PartyAlias, PartyIdentifier, ClientGroup,
   Relationship, ContactPoint, and BillingProfile schemas have tenant-scoped
   tests.
2. Duplicate or merge-required behavior prevents silent duplicate canonical
   clients and contacts.
3. Relationship direction and related-party search are validated.
4. BillingProfile distinguishes legal client and billing client references.
5. Party read/write operations are bound to G1 permission and audit controls.
6. Party merge/split emits audit and rollback evidence.
7. Party search/profile UI states handle denied and review-required outcomes
   without leaking unauthorized counts or hidden fields.
8. G2 closeout records command output, PR state, G1 evidence disposition, and
   human review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G2-A | `LFOS-G2-W02-T001`-`LFOS-G2-W02-T005` | `codex/lawos-g2-party-schema` | Party, Person, Organization, PartyAlias, PartyIdentifier schema and tenant identity keys | Schema tests for party/person/org plus alias and identifier search keys. |
| G2-B | `LFOS-G2-W02-T006`-`LFOS-G2-W02-T009` | `codex/lawos-g2-relationship-billing-profile` | ClientGroup, Relationship, ContactPoint, BillingProfile ownership and references | Group membership, direction validation, primary/verified contact, and legal-client versus billing-client tests. |
| G2-C | `LFOS-G2-W02-T010`-`LFOS-G2-W02-T012` | `codex/lawos-g2-duplicate-search-merge` | Duplicate detection, relationship search, merge/split workflow | Review-required duplicate queue, related-party lookup, merge audit and rollback evidence. |
| G2-D | `LFOS-G2-W02-T013`-`LFOS-G2-W02-T014` | `codex/lawos-g2-ui-closeout` | Master Data UI states and G2 closeout | Denied/review UI-state tests, CRM/Matter/Billing reference evidence, command output, PR state, and human review disposition. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G2-W02-T001` | Party schema implementation | Party model create/read/update audit test. |
| `LFOS-G2-W02-T002` | Person schema implementation | Duplicate email warning test. |
| `LFOS-G2-W02-T003` | Organization schema implementation | Business number uniqueness test. |
| `LFOS-G2-W02-T004` | PartyAlias implementation | Korean, English, and former-name search test. |
| `LFOS-G2-W02-T005` | PartyIdentifier implementation | Business number, LEI, and registration ID test. |
| `LFOS-G2-W02-T006` | ClientGroup implementation | Group membership test. |
| `LFOS-G2-W02-T007` | Relationship graph implementation | Direction validation test. |
| `LFOS-G2-W02-T008` | ContactPoint implementation | Primary and verified flag test. |
| `LFOS-G2-W02-T009` | BillingProfile implementation | Legal client versus billing client test. |
| `LFOS-G2-W02-T010` | Duplicate detection service | Similar-name candidate test. |
| `LFOS-G2-W02-T011` | Relationship search API | Related-party lookup test. |
| `LFOS-G2-W02-T012` | Party merge/split workflow | Merge audit and rollback evidence. |
| `LFOS-G2-W02-T013` | Master Data UI connection | Party search/profile denied and review state test. |
| `LFOS-G2-W02-T014` | G2 master data closeout | CRM, Matter, and Billing reference evidence. |

## Entry Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm run client-matter:g1b:validate
npm run client-matter:g1c:validate
npm run client-matter:g1d:validate
npm run client-matter:g2:plan:validate
npm run rp04:master-data:validate
npm --workspace @law-firm-os/master-data run test
npm run validate
```

The G2 plan validator confirms that all 14 G2 TUWs are represented, that
BillingProfile remains owned by Party Master, that G1/G2 sequencing is preserved,
that Master Data descriptor evidence exists, and that runtime write readiness
remains open.

## Gate Boundary

G2 remains open. Planning artifacts, descriptor catalogs, generated RP04 closeout packs, and contract validators are entry evidence only.

G2 must not claim runtime write readiness before G1 evidence is human-reviewed
or explicitly stubbed behind fail-closed tests.
