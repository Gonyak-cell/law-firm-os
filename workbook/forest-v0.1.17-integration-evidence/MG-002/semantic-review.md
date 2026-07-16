# MG-002 Migration Deprecation Enforcement

## Decision

The root 011-016 files are not copied, renumbered, or loaded. MG-001's 71 superseded and 2 rejected contracts are enforced at contract level.

- superseded contracts: 71
- rejected conflicting-mutability contracts: 2
- absent from candidate: 61
- shared keys owned once by canonical Forest 021: 12
- duplicate table/column/index/trigger contracts: 0
- copied root filenames or exact migration hashes: 0
- deprecated runtime symbols: 0

## Preserved canonical truths

1. Payroll profiles remain mutable through audited optimistic state-version updates; root append-only profile triggers stay rejected.
2. Payroll input snapshots remain the single `input_json` and tokenized `source_refs` truth; parallel time snapshot tables stay absent.
3. Leave usage economics remain immutable policy rules plus request/segment snapshots; duplicate mutable usage-unit columns stay absent.
4. Leave lifecycle remains derived from validity dates and immutable reversal ledger entries; mutable status/cancellation columns stay absent.

## Canonical anchors

| Path | Relation | SHA-256 |
|---|---|---|
| `packages/hrx/src/leave/entitlement-lifecycle.js` | BYTE_IDENTICAL | `3e4f29688c3c7997f8cc623cd80a7480fce8fe9a0ebdb7810f597c8486dd96a0` |
| `packages/hrx/src/leave/type-economics.js` | BYTE_IDENTICAL | `119dfc0fec8db4594e9b393159eb72d5ad8ec6f75bb581b612a71b9d920bea31` |
| `packages/hrx/src/migrations/011_hrx_leave_type_economics.sql` | BYTE_IDENTICAL | `1da83c66efe87da337d148e8449ee7524c6e49b0f587bdd8c8ce5a7dee9f5445` |
| `packages/hrx/src/migrations/020_hrx_leave_rule_snapshots.sql` | BYTE_IDENTICAL | `f6248684c210547b833b9beebe260837e7b460bd894987b5759f7a80f533c9b4` |
| `packages/hrx/src/migrations/021_hrx_payroll_runtime.sql` | BYTE_IDENTICAL | `4e5c833fe19a4c5720892f7d17f8058e56585ae6df88b912b5eb30894b9341c6` |
| `packages/hrx/src/payroll/input-snapshot-service.js` | BYTE_IDENTICAL | `4b3b02fa42cd72df0d36b75e54ad1fce769479937b366e586abb5f5f73a88bda` |
| `packages/hrx/src/payroll/repository.js` | BYTE_IDENTICAL | `2f87182d213c63f30d4aa7139b39d6b837535936165f814fbb1ed8f5069ee022` |

## Next gate

MG-003 may add only the 71 `PORT_026_PLUS` contracts through 026-028. The 73 contracts enforced here remain forbidden or Forest-owned.
