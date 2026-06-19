# Current Folder Inventory

Status: Proposed
Gate: `G0`
TUW: `LFOS-G0-W00-T001`

## Current Repo Surfaces

| Surface | Current role | G0 treatment |
| --- | --- | --- |
| `README.md` | Product framing and validation entrypoint | Keep as root orientation; link to reorganization plan after approval. |
| `contracts/` | Contract-first source of product and module invariants | Inventory and classify; do not move during G0. |
| `packages/` | Module packages, mostly descriptor/registry/validator surfaces | Inventory runtime status; do not mutate behavior during G0. |
| `apps/api/` | Modular API; currently Master Data read surface is live | Treat as runtime-readiness evidence for R3 Master Data read only. |
| `apps/web/` | Operator/product UI | Map screens to target modules; do not rework UI in G0. |
| `workbook/` | Development docs, launch TUW package, generated planning docs | Reference and selectively absorb into canonical docs. |
| `docs/closeout-*` | Historical CP evidence and plan artifacts | Reference-only for this lane; do not rewrite. |
| `docs/ldip-integration/` | Separate LDIP planning lane | Keep separate from Client-Matter OS reorganization. |
| `scripts/` | Generators, validators, closeout, progress, release utilities | Use for validation only unless a later TUW owns script changes. |
| `hermes/` | Validation/governance harness metadata | Keep as external validation boundary. |

## Current GitHub Push Constraint

The local history contains `docs/weighted-implementation-ledger.json`
(`257.62 MB`), which exceeds GitHub's `100 MB` per-file limit. The GitHub PR
flow for this lane uses a sanitized remote snapshot that excludes that file,
without rewriting the local historical repo.

## G0 Evidence Required

- Every top-level folder has an owner or treatment.
- Existing CP closeout evidence remains untouched.
- No runtime package behavior is opened by this inventory.
- Migration is recorded before any future Move, Split, Merge, Rename, or
  Archive action.
