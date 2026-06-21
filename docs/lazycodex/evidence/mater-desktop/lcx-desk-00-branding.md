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
| MDT-P0-W01-T03 | complete | `apps/web/src/brand/brand.js` |
| MDT-P0-W01-T04 | complete | `docs/launch/mater-branding-backlog.md` |
| MDT-P0-W01-T05 | complete | `scripts/validate-mater-branding.mjs` |
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

## MDT-P0-W01-T03 - Centralize Brand Constants

Plan:

- Add a single web brand constants module for the product and UI brand values.
- Update the currently changed logo component to import product and UI brand values from that module.
- Keep the change inside P0 web branding scope; do not create `apps/desktop`.

Do:

- Added `apps/web/src/brand/brand.js`.
- Updated `apps/web/src/components/MatterLogo.jsx` to import `PRODUCT_BRAND`, `UI_BRAND`, `BRAND_BYLINE`, and `BRAND_ORGANIZATION`.

Check:

```bash
rg -n "PRODUCT_BRAND|UI_BRAND|mater by AMIC" apps/web/src/brand apps/web/src/components
git diff --check -- apps/web/src/brand/brand.js apps/web/src/components/MatterLogo.jsx
npm --workspace apps/web run build
npm --workspace apps/web run test:ui
```

Results:

- Brand grep passed with `PRODUCT_BRAND` and `UI_BRAND` in `apps/web/src/brand/brand.js`.
- Logo component grep passed with imports from `../brand/brand` and UI/product brand usage.
- `git diff --check` passed.
- Web build passed: `1678 modules transformed`, built in `805ms`.
- UI tests passed: `16` tests, `16` pass, `0` fail.

Act:

- `MDT-P0-W01-T03` is complete.
- Next TUW is `MDT-P0-W01-T04`.

## MDT-P0-W01-T04 - Create String Classification Backlog

Plan:

- Scan current web user-facing brand strings and domain Matter strings.
- Classify planned text changes separately from domain, machine, evidence, and historical references.
- Keep this TUW planning-only for strings; no user-facing copy is changed here.

Do:

- Added `docs/launch/mater-branding-backlog.md`.
- Recorded planned product/UI brand changes for web copy.
- Recorded preserve rules for Matter domain objects, runtime identifiers, CSS/test hooks, evidence, and historical records.

Check:

```bash
rg -n "matter by AMIC|Ask matter|matter에게|matter 작업공간|Loading your matter|matter 시작|matter에 로그인|matter는|Receive emails about news from matter|finish setting up matter|Powered by Ask matter|MatterLogo" apps/web/src --glob '!**/node_modules/**'
rg -n "product_brand|domain_object|machine_identifier|historical|evidence" docs/launch/mater-branding-backlog.md
git diff --check -- docs/launch/mater-branding-backlog.md
```

Results:

- Source scan identified product-brand candidates in `apps/web/src/i18n.js`, `Shell.jsx`, `AuthSurface.jsx`, `MatterModal.jsx`, `ThemeSurface.jsx`, and `AskSurface.jsx`.
- Backlog verification grep passed for `product_brand`, `domain_object`, `machine_identifier`, `historical`, and `evidence`.
- `git diff --check` passed.

Act:

- `MDT-P0-W01-T04` is complete.
- Next TUW is `MDT-P0-W01-T05`.

## MDT-P0-W01-T05 - Add Branding Validator

Plan:

- Add a repo-local branding validator for `mater` naming rules and backlog coverage.
- Ensure the validator fails on user-facing `matter` product-brand misuse when it is not classified in the backlog.
- Ensure domain, machine, and historical references remain allowed.

Do:

- Added `scripts/validate-mater-branding.mjs`.
- The validator checks `PRODUCT_BRAND`, `UI_BRAND`, naming rules, backlog classifications, P0 `apps/desktop` absence, planned product-brand backlog coverage, and exception probes.

Check:

```bash
node --check scripts/validate-mater-branding.mjs
node scripts/validate-mater-branding.mjs
git diff --check -- scripts/validate-mater-branding.mjs
```

Results:

- Syntax check passed.
- Branding validator passed with verdict `PASS`.
- Validator summary: `planned_product_brand_changes: 23`, `preserve_classifications: 7`, `unclassified_user_facing_misuse: 0`.
- Probe summary: user-facing misuse without backlog `fails`; domain object, machine identifier, and historical probes `pass`.
- `git diff --check` passed.

Act:

- `MDT-P0-W01-T05` is complete.
- Next TUW is `MDT-P0-W01-T06`, the terminal TUW for `MDT-P0-W01`.
