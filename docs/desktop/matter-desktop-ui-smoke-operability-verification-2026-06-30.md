# matter Desktop UI and Smoke Operability Verification

Status: verified-with-production-blockers
Local date: 2026-06-30
Branch: `codex/lcx-vltui-owner-approval-intake`

## Scope

This verification checks the currently implemented web UI, LCX-VLTUI Client/Matter/Vault surfaces, packaged desktop UI, desktop runtime smoke, and owner/public/go-live claim guards. It does not claim public release, production go-live, owner final approval, external pilot, or Windows Authenticode signing.

## Current Verdict

| Area | Verdict | Evidence |
| --- | --- | --- |
| Web UI regression | PASS | `npm --workspace apps/web run test:ui` passed 17/17. |
| Web production build | PASS | `npm --workspace apps/web run build` completed. |
| Desktop smoke | PASS | `npm --workspace apps/desktop run test:smoke` passed 59/59. |
| Desktop file bridge | PASS | `npm --workspace apps/desktop run test:file-bridge` passed 17/17 plus bridge validators. |
| Desktop AWS runtime smoke | PASS | `npm run matter-desktop:aws-runtime:smoke` passed against AWS temporary execute-api. |
| Packaged desktop screen QA | PASS | `npm run matter-desktop:screen-qa`; screenshot at `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa.png`. |
| LCX-VLTUI browser QA | PASS | `npm run lcx:vltui:browser-qa`; proof at `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-browser-qa-proof.json`. |
| LCX-VLTUI closeout | PASS | `npm run lcx:vltui:closeout:proof && npm run lcx:vltui:closeout:validate`. |
| LCX-VLTUI bridge/status/picker/workspace/session/profile/client/matter/action validators | PASS | All LCX-VLTUI validators run in this pass returned PASS. |
| Owner approval intake guard | PASS | `npm run matter-desktop:owner-approval:intake:validate`; pending owner response remains non-approval. |
| Public/go-live claim guard | PASS | `node scripts/validate-matter-desktop-no-public-release-claim.mjs`. |
| LCX-VLTUI production bridge smoke | BLOCKED | `LAWOS_VAULT_BRIDGE_TOKEN` is not present in this environment; blocked receipt written to `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json`. |
| HRX production smoke | FAIL | `npm run hrx:production:smoke` reaches production web/API and 9 employees, but production returns `matter-vault-user-registration-seed` for all employee `source_ref` values instead of `hrx-member-roster-source-of-truth`; failure receipt written to `docs/lazycodex/evidence/matter-web/artifacts/hrx-production-smoke-2026-06-30.json`. |

## Observed UI

- Packaged desktop renders the matter shell, Home queue, Client/Matter/People/Vault top navigation, guarded/failed local runtime cards, and Korean operational copy.
- Matter-to-Vault workspace renders linked document controls, bridge status read, preflight-required/write-false states, and right-side record/action panels.
- Vault boundary screen renders preflight success while keeping Vault document writes blocked and owner/policy-dependent actions disabled.

## Smoke Operability

- Local/development smoke is operable for web UI, LCX-VLTUI browser QA, packaged desktop screen QA, desktop file bridge, desktop runtime, and AWS temporary runtime.
- Production LCX-VLTUI bridge smoke is structurally operable but cannot execute in this environment without `LAWOS_VAULT_BRIDGE_TOKEN`.
- The production smoke script now records a structured `BLOCKED` receipt instead of throwing a raw assertion stack when the bridge token is missing.
- Production HRX smoke is structurally operable and now records a structured `FAIL` receipt. The failure is isolated to the roster source-of-truth boundary: production web root is 200, `/api/health` is 200, `/api/hrx/employees` is 200, and employee count is 9, but the live API currently serves the account-registration seed source ref.

## Non-Claims

- Public release: false
- Production go-live: false
- Owner final approval: false
- External pilot: false
- Windows Authenticode signing: false
- Real client data used by this verification: false
