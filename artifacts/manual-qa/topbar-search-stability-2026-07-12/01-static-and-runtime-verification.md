# Topbar search stability QA evidence

Date: 2026-07-12 Asia/Seoul
Scope: rebuilt `apps/web/dist` and packaged `matter.app` renderer; no production files edited.

## Static/build evidence

- `npm --workspace apps/web run typecheck` -> exit 0.
- `node --test apps/web/test/ui-regression.test.mjs` -> `1..28`, `# pass 28`, `# fail 0`.
- `npm --workspace apps/web run build` was not needed in this QA pass; the supplied rebuilt `apps/web/dist` was inspected.
- `apps/web/dist/assets/index-BlBTv6Tl.js` and the packaged renderer JS are SHA-256 identical: `e07cc03a4a73d344093ddb6d2a96a707ef300f9497cfd04fbc0abba0a07c0e34`.
- `apps/web/dist/assets/index-B732KiIw.css` and the packaged renderer CSS are SHA-256 identical: `8b3fa28b455333034c61ba821829093e3bf132d36fb87007355167495a7ce42e`.
- `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app` -> exit 0; bundle valid on disk and satisfies its Designated Requirement.
- Current source contract: Forest search is `display: grid` at `<=1320px`; at `<=820px`, the Forest topbar is `grid-template-columns: minmax(0, 1fr) auto` and search is explicitly grid-column 1 / row 1 / width `min(100%, 320px)`. The non-Forest generic rule still hides `.global-search` at `<=820px`, so the Forest override depends on cascade order.

## Browser/runtime attempts

### Chromium against rebuilt web renderer

Exact invocation attempted:

```js
chromium.launch({ headless: true })
page.goto("file:///Users/jws/Documents/Codex/Law Firm OS/apps/web/dist/index.html?locale=ko&skin=forest&view=home&query=atlas")
```

Result: blocked before page navigation. Chromium launched and immediately terminated with:

```text
FATAL:base/apple/mach_port_rendezvous.cc:159
Check failed: kr == KERN_SUCCESS.
bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer: Permission denied (1100)
```

Playwright then reported `Target page, context or browser has been closed`; cleanup also reported `kill EPERM`.

### Electron against packaged `matter.app`

Exact invocation attempted:

```js
electron.launch({
  executablePath: "apps/desktop/dist/mac/matter.app/Contents/MacOS/matter",
  args: ["--user-data-dir=/private/tmp/topbar-search-stability-qa-profile"]
})
```

Result: blocked before a window was available. Playwright returned `Error: Process failed to launch!` under Node.js v22.22.3.

### HTTP reachability

Exact invocations:

```text
curl -i --max-time 3 http://127.0.0.1:5187/
curl -i --max-time 3 http://127.0.0.1:4217/api/health
```

Both returned `curl: (7) Failed to connect ... after 0 ms: Couldn't connect to server`.

## Screenshot status

No fresh screenshots were produced. Both configured real-browser paths failed before DOM navigation, so there is no valid rendered capture for any requested width.
