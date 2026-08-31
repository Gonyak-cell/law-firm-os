# AMIC OS single-install Vault rollback runbook

Status: source-ready; live execution requires a matching human gate
Date: 2026-08-28
Baseline: `LAWOS-SP-20260828-1787901890994922`

## Boundary

This runbook defines stop, rollback, and preservation rules. It does not
authorize a source restore, production deployment, Microsoft 365 assignment
change, database write, Windows remote operation, signing operation, or live
rollback.

## Universal stop rule

1. Stop at the first failed live gate.
2. Do not advance the next user, cohort, host, or release surface.
3. Preserve the failing request, release identity, host state, and PII-safe
   audit correlation.
4. Identify the last surface changed by the current live step.
5. Roll back that surface at most once.
6. Read the resulting state back from its authority before deciding whether to
   resume or re-plan.

Do not cascade into a second rollback merely because the first rollback did
not fix a failure whose authority is on another surface.

## Surface matrix

| Last changed surface | Rollback target | Required readback | Must remain untouched |
| --- | --- | --- | --- |
| Source implementation | Prior reviewed source commit or disabled feature flag; restore needs separate exact approval | branch, HEAD, diff, targeted tests | user worktrees, untracked files, savepoint ref |
| Vault/API deployment | Previous exact Lambda/API artifact | deployed version, health, permission deny, audit read | Vault objects, versions, audit rows |
| Static Office.js assets | Previous exact asset manifest | CDN bytes/hash and fresh WebView | M365 assignments, native adapter |
| M365 Office.js assignment | Previous approved cohort assignment | direct and group membership, propagation, fresh host surface | installer, Vault data |
| Classic native component | Previous signed AMIC OS package or component-disabled state | COM registration, Ribbon `1→0`, broker/temp residue | Office.js cohort, mailbox data |
| AMIC OS desktop package | Previous exact signed package | app version, installation identity state, Vault read-only smoke | Vault data, Outlook drafts/sent mail |
| Capability/entitlement | Previous server-derived capability state | denied direct route and allowed cohort readback | stored documents and audit |
| Database migration | Only the separately approved migration rollback | schema/version/count/hash receipt | object bytes and append-only evidence unless explicitly covered |

## Abort conditions

- savepoint, source SHA, artifact hash, or deployed version mismatch;
- tenant, user, Matter, document, version, file-object, or hash mismatch;
- permission, Ethical Wall, Records, DLP, or denied-count leakage;
- mail selection causes login, readiness, Vault network, or processing;
- a non-explicit action stores or attaches data;
- duplicate document version or duplicate attachment on retry;
- raw path, storage locator, credential, long-lived URL, or unrestricted bytes
  cross into the renderer;
- `classic_native` has an effective Office.js assignment or a duplicate surface;
- installer, repair, upgrade, or uninstall leaves an orphan native component,
  registry entry, broker, or protected temp;
- audit or exact-version readback is unavailable.

## Preservation set

Rollback and uninstall never delete:

- Vault documents, immutable versions, file objects, and append-only audit;
- legal-hold, retention, archive, or disposal evidence;
- Outlook drafts, Sent Items, recipient mailbox copies, or retention copies;
- the immutable savepoint ref and registry receipts;
- unrelated tracked, untracked, ignored, dirty, or unpushed work.

## Human gates

Human approval or authentication is required before AWS SSO/MFA, Microsoft 365
assignment or consent, production database mutation, Authenticode or
notarization, remote Windows operation, canary membership, live rollback, and
go-live expansion.
