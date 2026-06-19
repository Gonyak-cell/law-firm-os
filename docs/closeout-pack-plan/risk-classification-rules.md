# Closeout Pack Risk Classification Rules

This plan keeps the existing Law Firm OS G00-G29 / 54,355-unit ledger and the embedded HRX People scope together under one Law Firm OS execution model. The pack plan is generated from `docs/weighted-implementation-ledger.json`; HRX remains embedded scope and must be added to the weighted ledger source before HRX units can be assigned by this generator.

Closeout Pack size is risk-based, not arithmetic. The estimate of about 1,000 packs is an execution estimate, not `55,256 / 1,000`, and not 1,000 units per pack.

Risk class is determined by sensitivity first, then by cohesive unit count. The unit ranges below are sizing guardrails after the sensitivity class is chosen; they are not the sole classification rule. Boundary-sensitive work must use Risk A scrutiny even when its count could otherwise fit Risk B or Risk C.

## Risk A

Risk A packs are small and security-sensitive: 1-10 units per pack.

Use Risk A for permission, audit, tenant/security boundary, payments, settlement, DLP, AI governance, external sharing, approval, unauthorized data, idempotency, lock, persistence boundary, cross-tenant behavior, authz, or access-control work.

For LDIP overlays, Risk A also applies to source connector ownership, catalog owner mapping, matter mapping, migration/backfill label movement, permission-trimmed search, AI access, tool execution, approval workflow, DLP/masking, attorney-secret material, personal information, external share, clean-room query/share, and evidence-bound output approval. If a boundary-sensitive unit set exceeds 10 units, split it into smaller Risk A packs unless the pack is planning-only or evidence-only with no runtime/data boundary and an explicit `override_reason`.

## Risk B

Risk B packs are product-behavior implementation groups: 10-40 units per pack.

Use Risk B for core workflows, APIs, service/domain implementation, state transitions, failure/recovery, typed contracts, and executable behavior that is meaningful but not primarily a sensitive boundary.

## Risk C

Risk C packs are larger planning/evidence/repeated-artifact groups: 40-150 units per pack.

Use Risk C for fixtures, exports, README/docs, repeated validators, Hermes evidence packet work, Claude review packet work, closeout/handoff, planning, inventory, and other repeated or documentary work.

## Overrides

If a real implementation boundary is smaller or larger than the default range, the pack may deviate only with `override_reason`. Live repo state overrides requested queue numbering when the latest committed pack points at a different next open unit.

Examples:

- Historic `CP00-067` is already closed as a 39-unit Risk C planning/evidence/fixture boundary with a phase-terminal override. It is an override-accounting example, not the current next pack. Current cursor must always come from live git plus `next-pack-queue.json`.
- A 12-unit pack touching cross-tenant permission, external share, clean-room query policy, or AI tool approval should be split into Risk A packs unless the work has no runtime/data boundary and records a specific override.

## Matter-Pack, Runtime, M365, And HRX Additive Clauses

Matter-pack absorption artifacts are planning-only until C-MPACK reviews and explicit user admission pass. MAT-DEC-pending or storage-deferred work is Risk A if it can affect runtime data boundaries, even when the immediate artifact is documentary.

The 2026-06-11 absorption landing has a one-time owner waiver for remaining Claude reviews; that waiver is not a future implementation admission and does not weaken later pack review gates.

Runtime `implementation_layer` work at or after CP00-328 is Risk A when it declares `runtime` or `mixed`, because `runtime_ready` is an additive implication gate above production_ready.

M365 runtime decision records remain decision-record-only while `implementation_allowed=false`; any future Graph, Entra token, SharePoint/OneDrive, Smart Alert, or filing runtime pack is Risk A unless split into smaller synthetic descriptor-only evidence.

HRX source extension is embedded inside Law Firm OS. HR sensitive categories including compensation, payroll, candidate, evaluation, leave, attendance, offboarding, and HR AI evidence are Risk A whenever runtime behavior or access boundaries are touched.

Product risk severity in `docs/unified-product-risk-register.*` is not pack `risk_class`; do not translate UPR severity into pack sizing without the sensitivity-first rule above.
