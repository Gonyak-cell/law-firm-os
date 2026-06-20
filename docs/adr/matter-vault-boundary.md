# ADR: Matter-Vault Boundary

Status: Accepted for R4 follow-up hardening
Date: 2026-06-20

## Context
PR #67 merged Matter-Vault R4 integration into the Law Firm OS branch. The follow-up lane closes traceability gaps without collapsing Matter and Vault into one bounded context.

## Decision
Matter owns case execution and stores only Vault references. Vault/DMS owns workspace, folder, document, version, file object, email, search, RAG evidence, and secure-link metadata. Matter never stores document bytes, and Vault never mutates Matter status, task, deadline, or billing state.

## Loop Engineering Contract
Each TUW follows Plan -> Do -> Check -> Act. A TUW is closed only when code or repo-native mapping, tests, evidence, and crosswalk status agree.

## Consequences
- MatterVaultLink remains the canonical bridge.
- APIs return safe projections: no document bytes, raw storage path, raw provider URL, or denied count.
- Launch/go-live approval stays outside repo implementation closeout.
