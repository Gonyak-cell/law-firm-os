# Goal 1 Claude Review Followups

Source: `docs/claude-review-results/goal1-claude-review.json`

Latest adjudicated verdict: `PASS_WITH_FINDINGS`

Goal 1 closeout blocked: `false`

## Required Followups

| Severity | Finding | Owner RP | Target Subphase | Closeout Rule |
| --- | --- | --- | --- | --- |
| P2_SHOULD_FIX | `audit_hint on cross_tenant_deny exposes foreign tenant_id` | RP02 Permission Kernel | Fixed in Goal 1 adjudication | `packages/authz/src/evaluate.js` redacts cross-tenant object ids and records the principal tenant. |
| P2_SHOULD_FIX | `AuditEvent skeleton omits many contract-required fields` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | `packages/audit/src/events.js` validates the audit contract baseline fields. |
| P3_NOTE | `canonicalize only sorts top-level keys` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | `packages/audit/src/events.js` uses recursive canonicalization. |
| P3_NOTE | `Object.freeze on audit event is shallow` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | Audit events and nested evidence refs are deep-frozen. |
| P3_NOTE | `Permission kernel does not yet emit review_required or approval_required` | RP02 Permission Kernel | Deferred to RP02 decision model expansion | Add non-allow/non-deny decision states or narrow the current foundation contract before RP02 production_ready. |
| P3_NOTE | `decision_order abac/rbac tiers collapsed into a single role-based allow path` | RP02 Permission Kernel | Deferred to RP02 ABAC/RBAC separation | Add ABAC predicate support before RP02 production_ready. |
| P3_NOTE | `In-memory ledger is a single global chain, not tenant-partitioned` | RP03 Audit And Compliance Kernel | Deferred to RP03 tenant-scoped audit hardening | Add tenant-partitioned sequence/query/verify before RP03 production_ready. |
| P2_SHOULD_FIX | `Conditional matter_id/document_version_id enforcement narrower than contract` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | Conditional audit fields now cover broader billing/settlement/client-portal/data-room/AI retrieval objects. |
| P2_SHOULD_FIX | `Purge guard omits export custody-receipt condition from contract` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | Purge now requires export custody receipt when required by policy. |
| P2_SHOULD_FIX | `core-domain contract declares ownership of Role and AuditEventReference with no implementation` | RP01 Core Domain Foundation | Fixed in Goal 1 adjudication | Role and AuditEventReference constructors now exist and are contract-listed. |
| P2_SHOULD_FIX | `Search trimming ignores object ACLs` | RP02 Permission Kernel | Fixed in Goal 1 adjudication | Search trimming now passes object ACLs into permission evaluation. |
| P2_SHOULD_FIX | `Audit ledger has no tenant-scoped/permission-trimmed read; global cross-tenant sequence` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication for tenant scope | Audit ledger now uses tenant-scoped chain/list/verify; full permission-trimmed query remains RP03 query hardening. |
| P2_SHOULD_FIX | `Review runner labels run read-only but grants unrestricted Bash in dontAsk mode` | RP00 Product Constitution | Fixed in Goal 1 adjudication | Claude review runner grants only read/search tools. |
| P2_SHOULD_FIX | `Domain AuditEventReference forces matter_id, conflicting with RP03 conditional model` | RP01 Core Domain Foundation | Fixed in Goal 1 adjudication | AuditEventReference can represent non-matter audit events. |
| P2_SHOULD_FIX | `Permission evaluator cannot emit review_required or approval_required` | RP02 Permission Kernel | Fixed in Goal 1 adjudication | Permission evaluator can now return review and approval decisions. |
| P2_SHOULD_FIX | `Audit ledger read defaults fail-open across tenants` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | Audit ledger list now requires tenant scope. |
| P2_SHOULD_FIX | `Idempotency key is required but never enforced` | RP03 Audit And Compliance Kernel | Fixed in Goal 1 adjudication | Audit append now enforces tenant-scoped idempotency keys. |
| P2_SHOULD_FIX | `Object ACL allow is evaluated before review_required/approval_required policy rules` | RP02 Permission Kernel | Fixed in Goal 1 adjudication | Review/approval governance rules now override object ACL allow. |
| P3_NOTE | `User PII (email) carried without classification` | RP16/RP17 Privacy and AI Governance | Deferred | Add domain field classification before privacy/AI production surfaces. |
| P3_NOTE | `ABAC/RBAC collapsed into a single allow step; ethical-wall-by-matter path untested` | RP02 Permission Kernel | Deferred | Add ABAC/RBAC separation and ethical-wall fixtures before RP02 production_ready. |
| P3_NOTE | `Hash-chain gap reasons coarser than contract taxonomy` | RP03 Audit And Compliance Kernel | Deferred | Split missing/duplicate/out-of-order sequence reason codes before RP03 production_ready. |
| P3_NOTE | `Payload privacy policy enforced structurally, not by content scan` | RP03/RP16 Audit and Privacy | Deferred | Add evidence-ref/content scanning before production audit export surfaces. |
| P2_SHOULD_FIX | `Permission precedence contract does not match implemented review/approval and abac/rbac handling` | RP02 Permission Kernel | Fixed in Goal 1 adjudication | Permission contract now documents the split ACL/review/approval precedence. |

## Current Evidence

- Actual Claude Code review must use `claude-opus-4-8` with effort `max`.
- C00 verdict: `PASS`
- C01 verdict: `PASS`
- C02 verdict: `PASS_WITH_FINDINGS`
- C03 verdict: `PASS_WITH_FINDINGS`
- No P0/P1 findings remain.
- Claude Code Bash execution was denied inside its review environment, so local Hermes/npm command evidence must be used for command execution proof.
