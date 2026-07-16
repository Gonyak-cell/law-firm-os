# LCX Full Implementation TUW Traceability

Status: active planning baseline
Date: 2026-06-30
Parent plan: `docs/lazycodex/lcx-full-implementation-tuw-plan-2026-06-30.md`
Implementation goal: `LCX-FULL-COMPLETE`

## Goal Contract

Use this document as the executable backlog for implementing every `LCX-FULL-*` TUW without losing approval, provider, preflight, audit, release, or production boundaries.

The work is complete only when every child TUW below is either:

- `closed` with code/mapping, tests, browser or route proof, and evidence artifact;
- `closed_external` with an explicit owner/provider/production receipt outside repo implementation; or
- `retired_by_owner_decision` with a recorded decision artifact.

No row may be silently skipped.

## Claim Boundary

Allowed implementation target:

`not_configured -> configured -> preflight_passed -> approval_requested -> approved -> executed -> audited`

Blocked until separate receipt:

- production go-live
- public release
- provider production write
- owner approval inferred by an agent
- real Vault document mutation without storage/provider/owner policy
- real client data migration without approved runtime target
- payroll, payment, tax-invoice, e-sign, or external message send without provider receipt

## Required Row Fields

Every child TUW must be tracked with:

- ID
- parent TUW
- implementation lane
- planned files or modules
- test command
- browser or route proof
- evidence artifact
- allowed claim
- blocked claim
- status

## PR Sequence

| PR | Child TUWs | Exit Gate |
| --- | --- | --- |
| PR-00 | `LCX-FULL-00.*` | Current truth frozen and no-premature-claim guard exists. |
| PR-01 | `LCX-FULL-01.*`, `LCX-FULL-02.*` | Shared state and guarded UI exist without enabling writes. |
| PR-02 | `LCX-FULL-03.*`, `LCX-FULL-04.*`, `LCX-FULL-05.*` | Approval, provider, and run kernels are test-backed. |
| PR-03 | `LCX-FULL-06.*`, `LCX-FULL-07.*` | Matter/Vault document workflows reach request/preflight states. |
| PR-04 | `LCX-FULL-08.*`, `LCX-FULL-09.*`, `LCX-FULL-10.*` | Import and enrichment workflows use shared gates. |
| PR-05 | `LCX-FULL-11.*`, `LCX-FULL-12.*`, `LCX-FULL-13.*` | External provider workflows remain receipt-gated. |
| PR-06 | `LCX-FULL-14.*`, `LCX-FULL-15.*`, `LCX-FULL-16.*` | People setup, governance, and integrations are guarded. |
| PR-07 | `LCX-FULL-17.*`, `LCX-FULL-18.*` | Global decisions and audit reconciliation are reviewable. |
| PR-08 | `LCX-FULL-19.*`, `LCX-FULL-20.*` | Runtime/release packet is ready for human go/no-go. |

## Child TUW Backlog

### LCX-FULL-00 - Current Gap Freeze And Claim Guard

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-00.01 | inventory | `scripts/run-lcx-full-current-gap-inventory.mjs`; `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-00-current-gap-inventory.json` | `node scripts/run-lcx-full-current-gap-inventory.mjs` | current gap inventory JSON | Captures latest routes, blocked states, disabled action counts, release false claims. |
| LCX-FULL-00.02 | validator | `scripts/validate-lcx-full-gap-inventory.mjs`; `package.json` | `npm run lcx:full:gap-inventory:validate` | validator output | Fails on missing `LCX-FULL-00..20`, missing route proof, or missing blocked claim. |
| LCX-FULL-00.03 | claim guard | `scripts/validate-lcx-full-no-premature-claim.mjs`; release docs allowlist | `npm run lcx:full:no-premature-claim:validate` | no-premature-claim receipt | Fails if docs claim public release, production go-live, provider write, or owner approval without receipt. |
| LCX-FULL-00.04 | traceability | this file; parent plan | `rg -n "LCX-FULL-20|Non-Negotiable" docs/lazycodex/lcx-full-implementation-tuw-*` | traceability grep receipt | Parent plan and child backlog agree on scope and sequence. |
| LCX-FULL-00.05 | browser baseline | `scripts/run-lcx-full-baseline-browser-proof.mjs` | `node scripts/run-lcx-full-baseline-browser-proof.mjs` | baseline route screenshots/JSON | Browser confirms current Matter Vault, Vault, People, Client, and global decision blocked states. |

### LCX-FULL-01 - Shared Readiness And Receipt Model

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-01.01 | model | `apps/web/src/data/apiClient.js`; shared readiness module | `npm run lcx:full:state-model:validate` | state model receipt | Defines readiness, approval, provider receipt, run, audit, field policy, document policy projections. |
| LCX-FULL-01.02 | transitions | transition helper and unit tests | `node --test apps/web/test/*state*.test.mjs` | transition test output | Enforces ordered states and rejects skipped approval/provider/preflight transitions. |
| LCX-FULL-01.03 | seed/read model | safe synthetic records or API fixtures | `npm --workspace apps/web run test:ui` | UI regression output | Existing UI reads the model without local dummy data or raw secrets. |
| LCX-FULL-01.04 | redaction | redaction helper for tokens, provider URLs, raw rows, storage paths | `npm run lcx:full:redaction:validate` | redaction receipt | Denied/private fields cannot reach UI proof artifacts. |
| LCX-FULL-01.05 | docs | parent plan and ADR links | `rg -n "not_configured|approval_requested|audited" docs/lazycodex/lcx-full-implementation-tuw-*` | doc proof | Claim ladder is visible to later implementers. |

### LCX-FULL-02 - Shared Guarded UI Components

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-02.01 | components | `apps/web/src/components/*Guarded*`; shared status rows | `npm --workspace apps/web run test:ui` | UI test output | Shared components render readiness, approval, provider, preflight, and audit states. |
| LCX-FULL-02.02 | copy | Korean guarded-state copy map | `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed` | sloplint receipt | Copy avoids generic AI/product fluff and preserves legal operating terms. |
| LCX-FULL-02.03 | adoption | Matter Vault, Vault, Client, People, global utility first pass | `npm run lcx:full:guarded-ui:validate` | guarded UI receipt | Existing blocked states remain visually consistent and write-disabled. |
| LCX-FULL-02.04 | accessibility | button disabled labels, status roles, keyboard focus | `npm --workspace apps/web run test:ui` | accessibility assertions | Disabled/request buttons are distinguishable and non-overlapping. |
| LCX-FULL-02.05 | browser proof | `scripts/run-lcx-full-guarded-ui-browser-proof.mjs` | `node scripts/run-lcx-full-guarded-ui-browser-proof.mjs` | screenshots/JSON | Routes show shared guarded UI without enabling actions. |

### LCX-FULL-03 - Owner Approval Request Runtime

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-03.01 | API | approval request create/read/update handlers | `npm run lcx:full:approval:validate` | approval validator output | Approval requests can be created and read with actor/object/reason/ref. |
| LCX-FULL-03.02 | decisions | approve/reject/expire transitions | `node --test apps/web/test/*approval*.test.mjs` | transition tests | Agent-inferred approval is rejected; human receipt fields are required. |
| LCX-FULL-03.03 | UI | approval request rows in owner-blocked surfaces | `npm --workspace apps/web run test:ui` | UI assertions | Owner-blocked actions become requestable where safe, not auto-approved. |
| LCX-FULL-03.04 | audit | approval audit event writer/readback | `npm run runtime-spine:rs3:audit:validate` | audit receipt | Every approval transition has immutable audit evidence. |
| LCX-FULL-03.05 | browser proof | Client owner bulk, Matter owner bulk, import execute, legal hold | `node scripts/run-lcx-full-approval-browser-proof.mjs` | route proof JSON/screenshots | Approval request state is observable in UI. |

### LCX-FULL-04 - Provider Receipt Registry

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-04.01 | registry | connector receipt model and safe projection | `npm run lcx:full:provider-receipts:validate` | provider validator output | Provider receipt stores env, scope, expiry, revocation, and receipt ref. |
| LCX-FULL-04.02 | fail-closed | adapter guard helper | `node --test apps/web/test/*provider*.test.mjs` | negative tests | Missing/expired/wrong-scope receipt leaves provider-blocked. |
| LCX-FULL-04.03 | provider surfaces | Client billing, e-sign, data, Matter comms/email | `npm --workspace apps/web run test:ui` | UI test output | Provider status appears consistently and never exposes secrets. |
| LCX-FULL-04.04 | sandbox receipts | synthetic/sandbox receipt fixtures | `npm run lcx:full:provider-sandbox:validate` | sandbox receipt proof | Sandbox receipts cannot be treated as production receipts. |
| LCX-FULL-04.05 | browser proof | provider-blocked and provider-configured branches | `node scripts/run-lcx-full-provider-browser-proof.mjs` | route proof | UI shows exact provider state per surface. |

### LCX-FULL-05 - Run Lifecycle Kernel

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-05.01 | kernel | run lifecycle helper: dry-run/preflight/execute/rollback/audit | `npm run lcx:full:runs:validate` | run validator output | Run states are central and reusable. |
| LCX-FULL-05.02 | idempotency | run idempotency keys and duplicate handling | `node --test apps/web/test/*run*.test.mjs` | duplicate-run tests | Duplicate execute cannot mutate twice. |
| LCX-FULL-05.03 | safe snapshots | input hash and safe output projection | `npm run lcx:full:redaction:validate` | redaction receipt | Raw rows, storage paths, provider URLs, and tokens are absent. |
| LCX-FULL-05.04 | rollback/error | rollback report and safe error taxonomy | `npm run lcx:full:runs:validate` | rollback proof | Failed runs produce safe operator-facing reports. |
| LCX-FULL-05.05 | audit | run audit event readback | `npm run runtime-spine:rs3:audit:validate` | audit proof | Every run transition is auditable. |

### LCX-FULL-06 - Matter Vault Workspace

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-06.01 | preflight | Matter document workspace preflight via run kernel | `npm run lcx:vltui:matter-document-workspace:validate` | workspace validator | Preflight can pass/fail without writing Vault objects. |
| LCX-FULL-06.02 | publish request | Vault publish request after draft and preflight | `npm run lcx:full:matter-vault:validate` | publish request proof | Exit state is request/approval, not published. |
| LCX-FULL-06.03 | import dry-run | Matter Vault document import dry-run | `npm run lcx:vltui:matter-document-workspace:proof` | dry-run proof | Dry-run opens; execute stays owner/provider blocked. |
| LCX-FULL-06.04 | email draft | external email draft package and provider preflight | `npm run lcx:full:matter-vault-email:validate` | email draft proof | Draft/send request visible; no external send. |
| LCX-FULL-06.05 | browser proof | `?view=matters#matter-vault` | `node scripts/run-lcx-full-matter-vault-browser-proof.mjs` | screenshot/JSON | Disabled count and guarded states match expected transitions. |

### LCX-FULL-07 - Vault Document Action Gates

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-07.01 | upload preflight | Vault upload preflight | `npm run lcx:vltui:upload-preflight:validate` | upload preflight proof | Upload preflight records safe readiness only. |
| LCX-FULL-07.02 | version request | version upload request state | `npm run lcx:full:vault-doc-actions:validate` | version request proof | Version upload remains request-only without storage receipt. |
| LCX-FULL-07.03 | metadata policy | allowed metadata mutation policy | `npm run lcx:full:vault-doc-actions:validate` | metadata proof | Denied fields rejected and audited. |
| LCX-FULL-07.04 | legal hold | legal hold owner decision gate | `npm run lcx:vltui:action-boundaries:validate` | legal hold proof | Legal hold never changes without owner decision receipt. |
| LCX-FULL-07.05 | retention/records | retention policy request and records receipt | `npm run lcx:full:vault-records:validate` | records proof | Retention stays records-blocked without records policy. |
| LCX-FULL-07.06 | browser proof | `?view=vault#vault-documents` | `node scripts/run-lcx-full-vault-docs-browser-proof.mjs` | route proof | Five document action rows are traced and write-disabled unless receipt exists. |

### LCX-FULL-08 - Matter Import Execute

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-08.01 | source stage | Matter import source staging with raw-row hidden | `npm run lcx:full:matter-import:validate` | source stage proof | Source structure stored; raw rows hidden. |
| LCX-FULL-08.02 | mapping | Matter field allowlist mapping | `npm run lcx:full:matter-import:validate` | mapping proof | Disallowed fields rejected. |
| LCX-FULL-08.03 | dry-run | dry-run validation and safe sample | `node --test apps/web/test/*import*.test.mjs` | dry-run tests | Dry-run changes no target records. |
| LCX-FULL-08.04 | approval execute | owner-approved synthetic execute | `npm run lcx:full:matter-import:validate` | execute proof | Execute requires owner approval and idempotency. |
| LCX-FULL-08.05 | rollback/error | rollback and error report | `npm run lcx:full:matter-import:validate` | rollback proof | Safe rollback/error report exists. |
| LCX-FULL-08.06 | browser proof | `?view=matters#matter-import` | `node scripts/run-lcx-full-matter-import-browser-proof.mjs` | route proof | Execute state is visible and not production-complete. |

### LCX-FULL-09 - Client Import Execute

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-09.01 | source stage | Client import source staging | `npm run lcx:full:client-import:validate` | source proof | Raw rows hidden, source structure visible. |
| LCX-FULL-09.02 | mapping | account/contact/opportunity field allowlists | `npm run lcx:full:client-import:validate` | mapping proof | Client-specific policy exists. |
| LCX-FULL-09.03 | dry-run | Client import dry-run | `node --test apps/web/test/*client*import*.test.mjs` | dry-run tests | Dry-run does not mutate records. |
| LCX-FULL-09.04 | approval execute | owner-approved synthetic execute | `npm run lcx:full:client-import:validate` | execute proof | Execute cannot skip approval. |
| LCX-FULL-09.05 | rollback/error | rollback and error report | `npm run lcx:full:client-import:validate` | rollback proof | Safe rollback/error state is visible. |
| LCX-FULL-09.06 | browser proof | `?view=clients#client-import` | `node scripts/run-lcx-full-client-import-browser-proof.mjs` | route proof | Client import lifecycle is fully traced. |

### LCX-FULL-10 - Client Data Enrichment

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-10.01 | consent | consent coverage model | `npm run lcx:full:client-data:validate` | consent proof | Enrichment cannot run without consent basis. |
| LCX-FULL-10.02 | provider | provider receipt preflight | `npm run lcx:full:provider-receipts:validate` | provider proof | Missing receipt stays provider-blocked. |
| LCX-FULL-10.03 | job | enrichment job create/execute request | `npm run lcx:full:client-data:validate` | job proof | Execute is receipt-gated and auditable. |
| LCX-FULL-10.04 | identity | identity candidate generation, no auto-merge | `npm run lcx:full:client-data:validate` | identity proof | Matching creates review candidates only. |
| LCX-FULL-10.05 | segment | segment activation with rollback plan | `npm run lcx:full:client-data:validate` | segment proof | Activation requires provider receipt and rollback plan. |
| LCX-FULL-10.06 | browser proof | `?view=clients#client-data` | `node scripts/run-lcx-full-client-data-browser-proof.mjs` | route proof | Provider/owner/consent states are observable. |

### LCX-FULL-11 - Client Contracts And E-Sign

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-11.01 | draft | proposal/contract draft metadata | `npm run lcx:full:contracts-esign:validate` | draft proof | Draft package references Vault docs safely. |
| LCX-FULL-11.02 | roles | signer role and required field validation | `npm run lcx:full:contracts-esign:validate` | signer proof | Missing signer fields block send request. |
| LCX-FULL-11.03 | provider | e-sign provider receipt preflight | `npm run lcx:full:provider-receipts:validate` | provider proof | Missing provider remains provider-blocked. |
| LCX-FULL-11.04 | send request | e-sign send request and audit | `npm run lcx:full:contracts-esign:validate` | send request proof | Exit state is request-ready, not sent. |
| LCX-FULL-11.05 | browser proof | `?view=clients#client-contracts` | `node scripts/run-lcx-full-contracts-browser-proof.mjs` | route proof | E-sign state is visible and safe. |

### LCX-FULL-12 - Billing, Payments, And Tax Invoice Providers

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-12.01 | invoice | invoice issue request model | `npm run lcx:full:billing-provider:validate` | invoice proof | Invoice request does not issue externally. |
| LCX-FULL-12.02 | payment | payment/send request model | `npm run lcx:full:billing-provider:validate` | payment proof | No money movement without provider and owner receipt. |
| LCX-FULL-12.03 | tax invoice | e-tax invoice provider gate | `npm run lcx:full:billing-provider:validate` | tax invoice proof | Tax invoice issue stays provider-blocked. |
| LCX-FULL-12.04 | reconciliation | AR/payment reconciliation refs | `npm run lcx:full:billing-provider:validate` | reconciliation proof | Reconciliation is readback-safe. |
| LCX-FULL-12.05 | browser proof | `?view=clients#client-billing`, `?view=matters#matter-expenses` | `node scripts/run-lcx-full-billing-browser-proof.mjs` | route proof | Billing provider states are visible. |

### LCX-FULL-13 - Matter Communication Provider Workflow

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-13.01 | draft | Matter message/email draft model | `npm run lcx:full:matter-comms:validate` | draft proof | Draft can be created without external send. |
| LCX-FULL-13.02 | recipient policy | recipient/attachment policy | `npm run lcx:full:matter-comms:validate` | recipient proof | Denied recipients and raw paths are blocked. |
| LCX-FULL-13.03 | provider | Outlook/message provider receipt preflight | `npm run lcx:full:provider-receipts:validate` | provider proof | Missing provider remains provider-blocked. |
| LCX-FULL-13.04 | send request | send approval request and audit | `npm run lcx:full:matter-comms:validate` | send request proof | Exit state is send-requested, not sent. |
| LCX-FULL-13.05 | browser proof | Matter communication and Matter Vault email draft routes | `node scripts/run-lcx-full-matter-comms-browser-proof.mjs` | route proof | Draft/request/send boundary is observable. |

### LCX-FULL-14 - People Setup Tranche A

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-14.01 | readiness source | People catalog driven by readiness records | `npm run lcx:hrx-sft:catalog:validate` | catalog proof | Counts are derived from readiness, not only hard-coded state. |
| LCX-FULL-14.02 | roles/profile | role and work-profile configuration | `npm run lcx:full:people-setup-a:validate` | roles/profile proof | Selected setup rows move to configured state. |
| LCX-FULL-14.03 | schedules | work schedule, external schedule, work type | `npm run lcx:full:people-setup-a:validate` | schedule proof | Schedule rows are configured without payroll claims. |
| LCX-FULL-14.04 | time/leave | time records and leave rule setup | `npm run hrx:ui:validate` | time/leave proof | Time/leave setup is UI/API backed. |
| LCX-FULL-14.05 | browser proof | People setup routes | `node scripts/run-lcx-full-people-setup-browser-proof.mjs` | route proof | People setup rows show configured/tested state. |

### LCX-FULL-15 - People Governance And Admin

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-15.01 | approval types | People approval request types | `npm run lcx:full:people-governance:validate` | approval proof | People approval requests are audited. |
| LCX-FULL-15.02 | permissions | assign/revoke permission flow | `npm run hrx:authz:validate` | authz proof | Permission changes require policy and audit. |
| LCX-FULL-15.03 | field policy | sensitive HR field policy | `npm run hrx:context:validate` | field policy proof | Sensitive fields stay gated. |
| LCX-FULL-15.04 | connected apps | connected app request/provider state | `npm run lcx:full:people-governance:validate` | connected app proof | Provider state is explicit. |
| LCX-FULL-15.05 | browser proof | `?view=people#people-admin` | `node scripts/run-lcx-full-people-governance-browser-proof.mjs` | route proof | Admin actions are guarded and observable. |

### LCX-FULL-16 - People Integrations

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-16.01 | e-contract | People e-contract provider request | `npm run lcx:full:people-integrations:validate` | e-contract proof | Contract send remains provider-gated. |
| LCX-FULL-16.02 | payroll | payroll provider request/preflight | `npm run hrx:workflows:validate` | payroll proof | Payroll calculation/disbursement blocked. |
| LCX-FULL-16.03 | messages | People message provider request | `npm run lcx:full:people-integrations:validate` | message proof | External send stays provider-gated. |
| LCX-FULL-16.04 | company integrations | company integration registry | `npm run lcx:full:people-integrations:validate` | registry proof | Sandbox receipt cannot become production receipt. |
| LCX-FULL-16.05 | browser proof | People integration routes | `node scripts/run-lcx-full-people-integrations-browser-proof.mjs` | route proof | Integration states are visible and fail-closed. |

### LCX-FULL-17 - Global Decision Center

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-17.01 | decision model | global utility owner decision packets | `npm run lcx:global-ia:validate` | decision proof | Calendar/finance/data-import/policies decisions are explicit. |
| LCX-FULL-17.02 | calendar | calendar promotion decision | `npm run lcx:full:global-decisions:validate` | calendar proof | Calendar remains conditional until owner receipt. |
| LCX-FULL-17.03 | finance | finance promotion decision | `npm run lcx:full:global-decisions:validate` | finance proof | Finance remains conditional until owner receipt. |
| LCX-FULL-17.04 | data/policies | data-import and policies promotion decisions | `npm run lcx:full:global-decisions:validate` | data/policies proof | Routes are not permanently promoted without receipt. |
| LCX-FULL-17.05 | audit-required | force decision and advanced settings audit flow | `npm run lcx:full:global-decisions:validate` | audit proof | Audit-required actions require reason and audit. |
| LCX-FULL-17.06 | browser proof | calendar/settings routes | `node scripts/run-lcx-full-global-decisions-browser-proof.mjs` | route proof | Decision/audit states are visible. |

### LCX-FULL-18 - Unified Audit, Receipts, And Reconciliation

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-18.01 | audit ledger | unified audit read model | `npm run runtime-spine:rs3:audit:validate` | audit ledger proof | Guarded actions are searchable and reviewable. |
| LCX-FULL-18.02 | receipts | receipt lookup/export | `npm run lcx:full:audit-receipts:validate` | receipt proof | Approval/provider/run receipts can be exported safely. |
| LCX-FULL-18.03 | reconciliation | run and receipt reconciliation dashboard | `npm run lcx:full:audit-receipts:validate` | reconciliation proof | Missing/stale receipts are flagged. |
| LCX-FULL-18.04 | blocked ledger | blocked action ledger | `npm run lcx:full:audit-receipts:validate` | blocked ledger proof | Blocked attempts are recorded without secrets. |
| LCX-FULL-18.05 | browser proof | audit/export surfaces | `node scripts/run-lcx-full-audit-browser-proof.mjs` | route proof | Audit evidence is visible to reviewers. |

### LCX-FULL-19 - Desktop Runtime And Production Smoke Preflight

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-19.01 | env preflight | desktop/runtime env checker | `npm run matter-desktop:formal-release:validate` | env proof | Missing env blocks cleanly without secret output. |
| LCX-FULL-19.02 | AWS runtime | Matter desktop AWS runtime smoke | `npm run matter-desktop:aws-runtime:smoke` | runtime smoke proof | Runtime is observed or explicitly blocked. |
| LCX-FULL-19.03 | web production smoke | LCX VLTUI production smoke when env exists | `npm run lcx:vltui:production-smoke` | production smoke receipt | Smoke is PASS or blocked by missing env; never inferred. |
| LCX-FULL-19.04 | release guard | release manifest no-public-claim guard | `node scripts/validate-matter-desktop-no-public-release-claim.mjs` | release guard proof | Public/go-live claims remain false. |
| LCX-FULL-19.05 | desktop QA | screen QA and desktop session proof | `npm run matter-desktop:screen-qa` | desktop QA proof | Supervised pilot candidate only. |

### LCX-FULL-20 - Owner Release Decision Packet

| Child TUW | Lane | Planned Files | Test / Validator | Evidence | Exit Gate |
| --- | --- | --- | --- | --- | --- |
| LCX-FULL-20.01 | evidence index | final implementation evidence index | `rg -n "LCX-FULL-00|LCX-FULL-20" docs/lazycodex/evidence` | evidence index proof | Every closed child TUW is linked. |
| LCX-FULL-20.02 | external receipts | external receipt ledger | `npm run launch:external-receipts:validate` | external receipt proof | Missing external receipts are explicit. |
| LCX-FULL-20.03 | go/no-go packet | owner decision packet | `npm run launch:final-go-live-decision:validate` | decision packet proof | Human review packet is complete. |
| LCX-FULL-20.04 | residual risks | residual risk and blocked claim register | `npm run lcx:full:no-premature-claim:validate` | residual risk proof | Remaining false claims are listed. |
| LCX-FULL-20.05 | final review | owner response intake | human owner review | owner receipt or blocked status | Agent cannot close go-live/public release. |

## Coverage Totals

| Parent TUW | Child Count | Required Before Next Parent |
| --- | ---: | --- |
| LCX-FULL-00 | 5 | yes |
| LCX-FULL-01 | 5 | yes |
| LCX-FULL-02 | 5 | yes |
| LCX-FULL-03 | 5 | yes |
| LCX-FULL-04 | 5 | yes |
| LCX-FULL-05 | 5 | yes |
| LCX-FULL-06 | 5 | yes |
| LCX-FULL-07 | 6 | yes |
| LCX-FULL-08 | 6 | yes |
| LCX-FULL-09 | 6 | yes |
| LCX-FULL-10 | 6 | yes |
| LCX-FULL-11 | 5 | yes |
| LCX-FULL-12 | 5 | yes |
| LCX-FULL-13 | 5 | yes |
| LCX-FULL-14 | 5 | yes |
| LCX-FULL-15 | 5 | yes |
| LCX-FULL-16 | 5 | yes |
| LCX-FULL-17 | 6 | yes |
| LCX-FULL-18 | 5 | yes |
| LCX-FULL-19 | 5 | yes |
| LCX-FULL-20 | 5 | yes |
| Total | 110 | all rows required |

## Always-Run Bundle

Run this after every PR slice:

```sh
npm --workspace apps/web run test:ui
npm --workspace apps/web run build
npm run lcx:vltui:closeout:validate
npm run lcx:vltui:action-boundaries:validate
python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed
```

## Completion Checklist

- [ ] Every child TUW has an evidence artifact.
- [ ] Every new `npm run lcx:full:*` command either exists or is explicitly marked planned in the PR body until implemented.
- [ ] Every route proof records disabled/enabled state and boundary state.
- [ ] Every provider/owner/production decision has a receipt or remains blocked.
- [ ] No row claims public release, production go-live, provider production write, or owner approval from agent-generated evidence.
- [ ] Final owner packet distinguishes implementation complete, supervised pilot, production go-live, public release, and store/signing distribution.
