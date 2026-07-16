# RC-002 Common-File Semantic Review

## Scope and verdict

- comparison source: current root worktree at `aa653bb12c7424fb5cda717817ba1ee1d2c454c3` plus its preserved 77-path dirty state
- Forest source: immutable content checkpoint `fbf7062398da1157ee1322d7440194c1b13f7e0f`
- all common paths: 52
- integration metadata excluded: 1 (`workbook/forest-v0.1.17-main-integration-release-goal-plan-2026-07-15.md`)
- product common paths reviewed: 51/51
- identical: 2
- different: 49
- parse errors: 0
- unclassified: 0
- verdict: `PASS_WITH_SELECTIVE_PORT_REQUIRED`

The ended root session is not a linear or complete superset of the Forest checkpoint. It contains useful leave lifecycle, payroll catalog/profile/time-snapshot, XLSX import, and density-test work, but it also removes Forest batch execution, occurrence upload, provider retry, payroll runtime, profile resolution, privacy controls, and current-brand assertions. No differing common file may replace its Forest counterpart wholesale.

`KEEP_FOREST` and `SELECTIVE_PORT` below are RC-002 gates, not completed port decisions. RC-003/RC-004 must trace each selected contract to its root-only implementation, migration number, authz scope, tests, and final rendered behavior before code changes.

## Cross-cutting conflict gates

1. **Retired visual assets stay retired.** Root `AuthSurface.jsx` imports `parnas-tower-login.jpg`; root desktop smoke expects the old Matter mark. Both conflict with the current Forest-only asset rule and are excluded from the integration candidate.
2. **Profile identity must remain account-linked.** Forest resolves the signed account to the durable HRX employee and sanitized professional profile. Root removes that merge and reintroduces generic session fallbacks and `미등록` cards, so the known signed-account-to-canonical-employee mapping remains a release invariant without copying private values into receipts.
3. **Migrations are forward-only.** Root migration numbers 011-016 collide with Forest 011-025. Root schemas may only enter after a schema crosswalk as new 026+ migrations; existing IDs or SQL files are never replaced.
4. **Runtime and authz are unions, not swaps.** Root adds leave-rule/lifecycle and payroll item/profile/time-snapshot contracts while deleting Forest batch, upload, provider retry, payroll run/payment/filing, attachment, and profile contracts. Routes, step-up prefixes, scopes, stores, and tests must be merged contract by contract.
5. **Forest density and privacy remain governing UI rules.** Useful root actions such as template download or empty-copy removal may be ported, but verbose helper copy, reconciliation noise, empty-profile placeholders, and two-line metadata remain excluded.
6. **Generated evidence is regenerated from the final SHA.** Build receipts and renderer evidence are not hand-merged from either session.

## File-by-file review

| # | Path | Extracted relation | RC-002 gate | Semantic finding / next proof |
|---:|---|---|---|---|
| 1 | `apps/api/src/hrx-member-roster-registry.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Preserve the sanitized public professional-profile catalog and employee lookup used by packaged profile resolution; prove no private roster fields enter the public renderer. |
| 2 | `apps/api/src/hrx-runtime-context.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `SELECTIVE_PORT` | Port root payroll item/profile/time-snapshot services and compatible leave lifecycle routes; retain Forest accrual batches, occurrence uploads, expiration preview/execute, payroll runtime, and `resolveHrxEmployeeProfileByUserId`. |
| 3 | `apps/api/src/lawos-role-registry.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Keep the canonical `hrx-role-scope-matrix` import; add new scopes only through that matrix, never an inline divergent role table. |
| 4 | `apps/api/src/middleware/hrx-step-up.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Union root accrual-rule and entitlement action prefixes with Forest expiration execution; verify every mutation maps to the correct step-up purpose. |
| 5 | `apps/api/src/routes/hrx/route-policy-map.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Union exact routes and retain Forest attachment, entitlement, batch, upload, and full payroll policies; root read/write/preview scopes require least-privilege authz tests. |
| 6 | `apps/api/src/server.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Preserve Matter account registry and HRX profile joining; wire selected root services without weakening session, tenant, public-profile, or local-package boundaries. |
| 7 | `apps/api/test/hrx/leave-accrual-api.test.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `MERGE_TESTS` | Add immutable rule-version, deactivation, CSV/XLSX template, and entitlement lifecycle cases while retaining Forest batch and occurrence upload/execute/retry cases. |
| 8 | `apps/api/test/hrx/leave-management-api.test.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Retain attachment download authorization and missing-resource behavior; root supplies no stronger extracted coverage. |
| 9 | `apps/api/test/hrx/leave-policy-api.test.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Retain versioned type-economics normalization, read, publish, and immutability assertions. |
| 10 | `apps/api/test/hrx/route-authz.test.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `MERGE_TESTS` | Add payroll item/profile/time-snapshot scope cases; retain Forest payroll preview, approve, statement, payment, filing, issue, and export separation. |
| 11 | `apps/api/test/profile-api.test.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Preserve durable account-to-employee and sanitized catalog tests; add a dedicated known-account mapping invariant while keeping private values out of receipts. |
| 12 | `apps/desktop/src/main/main.js` | `IDENTICAL` | `KEEP_IDENTICAL` | Byte-identical; no integration action. |
| 13 | `apps/desktop/test/shell-smoke.test.mjs` | `BIDIRECTIONAL_CONTRACT_DELTA` | `KEEP_FOREST` | Root expects the retired Matter mark; keep Forest packaged application-icon expectation and add an old-asset negative assertion if not already covered. |
| 14 | `apps/web/src/components/AuthSurface.jsx` | `ROOT_EXTENDS_EXTRACTED_CONTRACT` | `REJECT_ROOT_VISUAL` | Root restores Parnas Tower and its aria label; exclude both and retain current Forest login animation, imagery, and brand source. |
| 15 | `apps/web/src/components/UserProfileSurface.jsx` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Root removes multi-source identity resolution and renders `미등록`/empty cards; retain Forest’s resolved person, compact omission, and non-generic display-name behavior. |
| 16 | `apps/web/src/people/hrxApiClient.ts` | `BIDIRECTIONAL_CONTRACT_DELTA` | `SELECTIVE_PORT` | Add rule update/deactivate, template, entitlement list/cancel/expire calls; retain all Forest batch, occurrence, promotion, provider retry, policy, and payroll client contracts. |
| 17 | `apps/web/src/people/leave/LeaveAccrualAutoPage.tsx` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Integrate root rule-version/lifecycle actions into the Forest page without removing multi-period preview/execute/export/retry, status, or 44px-density behavior. |
| 18 | `apps/web/src/people/leave/LeaveAccrualManualPage.tsx` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Port CSV/XLSX template download and XLSX import plus the concise `-` success cell; retain preview-before-write, approval, retry, and error receipts. |
| 19 | `apps/web/src/people/leave/LeaveApprovalQueue.tsx` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Keep root removal of non-actionable empty copy; retain Forest’s concrete approval items and single-line rows. |
| 20 | `apps/web/src/people/leave/LeavePromotionPage.tsx` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Preserve Forest batch issue, select-all, evidence receipt, revoke, failed-delivery retry, and tabular density; root’s older timeline is not a superset. |
| 21 | `apps/web/src/people/leave/LeaveRequestPage.tsx` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Preserve policy-derived allowed duration modes and paid/unpaid preview; only independently proven empty-copy deletion may be ported. |
| 22 | `apps/web/src/people/leave/LeaveTerminationPage.tsx` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | A refresh action may be ported; exclude root’s verbose instructional/empty copy and retain Forest’s payroll-boundary status semantics. |
| 23 | `apps/web/src/people/leave/LeaveTypeSettingsPage.tsx` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Preserve Forest type economics and rounding controls; map root usage units into the existing model only after schema and golden-vector proof. |
| 24 | `apps/web/src/people/leave/LeaveUsagePage.tsx` | `BIDIRECTIONAL_CONTRACT_DELTA` | `KEEP_FOREST` | Root reintroduces balance reconciliation/noise previously rejected by the user; retain Forest occurrence views, step-up, manual/scheduled changes, upload, provider state, and privacy exclusions. |
| 25 | `apps/web/src/people/memberPhotos.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Port root’s stricter photo data-URL validation if it accepts all current fixtures; reject invalid or non-image payloads in tests. |
| 26 | `apps/web/test/leave-accrual-ui.test.mjs` | `BIDIRECTIONAL_CONTRACT_DELTA` | `MERGE_TESTS` | Merge root LV-09 single-line/non-actionable-copy regression and compatible scope checks with Forest’s advanced automatic/manual navigation and batch tests. |
| 27 | `apps/web/test/leave-integration-ui.test.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Retain dead-letter visibility, selected retry, state separation, and helper-copy exclusions; root only proves a simpler delivered state. |
| 28 | `apps/web/test/leave-promotion-ui.test.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Retain Forest batch/revoke/retry/evidence/table assertions; root’s timeline assertions target the superseded surface. |
| 29 | `apps/web/test/leave-reporting-ui.test.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Retain occurrence projections/views/exports and absence of reconciliation noise; root’s older usage report is not the accepted UI. |
| 30 | `apps/web/test/leave-self-service-ui.test.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `MERGE_TESTS` | Keep Forest duration/economics/privacy coverage and add any stricter root negative checks for reason, type, documents, and attachments. |
| 31 | `apps/web/test/ui-regression.test.mjs` | `BIDIRECTIONAL_CONTRACT_DELTA` | `KEEP_FOREST` | Preserve retired-asset exclusions, inline metadata, and compact-row rules; root shared-brand assertion is admissible only if it points to current Forest constants and assets. |
| 32 | `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `REGENERATE` | Generated build evidence; recreate from the exact final integration/main SHA instead of merging stale session text. |
| 33 | `docs/lazycodex/evidence/matter-web/desktop-web-renderer-asset.md` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `REGENERATE` | Generated renderer evidence; recreate with final renderer hash and canonical launch path. |
| 34 | `packages/authz/src/hrx-sensitive-scopes.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Union root accrual read/write/preview and payroll self/item/profile/time scopes with Forest approve/statement/payment/filing scopes; preserve least privilege and role-matrix completeness. |
| 35 | `packages/hrx/src/index.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Export selected root payroll catalog/profile/time and manual-adjustment services while retaining Forest migration safety, provider, lifecycle, batch, type-economics, and full payroll runtime exports. |
| 36 | `packages/hrx/src/leave/accrual-service.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `SELECTIVE_PORT` | Port manual-adjustment parser and compatible versioned tenure/lifecycle logic; preserve occurrence templates, future scheduling, batches, idempotency, and no-partial-write guarantees. |
| 37 | `packages/hrx/src/leave/integration-service.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Preserve provider adapters, delivery receipts, poison isolation, and dead-letter retry; root payroll-boundary assertions may be merged at test level only after equivalence proof. |
| 38 | `packages/hrx/src/leave/management-service.js` | `FOREST_EXTENDS_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Preserve snapshotted Forest type economics; crosswalk root usage-unit/fixed-deduction inputs rather than replacing paid/unpaid and balance-deduction calculations. |
| 39 | `packages/hrx/src/leave/policy-service.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `SELECTIVE_PORT` | Add `HRX_LEAVE_USAGE_UNITS` only as a validated facet of Forest type economics and immutable policy versions. |
| 40 | `packages/hrx/src/leave/xlsx-export.js` | `ROOT_EXTENDS_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Port `parseXlsxBuffer` and `node:zlib` support with archive-size, row-count, type, malformed-file, and formula-safe limits. |
| 41 | `packages/hrx/src/migrations/index.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `RENUMBER_026_PLUS` | Keep Forest 011-025 unchanged; crosswalk root 011-016 payroll/usage/rule/lifecycle schemas and introduce only non-duplicate forward migrations numbered 026+. |
| 42 | `packages/hrx/src/store/file-store.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Add required root tables, keys, and references after migration crosswalk; retain Forest append-only, tokenized-reference, PII, batch, provider, and payroll runtime validations. |
| 43 | `packages/hrx/src/store/port.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Extend the canonical table contract with approved 026+ tables while retaining every Forest table and mutation guard. |
| 44 | `packages/hrx/test/leave-accrual-service.test.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `MERGE_TESTS` | Add tenure 0-10, immutable rule version, lifecycle, cancellation, and bulk-grant vectors; retain occurrence template/scheduling/upload and batch guarantees. |
| 45 | `packages/hrx/test/leave-integration-service.test.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `MERGE_TESTS` | Add non-calculating payroll-boundary and immutable submitted-snapshot vectors; retain Forest provider, promotion, dead-letter, and type-economics privacy cases. |
| 46 | `packages/hrx/test/leave-management-durable.test.js` | `BIDIRECTIONAL_CONTRACT_DELTA` | `MERGE_TESTS` | Cross-test root usage-unit/fixed-deduction behavior against Forest rounding, paid/unpaid, reservation, cancellation, scheduling, and zero-deduction invariants. |
| 47 | `packages/hrx/test/migration.test.js` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `REWRITE_FOR_026_PLUS` | Retain Forest 001-025 order and safety tests; add uniqueness, upgrade, rollback-boundary, and data-preservation proof for approved 026+ migrations. |
| 48 | `scripts/build-matter-desktop-mac.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `SELECTIVE_PORT` | Preserve the sanitized professional-profile catalog needed for packaged identity unless a stronger private-data boundary replaces it with equivalent runtime truth; keep PII scans and record the exact data scope. |
| 49 | `scripts/build-matter-desktop-win.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST_PENDING_INVENTORY` | Root drops `build/**/*`; retain Forest inclusion until icon/resource inventory proves no required current asset is omitted, then minimize deterministically. |
| 50 | `scripts/prepare-matter-desktop-web-renderer.mjs` | `CONTENT_DELTA_SAME_EXTRACTED_CONTRACT` | `KEEP_FOREST` | Difference is boundary wording only; retain canonical `apps/web` handoff and regenerate evidence from the final renderer. |
| 51 | `scripts/validate-public-renderer-no-hrx-roster-pii.mjs` | `IDENTICAL` | `KEEP_IDENTICAL` | Byte-identical PII validator; run unchanged at every build/release gate. |

## RC-003 and RC-004 handoff

- RC-003 must classify all 25 root-only paths and prove which file supplies each `SELECTIVE_PORT` contract above.
- RC-004 must classify all 170 Forest-only paths and show that none is orphaned by a selected root contract.
- A port is admissible only with a source path, destination path, migration/authz impact, test IDs, negative regression, and manual rendered/runtime proof.
- A file-level copy is forbidden for all 49 differing common paths.
- Root worktree preservation fingerprint must remain `7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3` through both reviews.
