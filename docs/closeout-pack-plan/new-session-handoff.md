# Law Firm OS New Session Handoff

This document is for a completely new Codex account/session with no prior chat
memory. Treat the repository, git history, and this handoff as the only context.

Current live cursor snapshot:
- Workspace: `/Users/jws/Documents/Codex/Law Firm OS`
- Refreshed at: 2026-06-08 10:33 KST
- Latest committed closeout pack observed: `CP00-082`
- Next planned pack in repo plan: `CP00-083`
- `CP00-083` plan: Risk B, 15 units,
  `RP00.P07.M03.S20-RP00.P07.M04.S14`
- Latest plan tail observed: `CP00-1253`
- Dirty files observed when this handoff was refreshed:
  - untracked `.DS_Store`
  - untracked `docs/.DS_Store`
  - untracked `Law Firm OS UI/`
  - untracked `docs/ldip-integration/claude-review-results/c-ldip-01-invalid-attempt-01.json`

Important: this snapshot can still become stale. Always verify live repo state
first. If any goal card, memory note, or older handoff mentions `CP00-066`,
`CP00-067`, or any pack lower than the latest committed CP, treat that text as
historical context only and follow live git plus `next-pack-queue.json`.

## Big Picture

Law Firm OS is being implemented through evidence-backed Closeout Packs.

Expanded product goal:
- Existing Law Firm OS plan: 54,355 implementation units
- Embedded HRX / People / HR Evidence addition: 901 units
- Expanded total: 55,256 units

Unit definition:
- A unit means an `implementation_subphase` from `docs/weighted-implementation-ledger.json`.
- Example unit id: `RP00.P05.M05.S11`.
- HRX is not a separate product. It is embedded inside Law Firm OS as People / HR Evidence capability.

Do not run this as 55,256 isolated closeouts. The work is run through risk-based
Closeout Packs.

Pack definition:
- A Closeout Pack is a planned group of included units.
- Pack-level artifacts, validation, Claude review, adjudication, inspection, and
  commit are required before declaring production_ready.
- The phrase "about 1,000 packs" does not mean 1,000 units per pack.
- Pack sizing is risk-based and must follow the repository plan.

## Source Of Truth

Read these files before making changes:

- `docs/weighted-implementation-ledger.json`
- `docs/closeout-pack-plan/closeout-pack-plan.json`
- `docs/closeout-pack-plan/next-pack-queue.json`
- `docs/closeout-pack-plan/risk-classification-rules.md`
- `scripts/generate-closeout-pack-plan.mjs`
- `scripts/validate-closeout-pack-plan.mjs`
- `scripts/validate-closeout-pack.mjs`
- latest `docs/closeout-packs/cp00-XXX/manifest.json`

The repo plan, not prior chat memory, is the execution source of truth.

## Stale Context Rule

Do not spend time reconciling old chat memory, old goal text, or old handoff
text that points behind the live cursor.

Priority order:

1. `git log --grep='^Close CP00'` latest committed pack
2. latest validated pack manifest under `docs/closeout-packs/`
3. `docs/closeout-pack-plan/next-pack-queue.json`
4. `docs/closeout-pack-plan/closeout-pack-plan.json`
5. this handoff document
6. older memory or `/goal` prose

If `/goal` says something like "CP00-066 complete / CP00-067 next" but git says
`CP00-082` is complete, do not analyze the old `/goal` wording. State that the
goal text is stale, then continue from `next-pack-queue.json`.

## First Commands

Run these before deciding what to do:

```bash
git status --short
git log --all --format='%h %aI %s' --grep='^Close CP00' -n 40
npm run closeout-pack-plan:validate
npm run closeout-pack:validate
```

Then inspect the latest pack:

```bash
latest=$(find docs/closeout-packs -maxdepth 2 -name manifest.json | sort | tail -1)
printf '%s\n' "$latest"
node -e 'const fs=require("fs"); const p=process.argv[1]; console.log(JSON.stringify(JSON.parse(fs.readFileSync(p,"utf8")), null, 2));' "$latest"
```

If the latest committed pack differs from the latest manifest, trust git plus
validated evidence. Investigate before continuing.

## Dirty Worktree Protocol

Assume dirty files belong to an active or interrupted prior session.

Do:
- Read `git status --short`.
- Read relevant diffs.
- Identify whether dirty files are part of the next planned pack.
- Continue from a safe atomic boundary.
- Preserve all user/prior-session changes.

Do not:
- `git reset --hard`
- `git checkout -- <file>`
- delete untracked directories
- overwrite dirty files without reading them
- create a new pack that ignores active changes

If dirty files appear to be work for the next planned pack, finish or safely
close that pack rather than starting the following pack.

## Current Queue

At the 2026-06-08 10:33 KST refresh, the live plan queue began:

- `CP00-083`: Risk B, 15 units, `RP00.P07.M03.S20-RP00.P07.M04.S14`
- `CP00-084`: Risk A, 10 units, `RP00.P07.M05.S01-S10`
- `CP00-085`: Risk A, 10 units, `RP00.P07.M05.S11-S20`
- `CP00-086`: Risk C, 11 units, `RP00.P07.M06.S01-S11`, override: isolated synthetic fixture pack
- `CP00-087`: Risk B, 20 units, `RP00.P07.M07.S01-S20`
- `CP00-088`: Risk C, 56 units, `RP00.P07.M08.S01-RP00.P08.M04.S11`
- `CP00-089`: Risk A, 10 units, `RP00.P08.M05.S01-S10`
- `CP00-090`: Risk A, 1 unit, `RP00.P08.M05.S11`
- `CP00-091`: Risk C, 61 units, `RP00.P08.M06.S01-RP00.P09.M04.S05`
- `CP00-092`: Risk A, 10 units, `RP00.P09.M05.S01-S10`
- `CP00-093`: Risk A, 1 unit, `RP00.P09.M05.S11`
- `CP00-094`: Risk C, 24 units, `RP00.P09.M06.S01-RP00.P09.M10.S01`, override: RP00 terminal closeout C pack

Do not trust this static list blindly. Re-read `next-pack-queue.json` because
future commits can shift the queue.

## Risk Classes

Risk A:
- Permission, audit, tenant/security boundary, payments, settlement, DLP, AI,
  external sharing, approval, unauthorized data, idempotency, lock, persistence
  boundary, high-sensitivity human or customer impact.
- Default size: 1-10 units per pack.

Risk B:
- Core workflows, APIs, service/domain implementation, state transitions,
  failure/recovery.
- Default size: 10-40 units per pack.

Risk C:
- Fixtures, exports, README/docs, repeated validators, Hermes evidence packet,
  Claude review packet, closeout/handoff, planning/inventory.
- Default size: 40-150 units per pack.

Out-of-range packs are allowed only with explicit `override_reason` or
`deviation_from_plan` fields.

## Pack Artifacts

Every completed pack needs:

- `docs/closeout-packs/cp00-XXX/manifest.json`
- `docs/closeout-packs/cp00-XXX/command-evidence.json`
- `docs/closeout-packs/cp00-XXX/claude-review-result.json`
- `docs/closeout-packs/cp00-XXX/adjudication.md`
- `docs/closeout-packs/cp00-XXX/construction-inspection.json`

Manifest plan linkage must include:

- `planned_pack_id`
- `planned_risk_class`
- `planned_unit_count`
- `plan_ref`
- `deviation_from_plan`

Included unit rows should reference the pack evidence and mark each unit
production_ready only after all gates pass.

## Required Gates

For each pack:

1. implementation
2. tests
3. Hermes evidence
4. Claude Opus 4.8 max read-only review exactly once for the pack
5. finding adjudication
6. construction inspection
7. included units production_ready
8. commit

Do not declare production_ready without pack-level review, adjudication, and
inspection.

## Validation Commands

Use the narrow commands first, then broader ones as needed:

```bash
npm run closeout-pack-plan:validate
npm run closeout-pack:validate
npm run cp00:validate
npm run rp00:control-plane:validate
npm run weighted:validate
npm run goal:closeout:validate
npm run spec:requirements:validate
npm run validate
```

Use targeted tests for the files being changed. For the current control-plane
work, the usual test surface is:

```bash
node --test packages/control-plane/test/service.test.js
```

Record all final commands and results in `command-evidence.json`.

## Resume Algorithm

Use this algorithm in a no-memory session:

1. Verify live state with git and validation commands.
2. Determine latest completed CP from committed log and evidence artifacts.
3. Check whether dirty files belong to the next planned pack.
4. Read `next-pack-queue.json`.
5. Select the next pack:
   - If latest committed is `CP00-082`, next should be `CP00-083`.
   - If latest committed is newer, use latest + 1.
   - If dirty files already implement part of a pack, finish that pack.
6. Read the planned pack row from `closeout-pack-plan.json`.
7. Implement all included units for that planned pack.
8. Run targeted tests and validators.
9. Generate or update the five pack artifacts.
10. Run one pack-level Claude Opus 4.8 max read-only review.
11. Adjudicate findings.
12. Mark construction inspection PASS and included units production_ready.
13. Commit with a message like `Close CP00-083 ... pack`.
14. Re-run latest-pack detection and continue.

## Hard Prohibitions

- Do not rely on missing chat memory.
- Do not treat HRX as a separate product.
- Do not interpret closeout packs as 1,000 units per pack.
- Do not make arbitrary 1-unit packs when a planned multi-unit pack exists.
- Do not skip the plan files.
- Do not skip Claude review, adjudication, or inspection.
- Do not revert existing changes unless the user explicitly asks.
- Do not mark a pack complete without a commit.

## New Session Prompt

Paste this into the new Codex session:

```text
You are taking over Law Firm OS from a completely different Codex account/session.
Assume you have no prior chat memory. Treat the live repository and
docs/closeout-pack-plan/new-session-handoff.md as the source of truth.

Workspace:
- /Users/jws/Documents/Codex/Law Firm OS

First, read:
- docs/closeout-pack-plan/new-session-handoff.md
- docs/closeout-pack-plan/closeout-pack-plan.json
- docs/closeout-pack-plan/next-pack-queue.json
- docs/closeout-pack-plan/risk-classification-rules.md
- scripts/generate-closeout-pack-plan.mjs
- scripts/validate-closeout-pack-plan.mjs
- scripts/validate-closeout-pack.mjs
- docs/weighted-implementation-ledger.json

Then run:
- git status --short
- git log --all --format='%h %aI %s' --grep='^Close CP00' -n 40
- npm run closeout-pack-plan:validate
- npm run closeout-pack:validate

Context:
- Expanded total goal is 55,256 implementation units.
- Existing Law Firm OS is 54,355 units.
- Embedded HRX / People / HR Evidence adds 901 units.
- A unit is an implementation_subphase.
- HRX is embedded inside Law Firm OS, not a separate product.
- Work is operated through risk-based Closeout Packs, not isolated subphase closeouts.
- The repo closeout-pack plan is the current execution source of truth.

Current expected state may be stale:
- Latest committed pack was observed as CP00-082.
- The plan queue started at CP00-083.
- CP00-083 was observed as Risk B, 15 units:
  RP00.P07.M03.S20-RP00.P07.M04.S14.
- Any goal/memory/handoff text that says CP00-066 or CP00-067 is stale.
Verify live state before acting and follow git plus next-pack-queue.json.

Rules:
- Preserve dirty work. Do not revert or overwrite prior-session changes.
- If dirty files correspond to the next planned pack, finish that pack.
- Use latest committed CP plus next-pack-queue to select the next pack.
- Do not create arbitrary 1-unit packs when the plan has a multi-unit pack.
- Every pack requires implementation, tests, Hermes evidence, one Claude Opus
  4.8 max read-only review, adjudication, construction inspection, production_ready
  included units, and commit.

Start by summarizing live state, latest completed CP, current dirty files, and
the exact next pack you will work on. Then continue from the next planned pack.
```
