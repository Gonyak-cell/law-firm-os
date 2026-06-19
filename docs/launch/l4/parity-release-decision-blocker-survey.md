# LT-L4-W03 Parity Release Decision Blocker Survey

Work package: LT-L4-W03
Phase: L4
Gate binding: L4-EXIT
Survey timestamp: 2026-06-18T14:09:10Z

## Scope

LT-L4-W03 is a human decision work package. It requires the owner to formally
release the apps/web Amplitude parity constraint for the byte-identical mock
render path, while preserving the Amplitude reference corpus and existing
visual-parity evidence.

## Current Evidence

The current decision register exists but is intentionally empty:

- `docs/launch/launch-decision-register.md` status is
  `template_ready_no_decisions_recorded`.
- The register states Codex must not fill a human decision row as decided or
  deferred without real owner evidence.
- The register table contains no decision rows.

The required W03 decision artifact is absent:

- `docs/product-ui/parity-release-record.md` does not exist.

The preserved reference evidence exists:

- `apps/web/README.md` still says non-live data keeps the byte-identical mock
  render path.
- `docs/ui-reference/amplitude-feb-2025/visual-parity/live-data-verification.md`
  exists and records a historical PASS for the live proof.
- `docs/ui-workstream-conventions.md` preserves the UI workstream rules and
  says generated UI reference packs should be changed through generators, not
  direct output edits.

## Blocking Conditions

| TUW | Required Result | Current State |
| --- | --- | --- |
| LT-L4-W03-T01 | Owner-approved release of byte-identical mock render path constraint | blocked; no owner decision row, approval signature, or parity-release record |

## Non-Claims

This survey does not release the parity constraint, does not create or infer an
owner decision, does not authorize mock render changes, does not modify
Amplitude reference artifacts, and does not satisfy L4-EXIT.
