# matter Desktop UI and Smoke Operability Verification

Status: verified-production-smoke-pass
Local date: 2026-06-30
Branch: `main`
Merge commit: `0ff79586d887a950200ab091a5864a20c174bdf9`

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
| LCX-VLTUI production bridge smoke | PASS | Post-merge `main` smoke used merge commit `0ff79586d887a950200ab091a5864a20c174bdf9`; token was sourced from the production Lambda environment without printing the value; `npm run lcx:vltui:production-smoke` passed 15/15 and wrote `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json`. |
| HRX production smoke | PASS | Post-merge `main` smoke ran `npm run hrx:production:smoke`; 9/9 employees return `hrx-member-roster-source-of-truth`. Production Lambda was previously redeployed with code commit `fc0482d59122b476589262d5fdb5b2d4618477ba`. |

## Observed UI

- Packaged desktop renders the matter shell, Home queue, Client/Matter/People/Vault top navigation, guarded/failed local runtime cards, and Korean operational copy.
- Matter-to-Vault workspace renders linked document controls, bridge status read, preflight-required/write-false states, and right-side record/action panels.
- Vault boundary screen renders preflight success while keeping Vault document writes blocked and owner/policy-dependent actions disabled.

## Smoke Operability

- Local/development smoke is operable for web UI, LCX-VLTUI browser QA, packaged desktop screen QA, desktop file bridge, desktop runtime, and AWS temporary runtime.
- Production LCX-VLTUI bridge smoke is operable on post-merge `main` when `LAWOS_VAULT_BRIDGE_TOKEN` is sourced from the production Lambda environment; the token value was not printed or written to receipts.
- Production HRX smoke is operable on post-merge `main`: production web root is 200, `/api/health` is 200, `/api/hrx/employees` is 200, employee count is 9, and all employee rows now use `hrx-member-roster-source-of-truth`.

## Non-Claims

- Public release: false
- Production go-live: false
- Owner final approval: false
- External pilot: false
- Windows Authenticode signing: false
- Real client data used by this verification: false
