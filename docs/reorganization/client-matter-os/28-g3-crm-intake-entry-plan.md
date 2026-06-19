# G3 CRM Intake Entry Plan

Status: Proposed
Gate: `G3 Intake-to-Matter Gate`
Depends on: G1 implementation evidence review, G2 implementation evidence review
TUW range: `LFOS-G3-W03-T001` through `LFOS-G3-W04-T014`

## Purpose

G3 turns CRM and Intake from descriptor-heavy RP09/RP10 evidence into the
runtime lane that will govern Lead, Opportunity, CRMActivity, Proposal,
Referral, Campaign, IntakeRequest, ConflictCheck, ConflictHit, Waiver,
Engagement, FeeTerms, and clearance-token behavior.

This plan opens G3 planning only. It does not claim G3 runtime readiness while
the stacked G1 and G2 PRs are still in draft review.

This plan does not claim G3 runtime readiness.

Opportunity-to-Matter shortcut remains prohibited. CRM may only hand an
Opportunity to Intake; Matter creation must wait for Intake conflict,
engagement, waiver, approval, audit, and clearance-token evidence.

## Existing Evidence

| Surface | Current evidence | G3 treatment |
| --- | --- | --- |
| `contracts/crm-core-contract.json` | RP09 descriptor contract for Lead, Opportunity, Activity, Proposal, Campaign, Referral, UI, permissions, fixtures, review, and closeout | Reuse as source contract; convert CRM schema, pipeline, permission trimming, and Opportunity-to-Intake controls into runtime tests. |
| `contracts/intake-core-contract.json` | RP10 descriptor contract for ConflictCheck, ConflictHit, Waiver, Engagement, Fee Terms, permission matrix, failure taxonomy, review, and closeout | Reuse as source contract; convert conflict search, decision, waiver, engagement, and clearance-token controls into runtime tests. |
| `packages/crm/README.md` | RP09 generated pack evidence and no-runtime/no-write boundaries through CP00-320 | Treat as descriptor evidence; do not use pack catalog status as runtime readiness proof. |
| `packages/intake/README.md` | RP10 generated pack evidence and no-runtime/no-write boundaries through CP00-341 | Treat as descriptor evidence; do not use pack catalog status as runtime readiness proof. |
| `docs/reorganization/client-matter-os/12-risk-register.md` | R-001 duplicate Client, R-002 Opportunity direct Matter conversion, and R-003 conflict memo exposure risks | Use as G3 negative evidence requirements. |
| `docs/reorganization/client-matter-os/17-g1-g2-sequencing-adr.md` | G2 cannot claim runtime write readiness before G1 evidence acceptance or fail-closed stubs | Extend the same runtime gate boundary to G3: CRM/Intake runtime cannot claim readiness before G1/G2 evidence is accepted or fail-closed stubbed. |
| `docs/reorganization/client-matter-os/27-g2-d-ui-closeout-report.md` | G2 closeout descriptor records CRM, Matter, and Billing reference evidence while keeping runtime write readiness open | Use as handoff evidence only, not as G3 readiness proof. |

## Runtime Evidence Still Required

G3 cannot close until the following evidence exists in implementation PRs:

1. Lead, Opportunity, CRMActivity, Proposal, Referral, and Campaign schemas have
   tenant-scoped tests and reference Party Master identity instead of creating
   duplicate Client identity.
2. Opportunity cannot reference Matter directly or create Matter records.
3. CRM activity and summary UI hide confidential activity, conflict memo, and
   billing detail from unauthorized CRM users.
4. Opportunity-to-Intake command emits an IntakeRequest descriptor and blocks
   Matter creation.
5. IntakeRequest, ConflictCheck, and ConflictHit schemas preserve immutable
   conflict snapshots with audit-bound hit sources.
6. Conflict search covers Party aliases, relationships, former matters, and
   permission-aware result trimming.
7. Conflict decision workflow requires reviewer evidence and blocks stale or
   unreviewed decisions.
8. Waiver requires consent document evidence and approval audit.
9. Engagement requires legal client Party, scope, FeeTerms, approval state, and
   signed engagement evidence.
10. Intake-to-Matter clearance token is required, expires, and blocks stale or
    bypass attempts.
11. Conflict memo, waiver, and engagement UI states handle denied and
    review-required outcomes without leaking hidden fields or unauthorized
    counts.
12. G3 closeout records command output, PR state, G1/G2 evidence disposition,
    and human review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G3-A | `LFOS-G3-W03-T001`-`LFOS-G3-W03-T006` | `codex/lawos-g3-crm-schema` | Lead, Opportunity, CRMActivity, Proposal, Referral, Campaign schema and Party Master references | Party reference, no direct Matter reference, confidential flag, fee-estimate ref, referral-source Party ref, opt-in/out contact tests. |
| G3-B | `LFOS-G3-W03-T007`-`LFOS-G3-W03-T012` | `codex/lawos-g3-crm-service-ui-closeout` | Opportunity pipeline, CRM permission trimming, summary UI, Opportunity-to-Intake command, key client plan view, CRM partial closeout | Stage transition, confidential activity denied, no conflict memo/billing detail, Matter creation blocked, AR/detail masking, Opportunity-to-Intake-only closeout evidence. |
| G3-C | `LFOS-G3-W04-T001`-`LFOS-G3-W04-T003` | `codex/lawos-g3-intake-conflict-schema` | IntakeRequest, ConflictCheck, ConflictHit schema and immutable conflict evidence | Required parties, snapshot immutability, hit-source audit tests. |
| G3-D | `LFOS-G3-W04-T004`-`LFOS-G3-W04-T010` | `codex/lawos-g3-conflict-engagement-workflow` | Conflict search, decision workflow, waiver, engagement, FeeTerms, risk approval queue, clearance token | Alias/relationship/former-matter search, reviewer required, consent document, legal client/scope, fee term variants, approval audit, expired/stale token blocked tests. |
| G3-E | `LFOS-G3-W04-T011`-`LFOS-G3-W04-T014` | `codex/lawos-g3-intake-ui-closeout` | Conflict memo boundary, waiver UI, engagement UI, G3 closeout | CRM user cannot view memo, denied/review waiver state, signed/approved engagement state, Opportunity cannot bypass Intake closeout evidence. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G3-W03-T001` | Lead schema implementation | Party reference required test. |
| `LFOS-G3-W03-T002` | Opportunity schema implementation | Matter direct reference prohibited test. |
| `LFOS-G3-W03-T003` | CRMActivity schema implementation | Confidential flag test. |
| `LFOS-G3-W03-T004` | Proposal schema implementation | Fee estimate reference test. |
| `LFOS-G3-W03-T005` | Referral schema implementation | Referral source Party reference test. |
| `LFOS-G3-W03-T006` | Campaign schema implementation | Opt-in/out contact test. |
| `LFOS-G3-W03-T007` | Opportunity pipeline API | Stage transition test. |
| `LFOS-G3-W03-T008` | CRM activity permission trimming | Confidential activity denied test. |
| `LFOS-G3-W03-T009` | CRM summary screen | No conflict memo or billing detail leak test. |
| `LFOS-G3-W03-T010` | Opportunity-to-Intake command | Matter creation blocked test. |
| `LFOS-G3-W03-T011` | Key client plan view | AR/detail masking test. |
| `LFOS-G3-W03-T012` | CRM G3 partial closeout | Opportunity-to-Intake-only evidence. |
| `LFOS-G3-W04-T001` | IntakeRequest schema implementation | Required parties test. |
| `LFOS-G3-W04-T002` | ConflictCheck schema implementation | Snapshot immutability test. |
| `LFOS-G3-W04-T003` | ConflictHit schema implementation | Hit source audit test. |
| `LFOS-G3-W04-T004` | Conflict search service | Alias, relationship, and former matter test. |
| `LFOS-G3-W04-T005` | Conflict decision workflow | Reviewer required test. |
| `LFOS-G3-W04-T006` | Waiver model implementation | Consent document required test. |
| `LFOS-G3-W04-T007` | Engagement model implementation | Scope and legal client required test. |
| `LFOS-G3-W04-T008` | FeeTerms model implementation | Hourly, fixed, cap, and retainer test. |
| `LFOS-G3-W04-T009` | Risk approval queue | Approval audit test. |
| `LFOS-G3-W04-T010` | Intake-to-Matter clearance token | Expired or stale token blocked test. |
| `LFOS-G3-W04-T011` | Conflict memo permission boundary | CRM user cannot view memo test. |
| `LFOS-G3-W04-T012` | Waiver approval UI | Denied and review state test. |
| `LFOS-G3-W04-T013` | Engagement approval UI | Signed and approved state test. |
| `LFOS-G3-W04-T014` | G3 Intake closeout | Opportunity cannot bypass Intake evidence. |

## Entry Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm run client-matter:g1b:validate
npm run client-matter:g1c:validate
npm run client-matter:g1d:validate
npm run client-matter:g2:plan:validate
npm run client-matter:g2a:validate
npm run client-matter:g2b:validate
npm run client-matter:g2c:validate
npm run client-matter:g2d:validate
npm run client-matter:g3:plan:validate
npm run rp09:crm-core:validate
npm run rp10:intake-core:validate
npm run validate
```

The G3 plan validator confirms that all 26 G3 TUWs are represented, that CRM
and Intake descriptor evidence exists, that R-001/R-002/R-003 controls are
preserved, that Opportunity-to-Matter shortcut remains prohibited, and that G3
runtime readiness remains open.

## Gate Boundary

G3 remains open. Planning artifacts, descriptor catalogs, generated RP09/RP10 closeout packs, and contract validators are entry evidence only.

G3 must not claim Intake-to-Matter runtime readiness before G1 and G2 evidence
is human-reviewed or explicitly stubbed behind fail-closed tests.
