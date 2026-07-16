# RS-SB terminal acceptance

- Terminal: `RS-SB-010`
- Gate: `G2-SB`
- Source SHA: `b323b4bc2fc554f1df3fa9f400056c754aac3876`
- Verdict: `PASS`
- Allowed claim: `TRUST_BOUNDARY_B_LOCAL_VERIFIED`

## Accepted source and local-package behavior

1. The packaged renderer uses the exact `matter-app://app` origin through a standard, secure and fetch-capable scheme registered before app readiness.
2. The protocol resolver serves only canonical regular files under the packaged web root and rejects traversal, encoded traversal, encoded separators, foreign hosts, symlink escapes, directories and missing files with a path-blind response.
3. Packaged navigation and IPC sender checks use the exact custom origin, `file://` is not trusted, and all new-window requests are denied by default.
4. The packaged web entrypoint declares a restrictive CSP with `script-src 'self'`, no standalone wildcard source, no `unsafe-eval`, and no executable inline bootstrap. The built Forest renderer loaded in Electron with zero observed CSP violations.
5. API CORS reflects only exact configured origins; the default list includes the custom renderer and named loopback development origins while `null`, wildcard and arbitrary origins are not reflected.
6. Electron was minimally patched from `42.4.1` to the execution-day latest supported `42.x`, `42.7.0`. The full 110-test Desktop smoke and an exact-SHA internal unsigned, unnotarized macOS package build passed.

## Boundary retained

This acceptance proves source and local internal-package behavior only. The generated package is not Developer ID signed, notarized, Gatekeeper-ready, externally uploaded, released, tagged, distributed, production-ready or live. No AWS mutation, staging execution, real-client-data migration, production migration, cutover, Windows signing or go-live action was approved or executed. The existing Vite chunk-size warning remains a non-blocking observation outside the RS-SB trust-boundary scope. The next dependency-ordered source workstream is `RS-DUR`.
