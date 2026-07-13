# People Roster Contact Column QA

> Release hardening update (2026-07-13): this receipt describes a local internal QA package, not a distributable build. Formal macOS/Windows artifacts exclude the private contact source. Production may load that source only through the explicitly configured `LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH`; the source file remains ignored by Git.

- Date: 2026-07-12
- Source workbook: `연락처_아믹_페트라_2026.06.xlsx`
- Source SHA-256: `cbb61404ac48363373716941e38d46ef96fc0dcda92c8bce9b7f4656e158a6f3`
- Source sheet/range: `연락처!B3:F12`
- Match key: work email, cross-checked with display name
- Matched contacts: 9
- Roster members: 10
- Missing source contact: 1, rendered as `미등록`

## Runtime Evidence

The HRX request handler was executed directly with a migrated temporary store and trusted HR admin request context, without opening a network listener.

- HTTP-shaped status: `200`
- Employee rows: `10`
- Rows with `mobile_phone`: `9`
- Rows without `mobile_phone`: `1`
- Missing-contact display name matched the roster member absent from the workbook.

The packaged Electron bundle contains:

- Nine `mobile_phone` values in an API-only contact source.
- The `mobile_phone` API projection in the packaged HRX runtime.
- The `연락처`, `mobile_phone`, and `hr-roster-col-contact` markers in the packaged renderer bundle.

The web and packaged renderer bundles contain zero phone-number literals. The shared roster JSON imported by the web fallback also contains no `mobile_phone` keys.

## Debugging Hypotheses

1. **Workbook rows might match the wrong roster members.** Rejected: the workbook was imported with `@oai/artifact-tool`; all nine rows matched unique roster work emails and names.
2. **The API might drop contact data between roster and UI.** Rejected: the direct HRX handler run returned nine populated contacts and one explicit missing value from ten employees.
3. **The desktop bundle might still contain a stale renderer or API contact source.** Rejected: package inspection found the API-only contact source and runtime projection, the new header/class markers in the renderer asset, and zero phone-number literals in renderer assets.

## Verification

- `node apps/web/test/ui-regression.test.mjs`: 28/28 pass.
- `npm --workspace apps/web run typecheck`: pass.
- `node scripts/validate-lcx-hrx-sft-roster-source.mjs`: pass.
- JavaScript syntax checks for changed API/test modules: pass.
- AI slop scan: no finding introduced by the contact-column change; repository-wide pre-existing weak flags remain.

## Environment Boundaries

- The full HTTP integration suite could not open `127.0.0.1` in the managed sandbox and stopped in its server-start hook.
- The app bundle and ZIP were produced from the current source. DMG creation was blocked by the sandboxed `hdiutil` device restriction.
- The bundle received an ad-hoc local QA signature and passes strict local code-sign verification. This is not Developer ID signing, notarization, public release, or go-live evidence.
- Direct GUI inspection was unavailable because Computer Use access to the Matter app was not approved in this session. Runtime handler output plus packaged-source inspection are partial runtime evidence, not a rendered-screen claim.
