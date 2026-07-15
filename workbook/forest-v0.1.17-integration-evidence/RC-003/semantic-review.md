# RC-003 Root-only Semantic Review

- source: `/Users/jws/Documents/Codex/Law Firm OS`
- Forest candidate: `/private/tmp/lawos-forest-v016-release`
- root-only paths: 25
- allowed dispositions: `SUPERSEDED`, `PORT_TEST_ONLY`, `PORT_REQUIRED`, `REJECTED`
- verdict: `PASS_WITH_SELECTIVE_PORT_REQUIRED`

## Decision rules

1. `PORT_REQUIRED` means that a root-only behavior is absent from the Forest checkpoint and must be reimplemented against the Forest schema, route, authorization, audit, and UI contracts. It never authorizes wholesale file copying.
2. `PORT_TEST_ONLY` means that the behavioral assertion is admissible, but its fixture, private values, stale route shell, or source implementation must not be copied as the production implementation.
3. `SUPERSEDED` means that Forest already provides the same user value through a richer or safer contract, or that a prior plan/runbook is no longer authoritative.
4. `REJECTED` means that the artifact contradicts the accepted Forest UI or release-evidence rules and must not enter the candidate.
5. Root migrations `011~016` keep no filename or ordinal. Any required schema is crosswalked into additive `026+` migrations after duplicate-table and upgrade analysis.

## Cross-run proof

- root HRX domain tests: 24/24 pass
- root API and signed step-up tests: 14/14 pass
- total related tests: 38/38 pass
- packaged profile smoke was not executed because it writes generated evidence and contains a machine-local known-account fixture; its safe assertions are classified separately for test-only porting.
- root working-tree fingerprint before and after tests remained `7837aff481b222426ff93da5a617324fa4e7ae8966f728dee5bf1e8731bea0b3`.

## File-by-file disposition

| # | Path | Classification | Semantic finding and exact port boundary |
|---:|---|---|---|
| 1 | `apps/api/src/routes/hrx/payroll.js` | `PORT_REQUIRED` | Union item-catalog, masked self/admin profile, assignment, attendance-approval, and time-snapshot actions into the richer Forest payroll runtime. Preserve Forest run, statement, payment, filing, issue, export, strict tenant resolution, safe errors, and audit behavior. Do not replace the route wholesale. |
| 2 | `apps/api/test/hrx/payroll-items-api.test.js` | `PORT_TEST_ONLY` | Port catalog CRUD, tenant isolation, restart durability, safe validation, scope, and step-up assertions after the `026+` catalog schema exists. Keep Forest payroll route coverage in the same suite. |
| 3 | `apps/api/test/hrx/payroll-profile-api.test.js` | `PORT_TEST_ONLY` | Port fail-closed `EmployeeUserLink` self resolution, masked assignment, tenant-admin read, and distinct self/admin scopes. Adapt fixtures to the Forest payroll-profile schema and keep private amounts and real employee data out of receipts. |
| 4 | `apps/api/test/hrx/payroll-time-input-api.test.js` | `PORT_TEST_ONLY` | Port explicit approval-receipt, immutable source-reference, restart, idempotency, and signed step-up assertions into the Forest input-snapshot runtime. |
| 5 | `apps/api/test/hrx/step-up-route.test.js` | `PORT_TEST_ONLY` | Merge the additional leave-rule, entitlement, XLSX-template, and payroll-catalog step-up vectors with Forest expiration, batch, upload, provider, and full-payroll action coverage. |
| 6 | `docs/lazycodex/evidence/matter-desktop/artifacts/lv009-forest-leave-auto-packaged-2026-07-15.png` | `REJECTED` | Generated screenshot shows the retired `근무일정` navigation and is not tied to the final integration SHA. Regenerate admissible screenshots only from the final exact-path package. |
| 7 | `docs/runbooks/hrx-member-contact-visibility.md` | `SUPERSEDED` | Forest already enforces internal contact visibility, public-renderer PII exclusion, and signed-account profile joining in code and validators. The runbook's visible `미등록` guidance conflicts with the accepted compact omission rule. |
| 8 | `packages/hrx/src/leave/allocation.js` | `PORT_REQUIRED` | Port a single canonical entitlement-ledger state calculation and use it in earliest-expiry allocation, but derive lifecycle from Forest ledger/command receipts rather than adding mutable status columns. Cross-test earned, carryover, reserve/release, use reversal, expiration, and credit/debit adjustment math. |
| 9 | `packages/hrx/src/leave/manual-adjustment-file.js` | `PORT_REQUIRED` | Port the shared CSV/XLSX template and typed XLSX-row parser using Forest occurrence/manual-adjustment validation. Add archive-size, row-count, malformed workbook, formula, type, and header limits before accepting upload input. |
| 10 | `packages/hrx/src/migrations/011_hrx_payroll_items.sql` | `PORT_REQUIRED` | The payroll item catalog table is absent from Forest. Recreate its tenant key, unique code, constrained kind/tax/value mode, effective dates, status, and version as an additive `026+` migration; never reuse migration 011. |
| 11 | `packages/hrx/src/migrations/012_hrx_payroll_profiles.sql` | `PORT_REQUIRED` | Forest migration 021 already owns an incompatible, richer `hrx_payroll_profiles` table. Port only the item-assignment capability and required indexes/immutability into a `026+` schema that references the Forest profile and catalog keys. Do not create or replace the root profile table. |
| 12 | `packages/hrx/src/migrations/013_hrx_payroll_time_inputs.sql` | `PORT_REQUIRED` | Add explicit immutable attendance-approval receipts and any source lineage not already represented by Forest payroll input snapshots. Reuse Forest snapshot/run tables where equivalent and avoid a parallel snapshot truth. |
| 13 | `packages/hrx/src/migrations/014_hrx_leave_usage_units.sql` | `SUPERSEDED` | Forest policy snapshots, type-economics normalization, duration modes, paid/unpaid/deduction minutes, rounding, and request snapshots already provide a richer immutable model. Adding mutable duplicate columns would create two policy truths. |
| 14 | `packages/hrx/src/migrations/015_hrx_leave_accrual_rule_versions.sql` | `PORT_REQUIRED` | Forest accrual rules are not yet append-only logical versions. Crosswalk logical rule code, version, supersession, and run as-of lineage into an additive `026+` migration with uniqueness and upgrade checks. |
| 15 | `packages/hrx/src/migrations/016_hrx_leave_entitlement_lifecycle.sql` | `SUPERSEDED` | Forest derives lifecycle from dated entitlements plus immutable ledger entries and records cancel/adjust/expire actions in command receipts and audit events. Mutable status/cancellation columns would duplicate and potentially contradict that truth. |
| 16 | `packages/hrx/src/payroll-item-catalog.js` | `PORT_REQUIRED` | Port tenant-scoped durable catalog CRUD, normalized constrained fields, optimistic version update, inactive filtering, and audit events into the Forest repository/runtime. |
| 17 | `packages/hrx/src/payroll-profile-service.js` | `PORT_REQUIRED` | Port masked item assignments, effective-period validation, ciphertext-only amount storage, fail-closed self reads, and audit metadata. Reuse Forest profile creation/update/list logic and compensation references; do not import the incompatible root profile row shape. |
| 18 | `packages/hrx/src/payroll-time-input-snapshot.js` | `PORT_REQUIRED` | Port explicit approval receipts, correction replacement, as-of filtering, exact minute/night/holiday projection, immutable lineage, and idempotency into Forest's richer profile/attendance/leave/overtime snapshot service. Do not create a second payroll calculation runtime. |
| 19 | `packages/hrx/test/leave-manual-adjustment-file.test.js` | `PORT_TEST_ONLY` | Port CSV/XLSX contract parity and edited-workbook round-trip tests, then extend them with malformed/oversized/formula-safe negative cases required by the Forest trust boundary. |
| 20 | `packages/hrx/test/leave-policy-service.test.js` | `SUPERSEDED` | The root-only usage-unit test is already covered more strongly by Forest type-economics, durable-management, policy snapshot, rounding, paid/unpaid, fixed deduction, and zero-deduction tests. Keep Forest tests as canonical. |
| 21 | `packages/hrx/test/payroll-item-catalog.test.js` | `PORT_TEST_ONLY` | Port normalization, duplicate-code, tenant isolation, active sorting, update versioning, and restart durability tests against the Forest repository and new `026+` catalog table. |
| 22 | `packages/hrx/test/payroll-profile-service.test.js` | `PORT_TEST_ONLY` | Port append-only assignment periods, overlap rejection, encryption-at-rest, response masking, tenant isolation, and profile/item/currency boundary tests using Forest profile fixtures. |
| 23 | `packages/hrx/test/payroll-time-input-snapshot.test.js` | `PORT_TEST_ONLY` | Port approved/unapproved/as-of/correction/cross-midnight/holiday/overtime/idempotency/restart vectors into Forest's canonical input-snapshot tests. |
| 24 | `scripts/smoke-matter-profile-packaged.mjs` | `PORT_TEST_ONLY` | Port normal-launch and user-profile-only coverage as sanitized fixture-driven assertions. Remove hardcoded real account/career values, write only SHA-scoped evidence, and preserve Forest's canonical executable-path and no-synthetic-fallback checks. |
| 25 | `workbook/hrx-payroll-leave-tuw-execution-plan-2026-07-14.md` | `SUPERSEDED` | This older plan and its stale counts/screenshots are subsumed by the current Forest v0.1.17 Goal plan. Keep it only in the user root checkout; do not make it a second execution authority. |

## Disposition totals

- `PORT_REQUIRED`: 10
- `PORT_TEST_ONLY`: 9
- `SUPERSEDED`: 5
- `REJECTED`: 1
- unclassified: 0

## RC-004/RC-005 handoff

The ten required behaviors form four port groups: payroll catalog, payroll profile assignments/self read, payroll approved-time lineage, and leave file/rule/ledger extensions. RC-004 must map each group to Forest-preserved capabilities and MG migration crosswalks. RC-005 may start only after that matrix shows no duplicate schema or weaker authorization path.
