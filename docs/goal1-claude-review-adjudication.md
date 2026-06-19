# Goal 1 Claude Review Adjudication

Required model for authoritative Goal 1 review: `claude-opus-4-8`

Required effort: `max`

## Review Finding Decisions

| Finding | Severity | Decision | Action |
| --- | --- | --- | --- |
| `audit_hint on cross_tenant_deny exposes foreign tenant_id` | P2_SHOULD_FIX | Accepted and fixed | `packages/authz/src/evaluate.js` now uses the principal tenant in audit hints and redacts cross-tenant object ids. |
| `AuditEvent skeleton omits many contract-required fields` | P2_SHOULD_FIX | Accepted and fixed for RP03 foundation | `packages/audit/src/events.js` now requires the contract baseline fields and tests missing required field rejection. |
| `canonicalize only sorts top-level keys` | P3_NOTE | Accepted and fixed | `packages/audit/src/events.js` now recursively sorts object keys before hashing. |
| `Object.freeze on audit event is shallow` | P3_NOTE | Accepted and fixed | Audit events are now deep-frozen, including nested `evidence_refs`. |
| `Permission kernel does not yet emit review_required or approval_required` | P3_NOTE | Accepted, deferred | This needs RP02 decision-policy design. It is deferred to RP02 decision model expansion before RP02 production_ready closeout. |
| `decision_order abac/rbac tiers collapsed into a single role-based allow path` | P3_NOTE | Accepted, deferred | This needs RP02 ABAC policy design. It is deferred to RP02 ABAC/RBAC separation before RP02 production_ready closeout. |
| `Client confidentiality not validated against allowed levels` | P3_NOTE | Accepted and fixed | `packages/domain/src/entities.js` now validates Client confidentiality against `CONFIDENTIALITY_LEVELS`. |
| `No negative domain test for cross-tenant rejection` | P3_NOTE | Accepted and fixed | `packages/domain/test/domain.test.js` now proves cross-tenant Matter/Client rejection. |
| `AuditEvent validates presence but not structure of actor/object` | P3_NOTE | Accepted and fixed | `packages/audit/src/events.js` now validates `actor_id`, `actor_type`, `object_id`, and `object_type`. |
| `conditionally_required_fields not enforced` | P3_NOTE | Accepted and fixed for foundation conditions | `packages/audit/src/events.js` now enforces matter/document/permission/retention conditional baseline fields. |
| `clock_skew_out_of_policy declared but not detected; correction link not hash-protected` | P3_NOTE | Accepted and fixed | `verifyHashChain` now detects clock skew and `correction_of_event_id` is part of the hashed event body. |
| `In-memory ledger is a single global chain, not tenant-partitioned` | P3_NOTE | Accepted, deferred | Goal 1 uses an in-memory foundation ledger. Tenant-partitioned audit query/verify is deferred to RP03 production hardening. |
| `Validator data-count assertions not independently executed` | P3_NOTE | Accepted and externally satisfied | Local npm validation commands are run outside Claude Code's denied Bash environment and recorded in this thread. |
| `Conditional matter_id/document_version_id enforcement narrower than contract` | P2_SHOULD_FIX | Accepted and fixed | Conditional matter/document enforcement now covers Payment, SettlementRun, SecureLink, DataRoom, AIRetrievalSet, and document-version-bearing sources. |
| `Purge guard omits export custody-receipt condition from contract` | P2_SHOULD_FIX | Accepted and fixed | `canPurgeAuditEvent` now blocks purge when a required export custody receipt is missing. |
| `core-domain contract declares ownership of Role and AuditEventReference with no implementation` | P2_SHOULD_FIX | Accepted and fixed | `createRole` and `createAuditEventReference` are implemented and included in the core-domain contract required entity map. |
| `Search trimming ignores object ACLs` | P2_SHOULD_FIX | Accepted and fixed | `trimSearchResults` now accepts object ACLs or an ACL lookup callback and applies ACL deny before display/count exposure. |
| `Audit ledger has no tenant-scoped/permission-trimmed read; global cross-tenant sequence` | P2_SHOULD_FIX | Accepted and fixed for tenant scope | `createAuditLedger` now chains sequence/hash per tenant and supports tenant-scoped list/verify. Permission-trimmed audit query remains deferred to RP03 query surface. |
| `Review runner labels run read-only but grants unrestricted Bash in dontAsk mode` | P2_SHOULD_FIX | Accepted and fixed | Claude Code runner now grants only `Read,Grep,Glob`; local npm command evidence is collected outside the review. |
| `Domain AuditEventReference forces matter_id, conflicting with RP03 conditional model` | P2_SHOULD_FIX | Accepted and fixed | `AuditEventReference` now supports non-matter audit events with `matter_id: null`. |
| `Permission evaluator cannot emit review_required or approval_required` | P2_SHOULD_FIX | Accepted and fixed | `evaluatePermission` now emits `review_required` and `approval_required` from matching governance rules, with test coverage. |
| `Audit ledger read defaults fail-open across tenants` | P2_SHOULD_FIX | Accepted and fixed | `ledger.list()` now requires `tenant_id` or `principal.tenant_id`; tenant-scoped list is tested. |
| `Idempotency key is required but never enforced` | P2_SHOULD_FIX | Accepted and fixed | `createAuditLedger.append()` now enforces tenant-scoped idempotency and returns the existing event for duplicate keys. |
| `Object ACL allow is evaluated before review_required/approval_required policy rules` | P2_SHOULD_FIX | Accepted and fixed | Review/approval governance rules now take precedence over object ACL allow, while object ACL deny still takes precedence. |
| `User PII (email) carried without classification` | P3_NOTE | Accepted, deferred | Domain PII classification is deferred to RP16/RP17 privacy and AI-governance hardening. |
| `ABAC/RBAC collapsed into a single allow step; ethical-wall-by-matter path untested` | P3_NOTE | Accepted, deferred | ABAC/RBAC separation and additional ethical-wall fixtures are deferred to RP02 hardening. |
| `Hash-chain gap reasons coarser than contract taxonomy` | P3_NOTE | Accepted, deferred | More granular missing/duplicate/out-of-order gap taxonomy is deferred to RP03 audit hardening. |
| `Payload privacy policy enforced structurally, not by content scan` | P3_NOTE | Accepted, deferred | Evidence-ref/content scan is deferred to RP03/RP16 privacy hardening. |
| `Permission precedence contract does not match implemented review/approval and abac/rbac handling` | P2_SHOULD_FIX | Accepted and fixed | `permission-kernel-contract.json` now explicitly orders cross-tenant deny, policy deny, ACL deny, review/approval, ACL allow, ABAC/RBAC, and fail-closed. |

## Local Evidence After Adjudication

- `npm test` passed with 23 tests.
- `npm run validate` passed.
- `npm run rp03:audit-architecture:validate` passed.
- Latest Claude Code review used `claude-opus-4-8` with effort `max`.
- Latest Claude Code review has no P0/P1/P2 findings.

## Deferred Item Rule

The deferred P3 item does not block Goal 1 because Goal 1 is a foundation slice. It must not be treated as closed for RP02 production_ready until the evaluator either emits `review_required` / `approval_required` or the permission contract narrows those states for the relevant production scope.
