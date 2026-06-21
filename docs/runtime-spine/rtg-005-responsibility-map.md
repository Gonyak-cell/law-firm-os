# RTG-005 Responsibility Map

Date: 2026-06-21

This map closes RS-6-T17 for repo-side runtime-ready candidate evidence. It does not approve production launch or go-live.

| RTG | Owner role | Responsibility | Evidence |
| --- | --- | --- | --- |
| RTG-001 | repo_runtime_engineering | Execute functional Client-Matter-People-Wiki-Vault export path. | `packages/runtime-integration/src/harness.js`, `packages/runtime-integration/test/harness.test.js` |
| RTG-002 | repo_security_engineering | Prove server-derived principal, permission context, denied/review, and safe-error fail-closed behavior. | `packages/runtime-integration/src/harness.js`, `packages/runtime-integration/test/security-boundary.test.js` |
| RTG-003 | repo_audit_engineering | Prove non-bypassable hash-chain audit append across read/write/export/permission paths. | `packages/runtime-integration/src/harness.js`, `packages/audit/src/runtime-writer.js` |
| RTG-004 | release_owner | Keep the harness synthetic-only and future domains locked/export-only. | `packages/runtime-integration/src/factory.js`, `docs/runtime-spine/evidence/g6-runtime-ready-evidence.json` |
| RTG-005 | qa_owner | Maintain regression sweep, reset behavior, evidence index, and launch boundary reporting. | `scripts/validate-runtime-spine-rs6-integration.mjs`, `docs/runtime-spine/qa-checklist.md` |

Boundary:

- Repo runtime-ready candidate may be true at G6.
- Production-ready completed and actual launch/go-live completed remain false.
- External production smoke, production migration operator receipt, and owner launch approval remain separate.
