# G3-C Intake Conflict Schema Report

Status: Proposed
Gate: `G3 Intake-to-Matter Gate`
Slice: `G3-C`
Branch: `codex/lawos-g3-intake-conflict-schema`
TUWs: `LFOS-G3-W04-T001` through `LFOS-G3-W04-T003`

## Scope

G3-C adds synthetic-only schema evidence for IntakeRequest, ConflictCheck, and
ConflictHit. The slice proves required Party references for intake, immutable conflict snapshots, and audited conflict-hit source references while keeping
Matter creation blocked until a later clearance token slice.

This slice does not claim G3 runtime readiness.

## Implemented Surfaces

| Surface | Purpose |
| --- | --- |
| `packages/intake/src/model.js` | Adds G3-C IntakeRequest, ConflictCheck, and ConflictHit model definitions, factories, no-Matter guards, immutable snapshot cloning, and validation helpers. |
| `packages/intake/src/index.js` | Exports the G3-C model layer from the Intake package public entrypoint. |
| `packages/intake/test/client-matter-g3-schema.test.js` | Tests required parties, pre-clearance Matter blocking, immutable snapshot evidence, hit-source audit evidence, and model factory exports. |
| `scripts/validate-client-matter-os-g3-c.mjs` | Validates TUW coverage, report boundary, exported helpers, model behavior, no-write/no-runtime boundaries, and open G3 readiness. |
| `docs/reorganization/client-matter-os/31-g3-c-intake-conflict-schema-report.md` | Records G3-C as the first Intake implementation slice after the CRM G3-A/G3-B slices. |

## TUW Evidence

| TUW | Evidence | Status |
| --- | --- | --- |
| `LFOS-G3-W04-T001` | `createIntakeCoreIntakeRequest()` creates IntakeRequest records requiring `party_ids` and `requesting_party_id`, while rejecting pre-clearance Matter creation. | Proposed |
| `LFOS-G3-W04-T002` | `createIntakeCoreConflictCheck()` clones and deep-freezes Party snapshot evidence so later source mutation cannot alter the conflict-check record. | Proposed |
| `LFOS-G3-W04-T003` | `createIntakeCoreConflictHit()` requires `hit_source`, `source_record_ref`, `matched_party_id`, severity, and `audit_hint_ref` evidence. | Proposed |

## Validation

Expected validation commands:

```sh
npm run client-matter:g3c:validate
npm run client-matter:g3b:validate
npm run client-matter:g3a:validate
npm run client-matter:g3:plan:validate
npm run rp10:intake-core:validate
npm --workspace @law-firm-os/intake run test
npm run validate
```

## Boundary

G3 remains open. G3-C proves Intake and conflict schema evidence only. It does
not execute API handlers, run live conflict search, evaluate runtime permissions,
append audit events, expose conflict memo payloads, create database rows, create
Matter records, issue clearance tokens, close G3 runtime readiness, or merge the
draft PR stack.
