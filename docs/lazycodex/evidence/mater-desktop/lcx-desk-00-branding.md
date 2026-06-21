# LCX-DESK-00 Branding Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P0 branding and guardrails
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P0 progress only. It does not claim desktop shell implementation, auth/session readiness, file bridge readiness, signed packaging, pilot approval, production go-live, public release, or owner approval.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P0-W01-T01 | complete | `docs/desktop/mater-desktop-current-state-audit.md` |
| MDT-P0-W01-T02 | complete | `docs/launch/mater-naming-rules.md` |
| MDT-P0-W01-T03 | pending | not started |
| MDT-P0-W01-T04 | pending | not started |
| MDT-P0-W01-T05 | pending | not started |
| MDT-P0-W01-T06 | pending | terminal not reached |
| MDT-P0-W02-T01 | pending | not started |
| MDT-P0-W02-T02 | pending | not started |
| MDT-P0-W02-T03 | pending | not started |
| MDT-P0-W02-T04 | pending | not started |
| MDT-P0-W02-T05 | pending | phase terminal not reached |

## MDT-P0-W01-T01 - Audit Current Desktop and Branding Truth

Plan:

- Confirm current app tree.
- Confirm `apps/desktop` absence.
- Confirm current user-visible brand strings.
- Verify the existing web app can still build and pass UI regression in the new worktree.

Do:

- Added `docs/desktop/mater-desktop-current-state-audit.md`.

Check:

```bash
find apps -maxdepth 2 -type d -print | sort
test ! -d apps/desktop && echo 'apps/desktop absent' || find apps/desktop -maxdepth 2 -type f -print
rg -n "matter by AMIC|mater|apps/desktop" apps docs/launch --glob '!**/node_modules/**'
npm install
npm --workspace apps/web run build
npm --workspace apps/web run test:ui
```

Results:

- App tree contains `apps/api`, `apps/web`, and `apps/ops-kpi`.
- `apps/desktop` is absent.
- Current live app still exposes `matter by AMIC` in `apps/web/src/components/MatterLogo.jsx`.
- Current launch naming rules still record `matter` / `matter by AMIC`.
- First web build attempt failed in the fresh worktree because dependencies were not installed: `vite: command not found`.
- `npm install` completed with `found 0 vulnerabilities`.
- Re-run web build passed: `1677 modules transformed`, built in `684ms`.
- UI tests passed: `16` tests, `16` pass, `0` fail.
- The `package-lock.json` side effect from dependency installation was inspected and removed because it was outside this TUW.

Act:

- `MDT-P0-W01-T01` is complete.
- Next TUW is `MDT-P0-W01-T02`.

## MDT-P0-W01-T02 - Record mater Naming Rules

Plan:

- Add a new `mater` naming rule document without overwriting the historical `matter` naming record.
- Preserve machine, package, validator, ledger, and historical evidence identifiers.
- Make P0 forbidden scope explicit.

Do:

- Added `docs/launch/mater-naming-rules.md`.

Check:

```bash
rg -n "Product brand|mater|Machine identifier|law-firm-os" docs/launch/mater-naming-rules.md
git diff --check -- docs/launch/mater-naming-rules.md
```

Results:

- `Product brand | mater` is present.
- `UI brand | mater by AMIC` is present.
- `Machine identifier | law-firm-os` is present.
- Preserved identifier list includes `Law Firm OS`, `law-firm-os`, `@law-firm-os/*`, `packages/matter`, and `matter_id`.
- `git diff --check` passed.

Act:

- `MDT-P0-W01-T02` is complete.
- Next TUW is `MDT-P0-W01-T03`.
