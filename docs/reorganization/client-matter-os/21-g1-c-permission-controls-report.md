# G1-C Permission Controls Report

Status: Proposed
Gate: `G1 Trust Foundation Gate`
Slice: `G1-C`
Branch: `codex/lawos-g1-permission-controls`
TUWs: `LFOS-G1-W01-T007` through `LFOS-G1-W01-T012`

## Scope

G1-C adds the first Client-Matter OS permission-control wrapper around the
existing authorization evaluator. It keeps the evaluator package-local and
testable while representing the future `/permissions/evaluate` API contract.

Implemented surfaces:

- `packages/authz/src/permission-controls.js`
- `packages/authz/src/index.js`
- `packages/authz/test/authz.test.js`
- `packages/authz/README.md`
- `scripts/validate-client-matter-os-g1-c.mjs`

## TUW Evidence

| TUW | Evidence |
| --- | --- |
| `LFOS-G1-W01-T007` | `evaluatePermissionControlRequest()` returns route-stable `/permissions/evaluate` receipts for `allow`, `deny`, `review_required`, and `approval_required`. |
| `LFOS-G1-W01-T008` | Deny-over-allow regression keeps explicit deny rules ahead of allow rules and Object ACL allow entries. |
| `LFOS-G1-W01-T009` | Object ACL allow and deny entries are normalized and tested through the wrapper. |
| `LFOS-G1-W01-T010` | Ethical wall controls add matter-scoped deny rules so a blocked user cannot list the protected matter. |
| `LFOS-G1-W01-T011` | Legal hold controls deny held document delete/disposal actions even when normal allow inputs exist. |
| `LFOS-G1-W01-T012` | Break-glass access requires reason, approval, and audit metadata before an allow candidate is added. |

## Validation

Expected validation commands:

```sh
npm run client-matter:g1c:validate
npm --workspace @law-firm-os/authz run test
npm run client-matter:g1:plan:validate
npm run client-matter:g1a:validate
npm run client-matter:g1b:validate
npm run client-matter:g0:validate
npm run rp02:permission-kernel:validate
npm run validate
```

## Boundary

G1 remains open. This slice does not claim runtime readiness, does not create a
network route, does not persist permission decisions, and does not close audit
export, hash-chain verification, admin simulator, or G1 closeout evidence. Those
remain in G1-D.
