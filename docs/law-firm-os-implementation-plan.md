# Law Firm OS Implementation Plan v0.1

This plan assumes the project starts from a specification and an early UI/product scaffold, not from an existing production codebase.

For the AI-led version of the plan, see `docs/ai-led-law-firm-os-development-plan.md`.

## Directory Responsibilities

```text
/Users/jws/Documents/Codex/Law Firm OS
  Actual product codebase.
  Build product models, UI, API, tests, and validation commands here.

/Users/jws/Documents/Codex/Hermes
  Validation and evidence harness.
  Do not put product source code here.
```

## Product Development Path

### P0.0: Repo Constitution

Status: started.

Goal:

- Keep the product specification as a contract.
- Keep the Jira-like UI scaffold as product UI direction.
- Keep AI tooling policy explicit.

Done when:

- `npm run validate` passes.
- Product contract exists.
- Hermes-facing `hermes/project.json` exists.
- Tooling policy blocks Nous Hermes Agent from production repo access.

### P0.1: Core Domain Contract

Do next.

Build in `packages/domain`:

- Tenant
- User
- Role
- Entity
- Client
- Matter
- MatterMember
- Document
- DocumentVersion
- AuditEvent

Add tests for:

- every DMS object must reference `matter_id`;
- CRM pre-Matter objects may reference `opportunity_id` before Matter conversion;
- Document is owned by DMS, not CRM/Billing/Matter screens;
- Permission and AuditEvent belong to Core;
- Matter must have tenant, client, owner, status, and confidentiality.

### P0.2: Permission And Audit Kernel

Build in `packages/authz` and `packages/audit`:

- RBAC rule shape;
- ABAC rule shape;
- Object ACL;
- Deny Rule;
- security trimming decision;
- audit event append contract.

Add tests for:

- deny overrides allow;
- ethical wall blocks admin-style allow;
- document view/download creates audit event;
- AI retrieval cannot bypass permission scope.

### P0.3: Matter + DMS MVP Skeleton

Build:

- Matter list and detail UI refinement;
- Document workspace UI;
- synthetic fixtures;
- API placeholder routes or local service layer;
- validation command for Matter/DMS contract.

Add tests for:

- Matter workspace folder template;
- DocumentVersion cannot overwrite previous version;
- search results hide unauthorized document names/snippets.

### P0.4: API And Persistence Decision

Only after P0.1-P0.3.

Decide:

- NestJS or FastAPI;
- PostgreSQL schema;
- migration tool;
- test database strategy;
- local dev container.

Do not start billing, settlement, or AI before this layer is stable.

## Hermes Attachment Timing

Hermes attachment starts immediately, but in levels.

### H0: Thin Attachment

Status: already started in this repo.

Hermes reads:

- `hermes/project.json`;
- `contracts/law-firm-os.product-contract.json`;
- `npm run validate`.

Purpose:

- confirm this is a product codebase;
- confirm Matter-first invariants;
- confirm autonomous agent production access is forbidden.

### H1: First Real Attachment

Start when P0.1 is complete.

Required product commands:

```bash
npm run validate
npm test
```

Hermes should record:

- product contract result;
- domain model test result;
- changed files;
- acceptance gates passed/blocked.

This is the first point where Hermes becomes meaningfully useful.

### H2: Build Gate Attachment

Start when the web UI and first domain tests both exist.

Required product commands:

```bash
npm run validate
npm run build
npm test
```

Hermes should check:

- UI builds;
- product contract still passes;
- no sensitive sample data exists;
- synthetic fixtures only.

### H3: Security Gate Attachment

Start when permission, audit, DMS, or AI retrieval code begins.

Hermes should check:

- deny-over-allow tests;
- permission trimming tests;
- audit event tests;
- no production secrets;
- no real client/matter/document data;
- AI outputs require document/version grounding.

### H4: Release Candidate Attachment

Start only after API, DB, UI, tests, and CI exist.

Hermes should produce:

- release readiness packet;
- validation evidence;
- security review checklist;
- human approval checklist.

## Immediate Next Move

Do not expand Hermes beyond H0 yet.

AI should build P0.1 in Law Firm OS first:

```text
packages/domain
  -> core entity definitions
  -> Matter-first invariants
  -> tests
```

Then attach Hermes at H1 by making it run and record `npm run validate` and `npm test`. Claude Code should cross-validate after P0.1 tests pass and before P0.2 permission/audit implementation starts.
