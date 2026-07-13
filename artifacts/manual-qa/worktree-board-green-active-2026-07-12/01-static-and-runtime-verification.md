# Worktree and Matter 업무보드 green active-state QA evidence

Date: 2026-07-12 Asia/Seoul
Scope: current `apps/web/dist` and packaged `matter.app` renderer; read-only QA, no production files edited.

## Current package marker checks

Exact current targets inspected:

- `apps/web/dist/assets/index-C4vA0Tax.css`
- `apps/desktop/dist/mac/matter.app/Contents/Resources/app/src/renderer/web/assets/index-C4vA0Tax.css`

Both assets reported:

- shared selector `.matter-board-tabs button.active,.matter-worktree-practice-areas button.active`: present;
- `border-color:var(--am-success)`: present;
- `color-mix(in srgb,var(--am-success) 10%,var(--am-surface))`: present;
- success tokens `--am-success: #13a66b` and Forest override `--am-success: #26C260`: present;
- Worktree desktop `repeat(4,minmax(0,1fr))`: present;
- mobile selector includes both `.matter-board-tabs` and `.matter-worktree-practice-areas` with `grid-template-columns:1fr`: present;
- standalone `.matter-worktree-practice-areas button.active` override: absent.

Current source confirms four Worktree practice labels (`송무`, `기업 자문`, `분쟁`, `트랜잭션`) and five Matter 업무보드 labels (`홈`, `송무`, `기업 자문`, `분쟁`, `트랜잭션`). Worktree uses `className` plus `aria-pressed`; board uses `className` plus `aria-selected`; each is driven by one selected state variable.

## Prior known-good color baseline

The prior packaged Worktree runtime receipt records the expected computed colors:

- Forest: border `rgb(38, 194, 96)` and active background `color(srgb 0.914902 0.976078 0.937647)`.
- Matter: border `rgb(19, 166, 107)` and active background `color(srgb 0.907451 0.965098 0.941961)`.

The current package tokens and shared `color-mix(... 10% ...)` rule are consistent with those baseline values. This is marker/color parity only; it does not prove current click behavior.

## Supporting commands

- `node --test apps/web/test/matter-worktree-ui-contract.test.mjs apps/web/test/matter-worktree-typography.test.mjs` -> `16/16 PASS`.
- `node --test apps/web/test/ui-regression.test.mjs` -> `28/28 PASS`.
- `npm --workspace apps/web run typecheck` -> exit 0.
- `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app` -> exit 0; valid on disk and satisfies its Designated Requirement.

## Browser/runtime attempts

### Chromium against rebuilt web renderer

Exact all-tab invocation attempted:

```js
chromium.launch({ headless: true });
for (const width of [375, 768, 1280]) {
  page.setViewportSize({ width, height: 720 });
  page.goto("file:///.../apps/web/dist/index.html?locale=ko&skin=forest&view=matters&section=matter-board&ctx=allow");
  click every `.matter-worktree-practice-areas button`;
  click every `.matter-board-tabs button`;
  inspect active count, aria state, computed border/background, inactive styles, and document overflow.
}
```

Result: blocked before page creation. Chromium terminated with:

```text
FATAL:base/apple/mach_port_rendezvous.cc:159
Check failed: kr == KERN_SUCCESS
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)
```

Playwright then reported `Target page, context or browser has been closed`; cleanup reported `kill EPERM`.

### Electron against packaged `matter.app`

Exact invocation attempted:

```js
electron.launch({
  executablePath: "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter",
  args: ["--user-data-dir=/private/tmp/worktree-board-green-active-qa"]
});
```

Result: blocked before a window was available: `Error: Process failed to launch!` under Node.js v22.22.3.

## Screenshot status

No fresh screenshots were produced because both real runtime paths failed before page/window creation. The existing Worktree screenshots and receipt are retained only as the requested prior known-good color baseline, not as current-package click evidence.
