# Fresh non-destructive verification

- Date: 2026-07-12 Asia/Seoul
- Scope: local Worktree top-menu QA only
- Product files edited by this QA pass: none

## Commands and results

### Worktree contract

Invocation:

```text
node --test apps/web/test/matter-worktree-ui-contract.test.mjs
```

Result: exit 0; 15 tests passed, 0 failed, 0 skipped.

### UI regression

Invocation:

```text
node --test apps/web/test/ui-regression.test.mjs
```

Result: exit 0; 28 tests passed, 0 failed, 0 skipped. The sandbox emitted a non-fatal Vite WebSocket `listen EPERM` warning while the test runner was starting its fixture server; it did not fail or skip a test.

### Web typecheck

Invocation:

```text
npm --workspace apps/web run typecheck
```

Result: exit 0; TypeScript completed with `--noEmit` and no diagnostics.

### Packaged CSS assertions

Invocation:

```text
node <<'NODE'
// read the CSS asset embedded in matter.app and assert the shared rule,
// Worktree four-column override, and removal of old Worktree overrides
NODE
```

Resolved asset:

```text
apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web/assets/index-C89Jsh0D.css
```

Assertions: `sharedContainer`, `sharedButtonMinWidth`, `sharedButtonMinHeight`, `sharedActive`, `worktreeFourColumns`, `noWorktreeButtonRule`, and `noMobileOneColumn` were all `true`.

### Local packaged bundle integrity

Invocation:

```text
codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app
```

Result: exit 0; `matter.app: valid on disk` and `matter.app: satisfies its Designated Requirement`.

## Freshness and artifact checks

- Packaged CSS/JS assets: 17:05:49 +0900.
- Renderer screenshots: 17:10:13 +0900.
- Screenshot dimensions: 375x720, 768x720, and 1280x720.
- All receipt and screenshot artifacts are non-empty.
- No DMG was present under `apps/desktop/dist`; the receipt records the managed-sandbox `hdiutil` restriction. This does not invalidate local unpacked-app QA and is not a public-release result.
