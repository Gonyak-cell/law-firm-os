# G1 Trust Foundation Entry Plan

Status: Proposed
Gate: `G1 Trust Foundation Gate`
Depends on: `ADR-G0-004`
TUW range: `LFOS-G1-W01-T001` through `LFOS-G1-W01-T016`

## Purpose

G1 turns the Client-Matter OS transition from G0 planning into the first runtime
gate: tenant, actor, permission, and durable audit foundations. This plan opens
the G1 execution lane without claiming G1 runtime readiness.

This plan does not claim G1 runtime readiness. It defines the PR slices,
existing repo surfaces, required runtime evidence, and validation commands that
must be satisfied before G1 can close.

## Existing Evidence

| Surface | Current evidence | G1 treatment |
| --- | --- | --- |
| `contracts/permission-kernel-contract.json` | Permission decision order, required decisions, invariants, and no-write attestations | Reuse as source contract; convert required controls into runtime tests. |
| `contracts/audit-compliance-contract.json` | Append-only audit event contract, required fields, hash-chain requirements, privacy policy | Reuse as source contract; implement durable audit write/read evidence. |
| `packages/authz/README.md` | Permission package documents RBAC, ABAC, Object ACL, Deny Rule, security trimming, and synthetic closeout packs | Treat existing pack evidence as descriptors until runtime tests prove readiness. |
| `packages/audit/README.md` | Audit package documents append-only, synthetic-only readiness and review closeout packs | Treat existing pack evidence as descriptors until durable event append exists. |
| `scripts/validate-rp02-permission-kernel-contract.mjs` | Existing RP02 permission contract validator | Keep as supporting evidence, not a replacement for G1 runtime validation. |
| `scripts/validate-rp03-audit-architecture.mjs` | Existing RP03 audit architecture validator | Keep as supporting evidence, not a replacement for G1 runtime validation. |

## Runtime Evidence Still Required

G1 cannot close until the following evidence exists in implementation PRs:

1. Tenant boundary rejects missing, mismatched, or cross-tenant context.
2. Actor context rejects missing actor identity and unauthorized actor type.
3. Permission context is persisted or otherwise durable enough to bind audit
   events to a decision.
4. Audit events append to a durable, append-only record with tenant, actor,
   action, object, outcome, decision, and hash-chain fields.
5. Permission evaluator returns `allow`, `deny`, `review_required`, and
   `approval_required`.
6. Deny-over-allow behavior is covered by regression tests.
7. Object ACL, ethical wall, legal hold, and break-glass controls have explicit
   fail-closed test cases.
8. Audit export and hash-chain verification have tenant-scoped tests.
9. Admin permission simulator cannot grant access or bypass audit.
10. `LFOS-G1-W01-T016` closeout records command output, PR state, and human
   review disposition.

## PR Slice Plan

| Slice | TUWs | Target branch | Scope | Exit evidence |
| --- | --- | --- | --- | --- |
| G1-A | `LFOS-G1-W01-T001`-`LFOS-G1-W01-T003` | `codex/lawos-g1-tenant-actor-context` | Tenant boundary, actor context, permission context shape | Missing tenant/actor fail-closed tests and interface docs. |
| G1-B | `LFOS-G1-W01-T004`-`LFOS-G1-W01-T006` | `codex/lawos-g1-durable-audit-entry` | AuditEvent schema, write middleware, sensitive read audit | Append-only write test and sensitive read audit test. |
| G1-C | `LFOS-G1-W01-T007`-`LFOS-G1-W01-T012` | `codex/lawos-g1-permission-controls` | Evaluator API, deny-over-allow, ObjectACL, ethical wall, legal hold, break-glass | Allow/deny/review/approval routing plus fail-closed control tests. |
| G1-D | `LFOS-G1-W01-T013`-`LFOS-G1-W01-T016` | `codex/lawos-g1-audit-closeout` | Hash-chain verification, audit export, admin simulator, G1 closeout | Tenant-scoped export, tamper detection, simulator, and closeout evidence. |

## TUW Coverage

| TUW | Work | Required evidence |
| --- | --- | --- |
| `LFOS-G1-W01-T001` | tenant boundary middleware design | Missing or mismatched `tenant_id` fails closed. |
| `LFOS-G1-W01-T002` | actor context schema implementation | Missing actor returns 401/403. |
| `LFOS-G1-W01-T003` | permission context persistence design | Header-only trust is removed or bounded by fail-closed tests. |
| `LFOS-G1-W01-T004` | durable audit event schema implementation | Append-only migration or persistence test. |
| `LFOS-G1-W01-T005` | audit middleware implementation | Write routes append audit events. |
| `LFOS-G1-W01-T006` | sensitive read audit implementation | Document, conflict, and billing reads emit audit. |
| `LFOS-G1-W01-T007` | permission evaluator API wrapper | `/permissions/evaluate` returns allow, deny, review, approval. |
| `LFOS-G1-W01-T008` | deny-over-allow regression test | Deny rule wins over allow rule. |
| `LFOS-G1-W01-T009` | object ACL baseline implementation | Object allow and deny tests. |
| `LFOS-G1-W01-T010` | ethical wall model implementation | Blocked user cannot list matter. |
| `LFOS-G1-W01-T011` | legal hold model implementation | Held document delete is blocked. |
| `LFOS-G1-W01-T012` | break-glass flow design | Reason, approval, and audit are required. |
| `LFOS-G1-W01-T013` | audit hash-chain verification implementation | Tamper detection test. |
| `LFOS-G1-W01-T014` | audit export API implementation | Tenant-scoped export test. |
| `LFOS-G1-W01-T015` | admin permission simulator | User/object access simulation without granting access. |
| `LFOS-G1-W01-T016` | G1 trust foundation closeout | Durable audit and permission gate evidence. |

## Entry Validation

```sh
npm run client-matter:g0:validate
npm run client-matter:g1:plan:validate
npm run rp02:permission-kernel:validate
npm run rp03:audit:validate
npm run validate
```

The G1 plan validator confirms that all 16 G1 TUWs are represented, that the
permission and audit contracts expose the required control primitives, and that
this plan keeps the runtime-readiness claim open.

## Gate Boundary

G1 remains open until implementation PRs provide runtime tests and closeout
evidence for every G1 TUW. Planning artifacts, descriptor catalogs, synthetic
fixtures, and contract validators are entry evidence only.

Planning artifacts, descriptor catalogs, synthetic fixtures, and contract validators are entry evidence only.
