# CMP Stable Implementation Plan

Status: Proposed
Date: 2026-06-19
Scope: Client-Matter-People OS implementation in Law Firm OS

## Goal

Implement the 316-TUW CMP package safely while preserving the older 198-TUW
`LFOS-*` catalog as legacy reference evidence. The CMP package is the active
CMP v1.0 baseline, not a small extension. Each meaningful implementation unit
should have its own GitHub-visible commit and, for runtime work, its own focused
branch or stacked draft PR.

## Stability Principles

1. Preserve the existing `LFOS-*` catalog as legacy reference anchors while the
   CMP v1.0 validator confirms all 316 rows are mapped.
2. Keep planning evidence, descriptor evidence, synthetic evidence, runtime
   evidence, and production launch evidence separate.
3. Require G1 trust foundation evidence before any downstream gate claims R4.
4. Require Opportunity-to-Intake clearance before Matter opening can be treated
   as runtime-ready.
5. Require permission-before-search, permission-before-AI, and
   permission-before-portal for every Vault, AI, and external projection row.
6. Commit and push each meaningful absorption slice so GitHub history shows the
   evolution of the plan, validators, and implementation evidence.

## TUW Batch Order

The implementation order is dependency-based. It intentionally differs from the
source gate order where Matter appears before CRM/Intake conversion.

| Batch | CMP gates | TUWs | Purpose | GitHub history unit |
| --- | --- | ---: | --- | --- |
| `B00` | source intake | 0 | Register source package, hashes, and no-runtime boundary. | Current branch commits for CMP source registration and CMP v1 baseline correction. |
| `B01` | `CMP-G0` | 21 | Freeze glossary, ownership, ADRs, module boundaries, audit taxonomy, API standards, and PR convention. | `codex/lawos-cmp-g0-governance-freeze` or a focused commit stack under this branch. |
| `B02` | `CMP-G1` | 24 | Implement or prove tenant, actor, permission, policy, audit, legal hold, break-glass, safe errors, and negative tests. | `codex/lawos-cmp-g1-trust-foundation-runtime`. |
| `B03a` | `CMP-G2` | 19 | Runtime Party, ClientGroup, Relationship, ContactPoint, BillingProfile, duplicate, merge, split, and Party UI. | `codex/lawos-cmp-g2-party-client-master`. |
| `B03b` | `CMP-G3` | 24 | Runtime User/Employee separation, Employee, capacity, workload, HR-sensitive guardrails, and HRX UI. | `codex/lawos-cmp-g3-people-hrx-runtime`. |
| `B04` | `CMP-G6` | 22 | Runtime CRM, Opportunity, Intake, Conflict, Waiver, Engagement, FeeTerms, and clearance-token gate. | `codex/lawos-cmp-g6-crm-intake-conversion`. |
| `B05` | `CMP-G4` | 23 | Runtime Matter opening, MatterTeam to Employee, task, deadline, status, closeout, and staffing UI. | `codex/lawos-cmp-g4-matter-staffing`. |
| `B06` | `CMP-G5` | 32 | Runtime Vault object, documents, versions, storage adapters, email filing, secure links, search ACL, and AI evidence. | `codex/lawos-cmp-g5-vault-dms-runtime`. |
| `B07` | `CMP-G7` | 26 | Runtime TimeEntry, WIP, PreBill, Invoice, Payment, AR, accounting export, and settlement. | `codex/lawos-cmp-g7-revenue-finance`. |
| `B08a` | `CMP-G8` | 14 | Analytics read models for profitability, utilization, realization, client health, and exports. | `codex/lawos-cmp-g8-analytics-read-models`. |
| `B08b` | `CMP-G9` | 18 | AI policy, retrieval authorization, citation, human review, model routing, and legal workflow controls. | `codex/lawos-cmp-g9-ai-rag-governance`. |
| `B08c` | `CMP-G10` | 17 | Portal, data room, external user separation, projection-only sharing, RFI, and external audit. | `codex/lawos-cmp-g10-portal-data-room`. |
| `B09` | `CMP-G11` | 48 | Client-Matter-People product console and UI state coverage after backend gates have evidence. | `codex/lawos-cmp-g11-ui-console`. |
| `B10` | `CMP-G12` | 28 | Enterprise hardening, SSO/SCIM, observability, migration, UAT, DR, launch, and hypercare. | `codex/lawos-cmp-g12-hardening-launch`. |

## Per-TUW Definition of Done

Every CMP implementation PR must cite the `CMP-*` TUW IDs it covers and include:

| Evidence | Required for R4 claim |
| --- | --- |
| Model/schema or contract update | Yes |
| Durable persistence or explicit migration plan | Yes |
| Write command/API where the task changes state | Yes |
| Tenant/actor/permission context | Yes |
| Durable audit event and event taxonomy row | Yes |
| State transition or idempotency tests when applicable | Yes |
| Negative permission tests for sensitive or cross-tenant data | Yes |
| Evidence artifact path under the relevant docs or package folder | Yes |
| Validator update or new focused validator | Yes |

If a row only updates plans, descriptors, fixtures, UI mock data, or synthetic
cases, its status remains below R4. Such rows must not be described as runtime-write-ready.

## Commit and Push Strategy

Use GitHub history as the inspection surface:

1. Commit source intake separately.
2. Commit crosswalk and implementation sequencing separately.
3. Commit validator and npm script separately.
4. For later runtime work, use one branch per batch and one commit per
   meaningful TUW slice or validator/evidence slice.
5. Push after each meaningful commit when the branch is intended for review.
6. Open draft PRs for stacked review; keep "Not ready" as draft state, not a
   failure signal.

## Branch and PR Rules

| Scope | Branch rule | PR rule |
| --- | --- | --- |
| Planning/crosswalk | `codex/lawos-cmp-tuw-integration-plan` | One draft PR, reviewable as documentation and validator work. |
| Batch implementation | `codex/lawos-cmp-g{n}-{short-name}` | Draft PR per batch, stacked only when dependency requires it. |
| UI console | Separate UI branch after G1-G10 evidence | Must cite backend evidence and UI-state tests. |
| Launch hardening | Separate launch branch | Must not mark go-live complete without launch receipts. |

## Validator Plan

The CMP v1 validator should check:

1. Source intake exists and records 316 TUWs.
2. Crosswalk has exactly 316 data rows.
3. Every `CMP-*` TUW ID is unique.
4. Gate counts match the source package.
5. Every row has an implementation batch, existing LFOS anchor, GitHub history
   unit, runtime claim rule, and a valid `same/expanded/new/reordered/supersedes`
   status.
6. Existing `client-matter:g0:validate` still passes, proving the 198-TUW legacy
   reference remains inspectable while CMP v1 becomes the active implementation
   baseline.

## Runtime Claim Boundary

This plan is not a product-readiness claim. It is an implementation plan. Any future
report that says runtime-ready, pilot-ready, enterprise-ready, production-ready,
R4, R5, or R6 must name the evidence file and the validator output proving that
claim.
