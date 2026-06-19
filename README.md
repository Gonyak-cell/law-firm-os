# Law Firm OS

Law Firm OS is a Matter-first operating platform for law firms. It unifies CRM, Intake, Matter, DMS, Billing, Settlement, Permission, Audit, and AI Governance around shared Client and Matter identities.

## Current Status

This repository starts from the `Law Firm OS 사양명세서 v0.1` dated 2026-06-03.

The first scaffold is intentionally contract-first:

- `contracts/` defines the product contract and invariants.
- `packages/domain/` holds shared domain model definitions.
- `packages/authz/` holds permission and deny-rule concepts.
- `packages/audit/` holds audit event concepts.
- `apps/web/` will become the operator/product UI.
- `apps/api/` will become the modular backend API.
- `hermes/` describes how the Hermes harness should validate this product repo.

## First Product Principle

Every document, email, time entry, expense, invoice, payment, settlement line, and AI retrieval must be traceable to a Matter unless the product contract explicitly defines a pre-Matter object such as Lead or Opportunity.

## Validation

```bash
npm run validate
```

