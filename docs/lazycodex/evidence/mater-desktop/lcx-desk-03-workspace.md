# LCX-DESK-03 Workspace Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P3 permission-trimmed Matter workspace, route adapter, denied state, and desktop context
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P3 workspace progress only. It does not claim file bridge readiness, production go-live, public release, owner approval, or any desktop authority beyond presentation context and permission-checked routes.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P3-W01-T01 | complete | `docs/desktop/mater-desktop-route-map.md` |
| MDT-P3-W01-T02 | pending | not started |
| MDT-P3-W01-T03 | pending | terminal not reached |
| MDT-P3-W02-T01 | pending | not started |
| MDT-P3-W02-T02 | pending | not started |
| MDT-P3-W02-T03 | pending | not started |
| MDT-P3-W02-T04 | pending | phase terminal not reached |

## MDT-P3-W01-T01 - Map Desktop Route Intents to Web Routes

Plan:

- Map desktop matter, document, task, auth, denied, and fallback routes.
- Keep all route intents presentation-only until backend permission recheck.

Do:

- Added `docs/desktop/mater-desktop-route-map.md`.

Check:

```bash
rg -n "matter|document|task|auth|denied|fallback" docs/desktop/mater-desktop-route-map.md
git diff --check -- docs/desktop/mater-desktop-route-map.md docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md
```

Results:

- Route map grep passed for `matter`, `document`, `task`, `auth`, `denied`, and `fallback`.
- `git diff --check` passed.

Act:

- `MDT-P3-W01-T01` is complete.
- Next TUW is `MDT-P3-W01-T02`.
