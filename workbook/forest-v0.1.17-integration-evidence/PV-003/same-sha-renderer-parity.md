# PV-003 supplemental same-SHA renderer parity

Verdict: **PASS**

- Build source: `298bbb2b577ba07980b7ec1671c677902b546c85`
- Source tree: `f0b88838d5ed300069e10ef4be811729e7098c1b`
- Execution: clean detached worktree, macOS internal build followed by Windows internal build
- Renderer: Web, macOS, and Windows all `f0a043dedfe1be18d711748e3b78d7313cdc1e92c90444a598b998b212485445`
- File comparison: 28 paths compared, 0 missing paths, 0 byte differences
- Package provenance: PV-002 package validator PASS; internal/external manifest bytes equal on both platforms
- Package version: PV-001 package validator PASS at `0.1.17`
- Public renderer PII: 56 files scanned, protected values printed `false`

The dependency symlink used by the disposable QA worktree was excluded only through a process-local Git `core.excludesFile`; the product gate and repository configuration were not changed. After each build, the only ignored evidence changes were the fixed macOS and Windows build receipts allowed by PV-003.

These are internal packages. macOS Developer ID, notarization, staple, and Gatekeeper distribution readiness were not established. Windows native install/runtime and Authenticode were not run on Darwin. Formal release, public release, and production go-live remain false.
