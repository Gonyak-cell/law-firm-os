# CMP-G6 CRM/Intake Clearance Runtime Report

Status: Implemented runtime evidence slice
Date: 2026-06-20

## Scope

CMP-G6-W06 is now represented as an executable CRM/Intake API slice in
`apps/api/src/crm-intake-runtime-context.js`. The slice uses the existing
`packages/crm` and `packages/intake` descriptor contracts while adding runtime
evidence for Lead, Opportunity, CRM activity, proposal, referral, campaign,
Opportunity-to-Intake conversion, IntakeRequest, ConflictCheck, ConflictHit,
conflict search, conflict decision, waiver, fee terms, engagement, risk
approval, clearance token, UI masking, and tenant-scoped audit verification.

This slice fixes the dependency boundary around Matter opening: Opportunity can
move only into IntakeRequest, and Matter opening remains downstream of
Intake/Conflict/Engagement gate tests. Opportunity-to-Matter bypass attempts are
blocked before clearance-token issuance.

This is not a durable R4 claim. The runtime boundary remains
`runtime_api_evidence_only__durable_persistence_open`: the API provides
in-memory route, permission, workflow, and audit evidence, but it does not claim
durable production persistence or production Matter opening authority.

## Dependency Order

| Dependency | Reason |
| --- | --- |
| `CMP-G1-W01` | CRM/Intake actions emit tenant-scoped audit events and preserve permission boundary evidence. |
| `CMP-G2-W02` | CRM and Intake records reference Party IDs rather than recreating party identity. |
| feeds `CMP-G4-W04` | Matter opening must consume clearance evidence rather than bypassing CRM/Intake. |

## Runtime Routes

| Route | Purpose |
| --- | --- |
| `/api/crm-intake/runtime/evidence` | Emits CMP-G6 coverage, closeout descriptors, and no-premature-R4 boundary. |
| `/api/crm-intake/leads` | Creates Party-scoped Lead metadata. |
| `/api/crm-intake/opportunities` | Creates Opportunity metadata while rejecting direct Matter references. |
| `/api/crm-intake/opportunities/:id/pipeline` | Validates Opportunity stage transitions and blocks Matter shortcut payloads. |
| `/api/crm-intake/opportunities/:id/intake-request` | Converts Opportunity to IntakeRequest only. |
| `/api/crm-intake/activities` | Creates CRM activity metadata and trims confidential activity output. |
| `/api/crm-intake/proposals` | Creates proposal metadata with fee estimate references. |
| `/api/crm-intake/referrals` | Creates referral metadata with source/target Party references. |
| `/api/crm-intake/campaigns` | Creates campaign metadata with contact consent. |
| `/api/crm-intake/intake-requests` | Creates IntakeRequest through Opportunity conversion. |
| `/api/crm-intake/conflict-checks` | Records immutable party snapshot evidence. |
| `/api/crm-intake/conflict-hits` | Records audited conflict-hit metadata. |
| `/api/crm-intake/conflict-checks/:id/search` | Requires alias, relationship graph, and former-matter source coverage. |
| `/api/crm-intake/conflict-checks/:id/decision` | Requires human reviewer decision evidence. |
| `/api/crm-intake/waivers` | Requires conflict-hit refs, consent document refs, and approver. |
| `/api/crm-intake/fee-terms` | Records hourly/fixed/cap/retainer fee-term evidence. |
| `/api/crm-intake/engagements` | Requires legal client, scope, fee terms, and approval state. |
| `/api/crm-intake/risk-approvals` | Requires reviewer and approval audit ref. |
| `/api/crm-intake/clearance-tokens` | Requires IntakeRequest, ConflictCheck decision, Engagement approval, and non-stale snapshot. |
| `/api/crm-intake/ui/summary` | Hides conflict and finance details from CRM summary UI state. |
| `/api/crm-intake/ui/key-client-plan` | Masks AR, invoice, billing, and collection detail. |
| `/api/crm-intake/ui/conflict-memo` | Denies CRM conflict memo access and hides unauthorized counts. |
| `/api/crm-intake/ui/waiver-approval` | Hides consent document body and raw conflict detail. |
| `/api/crm-intake/ui/engagement-approval` | Shows approved/signed state without signed document body. |
| `/api/crm-intake/audit` | Returns tenant-scoped audit chain verification. |

## Guardrails

| Guardrail | Runtime evidence |
| --- | --- |
| CRM/Intake clearance | Clearance token route blocks unless IntakeRequest, ConflictCheck decision, and approved/signed Engagement exist. |
| Opportunity-to-Matter bypass | Opportunity, pipeline, Opportunity-to-Intake, engagement, search, and token routes reject Matter shortcut payloads. |
| Intake/Conflict/Engagement gate tests | API tests cover source-complete conflict search, reviewer conflict decision, engagement approval, and clearance token issuance. |
| Conflict memo boundary | CRM users receive denied conflict memo UI state with hidden memo fields and no unauthorized count leak. |
| Finance masking | Key client plan masks AR, invoice, billing, and collection details. |
| Waiver and engagement UI masking | Waiver and engagement UI states hide raw documents, raw conflict detail, audit body, and unauthorized counts. |
| No durable R4 claim | Report, runtime evidence, and validator use `runtime_api_evidence_only__durable_persistence_open`. |

## TUW Coverage

| CMP TUW | Runtime trace |
| --- | --- |
| `CMP-G6-W06-T001` | Lead metadata route. |
| `CMP-G6-W06-T002` | Opportunity metadata route and direct Matter reference block. |
| `CMP-G6-W06-T003` | CRM activity metadata route. |
| `CMP-G6-W06-T004` | Proposal metadata route. |
| `CMP-G6-W06-T005` | Referral metadata route. |
| `CMP-G6-W06-T006` | Campaign consent route. |
| `CMP-G6-W06-T007` | Opportunity pipeline transition route. |
| `CMP-G6-W06-T008` | Confidential CRM activity permission-trim evidence. |
| `CMP-G6-W06-T009` | CRM summary UI masking route. |
| `CMP-G6-W06-T010` | Opportunity-to-Intake command route. |
| `CMP-G6-W06-T011` | Key client plan finance masking route. |
| `CMP-G6-W06-T012` | CRM partial closeout descriptor evidence. |
| `CMP-G6-W06-T013` | IntakeRequest route. |
| `CMP-G6-W06-T014` | ConflictCheck immutable snapshot route. |
| `CMP-G6-W06-T015` | ConflictHit audited source route. |
| `CMP-G6-W06-T016` | Conflict search source coverage route. |
| `CMP-G6-W06-T017` | Conflict decision reviewer route. |
| `CMP-G6-W06-T018` | Waiver, fee terms, engagement, and risk approval evidence routes. |
| `CMP-G6-W06-T019` | Clearance token gate route. |
| `CMP-G6-W06-T020` | UI boundary routes and Matter bypass guard. |
| `CMP-G6-W06-T021` | Tenant-scoped audit verification route. |
| `CMP-G6-W06-T022` | CMP-G6 validator and runtime evidence closeout. |

## Validation

Passed commands:

```bash
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm run client-matter:cmp-g2:validate
npm run client-matter:cmp-g3:validate
npm run client-matter:cmp-g4:validate
npm run client-matter:cmp-g5:validate
npm run client-matter:cmp-g6:validate
npm --workspace apps/api run test
npm test
git diff --check
```

Observed result:

| Command | Result |
| --- | --- |
| `npm run client-matter:cmp-v1:validate` | Passed, `cmp_tuw_rows: 316/316`. |
| `npm run client-matter:cmp-g1:validate` | Passed, `cmp_g1_tuws: 24/24`. |
| `npm run client-matter:cmp-g2:validate` | Passed, `cmp_g2_tuws: 19/19`. |
| `npm run client-matter:cmp-g3:validate` | Passed, `cmp_g3_tuws: 24/24`. |
| `npm run client-matter:cmp-g4:validate` | Passed, `cmp_g4_tuws: 23/23`. |
| `npm run client-matter:cmp-g5:validate` | Passed, `cmp_g5_tuws: 32/32`. |
| `npm run client-matter:cmp-g6:validate` | Passed, `cmp_g6_tuws: 22/22`. |
| `npm --workspace apps/api run test` | Passed, 96 tests. |
| `npm test` | Passed, 3,878 tests. |
| `git diff --check` | Passed. |
