# CP00-177 Entry Brief For v2 SaaS Spine

작성일: 2026-06-09

상태: planning-only entry brief. 이 문서는 `CP00-177` / `RP05 Matter Core` 진입 세션이 v2 앵커맵을 빠르게 소비하기 위한 짧은 브리프다.

## 1. Why CP00-177 Matters

`CP00-177` starts `RP05 Matter Core`. This is the first point where the v2 SaaS spine can be shaped without disrupting the current `CP00-145-CP00-176` audit/master-data work.

The key rule: RP05 should not implement all v2 features. It should create stable product boundaries that later RP06/RP07/RP08/RP17/RP24/RP26 can rely on.

## 2. Mandatory Pre-Read

- `docs/spec-v2-integration/v2-missing-requirements-spec.md`
- `docs/spec-v2-integration/v2-source-index.md`
- `docs/spec-v2-integration/v2-rp-anchor-map.md`
- `docs/spec-v2-integration/v2-gap-adjudication.md`
- `docs/spec-v2-integration/v2-no-omission-coverage-matrix.md`
- `docs/spec-v2-integration/v2-overlay-closeout-pack-map.json`

## 3. CP00-177 Must Preserve

| Concept | CP00-177 expectation | Deferred to |
| --- | --- | --- |
| MatterWiki | define as first-class Matter knowledge workspace, not a note | RP06/RP07/RP17/RP18 for source/citation/AI use |
| MatterGraph | define provider-neutral skeleton and vocabulary | RP06/RP07/RP08/RP17/RP24 for full graph data |
| CitationLedger | reserve source-anchor dependency and references | RP06 for first real ledger implementation |
| Permission trimming | keep hidden sections/nodes/labels impossible by contract | RP02/RP03/RP16/RP17 validators |
| Human review | do not let AI-generated wiki/graph facts become confirmed automatically | RP17/RP18 |

## 4. CP00-177 Must Not Do

- Do not implement Neo4j-specific runtime before graph-provider contract exists.
- Do not treat Matter Wiki as free-form Matter Note.
- Do not create client-visible wiki output without permission and review state.
- Do not implement Citation Ledger inside RP05 unless the planned CP explicitly includes it.
- Do not implement Local AI Worker or hybrid routing in RP05.
- Do not mutate `CP00-145-CP00-176` evidence or staged files.

## 5. First Contract Questions

Before RP05 code starts, answer these in the CP00-177 manifest or design brief:

1. What is the stable ID shape for `MatterWiki`?
2. Which Matter events create or update a wiki shell?
3. Which Matter fields can later link to `CitationLedgerEntry` without schema churn?
4. What minimum graph node types are owned by RP05?
5. Which graph node labels are internal-only by default?
6. What review state is required before wiki text can become client-visible?
7. How will RP05 avoid implying that graph view output is legal authority?

## 6. Suggested CP00-177 Acceptance Gate

CP00-177 should be considered safe only if it can state:

- Matter Core owns `Matter` and the initial `MatterWiki` shell.
- Matter Core can expose graph skeleton references without provider/runtime dependency.
- Matter Core leaves immutable reference points for later DMS citation and search retrieval work.
- Matter Core does not expose internal wiki or graph data to client-visible surfaces.
- Matter Core does not claim v2 implementation completion; it only starts the spine.
