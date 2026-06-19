# CMP-G1 Trust Foundation Runtime Report

Status: Implemented runtime API evidence; durable production persistence remains open
Date: 2026-06-20

## Scope

This report records the first implemented CMP v1.0 runtime slice for
`CMP-G1-W01 Trust Foundation`. It replaces planning-only evidence for these
rows with executable API behavior in `apps/api`, backed by the existing
`packages/authz` permission kernel and `packages/audit` append-only audit
ledger.

This is not an R4 completion claim. The implemented runtime stores policies,
ACLs, ethical walls, legal holds, permission contexts, decision receipts, and
audit events in the API process. A durable production backing store is still
required before this slice can claim full runtime write readiness.

## TUWs Covered

`CMP-G1-W01-T001`, `CMP-G1-W01-T002`, `CMP-G1-W01-T003`,
`CMP-G1-W01-T004`, `CMP-G1-W01-T005`, `CMP-G1-W01-T006`,
`CMP-G1-W01-T007`, `CMP-G1-W01-T008`, `CMP-G1-W01-T009`,
`CMP-G1-W01-T010`, `CMP-G1-W01-T011`, `CMP-G1-W01-T012`,
`CMP-G1-W01-T013`, `CMP-G1-W01-T014`, `CMP-G1-W01-T015`,
`CMP-G1-W01-T016`, `CMP-G1-W01-T017`, `CMP-G1-W01-T018`,
`CMP-G1-W01-T019`, `CMP-G1-W01-T020`, `CMP-G1-W01-T021`,
`CMP-G1-W01-T022`, `CMP-G1-W01-T023`, `CMP-G1-W01-T024`

## Implemented Files

| File | Runtime role |
| --- | --- |
| `apps/api/src/trust-foundation-runtime.js` | CMP-G1 API runtime, in-process state, permission decision receipts, audit event append, bounded-context descriptor. |
| `apps/api/src/server.js` | Routes CMP-G1 paths through the API server and exposes the trust-foundation bounded context in `/api/health`. |
| `packages/authz/src/trust-context.js` | Allows CMP service-principal actors in the existing fail-closed actor taxonomy. |
| `apps/api/test/cmp-g1-trust-foundation-api.test.js` | In-process API coverage for allow, deny, cross-tenant fail-closed, policy, ACL, ethical wall, legal hold, break-glass, service principal, sensitive read audit, export, and hash-chain verification. |
| `scripts/validate-client-matter-os-cmp-g1-runtime.mjs` | Static validator that guards TUW traceability, route coverage, test coverage, and no premature R4 claim. |

## Runtime Routes

| Route | Methods | Evidence intent |
| --- | --- | --- |
| `/permissions/evaluate` | `POST` | Permission decision, receipt, permission context, audit event. |
| `/admin/permission-simulator` | `POST` | Stored-policy simulator with explicit simulator receipt flag. |
| `/permissions/contexts` | `GET` | Tenant-scoped permission-context export. |
| `/admin/policies` | `GET`, `POST` | Tenant-scoped policy storage and listing. |
| `/object-acl` | `GET`, `POST` | Tenant-scoped object ACL storage and listing. |
| `/admin/ethical-walls` | `GET`, `POST` | Ethical wall fail-closed controls. |
| `/admin/legal-holds` | `GET`, `POST` | Legal hold fail-closed controls. |
| `/audit/sensitive-read` | `POST` | Sensitive-read audit receipt bound to a permission decision. |
| `/audit/events/export` | `GET` | Tenant-scoped audit event export. |
| `/audit/verify` | `GET` | Tenant-scoped audit hash-chain verification. |

## Guardrails

- Deny-over-allow remains enforced by `packages/authz/src/evaluate.js`.
- Cross-tenant access fails closed before allow rules can match.
- Stored policies, object ACLs, ethical walls, and legal holds are filtered to
  the evaluated tenant before decision logic runs.
- Break-glass access requires reason, approval, and audit intent.
- Sensitive reads require a permission decision id.
- Audit events use the existing append-only hash-chain ledger.
- The exposed readiness string is
  `runtime_api_evidence_only__durable_persistence_open`; this intentionally
  avoids an R4 claim until durable persistence evidence exists.

## Verification

Required commands:

```bash
npm run client-matter:cmp-v1:validate
npm run client-matter:cmp-g1:validate
npm --workspace apps/api run test
```
