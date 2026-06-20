# ADR-CMP-R4-003: BillingProfile Ownership

Status: Proposed
Date: 2026-06-20

## Context

BillingProfile is shared by Party Master, Billing, Invoice, and Finance. Duplicate client billing copies would break conflict and accounting evidence.

## Decision

Party Master owns BillingProfile identity and references. Billing owns downstream billing workflow state, invoice state, payment matching, and AR state.

## Consequences

- BillingProfile validates legal client versus billing client references.
- Billing cannot create duplicate canonical Party or BillingProfile records.
