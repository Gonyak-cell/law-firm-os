# MI-006 Main-only Semantic Review

## Method

The baseline is the refreshed remote ref `origin/main=fdd1e34a42ee11ad1e5049647048471be772f381`, not the stale local `main`. Critical paths were selected from `origin/main` across security/authz, AWS/Lambda/Desktop auth, backup/restore, production/deployment, and release/signing validators. Every baseline Git object was compared to the integration entry SHA.

## Inventory result

| Class | Count | Decision |
| --- | ---: | --- |
| Byte-identical | 121 | Preserved by identical Git object |
| Modified | 34 | Reviewed below and validated by targeted tests/validators |
| Missing/deleted | 0 | No main-only critical path omission |
| Total | 155 | Complete matrix |

## Security and authorization

- HRX authorization still requires exact tenant, an allowed role, a declared purpose, and the route-required scope. Adding LawOS roles does not grant access without the required HRX scope.
- Route middleware remains fail-closed for unmapped routes, query-supplied tenant/actor context, absent trusted tenant/actor context, and missing scopes. Denied results now preserve structured policy/decision context for audit without returning secret material.
- New leave, payroll, attendance, and overtime scopes make sensitive operations more granular. Step-up sessions are purpose-bound for leave accrual, ledger adjustment, termination settlement, and payroll review.
- Explicit `tenant_ids` aliases are honored only when the authenticated principal contains the resource tenant; arbitrary cross-tenant access remains denied. HRX policy evaluation itself still requires exact tenant equality.
- Validation: authz/runtime-auth tests `162/162`; API security tests `44/44`; route policies `159`; security-negative files `8`; Desktop security scan `50` files with `0` findings.

## AWS, Lambda, and Desktop authentication

- Password storage moved from inline PBKDF2 code to the shared scrypt credential store and records credential provider/revision without returning token material.
- Password reset adds token format limits, bounded state, browser-to-app handoff, and optional SESv2 delivery while retaining non-disclosure for unknown accounts.
- The renderer receives only sanitized session state. Runtime calls keep credentials in the main process, block dot-segment paths, reject secret-bearing responses, and expose explicit allowlists for Search, profile, leave, payroll, and Worktree mutations.
- The AWS smoke no longer resets the real highest-privilege account. It selects a protected QA account, verifies that account can log in, and still proves the highest-privilege allow/general-account deny decision.
- Validation: API runtime/auth tests included in `44/44`; Desktop auth/runtime tests `31/31`; modified JavaScript syntax checks `29/29`; Web TypeScript check PASS.

## Backup and recovery

- The prior one-line dry-run placeholder became a boundary-checked backup/restore implementation with manifest versions, per-file SHA-256, DMS object bytes/sidecars, restore containment, and explicit refusal of unsafe production/go-live claims.
- The runbook now records only the approved local-store targets (`RPO≈0`, restore target 30 minutes) while keeping Postgres, production automation, real-client restore, staffing, and document-original ownership unproven.
- Validation: backup unit tests `6/6`; synthetic drill outcome PASS; files restored `6/6`; checksum mismatch `0`; `real_client_data_used=false`; `production_restore_executed=false`.

## Release and deployment contracts

- The HRX workflow keeps the existing test/build gates and adds Chromium plus the public renderer roster-PII guard. YAML and `package.json` parse successfully.
- Desktop assembly and validators now consume `dist/releases/<version>/<full-sha>/<channel>` indexes instead of treating generic `dist/mac`, `dist/win`, or legacy `dist/release` paths as release truth.
- Formal builds require clean exact-SHA provenance on an allowed ref. Dev/internal/candidate/formal app IDs and artifact prefixes are collision-free; the canonical launcher rejects wrong SHA, tampered renderer, symlink aliases, and other running bundles.
- `scripts/smoke-hrx-production.mjs` intentionally supersedes trusted header access with signed-session denial checks. This is a security strengthening, not evidence of authenticated roster correctness; that latter proof remains explicitly unclaimed.
- The old `docs/ui-reference` prototype exclusion was removed because that asset family is retired. PV-006 now scans retired paths, forbidden references, approved current asset hashes, and packaged renderer entrypoints.
- Validation: PV unit tests `25/25`; PV-001~PV-007 source validators PASS; no-public-release validator scanned 98 files with 0 findings; HRX rollout validator PASS.

## Non-weakening conclusion

All 155 critical `origin/main` paths are present. The 121 unchanged Git objects are byte-preserved. The 34 changes are either additional tests, stricter auth/PII/reset controls, executable synthetic backup with stronger boundaries, exact-SHA release provenance, current Forest naming, or explicitly superseded unsafe/retired checks. Required critical omissions: `0`.
