# LT-L4-W04 UI Regression Test System Status

Work package: LT-L4-W04
Phase: L4
Gate binding: L4-EXIT
Survey timestamp: 2026-06-18T14:11:16Z

## Implemented In This Slice

LT-L4-W04-T01 is partially implemented as a deterministic, server-independent
Node.js test harness:

- `apps/web/package.json` now exposes `npm --workspace apps/web run test:ui`.
- `apps/web/test/README.md` records the runner selection rationale.
- `apps/web/test/ui-regression.test.mjs` contains two sample source-level UI
  guardrail tests.
- `npm --workspace apps/web run test:ui` passed twice with 2 tests, 0 failures,
  0 skipped.
- `grep -rn "ui-reference" apps/web/test/ | wc -l` returned 0.
- `npm --workspace apps/web run build` passed.

## Remaining Blockers

The work package cannot close yet because the full W04 acceptance requires
screen-state and permission-state suites that depend on unfinished W01 and W02
outputs:

| TUW | Required Result | Current State |
| --- | --- | --- |
| LT-L4-W04-T01 | Runner and sample harness | implemented and command-verified |
| LT-L4-W04-T02 | Wave 1 6 screens x 3 states, >=18 cases | blocked by LT-L4-W01 product screens and IA completion |
| LT-L4-W04-T03 | 6 screens x 3 permission states plus fail-closed and shape-guard cases | blocked by LT-L4-W02 shared live client and permission model |
| LT-L4-W04-T04 | Full suite >=36 cases, 0 fail, 0 skip, gate evidence | blocked by T02 and T03 |

## Non-Claims

This status record does not claim that LT-L4-W04 is closed, does not claim UI
regression green for L4-EXIT, does not add root `package.json` gate wiring, and
does not create screen/permission coverage beyond the T01 sample harness.
