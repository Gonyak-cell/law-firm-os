# mater Desktop Current-State Audit

Status: MDT-P0-W01-T01 complete
Date: 2026-06-21
Branch: `codex/mater-desktop-69-tuw-implementation`
Worktree: `/Users/jws/Documents/Codex/Law Firm OS - mater desktop 69 TUW`
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Finding Summary

The current Law Firm OS checkout is ready to start the `mater` desktop program from the planned P0 branding lane, but it is not yet a desktop app implementation.

| Check | Result |
| --- | --- |
| `apps/api` present | yes |
| `apps/web` present | yes |
| `apps/ops-kpi` present | yes |
| `apps/desktop` present | no |
| Electron/Tauri implementation present | no implementation observed in the app tree |
| Current live UI brand | `matter by AMIC` in `apps/web/src/components/MatterLogo.jsx` |
| Current launch naming doc | `docs/launch/matter-naming-rules.md` still records `matter` / `matter by AMIC` |
| New target brand | `mater` / `mater by AMIC`, not yet applied to live app source |

## Command Evidence

### App Inventory

Command:

```bash
find apps -maxdepth 2 -type d -print | sort
```

Relevant output:

```text
apps
apps/api
apps/api/src
apps/api/test
apps/ops-kpi
apps/ops-kpi/fixtures
apps/ops-kpi/panels
apps/web
apps/web/e2e
apps/web/public
apps/web/src
apps/web/test
```

After the web build, `apps/web/dist` is also present as a generated build directory. It is not a desktop implementation.

### Desktop App Absence

Command:

```bash
test ! -d apps/desktop && echo 'apps/desktop absent' || find apps/desktop -maxdepth 2 -type f -print
```

Output:

```text
apps/desktop absent
```

### Branding Search

Command:

```bash
rg -n "matter by AMIC|mater|apps/desktop" apps docs/launch --glob '!**/node_modules/**'
```

Relevant live-source hits:

```text
docs/launch/matter-naming-rules.md:12:| Product brand | matter | Use lowercase `matter` in user-facing product, training, and launch materials. |
docs/launch/matter-naming-rules.md:13:| UI brand | matter by AMIC | Use this phrase for user-visible UI brand labels and accessibility labels. |
apps/web/src/components/MatterLogo.jsx:6:    <div className={compact ? "matter-logo compact" : "matter-logo"} aria-label="matter by AMIC">
```

Notes:

- The broader search also matched words such as `material` and generated `apps/web/dist` content after build; those are not product-brand hits.
- No `apps/desktop` implementation path exists yet.
- The existing live app still needs P0 branding work before the `mater` brand is true in user-visible UI.

### Web Build and UI Tests

First build attempt in the fresh worktree failed because `node_modules` was absent:

```text
sh: vite: command not found
```

Resolution:

```bash
npm install
```

Result:

```text
added 108 packages, and audited 147 packages in 2s
found 0 vulnerabilities
```

The package-lock side effect from `npm install` was inspected and removed because it was outside the TUW scope.

Final verification:

```bash
npm --workspace apps/web run build
npm --workspace apps/web run test:ui
```

Results:

```text
vite v6.4.3 building for production...
1677 modules transformed.
built in 684ms
```

```text
tests 16
pass 16
fail 0
duration_ms 80.400166
```

## Decision for Next TUW

`MDT-P0-W01-T02` can proceed. It should add `docs/launch/mater-naming-rules.md` and preserve the rule that domain and machine identifiers remain unchanged:

- keep `Law Firm OS`
- keep `law-firm-os`
- keep `packages/matter`
- keep `matter_id`
- change only user-facing product-brand misuse after classification

## Non-Claims

This audit does not implement desktop shell, auth/session, file bridge, deep links, notifications, signing, update, pilot QA, production readiness, public release, or owner approval.

