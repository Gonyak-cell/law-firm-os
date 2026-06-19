# Runtime Gate Layer

Status: additive governance policy. This document does not change `production_ready`, does not reopen closed packs, and does not authorize runtime implementation by itself.

## Vocabulary

`production_ready` remains the existing closeout-pack status and completion claim. `runtime_ready` is a new boolean implication gate used only when a pack declares `implementation_layer` as `runtime` or `mixed` after the MAT-DEC-07 boundary. A true `runtime_ready` claim means production_ready plus the existing pack checks plus RTG-001 through RTG-005. It is not a replacement status.

Boundary: `CP00-328`, calculated from live latest `CP00-326 + 2` at this backlog execution start. Packs before the boundary are derived in `implementation-layer-ledger.json` and are not edited.

## CG To RTG Translation

| Plan A CG | RTG | runtime_ready requirement |
|---|---|---|
| CG-002 | RTG-001 functional | Tests execute exported runtime function or service paths, not only constants or descriptors. |
| CG-003 | RTG-002 permission | Runtime actions exercise fail-closed authz decisions. |
| CG-004 | RTG-003 audit | Mutating runtime actions append audit evidence and verify the expected audit path. |
| CG-005 | RTG-004 security | Synthetic sandbox attestation is complete: no real data, no credentials, no product writes. |
| CG-006 | RTG-005 regression | The closeout records npm test, validators, and full closeout-pack sweep results. |

CG-001 maps to existing production_ready. CG-007 maps to implementation-layer ledger regeneration. CG-008 remains covered by the existing read-only Claude review and human adjudication process.

## Non-Weakening Argument

1. Closed packs are not edited; all pre-boundary layer labels are derived.
2. Boundary-or-later packs get an additional required field, so the validation set is a superset.
3. `runtime_ready` cannot bypass `production_ready`; it implies it.
4. `undeclared_legacy` prevents retroactive runtime claims for old descriptor or legacy packs.

## M365 Contract Relationship

`contracts/email-dms-m365-runtime-contract.json` is a decision-record-only contract. Future M365 runtime packs must satisfy both that M365 admission gate and `contracts/runtime-readiness-contract.json` RTG-001 through RTG-005. Runtime vocabulary is owned by MAT-DEC-07, so M365 does not introduce a separate runtime verification naming system.

## Operational Outputs

- `contracts/runtime-readiness-contract.json`
- `scripts/validate-runtime-readiness-contract.mjs`
- `scripts/generate-implementation-layer-ledger.mjs`
- `scripts/validate-implementation-layer-ledger.mjs`
- `scripts/validate-runtime-readiness.mjs`
- `docs/closeout-pack-plan/implementation-layer-ledger.json`
- `docs/closeout-pack-plan/implementation-layer-ledger.md`
