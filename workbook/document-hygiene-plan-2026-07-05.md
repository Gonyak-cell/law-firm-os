# Law Firm OS Document Hygiene Plan

Date: 2026-07-05 KST
Scope: `/Users/jws/Documents/Codex/Law Firm OS`
Mode: plan only. No files are deleted, moved, or rewritten by this document.

## Current Snapshot

The project contains two different document classes and they must not be cleaned
with the same rule.

- Human-readable docs visible in the working tree, excluding `.git`,
  `node_modules`, `dist`, and `build`: 4,354 files.
- Tracked doc-like files including Markdown/TXT/CSV/XLSX plus evidence,
  contract, workbook, and artifact JSON: 15,880 files.
- Tracked human-readable docs only: 4,170 files.
- Git last-change check found no tracked doc-like file older than 30 days as of
  2026-07-05. The oldest tracked human-readable files were last changed on
  2026-06-19, so date-only deletion is not appropriate for the current repo.

Largest tracked doc-like areas:

| Area | Count | Initial treatment |
|---|---:|---|
| `artifacts/closeout-pack-claude-review` | 7,827 | Evidence, never delete without manifest proof |
| `docs/closeout-packs` | 4,936 | Evidence, compress/index before any removal |
| `docs/goal-closeout` | 1,025 | Evidence, preserve unless superseded and referenced elsewhere |
| `docs/lazycodex` | 630 | Review for generated/stale operational docs |
| `docs/reorganization` | 586 | Review for superseded planning docs |
| `docs/launch` | 210 | Preserve if tied to launch gates |
| `artifacts/manual-qa` | 118 | Evidence, preserve by default |
| `workbook/enterprise-audit-2026-07` | 23 | Active workbook, preserve |
| `workbook/matter_dev_docs` | 26 | Source specification pack, preserve |

File-type snapshot for human-readable docs:

| Extension | Count |
|---|---:|
| `.md` | 3,442 |
| `.txt` | 892 |
| `.csv` | 17 |
| `.xlsx` | 2 |
| `.docx` | 1 |

## Cleanup Principle

Do not use age alone. In this repo, a two-week-old evidence file may still be
more authoritative than a newly written summary.

Use this order:

1. Preserve source-of-truth documents.
2. Preserve audit, closeout, launch, manual-QA, and production-readiness
   evidence until a manifest proves the evidence is summarized elsewhere.
3. Consolidate superseded planning docs into one index before moving anything.
4. Archive first, delete only after review and reference checks pass.

## Retention Classes

### Keep In Place

These should stay in their current paths unless the owning workflow changes:

- `workbook/enterprise-audit-2026-07/**`
- `workbook/matter_dev_docs/**`
- `workbook/launch-tuw/**`
- `workbook/launch-runtime/**`
- `contracts/**`
- `Law_Firm_OS_Enterprise_SaaS_사양명세서_v2.0.docx`
- `README.md`, `AGENTS.md`, package `README.md` files, and font license files
- `artifacts/manual-qa/**`
- Any file named or referenced by a current ledger, manifest, runbook, validator,
  launch gate, closeout pack, or production-readiness gate

### Index And Compress

These are large enough to need indexing before cleanup:

- `artifacts/closeout-pack-claude-review/**`
- `docs/closeout-packs/**`
- `docs/goal-closeout/**`

Target state:

- One generated inventory CSV under `workbook/document-hygiene/`.
- One summary index per pack family.
- One explicit mapping from each retained evidence pack to the row, tranche,
  issue, or gate it proves.
- Older raw attempts may be archived only when the final review receipt and
  adjudication file are present and reference checks pass.

### Superseded Review Queue

Review these for consolidation into active workbook docs or archive notes:

- `docs/reorganization/**`
- `docs/lazycodex/**`
- `docs/ui-reference/**`
- `docs/spec-v2-integration/**`
- `docs/closeout-pack-plan/**`
- older root-level `docs/rp*-detailed-microphases.*` planning ledgers when a
  later validated ledger or workbook file has absorbed their content

Do not delete immediately. First classify each file as one of:

- `CURRENT`: actively referenced by current implementation, validator, or
  workbook.
- `SOURCE`: original source material that should be retained even if old.
- `SUPERSEDED`: content is covered by a newer file and has no unique evidence.
- `EVIDENCE`: needed to prove a prior validation, review, or approval.
- `ARCHIVE_READY`: not current, not unique source, not evidence, and no inbound
  references.
- `DELETE_READY`: archive exists, owner approval is recorded, and final
  reference check is clean.

### Delete Candidates Only After Approval

These patterns are candidates, not automatic deletion rules:

- `*-invalid-attempt-*.json` when the matching final result exists.
- `raw/*attempt*`, `raw/*wrapper*`, and `raw/*restatement*` when a final review
  receipt and adjudication file exist.
- Duplicate runtime backup folders such as `*-restored` when a manifest proves
  the restored copy is not the only rollback source.
- Generated extraction error reports when a later success summary and source
  manifest exist.
- Empty, zero-byte, or orphaned scratch files.

## Execution Plan

### Phase 0 - Freeze The Boundary

Goal: make cleanup reviewable and reversible.

- Create `workbook/document-hygiene/`.
- Generate `inventory-2026-07-05.csv` with path, extension, size, git last
  change date, top folder, class, and candidate action.
- Generate `summary-2026-07-05.md` with counts by folder, extension, class, and
  candidate action.
- Do not move or remove files in this phase.

Suggested commands:

```bash
git status --short
git ls-files > workbook/document-hygiene/tracked-files-2026-07-05.txt
find . -path './.git' -prune -o -path './node_modules' -prune -o -path './dist' -prune -o -path './build' -prune -o -type f -print > workbook/document-hygiene/working-tree-files-2026-07-05.txt
```

### Phase 1 - Evidence Pack Index

Goal: reduce noise without losing proof.

- Build an index for `docs/closeout-packs/**`, `docs/goal-closeout/**`, and
  `artifacts/closeout-pack-claude-review/**`.
- For each pack, record whether it has `manifest.json`, `adjudication.md`,
  `command-evidence.json`, `construction-inspection.json`, review receipt, and
  raw output.
- Mark packs with complete final evidence as `COMPLETE_EVIDENCE`.
- Mark packs with only raw/invalid attempts as `REVIEW_REQUIRED`.

Exit rule: no pack is moved until the index says whether it proves an active
ledger row, launch gate, or closeout claim.

### Phase 2 - Planning Doc Deduplication

Goal: identify stale plans without deleting institutional memory.

- Compare `docs/reorganization/**`, `docs/lazycodex/**`, root `docs/rp*`, and
  older planning ledgers against active files in `workbook/enterprise-audit-2026-07/`.
- Keep one canonical link from active workbook docs to any retained source plan.
- Mark duplicate or superseded planning docs as `ARCHIVE_READY`, not
  `DELETE_READY`.

Exit rule: every archive-ready planning file has a newer canonical replacement
path recorded in the inventory.

### Phase 3 - Safe Archive Move

Goal: make the repo smaller only after a reversible backup exists.

- Copy archive-ready files to an external backup path such as
  `~/lawos-backups/document-hygiene-2026-07-05/`.
- Preserve paths with `--relative` so restoration is mechanical.
- Commit only the inventory and archive manifest first.
- In a separate cleanup commit, remove approved files from the repo.

Suggested command pattern:

```bash
rsync -a --relative <approved-paths> ~/lawos-backups/document-hygiene-2026-07-05/
```

### Phase 4 - Delete Gate

Goal: avoid breaking audit and launch evidence.

Before any `git rm`, require all of the following:

- The candidate is `DELETE_READY` in the inventory.
- External archive path exists and contains the file.
- `rg -n '<basename-or-id>' docs workbook contracts scripts package.json` has
  no live reference, or the reference is updated to the archive manifest.
- Current validators that read docs/manifests still pass.
- Owner approval is recorded in the cleanup manifest.

Recommended delete commit shape:

- Commit 1: inventory and classification only.
- Commit 2: archive manifest and reference updates.
- Commit 3: actual removals, limited to approved `DELETE_READY` files.

## First Pass Priorities

1. Evidence index for the three large pack families:
   `artifacts/closeout-pack-claude-review`, `docs/closeout-packs`,
   `docs/goal-closeout`.
2. Superseded planning review for `docs/reorganization` and `docs/lazycodex`.
3. Reference UI archive review for `docs/ui-reference` and
   `Law Firm OS UI/reference-ui-archive`.
4. Backup/restored runtime-store review under `artifacts/backups`.
5. Final owner-approved delete batch, only after the archive and reference gates
   pass.

## Initial Recommendation

For the first cleanup tranche, do not delete anything. Produce the inventory and
evidence-pack index first, then target only these low-risk reductions:

- Collapse invalid Claude-review attempts into final-result references where the
  final result exists.
- Move duplicate restored runtime-store backups to external archive if the
  manifest proves another rollback source exists.
- Archive superseded planning docs that have a current workbook replacement.

This keeps the repo audit-safe while creating a concrete deletion queue.
